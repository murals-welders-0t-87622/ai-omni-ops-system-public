param(
  [string]$ApiBase = "http://127.0.0.1:23011/api",
  [string]$BrandId = "brand-demo-cleaning",
  [string]$ConnectorName = "ai-omni-ops-ontology-lab",
  [string]$McpConfigPath = "$env:USERPROFILE\.workbuddy\mcp.json",
  [string]$RuntimeRoot = "D:\workbuddy-test-runtime\ai-omni-ontology-lab",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Assert-True($Condition, [string]$Message) {
  if (-not $Condition) {
    throw $Message
  }
}

function ConvertTo-StableJson($Value) {
  return ($Value | ConvertTo-Json -Depth 80 -Compress)
}

function Protect-FileAcl([string]$Path) {
  $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  try {
    Import-Module Microsoft.PowerShell.Security -ErrorAction Stop
    $acl = Get-Acl $Path
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($rule in @($acl.Access)) {
      [void]$acl.RemoveAccessRule($rule)
    }
    foreach ($identity in @($currentUser, "SYSTEM", "Administrators")) {
      $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($identity, "Read,Write", "Allow")
      $acl.AddAccessRule($accessRule)
    }
    Set-Acl -Path $Path -AclObject $acl
    return $true
  } catch {
    Write-Warning "PowerShell ACL hardening skipped for ${Path}: $($_.Exception.Message)"
    $grantCurrent = "${currentUser}:(R,W)"
    $icacls = & icacls $Path /inheritance:r /grant:r $grantCurrent "SYSTEM:(F)" "Administrators:(F)" 2>&1
    if ($LASTEXITCODE -eq 0) {
      return $true
    }
    Write-Warning "icacls ACL hardening skipped for ${Path}: $icacls"
    return $false
  }
}

function Invoke-Json($Method, [string]$Url, $Body, $Headers = @{}) {
  $params = @{
    Method = $Method
    Uri = $Url
    ContentType = "application/json"
    Headers = $Headers
    UseBasicParsing = $true
  }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 20)
  }
  $response = Invoke-WebRequest @params
  Assert-True ($response.StatusCode -in @(200, 201)) "$Method $Url failed: HTTP $($response.StatusCode)"
  return ($response.Content | ConvertFrom-Json)
}

Assert-True (Test-Path $McpConfigPath) "WorkBuddy mcp.json not found: $McpConfigPath"
Assert-True (Test-Path (Join-Path $RuntimeRoot "lab.env")) "lab.env not found under runtime root: $RuntimeRoot"

$labEnvPath = Join-Path $RuntimeRoot "lab.env"
$operatorPass = ""
foreach ($line in Get-Content $labEnvPath) {
  if ($line -match '^LAB_OPERATOR_PASSWORD=(.+)$') {
    $operatorPass = $Matches[1].Trim()
  }
}
Assert-True $operatorPass "Failed to parse LAB_OPERATOR_PASSWORD from lab.env"

$rawBefore = [System.IO.File]::ReadAllText($McpConfigPath, [System.Text.Encoding]::UTF8)
$configBefore = $rawBefore | ConvertFrom-Json
$serversBefore = $configBefore.mcpServers
Assert-True $serversBefore "mcp.json missing mcpServers"
$connectorBefore = $serversBefore.$ConnectorName
Assert-True $connectorBefore "Connector not found: $ConnectorName"
Assert-True ($connectorBefore.url -eq "$ApiBase/ai-control-center/mcp") "Connector URL mismatch: $($connectorBefore.url)"
Assert-True ($connectorBefore.headers.'x-brand-id' -eq $BrandId) "Connector brand mismatch: $($connectorBefore.headers.'x-brand-id')"

$nonTargetBefore = @{}
foreach ($property in $serversBefore.PSObject.Properties) {
  if ($property.Name -ne $ConnectorName) {
    $nonTargetBefore[$property.Name] = ConvertTo-StableJson $property.Value
  }
}

$login = Invoke-Json "Post" "$ApiBase/auth/login" @{
  account = "operator@ontology-lab.invalid"
  password = $operatorPass
}
Assert-True $login.accessToken "Login did not return accessToken"

if ($DryRun) {
  [pscustomobject]@{
    ok = $true
    dryRun = $true
    connectorName = $ConnectorName
    brandId = $BrandId
    apiBase = $ApiBase
    loginUserId = $login.user.id
    connectorUrl = $connectorBefore.url
    nonTargetConnectorCount = $nonTargetBefore.Keys.Count
    rotatedToken = $false
    wroteMcpConfig = $false
    fullTokenPrinted = $false
  } | ConvertTo-Json -Depth 10
  exit 0
}

$tokenName = "WorkBuddy Lab Connector ($BrandId) S3 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$rotate = Invoke-Json "Post" "$ApiBase/ai-control-center/installation-hub/tokens/rotate" @{
  tokenName = $tokenName
  expiresInDays = 30
} @{
  "Authorization" = "Bearer $($login.accessToken)"
  "x-brand-id" = $BrandId
}
Assert-True $rotate.token "Rotate response did not return full token"
Assert-True $rotate.record.tokenPreview "Rotate response did not return tokenPreview"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $RuntimeRoot "mcp.json.backup-before-s3-token-rotate-$timestamp.json"
$summaryPath = Join-Path $RuntimeRoot "s3-workbuddy-connector-token-rotate-$timestamp.safe.json"

Copy-Item -LiteralPath $McpConfigPath -Destination $backupPath -ErrorAction Stop
$backupAclHardened = Protect-FileAcl $backupPath

$configAfter = $rawBefore | ConvertFrom-Json
$target = $configAfter.mcpServers.$ConnectorName
if (-not $target.headers) {
  $target | Add-Member -MemberType NoteProperty -Name headers -Value ([pscustomobject]@{})
}
$target.headers.Authorization = "Bearer $($rotate.token)"
$target.headers.'x-brand-id' = $BrandId
$target.url = "$ApiBase/ai-control-center/mcp"
$target.type = "streamableHttp"

$nonTargetAfter = @{}
foreach ($property in $configAfter.mcpServers.PSObject.Properties) {
  if ($property.Name -ne $ConnectorName) {
    $nonTargetAfter[$property.Name] = ConvertTo-StableJson $property.Value
  }
}
foreach ($name in $nonTargetBefore.Keys) {
  Assert-True ($nonTargetAfter[$name] -eq $nonTargetBefore[$name]) "Non-target connector changed unexpectedly: $name"
}

$json = $configAfter | ConvertTo-Json -Depth 80
[System.IO.File]::WriteAllText($McpConfigPath, $json, [System.Text.UTF8Encoding]::new($false))

$summary = [pscustomobject]@{
  ok = $true
  connectorName = $ConnectorName
  brandId = $BrandId
  apiBase = $ApiBase
  tokenId = $rotate.record.id
  tokenPreview = $rotate.record.tokenPreview
  status = $rotate.record.status
  expiresAt = $rotate.record.expiresAt
  backupPath = $backupPath
  mcpConfigPath = $McpConfigPath
  nonTargetConnectorCount = $nonTargetBefore.Keys.Count
  mcpConfigUpdated = $true
  fullTokenStoredInSummary = $false
}
[System.IO.File]::WriteAllText($summaryPath, ($summary | ConvertTo-Json -Depth 10), [System.Text.UTF8Encoding]::new($false))
$summaryAclHardened = Protect-FileAcl $summaryPath

[pscustomobject]@{
  ok = $true
  dryRun = $false
  connectorName = $ConnectorName
  brandId = $BrandId
  tokenId = $rotate.record.id
  tokenPreview = $rotate.record.tokenPreview
  status = $rotate.record.status
  expiresAt = $rotate.record.expiresAt
  backupPath = $(if ($DryRun) { $null } else { $backupPath })
  summaryPath = $(if ($DryRun) { $null } else { $summaryPath })
  nonTargetConnectorCount = $nonTargetBefore.Keys.Count
  backupAclHardened = $backupAclHardened
  summaryAclHardened = $summaryAclHardened
  fullTokenPrinted = $false
} | ConvertTo-Json -Depth 10

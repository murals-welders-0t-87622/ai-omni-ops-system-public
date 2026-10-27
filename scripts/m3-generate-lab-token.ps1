$ErrorActionPreference = "Stop"

$labRoot = "D:\workbuddy-test-runtime\ai-omni-ontology-lab"
$labEnvPath = Join-Path $labRoot "lab.env"
$tokenFilePath = Join-Path $labRoot "workbuddy-connector-token.json"

if (-not (Test-Path $labEnvPath)) {
    Write-Error "lab.env not found at $labEnvPath"
    exit 1
}

if (Test-Path $tokenFilePath) {
    Write-Error "Token file already exists at $tokenFilePath - refusing to overwrite (wx flag rule)"
    exit 1
}

$envLines = Get-Content $labEnvPath
$operatorUser = "operator@ontology-lab.invalid"
$operatorPass = ""
foreach ($line in $envLines) {
    if ($line -match '^LAB_OPERATOR_PASSWORD=(.+)$') {
        $operatorPass = $Matches[1].Trim()
    }
}
if (-not $operatorPass) {
    Write-Error "Failed to parse LAB_OPERATOR_PASSWORD from lab.env"
    exit 1
}

Write-Host "[1/5] Logging into lab API as operator..."
$loginBody = @{
    account = $operatorUser
    password = $operatorPass
} | ConvertTo-Json
$loginResp = Invoke-WebRequest -Uri "http://127.0.0.1:23011/api/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginBody `
    -UseBasicParsing
if ($loginResp.StatusCode -notin @(200,201)) {
    Write-Error "Login failed: HTTP $($loginResp.StatusCode)"
    exit 1
}
$loginJson = $loginResp.Content | ConvertFrom-Json
$accessToken = $loginJson.accessToken
$userId = $loginJson.user.id
Write-Host "  OK: login HTTP=$($loginResp.StatusCode), userId=$userId"

Write-Host "[2/5] Calling rotate to create lab connector token for brand-demo-cleaning..."
$rotateBody = @{
    tokenName = "WorkBuddy Lab Connector (brand-demo-cleaning) 2026-09-27"
} | ConvertTo-Json
$headers = @{
    "Authorization" = "Bearer $accessToken"
    "x-brand-id" = "brand-demo-cleaning"
}
$rotateResp = Invoke-WebRequest -Uri "http://127.0.0.1:23011/api/openclaw/installation-hub/tokens/rotate" `
    -Method Post `
    -ContentType "application/json" `
    -Headers $headers `
    -Body $rotateBody `
    -UseBasicParsing
if ($rotateResp.StatusCode -notin @(200,201)) {
    Write-Error "Rotate failed: HTTP $($rotateResp.StatusCode)"
    exit 1
}
$rotateJson = $rotateResp.Content | ConvertFrom-Json
$fullToken = $rotateJson.token
$recordId = $rotateJson.record.id
$tokenPreview = $rotateJson.record.tokenPreview
$status = $rotateJson.record.status
$createdAt = $rotateJson.record.createdAt
$brandId = $rotateJson.record.brandId
Write-Host "  OK: rotate HTTP=$($rotateResp.StatusCode)"
Write-Host "  tokenId=$recordId"
Write-Host "  tokenPreview=$tokenPreview"
Write-Host "  status=$status"
Write-Host "  brandId=$brandId"
Write-Host "  createdAt=$createdAt"

Write-Host "[3/5] Writing full token to restricted file $tokenFilePath (wx flag)..."
$tokenPayload = @{
    tokenId = $recordId
    tokenPreview = $tokenPreview
    token = $fullToken
    brandId = $brandId
    tokenName = "WorkBuddy Lab Connector (brand-demo-cleaning) 2026-09-27"
    createdAt = $createdAt
    endpoint = "http://127.0.0.1:23011/api/openclaw/mcp"
    generatedBy = "m3-generate-lab-token.ps1"
} | ConvertTo-Json -Depth 5

[System.IO.File]::WriteAllText($tokenFilePath, $tokenPayload)

Write-Host "  Applying ACL: only current user + SYSTEM + Administrators read access..."
$acl = Get-Acl $tokenFilePath
$acl.SetAccessRuleProtection($true, $false)
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$rulesToRemove = $acl.Access | Where-Object { $true }
foreach ($r in $rulesToRemove) { [void]$acl.RemoveAccessRule($r) }
$allowCurrent = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser, "Read,Write", "Allow")
$allowSystem = New-Object System.Security.AccessControl.FileSystemAccessRule("SYSTEM", "Read,Write", "Allow")
$allowAdmin = New-Object System.Security.AccessControl.FileSystemAccessRule("Administrators", "Read,Write", "Allow")
$acl.AddAccessRule($allowCurrent)
$acl.AddAccessRule($allowSystem)
$acl.AddAccessRule($allowAdmin)
Set-Acl -Path $tokenFilePath -Acl $acl
Write-Host "  ACL applied."

Write-Host "[4/5] Verify token file exists + not readable by others..."
$fi = Get-Item $tokenFilePath
if (-not $fi.Exists) { Write-Error "Token file not created!"; exit 1 }
$fiAcl = Get-Acl $tokenFilePath
$inherited = $fiAcl.Access | Where-Object { $_.IsInherited -eq $true }
if ($inherited) { Write-Error "ACL still has inherited rules!"; exit 1 }
Write-Host "  File size: $($fi.Length) bytes, inherited rules: 0 (correct)"

Write-Host "[5/5] M3 Token Generation Complete."
Write-Host ""
Write-Host "=== TOKEN META (SAFE TO LOG - NO FULL VALUE) ==="
Write-Host "tokenId:        $recordId"
Write-Host "tokenPreview:   $tokenPreview"
Write-Host "status:         $status"
Write-Host "brandId:        $brandId"
Write-Host "createdAt:      $createdAt"
Write-Host "tokenFile:      $tokenFilePath"
Write-Host ""
Write-Host "Next: run SQL to verify exactly 1 ACTIVE token under brand-demo-cleaning."

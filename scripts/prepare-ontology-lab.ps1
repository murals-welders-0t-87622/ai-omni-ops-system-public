param()
$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'This preparation script requires Windows PowerShell 7.' }
$root = 'D:\workbuddy-test-runtime\ai-omni-ontology-lab'
$envFile = Join-Path $root 'lab.env'
if (Test-Path -LiteralPath $envFile) { throw 'lab.env already exists. Reuse it after verification; do not rotate implicitly.' }
if (-not (Test-Path -LiteralPath (Split-Path $root -Parent) -PathType Container)) {
    throw 'Runtime parent directory is missing.'
}
if (Test-Path -LiteralPath $root) {
    throw 'Runtime directory already exists. Inspect it before changing permissions or creating secrets.'
}
$null = New-Item -ItemType Directory -Path $root
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = [Security.AccessControl.DirectorySecurity]::new()
$acl.SetOwner($sid)
$acl.SetAccessRuleProtection($true, $false)
foreach ($identity in @($sid, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
    $rule = [Security.AccessControl.FileSystemAccessRule]::new(
        $identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $root -AclObject $acl
$keys = @('LAB_DATABASE_PASSWORD', 'LAB_AUTH_TOKEN_SECRET', 'LAB_INSTALL_TOKEN_SECRET', 'LAB_OPERATOR_PASSWORD')
$lines = foreach ($key in $keys) {
    $secret = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
    "$key=$secret"
}
$stream = [IO.File]::Open($envFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
try {
    $bytes = [Text.Encoding]::ASCII.GetBytes(($lines -join "`n") + "`n")
    $stream.Write($bytes, 0, $bytes.Length)
} finally {
    $stream.Dispose()
}
Write-Output "Created lab-only credentials: $envFile"
Write-Output 'Directory access: current user and SYSTEM only. No secret values printed.'

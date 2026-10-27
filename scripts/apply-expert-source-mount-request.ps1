param(
    [string]$HostPath = "",
    [string]$RequestId = "",
    [switch]$UseLatestRequest,
    [string]$MountMode = "readonly",
    [string]$EnvFile = "D:\workbuddy-test-runtime\ai-omni-ontology-lab\lab.env",
    [string]$ComposeFile = "",
    [switch]$DryRun,
    [switch]$SkipRestart
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
    return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
}

function Assert-SafeHostPath([string]$Value) {
    $clean = [string]$Value
    $clean = $clean.Trim()
    if (-not $clean) {
        throw "HostPath is required. Pass -HostPath or use -UseLatestRequest while the lab API is running."
    }
    if ($clean.Contains([char]0) -or $clean.Contains("`r") -or $clean.Contains("`n")) {
        throw "HostPath contains invalid characters."
    }
    if ($clean.Length -gt 500) {
        throw "HostPath is too long."
    }
    if (-not (Test-Path -LiteralPath $clean -PathType Container)) {
        throw "HostPath does not exist or is not a directory: $clean"
    }
    return (Resolve-Path -LiteralPath $clean).Path
}

function Convert-ToComposeHostPath([string]$Value) {
    return $Value.Replace("\", "/")
}

function Read-LatestMountRequest {
    try {
        $guide = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:23011/api/ai-control/expert-source/mount-guide" -TimeoutSec 10
    } catch {
        throw "Cannot read latest mount request from lab API. Start the lab service or pass -HostPath directly. $($_.Exception.Message)"
    }
    if (-not $guide.latest_request) {
        throw "No latest mount request exists. Create one from the AI Control settings page or pass -HostPath directly."
    }
    return $guide.latest_request
}

function Read-EnvLines([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Env file is missing: $Path"
    }
    return [string[]](Get-Content -LiteralPath $Path)
}

function Set-EnvLine([string[]]$Lines, [string]$Name, [string]$Value) {
    $line = "$Name=$Value"
    $next = [System.Collections.Generic.List[string]]::new()
    $updated = $false
    foreach ($existing in $Lines) {
        if ($existing -match "^\s*$([regex]::Escape($Name))\s*=") {
            $next.Add($line) | Out-Null
            $updated = $true
        } else {
            $next.Add($existing) | Out-Null
        }
    }
    if (-not $updated) {
        $next.Add($line) | Out-Null
    }
    return [string[]]$next.ToArray()
}

function Write-EnvLines([string]$Path, [string[]]$Lines) {
    $text = ($Lines -join "`n") + "`n"
    [System.IO.File]::WriteAllText($Path, $text, [System.Text.Encoding]::ASCII)
}

function Invoke-Checked([string]$Exe, [string[]]$CommandArgs, [string]$WorkingDirectory) {
    Write-Host "[run] $Exe $($CommandArgs -join ' ')"
    Push-Location -LiteralPath $WorkingDirectory
    try {
        & $Exe @CommandArgs
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($exitCode -ne 0) {
        throw "Command failed with exit code ${exitCode}: $Exe $($CommandArgs -join ' ')"
    }
}

function Wait-ForLabHealth {
    param(
        [int]$TimeoutSeconds = 90
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $health = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:23011/api/health" -TimeoutSec 3
            if ($health.status -eq "ok") {
                return $health
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    } while ((Get-Date) -lt $deadline)
    throw "Lab API did not become healthy within $TimeoutSeconds seconds."
}

$repoRoot = Resolve-RepoRoot
if (-not $ComposeFile) {
    $ComposeFile = Join-Path $repoRoot "docker\docker-compose.ontology-lab.yml"
}
if (-not (Test-Path -LiteralPath $ComposeFile -PathType Leaf)) {
    throw "Compose file is missing: $ComposeFile"
}

if ($UseLatestRequest) {
    $latestRequest = Read-LatestMountRequest
    if ($RequestId -and $latestRequest.id -ne $RequestId) {
        throw "Latest request id mismatch. Expected $RequestId, got $($latestRequest.id)."
    }
    $HostPath = [string]$latestRequest.requested_host_path
    $MountMode = [string]$latestRequest.requested_mount_mode
    $RequestId = [string]$latestRequest.id
}

if ($MountMode.Trim().ToLowerInvariant() -ne "readonly") {
    throw "Writable expert-source mount is not allowed by this script. Keep MountMode=readonly until write-back is explicitly authorized."
}

$resolvedHostPath = Assert-SafeHostPath $HostPath
$composeHostPath = Convert-ToComposeHostPath $resolvedHostPath

Write-Host "Expert source mount apply plan"
Write-Host "Repo: $repoRoot"
Write-Host "Compose: $ComposeFile"
Write-Host "Env file: $EnvFile"
Write-Host "Host path: $resolvedHostPath"
Write-Host "Container path: /expert-source"
Write-Host "Mount mode: readonly"
if ($RequestId) {
    Write-Host "Request id: $RequestId"
}

if ($DryRun) {
    Write-Host "[dry-run] No env file update and no Docker restart were performed."
    exit 0
}

$envLines = Read-EnvLines $EnvFile
$envLines = Set-EnvLine -Lines $envLines -Name "WORKBUDDY_EXPERT_SOURCE_HOST_PATH" -Value $composeHostPath
Write-EnvLines -Path $EnvFile -Lines $envLines
Write-Host "[done] Updated WORKBUDDY_EXPERT_SOURCE_HOST_PATH in lab.env"

if (-not $SkipRestart) {
    Invoke-Checked -Exe "docker" -CommandArgs @("compose", "--env-file", $EnvFile, "-f", $ComposeFile, "config", "--quiet") -WorkingDirectory $repoRoot
    Invoke-Checked -Exe "docker" -CommandArgs @("compose", "--env-file", $EnvFile, "-f", $ComposeFile, "up", "-d", "--no-deps", "--force-recreate", "server", "web", "ingress") -WorkingDirectory $repoRoot
    $null = Wait-ForLabHealth
    $guide = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:23011/api/ai-control/expert-source/mount-guide" -TimeoutSec 15
    Write-Host "[done] Lab API healthy."
    Write-Host "sourceMode=$($guide.current.source_mode)"
    Write-Host "pluginCount=$($guide.current.plugin_count)"
    Write-Host "agentsFiles=$($guide.current.agents_count)"
    Write-Host "skillsFiles=$($guide.current.skills_count)"
    Write-Host "writeEnabled=$($guide.current.write_enabled)"
    Write-Host "writableMount=$($guide.current.writable_mount)"
} else {
    Write-Host "[skip] Docker restart skipped. Run docker compose recreate before expecting /expert-source to switch."
}

Write-Host "Done. Real expert/Skill write-back remains disabled."

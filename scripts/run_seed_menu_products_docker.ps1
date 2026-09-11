[CmdletBinding()]
param(
    [string]$BaseUrl = "http://host.docker.internal:8080",
    [string]$AdminKey = $env:APP_ADMIN_KEY,
    [switch]$DryRun,
    [switch]$CreateOnly,
    [switch]$NoBuild,
    [string]$ImageName = "minimercado-seed-menu-products:latest"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$dockerfile = Join-Path $repoRoot "scripts\Dockerfile.seed-menu-products"
$backendEnv = Join-Path $repoRoot "backend\.env"

if (-not $AdminKey -and (Test-Path $backendEnv)) {
    $adminKeyLine = Get-Content $backendEnv |
        Where-Object { $_ -match "^\s*APP_ADMIN_KEY\s*=" } |
        Select-Object -First 1

    if ($adminKeyLine) {
        $AdminKey = ($adminKeyLine -replace "^\s*APP_ADMIN_KEY\s*=", "").Trim().Trim('"').Trim("'")
    }
}

if (-not $AdminKey -and -not $DryRun) {
    throw "Defina APP_ADMIN_KEY, passe -AdminKey, ou rode com -DryRun."
}

if (-not $NoBuild) {
    docker build -f $dockerfile -t $ImageName $repoRoot
}

$dockerArgs = @("run", "--rm")

if ($AdminKey) {
    $dockerArgs += @("-e", "APP_ADMIN_KEY=$AdminKey")
}

$dockerArgs += @($ImageName, "--base-url", $BaseUrl)

if ($DryRun) {
    $dockerArgs += "--dry-run"
}

if ($CreateOnly) {
    $dockerArgs += "--create-only"
}

docker @dockerArgs

<#
.SYNOPSIS
    Runs the Laravel test suite against PostgreSQL.

.DESCRIPTION
    Uses the DB_* values from backend/.env (or environment overrides), creates the
    online_mall_test database if needed, and runs PHPUnit with
    phpunit.pgsql.xml. Requires a running PostgreSQL server and the psql client
    (or set OMC_PSQL to its path).

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-pgsql.ps1
#>
[CmdletBinding()]
param(
    [switch]$SkipDatabaseCreate
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDir)) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$repo = Split-Path -Parent $scriptDir
$backend = Join-Path $repo "backend"
$envFile = Join-Path $backend ".env"

function Get-DotEnvValue([string]$Path, [string]$Key) {
    if (-not (Test-Path $Path)) { return $null }
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match ('^\s*' + [regex]::Escape($Key) + '\s*=\s*(.*)$')) {
            $value = $matches[1].Trim()
            if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            return $value
        }
    }
    return $null
}

if (-not (Test-Path $envFile)) { throw "backend/.env not found. Copy backend/.env.example first." }

$dbDriver = Get-DotEnvValue $envFile "DB_CONNECTION"
if (-not $dbDriver) { $dbDriver = "pgsql" }
if ($dbDriver -ne "pgsql") { throw "backend/.env DB_CONNECTION must be pgsql (found '$dbDriver')." }

$dbHost = Get-DotEnvValue $envFile "DB_HOST"; if (-not $dbHost) { $dbHost = "127.0.0.1" }
$dbPort = Get-DotEnvValue $envFile "DB_PORT"; if (-not $dbPort) { $dbPort = "5432" }
$dbUser = Get-DotEnvValue $envFile "DB_USERNAME"
$dbPassword = Get-DotEnvValue $envFile "DB_PASSWORD"
$dbSslMode = Get-DotEnvValue $envFile "DB_SSLMODE"; if (-not $dbSslMode) { $dbSslMode = "prefer" }
$testDb = Get-DotEnvValue $envFile "DB_TEST_DATABASE"; if (-not $testDb) { $testDb = "online_mall_test" }

$phpArgs = @()
$loaded = (& php -r "echo extension_loaded('pdo_pgsql') ? '1' : '0';" 2>$null) -join ''
if ($loaded.Trim() -ne "1") { $phpArgs = @("-d", "extension=pdo_pgsql") }

$psql = $env:OMC_PSQL
if (-not $psql) {
    $candidate = Join-Path $repo ".tools\pgsql\bin\psql.exe"
    if (Test-Path $candidate) { $psql = $candidate }
}
if (-not $psql) {
    $command = Get-Command psql -ErrorAction SilentlyContinue
    if ($command) { $psql = $command.Source }
}

if (-not $SkipDatabaseCreate) {
    if (-not $psql) { throw "psql not found. Set OMC_PSQL to the psql executable, or pass -SkipDatabaseCreate if the test DB exists." }
    $previousPassword = $env:PGPASSWORD
    $env:PGPASSWORD = $dbPassword
    try {
        $exists = (& $psql -h $dbHost -p $dbPort -U $dbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$testDb'" 2>$null) -join ''
        if ($exists.Trim() -ne "1") {
            & $psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "CREATE DATABASE \"$testDb\"" | Out-Host
        }
    } finally {
        if ($null -eq $previousPassword) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
        else { $env:PGPASSWORD = $previousPassword }
    }
}

Write-Host "Running PHPUnit against PostgreSQL ${dbHost}:${dbPort}/${testDb}" -ForegroundColor Cyan

Push-Location $backend
try {
    $env:DB_CONNECTION = "pgsql"
    $env:DB_HOST = $dbHost
    $env:DB_PORT = $dbPort
    $env:DB_DATABASE = $testDb
    $env:DB_USERNAME = $dbUser
    $env:DB_PASSWORD = $dbPassword
    $env:DB_SSLMODE = $dbSslMode

    & php @phpArgs vendor/bin/phpunit -c phpunit.pgsql.xml
    $code = $LASTEXITCODE
} finally {
    Pop-Location
}

if ($code -ne 0) { exit $code }
Write-Host "PostgreSQL test suite passed." -ForegroundColor Green
exit 0

<#
.SYNOPSIS
    Runs the whole app on localhost: PostgreSQL + Laravel API + Vite dev frontend.

.DESCRIPTION
    One command for local development / manual testing:

      http://127.0.0.1:5173   React frontend (Vite dev server, hot reload)
      http://127.0.0.1:8000   Laravel API (php artisan serve equivalent)
      /api, /sanctum, /storage are proxied by Vite -> same-origin cookie auth.

    It will:
      * discover the PostgreSQL connection from backend/.env
      * start a portable PostgreSQL from .tools/ if the configured port is down
      * run migrations (+ demo seed on first use, or always with -Fresh)
      * start the backend and frontend and print the demo accounts
      * stop both child processes on Ctrl+C (or run with -Stop)

.PARAMETER Fresh
    `migrate:fresh --seed` before starting (wipe + reseed demo data).

.PARAMETER Open
    Open the frontend URL in the default browser when ready.

.PARAMETER Stop
    Stop servers listening on the configured ports and exit.

.PARAMETER BackendPort
    Laravel API port (default 8000).

.PARAMETER FrontendPort
    Vite dev server port (default 5173).

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -Fresh -Open

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -Stop
#>
[CmdletBinding()]
param(
    [switch]$Fresh,
    [switch]$Open,
    [switch]$Stop,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDir)) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$repo = Split-Path -Parent $scriptDir
$backend = Join-Path $repo "backend"
$envFile = Join-Path $backend ".env"
$router = Join-Path $backend "vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"
$publicDir = Join-Path $backend "public"
$logDir = Join-Path $repo "test-results\logs"

function Stop-Port([int]$Port) {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

if ($Stop) {
    foreach ($port in @($BackendPort, $FrontendPort)) {
        Write-Host "stopping process on port $port..."
        Stop-Port $port
    }
    Write-Host "Stopped local servers." -ForegroundColor Green
    exit 0
}

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

function Test-PortOpen([string]$HostName, [int]$Port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(1200)) { $client.Close(); return $false }
        $client.EndConnect($async)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Test-Http([string]$Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -Headers @{ Accept = "*/*" }
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
    } catch {
        return $false
    }
}

function Wait-For([scriptblock]$Condition, [int]$TimeoutSec, [string]$What) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    do {
        if (& $Condition) { return $true }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    Write-Host "  WARNING: $What did not become ready in ${TimeoutSec}s" -ForegroundColor Yellow
    return $false
}

# --- prerequisites -----------------------------------------------------------
if (-not (Get-Command php -ErrorAction SilentlyContinue)) { throw "PHP is not in PATH." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is not in PATH." }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw "npm is not in PATH." }
if (-not (Test-Path $envFile)) { throw "backend/.env not found. Copy backend/.env.example to backend/.env first." }
if (-not (Test-Path $router)) { throw "backend/vendor missing. Run: composer install (in backend/)." }
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

if (Test-PortOpen "127.0.0.1" $BackendPort) { throw "Port $BackendPort is already in use. Run with -Stop first, or pick another -BackendPort." }
if (Test-PortOpen "127.0.0.1" $FrontendPort) { throw "Port $FrontendPort is already in use. Run with -Stop first, or pick another -FrontendPort." }

$phpArgs = @()
$pgLoaded = (& php -r "echo extension_loaded('pdo_pgsql') ? '1' : '0';" 2>$null) -join ''
if ($pgLoaded.Trim() -ne "1") {
    Write-Host "  pdo_pgsql is not enabled globally; using -d extension=pdo_pgsql." -ForegroundColor DarkGray
    $phpArgs = @("-d", "extension=pdo_pgsql")
}

# --- database configuration from backend/.env -------------------------------
$dbDriver = Get-DotEnvValue $envFile "DB_CONNECTION"; if (-not $dbDriver) { $dbDriver = "pgsql" }
if ($dbDriver -ne "pgsql") { throw "backend/.env must use DB_CONNECTION=pgsql (found '$dbDriver'). See docs/TESTING-BOTH-BUILDS.md." }
$dbHost = Get-DotEnvValue $envFile "DB_HOST"; if (-not $dbHost) { $dbHost = "127.0.0.1" }
$dbPortText = Get-DotEnvValue $envFile "DB_PORT"; if (-not $dbPortText) { $dbPortText = "5432" }
$dbPort = [int]$dbPortText
$dbName = Get-DotEnvValue $envFile "DB_DATABASE"; if (-not $dbName) { $dbName = "online_mall" }
$dbUser = Get-DotEnvValue $envFile "DB_USERNAME"
$dbPassword = Get-DotEnvValue $envFile "DB_PASSWORD"

# --- ensure PostgreSQL is listening -----------------------------------------
if (-not (Test-PortOpen $dbHost $dbPort)) {
    $postgresExe = Join-Path $repo ".tools\pgsql\bin\postgres.exe"
    $pgData = Join-Path $repo ".tools\pgdata"
    if ((Test-Path $postgresExe) -and (Test-Path $pgData)) {
        Write-Host "  starting portable PostgreSQL on port $dbPort ..." -ForegroundColor DarkGray
        Start-Process -FilePath $postgresExe `
            -ArgumentList @("-D", $pgData, "-p", "$dbPort", "-c", "listen_addresses=$dbHost") `
            -WorkingDirectory $repo -WindowStyle Hidden `
            -RedirectStandardError (Join-Path $repo ".tools\postgres-local.err.log") `
            -RedirectStandardOutput (Join-Path $repo ".tools\postgres-local.out.log") | Out-Null
        $null = Wait-For { Test-PortOpen $dbHost $dbPort } 25 "PostgreSQL"
    }
}
if (-not (Test-PortOpen $dbHost $dbPort)) {
    throw "PostgreSQL is not reachable at ${dbHost}:${dbPort}. Start it, or see docs/TESTING-BOTH-BUILDS.md section 0."
}
Write-Host "  PostgreSQL: ${dbHost}:${dbPort}/${dbName}" -ForegroundColor DarkGray

# --- database schema + demo data --------------------------------------------
Push-Location $backend
try {
    if ($Fresh) {
        Write-Host "  resetting database (migrate:fresh --seed) ..." -ForegroundColor DarkGray
        & php @phpArgs artisan migrate:fresh --seed --force 2>&1 | Select-Object -Last 3 | Out-Host
    } else {
        # Migrations are a no-op when up to date; demo seeding only runs when empty
        # (idempotent helper, same one the Docker stack uses).
        & php @phpArgs artisan migrate --force 2>&1 | Select-Object -Last 2 | Out-Host
        & php @phpArgs artisan app:seed-demo 2>&1 | Select-Object -Last 3 | Out-Host
    }
    & php @phpArgs artisan config:clear 2>&1 | Out-Null
} finally {
    Pop-Location
}

# --- start backend -----------------------------------------------------------
Write-Host "  starting Laravel API on :$BackendPort ..." -ForegroundColor DarkGray
$backendLog = Join-Path $logDir "local-backend.log"
$backendEnv = @{
    APP_ENV = "local"
    APP_DEBUG = "true"
    APP_URL = "http://127.0.0.1:$FrontendPort"
    APP_FRONTEND_URL = "http://127.0.0.1:$FrontendPort"
    APP_FORCE_HTTPS = "false"
    LOG_LEVEL = "debug"
    SANCTUM_STATEFUL_DOMAINS = "127.0.0.1:$FrontendPort,localhost:$FrontendPort,127.0.0.1:$BackendPort,localhost:$BackendPort,localhost,127.0.0.1"
    CORS_ALLOWED_ORIGINS = "http://127.0.0.1:$FrontendPort,http://localhost:$FrontendPort"
    SESSION_SECURE_COOKIE = "false"
}
$savedEnv = @{}
foreach ($key in $backendEnv.Keys) {
    $savedEnv[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
    [Environment]::SetEnvironmentVariable($key, [string]$backendEnv[$key], "Process")
}
try {
    $backendProcess = Start-Process -FilePath "php" `
        -ArgumentList (@($phpArgs) + @("-S", "127.0.0.1:$BackendPort", "-t", $publicDir, $router)) `
        -WorkingDirectory $publicDir -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logDir "local-backend.out.log") `
        -RedirectStandardError $backendLog
} finally {
    foreach ($key in $savedEnv.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnv[$key], "Process") }
}

# --- start frontend ----------------------------------------------------------
Write-Host "  starting Vite frontend on :$FrontendPort ..." -ForegroundColor DarkGray
$npm = (Get-Command npm.cmd).Source
$viteLog = Join-Path $logDir "local-frontend.log"
$oldProxyTarget = $env:VITE_PROXY_TARGET
$env:VITE_PROXY_TARGET = "http://127.0.0.1:$BackendPort"
try {
    $frontendProcess = Start-Process -FilePath $npm `
        -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "$FrontendPort", "--strictPort") `
        -WorkingDirectory $repo -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logDir "local-frontend.out.log") `
        -RedirectStandardError $viteLog
} finally {
    if ($null -eq $oldProxyTarget) { Remove-Item Env:VITE_PROXY_TARGET -ErrorAction SilentlyContinue }
    else { $env:VITE_PROXY_TARGET = $oldProxyTarget }
}

$apiReady = Wait-For { Test-Http "http://127.0.0.1:$BackendPort/api/health" } 60 "Laravel API"
$frontReady = Wait-For { Test-Http "http://127.0.0.1:$FrontendPort/" } 90 "Vite frontend"
if (-not $apiReady) {
    Write-Host "  backend log:" -ForegroundColor DarkRed
    Get-Content (Join-Path $logDir "local-backend.out.log") -ErrorAction SilentlyContinue | Select-Object -Last 15 | Out-Host
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    throw "Laravel backend failed to start. See $backendLog"
}
if (-not $frontReady) {
    Write-Host "  frontend log:" -ForegroundColor DarkRed
    Get-Content (Join-Path $logDir "local-frontend.out.log") -ErrorAction SilentlyContinue | Select-Object -Last 15 | Out-Host
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    throw "Vite frontend failed to start. See $viteLog"
}

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "   ONLINE MALL CORDOVA - local development is running" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "   Frontend : http://127.0.0.1:$FrontendPort" -ForegroundColor Cyan
Write-Host "   API      : http://127.0.0.1:$BackendPort/api/health" -ForegroundColor Cyan
Write-Host "   Health   : http://127.0.0.1:$FrontendPort/api/health (via proxy)" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Demo accounts"
Write-Host "     admin    : admin@onlinemall.test    / Admin#2026Secure"
Write-Host "     worker   : worker@onlinemall.test   / Worker#2026Secure"
Write-Host "     customer : customer@onlinemall.test / Customer#2026Secure"
Write-Host ""
Write-Host "   Logs: $logDir\local-*.log" -ForegroundColor DarkGray
Write-Host "   Stop: Ctrl+C, or in another terminal:" -ForegroundColor DarkGray
Write-Host "         powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -Stop" -ForegroundColor DarkGray
Write-Host ""

if ($Open) { Start-Process "http://127.0.0.1:$FrontendPort" | Out-Null }

try {
    while ($true) {
        Start-Sleep -Seconds 2
        if ($backendProcess.HasExited) { throw "Laravel API exited unexpectedly. See $backendLog" }
        if ($frontendProcess.HasExited) { throw "Vite frontend exited unexpectedly. See $viteLog" }
    }
} finally {
    Write-Host ""
    Write-Host "  stopping local servers..." -ForegroundColor DarkGray
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Port $BackendPort
    Stop-Port $FrontendPort
    Write-Host "  Stopped." -ForegroundColor Green
}

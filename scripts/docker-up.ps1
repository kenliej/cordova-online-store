<#
.SYNOPSIS
    One-command Docker setup for the Online Mall stack (beginner friendly).

.DESCRIPTION
    Checks Docker, creates/repairs the root .env (APP_KEY, DB_PASSWORD), builds and
    starts PostgreSQL + Laravel API + nginx frontend + queue/scheduler/Mailpit, waits
    for the app to become healthy and seeds demo data only when the database is empty.
    It also starts Adminer, the optional database web UI.

    URLs afterwards:
      http://localhost:8080        application (frontend + API, same origin)
      http://localhost:8025        Mailpit (password-reset e-mails)
      http://127.0.0.1:8081/?pgsql=db   Adminer (database web UI)
      http://localhost:8080/api/health

.PARAMETER NoDbUi
    Do not start Adminer (the database web UI). Start it later with `npm run docker:db-ui`.

.PARAMETER Reset
    Delete the database/uploads volumes and start clean (demo data is reseeded).

.PARAMETER Down
    Stop the stack (keeps database/uploads volumes).

.PARAMETER Logs
    Follow the API + nginx logs.

.PARAMETER SkipBuild
    Start without rebuilding images (faster when only config changed).

.PARAMETER DryRun
    Prepare .env and print the Docker commands without executing them.

.PARAMETER EnvFile
    Optional custom .env path (used by tests/dry runs).

.EXAMPLE
    npm run docker:up
    npm run docker:up -- -Reset
    npm run docker:reset
    npm run docker:down

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/docker-up.ps1 -DryRun
#>
[CmdletBinding()]
param(
    [switch]$Reset,
    [switch]$Down,
    [switch]$Logs,
    [switch]$SkipBuild,
    [switch]$DryRun,
    [switch]$NoDbUi,
    [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDir)) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$repo = Split-Path -Parent $scriptDir
$composeFile = Join-Path $repo "docker-compose.yml"
$envExample = Join-Path $repo ".env.example"
$logDir = Join-Path $repo "test-results\logs"
if (-not $EnvFile) { $EnvFile = Join-Path $repo ".env" }
elseif (-not [System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile = Join-Path $repo $EnvFile }

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-EnvValue([string]$Path, [string]$Key) {
    if (-not (Test-Path -LiteralPath $Path)) { return "" }
    foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
        if ($line -match ('^\s*' + [regex]::Escape($Key) + '\s*=\s*(.*)$')) {
            return $matches[1].Trim().Trim('"')
        }
    }
    return ""
}

function Set-EnvValue([string]$Path, [string]$Key, [string]$Value) {
    $lines = [System.IO.File]::ReadAllLines($Path)
    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match ('^\s*' + [regex]::Escape($Key) + '\s*=')) {
            $lines[$i] = "$Key=$Value"
            $found = $true
            break
        }
    }
    if (-not $found) { $lines = $lines + "$Key=$Value" }
    [System.IO.File]::WriteAllLines($Path, $lines, (New-Object System.Text.UTF8Encoding($false)))
}

function New-RandomSecret([int]$Bytes = 32) {
    $buffer = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($buffer)
}

function Get-PhpBase64Key {
    $php = Get-Command php -ErrorAction SilentlyContinue
    if (-not $php) { return "" }
    try {
        $key = (& php -r "echo 'base64:'.base64_encode(random_bytes(32));" 2>$null) -join ''
        if ($key -match '^base64:[A-Za-z0-9+/=]{40,}$') { return $key.Trim() }
    } catch { }
    return ""
}

# Runs the docker CLI safely. Docker writes progress/build output to stderr;
# PowerShell 5.1 with ErrorActionPreference=Stop turns any stderr line into a
# terminating NativeCommandError, which would abort this script mid-build.
function Invoke-DockerCli {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [switch]$SuppressOutput
    )
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if ($SuppressOutput) {
            & docker @Arguments 2>&1 | Out-Null
        } else {
            & docker @Arguments 2>&1 | Out-Host
        }
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
}

function Invoke-Compose {
    param([string[]]$Arguments)
    if ($DryRun) {
        Write-Host ("  [dry-run] docker compose {0}" -f ($Arguments -join ' ')) -ForegroundColor DarkGray
        return 0
    }
    $code = Invoke-DockerCli -Arguments (@("compose", "-f", $composeFile) + $Arguments)
    if ($code -ne 0) { throw ("docker compose {0} failed (exit {1})" -f ($Arguments -join ' '), $code) }
    return $code
}

# ---------------------------------------------------------------------------
# Realtime console UI: spinner + elapsed time + last Docker build line.
# ---------------------------------------------------------------------------
$script:IsInteractiveConsole = $true
try { $script:IsInteractiveConsole = -not [Console]::IsOutputRedirected } catch { }
$script:TaskStart = Get-Date
$script:TaskTitle = ""
$script:Spinner = @("|", "/", "-", "\")
$script:SpinnerIndex = 0

function Format-Duration([TimeSpan]$Span) {
    if ($Span.TotalMinutes -ge 1) {
        return ("{0:00}:{1:00}" -f [int][Math]::Floor($Span.TotalMinutes), $Span.Seconds)
    }
    return ("{0:0.0}s" -f $Span.TotalSeconds)
}

function Clear-SpinnerLine {
    if (-not $script:IsInteractiveConsole) { return }
    $width = 1
    try { $width = [Math]::Max(20, [Console]::WindowWidth - 1) } catch { }
    Write-Host ("`r" + (" " * $width) + "`r") -NoNewline
}

function Write-TaskLine([string]$Text, [ConsoleColor]$Color = [ConsoleColor]::Gray) {
    Clear-SpinnerLine
    Write-Host $Text -ForegroundColor $Color
}

function Start-Task([string]$Title) {
    $script:TaskTitle = $Title
    $script:TaskStart = Get-Date
    $script:SpinnerIndex = 0
    if (-not $script:IsInteractiveConsole) {
        Write-Host "  [..] $Title" -ForegroundColor DarkGray
    }
}

function Update-Task([string]$Detail = "") {
    if (-not $script:IsInteractiveConsole) { return }
    $elapsed = (Get-Date) - $script:TaskStart
    $frame = $script:Spinner[$script:SpinnerIndex % $script:Spinner.Count]
    $script:SpinnerIndex++
    $width = 1
    try { $width = [Math]::Max(30, [Console]::WindowWidth - 1) } catch { }
    $line = "  $frame $($script:TaskTitle)  [$((Format-Duration $elapsed))]"
    if ($Detail) { $line += "  $Detail" }
    if ($line.Length -gt $width) { $line = $line.Substring(0, $width - 1) }
    Write-Host ("`r" + $line.PadRight($width)) -NoNewline -ForegroundColor Cyan
}

function Complete-Task([string]$Detail = "") {
    $elapsed = (Get-Date) - $script:TaskStart
    $text = "  [OK] $($script:TaskTitle)  ($(Format-Duration $elapsed))"
    if ($Detail) { $text += " - $Detail" }
    Write-TaskLine $text Green
}

function Fail-Task([string]$Detail = "") {
    $elapsed = (Get-Date) - $script:TaskStart
    $text = "  [FAIL] $($script:TaskTitle)  ($(Format-Duration $elapsed))"
    if ($Detail) { $text += " - $Detail" }
    Write-TaskLine $text Red
}

function Get-LastLogLine([string[]]$Paths) {
    foreach ($path in $Paths) {
        if (-not (Test-Path -LiteralPath $path)) { continue }
        try {
            $tail = Get-Content -LiteralPath $path -Tail 3 -ErrorAction Stop
            if ($tail) {
                for ($i = $tail.Count - 1; $i -ge 0; $i--) {
                    $candidate = ($tail[$i] -replace '\x1B\[[0-9;]*[A-Za-z]', '') -replace '\s+', ' '
                    $candidate = $candidate.Trim()
                    if ($candidate) { return $candidate }
                }
            }
        } catch { }
    }
    return ""
}

# Runs a long docker compose command with a live spinner and shows the last
# Docker output line while working. Full output is saved under test-results/logs.
function Invoke-ComposeWithProgress {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$LogName = "docker-compose"
    )
    if ($DryRun) {
        Write-Host ("  [dry-run] docker compose {0}" -f ($Arguments -join ' ')) -ForegroundColor DarkGray
        return 0
    }
    if (-not (Test-Path -LiteralPath $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    $outLog = Join-Path $logDir "$LogName.out.log"
    $errLog = Join-Path $logDir "$LogName.err.log"
    $exitFile = Join-Path $logDir "$LogName.exitcode.txt"
    $runner = Join-Path $logDir "$LogName.cmd"
    Remove-Item $outLog, $errLog, $exitFile, $runner -Force -ErrorAction SilentlyContinue

    # Windows PowerShell 5.1's Start-Process -PassThru does not expose ExitCode
    # for native commands. Run through a tiny .cmd wrapper that writes the code
    # to a file; stdout/stderr are redirected so we can show the latest line.
    $argumentLine = $Arguments -join ' '
    $runnerLines = @(
        '@echo off',
        ('docker compose -f "{0}" {1} > "{2}" 2> "{3}"' -f $composeFile, $argumentLine, $outLog, $errLog),
        ('echo %ERRORLEVEL% > "{0}"' -f $exitFile)
    )
    [System.IO.File]::WriteAllLines($runner, $runnerLines, (New-Object System.Text.ASCIIEncoding))

    Start-Task $Title
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList @("/d", "/c", "`"$runner`"") `
        -WorkingDirectory $repo -WindowStyle Hidden -PassThru
    $lastDetail = ""
    $lastDetailUpdate = Get-Date
    while (-not $process.HasExited) {
        Update-Task $lastDetail
        $now = Get-Date
        if (($now - $lastDetailUpdate).TotalMilliseconds -ge 500) {
            $line = Get-LastLogLine @($errLog, $outLog)
            if ($line -and $line -ne $lastDetail) { $lastDetail = $line }
            $lastDetailUpdate = $now
        }
        Start-Sleep -Milliseconds 150
    }
    $process.WaitForExit()

    $code = $null
    for ($attempt = 0; $attempt -lt 20 -and $null -eq $code; $attempt++) {
        if (Test-Path -LiteralPath $exitFile) {
            $raw = [System.IO.File]::ReadAllText($exitFile)
            if ($raw -match '-?\d+') { $code = [int]$Matches[0] }
        }
        if ($null -eq $code) { Start-Sleep -Milliseconds 50 }
    }
    if ($null -eq $code) { $code = 1 }

    if ($code -ne 0) {
        Fail-Task "exit code $code"
        Write-Host "  --- last Docker output ---" -ForegroundColor DarkRed
        Get-Content -LiteralPath $errLog -Tail 25 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
        Get-Content -LiteralPath $outLog -Tail 25 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
        throw ("docker compose {0} failed (exit {1})" -f ($Arguments -join ' '), $code)
    }
    Complete-Task
    return $code
}

$script:SetupStart = Get-Date
Write-Host ""
Write-Host "  +--------------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |   ONLINE MALL CORDOVA   -   Docker setup / launch             |" -ForegroundColor Cyan
Write-Host "  +--------------------------------------------------------------+" -ForegroundColor Cyan

# --- prerequisite checks -----------------------------------------------------
if (-not $DryRun) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "Docker is not installed (or is not in PATH)." -ForegroundColor Red
        Write-Host ""
        Write-Host "  1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
        Write-Host "  2. Start Docker Desktop and wait until it says 'Engine running'."
        Write-Host "  3. Close and reopen this terminal, then run: npm run docker:up"
        Write-Host ""
        Write-Host "  On Windows, Docker Desktop needs WSL2: https://docs.docker.com/desktop/setup/install/windows-install/"
        exit 1
    }

    $infoCode = Invoke-DockerCli -Arguments @("info", "--format", "{{.ServerVersion}}") -SuppressOutput
    if ($infoCode -ne 0) {
        Write-Host "Docker is installed but the engine is not running." -ForegroundColor Red
        Write-Host "  Start 'Docker Desktop' from the Start menu, wait for 'Engine running', then retry."
        exit 1
    }

    $composeCode = Invoke-DockerCli -Arguments @("compose", "version") -SuppressOutput
    if ($composeCode -ne 0) {
        Write-Host "Docker Compose v2 is required (comes with Docker Desktop)." -ForegroundColor Red
        exit 1
    }
}

# --- .env bootstrap ----------------------------------------------------------
Write-Step "Preparing .env"
if (-not (Test-Path -LiteralPath $EnvFile)) {
    Copy-Item -LiteralPath $envExample -Destination $EnvFile
    Write-Host "  created $EnvFile from .env.example"
}

if ((Get-EnvValue $EnvFile "APP_KEY") -eq "") {
    $key = Get-PhpBase64Key
    if ($key -eq "") {
        $key = "base64:" + (New-RandomSecret 32)
    }
    Set-EnvValue $EnvFile "APP_KEY" $key
    Write-Host "  generated APP_KEY"
}

if ((Get-EnvValue $EnvFile "DB_PASSWORD") -eq "") {
    Set-EnvValue $EnvFile "DB_PASSWORD" (New-RandomSecret 18)
    Write-Host "  generated DB_PASSWORD (stored in .env)"
}

$webPort = Get-EnvValue $EnvFile "WEB_PORT"
if (-not $webPort) { $webPort = "8080" }
$mailpitPort = Get-EnvValue $EnvFile "MAILPIT_UI_PORT"
if (-not $mailpitPort) { $mailpitPort = "8025" }
$adminerPort = Get-EnvValue $EnvFile "ADMINER_PORT"
if (-not $adminerPort) { $adminerPort = "8081" }

if ($Down) {
    Write-Step "Stopping the stack (database volume is kept)"
    $null = Invoke-Compose @("down")
    Write-Host "Stopped. Data is preserved in the Docker volumes." -ForegroundColor Green
    exit 0
}

if ($Logs -and $DryRun) {
    Write-Host "  [dry-run] docker compose logs -f app web" -ForegroundColor DarkGray
    exit 0
}
if ($Logs) {
    $null = Invoke-DockerCli -Arguments @("compose", "-f", $composeFile, "logs", "-f", "app", "web")
    exit 0
}

if ($Reset) {
    Write-Step "Removing containers + volumes (database and uploads are deleted)"
    $null = Invoke-Compose @("down", "-v")
}

# --- build + start -----------------------------------------------------------
Write-Step "Building and starting PostgreSQL, API, frontend, queue, scheduler, Mailpit"
Write-Host "  The first build downloads images and takes several minutes. Be patient!" -ForegroundColor DarkGray
$upArguments = @("up", "-d")
if (-not $SkipBuild) { $upArguments += "--build" }
$null = Invoke-ComposeWithProgress -Title "Building images and starting containers" -Arguments $upArguments -LogName "docker-up"

if ($DryRun) {
    if (-not $NoDbUi) {
        Write-Host "  [dry-run] docker compose --profile tools up -d adminer" -ForegroundColor DarkGray
    }
    Write-Step "Dry run complete"
    Write-Host "  No containers were started. Run without -DryRun to start the stack."
    exit 0
}

# --- wait for health ---------------------------------------------------------
Write-Step "Waiting for the application to become healthy (up to 5 minutes)"
$healthUrl = "http://localhost:$webPort/api/health"
$healthy = $false
$attempts = 0
$deadline = (Get-Date).AddMinutes(5)
Start-Task "Waiting for the app to answer /api/health"
while ((Get-Date) -lt $deadline) {
    $attempts++
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200 -and $response.Content -match '"status"\s*:\s*"ok"') {
            $healthy = $true
            break
        }
    } catch { }
    Update-Task "check $attempts"
    Start-Sleep -Seconds 2
}

if (-not $healthy) {
    Fail-Task "timed out after 5 minutes"
    Write-Host "The stack did not become healthy in time." -ForegroundColor Red
    $null = Invoke-DockerCli -Arguments @("compose", "-f", $composeFile, "ps")
    $null = Invoke-DockerCli -Arguments @("compose", "-f", $composeFile, "logs", "--tail=80", "app", "web")
    throw "Health check failed: $healthUrl"
}
Complete-Task "healthy after $attempts check(s)"

# --- seed demo data only when empty -----------------------------------------
Write-Step "Seeding demo data (only when the database is empty)"
$null = Invoke-ComposeWithProgress -Title "Seeding demo data" -Arguments @("exec", "-T", "app", "php", "artisan", "app:seed-demo", "--force") -LogName "docker-seed"

# --- optional database web UI ------------------------------------------------
if (-not $NoDbUi) {
    Write-Step "Starting the database web UI (Adminer)"
    try {
        $null = Invoke-ComposeWithProgress -Title "Starting database web UI (Adminer)" -Arguments @("--profile", "tools", "up", "-d", "adminer") -LogName "docker-adminer"
    } catch {
        Write-Host "  warning: Adminer could not start: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "  The app is still running; start it later with: npm run docker:db-ui" -ForegroundColor DarkGray
    }
}

# --- summary -----------------------------------------------------------------
$totalElapsed = (Get-Date) - $script:SetupStart
Write-Host ""
Write-Host "  +--------------------------------------------------------------+" -ForegroundColor Green
Write-Host "  |   ONLINE MALL CORDOVA   -   Docker stack is running           |" -ForegroundColor Green
Write-Host "  +--------------------------------------------------------------+" -ForegroundColor Green
Write-Host "   App          : http://localhost:$webPort" -ForegroundColor Cyan
Write-Host "   API health   : http://localhost:$webPort/api/health" -ForegroundColor Cyan
Write-Host "   Mailpit      : http://127.0.0.1:$mailpitPort (password-reset e-mails)" -ForegroundColor Cyan
if ($NoDbUi) {
    Write-Host "   Database UI  : not started (-NoDbUi); run  npm run docker:db-ui" -ForegroundColor Yellow
} else {
    Write-Host "   Database UI  : http://127.0.0.1:$adminerPort/?pgsql=db" -ForegroundColor Cyan
}
Write-Host "   Ready in     : $(Format-Duration $totalElapsed)" -ForegroundColor Green
Write-Host ""
Write-Host "   Demo accounts (all @gaisano-cordova.com)"
Write-Host "     admins   : admin@, admin-kenlie@, admin-sherwynn@, admin-dudes@, admin-charlie@  / admin@0912345"
Write-Host "     workers  : worker@, worker-kenlie@, worker-sherwynn@, worker-dudes@, worker-charlie@  / admin@0912345"
Write-Host "     customer : customer@gaisano-cordova.com / Customer#2026Secure"
Write-Host ""
Write-Host "   Common commands"
Write-Host "     docker compose ps                     # container status"
Write-Host "     docker compose logs -f app web        # live logs"
Write-Host "     docker compose down                   # stop (keeps data)"
Write-Host "     npm run docker:reset                  # stop + delete data + start clean"
Write-Host "     docker compose exec app php artisan tinker   # not available (no dev deps)"
Write-Host "     docker compose exec app php artisan user:create-admin you@example.com"
Write-Host ""
Write-Host "   Database shell"
Write-Host "     docker compose exec db psql -U onlinemall -d online_mall"
Write-Host ""
Write-Host "   Guide: docs/DOCKER-QUICKSTART.md" -ForegroundColor DarkGray
Write-Host ""

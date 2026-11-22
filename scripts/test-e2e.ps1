<#
.SYNOPSIS
    Full local test run for BOTH deployment shapes.

.DESCRIPTION
    1. Backend PHPUnit suite (SQLite memory).
    2. Docker/nginx build: built SPA + proxy on http://127.0.0.1:8080
       (cookie auth, same origin) and Playwright project `docker-same-origin`.
    3. cPanel/Vercel build: split SPA on http://127.0.0.1:8091 talking to a
       Laravel API under /omc-backend on http://127.0.0.1:8092 (Bearer token +
       CORS) and Playwright project `cpanel-split`.
    4. Docker verification: live build/up/E2E when Docker is available,
       otherwise 38 static configuration checks.

.PARAMETER SkipBackendTests
    Skip `php artisan test`.

.PARAMETER SkipFrontendBuild
    Reuse existing dist/ and dist-e2e-split/ builds.

.PARAMETER SkipDocker
    Skip the Docker phase entirely (no live build, no static checks).

.PARAMETER KeepServers
    Leave the local servers running after the run (for manual browsing).

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-e2e.ps1

.EXAMPLE
    # On a machine with a Docker engine:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-e2e.ps1
#>
[CmdletBinding()]
param(
    [switch]$SkipBackendTests,
    [switch]$SkipFrontendBuild,
    [switch]$SkipDocker,
    [switch]$KeepServers
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$scriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDir)) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$repo = Split-Path -Parent $scriptDir
$logDir = Join-Path $repo "test-results\logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$script:units = @()
$script:results = @()

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host ("=" * 78) -ForegroundColor DarkGray
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host ("=" * 78) -ForegroundColor DarkGray
}

function Record-Result([string]$Name, [bool]$Ok, [string]$Detail = "") {
    $script:results += [pscustomobject]@{ Check = $Name; Result = $(if ($Ok) { "PASS" } else { "FAIL" }); Detail = $Detail }
    if ($Ok) {
        Write-Host "  PASS  $Name" -ForegroundColor Green
    } else {
        Write-Host "  FAIL  $Name" -ForegroundColor Red
        if ($Detail) { Write-Host "        $Detail" -ForegroundColor DarkRed }
    }
}

function Invoke-Native {
    # PowerShell 5.1 turns native stderr output into ErrorRecords; with
    # ErrorActionPreference=Stop that becomes a terminating error even when the
    # command succeeded (e.g. npm/Vite warnings). Run native tools with a local
    # Continue preference and return their real exit code.
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$Arguments = @(),
        [string]$WorkingDirectory = "",
        [int]$Tail = 0,
        [string]$LogPath = "",
        [hashtable]$EnvVars = @{}
    )

    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    if (-not $WorkingDirectory) { $WorkingDirectory = $repo }
    $savedEnv = @{}
    foreach ($key in $EnvVars.Keys) {
        $savedEnv[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
        [Environment]::SetEnvironmentVariable($key, [string]$EnvVars[$key], "Process")
    }
    Push-Location $WorkingDirectory
    try {
        if ($LogPath) {
            if ($Tail -gt 0) {
                & $FilePath @Arguments 2>&1 | Tee-Object -FilePath $LogPath | Select-Object -Last $Tail | Out-Host
            } else {
                & $FilePath @Arguments 2>&1 | Tee-Object -FilePath $LogPath | Out-Host
            }
        } else {
            if ($Tail -gt 0) {
                & $FilePath @Arguments 2>&1 | Select-Object -Last $Tail | Out-Host
            } else {
                & $FilePath @Arguments 2>&1 | Out-Host
            }
        }
        $code = $LASTEXITCODE
    } finally {
        foreach ($key in $savedEnv.Keys) {
            [Environment]::SetEnvironmentVariable($key, $savedEnv[$key], "Process")
        }
        Pop-Location
        $ErrorActionPreference = $previous
    }

    return $code
}

function Get-PhpPgArgs {
    $loaded = (& php -r "echo extension_loaded('pdo_pgsql') ? '1' : '0';" 2>$null) -join ''
    if ($loaded.Trim() -eq '1') { return @() }
    Write-Host "  pdo_pgsql is not enabled globally; using -d extension=pdo_pgsql for PHP commands." -ForegroundColor DarkGray
    return @('-d', 'extension=pdo_pgsql')
}

function Test-PortOpen([string]$HostName, [int]$Port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(1500)) { $client.Close(); return $false }
        $client.EndConnect($async)
        $client.Close()
        return $true
    } catch {
        return $false
    }
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

function Stop-Port([int]$Port) {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

function Wait-Http([string]$Url, [int]$TimeoutSec = 90, [int[]]$Accept = @(200)) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -Headers @{ Accept = "*/*" }
            if ($Accept -contains [int]$response.StatusCode) { return $true }
        } catch {
            $response = $_.Exception.Response
            if ($response -and ($Accept -contains [int]$response.StatusCode)) { return $true }
        }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    return $false
}

function Get-NpmPath {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npm) { return $npm.Source }
    $candidate = Join-Path $env:ProgramFiles "nodejs\npm.cmd"
    if (Test-Path $candidate) { return $candidate }
    throw "npm.cmd not found."
}

function Start-Server {
    param(
        [string]$Name,
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [hashtable]$EnvVars = @{}
    )

    $stdout = Join-Path $logDir "$Name.out.log"
    $stderr = Join-Path $logDir "$Name.err.log"
    Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue

    $saved = @{}
    foreach ($key in $EnvVars.Keys) {
        $saved[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
        [Environment]::SetEnvironmentVariable($key, [string]$EnvVars[$key], "Process")
    }

    try {
        $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    } finally {
        foreach ($key in $saved.Keys) {
            [Environment]::SetEnvironmentVariable($key, $saved[$key], "Process")
        }
    }

    $script:units += [pscustomobject]@{ Name = $Name; Process = $process }
    return $process
}

function Stop-AllServers {
    foreach ($unit in $script:units) {
        if ($null -ne $unit.Process -and -not $unit.Process.HasExited) {
            Stop-Process -Id $unit.Process.Id -Force -ErrorAction SilentlyContinue
        }
    }
    $script:units = @()
}

function Invoke-Playwright([string]$Project, [string]$LogName, [hashtable]$EnvVars = @{}) {
    $cli = Join-Path $repo "node_modules\@playwright\test\cli.js"
    if (-not (Test-Path $cli)) { throw "Playwright is not installed. Run: npm install -D @playwright/test --legacy-peer-deps" }

    $log = Join-Path $logDir "$LogName.log"
    $saved = @{}
    foreach ($key in $EnvVars.Keys) {
        $saved[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
        [Environment]::SetEnvironmentVariable($key, [string]$EnvVars[$key], "Process")
    }
    if (-not $env:PLAYWRIGHT_CHANNEL) { $env:PLAYWRIGHT_CHANNEL = "chrome" }

    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    Push-Location $repo
    try {
        & node $cli test --config "tests/e2e/playwright.config.ts" --project $Project 2>&1 | Tee-Object -FilePath $log | Out-Host
        $code = $LASTEXITCODE
    } finally {
        Pop-Location
        $ErrorActionPreference = $previous
        foreach ($key in $saved.Keys) {
            [Environment]::SetEnvironmentVariable($key, $saved[$key], "Process")
        }
    }

    return [pscustomobject]@{ ExitCode = $code; Log = $log }
}
Write-Host ""
Write-Host "Online Mall Cordova - two-build local test run" -ForegroundColor Yellow
Write-Host "Repository: $repo"

# ---------------------------------------------------------------------------
Write-Section "0. Prerequisites"
# ---------------------------------------------------------------------------
$phpCommand = Get-Command php -ErrorAction SilentlyContinue
Record-Result "PHP CLI available" ($null -ne $phpCommand) "php not found in PATH"
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
Record-Result "Node.js available" ($null -ne $nodeCommand) "node not found in PATH"
if (-not $phpCommand -or -not $nodeCommand) { throw "PHP and Node.js are required." }
$npm = Get-NpmPath
$script:phpArgs = Get-PhpPgArgs
$backendDir = Join-Path $repo "backend"
$envFile = Join-Path $backendDir ".env"

$router = Join-Path $repo "backend\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"
Record-Result "Laravel installed (vendor/)" ((Test-Path $router) -and (Test-Path (Join-Path $repo "backend\artisan"))) "Run composer install in backend/"

# PostgreSQL (configured in backend/.env)
$dbDriver = Get-DotEnvValue $envFile "DB_CONNECTION"
if (-not $dbDriver) { $dbDriver = "pgsql" }
$dbHost = Get-DotEnvValue $envFile "DB_HOST"
if (-not $dbHost) { $dbHost = "127.0.0.1" }
$dbPortText = Get-DotEnvValue $envFile "DB_PORT"
if (-not $dbPortText) { $dbPortText = "5432" }
$dbPort = [int]$dbPortText
$dbName = Get-DotEnvValue $envFile "DB_DATABASE"
if (-not $dbName) { $dbName = "online_mall" }
$dbUser = Get-DotEnvValue $envFile "DB_USERNAME"
$dbPassword = Get-DotEnvValue $envFile "DB_PASSWORD"
$dbSslMode = Get-DotEnvValue $envFile "DB_SSLMODE"
if (-not $dbSslMode) { $dbSslMode = "prefer" }

Record-Result "Backend configured for PostgreSQL" ($dbDriver -eq "pgsql") "backend/.env: DB_CONNECTION=$dbDriver"
if ($dbDriver -ne "pgsql") { throw "This test runner expects PostgreSQL (DB_CONNECTION=pgsql in backend/.env)." }

$dbListening = Test-PortOpen $dbHost $dbPort
if (-not $dbListening) {
    $pgCtl = $env:OMC_PG_CTL
    if (-not $pgCtl) { $pgCtl = Join-Path $repo ".tools\pgsql\bin\pg_ctl.exe" }
    $pgData = $env:OMC_PGDATA
    if (-not $pgData) { $pgData = Join-Path $repo ".tools\pgdata" }
    $pgLog = Join-Path $repo ".tools\postgres-local.log"
    if ((Test-Path $pgCtl) -and (Test-Path $pgData)) {
        Write-Host "  starting local PostgreSQL ($pgCtl)..." -ForegroundColor DarkGray
        $arguments = "-D `"$pgData`" -l `"$pgLog`" -o `"-p $dbPort -c listen_addresses=$dbHost`" start"
        Start-Process -FilePath $pgCtl -ArgumentList $arguments -WindowStyle Hidden | Out-Null
        $deadline = (Get-Date).AddSeconds(40)
        while (-not (Test-PortOpen $dbHost $dbPort) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
        $dbListening = Test-PortOpen $dbHost $dbPort
    }
}
Record-Result "PostgreSQL listening on ${dbHost}:${dbPort}" $dbListening "Start PostgreSQL, or set OMC_PG_CTL/OMC_PGDATA (see docs/TESTING-BOTH-BUILDS.md)."
if (-not $dbListening) { throw "PostgreSQL is required for integration/E2E tests." }

# Clean any stale dev servers from previous runs.
foreach ($port in @(8000, 8080, 8091, 8092)) { Stop-Port $port }

$sameOriginSucceeded = $false
$splitSucceeded = $false

try {
    # -----------------------------------------------------------------------
    Write-Section "1. Backend test suite (SQLite memory + PostgreSQL 16)"
    # -----------------------------------------------------------------------
    if ($SkipBackendTests) {
        Write-Host "  skipped (-SkipBackendTests)" -ForegroundColor Yellow
    } else {
        $log = Join-Path $logDir "backend-tests-sqlite.log"
        $code = Invoke-Native -FilePath "php" -Arguments (@($script:phpArgs) + @("artisan", "test")) -WorkingDirectory $backendDir -Tail 6 -LogPath $log
        Record-Result "Backend test suite (SQLite)" ($code -eq 0) "See $log"

        # PostgreSQL suite: needs a separate test database + psql client.
        $psql = $env:OMC_PSQL
        if (-not $psql) {
            $candidate = Join-Path $repo ".tools\pgsql\bin\psql.exe"
            if (Test-Path $candidate) { $psql = $candidate }
        }
        if (-not $psql) {
            $psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
            if ($psqlCommand) { $psql = $psqlCommand.Source }
        }

        if ($psql) {
            $pgTestDb = "online_mall_test"
            $previousPgpPassword = $env:PGPASSWORD
            $env:PGPASSWORD = $dbPassword
            try {
                $exists = (& $psql -h $dbHost -p $dbPort -U $dbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$pgTestDb'" 2>$null) -join ''
                if ($exists.Trim() -ne '1') {
                    & $psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "CREATE DATABASE \"$pgTestDb\"" 2>&1 | Out-Null
                }
            } finally {
                if ($null -eq $previousPgpPassword) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
                else { $env:PGPASSWORD = $previousPgpPassword }
            }

            $pgLog = Join-Path $logDir "backend-tests-postgres.log"
            $pgCode = Invoke-Native -FilePath "php" `
                -Arguments (@($script:phpArgs) + @("vendor/bin/phpunit", "-c", "phpunit.pgsql.xml")) `
                -WorkingDirectory $backendDir -Tail 4 -LogPath $pgLog `
                -EnvVars @{
                    DB_CONNECTION = "pgsql";
                    DB_HOST = $dbHost;
                    DB_PORT = "$dbPort";
                    DB_DATABASE = $pgTestDb;
                    DB_USERNAME = $dbUser;
                    DB_PASSWORD = $dbPassword;
                    DB_SSLMODE = $dbSslMode;
                }
            Record-Result "Backend test suite (PostgreSQL)" ($pgCode -eq 0) "See $pgLog"
        } else {
            Write-Host "  psql not found - skipping the PostgreSQL test suite (set OMC_PSQL to the psql executable)." -ForegroundColor Yellow
        }
    }

    # -----------------------------------------------------------------------
    Write-Section "2. Reset demo database (deterministic E2E data)"
    # -----------------------------------------------------------------------
    Invoke-Native -FilePath "php" -Arguments (@($script:phpArgs) + @("artisan", "config:clear")) -WorkingDirectory $backendDir | Out-Null
    $resetCode = Invoke-Native -FilePath "php" -Arguments (@($script:phpArgs) + @("artisan", "migrate:fresh", "--seed", "--force")) -WorkingDirectory $backendDir -Tail 4
    Invoke-Native -FilePath "php" -Arguments (@($script:phpArgs) + @("artisan", "cache:clear")) -WorkingDirectory $backendDir | Out-Null
    Record-Result "Demo database reset + seeded" ($resetCode -eq 0)

    # -----------------------------------------------------------------------
    Write-Section "3. Build the two frontend bundles"
    # -----------------------------------------------------------------------
    if ($SkipFrontendBuild) {
        Write-Host "  reusing existing builds (-SkipFrontendBuild)" -ForegroundColor Yellow
    } else {
        $codeOne = Invoke-Native -FilePath $npm -Arguments @("run", "build") -WorkingDirectory $repo -Tail 3
        $codeTwo = Invoke-Native -FilePath $npm -Arguments @("run", "build:local-split") -WorkingDirectory $repo -Tail 3
        Record-Result "Same-origin (Docker) frontend build" ($codeOne -eq 0) "dist/"
        Record-Result "Split (cPanel/Vercel) frontend build" ($codeTwo -eq 0) "dist-e2e-split/"
    }

    $dockerDist = Join-Path $repo "dist\index.html"
    $splitDist = Join-Path $repo "dist-e2e-split\index.html"
    Record-Result "Built artifacts present" ((Test-Path $dockerDist) -and (Test-Path $splitDist)) "missing dist/index.html or dist-e2e-split/index.html"
    if (-not ((Test-Path $dockerDist) -and (Test-Path $splitDist))) { throw "Frontend builds missing." }

    # -----------------------------------------------------------------------
    Write-Section "4. Start local backends"
    # -----------------------------------------------------------------------
    $publicDir = Join-Path $repo "backend\public"
    Start-Server -Name "laravel-same-origin" -FilePath "php" -Arguments (@($script:phpArgs) + @("-S", "127.0.0.1:8000", "-t", $publicDir, $router)) -WorkingDirectory $publicDir -EnvVars @{
        APP_ENV = "local";
        APP_DEBUG = "true";
        APP_URL = "http://127.0.0.1:8080";
        APP_FRONTEND_URL = "http://127.0.0.1:8080";
        SANCTUM_STATEFUL_DOMAINS = "127.0.0.1:8080,localhost:8080,127.0.0.1,localhost";
        CORS_ALLOWED_ORIGINS = "http://127.0.0.1:8080,http://127.0.0.1:5173";
    } | Out-Null

    Start-Server -Name "laravel-cpanel-sim" -FilePath "php" -Arguments (@($script:phpArgs) + @("-S", "127.0.0.1:8092", "-t", $publicDir, (Join-Path $repo "scripts\cpanel-subdir-sim.php"))) -WorkingDirectory $repo -EnvVars @{
        APP_ENV = "production";
        APP_DEBUG = "false";
        APP_URL = "http://127.0.0.1:8092/omc-backend";
        APP_FRONTEND_URL = "http://127.0.0.1:8091";
        APP_FORCE_HTTPS = "false";
        TRUSTED_HOSTS = "127.0.0.1";
        CORS_ALLOWED_ORIGINS = "http://127.0.0.1:8091";
        CORS_SUPPORTS_CREDENTIALS = "false";
        SANCTUM_STATEFUL_DOMAINS = "kjugarap.top";
        SANCTUM_EXPIRATION = "10080";
        LOG_LEVEL = "info";
    } | Out-Null

    Start-Server -Name "node-docker-sim" -FilePath "node" -Arguments @("scripts\serve-docker-sim.mjs", "8080", "dist", "http://127.0.0.1:8000") -WorkingDirectory $repo | Out-Null
    Start-Server -Name "node-split-static" -FilePath "node" -Arguments @("scripts\serve-static.mjs", "8091", "dist-e2e-split") -WorkingDirectory $repo | Out-Null

    $sameOriginReady = Wait-Http "http://127.0.0.1:8080/healthz" 120
    $splitStaticReady = Wait-Http "http://127.0.0.1:8091/" 60
    $sameOriginApiReady = Wait-Http "http://127.0.0.1:8000/api/health" 60
    $cpanelApiReady = Wait-Http "http://127.0.0.1:8092/omc-backend/api/health" 60

    Record-Result "Same-origin stack reachable (:8080 + :8000)" ($sameOriginReady -and $sameOriginApiReady) "see test-results/logs"
    Record-Result "cPanel-style stack reachable (:8091 + :8092 /omc-backend)" ($splitStaticReady -and $cpanelApiReady) "see test-results/logs"
    if (-not ($sameOriginReady -and $splitStaticReady -and $cpanelApiReady)) {
        throw "Local servers did not become ready; inspect test-results/logs/*.err.log"
    }

    # -----------------------------------------------------------------------
    Write-Section "5. Browser E2E - Docker/same-origin build (cookie auth)"
    # -----------------------------------------------------------------------
    $sameRun = Invoke-Playwright -Project "docker-same-origin" -LogName "playwright-same-origin"
    $sameOriginSucceeded = ($sameRun.ExitCode -eq 0)
    Record-Result "Browser E2E: docker-same-origin" $sameOriginSucceeded "Log: $($sameRun.Log)"

    # -----------------------------------------------------------------------
    Write-Section "6. Browser E2E - cPanel/split build (Bearer + CORS)"
    # -----------------------------------------------------------------------
    $splitRun = Invoke-Playwright -Project "cpanel-split" -LogName "playwright-cpanel-split"
    $splitSucceeded = ($splitRun.ExitCode -eq 0)
    Record-Result "Browser E2E: cpanel-split" $splitSucceeded "Log: $($splitRun.Log)"

    if ($KeepServers) {
        Write-Host ""
        Write-Host "Servers left running (-KeepServers):" -ForegroundColor Yellow
        Write-Host "  same-origin Docker build : http://127.0.0.1:8080"
        Write-Host "  split/cPanel frontend    : http://127.0.0.1:8091"
        Write-Host "  split API                : http://127.0.0.1:8092/omc-backend/api/health"
        Write-Host "  local API (cookie)       : http://127.0.0.1:8000/api/health"
    } else {
        Stop-AllServers
        foreach ($port in @(8000, 8080, 8091, 8092)) { Stop-Port $port }
    }

    # -----------------------------------------------------------------------
    Write-Section "7. Docker build verification"
    # -----------------------------------------------------------------------
    if ($SkipDocker) {
        Write-Host "  skipped (-SkipDocker)" -ForegroundColor Yellow
    } else {
        $docker = Get-Command docker -ErrorAction SilentlyContinue
        if (-not $docker) {
            Write-Host "  Docker engine not available on this machine - running static configuration checks." -ForegroundColor Yellow
            $validator = Join-Path $repo "scripts\validate-docker-config.py"
            $python = Get-Command python -ErrorAction SilentlyContinue
            if ($python -and (Test-Path $validator)) {
                $dockerStaticCode = Invoke-Native -FilePath "python" -Arguments @($validator) -WorkingDirectory $repo -Tail 4
                $dockerStaticOk = ($dockerStaticCode -eq 0)
            } else {
                $dockerStaticOk = $false
            }
            Record-Result "Docker static configuration validation" $dockerStaticOk "Live image build skipped: no Docker engine. CI builds/tests the images."
        } else {
            Write-Host "  Docker engine found - building and running the real stack..." -ForegroundColor DarkGray
            Stop-AllServers
            foreach ($port in @(8080, 8091, 8092, 8000)) { Stop-Port $port }
            $composeCode = Invoke-Native -FilePath "docker" -Arguments @("compose", "config", "--quiet") -WorkingDirectory $repo
            $composeOk = ($composeCode -eq 0)
            $buildCode = Invoke-Native -FilePath "docker" -Arguments @("compose", "build") -WorkingDirectory $repo -Tail 3
            $buildOk = ($buildCode -eq 0)
            $upCode = Invoke-Native -FilePath "docker" -Arguments @("compose", "up", "-d", "db", "app", "web") -WorkingDirectory $repo -Tail 3
            $upOk = ($upCode -eq 0)
            $dockerReady = Wait-Http "http://localhost:8080/api/health" 240
            if ($dockerReady -and $upOk) {
                Invoke-Native -FilePath "docker" -Arguments @("compose", "exec", "-T", "app", "php", "artisan", "migrate:fresh", "--seed", "--force") -WorkingDirectory $repo | Out-Null
            }
            Record-Result "docker compose build + up" ($composeOk -and $buildOk -and $upOk -and $dockerReady) "see docker compose logs"

            if ($dockerReady) {
                $dockerRun = Invoke-Playwright -Project "docker-same-origin" -LogName "playwright-docker-live" -EnvVars @{ E2E_SAME_ORIGIN_URL = "http://localhost:8080" }
                Record-Result "Browser E2E: live Docker stack" ($dockerRun.ExitCode -eq 0) "Log: $($dockerRun.Log)"
            }

            Invoke-Native -FilePath "docker" -Arguments @("compose", "down", "-v") -WorkingDirectory $repo -Tail 2 | Out-Null
        }
    }
} finally {
    if (-not $KeepServers) {
        Stop-AllServers
        foreach ($port in @(8000, 8080, 8091, 8092)) { Stop-Port $port }
    }
}

# ---------------------------------------------------------------------------
Write-Section "Summary"
# ---------------------------------------------------------------------------
$script:results | Format-Table -AutoSize
$failed = @($script:results | Where-Object { $_.Result -eq "FAIL" })
$passed = $script:results.Count - $failed.Count
Write-Host "Checks: $($script:results.Count)   Passed: $passed   Failed: $($failed.Count)" -ForegroundColor Yellow
Write-Host "Logs: $logDir ; Playwright artifacts: test-results/" -ForegroundColor DarkGray

if ($failed.Count -gt 0) {
    [Environment]::Exit(1)
}
[Environment]::Exit(0)

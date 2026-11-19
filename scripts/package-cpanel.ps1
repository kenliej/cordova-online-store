<#
.SYNOPSIS
    Builds a ready-to-upload backend package for cPanel (vendor/ included).

.DESCRIPTION
    cPanel shared hosting usually has no Composer binary in PATH. This script
    builds the production dependencies on your own machine and produces
    dist-cpanel/omc-backend.zip, which you upload+extract on the server — no
    Composer needed there.

    The package contains:
      - Laravel backend sources (no tests, no .env, no local uploads/logs)
      - production vendor/ (composer install --no-dev --optimize-autoloader)

.PARAMETER OutputDir
    Output directory (default: <repo>/dist-cpanel)

.PARAMETER SkipComposer
    Reuse an existing .cpanel-build/omc-backend/vendor if present.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/package-cpanel.ps1
#>
[CmdletBinding()]
param(
    [string]$OutputDir = "",
    [switch]$SkipComposer
)

$ErrorActionPreference = "Stop"

# $PSScriptRoot is reliable in the script body (not always in param defaults on
# Windows PowerShell 5.1), so resolve paths here.
$scriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDir)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$repoRoot = Split-Path -Parent $scriptDir
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $repoRoot "dist-cpanel"
}

$backend = Join-Path $repoRoot "backend"
$buildRoot = Join-Path $repoRoot ".cpanel-build"
$stage = Join-Path $buildRoot "omc-backend"
$zipPath = Join-Path $OutputDir "omc-backend.zip"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$Name, [string]$Hint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "'$Name' is not available on this machine. $Hint"
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $backend "artisan"))) {
    throw "backend/ directory not found at '$backend'. Run this script from the repository."
}

Assert-Command "php" "Install PHP 8.2+ and add it to PATH, then rerun."
Assert-Command "composer" "Install Composer (https://getcomposer.org/download/) and rerun. Alternatively build the package on a machine that has Composer."

Write-Step "Preparing clean staging directory"
if (Test-Path -LiteralPath $buildRoot) {
    # Safety: only delete the known build folder inside this repository.
    $resolvedBuild = (Resolve-Path -LiteralPath $buildRoot).Path
    $resolvedRepo = (Resolve-Path -LiteralPath $repoRoot).Path
    if (-not $resolvedBuild.StartsWith($resolvedRepo, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to delete unexpected path: $resolvedBuild"
    }
    Remove-Item -LiteralPath $resolvedBuild -Recurse -Force
}
New-Item -ItemType Directory -Path $stage -Force | Out-Null

Write-Step "Copying backend sources (excluding vendor/tests/.env/storage data)"
$excludeDirs = @("vendor", "node_modules", "tests", "storage", ".git", ".github")
$excludeFiles = @("phpunit.xml", ".phpunit.result.cache", ".phpunit.cache",
    "composer.phar", "*.log", "*.zip", "*.tar", "*.gz")

# robocopy is available on every supported Windows version.
$arguments = @($backend, $stage, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1")
$arguments += "/XD"
$arguments += $excludeDirs | ForEach-Object { Join-Path $backend $_ }
$arguments += "/XF"
$arguments += $excludeFiles

$null = & robocopy @arguments
if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed with exit code $LASTEXITCODE"
}

# Never ship local secrets / databases.
foreach ($localSecret in @(".env", "database\database.sqlite", "database\database.sqlite-journal")) {
    $localPath = Join-Path $stage $localSecret
    if (Test-Path -LiteralPath $localPath) { Remove-Item -LiteralPath $localPath -Force }
}

# Recreate the Laravel storage skeleton (local uploads/logs are not shipped).
$storageDirs = @(
    "storage/app/public",
    "storage/app/private",
    "storage/framework/cache/data",
    "storage/framework/sessions",
    "storage/framework/views",
    "storage/logs",
    "bootstrap/cache"
)
foreach ($dir in $storageDirs) {
    New-Item -ItemType Directory -Path (Join-Path $stage $dir) -Force | Out-Null
}

# Placeholder files: guarantee the directories exist after cPanel unzip.
$gitignoreContent = "*`n!.gitignore`n"
foreach ($dir in $storageDirs) {
    $placeholder = Join-Path $stage (Join-Path $dir ".gitignore")
    if (-not (Test-Path -LiteralPath $placeholder)) {
        Set-Content -LiteralPath $placeholder -Value $gitignoreContent -NoNewline -Encoding ascii
    }
}

Write-Step "Installing production dependencies (no dev packages)"
if ($SkipComposer -and (Test-Path -LiteralPath (Join-Path $stage "vendor/autoload.php"))) {
    Write-Host "     skipped (reusing existing vendor)" -ForegroundColor Yellow
} else {
    Push-Location $stage
    try {
        & composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist
        if ($LASTEXITCODE -ne 0) { throw "composer install failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $stage "vendor/autoload.php"))) {
    throw "vendor/autoload.php is missing after composer install."
}
foreach ($devPackage in @("vendor/phpunit", "vendor/laravel/pint", "vendor/mockery", "vendor/fakerphp")) {
    if (Test-Path -LiteralPath (Join-Path $stage $devPackage)) {
        throw "Dev package found in the production package: $devPackage (composer install --no-dev was not effective)."
    }
}

Write-Step "Creating zip (portable forward-slash entries) and tar.gz"
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Do NOT use ZipFile.CreateFromDirectory: on .NET Framework/Windows it writes
# backslashes into entry names, which cPanel/Linux unzip tools may treat as
# literal filename characters instead of directories. Build entries with '/'.
$stageRoot = (Resolve-Path -LiteralPath $stage).Path.TrimEnd('\')
$fileStream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
try {
    $archive = New-Object System.IO.Compression.ZipArchive(
        $fileStream,
        [System.IO.Compression.ZipArchiveMode]::Create,
        $false
    )
    try {
        $prefix = "omc-backend/"
        $archive.CreateEntry($prefix) | Out-Null

        Get-ChildItem -LiteralPath $stage -Recurse -Force |
            Sort-Object FullName |
            ForEach-Object {
                $relative = $_.FullName.Substring($stageRoot.Length).TrimStart('\').Replace('\', '/')
                if ($relative -eq '') { return }
                $entryName = if ($_.PSIsContainer) { "${prefix}${relative}/" } else { "${prefix}${relative}" }

                if ($_.PSIsContainer) {
                    $archive.CreateEntry($entryName) | Out-Null
                } else {
                    $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
                    $entryStream = $entry.Open()
                    try {
                        $input = [System.IO.File]::OpenRead($_.FullName)
                        try { $input.CopyTo($entryStream) } finally { $input.Dispose() }
                    } finally {
                        $entryStream.Dispose()
                    }
                }
            }
    } finally {
        $archive.Dispose()
    }
} finally {
    $fileStream.Dispose()
}

# Also produce a tar.gz (cPanel File Manager can extract it; some hosts prefer it).
$tarPath = Join-Path $OutputDir "omc-backend.tar.gz"
if (Test-Path -LiteralPath $tarPath) { Remove-Item -LiteralPath $tarPath -Force }
$tarAvailable = $null -ne (Get-Command tar -ErrorAction SilentlyContinue)
if ($tarAvailable) {
    Push-Location $buildRoot
    try {
        & tar -czf $tarPath "omc-backend"
    } finally {
        Pop-Location
    }
}

$sizeMb = [math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 2)

Write-Host ""
Write-Host "Package ready:" -ForegroundColor Green
Write-Host "  ZIP:     $zipPath ($sizeMb MB)"
if ($tarAvailable -and (Test-Path -LiteralPath $tarPath)) {
    $tarMb = [math]::Round((Get-Item -LiteralPath $tarPath).Length / 1MB, 2)
    Write-Host "  TAR.GZ:  $tarPath ($tarMb MB)"
}
Write-Host ""
Write-Host "Next steps on cPanel:" -ForegroundColor Yellow
Write-Host "  1. File Manager -> upload omc-backend.zip to /home/CPANEL_USER/"
Write-Host "  2. Extract it (creates /home/CPANEL_USER/omc-backend with vendor/ inside)"
Write-Host "  3. Copy deploy/cpanel/public_html/omc-backend/{index.php,.htaccess} to public_html/omc-backend/"
Write-Host "  4. Create .env from deploy/cpanel/env.example, then run (use your EA-PHP path if 'php' is missing):"
Write-Host "       php artisan key:generate --force"
Write-Host "       php artisan migrate --force"
Write-Host "       php artisan user:create-admin you@yourdomain"
Write-Host "       chmod -R 775 storage bootstrap/cache"
Write-Host "       php artisan config:cache && php artisan route:cache"
Write-Host ""

exit 0

<#
.SYNOPSIS
    Builds ready-to-upload deployment artifacts.

.DESCRIPTION
    Produces everything needed for cPanel + Vercel without Composer/Node on the
    server:

      dist-deploy/cpanel/omc-backend.zip                 Laravel app + vendor/
      dist-deploy/cpanel/public_html-omc-backend.zip     web-root shim files
      dist-deploy/cpanel/env.example                     production .env template
      dist-deploy/cpanel/CRON.txt                        cron entries
      dist-deploy/cpanel/UPLOAD-INSTRUCTIONS.txt         step-by-step upload guide
      dist-deploy/vercel/                                static SPA ready for Vercel
      dist-deploy/vercel.zip                             zipped static SPA

.PARAMETER SkipBuild
    Reuse existing .cpanel-build/omc-backend/vendor and dist-cpanel-frontend.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-cpanel.ps1
#>
[CmdletBinding()]
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDir)) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$repo = Split-Path -Parent $scriptDir
$backend = Join-Path $repo "backend"
$outRoot = Join-Path $repo "dist-deploy"
$cpanelOut = Join-Path $outRoot "cpanel"
$vercelOut = Join-Path $outRoot "vercel"
$buildRoot = Join-Path $repo ".cpanel-build"
$stage = Join-Path $buildRoot "omc-backend"
$zipPath = Join-Path $cpanelOut "omc-backend.zip"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Native {
    param([string]$FilePath, [string[]]$Arguments = @(), [string]$WorkingDirectory = $repo)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments 2>&1 | Out-Host
        $code = $LASTEXITCODE
    } finally {
        Pop-Location
        $ErrorActionPreference = $previous
    }
    return $code
}

function Compress-TreeToZip {
    param([string]$SourceDirectory, [string]$ZipPath, [string]$RootName = "")
    if (Test-Path -LiteralPath $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }
    $source = (Resolve-Path -LiteralPath $SourceDirectory).Path.TrimEnd('\')
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $stream = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    try {
        $archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
        try {
            $prefix = if ($RootName) { "$RootName/" } else { "" }
            if ($prefix) { $archive.CreateEntry($prefix) | Out-Null }
            Get-ChildItem -LiteralPath $source -Recurse -Force | Sort-Object FullName | ForEach-Object {
                $relative = $_.FullName.Substring($source.Length).TrimStart('\').Replace('\', '/')
                if ($relative -eq '') { return }
                $entryName = if ($_.PSIsContainer) { "$prefix$relative/" } else { "$prefix$relative" }
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
        $stream.Dispose()
    }
}

function Copy-FileSafe {
    param([string]$From, [string]$To)
    New-Item -ItemType Directory -Path (Split-Path $To -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $From -Destination $To -Force
}

if (-not (Test-Path -LiteralPath (Join-Path $backend "artisan"))) { throw "backend/ not found." }
if (Get-Command php -ErrorAction SilentlyContinue) { } else { throw "PHP 8.2+ is required locally." }
if (-not $SkipBuild -and -not (Get-Command composer -ErrorAction SilentlyContinue)) {
    throw "Composer is required locally to build the cPanel package."
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) { $npm = Get-Command npm -ErrorAction SilentlyContinue }
if (-not $npm) { throw "npm is required locally to build the Vercel artifact." }

# ---------------------------------------------------------------------------
# 1. Laravel application package for cPanel (vendor included)
# ---------------------------------------------------------------------------
Write-Step "Preparing Laravel staging directory"
if (-not $SkipBuild) {
    if (Test-Path -LiteralPath $buildRoot) {
        $resolved = (Resolve-Path -LiteralPath $buildRoot).Path
        if (-not $resolved.StartsWith((Resolve-Path $repo).Path, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to delete unexpected path: $resolved"
        }
        Remove-Item -LiteralPath $buildRoot -Recurse -Force
    }
    New-Item -ItemType Directory -Path $stage -Force | Out-Null

    $excludeDirs = @("vendor", "node_modules", "tests", "storage", ".git", ".github")
    $excludeFiles = @("phpunit*.xml", ".phpunit.result.cache", ".phpunit.cache", "composer.phar", "*.log", "*.zip", "*.tar", "*.gz")
    $arguments = @($backend, $stage, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1", "/XD")
    $arguments += $excludeDirs | ForEach-Object { Join-Path $backend $_ }
    $arguments += "/XF"
    $arguments += $excludeFiles
    $null = & robocopy @arguments
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }

    foreach ($secret in @(".env", "database\database.sqlite", "database\database.sqlite-journal")) {
        $path = Join-Path $stage $secret
        if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
    }

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
        $placeholder = Join-Path $stage (Join-Path $dir ".gitignore")
        if (-not (Test-Path -LiteralPath $placeholder)) {
            Set-Content -LiteralPath $placeholder -Value "*`n!.gitignore`n" -NoNewline -Encoding ascii
        }
    }

    Write-Step "Installing production dependencies (no dev packages)"
    $composer = (Get-Command composer).Source
    $code = Invoke-Native -FilePath $composer -Arguments @("install", "--no-dev", "--optimize-autoloader", "--no-interaction", "--prefer-dist") -WorkingDirectory $stage
    if ($code -ne 0) { throw "composer install failed ($code)" }
} else {
    Write-Host "  reusing $stage" -ForegroundColor Yellow
}

if (-not (Test-Path (Join-Path $stage "vendor\autoload.php"))) { throw "vendor/autoload.php missing in staging directory." }
foreach ($devPkg in @("vendor\phpunit", "vendor\laravel\pint", "vendor\mockery", "vendor\fakerphp")) {
    if (Test-Path (Join-Path $stage $devPkg)) { throw "Dev package present: $devPkg" }
}

# ---------------------------------------------------------------------------
# 2. cPanel upload artifacts
# ---------------------------------------------------------------------------
Write-Step "Creating cPanel artifacts in dist-deploy/cpanel"
New-Item -ItemType Directory -Path $cpanelOut -Force | Out-Null
Compress-TreeToZip -SourceDirectory $stage -ZipPath $zipPath -RootName "omc-backend"

$shimSource = Join-Path $repo "deploy\cpanel\public_html\omc-backend"
$shimStage = Join-Path $buildRoot "public_html"
New-Item -ItemType Directory -Path (Join-Path $shimStage "omc-backend") -Force | Out-Null
Copy-FileSafe -From (Join-Path $shimSource "index.php") -To (Join-Path $shimStage "omc-backend\index.php")
Copy-FileSafe -From (Join-Path $shimSource ".htaccess") -To (Join-Path $shimStage "omc-backend\.htaccess")
Compress-TreeToZip -SourceDirectory $shimStage -ZipPath (Join-Path $cpanelOut "public_html-omc-backend.zip")

Copy-FileSafe -From (Join-Path $repo "deploy\cpanel\env.example") -To (Join-Path $cpanelOut "env.example")
Copy-FileSafe -From (Join-Path $repo "deploy\cpanel\cron.txt") -To (Join-Path $cpanelOut "CRON.txt")

# ---------------------------------------------------------------------------
# 3. Vercel static artifact
# ---------------------------------------------------------------------------
Write-Step "Building the split (Vercel) frontend with the production API URL"
$buildCode = Invoke-Native -FilePath $npm.Source -Arguments @("run", "build:cpanel") -WorkingDirectory $repo
if ($buildCode -ne 0) { throw "frontend build failed ($buildCode)" }

$vercelSource = Join-Path $repo "dist-cpanel-frontend"
if (-not (Test-Path (Join-Path $vercelSource "index.html"))) { throw "dist-cpanel-frontend/index.html missing." }

if (Test-Path -LiteralPath $vercelOut) { Remove-Item -LiteralPath $vercelOut -Recurse -Force }
New-Item -ItemType Directory -Path $vercelOut -Force | Out-Null
Get-ChildItem -LiteralPath $vercelSource -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $vercelOut -Recurse -Force
}
# Static-hosting config INSIDE the deployable folder (SPA rewrites + headers).
Copy-FileSafe -From (Join-Path $repo "deploy\vercel\vercel.static.json") -To (Join-Path $vercelOut "vercel.json")

Compress-TreeToZip -SourceDirectory $vercelOut -ZipPath (Join-Path $outRoot "vercel.zip")

# ---------------------------------------------------------------------------
# 4. Upload instructions
# ---------------------------------------------------------------------------
Write-Step "Writing upload instructions"
Copy-FileSafe -From (Join-Path $repo "deploy\UPLOAD-INSTRUCTIONS.txt") -To (Join-Path $cpanelOut "UPLOAD-INSTRUCTIONS.txt")

$appSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
$shimSize = [math]::Round((Get-Item (Join-Path $cpanelOut "public_html-omc-backend.zip")).Length / 1KB, 1)
$vercelSize = [math]::Round(((Get-ChildItem $vercelOut -Recurse -File | Measure-Object Length -Sum).Sum) / 1MB, 2)

Write-Host ""
Write-Host "Deployment artifacts ready in: $outRoot" -ForegroundColor Green
Write-Host "  cPanel application : $zipPath ($appSize MB)"
Write-Host "  cPanel web shim    : $(Join-Path $cpanelOut 'public_html-omc-backend.zip') ($shimSize KB)"
Write-Host "  Vercel static SPA  : $vercelOut ($vercelSize MB)"
Write-Host "  Vercel zip         : $(Join-Path $outRoot 'vercel.zip')"
Write-Host "  Instructions       : $(Join-Path $cpanelOut 'UPLOAD-INSTRUCTIONS.txt')"
Write-Host ""

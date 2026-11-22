#!/usr/bin/env bash
#
# Builds deployment artifacts for cPanel (backend) and Vercel (static frontend).
# Equivalent of scripts/package-cpanel.ps1 for macOS/Linux.
#
# Requirements: php 8.2+, composer, npm, zip, rsync (or cp+tarn).
#
# Usage:
#   ./scripts/package-cpanel.sh [--skip-build]
# Output:
#   dist-deploy/cpanel/omc-backend.zip
#   dist-deploy/cpanel/public_html-omc-backend.zip
#   dist-deploy/cpanel/{env.example,CRON.txt,UPLOAD-INSTRUCTIONS.txt}
#   dist-deploy/vercel/           (static SPA + static vercel.json)
#   dist-deploy/vercel.zip

set -euo pipefail

SKIP_BUILD=0
[ "${1:-}" = "--skip-build" ] && SKIP_BUILD=1

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$REPO_ROOT/backend"
OUT_ROOT="$REPO_ROOT/dist-deploy"
CPANEL_OUT="$OUT_ROOT/cpanel"
VERCEL_OUT="$OUT_ROOT/vercel"
BUILD_ROOT="$REPO_ROOT/.cpanel-build"
STAGE="$BUILD_ROOT/omc-backend"

step() { printf '\n==> %s\n' "$1"; }

command -v php >/dev/null 2>&1 || { echo "PHP 8.2+ is required locally." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required locally." >&2; exit 1; }
command -v zip >/dev/null 2>&1 || { echo "'zip' is required locally (apt install zip / brew install zip)." >&2; exit 1; }
[ -f "$BACKEND/artisan" ] || { echo "backend/ not found at $BACKEND" >&2; exit 1; }

if [ "$SKIP_BUILD" -eq 0 ]; then
  command -v composer >/dev/null 2>&1 || { echo "Composer is required locally." >&2; exit 1; }

  step "Preparing Laravel staging directory"
  rm -rf "$BUILD_ROOT"
  mkdir -p "$STAGE"

  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude vendor --exclude node_modules --exclude tests --exclude storage \
      --exclude .git --exclude .env --exclude '.env.*' --exclude 'phpunit*.xml' \
      --exclude .phpunit.result.cache --exclude .phpunit.cache --exclude '*.log' \
      --exclude '*.zip' --exclude '*.tar.gz' --exclude 'database/*.sqlite*' \
      "$BACKEND/" "$STAGE/"
  else
    (cd "$BACKEND" && tar \
      --exclude=vendor --exclude=node_modules --exclude=tests --exclude=storage \
      --exclude=.git --exclude=.env --exclude='.env.*' --exclude='phpunit*.xml' \
      --exclude=.phpunit.result.cache --exclude=.phpunit.cache --exclude='*.log' \
      --exclude='*.zip' --exclude='*.tar.gz' --exclude='database/*.sqlite*' \
      -cf - .) | (cd "$STAGE" && tar -xf -)
  fi

  for dir in \
    storage/app/public storage/app/private storage/framework/cache/data \
    storage/framework/sessions storage/framework/views storage/logs bootstrap/cache; do
    mkdir -p "$STAGE/$dir"
    [ -f "$STAGE/$dir/.gitignore" ] || printf '*\n!.gitignore\n' > "$STAGE/$dir/.gitignore"
  done

  step "Installing production dependencies (no dev packages)"
  (cd "$STAGE" && composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist)
else
  echo "  reusing $STAGE"
fi

[ -f "$STAGE/vendor/autoload.php" ] || { echo "vendor/autoload.php missing." >&2; exit 1; }
for dev_pkg in vendor/phpunit vendor/laravel/pint vendor/mockery vendor/fakerphp; do
  [ -e "$STAGE/$dev_pkg" ] && { echo "Dev package present: $dev_pkg" >&2; exit 1; }
done

step "Creating cPanel artifacts"
mkdir -p "$CPANEL_OUT"
rm -f "$CPANEL_OUT/omc-backend.zip" "$CPANEL_OUT/public_html-omc-backend.zip"
(cd "$BUILD_ROOT" && zip -qr "$CPANEL_OUT/omc-backend.zip" omc-backend)

rm -rf "$BUILD_ROOT/public_html"
mkdir -p "$BUILD_ROOT/public_html/omc-backend"
cp "$REPO_ROOT/deploy/cpanel/public_html/omc-backend/index.php" "$BUILD_ROOT/public_html/omc-backend/index.php"
cp "$REPO_ROOT/deploy/cpanel/public_html/omc-backend/.htaccess" "$BUILD_ROOT/public_html/omc-backend/.htaccess"
(cd "$BUILD_ROOT/public_html" && zip -qr "$CPANEL_OUT/public_html-omc-backend.zip" omc-backend)

cp "$REPO_ROOT/deploy/cpanel/env.example" "$CPANEL_OUT/env.example"
cp "$REPO_ROOT/deploy/cpanel/cron.txt" "$CPANEL_OUT/CRON.txt"
cp "$REPO_ROOT/deploy/UPLOAD-INSTRUCTIONS.txt" "$CPANEL_OUT/UPLOAD-INSTRUCTIONS.txt"

step "Building the split (Vercel) frontend with the production API URL"
(cd "$REPO_ROOT" && npm run build:cpanel)

[ -f "$REPO_ROOT/dist-cpanel-frontend/index.html" ] || { echo "frontend build missing." >&2; exit 1; }
rm -rf "$VERCEL_OUT"
mkdir -p "$VERCEL_OUT"
cp -R "$REPO_ROOT/dist-cpanel-frontend/." "$VERCEL_OUT/"
cp "$REPO_ROOT/deploy/vercel/vercel.static.json" "$VERCEL_OUT/vercel.json"
rm -f "$OUT_ROOT/vercel.zip"
(cd "$OUT_ROOT" && zip -qr vercel.zip vercel)

step "Deployment artifacts ready"
APP_MB="$(du -m "$CPANEL_OUT/omc-backend.zip" | cut -f1)"
SHIM_KB="$(du -k "$CPANEL_OUT/public_html-omc-backend.zip" | cut -f1)"
VERCEL_MB="$(du -m "$OUT_ROOT/vercel.zip" | cut -f1)"
echo "  cPanel application : $CPANEL_OUT/omc-backend.zip (${APP_MB} MB)"
echo "  cPanel web shim    : $CPANEL_OUT/public_html-omc-backend.zip (${SHIM_KB} KB)"
echo "  Vercel static SPA  : $VERCEL_OUT (${VERCEL_MB} MB zipped)"
echo "  Instructions       : $CPANEL_OUT/UPLOAD-INSTRUCTIONS.txt"

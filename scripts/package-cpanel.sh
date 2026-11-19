#!/usr/bin/env bash
#
# Builds a ready-to-upload backend package for cPanel (vendor/ included).
# For machines without Composer on the server: run this locally, then upload
# and extract omc-backend.zip in /home/CPANEL_USER/.
#
# Usage:
#   ./scripts/package-cpanel.sh [output-dir]
#
# Default output: <repo>/dist-cpanel/omc-backend.zip

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$REPO_ROOT/backend"
BUILD_ROOT="$REPO_ROOT/.cpanel-build"
STAGE="$BUILD_ROOT/omc-backend"
OUTPUT_DIR="${1:-$REPO_ROOT/dist-cpanel}"
ZIP_PATH="$OUTPUT_DIR/omc-backend.zip"

step() { printf '\n==> %s\n' "$1"; }

command -v php >/dev/null 2>&1 || { echo "PHP 8.2+ is required locally." >&2; exit 1; }
command -v composer >/dev/null 2>&1 || { echo "Composer is required locally (https://getcomposer.org/download/)." >&2; exit 1; }
command -v zip >/dev/null 2>&1 || { echo "'zip' command is required locally." >&2; exit 1; }

[ -f "$BACKEND/artisan" ] || { echo "backend/ not found at $BACKEND" >&2; exit 1; }

step "Preparing clean staging directory"
rm -rf "$BUILD_ROOT"
mkdir -p "$STAGE"

step "Copying backend sources"
if command -v rsync >/dev/null 2>&1; then
  rsync -a \
    --exclude vendor \
    --exclude node_modules \
    --exclude tests \
    --exclude storage \
    --exclude .git \
    --exclude .env \
    --exclude '.env.*' \
    --exclude phpunit.xml \
    --exclude .phpunit.result.cache \
    --exclude .phpunit.cache \
    --exclude '*.log' \
    --exclude 'database/*.sqlite*' \
    "$BACKEND/" "$STAGE/"
else
  (cd "$BACKEND" && tar --exclude=vendor --exclude=node_modules --exclude=tests \
      --exclude=storage --exclude=.git --exclude=.env --exclude='.env.*' \
      --exclude=phpunit.xml --exclude=.phpunit.result.cache --exclude=.phpunit.cache \
      --exclude='*.log' --exclude='database/*.sqlite*' -cf - .) | (cd "$STAGE" && tar -xf -)
fi

mkdir -p \
  "$STAGE/storage/app/public" \
  "$STAGE/storage/app/private" \
  "$STAGE/storage/framework/cache/data" \
  "$STAGE/storage/framework/sessions" \
  "$STAGE/storage/framework/views" \
  "$STAGE/storage/logs" \
  "$STAGE/bootstrap/cache"

step "Installing production dependencies (no dev packages)"
(cd "$STAGE" && composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist)

[ -f "$STAGE/vendor/autoload.php" ] || { echo "vendor/autoload.php missing" >&2; exit 1; }

step "Creating zip"
mkdir -p "$OUTPUT_DIR"
rm -f "$ZIP_PATH"
(cd "$BUILD_ROOT" && zip -qr "$ZIP_PATH" omc-backend)

SIZE_MB="$(du -m "$ZIP_PATH" | cut -f1)"
echo ""
echo "Package ready: $ZIP_PATH (${SIZE_MB} MB)"
echo ""
echo "Next steps on cPanel:"
echo "  1. Upload omc-backend.zip to /home/CPANEL_USER/ and extract it."
echo "  2. Copy deploy/cpanel/public_html/omc-backend/{index.php,.htaccess} to public_html/omc-backend/."
echo "  3. Create .env from deploy/cpanel/env.example, then run:"
echo "       php artisan key:generate --force"
echo "       php artisan migrate --force"
echo "       php artisan user:create-admin you@yourdomain"
echo "       chmod -R 775 storage bootstrap/cache"
echo "       php artisan config:cache && php artisan route:cache"

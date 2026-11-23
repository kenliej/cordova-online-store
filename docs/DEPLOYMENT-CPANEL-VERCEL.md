# Deploying the backend on cPanel + the frontend on Vercel

Target layout:

```
https://YOUR-PROJECT.vercel.app                    ← React SPA (Vercel)
        │  HTTPS + CORS + Authorization: Bearer …
        ▼
https://kjugarap.top/omc-backend/api/…             ← Laravel API (cPanel, subdirectory)
        │
        ├─ PostgreSQL database (cPanel PostgreSQL, or a managed instance)
        └─ /home/CPANEL_USER/omc-backend/          ← Laravel project (outside public_html)
```

**Yes — this works.** The one design change vs. the Docker setup is authentication:
browsers block third-party cookies, so a Vercel origin cannot reliably keep a Sanctum
session cookie from `kjugarap.top`. Therefore the SPA uses **Bearer tokens** in this
deployment (`POST /api/auth/token`), and the API enables **CORS** for the Vercel origin.
Same-origin deployments (Docker) keep using cookies automatically.

---

## 1. Prerequisites

**cPanel side**

- PHP **8.2+** (`MultiPHP Manager`), extensions: `pdo_pgsql`, `pgsql`, `mbstring`, `openssl`,
  `tokenizer`, `xml`, `ctype`, `json`, `fileinfo`, `curl`, `dom`, `bcmath`.
- A PostgreSQL **16+** database. Two options:
  - cPanel → *PostgreSQL Databases* **if your host enables PostgreSQL** (open a ticket if the
    icon is missing); create the DB + user there, then use `DB_HOST=127.0.0.1`.
  - Otherwise use a managed PostgreSQL (Neon, Supabase, RDS, DigitalOcean, …): create the
    database, whitelist your cPanel server IP, and set `DB_HOST`/`DB_PORT`/`DB_SSLMODE=require`
    in the backend `.env`. This is the common path because many cPanel plans ship MySQL only.
- SSH/Terminal access *or* Composer locally to build `vendor/`.
- Cron jobs (cPanel → *Cron Jobs*).
- An SSL certificate for `kjugarap.top` (cPanel → *SSL/TLS Status*; AutoSSL is fine).

**Vercel side**

- The repository imported as a project (framework preset **Vite**, root directory = repo root).
- Custom domain optional; the `*.vercel.app` URL works.

---

## 2. Backend on cPanel

### 2.1 Directory layout

```
/home/CPANEL_USER/
├─ omc-backend/                 ← Laravel app (this repo's backend/ contents)
│  ├─ app/ bootstrap/ config/ database/ public/ routes/ storage/ vendor/
│  └─ .env
└─ public_html/
   └─ omc-backend/              ← ONLY these two files, served by Apache
      ├─ index.php              ← shim from deploy/cpanel/public_html/omc-backend/
      └─ .htaccess
```

The Laravel files must **not** be reachable via the web root; only `public/index.php` is
executed, through the shim.

### 2.2 Upload the application

Choose **one** of these three options. If cPanel Terminal says
`composer: command not found` (very common on shared hosting), use Option A or B —
you don't need Composer on the server at all.

#### Option A — build the deployment artifacts on your computer (recommended, no server Composer)

One command builds **both** uploads (cPanel app + Vercel static SPA); Composer and
Node are only needed on your machine:

```powershell
# Windows (from the repo root)
npm run package:deploy
# or: powershell -ExecutionPolicy Bypass -File scripts/package-cpanel.ps1
```

```bash
# macOS / Linux
./scripts/package-cpanel.sh
```

Output in `dist-deploy/`:

| Artifact | Purpose |
|---|---|
| `cpanel/omc-backend.zip` | Laravel app **with production `vendor/`** → upload to `/home/CPANEL_USER/` and extract |
| `cpanel/public_html-omc-backend.zip` | web-root shim (`index.php` + `.htaccess`) → upload to `/home/CPANEL_USER/public_html/` and extract |
| `cpanel/env.example`, `cpanel/CRON.txt` | copy/edit on the server |
| `vercel/` + `vercel.zip` | prebuilt static SPA (API URL already baked in) |
| `cpanel/UPLOAD-INSTRUCTIONS.txt` | step-by-step checklist |

The app package contains production dependencies only (no tests/dev packages) and no
local `.env`, `.phpunit` cache, SQLite file or uploads/logs. Details:
[`UPLOAD-ARTIFACTS.md`](UPLOAD-ARTIFACTS.md).

#### Option B — install Composer in your cPanel home directory (no root needed)

```bash
# 1. Find the PHP CLI binary (cPanel often hides it from PATH)
command -v php || ls /opt/cpanel/ea-php*/root/usr/bin/php

# 2. Download Composer into ~/bin (pick the php path printed above)
mkdir -p "$HOME/bin"
export PHP_BIN="$(command -v php || ls /opt/cpanel/ea-php82/root/usr/bin/php | head -1)"
"$PHP_BIN" -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
"$PHP_BIN" composer-setup.php --install-dir="$HOME/bin" --filename=composer
rm -f composer-setup.php
"$PHP_BIN" "$HOME/bin/composer" --version

# 3. Install dependencies (from the Laravel project directory)
cd /home/CPANEL_USER/omc-backend
"$PHP_BIN" "$HOME/bin/composer" install --no-dev --optimize-autoloader --no-interaction
# if memory-limited:
# "$PHP_BIN" -d memory_limit=512M "$HOME/bin/composer" install --no-dev --optimize-autoloader --no-interaction
```

No `export PATH` needed if you call `"$PHP_BIN" "$HOME/bin/composer"` directly.
To make `composer` a normal command for the session: `export PATH="$HOME/bin:$PATH"`.

#### Option C — the host already has Composer somewhere

```bash
ls -l /usr/local/bin/composer /usr/bin/composer /opt/cpanel/composer/bin/composer "$HOME/bin/composer" 2>/dev/null
find / -maxdepth 5 -name 'composer*' -type f 2>/dev/null | head
# example fallback:
/opt/cpanel/composer/bin/composer --version
/opt/cpanel/composer/bin/composer install --no-dev --optimize-autoloader --no-interaction
```

#### Option D — upload manually (if you have neither shell nor Composer)

On your computer run `composer install --no-dev --optimize-autoloader` inside `backend/`,
then upload the whole `backend/` folder **including `vendor/`** (exclude
`node_modules`, `tests`, `.env`) and extract it to `/home/CPANEL_USER/omc-backend`.
Option A automates exactly this.

### 2.3 Add the web-root shim

Copy from this repo:

```
deploy/cpanel/public_html/omc-backend/index.php
deploy/cpanel/public_html/omc-backend/.htaccess
```

to `/home/CPANEL_USER/public_html/omc-backend/`.

- `index.php` defaults to `/home/CPANEL_USER/omc-backend/public/index.php`
  (adjust `$appPublicIndex` or set `OMC_APP_PUBLIC_INDEX` in `.htaccess` if different).
- `.htaccess` contains `RewriteBase /omc-backend/` — change it if you deploy under a
  different subdirectory.
- The `RewriteCond %{HTTP:Authorization}` line is **required**: many cPanel PHP-FPM
  setups strip the `Authorization` header, which would silently break Bearer auth.

### 2.4 Configure `.env`

Copy `deploy/cpanel/env.example` to `/home/CPANEL_USER/omc-backend/.env` and set:

| Variable | Value |
|---|---|
| `APP_KEY` | generated in step 2.5 |
| `APP_URL` | `https://kjugarap.top/omc-backend` **(must include the subdirectory)** |
| `APP_FRONTEND_URL` | your Vercel URL, e.g. `https://omc.vercel.app` |
| `APP_ENV` / `APP_DEBUG` | `production` / `false` |
| `APP_FORCE_HTTPS` | `true` |
| `TRUSTED_HOSTS` | `kjugarap.top` |
| `DB_*` | PostgreSQL connection: `DB_CONNECTION=pgsql`, host/port/database/user/password; `DB_SSLMODE=require` for a managed instance |
| `DB_SSLMODE` | `prefer` for a local cPanel PG, `require` for managed/remote PostgreSQL |
| `SANCTUM_STATEFUL_DOMAINS` | `kjugarap.top` (API host only; **not** the Vercel host) |
| `SANCTUM_EXPIRATION` | `10080` (7 days) or empty for non-expiring tokens |
| `CORS_ALLOWED_ORIGINS` | exact frontend origin, e.g. `https://omc.vercel.app` |
| `CORS_SUPPORTS_CREDENTIALS` | `false` (token mode) |
| `MAIL_*` | your cPanel mailbox / SMTP |

Optional preview deployments: `CORS_ALLOWED_ORIGIN_PATTERNS=/^https:\/\/.*\.vercel\.app$/`
(PCRE pattern **with delimiters**, no commas).

### 2.5 Create the real admin (no demo data in production)

```bash
cd /home/CPANEL_USER/omc-backend
php artisan key:generate --force
php artisan migrate --force
php artisan user:create-admin you@kjugarap.top --name="Mall Admin"
# prints a generated password once — save it
```

Demo seeding is optional and only for staging: `php artisan db:seed --force` creates the
documented demo accounts — rotate/remove them before exposing the site.

### 2.6 Permissions, caches, cron

```bash
cd /home/CPANEL_USER/omc-backend
chmod -R 775 storage bootstrap/cache
php artisan config:cache
php artisan route:cache
```

Cron (cPanel → Cron Jobs), every minute:

```
/usr/local/bin/php /home/CPANEL_USER/omc-backend/artisan schedule:run >> /home/CPANEL_USER/omc-backend/storage/logs/scheduler.log 2>&1
```

`docker/…` and nginx configs are irrelevant here; cPanel serves the app through Apache.
`php artisan storage:link` is **not required** — images are served by the app at
`/omc-backend/storage/...` via the `MediaController` route (works without a symlink).

### 2.7 Verify the backend

```bash
curl -s https://kjugarap.top/omc-backend/api/health
# {"data":{"status":"ok","database":"ok",...}}

curl -si -X OPTIONS https://kjugarap.top/omc-backend/api/auth/token \
  -H "Origin: https://YOUR-PROJECT.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" | head -20
# HTTP/1.1 204 … Access-Control-Allow-Origin: https://YOUR-PROJECT.vercel.app

curl -s -X POST https://kjugarap.top/omc-backend/api/auth/token \
  -H "Origin: https://YOUR-PROJECT.vercel.app" \
  -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"login":"you@kjugarap.top","password":"…","device_name":"curl"}'
# {"data":{"token":"1|…","token_type":"Bearer",...}}
```

If any step fails see [Troubleshooting](#6-troubleshooting).

---

## 3. Frontend on Vercel

### 3.1 Project settings

- **Framework preset:** Vite (detected from `vercel.json`)
- **Root directory:** repository root (the React app lives there)
- **Install command:** `npm ci --legacy-peer-deps` (already in `vercel.json`)
- **Build command:** `npm run build`
- **Output directory:** `dist`
- `vercel.json` adds SPA rewrites (React Router deep links) and security headers.

### 3.2 Environment variables

Add for **Production, Preview and Development**:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://kjugarap.top/omc-backend/api` |
| `VITE_AUTH_MODE` | `token` |

Redeploy after adding them (Vite inlines env at build time).

`VITE_AUTH_MODE=token` makes the client:
- call `POST /auth/token` for login and store the Bearer token
  (`localStorage` if *Remember me*, otherwise `sessionStorage`),
- attach `Authorization: Bearer …` to every request,
- skip Sanctum cookies/CSRF (not usable cross-site).

### 3.3 Verify

1. Open the Vercel URL → login with the admin account from step 2.5.
2. Browser devtools → Network: `/auth/token` returns `token`, subsequent requests carry
   `Authorization: Bearer …`; no CORS errors in Console.
3. Admin → Accounts → *View ID* loads the uploaded scans (they are fetched with the token).
4. Register/login as a customer, add to cart, checkout.

---

## 4. How CORS is configured

`backend/config/cors.php`:

- `allowed_origins` ← `CORS_ALLOWED_ORIGINS` (exact list)
- `allowed_origins_patterns` ← `CORS_ALLOWED_ORIGIN_PATTERNS` (delimited PCRE)
- `supports_credentials` ← `CORS_SUPPORTS_CREDENTIALS` (`false` for token deployments)
- `exposed_headers` includes `Retry-After` / `X-RateLimit-*` so the SPA can show
  rate-limit feedback.
- Never set `CORS_ALLOWED_ORIGINS=*`: the API also supports cookie sessions in
  same-origin deployments.

Requests from the Vercel origin are **stateless** (not listed in
`SANCTUM_STATEFUL_DOMAINS`), so Laravel authenticates them purely from the Bearer token
and does not apply CSRF — exactly what a cross-origin SPA needs. The token carries the
user's role ability, and all existing role policies still apply.

---

## 5. Updating the deployment

```bash
# backend
cd /home/CPANEL_USER/omc-backend
# upload new files / git pull, then:
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan config:cache && php artisan route:cache
```

Vercel: push to the connected branch (or `vercel --prod`). Keep
`VITE_API_BASE_URL`/`VITE_AUTH_MODE` unchanged.

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `bash: composer: command not found` | Composer is not on the cPanel PATH. Use Option A in §2.2 (package locally with `scripts/package-cpanel.ps1`/`.sh`), or install it into `~/bin` with the PHP CLI (Option B). |
| `bash: php: command not found` | cPanel hides PHP CLI from PATH. Use the EA-PHP path, e.g. `/opt/cpanel/ea-php82/root/usr/bin/php`, or select PHP 8.2 in *MultiPHP Manager*. Run artisan as `"$PHP_BIN" artisan …`. |
| Composer memory error / killed | Run with `"$PHP_BIN" -d memory_limit=512M "$HOME/bin/composer" install …`; if it still fails, package locally (Option A). |
| `404` on every `/omc-backend/api/*` | `.htaccess` missing, `RewriteBase` wrong, or shim path wrong (`index.php` → `$appPublicIndex`). Check `public_html/omc-backend/index.php` exists. |
| `500` "app key" / blank page | `APP_KEY` empty → `php artisan key:generate --force`; storage/bootstrap-cache not writable → `chmod -R 775 storage bootstrap/cache`. |
| 401 on everything even after login | `Authorization` header stripped by PHP-FPM → the `RewriteCond %{HTTP:Authorization}` block is missing from `.htaccess`; also confirm the Vercel client uses `VITE_AUTH_MODE=token`. |
| CORS error in browser console | `CORS_ALLOWED_ORIGINS` does not exactly match the browser origin (scheme + host + port, no trailing slash). For previews add the regex pattern, not `*`. |
| Preflight 204 but login still fails | Check the response has `Access-Control-Allow-Origin` equal to the frontend origin; look at the browser's failing request headers (must include `Authorization` on later calls). |
| `419 CSRF token mismatch` | The client is in cookie mode (relative `VITE_API_BASE_URL` or `VITE_AUTH_MODE` unset) while the API is cross-origin. Set token mode and redeploy. |
| Images `403` | URLs must include the subdirectory (`APP_URL=https://kjugarap.top/omc-backend`), and the `storage` route must reach Laravel (`.htaccess` rewrites everything). |
| Password-reset e-mail link points to the wrong host | Reset e-mails now link directly to `APP_FRONTEND_URL/reset-password/<token>` (the SPA route). `APP_URL` must still be the API URL (with subdirectory); `APP_FRONTEND_URL` must be the exact Vercel origin. |
| Scheduled claim-expiry never runs | Cron not set (every minute, `artisan schedule:run`); check `storage/logs/scheduler.log`. |
| Token expires too fast | `SANCTUM_EXPIRATION` minutes (e.g. `10080` = 7 days); empty = no expiry. |
| Vercel build fails on peer deps | Keep `npm ci --legacy-peer-deps` (already in `vercel.json`); the upstream lockfile has a TypeScript peer conflict. |

---

## 7. Production security checklist

- [ ] `APP_ENV=production`, `APP_DEBUG=false`, `APP_FORCE_HTTPS=true`, valid SSL.
- [ ] `APP_KEY` generated; `.env` is **outside** `public_html` and not web-accessible
      (try `https://kjugarap.top/.env` → 404/403).
- [ ] `TRUSTED_HOSTS=kjugarap.top`; `CORS_ALLOWED_ORIGINS` exact origin; no `*`.
- [ ] Demo accounts removed/rotated (`user:create-admin` for the real admin).
- [ ] Tokens: lifetime via `SANCTUM_EXPIRATION`; logout revokes; banning a user revokes
      all tokens (already implemented).
- [ ] Token storage: `sessionStorage` unless *Remember me*; the Vercel CSP (`script-src
      'self'`, no inline scripts) reduces XSS risk — keep it and never add remote scripts
      without review.
- [ ] Backups: cPanel backup + periodic `pg_dump`; uploads live in
      `/home/CPANEL_USER/omc-backend/storage/app/public`.
- [ ] `composer audit`/`npm audit` before each release; keep `php artisan config:cache`
      after `.env` changes.
- [ ] Mail credentials are app-specific; enable TLS (port 587).

---

## 8. Local simulation (no cPanel needed)

This repo includes a dev-only router that mimics the `/omc-backend` subdirectory:

```powershell
# from the repo root (PowerShell)
$env:APP_ENV='production'; $env:APP_DEBUG='false'
$env:APP_URL='http://127.0.0.1:8081/omc-backend'
$env:APP_FRONTEND_URL='https://omc.vercel.app'
$env:TRUSTED_HOSTS='127.0.0.1'
$env:CORS_ALLOWED_ORIGINS='https://omc.vercel.app'
$env:CORS_SUPPORTS_CREDENTIALS='false'
$env:SANCTUM_STATEFUL_DOMAINS='kjugarap.top'
php -S 127.0.0.1:8081 -t backend/public scripts/cpanel-subdir-sim.php
```

Then exercise the API exactly like the Vercel SPA:

```bash
curl -s http://127.0.0.1:8081/omc-backend/api/health
curl -s -X POST http://127.0.0.1:8081/omc-backend/api/auth/token \
  -H "Origin: https://omc.vercel.app" -H "Content-Type: application/json" \
  -d '{"login":"customer@gaisano-cordova.com","password":"Customer#2026Secure"}'
```

To try the real SPA against the simulated API locally:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8081/omc-backend/api VITE_AUTH_MODE=token npm run dev
```

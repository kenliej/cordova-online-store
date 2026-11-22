# Upload artifacts: cPanel backend + Vercel frontend

Everything below is generated locally with one command — **no Composer or Node is
needed on cPanel**, and Vercel never compiles the backend.

```powershell
# Windows
npm run package:deploy
# or: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-cpanel.ps1
```

```bash
# macOS / Linux
./scripts/package-cpanel.sh
```

Output (regenerate after any code change — the API URL is baked into the frontend
build from `.env.cpanel`):

```
dist-deploy/
├─ cpanel/
│  ├─ omc-backend.zip                 (~8 MB)  Laravel API + production vendor/
│  ├─ public_html-omc-backend.zip     (~2 KB)  web-root shim (index.php + .htaccess)
│  ├─ env.example                             copy to omc-backend/.env
│  ├─ CRON.txt                                scheduler cron entries
│  └─ UPLOAD-INSTRUCTIONS.txt
├─ vercel/                            (~1 MB)  static SPA + static vercel.json
└─ vercel.zip                                 same SPA, zipped
```

## 1. cPanel — what to upload where

| Local artifact | Upload to (cPanel File Manager) | Extract result |
|---|---|---|
| `dist-deploy/cpanel/omc-backend.zip` | `/home/CPANEL_USER/` | `/home/CPANEL_USER/omc-backend/` (app + `vendor/`) |
| `dist-deploy/cpanel/public_html-omc-backend.zip` | `/home/CPANEL_USER/public_html/` | `/home/CPANEL_USER/public_html/omc-backend/` (`index.php`, `.htaccess`) |
| `dist-deploy/cpanel/env.example` | copy as `/home/CPANEL_USER/omc-backend/.env` | edit values (below) |
| `dist-deploy/cpanel/CRON.txt` | cPanel → Cron Jobs | scheduler every minute |

Then in cPanel Terminal (use the EA PHP path if `php` is not found):

```bash
cd /home/CPANEL_USER/omc-backend
php artisan key:generate --force
php artisan migrate --force
php artisan user:create-admin you@yourdomain.com
chmod -R 775 storage bootstrap/cache
php artisan config:cache && php artisan route:cache
```

Required `.env` values:

```dotenv
APP_URL=https://kjugarap.top/omc-backend
APP_FRONTEND_URL=https://YOUR-PROJECT.vercel.app
TRUSTED_HOSTS=kjugarap.top
CORS_ALLOWED_ORIGINS=https://YOUR-PROJECT.vercel.app
CORS_SUPPORTS_CREDENTIALS=false
SANCTUM_STATEFUL_DOMAINS=kjugarap.top
SANCTUM_EXPIRATION=10080
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1          # or your managed PostgreSQL host
DB_PORT=5432
DB_DATABASE=cpaneluser_omc
DB_USERNAME=cpaneluser_omc
DB_PASSWORD=
DB_SSLMODE=prefer          # require for managed/remote PostgreSQL
```

Verify: `https://kjugarap.top/omc-backend/api/health` → `{"data":{"status":"ok",...}}`.

> The app zip contains **no** `.env`, tests, dev dependencies or local uploads/logs
> (7,416 entries, verified by extracting and booting: Laravel 12.73, 58 API routes).
> The shim zip contains exactly `omc-backend/index.php` and `omc-backend/.htaccess`.

## 2. Vercel — what to upload

### Recommended: Git integration (no manual upload)

1. Push the repo to GitHub/GitLab.
2. Vercel → **Add New Project** → import the repo. Framework = Vite, install
   command and SPA rewrites come from the root `vercel.json`.
3. Environment variables (Production + Preview + Development):
   `VITE_API_BASE_URL=https://kjugarap.top/omc-backend/api`
   `VITE_AUTH_MODE=token`
4. Deploy.

### Alternative: deploy the prebuilt folder with the Vercel CLI

```bash
npm i -g vercel
vercel login
vercel deploy --prod dist-deploy/vercel
```

`dist-deploy/vercel/` already contains the compiled SPA and a **static**
`vercel.json` (SPA rewrites + security headers). This is useful if you cannot
connect the Git repo or want byte-identical artifacts.

Local verification of the artifact (no API needed to check the shell):

```bash
node scripts/serve-static.mjs 8093 dist-deploy/vercel
# http://127.0.0.1:8093/ , /products and /admin/accounts must all render the SPA
```

## 3. Local testing of the same artifacts

| What | Command |
|---|---|
| cPanel API package boots | extract `omc-backend.zip` to a temp dir, copy your `backend/.env` in, run `php artisan --version` + `php artisan route:list --path=api` |
| cPanel-style API under `/omc-backend` | `scripts/serve-docker-sim`-style flow: see `docs/TESTING-BOTH-BUILDS.md` §2 (cPanel sim + token smoke script) |
| Vercel static SPA | `node scripts/serve-static.mjs 8093 dist-deploy/vercel` (checked: `/`, deep links and assets return 200) |
| Full browser tests for both builders | `npm run test:e2e:local` |

## 4. Regeneration checklist

1. Edit `.env.cpanel` if the API domain changes.
2. Run `npm run package:deploy`.
3. Upload the two cPanel zips (replace app files; keep your server `.env`).
4. Redeploy Vercel (Git push or `vercel deploy --prod dist-deploy/vercel`).
5. On the backend after deploy: `php artisan migrate --force`, then
   `php artisan config:cache && php artisan route:cache`.

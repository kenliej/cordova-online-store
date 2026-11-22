# Testing both builds (local + cPanel + Docker)

This project supports two deployment shapes and both are covered by automated
tests:

| Shape | Frontend | Backend | Auth |
|---|---|---|---|
| **Docker / same-origin** | nginx serves the built SPA + proxies `/api` | php-fpm + MySQL | Sanctum session cookies |
| **cPanel + Vercel / split** | static SPA (Vercel or any static host) | Laravel under `/omc-backend` | Bearer tokens + CORS |

The local test harness reproduces both shapes without Docker:

```
Docker-equivalent (simulated nginx):
  SPA (dist/)            http://127.0.0.1:8080
    /api, /sanctum, /storage  -> proxy -> Laravel :8000

cPanel/Vercel-equivalent (simulated shared hosting):
  SPA (dist-e2e-split/)  http://127.0.0.1:8091   (different origin)
  API                    http://127.0.0.1:8092/omc-backend/api
```

---

## 1. One command (local, both builds, real browser)

Requirements: PHP 8.2 + Laravel installed, Node.js, MySQL running, Google Chrome
(or set `PLAYWRIGHT_CHANNEL=bundled` after `npx playwright install chromium`).

```powershell
# from the repo root (Windows PowerShell)
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-e2e.ps1

# or via npm
npm run test:e2e:local
```

What it does:

1. `php artisan test` — backend suite (SQLite memory, 337 tests).
2. `migrate:fresh --seed` — deterministic demo data.
3. Builds **both** frontend bundles (`dist/` and `dist-e2e-split/`).
4. Starts Laravel (`:8000` cookie mode, `:8092` cPanel subdirectory mode),
   the Node same-origin proxy (`:8080`) and the static SPA server (`:8091`).
5. Runs Playwright **browser** tests:
   - `docker-same-origin` — 6 tests: guest catalogue/deep links, cookie session,
     cart→checkout→cancel, admin ID scans, worker tabs, logout guard.
   - `cpanel-split` — 6 tests: same flows over **Bearer tokens + CORS**, plus
     token storage/Authorization-header assertions and cross-origin ID scans.
6. Docker phase: if a Docker engine is available, builds/starts the real compose
   stack and runs the same browser suite against `http://localhost:8080`;
   otherwise runs 38 static Docker configuration checks and reports the live
   build as skipped (CI builds the images).
7. Prints a PASS/FAIL table and exits non-zero on any failure.

Useful flags:

| Flag | Effect |
|---|---|
| `-SkipBackendTests` | Skip PHPUnit (faster iteration) |
| `-SkipFrontendBuild` | Reuse existing `dist/` + `dist-e2e-split/` |
| `-SkipDocker` | Skip the Docker phase entirely |
| `-KeepServers` | Leave servers running for manual browsing |

Logs: `test-results/logs/`; Playwright screenshots/traces: `test-results/artifacts/`.

### Manual browsing after `-KeepServers`

| URL | Build | Demo accounts |
|---|---|---|
| http://127.0.0.1:8080 | Docker/same-origin | admin@… / worker@… / customer@… (see README) |
| http://127.0.0.1:8091 | cPanel/split frontend | same accounts |

Stop them with:

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 8000,8080,8091,8092 } |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## 2. Test your real cPanel backend (Bearer + CORS)

`scripts/smoke-test-token.ps1` talks to any remote/split backend without a browser:

```powershell
# READ-ONLY checks (health, CORS preflight, token login, roles, private ID download, logout)
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-test-token.ps1 `
  -BaseUrl https://kjugarap.top/omc-backend `
  -Origin  https://YOUR-PROJECT.vercel.app

# Also exercise cart -> checkout -> cancel (mutates an order):
... -BaseUrl https://kjugarap.top/omc-backend -Full
```

- Include the `/omc-backend` subdirectory in `-BaseUrl`.
- `-Origin` must exactly match a `CORS_ALLOWED_ORIGINS` entry on the server.
- The script logs in as the demo accounts; create/rotate real accounts for production.

Check the same backend under the **local cPanel simulation**:

```powershell
# terminal 1: cPanel-like server
$env:APP_ENV="production"; $env:APP_DEBUG="false"
$env:APP_URL="http://127.0.0.1:8092/omc-backend"
$env:APP_FRONTEND_URL="http://127.0.0.1:8091"
$env:TRUSTED_HOSTS="127.0.0.1"
$env:CORS_ALLOWED_ORIGINS="http://127.0.0.1:8091"
$env:CORS_SUPPORTS_CREDENTIALS="false"
$env:SANCTUM_STATEFUL_DOMAINS="kjugarap.top"
php -S 127.0.0.1:8092 -t backend/public scripts/cpanel-subdir-sim.php

# terminal 2:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-test-token.ps1 `
  -BaseUrl http://127.0.0.1:8092/omc-backend -Origin http://127.0.0.1:8091
```

---

## 3. Test the frontend against a real cPanel backend

Build the split profile (Bearer + CORS) and serve it locally:

```bash
# production cPanel URL is in .env.cpanel — adjust it if your domain differs
npm run build:cpanel                      # -> dist-cpanel-frontend/

node scripts/serve-static.mjs 8091 dist-cpanel-frontend
# open http://127.0.0.1:8091
```

The API must allow that origin during the test. Add it **temporarily** to the
cPanel `.env`:

```dotenv
CORS_ALLOWED_ORIGINS=https://YOUR-PROJECT.vercel.app,http://127.0.0.1:8091
```

then `php artisan config:cache` (or `config:clear`) on the server. Remove the
localhost origin afterwards.

For a local split build against the local simulated API:

```bash
npm run build:local-split                 # -> dist-e2e-split/
node scripts/serve-static.mjs 8091 dist-e2e-split
# API: http://127.0.0.1:8092/omc-backend/api (see section 2)
```

## 4. Test the frontend against a local / same-origin backend

```bash
cd backend && php artisan serve --host=127.0.0.1 --port=8000
npm run dev                               # http://localhost:5173 (Vite proxy, cookie auth)
```

Production-like same-origin test (simulated nginx, what Docker serves):

```bash
npm run build
node scripts/serve-docker-sim.mjs 8080 dist http://127.0.0.1:8000
# open http://127.0.0.1:8080
```

Start the Laravel side with `APP_URL=http://127.0.0.1:8080` (and
`SANCTUM_STATEFUL_DOMAINS` containing `127.0.0.1:8080`) so generated URLs and
cookies match the browser origin — `scripts/test-e2e.ps1` does this automatically.

---

## 5. Docker build on a Docker-capable machine

The orchestrator detects Docker automatically:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-e2e.ps1
```

It runs `docker compose config`, builds the images, starts `db`/`app`/`web`,
seeds the database, runs the `docker-same-origin` browser suite against
`http://localhost:8080`, then tears the stack down (`down -v`).

Manual equivalent:

```bash
cp .env.example .env        # set APP_KEY, DB_PASSWORD, DB_ROOT_PASSWORD
docker compose up -d --build
docker compose exec app php artisan db:seed
# wait for http://localhost:8080/api/health

# browser E2E against the real containers
npm ci --legacy-peer-deps
npx playwright install chromium
$env:E2E_SAME_ORIGIN_URL="http://localhost:8080"; $env:PLAYWRIGHT_CHANNEL="bundled"
npm run test:e2e -- --project=docker-same-origin
```

Static-only validation (no Docker engine needed):

```bash
python scripts/validate-docker-config.py     # 38 checks
```

---

## 6. CI

`.github/workflows/ci.yml` runs the backend suite, Pint, `composer audit`, the
frontend build + `npm audit`, then builds the Docker images and smoke-tests
`/api/health`. To add browser tests in CI:

```yaml
- run: npx playwright install --with-deps chromium
- run: npm run test:e2e -- --project=docker-same-origin
  env:
    PLAYWRIGHT_CHANNEL: bundled
    E2E_SAME_ORIGIN_URL: http://localhost:8080
```

---

## 7. Troubleshooting the harness

| Symptom | Fix |
|---|---|
| `php`/`node` not found | Add them to PATH; the harness reports this up front. |
| MySQL not running | Start XAMPP MySQL, or set `OMC_MYSQLD_PATH` / `OMC_MYSQL_INI`. |
| Browser launch fails | Install Chrome, or run `npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL=bundled`. |
| Ports busy | The harness kills listeners on 8000/8080/8091/8092 before starting. Other tools using them are stopped too. |
| CORS errors in the split suite | The API must allow `http://127.0.0.1:8091` (`CORS_ALLOWED_ORIGINS`); requests must stay stateless (`SANCTUM_STATEFUL_DOMAINS` must not include `127.0.0.1:8091`). |
| Cookie login fails in same-origin suite | `APP_URL` must be `http://127.0.0.1:8080` and `SANCTUM_STATEFUL_DOMAINS` must include `127.0.0.1:8080`. |
| `419 CSRF` in token mode | A cookie/stateful origin leaked into the token client; check `VITE_AUTH_MODE=token` and that the origin is not a Sanctum stateful domain. |
| Playwright artifacts | `test-results/artifacts/<test>/` contains screenshot + trace; open with `npx playwright show-trace <trace.zip>`. |

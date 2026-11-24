# Render + Neon production deployment

This folder contains the production Docker image for the Laravel API and notes for
the Render + Neon deployment. **Local Docker is untouched** - `npm run docker:up`
still uses `docker-compose.yml`, the local PostgreSQL container, and `.env`.

```
Vercel (React SPA, token auth)
        │  HTTPS + Bearer token + CORS
        ▼
Render web service (production/Dockerfile: nginx + php-fpm)
        │
        └── Neon: Postgres, Object Storage (S3), AI Gateway, Realtime
```

## Files

| File | Purpose |
|---|---|
| `production/Dockerfile` | Render image: Composer deps stage + PHP 8.2-FPM/nginx runtime |
| `production/start.sh` | Migrates the Neon DB (direct URL), caches config, starts php-fpm + nginx on `$PORT` |
| `production/nginx.conf` | nginx template (`__PORT__` replaced at startup), Laravel front controller |
| `production/php.ini` | production PHP limits / OPcache |
| `production/env.render.example` | every environment variable Render needs |
| `render.yaml` (repo root) | Render Blueprint (Docker web service, health check `/api/health`) |

## Deploy on Render

1. Push this repo to GitHub (`render.yaml` must be in the repository root).
2. Render Dashboard -> **New -> Blueprint** -> select the repo.
3. Fill the `sync: false` values in the Render dashboard (copy from Neon, see below):
   - `APP_KEY`: `php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"`
   - `APP_URL`: `https://<service-name>.onrender.com`
   - `APP_FRONTEND_URL`: the Vercel URL (no trailing slash)
   - `CORS_ALLOWED_ORIGINS`: the Vercel URL
   - `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct)
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`
   - `NEON_AI_GATEWAY_BASE_URL`, `NEON_AI_GATEWAY_TOKEN`
   - `NEON_REALTIME_URL`, `NEON_REALTIME_SECRET`
4. Deploy. The container runs migrations with the direct Neon URL, then starts on
   Render's `$PORT` (default 10000).
5. Verify: `https://<service>.onrender.com/api/health` returns
   `{"data":{"status":"ok","database":"ok",...}}`.

On Vercel set:

```dotenv
VITE_API_BASE_URL=https://<service>.onrender.com/api
VITE_AUTH_MODE=token
```

and redeploy the frontend. Keep the Vercel origin in `CORS_ALLOWED_ORIGINS` (and
`SANCTUM_STATEFUL_DOMAINS` empty because this uses Bearer tokens, not cookies).

## Neon commands (project already linked)

```bash
neon config status
neon config plan
neon deploy            # provisions neon.ts services and pulls env into .env
neon env pull          # refresh DATABASE_URL / AWS_* / NEON_* locally
```

`neon.ts` declares: `aiGateway: true`, a private `assets` bucket, and
`preview.realtime: true`. Project: `square-water-44444490`, branch `production`
(`br-blue-frog-bejyeehk`), region `aws-us-east-2`.

## Verification (performed locally with the Render image + Neon)

```bash
docker build -f production/Dockerfile -t onlinemall-render:test .
docker run ... onlinemall-render:test   # see run command below
docker exec <container> php artisan neon:probe --json
```

Result from `neon:probe`:

- **Postgres** `ok=true`, 26 tables migrated on Neon (`neondb`)
- **Object Storage** `ok=true`, round-trip put/get/delete in bucket `assets`
- **AI Gateway** `ok=true`, `/v1/models` returns 200 with 68 models; **0 enabled** -
  add AI Gateway credits in Neon billing before model calls will succeed
- **Realtime** URL/secret configured; the Laravel app currently uses polling, so no
  live-query UI is wired yet

Health check through the running container: `GET /api/health` -> HTTP 200
`{"status":"ok","database":"ok"}`. Frontend `npm run build` passes.

## Email & password reset: disabled in production

**Mailpit is local-Docker only.** Production has **no SMTP provider** by design:

- Render Blueprint sets `PASSWORD_RESET_ENABLED=false` and `MAIL_MAILER=log`.
- The API returns **404** for `POST /api/auth/forgot-password` and
  `POST /api/auth/reset-password`.
- The React UI hides **Forgot Password?** in token/split deployments (Vercel),
  and `/forgot-password` redirects to `/login`.
- Local Docker (cookie auth) keeps Mailpit + the reset flow for testing at
  http://127.0.0.1:8025.

To re-enable later, set on Render:

```dotenv
PASSWORD_RESET_ENABLED=true
MAIL_MAILER=smtp
MAIL_HOST=...        # e.g. mail.yourdomain.com / smtp.gmail.com
MAIL_PORT=587        # 465 with MAIL_SCHEME=smtps
MAIL_SCHEME=smtp
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=no-reply@gaisano-cordova.com
```

and set `VITE_PASSWORD_RESET_ENABLED=true` in Vercel, then redeploy both.

## Deploy the frontend on Vercel

Push the **whole repository** to GitHub. Vercel and Render can both use it:
Vercel builds only the frontend from the repo root; Render builds only the
backend via `render.yaml` + `production/Dockerfile`.

In Vercel: **Add New Project -> import the repo** (no Root Directory change;
framework auto-detected as Vite, `vercel.json` supplies build settings).

Environment Variables (Production, Preview, Development):

```dotenv
VITE_API_BASE_URL=https://<render-service>.onrender.com/api
VITE_AUTH_MODE=token
```

Then **Deploy**. Vercel runs `npm run build` and serves `dist/`.

Do not upload `backend/`, `production/`, `dist-deploy/`, or `.env` manually;
Vercel does not need them. If you prefer the CLI, this repo's
`npm run package:deploy` creates `dist-deploy/vercel/`, which can be deployed
with `vercel deploy --prod dist-deploy/vercel`, but Git integration is simpler.

Finally, set Render's `APP_FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` to the exact
Vercel URL (e.g. `https://gaisano-onlinemall.vercel.app`), redeploy Render, then
open the Vercel app and log in with a seeded/created admin account.

## Troubleshooting: `preg_match(): Compilation failed: quantifier does not follow a repeatable item`

This means `TRUSTED_HOSTS` contains an invalid host pattern - usually a glob such
as `*.onrender.com`. Laravel passes these values to Symfony as **regular
expressions**, where `*` cannot start the pattern.

Use the **exact Render hostname** instead:

```dotenv
TRUSTED_HOSTS=gaisano-onlinemall-api.onrender.com,localhost,127.0.0.1
```

Comma-separate exact hosts only. If you rename the service or add a custom
domain, add that exact hostname here and redeploy.

## Known limitations

- **Uploads:** Render's free filesystem is ephemeral; the app still stores uploads
  locally. Attach a Render persistent disk (paid plans; see commented `disk:` in
  `render.yaml`) or migrate the upload paths to the Neon `assets` bucket.
- **AI Gateway:** account has no credits, so all models are currently disabled.
- **Realtime:** credentials are deployed, but the app has no live-query UI; the
  current notification flow uses polling.
- **Cache:** Render Blueprint sets `CACHE_STORE=file` (one instance). The database
  cache path hit a Neon pooled-transaction error in local testing; file cache is
  reliable for a single Render instance. Sessions and queues still use Postgres.
- **Host PHP (optional):** XAMPP's PHP has an old libpq and cannot connect to Neon
  directly (SNI/endpoint error). Use the Docker image or Render for Neon DB work.

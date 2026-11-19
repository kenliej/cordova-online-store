# Online Mall Cordova

Full-stack "order online, pay & claim at the mall" application:

- **Frontend** — React 19 + TypeScript + Vite + Tailwind CSS 4 (pre-existing UI, now fully API-driven)
- **Backend** — Laravel 12 API with MySQL, Sanctum SPA-cookie authentication, role-based access (guest / customer / worker / admin)
- **Database** — MySQL 8.4 in Docker (MariaDB 10.4 compatible for local dev), migrations + demo seeders
- **Docker** — nginx (SPA + API proxy), php-fpm 8.2, MySQL, queue worker, scheduler, Mailpit

---

## Table of contents

1. [What was built](#what-was-built)
2. [Architecture](#architecture)
3. [Quick start — Docker (recommended)](#quick-start--docker-recommended)
4. [Quick start — local development (no Docker)](#quick-start--local-development-no-docker)
5. [Demo accounts](#demo-accounts)
6. [API overview](#api-overview)
7. [Database](#database)
8. [Security controls](#security-controls)
9. [Testing & verification](#testing--verification)
10. [Operations](#operations)
11. [Project layout](#project-layout)
12. [Known limitations / notes](#known-limitations--notes)

---

## What was built

The original repository was a **frontend-only** prototype: every page listed products,
stores, accounts and orders from hard-coded mock arrays, and every button either wrote
to local state, showed an `alert()` or called `console.log`. There was no API layer
(`src/lib/axios.ts` was an empty file).

This project adds and integrates:

**Backend (`backend/`)** — 22 controllers, 22 migrations, 17 models, 26 FormRequests,
16 API resources, 5 policies, 4 services, audit logging, seeders and 300+ feature/security tests:

| Domain | Capabilities |
|---|---|
| Auth & accounts | Register (profile photo + 2 government IDs, 18+ check, admin approval), login by email **or** phone, logout, forgot/reset password, remember-me |
| Customer profile | View/update profile, change password, upload avatar, private ID-document download (owner/admin only) |
| Public catalog | Products (category/search/price sort/stock filters, pagination), product detail (gallery, highlights, related), stores (open/closed filter), store detail (gallery, highlights, products), home collections |
| Cart & checkout | Per-user cart, quantity/selection, stock validation, transactional checkout with row locks and price snapshots |
| Orders | Active orders + history, cancel (pending only, stock restored), 5-state machine (`pending → ready → claimed/cancelled/not_claimed`), 3-day claim deadline |
| Worker | Order queue with status actions, product inventory CRUD with multipart images |
| Admin | Account approval/rejection/removal/restore (auto-ban at 2 bad records), worker accounts, store CRUD, sales dashboard (monthly KPIs + per-day report), contact messages |
| Notifications | Category filters/counts, unread state, mark read / read all |
| Contact | Public contact form with honeypot + rate limiting, admin inbox |
| Ops | `orders:mark-unclaimed` scheduled command (auto-expire ready orders), health endpoint, audit trail |

**Frontend (`src/`)** — fully rewired to the API:

- Typed API client (`src/lib/api.ts`) with Sanctum CSRF/session handling, error mapping
  (`422` field errors, `401` session drop, `429` rate-limit messages) and snake_case → UI model mapping.
- `AuthContext` + role route guards (guest / customer / worker / admin), auth-aware headers,
  logout through the API, cart badge.
- Every guest and customer page (login, register, forgot password, home, products, product
  detail, stores, store detail, cart/orders/history, profile, notifications, contact, about)
  and every admin/worker page (accounts, stores, sales, worker orders, worker products)
  now performs real HTTP calls with loading / empty / error states and disabled-while-submitting buttons.
- Uppercase mock data, fake captcha, blob-URL "uploads", plaintext worker passwords and
  `console.log` handlers removed; uploads now go through multipart endpoints.

**Quality / security** — 300+ backend tests (incl. an independent adversarial security
suite), an end-to-end API smoke harness, dependency audits, static analysis/style gate,
security headers, Docker hardening and an OWASP audit report (`docs/SECURITY_AUDIT.md`).

---

## Architecture

```
Browser ──► nginx :8080 ──┬─► /                React SPA (built assets)
                          ├─► /api/*, /sanctum  php-fpm :9000  ──► MySQL :3306
                          └─► /storage/*        uploaded images (shared volume)

queue worker ──► php artisan queue:work (database queue)
scheduler    ──► php artisan schedule:work  (orders:mark-unclaimed hourly)
mailpit      ──► SMTP sink + web UI :8025 (password resets)
```

| Layer | Technology |
|---|---|
| API | PHP 8.2, Laravel 12.73, Laravel Sanctum (SPA cookie auth) |
| Database | MySQL 8.4 (Docker) / MariaDB 10.4 (local XAMPP) |
| Web server | nginx 1.27 + php-fpm 8.2 |
| Frontend | React 19.3, TypeScript 6.0, Vite 8.3, Tailwind CSS 4, axios 1.21, lucide-react |
| Tooling | Composer 2, npm 10, PHPUnit 11, Laravel Pint |
| Local mail | Mailpit (catch-all SMTP, UI at http://localhost:8025) |

Request/response conventions and the full contract live in
[`docs/BACKEND_ARCHITECTURE.md`](docs/BACKEND_ARCHITECTURE.md); an endpoint reference is in
[`docs/API.md`](docs/API.md).

---

## Quick start — Docker (recommended)

Requirements: Docker Engine 24+ / Docker Desktop with Compose v2.

```bash
# 1. Configuration
cp .env.example .env

# 2. Generate the application key and paste it into APP_KEY=... in .env
php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
#    (no PHP? docker run --rm php:8.2-cli php -r "echo 'base64:'.base64_encode(random_bytes(32)), PHP_EOL;")

# 3. Set strong database passwords in .env (DB_PASSWORD, DB_ROOT_PASSWORD)

# 4. Build and start the whole stack
docker compose up -d --build

# 5. Seed demo data (first boot only)
docker compose exec app php artisan db:seed
```

Open:

| URL | What |
|---|---|
| http://localhost:8080 | React app (customer catalogue by default) |
| http://localhost:8080/api/health | API health (DB connectivity) |
| http://localhost:8025 | Mailpit — password-reset e-mails |
| http://localhost:8080/admin/accounts | Admin area (after logging in as admin) |

Migrations run automatically on app start. The database is on the named volume
`db_data`; uploads live on `app_storage` (shared by nginx and php-fpm).

Useful commands:

```bash
docker compose logs -f app          # API logs
docker compose logs -f web          # nginx logs
docker compose exec app php artisan migrate:fresh --seed   # reset demo data
docker compose exec app php artisan test                   # backend tests
docker compose exec db mysqldump -u root -p"$DB_ROOT_PASSWORD" online_mall > backup.sql
docker compose down                 # stop (keep data)
docker compose down -v              # stop and delete volumes
```

> **TLS in production:** terminate TLS at a load balancer / reverse proxy in front of
> `web`, set `APP_URL`/`APP_FRONTEND_URL` to the https URL, add the public hostname to
> `TRUSTED_HOSTS` and `SANCTUM_STATEFUL_DOMAINS`/`CORS_ALLOWED_ORIGINS`, and set
> `SESSION_SECURE_COOKIE=true` and `APP_FORCE_HTTPS=true`.

---

## Quick start — local development (no Docker)

Tested on Windows with XAMPP; adapt paths for Linux/macOS.

Requirements: PHP 8.2+ with `pdo_mysql`, Composer 2, Node 20.19+/22+, MySQL or MariaDB.

```bash
# --- Database -------------------------------------------------------------
# Start MySQL, then:
mysql -u root -e "CREATE DATABASE online_mall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -e "CREATE USER 'onlinemall'@'localhost' IDENTIFIED BY 'your-password'; \
                  GRANT ALL ON online_mall.* TO 'onlinemall'@'localhost'; FLUSH PRIVILEGES;"

# --- Backend --------------------------------------------------------------
cd backend
cp .env.example .env          # set DB_* and APP_KEY
composer install
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8000

# --- Frontend (second terminal) ------------------------------------------
npm install --legacy-peer-deps   # see "Known limitations" for why
npm run dev                      # http://localhost:5173
```

The Vite dev server proxies `/api`, `/sanctum` and `/storage` to
`http://127.0.0.1:8000`, so the browser sees a single origin and Sanctum cookies/CSRF
work exactly as in production.

Run the scheduler (claim-deadline expiry) in a third terminal if needed:

```bash
cd backend && php artisan schedule:work
```

---

## Demo accounts

Seeded by `php artisan migrate --seed` / `db:seed`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@onlinemall.test` | `Admin#2026Secure` |
| Worker | `worker@onlinemall.test` | `Worker#2026Secure` |
| Customer | `customer@onlinemall.test` | `Customer#2026Secure` |

Additional seeded states: 2 pending registrations (with ID scans), more active customers,
one removed customer, one banned customer, a second worker, 10 stores, 12 products
(some out of stock / new), 13 orders across today/-1/-2 days in all five statuses,
notifications and contact messages.

---

## API overview

Base URL `/api`; JSON `snake_case`; success `{ "data": ..., "message"? }`, lists add
`"meta"`, validation errors are Laravel-style `422 {message, errors}`. Full reference:
[`docs/API.md`](docs/API.md).

| Group | Examples |
|---|---|
| Public | `GET /health`, `/home`, `/categories`, `/products`, `/products/{slug}`, `/stores`, `/stores/{slug}`, `POST /contact` |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me` |
| Profile | `GET/PATCH /profile`, `PATCH /profile/password`, `POST /profile/avatar`, `GET /profile/id-documents/{id}` |
| Customer | `GET /cart`, `POST/PATCH/DELETE /cart/items[...]`, `POST /checkout`, `GET /orders`, `GET /orders/{id}`, `PATCH /orders/{id}/cancel`, `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all` |
| Worker | `GET /worker/orders`, `GET /worker/orders/{id}`, `PATCH /worker/orders/{id}/status`, `GET/POST /worker/products`, `PATCH/DELETE /worker/products/{id}` |
| Admin | `GET /admin/accounts`, `POST /admin/accounts/{id}/{approve,reject,remove,restore}`, `GET /admin/accounts/{id}/id-documents`, worker CRUD, store CRUD, `GET /admin/sales[/summary]`, contact messages |

Authentication is a Sanctum **session cookie** (no bearer tokens in the browser): fetch
`/sanctum/csrf-cookie`, then send `X-XSRF-TOKEN` on state-changing requests with
`withCredentials`. The React client does this automatically.

---

## Database

22 migrations create: users (+role/status/account numbers/bad records), id_documents,
audit_logs, categories, stores(+images/highlights), products(+images/highlights), carts,
cart_items, orders, order_items, order_status_histories, notifications, contact_messages,
sessions/cache/jobs and Sanctum tokens.

```bash
cd backend
php artisan migrate:fresh --seed   # rebuild + demo data
php artisan db:seed                # idempotent demo data only
```

Seeders: `UserSeeder` → `CatalogSeeder` → `CommerceSeeder`.

---

## Security controls

Implemented (see [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) for the full audit and
recheck):

- **Authentication** — Sanctum SPA cookies (HttpOnly, encrypted, SameSite=Lax, Secure when
  HTTPS); session regenerated on login/logout; remember-me invalidated on ban; login
  throttled 5/min per identifier+IP; pending/removed/banned accounts cannot authenticate.
- **Authorization** — role middleware + policies; customer queries always scoped by
  `auth()->id()`; other users' resources return 404 (no IDOR enumeration); admins cannot
  remove themselves/other admins; workers cannot edit admins.
- **Input validation** — FormRequest on every write; explicit `$fillable`; no mass
  assignment of role/status/prices; sort/filter columns whitelisted; no raw SQL.
- **Passwords** — bcrypt cost 12; minimum 12 chars with mixed case, numbers and symbols.
- **Uploads** — mimes jpg/jpeg/png/webp, size limits, random filenames, public assets on
  the public disk, government ID scans on the **private** disk streamed only to the owner
  or an admin (never a public URL).
- **Transport/hosts** — `URL::forceRootUrl(APP_URL)` so generated links can never be
  poisoned via a spoofed Host header; `TRUSTED_HOSTS` allow-list enforced in production;
  trusted proxies configured; HSTS when HTTPS.
- **Headers** — `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`, COOP/CORP, `Cache-Control: no-store` for API; nginx adds a CSP for
  the SPA and denies dotfiles/source maps.
- **CSRF / CORS** — Sanctum CSRF on stateful routes; CORS restricted to configured origins
  with credentials.
- **Rate limiting** — 120/min general API, 5/min login, 10/h registration, 5/min password
  reset, 3/h contact, 30/min checkout.
- **Business integrity** — checkout runs in a transaction with `SELECT … FOR UPDATE`, stock
  re-validated, totals recomputed server-side; order state machine only through the service;
  stock restored exactly once on cancel/expiry; audit log for privileged mutations.
- **Secrets** — `.env` git-ignored and excluded from Docker images; production images run
  with `APP_DEBUG=false`, `expose_php=Off`, opcache enabled.
- **Dependencies** — `composer audit` clean; `npm audit` 0 known vulnerabilities (after
  toolchain patch).

---

## Testing & verification

```bash
# Backend feature/unit tests (SQLite in-memory, 316 tests incl. 108 security tests)
cd backend && php artisan test

# Style gate (Pest/PHPUnit + Pint)
cd backend && vendor/bin/pint --test

# Dependency audits
cd backend && composer audit
npm audit --audit-level=high

# Frontend type-check + production build
npm run build

# Frontend lint
npm run lint

# End-to-end API flow against a running backend (PHP must be serving :8000)
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
```

The smoke script covers 34 checks: public catalogue, auth/authorization (401/403),
cart → checkout → cancel with stock verification, worker status transitions + 409s,
admin tabs/sales/contact, registration with ID uploads + pending login block + admin
approval, and login brute-force throttling.

An independent security review closed with **PASS with deployment conditions and zero
open findings** (7 findings found and fixed, including one High-severity Host-header
password-reset poisoning issue). Details, evidence and the recheck log:
[`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md).

CI (`.github/workflows/ci.yml`) runs the backend tests + Pint + `composer audit`,
the frontend build + `npm audit`, and builds the Docker images with a health smoke test.

---

## Operations

- **Health:** `GET /api/health` (also `/healthz` from nginx).
- **Logs:** `docker compose logs -f app` (Laravel logs to stderr in Docker, daily files locally).
- **Queue:** database queue; `docker compose logs -f queue`.
- **Scheduler:** `orders:mark-unclaimed` hourly; run `php artisan schedule:list` to confirm.
- **Backups:** `docker compose exec db mysqldump -u root -p"$DB_ROOT_PASSWORD" online_mall > backup.sql`;
  uploads are in the `app_storage` volume.
- **Scaling:** stateless php-fpm + shared DB/storage; run multiple `app`/`queue` replicas
  behind a load balancer; `SESSION_DRIVER=database` and `CACHE_STORE=database` are shared.

---

## Project layout

```
├─ backend/                  Laravel 12 API
│  ├─ app/{Http,Models,Enums,Services,Policies,Support}
│  ├─ database/{migrations,seeders,factories}
│  ├─ routes/{api.php,web.php,console.php}
│  └─ tests/{Feature,Unit}
├─ src/                      React 19 SPA (fully API-driven)
│  ├─ lib/{api.ts,types.ts,format.ts}
│  ├─ context/AuthContext.tsx
│  ├─ pages/{guest,customer,worker,admin}/
│  └─ components/{common,features,ui}/
├─ docker/
│  ├─ php/{Dockerfile,php.ini,entrypoint.sh}
│  ├─ nginx/{Dockerfile,default.conf,security-headers.conf}
│  └─ mysql/init/
├─ docs/
│  ├─ BACKEND_ARCHITECTURE.md   API + DB + security contract
│  ├─ FRONTEND_CONTRACT.md      UI inventory and mock data
│  ├─ API.md                    endpoint reference
│  └─ SECURITY_AUDIT.md         OWASP audit + recheck
├─ scripts/smoke-test.ps1
├─ docker-compose.yml
├─ .env.example
└─ .github/workflows/ci.yml
```

---

## Known limitations / notes

- **Docker was not runnable in the development environment** used to build this project
  (no Docker engine available). All images, the compose stack, nginx/php-fpm configs and
  entrypoint were validated statically (`docker compose` YAML parse, `bash -n`, config
  review), and the identical application was verified locally with PHP 8.2 + MySQL +
  `php artisan serve`. Run `docker compose up -d --build` on a Docker-capable machine for
  the runtime check; CI performs the same build + `/api/health` smoke test.
- **TypeScript is pinned to `~6.0.3`** (from `~7.0.2`): `typescript-eslint@8` refuses to
  load against TypeScript 7, so `npm run lint` could not work at all. Build and lint are
  green with 6.0.3. The upstream `package-lock.json` also had an unresolvable peer
  conflict, so installs use `npm install --legacy-peer-deps` (Docker uses
  `npm ci --legacy-peer-deps`). This is recorded in the audit.
- **No online payments** — by design the app is "pay & claim at the mall"; orders carry
  `payment_method=pay_at_mall` and are marked paid when claimed.
- **The contact-form captcha is a UI affordance only**; server-side protection is the
  honeypot field + 3/hour/IP throttle. Integrate reCAPTCHA/hCaptcha server verification
  before exposing the form publicly.
- **No browser automation** was available, so visual/E2E browser checks were limited to the
  production build plus live HTTP verification of every endpoint; the UI markup/classes
  were deliberately preserved.
- Local MariaDB (XAMPP) differs slightly from MySQL 8.4 in Docker; migrations are portable
  and are exercised on both.

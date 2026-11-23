# Online Mall Cordova — Backend Architecture & API Contract

> Authoritative spec for the Laravel backend (`backend/`) and the React frontend rewire.
> All implementers MUST follow this file. Ask the Lead before deviating.
> Stack: PHP 8.2, Laravel 12.73, Sanctum (SPA cookies), PostgreSQL 16 (prod/docker/local), Vite React 19 frontend.

---

## 1. Repo layout

```
onlinemall-frontend-main/
├─ backend/                    # Laravel 12 API (single source of truth for data)
├─ src/                        # existing React frontend (to be rewired to API)
├─ docker/                     # php-fpm Dockerfile+ini, nginx Dockerfile+conf (PostgreSQL runs as a compose service)
├─ docker-compose.yml
├─ docs/                       # this spec, FRONTEND_CONTRACT.md, SECURITY_AUDIT.md, API.md
├─ .env.example               # root: compose + frontend build args
└─ README.md
```

Local dev DB: PostgreSQL 16, `online_mall`, user `onlinemall` @ 127.0.0.1:5432 (see backend/.env.example).
Test DB: `online_mall_test`. The fast default suite uses SQLite `:memory:` (phpunit.xml); the
PostgreSQL suite uses `phpunit.pgsql.xml` (CI + `scripts/test-pgsql.ps1`).

## 2. Conventions

- **JSON casing: `snake_case`** everywhere (request + response), matching Laravel. Frontend maps in `src/lib/api.ts`.
- **Success envelope** (all success responses):
  ```json
  { "data": {...}, "message": "optional" }
  ```
  Lists: `{ "data": [...], "meta": { "current_page": 1, "last_page": 5, "per_page": 20, "total": 93 } }`
- **Validation errors**: HTTP 422, `{ "message": "...", "errors": { "field": ["..."] } }` (Laravel default).
- **Auth errors**: 401 `{ "message": "Unauthenticated." }`. **Authorization**: 403 `{ "message": "...", "code": "..." }`.
- Domain errors (stock, invalid transition): 409 `{ "message": "...", "code": "insufficient_stock" }`.
- Rate limited: 429 with `Retry-After`.
- Dates: ISO-8601 in JSON (`updated_at`), UI formats `m/d/Y`. Timezone `Asia/Manila`.
- Money: JSON number (e.g. `1299.00`), DB `DECIMAL(10,2)`. Currency PHP (₱).
- IDs: integers internally; expose numeric strings only for `customer_no` / `worker_no` / `order_number`.
- All `/api/*` routes are prefixed. Public = no auth. Auth = Sanctum (`auth:sanctum`) satisfied by either a session cookie (same-origin) or a Bearer token (split origin).
- **Never trust client prices/stock/roles.** Always recompute from DB.
- Roles: `admin`, `worker`, `customer`; statuses: `pending`, `active`, `rejected`, `removed`, `banned`.

## 3. Authentication (Sanctum SPA cookies, or Bearer tokens for split origin)

- Dev: Vite proxies `/api`, `/sanctum`, `/storage` → `http://127.0.0.1:8000`, so browser sees one origin (no CORS).
- Prod: nginx serves SPA + proxies `/api` etc. to php-fpm on the same origin (no CORS).
- Flow: `GET /sanctum/csrf-cookie` → `POST /api/auth/login` → session cookie (HttpOnly, SameSite=Lax, Secure in prod) → `POST /api/auth/logout`.
- **Split-origin deployments** (SPA on Vercel, API at `kjugarap.top/omc-backend`) use Bearer tokens: `POST /api/auth/token` issues a Sanctum personal access token (role ability, TTL from `SANCTUM_EXPIRATION`, revoked on logout/ban); clients send `Authorization: Bearer <token>`. List the Vercel origin in `CORS_ALLOWED_ORIGINS` and keep it OUT of `SANCTUM_STATEFUL_DOMAINS` so those requests stay stateless. See `docs/DEPLOYMENT-CPANEL-VERCEL.md`.
- `GET /api/auth/me` returns the authenticated user or 401.
- Login accepts `login` = email **or** phone. Throttle: 5 attempts/minute per login+IP; lockout response 429.
- Registration creates `status=pending` customer + 1-2 private ID images. Pending users **cannot log in** (403, `code=account_pending`). Admin approves → `active`, `customer_no` generated (12-digit numeric string).
- Password: min 12 chars, letters+numbers+mixed case (no HIBP network call). bcrypt rounds 12.
- Forgot/reset password: standard Laravel password broker, email via SMTP (Mailpit in docker). Response always 200 to prevent user enumeration.
- Session: database driver, `SESSION_ENCRYPT=true`, lifetime 120, regenerate on login/logout.

## 4. Database schema (authoritative)

All tables: `id BIGINT UNSIGNED PK`, `created_at`, `updated_at` unless stated. InnoDB, utf8mb4_unicode_ci.

### 4.1 Users & accounts (owner: backend-auth)
`users` (start from Laravel default, then add columns via a new migration — do not edit the default users migration):
| column | type | notes |
|---|---|---|
| name | string(120) | existing |
| email | string(190) unique | existing |
| phone | string(20) null, index | unique when not null |
| password | string | existing (bcrypt) |
| role | enum(admin,worker,customer) default customer, index | |
| status | enum(pending,active,rejected,removed,banned) default pending, index | |
| customer_no | string(12) null unique | assigned on approval |
| worker_no | string(12) null unique | assigned on creation |
| gender | string(40) null | free text: "Real Men", "Gender Neutral", "Female" from UI |
| birthday | date null | must be 18+ at registration |
| address | string(255) null | |
| profile_photo_path | string(255) null | public disk |
| bad_records | tinyint unsigned default 0 | incremented on `not_claimed` |
| store_id | FK stores null | workers only, optional |
| last_login_at | timestamp null | |
| email_verified_at | timestamp null | existing |
| remember_token | string(100) null | existing |

Indexes: `(role,status)`, `(status,created_at)`, `(last_login_at)`.

`id_documents`: `user_id` FK cascade, `type enum(id_front,id_back)`, `path` (private disk), `original_name`, `mime`, `size_bytes`, index `(user_id,type)`. Files on **private** disk, never public; served only to owner/admin via authorized download route.

`audit_logs`: `actor_id` FK users null, `action` string(80), `subject_type` string(80) null, `subject_id` bigint null, `meta` json null, `ip_address` string(45), `user_agent` string(255) null. Index `(actor_id,created_at)`, `(subject_type,subject_id)`.

### 4.2 Catalog (owner: backend-catalog)
`categories`: `name` string(80), `slug` unique, `type enum(store,product)`, `parent_id` FK categories null, `sort_order` int default 0. Unique `(type,slug)`.

`stores`: `name` string(120), `slug` unique, `category_id` FK categories null, `description` text null, `operating_hours` string(60) default "6:00AM - 11:00PM", `phone` string(20), `image_path` string(255) null (public disk), `is_open` bool default true, `floor_location` string(120) null, `deleted_at` timestamp null (SoftDeletes). Index `(is_open,category_id)`.
`store_images`: `store_id` FK cascade, `path`, `sort_order` int default 0. (gallery for store detail)
`store_highlights`: `store_id` FK cascade, `title` string(120), `body` text, `sort_order` int default 0.

`products`: `store_id` FK stores null (SetNull), `category_id` FK categories null, `name` string(160), `slug` unique, `sku` string(40) null unique, `description` text null, `price` decimal(10,2), `original_price` decimal(10,2) null, `stock` int unsigned default 0, `is_new` bool default false, `is_active` bool default true, `created_by` FK users null, `deleted_at` timestamp null. Index `(is_active,category_id)`, `(price)`, fulltext optional (use LIKE for portability).
`product_images`: `product_id` FK cascade, `path`, `sort_order` int default 0 (max 3 enforced app-level).
`product_highlights`: `product_id` FK cascade, `title` string(120), `body` text, `sort_order` int default 0 (product detail "Description" blocks).

### 4.3 Commerce (owner: backend-commerce)
`carts`: `user_id` FK users unique cascade.
`cart_items`: `cart_id` FK cascade, `product_id` FK products cascade, `quantity` int unsigned default 1, `is_selected` bool default true. Unique `(cart_id,product_id)`.

`orders`: `order_number` string(20) unique, `user_id` FK users null restricted, `status enum(pending,ready,claimed,cancelled,not_claimed)` default pending, `subtotal` decimal(10,2), `total` decimal(10,2), `payment_method` string(30) default `pay_at_mall`, `payment_status enum(unpaid,paid)` default unpaid, `pickup_location` string(160) default `Online Mall Cordova - Pickup Counter`, `notes` text null, `ready_at` timestamp null, `claim_deadline` timestamp null (ready_at + 3 days), `claimed_at`, `cancelled_at`, `not_claimed_at` timestamps null, `cancelled_by` FK users null. Index `(user_id,status,created_at)`, `(status,created_at)`, `(created_at)`.
`order_items`: `order_id` FK cascade, `product_id` FK products null SetNull, `product_name` string(160) snapshot, `unit_price` decimal(10,2), `quantity` int unsigned, `line_total` decimal(10,2), `image_path` string(255) null snapshot.
`order_status_histories`: `order_id` FK cascade, `from_status` string(20) null, `to_status` string(20), `changed_by` FK users null, `note` string(255) null.

`notifications`: `user_id` FK users cascade, `category enum(offers,order,system)` default system, `title` string(160), `body` text, `read_at` timestamp null. Index `(user_id,category,read_at)`, `(user_id,created_at)`.
`contact_messages`: `name` string(120), `email` string(190), `phone` string(20), `subject` string(160), `message` text, `status enum(new,read,replied)` default new, `ip_address` string(45) null, `user_agent` string(255) null. Index `(status,created_at)`.

## 5. API endpoints (authoritative; routes/api.php is written by Lead)

Legend: 🔓 public · 👤 any auth · 🧑 customer · 🛠 worker · 👑 admin. All under `/api`.

### Auth & profile (backend-auth)
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | multipart: name,email,phone,address,birthday,gender?,password,password_confirmation,id_front,id_back,agree_terms(bool). throt. 10/h. 201 → `{data:{message}}`, status pending, default avatar (no profile photo at registration; active customers upload via `/profile/avatar`) |
| POST | `/auth/login` | 🔓 | `{login,password,remember}`; 403 codes: account_pending/account_removed/account_banned; 422 invalid |
| POST | `/auth/token` | 🔓 | Bearer-token login for cross-origin SPAs: same body + optional `device_name`; returns `{token,token_type,expires_at,abilities,user}`; token revoked on logout/ban; throttled like login |
| POST | `/auth/logout` | 👤 | 204 |
| GET | `/auth/me` | 👤 | user payload |
| POST | `/auth/forgot-password` | 🔓 | `{email}` always 200 |
| POST | `/auth/reset-password` | 🔓 | `{token,email,password,password_confirmation}` |
| GET | `/profile` | 👤 | user + `id_documents` meta (front/back uploaded booleans) |
| PATCH | `/profile` | 👤 | name,phone,address,gender,birthday |
| PATCH | `/profile/password` | 👤 | current_password,password,password_confirmation |
| POST | `/profile/avatar` | 👤 | multipart `avatar` (image ≤2MB) |
| GET | `/profile/id-documents/{document}` | 👤 | owner or admin only, private file stream |

### Public catalog (backend-catalog)
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/categories` | 🔓 | `?type=product\|store` returns flat list with `parent_id`, `display_name` ("Electronics - Audio") |
| GET | `/products` | 🔓 | filters `category` (slug), `search`, `sort=price_asc\|price_desc\|newest`, `in_stock=1`, `out_of_stock=1`, `per_page` ≤50. Paginated envelope |
| GET | `/products/{slug}` | 🔓 | full detail + images[] + highlights[] + store{} + category{display_name} + related[] |
| GET | `/stores` | 🔓 | filters `category`, `search`, `open=1`, `closed=1`, paginated |
| GET | `/stores/{slug}` | 🔓 | images[], highlights[], products[] (active, up to 12) |
| GET | `/home` | 🔓 | `{new_arrivals[], featured_products[], stores[], stats{products,stores}}` |

### Cart / orders / notifications (backend-commerce)
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/cart` | 🧑 | `{items[], summary{selected_count,total,item_count}}` |
| POST | `/cart/items` | 🧑 | `{product_id,quantity}` upsert; 409 insufficient_stock |
| PATCH | `/cart/items/{item}` | 🧑 | `{quantity?,is_selected?}` own cart only; 404 otherwise |
| DELETE | `/cart/items/{item}` | 🧑 | 204 |
| DELETE | `/cart/items` | 🧑 | clear (optional `?selected=1`) |
| POST | `/checkout` | 🧑 | `{item_ids?:[], select_all?:bool}`; transaction+row locks; creates order pending, decrements stock, clears purchased cart items, creates order notification. 409 codes: empty_cart, insufficient_stock, cart_item_invalid |
| GET | `/orders` | 🧑 | `?status=active\|history\|pending...`; active = pending+ready, history = claimed+cancelled+not_claimed; envelope with items[] |
| GET | `/orders/{order}` | 🧑 | own order only (403/404) |
| PATCH | `/orders/{order}/cancel` | 🧑 | only pending → cancelled (+ stock restore). 409 invalid_order_status |
| GET | `/notifications` | 🧑 | `?category=offers\|order\|system`, `search`; returns `data[]` + `counts{all,offers,order,system}` + `unread` |
| PATCH | `/notifications/{notification}/read` | 🧑 | own only |
| POST | `/notifications/read-all` | 🧑 | |
| POST | `/contact` | 🔓 | public form; throttle 3/h/IP; honeypot field `website` must be empty |
| GET | `/app/notifications/…` → not used |

### Worker (backend-commerce for orders + backend-catalog for products)
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/worker/orders` | 🛠 | filters `status=pending\|ready\|claimed\|cancelled\|not_claimed`, `search` (customer name / order_number), paginated; includes customer{name,phone} |
| GET | `/worker/orders/{order}` | 🛠 | detail |
| PATCH | `/worker/orders/{order}/status` | 🛠 | `{status: ready\|claimed\|not_claimed\|cancelled}`; validates transitions: pending→ready|cancelled; ready→claimed|not_claimed. Side effects: timestamps, claim_deadline, stock restore on cancel/not_claimed, bad_records++/auto-ban on not_claimed, notification to customer. 409 invalid_order_status |
| GET | `/worker/products` | 🛠 | filters category,search,in_stock,sort; paginated |
| POST | `/worker/products` | 🛠 | multipart fields + images[] (≤3, jpg/png/webp ≤3MB) OR json; slug auto |
| PATCH | `/worker/products/{product}` | 🛠 | POST with `_method=PATCH` when multipart; supports `remove_image_ids[]` |
| DELETE | `/worker/products/{product}` | 🛠 | soft delete; 409 if open (pending) orders reference it? (allowed: items are snapshotted) |

### Admin (backend-auth accounts, backend-catalog stores, backend-commerce sales)
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/admin/accounts` | 👑 | `?tab=pending\|customer\|worker\|removed&search=&per_page=`; rows include account fields + `customer_no`/`worker_no`, `bad_records`, `id_documents_count` |
| POST | `/admin/accounts/{user}/approve` | 👑 | pending customer → active + customer_no + notification |
| POST | `/admin/accounts/{user}/reject` | 👑 | pending → rejected |
| POST | `/admin/accounts/{user}/remove` | 👑 | active customer/worker → removed; customer with bad_records≥2 → banned. Cannot remove self/admin |
| POST | `/admin/accounts/{user}/restore` | 👑 | removed/banned → active |
| GET | `/admin/accounts/{user}/id-documents` | 👑 | metadata + 2 download urls |
| GET | `/admin/workers` | 👑 | list workers (for selects) |
| POST | `/admin/workers` | 👑 | name,email,phone,address,birthday,gender,password,store_id? → active worker + worker_no |
| PATCH | `/admin/workers/{user}` | 👑 | fields; password optional; cannot edit admin |
| DELETE | `/admin/workers/{user}` | 👑 | → removed |
| GET | `/admin/stores` | 👑 | paginated incl. closed/deleted? active only + search/category |
| POST | `/admin/stores` | 👑 | `name,category_id,operating_hours,phone,is_open,description,floor_location`, optional image file |
| PATCH | `/admin/stores/{store}` | 👑 | same + optional image |
| DELETE | `/admin/stores/{store}` | 👑 | soft delete |
| GET | `/admin/sales/summary` | 👑 | `?month=YYYY-MM`; `{revenue,cancelled_count,cancelled_total,not_claimed_count,not_claimed_total,orders_count,month}` |
| GET | `/admin/sales` | 👑 | `?date=YYYY-MM-DD&status=claimed\|cancelled\|not_claimed\|all`; `{date,revenue,cancelled_total,not_claimed_total,orders[]}` |
| GET | `/admin/contact-messages` | 👑 | paginated; `?status=` |
| PATCH | `/admin/contact-messages/{message}` | 👑 | `{status: read\|replied}` |

### Health
| GET | `/health` | 🔓 | `{status:"ok",time,db:"ok"}` (DB ping) |

## 6. Authorization & business rules (must be enforced server-side)

1. Every customer data query is scoped by `auth()->id()`; cross-user access → 404 (not 403, to avoid IDOR enumeration).
2. Admin routes require role=admin; worker routes role=worker or admin; customer routes customer only (worker/admin cannot use cart/checkout). Abilities via `Gate`/middleware `role:`.
3. Order state machine is the only way status changes: pending→{ready,cancelled}; ready→{claimed,not_claimed}; terminal states immutable.
4. Checkout: `DB::transaction` + `lockForUpdate()` on products; re-validate stock; total computed from DB prices; cart rows deleted in same transaction.
5. Cancel/not_claimed restores stock exactly once (guard by status transition + history row).
6. `not_claimed`: customer `bad_records += 1`; if `>= 2` → status `banned`; notification sent.
7. Pending users cannot authenticate; removed/banned cannot authenticate (existing sessions revoked on status change: delete sessions + tokens).
8. Admin cannot remove/ban themselves or another admin; worker cannot edit admin.
9. File uploads: `mimes:jpg,jpeg,png,webp` + `max` size + random hashed names; ID docs on private disk; no SVG; served only via authorized controller (never direct web path).
10. Soft-deleted stores/products excluded from every public/admin list unless explicit.
11. All admin mutations write `audit_logs` (actor, action, subject, IP).
12. Rate limits: login 5/min, register 10/h, forgot 5/min, contact 3/h, checkout 30/min, api general 120/min per user/IP.
13. No mass assignment: FormRequests + explicit `$fillable`/validated arrays.
14. Never expose `password`, `remember_token`, ID document paths, or full ID URLs in JSON.

## 7. Security requirements (checked by QA)

- OWASP A01: policies/scoping above; admin cannot access customer cart routes; 404 for other users' resources.
- A02: bcrypt cost 12; secrets only in env; no credentials in repo; `.env` gitignored; docker secrets via env file.
- A03: no raw SQL/string interpolation; parameter-bound queries only; whitelist sort/filter columns.
- A04: no mass assignment; upload restrictions; DB transaction locking for stock; unique constraints.
- A05: env-driven config, `APP_DEBUG=false` in prod images, security headers middleware (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: no-store` for auth); nginx adds CSP for SPA.
- A06: `composer audit` + `npm audit` clean (document exceptions); pinned lockfiles.
- A07: session cookies HttpOnly/SameSite/Secure, session fixation (regenerate), login throttling, generic password-reset responses, strong password policy.
- A08: no unserialize of user input, JSON only, CSRF via Sanctum for cookie auth.
- A09: audit logging, failed login logging optional, `APP_DEBUG=false`, generic 500 in prod.
- A10: `TrustHosts`, HSTS in prod nginx, `TrustProxies` configured, no SSRF endpoints, no open redirects.

## 8. Docker (owner: Lead)

Services: `db` (postgres:16-alpine, volume, `pg_isready` healthcheck), `app` (php:8.2-fpm-alpine built from `docker/php/Dockerfile`, app code, composer deps, non-root, healthcheck), `web` (nginx:alpine multistage: build React with node:22-alpine → serve dist + proxy `/api` to app:9000, port 8080:80), `queue` (same app image, `php artisan queue:work`), `scheduler` (same app image, `php artisan schedule:work`), `mailpit` (profile `dev`, ports 8025/1025).
- Entrypoint waits for PostgreSQL, runs `php artisan migrate --force` (or `config:cache`, `route:cache`, `view:cache`), fixes storage perms.
- `.env.example` at root for compose: DB_PASSWORD, DB_SSLMODE, APP_KEY, APP_ENV, APP_URL, MAIL_*.
- PostgreSQL credentials come from env; the app user only gets its DB; no port 5432 published by default.
- Docker healthchecks: `pg_isready`; php-fpm TCP probe; nginx `/healthz`.
- Frontend build: `VITE_API_BASE=/api` (relative, same-origin).

## 9. Definition of done (per module)

- Migrations run clean from empty DB (`php artisan migrate:fresh`) on PostgreSQL 16 **and** SQLite (fast tests); `phpunit.pgsql.xml` covers the PostgreSQL run.
- FormRequests for every write; API Resources / serializers stable; no N+1 (eager load relations).
- Feature tests cover happy path + auth + validation + authorization/IDOR + business-rule errors.
- `php artisan test` green; `vendor/bin/pint --test` clean; no debug leftovers (`dd`, `dump`, `var_dump`, `console.log` in frontend except error handling).
- Seeder produces demo data (admin, workers, customers with pending/active/removed/banned, stores, products with images, orders at various statuses dated today/-1/-2 days, notifications, contact messages).
- Demo accounts (document in README): 5 admins + 5 workers on `@gaisano-cordova.com`
  (`admin@`, `admin-kenlie@`, `admin-sherwynn@`, `admin-dudes@`, `admin-charlie@`;
  `worker@`, `worker-kenlie@`, `worker-sherwynn@`, `worker-dudes@`, `worker-charlie@`)
  with password `admin@0912345`; `customer@gaisano-cordova.com` / `Customer#2026Secure`.

## 10. Ownership map (avoid file conflicts)

| Owner | Writes |
|---|---|
| Lead | composer.json/lock, .env*, config/*, bootstrap/*, routes/*, app/Http/Middleware/*, app/Http/Controllers/Controller.php, app/Http/Responses/ApiResponse.php, app/Enums/*, app/Support/AuditLogger.php, app/Providers/AppServiceProvider.php, database/seeders/DatabaseSeeder.php, docker/*, docker-compose.yml, docs/*, README.md, frontend vite.config.ts |
| backend-auth | migrations (users extras, id_documents, audit_logs), Models User/IdDocument/AuditLog, app/Http/Controllers/Api/Auth/*, ProfileController, Admin/AccountController, Admin/WorkerController, requests+resources+policies for these, database/seeders/UserSeeder.php, tests/Feature/Auth/, tests/Feature/Admin/AccountsTest.php |
| backend-catalog | migrations (categories, stores, store_images, store_highlights, products, product_images, product_highlights), models, Api/Public/{Category,Product,Store,Home}Controller, Api/Admin/StoreController, Api/Worker/ProductController, requests+resources, database/seeders/CatalogSeeder.php, tests/Feature/Catalog/, tests/Feature/Admin/StoresTest.php, tests/Feature/Worker/ProductsTest.php |
| backend-commerce | migrations (carts, cart_items, orders, order_items, order_status_histories, notifications, contact_messages), models, controllers Cart/Checkout/Order/Notification/Contact, Admin/SalesController, Admin/ContactMessageController, Worker/OrderController, services CheckoutService/OrderStatusService, requests+resources, database/seeders/CommerceSeeder.php, tests/Feature/Cart/, Orders/, Notifications/, Admin/SalesTest.php, Worker/OrdersTest.php |
| frontend-core | src/lib/api.ts, src/lib/types.ts, src/context/*, src/main.tsx, src/vite-env? , guest pages, customer pages, common headers, feature sections (customer/guest) |
| frontend-admin | src/pages/admin/*, src/pages/worker/*, src/components/ui/{AdminStoreModal,EditProductModal,WorkerFormModal,AdminOrderDetailsModal,ViewIdModal,CustomerDetailsModal,WorkerDetailsModal}.tsx |
| qa-security | docs/SECURITY_AUDIT.md, backend/tests/Feature/Security/* (new files only), no app source edits unless Lead assigns fixes |

Shared API layer (`src/lib/api.ts`) is created by frontend-core **first**; frontend-admin imports it (never edits it without messaging Lead).

## 11. Commands

```bash
cd backend
php artisan migrate:fresh --seed       # local reset
php artisan serve --host=127.0.0.1 --port=8000
php artisan test                       # PHPUnit (SQLite :memory:)
vendor/bin/pint --test                 # style gate
composer audit                         # PHP dependency CVEs
php artisan route:list --path=api      # verify route surface
```
Frontend: `npm install && npm run dev` (Vite proxy → 8000), `npm run build`.

## 12. Demo business data (seeders)

Use mock data from `docs/FRONTEND_CONTRACT.md` §4 as seed source. Required demo states:
- 2 pending customers (with ID docs metadata pointed at seeded placeholder images in private disk), 3 active customers (one with bad_records=1), 1 removed customer, 1 banned customer.
- 2 active workers, 1 removed worker.
- 10 stores across categories (mock names: McDonald's, Mang Inasal, Jollibee, Shein, Hair Salon, Cebuana…), some closed.
- 12+ products across the UI categories, some out of stock, some new, each 1-3 images (use unsplash URLs stored as-is in `path` when remote? **No** — image_path stores local relative paths only for uploads; for seed demo use local placeholder images copied from `src/assets/` or generate simple SVG/PNG placeholder files in `storage/app/public/seed/`. Prefer copying `src/assets/logo.webp` + generating colored placeholder PNGs (1x1 PNG bytes) — simpler: store external `https://images.unsplash.com/...` in a nullable `external_image_url` column? Avoid schema noise: store full URLs in `image_path`; serializer returns path as-is if it starts with http, else `/storage/<path>`. Document this in catalog resource.)
- Orders: ≥12 spread over today, yesterday, 2 days ago; statuses pending/ready/claimed/cancelled/not_claimed; 1-3 items each; totals matching line items; claim deadlines set.
- Notifications: 5+ per demo customer across offers/order/system, some read.
- Contact messages: 2 (1 new).

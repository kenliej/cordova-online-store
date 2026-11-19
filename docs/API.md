# Online Mall Cordova — API Reference

Base URL: `/api` (same origin in dev via Vite proxy and in Docker via nginx).
Authoritative contract & DB schema: [`BACKEND_ARCHITECTURE.md`](BACKEND_ARCHITECTURE.md).

## Conventions

- JSON only, **`snake_case`** field names, UTF-8.
- Success: `{ "data": ..., "message"?: "..." }`
- Lists: `{ "data": [...], "meta": { current_page, last_page, per_page, total, from, to } }`
- Validation error (`422`): `{ "message": "...", "errors": { "field": ["..."] } }`
- Domain error (`409`): `{ "message": "...", "code": "insufficient_stock" }`
- Unauthenticated `401`, forbidden `403`, not found `404`, throttled `429` (+ `Retry-After`).
- Money is a JSON number in PHP pesos; timestamps are ISO-8601 (`Asia/Manila`).
- Everything under `/api` is rate-limited to **120 req/min** per user (or per IP when
  anonymous); stricter limits apply per endpoint (noted below).

## Authentication

Two interchangeable modes, chosen by the frontend build:

| Mode | When | Transport |
|---|---|---|
| **Cookie (Sanctum SPA)** | Same-origin (Docker/nginx, Vite proxy) | `POST /auth/login` + session cookie + CSRF |
| **Bearer token** | Split origin (frontend on Vercel, API on cPanel) | `POST /auth/token` + `Authorization: Bearer <token>` |

### Cookie mode (same origin)

```http
GET  /sanctum/csrf-cookie          # sets XSRF-TOKEN cookie
POST /api/auth/login               # JSON, header X-XSRF-TOKEN, credentials: include
GET  /api/auth/me                  # current user or 401
POST /api/auth/logout              # 204
```

Cookies are `HttpOnly`, encrypted and `SameSite=Lax` (`Secure` when served over HTTPS).

### Token mode (cross-origin: Vercel → cPanel)

```http
POST /api/auth/token
Content-Type: application/json
{ "login": "customer@example.com", "password": "…", "remember": true, "device_name": "spa" }

201/200 →
{ "data": {
    "token": "1|xxxxxxxx…",          // plain text, shown once
    "token_type": "Bearer",
    "expires_at": "2026-11-27T…",     // null when SANCTUM_EXPIRATION is empty
    "abilities": ["role:customer"],
    "user": { … }
} }
```

Send `Authorization: Bearer 1|xxxxxxxx…` on every request. `POST /api/auth/logout`
revokes the presented token; banning/removing a user revokes all of their tokens.
Token lifetime is `SANCTUM_EXPIRATION` (minutes; recommended `10080` = 7 days).

Both modes share the same role policies, throttling and endpoints. The SPA stores the
token in `sessionStorage`, or `localStorage` when *Remember me* is checked; the Vercel
CSP (`script-src 'self'`) mitigates XSS token theft.

**CORS:** configure `CORS_ALLOWED_ORIGINS=https://<your-app>.vercel.app` (exact origin).
The API also exposes `Retry-After` / `X-RateLimit-*` headers for rate-limit UX. See
[`DEPLOYMENT-CPANEL-VERCEL.md`](DEPLOYMENT-CPANEL-VERCEL.md).

Roles: `customer`, `worker`, `admin`. Login accepts `login` = email **or** phone.
Blocked accounts return `403` with `code`: `account_pending` | `account_rejected` |
`account_removed` | `account_banned`.

## Public

| Method | Path | Description |
|---|---|---|
| GET | `/health` | `{status,database,time,app}`; 503 when DB is down |
| GET | `/home` | `{new_arrivals[],featured_products[],stores[],stats{products,stores}}` |
| GET | `/categories?type=product\|store` | flat list incl. `display_name` ("Electronics - Audio") |
| GET | `/products` | filters: `category` (slug/id/name), `search`, `sort=price_asc\|price_desc\|newest`, `in_stock=1`, `out_of_stock=1`, `per_page<=50`, `page` |
| GET | `/products/{slug}` | detail + `images[]`, `highlights[]`, `category`, `store`, `related[]` |
| GET | `/stores` | filters: `category`, `search`, `open=1`, `closed=1`, pagination |
| GET | `/stores/{slug}` | detail + `images[]`, `highlights[]`, `products[]` |
| POST | `/contact` | public message; honeypot field `website` must stay empty; **3/hour/IP** |
| GET | `/storage/{path}` | public-disk image (jpg/jpeg/png/webp/gif/avif/ico); used when no static `/storage` symlink exists (cPanel); traversal/non-image blocked |

## Auth & profile

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | multipart: `name,email,phone,address,birthday,gender?,password,password_confirmation,profile_photo?,id_front,id_back,agree_terms`; **10/hour/IP**; `201` pending (no session) |
| POST | `/auth/login` | — | `{login,password,remember}`; **5/min** per identifier+IP |
| POST | `/auth/token` | — | cross-origin Bearer-token login (same body + `device_name`); **5/min** |
| POST | `/auth/logout` | any | ends session; `204` |
| GET | `/auth/me` | any | user payload |
| POST | `/auth/forgot-password` | — | `{email}`; always `200` (no account enumeration); sends Mailpit e-mail |
| POST | `/auth/reset-password` | — | `{token,email,password,password_confirmation}`; generic `422` on any failure |
| GET | `/profile` | any | user + `id_documents:{id_front,id_back}` booleans |
| PATCH | `/profile` | any | `name,phone,address,gender,birthday` |
| PATCH | `/profile/password` | any | `current_password,password,password_confirmation` |
| POST | `/profile/avatar` | any | multipart `avatar` (jpg/jpeg/png/webp ≤2 MB) |
| GET | `/profile/id-documents/{id}` | owner/admin | private file stream |

## Customer

| Method | Path | Description |
|---|---|---|
| GET | `/cart` | `{items[],summary{selected_count,total,item_count}}` |
| POST | `/cart/items` | `{product_id,quantity}` upsert; `409 insufficient_stock` |
| PATCH | `/cart/items/{id}` | `{quantity?,is_selected?}` (own cart only) |
| DELETE | `/cart/items/{id}` | remove line, `204` |
| DELETE | `/cart/items?selected=1` | clear cart (or only selected) |
| POST | `/checkout` | `{item_ids?:[],select_all?:bool}`; **30/min**; creates `pending` order, locks stock, snapshots prices; `409 empty_cart\|insufficient_stock\|cart_item_invalid` |
| GET | `/orders?status=active\|history\|pending\|ready\|claimed\|cancelled\|not_claimed\|all` | own orders, newest first |
| GET | `/orders/{id}` | own order only (others → `404`) |
| PATCH | `/orders/{id}/cancel` | only `pending`; restores stock; `409 invalid_order_status` |
| GET | `/notifications?category=offers\|order\|system&search=` | `{data[],counts{all,offers,order,system},unread}` |
| PATCH | `/notifications/{id}/read` | own notification |
| POST | `/notifications/read-all` | `{updated,unread}` |

Order status labels (`status`) vs codes (`status_code`): `Pending`, `Ready to Claim`,
`Claimed`, `Cancelled`, `Didn't Claimed` → `pending`, `ready`, `claimed`, `cancelled`,
`not_claimed`. Transition rules: `pending → ready|cancelled`, `ready → claimed|not_claimed`;
claimed orders are `payment_status=paid`; ready orders get `claim_deadline = ready_at + 3 days`.

## Worker

| Method | Path | Description |
|---|---|---|
| GET | `/worker/orders?status=&search=` | paginated queue incl. `customer{name,phone}`, `items[]`, `claim_deadline` |
| GET | `/worker/orders/{id}` | detail incl. `status_histories[]` |
| PATCH | `/worker/orders/{id}/status` | `{status: ready\|claimed\|not_claimed\|cancelled}`; side effects: timestamps, stock restore, customer notification, bad record/auto-ban on not-claimed |
| GET | `/worker/products` | inventory (filters `category,search,in_stock,out_of_stock,sort`) |
| POST | `/worker/products` | multipart or JSON: `name,category_id,description,price,stock,is_new?,images[]<=3` |
| PATCH | `/worker/products/{id}` | multipart `POST` + `_method=PATCH`; supports `remove_image_ids[]` |
| DELETE | `/worker/products/{id}` | soft delete |

## Admin

| Method | Path | Description |
|---|---|---|
| GET | `/admin/accounts?tab=pending\|customer\|worker\|removed&search=&per_page=` | account lists with counts/ID-doc metadata |
| GET | `/admin/accounts/{id}/id-documents` | `{user,documents[],id_front_url,id_back_url}` |
| POST | `/admin/accounts/{id}/approve` | pending → active, generates 12-digit `customer_no`, notifies |
| POST | `/admin/accounts/{id}/reject` | pending → rejected |
| POST | `/admin/accounts/{id}/remove` | active → removed (customer with `bad_records>=2` → banned); revokes sessions |
| POST | `/admin/accounts/{id}/restore` | removed/banned → active |
| GET | `/admin/workers?status=active\|removed\|all&search=` | worker list for selects |
| POST | `/admin/workers` | create worker (`worker_no` generated), optional `store_id` |
| PATCH | `/admin/workers/{id}` | update; password optional |
| DELETE | `/admin/workers/{id}` | → removed |
| GET | `/admin/stores` | paginated store directory |
| POST | `/admin/stores` | multipart create incl. optional image |
| GET | `/admin/stores/{id}` | detail |
| PATCH | `/admin/stores/{id}` | update (multipart + `_method=PATCH`) |
| DELETE | `/admin/stores/{id}` | soft delete |
| GET | `/admin/sales/summary?month=YYYY-MM` | `{month,revenue,cancelled_count,cancelled_total,not_claimed_count,not_claimed_total,orders_count}` |
| GET | `/admin/sales?date=YYYY-MM-DD&status=claimed\|cancelled\|not_claimed\|all` | per-day report |
| GET | `/admin/contact-messages?status=` | inbox |
| PATCH | `/admin/contact-messages/{id}` | `{status: read\|replied}` |

## Error codes (domain)

| Code | HTTP | Meaning |
|---|---|---|
| `insufficient_stock` | 409 | requested quantity exceeds stock |
| `empty_cart` | 409 | checkout with no selected items |
| `cart_item_invalid` | 409 | cart line no longer purchasable |
| `invalid_order_status` | 409 | forbidden status transition / cancel |
| `account_pending` / `account_rejected` / `account_removed` / `account_banned` | 403 | login blocked |
| `account_not_pending` / `account_not_removable` | 409 | invalid admin action state |
| `store_has_products` | 409 | store deletion blocked (if applicable) |

## Scheduling

`php artisan orders:mark-unclaimed` runs hourly in Docker (`scheduler` service): ready
orders past `claim_deadline` become `not_claimed`, stock is restored, the customer gets a
bad record (auto-ban at 2) and a notification.

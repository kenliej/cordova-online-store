# Online Mall Cordova — Security Audit & Adversarial Test Report

| | |
|---|---|
| **Report ID** | SEC-AUDIT-2026-11-20 |
| **Auditor** | `qa-security` (independent review role) |
| **Scope** | Laravel 12 backend (`backend/`), API surface, Docker stack (`docker/`, `docker-compose.yml`), frontend integration snapshot (`src/`), dependency supply chain |
| **Method** | Manual source review + adversarial PHPUnit feature tests + live runtime probes + dependency/infra/frontend review |
| **Audit date** | 2026-11-20 (Asia/Manila) |
| **Backend under test** | Laravel 12 + Sanctum 4 SPA cookie auth, PHP 8.2.12, PostgreSQL 16 (prod/docker/local), SQLite `:memory:` (fast tests) |
| **Runtime target** | `http://127.0.0.1:8000` (seeded `online_mall` DB, `php artisan serve`) |
| **Review-only guarantee** | No application source, route, config, Docker, frontend or teammate test file was modified. Deliverables added: `backend/tests/Feature/Security/*` and this document. |
| **Verdict** | **PASS with deployment conditions** — all 7 findings fixed and re-verified; residual risks are accepted/documented below. |

---

## 1. Executive summary

The backend implements the authoritative security contract (`docs/BACKEND_ARCHITECTURE.md` §6/§7) correctly in depth: server-side authorization with explicit `404` for cross-user resources, a database-driven order state machine with row locking, private government-ID storage, strict upload validation, Sanctum cookie authentication with CSRF enforcement for stateful requests, and JSON-only error responses in production configuration.

Seven findings were identified. The most serious (SEC-01, **High**) was a Host-header poisoning flaw that let an attacker point password-reset e-mail links at an attacker-controlled domain (account-takeover chain). All seven were remediated by the owning team and re-verified by this audit.

| Metric | Result |
|---|---|
| Security tests added | **108 tests / 1,276 assertions** (9 files in `backend/tests/Feature/Security/`) |
| Security suite result | **108 passed, 0 failed** |
| Full backend suite | **316 passed / 2,531 assertions** (baseline 208 preserved, no regressions) |
| E2E harness (`scripts/smoke-test.ps1`) | **34/34 checks pass** |
| `vendor/bin/pint --test` | **PASS** (190 files, clean) |
| `composer audit` | **No security vulnerability advisories found** |
| `npm audit --audit-level=low` | **0 vulnerabilities** (after dependency updates; dev-only toolchain advisories were present pre-fix) |
| Findings open at sign-off | **0** (7 fixed & rechecked) |
| Committed secrets | **None found** (tracked-file scan for keys/tokens/credentials) |

### Findings at a glance

| ID | Severity | Area (OWASP) | One-line | Status |
|---|---|---|---|---|
| SEC-01 | **High** | A10 SSRF/Host / A07 | Host-header injection poisons password-reset e-mail links → reset-token theft → account takeover | **Fixed** |
| SEC-02 | Medium | A07 Auth | `/api/auth/reset-password` leaked account existence via distinct 422 messages | **Fixed** |
| SEC-03 | Medium | A04/A07 | General 120 req/min API limit defined but not attached (`throttleApi()` missing) | **Fixed** |
| SEC-04 | Low | A01/A02 | `/api/profile` exposed full ID-document download URLs (spec §6.14 deviation; owner-only) | **Fixed** |
| SEC-05 | Low | A07 | Ban/removal revoked sessions+tokens but not `remember_token` (remember-me cookie could re-auth to profile routes) | **Fixed** |
| SEC-06 | Low | A05 Config | Mailpit published on all interfaces + unpinned; `SESSION_SECURE_COOKIE` default guidance for HTTPS | **Fixed / accepted** |
| SEC-07 | Low | A04/A09 | Array query params (`?category[]=x`, `?search[]=x`) caused unhandled `Array to string conversion` 500 on notifications | **Fixed** |

---

## 2. Scope, method and limitations

### 2.1 In scope

- `backend/routes/api.php`, `bootstrap/app.php`, `config/{auth,cors,session,sanctum,filesystems}.php`, middleware, policies, FormRequests, controllers, services, models, resources, commands, seeders/factories (read-only).
- Every `/api/*` route plus `/sanctum/csrf-cookie`, `/storage/*`, `/.env`-style path probes.
- `docker/php/*`, `docker/nginx/*`, `docker-compose.yml`, `.dockerignore`, `.gitignore`, root `.env.example`.
- `composer`/`npm` dependency metadata and lockfiles.
- Frontend `src/` integration snapshot (cookies-only auth, XSS sinks, role guards).

### 2.2 Method

1. **Manual review** of the full backend request path (route → middleware → policy/FormRequest → controller → service → model/resource), Docker stack and env configuration.
2. **Adversarial PHPUnit suite** (`RefreshDatabase`, `Sanctum::actingAs`, factories, `Storage::fake`): role matrix, IDOR, auth bypass, mass assignment, SQLi/XSS, upload abuse, business-logic abuse, rate limits, exposure/headers.
3. **Live runtime probes** against the running seeded backend using the same cookie/CSRF flow as the SPA (PowerShell `WebRequestSession` + `curl.exe` for raw Host-header tests). Probes created a few records through the public API only; **no destructive DB command (`migrate:fresh/refresh/seed`) was ever run against the shared database instance**. The database was later migrated from MySQL to PostgreSQL 16; the same probe/test process was repeated against PostgreSQL (see Appendix C).
4. **Dependency audit** (`composer audit`, `npm audit`), lockfile/pinning review, tracked-file secret scan.
5. **Infra/Docker review** against §7/§8 of the architecture spec.
6. **Recheck** of every finding after fixes: automated tests, runtime reproduction, and inspection of the exact changed lines.

### 2.3 Out of scope / limitations

- Frontend `src/` was a moving snapshot (frontend teams rewriting concurrently). Findings there are advisory; backend enforcement is independently tested.
- Full TLS/termination, external load balancer and production DNS were not available; production control effectiveness is partly assessed by configuration review (e.g. `SESSION_SECURE_COOKIE=true`, HSTS, TrustHosts under `APP_ENV=production`).
- No browser-based DAST (ZAP/Burp) or fuzzing service was available; equivalent checks are covered by the adversarial suite and probes.
- Antivirus-hostile fixture strings in tests are assembled from fragments at runtime (see §12) so the source files stay readable while the generated bytes still hit the real validators.

---

## 3. Environment

| Component | Version / value |
|---|---|
| PHP | 8.2.12 (CLI, ZTS — local); Docker `php:8.2-fpm-alpine` |
| Laravel | 12.x (lockfile-pinned `composer.lock`, 315 KB) |
| Sanctum | 4.x (SPA cookie guard `web`) |
| Database | PostgreSQL 16 `online_mall` (seeded); PHPUnit uses SQLite `:memory:` by default and PostgreSQL via `phpunit.pgsql.xml` |
| Frontend | React 19.3, Vite 8.3.5, TypeScript ~6.0.3, axios 1.21 (cookies + `withXSRFToken`) |
| Auth model | Sanctum first-party SPA cookies, `SESSION_ENCRYPT=true`, `SESSION_DRIVER=database`, `SameSite=Lax`, sliding 120 min lifetime, session regeneration on login |
| Test env | `APP_ENV=testing`, `BCRYPT_ROUNDS=4`, `CACHE_STORE=array`, `MAIL_MAILER=array`, SQLite |
| Production image config | `APP_ENV=production`, `APP_DEBUG=false`, `expose_php=Off`, `display_errors=Off`, opcache on, `LOG_CHANNEL=stderr` |

---

## 4. OWASP Top 10 (2021) matrix

| OWASP | Control found | Verification | Findings | Verdict |
|---|---|---|---|---|
| **A01 Broken Access Control** | `role:` middleware (`EnsureRole`), per-subject policies (Order/IdDocument/Product/Store/User), every customer query scoped to `auth()->id()`, cross-user → 404, admin self/admin protection | `AccessControlMatrixTest` (9), `IdorTest` (18), `MassAssignmentTest` (12) — guest 401 / wrong-role 403 / owner allow matrix | SEC-04 (Low, fixed) | **Pass** |
| **A02 Cryptographic Failures** | bcrypt cost 12 (compose `.env`), password hashing cast, session payload encryption, private disk for ID scans, HTTPS/HSTS support | Code/config review; runtime cookie inspection (encrypted value, HttpOnly); no secrets in repo | SEC-06 (Low, fixed/accepted) | **Pass** |
| **A03 Injection** | Eloquent/parameter binding everywhere; `Rule::in` whitelists for `sort`, `status`, `category`, `date_format`; LIKE search values bound; no `DB::raw` with user input | `InjectionXssTest` (9): SQLi payloads in search/category/status/sort/login return 200/422 with no SQL errors; arrays rejected | — | **Pass** |
| **A04 Insecure Design** | Server-side order state machine (only path to status change), checkout transaction + `lockForUpdate`, DB-derived prices, stock revalidation, exactly-once stock restore, bad-record auto-ban, upload allow-list + random names | `BusinessLogicSecurityTest` (17): price/status forging ignored, oversell on last unit blocked, double checkout, forged transitions 409, auto-ban at 2, idempotent unclaimed command | SEC-03, SEC-07 (fixed) | **Pass** |
| **A05 Security Misconfiguration** | `APP_DEBUG=false` prod, security-headers middleware, nginx CSP/headers/dotfile deny, non-root workers, no published DB port, `no-new-privileges`, pinned lockfiles | `ExposureHeadersTest` (11) + runtime header/dotfile probes + Docker review (§9) | SEC-06 (fixed/accepted) | **Pass** |
| **A06 Vulnerable Components** | Lockfiles committed; Docker `composer install --no-dev`; runtime images built from pinned minor tags | `composer audit` clean; `npm audit` 0 vulnerabilities | — | **Pass** |
| **A07 Identification/Authentication** | Login 5/min keyed identifier+IP, register 10/h, forgot 5/min, contact 3/h, checkout 30/min, general API 120/min; strong password policy (min 12, mixed case, number, symbol) enforced on every set-password path; pending/rejected/removed/banned login rejected with stable codes; sessions+tokens+remember_token revoked on ban; reset tokens single-use/60-min expiry; generic auth responses | `AuthSecurityTest` (16), `RateLimitSecurityTest` (7), runtime CSRF/cookie/session-rotation probes | SEC-01, SEC-02, SEC-03, SEC-05 (fixed) | **Pass** |
| **A08 Software & Data Integrity** | JSON-only API, CSRF enforced for stateful requests (419), no unserialize of user input, uploads content-validated + randomly renamed, `X-Content-Type-Options: nosniff` | CSRF 419 runtime probe; `UploadSecurityTest` (9) polyglot/SVG/MIME/oversize/double-extension | — | **Pass** |
| **A09 Logging & Monitoring** | `audit_logs` on all privileged mutations (accounts, workers, stores, products, orders, contact messages, auth), `LOG_CHANNEL=stderr` in Docker, generic error pages | Code review; tests assert audit rows on privileged mutations; error-body probes | SEC-07 (fixed; it raised error-log noise) | **Pass** |
| **A10 SSRF / Host handling** | No outbound-URL fetch endpoints (image URL passthrough is stored/rendered only, never fetched); trusted proxies env-configurable; trusted hosts env-configurable; canonical URL forced to `APP_URL` | `UploadSecurityTest` script-scheme test; runtime Host-header probe before/after fix | SEC-01 (High, fixed) | **Pass** |

---

## 5. Findings (detail)

All severities use CVSS-style qualitative rating. Every finding below is **Fixed** unless stated; recheck evidence is in §11.

### SEC-01 — Host-header injection into password-reset links (account takeover) — **High**

- **Area:** A10/A07, authentication e-mail flows.
- **Evidence (pre-fix):** `bootstrap/app.php:35-41` enabled `TrustHosts` only when `TRUSTED_HOSTS` was set — it was not set anywhere (`docker-compose.yml`, root `.env.example`), and nginx accepts any Host (`docker/nginx/default.conf:4` `server_name _;`). Laravel generates absolute URLs from the request root, so a forged `Host:` ended up inside the reset e-mail.
- **Reproduction (pre-fix, runtime):**
  ```powershell
  curl.exe -X POST http://127.0.0.1:8000/api/auth/forgot-password `
    -H "Host: evil.attacker.test" -H "Content-Type: application/json" `
    -d '{"email":"worker@onlinemall.test"}'
  # mail log (log mailer) contained:
  # Reset Password: http://evil.attacker.test/reset-password/<token>?email=worker%40onlinemall.test
  ```
- **Impact:** attacker requests a reset for a victim e-mail with a forged Host; the victim receives a link on the attacker's domain; clicking it hands the single-use token to the attacker, who resets the victim's password (including admin accounts) on the real site — full account takeover.
- **Fix applied:** `AppServiceProvider::configureUrls()` now calls `URL::forceRootUrl(config('app.url'))` (`backend/app/Providers/AppServiceProvider.php:80-86`); `TRUSTED_HOSTS` is wired in `backend/.env`, `backend/.env.example`, root `.env.example` and `docker-compose.yml:63` (`${TRUSTED_HOSTS:-localhost,127.0.0.1}`). TrustHosts plus `forceRootUrl` are defence-in-depth; the canonical root URL is the primary control.
- **Recheck:** runtime spoofed-Host request now logs `http://localhost:8000/reset-password/...` (never the attacker host). See §11/R1.
- **Test:** `AuthSecurityTest::test_password_reset_email_is_not_poisoned_by_the_host_header`.
- **Residual note (R-03):** Laravel intentionally skips `TrustHosts` when `APP_ENV=local`; Docker runs `APP_ENV=production`, where it is enforced. Keep `TRUSTED_HOSTS` aligned with the public hostname in every deployment.

### SEC-02 — Account enumeration through reset-password errors — **Medium**

- **Area:** A07 authentication.
- **Evidence:** `app/Http/Controllers/Api/Auth/PasswordResetController.php:57-65` mapped `Password::INVALID_USER` to “We could not find an account with that email address.” and `INVALID_TOKEN` to a different message. Forgot-password was correctly generic, but the reset endpoint was an enumeration oracle (422 vs 422 body).
- **Reproduction:** `POST /api/auth/reset-password` with an invalid token for an existing e-mail returns “token is invalid or has expired”; for a non-existent e-mail returns “could not find an account…”.
- **Impact:** registered-customer enumeration (privacy/fraud-recon), contrary to §7 A07 “generic password-reset responses”.
- **Fix applied:** one generic message for every failure mode; the broker status is logged server-side only (`PasswordResetController.php:49-56`).
- **Recheck:** runtime responses for existing vs unknown e-mail are byte-identical: `422 {"message":"This password reset link is invalid or has expired.", ...}`.
- **Test:** `AuthSecurityTest::test_reset_password_does_not_reveal_account_existence`.

### SEC-03 — General API rate limit not enforced — **Medium**

- **Area:** A04/A07, anti-automation.
- **Evidence:** `AppServiceProvider.php:47-51` defined `RateLimiter::for('api')` (120/min per user/IP) but `bootstrap/app.php` never called `$middleware->throttleApi()`, so the defined limiter was dead config; scope §6.12 requires 120/min.
- **Reproduction (pre-fix):** 130 sequential `GET /api/health` → `130 × 200`, zero 429.
- **Impact:** no global anti-automation/DoS ceiling; only per-route limiters (login/register/contact/checkout) applied.
- **Fix applied:** `$middleware->throttleApi();` (`bootstrap/app.php:25`).
- **Recheck:** runtime `120` requests/minute budget observed enforced — probe showed `X-RateLimit-Limit: 120`, and requests beyond the budget returned `429` with `Retry-After` (e.g. `Retry-After=27`, `X-RateLimit-Remaining=0`); the full app suite also shows the deterministic 120→429 boundary. See §11/R3.
- **Test:** `RateLimitSecurityTest::test_general_api_ceiling_throttles_after_120_requests_per_minute`.

### SEC-04 — Profile endpoint exposed full ID-document URLs — **Low**

- **Area:** A01/A02/spec §6.14.
- **Evidence (pre-fix):** `ProfileResource.php` merged a `documents[]` array whose `IdDocumentResource` included `download_url` (and the admin listing returned `id_front_url`/`id_back_url`). Spec §5 says the profile returns only front/back booleans and §6.14 says no full ID URLs in JSON.
- **Impact:** low — the URLs were owner-/admin-authorized (policy-enforced, 404 otherwise) and never public storage paths; still unnecessary attack-surface/URL leakage.
- **Fix applied:** `ProfileResource.php:26-33` now returns only `id_documents.{id_front,id_back}` booleans. Admin account-review endpoint (`GET /api/admin/accounts/{user}/id-documents`) keeps its documented two download URLs (spec §5 admin contract) — authorized to admins only.
- **Recheck:** runtime `/api/profile` payload has no `documents[]`/`download_url`/storage path; only booleans.
- **Tests:** `ExposureHeadersTest::test_auth_and_profile_responses_never_expose_credentials`, `UploadSecurityTest::test_id_documents_are_private_renamed_and_have_no_public_url`, `IdorTest` document-access tests.

### SEC-05 — Ban/removal did not invalidate remember-me — **Low**

- **Area:** A07 session lifecycle.
- **Evidence (pre-fix):** `User::revokeSessions()` deleted `sessions` rows and Sanctum tokens only; a `remember_web_*` cookie could re-authenticate a banned account to `/api/auth/me` and `/api/profile` (role-gated routes still 403 via `EnsureRole`, so impact was limited to profile/self-read).
- **Fix applied:** `revokeSessions()` now also rotates `remember_token` (`User.php:270-276`), invoked from the `User::updated()` hook for `removed`/`banned` transitions, from explicit ban/remove flows and from password reset.
- **Recheck:** `AuthSecurityTest::test_banning_an_account_rotates_the_remember_token` passes; session rows + tokens asserted deleted on ban.
- **Tests:** `AuthSecurityTest::test_banning_an_account_deletes_its_sessions_and_api_tokens`, `::test_admin_remove_of_a_bad_record_customer_results_in_ban_and_revocation`, `::test_second_unclaimed_order_bans_the_customer_and_revokes_access`.

### SEC-06 — Session-cookie Secure guidance and mail-sink exposure — **Low (fixed / accepted)**

- **Area:** A05/A02 configuration.
- **Evidence:** `docker-compose.yml` defaulted `SESSION_SECURE_COOKIE: ${SESSION_SECURE_COOKIE:-false}` (correct for local HTTP, but a foot-gun if deployed without TLS/override); `mailpit` image was published on all host interfaces with the `latest` tag.
- **Fix applied:** mailpit UI now bound to loopback (`docker-compose.yml:172-174` `"127.0.0.1:${MAILPIT_UI_PORT:-8025}:8025"`); root `.env.example` documents “Set to true only when the app is served over HTTPS”. `SESSION_SECURE_COOKIE=false` remains the documented local default — **accepted risk R-02** with the deployment condition that any HTTPS deployment must set `SESSION_SECURE_COOKIE=true` (and terminate TLS in front of nginx).
- **Residual accepted:** `axllent/mailpit:latest` tag not digest-pinned (dev-only SMTP sink; internal compose network) — see R-06.

### SEC-07 — 500 errors from array query parameters on notifications — **Low**

- **Area:** A04/A09 input robustness.
- **Evidence (pre-fix):** `NotificationController.php:25` (`trim((string) $request->query('search',''))`) and `:113` (`strtolower(trim((string) $raw))`) received arrays for `?search[]=x` / `?category[]=x`; PHP 8.2 “Array to string conversion” is promoted to `ErrorException` by Laravel → HTTP 500 (production body generic, but error-log noise/500 churn; local dev leaked a trace).
- **Reproduction (pre-fix):** authenticated `GET /api/notifications?category[]=x` → `500 {"message":"Array to string conversion", ...}`; `?search[]=x` → 500. No auth bypass/data leak; other filters already returned 422.
- **Impact:** authenticated customer can force 500s; violates “validation errors must be 422”. Low.
- **Fix applied:** type guards — `NotificationController.php:24-26` (non-string search ignored → 200) and `:112-120` (non-string category → normal 422 validation error).
- **Recheck:** runtime `category[]=x` → `422 {"message":"The selected category is invalid."}`; `search[]=x` → `200`.
- **Test:** `InjectionXssTest::test_no_sql_errors_are_returned_for_malformed_query_values` (green post-fix).

---

## 6. Authorization matrix (verified)

`AccessControlMatrixTest` walks every protected route group; guests get JSON `401`, wrong roles `403`, owning roles proceed. Cross-user objects resolve to `404` (not `403`) to avoid enumeration (`IdorTest`).

| Endpoint group | Guest | Customer | Worker | Admin |
|---|---|---|---|---|
| Customer cart / checkout / orders / notifications | 401 | **allow** | 403 | 403 |
| Worker orders / products | 401 | 403 | **allow** | **allow** (`role:worker,admin` per §6.2) |
| Admin accounts / workers / stores / sales / contact messages | 401 | 403 | 403 | **allow** |
| `/api/profile`, `/api/auth/me`, id-doc download (owner or admin) | 401 | own only | own only | any (policy) |
| Public catalogue / contact / health | 200 | 200 | 200 | 200 |

Additional verified properties:

- Inactive accounts (`pending`/`removed`/`banned`) are blocked by `EnsureRole` even with a forged/stale session (`AccessControlMatrixTest::test_non_active_accounts_cannot_use_role_protected_endpoints_even_if_authenticated`).
- Admin cannot remove self/another admin, cannot restore an admin, cannot edit an admin through worker routes (`403` with stable codes).
- Mass assignment is impossible on every write path: `role`, `status`, `bad_records`, `customer_no`, `worker_no`, `store_id`, `email`, `id`, `created_by`, `order_number`, `payment_status`, totals and prices are ignored when client-supplied (`MassAssignmentTest`, 12 tests).
- Unauthenticated requests never hit route-model binding (no 404-vs-403 existence oracle).

## 7. Business-logic security (verified)

`BusinessLogicSecurityTest` (17 tests) proves:

- Checkout recomputes prices/totals from the DB; forged `subtotal/total/status/payment_status/items/unit_price` are ignored.
- Negative/zero/oversized quantities → 422; cart cannot exceed stock → 409 `insufficient_stock`.
- Last-unit race: two customers with the last unit in their carts → exactly one order, second checkout 409, both carts preserved on failure; stock never negative.
- Checkout is atomic: one out-of-stock line aborts the whole order with no stock decrement and cart preserved; `empty_cart`/`cart_item_invalid` are 409 codes.
- Double checkout creates exactly one order and decrements stock once.
- Customer cancellation only from `pending`; stock restored exactly once; second cancel 409; `ready`/terminal orders cannot be cancelled (409 `invalid_order_status`).
- Worker transition forging is rejected (pending→claimed/not_claimed, ready→ready/cancelled, terminal→anything → 409); claim deadline = ready_at + 3 days.
- `not_claimed` increments `bad_records`, notifies the customer, restores stock once; at 2 records the account is auto-banned and its sessions/tokens revoked.
- `orders:mark-unclaimed` marks only overdue `ready` orders, is idempotent, ignores future deadlines.
- Pending accounts cannot reach checkout/cart even with a forced session.

## 8. Upload security (verified)

`UploadSecurityTest` (9 tests) + runtime probes:

| Control | Result |
|---|---|
| SVG uploads (including renamed to `.png`) | rejected 422 for product images, avatars and registration ID docs |
| Script/PHP polyglot with genuine image header | rejected for product images (MIME allow-list); test fixture for polyglot acceptance uses the honest-fake limitation below |
| HTML/PDF mime mismatch, `.php.png`/`.phtml.png` double extensions | rejected, or stored under a random 40-char name with a raster extension only |
| Oversized (≥3 MB product image / ≥2 MB avatar) | rejected 422 |
| Randomised names | `products/<40-char random>.<png|jpg|jpeg|webp>`, ID docs `id-documents/<user>/<random>`, avatars `profile-photos/<user>/<random>` — original/double-extension names never preserved |
| Public vs private disks | ID docs only on `private`; zero files on `public`; `/storage/<private path>` unsigned → 403 (no content) even though a `local` disk signed-serve route exists; owner/admin-only download with `no-store, private` |
| JSON image URL passthrough | serializer only emits `http(s)://` or same-origin paths; `javascript:`/`data:`/`php://` strings can never become executable links |

*Note:* Laravel's `Illuminate\Http\Testing\File::getMimeType()` derives MIME from the fake filename, so the tests explicitly set the reported MIME (`.mimeType('image/svg+xml')`) to faithfully simulate real content detection; production `UploadedFile` uses content-based MIME.

## 9. Authentication, sessions and rate limits (verified)

`AuthSecurityTest` (16), `RateLimitSecurityTest` (7) + live probes:

- Pending/rejected/removed/banned login → `403` with stable codes `account_pending`, `account_rejected`, `account_removed`, `account_banned`; wrong credentials → 422 (no user-existence leak before the password check is relevant).
- Ban (manual admin remove of a bad-record customer, or second `not_claimed`) deletes DB sessions + Sanctum tokens, rotates `remember_token`.
- Password policy (min 12, mixed case, number, symbol) enforced on registration, profile change, admin-created workers and reset, and differentially tested against 5 weak variants.
- Forgot-password always 200 with identical generic payload; reset tokens single-use and expire after 60 minutes; invalid/expired/reused tokens → 422.
- Rate limiter budget verified in tests: login 5/min per login+IP (6th 429 with `Retry-After`, `X-RateLimit-Limit: 5`), forgot 5/min, register 10/h (11th 429), contact 3/h (4th 429), checkout 30/min/customer (31st 429), general API 120/min (429 beyond; runtime confirmed `X-RateLimit-Limit: 120`, `Retry-After` present).
- Runtime cookie/session checks: session cookie `HttpOnly`, `SameSite=Lax`, encrypted payload, `Secure` off only because the local probe runs over HTTP; new session ID after login (fixation mitigated); stateful POST without CSRF token → `419 CSRF token mismatch`; logout invalidates session.
- Login CSRF (cross-origin stateless POST) was probed: it returns 200 but **does not set a session cookie** (no persistent victim session), so it is not exploitable — accepted (R-10).

## 10. Sensitive-data exposure and headers (verified)

`ExposureHeadersTest` (11 tests) + runtime probes:

- No `password`, `password_hash`, `remember_token`, `password_confirmation`, ID storage paths, `storage/app` strings in any JSON response (recursive scanner over auth/profile/admin/worker/customer/public payloads; raw `$2y$` hash scan).
- Errors are JSON only, with `{"message":"Resource not found."}` / `{"message":"Unauthenticated."}`; no `exception`/`trace`/`file`/`line` in production rendering (`APP_DEBUG=false`); no SQL internals.
- Headers on API responses: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Cache-Control: no-store, private`.
- CORS: unknown origin receives no `Access-Control-Allow-Origin` (GET and preflight); configured origin is echoed with `Access-Control-Allow-Credentials: true`; wildcard `*` never used with credentials.
- `/api/health` exposes only `{status,database,time,app}`.
- Runtime path probes all return JSON 404, no content: `/.env`, `/../.env`, `/storage/../.env`, `/storage/../private/...`, `/_ignition`, `/__debug`, `/.git/config`, unknown `/api/*`.
- Direct web access to seeded private ID documents (`/storage/id-documents/...`) → **403** (signed local-serve route; `private` visibility); public uploads (`/storage/products/...`) serve correctly as images once `public/storage` symlink exists.
- ID-document downloads are `Cache-Control: no-store, private`, `Content-Disposition: inline` only for owner/admin (policy-checked, cross-user 404).

## 11. Recheck log (after fixes)

Two recheck rounds were performed: round 1 after SEC-01…SEC-06 fixes, round 2 after SEC-07 and dependency updates. Every check below was re-run by this auditor (automated tests + runtime probes).

| ID | Round | Recheck evidence | Status |
|---|---|---|---|
| SEC-01 | R1/R2 | `AuthSecurityTest::test_password_reset_email_is_not_poisoned_by_the_host_header` green; runtime spoofed-Host forgot-password now logs canonical `http://localhost:8000/reset-password/...`; `TRUSTED_HOSTS` present in compose/env examples; `forceRootUrl` in `AppServiceProvider.php:84`. TrustHosts is inactive under `APP_ENV=local` by framework design — production (`APP_ENV=production`) enforces it; primary control (`forceRootUrl`) is env-independent and verified. | **Fixed** |
| SEC-02 | R1/R2 | Runtime existing vs unknown e-mail reset responses byte-identical: `422 "This password reset link is invalid or has expired."`; generic-message code at `PasswordResetController.php:49-56`; test green. | **Fixed** |
| SEC-03 | R1/R2 | `throttleApi()` present (`bootstrap/app.php:25`); `RateLimitSecurityTest` deterministic boundary green (120×200 then 429); runtime live server returned `429` with `X-RateLimit-Limit: 120` and `Retry-After` after the budget. | **Fixed** |
| SEC-04 | R1/R2 | Runtime `/api/profile` payload contains only `id_documents.id_front/id_back` booleans, no `documents[]`, no `download_url`, no storage path; tests green. Admin id-doc endpoint retains spec-mandated URLs (admin-only, policy-checked). | **Fixed** |
| SEC-05 | R1/R2 | `revokeSessions()` rotates `remember_token` (`User.php:275`); explicit rotation test green; session/token deletion tests green. | **Fixed** |
| SEC-06 | R1 | mailpit bound to `127.0.0.1:${MAILPIT_UI_PORT}` (`docker-compose.yml:172-174`); HTTPS guidance documented in root `.env.example`; stale image tag = accepted R-06. | **Fixed / accepted** |
| SEC-07 | R2 | Runtime `?category[]=x` → `422 {"message":"The selected category is invalid."}`; `?search[]=x` → `200`; guards at `NotificationController.php:24-26,112-120`; failing test now green. | **Fixed** |

**Final re-run evidence (current HEAD):**

- `cd backend && php artisan test tests/Feature/Security` → **108 passed, 1,276 assertions**.
- `cd backend && php artisan test` → **316 passed, 2,531 assertions** (zero regressions; baseline 208 preserved).
- `scripts/smoke-test.ps1` → **34/34 checks pass** (auth/CSRF/session, catalogue, cart, checkout, cancel, worker transitions, admin reports, registration+ID upload+approval, login throttling).
- `vendor/bin/pint --test` → **PASS** (190 files).
- `composer audit` → **no advisories**. `npm audit --audit-level=low` → **0 vulnerabilities**.
- Live runtime config: `APP_ENV=local` dev server on `http://127.0.0.1:8000` seeded DB; 22 migrations; no destructive DB operations performed by the auditor.

## 12. Dependency & supply-chain audit

| Check | Result |
|---|---|
| `composer audit` (PHP) | **No security vulnerability advisories found** (`composer.lock` pinned; `laravel/framework ^12`, `laravel/sanctum ^4`, `laravel/tinker`) |
| `npm audit --audit-level=low` (frontend) | **0 vulnerabilities** at sign-off. Pre-fix state: 9 moderate, all in the dev-only lint toolchain (`minimatch` via `eslint`/`@typescript-eslint`); fixed by dependency updates. |
| Lockfiles committed | `package-lock.json` (122 KB), `backend/composer.lock` (316 KB); no floating ranges in production deps beyond caret minors |
| Docker build deps | `composer install --no-dev`, `npm ci --legacy-peer-deps` (pre-existing TypeScript peer-range conflict documented), tests/phpunit `.dockerignore`d out of runtime images |
| TypeScript pin | `typescript ~6.0.3` — `typescript-eslint` cannot load TypeScript 7 (pre-existing upstream incompatibility); documented, does not affect runtime security |
| Committed secrets scan | No tracked `.env`, private keys, API tokens, AWS keys or `sk_live_` strings. `.env` ignored in root and backend `.gitignore`; `.dockerignore` excludes `.env`/storage/vendor. Only intentional **demo seed credentials** appear in `README.md` + `docs/BACKEND_ARCHITECTURE.md` (accepted R-04). |
| Supply-chain notes | Docker base tags are minor-pinned (`postgres:16-alpine`, `nginx:1.27-alpine`, `node:22-alpine`, `php:8.2-fpm-alpine`, `composer:2`); `axllent/mailpit:latest` unpinned (dev-only, R-06). Recommend digest pinning for production. |

## 13. Docker / infrastructure review

| Check | Finding | Verdict |
|---|---|---|
| Runtime user | php-fpm image has no `USER`; FPM master runs as root and workers drop to `www-data` (standard php-fpm); queue/scheduler exec as `www-data` (`entrypoint.sh:77`); `no-new-privileges:true` on all services | Accepted R-07 |
| Dev packages in image | Composer `--no-dev`, `--no-scripts`, optimized autoload; `backend/tests`, phpunit, docs excluded via `.dockerignore` | Pass |
| OPCache | `opcache.enable=1`, memory 192MB, `validate_timestamps=0` (prod image) | Pass |
| Healthchecks | app: PHP TCP probe on 9000; web: `/healthz` via wget; db: `pg_isready` | Pass |
| Database exposure | `db` service has **no published port**; only internal `onlinemall` bridge network; named `db_data` volume; root/app passwords required via `${VAR:?}` | Pass |
| Secrets management | `APP_KEY`/`DB_PASSWORD`/`DB_ROOT_PASSWORD` mandatory in compose; env-driven config; no secrets baked into images | Pass |
| Storage perms | Named `app_storage` volume; entrypoint `chown -R www-data`; web mounts read-only; storage:link created; `public/storage` symlink present locally | Pass |
| nginx headers | CSP (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`), `X-Content-Type-Options`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, HSTS, `server_tokens off` | Pass |
| nginx exposure | Dotfile/`.map`/`.log`/`.sql`/`.env` locations `deny all`; only raster image types static; `/storage/` aliases `storage/app/public`; no PHP handler over upload paths | Pass |
| Upload limits | `client_max_body_size 12m` matches `post_max_size=12M`; `upload_max_filesize=10M` ≥ 5 MB ID limit; registration can approach the 12 MB multipart ceiling (2×5 MB IDs + 2 MB avatar + fields) — minor operational note, not a weakness | Pass (note) |
| Proxy timeouts | `fastcgi_read_timeout 60s`, `client_body_timeout 60s` | Pass |
| Prod debug/config | `APP_DEBUG=false`, `APP_ENV=production`, `LOG_CHANNEL=stderr`, PHP `expose_php=Off`, `display_errors=Off` | Pass |
| Session hardening | `SESSION_ENCRYPT=true`, `SESSION_DRIVER=database`, lifetime 120, `SameSite=lax`, HttpOnly; `SESSION_SECURE_COOKIE` env-driven (must be true on HTTPS — R-02) | Pass w/ condition |
| CORS / Sanctum envs | `CORS_ALLOWED_ORIGINS` and `SANCTUM_STATEFUL_DOMAINS` env allow-lists; no wildcard with credentials | Pass |
| Trusted hosts/proxies | `TRUSTED_HOSTS` wired (SEC-01), `TRUSTED_PROXIES=127.0.0.1,172.16.0.0/12`; note nginx does not currently forward `X-Forwarded-For` to FPM, so REMOTE_ADDR remains the real client IP under this topology | Pass (R-11) |
| PHP ini | `expose_php=Off`, `display_errors=Off`, `log_errors=On` to stderr, `post_max_size=12M`, `upload_max_filesize=10M`, session strict mode/cookie httponly, assertions off, 256 MB memory, 60 s max execution | Pass |
| Mailpit | Bound to `127.0.0.1` (fixed); `latest` tag + internal SMTP sink reachable to app containers; dev-only; spec suggested a dev profile, currently always on | Accepted R-06 |
| Entrypoint | Waits for DB, runs `migrate --force`, warms caches as `www-data`; acceptable for single-instance deploy, avoid multi-replica concurrent migrations | Pass (note) |

**Local-dev-only observations (not production findings):** `php artisan serve` reflects `APP_DEBUG=true` (stack traces on debug endpoints) and PHP's own `X-Powered-By: PHP/8.2.12` header; the Docker image disables both (`APP_DEBUG=false`, `expose_php=Off`). Never expose a dev server publicly.

## 14. Frontend integration review (snapshot)

Frontend teams were actively finishing the rewire during this audit; this is a point-in-time snapshot. `src/` was **not modified**.

| Check | Result |
|---|---|
| Tokens in `localStorage`/`sessionStorage` | **None** (the only match is a comment in `src/lib/api.ts:5` stating cookies-only). Auth is Sanctum SPA cookie session. |
| Cookie usage | `axios` instance `withCredentials: true`, `withXSRFToken: true` (`src/lib/api.ts:149-150`); `GET /sanctum/csrf-cookie` before state-changing calls (`src/lib/api.ts:163`) and 419 retry handling. |
| XSS sinks | **No** `dangerouslySetInnerHTML`, `eval(`, `new Function(`, `innerHTML`, `document.write` in `src/`. React renders API strings escaped by default; API responses are JSON. |
| Sensitive logging | **No** `console.log/debug/info`; no credentials/tokens logged. |
| Role guards | `RequireRole`/`GuestOnly` in `src/main.tsx:67-83` route by `user.role`; **UX only** — every protected endpoint is independently enforced server-side (verified by the 108-test matrix). |
| Sensitive data in UI/URLs | Profile shows ID-document upload *booleans* only (SEC-04 fix); no ID URLs rendered to customers; no tokens in URLs. |
| CSP compatibility | nginx CSP allows `'self'` scripts/styles inline (Tailwind), images from self/unsplash/placeholder, Google Maps frames for contact page. |
| Residual advisory | Re-run the `localStorage|dangerouslySetInnerHTML|eval` grep at release time since the snapshot may change. |

## 15. Test inventory (`backend/tests/Feature/Security/`)

| File | Tests | Focus |
|---|---|---|
| `AccessControlMatrixTest.php` | 9 | Guest 401 / role 403 / allow matrix over 44 protected endpoints; inactive-account and binding-oracle checks |
| `IdorTest.php` | 18 | Cross-user order/cart-item/notification/ID-doc/profile, order-list scoping, worker/customer boundary, admin order access |
| `AuthSecurityTest.php` | 16 | Inactive login codes, ban revocation (sessions/tokens/remember_token), password policy everywhere, forgot/reset generic + single-use/expiry, Host-header e-mail poisoning (SEC-01), enumeration (SEC-02) |
| `InjectionXssTest.php` | 9 | SQLi payloads in search/filter/sort/status/login, sort whitelists, stored/reflected XSS JSON-only contract, malformed array params (SEC-07) |
| `UploadSecurityTest.php` | 9 | SVG/polyglot/MIME/oversize/double-extension rejection, random naming, private ID docs, JSON URL scheme neutralisation, 3-image cap |
| `BusinessLogicSecurityTest.php` | 17 | Price/status forging, quantities, oversell race, atomic checkout, double checkout, cancel/transition rules, claim deadline, bad-record auto-ban, unclaimed command idempotency, admin self/admin protection |
| `RateLimitSecurityTest.php` | 7 | login/forgot/contact/register/checkout/general-API limits, 429 headers (`Retry-After`, `X-RateLimit-*`) |
| `ExposureHeadersTest.php` | 11 | Secret/path scan across payloads, JSON errors w/o trace, headers, CORS allow-list, cookie config, JSON content types, non-cacheable ID downloads |
| `MassAssignmentTest.php` | 12 | Role/status/account-number/ownership/price/created_by escalation attempts on register, profile, admin worker CRUD, checkout, cancel, contact, stores, products, approvals |
| `SecurityTestSupport.php` | — | Shared helpers (factories, fakes, session/token helpers, recursive secret scanner; malicious fixture bytes assembled at runtime) |
| **Total** | **108 tests / 1,276 assertions** | |

Commands:

```powershell
cd backend; php artisan test tests/Feature/Security   # 108 passed
cd backend; php artisan test                          # 316 passed (2,531 assertions)
pwsh -File scripts/smoke-test.ps1                     # 34/34
cd backend; vendor/bin/pint --test                    # PASS
cd backend; composer audit                            # no advisories
npm audit --audit-level=low                           # 0 vulnerabilities
```

## 16. Accepted risks / residual risks (with owner sign-off)

| ID | Risk | Rationale / justification | Condition / recommendation |
|---|---|---|---|
| R-01 | Local dev only: `APP_DEBUG=true` stack traces + `X-Powered-By` from `php artisan serve` | Docker sets `APP_DEBUG=false` and `expose_php=Off`; traces are useful locally | Never expose the dev server outside loopback; keep prod config as reviewed |
| R-02 | `SESSION_SECURE_COOKIE=false` default (compose/env example) | Local stack runs over HTTP; Secure cookies break local browser flows | **Mandatory:** set `SESSION_SECURE_COOKIE=true` for any HTTPS deployment; TLS termination in front of nginx (HSTS header already emitted) |
| R-03 | Laravel skips `TrustHosts` when `APP_ENV=local` | Framework design; `forceRootUrl(APP_URL)` was added as the env-independent primary control and verified | Keep `APP_URL`/`TRUSTED_HOSTS` correct per environment; Docker `APP_ENV=production` enforces TrustHosts |
| R-04 | Demo credentials published in README/spec (`admin@onlinemall.test` etc.) | Intentional seeded demo accounts for the deliverable | Before any real deployment: reseed/rotate, never publish these accounts |
| R-05 | `/storage/` static location lacks `nosniff`/CSP headers | Serves only validated raster images (unknown extensions are `deny`d); no PHP handler | Optionally add the security-headers snippet to `/storage/`; keep upload allow-list |
| R-06 | `axllent/mailpit:latest` unpinned, mailpit UI/SMTP runs by default | Dev-only mail sink; UI now loopback-bound; app→SMTP on internal network | Pin a digest/version; drop mailpit service (or use a dev profile) in production compose |
| R-07 | php-fpm master runs as root | Standard `php:8.2-fpm-alpine` behaviour; workers `www-data`; FPM port not published; `no-new-privileges` | Optionally run a non-root FPM master variant; keep port private |
| R-08 | nginx `server_name _` accepts any Host | TrustHosts + forced root URL are the application controls (SEC-01 fixed) | Defence-in-depth: pin `server_name` to the deployment host and add a default-server `return 444` |
| R-09 | Predictable order numbers (`OM-YYYY-NNNNNN`) | Not an authorization token; order access is owner/staff-scoped (cross-user → 404, verified) | No action required; do not use the number as an access secret |
| R-10 | Cross-site stateless login POST returns 200 but sets no session cookie | CSRF is enforced for stateful requests (419 verified); `SameSite=Lax`; no persistent login-CSRF effect observed | Keep Sanctum stateful/CORS allow-lists; consider rejecting non-stateful login requests if defensive hardening is desired |
| R-11 | Rate limits are IP-based behind a proxy | nginx passes the real client IP as `REMOTE_ADDR` in this topology; behind an external LB, `X-Forwarded-For` is not forwarded by the current nginx config | If a TLS/LB terminator is added, configure `fastcgi_param HTTP_X_FORWARDED_FOR` + `TRUSTED_PROXIES` |
| R-12 | Shared-IP/NAT rate limits (contact 3/h, register 10/h) can affect demo/office networks | Spec-mandated limits; login limiter is per login+IP | Document for demo operators; use unique demo e-mails when re-running smoke tests |

## 17. Verdict

**PASS with deployment conditions.** The authorization model, IDOR isolation, state machine, checkout integrity, upload handling, session/CSRF design, error handling and dependency posture are sound and now covered by a 108-test adversarial regression suite that is green. The single High-severity issue (SEC-01 Host-header poisoning of reset links) was fixed and re-verified end-to-end; all Medium/Low findings are fixed except the explicitly accepted local-development defaults (R-01/R-02/R-03) and third-party/dev-only items (R-06/R-07/R-08/R-11/R-12).

**Conditions for production release**

1. Serve over HTTPS and set `SESSION_SECURE_COOKIE=true`; keep HSTS.
2. Set `APP_ENV=production`, `APP_DEBUG=false`, and per-deployment `APP_URL`/`TRUSTED_HOSTS`/`SANCTUM_STATEFUL_DOMAINS`/`CORS_ALLOWED_ORIGINS`.
3. Reseed/rotate demo accounts and demo data before any public exposure (R-04).
4. Pin Docker image digests (mailpit especially) and remove the mailpit service from production.
5. Re-run the frontend XSS/token grep at release time (snapshot caveat) and keep cookie/CSRF flow intact.

**Auditor sign-off:** `qa-security`, 2026-11-20. Recheck performed against current working tree; no application source modified by the auditor.

---

### Appendix A — Key security controls (evidence index)

| Control | Location |
|---|---|
| Role/status gate | `backend/app/Http/Middleware/EnsureRole.php:17-40` (`401` guest, `403` inactive/wrong role) |
| Security headers | `backend/app/Http/Middleware/SecurityHeaders.php:19-36`; `docker/nginx/security-headers.conf:5-15` |
| Customer scoping / 404 IDOR | `app/Http/Controllers/Api/{Order,Cart,Notification}Controller.php`; `app/Policies/OrderPolicy.php` |
| Private ID docs | `app/Http/Controllers/Api/ProfileController.php:72-92`, `app/Policies/IdDocumentPolicy.php:13-20`, `config/filesystems.php:40-46` |
| Checkout integrity | `app/Services/CheckoutService.php:33-161` (`lockForUpdate`, DB prices, stock revalidation) |
| Order state machine | `app/Services/OrderStatusService.php:39-106`; `app/Enums/OrderStatus.php` |
| Bad-record auto-ban + revocation | `app/Services/OrderStatusService.php:145-198`; `app/Models/User.php:108-122,262-276` |
| Auth/login/logout | `app/Http/Controllers/Api/Auth/AuthController.php`; `app/Http/Requests/Auth/LoginRequest.php` |
| Password policy | `app/Providers/AppServiceProvider.php:31-42` (min 12, mixed case, digits, symbols) |
| Rate limiters | `app/Providers/AppServiceProvider.php:44-77`; `bootstrap/app.php:25` |
| Canonical URL / TrustHosts | `app/Providers/AppServiceProvider.php:78-90`; `bootstrap/app.php:39-44`; `docker-compose.yml:63` |
| Upload validation | `app/Http/Requests/Auth/RegisterRequest.php:63-66`, `Profile/UpdateAvatarRequest.php:19-22`, `Catalog/ValidatesCatalogImages.php`, `Store/CreateStoreRequest.php:33`, `Product/CreateProductRequest.php:73-75` |
| Audit logging | `app/Support/AuditLogger.php`; callers in admin/worker services/controllers |
| Docker hardening | `docker/php/Dockerfile`, `docker/php/php.ini`, `docker/nginx/default.conf`, `docker/php/entrypoint.sh`, `docker-compose.yml` |

---

### Appendix B — Addendum: cross-origin deployment (cPanel API + Vercel SPA)

The split-origin deployment added after the initial audit was reviewed against the same
threat model. **No open findings.**

| Area | Control / verification |
|---|---|
| Bearer tokens | `POST /api/auth/token` issues Sanctum personal access tokens; only the SHA-256 hash is stored (`personal_access_tokens.token`), plaintext is returned once. Role-scoped abilities; TTL from `SANCTUM_EXPIRATION`; revoked on logout (`PersonalAccessToken::delete`) and on remove/ban (`User::revokeSessions()`); pending/rejected/removed/banned accounts are refused before any token is issued. Covered by `tests/Feature/Auth/TokenAuthTest.php` (9 tests). |
| Session/cookie mode unchanged | Token logout no longer breaks cookie logout (unconditional web-guard logout + conditional session invalidation); full pre-existing suite green (337 tests). |
| CORS | Explicit origin allow-list (`CORS_ALLOWED_ORIGINS`), optional delimited PCRE patterns for previews, no wildcard with credentials, `supports_credentials` env-driven (`false` for token deployments), exposed `Retry-After`/`X-RateLimit-*`. Vercel origin must not be in `SANCTUM_STATEFUL_DOMAINS`, so cross-origin requests stay stateless and CSRF is not applicable. Covered by `tests/Feature/CorsTest.php` (allow, disallow, patterns, preflight). |
| Host/scheme | `URL::forceRootUrl(APP_URL)` already prevented Host-header link poisoning; cPanel `APP_URL` includes the subdirectory and `TRUSTED_HOSTS` enforces the public domain in production. |
| Storage/media route | New public `/storage/{path}` route (needed where no `public/storage` symlink exists) whitelists image extensions, rejects NUL/`..` and non-image files, resolves realpath under the public-disk root, sets `nosniff` + inline + cache headers. Covered by `tests/Feature/MediaRouteTest.php`. Private ID scans remain on the private disk, streamed only to owner/admin. |
| ID-scan preview in SPA | `<img>` cannot send a Bearer token, so the admin modal downloads scans through the authenticated axios client as blobs (object URLs revoked on unmount); unauthenticated fetch returns 401 (runtime-verified). |
| Admin provisioning | `user:create-admin` artisan command uses the global strong-password policy, never prints a stored password twice, and is safe for production (no demo seeding required). Tests in `tests/Feature/Console/CreateAdminCommandTest.php`. |
| Frontend token storage | Token in `sessionStorage` (or `localStorage` only with “Remember me”), never in cookies; Vercel CSP `script-src 'self'` (no inline scripts) limits XSS surface; `VITE_AUTH_MODE=token` is opt-in per build. |
| Deployment files | cPanel shim validates the app path and fails closed with a generic 500; `.htaccess` forwards `Authorization` to PHP-FPM (missing header would break auth), denies dotfiles/backups, disables indexes. `vercel.json` adds SPA rewrites + security headers (CSP, nosniff, frame-deny, referrer, permissions policy). |

---

### Appendix C — Database platform migration: MySQL → PostgreSQL 16

The application database was moved from MySQL 8.4 to **PostgreSQL 16**. This appendix
records the change and its verification; it does not alter the findings above.

**Changes**

| Area | Change |
|---|---|
| Docker | `db` service is now `postgres:16-alpine` (volume at `/var/lib/postgresql/data`), credentials via `POSTGRES_DB/USER/PASSWORD`, healthcheck `pg_isready`, no DB port published. |
| PHP image | `pdo_pgsql` + `pgsql` installed (`postgresql-dev` build deps, `libpq` runtime), `pdo_mysql` removed. |
| Entrypoint | waits for the PostgreSQL DSN (`pgsql:host=…`), still refuses to start without `APP_KEY`, runs `migrate --force` and warms caches. |
| Config | `config/database.php` pgsql defaults the application; `search_path` and `sslmode` are env-driven (`DB_SEARCH_PATH`, `DB_SSLMODE`). |
| Portability | 8 `enum` columns compile to `varchar + CHECK` on PG; `json` metadata stays `json`; all search scopes now use `whereLike()/orWhereLike()` so PostgreSQL compiles `ILIKE` (plain `LIKE` is case-sensitive on PG). No raw MySQL SQL, no `GROUP BY` strictness issues; `lockForUpdate()`, `increment()` and prepared statements behave identically. |
| Tests / CI | Fast suite remains SQLite `:memory:`; `phpunit.pgsql.xml` + `scripts/test-pgsql.ps1` run the entire suite on PostgreSQL; CI starts a `postgres:16` service and runs both suites. |

**Verification (performed against a local PostgreSQL 16.6 server)**

| Check | Result |
|---|---|
| `migrate:fresh --seed` from an empty PostgreSQL database | PASS — 26 tables; seeded 11 users, 12 products, 13 orders, 21 notifications |
| Full PHPUnit suite on PostgreSQL (`phpunit.pgsql.xml`) | **337 passed / 2,616 assertions** |
| Full PHPUnit suite on SQLite (default) | **337 passed / 2,616 assertions** |
| Two-build orchestration (`scripts/test-e2e.ps1`) on PostgreSQL | **16/16 checks** — SQLite suite, PostgreSQL suite, both frontend builds, cookie-mode browser suite 6/6, Bearer+CORS browser suite 6/6, Docker static validation |
| Cookie-auth API smoke (`scripts/smoke-test.ps1`) | **34/34** |
| Token/CORS API smoke (`scripts/smoke-test-token.ps1`) | **13/13** |
| Static Docker configuration (`scripts/validate-docker-config.py`) | **46/46** (live image build still deferred to a Docker host/CI) |
| Packaged cPanel artifact (`dist-deploy/cpanel/omc-backend.zip`) | PASS — boots (Laravel 12.73), connects to PostgreSQL 16.6 (`db:show`, 26 tables), `migrate:status` all ran, 58 API routes, `config:cache` OK |

**Security notes**

- Parameter binding is unchanged; no SQL string concatenation was introduced by the port.
- Database credentials remain environment-only (`.env` git-ignored / excluded from images);
  the app user owns only its database and no DB port is published by the compose stack.
- For remote/managed PostgreSQL set `DB_SSLMODE=require`; local Docker/localhost may use
  `prefer`/`disable`.
- cPanel plans frequently do **not** provide PostgreSQL; use a managed instance and keep
  `DB_SSLMODE=require` (documented in `docs/DEPLOYMENT-CPANEL-VERCEL.md`).

**Residual / conditions**

- Live Docker image build + stack start were not executable in this environment (no Docker
  engine); compose/nginx/php configs are validated statically and CI builds the stack.
- The portable PostgreSQL 16.6 binaries used for local verification live under `.tools/`
  (git-ignored); production uses the `postgres:16-alpine` container or a managed instance.

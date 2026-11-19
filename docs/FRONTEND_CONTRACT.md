# Online Mall Cordova — Frontend Data Contract Dossier

**Purpose.** This document is the implementation contract for the Laravel + database backend that will replace the
React/TypeScript frontend's hardcoded mock data. It was produced by exhaustively reading every source file under
`src/` (79 `.tsx` + 2 `.ts`, 12,119 lines; plus `src/styles/global.css`, 1 line). Every field, enum value, example
value, label and formatting assumption below is transcribed from the current UI, with `file:line` references so the
backend can be implemented and the frontend rewired directly from this spec.

**Status of frontend today.** The app is a pure UI prototype: there is **no API layer** (`src/lib/axios.ts` exists but is
**0 bytes**), no auth context, no route guards, and all mutations are local `useState` updates, `alert()`s, `console.log`s
or toasts. Everything is mock data. See §6 for the complete gap list.

> **AUTHORITY NOTE (added after this dossier was drafted).** The Lead's
> [`docs/BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md) is the **authoritative** backend/API spec — it fixes
> snake_case JSON, `/api/*` (no `/v1`) routes, Sanctum SPA cookie auth, decimal-peso money, integer ids with
> `customer_no`/`worker_no`/`order_number` strings, and snake_case enum keys (`pending`, `ready`, `not_claimed`, …).
> Sections 1–6 of this document remain the authoritative record of **what the UI needs** (fields, values, actions,
> gaps, formatting assumptions). §7 below is the frontend-facing *recommendation*; **§9 is the binding reconciliation
> table** between it, the Lead's architecture doc, and the React rewiring (field/status/id/route mappings). Where §5 or
> §7 appears to contradict `BACKEND_ARCHITECTURE.md`, §9 wins.

**Conventions used in this document**

- `file:line` = path relative to repo root, 1-based line numbers as of the read of this repo.
- **camelCase** = the JSON key spelling the current UI code already uses (`dateOrdered`, `totalPrice`, `stockCount`…).
  The API will return **snake_case**; the mapping lives in `src/lib/api.ts` + `src/lib/types.ts` — see §9.2.
- "UI type" = the TypeScript type actually declared/used by the components (not the DB type we recommend).
- ₱ = U+20B1 PESO SIGN. The UI renders it in two different ways (§5.1).
- “→” in tables means "screen/component".

---

## 0. Source inventory (what was read)

| Area | Files | Notes |
|---|---|---|
| Entry / routing | `src/main.tsx` (96 L) | BrowserRouter, 4 layouts, 24 routes, **no `/logout`, no `/terms`, no `/privacy`, no 404** |
| Libraries | `src/lib/cn.ts` (6 L), `src/lib/axios.ts` (**0 L, empty**) | No HTTP client exists |
| Shared UI | `src/components/ui/*` (18 files) | `button`, 5 cards, 6 modals, 3 form/ID modals, 2 modal forms |
| Headers/footer/layouts | `src/components/common/*` (5), `src/components/features/*/*Layout.tsx` (4) | Role-specific chrome; cart badge absent |
| Guest pages | `src/pages/guest/*` (10) + `src/components/features/guest/**` (14) | Login, Register, ForgotPassword, Home, About, Products, SingleProduct, Stores, SingleStore, ContactUs |
| Customer pages | `src/pages/customer/*` (10) + `src/components/features/customer/**` (14) | Home, About, Products, SingleProduct, Stores, SingleStore, Notifications, ContactUs, Profile, Cart |
| Worker pages | `src/pages/worker/*` (2) + 1 layout/header | Orders.tsx (441 L — the richest order model), WorkerProducts.tsx (375 L) |
| Admin pages | `src/pages/admin/*` (3) | AccountsDashboard.tsx (433 L — the account model), StoreDashboard.tsx (381 L), Sales.tsx (310 L) |
| Assets / CSS | `src/assets/logo.webp`, `src/assets/bg-img1.webp`, `src/styles/global.css` (`@import "tailwindcss"`) | No design tokens |

**Duplicate tree warning.** 14 component files in `src/components/features/customer/**` are **byte-identical** to their
`src/components/features/guest/**` counterparts (verified by SHA-256): all `home/**` (4), `products/**` (2), `stores/**`
(2), `about/**` (2), `contact-us/**` (3). `src/pages/customer/SingleProduct.tsx` and `src/pages/customer/SingleStore.tsx`
differ from the guest versions only in the exported function name. Consequence: all customer-side catalog data/behavior
below also describes the guest side and vice-versa. When rewiring, both trees need the same API calls.

**Route table (from `src/main.tsx:50-92`)**

| Path | Page | Role in URL space | Auth used today |
|---|---|---|---|
| `/guest/` | `pages/guest/Home` | guest | none |
| `/guest/products` | guest Products | guest | none |
| `/guest/products/:id` | guest SingleProduct | guest | none |
| `/guest/stores` | guest Stores | guest | none |
| `/guest/stores/:id` | guest SingleStore | guest | none |
| `/guest/about`, `/guest/contact` | guest About/Contact | guest | none |
| `/login`, `/register`, `/forgot-password` | auth pages (mounted **inside GuestLayout**) | guest | none |
| `/` | customer Home | customer | **none (unguarded)** |
| `/products`, `/products/:id` | customer Products/SingleProduct | customer | none |
| `/stores`, `/stores/:id` | customer Stores/SingleStore | customer | none |
| `/notifications` | customer Notifications | customer | none |
| `/about`, `/contact`, `/profile`, `/cart` | customer pages | customer | none |
| `/worker/orders`, `/worker/products` | worker pages | worker | **none (unguarded)** |
| `/admin/accounts`, `/admin/stores`, `/admin/sales` | admin pages | admin | **none (unguarded)** |

Note: `/products/:id` and `/stores/:id` are **id-shaped routes**, but every link in the UI uses a **slug** in a `path`
field (`/products/wireless-earbuds`, `/stores/mcdonalds`) — see §5.4.

---

## 1. Actors, authentication & account lifecycle

### 1.1 Actors

| Actor | Chrome / landing | Evidence |
|---|---|---|
| **Guest** (unauthenticated) | `GuestHeader` with Home, Products, Stores, About, Contact Us; Login (gold) + Register (white) buttons; “Search…” bar (non-functional) | `src/components/common/GuestHeader.tsx:49-55`, `:103-117`, mobile drawer `:196-209` |
| **Customer** (logged in, approved) | `CustomerHeader` with Home, Products, Stores, **Notifications**, About, Contact Us; Profile (gold) + **Logout** (white) buttons; cart icon; search bar (non-functional) | `src/components/common/CustomerHeader.tsx:51-58`, `:106-120`, `:135-141`, drawer `:209-220` |
| **Worker** (mall staff) | `WorkerHeader` with **Orders**, **Products**; Logout; logo text “Gaisano Grand / Cordova” | `src/components/common/WorkerHeader.tsx:44-47`, `:61-75`, `:80-88` |
| **Admin** | `AdminHeader` with **Accounts Dashboard**, **Stores Dashboard**, **Sales**; “Welcome Back Admin” title; Logout | `src/components/common/AdminHeader.tsx:45-49`, `:80-84`, `:86-94` |

**Not present:** any admin/worker login screen, role switcher, landing redirect by role, or profile page for worker/admin.
`/logout` is linked from all four headers (`AdminHeader.tsx:88,173`, `CustomerHeader.tsx:114,215`,
`WorkerHeader.tsx:82,167`) but **no `/logout` route exists** (`src/main.tsx:50-92`) → dead links.

### 1.2 Login

Screen: `src/pages/guest/Login.tsx` (route `/login`, `main.tsx:60`).

| UI element | Field name in state | Label / placeholder | Evidence |
|---|---|---|---|
| Identity input | `emailOrPhone` (string, `""`) | placeholder **“Email or Phone Number”**, `type="text"`, `required` | `Login.tsx:18`, `:145-153` |
| Password input | `password` (string) | placeholder “Password”, `type=password` toggled | `Login.tsx:19`, `:160-174` |
| Show/hide toggle | `showPassword` (bool) | Eye/EyeOff icon | `Login.tsx:20`, `:168-174` |
| Remember me | `rememberMe` (bool, **default `true`**) | label **“Remember me”** | `Login.tsx:21`, `:179-187` |
| Forgot password link | — | “Forgot Password?” → `/forgot-password` | `Login.tsx:188-190` |
| Submit | `handleLogin` | button **“Log In”** (`variant="gold"`, uppercase tracking) | `Login.tsx:23-27`, `:194-203` |
| Register callout | — | “Don't have an account? **Register now**” → `/register` | `Login.tsx:208-213` |

Submit body the UI currently logs: `{ emailOrPhone, password, rememberMe }` — `Login.tsx:26`. **No request is made.**
There is no role selector: one login endpoint must infer role (customer/worker/admin) and the client must redirect.

### 1.3 Registration (customer self-signup → pending approval)

Screen: `src/pages/guest/Register.tsx` (route `/register`, `main.tsx:61`). Form is a single scrollable card
(`max-h-[380px]`, `Register.tsx:180`).

| # | Field (state key) | UI type | Required | Placeholder / label | Extra hints | Evidence |
|---|---|---|---|---|---|---|
| 0 | Profile picture | n/a — **not wired** | (visual only) | **“Insert Profile Picture”** / “Click avatar to upload image” | Camera icon overlay; **no file input, no state** | `Register.tsx:182-194` |
| 1 | `fullName` | string | yes | “Full name” | — | `Register.tsx:24`, `:203-210` |
| 2 | `email` | string (`type=email`) | yes | “Email address” | — | `Register.tsx:25`, `:218-225` |
| 3 | `phoneNumber` | string (`type=tel`) | yes | “Phone Number” | — | `Register.tsx:26`, `:233-240` |
| 4 | `address` | string | yes | “Address” | — | `Register.tsx:27`, `:248-255` |
| 5 | `birthday` | string (text→date on focus) | yes | **“Birthday mm/dd/yy (Must be 18+)”** | hint line “*Must be 18 years or older to register.” | `Register.tsx:28`, `:264-277` |
| 6 | `idOne` | `File \| null` (`accept="image/png, image/jpeg"`) | yes | suffix label **“ID 1 (PNG/JPG)”** | 1st government ID upload | `Register.tsx:34`, `:285-297` |
| 7 | `idTwo` | `File \| null` (`accept="image/png, image/jpeg"`) | yes | suffix label **“ID 2 (PNG/JPG)”** | 2nd government ID upload | `Register.tsx:35`, `:300-316` |
| 8 | `password` | string | yes | “Password” + eye toggle | — | `Register.tsx:29`, `:319-338` |
| 9 | `confirmPassword` | string | yes | “Confirm Password” + eye toggle | — | `Register.tsx:30`, `:340-360` |
| 10 | `agreeTerms` | bool, **default `true`** | yes (checkbox `required`) | “Agree to the **Terms of Service** & **Privacy Policy**” | links to `/terms`, `/privacy` — **routes do not exist** | `Register.tsx:39`, `:363-378`, links `:374-375` |
| 11 | submit | — | — | button **“Sign Up Now”**, `form="register-form"` | outside the scroll area | `Register.tsx:385-393` |

Client-side validation currently implemented (`Register.tsx:41-67`):
- 18+ rule: computes age from `new Date(formData.birthday)`; if `age < 18` → `alert("You must be at least 18 years old to register.")` and abort (`:44-58`).
- Password confirmation mismatch → `alert("Passwords do not match!")` (`:60-63`).
- On success: `console.log("Registering account with:", {...formData, idOne, idTwo, agreeTerms})` then
  `alert("Registration submitted successfully!")` (`:65-66`). No navigation, no pending screen.
- Hero copy typo: **“Joint the mall family.”** (`Register.tsx:103`), sub-copy “Sign up to access exclusive member
  features (18+ only) & faster checkouts.” (`:174-176`).

### 1.4 Pending-approval flow (customer becomes active only after staff review)

- Policy text shown to users: *“Mall workers will review your submission before activating your account.”* — FAQ
  “Why do I need to provide 2 valid IDs and a photo to register?”, `src/components/features/guest/contact-us/contact-us-section2.tsx:27-30`.
- Admin UI: **Pending Accounts** tab lists submissions with `Name, Birthday, Gender, Address, Phone Number, Email`, a
  132×144 profile image, and three actions: **Accept** (gold), **View ID** (primary), **Reject** (white)
  (`src/pages/admin/AccountsDashboard.tsx:282-315`).
  - Accept moves the record into Customer Accounts and mints `customerId: String(Date.now())`, `badRecords: 0`
    (`AccountsDashboard.tsx:96-104`).
  - Reject deletes it from the pending list, no confirmation dialog (`:106-108`).
- **View ID** opens `ViewIdModal` showing “Valid ID 1 (Front/Back)” and “Valid ID 2 (Front/Back)”
  (`src/components/ui/ViewIdModal.tsx:26,44,56`). The modal accepts `idOneUrl`/`idTwoUrl`, but `AccountsDashboard`
  passes **only `accountName`** (`:161-165`) so the modal always shows two stock Unsplash images as fallbacks
  (`ViewIdModal.tsx:47`, `:59`). → backend must return signed URLs for both IDs and the caller must pass them.
- No “pending” notification/email to the customer exists in the UI; no polling/refresh.

### 1.5 Forgot password

Screen: `src/pages/guest/ForgotPassword.tsx` (route `/forgot-password`, `main.tsx:62`).

| Element | Detail | Evidence |
|---|---|---|
| Input | `emailOrPhone`, placeholder **“Email or Phone Number”**, `type="text"` | `ForgotPassword.tsx:16`, `:155-162` |
| Copy | “Enter the email address associated with your account, and we'll send you a verification code to reset your password.” | `:128-130` |
| Submit | `handleSubmit` only sets `isSubmitted = true`; button label is lowercase **“send code”** | `:19-22`, `:166-175` |
| Success state | “**Verification Code Sent!**” + “Please check your inbox or phone messages for instructions to reset your password.” + “Try another email or phone number” reset link | `:133-146` |
| Footer | “Remember your password? **Login here**” | `:181-186` |

There is **no OTP entry screen, no reset-password screen, no resend timer, no code-expiry copy**. The backend must add
these; the frontend will need new routes/screens.

### 1.6 Remembered sessions

- `rememberMe` defaults to `true` (`Login.tsx:21`) and is submitted with the login payload (`:26`), but nothing is
  persisted (no localStorage/cookie/interceptor). The backend should translate it into a long-lived token/session
  (e.g. Sanctum token with 30-day expiry) vs. a short session when unchecked.
- Headers show Logout as a plain link to `/logout`; no token/session is stored client-side yet.
- No “remembered accounts” list, no session management screen.

### 1.7 Profile (customer account self-service)

Screen: `src/pages/customer/Profile.tsx` (route `/profile`, `main.tsx:76`). Two sidebar tabs:
**Profile** and **Change Password** (`Profile.tsx:57-60`).

Mock profile shown (`Profile.tsx:24-31`):

| Field | Mock value | Evidence |
|---|---|---|
| `fullName` | “Sherwyn James Misula” | `:25` |
| `email` | “Sherwynn.Misula@gmail.com” | `:26` |
| `phone` | “0911324567” | `:27` |
| `gender` | “Real Men” | `:28` |
| `birthday` | “09/11/1995” | `:29` |
| `address` | “North Korea” | `:30` |
| avatar | Unsplash portrait, not editable | `:150-156` |

- “Edit Profile” button (`variant="primary"`, with a **ShoppingCart icon** — copy/paste bug) calls
  `handleProfileUpdate` which only shows toast “Profile updated successfully!” (`Profile.tsx:135-143`, `:40-44`).
- Fields are always editable inputs (no view/edit mode toggle): full name `:163-174`, email `:178-189`,
  phone `:191-202`, gender `:206-218`, birthday `:220-231`, address `:234-246`.
- Change Password form: `currentPassword`, `newPassword`, `confirmPassword`; client checks new === confirm, else
  `alert("New passwords do not match!")`; success toast “Password changed successfully!”; fields cleared
  (`Profile.tsx:34-38`, `:46-55`, `:263-313`).
- FAQ policy says legal name and birthday are **immutable after registration**; only email, phone, address may change
  (`contact-us-section2.tsx:31-35`). The UI does not enforce this.

### 1.8 Worker account management (created by admin)

- Admin-only “New Worker” button appears on the Worker Accounts tab (`AccountsDashboard.tsx:266-277`).
- `WorkerFormModal` fields (`src/components/ui/WorkerFormModal.tsx:14-22`, inputs `:84-174`):
  `name` (“Full Name”), `email` (“Email Address”), `phone` (“Phone Number”), `address` (“Address”),
  `birthday` (“Birthday mm/dd/yyyy”), `gender` select with options **“Real Men” | “Gender Neutral” | “Female”**
  (`:150-160`; default `"Real Men"` `:20`), `password` (required only on create, placeholder
  “New Password (leave blank to keep current)” on edit, `:164-174`).
- Save handler creates `id`, `workerId` (both `String(Date.now())`), password default `"default123"`, and a hardcoded
  Unsplash `profileImage` (`AccountsDashboard.tsx:129-148`).
- Worker cards show `Worker ID`, Name, Birthday, Gender, Address, Phone Number, Email and actions
  **View Details / Edit / Remove Account** (`AccountsDashboard.tsx:350-385`).
- `WorkerDetailsModal` shows Email, Phone, Address and **reveals the plaintext account password** to the admin
  (“Account Password”, masked then Eye toggle) — `src/components/ui/WorkerDetailsModal.tsx:71-85`. This is a security
  red flag: the API must never return passwords; replace with “Reset password” action in UI.
- Worker login has no screen; worker accounts authenticate through the same login identifier (email/phone) + password.

### 1.9 Account removal / ban / restore

- Customers: button label is **“Ban Account”** when `badRecords >= 2`, otherwise **“Remove Account”**
  (`AccountsDashboard.tsx:339-342`); both call `handleRemoveCustomer` which moves the record to the Removed list
  (`:110-113`).
- Workers: **“Remove Account”** → removed list (`:115-118`).
- Removed Accounts tab shows `{type} ID` (hardcoded `676767676767` text at `:396`), Name, Birthday, Gender, Address,
  Phone, Email; actions **View Details** and **“Unremoved”** (typo for “Restore”) (`:387-426`, restore handler `:120-127`).
- Policy text: 2 bad records (unclaimed orders) ⇒ automatic permanent ban
  (`contact-us-section2.tsx:69-81` warning banner, `:16-19` FAQ).
- Bad records are surfaced in `CustomerDetailsModal`: “Didn't Claimed Records”, “2 unclaimed orders will cause automatic
  account ban.”, badge `{customer.badRecords}/2` (`src/components/ui/CustomerDetailsModal.tsx:58-72`).

---

## 2. Entity inventory

Each sub-section lists every field the UI reads or writes for that entity, with its UI type, an example value taken
verbatim from the mock data, and the source location. "API must supply" marks fields that have no UI input control but
are displayed/required by a screen.

### 2.1 Customer account (`CustomerAccount`) — admin & self-service views

Type source: `src/pages/admin/AccountsDashboard.tsx:26-42` (`PendingAccount` extended by `CustomerAccount`).

| Field | UI type | Example value (mock) | Displayed / used at | Notes |
|---|---|---|---|---|
| `id` | `string` | `"c1"` | key only, `AccountsDashboard.tsx:320` | internal id |
| `customerId` | `string` | `"676767676767"` (12 digits) | `AccountsDashboard.tsx:326`, `CustomerDetailsModal.tsx:26` | public customer number, displayed label **“Customer ID”**; minted client-side as `String(Date.now())` at `AccountsDashboard.tsx:100` → 13 digits, inconsistent length |
| `name` | `string` | `"Sherwynn James Misula"` | `:327` | label “Name” |
| `birthday` | `string` (mm/dd/yyyy) | `"09/11/1995"` | `:328`; `CustomerDetailsModal.tsx:53` | label “Birthday” |
| `gender` | `string` | `"Real Men"`, `"Gender Neutral"`, `"Female"` | `:329`; select options `WorkerFormModal.tsx:156-158` | labels are non-standard; normalize in DB (`male`/`female`/`other`/`prefer_not_to_say`) with UI mapping |
| `address` | `string` | `"Korea"`, `"Thailand"` | `:330` | single-line free text |
| `phone` | `string` | `"098574641"` | `:331` | label “Phone Number” |
| `email` | `string` | mock bug: `"09/11/1995"` (a date, not an email) | `:332` | label “Email”; **mock data is invalid** |
| `profileImage` | URL string | `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80` | `:322-324`; `CustomerDetailsModal.tsx:43` | uploaded at registration (§1.3 field 0 must be wired) |
| `badRecords` | `number` | `0`, `1`, `2` | `:341`; `CustomerDetailsModal.tsx:58-72` | drives “Ban Account” label and `{n}/2` badge |
| `idOneUrl` | URL string? (optional) | — | `PendingAccount` `:35`; `ViewIdModal.tsx:8`, `:47` | 1st government ID image |
| `idTwoUrl` | URL string? (optional) | — | `:36`; `ViewIdModal.tsx:9`, `:59` | 2nd government ID image |
| `password` | `string?` | `"password123"` | `WorkerAccount` only, `:46`; `WorkerDetailsModal.tsx:74-75` | must never be returned by API |

Self-service profile fields (own record): `fullName`, `email`, `phone`, `gender`, `birthday`, `address`, avatar
(`src/pages/customer/Profile.tsx:24-31`, `:150-156`). Note naming drift: admin side calls it `name`, profile calls it
`fullName`, registration calls it `fullName`.

Backend must additionally store: password hash, `status` (`pending|active|removed|banned`), `approved_at`,
`approved_by`, `removed_at`, `ban_reason`, `remember_token`, timestamps. None of these exist in the UI today.

### 2.2 Pending registration (`PendingAccount`)

Type source `AccountsDashboard.tsx:26-37`; rendered `:284-313`; mock `:56-59`.

| Field | UI type | Example | Label shown |
|---|---|---|---|
| `id` | `string` | `"p1"`, `"p2"` | — |
| `name` | `string` | `"Sherwynn James Misula"` | “Name:” |
| `birthday` | `string` | `"09/11/1995"` | “Birthday:” |
| `gender` | `string` | `"Real Men"` / `"Gender Neutral"` | “Gender:” |
| `address` | `string` | `"Korea"` | “Address:” |
| `phone` | `string` | `"0911324567"` | “Phone Number:” |
| `email` | `string` | `"0911324567"` (again a phone, mock bug) | “Email:” |
| `profileImage` | URL string | Unsplash portrait | profile card `:286-288` |
| `idOneUrl?`/`idTwoUrl?` | URL string | not passed by caller | View ID modal |

Also required by the pending record (from the registration form, not present on the admin card): `fullName` (a.k.a.
`name`), `birthday`, government ID #1 and #2 files, password, `agreeTerms`, and the profile photo. The admin list
shows 6 text fields + 1 photo; **it does not show the two ID thumbnails on the card** (only via View ID modal).

### 2.3 Worker account (`WorkerAccount`)

Type source `AccountsDashboard.tsx:44-47`; card `:350-385`; modal `src/components/ui/WorkerDetailsModal.tsx`;
form `src/components/ui/WorkerFormModal.tsx`.

| Field | UI type | Example | Shown at |
|---|---|---|---|
| `id` | `string` | `"w1"` | key; `String(Date.now())` on create (`:133-134`) |
| `workerId` | `string` | `"676767676767"` | label **“Worker ID”** `:359`; modal header `WorkerDetailsModal.tsx:29` |
| `name` | `string` | `"Sherwynn James Misula"` | `:360`, form field `name` |
| `birthday` | `string` | `"09/11/1995"` | `:361` |
| `gender` | `string` | `"Real Men"` / `"Gender Neutral"` / `"Female"` | `:362` |
| `address` | `string` | `"Korea"` | `:363` |
| `phone` | `string` | `"098574641"` | `:364` |
| `email` | `string` | `"09/11/1995"` (mock bug) | `:365` |
| `password?` | plaintext `string` | `"password123"`, `"workersecret"`, `"default123"` | `:46`, `:68-69`, `:142`; exposed `WorkerDetailsModal.tsx:71-85` |
| `profileImage` | URL string | hardcoded Unsplash on create (`:143`) | `:356` |

Worker is created **by an admin** (no self-signup, no approval step). Worker credentials: identifier = email or phone +
password (same login screen). Worker has no store assignment field in the UI, even though the mall has stores — the
backend should add `store_id` (nullable) if workers are per-store; today's UI implies mall-wide workers.

### 2.4 Removed / banned account (`RemovedAccount`)

Type source `AccountsDashboard.tsx:49-53`; tab `:387-426`; mock `:72-75`.

| Field | UI type | Example | Notes |
|---|---|---|---|
| `id` | `string` | `"r1"`, `"r2"` | wrapper id |
| `type` | `"Customer" \| "Worker"` | `"Worker"`, `"Customer"` | label template `{type} ID:` `:396` |
| `account` | `CustomerAccount \| WorkerAccount` | see above | nested object; restore moves it back to its list (`:120-127`) |
| `{type} ID` | display-only | hardcoded `676767676767` `:396` | **must read `account.customerId` / `account.workerId` instead** |

Restore action label is **“Unremoved”** (past-participle typo) with `RotateCcw` icon (`:417-420`). Ban vs. remove is
not distinguished in the removed list — only the label on the customer card changed. Backend needs
`status ∈ {removed, banned}` plus timestamps/reasons and a restore endpoint.

### 2.5 Store

Three different shapes exist. The catalog card is the canonical list shape.

**(a) Catalog store card — `Store` type** (`src/components/ui/StoreCard.tsx:5-14`; data
`src/components/features/guest/stores/stores-section1.tsx:23-33`, identical customer copy at the same lines):

| Field | UI type | Example | Notes |
|---|---|---|---|
| `id` | `number` | `1` | used as React key only |
| `name` | `string` | `"McDonald's"` | title |
| `category` | `string` | `"Foods & Beverages"`, `"Beauty & Personal Care"`, `"Others"` | single top-level category string |
| `time` | `string` | `"6:00AM - 11:00PM"` | rendered as “Open: {time}” (`StoreCard.tsx:46`) and “Operating Hours” on detail |
| `phone` | `string` | `"0953967329"` | rendered with Phone icon |
| `isOpen` | `boolean` | `true`/`false` | drives gold “Open” vs white “Close” button (`StoreCard.tsx:59-69`) |
| `image` | URL string | Unsplash `w=500` | card image |
| `path` | `string` | `"/stores/mcdonalds"` | slug link; **router route is `/stores/:id`** (`main.tsx:72`) |

**(b) Admin store — `StoreItem`** (`src/components/ui/AdminStoreModal.tsx:5-14`; list `StoreDashboard.tsx:30-35`):

| Field | UI type | Example | Notes |
|---|---|---|---|
| `id` | `number \| string` | `1` | `Date.now()` on create (`AdminStoreModal.tsx:92`) |
| `name` | `string` | `"Mang INASAL"`, `"MacDonald's"` (typos in mock), `"Shein"`, `"Jollibee"` | form field “Store Name *” |
| `category` | `string` | `"Foods & Beverages"`, `"Fashion & Apparel"` | select from 11 categories (`AdminStoreModal.tsx:24-36`) |
| `time` | `string` | `"6:00AM - 11:00PM"` default | form field “Operating Hours *” (`:166-176`) |
| `phone` | `string` | `"0953967329"` | form field “Contact Number *” (`:178-189`) |
| `isOpen` | `boolean` | `true` | checkbox **“Store is currently Open”** (`:192-205`) |
| `image` | URL string | Unsplash or uploaded object URL | “Store Photo” + “Upload Store Image”, hint “PNG, JPG up to 5MB.” (`:220-242`) |
| `description?` | `string` | `""` | textarea “Store Description” (`:207-218`) |

The admin modal is **missing** mall floor/location and logo fields, and store-images gallery (detail page has 5 images).

**(c) Store detail page — `STORES_DATA`** (`src/pages/guest/SingleStore.tsx:12-47`, identical customer copy):

| Field | UI type | Example | Notes |
|---|---|---|---|
| `id` | `number` | `1` | unused (`useParams` destructured but ignored, `:50`) |
| `title` | `string` | `"McDonald's"` | **renamed vs `name`**; rendered as H1 `:140-142` |
| `category` | `string` | `"Foods & Beverages"` | uppercase sub-label |
| `availability` | `"Open" \| "Close"` | `"Open"` | badge color gold if `"Open"` else gray (`:95-99`) — **third representation** of open state |
| `time` | `string` | `"6:00AM - 11:00PM"` | “Operating Hours” block `:148-157` |
| `path` | `string` | `"/stores/mcdonalds"` | unused on detail |
| `images` | `string[]` (5) | 5 Unsplash URLs `w=600` | main gallery + 5 thumbnails `:119-131` |
| `description` | `string` | long text `:27` | main paragraph `:160-162` |
| `detailedHighlights` | `{title: string; text: string}[]` (4) | see §4.7 | “Store Features & Services” grid `:175-195` |
| static line | string | “Located inside Online Mall Cordova • Verified Partner Store” | `:165-168` — no backend field |

**Mall-level store/contact info** (marketing/static, but backend-configurable): “Call Us (032) 888 1234”, “Email Us
gaisano.mall@gmail.com”, “Visit Us Cordova”, “Live Chat Talk to our support team”
(`src/components/features/guest/contact-us/contact-us-herc-section.tsx:9-30`); “Our Mall Location — Visit us at Gaisano
Grand Cordova” `:186-202`; embedded Google Map iframe `:209-219`; “Opening Hours 8:00AM - 8:00PM” `:222-230`; social
links (hrefs are placeholders `#facebook`, `#instagram`, `#tiktok`, `#youtube`) `:232-261`; footer “Cordova, Cebu”
(`src/components/common/Footer.tsx:76-93`) and socials to facebook.com/youtube.com/instagram.com/tiktok.com (`:100-139`).

**Missing store fields the UI already implies but never sends:** logo (header uses only mall logo), mall floor/unit
number, store hours as open/close times (only a free-text “6:00AM - 11:00PM” string), multiple store images,
gallery, `verified` flag, store slug (path is a hardcoded slug), `isOpen` computed from hours vs manual override.

### 2.6 Product

**(a) Catalog card — `Product` type** (`src/components/ui/ProductCard.tsx:6-16`; data
`guest/products-section1.tsx:25-38` = 12 items):

| Field | UI type | Example | Notes |
|---|---|---|---|
| `id` | `number` | `1` | key only; route param is a slug |
| `name` | `string` | `"Wireless Earbuds"` | title |
| `category` | `string` | `"Electronics - Audio"`, `"Fashion - Footwear"`, `"Bags - Accessories"`, `"Beauty & Personal Care"`, `"Foods & Beverages"`, `"Electronics - Wearables"`, `"Fashion - Men's Wear"`, `"Home & Living - Kitchen"`, `"Sports & Outdoors"`, `"Home & Living"` | **two-level hierarchy rendered as one string with `" - "` separator** |
| `price` | **`string`** (pre-formatted peso) | `"₱ 1,299"`, `"₱ 49"` | rendered raw (`ProductCard.tsx:87`); parsed with `.replace("₱","").replace(",","")` for sorting (`products-section1.tsx:85-86`) |
| `isNew?` | `boolean` | `true` on ids 1, 2, 12 | amber “New” badge with Sparkles (`ProductCard.tsx:43-48`) |
| `inStock` | `boolean` | `false` for ids 2, 3, 6, 10 | rose “Out of Stock” badge (`ProductCard.tsx:49-54`); disables qty + Add to Cart (`:101`, `:110`, `:123`) |
| `stockCount` | `number` | `25`, `0`, `150`, `8` | rendered “Stock Available: {n} units” (`ProductCard.tsx:81-83`); also caps qty (`:27`, `:110`) |
| `image` | URL string | Unsplash `w=500` | single image on cards |
| `path` | `string` | `"/products/wireless-earbuds"` | slug link |

**(b) Worker product — `WorkerProduct`** (`src/components/ui/EditProductModal.tsx:5-14`; data
`src/pages/worker/WorkerProducts.tsx:28-37` = 8 items):

| Field | UI type | Example | Notes |
|---|---|---|---|
| `id` | `number \| string` | `1`; `Date.now()` on add (`WorkerProducts.tsx:73`) | `""` sentinel used for create (`:124`) |
| `name` | `string` | `"Wireless Earbuds"` | form “Product Name *” |
| `category` | `string` | `"Electronics"`, `"Fashion & Apparel"`, `"Home & Living"`, `"Foods & Beverage"`, `"Beauty & Personal Care"` | **flat category names** here (no hierarchy) |
| `description` | `string` | `"High quality wireless earbuds with active noise cancellation."` | form textarea |
| `price` | **`number`** | `1299`, `1899`, `49` | rendered `₱{price.toLocaleString()}` (`WorkerProductCard.tsx:78-80`); form `Number(price)` (`EditProductModal.tsx:97`) |
| `stocks` | `number` | `25`, `0`, `150` | named **`stocks`** (plural, no `Count`); “Stock: {n}” (`WorkerProductCard.tsx:81-83`); 0 ⇒ out-of-stock tag |
| `isNew?` | `boolean` | `true` on ids 1-2 | gold “New” badge (`WorkerProductCard.tsx:44-48`) |
| `images` | `string[]` max 3 | 1 Unsplash URL each in mock; uploaded via `URL.createObjectURL` | first image shown (`WorkerProductCard.tsx:56-60`); “Max 3” enforced (`EditProductModal.tsx:65-68`) |
| `rating`/reviews | **hardcoded** `4.7 (76)` | not a field | `WorkerProductCard.tsx:72-75` — needs `ratingAvg`/`ratingCount` fields or removal |

**(c) Product detail — `PRODUCTS_DATA`** (`src/pages/guest/SingleProduct.tsx:16-55`, identical customer):

| Field | UI type | Example | Notes |
|---|---|---|---|
| `id` | `number` | `1` | unused |
| `name` | `string` | `"Wireless Earbuds"` | H1 |
| `category` | `string` | `"Electronics - Audio"` | uppercase sub-label |
| `price` | `string` | `"₱ 1,299"` | big price |
| `originalPrice` | `string` | `"₱ 1,999"` | **struck-through** price |
| `discount` | `string` | `"-35%"` | rose badge |
| `isNew` | `boolean` | `true` | declared, not rendered on detail page |
| `inStock` | `boolean` | `true` | “In Stock” badge always rendered regardless of value (`:135-138`) |
| `stockCount` | `number` | `25` | “({n} available)” + qty cap (`:227-230`) |
| `path` | `string` | `"/products/wireless-earbuds"` | unused on detail |
| `images` | `string[]` (5) | Unsplash `w=600` | gallery + thumbnails |
| `shortDescription` | `string` | long paragraph `:35` | main description |
| `detailedHighlights` | `{title,text}[]` (4) | §4.6 | “Description” grid |

`originalPrice` + `discount` exist **only** on the detail page and are hardcoded per product; catalog cards don't show
them. Backend should store `price`, `compare_at_price` and derive `discountPercent`.

**(d) Category taxonomy** — the UI has 4 slightly different lists (see §8.2). Product-level filter logic matches on the
first word only: `prod.category.toLowerCase().includes(selectedCategory.toLowerCase().split(" ")[0])`
(`products-section1.tsx:75-79`), so “Electronics” matches “Electronics - Audio”, but “Home & Living” matches “Home & …”.

**Missing product fields implied by UI:** product→store relation (never shown anywhere — users cannot see which store
sells a product, though the product detail page has no store section), slug column (path is hardcoded), multiple
images on catalog cards, `description` on catalog (only worker view), `rating`, `isNew` computed vs manual,
`originalPrice`/`discount`, product status (draft/active/archived), SKU, unit.

### 2.7 Cart item (`CartItem`)

Type source `src/components/ui/CartCard.tsx:3-10`; toggles `src/pages/customer/Cart.tsx:57-81`.

| Field | UI type | Example | Notes |
|---|---|---|---|
| `id` | `number` | `1` | handler signatures `(id: number)` in `Cart.tsx:63,67,77` and `CartCard.tsx:14-17` — **breaks if API returns UUID/ULID** |
| `title` | `string` | `"Sardinas Green Dili ni Halang Promise"`, `"Wings Powder 1KG"`, `"Shampoo para sa mga Gwapo"`, `"Toothpaste"`, `"Egg"` | product **name** is called `title` in cart/order items |
| `price` | `number` | `100` | unit price (plain number, peso) |
| `quantity` | `number` | `5` (min 1 enforced by `Math.max(1, …)` `Cart.tsx:70`) | stepper ± |
| `image` | URL string | Unsplash `w=300` | thumbnail |
| `selected` | `boolean` | `true`, one item `false` | checkout includes only selected items |

Derived values: `selectedCount = Σ quantity of selected` (`Cart.tsx:83`), `totalPrice = Σ price*qty of selected`
(`:84`), rendered `₱{totalPrice.toLocaleString()}` (`:207`). “Items selected: {n}”.

Cart line-item total: `item.price * item.quantity` rendered `₱{itemTotal.toLocaleString()}` (`CartCard.tsx:22`, `:64-67`).

**Missing:** productId (cart uses only a synthetic `id`), store/seller grouping, stock validation, `maxQuantity`,
`addedAt`, server-side persistence.

### 2.8 Order (`OrderRecord`) + order item (`OrderItem`)

Canonical type: `src/components/ui/OrderCard.tsx:4-20`; duplicated in `src/pages/worker/Orders.tsx:20-36`. Used by
customer Cart/History, Worker Orders, Admin Sales.

| Field | UI type | Example | Notes |
|---|---|---|---|
| `id` | `string` | `"1564132164872"` (13-digit epoch-ms lookalike) | rendered “Order # {id}” (`OrderCard.tsx:40-42`), matched by string in handlers |
| `customerName?` | `string` | `"Dudes Aro Inihao"`, `"Charlie Albarico"`, `"Alex Smith"`, `"Sherwynn James"`, `"Shermaine Misula"` | only populated in worker/admin data; customer-side orders omit it |
| `status` | union `"Pending" \| "Ready to Claim" \| "Claimed" \| "Cancelled" \| "Didn't Claimed"` | see §8.3 | **exact strings matter** (displayed raw & color-coded) |
| `dateOrdered` | `string` (mm/dd/yyyy) | `"10/23/2026"`, `"10/22/2026"`, `"10/20/2026"` | rendered “Date: …”; used as exact string equality filter by admin Sales (`Sales.tsx:98-100`) and substring search by worker (`Orders.tsx:137`) |
| `dateReady?` | `string` | never set in any mock | declared at `OrderCard.tsx:17`, `worker/Orders.tsx:33`; **never displayed** → backend should return `dateReady`/`claimDeadline` |
| `totalPrice` | `number` | `1500`, `2500`, `3200` | rendered `₱{totalPrice.toLocaleString()}` everywhere |
| `items` | `OrderItem[]` | see below | count shown “Items in this Order ({n})” |

`OrderItem` (`OrderCard.tsx:4-10`, `worker/Orders.tsx:20-26`):

| Field | UI type | Example | Notes |
|---|---|---|---|
| `id` | `number` | `1` … `105` | key only |
| `title` | `string` | `"Sample Product Item"`, `"Wireless Vacuum Cleaner"`, `"Alloy Wheel Rim"`, `"Sardinas Green Dili ni Halang Promise"` | product-name snapshot |
| `price` | `number` | `1500`, `3200`, `100` | unit price at order time |
| `quantity` | `number` | `1`, `2`, `4` | — |
| `image` | URL string | Unsplash / `https://via.placeholder.com/150` | thumbnail |

**Order lifecycle policy encoded in UI copy** (must be enforced by backend):
- Claim within **3 days** of “Ready to Claim”, else auto-status **“Didn't Claimed”** → **1 bad record**
  (`contact-us-section2.tsx:16-19`, warning banner `:69-81`).
- **2 bad records ⇒ permanent ban** (`contact-us-section2.tsx:17-19`, `CustomerDetailsModal.tsx:63-64`).
- Customer can cancel **only while status is “Pending”** (`contact-us-section2.tsx:21-25`; enforced in
  `Cart.tsx:259` — `onCancel` only passed when `order.status === "Pending"`).
- Worker moves Pending → Ready to Claim, Ready → Claimed or Didn't Claimed, Pending → Cancelled
  (`worker/Orders.tsx:307-349`).
- Worker UI shows a hardcoded red badge “Date to Claim: +3 (Overdue / Didn't claim)” on Ready and Didn't Claimed tabs
  (`worker/Orders.tsx:292-296`) — placeholder for a real `claimDeadline`.

**Missing order fields the UI implies:** `storeId`/`storeName`/store location (pickup info is never shown, only
“Total Price”), `pickupCode`, `dateReady`, `claimDeadline`, `claimedAt`, `cancelledAt`, `cancelReason`,
`didntClaimedAt`, `paymentMethod` (always pay-at-mall cash), `customerId`, `customerPhone`, item `productId`,
`store` per item when multi-store carts exist, `orderCode` display format, delivery is explicitly **not** offered.

### 2.9 Notification (`NotificationItem`)

Type source `src/components/ui/NotificationCard.tsx:3-10`; data & filter
`src/components/features/customer/notifications/notifications-section1.tsx:18-66`.

| Field | UI type | Example | Notes |
|---|---|---|---|
| `id` | `number` | `1` … `5` | key only |
| `title` | `string` | `"Flash sale"`, `"Discount Reminder"`, `"Order"`, `"New Update ver 1.1"` | bold title |
| `description` | `string` | `"Up to 50% off select brands, plus 50% off all store brands."`; `"order pending"` | body text |
| `category` | union `"Offers & Sales" \| "Order" \| "System"` | as listed | **used for filter equality** (`notifications-section1.tsx:76`) and shown as sidebar items with counts |
| `time` | `string` (display) | `"1mins ago"`, `"2mins ago"`, `"5mins ago"`, `"10/5/26"` | rendered raw at top-right (`NotificationCard.tsx:31-33`) — mixture of relative and date; needs `createdAt` + client formatting |
| `icon` | `ReactNode` | `<Tag/>`, `<Package/>`, `<Megaphone/>` | **not serializable** — icon is derived from category in the data file, must be mapped client-side |

Sidebar category counters are **hardcoded** (`All 5`, `Offers & Sales 3`, `Order 1`, `System 1`;
`notifications-section1.tsx:61-66`) → should come from API or be computed from the list.
Search filters `title` and `description` client-side (`:79-85`); search icon button has **no handler** (`:178-184`).
Cards are not clickable and there is **no read/unread state, no mark-as-read, no unread badge** anywhere
(header bell nav has no count: `CustomerHeader.tsx:55`).

### 2.10 Contact message

Form: `src/components/features/guest/contact-us/contact-us-section1.tsx:17-41` (identical customer copy).

| Field | UI type | Required | Placeholder | Evidence |
|---|---|---|---|---|
| `fullName` | `string` | yes | “Enter your full name” | `:17`, `:71-84` |
| `email` | `string` | yes | “name@example.com” | `:18`, `:88-101` |
| `phoneNumber` | `string` | yes | “09123456789” | `:19`, `:103-116` |
| `subject` | `string` | yes | “What is this regarding?” | `:20`, `:119-133` |
| `message` | `string` (textarea rows 4) | yes | “Write your message here...” | `:21`, `:135-149` |
| `isCaptchaVerified` | `boolean` | yes | simulated reCAPTCHA checkbox **“I'm not a robot”** + spinner + “reCAPTCHA / Privacy - Terms” | `:25`, `:151-168` |
| `toastMessage` | transient | — | success toast “Your message has been sent successfully!” for 4 s, form reset | `:26`, `:35-41` |

Submit is client-only; no message id/status. Admin has **no inbox screen** for contact messages (gap).
Mall contact data displayed beside the form: address card + map + hours + socials (§2.5).

### 2.11 Admin sales rows & dashboard KPIs

Mock rows: `src/pages/admin/Sales.tsx:20-77` (7 orders) — same `OrderRecord` shape as §2.8, statuses restricted to
`Claimed | Cancelled | Didn't Claimed`. Admin views:

| UI element | Formula / value in mock | Evidence |
|---|---|---|
| Tab keys | `Dashboard`, `Complete`, `Cancelled`, `Didn't Claimed` | `Sales.tsx:112-117`, `:150-172` |
| Selected date | `useState("10/22/2026")`, ←/→ stepper cycles 10/22 → 10/23 → 10/24 | `:81`, `:87-95`, badge `:189-208` |
| Revenue (per date) | Σ `totalPrice` of `Claimed` on date | `:103`, shown `:183` |
| Cancelled total | Σ `totalPrice` of `Cancelled` on date + count | `:104`, `:184` |
| Didn't Claimed total | Σ `totalPrice` of `Didn't Claimed` on date + count | `:105`, `:185` |
| **Total Revenue (Monthly)** KPI | Σ `totalPrice` where `status === "Claimed"` (all mock rows) = **₱7,200** | `:108`, card `:221-227` |
| **Total Cancelled Orders** KPI | count `Cancelled` = **2** | `:109`, card `:229-235` |
| **Total Didn't Claimed** KPI | count `Didn't Claimed` = **2** | `:110`, card `:237-243` |
| Dashboard subtitle | “Sales & Performance Overview” / “Summary of all revenue, cancellations, and unclaimed records.” | `:212-213` |
| Empty states | “No completed sales records found for {date}.” etc. | `:251-254`, `:270-273`, `:289-292` |

There is **no chart component at all** today (no `<canvas>`, no chart lib in `package.json`). The “dashboard” is 3 KPI
cards. Any chart in the backend contract should be optional/series-shaped for a future UI.

### 2.12 Static / configurable content the UI hardcodes

| Entity | Fields | Source |
|---|---|---|
| Product category list (12, with icon mapping) | “All Products”, “Foods & Beverages”, “Electronics”, “Beauty & Personal Care”, “Home & Living”, “Health & Wellness”, “Toys & Games”, “Sports & Outdoors”, “Books & Stationery”, “Fashion & Apparel”, “Computer & Accessories”, “Others” | `guest/products-section1.tsx:40-53` |
| Store category list (12, “All Stores”) | same names, “All Stores” first | `guest/stores-section1.tsx:35-48` |
| Worker product category list (12, “All Products”) | same as products | `worker/WorkerProducts.tsx:39-52` |
| Admin store category list (11, no “All”) | same minus “All” | `AdminStoreModal.tsx:24-36` |
| Product form category list (11) | **“Foods & Beverage” (singular)** — inconsistent with the filter list | `AddNewProductModal.tsx:20-32`, `EditProductModal.tsx:24-36` |
| Home “Shop By Category” carousel (8 with images + query links) | Foods & Beverages→`/products?category=foods`, Fashion & Apparel→`fashion`, Electronics→`electronics`, Beauty & Personal Care→`beauty`, Home & Living→`home`, Health & Wellness→`health`, Toys & Games→`toys`, Others→`others` | `guest/home/home-section1.tsx:5-46` |
| FAQ items (6, with category tags) | see §4.13 | `guest/contact-us/contact-us-section2.tsx:10-41` |
| Home hero cards (3) | Shop Online/Check Stock; Explore Stores/& Services; Pick Up at the Mall/Pay & Claim | `guest/home/home-hero-section.tsx:10-26` |
| Products hero cards (4) | Shop Online, Mall Pickup, Secure Shopping, Mall Pickup (duplicate title+icon) | `guest/products/products-hero-section.tsx:9-30` |
| Stores hero cards (4) | same as products | `guest/stores/stores-hero-section.tsx:9-30` |
| Notifications hero cards (3) | Real-Time Alerts, Claim Status, Account Notices | `customer/notifications/notifications-hero-section.tsx:9-25` |
| Contact hero cards (4) | Call Us / Email Us / Visit Us / Live Chat | `guest/contact-us/contact-us-herc-section.tsx:9-30` |
| About mission/vision/values (3) | long copy | `guest/about/about-hero-section.tsx:5-24` |
| About “why shop” cards (5) | Wide Selection, Secure & Safe, Save Time, Real Store Access, Always Here | `guest/about/about-section1.tsx:14-45` |
| About stats (3) | “100+ Stores in the mall”, “1,000+ Products Online”, “Growing Together with our Community” | `guest/about/about-section1.tsx:156-187` |
| Footer | tagline “Shop Smarter. Pick Up Safer.”, “{year} © Online Mall Cordova. All rights reserved \| Web Designed for Capstone” | `src/components/common/Footer.tsx:144-163` |

Backend options: seed these as `categories`, `faqs`, `site_settings`/`mall_info` tables (recommended, since the admin
already edits stores/products) or keep them as frontend constants. At minimum the category lists and mall contact
info should be server-driven because 4 copies already disagree (§8.2).

---

## 3. UI action → required HTTP operation map

Legend: **Actor** = who can trigger it; **Data sent** = payload the backend must accept for the current UI to be
rewired without UI redesign (field names as used by the UI state); **Response / refresh** = what the screen needs back
to update without a full reload. "∅" = no API call exists today (mock/local). All request bodies should be JSON unless
noted **multipart**.

### 3.1 Auth & registration (guest pages)

| # | Action | Trigger (file:line) | Actor | Data sent | Expected response / refresh |
|---|---|---|---|---|---|
| A1 | **Log in** | `Login.tsx:23-27` (submit `:138`, button `:195-202`) | guest | `{ emailOrPhone, password, rememberMe }` | `{ token, user: { id, customerId?, workerId?, role, name, email, phone, address, gender, birthday, profileImage, status } }` + role-based redirect (`customer → /`, `worker → /worker/orders`, `admin → /admin/accounts`); 403 when `status` pending/removed/banned with message |
| A2 | Toggle password visibility | `Login.tsx:168-174` | guest | — local state only | — |
| A3 | Remember me | `Login.tsx:179-187` | guest | part of A1 (`rememberMe`) | long-lived token/session when true |
| A4 | Forgot password — send code | `ForgotPassword.tsx:19-22`, submit `:148-177` | guest | `{ emailOrPhone }` | `202 { message }`; UI switches to “Verification Code Sent!” card (`:133-146`). Needs follow-up endpoints for code verify + reset (not in UI yet) |
| A5 | **Register** (submit) | `Register.tsx:41-67`, button `:385-393` | guest | **multipart**: `fullName, email, phoneNumber, address, birthday, password, password_confirmation, agreeTerms, profilePhoto(file), idOne(file), idTwo(file)` | `201 { data: { id, status: "pending" } , message }`; UI should navigate to a pending screen (does not exist yet). 422 for under-18, duplicate email/phone, password rules, missing IDs |
| A6 | Upload profile picture | `Register.tsx:186-194` — **visual only, no input/state** | guest | `profilePhoto` file (part of A5) | preview URL after upload |
| A7 | Terms / Privacy links | `Register.tsx:374-375` → `/terms`, `/privacy` | guest | — | routes missing (`main.tsx`) |
| A8 | Open Login / Register | `GuestHeader.tsx:104-117`, drawer `:197-208` | guest | — | client routing only |
| A9 | Logout | `CustomerHeader.tsx:114,215`; `WorkerHeader.tsx:82,167`; `AdminHeader.tsx:88,173` → `/logout` | all | token | `POST /auth/logout` 204 + redirect `/login`; currently **dead link, no route** |
| A10 | Header search | `GuestHeader.tsx:88-99`, `CustomerHeader.tsx:89-102` (input has no state/onSubmit) | guest/customer | `{ q }` when wired | product search results; currently non-functional |
| A11 | Guest “Login”/“Register” nav (mobile) | `GuestHeader.tsx:196-209` | guest | — | routing only |

### 3.2 Guest / customer catalog browsing

| # | Action | Trigger (file:line) | Actor | Data sent | Expected response / refresh |
|---|---|---|---|---|---|
| B1 | Load home “Shop By Category” carousel | `guest/home/home-section1.tsx:5-46` (links `:122-146`) | guest/customer | `GET categories?type=product` | 8 category cards `{name, image, slug}` |
| B2 | Load “Featured Products” | `guest/home/home-section2.tsx:6-71` (links `:155-181`) | guest/customer | `GET products?featured=1&limit=8` | 8 `{id,name,price,image,status/path}` cards; “Add to Cart” `:186-195` is `alert()` |
| B3 | Load “Stores in the Mall” | `guest/home/home-section3.tsx:6-79` (links `:155-209`) | guest/customer | `GET stores?limit=8` | 8 `{id,name,hours,phone,status,image,path}` cards; the Open/Close at `:196-204` is a **<Button> with no handler** |
| B4 | Open product list | `/products` or `/guest/products` (`main.tsx:69`, `:54`) | guest/customer | `GET products` (paginated) + `GET categories` | grid of 12 mock cards (real: page + filters) |
| B5 | Filter by category (sidebar) | `guest/products-section1.tsx:144-158` | guest/customer | `?category=Electronics` (or category id) | filtered result set; currently client-side `includes(firstWord)` matching `:75-79` |
| B6 | Sort by price (high/low) | `guest/products-section1.tsx:181-209` | guest/customer | `?sort=price_desc\|price_asc` | sorted list; currently parses `"₱ 1,299"` strings `:84-90` |
| B7 | Filter availability | `guest/products-section1.tsx:233-252` | guest/customer | `?availability=in_stock\|out_of_stock` | filtered list |
| B8 | Reset category / clear all filters | `:265-273`, `:291-301` | guest/customer | re-request default list | reset list |
| B9 | **Add to Cart** (card) | `ProductCard.tsx:119-128` → `handleAddToCart` `guest/products-section1.tsx:68-73` | customer (guest must be redirected to login) | `POST cart/items { productId, quantity }` | `{ cartCount, item }` + toast “Added {qty} x \"{name}\" to cart!”; today only a toast |
| B10 | **Add to Cart** (home carousel) | `guest/home/home-section2.tsx:186-195` (`alert`) | customer | same as B9 | same; today `alert("Added {name} to cart!")` |
| B11 | Open product detail | `ProductCard.tsx:57-73` / `:131-140`; `home-section2` links | guest/customer | `GET products/{idOrSlug}` | product detail (currently always renders `PRODUCTS_DATA[0]`, `SingleProduct.tsx:58-61`) |
| B12 | Product detail quantity +/− | `SingleProduct.tsx:67-77`, `:208-230` | guest/customer | local | min 1, max `stockCount` |
| B13 | **Add to Cart** (detail) | `SingleProduct.tsx:79-82`, button `:234-243` | customer | `POST cart/items { productId, quantity }` | toast “Successfully added {qty} x \"{name}\" to cart!” |
| B14 | **Buy** (detail, buy-now) | `SingleProduct.tsx:84-87`, button `:244-253` | customer | `POST orders` with single item (or add-to-cart then checkout) | order confirmation / redirect to `/cart` orders tab; today only a toast “Proceeding to checkout…” |
| B15 | Image gallery arrows/thumbs | `SingleProduct.tsx:89-95`, `:141-170` | guest/customer | — local | — |
| B16 | Open store list | `/stores` (`main.tsx:71`) | guest/customer | `GET stores` | store cards |
| B17 | Store category filter | `guest/stores-section1.tsx:138-152` | guest/customer | `?category=` | filtered |
| B18 | Store availability filter (All/Open Now/Closed) | `guest/stores-section1.tsx:173-204` | guest/customer | `?isOpen=1\|0` | filtered |
| B19 | Open store detail | `StoreCard.tsx:25-40`, `:72-81` | guest/customer | `GET stores/{idOrSlug}` | store detail: title, category, availability, hours, description, highlights, images[5] (currently always `STORES_DATA[0]`, `SingleStore.tsx:50-53`) |
| B20 | Store detail gallery | `SingleStore.tsx:57-63`, `:119-131` | guest/customer | — local | — |
| B21 | “View All” links | `home-section1.tsx:82-88`, `home-section2.tsx:106-112`, `home-section3.tsx:115-121` | guest/customer | client nav | **links to customer paths even from guest tree** (`/products`, `/stores`) |

### 3.3 Customer account, notifications, cart, orders

| # | Action | Trigger (file:line) | Actor | Data sent | Expected response / refresh |
|---|---|---|---|---|---|
| C1 | Load profile | `customer/Profile.tsx:24-31` (hardcoded mock) | customer | `GET profile` | `{ fullName, email, phone, gender, birthday, address, profileImage, customerId, badRecords }` |
| C2 | **Edit Profile** (button) | `Profile.tsx:135-143` → `handleProfileUpdate` `:40-44` | customer | `PATCH profile { fullName, email, phone, gender, birthday, address }` | toast “Profile updated successfully!”; per FAQ name/birthday should be rejected (`contact-us-section2.tsx:31-35`) |
| C3 | Change password | `Profile.tsx:46-55` (submit `:263-313`) | customer | `PUT profile/password { currentPassword, newPassword, newPassword_confirmation }` | toast “Password changed successfully!”; 422 mismatch/wrong current |
| C4 | Load notifications | `notifications-section1.tsx:18-59` | customer | `GET notifications` | list + category counts |
| C5 | Filter notifications by category | `notifications-section1.tsx:128-151` | customer | `?category=Offers %26 Sales\|Order\|System` | filtered list |
| C6 | Search notifications | `notifications-section1.tsx:170-185` (input state works, button no handler `:178-184`) | customer | `?search=` | filtered list |
| C7 | Clear filters / reset view | `:189-203`, `:217-225` | customer | — | reload all |
| C8 | Mark notification read | **absent** | customer | `PATCH notifications/{id}/read` | unread badge |
| C9 | Load cart | `Cart.tsx:17-23` (mock) | customer | `GET cart` | items + totals |
| C10 | Select / unselect item | `Cart.tsx:63-65` → `CartCard.tsx:29-34` | customer | `PATCH cart/items/{id} { selected }` | recomputed totals `Cart.tsx:83-84` |
| C11 | Select all | `Cart.tsx:58-61`, `:193-200` | customer | `PATCH cart/items/select-all { selected }` | all selected + totals |
| C12 | Change quantity +/− | `Cart.tsx:67-75` → `CartCard.tsx:46-62` | customer | `PATCH cart/items/{id} { quantity }` | line total + grand total; min 1 |
| C13 | Remove cart item | `Cart.tsx:77-81` → `CartCard.tsx:82-89` | customer | `DELETE cart/items/{id}` | toast “Item removed from cart”; item disappears |
| C14 | View product from cart | `Cart.tsx:231` `alert(...)` → `CartCard.tsx:73-80` | customer | navigate `/products/{slug}` | route exists |
| C15 | **Check out** | `Cart.tsx:86-94`, button `:209-217` | customer | `POST orders/checkout { cartItemIds: number[] }` (selected ids) | order created (`Pending`), cart cleared of selected items, toast “Checkout successful! Order placed.”; today local only + `alert("Please select items to check out.")` when none selected |
| C16 | Load active orders | `Cart.tsx:34-37` (Orders tab `:247-272`) | customer | `GET orders?status=active` (Pending + Ready to Claim) | order cards |
| C17 | Cancel order | `Cart.tsx:97-105`, `OrderCard.tsx:64-74`, enablement `Cart.tsx:259` | customer | `POST orders/{id}/cancel` | status→`Cancelled`, moves to History, toast “Order #{id} has been cancelled.”; server must reject if not `Pending` |
| C18 | View order details | `Cart.tsx:260` / `:287` → `OrderDetailsModal.tsx` | customer | `GET orders/{id}` (or use list payload) | modal with items, status, date, total |
| C19 | Load order history | `Cart.tsx:40-44` (History tab `:274-299`) | customer | `GET orders?status=history` (`Claimed`,`Cancelled`,`Didn't Claimed`) | order cards, **no cancel button** |
| C20 | Submit contact message | `guest/contact-us/contact-us-section1.tsx:28-41`, button `:171-175` | guest/customer | `{ fullName, email, phoneNumber, subject, message, captchaVerified }` | toast “Your message has been sent successfully!”, form reset; today local only |
| C21 | Captcha checkbox | `contact-us-section1.tsx:151-168` | guest/customer | part of C20 | simulated; backend should verify real captcha token |
| C22 | Social / location links | `contact-us-section1.tsx:235-260` (`href="#facebook"` …), `Footer.tsx:80-139` | all | — | external links; replace placeholders |
| C23 | About page | `pages/*/About.tsx` → about sections | all | `GET site/about` (optional) | static copy today |

### 3.4 Worker workspace

| # | Action | Trigger (file:line) | Actor | Data sent | Expected response / refresh |
|---|---|---|---|---|---|
| D1 | Load orders by tab | `worker/Orders.tsx:102-108` tabs, filter `:124-140` | worker | `GET worker/orders?status=Pending\|Ready to Claim\|Claimed\|Cancelled\|Didn't Claimed` | list of orders with `customerName`, `dateOrdered`, `totalPrice`, items count |
| D2 | Search orders | `worker/Orders.tsx:229-244` (input state; search button no handler `:237-243`) | worker | `?search=` (matches customerName, id, dateOrdered as today `:134-138`) | filtered list |
| D3 | Clear search | `:248-259` | worker | — | reload |
| D4 | **Order Ready** (Pending → Ready to Claim) | `worker/Orders.tsx:309-316` → `handleUpdateStatus` `:119-121` | worker | `PATCH worker/orders/{id}/status { status: "Ready to Claim" }` | updated status; sets `dateReady`; toast/refresh list |
| D5 | **Cancel Order** from worker (Pending → Cancelled) | `:317-325` | worker | `PATCH .../status { status: "Cancelled" }` | updated; policy says worker can cancel pending |
| D6 | **Order Claimed** (Ready → Claimed) | `:331-338` | worker | `PATCH .../status { status: "Claimed" }` | updated; `claimedAt` set / paid-at-store marker |
| D7 | **Didn't Claimed** (Ready → Didn't Claimed) | `:339-347` | worker | `PATCH .../status { status: "Didn't Claimed" }` | updated; increments customer `badRecords`, triggers ban at 2 |
| D8 | View order details (modal) | `:351-359`, inline modal `:372-437` | worker | `GET worker/orders/{id}` (or list payload) | modal with customer, status, date, total, items |
| D9 | Load worker products | `worker/WorkerProducts.tsx:28-37`, list `:340-348` | worker | `GET worker/products` | products for worker's store(s) |
| D10 | Product filters (category/price/availability) | `:164-280` | worker | `?category=&sort=&availability=` | filtered list |
| D11 | Product search | `:294-304` | worker | `?search=` | filtered |
| D12 | Clear filters | `:320-337`, `:355-366` | worker | — | reload |
| D13 | **New Product** | `:307-315` opens modal `:121-127` with **`mode="update"` and an empty product** | worker | `POST worker/products` **multipart**: `name, category, description, price, stocks, images[] (≤3)` | prepend product, toast “Successfully added \"{name}\" to inventory!” (`:70-79`); note the orphan `AddNewProductModal` (`src/components/ui/AddNewProductModal.tsx`) is never imported — the working path is `EditProductModal` in "update" mode |
| D14 | **Update Product** | `WorkerProductCard.tsx:89-97` → `EditProductModal.tsx:79-104` → `WorkerProducts.tsx:81-85` | worker | `PUT worker/products/{id}` multipart: `name, category, description, price, stocks, images[]` | toast “Successfully updated \"{name}\"!” |
| D15 | View product (read-only modal) | `WorkerProductCard.tsx:99-106` (`mode="view"`) | worker | `GET worker/products/{id}` (optional) | disabled form |
| D16 | Upload/remove product images | `EditProductModal.tsx:61-77`, `:206-243` | worker | `images[]` in D13/D14; removal sends remaining list | previews via `URL.createObjectURL` (blob URLs — must be converted to files) |
| D17 | Delete product | **absent** | worker/admin | `DELETE worker/products/{id}` | recommended; UI needs a button |
| D18 | Worker header nav / logout | `WorkerHeader.tsx:44-47`, `:80-88` | worker | — / `POST auth/logout` | routes |

### 3.5 Admin — Accounts Dashboard

| # | Action | Trigger (file:line) | Actor | Data sent | Expected response / refresh |
|---|---|---|---|---|---|
| E1 | Load tab counts + lists | `AccountsDashboard.tsx:150-155`, tabs `:206-232` | admin | `GET admin/accounts/pending` + `/customers` + `/workers` + `/removed` (or one `GET admin/accounts/summary`) | 4 lists + counts |
| E2 | Search accounts | `:250-263` (input state only; **no filtering implemented**) | admin | `?search=` on the active list | filtered list |
| E3 | **Accept** pending | `:298-301` → `handleAcceptPending` `:96-104` | admin | `POST admin/accounts/pending/{id}/accept` (optional `{note}`) | customer created with `customerId`, `badRecords: 0`; remove from pending, prepend to customers |
| E4 | **Reject** pending | `:306-309` → `:106-108` | admin | `POST admin/accounts/pending/{id}/reject { reason? }` | remove from pending; ideally status `rejected` + notification |
| E5 | **View ID** (pending) | `:302-305` → `ViewIdModal.tsx` | admin | `GET admin/accounts/pending/{id}` (must include `idOneUrl`, `idTwoUrl`) | modal displays 2 ID images (signed URLs) |
| E6 | Load customer list | `:318-348` | admin | `GET admin/accounts/customers?search=&page=` | cards with `customerId,name,birthday,gender,address,phone,email,profileImage,badRecords` |
| E7 | View customer details | `:335-338` → `CustomerDetailsModal.tsx` | admin | `GET admin/accounts/customers/{id}` | modal incl. `badRecords/2` badge + 2 ID images |
| E8 | **Remove / Ban customer** | `:339-342` label rule `item.badRecords >= 2 ? "Ban Account" : "Remove Account"` → `:110-113` | admin | `POST admin/accounts/customers/{id}/remove { ban: bool, reason? }` | record moves to Removed list with its data |
| E9 | Load worker list | `:350-385` | admin | `GET admin/accounts/workers` | cards with `workerId,…` |
| E10 | **New Worker** | `:266-277` opens `WorkerFormModal` (`:179-184`), save `:129-148` | admin | `POST admin/accounts/workers { name, email, phone, address, birthday, gender, password }` | prepend worker with generated `workerId`; toast/refresh; password never returned afterwards |
| E11 | **Edit Worker** | `:372-375` → same modal with `workerToEdit` | admin | `PUT admin/accounts/workers/{id}` (password optional; blank = unchanged) | updated card |
| E12 | View worker details | `:368-371` → `WorkerDetailsModal.tsx` | admin | `GET admin/accounts/workers/{id}` | modal; **remove password display** (`WorkerDetailsModal.tsx:71-85`) |
| E13 | Remove worker | `:376-379` → `:115-118` | admin | `DELETE`/`POST .../remove` on worker | moves to Removed list |
| E14 | Load removed list | `:387-426` | admin | `GET admin/accounts/removed` | removed items with type/id/fields |
| E15 | View removed details | `:405-416` | admin | `GET admin/accounts/removed/{id}` | customer or worker modal |
| E16 | **Unremoved** (restore) | `:417-420` → `handleUnremoveAccount` `:120-127` | admin | `POST admin/accounts/removed/{id}/restore` | moves back to customer/worker list, removed entry deleted |

### 3.6 Admin — Stores Dashboard

| # | Action | Trigger (file:line) | Actor | Data sent | Expected response / refresh |
|---|---|---|---|---|---|
| F1 | Load store list + count | `StoreDashboard.tsx:30-35`, `:293-355` | admin | `GET admin/stores?category=&isOpen=&search=` | store cards `{id,name,category,time,phone,isOpen,image}` |
| F2 | Category filter | `:164-203` | admin | `?category=` | filtered |
| F3 | Availability filter (All/Open Now/Closed) | `:205-255` | admin | `?isOpen=` | filtered |
| F4 | Search stores | `:269-278` (local filter `:112-117`) | admin | `?search=` | filtered |
| F5 | **New Store** | `:280-288` → `AdminStoreModal.tsx` create mode, save `handleSaveStore` `:89-98` | admin | `POST admin/stores` **multipart**: `name, category, time (hours), phone, isOpen, description, image(file)` | prepend store; toast “Successfully added \"{name}\"!” |
| F6 | **Update Store** | `:321-329` → modal update mode; save `:91-97` | admin | `PUT admin/stores/{id}` multipart same fields | replace card; toast “Successfully updated…” |
| F7 | **View Store** | `:331-339` → modal view mode (disabled form) | admin | `GET admin/stores/{id}` | read-only modal incl. image preview |
| F8 | **Delete Store** | `:341-349` → `handleDeleteStore` `:100-106` with `window.confirm` | admin | `DELETE admin/stores/{id}` | remove card; toast “Deleted \"{name}\" from stores.” |
| F9 | Upload store photo | `AdminStoreModal.tsx:71-76`, `:220-242` | admin | `image` file part of F5/F6 | preview; hint “PNG, JPG up to 5MB.” |
| F10 | Reset filters | `:361-373` | admin | — | reload |

### 3.7 Admin — Sales (daily reports / KPIs)

| # | Action | Trigger (file:line) | Actor | Data sent | Expected response / refresh |
|---|---|---|---|---|---|
| G1 | Load KPI dashboard | `Sales.tsx:217-246` | admin | `GET admin/sales/summary?month=YYYY-MM` | `{ totalRevenue, cancelledCount, unclaimedCount }` (mock: 7200 / 2 / 2) |
| G2 | Step date ←/→ | `Sales.tsx:87-95`, controls `:189-208` | admin | `GET admin/sales/orders?date=YYYY-MM-DD` | records for the date; today cycles 3 hardcoded dates |
| G3 | Load Complete tab | `:249-265` | admin | `?status=Claimed&date=` | Σ revenue header `:183` |
| G4 | Load Cancelled tab | `:268-284` | admin | `?status=Cancelled&date=` | total + count header `:184` |
| G5 | Load Didn't Claimed tab | `:287-303` | admin | `?status=Didn't Claimed&date=` | total + count header `:185` |
| G6 | View order details | `:256-301` → `AdminOrderDetailsModal.tsx` | admin | `GET admin/sales/orders/{id}` | modal incl. `customerName` |
| G7 | Switch tabs | `:150-172` | admin | — | client-side |

**Backend operations implied but with no UI trigger yet (must still exist):** admin login, worker login, notification
feed generation, automatic 3-day “Didn't Claimed” sweep, bad-record increment + auto-ban, pending-registration
notification to admins, email/SMS sending for forgot password, contact-message admin inbox, product delete, order
pickup/claim info on customer order cards, unread notification count, cart badge count, pagination meta.

---

## 4. Hardcoded mock datasets (transcription for seeders)

Every array/object below is transcribed verbatim from the source (values unchanged, including typos). These are the
data the seeders should reproduce so the demo looks identical after rewiring.

**Image URL convention used everywhere.** `https://images.unsplash.com/<photo-id>?w=<width>&auto=format&fit=crop&q=80`.
Card/thumbnail sizes are `w=500` (sometimes `w=300/400`), detail pages use `w=600`, an 800 px image appears in About.
Below, only the `<photo-id>` is listed to keep tables readable; prefix `https://images.unsplash.com/` and append
`?w=500&auto=format&fit=crop&q=80` unless stated otherwise. Seeders can copy the full URLs from the cited lines.

### 4.1 Featured products on Home — `FEATURED_PRODUCTS` (8 items)
`src/components/features/guest/home/home-section2.tsx:6-71` = `src/components/features/customer/home/home-section2.tsx:6-71`

| id | name | price | status | path | image photo-id |
|---|---|---|---|---|---|
| 1 | Wireless Earbuds | `₱ 1,299` | In Stock | `/products/wireless-earbuds` | `photo-1590658268037-6bf12165a8df` |
| 2 | Sports Shoes | `₱ 1,899` | In Stock | `/products/sports-shoes` | `photo-1542291026-7eec264c27ff` |
| 3 | Laptop Backpack | `₱ 999` | In Stock | `/products/laptop-backpack` | `photo-1553062407-98eeb64c6a62` |
| 4 | Skincare Set | `₱ 1,499` | In Stock | `/products/skincare-set` | `photo-1556228720-195a672e8a03` |
| 5 | Instant Noodles | `₱ 49` | In Stock | `/products/instant-noodles` | `photo-1612929606404-7471ffae7a29` |
| 6 | Smart Watch | `₱ 2,499` | In Stock | `/products/smart-watch` | `photo-1523275335684-37898b6baf30` |
| 7 | Stainless Tumbler | `₱ 450` | In Stock | `/products/stainless-tumbler` | `photo-1602143407151-7111542de6e8` |
| 8 | Bluetooth Speaker | `₱ 899` | In Stock | `/products/bluetooth-speaker` | `photo-1608043152269-423dbba4e7e1` |

(Note: every `status` is `"In Stock"` even though catalog data marks Smart Watch / Sports Shoes / Laptop Backpack out
of stock — mock inconsistency.)

### 4.2 Catalog products — `ALL_PRODUCTS` (12 items)
`guest/products-section1.tsx:25-38` = `customer/products-section1.tsx:25-38`

| id | name | category | price | isNew | inStock | stockCount | path | image photo-id |
|---|---|---|---|---|---|---|---|---|
| 1 | Wireless Earbuds | Electronics - Audio | `₱ 1,299` | true | true | 25 | `/products/wireless-earbuds` | `photo-1590658268037-6bf12165a8df` |
| 2 | Sports Shoes | Fashion - Footwear | `₱ 1,899` | true | false | 0 | `/products/sports-shoes` | `photo-1542291026-7eec264c27ff` |
| 3 | Laptop Backpack | Bags - Accessories | `₱ 999` | false | false | 0 | `/products/laptop-backpack` | `photo-1553062407-98eeb64c6a62` |
| 4 | Skincare Set | Beauty & Personal Care | `₱ 1,499` | false | true | 12 | `/products/skincare-set` | `photo-1556228720-195a672e8a03` |
| 5 | Instant Noodles | Foods & Beverages | `₱ 49` | false | true | 150 | `/products/instant-noodles` | `photo-1612929606404-7471ffae7a29` |
| 6 | Smart Watch | Electronics - Wearables | `₱ 2,499` | false | false | 0 | `/products/smart-watch` | `photo-1523275335684-37898b6baf30` |
| 7 | Graphic T-Shirt | Fashion - Men's Wear | `₱ 499` | false | true | 40 | `/products/graphic-tshirt` | `photo-1521572267360-ee0c2909d518` |
| 8 | Microwave Oven | Home & Living - Kitchen | `₱ 3,499` | false | true | 8 | `/products/microwave-oven` | `photo-1574269909862-7e1d70bb8078` |
| 9 | Bluetooth Headphones | Electronics - Audio | `₱ 1,799` | false | true | 18 | `/products/bluetooth-headphones` | `photo-1505740420928-5e560c06d30e` |
| 10 | Hair Care Set | Beauty & Personal Care | `₱ 1,099` | false | false | 0 | `/products/hair-care-set` | `photo-1535585209827-a15fcdbc4c2d` |
| 11 | Yoga Mat | Sports & Outdoors | `₱ 599` | false | true | 30 | `/products/yoga-mat` | `photo-1601925260368-ae2f83cf8b7f` |
| 12 | Stainless Tumbler | Home & Living | `₱ 450` | true | true | 50 | `/products/stainless-tumbler` | `photo-1602143407151-7111542de6e8` |

### 4.3 Product detail — `PRODUCTS_DATA` (1 item)
`src/pages/guest/SingleProduct.tsx:16-55` = customer copy (only function name differs)

```
id: 1, name: "Wireless Earbuds", category: "Electronics - Audio",
price: "₱ 1,299", originalPrice: "₱ 1,999", discount: "-35%",
isNew: true, inStock: true, stockCount: 25, path: "/products/wireless-earbuds",
images (5, w=600):
  photo-1590658268037-6bf12165a8df
  photo-1572536147248-ac59a8abfa4b
  photo-1600294037681-c80b4cb5b434
  photo-1593121985387-a2f602324683
  photo-1508700115892-45ecd05ae2ad
shortDescription: "Experience high-quality sound with these wireless earbuds. Designed for comfort, long battery
life, and seamless connectivity. Perfect for music, calls, and everyday use."
detailedHighlights:
 1) "Premium Sound Quality" / "Enjoy rich, clear audio with deep bass and crisp highs. Perfect for music, podcasts, and calls."
 2) "Long Battery Life" / "Get up to 24 hours of total playtime with the charging case. Spend less time charging and more time listening."
 3) "Comfortable Fit" / "Lightweight and ergonomic design for all-day comfort. Comes with multiple ear tip sizes for the perfect fit."
 4) "Seamless Connectivity" / "Bluetooth 5.3 ensures a faster, more stable connection with your devices."
```

### 4.4 Home “Shop By Category” — `CATEGORIES` (8 items)
`guest/home/home-section1.tsx:5-46` (customer copy identical)

| name | image photo-id | path |
|---|---|---|
| Foods & Beverages | `photo-1550547660-d9450f859349` | `/products?category=foods` |
| Fashion & Apparel | `photo-1489987707025-afc232f7ea0f` | `/products?category=fashion` |
| Electronics | `photo-1498049794561-7780e7231661` | `/products?category=electronics` |
| Beauty & Personal Care | `photo-1522337360788-8b13dee7a37e` | `/products?category=beauty` |
| Home & Living | `photo-1583847268964-b28dc8f51f92` | `/products?category=home` |
| Health & Wellness | `photo-1584308666744-24d5c474f2ae` | `/products?category=health` |
| Toys & Games | `photo-1566576912321-d58ddd7a6088` | `/products?category=toys` |
| Others | `photo-1513151233558-d860c5398176` | `/products?category=others` |

### 4.5 Stores on Home — `STORES` (8 items)
`guest/home/home-section3.tsx:6-79` (customer copy identical)

| id | name | hours | phone | status | path | image photo-id |
|---|---|---|---|---|---|---|
| 1 | McDonald's | `Open: 6:00AM - 11:00PM` | `0953967329` | Open | `/stores/mcdonalds` | `photo-1552566626-52f8b828add9` |
| 2 | Mang Inasal | `Open: 6:00AM - 11:00PM` | `0953967329` | **Close** | `/stores/mang-inasal` | `photo-1555396273-367ea4eb4db5` |
| 3 | Hair Salon | `Open: 6:00AM - 11:00PM` | `0953967329` | Open | `/stores/hair-salon` | `photo-1560066984-138dadb4c035` |
| 4 | Cebuana | `Open: 6:00AM - 11:00PM` | `0953967329` | Open | `/stores/cebuana` | `photo-1486406146926-c627a92ad1ab` |
| 5 | Watson's Pharmacy | `Open: 8:00AM - 9:00PM` | `0953967330` | Open | `/stores/watsons` | `photo-1576602976047-174e57a47881` |
| 6 | Supermarket | `Open: 6:00AM - 10:00PM` | `0953967331` | Open | `/stores/supermarket` | `photo-1578916171728-46686eac8d58` |
| 7 | Department Store | `Open: 9:00AM - 9:00PM` | `0953967332` | Open | `/stores/department-store` | `photo-1441986300917-64674bd600d8` |
| 8 | Coffee Shop | `Open: 7:00AM - 11:00PM` | `0953967333` | Open | `/stores/coffee-shop` | `photo-1501339847302-ac426a4a7cbb` |

Button variant rule: `Close` → white button, otherwise gold (`home-section3.tsx:196-204`).

### 4.6 Store list — `ALL_STORES` (9 items)
`guest/stores-section1.tsx:23-33` (customer copy identical; contains intentional duplicates)

| id | name | category | time | phone | isOpen | path | image photo-id |
|---|---|---|---|---|---|---|---|
| 1 | McDonald's | Foods & Beverages | `6:00AM - 11:00PM` | `0953967329` | true | `/stores/mcdonalds` | `photo-1552566626-52f8b828add9` |
| 2 | Mang Inasal | Foods & Beverages | `6:00AM - 11:00PM` | `0953967329` | false | `/stores/mang-inasal` | `photo-1555396273-367ea4eb4db5` |
| 3 | Hair Salon | Beauty & Personal Care | `6:00AM - 11:00PM` | `0953967329` | true | `/stores/hair-salon` | `photo-1560066984-138dadb4c035` |
| 4 | Cebuana | Others | `6:00AM - 11:00PM` | `0953967329` | true | `/stores/cebuana` | `photo-1441986300917-64674bd600d8` |
| 5 | Cebuana | Others | `6:00AM - 11:00PM` | `0953967329` | true | `/stores/cebuana-2` | `photo-1441986300917-64674bd600d8` |
| 6 | Hair Salon | Beauty & Personal Care | `6:00AM - 11:00PM` | `0953967329` | true | `/stores/hair-salon-2` | `photo-1560066984-138dadb4c035` |
| 7 | McDonald's | Foods & Beverages | `6:00AM - 11:00PM` | `0953967329` | true | `/stores/mcdonalds-2` | `photo-1552566626-52f8b828add9` |
| 8 | Mang Inasal | Foods & Beverages | `6:00AM - 11:00PM` | `0953967329` | false | `/stores/mang-inasal-2` | `photo-1555396273-367ea4eb4db5` |
| 9 | Hair Salon | Beauty & Personal Care | `6:00AM - 11:00PM` | `0953967329` | true | `/stores/hair-salon-3` | `photo-1560066984-138dadb4c035` |

### 4.7 Store detail — `STORES_DATA` (1 item)
`src/pages/guest/SingleStore.tsx:12-47` = customer copy

```
id: 1, title: "McDonald's", category: "Foods & Beverages", availability: "Open",
time: "6:00AM - 11:00PM", path: "/stores/mcdonalds",
images (5, w=600):
  photo-1552566626-52f8b828add9
  photo-1555396273-367ea4eb4db5
  photo-1543007630-9710e4a00a20
  photo-1517248135467-4c7edcad34c4
  photo-1466978913421-dad2ebd01d17
description: "Welcome to McDonald's Cordova branch! Enjoy your favorite world-famous burgers, crispy fries, chicken
McDo, and refreshing drinks right inside the mall. Fast service, comfortable dine-in area, and quick mall pick-up
options available."
detailedHighlights:
 1) "Dine-In & Takeout" / "Spacious seating area with air conditioning, perfect for families, students, and groups looking for a quick meal."
 2) "Mall Pick-Up Ready" / "Skip the long queues by ordering online through Online Mall Cordova and picking up your freshly prepared orders directly at our counter."
 3) "Operating Schedule" / "Open daily from 6:00 AM to 11:00 PM to serve your breakfast, lunch, dinner, and late-night cravings."
 4) "Quality Service" / "Dedicated crew members ensuring fast, clean, and friendly customer service at all times."
```

### 4.8 Customer Cart page mock data
`src/pages/customer/Cart.tsx`

**`INITIAL_CART` (5)** — `:17-23`:

| id | title | price | quantity | selected | image photo-id (w=300) |
|---|---|---|---|---|---|
| 1 | Sardinas Green Dili ni Halang Promise | 100 | 5 | true | `photo-1579871494447-9811cf80d66c` |
| 2 | Wings Powder 1KG | 100 | 5 | true | `photo-1586201375761-83865001e31c` |
| 3 | Shampoo para sa mga Gwapo | 100 | 5 | true | `photo-1535585209827-a15fcdbc4c2d` |
| 4 | Toothpaste | 100 | 5 | true | `photo-1556228720-195a672e8a03` |
| 5 | Egg | 100 | 5 | **false** | `photo-1516467508483-a7212febe31a` |

`initialSelectedCount = 20`, `initialTotalPrice = ₱2,000`.

**`SAMPLE_ITEMS` (5)** — `:26-31`, reused inside every order:

| id | title | price | quantity | image photo-id |
|---|---|---|---|---|
| 101 | Sardinas Green Dili ni Halang Promise | 100 | 2 | `photo-1579871494447-9811cf80d66c` |
| 102 | Wings Powder 1KG | 100 | 1 | `photo-1586201375761-83865001e31c` |
| 103 | Shampoo para sa mga Gwapo | 100 | 3 | `photo-1535585209827-a15fcdbc4c2d` |
| 104 | Toothpaste | 100 | 2 | `photo-1556228720-195a672e8a03` |
| 105 | Egg | 100 | 4 | `photo-1516467508483-a7212febe31a` |

items sum = 12 × ₱100 = **₱1,200**, but every mock order stores `totalPrice: 1500` → data bug to note when seeding.

**`INITIAL_ORDERS` (2, active)** — `:34-37`:

| id | status | dateOrdered | totalPrice | items |
|---|---|---|---|---|
| `"1564132164872"` | Pending | 10/23/2026 | 1500 | SAMPLE_ITEMS |
| `"1564132164873"` | Ready to Claim | 10/23/2026 | 1500 | SAMPLE_ITEMS |

**`INITIAL_HISTORY` (3)** — `:40-44`:

| id | status | dateOrdered | totalPrice | items |
|---|---|---|---|---|
| `"1564132164874"` | Claimed | 10/23/2026 | 1500 | SAMPLE_ITEMS |
| `"1564132164875"` | Cancelled | 10/23/2026 | 1500 | SAMPLE_ITEMS |
| `"1564132164876"` | Didn't Claimed | 10/23/2026 | 1500 | SAMPLE_ITEMS |

### 4.9 Worker order queue — `INITIAL_ORDERS` (6 items)
`src/pages/worker/Orders.tsx:39-100`. Item images are all `https://via.placeholder.com/150` (not Unsplash).

| id | customerName | status | dateOrdered | totalPrice | item (id / title / price / qty) |
|---|---|---|---|---|---|
| `"1564132164872"` | Dudes Aro Inihao | Pending | 10/23/2026 | 1500 | 1 / Sample Product Item / 1500 / 1 |
| `"1564132164873"` | Charlie Albarico | Pending | 10/23/2026 | 1500 | 2 / Another Product / 1500 / 1 |
| `"1564132164874"` | Dudes Aro Inihao | Ready to Claim | 10/23/2026 | 1500 | 3 / Ready Item / 1500 / 1 |
| `"1564132164875"` | Dudes Aro Inihao | Claimed | 10/23/2026 | 1500 | 4 / Claimed Item / 1500 / 1 |
| `"1564132164876"` | Dudes Aro Inihao | Cancelled | 10/23/2026 | 1500 | 5 / Cancelled Item / 1500 / 1 |
| `"1564132164877"` | Dudes Aro Inihao | Didn't Claimed | 10/20/2026 | 1500 | 6 / Unclaimed Item / 1500 / 1 |

Tab definitions (`:102-108`, note labels/keys and the `Canceled` spelling):

| Tab label | `status` key used for active tab | Data status matched |
|---|---|---|
| Pending | `"Pending"` | `Pending` |
| Ready | `"Ready"` | `Ready to Claim` |
| Claimed | `"Claimed"` | `Claimed` |
| **Canceled** | `"Canceled"` | `Cancelled` |
| Didn't Claimed | `"Didn't Claimed"` | `Didn't Claimed` |

### 4.10 Worker product inventory — `INITIAL_WORKER_PRODUCTS` (8 items)
`src/pages/worker/WorkerProducts.tsx:28-37`. All one image each (w=500); no description shown on card but stored in mock.

| id | name | category | description | price | stocks | isNew | image photo-id |
|---|---|---|---|---|---|---|---|
| 1 | Wireless Earbuds | Electronics | High quality wireless earbuds with active noise cancellation. | 1299 | 25 | true | `photo-1590658268037-6bf12165a8df` |
| 2 | Sports Shoes | Fashion & Apparel | Durable and comfortable sports shoes for running and training. | 1899 | 0 | true | `photo-1542291026-7eec264c27ff` |
| 3 | Laptop Backpack | Home & Living | Water-resistant laptop backpack with USB charging port. | 999 | 0 | false | `photo-1553062407-98eeb64c6a62` |
| 4 | Skincare Set | Beauty & Personal Care | Organic daily skincare set for glowing and healthy skin. | 1499 | 12 | false | `photo-1556228720-195a672e8a03` |
| 5 | Instant Noodles | Foods & Beverage | Delicious spicy instant noodles pack of 5. | 49 | 150 | false | `photo-1612929606404-7471ffae7a29` |
| 6 | Smart Watch | Electronics | Fitness tracker smartwatch with heart rate monitor. | 2499 | 0 | false | `photo-1523275335684-37898b6baf30` |
| 7 | Graphic T-Shirt | Fashion & Apparel | 100% cotton casual graphic t-shirt. | 499 | 40 | false | `photo-1521572267360-ee0c2909d518` |
| 8 | Microwave Oven | Home & Living | Compact digital microwave oven with grill function. | 3499 | 8 | false | `photo-1574269909862-7e1d70bb8078` |

Worker card also renders a hardcoded rating **“4.7 (76)”** (`src/components/ui/WorkerProductCard.tsx:72-75`).

### 4.11 Admin accounts mock data
`src/pages/admin/AccountsDashboard.tsx`

**`INITIAL_PENDING` (2)** — `:56-59`:

| id | name | birthday | gender | address | phone | email | profileImage photo-id |
|---|---|---|---|---|---|---|---|
| `p1` | Sherwynn James Misula | 09/11/1995 | Real Men | Korea | 0911324567 | 0911324567 | `photo-1534528741775-53994a69daeb` |
| `p2` | Shermaine Misula | 09/11/1995 | Gender Neutral | Korea | 0911324567 | 0911324567 | `photo-1517841905240-472988babdf9` |

**`INITIAL_CUSTOMERS` (3)** — `:61-65` (`idOneUrl`/`idTwoUrl` absent in all):

| id | customerId | name | birthday | gender | address | phone | email | badRecords | profileImage photo-id |
|---|---|---|---|---|---|---|---|---|---|
| `c1` | 676767676767 | Sherwynn James Misula | 09/11/1995 | Real Men | Korea | 098574641 | 09/11/1995 | 0 | `photo-1534528741775-53994a69daeb` |
| `c2` | 676767676767 | Shermaine James Misula | 09/11/1995 | Gender Neutral | Thailand | 09879165454 | 09/11/1995 | **1** | `photo-1517841905240-472988babdf9` |
| `c3` | 676767676767 | Sherwynn James Misula | 09/11/1995 | Real Men | Korea | 098574641 | 09/11/1995 | **2** | `photo-1507003211169-0a1dd7228f2d` |

Note all three share the same `customerId` and invalid emails — seed with unique 12-digit codes.

**`INITIAL_WORKERS` (2)** — `:67-70`:

| id | workerId | name | birthday | gender | address | phone | email | password | profileImage photo-id |
|---|---|---|---|---|---|---|---|---|---|
| `w1` | 676767676767 | Sherwynn James Misula | 09/11/1995 | Real Men | Korea | 098574641 | 09/11/1995 | `password123` | `photo-1573496359142-b8d87734a5a2` |
| `w2` | 676767676767 | Shermaine James Misula | 09/11/1995 | Gender Neutral | Thailand | 09879165454 | 09/11/1995 | `workersecret` | `photo-1580489944761-15a19d654956` |

**`INITIAL_REMOVED` (2)** — `:72-75`:

| id | type | account id | account ID field | name | badRecords | profileImage photo-id |
|---|---|---|---|---|---|---|
| `r1` | Worker | `w99` | workerId `676767676767` | Sherwynn James Misula | — | `photo-1500648767791-00dcc994a43e` |
| `r2` | Customer | `c99` | customerId `676767676767` | Shermaine James Misula | 2 | `photo-1539571696357-5a69c17a67c6` |

### 4.12 Admin store dashboard — `INITIAL_STORES` (4 items)
`src/pages/admin/StoreDashboard.tsx:30-35`

| id | name | category | time | phone | isOpen | image photo-id |
|---|---|---|---|---|---|---|
| 1 | Mang INASAL | Foods & Beverages | 6:00AM - 11:00PM | 0953967329 | true | `photo-1555396273-367ea4eb4db5` |
| 2 | MacDonald's | Foods & Beverages | 6:00AM - 11:00PM | 0953967329 | true | `photo-1552566626-52f8b828add9` |
| 3 | Shein | Fashion & Apparel | 6:00AM - 11:00PM | 0953967329 | true | `photo-1441986300917-64674bd600d8` |
| 4 | Jollibee | Foods & Beverages | 6:00AM - 11:00PM | 0953967329 | true | `photo-1552566626-52f8b828add9` |

### 4.13 Admin sales orders — `INITIAL_SALES_ORDERS` (7 items)
`src/pages/admin/Sales.tsx:20-77` (items use `w=500` Unsplash images)

| id | customerName | status | dateOrdered | totalPrice | item (title / price / qty / photo-id) |
|---|---|---|---|---|---|
| `1564132164872` | Dudes Aro Inihao | Claimed | 10/22/2026 | 1500 | Wireless Vacuum Cleaner / 1500 / 1 / `photo-1558317374-067fb5f30001` |
| `1564132164873` | Sherwynn James | Claimed | 10/22/2026 | 2500 | Drink Dispenser 10L / 2500 / 1 / `photo-1544816155-12df9643f363` |
| `1564132164874` | Shermaine Misula | Claimed | 10/23/2026 | 3200 | Alloy Wheel Rim / 3200 / 1 / `photo-1485965120184-e220f721d03e` |
| `1564132164875` | Charlie Albarico | Cancelled | 10/22/2026 | 1200 | Stylus Pen / 1200 / 1 / `photo-1583292650931-196e45d4d3c2` |
| `1564132164876` | Dudes Aro Inihao | Cancelled | 10/23/2026 | 800 | Phone Case / 800 / 1 / `photo-1541872703-74c5e44368f9` |
| `1564132164877` | Dudes Aro Inihao | Didn't Claimed | 10/22/2026 | 1500 | Unclaimed Item Pack / 1500 / 1 / `photo-1526170375885-4d8ecf77b99f` |
| `1564132164878` | Alex Smith | Didn't Claimed | 10/24/2026 | 2100 | Smart LED Bulb Set / 2100 / 1 / `photo-1550985616-11b11651e60f` |

**Derived numbers the UI computes** (`Sales.tsx:98-110`) — seed expectations for the dashboard endpoint:

| Metric | Value |
|---|---|
| Default `selectedDate` | `10/22/2026` |
| Revenue on 10/22 / 10/23 / 10/24 | 4000 / 3200 / 0 |
| Cancelled total on 10/22 / 10/23 / 10/24 | 1200 / 800 / 0 |
| Didn't Claimed total on 10/22 / 10/23 / 10/24 | 1500 / 0 / 2100 |
| **Total Revenue (Monthly)** | **₱7,200** |
| **Total Cancelled Orders** | **2** |
| **Total Didn't Claimed** | **2** |

### 4.14 Notifications — `ALL_NOTIFICATIONS` (5 items) + category counters
`src/components/features/customer/notifications/notifications-section1.tsx:18-66`

| id | title | description | category | time | icon |
|---|---|---|---|---|---|
| 1 | Flash sale | Up to 50% off select brands, plus 50% off all store brands. | Offers & Sales | `1mins ago` | `Tag` |
| 2 | Discount Reminder | Final hours! Enjoy up to 70% off top featured brands and 70% off all our exclusive house brands. | Offers & Sales | `1mins ago` | `Tag` |
| 3 | Flash sale | Our flash sale is live! Take up to 50% off select brands and 50% off all your brands today. | Offers & Sales | `2mins ago` | `Tag` |
| 4 | Order | order pending | Order | `5mins ago` | `Package` |
| 5 | New Update ver 1.1 | System Update: Our website has been updated to improve your browsing experience. [Learn More] | System | `10/5/26` | `Megaphone` |

Category counters (hardcoded, `:61-66`): `All 5`, `Offers & Sales 3`, `Order 1`, `System 1`.

### 4.15 Customer profile mock — `profileData`
`src/pages/customer/Profile.tsx:24-31`: `fullName: "Sherwyn James Misula"`, `email: "Sherwynn.Misula@gmail.com"`,
`phone: "0911324567"`, `gender: "Real Men"`, `birthday: "09/11/1995"`, `address: "North Korea"`; avatar
`photo-1534528741775-53994a69daeb` (`:152`).

### 4.16 Mall / contact info (static)
`src/components/features/guest/contact-us/contact-us-herc-section.tsx:9-30`:

| Card title | Subtitle |
|---|---|
| Call Us | `(032) 888 1234` |
| Email Us | `gaisano.mall@gmail.com` |
| Visit Us | `Cordova` |
| Live Chat | `Talk to our support team` |

`contact-us-section1.tsx`: “Our Mall Location” / “Visit us at Gaisano Grand Cordova” (`:198-199`); Google Maps embed
iframe of “Gaisano Grand Cordova” (`:209-219`); **Opening Hours `8:00AM - 8:00PM`** (`:226-229`); social placeholders
`#facebook`, `#instagram`, `#tiktok`, `#youtube` (`:235-261`).
`Footer.tsx`: “Cordova, Cebu” (`:90`), `https://maps.google.com` (`:81`), socials facebook/youtube/instagram/tiktok
(`:102-134`), copyright `{currentYear} © Online Mall Cordova. All rights reserved | Web Designed for Capstone`
(`:159-163`).

### 4.17 FAQ content — `FAQ_ITEMS` (6)
`src/components/features/guest/contact-us/contact-us-section2.tsx:10-41` (used verbatim by customer tree):

| # | category | question | answer (verbatim, abbreviated here) |
|---|---|---|---|
| 1 | Ordering & Pick Up | How does the Pay & Claim at the Mall system work? | browse/order online to check real-time store availability and skip lines; once prepared by mall workers you get a notification; visit store, pay at counter, claim items. |
| 2 | Policies & Bans | What happens if I fail to claim my order? | 3 days to claim once “Ready to Claim”; else auto-marked “Didn't Claimed” → 1 bad record; **2 bad records ⇒ account automatically banned**. |
| 3 | Ordering & Pick Up | Can I cancel my order after placing it? | yes while status is still “Pending”; once workers update to “Ready to Claim”, cancellations are no longer allowed. |
| 4 | Account & Verification | Why do I need to provide 2 valid IDs and a photo to register? | security/anti-fraud; all accounts need verification (18+, face photo, 2 valid IDs); **mall workers review before activating**. |
| 5 | Account & Verification | Can I change my name or birthday after registration? | **no** — name/birthday immutable; only email, phone, home address editable in profile settings. |
| 6 | Payments & Pricing | What payment methods are accepted at the mall? | strictly “Pay at the Mall”; no online delivery payment; cash or accepted in-store options at the counter. |

Warning banner above the accordion (`:69-81`): “Important Notice: 3-Day Claim Policy & Account Ban” — “Orders must be
claimed within **3 days** of becoming ready. Failing to claim 2 orders results in 2 bad records and will cause your
account to be permanently **banned**.”

### 4.18 About page content
`guest/about/about-hero-section.tsx:5-24` — Mission/Vision/Values long copy.
`guest/about/about-section1.tsx:14-45` — 5 “why shop” cards: `Wide Selection` / `Secure & Safe` / `Save Time` /
`Real Store Access` / `Always Here` (each with image photo-ids: `photo-1578916171728-46686eac8d58`,
`photo-1563986768609-322da13575f3`, `photo-1508962914676-134849a727f0`, `photo-1441986300917-64674bd600d8`,
`photo-1534536281715-e28d76689b4d`); stats `100+ Stores in the mall`, `1,000+ Products Online`, `Growing Together with
our Community` (`:156-187`); “Our Story” image `photo-1512428559087-560fa5ceab42` (`:58`); slogan
“Shop Smart. Pick Up Safer.” (`:192-194`).

### 4.19 Hero cards (per-page marketing arrays)

| File | Cards (title / subtitle) |
|---|---|
| `guest/home/home-hero-section.tsx:10-26` | Shop Online / Check Stock · Explore Stores / & Services · Pick Up at the Mall / Pay & Claim |
| `guest/products/products-hero-section.tsx:9-30` | Shop Online / Check stock & order easily · Mall Pickup / Pay and claim at the mall · Secure Shopping / Your data is safe with us · Mall Pickup / New products & restocks |
| `guest/stores/stores-hero-section.tsx:9-30` | same 4 as products |
| `customer/notifications/notifications-hero-section.tsx:9-25` | Real-Time Alerts / Instant updates on orders · Claim Status / Track mall pick-up readiness · Account Notices / Important security updates |
| `guest/contact-us/contact-us-herc-section.tsx:9-30` | see §4.16 |

---

## 5. Formatting & typing conventions the UI assumes

### 5.1 Currency (peso) — the UI is internally inconsistent

| Style | Rendered as | Where |
|---|---|---|
| Spaced peso + pre-formatted string | `"₱ 1,299"` (space after ₱, comma thousands) | Product card price (`ProductCard.tsx:86-88`), detail `price`/`originalPrice` (`SingleProduct.tsx:189-197`), home carousel (`home-section2.tsx:173-175`) |
| Compact peso + `toLocaleString()` | `₱1,500`, `₱{totalPrice.toLocaleString()}` (no space) | `Cart.tsx:207`, `CartCard.tsx:64-67`, `OrderCard.tsx:57`, `worker/Orders.tsx:299,398,418`, `OrderDetailsModal.tsx:40,61`, `AdminOrderDetailsModal.tsx:42,63`, `Sales.tsx:183-185,226`, `StoreDashboard.tsx` (no prices), `WorkerProductCard.tsx:78-80` |

**Decision for the API (superseded by `BACKEND_ARCHITECTURE.md` §2):** the authoritative spec returns **JSON numbers in
decimal pesos** (`price: 1299.00`, DB `DECIMAL(10,2)`), not centavos and not formatted strings. Therefore a
**`formatPeso(n)` helper is mandatory** in the rewiring (`src/lib/api.ts` or `src/lib/format.ts`) and the catalog
components that currently render `product.price` raw and parse it with `.replace("₱","")` must switch to the number
(§5.4 #1/#2). During the transition the API may add display labels, but the binding decision is numeric + client
formatting. See §9.3.

### 5.2 Dates

- All mock dates are **US-style `MM/DD/YYYY` strings**: `dateOrdered: "10/23/2026"`, `birthday: "09/11/1995"`,
  `selectedDate "10/22/2026"`, notification time `"10/5/26"` (inconsistent 2-digit year).
- `Register.tsx:46-52` does `new Date(formData.birthday)` for the 18+ check → assumes browser-parseable format.
- Admin sales compares the selected date to `dateOrdered` with **strict string equality**
  (`Sales.tsx:98-100`), so any change of format breaks the filter.
- Worker order search does `order.dateOrdered.includes(searchQuery)` (`worker/Orders.tsx:137`) — date must stay a
  searchable string in list responses.
- **Decision:** API returns ISO-8601 with offset (`"2026-10-23T09:30:00+08:00"`, Asia/Manila) + a date-only
  `dateOrdered` (`"2026-10-23"`) or keep the display string in a `*Label` field during migration. Frontend must render
  via `formatDate()` → `MM/DD/YYYY`. Do **not** send timestamps and expect the current UI to render them.

### 5.3 Identifiers — UI type, observed format, recommendation

| Entity | UI type | Format seen in mocks | Recommendation |
|---|---|---|---|
| `order.id` | `string` | 13-digit epoch-ms strings: `"1564132164872"` | Keep `string` in JSON. Use a separate `orderCode` (display) and internal numeric/ULID `id`; expose both as strings. Must stay a string because `order.id.includes(...)` is called (`worker/Orders.tsx:137`). |
| `order_item.id` | `number` | `1`…`105` | string or number, but update `OrderItem` TS type; React keys accept either |
| `cart_item.id` | `number` | `1`…`5` | **If you return UUID/ULID, the handlers’ `(id: number)` signatures break** (`CartCard.tsx:14-17`, `Cart.tsx:63,67,77`) — either return integer ids or the client types must change |
| `product.id` | `number` | `1`…`12`, worker `Date.now()` on create | integer PK recommended + `slug` |
| `store.id` | `number` (card) / `number\|string` (admin) | `1`…`9`, `Date.now()` on create | integer PK + `slug`; keep one type |
| `customer.id` / `customerId` | `string` both | `"c1"` internal, `"676767676767"` public | `id` integer/ULID internal; `customerId` string display code (12 digits) |
| `worker.id` / `workerId` | `string` both | `"w1"`, `"676767676767"` | same pattern with `workerId` code |
| `removed.id` | `string` | `"r1"` | record id / status record id |
| `product.path` / `store.path` | `string` slug | `"/products/wireless-earbuds"`, `"/stores/mcdonalds"` | return `slug`; router should use `/products/:slug` (`main.tsx:70` currently `:id`) |
| `notification.id` | `number` | `1`…`5` | integer |
| `pending.id` | `string` | `"p1"`, `"p2"` | integer/ULID |

### 5.4 Number-vs-string mismatch register (every place the UI would break)

| # | Location | UI expects | If API returns the opposite | Effect / required fix |
|---|---|---|---|---|
| 1 | `guest/products-section1.tsx:84-90` | `price` **string**, `.replace("₱","").replace(",","")` then `parseFloat` | number ⇒ `a.price.replace is not a function` (TypeError) | sort must move server-side (`?sort=price_asc`), or return `price` number and format client-side; do not return both with same key |
| 2 | `ProductCard.tsx:87`, `home-section2.tsx:173-175` | `price` rendered raw (string) | number ⇒ displays `1299` (no ₱/comma) | format helper needed |
| 3 | `SingleProduct.tsx:189-197` | `price`, `originalPrice`, `discount` strings | number / null ⇒ ugly or crash on `discount` | API: numeric price/compareAtPrice + computed `discountPercent` number |
| 4 | `WorkerProductCard.tsx:78-80` | `price` **number** (`.toLocaleString()`) | string ⇒ JS silently calls `String.prototype.toLocaleString` (returns the string) so it may render, but arithmetic elsewhere (`EditProductModal.tsx:51`, `:97`) and the TS type break | standardize to number + formatter |
| 5 | `CartCard.tsx:65-66`, `Cart.tsx:207` | `price`/`totalPrice` numbers | string ⇒ `price * quantity` = NaN, `.toLocaleString()` on number-expression NaN → “NaN” | return numbers |
| 6 | `OrderCard.tsx:57`, `OrderDetailsModal.tsx:40,61`, `AdminOrderDetailsModal.tsx:42,63`, `worker/Orders.tsx:299,398,418`, `Sales.tsx:183-185,226` | `totalPrice`, item `price` numbers | string ⇒ arithmetic/`toLocaleString` breaks or concatenates (`"1500"+"1500"`) | return numbers |
| 7 | `CartCard.tsx:14-17`, `Cart.tsx:63-79,97-105` | cart/order ids `number` (cart) / `string` (order) | UUID strings for cart ⇒ TS mismatch but JS equality works if both sides string; mixed types fail | unify: `id: string` for all API entities |
| 8 | `worker/Orders.tsx:134-138` | `order.id` **string** (`.includes`) | number ⇒ `id.includes` undefined | keep `id` string |
| 9 | `StoreCard.tsx:5-14` vs `AdminStoreModal.tsx:5-14` vs `AccountsDashboard.tsx:49-53` | store id `number` in one, `number\|string` in another, account ids `string` | cross-use creates TS errors | integer id for stores; all TS types updated |
| 10 | `AdminStoreModal.tsx:92`, `WorkerProducts.tsx:73`, `AccountsDashboard.tsx:133-134` | client-generated ids: `Date.now()` (number) and `String(Date.now())` (string) | if server returns int, the optimistic prepend code breaks type | stop generating ids client-side |
| 11 | `AccountsDashboard.tsx:341` / `CustomerDetailsModal.tsx:67-70` | `badRecords` number (`>= 2`, `{n}/2`) | string coerces in `>=` but renders; if null → `0/2` needs default | return integer, default 0 |
| 12 | `ProductCard.tsx:27,110` | `stockCount` number (`quantity < stockCount`, `quantity >= stockCount`) | string ⇒ comparisons silently coerce (`>= "25"`), so qty caps work by accident while `stockCount - n` math yields strings | return integer |
| 13 | `Sales.tsx:98-100` | `dateOrdered` string equality with `MM/DD/YYYY` | ISO timestamp ⇒ no rows ever match | return `dateOrdered` in the same display format during migration, or migrate the filter to ISO dates |
| 14 | `Sales.tsx:81,87-95` | `selectedDate` as display string | — | new API should accept `date=YYYY-MM-DD` |
| 15 | `Register.tsx:45-58` | `birthday` string parseable by `new Date()` | ISO works; `MM/DD/YYYY` works in US locales; ambiguous otherwise | return ISO `date` and validate server-side |
| 16 | `StoreCard.tsx:11` (`isOpen` boolean) vs `SingleStore.tsx:17` (`availability: "Open"\|"Close"`) vs `home-section3.tsx:12` (`status: "Open"\|"Close"`) | boolean / string / string | one API field must feed three shapes | return `isOpen: boolean` + `availabilityLabel`/`status` derived, or update 3 components |
| 17 | `OrderRecord.dateReady?` | optional string, never consumed | null/absent ⇒ no effect today | return ISO datetime + `claimDeadline` and display them |
| 18 | `NotificationCard` `icon: ReactNode`, `time: string` | non-serializable icon; pre-formatted time | JSON has no ReactNode; time string blocks i18n | return `category` + `createdAt`; client maps icon/format |
| 19 | `Orders.tsx:21` worker `OrderItem.price: number` vs `OrderCard.tsx:5` same | number | consistent — both order-item types use numbers | keep numeric; no change needed |
| 20 | `AddNewProductModal.tsx:38-39` (orphan) / `EditProductModal.tsx:42-43` | price/stocks `number \| ""` from `<input type=number>` | form must convert to number before send | server validates numeric min 0 |

### 5.5 Images

- Every image in the app is an **absolute https URL** (Unsplash with `?w=&auto=format&fit=crop&q=80` query). No image
  is a relative path, no CDN config, no placeholder component.
- Product/store cards use one image; detail pages use arrays of 5; worker product form allows **max 3** images
  (`EditProductModal.tsx:65`, `AddNewProductModal.tsx:49`); store form allows 1 (“Store Photo”).
- Uploads today create **blob object URLs** via `URL.createObjectURL` (`EditProductModal.tsx:70`,
  `AdminStoreModal.tsx:74`, `AddNewProductModal.tsx:55`) — these must be replaced with real multipart uploads; the API
  should return absolute `/storage/...` URLs (or signed URLs) that the `<img src>` can consume directly.
- Registration IDs (`idOne`, `idTwo`) and profile photo need **private** storage + short-lived signed URLs for admin
  View-ID (`ViewIdModal.tsx`), not public URLs.
- Fallback images hardcoded when a URL is missing: `EditProductModal`/`WorkerProductCard`
  `https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400...` (`WorkerProductCard.tsx:57`),
  `AdminStoreModal.tsx:98`, `ViewIdModal.tsx:47,59`, `CustomerDetailsModal.tsx:79-82`. API should always send a real
  URL and the UI should keep a deterministic placeholder.

### 5.6 Key casing

- **Every field name currently used by the UI is `camelCase`** (`dateOrdered`, `dateReady`, `totalPrice`, `stockCount`,
  `isNew`, `inStock`, `isOpen`, `badRecords`, `customerId`, `workerId`, `profileImage`, `idOneUrl`, `time`, `stocks`,
  `path`). There is not a single `snake_case` access in `src/`.
- **Authoritative decision (`BACKEND_ARCHITECTURE.md` §2): JSON is `snake_case` everywhere** (request + response),
  matching Laravel. Therefore the rewiring must introduce an explicit **mapping layer** (`src/lib/api.ts` +
  `src/lib/types.ts`): UI-facing camelCase types ⇄ API snake_case payloads. Every mapping is enumerated in **§9.2**;
  do **not** rename the API to camelCase and do not leave components reading snake_case directly.

### 5.7 Response envelope, errors, pagination (authoritative shape)

The API contract is fixed by `BACKEND_ARCHITECTURE.md` §2 (snake_case meta keys). The UI must adapt:

```json
// success (single)
{ "data": { "id": 1, "name": "Wireless Earbuds" }, "message": "optional" }
// success (collection)
{ "data": [ ... ], "meta": { "current_page": 1, "last_page": 3, "per_page": 12, "total": 32 } }
// validation error 422
{ "message": "The phone number has already been taken.", "errors": { "phone": ["..."] } }
// auth 401 / authz 403
{ "message": "Your account is still pending approval.", "code": "account_pending" }
// domain conflict 409
{ "message": "Only 3 left in stock.", "code": "insufficient_stock" }
```

The mapping layer should normalise `meta` → `{page, lastPage, perPage, total}` for components. Pagination is
**not implemented anywhere** in the UI today (every list renders the whole array and counts `array.length`, e.g.
`products-section1.tsx:263`, `stores-section1.tsx:215`, `AccountsDashboard.tsx:242-245`,
`WorkerProducts.tsx:290-292`). Add `page`/`per_page` support and map into those count labels.

### 5.8 Filters/search contracts after rewiring (authoritative query names)

| Screen | Query params per `BACKEND_ARCHITECTURE.md` §5 |
|---|---|
| Product list | `category` (slug), `search`, `sort=price_asc\|price_desc\|newest`, `in_stock=1`, `out_of_stock=1`, `page`, `per_page` |
| Store list | `category`, `search`, `open=1`, `closed=1`, `page`, `per_page` |
| Notifications | `category=offers\|order\|system`, `search` (counts + unread are in the same response) |
| Worker orders | `status=pending\|ready\|claimed\|cancelled\|not_claimed`, `search` (customer name / order number) |
| Worker products | `category`, `search`, `in_stock`, `sort`, `page`, `per_page` |
| Admin accounts | `tab=pending\|customer\|worker\|removed`, `search`, `page`, `per_page` |
| Admin stores | `search`, `category`, `page` |
| Admin sales | `date=YYYY-MM-DD`, `status=claimed\|cancelled\|not_claimed\|all`; summary `month=YYYY-MM` |
| Contact messages | `status=new\|read\|replied` |

### 5.9 Locale / timezone / misc

- `toLocaleString()` is used without a locale argument (browser default) — never rely on it server-side.
- Peso sign is a literal `₱` in source; ensure UTF-8 JSON and frontend encoding.
- Timezone: all dates are mall-local (Philippines, UTC+8). Store timestamps in UTC, render in `Asia/Manila`; the
  3-day claim deadline must be computed server-side.
- Text is US English with Filipino-flavored demo copy (“Sardinas Green Dili ni Halang Promise”, “Shampoo para sa mga
  Gwapo”, “Dili ni Halang”); seeders can keep these strings as-is.
- `min`/`max` constraints: quantity min 1 (`Cart.tsx:70`, `SingleProduct.tsx:73-77`), qty max `stockCount`
  (`ProductCard.tsx:27`), images max 3, price/stocks `min=0`, worker password required on create only.

---

## 6. Gaps & inconsistencies (do **not** edit the frontend from this section)

### 6.1 No API integration whatsoever

1. `src/lib/axios.ts` is an **empty file (0 bytes)** — no HTTP client, no base URL, no interceptors, no auth header.
2. No env vars for an API URL (`package.json` has only `vite`/`tsc`/`eslint` scripts; no `.env`), no Vite proxy config
   in the repo root (only `eslint.config.js`, `index.html`, `package.json`).
3. No auth provider/context, no token storage, no route guards: customer pages are reachable unauthenticated at `/`,
   worker pages at `/worker/*`, admin pages at `/admin/*` — all with mock data.
4. No `/logout` route despite 6 Logout links (`main.tsx:50-92`); no 404 route; no role-based redirect after login.
5. No `/terms` or `/privacy` routes although Register links to them (`Register.tsx:374-375`).
6. No admin login screen, no worker login screen, no “pending approval” screen, no OTP/reset-password screen, no
   contact-message admin inbox, no notification read state.

### 6.2 Actions with no real handler (console.log / alert / toast / dead button)

| Location | Current behavior |
|---|---|
| `Login.tsx:26` | `console.log("Logging in with: …")` — no request |
| `Register.tsx:65-66` | `console.log` + `alert("Registration submitted successfully!")` |
| `ForgotPassword.tsx:19-22` | only flips local `isSubmitted` |
| `guest/products-section1.tsx:68-73` (+ customer copy) | Add to cart is a toast only |
| `guest/home/home-section2.tsx:186-195` (+ customer copy) | Add to cart is `alert("Added {name} to cart!")` |
| `SingleProduct.tsx:79-87` (both trees) | Add to Cart/Buy are toasts only |
| `Cart.tsx:86-94` | Checkout is a toast + local filter; no order created |
| `Cart.tsx:231` | “View Product” in cart is `alert("Viewing product: …")` |
| `Profile.tsx:40-44`, `:46-55` | Profile/password saves are toasts only |
| `guest/contact-us/contact-us-section1.tsx:28-41` | Contact submit is a toast + form reset |
| `CustomerHeader.tsx:91-95`, `GuestHeader.tsx:88-93` | Search inputs with no state/handler |
| `notifications-section1.tsx:178-184` | Search icon button with no handler |
| `worker/Orders.tsx:237-243` | Search icon button with no handler (input filters locally) |
| `AccountsDashboard.tsx:250-263` | Search input state is **never used** to filter |
| `home-section3.tsx:196-204` | Store Open/Close is a `<Button>` with no handler (looks clickable) |
| `Register.tsx:186-194` | “Insert Profile Picture” avatar has no file input |
| `Register.tsx` ID uploads | files are held in state but never uploaded |
| `AdminStoreModal.tsx:71-76`, `EditProductModal.tsx:61-72` | uploads become blob URLs only |
| `WorkerDetailsModal.tsx:71-85` | shows plaintext password |
| All list pages | no pagination, no loading skeleton, no error state (only a few empty states) |
| `AddNewProductModal.tsx` | **orphan component — never imported anywhere**; the real “New Product” path misuses `EditProductModal` with `mode="update"` (`WorkerProducts.tsx:120-127`) → title says “Update Product”, no create-specific behavior |

### 6.3 Mock-only state (must be replaced by server state)

- Cart items/selected/quantity (`Cart.tsx:50`), orders & history (`:51-52`), all lists in every page.
- Admin mutations are local only: accept/reject pending, remove/ban, restore, create/edit worker, create/update/delete
  store, order-status updates, sales data.
- Notification list and category counters; contact message; profile; dashboard KPIs.
- No data is shared between layouts: e.g. admin accepting a registration does not create a customer visible anywhere
  else, cart count never appears in the header, order status changed by a worker never reaches the customer page.

### 6.4 Missing loading / error / empty states

- Only empty states exist: products/stores “No … found” (`products-section1.tsx:286-303`, `stores-section1.tsx:234-251`),
  cart/orders/history empties (`Cart.tsx:235-241,264-270,291-297`), notifications empty (`:212-227`), sales empty
  (`Sales.tsx:251-254` etc.).
- **No** loading spinner/skeleton, no retry, no network-error UI, no 401 handling, no optimistic-update rollback
  anywhere.
- Alerts are the only error channel (`alert()` × 15 occurrences); no inline field errors, no toasts for failures.

### 6.5 Typo / label issues (listed, intentionally **not** edited)

| String | Where | Comment |
|---|---|---|
| **“Joint the mall family.”** | `Register.tsx:103` | should be “Join” |
| **“Didn't Claimed”** | order status enum, tabs, buttons, admin KPI | grammatically wrong; it is a **persisted enum value** so the backend must use the exact string (see §8.3) or a migration+mapping layer is needed |
| **“Unremoved”** | `AccountsDashboard.tsx:419` | should be “Restore” |
| **“Canceled”** tab vs **“Cancelled”** status | `worker/Orders.tsx:106,111` vs `:31,129` | both spellings in one file |
| “MacDonald's” | `StoreDashboard.tsx:32` | should be “McDonald's” |
| “Mang INASAL” | `StoreDashboard.tsx:31` | styling |
| “Watsons” path vs “Watson's Pharmacy” name | `home-section3.tsx:45-50` | apostrophe/name mismatch |
| “Foods & Beverage” (singular) | `AddNewProductModal.tsx:21`, `EditProductModal.tsx:27`, `WorkerProducts.tsx:41` vs “Foods & Beverages” elsewhere | category taxonomy inconsistency |
| “Category *” lists with duplicate icon (Sparkles for both “Beauty & Personal Care” and “Sports & Outdoors”) | `products-section1.tsx:44,48` | UI-only |
| “Real Men” / “Gender Neutral” gender values | `AccountsDashboard.tsx:57-58`, `WorkerFormModal.tsx:156-158`, `Profile.tsx:28` | non-standard enum; normalize in DB |
| “send code” lowercase | `ForgotPassword.tsx:173` | inconsistent casing |
| “Date to Claim: +3 (Overdue / Didn't claim)” | `worker/Orders.tsx:292-296` | placeholder text, not derived from data |
| “Didn't Claimed Records” / “2 unclaimed orders will cause automatic account ban.” | `CustomerDetailsModal.tsx:63-64` | wording |
| “Buy” | `SingleProduct.tsx:251` | ambiguous label |
| “Items selected” / “Total” | `Cart.tsx:203-208` | no currency spacing |
| “Dashboard” tab mixed with “Complete” | `Sales.tsx:112-117` | naming |
| `title` vs `name` vs `fullName`; `stocks` vs `stockCount`; `time` vs hours; `customerName` only on some lists | many files | contract naming drift (see §2) |
| Profile page “Edit Profile” button uses a **ShoppingCart icon** | `Profile.tsx:141` | copy/paste bug |
| Cart page header says “Shopping Center” | `Cart.tsx:144` | naming |
| `product.path`/`store.path` slugs vs `:id` routes | §5.4 #15 | routing mismatch |
| Duplicate “Mall Pickup” hero cards | `products-hero-section.tsx:16,27` | content bug |

### 6.6 Mock-data bugs to fix in seeders

- Customer `email` values are `"09/11/1995"` (a date) — `AccountsDashboard.tsx:62-64`, and workers `:68-69`.
- All mock customers/workers share `customerId`/`workerId` `676767676767` — must be unique.
- Order `totalPrice: 1500` while its `items` sum to ₱1,200 — `Cart.tsx:34-44`.
- Featured products show `status: "In Stock"` for products that the catalog marks out of stock.
- Removed-account card prints hardcoded `676767676767` instead of the account's id (`AccountsDashboard.tsx:396`).
- `NEW_STORE`/`NEW_PRODUCT` use `Date.now()` ids, removed on refresh.
- `dateReady` is declared but never set/used; no `claimDeadline` in the data at all.
- Duplicate stores (Cebuana ×2, McDonald's ×2, Mang Inasal ×2, Hair Salon ×3) in `ALL_STORES`.

### 6.7 Fields the backend must add that no UI currently supplies/displays

**Customer/user:** `status` (pending/active/removed/banned), `approved_at/by`, `removed_at`, `ban_reason`,
`password_hash`, `remember_token`, `profile_photo_path`, `email_verified_at`, `phone_verified_at`, `terms_accepted_at`,
`last_login_at`, `created_at`.
**Worker:** `store_id` (if per-store), `status`, `created_by`, `must_change_password`, `password_hash` (never expose
plaintext), `worker_code` uniqueness.
**Store:** `slug`, `logo_path`, `images[]` (gallery), `opening_time`/`closing_time` (structured), `is_open_override`,
`mall_floor`/`unit_number`, `is_verified`, `status` (active/inactive/archived), `description`, `category_id`.
**Product:** `store_id`, `slug`, `category_id` (+ hierarchical parent), `description`/`short_description`,
`compare_at_price`, `discount_percent`, `images[]`, `highlights[]`, `stock_count`, `is_new`, `status`,
`rating_avg`/`rating_count` (or remove hardcoded 4.7), `sku`, `unit`, `created_by`, timestamps.
**Cart:** `product_id`, `user_id`, `selected`, `quantity`, `price_snapshot`, timestamps; stock validation.
**Order:** `order_code`, `user_id`, `store_id`, `pickup_code`, `date_ready`, `claim_deadline`, `claimed_at`,
`cancelled_at`, `cancel_reason`, `didnt_claimed_at`, `payment_method` (always pay-at-mall), `subtotal`,
`total_price`, `items_count`, `status` enum, timestamps; per-item `product_id`, `product_name`, `unit_price`,
`quantity`, `image_url`, `line_total`.
**Notification:** `user_id` (or broadcast), `category`, `title`, `body`, `is_read`, `read_at`, `type`, `related_id`,
`created_at` (drop the ReactNode icon and pre-formatted `time`).
**Contact message:** `full_name`, `email`, `phone`, `subject`, `message`, `status` (new/read/replied/closed),
`captcha_verified`, `ip_address`, `user_id?`, timestamps.
**Sales report:** aggregated `revenue`, `cancelled_total`, `cancelled_count`, `unclaimed_total`, `unclaimed_count`,
`orders_count` per day/month; optional chart series `{date, revenue}[]`.
**Site settings:** mall name, address, phone, email, opening hours, map embed URL, social links, terms/privacy content.
**FAQ:** `category`, `question`, `answer`, `sort_order`, `is_active`.

### 6.8 Business rules currently only in UI copy/client code (must be server-enforced)

1. **18+ only** registration (client check only, `Register.tsx:44-58`).
2. **2 government IDs + photo** required and reviewed by staff before activation (UI copy + admin Accept action).
3. **Name and birthday immutable** after registration (FAQ); UI does not enforce.
4. **Cancel only while Pending** (UI hides the button; must be server-validated).
5. **3-day claim window** → automatic `Didn't Claimed` + 1 bad record (no scheduler exists).
6. **2 bad records ⇒ ban** (UI only changes a label; no automatic action).
7. **Stock cannot go negative**; cart/checkout quantity ≤ `stockCount` (client-only today).
8. **Worker status transitions** limited to the four declared transitions (client-only today).
9. **Pay at the mall only** — no online payment/delivery model exists.
10. **Pending accounts cannot log in** (no such check today because there is no login).

### 6.9 Security / privacy issues in the current UI

- Worker password displayed in admin modal (`WorkerDetailsModal.tsx:71-85`) — remove from API payloads.
- Government ID images are shown via public Unsplash fallbacks; real IDs must be private, signed-URL only.
- No CSRF/token handling; no password rules shown beyond “required”.
- Simulated reCAPTCHA (`contact-us-section1.tsx:151-168`) — needs real captcha verification or a honeypot.
- Contact form collects full name/email/phone with no privacy notice/consent.
- `console.log` of credentials during login (`Login.tsx:26`) and registration incl. ID `File` objects
  (`Register.tsx:65`) — remove before shipping.
- No rate limiting on login/register/forgot-password (client sends nothing; server must add).

### 6.10 Duplication / maintainability

- 14 byte-identical component files between `features/guest/**` and `features/customer/**` (see §0).
- `pages/guest/SingleProduct.tsx` vs `pages/customer/SingleProduct.tsx` (and SingleStore) duplicate ~290/200 lines.
- `OrderRecord`/`OrderItem` types duplicated in `OrderCard.tsx` and `worker/Orders.tsx`.
- Product/store/notification card lists duplicated between guest & customer trees.
- Two product-create modal components (`AddNewProductModal` orphan vs `EditProductModal` reused for create).
- Category arrays copy-pasted 5× with divergent spellings.

### 6.11 Navigation / routing inconsistencies

- Catalog links use slugs, routes use `:id` (§5.4 #15); detail pages ignore the param and always render index 0.
- Guest tree links “View All” → `/products` (customer layout), so a guest leaving `/guest/products` silently enters the
  customer shell; `SingleProduct` “Go Back” → `/products` too (`SingleProduct.tsx:112-118`).
- Auth pages (`/login`, `/register`, `/forgot-password`) are nested in `GuestLayout` (`main.tsx:52-64`) so they render
  the guest header/footer even though they are full-screen designs (they visually replace the page anyway).
- `/guest/` has a trailing slash; others don't.
- No active-state preservation for tabs across reloads (all tab state local `useState`).
- Admin/worker/customer headers' active-link check uses exact `location.pathname` equality, so nested routes never
  highlight.

---

## 7. Recommended resource model & REST API

### 7.1 API conventions

> **STATUS OF §7 (read this first).** §7.1–§7.8 below were written as the **frontend-facing recommendation** before the
> Lead published [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md). That file is **authoritative** and differs in
> several binding points (snake_case JSON, `/api/*` paths, Sanctum SPA cookies, decimal-peso money, integer ids +
> `*_no`/`order_number` strings, snake_case status enums, consolidated admin routes). **§9 reconciles every delta** and
> lists the exact mapping the frontend must implement. Use §7 for *why* the UI needs each resource and *which fields it
> reads*; use §9 + `BACKEND_ARCHITECTURE.md` for the actual wire contract. Where they conflict, §9 /
> `BACKEND_ARCHITECTURE.md` win.

| Topic | Recommendation (see §9 for the authoritative resolution) |
|---|---|
| Base path | `/api` per `BACKEND_ARCHITECTURE.md` §5 (this doc originally proposed `/api/v1`) |
| Auth | Laravel Sanctum **SPA cookie** auth (`GET /sanctum/csrf-cookie` → `POST /api/auth/login`); session lifetime 120 min; no bearer tokens in the browser; `remember` flag stored on session/login |
| Roles | `users.role` enum `admin\|worker\|customer`; middleware `role:`; worker and admin use the **same login endpoint**, role drives redirect |
| JSON casing | **snake_case** per `BACKEND_ARCHITECTURE.md` §2; UI keeps camelCase internally via the mapping layer (§9.2) |
| Envelope | `{ "data": …, "meta": …, "message": … }`; `meta` keys snake_case (`current_page`, `last_page`, `per_page`, `total`) |
| Pagination | `?page=&per_page=` (default 20, ≤50/100); UI count labels read `meta.total` |
| Filtering | Query params per §5.8 / §9.5; server-side mandatory (client-side `includes()` logic removed) |
| Sorting | `sort=price_asc\|price_desc\|newest` (whitelist) |
| Uploads | `multipart/form-data`; registration `profile_photo`, `id_front`, `id_back`; profile `avatar`; product `images[]` (≤3); store `image`; IDs on **private** disk, served only via authorized route; whitelist jpg/jpeg/png/webp |
| Status codes | 200/201/204; 401; 403 `{message, code}`; 404 (IDOR scoping per architecture §6.1); 409 `{message, code}` for domain conflicts; 422 validation; 429 throttled |
| Rate limits | login 5/min, register 10/h, forgot 5/min, contact 3/h, checkout 30/min (architecture §6.12) |
| Dates | ISO-8601 timestamps (`Asia/Manila`), `YYYY-MM-DD` date fields; UI formats `m/d/Y` |
| Money | JSON **number**, decimal pesos (`1299.00`), DB `DECIMAL(10,2)`; UI formats with `formatPeso()` |
| Errors for the current UI | Return a human-readable `message` suitable for direct display in the existing `alert()`/toast channel |

### 7.2 Resource model (tables)

> **Authoritative schema: `BACKEND_ARCHITECTURE.md` §4.** The notes below are a superset/commentary that captures extra
> frontend-implicit requirements (gallery/highlight tables, bad-record audit, order status history, etc.). Column names
> differ in places (`customer_no`/`worker_no` vs `customer_id`/`worker_id`, `stock` vs `stock_count`, `is_selected` vs
> `selected`, `operating_hours` vs structured times, `not_claimed` vs `Didn't Claimed`); the authoritative names win and
> the mapping is in §9.

**`users`** (customers, workers, admins in one table)
`id (bigint pk)`, `role enum('customer','worker','admin')`, `customer_id char(12) nullable unique` (display code),
`worker_id char(12) nullable unique` (display code), `full_name`, `email` unique nullable, `phone` unique,
`password`, `address`, `gender enum('male','female','other','prefer_not_to_say') nullable`,
`birthday date nullable`, `profile_photo_path nullable`,
`status enum('pending','active','removed','banned','rejected')` default `pending` for customers / `active` for
admin-created workers, `bad_records_count unsigned tinyint default 0`, `approved_at`, `approved_by_user_id`,
`removed_at`, `ban_reason`, `terms_accepted_at`, `last_login_at`, `remember_token`, timestamps.

> `bad_records_count` drives §1.9; a separate `bad_records` table (`user_id, order_id, reason, created_at`) is
> recommended for the “Didn't Claimed Records” detail and auditability.

**`verification_documents`** (2 government IDs per customer)
`id`, `user_id fk`, `type enum('id_one','id_two')`, `path` (private disk), `original_name`, `mime`, `size`, timestamps.

**`categories`**
`id`, `type enum('product','store')`, `parent_id nullable self-fk` (gives the “Electronics - Audio” hierarchy),
`name`, `slug`, `image_path nullable`, `icon nullable`, `sort_order`, `is_active`.

**`stores`**
`id`, `name`, `slug unique`, `category_id fk categories`, `description text nullable`, `logo_path nullable`,
`phone`, `email nullable`, `opening_time time`, `closing_time time`, `is_open_override boolean default true`,
`mall_floor nullable`, `mall_unit nullable`, `mall_address nullable` (default “Gaisano Grand Cordova”),
`is_verified boolean default true`, `status enum('active','inactive','archived')`, timestamps.

**`store_images`** (detail gallery, 5 in mocks): `id`, `store_id`, `path`, `sort_order`.

**`products`**
`id`, `store_id fk`, `category_id fk`, `name`, `slug unique`, `short_description text nullable`,
`description text nullable`, `price_cents unsigned bigint`, `compare_at_price_cents nullable`,
`discount_percent unsigned tinyint nullable` (or computed), `stock_count unsigned int`,
`is_new boolean default false`, `rating_avg decimal(2,1) nullable`, `rating_count unsigned int default 0`,
`sku nullable`, `status enum('draft','active','archived')`, `created_by_user_id`, timestamps, soft deletes.
`in_stock` is a **computed accessor** (`stock_count > 0`), never stored.

**`product_images`**: `id`, `product_id`, `path`, `sort_order` (max 3 enforced on write).

**`product_highlights`** (detail page “detailedHighlights”): `id`, `product_id`, `title`, `text`, `sort_order`.
(Equivalently a JSON column `highlights`; a table is easier for editing.)

**`cart_items`**: `id`, `user_id fk`, `product_id fk`, `quantity unsigned int`, `selected boolean default true`,
`price_cents_snapshot unsigned bigint nullable`, timestamps; unique `(user_id, product_id)`.

**`orders`**
`id`, `order_code char(13) unique` (display `"1564132164872"`), `user_id fk`, `store_id fk nullable`
(if checkout is split per store), `status enum('pending','ready_to_claim','claimed','cancelled','didnt_claimed')`,
`subtotal_cents`, `total_cents`, `items_count`, `payment_method enum('pay_at_mall') default 'pay_at_mall'`,
`pickup_code nullable`, `date_ordered date`, `ready_at datetime nullable`, `claim_deadline datetime nullable`
(`ready_at + 3 days`), `claimed_at`, `cancelled_at`, `cancel_reason nullable`, `didnt_claimed_at`,
`bad_record_applied boolean default false`, timestamps.

**`order_items`**: `id`, `order_id`, `product_id nullable`, `product_name` (snapshot), `unit_price_cents`,
`quantity`, `line_total_cents`, `image_url` (snapshot), timestamps.
**`order_status_history`**: `id`, `order_id`, `from_status`, `to_status`, `changed_by_user_id`, `note`, `created_at`
(needed for audit + worker UI “Date to Claim” banner).

**`notifications`**: `id`, `user_id nullable` (null = broadcast to all customers), `category enum('offers_sales',
'order','system')` mapped to display strings, `title`, `body`, `is_read boolean default false`, `read_at`, `type`
(`order_status`, `account_approved`, `bad_record`, `promo`, `system`), `related_type`, `related_id`, `created_at`.

**`contact_messages`**: `id`, `full_name`, `email`, `phone`, `subject`, `message`, `status enum('new','read','replied',
'closed') default 'new'`, `captcha_verified boolean`, `ip_address`, `user_agent`, `user_id nullable`, timestamps.

**`faqs`**: `id`, `category`, `question`, `answer`, `sort_order`, `is_active` (seed §4.17).

**`site_settings`** (key/value or singleton row): `mall_name`, `mall_address`, `mall_phone`, `mall_email`,
`opening_hours`, `map_embed_url`, `facebook_url`, `instagram_url`, `tiktok_url`, `youtube_url`, `about_*` copy.
Seed §4.16.

**Laravel standard**: `personal_access_tokens`, `password_reset_tokens`, `sessions`, `cache`, `jobs` (for the
unclaimed-order sweep), `failed_jobs`.

### 7.3 Status enums (UI display strings) & transitions

**Order status** — the UI displays these strings verbatim (`OrderCard.tsx:45-51`), so the **mapping layer** must
translate the authoritative API enum (`pending|ready|claimed|cancelled|not_claimed`) to exactly these display strings:

| UI display string (what the components render) | Authoritative API enum value | Button styling / tab |
|---|---|---|
| `"Pending"` | `pending` | blue; customer can cancel; worker “Order Ready” / “Cancel Order” |
| `"Ready to Claim"` | `ready` | emerald; worker “Order Claimed” / “Didn't Claimed”; claim window starts |
| `"Claimed"` | `claimed` | sky; terminal (History / admin Complete) |
| `"Cancelled"` | `cancelled` | amber; terminal (History / admin Cancelled) |
| `"Didn't Claimed"` | `not_claimed` | amber; terminal; +1 bad record (History / admin Didn't Claimed) |

> **DB ↔ API ↔ UI mapping:** the authoritative DB/API enum is `pending|ready|claimed|cancelled|not_claimed`
> (`BACKEND_ARCHITECTURE.md` §4.3/§5). The React components render *display strings* (`"Ready to Claim"`,
> `"Didn't Claimed"`, …), so **`src/lib/api.ts` must map** enum → label (and back for worker status updates, which send
> `{status: ready|claimed|not_claimed|cancelled}`). Same pattern for `notifications.category`
> (`offers|order|system` → “Offers & Sales”/“Order”/“System”) and `contact_messages.status`
> (`new|read|replied`). Full mapping table in §9.3.

**Transition matrix** (server-enforced; authoritative enum keys)

| From | To | Actor | Side effects |
|---|---|---|---|
| — | `pending` | customer (checkout) | stock decremented, cart items cleared, notification “order pending” |
| `pending` | `ready` | worker | `ready_at = now`, `claim_deadline = now+3d`, notification |
| `pending` | `cancelled` | customer **or** worker/admin | stock restored, `cancelled_at`, notification |
| `ready` | `claimed` | worker | `claimed_at`, notification “claimed / paid at store” |
| `ready` | `not_claimed` | worker **or** scheduled job | `not_claimed_at`, `bad_records += 1`, notification; auto-ban if count ≥ 2 |
| `claimed` / `cancelled` / `not_claimed` | — | — | terminal, 409 `invalid_order_status` on any change |

**Account status** (`users.status`, authoritative): `pending` (awaiting staff review) → `active` (approved) →
`rejected` / `removed` / `banned`; restore goes back to `active`. Login allowed only for `active` (admins always
active). The UI labels this “Pending Accounts / Customer Accounts / Removed Accounts” and the restore button says
“Unremoved”.

**Worker accounts**: `active` / `removed` (restore supported).

**Store**: authoritative `is_open` boolean + `operating_hours` string (`"6:00AM - 11:00PM"`); the UI additionally shows
`statusLabel` “Open”/“Close” and a detail-page `availability` badge → derive those from `is_open` client-side.

**Gender** — authoritative schema stores the UI strings **verbatim** (`gender string(40)`, values “Real Men”,
“Gender Neutral”, “Female”), so **no enum mapping is needed**; my earlier normalize-to-enum recommendation is
superseded. Keep the three UI option values as the wire values.

**Notification category** (authoritative enum → UI string): `offers` → `"Offers & Sales"`, `order` → `"Order"`,
`system` → `"System"`.

**Contact message status**: `new`, `read`, `replied` (authoritative; my earlier `closed` is not in the schema).

### 7.4 REST endpoint catalogue — **77 endpoints** (63 required + 14 optional/recommended)

Legend: **R** = required for the current UI, **O** = optional/recommended (new screen or nice-to-have).
Actor column uses the roles from §1.1. JSON examples are written in camelCase **for readability of the UI contract**
(the authoritative wire format is snake_case — §9.2/§9.3). The paths below use `/api/v1/...` as originally proposed;
the **authoritative routes are `BACKEND_ARCHITECTURE.md` §5 (all under `/api`, no version segment)** and §9.6 maps
each catalogue entry below to the real endpoint. Treat this catalogue as the **UI→operation inventory** (what the
screen needs) and §9.6 + the architecture doc as the call signature.

#### A. Auth & session (8)

| # | Method & path | Actor | Purpose / UI trigger | R |
|---|---|---|---|---|
| 1 | `POST /api/v1/auth/register` | guest | Register screen submit (`Register.tsx:41-67`) — creates `users.status=pending` + 2 verification docs | R |
| 2 | `POST /api/v1/auth/login` | guest | Login submit (`Login.tsx:23-27`); all three roles | R |
| 3 | `POST /api/v1/auth/logout` | all | Header Logout links (`AdminHeader.tsx:88`, `CustomerHeader.tsx:114`, `WorkerHeader.tsx:82`) | R |
| 4 | `GET /api/v1/auth/me` | all | Session bootstrap on app load (missing today) | R |
| 5 | `POST /api/v1/auth/forgot-password` | guest | ForgotPassword submit (`ForgotPassword.tsx:19-22`) | R |
| 6 | `POST /api/v1/auth/verify-reset-code` | guest | **New screen needed** — verifies emailed/SMS OTP, returns short-lived reset token | R |
| 7 | `POST /api/v1/auth/reset-password` | guest | **New screen needed** — sets new password with reset token | R |
| 8 | `POST /api/v1/auth/resend-code` | guest | Resend OTP with cooldown (missing in UI) | O |

Request/response shapes:

```jsonc
// 1. POST /auth/register  (multipart/form-data)
//   fullName, email, phoneNumber, address, birthday (YYYY-MM-DD), password, password_confirmation,
//   agreeTerms=true, profilePhoto (file), idOne (file), idTwo (file)
// 201
{ "data": { "id": 42, "status": "pending", "name": "Sherwynn James Misula" },
  "message": "Your registration is pending review. You will be notified once approved." }
// 422 examples: { "message": "You must be at least 18 years old to register.",
//                 "errors": { "birthday": ["You must be at least 18 years old to register."] } }
// 422: { "message": "The phone number has already been taken.", "errors": { "phoneNumber": ["..."] } }

// 2. POST /auth/login
{ "emailOrPhone": "0911324567", "password": "secret", "rememberMe": true }
// 200
{ "data": {
    "token": "1|xxxxxxxx",
    "tokenExpiresAt": "2026-12-20T03:18:45+08:00",
    "user": { "id": 42, "role": "customer", "customerId": "676767676767",
              "name": "Sherwynn James Misula", "fullName": "Sherwynn James Misula",
              "email": "sherwynn@example.com", "phone": "0911324567", "address": "Cordova, Cebu",
              "gender": "male", "birthday": "1995-09-11",
              "profileImage": "https://…/storage/profile/42.jpg",
              "status": "active", "badRecords": 0 } } }
// 403: { "message": "Your account is still pending approval." }
// 403: { "message": "Your account has been banned due to unclaimed orders." }
// 401: { "message": "Invalid credentials." }

// 4. GET /auth/me → { "data": { …same user object… } }

// 5. POST /auth/forgot-password → { "emailOrPhone": "0911324567" }
// 202 { "message": "A verification code has been sent.", "data": { "channel": "sms", "expiresIn": 600 } }

// 6. POST /auth/verify-reset-code → { "emailOrPhone": "0911324567", "code": "123456" }
// 200 { "data": { "resetToken": "…", "expiresIn": 900 }, "message": "Code verified." }

// 7. POST /auth/reset-password
{ "resetToken": "…", "password": "newpass", "password_confirmation": "newpass" }
// 200 { "message": "Password has been reset. You can now log in." }
```

#### B. Public catalog & site (10)

| # | Method & path | Actor | Purpose / UI trigger | R |
|---|---|---|---|---|
| 9 | `GET /api/v1/categories?type=product\|store` | guest | Category filters & home carousel (`products-section1.tsx:40-53`, `stores-section1.tsx:35-48`, `home-section1.tsx:5-46`) | R |
| 10 | `GET /api/v1/products` | guest | Product list (`/products`, `/guest/products`) + worker product list uses its own endpoint | R |
| 11 | `GET /api/v1/products/featured?limit=8` | guest | Home “Featured Products” (`home-section2.tsx:6-71`) | R |
| 12 | `GET /api/v1/products/{slug}` | guest | Product detail (`SingleProduct.tsx`; supports slug or id) | R |
| 13 | `GET /api/v1/stores` | guest | Store list (`/stores`) | R |
| 14 | `GET /api/v1/stores/{slug}` | guest | Store detail (`SingleStore.tsx`) | R |
| 15 | `GET /api/v1/stores/{storeSlug}/products` | guest | “Products in this store” (not shown today; implied by mall model) | O |
| 16 | `GET /api/v1/site/mall-info` | guest | Contact page mall info, hours, map, socials (`contact-us-herc-section.tsx`, `contact-us-section1.tsx:198-229`, `Footer.tsx:76-93`) | R |
| 17 | `GET /api/v1/faqs` | guest | FAQ accordion (`contact-us-section2.tsx:10-41`) | O |
| 18 | `GET /api/v1/home` | guest | One-shot home payload (categories + featured products + stores) to replace 3 calls | O |

Query params for #10: `category` (slug or id), `sort=price_asc|price_desc|newest|name_asc`, `availability=in_stock|out_of_stock`,
`search`, `page`, `perPage`.
Query params for #13: `category`, `isOpen=1|0`, `search`, `page`, `perPage`.

```jsonc
// 9. GET /categories?type=product
{ "data": [
  { "id": 1, "name": "Electronics", "slug": "electronics", "parentId": null, "image": "https://…", "productCount": 3 },
  { "id": 8, "name": "Audio", "slug": "audio", "parentId": 1, "fullName": "Electronics - Audio" },
  { "id": 2, "name": "Foods & Beverages", "slug": "foods-beverages", "parentId": null, "productCount": 2 }
] }

// 10. GET /products?category=electronics&sort=price_asc&page=1&perPage=12
{ "data": [ {
    "id": 1, "name": "Wireless Earbuds", "slug": "wireless-earbuds",
    "category": { "id": 8, "name": "Audio", "parentName": "Electronics", "label": "Electronics - Audio" },
    "store": { "id": 2, "name": "MacDonald's", "slug": "macdonalds" },
    "price": 129900,                    // centavos → client formats "₱ 1,299.00"
    "priceLabel": "₱ 1,299",            // transitional convenience, remove later
    "compareAtPrice": 199900, "discountPercent": 35,
    "isNew": true, "inStock": true, "stockCount": 25,
    "image": "https://…/storage/products/1/cover.jpg",
    "path": "/products/wireless-earbuds" // transitional, equals "/products/{slug}"
  } ],
  "meta": { "currentPage": 1, "lastPage": 1, "perPage": 12, "total": 12 } }

// 11. GET /products/featured?limit=8
{ "data": [ { "id": 1, "name": "Wireless Earbuds", "price": 129900, "priceLabel": "₱ 1,299",
              "status": "In Stock", "image": "https://…", "path": "/products/wireless-earbuds" } ] }

// 12. GET /products/wireless-earbuds
{ "data": {
    "id": 1, "name": "Wireless Earbuds", "slug": "wireless-earbuds",
    "category": { "id": 8, "label": "Electronics - Audio" },
    "store": { "id": 2, "name": "MacDonald's", "slug": "macdonalds", "isOpen": true },
    "price": 129900, "priceLabel": "₱ 1,299", "originalPrice": 199900, "originalPriceLabel": "₱ 1,999",
    "discount": 35, "discountLabel": "-35%",
    "isNew": true, "inStock": true, "stockCount": 25,
    "path": "/products/wireless-earbuds",
    "images": ["https://…/1.jpg", "https://…/2.jpg", "https://…/3.jpg", "https://…/4.jpg", "https://…/5.jpg"],
    "shortDescription": "Experience high-quality sound with these wireless earbuds…",
    "description": "…same text as shortDescription if only one field exists…",
    "detailedHighlights": [
      { "title": "Premium Sound Quality", "text": "Enjoy rich, clear audio…" }
    ] } }

// 13. GET /stores?category=foods-beverages&isOpen=1
{ "data": [ {
    "id": 1, "name": "McDonald's", "slug": "mcdonalds",
    "category": "Foods & Beverages", "categoryId": 2,
    "time": "6:00AM - 11:00PM",        // transitional display string
    "hours": { "open": "06:00", "close": "23:00" },
    "phone": "0953967329",
    "isOpen": true, "status": "Open", "availability": "Open", // all three transitional spellings
    "image": "https://…/stores/1/cover.jpg",
    "path": "/stores/mcdonalds" } ],
  "meta": { "currentPage": 1, "lastPage": 1, "perPage": 20, "total": 9 } }

// 14. GET /stores/mcdonalds
{ "data": {
    "id": 1, "name": "McDonald's", "title": "McDonald's", "slug": "mcdonalds",
    "category": "Foods & Beverages", "availability": "Open", "isOpen": true,
    "time": "6:00AM - 11:00PM", "phone": "0953967329",
    "description": "Welcome to McDonald's Cordova branch! …",
    "images": ["https://…/1.jpg", "…"],
    "detailedHighlights": [ { "title": "Dine-In & Takeout", "text": "…" } ],
    "mallLocation": "Gaisano Grand Cordova", "mallFloor": "1F", "isVerified": true,
    "path": "/stores/mcdonalds" } }

// 16. GET /site/mall-info
{ "data": {
    "name": "Online Mall Cordova", "address": "Gaisano Grand Cordova, Cordova, Cebu",
    "phone": "(032) 888 1234", "email": "gaisano.mall@gmail.com",
    "openingHours": "8:00AM - 8:00PM", "mapEmbedUrl": "https://www.google.com/maps/embed?pb=…",
    "socials": { "facebook": "#facebook", "instagram": "#instagram", "tiktok": "#tiktok", "youtube": "#youtube" } } }

// 17. GET /faqs → { "data": [ { "category": "Policies & Bans",
//   "question": "What happens if I fail to claim my order?", "answer": "You have up to 3 days…" } ] }
```

#### C. Customer profile (5)

| # | Method & path | Actor | Purpose / UI trigger | R |
|---|---|---|---|---|
| 19 | `GET /api/v1/profile` | customer | Profile tab load (`Profile.tsx:24-31`) | R |
| 20 | `PATCH /api/v1/profile` | customer | “Edit Profile” (`Profile.tsx:40-44,135-143`) — rejects name/birthday per FAQ | R |
| 21 | `PUT /api/v1/profile/password` | customer | Change Password tab (`Profile.tsx:46-55`) | R |
| 22 | `POST /api/v1/profile/photo` | customer | Avatar upload (UI missing) | R |
| 23 | `GET /api/v1/profile/bad-records` | customer | Bad-record detail (UI only shows a number in admin) | O |

```jsonc
// 19/20
{ "data": { "id": 42, "customerId": "676767676767", "fullName": "Sherwyn James Misula",
            "email": "sherwyn@gmail.com", "phone": "0911324567", "gender": "male",
            "genderLabel": "Real Men", "birthday": "1995-09-11", "address": "Cordova, Cebu",
            "profileImage": "https://…/42.jpg", "badRecords": 0, "status": "active" } }
// 20 request: { "email": "…", "phone": "…", "address": "…" }  (optionally fullName/gender if policy allows)
// 21 request: { "currentPassword": "…", "newPassword": "…", "newPassword_confirmation": "…" }
// 422: { "message": "New passwords do not match!", "errors": { "newPassword": ["…"] } }
```

#### D. Cart (6)

| # | Method & path | Actor | Purpose / UI trigger | R |
|---|---|---|---|---|
| 24 | `GET /api/v1/cart` | customer | Cart tab (`Cart.tsx:17-23`) | R |
| 25 | `POST /api/v1/cart/items` | customer | Add to Cart (`ProductCard.tsx:119-128`, `SingleProduct.tsx:79-82`, `home-section2.tsx:190`) | R |
| 26 | `PATCH /api/v1/cart/items/{id}` | customer | Qty `+/-`, select toggle (`Cart.tsx:58-75`) | R |
| 27 | `PATCH /api/v1/cart/items/select-all` | customer | Select All (`Cart.tsx:58-61`) | R |
| 28 | `DELETE /api/v1/cart/items/{id}` | customer | Remove (`Cart.tsx:77-81`) | R |
| 29 | `DELETE /api/v1/cart` | customer | Clear cart (not in UI) | O |

```jsonc
// 24. GET /cart
{ "data": {
    "items": [ { "id": 1, "productId": 5, "title": "Instant Noodles",
                 "price": 4900, "priceLabel": "₱ 49", "quantity": 5,
                 "image": "https://…", "selected": true, "lineTotal": 24500,
                 "stockCount": 150, "productSlug": "instant-noodles" } ],
    "selectedCount": 20, "totalPrice": 200000, "totalPriceLabel": "₱ 2,000",
    "itemCount": 5 } }

// 25. POST /cart/items → { "productId": 1, "quantity": 2 }   (fast path: pass selected ids)
// 200 { "data": { "cartCount": 7, "item": { …cart item… } }, "message": "Added to cart" }
// 422: { "message": "Only 25 left in stock." }

// 26. PATCH /cart/items/1 → { "quantity": 3 }  or  { "selected": false }
// 27. PATCH /cart/items/select-all → { "selected": true }
// 28. DELETE /cart/items/1 → 204
```

#### E. Orders (customer) (4)

| # | Method & path | Actor | Purpose / UI trigger | R |
|---|---|---|---|---|
| 30 | `POST /api/v1/orders/checkout` | customer | “Check out” (`Cart.tsx:86-94`) — creates `Pending` order(s) | R |
| 31 | `GET /api/v1/orders?status=active\|history` | customer | Orders tab / History tab (`Cart.tsx:34-44,247-299`) | R |
| 32 | `GET /api/v1/orders/{id}` | customer | Order Details modal (`OrderDetailsModal.tsx`) | R |
| 33 | `POST /api/v1/orders/{id}/cancel` | customer | Cancel Order (`Cart.tsx:97-105`, only when `Pending`) | R |

```jsonc
// 30. POST /orders/checkout
{ "cartItemIds": [1, 2, 3] }
// 201
{ "data": [
    { "id": "1564132164872", "orderCode": "1564132164872",
      "status": "Pending", "dateOrdered": "2026-10-23", "dateOrderedLabel": "10/23/2026",
      "dateReady": null, "claimDeadline": null,
      "totalPrice": 200000, "totalPriceLabel": "₱ 2,000",
      "store": { "id": 1, "name": "McDonald's", "slug": "mcdonalds" },
      "items": [ { "id": 101, "productId": 5, "title": "Instant Noodles",
                   "price": 4900, "quantity": 2, "image": "https://…" } ] } ],
  "message": "Checkout successful! Order placed." }
// 422: { "message": "Please select items to check out." }
// 409: { "message": "Some items are out of stock." }

// 31. GET /orders?status=active
{ "data": [ { "id": "1564132164872", "customerName": null,
              "status": "Pending", "dateOrdered": "2026-10-23", "dateReady": null,
              "claimDeadline": null, "totalPrice": 200000,
              "items": [ … ] } ] }

// 33. POST /orders/1564132164872/cancel
// 200 { "data": { "id": "…", "status": "Cancelled" }, "message": "Order #1564132164872 has been cancelled." }
// 409 { "message": "Orders can only be cancelled while Pending." }
```

#### F. Notifications (5)

| # | Method & path | Actor | Purpose / UI trigger | R |
|---|---|---|---|---|
| 34 | `GET /api/v1/notifications?category=&search=&page=` | customer | Notifications page (`notifications-section1.tsx:18-59,128-185`) | R |
| 35 | `GET /api/v1/notifications/unread-count` | customer | Header bell badge (UI missing) | R |
| 36 | `PATCH /api/v1/notifications/{id}/read` | customer | Mark read (UI missing; required for unread badge) | R |
| 37 | `POST /api/v1/notifications/read-all` | customer | Mark all read (recommended) | O |
| 38 | `GET /api/v1/notifications/categories` | customer | Sidebar category counters (`notifications-section1.tsx:61-66`) | R |

```jsonc
// 34. GET /notifications?category=Offers%20%26%20Sales
{ "data": [ { "id": 1, "title": "Flash sale",
              "description": "Up to 50% off select brands, plus 50% off all store brands.",
              "category": "Offers & Sales", "categoryKey": "offers_sales",
              "isRead": false, "createdAt": "2026-10-23T09:30:00+08:00",
              "time": "1mins ago",       // transitional; client should format from createdAt
              "type": "promo", "relatedId": null } ],
  "meta": { "currentPage": 1, "lastPage": 1, "perPage": 20, "total": 5 } }

// 35. GET /notifications/unread-count → { "data": { "unread": 3 } }
// 38. GET /notifications/categories
{ "data": [ { "name": "All", "key": "all", "count": 5 },
            { "name": "Offers & Sales", "key": "offers_sales", "count": 3 },
            { "name": "Order", "key": "order", "count": 1 },
            { "name": "System", "key": "system", "count": 1 } ] }
```

#### G. Contact (1)

| # | Method & path | Actor | Purpose / UI trigger | R |
|---|---|---|---|---|
| 39 | `POST /api/v1/contact-messages` | guest/customer | Contact form submit (`contact-us-section1.tsx:28-41`) | R |

```jsonc
// 39. POST /contact-messages
{ "fullName": "Juan Dela Cruz", "email": "juan@example.com", "phoneNumber": "09123456789",
  "subject": "Question about my order", "message": "…", "captchaToken": "…" }
// 201 { "data": { "id": 7, "status": "new" }, "message": "Your message has been sent successfully!" }
// 422: { "message": "Please verify that you are not a robot." }
```

#### H. Worker workspace (10)

| # | Method & path | Actor | Purpose / UI trigger | R |
|---|---|---|---|---|
| 40 | `GET /api/v1/worker/orders?status=&search=&page=` | worker | Orders tabs (`worker/Orders.tsx:124-140`); `status` accepts display strings or canonical keys | R |
| 41 | `GET /api/v1/worker/orders/summary` | worker | Tab counters (`worker/Orders.tsx:201-210`) | R |
| 42 | `GET /api/v1/worker/orders/{id}` | worker | View Details modal (`worker/Orders.tsx:351-359,372-437`) | R |
| 43 | `PATCH /api/v1/worker/orders/{id}/status` | worker | Order Ready / Cancel / Claimed / Didn't Claimed (`worker/Orders.tsx:307-349`) | R |
| 44 | `GET /api/v1/worker/products?category=&search=&sort=&availability=&page=` | worker | Worker product list (`WorkerProducts.tsx:28-37,88-107`) | R |
| 45 | `GET /api/v1/worker/products/{id}` | worker | View/Update modal preload (`EditProductModal.tsx:46-55`) | R |
| 46 | `POST /api/v1/worker/products` | worker | New Product (`WorkerProducts.tsx:70-79,120-127,307-315`) — multipart | R |
| 47 | `PUT /api/v1/worker/products/{id}` | worker | Update Product (`WorkerProducts.tsx:81-85`, `EditProductModal.tsx:79-104`) — multipart | R |
| 48 | `DELETE /api/v1/worker/products/{id}` | worker/admin | Delete product (UI missing) | O |
| 49 | `PATCH /api/v1/worker/products/{id}/stock` | worker | Quick stock adjust (UI missing; edit sends full product today) | O |

```jsonc
// 40. GET /worker/orders?status=Pending
{ "data": [ { "id": "1564132164872", "customerName": "Dudes Aro Inihao",
              "customerPhone": "0911324567", "status": "Pending",
              "dateOrdered": "2026-10-23", "dateOrderedLabel": "10/23/2026",
              "dateReady": null, "claimDeadline": null,
              "totalPrice": 150000, "items": [ { "id": 1, "title": "Sample Product Item",
              "price": 150000, "quantity": 1, "image": "https://…" } ] } ],
  "meta": { "currentPage": 1, "lastPage": 1, "perPage": 20, "total": 6 } }

// 41. GET /worker/orders/summary
{ "data": { "pending": 2, "ready": 1, "claimed": 1, "cancelled": 1, "didntClaimed": 1 } }

// 43. PATCH /worker/orders/1564132164872/status
{ "status": "Ready to Claim", "note": "Items gathered at counter" }
// 200 { "data": { "id": "…", "status": "Ready to Claim",
//                 "dateReady": "2026-10-23T10:00:00+08:00", "claimDeadline": "2026-10-26T10:00:00+08:00" },
//       "message": "Order marked as Ready to Claim." }
// 409 { "message": "Invalid status transition from Claimed to Pending." }

// 46. POST /worker/products (multipart)
//   name, categoryId, description, price (number or *_cents), stocks, images[] (≤3)
// 201 { "data": { "id": 9, "name": "…", "category": "Electronics", "description": "…",
//      "price": 129900, "priceLabel": "₱ 1,299", "stocks": 25, "isNew": true,
//      "images": ["https://…"] }, "message": "Successfully added \"…\" to inventory!" }

// 47. PUT /worker/products/9 (multipart, same fields; omitted images array = keep existing)
// 200 { "data": { …updated product… }, "message": "Successfully updated \"…\"!" }
```

#### I. Admin — accounts (16)

| # | Method & path | Actor | Purpose / UI trigger | R |
|---|---|---|---|---|
| 50 | `GET /api/v1/admin/accounts/summary` | admin | Tab counters (`AccountsDashboard.tsx:150-155,225-227`) | R |
| 51 | `GET /api/v1/admin/accounts/pending?search=&page=` | admin | Pending Accounts tab (`:282-315`) | R |
| 52 | `GET /api/v1/admin/accounts/pending/{id}` | admin | View ID modal (`:302-305` + `ViewIdModal.tsx`) — must return signed ID URLs | R |
| 53 | `POST /api/v1/admin/accounts/pending/{id}/accept` | admin | Accept (`:96-104,298-301`) | R |
| 54 | `POST /api/v1/admin/accounts/pending/{id}/reject` | admin | Reject (`:106-108,306-309`) | R |
| 55 | `GET /api/v1/admin/accounts/customers?search=&status=&page=` | admin | Customer Accounts tab (`:318-348`) | R |
| 56 | `GET /api/v1/admin/accounts/customers/{id}` | admin | View Details (`:335-338` + `CustomerDetailsModal.tsx`) | R |
| 57 | `POST /api/v1/admin/accounts/customers/{id}/remove` | admin | Remove / Ban (`:110-113,339-342`); body `{ "ban": true, "reason": "2 unclaimed orders" }` | R |
| 58 | `GET /api/v1/admin/accounts/workers?search=&page=` | admin | Worker Accounts tab (`:350-385`) | R |
| 59 | `GET /api/v1/admin/accounts/workers/{id}` | admin | View Details (`:368-371` + `WorkerDetailsModal.tsx`) | R |
| 60 | `POST /api/v1/admin/accounts/workers` | admin | New Worker (`:129-148,266-277` + `WorkerFormModal.tsx`) | R |
| 61 | `PUT /api/v1/admin/accounts/workers/{id}` | admin | Edit Worker (`:372-375`); blank password = unchanged | R |
| 62 | `POST /api/v1/admin/accounts/workers/{id}/remove` | admin | Remove Account (`:115-118,376-379`) | R |
| 63 | `GET /api/v1/admin/accounts/removed?type=Customer\|Worker&search=&page=` | admin | Removed Accounts tab (`:387-426`) | R |
| 64 | `POST /api/v1/admin/accounts/removed/{id}/restore` | admin | “Unremoved” (`:120-127,417-420`) | R |
| 65 | `GET /api/v1/admin/verification-documents/{userId}` | admin | Signed URL pair for View ID (alternative to embedding in #52/#56) | O |

```jsonc
// 50. GET /admin/accounts/summary
{ "data": { "pending": 2, "customers": 3, "workers": 2, "removed": 2 } }

// 51. GET /admin/accounts/pending
{ "data": [ { "id": 42, "name": "Sherwynn James Misula", "birthday": "1995-09-11",
              "birthdayLabel": "09/11/1995", "gender": "male", "genderLabel": "Real Men",
              "address": "Korea", "phone": "0911324567", "email": "sherwynn@example.com",
              "profileImage": "https://…", "idOneUrl": "https://…/id-one.jpg?sig=…",
              "idTwoUrl": "https://…/id-two.jpg?sig=…", "status": "pending",
              "submittedAt": "2026-10-20T08:00:00+08:00" } ] }

// 53. POST /admin/accounts/pending/42/accept
// 201 { "data": { "id": 42, "customerId": "676767676767", "name": "Sherwynn James Misula",
//                 "badRecords": 0, "status": "active" }, "message": "Account approved." }

// 54. POST /admin/accounts/pending/43/reject → { "reason": "Blurred IDs" }
// 200 { "message": "Registration rejected." }

// 55/56. customer object
{ "data": { "id": 42, "customerId": "676767676767", "name": "Sherwynn James Misula",
            "birthday": "1995-09-11", "gender": "male", "address": "Korea",
            "phone": "098574641", "email": "sherwynn@example.com",
            "profileImage": "https://…", "badRecords": 2, "status": "banned",
            "idOneUrl": "https://…", "idTwoUrl": "https://…",
            "createdAt": "…", "removedAt": null } }

// 57. POST /admin/accounts/customers/42/remove → { "ban": true, "reason": "2 unclaimed orders" }
// 200 { "data": { "id": 9, "type": "Customer", "account": { …customer… } }, "message": "Account banned." }

// 58/59. worker object — NOTE: never includes password
{ "data": { "id": 7, "workerId": "676767676767", "name": "Sherwynn James Misula",
            "birthday": "1995-09-11", "gender": "male", "address": "Korea",
            "phone": "098574641", "email": "worker@example.com",
            "profileImage": "https://…", "status": "active", "createdAt": "…" } }

// 60. POST /admin/accounts/workers
{ "name": "New Worker", "email": "worker2@example.com", "phone": "09123456789",
  "address": "Cordova", "birthday": "1990-01-01", "gender": "male", "password": "tempPassword1" }
// 201 { "data": { …worker with generated workerId… }, "message": "Worker account created." }

// 61. PUT /admin/accounts/workers/7 → same fields; "password": "" → leave unchanged

// 63. GET /admin/accounts/removed
{ "data": [ { "id": 11, "type": "Worker", "accountId": 5, "account": { …worker… },
              "removedAt": "2026-10-21T12:00:00+08:00", "banReason": null } ] }

// 64. POST /admin/accounts/removed/11/restore
// 200 { "data": { "id": 5, "status": "active", "type": "Worker" }, "message": "Account restored." }
```

#### J. Admin — stores (5)

| # | Method & path | Actor | Purpose / UI trigger | R |
|---|---|---|---|---|
| 66 | `GET /api/v1/admin/stores?category=&isOpen=&search=&page=` | admin | Store Dashboard list (`StoreDashboard.tsx:108-124,293-355`) | R |
| 67 | `POST /api/v1/admin/stores` | admin | New Store (`StoreDashboard.tsx:89-98,280-288`) — multipart | R |
| 68 | `GET /api/v1/admin/stores/{id}` | admin | View Store (`:331-339`) | R |
| 69 | `PUT /api/v1/admin/stores/{id}` | admin | Update Store (`:321-329`) — multipart | R |
| 70 | `DELETE /api/v1/admin/stores/{id}` | admin | Delete Store (`:100-106,341-349`) | R |

```jsonc
// 66. GET /admin/stores
{ "data": [ { "id": 1, "name": "Mang INASAL", "category": "Foods & Beverages", "categoryId": 2,
              "time": "6:00AM - 11:00PM", "hours": { "open": "06:00", "close": "23:00" },
              "phone": "0953967329", "isOpen": true,
              "image": "https://…/store.jpg", "description": "…" } ] }

// 67. POST /admin/stores (multipart)
//   name, categoryId, time (or hours), phone, isOpen, description, image(file ≤5MB)
// 201 { "data": { "id": 5, "name": "…", … }, "message": "Successfully added \"…\"!" }

// 70. DELETE /admin/stores/5 → 204 (or 409 if the store has active orders / products)
```

#### K. Admin — sales & reports (4)

| # | Method & path | Actor | Purpose / UI trigger | R |
|---|---|---|---|---|
| 71 | `GET /api/v1/admin/sales/summary?month=YYYY-MM` | admin | Dashboard KPI cards (`Sales.tsx:107-110,217-246`) | R |
| 72 | `GET /api/v1/admin/sales/orders?date=YYYY-MM-DD&status=` | admin | Date-stepped daily report (`Sales.tsx:87-105,180-208,249-303`) | R |
| 73 | `GET /api/v1/admin/sales/orders/{id}` | admin | Order details modal (`Sales.tsx:256-301` + `AdminOrderDetailsModal.tsx`) | R |
| 74 | `GET /api/v1/admin/sales/chart?from=&to=&groupBy=day\|month` | admin | Revenue/cancellations/unclaimed time series (no chart exists yet) | O |

```jsonc
// 71. GET /admin/sales/summary?month=2026-10
{ "data": { "month": "2026-10", "totalRevenue": 720000, "totalRevenueLabel": "₱ 7,200",
            "cancelledCount": 2, "cancelledTotal": 200000,
            "unclaimedCount": 2, "unclaimedTotal": 360000,
            "ordersCount": 7, "currency": "PHP" } }

// 72. GET /admin/sales/orders?date=2026-10-22&status=Claimed
{ "data": [ { "id": "1564132164872", "customerName": "Dudes Aro Inihao",
              "status": "Claimed", "dateOrdered": "2026-10-22",
              "totalPrice": 150000, "items": [ … ] } ],
  "meta": { "date": "2026-10-22", "revenue": 400000, "count": 2,
            "currentPage": 1, "lastPage": 1, "perPage": 20, "total": 2 } }

// 74. GET /admin/sales/chart?from=2026-10-01&to=2026-10-31&groupBy=day
{ "data": [ { "date": "2026-10-22", "revenue": 400000, "cancelled": 120000, "unclaimed": 150000 } ] }
```

#### L. Admin — contact inbox & aggregate KPIs (3, optional)

| # | Method & path | Actor | Purpose | R |
|---|---|---|---|---|
| 75 | `GET /api/v1/admin/contact-messages?status=&search=&page=` | admin | Contact-message inbox (no UI screen exists yet) | O |
| 76 | `PATCH /api/v1/admin/contact-messages/{id}` | admin | Set status `read/replied/closed` | O |
| 77 | `GET /api/v1/admin/dashboard/kpis` | admin | Combined dashboard payload (revenue + pending + unclaimed + bad-record accounts) | O |

### 7.5 Role/authorization matrix

| Route group | guest | customer | worker | admin |
|---|---|---|---|---|
| `GET /products*`, `GET /stores*`, `GET /categories`, `GET /site/*`, `GET /faqs`, `GET /home` | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/verify-reset-code`, `/auth/reset-password`, `POST /contact-messages` | ✅ | ✅ | ✅ | ✅ |
| `/auth/me`, `/auth/logout` | ❌ (401) | ✅ | ✅ | ✅ |
| `/profile*` | ❌ | ✅ | ❌ | ❌ |
| `/cart*`, `/orders*` (customer) | ❌ (redirect to login) | ✅ | ❌ | ❌ |
| `/notifications*` | ❌ | ✅ | ❌ | ❌ |
| `/worker/*` | ❌ | ❌ (403) | ✅ | ✅ (recommended) |
| `/admin/*` | ❌ | ❌ | ❌ | ✅ |

Middleware suggestion: `auth:sanctum` + `role:...`; customer-only routes additionally check `status === 'active'`
(pending/removed/banned ⇒ 403 with the message shown in the login response).

### 7.6 Server-side jobs, observers & notifications

| Job / hook | Trigger | Behavior |
|---|---|---|
| `ExpireUnclaimedOrders` (scheduled hourly/daily) | `orders.status = Ready to Claim` and `claim_deadline < now` | status → `Didn't Claimed`, `didnt_claimed_at = now`, `bad_record_applied = true`, `users.bad_records_count += 1`, create `bad_record` row, notification; if count ≥ 2 → `status = banned`, notification; all in one transaction |
| `OnOrderStatusChanged` observer | worker `PATCH status` | create notification for the order owner (`order` category, title like “Order”, description like “order pending” / “ready to claim” / “claimed” / “didn't claimed” matching §4.14 style), write `order_status_history` |
| `OnRegistrationSubmitted` | register | create pending user + docs; notify admins (email/in-app) |
| `OnRegistrationAccepted` | admin accept | assign unique `customer_id` (12 digits), status `active`, notification to customer, optional login credentials email |
| `OnAccountBanned` | bad records ≥ 2 / manual ban | revoke tokens, notification, keep record in removed/banned list for restore |
| `CheckoutCompleted` | checkout | decrement stock, snapshot product name/price/image into `order_items`, clear selected cart items, create `Pending` order(s) + notification. If cart spans multiple stores, split into one order per store (decide — see §7.8 #5) |
| `SendPasswordResetCode` | forgot password | generate 6-digit code, 10-min expiry, send email (or SMS), throttle |
| `RateLimiter` | login/register/forgot/contact | 5–10 attempts/min/IP |

### 7.7 Seeder plan (map directly to §4)

| Seeder | Data source | Notes |
|---|---|---|
| `CategorySeeder` | §4.4 + §2.12 taxonomy | product categories with parents (`Electronics` → `Audio`, `Wearables`; `Fashion & Apparel` → `Footwear`, `Men's Wear`; `Home & Living` → `Kitchen`; `Bags` → `Accessories`), plus 11 store categories |
| `AdminUserSeeder` | new | 1 admin (`admin@onlinemall.test` / known password) since no admin exists in the UI |
| `WorkerSeeder` | §4.11 workers + §1.8 form fields | 2 workers with `worker_id` codes, known password, profile images |
| `CustomerSeeder` | §4.11 pending/customers/removed | 2 pending + 3 active customers (unique `customer_id`s, real-looking emails) + 1 banned + 1 removed; distribute `bad_records_count` 0/1/2 to demo Ban label |
| `StoreSeeder` | §4.6 (9 stores) + §4.12 (4 admin stores) | merge into one realistic set (fix duplicate names/spellings), add images/hours/phone; seed 5 gallery images for at least McDonald's for the detail page |
| `ProductSeeder` | §4.2 (12) + §4.10 (worker 8) | merge: same 8-12 products; add `compare_at_price` for Wireless Earbuds (`₱1,999`), `discount 35%`, `is_new` flags, stock counts, 5 images + 4 highlights for Wireless Earbuds (§4.3) |
| `HomeContentSeeder` | §4.1/§4.5/§4.19 | featured flag, category images, hero card content if you model it |
| `OrderSeeder` | §4.8, §4.9, §4.13 | ~12 orders across all 5 statuses and dates 10/20–10/24/2026; customer side and admin side consistent (same orders), correct `total_cents` (do **not** reproduce 1500-vs-1200 bug — compute from items); include `ready_at`/`claim_deadline` for Ready to Claim rows |
| `NotificationSeeder` | §4.14 | 5 notifications, mix of read/unread, correct `created_at` so “1mins ago”/“10/5/26” render similarly |
| `ContactMessageSeeder` | new | 2–3 messages `new/read` for the optional inbox |
| `FaqSeeder` | §4.17 | 6 rows |
| `SiteSettingSeeder` | §4.16 | mall name/address/phone/email/hours/map/socials |
| `AboutContentSeeder` | §4.18 | optional (mission/vision/values/why-shop cards/stats) |

All seeders should be idempotent (`updateOrCreate` on natural keys: `slug`, `email`, `order_code`) and must run inside
`DatabaseSeeder::run()` after migrations.

### 7.8 Decisions the Lead/backend must confirm (blocking ambiguities)

1. **Money representation** — integer centavos (recommended for correctness) vs decimal pesos; the transitional
   `*Label` strings keep the current components rendering unchanged.
2. **JSON casing** — camelCase (matches 100 % of current client code) vs snake_case (requires touching ~40
   components). Recommend camelCase via API Resources.
3. **ID strategy** — integer PKs + separate display codes (`customerId`, `workerId`, `orderCode`) vs ULIDs. Cart/order
   handler signatures are numeric today (`CartCard.tsx:14-17`), so either return integers or update the TS types.
4. **Role storage** — single `users` table with `role` (recommended) vs separate `customers`/`workers`/`admins`
   tables. Pending registrations: `users.status=pending` vs a separate `registration_submissions` table
   (recommended if ID-review data must be kept after rejection).
5. **Multi-store carts** — cart currently has no store relation and an order has one implicit store. Split checkout
   into one order per store (recommended) or block mixed carts; the UI has no store grouping today.
6. **Auth screens missing** — decide: one `/login` with role-based redirect (recommended), or add
   `/admin/login` + `/worker/login`. Worker/admin credentials: email or phone (same as customers)?
7. **Exact enum strings** — keep `"Didn't Claimed"` (with typo) as the wire value for compatibility (recommended;
   display-label mapping can come later) or rename to `"Did Not Claim"` / `didnt_claimed` keys and update the 10+
   UI occurrences.
8. **Gender values** — normalize (`male/female/other/prefer_not_to_say`) + `genderLabel` for the current labels, or
   store the UI strings verbatim.
9. **`price`/`stocks` field aliases** — catalog uses `stockCount` + string `price`; worker uses `stocks` + numeric
   `price`. Decide one canonical set (`stockCount`, numeric `price`) and update worker components.
10. **Claim policy timing** — is the 3-day timer from `ready_at` (recommended, per FAQ) and does the job run hourly?
    Who is allowed to mark “Didn't Claimed” manually vs automatically?
11. **Stock on order placement** — decrement at checkout (risk of abandoned orders) or at “Ready to Claim”? UI copy
    implies stock visibility but not reservation semantics.
12. **Contact message handling** — inbox screen is missing; confirm whether an admin screen is in scope.
13. **Terms/Privacy content** — provide copy + routes or remove the links.
14. **CAPTCHA** — real provider (reCAPTCHA/hCaptcha) vs honeypot; the UI is a fake checkbox.

---

## 8. Appendices

### 8.1 Canonical category taxonomy (for `CategorySeeder`)

Top-level product & store categories (the 12-item filter lists, `products-section1.tsx:40-53`,
`stores-section1.tsx:35-48`). The home carousel (§4.4) is a subset of 8 of these.

| # | name (canonical) | slug | parent | Notes |
|---|---|---|---|---|
| 1 | Foods & Beverages | `foods-beverages` | — | one form uses “Foods & Beverage” (`AddNewProductModal.tsx:21`) — canonicalize |
| 2 | Electronics | `electronics` | — | has children in product data |
| 2a | Audio | `audio` | Electronics | renders as “Electronics - Audio” |
| 2b | Wearables | `wearables` | Electronics | renders as “Electronics - Wearables” |
| 3 | Beauty & Personal Care | `beauty-personal-care` | — | — |
| 4 | Home & Living | `home-living` | — | — |
| 4a | Kitchen | `kitchen` | Home & Living | renders as “Home & Living - Kitchen” |
| 5 | Health & Wellness | `health-wellness` | — | — |
| 6 | Toys & Games | `toys-games` | — | — |
| 7 | Sports & Outdoors | `sports-outdoors` | — | — |
| 8 | Books & Stationery | `books-stationery` | — | — |
| 9 | Fashion & Apparel | `fashion-apparel` | — | — |
| 9a | Footwear | `footwear` | Fashion & Apparel | renders as “Fashion - Footwear” |
| 9b | Men's Wear | `mens-wear` | Fashion & Apparel | renders as “Fashion - Men's Wear” |
| 10 | Computer & Accessories | `computer-accessories` | — | — |
| 11 | Others | `others` | — | — |
| 12 | Bags | `bags` | — (or under Fashion & Apparel) | **only appears in product data** as “Bags - Accessories” (`products-section1.tsx:28`); no filter entry — decide placement |
| — | All Products / All Stores | — | — | UI-only pseudo-category, do **not** seed |

Store categories reuse the same table (12 mocks use Foods & Beverages, Beauty & Personal Care, Others, Fashion &
Apparel). Store-category CRUD is not implemented in the admin UI (category select only).

### 8.2 Page/route → endpoint map (rewiring quick reference)

| Frontend route | Initial load endpoints | Mutations allowed from this page |
|---|---|---|
| `/` (customer Home), `/guest/` | #9, #11, #13 (or #18 aggregate) | #25 add-to-cart |
| `/products`, `/guest/products` | #9, #10 | #25 |
| `/products/:id`, `/guest/products/:id` | #12 | #25, #30 buy-now |
| `/stores`, `/guest/stores` | #9 (store type), #13 | — |
| `/stores/:id`, `/guest/stores/:id` | #14 | — |
| `/login` | — | #2 |
| `/register` | — | #1 |
| `/forgot-password` | — | #5, #6, #7 |
| `/notifications` | #34, #38 | #36, #37 |
| `/profile` | #19 | #20, #21, #22 |
| `/cart` (Cart tab) | #24 | #25, #26, #27, #28 |
| `/cart` (Orders/History tabs) | #31 | #33 |
| `/about`, `/contact` | #16, #17 | #39 |
| `/worker/orders` | #40, #41 | #43 |
| `/worker/products` | #44 | #46, #47, #48, #49 |
| `/admin/accounts` | #50, #51, #55, #58, #63 | #53, #54, #57, #60, #61, #62, #64 |
| `/admin/stores` | #66 | #67, #69, #70 |
| `/admin/sales` | #71, #72 | — |

### 8.3 Frontend rewiring checklist (what must change in `src/` once the API exists)

1. Create the HTTP layer (`src/lib/axios.ts` is empty): base URL, Bearer/cookie auth, camelCase assumption, 401/403
   handling, error-message extraction.
2. Add an `AuthContext` + `ProtectedRoute` (roles customer/worker/admin) and a role-based redirect after login;
   store token/session; wire `rememberMe`.
3. Add `/logout` route/handler calling `POST /auth/logout`; replace the 6 dead links.
4. Add `/terms`, `/privacy` (or remove links) and the OTP/reset-password screens.
5. Replace every mock array with server state + loading skeletons + error/retry UI (see §6.2/§6.4 list).
6. Remove client-only filters/sorts and send the query params from §5.8 (server-side filtering/pagination).
7. Fix the number/string and id/type mismatches from §5.4 (price formatting helper, `formatPeso`, `formatDate`,
   canonical integer/string ids) before or alongside the swap.
8. Replace `URL.createObjectURL` uploads with multipart uploads and render returned URLs.
9. Wire notification read state + unread badge, cart count badge in headers, and the search inputs (product search and
   list search).
10. Move admin/worker list mutations to the endpoints in §7.4, including optimistic-update rollback.
11. Replace the fake reCAPTCHA with the real token; add 18+ server error display and per-field errors.
12. Fix the label typos in §6.5 **only after** the enum/field contract is agreed (the strings are persisted values in
    the mock; renaming them requires backend mapping).
13. Remove the orphan `AddNewProductModal` or use it for create mode, and stop reusing `EditProductModal` with
    `mode="update"` for creation (`WorkerProducts.tsx:120-127`).
14. Replace the `4.7 (76)` hardcoded rating and the “Date to Claim: +3” placeholder with real fields (§6.6/§6.7).

### 8.4 Endpoint count summary

| Group | Count | Required | Optional |
|---|---|---|---|
| A. Auth & session | 8 | 7 | 1 (#8) |
| B. Public catalog & site | 10 | 7 | 3 (#15, #17, #18) |
| C. Customer profile | 5 | 4 | 1 (#23) |
| D. Cart | 6 | 5 | 1 (#29) |
| E. Customer orders | 4 | 4 | 0 |
| F. Notifications | 5 | 4 | 1 (#37) |
| G. Contact | 1 | 1 | 0 |
| H. Worker | 10 | 8 | 2 (#48, #49) |
| I. Admin accounts | 16 | 15 | 1 (#65) |
| J. Admin stores | 5 | 5 | 0 |
| K. Admin sales | 4 | 3 | 1 (#74) |
| L. Admin contact/KPIs | 3 | 0 | 3 (#75–#77) |
| **Total** | **77** | **63** | **14** |

> The authoritative route surface (`BACKEND_ARCHITECTURE.md` §5) is **56 routes** (it consolidates several of the
> per-tab/per-action entries above, e.g. one `GET /admin/accounts?tab=…` instead of four list endpoints, and folds
> featured-products/notification-counts/order-details into composite responses). §9.6 maps every catalogue entry above
> to its authoritative route.

### 8.5 Verification notes & assumptions

- **Read scope:** all 81 TypeScript/TSX files under `src/` (79 `.tsx` + 2 `.ts`, 12,119 lines) plus
  `src/styles/global.css`, `index.html`, `package.json`, `README.md`. The 14 guest/customer duplicate components were
  hash-compared (SHA-256) and confirmed byte-identical; `pages/customer/SingleProduct.tsx` and
  `pages/customer/SingleStore.tsx` differ from the guest versions only in the exported function name.
- **Line numbers** refer to the repository state at read time (this dossier's turn). They are 1-based.
- **No frontend or backend files were modified.** The only file created is `docs/FRONTEND_CONTRACT.md` (this
  document). `backend/` was not touched. `docs/BACKEND_ARCHITECTURE.md` was read (not modified) for §9.
- **Mock values are transcribed verbatim**, including typos, duplicate ids, invalid emails and price/total
  inconsistencies — those are flagged rather than corrected (§6.5, §6.6).
- **Where the UI is ambiguous** (number vs string, enum spellings, money representation, id types), §5.4 and §7.8
  record both the current assumption and the recommended decision, because the backend cannot be built correctly
  without those being fixed. §9 records the final authoritative resolution.
- Order statuses are **snake_case enum keys on the wire** (`pending|ready|claimed|cancelled|not_claimed`) and
  **display strings in the components** (`"Pending"`, `"Ready to Claim"`, `"Claimed"`, `"Cancelled"`,
  `"Didn't Claimed"`); the mapping layer (§9.3) is mandatory.

---

## 9. Reconciliation with `docs/BACKEND_ARCHITECTURE.md` (authoritative) — binding

This section was added after the Lead published [`docs/BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md)
("ARCH" below). **ARCH is authoritative** for the backend and wire format; this document is authoritative for *what the
UI needs*. Everything below is what the frontend rewiring must implement so that the two meet. If anything in §5/§7
conflicts with ARCH, **ARCH wins** and this section describes the resulting UI-side work.

### 9.1 Transport & auth deltas

| Topic | Current UI | Authoritative (ARCH) | Frontend work |
|---|---|---|---|
| HTTP client | `src/lib/axios.ts` empty; no env | Vite proxy `/api`, `/sanctum`, `/storage` → `127.0.0.1:8000`; `VITE_API_BASE=/api` | Create `src/lib/api.ts` (axios/fetch wrapper, base `/api`, `withCredentials: true`, CSRF) |
| Auth mechanism | none; local `rememberMe` | Sanctum **SPA cookie** flow: `GET /sanctum/csrf-cookie` → `POST /api/auth/login`; HttpOnly session; DB sessions; 120-min lifetime | `AuthContext` bootstrap via `GET /api/auth/me`; no token storage; `remember` forwarded |
| Login payload | `{ emailOrPhone, password, rememberMe }` | `{ login, password, remember }` (login = email **or** phone) | Map in `api.ts`; keep the “Email or Phone Number” label |
| Login errors | nothing | 403 `{message, code}` with `code = account_pending\|account_removed\|account_banned`; 401 `{message}` | Render `message`; redirect based on `user.role` (customer `/`, worker `/worker/orders`, admin `/admin/accounts`) |
| Register payload | `fullName, email, phoneNumber, address, birthday, password, confirmPassword, idOne, idTwo, agreeTerms` (+ unwired photo) | multipart `name, email, phone, address, birthday, gender?, password, password_confirmation, profile_photo?, id_front, id_back, agree_terms` | Rename fields in the submit; wire the profile-picture input; show server 422 per-field |
| Password policy | no hint | min 12 chars, mixed case + numbers, bcrypt 12 | Add hint + client validation in Register/Change Password |
| Logout | dead `/logout` link | `POST /api/auth/logout` → 204 | Add handler + `/logout` route or button onClick; redirect `/login` |
| Forgot / reset | OTP-style “Verification Code Sent!” card only; no reset screen | Laravel password broker: `POST /api/auth/forgot-password {email}` (always 200, email link) → `POST /api/auth/reset-password {token,email,password,password_confirmation}` | **UI change required:** either build a reset-password screen reading `token` from the email link URL, or ask backend-auth to add a code-verify endpoint. Phone-based reset is not in ARCH (UI allows phone → mismatch to resolve) |
| `/auth/me` | missing | `GET /api/auth/me` (401 when anon) | Route guard + role checks |
| Pending users | no login exists | pending users get 403 `account_pending` | Show message; no session |
| ID documents | `ViewIdModal` takes `idOneUrl`/`idTwoUrl` | `GET /api/admin/accounts/{user}/id-documents` (metadata + 2 authorized download URLs); owner/admin only; private disk | Pass the two URLs into `ViewIdModal` (same-origin cookie authorises the request); never expect public URLs |
| Profile endpoints | local state | `GET /api/profile`, `PATCH /api/profile`, `PATCH /api/profile/password`, `POST /api/profile/avatar` (`avatar` ≤2 MB), `GET /api/profile/id-documents/{document}` | Map “Edit Profile” → PATCH; “Change Password” → PATCH password; avatar upload new |
| Profile editability | all fields editable | ARCH PATCH allows `name, phone, address, gender, birthday` | Conflicts with FAQ “name/birthday immutable” — product decision needed (recommend backend reject name/birthday once active, UI shows read-only) |
| Session revocation | n/a | status change (removed/banned) revokes sessions | UI must handle 401/403 mid-session by redirecting to login |

### 9.2 Field mapping (authoritative snake_case → UI camelCase)

**User / account** (`users` table + resources)

| UI field (type) | API field | Conversion / notes |
|---|---|---|
| `id` (`string` in Accounts mocks) | `id` (integer) | type becomes `number`; only used as key |
| `customerId` (`string`, 12 digits) | `customer_no` | string, 12 digits; accounts UI labels “Customer ID” |
| `workerId` (`string`, 12 digits) | `worker_no` | string, 12 digits |
| `name` / `fullName` | `name` | UI has both spellings; standardise on `name` |
| `email`, `phone`, `address` | same (`email`, `phone`, `address`) | — |
| `gender` (free text) | `gender` (free text) | keep UI values “Real Men” / “Gender Neutral” / “Female” |
| `birthday` (`MM/DD/YYYY`) | `birthday` (`YYYY-MM-DD`) | format for display; parse ISO for 18+ check |
| `profileImage` (URL) | resource-generated `profile_photo_url` (TBD key with backend-auth) | ARCH stores `profile_photo_path`; confirm serializer key |
| `badRecords` (`number`) | `bad_records` | integer; `{badRecords}/2` badge unchanged |
| status (not shown) | `status` (`pending\|active\|rejected\|removed\|banned`) | drives Pending/Customer/Worker/Removed tabs |
| `password` | **never returned** | remove the WorkerDetailsModal password reveal |
| ID URLs | `id_documents` metadata / `id-documents` endpoint | metadata `type` is `id_front\|id_back` (not `idOne/idTwo`) |

**Product**

| UI field (type) | API field | Conversion / notes |
|---|---|---|
| `id` (`number`) | `id` (integer) | — |
| `name`, `category`, `isNew`, `inStock`, `stockCount`, `image`, `path` | `name`, `category.display_name`, `is_new`, `in_stock` (computed from `stock`), `stock`, `image_path`, `slug` | `path` = `/products/{slug}` |
| `price` (**string** `"₱ 1,299"`) | `price` (number `1299.00`) | **breaking change** → `formatPeso(product.price)`; sorting moves server-side (`sort=price_asc\|price_desc`) |
| `originalPrice` (string) | `original_price` (number) | format client-side |
| `discount` (`"-35%"`) | none in ARCH | compute from `price`/`original_price` client-side or ask catalog for a `discount_percent` accessor |
| `shortDescription` / `description` | `description` | UI uses both; map detail `shortDescription` ← `description`, `detailedHighlights` ← `product_highlights[]` |
| `detailedHighlights[].text` | `product_highlights[].body` | rename field in render |
| `images[]` | `images[]` (paths from `product_images`) | absolute URLs via resource; max 3 |
| `stocks` (worker, `number`) | `stock` | rename in `WorkerProduct` type + form field label |
| `rating` (`4.7 (76)` hardcoded) | none | remove the fake rating from `WorkerProductCard` |
| `store` (not shown today) | `store{name,slug}` in product detail | optionally show “Sold by” on detail page |

**Store**

| UI field | API field | Conversion |
|---|---|---|
| `id`, `name`, `phone`, `description`, `image` | `id`, `name`, `phone`, `description`, `image_path` | — |
| `time` (`"6:00AM - 11:00PM"`) | `operating_hours` | direct string |
| `isOpen` (boolean) / `availability` (`"Open"\|"Close"`) / `status` (`"Open"\|"Close"`) | `is_open` (boolean) | derive labels from the boolean; delete the 3-way mismatch (§5.4 #16) |
| `category` (string) | `category.display_name` / `category.name` | — |
| `path` (`"/stores/{slug}"`) | `slug` | `/stores/{slug}` |
| `title` (detail) | `name` | alias in mapping |
| `images[]` (5) | `store_images[]` | absolute URLs |
| `detailedHighlights[].text` | `store_highlights[].body` | rename |
| admin modal `time` | `operating_hours` | create/update form field |
| — (new) | `floor_location` | add an optional “Mall Floor / Location” input to `AdminStoreModal` (backs §2.5 mall floor requirement) |

**Cart**

| UI field | API field | Conversion |
|---|---|---|
| `id` (`number`) | `cart_items.id` (integer) | keep numeric handlers |
| `title` | `product.name` | resource joins product |
| `price` (`number`) | `product.price` (unit) | number |
| `quantity`, `selected` | `quantity`, `is_selected` | rename `selected` → `is_selected` in payload |
| `image` | product image URL | — |
| `selectedCount`, `totalPrice`, `itemCount` (computed in UI) | `summary.selected_count`, `summary.total`, `summary.item_count` | use server totals; stop computing |
| checkout selection | `POST /api/checkout { item_ids?: [], select_all?: bool }` | UI sends selected ids |

**Order**

| UI field | API field | Conversion |
|---|---|---|
| `id` (**string**, e.g. `"1564132164872"`) | `order_number` (string) | keep string (worker search uses `.includes` → move search server-side later) |
| `customerName` (worker/admin only) | `customer.name` (worker list includes `customer{name,phone}`) or `user.name` | map |
| `status` (display strings) | `status` (`pending\|ready\|claimed\|cancelled\|not_claimed`) | see §9.3 |
| `dateOrdered` (`MM/DD/YYYY`) | `created_at` (ISO) | `formatDate` |
| `dateReady` (declared, unused) | `ready_at` | can now display |
| `claimDeadline` (new) | `claim_deadline` | display real “Date to Claim” instead of hardcoded “+3” |
| `totalPrice` (`number`) | `total` (number) | formatPeso |
| `items[].id` | `order_items.id` | number |
| `items[].title` | `order_items.product_name` | — |
| `items[].price` | `order_items.unit_price` | number |
| `items[].quantity` | `quantity` | — |
| `items[].image` | `image_path` (snapshot) | URL |
| pickup/store info (missing in UI) | `pickup_location` (string, default “Online Mall Cordova - Pickup Counter”) | add to `OrderCard`/details modal |
| — | `payment_method` (`pay_at_mall`), `payment_status` (`unpaid`/`paid`) | optional display “Pay at the mall” |

**Notification**

| UI field | API field | Conversion |
|---|---|---|
| `id`, `title` | `id`, `title` | — |
| `description` | `body` | rename |
| `category` (`"Offers & Sales"\|"Order"\|"System"`) | `category` (`offers\|order\|system`) | map both ways (§9.3) |
| `time` (`"1mins ago"`, `"10/5/26"`) | `created_at` (ISO) | `formatRelative(created_at)` |
| `icon` (ReactNode) | none | client maps `category` → lucide icon (Tag/Package/Megaphone) |
| unread state (absent) | `read_at` (`null` = unread) | add unread dot + badge |
| category counters (hardcoded) | response `counts{all,offers,order,system}`, `unread` | use server counts |

**Contact message**

| UI field | API field |
|---|---|
| `fullName` | `name` |
| `email` | `email` |
| `phoneNumber` | `phone` |
| `subject`, `message` | same |
| fake reCAPTCHA checkbox | **not supported**; ARCH uses a hidden honeypot `website` field + throttle 3/h — remove the fake captcha UI or keep it purely visual and send `website: ""` |

**Admin sales**

| UI label | API field |
|---|---|
| Total Revenue (Monthly) | `revenue` |
| Total Cancelled Orders | `cancelled_count` (`cancelled_total` for amount) |
| Total Didn't Claimed | `not_claimed_count` (`not_claimed_total`) |
| Date header | `date` |
| Complete/Cancelled/Didn't Claimed rows | `orders[]` (same order shape) |
| no chart | no chart endpoint in ARCH |

### 9.3 Enum / status mapping (UI ↔ API)

**Order status** — UI display string ↔ wire value:

| UI display string | Wire value (send/receive) | Worker PATCH sends |
|---|---|---|
| `"Pending"` | `pending` | — (entry state) |
| `"Ready to Claim"` | `ready` | `{status:"ready"}` |
| `"Claimed"` | `claimed` | `{status:"claimed"}` |
| `"Cancelled"` | `cancelled` | `{status:"cancelled"}` |
| `"Didn't Claimed"` | `not_claimed` | `{status:"not_claimed"}` |

Worker status is sent on `PATCH /api/worker/orders/{order}/status` with `status` ∈ `ready|claimed|not_claimed|cancelled`;
side effects per §7.3/ARCH §5 (timestamps, stock restore on cancel/not_claimed, `bad_records++`/auto-ban on
`not_claimed`, notification).

**Account status** (never rendered as a raw string today; tabs derive from it):

| Wire value | UI meaning / tab |
|---|---|
| `pending` | Pending Accounts |
| `active` | Customer Accounts / Worker Accounts |
| `rejected` | not listed (rejected registrations disappear) |
| `removed` | Removed Accounts |
| `banned` | Removed Accounts + “Ban Account” label on card |

**Notification category**: wire `offers` → UI `"Offers & Sales"`; `order` → `"Order"`; `system` → `"System"`.
**Contact message status**: `new`, `read`, `replied` (no `closed` in ARCH).
**Gender**: stored verbatim as UI strings — no mapping.
**Store open state**: `is_open` boolean → UI renders “Open”/“Close” labels and `availability` badge from it.

### 9.4 Formatting / id / date mapping (final)

| Concern | Rule |
|---|---|
| Money | API number `1299.00`; one helper `formatPeso(n)` used everywhere. Decide display: `₱ 1,299` (current catalog style) vs `₱ 1,299.00`; recommend `maximumFractionDigits: n % 1 === 0 ? 0 : 2` to match existing visuals |
| Dates | API ISO-8601; helper `formatDate(iso)` → `m/d/Y`; `formatRelative(iso)` for notifications; admin sales date stepper requests `date=YYYY-MM-DD` while displaying `m/d/Y` |
| Order id | `order.id` = `order_number` **string** (required by `.includes` search; keep `string` in TS) |
| Account codes | `customerId` ← `customer_no`, `workerId` ← `worker_no` (strings) |
| Internal ids | integers (`id`); cart item ids stay numbers so `Cart.tsx`/`CartCard.tsx` handler signatures need no change |
| Pagination meta | API `{current_page,last_page,per_page,total}` → map to `{page,lastPage,perPage,total}` if desired |
| Percent discount | not stored by ARCH → compute client-side `Math.round((1 - price/original_price) * 100)` |
| Image URLs | API returns absolute URLs (external seed URLs stored as-is; uploads `/storage/...`) — drop all hardcoded fallback Unsplash URLs |
| Count labels | “Showing Results (12)”, tab counters, cart badge, unread bell → server `meta.total` / response `counts` / `unread` |

### 9.5 Query-parameter mapping (UI filter → authoritative param)

| UI filter | Local logic today | Authoritative param |
|---|---|---|
| Product category | `category.includes(firstWord)` | `category={slug}` |
| Product price sort | string parse + sort | `sort=price_asc\|price_desc` |
| Product availability | `inStockOnly` / `outOfStockOnly` | `in_stock=1` / `out_of_stock=1` |
| Store category | includes first word | `category={slug}` |
| Store All/Open Now/Closed | `allStoreCheck/openNowCheck/closedCheck` | `open=1` / `closed=1` (omit for all) |
| Worker order tab | client status mapping | `status=pending\|ready\|claimed\|cancelled\|not_claimed` |
| Worker order search | name/id/date `.includes` | `search=` (customer name / order_number) |
| Worker product sort/availability | local | `sort=`, `in_stock=`, `search=`, `category=` |
| Admin account tab | `activeTab` | `tab=pending\|customer\|worker\|removed&search=` |
| Admin sales date/status | hardcoded date cycle | `date=YYYY-MM-DD&status=claimed\|cancelled\|not_claimed\|all` |
| Notifications category/search | local | `category=offers\|order\|system&search=` |

### 9.6 Endpoint equivalence map (§7.4 catalogue → authoritative routes)

| # | §7.4 proposed path | Authoritative (ARCH §5) | Delta / UI action |
|---|---|---|---|
| 1 | `POST /api/v1/auth/register` | `POST /api/auth/register` | multipart field names differ (§9.1) |
| 2 | `POST /api/v1/auth/login` | `POST /api/auth/login` | `{login,password,remember}` |
| 3 | `POST /api/v1/auth/logout` | `POST /api/auth/logout` | 204 |
| 4 | `GET /api/v1/auth/me` | `GET /api/auth/me` | — |
| 5 | `POST .../forgot-password` | `POST /api/auth/forgot-password` | `{email}` only; no phone |
| 6 | `POST .../verify-reset-code` | **not in ARCH** | OTP screen must change or backend adds endpoint |
| 7 | `POST .../reset-password` | `POST /api/auth/reset-password` | `{token,email,password,password_confirmation}` |
| 8 | `POST .../resend-code` | **not in ARCH** | drop |
| 9 | `GET .../categories` | `GET /api/categories?type=` | — |
| 10 | `GET .../products` | `GET /api/products` | params per §9.5 |
| 11 | `GET .../products/featured` | **folded into `GET /api/home`** (`featured_products[]`) | home page uses `/home` |
| 12 | `GET .../products/{slug}` | `GET /api/products/{slug}` | — |
| 13 | `GET .../stores` | `GET /api/stores` | — |
| 14 | `GET .../stores/{slug}` | `GET /api/stores/{slug}` | response also includes products |
| 15 | `GET .../stores/{slug}/products` | folded into #14 | — |
| 16 | `GET .../site/mall-info` | **not in ARCH** | keep mall info hardcoded (or request endpoint) |
| 17 | `GET .../faqs` | **not in ARCH** | keep FAQs hardcoded |
| 18 | `GET .../home` | `GET /api/home` | returns `new_arrivals[], featured_products[], stores[], stats{}`; categories still from #9 |
| 19 | `GET .../profile` | `GET /api/profile` | includes `id_documents` meta |
| 20 | `PATCH .../profile` | `PATCH /api/profile` | field set per §9.1 |
| 21 | `PUT .../profile/password` | `PATCH /api/profile/password` | snake_case body fields |
| 22 | `POST .../profile/photo` | `POST /api/profile/avatar` | field `avatar`, ≤2 MB |
| 23 | `GET .../profile/bad-records` | included in profile (`bad_records`) | — |
| 24 | `GET .../cart` | `GET /api/cart` | `{items, summary{selected_count,total,item_count}}` |
| 25 | `POST .../cart/items` | `POST /api/cart/items` | `{product_id, quantity}` upsert |
| 26 | `PATCH .../cart/items/{id}` | `PATCH /api/cart/items/{item}` | `{quantity?, is_selected?}` |
| 27 | `PATCH .../cart/items/select-all` | **not in ARCH** | loop #26 for each item or add endpoint |
| 28 | `DELETE .../cart/items/{id}` | `DELETE /api/cart/items/{item}` | 204 |
| 29 | `DELETE .../cart` | `DELETE /api/cart/items` (`?selected=1`) | — |
| 30 | `POST .../orders/checkout` | `POST /api/checkout` | `{item_ids?, select_all?}`; 409 codes |
| 31 | `GET .../orders?status=` | `GET /api/orders?status=active\|history\|...` | envelope incl. items |
| 32 | `GET .../orders/{id}` | `GET /api/orders/{order}` | own order only |
| 33 | `POST .../orders/{id}/cancel` | `PATCH /api/orders/{order}/cancel` | method changed |
| 34 | `GET .../notifications` | `GET /api/notifications` | returns `data[]` + `counts` + `unread` |
| 35 | `GET .../notifications/unread-count` | included in #34 (`unread`) | lightweight call `per_page=1` for header badge |
| 36 | `PATCH .../notifications/{id}/read` | `PATCH /api/notifications/{notification}/read` | — |
| 37 | `POST .../notifications/read-all` | `POST /api/notifications/read-all` | — |
| 38 | `GET .../notifications/categories` | included in #34 (`counts`) | — |
| 39 | `POST .../contact-messages` | `POST /api/contact` | honeypot `website`; throttle 3/h |
| 40 | `GET .../worker/orders` | `GET /api/worker/orders` | `status=pending\|ready\|...`; includes `customer{name,phone}` |
| 41 | `GET .../worker/orders/summary` | **not in ARCH** | compute counts from per-tab list calls or request `counts` in response |
| 42 | `GET .../worker/orders/{id}` | `GET /api/worker/orders/{order}` | — |
| 43 | `PATCH .../worker/orders/{id}/status` | `PATCH /api/worker/orders/{order}/status` | body `{status: ready\|claimed\|not_claimed\|cancelled}` |
| 44 | `GET .../worker/products` | `GET /api/worker/products` | — |
| 45 | `GET .../worker/products/{id}` | **not in ARCH** | use row data already loaded in list (modal preloads from list item) |
| 46 | `POST .../worker/products` | `POST /api/worker/products` | multipart `name,category_id,description,price,original_price?,stock,is_new?,images[]` ≤3 |
| 47 | `PUT .../worker/products/{id}` | `PATCH /api/worker/products/{product}` | multipart via `POST` + `_method=PATCH`; `remove_image_ids[]` |
| 48 | `DELETE .../worker/products/{id}` | `DELETE /api/worker/products/{product}` | soft delete |
| 49 | `PATCH .../worker/products/{id}/stock` | **not in ARCH** | update via #47 |
| 50 | `GET .../admin/accounts/summary` | **not in ARCH** (tab counts not specified) | derive from `GET /api/admin/accounts?tab=` responses or request `counts` |
| 51 | `GET .../admin/accounts/pending` | `GET /api/admin/accounts?tab=pending&search=&per_page=` | one endpoint for all tabs |
| 52 | `GET .../admin/accounts/pending/{id}` | `GET /api/admin/accounts/{user}/id-documents` | ID metadata + download URLs |
| 53 | `POST .../pending/{id}/accept` | `POST /api/admin/accounts/{user}/approve` | creates `customer_no`, notification |
| 54 | `POST .../pending/{id}/reject` | `POST /api/admin/accounts/{user}/reject` | → `rejected` |
| 55 | `GET .../customers` | `GET /api/admin/accounts?tab=customer` | — |
| 56 | `GET .../customers/{id}` | row from #55 + `id-documents` | no per-customer detail route |
| 57 | `POST .../customers/{id}/remove` | `POST /api/admin/accounts/{user}/remove` | banned automatically when `bad_records ≥ 2`; cannot remove self/admin |
| 58 | `GET .../workers` | `GET /api/admin/accounts?tab=worker` or `GET /api/admin/workers` | — |
| 59 | `GET .../workers/{id}` | row from #58 | — |
| 60 | `POST .../workers` | `POST /api/admin/workers` | body incl. optional `store_id` |
| 61 | `PUT .../workers/{id}` | `PATCH /api/admin/workers/{user}` | password optional |
| 62 | `POST .../workers/{id}/remove` | `DELETE /api/admin/workers/{user}` | → removed |
| 63 | `GET .../removed` | `GET /api/admin/accounts?tab=removed` | — |
| 64 | `POST .../removed/{id}/restore` | `POST /api/admin/accounts/{user}/restore` | “Unremoved” button |
| 65 | `GET .../verification-documents/{userId}` | `GET /api/admin/accounts/{user}/id-documents` | same as #52 |
| 66 | `GET .../admin/stores` | `GET /api/admin/stores` | — |
| 67 | `POST .../admin/stores` | `POST /api/admin/stores` | multipart incl. `floor_location` |
| 68 | `GET .../admin/stores/{id}` | **not in ARCH** | modal uses list row |
| 69 | `PUT .../admin/stores/{id}` | `PATCH /api/admin/stores/{store}` | — |
| 70 | `DELETE .../admin/stores/{id}` | `DELETE /api/admin/stores/{store}` | soft delete |
| 71 | `GET .../admin/sales/summary` | `GET /api/admin/sales/summary?month=` | `revenue, cancelled_count, cancelled_total, not_claimed_count, not_claimed_total, orders_count` |
| 72 | `GET .../admin/sales/orders` | `GET /api/admin/sales?date=&status=` | orders embedded in response |
| 73 | `GET .../admin/sales/orders/{id}` | **not in ARCH** | use embedded order in #72 |
| 74 | `GET .../admin/sales/chart` | **not in ARCH** | no chart in UI today; optional |
| 75 | `GET .../admin/contact-messages` | `GET /api/admin/contact-messages?status=` | — |
| 76 | `PATCH .../admin/contact-messages/{id}` | `PATCH /api/admin/contact-messages/{message}` | `{status: read\|replied}` |
| 77 | `GET .../admin/dashboard/kpis` | **not in ARCH** | use #71 + account lists |
| — | — | `GET /api/health` | infra only |

### 9.7 Gaps in the authoritative API vs UI needs (decisions/asks)

| # | UI need | Authoritative gap | Recommended resolution |
|---|---|---|---|
| 1 | Cart “Select All” checkbox (`Cart.tsx:58-61,193-200`) | no select-all endpoint | backend adds `PATCH /api/cart/items/select-all` **or** frontend loops item PATCHes (accept for ≤20 items) |
| 2 | Header unread notification badge (missing today) / category counters | counts are only inside `GET /api/notifications` | reuse that payload (fetch `per_page=1` on layout mount) or add a light endpoint |
| 3 | Worker tab counters (`worker/Orders.tsx:201-210`) | no worker orders summary/counts | backend adds `counts` to `GET /api/worker/orders` response, or frontend issues 5 list calls once per tab load |
| 4 | Order pickup/store info | ARCH order has `pickup_location` string only, **no store relation** | display `pickup_location`; if multi-store orders are required, ARCH needs `store_id` + per-store checkout split (flag to Lead) |
| 5 | Customer order “Date to Claim” real deadline | `claim_deadline` exists on orders ✔ | frontend replaces the hardcoded “+3” badge |
| 6 | Notifications mark-as-read UX | endpoint exists ✔; UI lacks it | add click-to-read on `NotificationCard` + unread styling |
| 7 | Forgot-password OTP flow | ARCH uses email link/token, no code-verify | frontend: replace “Verification Code Sent” with “Reset link sent” and add `/reset-password?token=…` screen; phone reset unsupported |
| 8 | Mall info + FAQ dynamic content | no `/site` or `/faqs` endpoints; no tables in ARCH §4 | keep hardcoded (current behavior acceptable) or add later |
| 9 | Admin View ID images | private disk + authorized download route | `<img src="/api/admin/accounts/{user}/id-documents/{doc}">` works with same-origin session cookie; pass those as `idOneUrl`/`idTwoUrl` |
| 10 | Admin store/customer/worker/order “View Details” deep data | list endpoints carry most fields; no per-entity GETs for stores/products/admin orders | modals render from the list row (already how mock state works) |
| 11 | Product discount badge (`-35%`) | ARCH has `price` + `original_price` but no discount column | compute in client; no schema change |
| 12 | Product rating `4.7 (76)` | no rating columns | remove from worker card (recommended) |
| 13 | Profile name/birthday immutability (FAQ) | ARCH `PATCH /profile` permits `name`/`birthday` | decide policy; recommend backend reject name/birthday for `active` customers and UI mark them read-only |
| 14 | Contact “I'm not a robot” | ARCH uses honeypot `website` + throttle | remove fake captcha (or keep visual-only), add hidden `website` input to the form |
| 15 | Worker product detail endpoint | absent | use list row for `EditProductModal` (no extra call); acceptable |
| 16 | Admin orders per-id detail | absent | use `orders[]` from `GET /api/admin/sales` |
| 17 | Sales chart | absent | out of scope (no chart in UI) |
| 18 | `/api/home` payload | exists; includes `new_arrivals` not used by UI | map: Home section2 ← `featured_products`, section3 ← `stores`; ignore/optionally use `new_arrivals` + `stats` |
| 19 | Categories on home carousel | `/api/home` has no categories | call `GET /api/categories?type=product` separately |
| 20 | Store image upload | ARCH store has single `image_path` | matches UI (single “Store Photo”); store detail gallery cannot be managed by admin UI — acceptable, seed `store_images` |
| 21 | Product highlights editing | create/update body in ARCH doesn't list highlights | seed only; if editing needed, backend adds `highlights[]` |
| 22 | UUID/long ids | ARCH: integers internal + 12-digit `*_no` strings | no change needed to cart handler signatures (integers) |
| 23 | Login identifier label | `login` accepts email or phone ✔ | keep label |
| 24 | Password rules | min 12 mixed case | add client hint + validation messaging |

### 9.8 Frontend ownership impact (per ARCH §10 ownership map)

| Owner | Files to change for this contract |
|---|---|
| frontend-core | `src/lib/api.ts` (new: client + mapping), `src/lib/types.ts` (new: API ⇄ UI types), `src/lib/format.ts` helpers (`formatPeso`, `formatDate`, `formatRelative`), `src/context/AuthContext.tsx`, `src/main.tsx` (guards, `/logout`, reset-password route), guest/customer pages + feature sections (replace mock arrays, filters → API, status/price mapping) |
| frontend-admin | `src/pages/admin/*`, `src/pages/worker/*`, `src/components/ui/{AdminStoreModal,EditProductModal,WorkerFormModal,AdminOrderDetailsModal,ViewIdModal,CustomerDetailsModal,WorkerDetailsModal}.tsx` (field renames, `stock` vs `stocks`, remove password reveal, ID-document URLs, store `floor_location`, order status enum posts) |
| backend owners | Anything in §9.7 that is accepted (cart select-all, worker order counts, notification counts endpoint, admin detail endpoints) |

_END_OF_DOCUMENT_

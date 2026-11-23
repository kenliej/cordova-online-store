/**
 * Online Mall Cordova — shared API layer.
 *
 * Single integration boundary between the React UI and the Laravel 12 API.
 *  - Sanctum SPA cookie session (no tokens in localStorage).
 *  - CSRF: `GET /sanctum/csrf-cookie` before every state-changing request
 *    (fetched once, re-fetched automatically on a 419 and retried once).
 *  - Success envelope `{ data, message? }`, lists add `{ meta }`.
 *  - Errors `{ message, errors?, code? }` → typed `ApiError`.
 *  - `snake_case` wire → camelCase UI models (mappers below).
 *
 * This file is owned by frontend-core. Other modules import from it; do not
 * edit without messaging the Lead.
 */
import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { formatDate, formatRelativeTime } from "@/lib/format";
import type {
  AdminAccountQuery,
  AdminAccountRow,
  AdminIdDocuments,
  AdminStore,
  AdminStoreQuery,
  AuthUser,
  CartData,
  CartItem,
  CartSummary,
  Category,
  CheckoutPayload,
  ContactMessageRow,
  ContactPayload,
  ForgotPasswordResult,
  HomeData,
  LoginPayload,
  NotificationCategory,
  NotificationCounts,
  NotificationData,
  NotificationItem,
  OrderItem,
  OrderQuery,
  OrderRecord,
  OrderStatus,
  Paginated,
  PaginationMeta,
  PasswordChangePayload,
  Product,
  ProductDetail,
  ProductQuery,
  ProfileData,
  ProfileUpdatePayload,
  RegisterPayload,
  RegisterResult,
  ResetPasswordPayload,
  SalesQuery,
  SalesReport,
  SalesSummary,
  Store,
  StoreDetail,
  StoreQuery,
  WorkerOrderQuery,
  WorkerPayload,
  WorkerProduct,
  WorkerProductPayload,
  WorkerProductQuery,
} from "@/lib/types";

/* ================================================================== */
/* Errors                                                             */
/* ================================================================== */

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly errors?: Record<string, string[]>;
  /** Seconds from `Retry-After` (429 responses). */
  readonly retryAfter?: number;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      errors?: Record<string, string[]>;
      retryAfter?: number;
    } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.code = options.code;
    this.errors = options.errors;
    this.retryAfter = options.retryAfter;
  }

  /** First validation message for a field, if any. */
  fieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0];
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isValidation(): boolean {
    return this.status === 422 && !!this.errors;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** 422 field errors as a flat `{ field: message }` map for form rendering. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.errors) return {};
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.errors)) {
    const first = messages[0];
    if (first) result[field] = first;
  }
  return result;
}

/* ================================================================== */
/* Axios instance + interceptors                                      */
/* ================================================================== */

/**
 * Two supported deployments:
 *
 * 1. Same-origin (Docker: nginx serves SPA + /api) — relative `/api` base URL,
 *    Sanctum session cookies + CSRF.
 * 2. Split deployment (Vercel frontend → cPanel `.../omc-backend/api`) — an
 *    absolute API base URL. Cookies cannot be relied on cross-site, so auth
 *    switches to Bearer tokens issued by `POST /auth/token`.
 *
 * `VITE_AUTH_MODE=cookie|token` overrides the automatic detection.
 */
const RAW_API_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.VITE_API_BASE as string | undefined)
)?.trim();

const BASE_URL = RAW_API_BASE || "/api";

/**
 * Built-in avatar shown to accounts that have not uploaded a profile photo yet
 * (e.g. every customer immediately after registration/approval).
 */
export const DEFAULT_AVATAR_URL = "/default-avatar.svg";

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function sameOriginAsApp(url: string): boolean {
  if (typeof window === "undefined" || !isAbsoluteUrl(url)) return true;
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

const AUTH_MODE_ENV = ((import.meta.env.VITE_AUTH_MODE as string | undefined) ?? "")
  .trim()
  .toLowerCase();

/** True when the client talks to the API with Bearer tokens (cross-origin). */
export const isTokenAuthMode: boolean =
  AUTH_MODE_ENV === "token" ||
  (AUTH_MODE_ENV !== "cookie" && isAbsoluteUrl(BASE_URL) && !sameOriginAsApp(BASE_URL));

/** True when the client relies on Sanctum session cookies + CSRF. */
export const isCookieAuthMode: boolean = !isTokenAuthMode;

/**
 * Converts an absolute URL returned by the API (built from APP_URL) into a path
 * relative to the configured API base. Protected images must be fetched through
 * `http` so they carry the session cookie or Bearer token; using the absolute
 * URL directly breaks when the SPA is opened via a different host than APP_URL
 * (e.g. Docker at http://127.0.0.1:8080 while APP_URL is http://localhost:8080),
 * because the cookie is host-scoped and the request becomes cross-origin.
 */
function toApiRelativePath(url: string): string {
  if (!isAbsoluteUrl(url)) return url;

  try {
    const parsed = new URL(url);
    const basePath = (() => {
      try {
        return new URL(BASE_URL, window.location.origin).pathname.replace(/\/+$/, "");
      } catch {
        return "";
      }
    })();

    let path = parsed.pathname;
    if (basePath && (path === basePath || path.startsWith(`${basePath}/`))) {
      path = path.slice(basePath.length) || "/";
    }

    return `${path}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

const TOKEN_STORAGE_KEY = "omc.auth.token";

/**
 * Reads the persisted bearer token. "Remember me" stores it in localStorage
 * (survives tab close); otherwise it lives in sessionStorage only. Never store
 * tokens in a cookie (no HttpOnly benefit in JS, and CORS/cookie pitfalls).
 */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null, remember = false): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    if (token) {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // Storage can be unavailable (private mode); the in-memory session still works
    // until reload.
  }
}

/** Removes any persisted bearer token (called on logout / 401). */
export function clearStoredToken(): void {
  setStoredToken(null);
}

export const http = axios.create({
  baseURL: BASE_URL,
  // Session cookies only make sense in same-origin mode.
  withCredentials: isCookieAuthMode,
  withXSRFToken: isCookieAuthMode,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

let csrfCookiePromise: Promise<void> | null = null;

/** Fetches the Sanctum CSRF cookie (idempotent). No-op in token mode. */
export function ensureCsrfCookie(force = false): Promise<void> {
  if (isTokenAuthMode) return Promise.resolve();

  if (!csrfCookiePromise || force) {
    csrfCookiePromise = axios
      .get("/sanctum/csrf-cookie", { withCredentials: true })
      .then(() => undefined)
      .catch((error: unknown) => {
        csrfCookiePromise = null;
        throw error instanceof Error ? error : new Error("Could not initialise a secure session.");
      });
  }
  return csrfCookiePromise;
}

let unauthorizedHandler: (() => void) | null = null;

/**
 * Registers the callback invoked on any 401 (used by AuthProvider to clear the
 * session and let route guards redirect to /login). Returns an unsubscribe.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

http.interceptors.request.use(async (config) => {
  if (isTokenAuthMode) {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }

  const method = (config.method ?? "get").toLowerCase();
  if (MUTATING_METHODS.has(method)) {
    await ensureCsrfCookie();
  }
  return config;
});

function parseRetryAfter(headers: unknown): number | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown>;
  const raw = record["retry-after"] ?? record["Retry-After"];
  if (raw === undefined || raw === null) return undefined;
  const seconds = Number.parseInt(String(raw), 10);
  return Number.isFinite(seconds) ? seconds : undefined;
}

function normalizeErrors(raw: unknown): Record<string, string[]> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const result: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
    const messages = Array.isArray(value) ? value.map((item) => String(item)) : [String(value)];
    result[field] = messages;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function buildApiError(error: AxiosError): ApiError {
  const response = error.response;
  if (!response) {
    return new ApiError("Unable to reach the server. Please check your connection and try again.", {
      status: 0,
    });
  }

  const data = (response.data ?? {}) as Record<string, unknown>;
  const errors = normalizeErrors(data.errors);
  let message = typeof data.message === "string" ? data.message : "";

  if (response.status === 401) {
    message = message || "Your session has expired. Please log in again.";
  } else if (response.status === 403) {
    message = message || "You do not have permission to perform this action.";
  } else if (response.status === 404) {
    message = message || "The requested item could not be found.";
  } else if (response.status === 419) {
    message = message || "Your session has expired. Please refresh the page and try again.";
  } else if (response.status === 429) {
    message = message || "Too many requests. Please wait a moment and try again.";
  } else if (response.status >= 500) {
    message = message || "The server ran into a problem. Please try again shortly.";
  }

  // Laravel's generic validation message is not useful on its own — prefer the
  // first concrete field error so banners/toasts show something actionable.
  if (message === "The given data was invalid." && errors) {
    const firstError = Object.values(errors).flat()[0];
    if (firstError) message = firstError;
  }

  return new ApiError(message || "Something went wrong. Please try again.", {
    status: response.status,
    code: typeof data.code === "string" ? data.code : undefined,
    errors,
    retryAfter: parseRetryAfter(response.headers),
  });
}

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error instanceof Error ? error : new Error("Unexpected API failure."));
    }

    const status = error.response?.status;
    const config = error.config as (InternalAxiosRequestConfig & { _csrfRetried?: boolean }) | undefined;

    // Expired CSRF token (session rotated): refresh the cookie and retry once.
    if (status === 419 && config && !config._csrfRetried) {
      config._csrfRetried = true;
      try {
        await ensureCsrfCookie(true);
        return await http.request(config);
      } catch (retryError) {
        return Promise.reject(toApiError(retryError));
      }
    }

    if (status === 401) {
      // A rejected/expired bearer token must not keep being sent.
      if (isTokenAuthMode) clearStoredToken();
      if (unauthorizedHandler) unauthorizedHandler();
    }

    return Promise.reject(buildApiError(error));
  },
);

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) return buildApiError(error);
  return new ApiError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
}

/* ================================================================== */
/* Raw shape helpers (tolerant: the backend is built in parallel)     */
/* ================================================================== */

type Raw = Record<string, unknown>;

const asRecord = (value: unknown): Raw =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  return value === null || value === undefined ? [] : [value];
};

/** First non-null value among the given keys. */
const pick = (raw: unknown, ...keys: string[]): unknown => {
  const record = asRecord(raw);
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const toStr = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

const toNum = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toNumOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = toNum(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBool = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "open", "active", "in_stock"].includes(normalized)) return true;
    if (["0", "false", "no", "closed", "inactive", "out_of_stock"].includes(normalized)) return false;
  }
  if (value === null || value === undefined) return fallback;
  return fallback;
};

const toId = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

/** Resolves image values (`/storage/...`, absolute URL, or raw disk path). */
export function mediaUrl(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const record = asRecord(value);
    return mediaUrl(record.url ?? record.path ?? record.image_url ?? record.image_path ?? record.src);
  }
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (/^https?:\/\//i.test(raw)) {
    // Dev backend URLs would bypass the Vite proxy (and its cookies) — make
    // them relative so they stay on the browser-visible origin.
    const sameHost = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(\/.*)?$/i.exec(raw);
    if (sameHost) return sameHost[1] && sameHost[1].startsWith("/") ? sameHost[1] : "/";
    return raw;
  }
  if (raw.startsWith("//")) return raw;
  if (raw.startsWith("/")) return raw;
  const cleaned = raw.replace(/^storage\//, "");
  return `/storage/${cleaned}`;
}

function mediaList(value: unknown): string[] {
  return asArray(value)
    .map((entry) => mediaUrl(entry))
    .filter((url) => url.length > 0);
}

/** Category object/string → "Parent - Child" display label. */
function categoryLabel(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  const record = asRecord(value);
  const display = toStr(record.display_name);
  if (display) return display;
  const name = toStr(record.name);
  const parent = record.parent;
  if (parent) {
    const parentLabel = categoryLabel(parent);
    if (parentLabel && name) return `${parentLabel} - ${name}`;
  }
  return name || fallback;
}

function parseHighlights(value: unknown): { title: string; body: string }[] {
  return asArray(value).map((entry) => {
    if (typeof entry === "string") return { title: "", body: entry };
    const record = asRecord(entry);
    return {
      title: toStr(record.title),
      body: toStr(record.body ?? record.description ?? record.text ?? record.content),
    };
  });
}

function mapMeta(raw: unknown, fallbackCount: number): PaginationMeta {
  const record = asRecord(raw);
  const total = toNum(record.total, fallbackCount);
  const perPage = toNum(record.per_page, fallbackCount || total);
  const lastPage = toNum(record.last_page, perPage > 0 ? Math.max(1, Math.ceil(total / perPage)) : 1);
  return {
    currentPage: toNum(record.current_page, 1),
    lastPage: Math.max(1, lastPage),
    perPage,
    total,
    from: toNumOrNull(record.from),
    to: toNumOrNull(record.to),
  };
}

/* ================================================================== */
/* Model mappers                                                      */
/* ================================================================== */

export function mapAuthUser(rawValue: unknown): AuthUser {
  const raw = asRecord(rawValue);
  const roleRaw = toStr(raw.role).toLowerCase();
  const role: AuthUser["role"] = roleRaw === "admin" ? "admin" : roleRaw === "worker" ? "worker" : "customer";
  const statusRaw = toStr(raw.status).toLowerCase();
  const status: AuthUser["status"] =
    statusRaw === "pending" || statusRaw === "rejected" || statusRaw === "removed" || statusRaw === "banned"
      ? statusRaw
      : "active";
  return {
    id: toId(raw.id),
    name: toStr(raw.name) || toStr(raw.full_name),
    email: toStr(raw.email),
    phone: toStr(raw.phone) || null,
    role,
    status,
    customerNo: toStr(raw.customer_no) || null,
    workerNo: toStr(raw.worker_no) || null,
    gender: toStr(raw.gender) || null,
    birthday: toStr(raw.birthday) || null,
    address: toStr(raw.address) || null,
    profilePhoto:
      mediaUrl(raw.profile_photo_url ?? raw.profile_photo ?? raw.avatar_url ?? raw.profile_photo_path) ||
      DEFAULT_AVATAR_URL,
    badRecords: toNum(raw.bad_records, 0),
    storeId: toNumOrNull(raw.store_id),
    lastLoginAt: toStr(raw.last_login_at) || null,
    createdAt: toStr(raw.created_at) || null,
  };
}

export function mapCategory(rawValue: unknown): Category {
  const raw = asRecord(rawValue);
  const type = toStr(raw.type).toLowerCase() === "store" ? "store" : "product";
  const name = toStr(raw.name) || categoryLabel(rawValue);
  return {
    id: toId(raw.id),
    name,
    slug: toStr(raw.slug),
    type,
    parentId: toNumOrNull(raw.parent_id),
    displayName: toStr(raw.display_name) || categoryLabel(raw) || name,
  };
}

export function mapProduct(rawValue: unknown): Product {
  const raw = asRecord(rawValue);
  const images = mediaList(raw.images ?? raw.product_images);
  const primary = mediaUrl(raw.image_url ?? raw.image ?? raw.primary_image ?? raw.image_path) || images[0] || "";
  const price = toNum(raw.price);
  const originalPrice = toNumOrNull(raw.original_price ?? raw.compare_at_price);
  const stock = toNum(raw.stock ?? raw.stock_count ?? raw.stocks);
  const isActive = raw.is_active === undefined ? true : toBool(raw.is_active, true);
  const explicitStockStatus = raw.in_stock ?? raw.inStock;
  const inStock =
    explicitStockStatus !== undefined
      ? toBool(explicitStockStatus, stock > 0)
      : stock > 0 && toStr(raw.stock_status).toLowerCase() !== "out_of_stock";
  const discount =
    toNumOrNull(raw.discount_percent ?? raw.discount) ??
    (originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : null);
  const storeRaw = raw.store;
  return {
    id: toId(raw.id),
    slug: toStr(raw.slug) || String(toId(raw.id)),
    name: toStr(raw.name),
    categoryId: toNumOrNull(raw.category_id) ?? toNumOrNull(pick(raw.category, "id")),
    category: categoryLabel(raw.category, toStr(raw.category_name)),
    storeId: toNumOrNull(raw.store_id) ?? toNumOrNull(pick(storeRaw, "id")),
    storeName: toStr(pick(storeRaw, "name")) || toStr(raw.store_name) || null,
    description: toStr(raw.description),
    price,
    originalPrice: originalPrice && originalPrice > 0 ? originalPrice : null,
    discountPercent: discount && discount > 0 ? discount : null,
    stock,
    inStock,
    isNew: toBool(raw.is_new, false),
    isActive,
    image: primary,
    images: images.length > 0 ? images : primary ? [primary] : [],
    highlights: parseHighlights(raw.highlights ?? raw.product_highlights),
    createdAt: toStr(raw.created_at) || null,
  };
}

export function mapProductDetail(rawValue: unknown): ProductDetail {
  const raw = asRecord(rawValue);
  const base = mapProduct(raw);
  const storeRaw = raw.store;
  return {
    ...base,
    store: storeRaw ? mapStore(storeRaw) : null,
    related: asArray(raw.related).map(mapProduct),
  };
}

export function mapStore(rawValue: unknown): Store {
  const raw = asRecord(rawValue);
  const images = mediaList(raw.images ?? raw.store_images);
  const primary = mediaUrl(raw.image_url ?? raw.image ?? raw.image_path) || images[0] || "";
  return {
    id: toId(raw.id),
    slug: toStr(raw.slug) || String(toId(raw.id)),
    name: toStr(raw.name),
    categoryId: toNumOrNull(raw.category_id) ?? toNumOrNull(pick(raw.category, "id")),
    category: categoryLabel(raw.category, toStr(raw.category_name)),
    description: toStr(raw.description),
    operatingHours: toStr(raw.operating_hours ?? raw.time ?? raw.hours) || "6:00AM - 11:00PM",
    phone: toStr(raw.phone),
    isOpen: toBool(raw.is_open, true),
    image: primary,
    images: images.length > 0 ? images : primary ? [primary] : [],
    highlights: parseHighlights(raw.highlights ?? raw.store_highlights),
    floorLocation: toStr(raw.floor_location) || null,
  };
}

export function mapStoreDetail(rawValue: unknown): StoreDetail {
  const raw = asRecord(rawValue);
  return {
    ...mapStore(raw),
    products: asArray(raw.products).map(mapProduct),
  };
}

const ORDER_STATUS_FROM_API: Record<string, OrderStatus> = {
  pending: "Pending",
  ready: "Ready to Claim",
  ready_to_claim: "Ready to Claim",
  "ready to claim": "Ready to Claim",
  claimed: "Claimed",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  not_claimed: "Didn't Claimed",
  "didn't claimed": "Didn't Claimed",
  didnt_claimed: "Didn't Claimed",
};

/** Wire enum (`pending`/`ready`/…) or UI label → UI label. */
export function orderStatusLabel(value: unknown): OrderStatus {
  const raw = toStr(value).trim();
  if (!raw) return "Pending";
  const known = ORDER_STATUS_FROM_API[raw.toLowerCase()];
  if (known) return known;
  return raw as OrderStatus;
}

/** UI label (`Pending`/`Ready to Claim`/…) → wire enum. */
export function orderStatusForApi(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (["pending", "ready", "claimed", "cancelled", "not_claimed"].includes(normalized)) return normalized;
  switch (orderStatusLabel(value)) {
    case "Ready to Claim":
      return "ready";
    case "Claimed":
      return "claimed";
    case "Cancelled":
      return "cancelled";
    case "Didn't Claimed":
      return "not_claimed";
    default:
      return "pending";
  }
}

function mapOrderItem(rawValue: unknown): OrderItem {
  const raw = asRecord(rawValue);
  const product = asRecord(raw.product);
  const image =
    mediaUrl(raw.image_url ?? raw.image_path ?? raw.image ?? raw.snapshot_image) ||
    mediaUrl(product.image_url ?? product.image ?? pick(product, "images"));
  return {
    id: toId(raw.id),
    productId: toNumOrNull(raw.product_id ?? product.id),
    title: toStr(raw.product_name ?? raw.name ?? raw.title ?? product.name) || "Item",
    price: toNum(raw.unit_price ?? raw.price ?? product.price),
    quantity: toNum(raw.quantity, 1),
    image,
  };
}

export function mapOrder(rawValue: unknown): OrderRecord {
  const raw = asRecord(rawValue);
  const dbId = toId(raw.id);
  const orderNumber = toStr(raw.order_number);
  const customer = asRecord(raw.customer);
  const dateOrderedRaw = raw.date_ordered ?? raw.created_at ?? raw.created_at_iso;
  return {
    id: orderNumber || String(dbId),
    dbId,
    orderNumber: orderNumber || null,
    customerName: toStr(customer.name) || toStr(raw.customer_name) || undefined,
    customerPhone: toStr(customer.phone) || toStr(raw.customer_phone) || undefined,
    status: orderStatusLabel(raw.status),
    statusRaw: toStr(raw.status).toLowerCase(),
    dateOrdered: formatDate(dateOrderedRaw as string | null),
    dateReady: formatDate(raw.ready_at as string | null) || undefined,
    claimDeadline: formatDate(raw.claim_deadline as string | null) || undefined,
    totalPrice: toNum(raw.total ?? raw.total_price),
    subtotal: toNumOrNull(raw.subtotal) ?? undefined,
    pickupLocation: toStr(raw.pickup_location) || undefined,
    paymentMethod: toStr(raw.payment_method) || undefined,
    notes: toStr(raw.notes) || null,
    items: asArray(raw.items ?? raw.order_items).map(mapOrderItem),
  };
}

export function mapCartItem(rawValue: unknown): CartItem {
  const raw = asRecord(rawValue);
  const product = asRecord(raw.product);
  const image =
    mediaUrl(raw.image_url ?? raw.image_path ?? raw.image) ||
    mediaUrl(product.image_url ?? product.image ?? pick(product, "images"));
  return {
    id: toId(raw.id),
    productId: toId(raw.product_id ?? product.id),
    slug: toStr(product.slug) || toStr(raw.product_slug) || String(toId(raw.product_id ?? product.id)),
    title: toStr(raw.product_name ?? raw.title ?? product.name) || "Item",
    price: toNum(raw.unit_price ?? raw.price ?? product.price),
    quantity: toNum(raw.quantity, 1),
    stock: toNum(raw.stock_available ?? product.stock ?? product.stock_count, 9999),
    image,
    selected: raw.is_selected === undefined ? true : toBool(raw.is_selected, true),
  };
}

function mapCartSummary(rawValue: unknown, items: CartItem[]): CartSummary {
  const raw = asRecord(rawValue);
  const selected = items.filter((item) => item.selected);
  return {
    selectedCount: toNum(raw.selected_count, selected.reduce((sum, item) => sum + item.quantity, 0)),
    itemCount: toNum(raw.item_count, items.reduce((sum, item) => sum + item.quantity, 0)),
    total: toNum(
      raw.total,
      selected.reduce((sum, item) => sum + item.price * item.quantity, 0),
    ),
  };
}

export function mapCart(rawValue: unknown): CartData {
  const raw = asRecord(rawValue);
  const rawItems = asArray(raw.items ?? raw.cart_items);
  const items = rawItems.map(mapCartItem);
  return {
    items,
    summary: mapCartSummary(raw.summary, items),
  };
}

const NOTIFICATION_CATEGORY_FROM_API: Record<string, NotificationCategory> = {
  offers: "Offers & Sales",
  offer: "Offers & Sales",
  "offers & sales": "Offers & Sales",
  "offers_sales": "Offers & Sales",
  order: "Order",
  system: "System",
};

export function notificationCategoryLabel(value: unknown): NotificationCategory {
  return NOTIFICATION_CATEGORY_FROM_API[toStr(value).trim().toLowerCase()] ?? "System";
}

export function notificationCategoryForApi(value: string): string | undefined {
  switch (value) {
    case "Offers & Sales":
      return "offers";
    case "Order":
      return "order";
    case "System":
      return "system";
    default:
      return undefined;
  }
}

export function mapNotification(rawValue: unknown): NotificationItem {
  const raw = asRecord(rawValue);
  const createdAt = toStr(raw.created_at ?? raw.createdAt) || new Date().toISOString();
  return {
    id: toId(raw.id),
    title: toStr(raw.title),
    description: toStr(raw.body ?? raw.description ?? raw.message),
    category: notificationCategoryLabel(raw.category),
    createdAt,
    time: formatRelativeTime(createdAt),
    read: toBool(raw.is_read ?? raw.read, Boolean(raw.read_at)),
  };
}

export function mapProfile(rawValue: unknown): ProfileData {
  const raw = asRecord(rawValue);
  const userRaw = raw.user ?? raw;
  const docsRaw = asRecord(raw.id_documents ?? raw.idDocuments);
  const documents = asArray(docsRaw.documents ?? docsRaw);
  const hasDoc = (type: string): boolean => {
    if (typeof docsRaw[type] === "boolean") return docsRaw[type] as boolean;
    if (typeof docsRaw[`has_${type}`] === "boolean") return docsRaw[`has_${type}`] as boolean;
    return documents.some((doc) => {
      const record = asRecord(doc);
      const docType = toStr(record.type).toLowerCase();
      return docType === type || docType === `id_${type}`;
    });
  };
  return {
    user: mapAuthUser(userRaw),
    idDocuments: {
      frontUploaded: hasDoc("front") || toBool(docsRaw.id_front, false),
      backUploaded: hasDoc("back") || toBool(docsRaw.id_back, false),
    },
  };
}

export function mapAdminAccount(rawValue: unknown): AdminAccountRow {
  const user = mapAuthUser(rawValue);
  const raw = asRecord(rawValue);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    customerNo: user.customerNo,
    workerNo: user.workerNo,
    gender: user.gender,
    birthday: user.birthday,
    address: user.address,
    profilePhoto: user.profilePhoto,
    badRecords: user.badRecords,
    storeId: user.storeId,
    idDocumentsCount: toNum(pick(raw, "id_documents_count", "idDocumentsCount"), 0),
    createdAt: user.createdAt,
  };
}

export function mapAdminStore(rawValue: unknown): AdminStore {
  const raw = asRecord(rawValue);
  const operatingHours = toStr(raw.operating_hours ?? raw.time ?? raw.hours);
  return {
    id: toId(raw.id),
    slug: toStr(raw.slug),
    name: toStr(raw.name),
    categoryId: toNumOrNull(raw.category_id),
    category: categoryLabel(raw.category, toStr(raw.category_name)),
    description: toStr(raw.description),
    operatingHours,
    time: operatingHours,
    phone: toStr(raw.phone),
    isOpen: toBool(raw.is_open, true),
    image: mediaUrl(raw.image_url ?? raw.image ?? raw.image_path),
    floorLocation: toStr(raw.floor_location) || null,
    createdAt: toStr(raw.created_at) || null,
  };
}

export function mapWorkerProduct(rawValue: unknown): WorkerProduct {
  const product = mapProduct(rawValue);
  const raw = asRecord(rawValue);
  const imageRecords = asArray(raw.image_records)
    .map((record) => {
      const item = asRecord(record);
      return { id: toId(item.id), url: toStr(item.url) };
    })
    .filter((record) => record.id > 0 && record.url !== "");
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    categoryId: product.categoryId,
    category: product.category,
    description: product.description,
    price: product.price,
    stock: product.stock,
    isNew: product.isNew,
    isActive: product.isActive,
    images: product.images,
    imageRecords,
    image: product.image,
    storeId: product.storeId,
  };
}

/* ================================================================== */
/* Request helpers                                                    */
/* ================================================================== */

interface Envelope {
  data?: unknown;
  meta?: unknown;
  message?: unknown;
  /** Notifications endpoint returns these alongside `data`. */
  counts?: unknown;
  unread?: unknown;
  [key: string]: unknown;
}

async function requestEnvelope(config: AxiosRequestConfig, fallbackMessage?: string): Promise<Envelope> {
  try {
    const response = await http.request<Envelope>(config);
    return response.data ?? {};
  } catch (error) {
    const apiError = toApiError(error);
    if (fallbackMessage && apiError.status === 0) {
      throw new ApiError(fallbackMessage, { status: apiError.status });
    }
    throw apiError;
  }
}

/** Single-object payload: unwraps `{data: ...}` and applies a mapper. */
async function requestData<T>(config: AxiosRequestConfig, mapper: (raw: unknown) => T): Promise<T> {
  const body = await requestEnvelope(config);
  const data = body.data;
  // Some resources wrap the actual record one level deeper (e.g. `{data:{user}}`).
  return mapper(data);
}

/** List payload: unwraps `{data: [], meta}` into `{items, meta}`. */
async function requestList<T>(
  config: AxiosRequestConfig,
  mapper: (raw: unknown) => T,
): Promise<Paginated<T>> {
  const body = await requestEnvelope(config);
  const rows = asArray(body.data);
  return {
    items: rows.map(mapper),
    meta: mapMeta(body.meta, rows.length),
  };
}

/** Message-only payload (POST actions that return `{message}`). */
async function requestMessage(config: AxiosRequestConfig, fallback = "Done."): Promise<string> {
  const body = await requestEnvelope(config);
  return toStr(body.message) || toStr(asRecord(body.data).message) || fallback;
}

function compactParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    result[key] = value;
  }
  return result;
}

function appendFormValue(form: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (value instanceof File) {
    form.append(key, value);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry instanceof File) form.append(`${key}[]`, entry);
      else if (entry !== undefined && entry !== null) form.append(`${key}[]`, String(entry));
    }
    return;
  }
  if (typeof value === "boolean") {
    form.append(key, value ? "1" : "0");
    return;
  }
  form.append(key, String(value));
}

function buildFormData(fields: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) appendFormValue(form, key, value);
  return form;
}

/* ================================================================== */
/* Auth                                                               */
/* ================================================================== */

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const credentials = {
    login: payload.login.trim(),
    password: payload.password,
    remember: payload.remember,
  };

  if (isTokenAuthMode) {
    const body = await requestEnvelope({
      method: "POST",
      url: "/auth/token",
      data: { ...credentials, device_name: "spa" },
    });
    const data = asRecord(body.data);
    const token = toStr(data.token);
    if (token === "") {
      throw new ApiError("The server did not return an authentication token.", { status: 500 });
    }
    setStoredToken(token, Boolean(payload.remember));
    return mapAuthUser(asRecord(data.user ?? data));
  }

  const body = await requestEnvelope({
    method: "POST",
    url: "/auth/login",
    data: credentials,
  });
  const data = asRecord(body.data);
  return mapAuthUser(data.user ?? data);
}

export async function logout(): Promise<void> {
  try {
    await requestEnvelope({ method: "POST", url: "/auth/logout" });
  } finally {
    // Local state must always be dropped, even if the network call failed.
    clearStoredToken();
  }
}

/** GET /auth/me — throws ApiError(401) when the session is not authenticated. */
export async function fetchMe(): Promise<AuthUser> {
  const body = await requestEnvelope({ method: "GET", url: "/auth/me" });
  const data = asRecord(body.data);
  return mapAuthUser(data.user ?? data);
}

export async function registerAccount(payload: RegisterPayload): Promise<RegisterResult> {
  const form = buildFormData({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    birthday: payload.birthday,
    gender: payload.gender,
    password: payload.password,
    password_confirmation: payload.passwordConfirmation,
    agree_terms: payload.agreeTerms,
    id_front: payload.idFront,
    id_back: payload.idBack,
  });
  const body = await requestEnvelope({ method: "POST", url: "/auth/register", data: form });
  return {
    message:
      toStr(body.message) ||
      toStr(asRecord(body.data).message) ||
      "Registration submitted! Your account is pending admin approval.",
  };
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResult> {
  const body = await requestEnvelope({ method: "POST", url: "/auth/forgot-password", data: { email } });
  return {
    message:
      toStr(body.message) ||
      "If an account matches that email, a password reset link has been sent.",
  };
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<string> {
  return requestMessage({
    method: "POST",
    url: "/auth/reset-password",
    data: {
      token: payload.token,
      email: payload.email,
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
    },
  }, "Password reset successfully. You can now log in.");
}

/* ================================================================== */
/* Profile                                                            */
/* ================================================================== */

export async function fetchProfile(): Promise<ProfileData> {
  const body = await requestEnvelope({ method: "GET", url: "/profile" });
  return mapProfile(body.data);
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<AuthUser> {
  const body = await requestEnvelope({
    method: "PATCH",
    url: "/profile",
    data: compactParams({
      name: payload.name,
      phone: payload.phone,
      address: payload.address,
      gender: payload.gender,
      birthday: payload.birthday,
    }),
  });
  return mapAuthUser(asRecord(body.data).user ?? body.data);
}

export async function changePassword(payload: PasswordChangePayload): Promise<string> {
  return requestMessage(
    {
      method: "PATCH",
      url: "/profile/password",
      data: {
        current_password: payload.currentPassword,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
      },
    },
    "Password changed successfully.",
  );
}

export async function uploadAvatar(file: File): Promise<AuthUser> {
  const body = await requestEnvelope({
    method: "POST",
    url: "/profile/avatar",
    data: buildFormData({ avatar: file }),
  });
  return mapAuthUser(asRecord(body.data).user ?? body.data);
}

/* ================================================================== */
/* Public catalog                                                     */
/* ================================================================== */

export async function fetchHome(): Promise<HomeData> {
  const body = await requestEnvelope({ method: "GET", url: "/home" });
  const raw = asRecord(body.data);
  return {
    newArrivals: asArray(raw.new_arrivals ?? raw.newArrivals).map(mapProduct),
    featuredProducts: asArray(raw.featured_products ?? raw.featuredProducts).map(mapProduct),
    stores: asArray(raw.stores).map(mapStore),
    stats: {
      products: toNum(pick(raw.stats, "products"), 0),
      stores: toNum(pick(raw.stats, "stores"), 0),
    },
  };
}

export async function fetchCategories(type?: "product" | "store"): Promise<Category[]> {
  const body = await requestEnvelope({
    method: "GET",
    url: "/categories",
    params: compactParams({ type }),
  });
  return asArray(body.data).map(mapCategory);
}

export async function fetchProducts(query: ProductQuery = {}): Promise<Paginated<Product>> {
  return requestList(
    {
      method: "GET",
      url: "/products",
      params: compactParams({
        category: query.category,
        search: query.search,
        sort: query.sort,
        in_stock: query.inStock ? 1 : undefined,
        out_of_stock: query.outOfStock ? 1 : undefined,
        page: query.page,
        per_page: query.perPage,
      }),
    },
    mapProduct,
  );
}

export async function fetchProduct(slug: string): Promise<ProductDetail> {
  return requestData({ method: "GET", url: `/products/${encodeURIComponent(slug)}` }, mapProductDetail);
}

export async function fetchStores(query: StoreQuery = {}): Promise<Paginated<Store>> {
  return requestList(
    {
      method: "GET",
      url: "/stores",
      params: compactParams({
        category: query.category,
        search: query.search,
        open: query.open ? 1 : undefined,
        closed: query.closed ? 1 : undefined,
        page: query.page,
        per_page: query.perPage,
      }),
    },
    mapStore,
  );
}

export async function fetchStore(slug: string): Promise<StoreDetail> {
  return requestData({ method: "GET", url: `/stores/${encodeURIComponent(slug)}` }, mapStoreDetail);
}

/* ================================================================== */
/* Cart & checkout                                                    */
/* ================================================================== */

export async function fetchCart(): Promise<CartData> {
  const body = await requestEnvelope({ method: "GET", url: "/cart" });
  return mapCart(body.data);
}

export async function addCartItem(productId: number, quantity = 1): Promise<void> {
  await requestEnvelope({
    method: "POST",
    url: "/cart/items",
    data: { product_id: productId, quantity },
  });
}

export async function updateCartItem(
  itemId: number,
  payload: { quantity?: number; selected?: boolean },
): Promise<void> {
  await requestEnvelope({
    method: "PATCH",
    url: `/cart/items/${itemId}`,
    data: compactParams({
      quantity: payload.quantity,
      is_selected: payload.selected === undefined ? undefined : payload.selected,
    }),
  });
}

export async function removeCartItem(itemId: number): Promise<void> {
  await requestEnvelope({ method: "DELETE", url: `/cart/items/${itemId}` });
}

export async function clearCart(selectedOnly = false): Promise<void> {
  await requestEnvelope({
    method: "DELETE",
    url: "/cart/items",
    params: selectedOnly ? { selected: 1 } : {},
  });
}

export interface CheckoutResult {
  message: string;
  orders: OrderRecord[];
}

export async function checkout(payload: CheckoutPayload = {}): Promise<CheckoutResult> {
  const body = await requestEnvelope({
    method: "POST",
    url: "/checkout",
    data: compactParams({
      item_ids: payload.itemIds,
      select_all: payload.selectAll,
    }),
  });
  const data = asRecord(body.data);
  const rawOrders = asArray(data.orders ?? data.order ?? body.data).filter(
    (entry) => entry !== null && typeof entry === "object",
  );
  const orders = rawOrders
    .map((entry) => asRecord(entry))
    .filter((entry) => Object.keys(entry).length > 0)
    .map(mapOrder);
  return {
    message:
      toStr(body.message) ||
      toStr(data.message) ||
      (orders.length === 1 ? "Checkout successful! Order placed." : "Checkout successful!"),
    orders,
  };
}

/* ================================================================== */
/* Orders                                                             */
/* ================================================================== */

export async function fetchOrders(query: OrderQuery = {}): Promise<Paginated<OrderRecord>> {
  return requestList(
    {
      method: "GET",
      url: "/orders",
      params: compactParams({
        status: query.status,
        search: query.search,
        page: query.page,
        per_page: query.perPage,
      }),
    },
    mapOrder,
  );
}

export async function fetchOrder(orderId: number): Promise<OrderRecord> {
  return requestData({ method: "GET", url: `/orders/${orderId}` }, mapOrder);
}

export async function cancelOrder(orderId: number): Promise<OrderRecord | null> {
  const body = await requestEnvelope({ method: "PATCH", url: `/orders/${orderId}/cancel` });
  const data = body.data;
  return data && typeof data === "object" && Object.keys(asRecord(data)).length > 0 ? mapOrder(data) : null;
}

/* ================================================================== */
/* Notifications                                                      */
/* ================================================================== */

export async function fetchNotifications(query: { category?: string; search?: string } = {}): Promise<NotificationData> {
  const body = await requestEnvelope({
    method: "GET",
    url: "/notifications",
    params: compactParams({ category: query.category, search: query.search }),
  });

  const data = asRecord(body.data);
  // Contract: `{ data: [...], counts{}, unread }`. Also tolerate `{data:{items,counts}}`.
  const nested = asRecord(data.items ?? data.notifications);
  const items = asArray(data.items ?? data.notifications ?? body.data).map(mapNotification);
  const countsRaw = asRecord(body.counts ?? data.counts ?? nested.counts);
  const counts: NotificationCounts = {
    all: toNum(countsRaw.all, items.length),
    offers: toNum(countsRaw.offers, 0),
    order: toNum(countsRaw.order, 0),
    system: toNum(countsRaw.system, 0),
  };
  return {
    items,
    counts,
    unread: toNum(body.unread ?? data.unread ?? data.unread_count, items.filter((item) => !item.read).length),
  };
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  await requestEnvelope({ method: "PATCH", url: `/notifications/${notificationId}/read` });
}

export async function markAllNotificationsRead(): Promise<void> {
  await requestEnvelope({ method: "POST", url: "/notifications/read-all" });
}

/* ================================================================== */
/* Contact                                                            */
/* ================================================================== */

export async function sendContactMessage(payload: ContactPayload): Promise<string> {
  return requestMessage(
    {
      method: "POST",
      url: "/contact",
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        subject: payload.subject,
        message: payload.message,
        // Honeypot: bots fill it, humans never see it.
        website: payload.website,
      },
    },
    "Your message has been sent successfully!",
  );
}

/* ================================================================== */
/* Worker                                                             */
/* ================================================================== */

export async function fetchWorkerOrders(query: WorkerOrderQuery = {}): Promise<Paginated<OrderRecord>> {
  return requestList(
    {
      method: "GET",
      url: "/worker/orders",
      params: compactParams({
        status: query.status ? orderStatusForApi(query.status) : undefined,
        search: query.search,
        page: query.page,
        per_page: query.perPage,
      }),
    },
    mapOrder,
  );
}

export async function fetchWorkerOrder(orderId: number): Promise<OrderRecord> {
  return requestData({ method: "GET", url: `/worker/orders/${orderId}` }, mapOrder);
}

export async function updateWorkerOrderStatus(orderId: number, status: string): Promise<OrderRecord | null> {
  const body = await requestEnvelope({
    method: "PATCH",
    url: `/worker/orders/${orderId}/status`,
    data: { status: orderStatusForApi(status) },
  });
  const data = body.data;
  return data && typeof data === "object" && Object.keys(asRecord(data)).length > 0 ? mapOrder(data) : null;
}

export async function fetchWorkerProducts(query: WorkerProductQuery = {}): Promise<Paginated<WorkerProduct>> {
  return requestList(
    {
      method: "GET",
      url: "/worker/products",
      params: compactParams({
        category: query.category,
        search: query.search,
        sort: query.sort,
        in_stock: query.inStock ? 1 : undefined,
        out_of_stock: query.outOfStock ? 1 : undefined,
        page: query.page,
        per_page: query.perPage,
      }),
    },
    mapWorkerProduct,
  );
}

function workerProductFormData(payload: WorkerProductPayload, includeMethod = false): FormData {
  const fields: Record<string, unknown> = {
    name: payload.name,
    category_id: payload.categoryId,
    description: payload.description,
    price: payload.price,
    stock: payload.stock,
    is_new: payload.isNew,
    images: payload.images,
    remove_image_ids: payload.removeImageIds,
  };
  if (includeMethod) fields._method = "PATCH";
  return buildFormData(fields);
}

export async function createWorkerProduct(payload: WorkerProductPayload): Promise<WorkerProduct | null> {
  const body = await requestEnvelope({
    method: "POST",
    url: "/worker/products",
    data: workerProductFormData(payload),
  });
  const data = body.data;
  return data && typeof data === "object" ? mapWorkerProduct(data) : null;
}

export async function updateWorkerProduct(
  productId: number,
  payload: WorkerProductPayload,
): Promise<WorkerProduct | null> {
  // Multipart + PUT/PATCH is not reliable in PHP; send POST with `_method=PATCH`.
  const body = await requestEnvelope({
    method: "POST",
    url: `/worker/products/${productId}`,
    data: workerProductFormData(payload, true),
  });
  const data = body.data;
  return data && typeof data === "object" ? mapWorkerProduct(data) : null;
}

export async function deleteWorkerProduct(productId: number): Promise<void> {
  await requestEnvelope({ method: "DELETE", url: `/worker/products/${productId}` });
}

/* ================================================================== */
/* Admin                                                              */
/* ================================================================== */

export async function fetchAdminAccounts(query: AdminAccountQuery = {}): Promise<Paginated<AdminAccountRow>> {
  return requestList(
    {
      method: "GET",
      url: "/admin/accounts",
      params: compactParams({
        tab: query.tab,
        search: query.search,
        page: query.page,
        per_page: query.perPage,
      }),
    },
    mapAdminAccount,
  );
}

export async function approveAccount(userId: number): Promise<AdminAccountRow | null> {
  const body = await requestEnvelope({ method: "POST", url: `/admin/accounts/${userId}/approve` });
  return body.data && typeof body.data === "object" ? mapAdminAccount(body.data) : null;
}

export async function rejectAccount(userId: number, reason?: string): Promise<void> {
  await requestEnvelope({
    method: "POST",
    url: `/admin/accounts/${userId}/reject`,
    data: compactParams({ reason }),
  });
}

export async function removeAccount(userId: number, payload: { ban?: boolean; reason?: string } = {}): Promise<void> {
  await requestEnvelope({
    method: "POST",
    url: `/admin/accounts/${userId}/remove`,
    data: compactParams({ ban: payload.ban ? 1 : undefined, reason: payload.reason }),
  });
}

export async function restoreAccount(userId: number): Promise<void> {
  await requestEnvelope({ method: "POST", url: `/admin/accounts/${userId}/restore` });
}

export async function fetchIdDocuments(userId: number): Promise<AdminIdDocuments> {
  const body = await requestEnvelope({ method: "GET", url: `/admin/accounts/${userId}/id-documents` });
  const raw = asRecord(body.data);
  // Contract: `{ data: { user: {...}, documents: [{type, download_url, ...}] } }`
  const user = asRecord(raw.user);
  const docsRaw = asArray(raw.documents ?? raw.id_documents ?? raw);
  return {
    id: toId(user.id ?? raw.id ?? userId),
    name: toStr(user.name ?? raw.name),
    documents: docsRaw
      .map((entry) => asRecord(entry))
      .filter((entry) => Object.keys(entry).length > 0)
      .map((entry) => ({
        type: toStr(entry.type),
        // Keep the absolute URL: protected images are fetched through axios
        // (so they carry either the session cookie or the Bearer token).
        url: toStr(entry.download_url ?? entry.url ?? entry.path),
        originalName: toStr(entry.original_name) || undefined,
        mime: toStr(entry.mime) || undefined,
        sizeBytes: toNumOrNull(entry.size_bytes) ?? undefined,
      })),
  };
}

export async function fetchAdminWorkers(search?: string): Promise<AdminAccountRow[]> {
  const body = await requestEnvelope({
    method: "GET",
    url: "/admin/workers",
    params: compactParams({ search }),
  });
  return asArray(body.data).map(mapAdminAccount);
}

export async function createWorker(payload: WorkerPayload): Promise<AdminAccountRow | null> {
  const body = await requestEnvelope({
    method: "POST",
    url: "/admin/workers",
    data: compactParams({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      birthday: payload.birthday,
      gender: payload.gender,
      password: payload.password,
      store_id: payload.storeId,
    }),
  });
  return body.data && typeof body.data === "object" ? mapAdminAccount(body.data) : null;
}

export async function updateWorker(userId: number, payload: Partial<WorkerPayload>): Promise<AdminAccountRow | null> {
  const data: Record<string, unknown> = compactParams({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    birthday: payload.birthday,
    gender: payload.gender,
    password: payload.password,
    store_id: payload.storeId,
  });
  // `compactParams` drops nulls; clearing a worker's store assignment is a
  // legitimate update, so send an explicit null when the caller asks for it.
  if (payload.storeId === null) {
    data.store_id = null;
  }
  const body = await requestEnvelope({
    method: "PATCH",
    url: `/admin/workers/${userId}`,
    data,
  });
  return body.data && typeof body.data === "object" ? mapAdminAccount(body.data) : null;
}

export async function deleteWorker(userId: number): Promise<void> {
  await requestEnvelope({ method: "DELETE", url: `/admin/workers/${userId}` });
}

export async function fetchAdminStores(query: AdminStoreQuery = {}): Promise<Paginated<AdminStore>> {
  return requestList(
    {
      method: "GET",
      url: "/admin/stores",
      params: compactParams({
        category: query.category,
        is_open: query.isOpen === undefined ? undefined : query.isOpen ? 1 : 0,
        search: query.search,
        page: query.page,
        per_page: query.perPage,
      }),
    },
    mapAdminStore,
  );
}

/** Multipart create. `image` is the optional store photo file. */
export async function createAdminStore(
  fields: Record<string, unknown> | object,
): Promise<AdminStore | null> {
  const body = await requestEnvelope({
    method: "POST",
    url: "/admin/stores",
    data: buildFormData(fields as Record<string, unknown>),
  });
  return body.data && typeof body.data === "object" ? mapAdminStore(body.data) : null;
}

/** Multipart update: POST + `_method=PATCH` so PHP parses the image upload. */
export async function updateAdminStore(
  storeId: number,
  fields: Record<string, unknown> | object,
): Promise<AdminStore | null> {
  const body = await requestEnvelope({
    method: "POST",
    url: `/admin/stores/${storeId}`,
    data: buildFormData({ ...(fields as Record<string, unknown>), _method: "PATCH" }),
  });
  return body.data && typeof body.data === "object" ? mapAdminStore(body.data) : null;
}

export async function deleteAdminStore(storeId: number): Promise<void> {
  await requestEnvelope({ method: "DELETE", url: `/admin/stores/${storeId}` });
}

export async function fetchSalesSummary(month?: string): Promise<SalesSummary> {
  const body = await requestEnvelope({
    method: "GET",
    url: "/admin/sales/summary",
    params: compactParams({ month }),
  });
  const raw = asRecord(body.data);
  return {
    month: toStr(raw.month) || month || "",
    revenue: toNum(raw.revenue ?? raw.total_revenue),
    cancelledCount: toNum(raw.cancelled_count),
    cancelledTotal: toNum(raw.cancelled_total),
    notClaimedCount: toNum(raw.not_claimed_count),
    notClaimedTotal: toNum(raw.not_claimed_total),
    ordersCount: toNum(raw.orders_count),
  };
}

export async function fetchSales(query: SalesQuery = {}): Promise<SalesReport> {
  const body = await requestEnvelope({
    method: "GET",
    url: "/admin/sales",
    params: compactParams({ date: query.date, status: query.status }),
  });
  const raw = asRecord(body.data);
  return {
    date: toStr(raw.date),
    revenue: toNum(raw.revenue),
    cancelledTotal: toNum(raw.cancelled_total),
    notClaimedTotal: toNum(raw.not_claimed_total),
    orders: asArray(raw.orders).map(mapOrder),
  };
}

export async function fetchContactMessages(
  query: { status?: string; page?: number; perPage?: number } = {},
): Promise<Paginated<ContactMessageRow>> {
  return requestList(
    {
      method: "GET",
      url: "/admin/contact-messages",
      params: compactParams({ status: query.status, page: query.page, per_page: query.perPage }),
    },
    (rawValue) => {
      const raw = asRecord(rawValue);
      return {
        id: toId(raw.id),
        name: toStr(raw.name),
        email: toStr(raw.email),
        phone: toStr(raw.phone),
        subject: toStr(raw.subject),
        message: toStr(raw.message),
        status:
          toStr(raw.status).toLowerCase() === "read"
            ? "read"
            : toStr(raw.status).toLowerCase() === "replied"
              ? "replied"
              : "new",
        createdAt: toStr(raw.created_at) || null,
      };
    },
  );
}

export async function updateContactMessage(
  messageId: number,
  status: "read" | "replied",
): Promise<void> {
  await requestEnvelope({
    method: "PATCH",
    url: `/admin/contact-messages/${messageId}`,
    data: { status },
  });
}

/* ================================================================== */
/* Protected media                                                    */
/* ================================================================== */

/**
 * Downloads a protected file (e.g. a government ID scan) through the axios
 * client so the request carries the session cookie (same-origin mode) or the
 * Authorization: Bearer header (split/Vercel mode). An <img src> cannot send a
 * Bearer token, which is why the preview uses an object URL.
 *
 * The caller owns the returned object URL and must revoke it when unmounted.
 */
export async function fetchImageObjectUrl(url: string): Promise<string> {
  if (!url) throw new ApiError("Missing image URL.", { status: 400 });
  // Route the request through the configured API base instead of the absolute
  // APP_URL: the browser may be on a different host (localhost vs 127.0.0.1),
  // and cookies/tokens only attach for the API origin actually in use.
  const response = await http.get(toApiRelativePath(url), { responseType: "blob" });
  return URL.createObjectURL(response.data as Blob);
}

/* ================================================================== */
/* Grouped export (handy for imports: `api.auth.login(...)`)          */
/* ================================================================== */

export const api = {
  auth: {
    login,
    logout,
    me: fetchMe,
    register: registerAccount,
    forgotPassword: requestPasswordReset,
    resetPassword,
  },
  profile: {
    get: fetchProfile,
    update: updateProfile,
    changePassword,
    uploadAvatar,
  },
  catalog: {
    home: fetchHome,
    categories: fetchCategories,
    products: fetchProducts,
    product: fetchProduct,
    stores: fetchStores,
    store: fetchStore,
  },
  cart: {
    get: fetchCart,
    addItem: addCartItem,
    updateItem: updateCartItem,
    removeItem: removeCartItem,
    clear: clearCart,
    checkout,
  },
  orders: {
    list: fetchOrders,
    get: fetchOrder,
    cancel: cancelOrder,
  },
  notifications: {
    list: fetchNotifications,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
  },
  contact: {
    send: sendContactMessage,
  },
  worker: {
    orders: fetchWorkerOrders,
    order: fetchWorkerOrder,
    updateOrderStatus: updateWorkerOrderStatus,
    products: fetchWorkerProducts,
    createProduct: createWorkerProduct,
    updateProduct: updateWorkerProduct,
    deleteProduct: deleteWorkerProduct,
  },
  admin: {
    accounts: fetchAdminAccounts,
    approveAccount,
    rejectAccount,
    removeAccount,
    restoreAccount,
    idDocuments: fetchIdDocuments,
    workers: fetchAdminWorkers,
    createWorker,
    updateWorker,
    deleteWorker,
    stores: fetchAdminStores,
    createStore: createAdminStore,
    updateStore: updateAdminStore,
    deleteStore: deleteAdminStore,
    salesSummary: fetchSalesSummary,
    sales: fetchSales,
    contactMessages: fetchContactMessages,
    updateContactMessage,
  },
} as const; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion

export default api;

/**
 * UI domain models for Online Mall Cordova.
 *
 * The API speaks `snake_case` JSON (see docs/BACKEND_ARCHITECTURE.md §2). Every
 * model below is the camelCase shape the React components consume, produced by
 * the mappers in `src/lib/api.ts` (the single mapping boundary).
 *
 * Money is always a plain number in pesos (never a pre-formatted string).
 */

export type Role = "guest" | "customer" | "worker" | "admin";

export type UserStatus = "pending" | "active" | "rejected" | "removed" | "banned";

export type OrderStatus =
  | "Pending"
  | "Ready to Claim"
  | "Claimed"
  | "Cancelled"
  | "Didn't Claimed";

export type NotificationCategory = "Offers & Sales" | "Order" | "System";

/* ------------------------------------------------------------------ */
/* Envelope / pagination                                              */
/* ------------------------------------------------------------------ */

export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
/* Auth & accounts                                                    */
/* ------------------------------------------------------------------ */

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Exclude<Role, "guest">;
  status: UserStatus;
  customerNo: string | null;
  workerNo: string | null;
  gender: string | null;
  /** ISO `YYYY-MM-DD`. */
  birthday: string | null;
  address: string | null;
  profilePhoto: string | null;
  badRecords: number;
  storeId: number | null;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface IdDocumentMeta {
  frontUploaded: boolean;
  backUploaded: boolean;
}

export interface ProfileData {
  user: AuthUser;
  idDocuments: IdDocumentMeta;
}

export interface LoginPayload {
  login: string;
  password: string;
  remember: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  address: string;
  birthday: string;
  gender?: string;
  password: string;
  passwordConfirmation: string;
  profilePhoto?: File | null;
  idFront: File;
  idBack: File;
  agreeTerms: boolean;
}

export interface RegisterResult {
  message: string;
}

export interface ForgotPasswordResult {
  message: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface ProfileUpdatePayload {
  name: string;
  phone: string;
  address: string;
  gender?: string | null;
  birthday?: string | null;
}

export interface PasswordChangePayload {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

/* ------------------------------------------------------------------ */
/* Catalog                                                            */
/* ------------------------------------------------------------------ */

export interface Category {
  id: number;
  name: string;
  slug: string;
  type: "product" | "store";
  parentId: number | null;
  displayName: string;
}

export interface Highlight {
  title: string;
  body: string;
}

export interface Store {
  id: number;
  slug: string;
  name: string;
  categoryId: number | null;
  category: string;
  description: string;
  /** Free-text operating hours, e.g. "6:00AM - 11:00PM". */
  operatingHours: string;
  phone: string;
  isOpen: boolean;
  image: string;
  images: string[];
  highlights: Highlight[];
  floorLocation: string | null;
}

export interface StoreDetail extends Store {
  products: Product[];
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  categoryId: number | null;
  category: string;
  storeId: number | null;
  storeName: string | null;
  description: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  stock: number;
  inStock: boolean;
  isNew: boolean;
  isActive: boolean;
  image: string;
  images: string[];
  highlights: Highlight[];
  createdAt: string | null;
}

export interface ProductDetail extends Product {
  store: Store | null;
  related: Product[];
}

export interface HomeData {
  newArrivals: Product[];
  featuredProducts: Product[];
  stores: Store[];
  stats: {
    products: number;
    stores: number;
  };
}

export interface ProductQuery {
  category?: string;
  search?: string;
  sort?: "price_asc" | "price_desc" | "newest";
  inStock?: boolean;
  outOfStock?: boolean;
  page?: number;
  perPage?: number;
}

export interface StoreQuery {
  category?: string;
  search?: string;
  open?: boolean;
  closed?: boolean;
  page?: number;
  perPage?: number;
}

/* ------------------------------------------------------------------ */
/* Cart                                                               */
/* ------------------------------------------------------------------ */

export interface CartItem {
  id: number;
  productId: number;
  slug: string;
  title: string;
  price: number;
  quantity: number;
  stock: number;
  image: string;
  selected: boolean;
}

export interface CartSummary {
  selectedCount: number;
  itemCount: number;
  total: number;
}

export interface CartData {
  items: CartItem[];
  summary: CartSummary;
}

export interface CheckoutPayload {
  itemIds?: number[];
  selectAll?: boolean;
}

/* ------------------------------------------------------------------ */
/* Orders                                                             */
/* ------------------------------------------------------------------ */

export interface OrderItem {
  id: number;
  productId?: number | null;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export interface OrderRecord {
  /** Display identifier: the public `order_number`, falling back to the DB id. */
  id: string;
  /** Database id used by API calls (cancel / detail). */
  dbId?: number;
  orderNumber?: string | null;
  customerName?: string;
  customerPhone?: string;
  status: OrderStatus;
  statusRaw?: string;
  dateOrdered: string;
  dateReady?: string;
  claimDeadline?: string;
  totalPrice: number;
  subtotal?: number;
  pickupLocation?: string;
  paymentMethod?: string;
  notes?: string | null;
  items: OrderItem[];
}

export interface OrderQuery {
  status?: "active" | "history" | OrderStatus | string;
  search?: string;
  page?: number;
  perPage?: number;
}

/* ------------------------------------------------------------------ */
/* Notifications & contact                                            */
/* ------------------------------------------------------------------ */

export interface NotificationItem {
  id: number;
  title: string;
  description: string;
  category: NotificationCategory;
  /** Server timestamp (`created_at`). */
  createdAt: string;
  /** Display string relative to now, e.g. "2 mins ago" / "10/05/2026". */
  time: string;
  read: boolean;
}

export interface NotificationCounts {
  all: number;
  offers: number;
  order: number;
  system: number;
}

export interface NotificationData {
  items: NotificationItem[];
  counts: NotificationCounts;
  unread: number;
}

export interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  /** Honeypot — must always be empty. */
  website: string;
}

/* ------------------------------------------------------------------ */
/* Admin (imported by the admin frontend module)                      */
/* ------------------------------------------------------------------ */

export interface AdminAccountRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  customerNo: string | null;
  workerNo: string | null;
  gender: string | null;
  birthday: string | null;
  address: string | null;
  profilePhoto: string | null;
  badRecords: number;
  storeId: number | null;
  idDocumentsCount: number;
  createdAt: string | null;
}

export interface AdminAccountQuery {
  tab?: "pending" | "customer" | "worker" | "removed";
  search?: string;
  page?: number;
  perPage?: number;
}

export interface AdminIdDocuments {
  id: number;
  name: string;
  documents: {
    type: string;
    url: string;
    originalName?: string;
    mime?: string;
    sizeBytes?: number;
  }[];
}

export interface WorkerPayload {
  name: string;
  email: string;
  phone: string;
  address: string;
  birthday: string;
  gender?: string;
  password?: string;
  storeId?: number | null;
}

export interface AdminStore {
  id: number;
  slug: string;
  name: string;
  categoryId: number | null;
  category: string;
  description: string;
  operatingHours: string;
  /** Alias kept for the legacy admin modal/table which calls it `time`. */
  time: string;
  phone: string;
  isOpen: boolean;
  image: string;
  floorLocation: string | null;
  createdAt: string | null;
}

export interface AdminStoreQuery {
  category?: string;
  isOpen?: boolean;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface SalesSummary {
  month: string;
  revenue: number;
  cancelledCount: number;
  cancelledTotal: number;
  notClaimedCount: number;
  notClaimedTotal: number;
  ordersCount: number;
}

export interface SalesReport {
  date: string;
  revenue: number;
  cancelledTotal: number;
  notClaimedTotal: number;
  orders: OrderRecord[];
}

export interface SalesQuery {
  date?: string;
  status?: "claimed" | "cancelled" | "not_claimed" | "all" | string;
}

export interface ContactMessageRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied";
  createdAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Worker                                                             */
/* ------------------------------------------------------------------ */

export interface WorkerProduct {
  id: number;
  slug: string;
  name: string;
  categoryId: number | null;
  category: string;
  description: string;
  price: number;
  stock: number;
  isNew: boolean;
  isActive: boolean;
  images: string[];
  /** Server image ids + urls, used to remove individual saved images. */
  imageRecords: { id: number; url: string }[];
  image: string;
  storeId: number | null;
}

export interface WorkerProductQuery {
  category?: string;
  search?: string;
  sort?: "price_asc" | "price_desc" | "newest";
  inStock?: boolean;
  outOfStock?: boolean;
  page?: number;
  perPage?: number;
}

export interface WorkerProductPayload {
  name: string;
  categoryId: number | null;
  description: string;
  price: number;
  stock: number;
  isNew?: boolean;
  images?: File[];
  removeImageIds?: number[];
}

export interface WorkerOrderQuery {
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

/**
 * Formatting helpers shared by every screen.
 * Money: numeric pesos in, `₱` display strings out.
 * Dates: ISO strings in, `m/d/Y` display strings out (Asia/Manila).
 */

const PESO = "\u20B1"; // ₱

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const pesoFormatter2 = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export interface PesoOptions {
  /** Prefix with a space: `₱ 1,299` (catalog style) instead of `₱1,299`. */
  space?: boolean;
  /** Always show two decimals. */
  decimals?: boolean;
}

export function formatPeso(value: number | string | null | undefined, options: PesoOptions = {}): string {
  const amount = toNumber(value);
  const formatted =
    options.decimals || !Number.isInteger(amount) ? pesoFormatter2.format(amount) : pesoFormatter.format(amount);
  return `${options.space ? `${PESO} ` : PESO}${formatted}`;
}

/** `₱ 1,299` — the spaced style used by product cards / detail pages. */
export function formatPesoSpaced(value: number | string | null | undefined): string {
  return formatPeso(value, { space: true });
}

/** Plain number with thousands separators, no currency sign. */
export function formatNumber(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("en-PH").format(toNumber(value));
}

function parseDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
});

const dateShortFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "2-digit",
  day: "2-digit",
  year: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** ISO timestamp / date → `MM/DD/YYYY`. */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-");
    return `${month}/${day}/${year}`;
  }
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : "";
}

/** ISO timestamp / date → `MM/DD/YY`. */
export function formatDateShort(value: string | number | Date | null | undefined): string {
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-");
    return `${month}/${day}/${year.slice(2)}`;
  }
  const date = parseDate(value);
  return date ? dateShortFormatter.format(date) : "";
}

/** ISO timestamp → `MM/DD/YYYY h:mm AM`. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "";
  return `${formatDate(date)} ${timeFormatter.format(date)}`;
}

/** ISO timestamp / date → `YYYY-MM-DD` (for `<input type="date">`). */
export function formatDateInput(value: string | number | Date | null | undefined): string {
  if (typeof value === "string" && DATE_ONLY.test(value)) return value;
  const date = parseDate(value);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** `YYYY-MM-DD` for "today" in mall time (used by date pickers). */
export function todayInputValue(): string {
  return formatDateInput(new Date());
}

/** Human-friendly relative time used by notification cards. */
export function formatRelativeTime(value: string | number | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatDateShort(date);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDateShort(date);
}

/** "Sherwynn James Misula" → "SM" (avatar fallback). */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

/** Age in whole years; `null` when the input is not a valid date. */
export function calculateAge(birthday: string | null | undefined): number | null {
  const date = parseDate(birthday);
  if (!date) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age -= 1;
  return age;
}

export function isAtLeast18(birthday: string | null | undefined): boolean {
  const age = calculateAge(birthday);
  return age !== null && age >= 18;
}

/** Truncates long copy for skeleton/SEO contexts. */
export function truncate(value: string, max = 120): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

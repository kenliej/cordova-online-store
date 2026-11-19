import { useLocation } from "react-router";

/**
 * Returns the route prefix for the current catalog tree:
 *   ""       → customer pages (`/products`, `/stores`, …)
 *   "/guest" → guest pages (`/guest/products`, …)
 *
 * Lets the (single) catalog implementation serve both layouts.
 */
export function useBasePath(): string {
  const { pathname } = useLocation();
  return pathname === "/guest" || pathname.startsWith("/guest/") ? "/guest" : "";
}

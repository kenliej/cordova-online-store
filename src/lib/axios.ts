/**
 * Back-compat alias: the HTTP client now lives in `src/lib/api.ts`.
 * Import from `@/lib/api` in new code.
 */
export { api, ApiError, default, getErrorMessage, getFieldErrors, http } from "./api";

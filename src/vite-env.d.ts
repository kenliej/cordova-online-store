/// <reference types="vite/client" />

/**
 * Build-time environment for the SPA.
 *
 * Same-origin deployment (Docker): leave all of these unset — the client uses
 * a relative `/api` base URL with Sanctum session cookies.
 *
 * Split deployment (Vercel frontend → cPanel API):
 *   VITE_API_BASE_URL=https://kjugarap.top/omc-backend/api
 *   VITE_AUTH_MODE=token
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH_MODE?: "cookie" | "token" | "";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

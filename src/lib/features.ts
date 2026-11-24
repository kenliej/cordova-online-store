import { isTokenAuthMode } from "@/lib/api";

const override = (import.meta.env.VITE_PASSWORD_RESET_ENABLED as string | undefined)
  ?.trim()
  .toLowerCase();

/**
 * Email-based forgot/reset password availability.
 *
 * - Local Docker / `php artisan serve` use cookie auth, so Mailpit keeps working.
 * - Split deployments (Vercel + Render) use token auth; production has no SMTP
 *   configured, so the flow is hidden unless VITE_PASSWORD_RESET_ENABLED=true.
 */
export const isPasswordResetEnabled: boolean =
  override === "true" || (override !== "false" && !isTokenAuthMode);

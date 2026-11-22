import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

/**
 * Dev proxy: keeps the browser on a single origin (no CORS, Sanctum cookie +
 * CSRF flow just works). `changeOrigin: false` keeps the Host header so the
 * Laravel session cookie stays scoped to the browser-visible origin.
 *
 * Target selection (useful when the backend runs in Docker):
 *   1. VITE_PROXY_TARGET env var (shell)          -> highest priority
 *   2. VITE_PROXY_TARGET in .env / .env.local      -> per-machine override
 *   3. http://127.0.0.1:8000                       -> `php artisan serve`
 *   4. http://localhost:8080                       -> `docker compose up` (nginx)
 *
 * Example:
 *   $env:VITE_PROXY_TARGET="http://localhost:8080"; npm run dev
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = (
    process.env.VITE_PROXY_TARGET ||
    env.VITE_PROXY_TARGET ||
    "http://127.0.0.1:8000"
  ).trim();

  const proxy = {
    target: proxyTarget,
    changeOrigin: false,
    secure: false,
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": proxy,
        "/sanctum": proxy,
        "/storage": proxy,
      },
    },
  };
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Dev proxy: keeps the browser on a single origin (no CORS, Sanctum cookie +
// CSRF flow just works). `changeOrigin: false` keeps the Host header so the
// Laravel session cookie stays scoped to the browser-visible origin.
const LARAVEL_DEV_SERVER = "http://127.0.0.1:8000";

const proxy = {
  target: LARAVEL_DEV_SERVER,
  changeOrigin: false,
  secure: false,
};

// https://vite.dev/config/
export default defineConfig({
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
});

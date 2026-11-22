#!/usr/bin/env node
/**
 * Local equivalent of the Docker/nginx production build.
 *
 * Serves the built SPA from `dist/` and proxies the Laravel routes (/api,
 * /sanctum, /storage, /up) to the backend, keeping the browser on a single
 * origin — exactly how docker/nginx/default.conf behaves.
 *
 * Usage:
 *   node scripts/serve-docker-sim.mjs [port] [distDir] [backendUrl]
 *   defaults: 8080 dist http://127.0.0.1:8000
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const [, , portArg, distArg, backendArg] = process.argv;
const port = Number(portArg || process.env.PORT || 8080);
const distDir = path.resolve(distArg || process.env.DIST_DIR || "dist");
const backend = new URL(backendArg || process.env.BACKEND_URL || "http://127.0.0.1:8000");

const PROXY_PREFIXES = ["/api", "/sanctum", "/storage", "/up"];
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  console.error(`[docker-sim] ${path.join(distDir, "index.html")} not found. Build the frontend first (npm run build).`);
  process.exit(1);
}

function isProxied(pathname) {
  return PROXY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function proxy(req, res, url) {
  const target = new URL(url.pathname + url.search, backend);
  const headers = { ...req.headers, host: backend.host };
  delete headers.connection;
  delete headers["proxy-connection"];
  delete headers["keep-alive"];
  delete headers["transfer-encoding"];
  delete headers.upgrade;

  const upstream = http.request(
    target,
    { method: req.method, headers },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", (error) => {
    console.error(`[docker-sim] proxy error ${target.href}: ${error.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "application/json" });
    }
    res.end(JSON.stringify({ message: "Backend unavailable (docker-sim proxy)." }));
  });

  req.pipe(upstream);
}

function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }

  let filePath = path.join(distDir, path.normalize(pathname));
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403).end();
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  // SPA fallback: unknown paths render index.html (React Router).
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const headers = {
    "content-type": MIME[ext] || "application/octet-stream",
    "x-content-type-options": "nosniff",
  };

  if (filePath.endsWith("index.html")) {
    headers["cache-control"] = "no-cache";
  } else if (pathname.startsWith("/assets/")) {
    headers["cache-control"] = "public, max-age=31536000, immutable";
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(500).end("Failed to read static file");
      return;
    }
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);

  if (url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", mode: "docker-sim" }));
    return;
  }

  if (isProxied(url.pathname)) {
    proxy(req, res, url);
    return;
  }

  serveStatic(req, res, url);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[docker-sim] SPA+proxy on http://127.0.0.1:${port} (dist=${distDir}, backend=${backend.origin})`);
});

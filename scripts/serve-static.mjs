#!/usr/bin/env node
/**
 * Static SPA server used to test the split deployment (the Vercel build)
 * locally: the React app is served from its own origin and talks to the API
 * cross-origin with Bearer tokens, exactly like Vercel -> cPanel.
 *
 * Usage:
 *   node scripts/serve-static.mjs [port] [distDir]
 *   defaults: 8091 dist-e2e-split
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const [, , portArg, distArg] = process.argv;
const port = Number(portArg || process.env.PORT || 8091);
const distDir = path.resolve(distArg || process.env.DIST_DIR || "dist-e2e-split");

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
};

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  console.error(`[static] ${path.join(distDir, "index.html")} not found. Build the split frontend first.`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    // No API on this origin: the SPA must call the Laravel API directly.
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "Static frontend server: only GET/HEAD are supported." }));
    return;
  }

  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
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
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const headers = {
    "content-type": MIME[ext] || "application/octet-stream",
    "x-content-type-options": "nosniff",
    "cache-control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
  };

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(500).end("Failed to read static file");
      return;
    }
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[static] split SPA on http://127.0.0.1:${port} (dist=${distDir})`);
});

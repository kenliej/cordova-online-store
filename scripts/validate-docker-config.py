#!/usr/bin/env python3
"""Static validation of the Docker deployment (no Docker engine required).

Checks the compose file, Dockerfiles, nginx/php configs and secret hygiene that
matter for the production container stack. Exits non-zero when a check fails.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
checks: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    checks.append((name, bool(ok), detail))


def read(rel: str) -> str:
    path = ROOT / rel
    return path.read_text(encoding="utf-8", errors="replace") if path.exists() else ""


compose_text = read("docker-compose.yml")
php_dockerfile = read("docker/php/Dockerfile")
nginx_dockerfile = read("docker/nginx/Dockerfile")
nginx_conf = read("docker/nginx/default.conf")
nginx_headers = read("docker/nginx/security-headers.conf")
entrypoint = read("docker/php/entrypoint.sh")
php_ini = read("docker/php/php.ini")
dockerignore = read(".dockerignore")
root_env = read(".env.example")

try:
    import yaml  # type: ignore

    compose = yaml.safe_load(compose_text)
    check("docker-compose.yml is valid YAML", isinstance(compose, dict), "parsed by PyYAML")
except ImportError:
    compose = None
    check("docker-compose.yml is valid YAML", bool(compose_text.strip()), "PyYAML not installed; skipped parse")
except Exception as exc:  # noqa: BLE001
    compose = None
    check("docker-compose.yml is valid YAML", False, str(exc))

services = (compose or {}).get("services", {}) if isinstance(compose, dict) else {}

check("compose defines the expected services", all(s in services for s in ("db", "app", "web", "queue", "scheduler", "mailpit")), ", ".join(services.keys()) or "none")

db = services.get("db", {}) if isinstance(services, dict) else {}
db_env = str(db.get("environment", {}))
check("database port is not published to the host", not db.get("ports"), str(db.get("ports", [])))
check("database image is PostgreSQL 16", bool(re.search(r"postgres:16", str(db.get("image", "")))), str(db.get("image")))
check("database has a healthcheck", "healthcheck" in db)
check("healthcheck uses pg_isready", "pg_isready" in str(db.get("healthcheck", "")))
check("POSTGRES_PASSWORD comes from the environment", "POSTGRES_PASSWORD" in db_env and "${" in db_env)
check("POSTGRES_DB + POSTGRES_USER configured", "POSTGRES_DB" in db_env and "POSTGRES_USER" in db_env)
check("database volume is the PostgreSQL data dir", "/var/lib/postgresql/data" in str(db.get("volumes", "")))

app_env = str((services.get("app", {}) or {}).get("environment", ""))
app_env_map = (services.get("app", {}) or {}).get("environment", {}) or {}
check("APP_DEBUG=false in the app container", "APP_DEBUG" in app_env and "${APP_DEBUG:-false}" in app_env)
check("APP_KEY is required from the environment", "APP_KEY" in app_env and "${APP_KEY:?" in app_env)
check("TRUSTED_HOSTS is configured", "TRUSTED_HOSTS" in app_env)
check(
    "production env defaults for app",
    str(app_env_map.get("APP_ENV", "")) == "${APP_ENV:-production}",
    str(app_env_map.get("APP_ENV", "")),
)

check("web service publishes a port", bool((services.get("web", {}) or {}).get("ports")), str((services.get("web", {}) or {}).get("ports")))
check("web waits for the app healthcheck", "service_healthy" in str((services.get("web", {}) or {}).get("depends_on", {})))
check("queue worker uses the queue:work command", "queue:work" in str((services.get("queue", {}) or {}).get("command", "")))
check("scheduler uses schedule:work", "schedule:work" in str((services.get("scheduler", {}) or {}).get("command", "")))
check("mailpit UI is bound to loopback only", "127.0.0.1" in str((services.get("mailpit", {}) or {}).get("ports", "")))
check("persistent volumes declared", all(v in (compose or {}).get("volumes", {}) for v in ("db_data", "app_storage")), str(list(((compose or {}).get("volumes") or {}).keys())))

check("php Dockerfile pins PHP 8.2 fpm", "php:8.2-fpm" in php_dockerfile, "")
check("composer install uses --no-dev", "--no-dev" in php_dockerfile)
check("runtime image drops build dependencies", "apk del .build-deps" in php_dockerfile or "apk del" in php_dockerfile)
check("app image installs pdo_pgsql", "pdo_pgsql" in php_dockerfile)
check("app image does not install pdo_mysql", "pdo_mysql" not in php_dockerfile)
check("app image has a healthcheck", "HEALTHCHECK" in php_dockerfile)
check("entrypoint applies migrations", "migrate --force" in entrypoint)
check("entrypoint waits for PostgreSQL", "pgsql:host=" in entrypoint)
check("entrypoint refuses to start without APP_KEY", "APP_KEY is not set" in entrypoint)
check("entrypoint warms caches in production", "artisan optimize" in entrypoint)
check("php exposes no version", "expose_php = Off" in php_ini)
check("php hides errors from responses", "display_errors = Off" in php_ini)
check("php opcache enabled", "opcache.enable = 1" in php_ini)

check("nginx proxies /api to php-fpm", "location ^~ /api/" in nginx_conf and "fastcgi_pass app:9000" in nginx_conf)
check("nginx serves SPA fallback", "try_files $uri $uri/ /index.html" in nginx_conf)
check("nginx denies dotfiles", "location ~ /\\.(?!well-known)" in nginx_conf)
check("nginx serves uploaded media", "location ^~ /storage/" in nginx_conf)
check("nginx limits upload body size", "client_max_body_size" in nginx_conf)
check("nginx adds security headers", "X-Content-Type-Options" in nginx_headers and "Content-Security-Policy" in nginx_headers)
check("nginx Dockerfile builds the SPA", "npm run build" in nginx_dockerfile and "outputDirectory" not in nginx_dockerfile)
check("nginx Dockerfile copies security headers snippet", "security-headers.conf" in nginx_dockerfile)

check(".dockerignore excludes backend/.env", "backend/.env" in dockerignore)
check(".dockerignore excludes backend/vendor", "backend/vendor" in dockerignore)
check(".env.example documents APP_KEY", "APP_KEY=" in root_env)
check(".env.example documents DB password + sslmode", "DB_PASSWORD=" in root_env and "DB_SSLMODE=" in root_env)
check(".env.example documents PostgreSQL database", "DB_DATABASE=" in root_env)
check("no MySQL root password left in compose", "DB_ROOT_PASSWORD" not in str((compose or {}).get("services", {})))

failed = [c for c in checks if not c[1]]
for name, ok, detail in checks:
    suffix = f"  ({detail})" if detail and not ok else ""
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{suffix}")

print(f"\n{len(checks) - len(failed)}/{len(checks)} Docker configuration checks passed.")
if failed:
    print("Docker configuration validation FAILED.")
    sys.exit(1)

print("Docker configuration validation passed (static; run on a Docker host for a live build).")

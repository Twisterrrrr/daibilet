#!/usr/bin/env python3
"""F4.6: admin.daibilet.ru → Next only (Vite /legacy hard-retired)."""
from pathlib import Path

CONF = Path("/etc/nginx/sites-enabled/daibilet.conf")
WEB_UPSTREAM = "daibilet_web"

text = CONF.read_text()

if f"upstream {WEB_UPSTREAM} {{" not in text:
    raise SystemExit(f"upstream {WEB_UPSTREAM} not found — run patch-prod-next.py first")

ADMIN_BLOCK = f"""
server {{
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.daibilet.ru;

    # LE cert for api.daibilet.ru also includes admin.daibilet.ru SAN (valid).
    ssl_certificate     /etc/letsencrypt/live/api.daibilet.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.daibilet.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    auth_basic "Daibilet admin";
    auth_basic_user_file /etc/nginx/.htpasswd-daibilet-admin;

    # F4.6: Vite /legacy hard-retired. All admin ops served by Next.
    # See docs/phases/phase-f4-retire-legacy.md

    location /api/ {{
        proxy_pass http://daibilet_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Authorization $http_authorization;
        proxy_read_timeout 600s;
    }}

    # Next admin shell (middleware rewrites / → /admin, /events → /admin/events, …).
    location / {{
        proxy_pass http://{WEB_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }}
}}
"""

ADMIN_HTTP = """
server {
    listen 80;
    listen [::]:80;
    server_name admin.daibilet.ru;
    return 301 https://admin.daibilet.ru$request_uri;
}
"""


def find_admin_blocks(src: str) -> list[tuple[int, int]]:
    ranges: list[tuple[int, int]] = []
    pos = 0
    while True:
        idx = src.find("server_name admin.daibilet.ru;", pos)
        if idx == -1:
            break
        start = src.rfind("\nserver {", 0, idx)
        if start == -1:
            start = src.rfind("server {", 0, idx)
        if start == -1:
            raise SystemExit("admin server block start not found")
        i = src.find("{", start)
        depth = 0
        end = None
        for j in range(i, len(src)):
            if src[j] == "{":
                depth += 1
            elif src[j] == "}":
                depth -= 1
                if depth == 0:
                    end = j + 1
                    break
        if end is None:
            raise SystemExit("admin server block end not found")
        ranges.append((start, end))
        pos = end
    return ranges


ranges = find_admin_blocks(text)
if not ranges:
    text = text.rstrip() + "\n" + ADMIN_HTTP + "\n" + ADMIN_BLOCK + "\n"
    print("appended admin.daibilet.ru Next-only block")
else:
    for start, end in reversed(ranges):
        text = text[:start] + text[end:]
    text = text.rstrip() + "\n" + ADMIN_HTTP + "\n" + ADMIN_BLOCK + "\n"
    print(f"replaced {len(ranges)} admin.daibilet.ru server block(s) with Next-only")

if "/legacy/" in text and "server_name admin.daibilet.ru;" in text:
    # Safety: strip leftover legacy locations if somehow still present in other fragments.
    print("warning: /legacy/ still present somewhere in conf after rewrite")

if "proxy_pass http://daibilet_web;" in text and "server_name admin.daibilet.ru;" in text:
    print("admin Next cutover markers present (no /legacy)")

CONF.write_text(text)
print(f"wrote {CONF}")

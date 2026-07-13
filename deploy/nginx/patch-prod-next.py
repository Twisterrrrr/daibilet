#!/usr/bin/env python3
"""Patch daibilet.ru public block: proxy to Next :3001, keep /api/ on :4000, www→apex 301."""
from pathlib import Path

CONF = Path("/etc/nginx/sites-enabled/daibilet.conf")
WEB_PORT = 3001
text = CONF.read_text()

upstream = f"""
upstream daibilet_web {{
    server 127.0.0.1:{WEB_PORT};
    keepalive 16;
}}
"""

if "upstream daibilet_web {" not in text:
    idx = text.find("upstream daibilet_api {")
    if idx == -1:
        raise SystemExit("daibilet_api upstream not found")
    end = text.index("}", idx) + 2
    text = text[:end] + upstream + text[end:]

# Ensure www → apex redirect server exists (443 + 80 if present).
www_redirect_443 = """
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.daibilet.ru;

    ssl_certificate     /etc/ssl/daibilet.ru.crt;
    ssl_certificate_key /etc/ssl/daibilet.ru.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    return 301 https://daibilet.ru$request_uri;
}
"""

if "server_name www.daibilet.ru;" not in text or "return 301 https://daibilet.ru$request_uri;" not in text:
    # Insert before the main public apex block when possible.
    marker = "server_name daibilet.ru www.daibilet.ru *.daibilet.ru;"
    alt_marker = "server_name daibilet.ru;"
    insert_at = text.find(marker)
    if insert_at == -1:
        insert_at = text.find(alt_marker)
    if insert_at != -1:
        server_start = text.rfind("\nserver {", 0, insert_at)
        text = text[:server_start] + www_redirect_443 + text[server_start:]
        print("added www→apex 301 server")
    else:
        text = text + "\n" + www_redirect_443
        print("appended www→apex 301 server")

# Rewrite combined apex+www block to apex-only Next proxy.
for marker in (
    "server_name daibilet.ru www.daibilet.ru *.daibilet.ru;",
    "server_name daibilet.ru www.daibilet.ru;",
):
    if marker not in text:
        continue
    server_start = text.rfind("\nserver {", 0, text.index(marker))
    block_end = text.index("\n}\n", text.index(marker)) + 2
    old_block = text[server_start:block_end]
    if "proxy_pass http://daibilet_web" in old_block and "server_name daibilet.ru;" in old_block and "www.daibilet.ru" not in old_block.split("server_name", 1)[1].split(";", 1)[0]:
        print("prod Next proxy already apex-only")
        break

    new_block = f"""
server {{
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name daibilet.ru *.daibilet.ru;

    ssl_certificate     /etc/ssl/daibilet.ru.crt;
    ssl_certificate_key /etc/ssl/daibilet.ru.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml text/html;

    location /api/ {{
        proxy_pass http://daibilet_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    location / {{
        proxy_pass http://daibilet_web;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }}
}}
"""
    text = text[:server_start] + new_block + text[block_end:]
    print(f"patched daibilet.ru → Next :{WEB_PORT} (apex-only)")
    break
else:
    if "proxy_pass http://daibilet_web" in text:
        print("prod Next proxy already configured")
    else:
        raise SystemExit("prod public server block not found")

CONF.write_text(text)

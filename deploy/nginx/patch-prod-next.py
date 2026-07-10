#!/usr/bin/env python3
"""Patch daibilet.ru public block: proxy to Next :3001, keep /api/ on :4000."""
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

marker = "server_name daibilet.ru www.daibilet.ru *.daibilet.ru;"
if marker not in text:
    raise SystemExit("prod public server block not found")

server_start = text.rfind("\nserver {", 0, text.index(marker))
block_end = text.index("\n}\n", text.index(marker)) + 2
old_block = text[server_start:block_end]

if "proxy_pass http://daibilet_web" in old_block:
    print("prod Next proxy already configured")
    CONF.write_text(text)
    raise SystemExit(0)

new_block = f"""
server {{
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name daibilet.ru www.daibilet.ru *.daibilet.ru;

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
CONF.write_text(text)
print(f"patched daibilet.ru → Next :{WEB_PORT}")

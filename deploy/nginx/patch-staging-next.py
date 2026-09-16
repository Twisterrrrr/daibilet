#!/usr/bin/env python3
"""Patch staging.daibilet.ru: proxy public to Next :3000, keep /api/ on :4001."""
from pathlib import Path

CONF = Path("/etc/nginx/sites-enabled/daibilet.conf")
text = CONF.read_text()

if "upstream daibilet_web_staging" not in text:
    insert_after = "upstream daibilet_api_staging {"
    idx = text.find(insert_after)
    if idx == -1:
        raise SystemExit("daibilet_api_staging upstream not found")
    end = text.index("}", idx) + 2
    text = (
        text[:end]
        + "\n\nupstream daibilet_web_staging {\n    server 127.0.0.1:3000;\n    keepalive 8;\n}\n"
        + text[end:]
    )

marker = "server_name staging.daibilet.ru;"
if marker not in text:
    raise SystemExit("staging server block not found")

server_start = text.rfind("\nserver {", 0, text.index(marker))
block_end = text.index("\n}\n", text.index(marker)) + 2
old_block = text[server_start:block_end]

if "proxy_pass http://daibilet_web_staging" in old_block:
    print("staging Next proxy already configured")
    CONF.write_text(text)
    raise SystemExit(0)

new_block = """
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name staging.daibilet.ru;

    ssl_certificate     /etc/letsencrypt/live/staging.daibilet.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.daibilet.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header X-Robots-Tag "noindex, nofollow" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml text/html;

    location /api/ {
        proxy_pass http://daibilet_api_staging;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header X-Robots-Tag "noindex, nofollow" always;
    }

    location /admin/ {
        alias /var/www/daibilet/staging-admin/;
        try_files $uri $uri/ /admin/index.html;
        add_header X-Robots-Tag "noindex, nofollow" always;
    }

    location / {
        proxy_pass http://daibilet_web_staging;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        add_header X-Robots-Tag "noindex, nofollow" always;
    }
}
"""

text = text[:server_start] + new_block + text[block_end:]
CONF.write_text(text)
print("patched staging.daibilet.ru → Next :3000")

#!/usr/bin/env python3
"""Patch staging.daibilet.ru: proxy public to Next :3000, keep /api/ on :4001."""
from pathlib import Path
import re

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

catalog_location = """    # Public catalog reads are proxied through Next's allowlisted server client.
    # Orders, writes, admin, and other API paths continue to use staging API.
    location ~ ^/api/public/(events(/[^/]+)?|venues(/(event-counts|map-tip|[^/]+))?|cities/[^/]+|destinations|articles(/[^/]+)?|landings/[^/]+|landings-catalog|search(/results)?)$ {
        proxy_pass http://daibilet_web_staging;
        proxy_http_version 1.1;
        proxy_set_header Authorization "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header X-Robots-Tag "noindex, nofollow" always;
    }
"""

# The current admin UI is part of the Next application. Keep staging's admin
# route on the same upstream instead of aliasing an obsolete Vite directory.
admin_location = """    location /admin/ {
        proxy_pass http://daibilet_web_staging;
        proxy_http_version 1.1;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        add_header X-Robots-Tag "noindex, nofollow" always;
    }
"""
if "location /admin/ {" in old_block:
    old_block, count = re.subn(
        r"    location /admin/ \{.*?\n    \}\n",
        admin_location,
        old_block,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise SystemExit("could not safely replace staging /admin location")
    text = text[:server_start] + old_block + text[block_end:]
    block_end = server_start + len(old_block)

if re.search(r"location / \{\s*proxy_pass http://daibilet_web_staging;", old_block):
    if "location ~ ^/api/public/" not in old_block:
        api_marker = "    location /api/ {"
        if api_marker not in old_block:
            raise SystemExit("could not find staging API location to insert catalog proxy")
        old_block = old_block.replace(api_marker, catalog_location + "\n" + api_marker, 1)
        text = text[:server_start] + old_block + text[block_end:]
    print("staging Next proxy configured; catalog split applied")
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

    location ~ ^/api/public/(events(/[^/]+)?|venues(/(event-counts|map-tip|[^/]+))?|cities/[^/]+|destinations|articles(/[^/]+)?|landings/[^/]+|landings-catalog|search(/results)?)$ {
        proxy_pass http://daibilet_web_staging;
        proxy_http_version 1.1;
        proxy_set_header Authorization "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header X-Robots-Tag "noindex, nofollow" always;
    }

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
        proxy_pass http://daibilet_web_staging;
        proxy_http_version 1.1;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
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

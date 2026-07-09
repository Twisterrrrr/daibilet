#!/usr/bin/env python3
"""Patch staging.daibilet.ru nginx block: noindex headers + staging API upstream."""
from pathlib import Path

CONF = Path("/etc/nginx/sites-enabled/daibilet.conf")
text = CONF.read_text()

if "upstream daibilet_api_staging" not in text:
    text = text.replace(
        "upstream daibilet_api {\n    server 127.0.0.1:4000;\n    keepalive 32;\n}\n",
        "upstream daibilet_api {\n    server 127.0.0.1:4000;\n    keepalive 32;\n}\n\n"
        "upstream daibilet_api_staging {\n    server 127.0.0.1:4001;\n    keepalive 8;\n}\n",
        1,
    )

marker = "server_name staging.daibilet.ru;"
server_start = text.rfind("\nserver {", 0, text.index(marker))
block_end = text.index("\n}\n", text.index(marker)) + 2
block = text[server_start:block_end]

block = block.replace("proxy_pass http://daibilet_api;", "proxy_pass http://daibilet_api_staging;", 1)

if "location ^~ /assets/" in block and 'location ^~ /assets/' in block:
    block = block.replace(
        "location ^~ /assets/ {\n        try_files $uri =404;\n        add_header Cache-Control",
        "location ^~ /assets/ {\n        try_files $uri =404;\n"
        '        add_header X-Robots-Tag "noindex, nofollow" always;\n'
        "        add_header Cache-Control",
        1,
    )

if "location = /index.html" in block:
    block = block.replace(
        "location = /index.html {\n        add_header Cache-Control",
        "location = /index.html {\n"
        '        add_header X-Robots-Tag "noindex, nofollow" always;\n'
        "        add_header Cache-Control",
        1,
    )

if "location /api/" in block:
    api_chunk = block.split("location /api/", 1)[1].split("\n    }", 1)[0]
    if "X-Robots-Tag" not in api_chunk:
        block = block.replace(
            "        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n\n    location ^~ /assets/",
            "        proxy_set_header X-Forwarded-Proto $scheme;\n"
            '        add_header X-Robots-Tag "noindex, nofollow" always;\n'
            "    }\n\n    location ^~ /assets/",
            1,
        )

if "location / {\n        try_files $uri $uri/ /index.html;\n    }" in block:
    block = block.replace(
        "location / {\n        try_files $uri $uri/ /index.html;\n    }",
        "location / {\n        try_files $uri $uri/ /index.html;\n"
        '        add_header X-Robots-Tag "noindex, nofollow" always;\n'
        "    }",
        1,
    )

text = text[:server_start] + block + text[block_end:]
CONF.write_text(text)
print("patched", CONF)

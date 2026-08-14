#!/usr/bin/env python3
"""Add /api/user/ and /api/auth/ proxy to api.daibilet.ru nginx block."""
from pathlib import Path

CONF = Path("/etc/nginx/sites-enabled/daibilet.conf")
text = CONF.read_text()
marker = "    server_name api.daibilet.ru;"
start = text.index(marker)
server_start = text.rfind("\nserver {", 0, start)
block_end = text.index("\n}\n", text.index(marker)) + 2
block = text[server_start:block_end]

insert = """
    location ^~ /api/user/ {
        proxy_pass http://daibilet_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ^~ /api/auth/ {
        proxy_pass http://daibilet_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
"""

if "/api/user/" not in block:
    block = block.replace("\n    location / {\n        return 404;\n    }", insert + "\n    location / {\n        return 404;\n    }", 1)
    text = text[:server_start] + block + text[block_end:]
    CONF.write_text(text)
    print("patched api.daibilet.ru user/auth routes")
else:
    print("already patched")

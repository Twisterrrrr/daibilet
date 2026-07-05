#!/usr/bin/env python3
"""Patch staging.daibilet.ru nginx block: separate root + noindex."""
from pathlib import Path

path = Path("/etc/nginx/sites-enabled/daibilet.conf")
text = path.read_text(encoding="utf-8")

marker = "server_name staging.daibilet.ru;"
if marker not in text:
    raise SystemExit("staging server block not found")

before, after = text.split(marker, 1)
block_end = after.find("\n}")
if block_end == -1:
    raise SystemExit("staging block end not found")
staging_tail = after[block_end + 2 :]
staging_block = after[:block_end]

staging_block = staging_block.replace(
    "root /var/www/daibilet/public;",
    "root /var/www/daibilet/staging;",
)
if 'add_header X-Robots-Tag "noindex, nofollow" always;' not in staging_block:
    staging_block = staging_block.replace(
        "index index.html;\n",
        'index index.html;\n\n    add_header X-Robots-Tag "noindex, nofollow" always;\n',
        1,
    )

new_text = before + marker + staging_block + "\n}" + staging_tail
path.write_text(new_text, encoding="utf-8")
print("nginx staging block updated")

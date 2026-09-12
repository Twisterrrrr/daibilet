#!/usr/bin/env python3
"""Serve Next /_next/static/ from disk via nginx alias (bypass Node + proxy_cache).

Why: deploy builds overwrite apps/web/.next while next start is still up → clients
get 400/ChunkLoadError on CSS/JS (including cities/%5Bslug%5D/page-*.js). Serving
static files from disk keeps chunks available across restarts and avoids caching
HTML/static mix through location /.
"""

from __future__ import annotations

import pathlib
import re
import sys

CONF = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/etc/nginx/sites-enabled/daibilet.conf")
STATIC_ROOT = pathlib.Path(
    sys.argv[2] if len(sys.argv) > 2 else "/opt/daibilet/apps/web/.next/static"
)

STATIC_LOCATION = f"""
    # Next build artifacts: serve from disk (brackets in [slug] paths OK when encoded).
    # Must stay ahead of location / so proxy_cache never wraps immutable chunks.
    location ^~ /_next/static/ {{
        alias {STATIC_ROOT}/;
        access_log off;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }}
"""


def insert_static_location(block: str) -> str:
    if "location ^~ /_next/static/" in block:
        # Refresh only the location body. Do NOT span from the preceding comment:
        # /images/ may sit between "# Next build artifacts" and this location when
        # patch-prod-nginx-images-static.py runs first.
        return re.sub(
            r"\n    location \^~ /_next/static/ \{.*?\n    \}\n",
            "\n"
            + "    location ^~ /_next/static/ {\n"
            + f"        alias {STATIC_ROOT}/;\n"
            + "        access_log off;\n"
            + "        expires 365d;\n"
            + '        add_header Cache-Control "public, max-age=31536000, immutable";\n'
            + "    }\n",
            block,
            count=1,
            flags=re.S,
        )

    # Prefer insert before location / { ... proxy_pass daibilet_web
    marker = "    location / {\n        proxy_cache daibilet_web;"
    if marker in block:
        return block.replace(marker, STATIC_LOCATION.rstrip() + "\n\n" + marker, 1)

    marker2 = "    location / {\n        proxy_pass http://daibilet_web;"
    if marker2 in block:
        return block.replace(marker2, STATIC_LOCATION.rstrip() + "\n\n" + marker2, 1)

    return block


def patch_daibilet_public_server(text: str) -> str:
    """Patch the apex public server_name daibilet.ru *.daibilet.ru block only."""
    marker = "server_name daibilet.ru *.daibilet.ru;"
    if marker not in text:
        marker = "server_name daibilet.ru;"
    if marker not in text:
        raise SystemExit("public daibilet.ru server block not found")

    server_start = text.rfind("\nserver {", 0, text.index(marker))
    if server_start < 0:
        server_start = text.index("server {", 0, text.index(marker) + 1)
    # find matching closing brace for this server
    i = text.index("{", server_start)
    depth = 0
    end = None
    for j in range(i, len(text)):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                end = j + 1
                break
    if end is None:
        raise SystemExit("could not find end of public server block")

    block = text[server_start:end]
    new_block = insert_static_location(block)
    if new_block == block and "location ^~ /_next/static/" in block:
        print("noop: /_next/static/ alias already present")
        return text
    return text[:server_start] + new_block + text[end:]


def main() -> None:
    if not STATIC_ROOT.is_dir():
        print(f"warning: static root missing (will 404 until first build): {STATIC_ROOT}")

    original = CONF.read_text(encoding="utf-8")
    text = patch_daibilet_public_server(original)
    if text == original:
        return

    backup = CONF.with_suffix(CONF.suffix + ".bak-next-static")
    if CONF.parent.name in {"sites-enabled", "conf.d"}:
        backup = pathlib.Path("/root") / f"{CONF.name}.bak-next-static"
    backup.write_text(original, encoding="utf-8")
    CONF.write_text(text, encoding="utf-8")
    print(f"updated {CONF} → alias {STATIC_ROOT}/ (backup {backup})")


if __name__ == "__main__":
    main()

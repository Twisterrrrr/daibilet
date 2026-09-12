#!/usr/bin/env python3
"""Serve /images/* from disk via nginx alias (bypass Next + /_next/image optimizer).

Why: local static under apps/web/public/images (synced from apps/public/public/images)
must not hit Node image optimizer — MSK egress/DNS failures and SWR rebuild hangs
cause 502/504 on /_next/image even for on-disk PNG/JPG.
"""

from __future__ import annotations

import pathlib
import re
import sys

CONF = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/etc/nginx/sites-enabled/daibilet.conf")
IMAGES_ROOT = pathlib.Path(
    sys.argv[2] if len(sys.argv) > 2 else "/opt/daibilet/apps/web/public/images"
)

IMAGES_LOCATION = f"""
    # Local static images: serve from disk (bypass /_next/image optimizer).
    # Must stay ahead of location / so proxy_cache never wraps city/blog covers.
    location ^~ /images/ {{
        alias {IMAGES_ROOT}/;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }}
"""


def insert_images_location(block: str) -> str:
    if "location ^~ /images/" in block:
        return re.sub(
            r"\n    # Local static images:.*?location \^~ /images/ \{.*?\n    \}\n",
            "\n" + IMAGES_LOCATION.rstrip() + "\n",
            block,
            count=1,
            flags=re.S,
        )

    # Prefer insert before /_next/static/ (both are ^~ prefix locations).
    marker_static = "    location ^~ /_next/static/ {"
    if marker_static in block:
        return block.replace(marker_static, IMAGES_LOCATION.rstrip() + "\n\n" + marker_static, 1)

    marker = "    location / {\n        proxy_cache daibilet_web;"
    if marker in block:
        return block.replace(marker, IMAGES_LOCATION.rstrip() + "\n\n" + marker, 1)

    marker2 = "    location / {\n        proxy_pass http://daibilet_web;"
    if marker2 in block:
        return block.replace(marker2, IMAGES_LOCATION.rstrip() + "\n\n" + marker2, 1)

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
    new_block = insert_images_location(block)
    if new_block == block and "location ^~ /images/" in block:
        print("noop: /images/ alias already present")
        return text
    return text[:server_start] + new_block + text[end:]


def main() -> None:
    if not IMAGES_ROOT.is_dir():
        print(f"warning: images root missing (will 404 until web build syncs assets): {IMAGES_ROOT}")

    original = CONF.read_text(encoding="utf-8")
    text = patch_daibilet_public_server(original)
    if text == original:
        return

    backup = CONF.with_suffix(CONF.suffix + ".bak-images-static")
    if CONF.parent.name in {"sites-enabled", "conf.d"}:
        backup = pathlib.Path("/root") / f"{CONF.name}.bak-images-static"
    backup.write_text(original, encoding="utf-8")
    CONF.write_text(text, encoding="utf-8")
    print(f"updated {CONF} → alias {IMAGES_ROOT}/ (backup {backup})")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Keep bulk crawlers away from the expensive Next image optimizer."""

from __future__ import annotations

import pathlib
import sys

CONF = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/etc/nginx/sites-enabled/daibilet.conf")
MAP = '''# Bulk crawler image requests can repeatedly decode remote multi-MB files.
# Search crawlers and ordinary clients continue to use the image endpoint.
map "$uri:$http_user_agent" $daibilet_bulk_crawler_image {
    default 0;
    ~*^/_next/image:.*(ahrefsbot|semrushbot|gptbot|bytespider|amazonbot|ccbot) 1;
}

'''
GUARD = '''    if ($daibilet_bulk_crawler_image) {
        return 429;
    }

'''


def patch(source: str) -> str:
    marker = "server_name daibilet.ru *.daibilet.ru;"
    if marker not in source:
        raise SystemExit("public server marker missing")
    if "$daibilet_bulk_crawler_image" not in source:
        source = MAP + source
    server_at = source.index(marker)
    guard_at = source.index("    if ($daibilet_block_scraper) {", server_at)
    if GUARD.strip() not in source[server_at:]:
        source = source[:guard_at] + GUARD + source[guard_at:]
    return source


def main() -> None:
    old = CONF.read_text(encoding="utf-8")
    new = patch(old)
    if new == old:
        print("noop: image crawler guard already present")
    else:
        CONF.write_text(new, encoding="utf-8")
        print(f"patched {CONF}")


if __name__ == "__main__":
    main()

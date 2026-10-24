#!/usr/bin/env python3
"""Idempotent: block known scrapers (liliabots) by User-Agent in prod nginx."""

from __future__ import annotations

import pathlib
import re
import sys

CONF = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/etc/nginx/sites-enabled/daibilet.conf")

MAP_BLOCK = """map $http_user_agent $daibilet_block_scraper {
    default 0;
    ~*(liliabots|liliabot) 1;
}
"""

IF_BLOCK = """    if ($daibilet_block_scraper) {
        return 403;
    }
"""


def ensure_map(text: str) -> str:
    if "$daibilet_block_scraper" in text:
        return text
    # Insert after social_bot map if present, else at file start.
    social = re.search(r"map \$http_user_agent \$daibilet_social_bot \{.*?\n\}\n+", text, re.S)
    if social:
        return text[: social.end()] + "\n" + MAP_BLOCK + "\n" + text[social.end() :]
    return MAP_BLOCK + "\n" + text


def ensure_if_in_server(text: str, server_name_re: str) -> str:
    """Add scraper if-block once inside matching SSL server block."""
    pattern = re.compile(
        rf"(server \{{[^\}}]*?server_name {server_name_re};.*?ssl_protocols[^\n]+\n)",
        re.S,
    )
    match = pattern.search(text)
    if not match:
        return text
    head = match.group(1)
    if "$daibilet_block_scraper" in head or (
        "$daibilet_block_scraper" in text[match.start() : match.start() + 800]
        and "return 403" in text[match.start() : match.start() + 900]
    ):
        # Already near top of this server
        block = text[match.start() : match.end() + 200]
        if "daibilet_block_scraper" in block:
            return text
    insert_at = match.end()
    # Avoid duplicate
    window = text[insert_at : insert_at + 120]
    if "daibilet_block_scraper" in window:
        return text
    return text[:insert_at] + "\n" + IF_BLOCK + text[insert_at:]


def main() -> None:
    original = CONF.read_text(encoding="utf-8")
    text = ensure_map(original)
    text = ensure_if_in_server(text, r"daibilet\.ru \*\.daibilet\.ru")
    text = ensure_if_in_server(text, r"api\.daibilet\.ru")
    if text == original:
        print("noop: scraper block already present")
        return
    backup = CONF.with_suffix(CONF.suffix + ".bak-scraper")
    # Never leave backups inside sites-enabled (nginx includes them).
    if CONF.parent.name in {"sites-enabled", "conf.d"}:
        backup = pathlib.Path("/root") / f"{CONF.name}.bak-scraper"
    backup.write_text(original, encoding="utf-8")
    CONF.write_text(text, encoding="utf-8")
    print(f"updated {CONF} (backup {backup})")


if __name__ == "__main__":
    main()

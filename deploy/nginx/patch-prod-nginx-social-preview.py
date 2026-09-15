#!/usr/bin/env python3
"""Route social crawlers to /api/public/social-preview (clean OG HTML on :4000).

Idempotent. Relies on existing map $daibilet_social_bot.
"""

from __future__ import annotations

import pathlib
import re
import sys

CONF = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/etc/nginx/sites-enabled/daibilet.conf")

REWRITE = """    # Social bots: static OG HTML from API (avoid Next RSC/cache-control private).
    if ($daibilet_social_bot) {
        rewrite ^/(blog|cities|events|venues|locations)(/.*)?$ /api/public/social-preview?path=$uri last;
    }
"""


def ensure_map(text: str) -> str:
    if "map $http_user_agent $daibilet_social_bot" in text:
        return text
    block = """map $http_user_agent $daibilet_social_bot {
    default 0;
    ~*(bot|telegram|facebook|twitter|linkedin|slack|whatsapp|discord|vkshare|preview|embedly|pinterest|skype|googlebot|bingpreview|yandex|mail\\.ru) 1;
}

"""
    return block + text


def ensure_rewrite(text: str) -> str:
    if "social-preview?path=$uri" in text:
        return text
    # Insert once into apex Next server (daibilet.ru *.daibilet.ru), after ssl_protocols / scraper if.
    pattern = re.compile(
        r"(server \{[^\n]*\n"
        r"(?:.*\n)*?"
        r"\s*server_name daibilet\.ru \*\.daibilet\.ru;\n"
        r"(?:.*\n)*?"
        r"\s*ssl_protocols[^\n]+\n"
        r"(?:\s*if \(\$daibilet_block_scraper\) \{\n(?:.*\n)*?\s*\}\n)?)",
        re.M,
    )
    match = pattern.search(text)
    if not match:
        raise SystemExit("apex daibilet.ru server block not found")
    insert_at = match.end()
    return text[:insert_at] + "\n" + REWRITE + text[insert_at:]


def main() -> None:
    original = CONF.read_text(encoding="utf-8")
    text = ensure_map(original)
    text = ensure_rewrite(text)
    if text == original:
        print("noop: social-preview rewrite already present")
        return
    backup = CONF.with_suffix(CONF.suffix + ".bak-social-preview")
    if CONF.parent.name in {"sites-enabled", "conf.d"}:
        backup = pathlib.Path("/root") / f"{CONF.name}.bak-social-preview"
    backup.write_text(original, encoding="utf-8")
    CONF.write_text(text, encoding="utf-8")
    print(f"updated {CONF} (backup {backup})")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Publish `/events` SEO hints on 200 responses and bypass query cache.

Next middleware emits private X-Daibilet-* response hints. Nginx hides those
headers and exposes X-Robots-Tag / Link only after the final response status is
known, so an upstream 404 or 500 can never inherit catalog SEO directives.
"""

from __future__ import annotations

import pathlib
import re
import sys


CONF = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/etc/nginx/sites-enabled/daibilet.conf")

MAPS_BEGIN = "# BEGIN DAIBILET EVENTS SEO MAPS"
MAPS_END = "# END DAIBILET EVENTS SEO MAPS"
LOCATION_BEGIN = "        # BEGIN DAIBILET EVENTS SEO HEADERS"
LOCATION_END = "        # END DAIBILET EVENTS SEO HEADERS"

MAPS = r'''# BEGIN DAIBILET EVENTS SEO MAPS
# Query catalog pages are client-rendered UX slices. Never mix them in the
# shared HTML cache, even when their only parameters are tracking/presentation.
map $request_uri $daibilet_events_query_request {
    default 0;
    ~^/events\? 1;
}

# Middleware emits private hints before rendering; publish them only when the
# final upstream response is 200.
map "$status|$upstream_http_x_daibilet_robots" $daibilet_public_x_robots_tag {
    default "";
    ~^200\|noindex,\s*follow$ "noindex, follow";
}

map "$status|$upstream_http_x_daibilet_canonical" $daibilet_public_canonical_link {
    default "";
    ~^200\|(https://\S+)$ "<$1>; rel=\"canonical\"";
}
# END DAIBILET EVENTS SEO MAPS'''

LOCATION_DIRECTIVES = r'''        # BEGIN DAIBILET EVENTS SEO HEADERS
        proxy_hide_header X-Daibilet-Robots;
        proxy_hide_header X-Daibilet-Canonical;
        add_header X-Robots-Tag $daibilet_public_x_robots_tag always;
        add_header Link $daibilet_public_canonical_link always;
        # END DAIBILET EVENTS SEO HEADERS'''


def find_balanced_block(text: str, block_start: int) -> tuple[int, int]:
    brace = text.find("{", block_start)
    if brace < 0:
        raise ValueError("opening brace not found")
    depth = 0
    for index in range(brace, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return block_start, index + 1
    raise ValueError("closing brace not found")


def public_server_span(text: str) -> tuple[int, int]:
    markers = (
        "server_name daibilet.ru *.daibilet.ru;",
        "server_name daibilet.ru www.daibilet.ru *.daibilet.ru;",
        "server_name daibilet.ru;",
    )
    marker_index = next((text.find(marker) for marker in markers if marker in text), -1)
    if marker_index < 0:
        raise ValueError("public daibilet.ru server block not found")
    start = text.rfind("\nserver {", 0, marker_index)
    if start < 0:
        start = text.rfind("server {", 0, marker_index)
    return find_balanced_block(text, start)


def root_location_span(server_block: str) -> tuple[int, int]:
    for match in re.finditer(r"(?m)^\s{4}location / \{", server_block):
        start, end = find_balanced_block(server_block, match.start())
        block = server_block[start:end]
        if "proxy_pass http://daibilet_web;" in block:
            return start, end
    raise ValueError("public daibilet_web location / not found")


def patch_maps(text: str) -> str:
    pattern = re.compile(
        rf"{re.escape(MAPS_BEGIN)}.*?{re.escape(MAPS_END)}",
        re.S,
    )
    if pattern.search(text):
        return pattern.sub(lambda _match: MAPS, text, count=1)
    marker = "upstream daibilet_web {"
    index = text.find(marker)
    if index < 0:
        raise ValueError("upstream daibilet_web not found")
    return text[:index] + MAPS + "\n\n" + text[index:]


def patch_root_location(block: str) -> str:
    start, end = root_location_span(block)
    location = block[start:end]
    location_pattern = re.compile(
        rf"{re.escape(LOCATION_BEGIN)}.*?{re.escape(LOCATION_END)}",
        re.S,
    )
    if location_pattern.search(location):
        location = location_pattern.sub(LOCATION_DIRECTIVES, location, count=1)
    else:
        marker = "        proxy_pass http://daibilet_web;"
        if marker not in location:
            raise ValueError("daibilet_web proxy_pass not found in public location")
        location = location.replace(marker, LOCATION_DIRECTIVES + "\n" + marker, 1)

    cache_bypass = "        proxy_cache_bypass $http_authorization $daibilet_events_query_request;"
    cache_no_store = "        proxy_no_cache $http_authorization $daibilet_events_query_request;"
    if re.search(r"(?m)^[ \t]*proxy_cache_bypass\s+[^;]+;", location):
        location = re.sub(
            r"(?m)^[ \t]*proxy_cache_bypass\s+[^;]+;",
            cache_bypass,
            location,
            count=1,
        )
    elif "proxy_cache daibilet_web;" in location:
        location = location.replace(
            "        proxy_cache daibilet_web;",
            "        proxy_cache daibilet_web;\n" + cache_bypass,
            1,
        )

    if re.search(r"(?m)^[ \t]*proxy_no_cache\s+[^;]+;", location):
        location = re.sub(
            r"(?m)^[ \t]*proxy_no_cache\s+[^;]+;",
            cache_no_store,
            location,
            count=1,
        )
    elif "proxy_cache daibilet_web;" in location:
        location = location.replace(cache_bypass, cache_bypass + "\n" + cache_no_store, 1)

    return block[:start] + location + block[end:]


def patch_text(text: str) -> str:
    text = patch_maps(text)
    start, end = public_server_span(text)
    server_block = text[start:end]
    patched_server = patch_root_location(server_block)
    return text[:start] + patched_server + text[end:]


def main() -> None:
    original = CONF.read_text(encoding="utf-8")
    patched = patch_text(original)
    if patched == original:
        print("noop: events SEO nginx policy already configured")
        return

    backup = CONF.with_suffix(CONF.suffix + ".bak-events-seo")
    if CONF.parent.name in {"sites-enabled", "conf.d"}:
        backup = pathlib.Path("/root") / f"{CONF.name}.bak-events-seo"
    backup.write_text(original, encoding="utf-8")
    CONF.write_text(patched, encoding="utf-8")
    print(f"updated {CONF} (backup {backup})")


if __name__ == "__main__":
    main()

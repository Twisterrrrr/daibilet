#!/usr/bin/env python3
"""Add nginx rate limiting for /api/public/* (daibilet.ru + api.daibilet.ru).

Limits: ~60 requests/minute per IP, burst 15 (enough for catalog + filters).
Returns HTTP 429 when exceeded.

Usage on prod:
  python3 deploy/nginx/patch-prod-nginx-ratelimit.py
  nginx -t && systemctl reload nginx
"""
from __future__ import annotations

from pathlib import Path

CONF = Path("/etc/nginx/sites-enabled/daibilet.conf")

RATE_ZONE = """
# Public read API: ~60 req/min per IP, burst 15 for page loads / filter changes
limit_req_zone $binary_remote_addr zone=daibilet_public_api:10m rate=60r/m;
limit_req_status 429;
"""

LIMIT_REQ = "        limit_req zone=daibilet_public_api burst=15 nodelay;\n"

PUBLIC_LOCATION = """
    location ^~ /api/public/ {{
{limit_req}        proxy_pass {upstream};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
"""


def ensure_rate_zone(text: str) -> str:
    if "zone=daibilet_public_api:" in text:
        return text
    anchor = text.find("upstream daibilet_api {")
    if anchor == -1:
        anchor = text.find("upstream daibilet_web {")
    if anchor == -1:
        raise SystemExit("upstream daibilet_api / daibilet_web not found")
    return text[:anchor] + RATE_ZONE + text[anchor:]


def find_server_block(text: str, server_name_marker: str) -> tuple[int, int]:
    pos = 0
    while True:
        marker_pos = text.find(server_name_marker, pos)
        if marker_pos == -1:
            raise SystemExit(f"server block not found: {server_name_marker!r}")
        server_start = text.rfind("\nserver {", 0, marker_pos)
        if server_start == -1:
            server_start = text.find("server {", 0, marker_pos)
        block_end = text.index("\n}\n", marker_pos) + 2
        pos = block_end
        block = text[server_start:block_end]
        if "location /api/" in block or "location ^~ /api/public/" in block:
            return server_start, block_end



def inject_limit_into_public_location(block: str) -> str:
    needle = "    location ^~ /api/public/ {"
    if needle not in block:
        return block
    start = block.index(needle)
    after_brace = block.index("{", start) + 1
    segment = block[start:after_brace + 1]
    if "limit_req zone=daibilet_public_api" in segment:
        return block
    return block[:after_brace + 1] + "\n" + LIMIT_REQ + block[after_brace + 1 :]


def insert_public_location_before_api(block: str, upstream: str) -> str:
    api_needle = "    location /api/ {"
    if api_needle not in block:
        return block
    if "location ^~ /api/public/" in block:
        return inject_limit_into_public_location(block)
    chunk = PUBLIC_LOCATION.format(limit_req=LIMIT_REQ, upstream=upstream)
    return block.replace(api_needle, chunk + "\n" + api_needle, 1)


def patch_server(text: str, server_name_marker: str, upstream: str) -> str:
    start, end = find_server_block(text, server_name_marker)
    block = text[start:end]
    if "limit_req zone=daibilet_public_api" in block:
        print(f"rate limit already configured for {server_name_marker.strip()}")
        return text
    new_block = inject_limit_into_public_location(block)
    new_block = insert_public_location_before_api(new_block, upstream)
    if new_block == block:
        print(f"warning: could not patch {server_name_marker.strip()} (no /api/ location)")
        return text
    print(f"patched rate limit for {server_name_marker.strip()}")
    return text[:start] + new_block + text[end:]


def main() -> None:
    if not CONF.is_file():
        raise SystemExit(f"nginx config not found: {CONF}")

    text = CONF.read_text(encoding="utf-8")
    text = ensure_rate_zone(text)

    for marker, upstream in (
        ("server_name daibilet.ru www.daibilet.ru *.daibilet.ru;", "http://daibilet_api"),
        ("server_name api.daibilet.ru;", "http://daibilet_api"),
    ):
        if marker in text:
            text = patch_server(text, marker, upstream)

    CONF.write_text(text, encoding="utf-8")
    print("nginx rate limit patch written; run: nginx -t && systemctl reload nginx")


if __name__ == "__main__":
    main()

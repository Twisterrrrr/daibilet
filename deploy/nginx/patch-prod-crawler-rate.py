#!/usr/bin/env python3
"""Limit declared GPTBot traffic globally on the public Next server.

The nginx map uses an empty key for every other User-Agent. nginx does not
account requests with an empty limit_req_zone key, so human and search traffic
keep their existing behavior. Run nginx -t before reloading after this patch.
"""

from __future__ import annotations

import pathlib
import re
import sys


CONF = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/etc/nginx/sites-enabled/daibilet.conf")
MAP_AND_ZONE = """# One shared bucket for the declared GPTBot crawler, including distributed IPs.
map $http_user_agent $daibilet_gptbot_key {
    default "";
    ~*GPTBot gptbot;
}
limit_req_zone $daibilet_gptbot_key zone=daibilet_gptbot:1m rate=1r/s;

"""
LIMIT = "        limit_req zone=daibilet_gptbot burst=30 nodelay;\n"


def patch(text: str) -> str:
    if "$daibilet_gptbot_key" not in text:
        anchor = re.search(r"(?m)^limit_req_zone \$binary_remote_addr zone=daibilet_public_api:[^\n]+\n", text)
        if not anchor:
            raise ValueError("public API rate zone anchor not found")
        text = text[: anchor.start()] + MAP_AND_ZONE + text[anchor.start() :]

    server = re.search(
        r"server \{\s*listen 443 ssl http2;.*?server_name daibilet\.ru \*\.daibilet\.ru;.*?\n\}",
        text,
        re.S,
    )
    if not server:
        raise ValueError("public HTTPS server not found")
    block = server.group(0)
    if "limit_req zone=daibilet_gptbot" in block:
        return text
    location = "    location / {\n        proxy_cache daibilet_web;"
    if location not in block:
        raise ValueError("public Next location not found")
    block = block.replace(location, "    location / {\n" + LIMIT + "        proxy_cache daibilet_web;", 1)
    return text[: server.start()] + block + text[server.end() :]


def main() -> None:
    original = CONF.read_text(encoding="utf-8")
    updated = patch(original)
    if updated == original:
        print("noop: crawler limit already present")
        return
    backup_dir = pathlib.Path("/etc/nginx") if CONF.parent.name in {"sites-enabled", "conf.d"} else CONF.parent
    backup = backup_dir / f"{CONF.name}.pre-crawler-rate"
    if not backup.exists():
        backup.write_text(original, encoding="utf-8")
    CONF.write_text(updated, encoding="utf-8")
    print(f"updated {CONF}; backup {backup}")


if __name__ == "__main__":
    main()

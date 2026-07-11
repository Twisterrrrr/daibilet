#!/usr/bin/env python3
"""Add nginx proxy_cache for daibilet.ru Next upstream (HTML + public API from Next)."""
from pathlib import Path

CONF = Path("/etc/nginx/sites-enabled/daibilet.conf")
text = CONF.read_text()

cache_path = """
proxy_cache_path /var/cache/nginx/daibilet levels=1:2 keys_zone=daibilet_web:16m max_size=256m inactive=30m use_temp_path=off;
"""

if "keys_zone=daibilet_web:" not in text:
    idx = text.find("upstream daibilet_web {")
    if idx == -1:
        raise SystemExit("upstream daibilet_web not found")
    text = text[:idx] + cache_path + text[idx:]

marker = "proxy_pass http://daibilet_web;"
if marker not in text:
    raise SystemExit("daibilet_web proxy_pass not found")

cache_directives = """
        proxy_cache daibilet_web;
        proxy_cache_valid 200 5m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_lock on;
        proxy_cache_bypass $http_cookie $http_authorization;
        proxy_no_cache $http_cookie $http_authorization;
        add_header X-Cache-Status $upstream_cache_status always;
"""

if "proxy_cache daibilet_web;" in text:
    print("nginx proxy_cache already configured")
else:
    text = text.replace(
        "    location / {\n        proxy_pass http://daibilet_web;",
        "    location / {\n" + cache_directives + "        proxy_pass http://daibilet_web;",
        1,
    )
    CONF.write_text(text)
    print("patched nginx proxy_cache for daibilet.ru")

Path("/var/cache/nginx/daibilet").mkdir(parents=True, exist_ok=True)

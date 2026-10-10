#!/usr/bin/env python3
"""Smoke test for patch-prod-nginx-events-seo.py."""

import importlib.util
from pathlib import Path


spec = importlib.util.spec_from_file_location(
    "events_seo_patch", Path(__file__).with_name("patch-prod-nginx-events-seo.py")
)
patch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patch)

SAMPLE = """
proxy_cache_path /var/cache/nginx/daibilet keys_zone=daibilet_web:16m;
upstream daibilet_web { server 127.0.0.1:3001; }

server {
    server_name admin.daibilet.ru;
    location / {
        proxy_pass http://daibilet_web;
    }
}

server {
    server_name daibilet.ru *.daibilet.ru;
    location / {
        proxy_cache daibilet_web;
        proxy_cache_bypass $http_authorization;
        proxy_no_cache $http_authorization;
        add_header X-Cache-Status $upstream_cache_status always;
        proxy_pass http://daibilet_web;
    }
}
"""

text = patch.patch_text(SAMPLE)
assert text.count(patch.MAPS_BEGIN) == 1
assert text.count(patch.LOCATION_BEGIN) == 1
assert "~^/events\\? 1;" in text
assert 'map "$status|$upstream_http_x_daibilet_robots"' in text
assert "proxy_hide_header X-Daibilet-Robots;" in text
assert "add_header X-Robots-Tag $daibilet_public_x_robots_tag always;" in text
assert "proxy_cache_bypass $http_authorization $daibilet_events_query_request;" in text
assert text.index(patch.LOCATION_BEGIN) > text.index("server_name daibilet.ru *.daibilet.ru;")
assert text.index(patch.LOCATION_BEGIN) > text.index("server_name admin.daibilet.ru;")
assert patch.patch_text(text) == text, "second patch must be idempotent"
print("events SEO patch smoke test OK")

#!/usr/bin/env python3
"""Smoke test for patch-prod-nginx-ratelimit.py (run from deploy/nginx)."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "ratelimit_patch", Path(__file__).with_name("patch-prod-nginx-ratelimit.py")
)
patch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patch)

CONF = Path("_test_nginx_ratelimit.conf")
patch.CONF = CONF

SAMPLE = """
upstream daibilet_api { server 127.0.0.1:4000; }
upstream daibilet_web { server 127.0.0.1:3001; }

server {
    server_name daibilet.ru www.daibilet.ru *.daibilet.ru;
    location /api/ { proxy_pass http://daibilet_api; }
    location / { proxy_pass http://daibilet_web; }
}

server {
    server_name daibilet.ru www.daibilet.ru api.daibilet.ru;
    location / { return 301 https://$host$request_uri; }
}

server {
    server_name api.daibilet.ru;
    location ^~ /api/public/ { proxy_pass http://daibilet_api; }
    location / { return 404; }
}
"""

CONF.write_text(SAMPLE)
patch.main()
text = CONF.read_text()
assert "limit_req_zone" in text
assert text.count("limit_req zone=daibilet_public_api") == 2
patch.main()
assert text == CONF.read_text(), "second run must be idempotent"
CONF.unlink()
print("ratelimit patch smoke test OK")

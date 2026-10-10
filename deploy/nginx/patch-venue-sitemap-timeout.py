#!/usr/bin/env python3
"""Give the runtime venue sitemap enough time for a cold rebuild."""

from pathlib import Path


CONFIG = Path('/etc/nginx/sites-enabled/daibilet.conf')
ANCHOR = '    location / {\n        proxy_cache daibilet_web;'
BLOCK = '''    # A cold venue eligibility rebuild can exceed nginx's 60-second default.
    location = /sitemaps/venues.xml {
        proxy_cache daibilet_web;
        proxy_cache_valid 200 30m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        proxy_cache_lock_timeout 5s;
        add_header X-Cache-Status $upstream_cache_status always;
        proxy_pass http://daibilet_web;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
    }

'''


def main() -> None:
    source = CONFIG.read_text()
    if 'location = /sitemaps/venues.xml {' in source:
        print('venue sitemap location already present')
        return
    if source.count(ANCHOR) != 1:
        raise SystemExit(f'expected exactly one public web cache location, found {source.count(ANCHOR)}')
    CONFIG.write_text(source.replace(ANCHOR, BLOCK + ANCHOR, 1))
    print('venue sitemap location installed; run nginx -t and reload')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""F4.1c: patch admin.daibilet.ru from Vite static root to Next proxy + /legacy Vite SPA."""
from pathlib import Path

CONF = Path("/etc/nginx/sites-enabled/daibilet.conf")
WEB_UPSTREAM = "daibilet_web"

text = CONF.read_text()

if f"upstream {WEB_UPSTREAM} {{" not in text:
    raise SystemExit(f"upstream {WEB_UPSTREAM} not found — run patch-prod-next.py first")

ADMIN_BLOCK = f"""
server {{
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.daibilet.ru;

    ssl_certificate     /etc/ssl/daibilet.ru.crt;
    ssl_certificate_key /etc/ssl/daibilet.ru.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    auth_basic "Daibilet admin";
    auth_basic_user_file /etc/nginx/.htpasswd-daibilet-admin;

    # Deep CRUD still on Vite SPA (Events override, Landings matches, …).
    location ^~ /legacy/ {{
        root /var/www/daibilet;
        try_files $uri $uri/ /legacy/index.html;
    }}

    location = /legacy {{
        return 302 /legacy/;
    }}

    location /api/ {{
        proxy_pass http://daibilet_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Authorization $http_authorization;
        proxy_read_timeout 600s;
    }}

    # Next admin shell (middleware rewrites / → /admin, /events → /admin/events, …).
    location / {{
        proxy_pass http://{WEB_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }}
}}
"""

# Also provide HTTP→HTTPS redirect for admin if missing.
ADMIN_HTTP = """
server {
    listen 80;
    listen [::]:80;
    server_name admin.daibilet.ru;
    return 301 https://admin.daibilet.ru$request_uri;
}
"""

pattern = re.compile(
    r"\nserver\s*\{[^{}]*?server_name\s+admin\.daibilet\.ru;[^{}]*?(?:\{[^{}]*\}[^{}]*?)*\}",
    re.DOTALL,
)

# More robust: find server blocks containing admin.daibilet.ru
def find_admin_blocks(src: str) -> list[tuple[int, int]]:
    ranges: list[tuple[int, int]] = []
    pos = 0
    while True:
        idx = src.find("server_name admin.daibilet.ru;", pos)
        if idx == -1:
            break
        start = src.rfind("\nserver {", 0, idx)
        if start == -1:
            start = src.rfind("server {", 0, idx)
        if start == -1:
            raise SystemExit("admin server block start not found")
        # brace match from start
        i = src.find("{", start)
        depth = 0
        end = None
        for j in range(i, len(src)):
            if src[j] == "{":
                depth += 1
            elif src[j] == "}":
                depth -= 1
                if depth == 0:
                    end = j + 1
                    break
        if end is None:
            raise SystemExit("admin server block end not found")
        ranges.append((start, end))
        pos = end
    return ranges


ranges = find_admin_blocks(text)
if not ranges:
    # Append HTTPS admin + HTTP redirect
    text = text.rstrip() + "\n" + ADMIN_HTTP + "\n" + ADMIN_BLOCK + "\n"
    print("appended admin.daibilet.ru Next+legacy block")
else:
    # Replace all admin server blocks with single HTTP redirect + HTTPS Next block
    # Process from end to start to keep indices valid
    for start, end in reversed(ranges):
        text = text[:start] + text[end:]
    text = text.rstrip() + "\n" + ADMIN_HTTP + "\n" + ADMIN_BLOCK + "\n"
    print(f"replaced {len(ranges)} admin.daibilet.ru server block(s) with Next+legacy")

if "/legacy/" in text and "proxy_pass http://daibilet_web;" in text and "server_name admin.daibilet.ru;" in text:
    print("admin Next cutover markers present")

CONF.write_text(text)
print(f"wrote {CONF}")

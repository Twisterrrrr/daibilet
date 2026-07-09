#!/usr/bin/env bash
set -eu

CONF="${1:-/etc/nginx/sites-enabled/daibilet.conf}"

if grep -q 'daibilet_social_bot' "$CONF"; then
  echo "[nginx] social preview map already present"
  exit 0
fi

python3 - "$CONF" <<'PY'
from pathlib import Path
import sys

conf_path = Path(sys.argv[1])
text = conf_path.read_text(encoding='utf-8')

map_block = '''
map $http_user_agent $daibilet_social_bot {
    default 0;
    ~*(bot|telegram|facebook|twitter|linkedin|slack|whatsapp|discord|vkshare|preview|embedly|pinterest|skype|googlebot|bingpreview|yandex|mail\\.ru) 1;
}
'''

social_locations = '''
    location @daibilet_social_preview {
        proxy_pass http://daibilet_api/api/public/social-preview?path=$request_uri;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/(venues|locations|events|blog|cities)/ {
        error_page 418 = @daibilet_social_preview;
        if ($daibilet_social_bot) {
            return 418;
        }
        try_files $uri $uri/ /index.html;
    }

'''

if 'map $http_user_agent $daibilet_social_bot' not in text:
    text = text.replace('upstream daibilet_api {', map_block + '\nupstream daibilet_api {', 1)

needle = '    location ^~ /assets/ {'
if needle in text and 'location @daibilet_social_preview' not in text:
    text = text.replace(needle, social_locations + needle, 1)

conf_path.write_text(text, encoding='utf-8')
print(f"[nginx] patched {conf_path}")
PY

nginx -t
systemctl reload nginx
echo "[nginx] reloaded"

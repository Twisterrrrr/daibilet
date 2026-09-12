#!/usr/bin/env bash
# Upsert all PUBLISHED blog articles after image restore.
set -euo pipefail
cd /opt/daibilet
set -a
# shellcheck disable=SC1091
source .env
set +a

SLUGS=(
  afisha-regionalnye-goroda
  chto-poslushat-jazz
  fentezi-fest-bylinnyy-bereg
  kak-vybrat-koncert
  kazan-rechnye-progulki
  kuda-poyti-s-detmi
  moskva-avtobusnaya-obzornaya
  moskva-immersivnye-vystavki
  moskva-kvesty-escape-room
  moskva-master-klass-emal
  moskva-rechnye-progulki-zaryade
  moskva-vechernie-diskoteki-shou
  muzyka-v-osobnyakah-spb
  myuzikly-teatr-novichok-msk-spb
  spb-dvory-paradnye-kommunalki
  spb-planetarium-gid
  spb-razvod-mostov-kakoi-reis
  spb-rooftop-guide
  spb-stendap-gid
)

for s in "${SLUGS[@]}"; do
  echo "=== upsert $s ==="
  npm run blog:upsert -- --slug="$s"
done

echo "=== revalidate ==="
curl -fsS -X POST "http://127.0.0.1:${DAIBILET_WEB_PORT:-3001}/api/internal/revalidate" \
  -H "content-type: application/json" \
  -d '{"tags":["articles"],"paths":["/blog"]}' || true

echo "=== image HTTP checks ==="
for s in chto-poslushat-jazz muzyka-v-osobnyakah-spb spb-rooftop-guide; do
  for kind in "" "-inline"; do
    url="https://daibilet.ru/images/blog/${s}${kind}.jpg"
    code=$(curl -sS -o /dev/null -w "%{http_code}" "$url")
    echo "$url -> $code"
  done
  html_code=$(curl -sS -o /tmp/blog-img-check.html -w "%{http_code}" "https://daibilet.ru/blog/$s")
  imgs=$(grep -oE 'src="/images/blog/[^"]+"' /tmp/blog-img-check.html | sort -u | wc -l)
  echo "/blog/$s -> $html_code unique_blog_imgs=$imgs"
  grep -oE 'src="/images/blog/[^"]+"' /tmp/blog-img-check.html | sort -u
done

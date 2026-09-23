#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${PUBLIC_SITE_URL:-https://daibilet.ru}"
GOOGLEBOT='Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
YANDEXBOT='Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'
TELEGRAMBOT='TelegramBot (like TwitterBot)'
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

fetch_path() {
  local agent="$1"
  local path="$2"
  local label="$3"
  local body="$TMP_DIR/body.html"
  local code
  code="$(curl -sS --max-time 30 -A "$agent" -o "$body" -w '%{http_code}' "${BASE_URL}${path}")"
  if [[ "$code" != "200" ]]; then
    echo "ERROR: $label $path returned HTTP $code" >&2
    return 1
  fi
  echo "OK: $label $path HTTP 200"
}

first_sitemap_path() {
  local sitemap="$1"
  local prefix="$2"
  curl -fsSL --max-time 30 "$sitemap" \
    | grep -oE '<loc>[^<]+' \
    | sed 's#<loc>##' \
    | sed -n "s#^${BASE_URL}${prefix}#${prefix}#p" \
    | awk 'NR == 1 { first = $0 } END { print first }'
}

audit_landing_links() {
  local landing_path="$1"
  local safe_name
  safe_name="$(printf '%s' "$landing_path" | tr '/?' '__')"
  local landing_body="$TMP_DIR/landing-${safe_name}.html"
  curl -fsSL --max-time 30 "${BASE_URL}${landing_path}" -o "$landing_body"
  mapfile -t landing_events < <(grep -oE 'href="/events/[^"?#]+' "$landing_body" | sed 's/^href="//' | sort -u)
  [[ "${#landing_events[@]}" -gt 0 ]] || { echo "ERROR: $landing_path exposes no event links" >&2; return 1; }
  for path in "${landing_events[@]}"; do
    fetch_path 'daibilet-link-audit/1.0' "$path" landing-link
  done
  echo "OK: $landing_path (${#landing_events[@]} live event links)"
}

event_path="$(first_sitemap_path "${BASE_URL}/sitemaps/events.xml" '/events/' || true)"
blog_path="$(first_sitemap_path "${BASE_URL}/sitemaps/blog.xml" '/blog/' || true)"
[[ -n "$event_path" ]] || { echo 'ERROR: no event URL in sitemap' >&2; exit 1; }
[[ -n "$blog_path" ]] || { echo 'ERROR: no blog URL in sitemap' >&2; exit 1; }
city_path="$(first_sitemap_path "${BASE_URL}/sitemaps/cities.xml" '/cities/')"
venue_path="$(first_sitemap_path "${BASE_URL}/sitemaps/venues.xml" '/venues/')"
location_path="$(first_sitemap_path "${BASE_URL}/sitemaps/venues.xml" '/locations/')"
for required_path in "$city_path" "$venue_path" "$location_path"; do
  [[ -n "$required_path" ]] || { echo 'ERROR: missing city/venue/location sitemap sample' >&2; exit 1; }
done

paths=(
  '/'
  '/events'
  "$event_path"
  '/blog'
  "$blog_path"
  '/podborki'
  '/cities'
  "$city_path"
  '/places'
  "$venue_path"
  "$location_path"
  '/vystavki-i-muzei'
  '/d/68tssyi'
)

for agent_name in googlebot yandexbot; do
  if [[ "$agent_name" == googlebot ]]; then agent="$GOOGLEBOT"; else agent="$YANDEXBOT"; fi
  for path in "${paths[@]}"; do fetch_path "$agent" "$path" "$agent_name"; done
done

fetch_path "$TELEGRAMBOT" "$event_path" telegrambot
grep -qi 'property="og:title"' "$TMP_DIR/body.html" \
  || { echo 'ERROR: Telegram preview has no og:title' >&2; exit 1; }

# A curated landing must never advertise dead event-detail links.
audit_landing_links '/moscow/dinner-boat'

if [[ "${FULL_LANDING_AUDIT:-0}" == "1" ]]; then
  podborki_body="$TMP_DIR/podborki.html"
  curl -fsSL --max-time 30 "${BASE_URL}/podborki" -o "$podborki_body"
  mapfile -t landing_paths < <(
    grep -oE '<a class="group flex h-full min-h-40[^>]+href="/[^"?#]+' "$podborki_body" \
      | sed 's/^.*href="//' \
      | sort -u
  )
  [[ "${#landing_paths[@]}" -gt 0 ]] || { echo 'ERROR: no curated landing links found on /podborki' >&2; exit 1; }
  for path in "${landing_paths[@]}"; do audit_landing_links "$path"; done
fi

node scripts/smoke-indexability-prod.mjs
echo 'Crawler, landing-link, and indexability smoke passed.'

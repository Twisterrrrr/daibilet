#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOCK_DIR="$(mktemp -d)"
trap 'rm -f "$MOCK_DIR/ssh" "$MOCK_DIR/curl" "$MOCK_DIR/result" "$MOCK_DIR/invalid"; rmdir "$MOCK_DIR"' EXIT
SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
export SHA MOCK_DIR

cat > "$MOCK_DIR/ssh" <<'MOCK'
#!/usr/bin/env bash
printf 'build-id\n%s\n%s\n' "$SHA" "$SHA"
MOCK
cat > "$MOCK_DIR/curl" <<'MOCK'
#!/usr/bin/env bash
out=''
url="${@: -1}"
while (($#)); do
  if [[ "$1" == '-o' ]]; then out="$2"; shift 2; else shift; fi
done
if [[ "$url" == "https://daibilet.ru/?deploy=$SHA" ]]; then
  printf 'home' > "$out"
elif [[ "$url" == "https://daibilet.ru/venues/klub-alekseya-kozlova?deploy=$SHA" ]]; then
  printf 'data-venue-cta-kind' > "$out"
else
  exit 2
fi
printf 200
MOCK
chmod +x "$MOCK_DIR/ssh" "$MOCK_DIR/curl"
export PATH="$MOCK_DIR:$PATH"

bash "$ROOT/infra/deploy-verify.sh" "$SHA" data-venue-cta-kind > "$MOCK_DIR/result"
grep -q 'PASS: deploy verified' "$MOCK_DIR/result"
if bash "$ROOT/infra/deploy-verify.sh" "$SHA" data-venue-cta-kind 'https://example.com/venues/test' > "$MOCK_DIR/invalid" 2>&1; then
  echo 'FAIL: foreign marker URL was accepted' >&2
  exit 1
fi
grep -q 'marker_url must be a daibilet.ru path' "$MOCK_DIR/invalid"
echo 'PASS: marker is read from the venue page and foreign URLs are rejected'

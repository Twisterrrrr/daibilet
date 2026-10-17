#!/usr/bin/env bash
set -euo pipefail
APP_DIR=/unused
source "$(dirname "$0")/web-upstream-handoff.sh"
test_dir="$(mktemp -d)"
trap 'rm -rf "$test_dir"' EXIT
echo 0 > "$test_dir/reload-stage"
pgrep() { echo 50; }
python3_deploy() { :; }
ps() {
  [[ "$*" == '-p 50 -o args=' ]] || return 1
  case "$(cat "$test_dir/reload-stage")" in
    0) echo 'nginx: worker process' ;;
    1) echo 'nginx: worker process is shutting down' ;;
    *) return 1 ;;
  esac
}
sleep() {
  local stage
  stage="$(cat "$test_dir/reload-stage")"
  echo "$((stage + 1))" > "$test_dir/reload-stage"
}
switch_web_upstream 3001 3002
[[ "$(cat "$test_dir/reload-stage")" == 2 ]]
echo 'PASS: handoff waits through asynchronous reload until the old worker exits'

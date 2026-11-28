#!/usr/bin/env bash
# Create a separate staging Basic Auth credential without printing its password.
set -euo pipefail

credentials=/opt/daibilet-staging/.staging-access
passwd_file=/etc/nginx/.htpasswd-daibilet-staging
if [[ -e "$credentials" || -e "$passwd_file" ]]; then
  [[ -f "$credentials" && -f "$passwd_file" ]] || { echo 'staging access files incomplete' >&2; exit 1; }
  echo 'Staging access already configured'
  exit 0
fi
password="$(openssl rand -hex 24)"
umask 077
printf 'username=staging\npassword=%s\n' "$password" >"$credentials"
chown deploy:deploy "$credentials"
chmod 600 "$credentials"
htpasswd -bc "$passwd_file" staging "$password" >/dev/null
chown root:www-data "$passwd_file"
chmod 640 "$passwd_file"
echo 'Staging access created; credentials stored in /opt/daibilet-staging/.staging-access'

#!/usr/bin/env bash
# Shared deploy helpers for root and deploy@ (MSK GHA artifact swap / deploy-prod-next).

systemctl_deploy() {
  local systemctl_bin
  systemctl_bin="$(command -v systemctl || printf '%s\n' /usr/bin/systemctl)"
  if [[ "$(id -u)" -eq 0 ]]; then
    "$systemctl_bin" "$@"
  else
    sudo -n "$systemctl_bin" "$@"
  fi
}

nginx_deploy() {
  local nginx_bin
  nginx_bin="$(command -v nginx || printf '%s\n' /usr/sbin/nginx)"
  if [[ "$(id -u)" -eq 0 ]]; then
    "$nginx_bin" "$@"
  else
    sudo -n "$nginx_bin" "$@"
  fi
}

deploy_lock_dir() {
  echo "${APP_DIR:-/opt/daibilet}/var/lock"
}

ensure_deploy_lock_dir() {
  mkdir -p "$(deploy_lock_dir)"
}

# Next cache files may be owned by the web service user; deploy@ needs sudo fallback.
rm_rf_deploy() {
  local target="$1"
  local rm_bin
  rm_bin="$(command -v rm || printf '%s\n' /usr/bin/rm)"
  [[ -e "$target" ]] || return 0
  if "$rm_bin" -rf -- "$target" 2>/dev/null; then
    return 0
  fi
  if sudo -n "$rm_bin" -rf -- "$target" 2>/dev/null; then
    echo "Removed ${target} (sudo)"
    return 0
  fi
  echo "ERROR: cannot remove ${target}" >&2
  return 1
}

purge_nginx_proxy_cache() {
  local cache_dir="/var/cache/nginx/daibilet"
  local rm_bin
  rm_bin="$(command -v rm || printf '%s\n' /usr/bin/rm)"
  [[ -d "$cache_dir" ]] || return 0
  if [[ "$(id -u)" -eq 0 ]]; then
    "$rm_bin" -rf -- "${cache_dir:?}"/*
    echo "Purged nginx proxy_cache ${cache_dir}"
  elif sudo -n "$rm_bin" -rf -- "${cache_dir:?}"/* 2>/dev/null; then
    echo "Purged nginx proxy_cache ${cache_dir} (sudo)"
  else
    echo "WARN: nginx proxy_cache purge skipped (no permission on ${cache_dir})"
  fi
}

#!/usr/bin/env bash
# Shared deploy helpers for root and deploy@ (MSK GHA artifact swap / deploy-prod-next).

systemctl_deploy() {
  if [[ "$(id -u)" -eq 0 ]]; then
    systemctl "$@"
  elif sudo -n true 2>/dev/null; then
    sudo -n systemctl "$@"
  else
    systemctl "$@"
  fi
}

deploy_lock_dir() {
  echo "${APP_DIR:-/opt/daibilet}/var/lock"
}

ensure_deploy_lock_dir() {
  mkdir -p "$(deploy_lock_dir)"
}

purge_nginx_proxy_cache() {
  local cache_dir="/var/cache/nginx/daibilet"
  [[ -d "$cache_dir" ]] || return 0
  if [[ "$(id -u)" -eq 0 ]]; then
    rm -rf "${cache_dir:?}"/*
    echo "Purged nginx proxy_cache ${cache_dir}"
  elif sudo -n rm -rf "${cache_dir:?}"/* 2>/dev/null; then
    echo "Purged nginx proxy_cache ${cache_dir} (sudo)"
  else
    echo "WARN: nginx proxy_cache purge skipped (no permission on ${cache_dir})"
  fi
}

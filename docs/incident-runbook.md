# Incident runbook — Daibilet prod (MSK)

**Host:** `201.24.125.184` · **Public:** https://daibilet.ru  
**Units:** `daibilet-web` (:3001), `daibilet-api` (:4000)  
**Обновлено:** 2026-08-28

Краткий сценарий для owner / CODEX. Полный чеклист: [production-readiness-checklist.md](./production-readiness-checklist.md).

---

## 1. Быстрая диагностика (2 мин)

```bash
ssh deploy@201.24.125.184   # или MSK_SSH_USER из secrets

# Сервисы
systemctl is-active daibilet-web daibilet-api

# Health локально
curl -fsS http://127.0.0.1:3001/api/health && echo OK web
curl -fsS http://127.0.0.1:4000/api/health && echo OK api

# Публично
curl -fsS -o /dev/null -w "home %{http_code} ttfb=%{time_starttransfer}\n" https://daibilet.ru/

# Ошибки за час
journalctl -u daibilet-web -u daibilet-api -p err --since '1 hour ago' --no-pager -n 80

# Deploy marker (mid-deploy — не рестартить вручную)
cat /var/lock/daibilet-web-deploy.active 2>/dev/null || echo "no active deploy"
```

| Симптом | Вероятная причина | Первое действие |
|---------|-------------------|-----------------|
| 502 / 504 на HTML, API OK | SSR hang / bad `.next` | §2 SSR recovery |
| API 5xx / timeout | DB / sync / event loop | §3 API recovery |
| Статика 404 `/_next/static` | swap без merge static | §4 rollback web |
| Каталог пустой / stale | DTO disk / sync | §5 catalog |
| Admin 401 | env admin creds | проверить `.env` |

---

## 2. SSR / Next recovery

Авто: `deploy/cron/ssr-healthcheck.sh` каждую минуту (если установлен [daibilet-tasks](../deploy/cron/daibilet-tasks)).

**Ручной restart web:**

```bash
sudo systemctl restart daibilet-web
sleep 3
curl -fsS http://127.0.0.1:3001/api/health
```

**Rollback последнего `.next` swap:**

```bash
cd /opt/daibilet
source deploy/scripts/deploy-runtime.sh
systemctl_deploy stop daibilet-web
if [[ -d apps/web/.next.prev ]]; then
  rm_rf_deploy apps/web/.next
  mv apps/web/.next.prev apps/web/.next
fi
systemctl_deploy start daibilet-web
```

Или redeploy предыдущего SHA через GitHub Actions → Deploy MSK web → ref = `<short-sha>`.

---

## 3. API recovery

```bash
sudo systemctl restart daibilet-api
sleep 2
curl -fsS http://127.0.0.1:4000/api/health
curl -fsS http://127.0.0.1:4000/api/public/stats | head -c 300
```

Если OOM — см. `/var/log/daibilet/oom-watch-alerts.log`, `journalctl -u daibilet-api`.

Postgres (Docker, **не** останавливать без owner):

```bash
docker ps | grep postgres
```

---

## 4. После deploy — smoke

```bash
cd /opt/daibilet
POST_DEPLOY_PUBLIC_BASE=https://daibilet.ru \
POST_DEPLOY_WEB_BASE=http://127.0.0.1:3001 \
PORT=4000 \
bash scripts/post-deploy-check.sh
```

Или с локальной машины: `pnpm launch:prod-smoke-next` (нужен доступ к prod URL).

---

## 5. Catalog / widgets

```bash
cd /opt/daibilet
node scripts/widget-readiness-check.mjs --base https://daibilet.ru
node scripts/sync-invariants-check.js   # non-strict по умолчанию
```

TC sync log: `/var/log/daibilet/tc-catalog-sync.log`  
Verify: `bash deploy/scripts/verify-tc-catalog-sync.sh`

---

## 6. Nginx cache poison (soft 404)

После bad deploy swap script чистит `/var/cache/nginx/daibilet/*`. Вручную:

```bash
cd /opt/daibilet
source deploy/scripts/deploy-runtime.sh
nginx_deploy -t && systemctl_deploy reload nginx && sleep 1
purge_nginx_proxy_cache
nginx_deploy -t && systemctl_deploy reload nginx
```

---

## 7. Эскалация

1. **Owner** — продуктовые решения, откат deploy, comms.
2. **CODEX** — SSH, cron/systemd, DB read-only checks.
3. **Finance `.159`** — только payment/YooKassa; не трогать из public deploy.

Зафиксировать в [Diary.md](./Diary.md): дата, симптом, root cause, fix, follow-up task.

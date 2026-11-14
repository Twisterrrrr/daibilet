
---

## 2026-08-29 - MSK prod readiness: nightly health, recovery, auth audit

### Наблюдения
- Prod MSK `/opt/daibilet` на `feat/next-monorepo`, но checkout был behind `origin/feat/next-monorepo` и с большим dirty worktree, поэтому широкий `git pull` не выполнялся.
- `deploy@201.24.125.184` не доступен по текущему ключу; рабочий доступ был через `root@201.24.125.184`.
- SSH-сессии иногда обрывались на длинных foreground-командах, при этом API/Next оставались доступны. Это стоит вынести в ops-наблюдение.

### Решения
- Установлен `/etc/cron.d/daibilet-nightly-health`: 05:15 UTC, `APP_DIR=/opt/daibilet`, `PUBLIC_BASE=https://daibilet.ru`, `PORT=4000`, `POST_DEPLOY_WEB_BASE=http://127.0.0.1:3001`.
- `deploy/cron/nightly-health.sh` и `scripts/post-deploy-check.sh` обновлены точечно из `origin/feat/next-monorepo`, без общего deploy/pull поверх dirty worktree.
- В `scripts/widget-readiness-check.mjs` заменён устаревший TEP smoke-slug `...-826` на живой `marshrut-zolotoi-ostrov-ot-prichala-tretyakovskii-298`; widget smoke: 4/4 OK.
- В `scripts/sync-invariants-check.js` добавлены bounded PG-настройки (`statement_timeout`, `query_timeout`, `connectionTimeoutMillis`, `application_name`). Nightly теперь завершается `Post-deploy check OK`.
- `deploy/cron/ssr-healthcheck.sh` и `deploy/cron/api-healthcheck.sh` получили hourly OK-heartbeat; оба скрипта выставлены `755`, `/etc/cron.d/daibilet-tasks` имеет `644` и trailing newline.

### Проверки
- Nightly manual run: exit 0, `Post-deploy check OK`; API health OK, `/api/public/stats` OK, web `/` 200, web `/events` 200, widgets 4/4 OK.
- DB invariants остаются non-strict warning: `tc_offers_without_widget_url=62596`, `tep_events_without_sessions=40`.
- Auth probes: `/api/user/auth/me` без token 401, с битым JWT 401; `/api/account/purchases` и `/api/account/orders/:id` без bearer 401; login rate limit дал 429 после лимита; валидный audit-user получил 404 на чужой `publicCode`.
- Staging parity: `/opt/daibilet-staging` отсутствует; parity cron/log не найдены.

### Проблемы
- Нужно закоммитить ops-fixes из чистой ветки, потому что prod worktree грязный, а локальный fetch тянул крупный пакет объектов и был остановлен.
- Нужна DB backup automation: активный `pg_dump` cron не найден, обнаружен только старый Next archive `/var/backups/daibilet/next-backup-20260730-162111.tgz`.
- Git history/repo weight мешает быстрым deploy/fetch; стоит перейти на deploy artifacts или почистить крупные generated assets в отдельном регламенте.

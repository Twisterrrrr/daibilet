# CODEX handoff — prod readiness (остаток после ROI batch)

**Дата:** 2026-08-28  
**Источник:** [production-readiness-checklist.md](./production-readiness-checklist.md) топ-5  
**Ветка:** `feat/next-monorepo`  
**Нужен:** SSH на MSK (`201.24.125.184`), read-only + systemd/cron где указано

Agent уже закрыл в репо: web tests CI, post-deploy web smoke, incident runbook, GHA public smoke step.

---

## Задача 1 — Prod nightly health cron (P1)

**Цель:** каждую ночь widgets + DB invariants на prod без ручного grep.

**Steps:**

```bash
ssh deploy@201.24.125.184
chmod +x /opt/daibilet/deploy/cron/nightly-health.sh
chmod +x /opt/daibilet/scripts/post-deploy-check.sh

# Проверить, нет ли уже строки в crontab / /etc/cron.d/
grep -r nightly-health /etc/cron.d/ /var/spool/cron/ 2>/dev/null || true

# Добавить (если нет):
# 15 5 * * * APP_DIR=/opt/daibilet PUBLIC_BASE=https://daibilet.ru PORT=4000 POST_DEPLOY_WEB_BASE=http://127.0.0.1:3001 /opt/daibilet/deploy/cron/nightly-health.sh
```

**Acceptance:**
- [ ] `/var/log/daibilet/nightly-health.log` появляется после 05:15 MSK
- [ ] В логе `Post-deploy check OK` или явная ошибка (не пустой файл)
- [ ] Owner notified если 2 ночи подряд fail

---

## Задача 2 — Verify ops cron installed (P1)

**Цель:** убедиться, что auto-recovery реально работает (INC.504).

```bash
ls -la /opt/daibilet/deploy/cron/ssr-healthcheck.sh
ls -la /opt/daibilet/deploy/cron/api-healthcheck.sh
cat /etc/cron.d/daibilet-tasks
# Scripts MUST be 755; cron invokes via /bin/bash
```

**Acceptance:**
- [ ] `/etc/cron.d/daibilet-tasks` на месте, `644`, trailing newline
- [ ] `ssr-healthcheck.sh` + `api-healthcheck.sh` executable (`755`)
- [ ] `/var/log/daibilet/ssr-health.log` обновлялся за последний час
- [ ] Отчёт в Diary: что было сломано / OK

---

## Задача 3 — User/account API auth audit (P2)

**Цель:** закрыть класс ошибок из Habr §3 — «login есть, authorization дырявая».

**Scope (read-only code review + curl probes на staging/prod):**

| Route | Проверить |
|-------|-----------|
| `POST /api/user/auth/*` | rate limit, no user enum |
| `GET /api/user/auth/me` | только свой профиль |
| Любые `/api/account/*` | bearer required, no IDOR по id |
| Favorites / orders mirror | только свои записи |

**Files:** `apps/backend/src/server.js`, `user-auth.js`, handlers account.*

**Deliverable:** markdown § в Diary или коммент в Tasktracker `PROD.AUTH-AUDIT` — findings + PR fixes if any.

---

## Задача 4 — Staging parity weekly (P3)

Убедиться, что cron parity на staging включён:

```
0 3 * * 0 cd /opt/daibilet-staging && bash scripts/run-parity-check.sh >> /var/log/daibilet/parity.log 2>&1
```

**Acceptance:** [ ] последний `parity.log` < 8 дней или объяснение почему off

---

## Задача 5 — Postgres backup / restore drill (P3, owner approval)

**Не выполнять destructive ops без owner.**

Документировать текущий backup (Timeweb snapshot? manual pg_dump?) и один dry-run restore на staging.

**Deliverable:** 1 страница в `docs/deploy-timeweb.md` § Backup или отдельный `docs/postgres-backup.md`.

---

## Не в scope CODEX (Owner / позже)

- Sentry / centralized APM
- Dependabot policy
- Paid acquisition go-live

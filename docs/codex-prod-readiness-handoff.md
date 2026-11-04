# CODEX handoff — prod readiness (хвост 2026-08-30)

**Дата:** 2026-08-30  
**Источник:** [production-readiness-checklist.md](./production-readiness-checklist.md)  
**Ветка:** `feat/next-monorepo`  
**SSH:** `deploy@201.24.125.184` (root закрыт; `sudo -n systemctl` где нужно)  
**Finance `.159`:** secrets / env **не трогать** без owner

---

## Уже закрыто (не повторять)

| ID | Что | Когда |
|----|-----|-------|
| PROD.NIGHTLY-CRON | nightly health на MSK | 2026-08-29 |
| PROD.OPS-VERIFY | daibilet-tasks + healthcheck 755 | 2026-08-29 |
| PROD.AUTH-AUDIT | IDOR review — no Critical/High | 2026-08-29 |
| PROD.POSTGRES-BACKUP | pg_dump 62M + restore drill `DRILL OK` | 2026-08-30 |
| SSH/VPN | Медленный SSH / banner timeout — **VPN**, не Timeweb | 2026-08-30 |

Commits: `72ba00a0` (pg scripts), `6c63caeb` (docker cp verify fix).

---

## Задача 1 — Postgres cron verify (P1, ~5 мин)

Owner мог не установить cron после drill.

```bash
ssh deploy@201.24.125.184
cd /opt/daibilet && git pull origin feat/next-monorepo

# Если cron не установлен, owner/root запускает one-time install.
# Не расширять sudoers ради ls/tail/cat.
sudo bash deploy/scripts/install-postgres-backup-cron.sh

test -r /etc/cron.d/daibilet-postgres-backup \
  && sed -n '1,80p' /etc/cron.d/daibilet-postgres-backup \
  || echo "cron file is missing or not readable by deploy"

readlink -f /var/backups/daibilet/postgres/LATEST.dump 2>/dev/null \
  || echo "LATEST.dump is missing or not readable by deploy"

test -r /var/log/daibilet/postgres-backup.log \
  && awk 'END { print }' /var/log/daibilet/postgres-backup.log \
  || sudo journalctl -u cron --since "24 hours ago" --no-pager | grep -E "postgres-backup|daibilet" || true
```

**Acceptance:**
- [ ] `/etc/cron.d/daibilet-postgres-backup` exists, `644`
- [ ] `LATEST.dump` symlink → свежий `daibilet-*.dump`
- [ ] Diary: cron verified / installed

---

## Задача 2 — GHA Deploy MSK web green (P1)

Проверить workflow `Deploy MSK web (CI build + atomic swap)` после hardening `deploy@`:

```bash
# на MSK
stat -c '%A %U:%G %n' /opt/daibilet/var /opt/daibilet/var/lock
touch /opt/daibilet/var/lock/.deploy-write-test && rm -f /opt/daibilet/var/lock/.deploy-write-test
# deploy user must write here (not /var/lock/)

# trigger или проверить последний run
gh run list --workflow=deploy-msk-web.yml --limit 3
```

**Acceptance:**
- [ ] Swap step OK (no `Permission denied` on deploy lock)
- [ ] GHA smoke: `https://daibilet.ru` 200, `limit=200` API 200
- [ ] Diary: BUILD_ID + HEAD после swap

---

## Задача 3 — Staging parity decision (P2)

`/opt/daibilet-staging` **отсутствует**. Restore drill использует `:5438/daibilet_staging` in-docker — достаточно для PG drill, **не** для full app parity.

**Варианты (owner choice):**
- A) Recreate `/opt/daibilet-staging` + weekly parity cron
- B) Document «staging off by design» + parity только через drill DB

**Acceptance:**
- [ ] Decision recorded in Diary + Tasktracker `PROD.PARITY-CRON`
- [ ] If A: parity cron + log `< 8 days`

---

## Задача 4 — Threat model diagram (P2)

Deliverable: 1 страница markdown или mermaid в `docs/threat-model.md`:

- Public read (catalog SSR, public API)
- User auth (JWT, favorites, account)
- Admin (Basic, admin API)
- Finance boundary (`.159`, m2m, no shared DB)
- Trust boundaries: browser ↔ nginx ↔ Next ↔ API ↔ PG ↔ finance-api

**Acceptance:**
- [ ] File in repo, linked from checklist §1

---

## Задача 5 — Load smoke catalog (P3)

Из [inc-504-ssr-hardening.md](./inc-504-ssr-hardening.md): 20 parallel requests home + `/events` + city hub.

```bash
# с MSK localhost или external
for url in http://127.0.0.1:3001/ http://127.0.0.1:3001/events http://127.0.0.1:3001/cities/saint-petersburg; do
  seq 1 20 | xargs -P20 -I{} curl -o /dev/null -s -w "%{http_code} ttfb=%{time_starttransfer}s\n" -H "Cache-Control: no-cache" "$url"
done
```

**Acceptance:**
- [ ] All 200, no 502 burst; p95 TTFB noted in Diary

---

## Не в scope CODEX (Owner)

| Item | Owner action |
|------|----------------|
| Sentry / APM | Подключить DSN |
| Timeweb VM autobackup 80GB | Панель ~480₽/мес × copies |
| Off-host PG dump copy | Object Storage / second VM |
| Finance Stage 0 | Webhook ЮKassa + sandbox e2e ([checklist](./checklists/yookassa-e2e-sandbox.md)) |
| m2m token catalog↔finance | Env на MSK + `.159` |
| Dependabot / npm audit CI | Agent PR |
| CODEOWNERS / on-call | Process |

---

## Prompt для Codex (copy-paste)

```
Контекст: Daibilet catalog prod MSK 201.24.125.184, ветка feat/next-monorepo.
SSH: deploy@ (root off, sudo -n systemctl). Finance 85.193.80.159 — secrets не трогать.

Уже закрыто 2026-08-29/30: nightly cron, ops verify, AUTH audit (no Critical/High),
pg_dump 62M + restore drill DRILL OK (71672/3630/44 → :5438), VPN=причина медленного SSH.

Handoff: docs/codex-prod-readiness-handoff.md

Сделай по порядку:

1) POSTGRES CRON VERIFY
   - git pull feat/next-monorepo
   - если нет /etc/cron.d/daibilet-postgres-backup → owner/root запускает deploy/scripts/install-postgres-backup-cron.sh
   - проверь cron/LATEST.dump через sed/readlink/stat без sudo ls/tail, залогируй в Diary

2) GHA DEPLOY MSK WEB
   - проверь последний workflow deploy-msk-web.yml (swap lock в /opt/daibilet/var/lock/)
   - если fail — почини на MSK или в скрипте, добейся green swap + smoke daibilet.ru

3) STAGING PARITY DECISION
   - /opt/daibilet-staging отсутствует
   - зафиксируй в Diary: восстанавливать staging или «off by design»
   - обнови Tasktracker PROD.PARITY-CRON

4) THREAT MODEL
   - создай docs/threat-model.md (mermaid): public/user/admin/finance boundaries
   - ссылка из production-readiness-checklist.md §1

5) LOAD SMOKE (optional)
   - 20 parallel curl home/events/spb hub с localhost :3001
   - p95 TTFB в Diary

Не делать: Sentry, finance .159 env, YooKassa webhook, destructive prod DB ops.

Deliverables: Diary entries с датами, Tasktracker updates, PR только если нужен код.
```

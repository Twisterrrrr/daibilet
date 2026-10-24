# F3 — Cutover public на Next.js

**Предусловие:** F2 exit ✅  
**Canonical app:** `apps/web` (не Codex `apps/public` + proxy)  
**Статус 2026-08-07:** cutover выполнен на MSK. Блоки ниже - historical staging на SPB `.16` (труп). Prod deploy = MSK-only.

---

## Staging (исторический первый шаг - не выполнять на `.16`)

### 1. Server prep (один раз)

```bash
# Historical host was root@213.171.7.16 - DO NOT use. Canon: ssh daibilet-msk
ssh daibilet-msk
cd /opt/daibilet-staging
git fetch origin feat/next-monorepo
git checkout feat/next-monorepo

# systemd Next
cp deploy/systemd/daibilet-web-staging.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable daibilet-web-staging

# nginx: заменить staging block на deploy/nginx/staging-next.conf.snippet
nginx -t && systemctl reload nginx
```

### 2. Env (дополнить `.env`)

```env
DAIBILET_WEB_PORT=3000
NEXT_PUBLIC_TC_WIDGET_TOKEN=...   # = TICKETSCLOUD_WIDGET_TOKEN
NEXT_PUBLIC_TEP_WIDGET_ID=14208
DATABASE_URL=postgresql://...@127.0.0.1:5438/daibilet_staging
```

### 3. Deploy

```bash
chmod +x deploy/scripts/deploy-staging-next.sh
BRANCH=feat/next-monorepo ./deploy/scripts/deploy-staging-next.sh
```

### 4. Smoke

```bash
bash scripts/launch-staging-smoke-next.sh
pnpm backend:next:parity
```

**Staging status (2026-07-10):** ✅ deploy + nginx Next proxy + automated smoke (manual: widget click).

### 5. Nginx patch (один раз)

```bash
python3 deploy/nginx/patch-staging-next.py
nginx -t && systemctl reload nginx
```

**View Source:** `/events`, `/events/[slug]`, `/rechnye-progulki/moscow/`, `/podborki` — контент в HTML.  
**Widgets:** TC + Teplohod click на event page.  
**301:** `/landings/*` → canonical (middleware).

---

## Prod cutover (после staging green) ✅ 2026-07-10

1. Snapshot nginx + rollback: `/var/backups/daibilet/pre-next-*` (`snapshot-prod-rollback.sh`)
2. `daibilet-web.service` → Next **:3001** (staging остаётся :3000)
3. nginx `daibilet.ru` → Next :3001; API `:4000` для sync/admin
4. Smoke: `pnpm launch:prod-smoke-next` (SSR via nginx ✅)
5. Мониторинг 24–48ч

**Rollback:** `rollback-prod-vite.sh` → static SPA, stop `daibilet-web`.

Детали: [phase-f3-prod-rollback.md](./phase-f3-prod-rollback.md).

---

## После F3 — Codex integration

Cherry-pick **не в F3:** schema + event change requests + admin contracts.  
См. [codex-cherry-pick-plan.md](../codex-cherry-pick-plan.md).

---

## Deprecate

- Archive `apps/public` Vite после стабильного prod cutover
- Запись в [decision-log.md](../decision-log.md)

---

## Не входит в F3

- Admin Next (`F4`)
- Retire `dto.js` (`F5`)
- Codex Next/proxy merge
- Phase 2 finance runtime (`Phase G`)

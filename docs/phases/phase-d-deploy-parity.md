# Фаза D — Deploy / parity / CI

**Дата закрытия:** 2026-07-10  
**Ветка:** `integrate/mvp-launch`  
**Статус:** ✅ Закрыта (артефакты в репо; live deploy — команды ниже)

---

## Цель фазы

Автоматизировать проверки после deploy, подготовить CI, nightly cron и parity typed stack на staging — без big-bang переключения prod.

---

## Что сделано

| # | Задача | Артефакт |
|---|--------|----------|
| D1 | Post-deploy smoke | `scripts/post-deploy-check.sh`, `npm run check:post-deploy` |
| D2 | Parity legacy vs typed | `scripts/run-parity-check.sh`, `npm run check:parity` |
| D3 | Deploy scripts | `deploy-from-git.sh`, `deploy-staging.sh` вызывают post-deploy |
| D4 | GitHub CI | `.github/workflows/ci.yml` |
| D5 | Nightly cron | `deploy/cron/nightly-health.sh` + README |
| D6 | Staging TS parity opt-in | `daibilet-api-staging-ts.service.example`, `deploy/env/staging.env.example` |

---

## Команды

### Локально / на сервере после deploy

```bash
# Staging
POST_DEPLOY_PUBLIC_BASE=https://staging.daibilet.ru PORT=4001 npm run check:post-deploy

# Prod
POST_DEPLOY_PUBLIC_BASE=https://daibilet.ru PORT=4000 npm run check:post-deploy
```

### Deploy staging (исторический чеклист; хост `.16` = труп)

```bash
# Не SSH на 213.171.7.16. При необходимости staging - на MSK или `.159` reserve.
ssh daibilet-msk
cd /opt/daibilet-staging
git pull origin integrate/mvp-launch
BRANCH=integrate/mvp-launch ./deploy/scripts/deploy-staging.sh
```

### Deploy prod (после staging green)

```bash
cd /opt/daibilet
BRANCH=integrate/mvp-launch ./deploy/scripts/deploy-from-git.sh
```

### Push GitHub (локально)

```bash
git push origin integrate/mvp-launch
```

Коммиты фаз A–D: `ced2a4c`, `2da5da5`, `a987280`, `<phase-d>`.

---

## CI (GitHub Actions)

Workflow `CI` на push/PR в `integrate/mvp-launch`:

- `db:validate`, `db:generate`, `db:typecheck`
- `backend:typecheck`, `backend:test:ts`
- `public:build`, `admin:build`
- syntax check deploy/import scripts

Parity **не в CI** — требует живую БД; запуск на staging: `npm run check:parity`.

---

## Nightly cron

```bash
15 4 * * * APP_DIR=/opt/daibilet-staging PUBLIC_BASE=https://staging.daibilet.ru /opt/daibilet-staging/deploy/cron/nightly-health.sh
```

См. [deploy/cron/README.md](../../deploy/cron/README.md)

---

## Typed stack на staging (optional)

1. В `.env`: `DAIBILET_TS_PUBLIC_*=1`
2. `cp deploy/systemd/daibilet-api-staging-ts.service.example → systemd`
3. `systemctl daemon-reload && systemctl restart daibilet-api-staging`
4. `npm run check:parity`

Prod остаётся на `start:ts` (уже в `daibilet-api.service`); staging по умолчанию `server.js` до parity green.

---

## Staging deploy (2026-07-10)

- Сервер: `/opt/daibilet-staging` @ `56672cd`
- Health + stats: OK
- Widgets: **4/4** эталона
- Invariants (legacy DB): 2 FAIL — не блокируют deploy в non-strict режиме
  - `tc_offers_without_widget_url`: 62613 → backfill: `npm run tc:sync` с token
  - `tep_events_without_sessions`: 32 orphan TEP events

---

## Exit criteria

| Критерий | Статус |
|----------|--------|
| Post-deploy script в deploy pipeline | ✅ |
| CI workflow в репо | ✅ |
| Cron + staging env docs | ✅ |
| Live staging deploy A–D | ✅ @ `56672cd`, widgets 4/4; invariants legacy debt (см. отчёт) |
| Live prod deploy | ⏳ после staging |
| Staging DB отдельно от prod | ⏳ infra backlog |

---

## Полный цикл регрессии (после deploy)

```bash
npm run check:post-deploy
npm run check:sync-invariants
npm run check:widgets -- --base https://staging.daibilet.ru
# optional:
npm run check:parity
```

---

## Итог дорожной карты A–D

| Фаза | Результат |
|------|-----------|
| A | API widget readiness, эталоны |
| B | TC sync → БД, ProviderLink |
| C | Invariants, import guards |
| D | Deploy checks, CI, cron, parity tooling |

Дальнейшее: отдельная staging БД, prod deploy, browser smoke по чеклисту [widget-data-contract.md](../widget-data-contract.md).

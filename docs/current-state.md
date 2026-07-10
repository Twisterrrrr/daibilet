# Текущее состояние Daibilet

Дата: **2026-07-10** (после фазы E — Prisma runtime rollout)  
Ветка: **`integrate/mvp-launch`**

> **Аудит стека:** [audit-2026-07-10-stack-state.md](./audit-2026-07-10-stack-state.md)  
> Кратко: **Vite/React SPA + Node `start:ts` + Prisma schema**, public read typed с parity; **не Next.js**, **не 100% Prisma Client**.

## Фазы A–E

| Фаза | Статус | Документ |
|------|--------|----------|
| A — виджет API | ✅ | [phase-a-widget-readiness.md](./phases/phase-a-widget-readiness.md) |
| B — import sync → БД | ✅ | [phase-b-import-sync.md](./phases/phase-b-import-sync.md) |
| C — целостность данных | ✅ | [phase-c-data-integrity.md](./phases/phase-c-data-integrity.md) |
| D — deploy / CI / parity | ✅ | [phase-d-deploy-parity.md](./phases/phase-d-deploy-parity.md) |
| E — Prisma runtime rollout | ✅ | [phase-e-prisma-runtime.md](./phases/phase-e-prisma-runtime.md) |

## Prod runtime (2026-07-10)

- API: `start:ts`, все `DAIBILET_TS_PUBLIC_*` + `DAIBILET_TS_ADMIN_*` = 1
- DB prod: `127.0.0.1:5437/daibilet`
- DB staging: `127.0.0.1:5438/daibilet_staging` (snapshot prod)

## Deploy

```bash
# Staging
./deploy/scripts/deploy-staging.sh

# Prod
./deploy/scripts/deploy-from-git.sh

# Staging DB refresh (E5)
STAGING_POSTGRES_PASSWORD=... bash deploy/scripts/restore-staging-db.sh
```

Post-deploy: `npm run check:post-deploy` · Parity: `npm run check:parity`

## CI

GitHub Actions: `.github/workflows/ci.yml` — validate, test, build на PR/push.

## Ops backlog (Phase F)

- [ ] `npm run tc:sync` на prod (backfill widgetUrl)
- [ ] Nightly cron: parity + widgets + invariants
- [ ] Browser smoke (ручной)
- [ ] Venue/city Prisma-native (убрать делегаты dto.js)
- [ ] Admin dashboard/sources на Prisma read

## Документы

- [audit-2026-07-10-stack-state.md](./audit-2026-07-10-stack-state.md)
- [phases/README.md](./phases/README.md)
- [deploy-staging.md](./deploy-staging.md)

# Текущее состояние Daibilet

Дата: **2026-07-10** (после фазы D — дорожная карта A–D закрыта)  
Ветка: **`integrate/mvp-launch`**

## Фазы A–D

| Фаза | Статус | Документ |
|------|--------|----------|
| A — виджет API | ✅ | [phase-a-widget-readiness.md](./phases/phase-a-widget-readiness.md) |
| B — import sync → БД | ✅ | [phase-b-import-sync.md](./phases/phase-b-import-sync.md) |
| C — целостность данных | ✅ | [phase-c-data-integrity.md](./phases/phase-c-data-integrity.md) |
| D — deploy / CI / parity | ✅ | [phase-d-deploy-parity.md](./phases/phase-d-deploy-parity.md) |

## Deploy

```bash
# Staging
./deploy/scripts/deploy-staging.sh

# Prod
./deploy/scripts/deploy-from-git.sh
```

Post-deploy: `npm run check:post-deploy` (встроен в deploy scripts).

## CI

GitHub Actions: `.github/workflows/ci.yml` — validate, test, build на PR/push.

## Ops backlog

- [ ] `git push` + staging deploy коммитов A–D
- [ ] Nightly cron на сервере
- [ ] Отдельная staging БД
- [ ] Browser smoke (ручной)

## Документы

- [phases/README.md](./phases/README.md)
- [deploy-staging.md](./deploy-staging.md)

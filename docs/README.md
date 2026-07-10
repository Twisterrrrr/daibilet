# Документация Daibilet

Навигация по репозиторию `Twisterrrrr/daibilet`.

## С чего начать

1. **[current-state.md](./current-state.md)** — текущее состояние, ветки, блокеры
2. **[decision-log.md](./decision-log.md)** — зафиксированные решения
3. **[launch-qa-and-deploy.md](./launch-qa-and-deploy.md)** — smoke перед продажами
4. **[deploy-timeweb.md](./deploy-timeweb.md)** — prod на Timeweb
5. **[deploy-staging.md](./deploy-staging.md)** — staging `/opt/daibilet-staging`

## Checkpoint / аудит

| Документ | Описание |
|----------|----------|
| **[audit-2026-07-10-stack-state.md](./audit-2026-07-10-stack-state.md)** | **Аудит стека:** Vite vs Next, Prisma vs dto.js, prod flags, рекомендации Phase F |
| **[checkpoint-2026-07-10-mvp-launch.md](./checkpoint-2026-07-10-mvp-launch.md)** | Checkpoint MVP launch, handoff Codex |

## Фазы: виджеты + импорт

| Документ | Описание |
|----------|----------|
| [phases/README.md](./phases/README.md) | Дорожная карта фаз A–E |
| [phases/phase-e-prisma-runtime.md](./phases/phase-e-prisma-runtime.md) | **Фаза E (закрыта):** TS flags, parity, staging DB |
| [phases/phase-a-widget-readiness.md](./phases/phase-a-widget-readiness.md) | **Фаза A (закрыта):** API-проверка виджетов |
| [phases/phase-b-import-sync.md](./phases/phase-b-import-sync.md) | **Фаза B (закрыта):** sync → БД, ProviderLink |
| [phases/phase-c-data-integrity.md](./phases/phase-c-data-integrity.md) | **Фаза C (закрыта):** инварианты, import guards |
| [phases/phase-d-deploy-parity.md](./phases/phase-d-deploy-parity.md) | **Фаза D (закрыта):** deploy checks, CI, cron |
| [import-guards.md](./import-guards.md) | Какие поля Event защищены от sync |
| [widget-data-contract.md](./widget-data-contract.md) | Контракт полей TC/TEP для виджета |
| [widget-etalon-slugs.md](./widget-etalon-slugs.md) | Эталонные slug + `check:widgets` |

## Архитектура и миграции

| Документ | Описание |
|----------|----------|
| [backend-typescript-migration.md](./backend-typescript-migration.md) | TS foundation, phased migration |
| [marketplace-phase-foundation.md](./marketplace-phase-foundation.md) | Фазы 2–4 в схеме (не runtime) |
| [packages/db/README.md](../packages/db/README.md) | Prisma, migrations, smoke |

## Продукт и MVP

| Документ | Описание |
|----------|----------|
| [mvp-spec.md](./mvp-spec.md) | Продуктовая спецификация |
| [seo-public-mvp.md](./seo-public-mvp.md) | SEO public |
| [admin-lovable-v4-mvp-plan.md](./admin-lovable-v4-mvp-plan.md) | План админки |

## Интеграции

| Документ | Описание |
|----------|----------|
| [integrations.md](./integrations.md) | Ticketscloud, Teplohod |
| [ticketscloud-import.md](./ticketscloud-import.md) | TC import |
| [event-extraction.md](./event-extraction.md) | Правила извлечения событий |

## Legacy / справочное

| Документ | Описание |
|----------|----------|
| [legacy-public-inventory.md](./legacy-public-inventory.md) | Legacy inventory |
| [landing-snapshot.md](./landing-snapshot.md) | Snapshot лендингов |

## Приложения

- [apps/public/README.md](../apps/public/README.md)
- [apps/admin/README.md](../apps/admin/README.md)

# Документация Daibilet

## Канон и границы

- Этот каталог в `D:\coding\daibilet` — единственный актуальный источник
  документации основной ветки Daibilet.
- `D:\coding\daibilet-phase2-finance` — отдельная рабочая ветка финконтура.
  Её документы используются при работе в той ветке; принятые общепроектные
  решения и итоговый статус синхронизируются сюда после интеграции.
- `D:\coding\_scratch\2026-11-25\events-v2-implementation\docs` — временная
  копия, не отдельный источник правды. `D:\coding\SPBBOATS` и
  `D:\coding\tours` — legacy-проекты и не описывают текущее состояние Daibilet.
- Старые отчёты, дневники и выгрузки могут сохранять историческую ценность,
  но их статус определяется датой и ссылкой из актуального документа. Само
  наличие файла в `docs/` не означает, что он описывает текущую систему.

## Куда смотреть

| Вопрос | Источник |
|---|---|
| Что работает сейчас и что блокирует выпуск | [current-state.md](./current-state.md) |
| Каковы следующие незакрытые задачи | [Tasktracker.md](./Tasktracker.md), только разделы с актуальным статусом |
| Почему принято архитектурное решение | [decision-log.md](./decision-log.md) |
| Устойчивые контракты, архитектура и эксплуатационные правила | [Project.md](./Project.md) и профильные документы/runbook |
| Что происходило по датам | [Diary.md](./Diary.md); это история, не список задач |

При расхождении текущие факты подтверждаются свежим кодом, проверкой staging
или production и датированным отчётом. `current-state.md` фиксирует результат;
`Tasktracker.md` — только оставшуюся работу; закрытые задачи и подробный ход
работ сохраняются в истории и не считаются открытыми без свежего подтверждения.

## Снимки и большие приложения

В `docs/` есть датированные CSV/JSON/TSV-выгрузки и полные тексты редакционных
батчей. Это приложения к конкретным аудитам и операциям, а не актуальная БД и
не самостоятельный источник текущего статуса. Использовать их только вместе с
сопровождающим отчётом: сверять дату, базовый SHA, назначение и ограничения
выборки. Более поздний файл с похожим именем не автоматически заменяет старый,
если отчёт явно не подтверждает замену.

Перед переносом или удалением проверять входящие ссылки, уникальные данные,
происхождение и необходимость аудиторского следа. Не копировать большие
выгрузки в README или current-state; там оставлять ссылку на отчёт.

[DAIBILET Events V2: аудит и карта реализации - 25.11.2026](./events-v2-audit-2026-11-25.md)

## С чего начать

1. [current-state.md](./current-state.md) — подтверждённое состояние и открытые блокеры.
2. [Tasktracker.md](./Tasktracker.md) — актуальные задачи в верхних датированных разделах; остальное — накопленная история.
3. [decision-log.md](./decision-log.md) — принятые решения и границы их реализации.
4. [Project.md](./Project.md) — архитектура и долговременные правила; последний целостный обзор от 2026-08-17.
5. [operations/README.md](./operations/README.md) — инструкции по выпуску, backup, health и incidents.
6. [Diary.md](./Diary.md) — исторический журнал, не использовать как источник текущего статуса.

## Свежие отчёты

- [Архив проверок, выпусков и snapshots](./reports/README.md)
- [SEO индексация событий: аудит, фаза 1 - 27.11.2026](./reports/2026/event-seo-indexability-phase1-audit-2026-11-27.md)
- [Новогодний лендинг: production SEO и производительность - 25.11.2026](./new-year-landing-seo-and-performance-2026-11-25.md)
- [Events V2: аудит исходного состояния - 25.11.2026](./events-v2-audit-2026-11-25.md)
- [Канон тематических URL и незавершённая live-сверка - 18.11.2026](./reports/2026/landing-url-architecture-and-audit-2026-11-18.md)
- [EventPage rollout: production drafts, staging и SEO-гейты - 03.11.2026](./eventpage-rollout-status-2026-11-03.md)

## Ops / production readiness

Весь эксплуатационный раздел: [operations/README.md](./operations/README.md).

| Документ | Описание |
|----------|----------|
| **[production-readiness-checklist.md](./operations/production-readiness-checklist.md)** | Чеклист «демо vs prod» (Habr), owners, ROI |
| **[incident-runbook.md](./operations/incident-runbook.md)** | Быстрая диагностика и rollback MSK |
| **[codex-prod-readiness-handoff.md](./operations/codex-prod-readiness-handoff.md)** | CODEX: cron на prod, auth audit, backup drill |

## Checkpoint / аудит

| Документ | Описание |
|----------|----------|
| **[audit-2026-07-10-stack-state.md](./reports/2026/audit-2026-07-10-stack-state.md)** | **Аудит стека:** Vite vs Next, Prisma vs dto.js, prod flags, рекомендации Phase F |
| **[checkpoint-2026-07-10-mvp-launch.md](./reports/2026/checkpoint-2026-07-10-mvp-launch.md)** | Checkpoint MVP launch, handoff Codex |

## Фазы: виджеты + импорт

| Документ | Описание |
|----------|----------|
| [phases/README.md](./phases/README.md) | Дорожная карта фаз A–E |
| [phases/phase-e-prisma-runtime.md](./phases/phase-e-prisma-runtime.md) | **Фаза E (закрыта):** TS flags, parity, staging DB |
| [phases/phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md) | **Фаза F:** Next full-stack, SEO SSR (F2 ✅) |
| [phases/phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md) | **F3:** cutover staging/prod |
| [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md) | **Codex:** `codex/phase2-foundation`, cherry-pick после F3 |
| [codex-cherry-pick-plan.md](./codex-cherry-pick-plan.md) | План cherry-pick Codex → `feat/next-monorepo` |
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
| [My-day v2: аудит архитектуры и план перехода](./my-day-v2-architecture-2026-11-13.md) | Аудит V1 и безопасный план развития по шаблону v2 |
| [catalog-location-venue-canon.md](./catalog-location-venue-canon.md) | **Канон:** Локация vs Площадка / антидубли |
| [myday-commercial-canon.md](./myday-commercial-canon.md) | Канон «Мой день» (planner + checklist) |
| [mvp-spec.md](./mvp-spec.md) | Продуктовая спецификация |
| [seo-public-mvp.md](./seo-public-mvp.md) | SEO public |
| [artist-bios.md](./artist-bios.md) | Био исполнителей: правила, покрытие, батч |
| [organizer-email-intake.md](./organizer-email-intake.md) | Приём писем организаторов: IMAP → staging → apply |
| [admin-lovable-v4-mvp-plan.md](./admin-lovable-v4-mvp-plan.md) | План админки |

## Интеграции

| Документ | Описание |
|----------|----------|
| [catalog-finance-projection.md](./catalog-finance-projection.md) | **Lock:** граница catalog ↔ finance, projection matrix, PurchaseProjection gap |
| [museum-contract-readiness.md](./museum-contract-readiness.md) | **Museum-1:** роли/функции, Stage 0 Codex brief, Stage 1 schedule, Stage 2 LK |
| [spb-finance-host.md](./spb-finance-host.md) | Host roles `.184` / `.159` / `.16` |
| [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md) | Phase G product / checkout / supplier LC |
| [integrations.md](./integrations.md) | Ticketscloud, Teplohod |
| [ticketscloud-import.md](./ticketscloud-import.md) | TC import |
| [event-extraction.md](./event-extraction.md) | Правила извлечения событий |

## Legacy / справочное

| Документ | Описание |
|----------|----------|
| [legacy-public-inventory.md](./legacy-public-inventory.md) | Legacy inventory |
| [landing-snapshot.md](./landing-snapshot.md) | Snapshot лендингов |
| [Архив документов](./archives/README.md) | Исторические планы и материалы, не являющиеся текущим источником требований |

## Приложения

- [apps/public/README.md](../apps/public/README.md)
- [apps/admin/README.md](../apps/admin/README.md)

## Атрибуция иконок

Favicon / PWA-иконки (`apps/web/public/favicon.*`, `icon-*.png`, `apple-touch-icon.png`): силуэт билета по [Flaticon ticket_1912](https://www.flaticon.com/ru/free-icon/ticket_1912) (автор **Freepik** / **Flaticon**), перекрашен в бренд-синий `#4A7FD4` (`DAIBILET_LOGO_BLUE`), повёрнут на −45° с крупным fill (~88–90% кадра).

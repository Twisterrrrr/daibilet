# Документация Daibilet

Этот каталог - рабочая память проекта. Если меняется архитектура, запуск, интеграция, SEO-логика или финконтур, обновляем документацию в том же блоке работ.

## Быстрый вход

- [Текущий статус](current-state.md) - где мы сейчас, что готово, что остается до запуска.
- [Журнал решений](decision-log.md) - почему выбрали именно такой путь.
- [MVP specification](mvp-spec.md) - исходные границы продукта.
- [QA и деплой перед первыми продажами](launch-qa-and-deploy.md) - smoke, deploy, критерии запуска.
- [Deploy Timeweb](deploy-timeweb.md) - сервер, systemd, nginx, env.
- [Cursor handoff prompt](cursor-handoff-prompt.md) - готовый промпт для Cursor без риска затереть backend/Prisma foundation.
- [Backend TypeScript migration](backend-typescript-migration.md) - переход backend на TypeScript и Prisma.
- [Marketplace phase foundation](marketplace-phase-foundation.md) - YooKassa, поставщики, внутренний checkout, trip planner.
- [Phase 2 finance and supplier blueprint](phase-2-finance-supplier-blueprint.md) - полный финконтур, параллельный checkout, ЛК поставщика, отзывы.

## Доменные документы

- [Интеграции](integrations.md) - Ticketscloud и Teplohod.info.
- [Ticketscloud import](ticketscloud-import.md) - первая загрузка и команды.
- [Ticketscloud full sync analysis](ticketscloud-full-sync-analysis.md) - анализ каталога TC.
- [Event extraction](event-extraction.md) - признаки событий для лендингов и подборок.
- [Landing proposals](landing-proposals.md) - посадочные и фильтры.
- [SEO public MVP](seo-public-mvp.md) - города, площадки, лендинги, статьи.
- [Category questions](category-questions.md) - таксономия.

## Legacy и внешний опыт

- [SPBBOATS extraction plan](spbboats-mvp-extraction-plan.md) - что взять из legacy и что не тащить.
- [SPBBOATS Next/Prisma extraction](spbboats-next-prisma-extraction.md) - повторный аудит legacy после решения идти в full-stack Next.js + Prisma.
- [Legacy schema audit](legacy-schema-audit.md) - сравнение старой большой схемы и нового MVP.
- [Legacy public inventory](legacy-public-inventory.md) - старый public как библиотека UX/SEO.
- [Codex vs SPBBOATS decision](codex-vs-spbboats-decision.md) - почему идем тоньше legacy.
- [Admin Lovable V4 plan](admin-lovable-v4-mvp-plan.md) - ориентир для admin UX.

## Контроль качества

- [Mentor review](mentor-review.md) - комментарии ментора по блокам.
- [Public performance snapshot](public-performance-snapshot.md) - замеры public DTO/API.
- [Landing snapshot](landing-snapshot.md) - контроль посадочных.

## Правила ведения

1. Любой крупный блок работ обновляет [Текущий статус](current-state.md).
2. Любое архитектурное решение фиксируется в [Журнале решений](decision-log.md).
3. Новая БД-модель или миграция получает пояснение в `packages/db/README.md` или отдельном doc-файле.
4. Новая интеграция или изменение API фиксируется в [Интеграциях](integrations.md).
5. Перед запуском обновляется [QA и деплой](launch-qa-and-deploy.md).
6. Русские markdown-файлы храним в UTF-8.

## PowerShell и UTF-8

Если PowerShell показывает русские markdown-файлы кракозябрами, перед чтением можно выполнить:

```powershell
chcp 65001
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
```

Для точечного чтения файла:

```powershell
Get-Content docs\current-state.md -Encoding UTF8
```

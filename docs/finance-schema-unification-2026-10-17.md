# Сверка схемы и истории миграций каталога и финконтура - 17.10.2026

## Что объединено

Ветка `codex/finance-schema-unification` содержит текущие изменения сайта из
`feat/next-monorepo`, административный интерфейс и чат из
`codex/admin-shell-integration`, а также четыре уже применённые в
`daibilet_baseline` миграции финконтура:

- `20260730120000_venue_admission_products`
- `20260730123000_supplier_integration_mode`
- `20260730132000_supplier_integrations`
- `20260907120000_supplier_user_invites`

В Prisma-схему перенесены соответствующие enum, модели admission products и
supplier integrations, а также связи и поля в существующих моделях. Поля
Places, RBAC и чата из интеграционной ветки сохранены. Работающий код
финконтура остаётся на отдельном finance-хосте; объединение схемы само по
себе не включает платежи, чеки или возвраты в каталожном API.

## Проверки

- На пустой одноразовой PostgreSQL 17 все 47 миграций применились через
  `pnpm --filter @daibilet/db db:deploy`.
- `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma
  --exit-code` не обнаружил отличий как на пустой тестовой БД после миграций,
  так и на локальной `daibilet_baseline`.
- `prisma migrate status` на `daibilet_baseline`: 47 миграций, схема актуальна.
- Контрольные суммы всех 47 применённых миграций совпадают с файлами. Для
  `20261017120000_chat_support` отличается только перевод строк LF/CRLF;
  содержимое SQL одинаково. Исходный файл не редактировался.
- `db:validate`, `db:generate`, `db:typecheck`, `backend:typecheck`,
  `web:typecheck` прошли. `web:test:ci`: 260/260.

## Выпуск

До выпуска требуется отдельно сверить и развернуть finance API с
`2bd46a0ff` (метрики заказов по каналам), затем web. Web-дашборд использует
два хоста и показывает прочерки, когда один из источников недоступен. Для
чата нужны production env и Telegram webhook на
`/support/chat/telegram-webhook`. Prod-БД и хосты в этой итерации не менялись.

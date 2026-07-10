# Daibilet

Монорепозиторий каталога событий Daibilet.

Требования: Node.js `22.20.x` и pnpm `11.7.x`. Версия Node зафиксирована в `.nvmrc` и проверяется workspace-конфигурацией.

## Документация

Основной вход: [docs/README.md](docs/README.md).

Самые важные документы:

- [Текущий статус](docs/current-state.md);
- [Журнал решений](docs/decision-log.md);
- [MVP specification](docs/mvp-spec.md);
- [QA и деплой](docs/launch-qa-and-deploy.md);
- [Backend TypeScript migration](docs/backend-typescript-migration.md);
- [Marketplace phase foundation](docs/marketplace-phase-foundation.md).

## Пакеты

- `apps/public` - публичный каталог;
- `apps/admin` - операционная админка;
- `apps/backend` - API и интеграции;
- `packages/db` - Prisma schema, migrations и общий клиент;
- `packages/contracts` - DTO и Zod-схемы API;
- `packages/config` - общие TypeScript-конфиги.

`apps/supplier` появится отдельным приложением после стабилизации первых продаж и подготовки фазы 2.

## Текущая продуктовая граница

MVP работает по widget-first модели:

- пользователь покупает через виджеты Ticketscloud или Teplohod.info;
- финансовый контур и чеки пока остаются на стороне билетных систем;
- Daibilet хранит каталог, факт покупки, покупателя, статус заказа и билетов.

Фазы 2-4 уже заложены в Prisma-схему, но не включены в runtime:

- YooKassa и ЛК поставщика;
- внутренний checkout Daibilet;
- trip planner и единый ваучер.

## Начало работы

```bash
pnpm install
pnpm db:up
pnpm db:validate
pnpm dev:backend
```

Public и admin запускаются отдельными командами:

```bash
pnpm dev:public
pnpm dev:admin
```

Полная проверка workspace:

```bash
pnpm check
```

`pnpm check` включает PostgreSQL integration tests, поэтому локальный контейнер БД должен быть запущен.

## Production build

```bash
pnpm build
pnpm --filter @daibilet/backend start
```

Backend production entrypoint собирается в `apps/backend/dist`.

## Правила разработки

- Новые backend-модули импортируют Prisma через `@daibilet/db`.
- API-типы и схемы импортируются через `@daibilet/contracts`.
- Относительные импорты между `apps` и `packages` не используем.
- Архитектурные решения фиксируем в [docs/decision-log.md](docs/decision-log.md).
- Крупные изменения статуса фиксируем в [docs/current-state.md](docs/current-state.md).
- Русские markdown-файлы храним в UTF-8.

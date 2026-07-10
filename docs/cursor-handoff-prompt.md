# Cursor Handoff Prompt

Ниже готовый промпт для Cursor. Его цель - аккуратно интегрировать/деплоить текущую версию Daibilet, не затирая Codex backend/Prisma foundation и не включая финконтур раньше времени.

## Prompt

Ты работаешь с проектом Daibilet.

Главное: ничего не накатывай поверх текущей версии вслепую. Нельзя затирать backend/Prisma/TS foundation из Codex-ветки. Твоя задача - помочь довести MVP до запуска продаж через виджеты Ticketscloud и Teplohod.info, сохранив текущую архитектуру.

Перед любыми изменениями обязательно прочитай:

- `README.md`
- `docs/README.md`
- `docs/current-state.md`
- `docs/decision-log.md`
- `docs/launch-qa-and-deploy.md`
- `docs/deploy-timeweb.md`
- `docs/backend-typescript-migration.md`
- `docs/marketplace-phase-foundation.md`
- `packages/db/README.md`

Текущий продуктовый режим:

- MVP работает widget-first.
- Пользователь покупает через виджеты Ticketscloud / Teplohod.info.
- Daibilet хранит каталог, факт покупки, покупателя, статус заказа и билетов.
- YooKassa, чеки через Daibilet, внутренний checkout, ЛК поставщика и trip planner пока НЕ включать в runtime.
- Фазы 2-4 уже заложены в Prisma-схеме, но это foundation, а не активная бизнес-логика.

Что важно сохранить:

- pnpm workspace / монорепо.
- `packages/db` как Prisma schema/client/migrations.
- `packages/contracts` как DTO/Zod contracts.
- backend TypeScript entrypoint и typed DTO/read-models.
- ProviderLink для provider identity: `EVENT`, `SESSION`, `OFFER`, `VENUE`.
- Правило: событие - это карточка, слот времени - `EventSession`.
- Public catalog не должен показывать слоты TC/Teplohod как отдельные события.
- `ExternalOrder` / `ExternalTicket` - зеркало покупок через виджеты.
- `CheckoutOrder` / `Payment` / `FiscalReceipt` - только будущий внутренний checkout, не использовать в текущем MVP flow.
- Admin не должен показывать fallback/mock как реальные backend-данные.

Если работаешь с UI из своей ветки:

- Бери public/admin визуальные и UX-наработки точечно.
- Не переписывай backend поверх старого JS-монолита.
- Не удаляй Prisma migrations.
- Не откатывай TS modules и тесты.
- Не меняй API shape без проверки admin/public.
- Не включай внутренний checkout/YooKassa в public.

Приоритеты до запуска:

1. Стабильный deploy на Timeweb Cloud.
2. Production env, migrations, systemd, nginx.
3. Public smoke:
   - главная;
   - `/events`;
   - event detail;
   - city page;
   - venue page;
   - landing;
   - widget open для TC и Teplohod.
4. Admin smoke:
   - Sources;
   - Events;
   - Orders;
   - Buyers;
   - Cities;
   - Venues;
   - Landings.
5. SEO smoke:
   - `robots.txt`;
   - `sitemap.xml`;
   - canonical;
   - `www` redirect;
   - noindex/indexable flags.

Команды проверки локально:

```bash
pnpm install
pnpm db:validate
pnpm db:generate
pnpm db:typecheck
pnpm backend:typecheck
pnpm backend:test:ts
pnpm public:build
pnpm admin:build
```

Если есть доступная БД:

```bash
pnpm db:deploy
pnpm db:smoke
pnpm check
```

Перед деплоем:

- Проверь, что `.env` не коммитится.
- Проверь, что production использует правильный `DATABASE_URL`.
- Примени миграции через `pnpm db:deploy`, не через ручное редактирование БД.
- Убедись, что backend запускается production entrypoint из `apps/backend/dist`.
- Убедись, что admin защищен временным доступом.

Отдельно проверь миграцию:

```text
packages/db/prisma/migrations/20260709210000_marketplace_phase_foundation/migration.sql
```

Она должна применяться как аддитивная. Она не должна ломать текущие `ExternalOrder` и каталог.

Что нельзя делать:

- Не затирать live daibilet.ru без staging/smoke.
- Не заменять Codex backend на старый `dto.js`/`server.js` без TS/Prisma foundation.
- Не удалять `packages/db`, `packages/contracts`, `packages/config`.
- Не включать YooKassa в runtime без отдельной задачи.
- Не смешивать `ExternalOrder` и `CheckoutOrder` в одном UI без явного DTO-слоя.
- Не выводить пользователю технические id/source id.
- Не показывать англоязычные статусы в UI.

Что нужно вернуть владельцу после работы:

- какие файлы изменены;
- какие команды проверки прошли;
- что деплоилось и куда;
- какие env нужны;
- какие smoke-сценарии пройдены;
- что осталось блокером перед первыми продажами.

Если видишь конфликт между своей веткой UI и текущей Codex-веткой, не мержи автоматически. Сначала составь список конфликтующих зон: public, admin, backend, db, deploy, docs. Потом предложи план точечной интеграции.

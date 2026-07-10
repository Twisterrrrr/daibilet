# Full-stack Next.js + Prisma Roadmap

Дата: 2026-07-10.

## Решение

Daibilet переводится в full-stack monorepo на Next.js + Prisma.

Целевая структура:

- `apps/public` - Next.js App Router: public, SEO pages, buyer account, public API route handlers.
- `apps/admin` - пока Vite React admin, позже можно перенести в Next route group или отдельное Next-приложение.
- `apps/backend` - временный legacy/compat backend для тяжелых sync, старых DTO и административных API до переноса.
- `packages/db` - единый Prisma schema/client/migrations.
- `packages/contracts` - shared DTO contracts.
- `packages/config` - shared TypeScript/config presets.

Главный принцип: не переписывать все endpoint'ы разом. Next принимает единый origin и `/api/*`, а старый backend временно остается за proxy bridge. Затем proxy-маршруты заменяются Prisma-backed route handlers по одному.

## Что уже сделано

- `apps/public` переведен с Vite на Next.js App Router.
- Сохранены текущие публичные URL через `app/[[...path]]/page.tsx`.
- Добавлен базовый `metadata` слой для public.
- Добавлен same-origin API bridge: `app/api/[[...path]]/route.ts`.
- Public frontend по умолчанию вызывает `/api/*`, а не `http://127.0.0.1:4000`.
- Старые env-переменные `VITE_*` временно поддерживаются, новые публичные env - `NEXT_PUBLIC_*`.
- `data.js` fallback теперь копируется в `apps/public/public/data.js`.
- Добавлен Public SEO foundation в Next:
  - `robots.txt`;
  - sitemap index `/sitemap.xml`;
  - дочерние sitemaps `/sitemaps/static`, `/sitemaps/events`, `/sitemaps/cities`, `/sitemaps/venues`, `/sitemaps/landings`;
  - entity-aware metadata для событий, городов, площадок и лендингов;
  - JSON-LD для breadcrumbs, событий и площадок.
- `/api/public/stats`, `/api/public/events`, `/api/public/home/preview` и `/api/public/events/:slug` переведены на Prisma-backed Next route handlers; общий backend bridge остается fallback для остальных API.

## Почему proxy bridge нужен

В backend уже есть много рабочей логики:

- Ticketscloud/Teplohod sync;
- группировка слотов в события;
- public catalog read model;
- city/venue/landing/event DTO;
- buyer account;
- admin change requests;
- source health;
- cache invalidation.

Удалять это одним шагом перед продажами рискованно. Bridge позволяет:

- получить Next full-stack origin уже сейчас;
- не ломать public UI;
- постепенно переносить DTO в Prisma route handlers;
- сохранить возможность деплоя MVP.

## Очередность переноса API в Next + Prisma

1. Public stats:
   - `/api/public/stats`
   - самый легкий endpoint, важен для hero и первого экрана.
   - статус: готово в Next route handler.

2. Public home preview:
   - `/api/public/home/preview`
   - нужен для быстрых карточек на главной.
   - статус: готово в Next route handler поверх сгруппированного public catalog read-model.

3. Public catalog:
   - `/api/public/events`
   - обязательно с server-side filters, pagination, grouping events by real event card, not provider slot.
   - статус: готово как первый Prisma-backed read-model в Next; нужна следующая оптимизация/паритет с backend DTO.

4. Event detail:
   - `/api/public/events/:slug`
   - слоты, категории билетов, цены, площадка, город, связанные подборки.
   - статус: готово первым Prisma-backed срезом; показывает до 5 ближайших слотов, ticket prices от 100 ₽, provider widget payload и related.

5. SEO hubs:
   - `/api/public/cities`
   - `/api/public/cities/:slug`
   - `/api/public/venues`
   - `/api/public/venues/:slug`
   - `/api/public/landings/:slug`

6. Buyer account:
   - `/api/user/auth/*`
   - `/api/account/purchases`
   - `/api/public/orders`

7. Admin and supplier:
   - сначала оставить на backend;
   - позже переносить только после стабилизации public sales.

## Prisma boundaries

Prisma уже должен оставаться единой точкой доступа к БД:

- новые Next route handlers импортируют `prisma` из `@daibilet/db`;
- новые read models не ходят через `pg.Pool`;
- тяжелые SQL допустимы через `prisma.$queryRaw`, если они покрыты тестами и имеют индексы;
- общий mapping нужно выносить из `apps/backend/src/dto.js` в typed modules, а не копировать в Next.

## До первых продаж

Обязательный минимум:

- public Next build зеленый;
- `/api/*` bridge работает локально и на сервере;
- backend продолжает sync TC/Teplohod;
- public catalog не показывает слот как отдельное событие;
- event page показывает площадку, город, 5 ближайших слотов, цены и категории билетов;
- buyer account/order lookup работает;
- smoke тесты проходят на staging.

Не делаем до первых продаж:

- полный перенос admin в Next;
- полный внутренний checkout;
- supplier self-service;
- YooKassa runtime;
- единый ваучер/trip planner.

## После первых продаж

Фаза 2:

- YooKassa + fiscal receipts;
- supplier cabinet;
- admin-managed supplier events;
- manual/internal checkout parallel to widgets;
- reviews and external reviews;
- payouts/reporting foundation.

Фаза 3:

- переход от виджетов к внутреннему API и единому checkout.

Фаза 4:

- trip planner и единый ваучер из базы событий.

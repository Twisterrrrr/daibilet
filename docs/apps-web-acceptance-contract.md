# Apps/Web Acceptance Contract

Дата: 2026-07-13.

Цель: принять Cursor `apps/web` как production public target для `daibilet.ru` без субъективного "вроде работает". Пока контракт не пройден, production остается на текущем `@daibilet/public`, а `@daibilet/web` не ставится в `PUBLIC_APP_FILTER`.

## 1. Граница Приемки

`apps/web` отвечает только за public-витрину, SEO-runtime и public read API.

В контракт входят:

- Next.js App Router public pages;
- SEO routes, metadata, canonical, JSON-LD;
- public API compatibility routes;
- buyer purchases/order lookup;
- виджеты Ticketscloud и Teplohod;
- отсутствие legacy fallback/mocks;
- сборка, typecheck и launch smoke.

В контракт не входят:

- финконтур Daibilet/YooKassa;
- supplier cabinet;
- внутренний checkout;
- новые сущности блога/отзывов сверх уже имеющихся маршрутов;
- переписывание admin/backend.

## 2. Package Contract

Обязательно:

- package name: `@daibilet/web`;
- директория: `apps/web`;
- scripts: `typecheck`, `build`, `start` или `preview`;
- dependencies: `next`, `react`, `react-dom`;
- желательно: `@daibilet/db`, `@daibilet/contracts`;
- production start должен слушать `PORT`, который systemd задает из `PUBLIC_PORT`.

Команда:

```bash
pnpm acceptance:web -- --app-dir apps/web --package-name @daibilet/web
```

Строгая приемка:

```bash
pnpm acceptance:web -- --app-dir apps/web --package-name @daibilet/web --strict --run-typecheck --run-build
```

## 3. Page Contract

Обязательные пользовательские маршруты:

- `/`;
- `/events`;
- `/events/:slug`;
- `/cities`;
- `/cities/:slug`;
- `/venues` или `/locations`;
- `/venues/:slug` или `/locations/:slug`;
- `/podborki` или `/landings`;
- `/account/purchases` или `/my-orders`;
- help/legal pages.

Допускается catch-all route `app/[[...path]]/page.tsx`, если он корректно отдает все перечисленные URL, metadata и статусные состояния.

## 4. Public API Compatibility

`apps/web` обязан сохранить эти route handlers:

- `GET /api/public/stats?refresh=1`;
- `GET /api/public/events?limit=12&sort=time&refresh=1`;
- `GET /api/public/events/:slug`;
- `GET /api/public/home/preview`;
- `GET /api/public/destinations`;
- `GET /api/public/cities`;
- `GET /api/public/cities/:slug`;
- `GET /api/public/venues`;
- `GET /api/public/venues/:slug`;
- `GET /api/public/landings/:slug`;
- `GET /api/public/orders`;
- `GET /api/account/purchases`.

Минимальный shape:

- stats: `stats.events`, `stats.venues`, `stats.destinations` или `stats.cities` больше 0;
- catalog: `total > 0`, `items[]`, у карточек есть `slug`, `title`, `city`, `venue`, цена или понятный purchase blocker;
- event detail: `title`, `city`, `venue`, категории билетов/цен, purchase options, не больше короткого preview расписания;
- city/venue hubs: title/name, SEO profile, подборка событий;
- buyer order lookup: не пишет человеку "external".

## 5. SEO Contract

Обязательно:

- `robots.txt`;
- `/sitemap.xml`;
- split sitemaps `/sitemaps/events`, `/sitemaps/cities`, `/sitemaps/venues`, `/sitemaps/landings`;
- canonical URLs;
- title/description/H1 для события, города, площадки и лендинга;
- JSON-LD для события и хлебных крошек там, где это возможно;
- noindex для thin/private/empty pages.

Главная, каталог, событие, город, площадка и лендинг должны отдавать критичный SEO-контент сервером, без ожидания client-only fetch.

## 6. Product Contract

Блокеры:

- в каталоге сырые временные слоты TC/Teplohod выводятся как отдельные события;
- счетчики в hero сначала показывают 0 при живом каталоге;
- карточки показывают технические строки вроде source id, external, provider raw id;
- цена "от 10 ₽" выбирается как основная, если есть нормальные билеты от 100 ₽;
- на странице события нет ссылок на город и площадку;
- виджет Teplohod не реинициализируется после client navigation;
- purchase options другого города попадают в карточку события;
- повторяющиеся purchase options не дедуплицируются.

Предупреждения:

- help/legal страницы неполные, но доступны;
- блог пустой, если есть понятная заглушка без индексации;
- отдельные лендинги требуют ручной контент, если общий каталог работает.

## 7. Launch Smoke

После сборки `apps/web`:

```bash
PUBLIC_APP_FILTER=@daibilet/web pnpm preflight:deploy -- --env-file .env
```

На staging/production:

```bash
PUBLIC_BASE_URL=https://daibilet.ru \
API_BASE_URL=https://api.daibilet.ru \
ADMIN_BASE_URL=https://admin.daibilet.ru \
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm smoke:launch
```

Smoke должен пройти без failed checks. Допустимые skip:

- buyer order lookup, если `SMOKE_ORDER_LOOKUP` не задан;
- change requests/orders/buyers пустые до первых продаж.

## 8. Performance Budget

Целевые бюджеты перед запуском:

- `GET /api/public/stats?refresh=1`: до 300 ms cold;
- warm catalog: до 100 ms;
- home cold: желательно до 1000 ms;
- event detail warm: до 250 ms;
- HTML главной не должен ждать тяжелый полный catalog DTO.

Если бюджет не выполнен, это не всегда блокер для первой продажи, но должно быть записано как known risk.

## 9. Cutover Rule

Переключаем production на `@daibilet/web`, только если:

1. `pnpm acceptance:web -- --app-dir apps/web --package-name @daibilet/web --strict --run-typecheck --run-build` проходит.
2. `pnpm typecheck` проходит в workspace.
3. `pnpm build` проходит в workspace или согласованной Cursor-команде.
4. `pnpm readiness:admin` проходит на production backend.
5. `pnpm smoke:launch` проходит на production/staging URLs.
6. Fresh TC/Teplohod catalog sync сделан перед стартом продаж.

Если любой пункт падает, `PUBLIC_APP_FILTER` остается на предыдущем рабочем public target.

# Decision Log — Daibilet

Хронология ключевых архитектурных и продуктовых решений.

---

## 2026-05 — Prisma как источник схемы

**Решение:** Prisma 7 для DDL/migrations, runtime на `pg` + raw SQL в `dto.js`.

**Почему:** Быстрый MVP без полной миграции на Prisma Client; один тяжёлый SQL для каталога с in-memory cache.

**Статус:** Активно. TS foundation — путь к постепенному переходу.

---

## 2026-06 — Widget-first MVP

**Решение:** Покупка только через виджеты TC/Teplohod. ExternalOrder/ExternalTicket — зеркало.

**Почему:** Финконтур (YooKassa, чеки) откладывается; не блокирует запуск продаж.

**Статус:** Активно. CheckoutOrder/Payment/FiscalReceipt — не в runtime.

---

## 2026-06 — Event vs EventSession

**Решение:** Событие = карточка каталога. Слот времени = EventSession. Публичный каталог не показывает TC/Teplohod слоты как отдельные события.

**Почему:** UX и SEO: одна карточка «Речная прогулка» с выбором времени, не 50 дублей.

**Статус:** Активно.

---

## 2026-06-24 — Backend TS foundation (ветка `backend-ts-foundation`)

**Решение:** Параллельная TS-миграция без смены prod entrypoint. `server-entry.ts` + typed handlers + zod validation.

**Почему:** Типобезопасность и тесты без big-bang rewrite `dto.js`.

**Статус:** Foundation сохранён. Prod пока `node apps/backend/src/server.js`.

---

## 2026-06-25 — ProviderLink

**Решение:** `ProviderLink` для provider identity: EVENT, SESSION, OFFER, VENUE. `EventSourceLink` — legacy, постепенный переход.

**Почему:** Единый слой связи внешних id с внутренними сущностями.

**Статус:** В схеме и TS mapper. **Не удалять** при интеграции UI.

---

## 2026-06-20 — Deploy без затирания prod

**Решение:** Новый код в `/opt/daibilet`, smoke до переключения `daibilet.ru`.

**Почему:** Не ломать live без staging.

**Статус:** Активно.

---

## 2026-07-08 — Institution venues и event-venue-context

**Решение:** Runtime-определение учреждения из заголовка события (`event-venue-context.js`) без relink всех квестов.

**Почему:** ~4700 meeting points; relink 1229 — первый slice.

**Статус:** Портировано в `integrate/mvp-launch`.

---

## 2026-07-09 — Интеграция foundation + lovable UI

**Решение:**

1. База: `backend-ts-foundation` (не `feat/lovable-landings` целиком)
2. UI port точечно из lovable
3. **Не** мержить lovable `schema.prisma` (там удалён ProviderLink)
4. **Не** затирать TS modules и тесты
5. Staging: `/opt/daibilet-staging`, отдельный systemd/nginx

**Почему:** Lovable-ветка богата UI, но откатывает TS/ProviderLink foundation.

**Статус:** Завершена интеграция; prod deploy 2026-07-10.

---

## 2026-07-10 — Prod deploy integrate/mvp-launch

**Решение:** Prod `/opt/daibilet` переведён на `integrate/mvp-launch` (@ `4cee7a7`). Staging на `/opt/daibilet-staging`. Локальные prod hotfix сохранены в git stash.

**Почему:** Закрыть интеграцию foundation + lovable UI, не затирая ProviderLink/Prisma migrations.

**Runtime:** Prod по-прежнему `node apps/backend/src/server.js`, не `server-entry.ts`.

**Статус:** Deploy выполнен, browser widget smoke — вручную. GitHub @ `6df849f`, prod сервер отстаёт на 1 commit.

---

## 2026-07-30 — Venue admission products

**Решение:** Входные билеты площадок заводятся как отдельные `AdmissionProduct` / `AdmissionOffer`, а не как фейковые `OPEN_DATE` события.

**Почему:** Первые управляемые поставщики — музеи и арт-площадки. Им нужно продавать входной билет со страницы площадки, даже если нет отдельного события или расписания. SPBBOATS сначала использовал `OPEN_DATE` event как мостик, но целевая схема была venue-level admission.

**Граница:** `Event` остаётся для афиши, выставок, экскурсий, концертов и импортов TC/Teplohod. `AdmissionProduct` используется для самостоятельного входа на площадку: музей, галерея, зоопарк, парк, смотровая, аттракцион и похожие сценарии.

**Статус:** Введены Prisma-модели, миграция, checkout subject marker и backend readiness helper. Public/admin UI и реальный checkout admission-продукта — следующий slice.

---

## 2026-07-30 — Supplier integration modes

**Решение:** Тип подключения поставщика фиксируется отдельным `Supplier.integrationMode`: `IMPORTED_TICKETING_SYSTEM`, `INTERNAL_SALES`, `API_SYNC`.

**Почему:** `defaultCatalogMode` говорит только о способе покупки, но не объясняет, кто владеет каталогом и что можно делать в ЛК. Для импортных билетных систем нужен read-only LC, для музеев и галерей с внутренними продажами — editable контур, для партнерских API — экран маршрутов, health и синхронизации.

**Граница:** Не смешивать source ownership, checkout flow и supplier permissions в одно поле. Отключение вывода событий импортного поставщика в каталоге — отдельный control-plane слой, не удаление данных импорта.

**Статус:** Введены Prisma enum/field, migration, DTO field и backend policy helper.

---

## Отложено (не в MVP runtime)

| Тема | Причина отложения |
|------|-------------------|
| YooKassa / внутренний checkout | Отдельная задача, schema foundation готова |
| Prisma Client в runtime | Фаза 2–4 миграции dto.js |
| pnpm workspace | Репо на npm; миграция не блокер |
| `packages/contracts` | Планируется; пока zod в `apps/backend/src/types` |

---

## 2026-07-10 — Фаза A: автопроверка виджетов через API

**Решение:** Эталонные slug + `npm run check:widgets` проверяют `widgetPayload`, `purchaseUrl`, `purchaseReady` на prod/staging до browser smoke.

**Почему:** Приоритет — открытие виджетов и корректная передача ID, а не продажи. API-check дешевле и воспроизводимее ручного клика.

**Статус:** Активно. Browser smoke — ручной чеклист в `widget-data-contract.md`. Импорт sync→БД — фаза B.

---

## 2026-07-10 — Фаза B: sync → PostgreSQL одним вызовом

**Решение:** `tc-import-catalog.js` после `tc-full-sync`; `POST /api/v1/tc/sync` = fetch + upsert + `ProviderLink`. TEP import дополнен `syncProviderLinksForSource` и diff stats.

**Почему:** Admin sync TC раньше писал только JSON — каталог на сайте не обновлялся. Единый pipeline снижает риск рассинхрона widget URL и БД.

**Статус:** Активно. Live smoke на prod — после deploy. Инварианты — фаза C.

---

## 2026-07-10 — Фаза C: инварианты и import guards

**Решение:** `check:sync-invariants` после sync; Event upsert сохраняет `slug` и `status` при HIDDEN/EventOverride.

**Почему:** Без автопроверки рассинхрон source links и widget URL остаётся незамеченным; import не должен снимать модерацию admin.

**Статус:** Активно. Prod baseline — после deploy. Staging DB split — фаза D.

---

## 2026-07-10 — Фаза D: post-deploy checks и CI

**Решение:** `post-deploy-check.sh` в deploy pipeline; GitHub Actions CI; nightly cron template; optional staging `start:ts` для parity.

**Почему:** Фазы A–C дали инструменты проверки — фаза D встраивает их в deploy и регрессию без ручного чеклиста.

**Статус:** Активно. Live deploy на сервер — ops по phase-d-deploy-parity.md.

---

## 2026-07-10 — Фаза E закрыта: typed rollout, не full rewrite

**Решение:** Prod/staging на `start:ts` со всеми `DAIBILET_TS_*`. Public read через typed DTO с parity; city/venue/admin read частично делегируют в `dto.js`. Staging DB отделена (`5438`). Codex `phase2-foundation` отложен до финконтура.

**Почему:** Контролируемый rollout без big-bang; legacy остаётся rollback и source of truth для сложной venue/admin логики.

**Статус:** Активно. Аудит: [audit-2026-07-10-stack-state.md](./audit-2026-07-10-stack-state.md).

---

## 2026-07-10 — Codex split: phase2-foundation, cherry-pick после F3

**Решение:** Codex = ветка **`codex/phase2-foundation`** (не `phase2-finance-next`). Unrelated history — **no wholesale merge**. Canonical public Next = **`apps/web`**. Cherry-pick после F3: Phase 2 schema, event change requests, admin contracts. **Не мержить** Codex Next в `apps/public` + proxy bridge.

**Почему:** Два конкурирующих Next-подхода (Path A proxy vs Path B full-stack). F3 cutover не должен блокироваться на merge Codex.

**Статус:** Активно. [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md), [codex-cherry-pick-plan.md](./codex-cherry-pick-plan.md).

---

## 2026-07-10 — F2 закрыт: landings ISR, catalog filters, widgets

**Решение:** Завершён F2 public SSR: landings (`/podborki` + SEO paths) с ISR/SSG, SSR-фильтры каталога (city/date/sort/q), client widgets TC/Teplohod на event page, `backend:next:parity`.

**Почему:** Exit criteria F2 — indexable HTML без JS + parity с legacy перед F3 cutover.

**Статус:** Активно. Следующий шаг — F3 ([phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md)).

---

## 2026-07-10 — Frontend остаётся Vite SPA (не Next.js)

**Решение:** `apps/public` и `apps/admin` — Vite 6 + React 19 CSR. Next.js не в scope MVP.

**Почему:** Текущий deploy (static + nginx + API) работает; миграция на Next.js не даёт ROI до стабилизации backend и SEO-требований.

**Статус:** Заменено Path B — Vite deprecated после F3 cutover.

---

## 2026-07-10 — Path B: Next full-stack monorepo (SEO)

**Решение:** Миграция на Next.js App Router (`apps/web`) + pnpm monorepo + Prisma. SSR для indexable страниц (catalog, event, city, venue, landings). Не откладывать SEO ради стабильности SPA.

**Почему:** Vite CSR + lazy load 60 — поисковики получают мало контента без JS. Path B из аудита — целевое решение.

**Codex:** параллельно **`codex/phase2-foundation`** — Phase 2 schema + event change requests; cherry-pick **после F3**, **без** YooKassa runtime и **без** Codex Next/proxy.

**Статус:** Активно. F2 ✅. [phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md), [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md). Ветка `feat/next-monorepo`.

---

## 2026-07-10 — F2: full-stack read (Prisma в Next, не proxy)

**Решение:** Public SSR и Route Handlers читают через Prisma/`public-*.dto.ts` port в `apps/web`, без промежуточного fetch к `apps/backend`. Legacy backend остаётся для sync/writes/admin до F4/F5.

**Почему:** Один раз попыхтим с porting DTO — дальше проще: нет dual HTTP hop, единый type graph, проще cutover и retire `dto.js`.

**Статус:** Активно. F2 ✅ на `feat/next-monorepo`.

---

## 2026-07-10 — Catalog page sizes: 100 / 200 / 300

**Решение:** Public catalog default limit **100**, max **300**, UI selector **100 / 200 / 300**. SSR page 1 всегда рендерит default (100), независимо от selector.

**Почему:** Круглые порции, ×1.67 к текущим 60, вписываются в perf budget (~8 KB JSON на 100). Константы в `@daibilet/contracts/catalog`.

**Статус:** Активно.

---

## 2026-07-13 — Defer `tc:sync` widgetUrl backfill на prod

**Решение:** Не запускать полный `npm run tc:sync` на prod в рамках этапа 0. Оставить pipeline (фаза B) для staging и плановых maintenance windows; prod backfill — только при регрессии saleable events или перед включением nightly cron.

**Почему:**

1. **Saleable path закрыт:** `check:widgets` prod **4/4 OK** (2026-07-13) на эталонных TC/TEP slug — `purchaseReady`, `widgetPayload`, `purchaseUrl` в порядке; ProviderLink покрывает опубликованные события.
2. **Долг не блокирует MVP:** ~62k offers без `widgetUrl` в audit — в основном исторический хвост / не-saleable; не влияет на CTA «Купить» на indexable карточках.
3. **Риск maintenance:** prod `tc:sync` = длинный fetch + mass upsert; без окна возможны lock/contention и случайный сброс admin override (см. фаза C guards — но rollback дороже defer).

**Критерии пересмотра (любой → запланировать sync):**

- `check:widgets` prod FAIL на эталонах после deploy/import
- `check:sync-invariants` prod: saleable event без ProviderLink / без widget URL
- Новая массовая публикация TC-каталога без widget URL
- Включение nightly `check:sync-invariants` + алерт (audit §151)

**Пересмотр:** 2026-08-01 или при первом prod FAIL виджетов.

**Follow-up 2026-07-13:** выполнен `npm run tc:sync` на prod (`213.171.7.16`): 17356 source events, 17082 offers с widgetUrl, 66535 ProviderLink, ~101s. `check:widgets` 4/4 OK после sync.

**Статус:** Активно (defer снят для TC backfill; browser smoke 0.2 — отдельно).

---

## Шаблон новой записи

```markdown
## YYYY-MM-DD — Краткое название

**Решение:** ...

**Почему:** ...

**Статус:** Активно / Отменено / Заменено ссылкой на новую запись
```

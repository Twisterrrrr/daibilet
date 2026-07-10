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

## 2026-07-10 — Frontend остаётся Vite SPA (не Next.js)

**Решение:** `apps/public` и `apps/admin` — Vite 6 + React 19 CSR. Next.js не в scope MVP.

**Почему:** Текущий deploy (static + nginx + API) работает; миграция на Next.js не даёт ROI до стабилизации backend и SEO-требований.

**Статус:** Активно. Пересмотреть в Phase F при необходимости SSR/prerender.

---

## 2026-07-10 — Path B: Next full-stack monorepo (SEO)

**Решение:** Миграция на Next.js App Router (`apps/web`) + pnpm monorepo + Prisma. SSR для indexable страниц (catalog, event, city, venue, landings). Не откладывать SEO ради стабильности SPA.

**Почему:** Vite CSR + lazy load 60 — поисковики получают мало контента без JS. Path B из аудита — целевое решение.

**Codex:** параллельно `codex/phase2-finance-next` — Phase 2 schema + supplier admin read, **без** YooKassa runtime.

**Статус:** Активно. [phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md), [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md).

---

## Шаблон новой записи

```markdown
## YYYY-MM-DD — Краткое название

**Решение:** ...

**Почему:** ...

**Статус:** Активно / Отменено / Заменено ссылкой на новую запись
```

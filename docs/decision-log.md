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

## Шаблон новой записи

```markdown
## YYYY-MM-DD — Краткое название

**Решение:** ...

**Почему:** ...

**Статус:** Активно / Отменено / Заменено ссылкой на новую запись
```

# Checkpoint: MVP Launch — 2026-07-10

Аудит точки после интеграции `integrate/mvp-launch`, деплоя staging/prod и первого smoke.

---

## 1. Краткий аудит проекта

### Что это сейчас

**Daibilet** — widget-first агрегатор билетов (экскурсии, музеи, события). MVP: покупка через виджеты **Ticketscloud** и **Teplohod.info**. Daibilet хранит каталог, ExternalOrder/ExternalTicket, admin для операторов.

### Стек

| Слой | Реализация |
|------|------------|
| Монорепо | `apps/backend`, `apps/public`, `apps/admin`, `packages/db` |
| Схема БД | Prisma 7, 10 миграций, `ProviderLink` |
| Runtime API (prod) | `node apps/backend/src/server.js` + `dto.js` (~8k строк SQL) |
| TS foundation (parallel) | 37 `.ts` модулей, `server-entry.ts`, typed public handlers |
| Frontend | Vite + React SPA |
| Infra | Timeweb (historical MVP host `213.171.7.16`; live = MSK `.184`), nginx, systemd |

### Деплой на момент checkpoint

| Контур | Путь / порт | Ветка / коммит |
|--------|-------------|----------------|
| **Prod** | `/opt/daibilet`, API `:4000` | `integrate/mvp-launch` @ `4cee7a7` (ручной deploy) |
| **Staging** | `/opt/daibilet-staging`, API `:4001` | `integrate/mvp-launch` @ `4cee7a7`+ |
| **GitHub** | `Twisterrrrr/daibilet` | `integrate/mvp-launch` @ `6df849f` (локально; prod отстаёт на 1 commit) |

Prod hotfix до merge сохранены: `git stash` → `pre-integrate-deploy-20260709` на сервере.

---

## 2. Что хорошо

### Архитектура и foundation

- **Prisma schema** — источник истины: Event/EventSession, ProviderLink, ExternalOrder, landings, venues.
- **ProviderLink** сохранён после интеграции UI (не откатили lovable-ветку целиком).
- **TS foundation** жив: typed catalog/event/city/venue handlers, zod, 9 unit-тестов (ProviderLink TC/Teplohod).
- **Widget-first MVP** не раздувается финконтуром (YooKassa/checkout вне runtime).

### Продукт и UI

- Public: каталог, виджеты, blog, locations/venues, trust pages, лендинги.
- Admin: Sources, Events, Orders, Buyers, Cities, Venues, Landings, Articles.
- **2386 events**, 1057 venues, 14 landings на prod API.

### Deploy и эксплуатация

- Staging `/opt/daibilet-staging` + `staging.daibilet.ru` с **noindex**.
- Staging API на `:4001`, prod на `:4000` — разделены.
- Документация: `current-state`, `decision-log`, `deploy-staging`, checkpoint.
- `db:deploy`, hardened deploy scripts.

---

## 3. Что плохо / риски

### Backend: JS-монолит vs TS foundation

- **Prod runtime = `server.js` + `dto.js`**, не `server-entry.ts`.
- После интеграции lovable **`dto.js` снова ~8k строк** — TS handlers не заменили монолит.
- **Prisma Client в runtime не используется** — только migrations + `db:smoke`; весь read path на raw SQL.
- Два параллельных пути (dto.js vs typed handlers) → риск расхождения API shape.

### Deploy / ops

- `.env`: `ADMIN_AUTH_REALM=Daibilet admin` без кавычек ломает `source .env` при `set -e`.
- Frontend build требует `NODE_ENV=development` (иначе нет typescript в ci).
- `deploy-from-git.sh`: был баг `git pull origin/$BRANCH` — исправлен в `6df849f`, prod ещё не подтянул.
- Prod на сервере **на 1 commit позади** GitHub (`4cee7a7` vs `6df849f`).
- Большие бинарники в git → push 300MB+, долго, race при параллельном push.

### QA / продукт

- **Browser widget smoke** (TC modal, Teplohod modal) — не закрыт автоматически.
- TC event detail: `widgetToken` не на всех slug (нужна выборка живых карточек).
- SEO smoke (robots, sitemap, canonical, www) — не прогнан полностью.
- `packages/contracts` — не создан; контракты размазаны по `types/*` и фронту.

### База

- Staging и prod делят **одну БД** — миграции на staging влияют на prod.
- Migration history: `site_user` пришлось `migrate resolve` (таблица уже была).

---

## 4. Переход JS → Prisma: успешен ли?

**Краткий ответ: частично успешен — foundation да, runtime migration нет.**

| Аспект | Статус |
|--------|--------|
| Prisma schema + migrations | ✅ Работает, 10 migrations, prod deploy OK |
| `db:validate`, `db:generate`, `db:smoke` | ✅ |
| ProviderLink в схеме и TS-тестах | ✅ |
| Prisma Client в prod API (`dto.js`) | ❌ Не подключён |
| Замена `dto.js` на typed repositories | ❌ Не начата в prod path |
| TS entrypoint в production | ❌ Prod = `server.js`, не `server-entry.ts` |
| Feature flags `DAIBILET_TS_PUBLIC_*` | ⚠️ Есть, но не включены на prod |

**Вывод:** переход **не «JS → Prisma runtime»**, а **«JS + Prisma как DDL/migration tool + parallel TS slice»**. Это осознанная Phase 1–2 из `backend-typescript-migration.md`, но после merge lovable UI **монолит dto.js снова вырос**, а не сократился.

---

## 5. Что ещё сделать / проверить

### Критично перед первыми продажами

- [ ] Browser smoke: TC widget open на 2–3 живых событиях
- [ ] Browser smoke: Teplohod widget open
- [ ] Admin smoke: Sources sync TC + Teplohod, Orders без mock
- [ ] Первая реальная покупка через виджет → ExternalOrder в admin
- [ ] Prod pull `6df849f` и повторный deploy через fixed `deploy-from-git.sh`

### Важно

- [ ] SEO: robots.txt, sitemap.xml, canonical, www→non-www
- [ ] Legal pages контент (offer, privacy) — review владельца
- [ ] Скрытие неготовых лендингов / пустых городов (см. launch-qa-and-deploy.md)
- [ ] `db:smoke` на prod после deploy
- [ ] Решить: staging БД отдельно от prod

### Техдолг

- [ ] Включить typed public stack на staging через env flags → parity с dto.js
- [ ] Начать Phase 3: `$queryRaw` + zod или repository slice для admin CRUD
- [ ] Вынести `packages/contracts` (Zod DTO для API)
- [ ] Git LFS или CDN для public images
- [ ] Закрыть stash prod hotfix: cherry-pick нужного или discard

---

## 6. Что передать Codex

### Контекст для следующей сессии

```
Репозиторий: Twisterrrrr/daibilet, ветка integrate/mvp-launch.
Prod: /opt/daibilet @ 4cee7a7, API :4000, daibilet.ru.
Staging: /opt/daibilet-staging @ 4cee7a7+, API :4001, staging.daibilet.ru (noindex).
MVP: widget-first, ExternalOrder only, NO YooKassa/checkout runtime.

Сохранить: packages/db, ProviderLink, TS modules, не откатывать migrations.
Prod entrypoint: server.js (не server-entry.ts без явной задачи).

Stash на prod: pre-integrate-deploy-20260709 — проверить перед discard.

Документы: docs/checkpoint-2026-07-10-mvp-launch.md, docs/current-state.md.
```

### Вопросы к Codex / владельцу

1. **Prod runtime path:** когда переключать `systemd` на `server-entry.ts` + feature flags?
2. **dto.js refactor:** следующий slice — admin repositories или catalog snapshot table?
3. **Marketplace migration** `20260709210000_marketplace_phase_foundation` — когда создавать, на какой БД тестировать?
4. **Staging БД:** отдельный Postgres или shared с prod (текущее)?
5. **Prod stash:** что из `feat/lovable-landings` hotfix нужно вернуть поверх integrate?
6. **Первые продажи:** какой event slug считаем эталоном для TC и Teplohod smoke?

### Зоны не трогать без задачи

- CheckoutOrder / Payment / FiscalReceipt в runtime
- YooKassa
- Слепой merge `feat/lovable-landings` целиком (удаляет ProviderLink)
- Ручное редактирование prod БД

---

## 7. Рекомендации: куда двигаться дальше

### Ближайшие 1–3 дня (launch hygiene)

1. Закрыть **browser widget smoke** на staging и prod.
2. Pull `6df849f` на prod, deploy через `deploy-from-git.sh`.
3. Прогнать **launch-qa-and-deploy.md** checklist с владельцем.
4. Зафиксировать 2 эталонных события (TC + Teplohod) для регрессии.

### 1–2 недели (stabilize)

1. **Не расширять dto.js** — новую логику в модули (`event-venue-context.js` pattern) или TS handlers.
2. Включить на staging `DAIBILET_TS_PUBLIC_CATALOG=1` и прогнать parity scripts.
3. Создать `packages/contracts` для admin/public API shape.
4. Отдельная staging БД.

### 1–2 месяца (architecture)

1. Catalog snapshot / materialized read model вместо одного SQL в dto.js.
2. Постепенный Prisma Client в admin CRUD (Phase 3 из migration doc).
3. Marketplace foundation migration — только additive, после staging QA.
4. CI: `db:validate`, `backend:test:ts`, build на PR.

---

## 8. Smoke summary (2026-07-10)

| Check | Staging | Prod |
|-------|---------|------|
| API health | ✅ :4001 | ✅ :4000 |
| Stats events>1000 | ✅ 2386 | ✅ 2386 |
| noindex header | ✅ | n/a |
| Admin 401 | ✅ | ✅ |
| nginx OK | ✅ | ✅ |
| Browser widgets | ⏳ manual | ⏳ manual |
| SEO full | ⏳ | ⏳ |

---

## Связанные документы

- [current-state.md](./current-state.md)
- [decision-log.md](./decision-log.md)
- [backend-typescript-migration.md](./backend-typescript-migration.md)
- [launch-qa-and-deploy.md](./launch-qa-and-deploy.md)
- [deploy-staging.md](./deploy-staging.md)

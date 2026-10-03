# Codex brief: независимый RCA + фикс SSR hang / nginx 504

**Дата:** 2026-08-02  
**Ветка:** `feat/next-monorepo`  
**Приоритет:** Критический (launch / prod stability)  
**Трекер:** `INC.504.22` (RCA+fix); открытый root: `INC.504.15`  
**Связанные инциденты:** `INC.504.13` / `.15` / `.18` / `.19` / `.20` / `.21`  
**Режим работы:** **code-first**, без SSH. Live ops уже закрывают Cursor/MSK agents.

> Цель: независимый взгляд Codex на причину зависания Next SSR на MSK prod и **PR-sized** архитектурный фикс, который не даёт event loop блокироваться под нагрузкой каталога. Ops-бандаиды (SIGKILL healthcheck, MemoryMax) уже есть - они не заменяют root-cause fix.

---

## 1. Проблема (симптомы)

Рекуррентный hang Next.js SSR на MSK prod (`daibilet-web` / `next-server`):

| Симптом | Наблюдение |
|---------|------------|
| HTML TTFB | **0 bytes**, curl timeout (часто 8s+), nginx отдаёт **504** |
| API `:4000` | Часто **жив** в том же окне (health / public API OK) |
| RSS | `next-server` растёт до **~1.5-1.7 GB** (systemd `MemoryMax=2G`) |
| Journal | Иногда Prisma `Connection terminated unexpectedly` **в процессе web** (не только API) |
| Soft-timeouts | `PERF.SSR1` / `withSoftTimeout` уже в коде; hang всё равно бывает |

**Ключевой вывод ops:** soft-timeout на `Promise.race` + `setTimeout` **не спасает**, если event loop заблокирован (таймеры не тикают, accept loop не отвечает). Паттерн: HTML мертв, API на другом процессе жив.

### Хронология (кратко)

| ID | Когда | Что сделали ops | Root hang |
|----|-------|-----------------|-----------|
| INC.504.13 | 2026-08-01 | SIGKILL restart; warm `*/3` OFF | open |
| INC.504.15 | ongoing | трекер Prisma pool / disconnect в web | **open** |
| INC.504.18 | 2026-08-01 ~13:01-13:18 | Prisma disconnect + accept timeout; сайт уже up к жалобе | = .15 |
| INC.504.19 | 2026-08-01 ~16:49 | SIGKILL; фикс healthcheck (`curl CODE`, не `\|\| echo 999`) | = .15 |
| INC.504.20 | 2026-08-01 ~17:19 | SIGKILL; cron `%` ломал healthcheck; warm OFF; `ssr-healthcheck.sh` | = .15 |
| INC.504.21 | 2026-08-02 ~07:19 | SIGKILL; healthcheck был **644 not +x**; chmod + cron `/bin/bash` | = .15 |

Подробности: `docs/Diary.md` (записи INC.504.13/.18-.21), таблица Infra в `docs/Tasktracker.md`.

---

## 2. Архитектурная подсказка (откуда смотреть в коде)

### Path B: Prisma внутри Next SSR

Канон public Next: **`apps/web`** на `feat/next-monorepo`.

`@daibilet/web` **импортирует** `@daibilet/backend/public-read` / DTO **в процессе Next**, не только ходит HTTP на API `:4000`. Prisma оказывается на критическом SSR-пути.

Типичные точки входа (call graph - Codex должен подтвердить/расширить evidence):

| Поверхность | Файлы / символы (ориентиры) |
|-------------|----------------------------|
| Global layout | `apps/web/src/components/SiteLayout.tsx` → `getCachedDestinations()` + `withSoftTimeout` 900ms |
| Home | `cached-home-data.ts`, `HomePageContent.tsx` → `buildPublicArticlesListDto` / home covers |
| Cities / destinations | `cached-city-data.ts`, `app/cities/page.tsx`, `cached-public-surfaces.ts` |
| Catalog / events | `cached-catalog-data.ts`, `cached-event-data.ts`, landings |
| Venues / map | `cached-venue-data.ts`, `venue-map-data.ts` |
| Blog | `cached-blog-data.ts`, `app/blog/[slug]/page.tsx` |
| Route handlers | `apps/web/app/api/public/*` - тот же `public-read` в том же Node process |

Soft-timeout helper: `apps/web/src/lib/soft-timeout.ts` - `Promise.race` + `setTimeout`. При blocked event loop таймер не тикает. Soft-timeout **не отменяет** underlying Prisma/DTO work - нагрузка продолжает давить process в фоне.

### Уже сделанные mitigations (не путать с root fix)

- **INC.504.4:** catalog SWR rebuild уведён с request event-loop (`child` / disk snapshot / forever soft-SWR). См. `docs/Project.md` Public catalog.
- **PERF.SSR1:** soft-timeouts на layout destinations, cities, venues, home fingerprints.
- **Warm hub cron:** был агрессивный (`*/3`), сейчас на MSK **OFF** (не включать без измерения TTFB).
- **Healthcheck:** `deploy/cron/ssr-healthcheck.sh` (+ cron via `/bin/bash`); TTFB >5s → **SIGKILL+start** (~1 мин recovery). Были баги cron `%` и missing `+x` - ops fixed.
- **systemd:** `TimeoutStopSec=25`, `MemoryMax=2G`, `NODE_OPTIONS` max-old-space ~1280.

---

## 3. Что Codex НЕ должен делать

1. **Не требовать SSH** для основной работы. Анализ и фикс - по репозиторию. Live diagnosis (read-only) - только если owner явно выдаст доступ позже; default = **code-only**.
2. **Не force-push** ни на какую ветку (`main` / `master` / `feat/next-monorepo`).
3. **Не трогать secrets**, `.env`, finance host `.159`, YooKassa, supplier LC secrets.
4. **Не включать warm-hub** обратно без измеренного smoke TTFB (сейчас OFF осознанно).
5. **Не ограничиваться ещё одним слоем soft-timeouts**, если гипотеза - blocked event loop (таймеры не помогут).
6. **Не делать wholesale merge** чужих веток / unrelated history; работать в `feat/next-monorepo` (или PR в неё).
7. Docs vs runtime: если только docs - commit+push без web deploy. Runtime-фикс → отдельный deploy по канону MSK-only (делает Cursor/ops после review, если не согласовано иначе).

---

## 4. Что Codex ДОЛЖЕН сдать

### Deliverable 1 - Root-cause analysis (evidence из кода)

- Call graph: какие SSR / layout / RSC пути реально бьют в Prisma через `public-read`.
- Какие пути синхронно/тяжело нагружают event loop (CPU sync work, гигантский JSON parse, await-all в layout, dual catalog cache и т.п.).
- Связь с симптомами: 0B TTFB при живом `:4000`, рост RSS, Prisma `Connection terminated` в web journal.
- Явно отделить: «уже mitigated INC.504.4» vs «остаточный hang-класс».

Гипотезы для проверки (не догма):

1. Prisma client / connection pool внутри Next под catalog load → disconnect + stuck awaits.
2. Layout / shared chrome всё ещё тянет тяжёлый DTO на каждый HTML request.
3. Soft-timeouts маскируют latency, но underlying work + background rebuilds всё ещё душат process.
4. Sync CPU (parse/serialize) блокирует loop сильнее, чем «долгий await».

### Deliverable 2 - Рекомендуемая архитектура

Сравнить и выбрать (с trade-offs):

| Вариант | Суть | Когда уместен |
|---------|------|----------------|
| A. SSR → HTTP API only | Next fetch на `:4000` / `localhost` с **hard** `AbortSignal` / `undici` timeouts; Prisma только в API process | Изоляция hang: API может тормозить, HTML не блокирует loop тем же pool |
| B. Singleton Prisma + `connection_limit` | Один client, жёсткий pool, statement timeout; меньше disconnect storms | Если Path B оставляем, но pool дисциплина критична |
| C. Убрать heavy awaits из layout | Destinations/cities из edge cache / static shell / client fetch; layout не ждёт DB | Быстрый partial win без полного split |
| D. Hybrid | Layout/static chrome без Prisma; page data через HTTP+timeout или thin cached read | Прагматичный PR-sized путь |

Рекомендация должна быть **конкретной** для текущего monorepo (не абстрактный «microservices»).

### Deliverable 3 - Concrete PR-sized implementation

- Ветка от `feat/next-monorepo`.
- Один сфокусированный PR: предотвращает event-loop hang под catalog load (не «ещё один timeout wrapper»).
- Совместимость MVP Path B / public routes; без wide catalog CTA изменений; без finance touch.
- Обновить `docs/Diary.md` + статус `INC.504.15` / `.22` при сдаче.

### Deliverable 4 - Regression / smoke plan

Минимум (локально или staging; prod только read-only smoke после deploy ops):

```text
# Параллельно (например xargs -P / ab / hey):
GET / 
GET /events
GET /cities
# Опционально: /cities/saint-petersburg, /venues, /locations
```

Критерии:

- TTFB не уходит в 0 bytes / multi-second hang при умеренном параллелизме.
- При искусственной задержке/отказе DB (если тестируемо) HTML либо soft-fallback, либо быстрый error - **не** вечный accept hang.
- API process отдельно не обязан падать вместе с web (если выбран вариант A).

### Deliverable 5 - Что остаётся ops (явно)

Codex **не** обязан менять, но должен перечислить как safety net:

- `MemoryMax=2G` + heap ~1280
- `ssr-healthcheck.sh` SIGKILL+start при TTFB >5s
- `TimeoutStopSec=25`
- Warm hub остаётся OFF до измерения после фикса
- Deploy канон: MSK-only `deploy/scripts/deploy-prod-next.sh` на `.184`

---

## 5. Ops facts (контекст, уже сделано)

Не тратить время на повторный live triage этих пунктов - они закрыты Cursor/MSK:

- Warm hub cron **OFF** на MSK.
- Healthcheck recovery **SIGKILL+start** (~1 мин), executable / bash invoke fixed (INC.504.20/.21).
- `TimeoutStopSec=25` на unit.
- `NODE_OPTIONS` max-old-space ~1280 при `MemoryMax=2G`.
- Catalog rebuild off request loop (INC.504.4) уже в проде.

Owner хочет **независимый** архитектурный вывод Codex, а не повтор ops-бандаидов.

---

## 6. Стартовые файлы для чтения (чеклист)

1. `docs/Project.md` - Path B, public catalog rules, INC.504.4  
2. `docs/Diary.md` - INC.504.13, .18-.21  
3. `docs/Tasktracker.md` - таблица Infra INC.504.*  
4. `apps/web/src/lib/soft-timeout.ts`  
5. `apps/web/src/components/SiteLayout.tsx`  
6. `apps/web/src/server/cached-*.ts` + `cached-public-surfaces.ts`  
7. `apps/backend` exports `public-read` / Prisma client init (где создаётся client для web bundle)  
8. `deploy/cron/ssr-healthcheck.sh`, `deploy/cron/daibilet-tasks` (только понять ops boundary)

---

## 7. Definition of Done

- [ ] RCA с evidence (call graph + почему soft-timeout не достаточен)
- [ ] Выбранный architecture path с trade-offs
- [ ] PR в `feat/next-monorepo` (или готовый patch series) против hang
- [ ] Smoke/regression plan записан (и по возможности прогнан локально)
- [ ] Явная граница: что остаётся ops
- [ ] Tasktracker: `INC.504.22` → done / `INC.504.15` обновлён; Diary запись

**Контакт handoff:** Cursor agents продолжают live ops на MSK; Codex фокус - код и архитектура.

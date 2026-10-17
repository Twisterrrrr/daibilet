# Codex brief: медленный / нестабильный public API + catalog

**Дата:** 2026-08-09  
**Ветка:** `feat/next-monorepo`  
**Приоритет:** Критический (launch / prod stability)  
**Трекер:** follow-up после `INC.504.4` / `INC.504.5` / `INC.504.5b` / `INC.504.5c`; Redis = `INC.504.5d` (не сейчас)  
**Связанные инциденты:** `INC.VENUE-SOFT` / `INC.VENUE-SOFT-ALL`, история API hang / soft-unavailable, SSR `INC.504.22` (уже merge - **другой** brief)  
**Режим работы:** **code-first**, без SSH. Live ops / MSK deploy - Cursor/owner.

> Цель: независимый RCA + **PR-sized** фикс (или узкий набор PR) по latency / нестабильности **public API и catalog path** на MSK. Не повторять SSR-hang brief: `INC.504.22` уже merge (`f93b770`); HTML hot path в web ходит на backend HTTP. Этот brief = **API process + catalog disk Soft-SWR + web↔api timeouts**.

**Отличие от старого brief:** [codex-ssr-hang-brief.md](./codex-ssr-hang-brief.md) - Next SSR / Prisma-in-web / event-loop hang HTML. Здесь - `:4000` public endpoints, disk catalog worker, fat DTO, indexes, memory, nginx soft screens.

---

## 1. Проблема (симптомы)

| Симптом | Наблюдение |
|---------|------------|
| Медленные hubs | `/events`, `/locations`, `/venues` (и связанные public DTO) - нестабильный TTFB / «пляшущие» задержки |
| API hang (история) | `daibilet-api` listen жив, но health / public DTO timeout; Recv-Q растёт; swap spike (~1.9G в окне INC.VENUE-SOFT) |
| Soft-unavailable | Venue/location PDP и hubs уходят в soft 200 («Площадка временно недоступна») при API timeout; риск poison Full Route Cache / STALE HTML |
| Catalog pressure | ~3k sessions, disk artifact ~17MB v2; promote / parse / adopt индексов на event loop API |
| После 504.5c | Dual SQL rebuild снят; API `REBUILD_MODE=off`; timer+disk live - **но** latency/нестабильность owner всё ещё видит |

**Ключевой вывод ops (контекст):** тяжёлый SQL rebuild на request loop уже выносили (504.4 → 504.5 → 504.5c). Оставшийся класс проблем - sync CPU на disk promote (`JSON.parse`), fat responses, unused/heavy indexes, memory pressure, nginx/web timeout → soft screens, web↔api AbortSignal mismatch.

### Parallel track (НЕ смешивать)

| Track | Суть | Правило |
|-------|------|---------|
| **/my-day `bad token`** | TicketsCloud widget отвергает `token=r:…` (`HTTPForbidden` / bad token). Код/комменты: `day-route.ts`, `day-route-boat.ts`, `dto.js`, TC import | Отдельный баг / отдельный PR. **Не** класть в один PR с API/catalog latency без явного evidence, что это один root cause |

---

## 2. Уже сделано (не переделывать без evidence)

| ID | Что | Статус |
|----|-----|--------|
| **INC.504.4** | Catalog SWR rebuild off Next/request event-loop: disk snapshot, `child`/`inline`/`off`, forever soft-SWR, cold await cap | ✅ MSK |
| **INC.504.5** | Dual Soft-SWR collapsed: канон rebuild только `public-catalog.dto.ts`; `dto.js` **adopt-only** (sessions + indexes, без второго SQL) | ✅ 2026-08-08 |
| **INC.504.5b** | Adopt-шов: stale-first; legacy SQL fallback только cold+no-stale + cooldown 45м; chunked adopt (`setImmediate`) | ✅ |
| **INC.504.5c** | Catalog Worker **shared disk**: systemd timer ~8 мин → `rebuild-public-catalog-dto.sh`; API `DAIBILET_CATALOG_REBUILD_MODE=off`; disk **v2** sessions+indexes; async promote в API; health staleness = `stat` mtime (без parse) | ✅ MSK live `7b5c5e5b` |
| **INC.504.5d** | Future: Redis gzip + `updated_at` P1; не streaming | ⏳ **не implement** пока disk-worker не стабилизирован / не доказан bottleneck |
| **INC.504.22** | Web SSR → backend HTTP + bounded timeout (`cached-*-data`, `public-api-client`) | ✅ merge; **не** scope этого brief |

Канон транспорта сейчас: **shared disk**, не Redis. См. `docs/qa.md` (2026-08-08 Catalog Worker + Redis deferred).

---

## 3. Архитектурная подсказка (откуда смотреть)

### API / catalog

| Слой | Файлы / символы |
|------|-----------------|
| DTO + Soft-SWR | `apps/backend/src/public-catalog.dto.ts` (`getPublicCatalogSessions`, promote, rebuild modes) |
| Disk snapshot | `apps/backend/src/public-catalog-disk-cache.ts` (v1/v2, async load, anomaly guards) |
| Legacy adopt | `apps/backend/src/dto.js` - adopt-only поверх DTO; indexes hydrate; emergency SQL cooldown |
| Worker cron | `deploy/cron/rebuild-public-catalog-dto.sh` + `scripts/rebuild-public-catalog-dto-cache.mjs` |
| systemd | `deploy/systemd/daibilet-catalog-dto-rebuild.timer` / `.service` |
| Artifact | `var/cache/public-catalog-dto.json` (~17MB v2, ~2943 sessions на MSK) |

### Web (после 504.22 - HTTP client, не Prisma-in-Next)

| Слой | Файлы |
|------|--------|
| HTTP client | `apps/web/src/server/public-api-client.ts` (`fetchPublicApiJson` + timeouts) |
| Cached surfaces | `cached-catalog-data.ts`, `cached-venue-data.ts`, `cached-city-data.ts`, `cached-home-data.ts`, `cached-event-data.ts`, `cached-public-surfaces.ts` |
| Soft UX | venue/location soft-unavailable при timeout (не кэшировать soft HTML в ISR - уже правили в INC.VENUE-SOFT) |

Request path API после 504.5c: memory Soft-SWR → async disk promote → **без** spawn/inline rebuild в API process. Rebuild = отдельный worker/timer.

---

## 4. Гипотезы A-G (проверить evidence, не догма)

| ID | Гипотеза | Что искать |
|----|----------|------------|
| **A** | Disk `JSON.parse` stall | Sync parse ~17MB на promote всё ещё на event loop → 150-300мс+ spikes; warm path уже async read, но parse sync. Worker thread / streaming parse / smaller artifact? |
| **B** | Rebuild / promote leak | Timer + promote race; double hydrate; orphan child; memory не отпускается после adopt |
| **C** | Fat DTO | `/api/public/events` / venues / locations отдают лишний payload (slots, facets, indexes) на hub path |
| **D** | Indexes unused / expensive | v2 indexes пишутся и hydrate в Maps, но hot path их не использует или пересчитывает |
| **E** | Memory pressure | RSS dual-representation (DTO blob + dto.js maps); swap → latency jitter / soft timeouts |
| **F** | nginx soft / cache poison | Upstream timeout → soft 200 → STALE HIT; симптомы «всё недоступно» без реального DTO miss |
| **G** | web↔api timeouts | `fetchPublicApiJson` AbortSignal короче cold path API → ложный soft / empty; или наоборот слишком длинный → hang UX |

Codex должен **ранжировать** гипотезы по evidence (код + локальные/staging smoke; prod read-only только если owner даст доступ) и предложить минимальный фикс под победившую.

---

## 5. Scope / Definition of Done

### В scope

1. RCA с evidence: call graph API catalog + web fetch path; какая гипотеза A-G подтверждена/опровергнута.
2. PR-sized fix(es) в `feat/next-monorepo`: latency / стабильность public catalog API **без** Redis (504.5d).
3. Smoke plan: cold/warm `GET :4000/api/health`, `/api/public/events`, venues/locations hubs; web `/events` `/venues` `/locations` (TTFB, нет soft-poison).
4. Явная граница ops vs code; что остаётся systemd/timer/nginx.
5. Короткий отчёт owner (формат ниже) + обновление Diary/Tasktracker при сдаче.

### Вне scope / запреты

1. **Не трогать** finance host `.159`, YooKassa, supplier LC secrets, `.env` / credentials.
2. **Не force-push** (`main` / `master` / `feat/next-monorepo`).
3. **Не implement INC.504.5d Redis** пока не доказано, что disk+API path исчерпан и owner явно сказал «делаем Redis».
4. **Не смешивать** my-day TicketsCloud `bad token` в тот же PR без evidence общего root cause.
5. **Не включать** wide catalog CTA без запроса owner.
6. **Не** полный MSK web deploy после каждого мелкого фикса - commit+push; live batch / по запросу owner (docs-only = без deploy).
7. **Не** откатывать 504.5c (timer + `REBUILD_MODE=off` + v2) без measured regression proof.
8. SSH/live triage - не обязателен; default code-only.

---

## 6. Формат отчёта owner (сдать вместе с PR)

Кратко, по пунктам:

1. **Вердикт:** одна-две фразы - root cause (или top-2 с confidence).
2. **Evidence:** файлы/символы + что измерили (latency, RSS, parse time, timeout path).
3. **Гипотезы A-G:** таблица confirmed / rejected / unknown.
4. **Фикс:** что в PR, что отложено (в т.ч. Redis 504.5d).
5. **Smoke:** команды + результаты (локально/staging).
6. **Риски / ops remainder:** timer, disk path, nginx, soft screens.
7. **Parallel:** явно «my-day bad token - out of scope / отдельный тикет».

---

## 7. Стартовые файлы для чтения (чеклист)

1. `docs/Project.md` - Public catalog (perf rules), INC.504.4 / .5  
2. `docs/Tasktracker.md` - Infra INC.504.4 … 504.5d, INC.VENUE-SOFT  
3. `docs/Diary.md` - **2026-08-08** (504.5 / 5b / VENUE-SOFT), **2026-08-09** (504.5c polish async promote)  
4. `docs/qa.md` - Redis deferred after disk worker  
5. `docs/codex-ssr-hang-brief.md` - только чтобы **не** дублировать SSR scope (уже merge)  
6. `apps/backend/src/public-catalog.dto.ts`  
7. `apps/backend/src/public-catalog-disk-cache.ts` (+ `.test.ts`)  
8. `apps/backend/src/dto.js` - adopt-only / legacy SQL cooldown  
9. `deploy/cron/rebuild-public-catalog-dto.sh`, `deploy/systemd/daibilet-catalog-dto-rebuild.*`  
10. `apps/web/src/server/public-api-client.ts` + `cached-*-data.ts` / `cached-public-surfaces.ts`

---

## 8. Definition of Done (чеклист)

- [ ] RCA с evidence (не только «кажется parse»)
- [ ] Гипотезы A-G размечены
- [ ] PR в `feat/next-monorepo` против latency/нестабильности API/catalog (без Redis 504.5d)
- [ ] Smoke/regression plan записан (и по возможности прогнан)
- [ ] Отчёт owner в формате §6
- [ ] Diary + Tasktracker обновлены; my-day bad token не смешан без evidence

**Контакт handoff:** Cursor agents - live ops / MSK; Codex - код, архитектура, PR-sized fix.

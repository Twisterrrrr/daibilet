# Хэндофф Codex — работы Cline за 20–21.11.2026

Все коммиты в ветке `cline/264a9`. Полный контекст для втягивания без потери нити.

## 0. Что сделано (сжато)

Четыре блока: **(1)** вылечен хронический API-hang (бот-500 на `/venues`), у него оказалось **две** причины; **(2)** скорректирована SEO-политика слотов EventPage; **(3)** сделан воспроизводимый генератор реестра рерайтов (контур Codex, пока его нет); **(4)** аудит контента показал, что «хвост 3.8k сирот» — это не новые продукты, а HP-комбо + тестовые события.

## 1. API-hang (бот 5xx): две причины, обе добиты

**Симптом:** бот-500 на веню-страницах (`googlebot/yandexbot`), `referenceErrors: 0`. Вотчдог `deploy/cron/api-healthcheck.sh` каждую минуту ловил `/api/health` с `curl=28 TTFB=0` и делал `systemctl kill -s SIGKILL daibilet-api` -> в окно ~5–15 c веню/события отдавали 500.

**Причина №1 — синхронный парс 17 МБ на event-loop (JS).**
`apps/backend/src/dto.js` `adoptCanonicalCatalogSessions` вызывал **sync** `loadPublicCatalogDiskCache()` = `fs.readFileSync` + `JSON.parse` ~17 МБ `public-catalog-dto.json` на каждом SWR-промоуте. Рядом уже лежал правильный async stat-gated `loadPublicCatalogDiskCacheWithStat()` — `dto.js` держал sync-версию. Починено (`93947656c`, `52a3de930`): async + stat-gate по mtime + single-flight + кэш только `{mtimeMs, sessionCount, indexes}` (без 17 МБ сессий в памяти).

**Причина №2 — cgroup MemoryHigh без swap (ядро, НЕ JS). Основная.**
После фикса №1 hang не ушёл. Диагностика (добавлена в вотчдог) выдала:
```
HANG process: ... state=D wchan=mem_cgroup_handle_over_high
HANG diagnostics: memory≈1.3GB swap=0 events=high 5769→54093→…
javascriptStack: "No stack."
```
Процесс в D-state внутри ядерной `mem_cgroup_handle_over_high` — упирается в `MemoryHigh` при **отсутствии swap** -> ядро давит синхронный reclaim. Рабочее множество API ~1.3 ГБ, `MemoryHigh=1200M` впритык. Починено (`30dfafff4`): `MemoryHigh 1200M→1800M`, `MemoryMax 1536M→2048M`; владелец дополнительно включает swap 2 ГБ.

**На будущее** (`19cee587d`): `api-healthcheck.sh` перед SIGKILL снимает cgroup-метрики, находит реальный node (`loader.mjs`+`server-entry.ts`), пишет `state=`/`wchan=`, при `--report-on-signal` шлёт SIGUSR2 -> `report.*.json` в `/var/log/daibilet/node-reports/`.

**Софт-200 для веню** (`4b3bc26f1`): транзиентная ошибка DTO -> `200 + noindex "Площадка временно недоступна"` вместо 500 (заглушка не кэшируется, чтобы не отравить ISR). Нужен web-деплой.

## 2. SEO-политика слотов (`ebeb0402f`)

По указанию владельца откатил свою же прошлую правку: слот, свёрнутый в опубликованный EventPage, теперь **`200 + noindex + self-canonical`** (а НЕ «cross-canonical без noindex»). Причина: `noindex + cross-canonical` сбивает Google и давал бакет «канонические версии не совпадают» (6 690). Истина для индексации — EventPage; слот деиндексируется и не редиректится (ничего не теряем, никаких 301-scale по живым слотам). **Твоё прежнее «slots = canonical-only» устарело.**

## 3. Реестр рерайтов (контур Codex — сделал я)

- `scripts/build-active-rewrites-register.mjs` (`6ef399b37`) — воспроизводимый генератор `all-active-eventpage-rewrites-production-<date>.json`. Раньше генератор был одноразовый и нигде не закоммичен. Нюансы:
  - выборка по `content.activeEditorialText.status = 'ACTIVE_EDITORIAL_REWRITE'` (не по `version` — у части батчей `batch`, у других `version`);
  - схема flat per-event (одна строка на `EventPage × Event`), `editorialMarker` = сырой `activeEditorialText`;
  - статус в данных — `READY` (не `PUBLISHED`);
  - сортировка детерминированная `(slug, eventId)`.
- Залатаны 2 битые строки в `eventpage-newyear-next-150-authoring-register-2026-11-18.csv` (`url=undefined`, пустой `sourceEventIds`): B1 #20 «Золотой микрофон» -> `evt_6af5d515…`, B1 #21 «TEODOR» -> `evt_6af8b1f9…`. **CSV вытащен с твоей ветки `codex/eventpage-newyear-rewrites-150` в `cline/264a9` — при мерже возможен дубль/конфликт.**

## 4. Аудит контента (счётчики по проду 21.11)

- Всего EventPage: **7 123**; живой рерайт: **1 754**; черновиков с живыми слотами (ждут рерайт): **3 674**; мёртвых: **1 695**.
- Живых слотов без EventPage: **3 808** -> разложились на **3 762 HP-комбо + 22 тестовых** = **0 реально новых продуктов** (`scripts/group-ungrouped-events.mjs`, `7f83af531`…`638f7fe8c`).
- Итог: «ещё рерайтов» ≈ **3 674**, а не «3 674 + 3 808».

## 5. Ночной синк

Таймер на месте, но **падал 2 ночи**: `21.11 03:22` — `ECONNREFUSED 127.0.0.1:5437` (postgres лёг в kernel-reboot аварии), `20.11 16:09` — DNS-failure до `simple.ticketscloud.com` (внешний маршрут/VPN). Последний успех `20.11 03:20` (`importedEvents 53083`). Владелец догнал вручную. К коду отношения не имеет.

## Перечень коммитов (`cline/264a9`)

| SHA | Коммит | Файлы |
|---|---|---|
| `ebeb0402f` | fix(seo): slots -> 200+noindex+self-canonical | `event-page-url-policy.ts`(+test), `docs/event-slug-canonical-policy.md` |
| `6ef399b37` | feat(content): регистр-генератор + 2 CSV-строки | `scripts/build-active-rewrites-register.mjs`, CSV |
| `19cee587d` | fix(ops): самозахват hang (report-on-signal + state/wchan) | `api-healthcheck.sh`, `daibilet-api.service`, `memory.conf` |
| `93947656c` | fix(backend): stat-gate catalog index hydrate | `dto.js` |
| `52a3de930` | refactor(backend): single-flight + memory-lean hydrate | `dto.js` |
| `7f83af531` | feat(content): группировка сирот read-only | `scripts/group-ungrouped-events.mjs` |
| `3cc90e9f4` | feat(content): title/venue по группам | `group-ungrouped-events.mjs` |
| `638f7fe8c` | feat(content): исключить HP-комбо и тесты | `group-ungrouped-events.mjs` |
| `30dfafff4` | fix(ops): MemoryHigh 1200M->1800M / Max 1536M->2048M | `daibilet-api.service`, `memory.conf` |
| `4b3bc26f1` | fix(web): soft-200 веню вместо 500 | `cached-venue-data.ts`, `VenuePages.tsx` |

## Что учесть

1. **`apps/backend/src/dto.js`** — два моих коммита в твоём контуре; просмотри `adoptCanonicalCatalogSessions`. Типчек 0, на проде.
2. **`event-page-url-policy.ts`** — смысл SEO слотов изменился (noindex+self-canonical); пересмотри завязки на старое canonical-only.
3. **`deploy/systemd/*` + `api-healthcheck.sh`** — `NODE_OPTIONS=--report-on-signal…` + `MemoryHigh=1800M/Max=2048M`; при перезаписи юнитов не затри (прод уже применён владельцем).
4. **Урок по памяти:** `dto.js` был НЕ единственной причиной; вторая (основная) — cgroup MemoryHigh при swap=0 -> D-state `mem_cgroup_handle_over_high`. Не давай рабочему множеству API расти без поднятия лимита.
5. **CSV-дубль** с `codex/eventpage-newyear-rewrites-150` (см. §3).
6. **Реестр** теперь коммичен; согласуем, чтобы не было двух «источников правды».

## Открытые вопросы

1. **HP-комбо «Комбо 1..7»** — 6 событий × 630 слотов висят «сиротами» без `EventPageEvent`-линка, хотя `isHarryPotterNumberedCombo` + merge-логика в `event-pages.js` должны сводить их в `muzei-garri-pottera-sankt-peterburg`. Почему merge не отработал — разобраться.
2. **Тестовые события** «Тест Елка»/«Тест Мета Елка» (22 слота) — зачистить или `HIDDEN`.
3. **Full 404 list (7 471)** из GSC — не доделан (был сэмпл 1 000 -> 873 записи).
4. **soft-200** — нужен web-деплой (код готов).
5. **Phase 3** (слоты как query-параметры + Schema.org `subEvent`).
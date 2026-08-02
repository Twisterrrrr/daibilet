## 2026-08-02 - Codex handoff: SSR hang RCA brief (INC.504.22)

### Наблюдения
- Owner: нужен независимый взгляд Codex на recurring SSR hang/504 (INC.504.13/.15/.18-.21), не повтор ops-бандаидов.
- Live mitigations уже на MSK: warm OFF, SIGKILL healthcheck, MemoryMax/heap, TimeoutStopSec=25. Soft-timeouts (PERF.SSR1) не спасают при blocked event loop.
- Архитектурный след: `@daibilet/web` тянет `@daibilet/backend/public-read` / Prisma в Next process (Path B).

### Решения
- Brief: [codex-ssr-hang-brief.md](./codex-ssr-hang-brief.md) - problem, boundaries (no SSH / no warm / no soft-timeout-only), deliverables (RCA call graph, architecture, PR-sized fix, smoke, ops remainder).
- Tasktracker: `INC.504.22` ожидает Codex; root hang по-прежнему `INC.504.15`.
- Docs-only: commit+push, без web deploy.

### Проблемы
- Root hang open до сдачи Codex. Ops safety net не заменяет архитектурный фикс.

---
## 2026-08-02 - INC.504.21: SSR hang again + healthcheck not executable

### Наблюдения
- Owner: prod SSR hung again. Local `:3001` `/` и `/events` - curl timeout 8s, **0 bytes**; next-server RSS ~1.6G, uptime ~11h; `daibilet-web` active.
- Warm process: none. Cron `daibilet-tasks` warm line still commented OFF.
- Cron healthcheck **стрелял каждую минуту** (syslog), но `journalctl -t daibilet-ssr-health` пуст с Aug 01 17:22; `ssr-health.log` без новых строк → auto-recovery **не работал**.
- Root cause ops: `/opt/daibilet/deploy/cron/ssr-healthcheck.sh` был `-rw-r--r--` (не +x). Прямой exec из cron → `Permission denied` (stderr void / No MTA). После INC.504.20 скрипт залили без `install -m 755`.

### Решения
- Manual: `systemctl kill -s SIGKILL daibilet-web` + `start` (warm none). Smoke: local `/` TTFB ~0.01-0.15s 200; external `daibilet.ru` `/` ~0.07s, `/events` ~0.09s.
- Live: `chmod 755` на healthcheck; cron CMD → `/bin/bash /opt/daibilet/.../ssr-healthcheck.sh` (не зависит от +x). Dry-run closed-port → BAD=1 + journal.
- Repo: `deploy/cron/daibilet-tasks` hardening + docs INC.504.21. Warm остаётся OFF.

### Проблемы
- Auto-healthcheck **не сработал** из-за 644; root hang (INC.504.15 event-loop / Prisma in web) open. Safety net снова жив после chmod/bash.

---

## 2026-08-02 - Мой день: catalog-first IA

### Наблюдения
- Owner: ручной text input не должен быть primary first-screen; foundation - Локации / Площадки / События; своё место - опционально в accordion.

### Решения
- `/my-day`: блок «Добавить из каталога» (city-scoped links + хаб «Главные места») выше списка.
- Text planner в collapsed accordion «Добавить своё место» (`data-day-plan-accordion`); форма сохранена.
- Sticky: Из каталога / Своё / Карты / Экскурсии.
- Канон обновлён в [mobile-templates.md](./mobile-templates.md).

### Проблемы
- Auto-pick / filters / top-up - backlog UX.MYDAY-F. BUILD_ID - после MSK ship.

---

## 2026-08-02 - Mobile templates canon + LOC1/LOC2/LOC4

### Наблюдения
- Owner priority: удобная структура шаблонов мобилки (foundation перед filters/auto-pick «Мой день»).
- Brief уже фиксировал: city chip скрыт на mobile (`CityPicker` `lg:block`), «Город» в меню внизу, `/locations` hero+карта жрут first screen.
- Event hero на mobile был `min-h-[calc(100vh-6rem)]` - нарушал hero budget.

### Решения
- Канон: [mobile-templates.md](./mobile-templates.md) - sticky chrome, hero budget, CTA, порядок секций, chips, `MobileStickyActionBar`.
- LOC1: city chip всегда в sticky header; DayRouteBadge текст с `min-[380px]` чтобы влезал chip.
- LOC2: в `MobileNavSheet` блок «Город» сразу после поиска.
- LOC4: `/locations` → `HeroLayout` minimal+dense; type chips horiz scroll; карта только `lg+`.
- Detail align: location sticky CTA (экскурсии/маршруты + день); institution safe-area; event hero capped; `/my-day` sticky Добавить/Карты/Экскурсии.
- Shared `MobileStickyActionBar`.

### Проблемы
- LOC5/6/7 и rename «Локации» - backlog. Deploy BUILD_ID - после MSK ship.

---

## 2026-08-01 - pl-vosstaniya: pier → bus

### Наблюдения
- Owner: `/locations/pl-vosstaniya` показывался как **причал** (`Причал — пл.Восстания`, type=pier).
- DB: `venue_6a27e5aa03f4b9692e87d7b3`, title `пл.Восстания`, kind был `PIER`, pageStatus `CANDIDATE`.
- К venue привязаны билеты «Водная прогулка на катерах по Ладожским Шхерам» → TC `guessVenueType` и `hasWaterOnlyEvents` форсили pier, хотя точка - автобусная посадка у Московского вокзала.

### Решения
- MSK DB: `kind` `PIER` → `MEETING_POINT`.
- Override `publicKind: bus` в `venue-address-overrides.json`; `resolvePublicVenueKindFromRow` / detail hub gate учитывают override.
- `hasWaterOnlyEvents` больше не делает pier для land boarding (`пл.` / метро / вокзал / MEETING_POINT).
- TC `guessVenueType`: не ставить `pier_water` по словам события, если venue - сухопутная точка сбора.

### Проблемы
- Закрыто: API `type=bus`, H1 `пл.Восстания` (без «Причал»), chip bus includes / pier excludes. BUILD_ID=`uAAeJS3sG_GuPNfbwQqKy`.

---

## 2026-08-01 - City hub: «Собрать за минуту» брал только 4 из 6 must-see

### Наблюдения
- Owner: пресет на хабе города собирал максимум 4 точки, хотя «Главные места» / mustSee обычно 6.
- `DAY_ROUTE_PRESET_SIZE = 4` в `buildCityDayRoutePreset`; DAY_ROUTE_MAX=8 не мешал.
- Batch-города: `CityPageView` предпочитал `sights` без slug над `mustSee` со slug → резолв в day-route слабее.

### Решения
- `DAY_ROUTE_PRESET_SIZE = DAY_ROUTE_MAX`: брать все resolvable must-see (типично 6), потолок 8.
- `CityPageView`: приоритет `mustSee` (slug) над prose `sights`.
- Merge address: не затирать полный street+house более коротким leftover.
- Copy: корректное склонение «N главных мест».

### Проблемы
- ~~Нужен MSK deploy + smoke Кострома/Мурманск: пресет → 6/8, badge 6~~ → MSK `5deb9bd` (+ tip `1698c9e7` vosstaniya) **BUILD_ID=`uAAeJS3sG_GuPNfbwQqKy`**. SSR Кострома/Мурманск: «Собрать за минуту: 6 главных мест»; live apex same. Параллельные builds ломали `.next` (prerender-manifest ENOENT) - финальный rebuild под flock.

---

## 2026-08-01 - Day-route: coords/address из каталога неполные

### Наблюдения
- Owner: часть точек из каталога в «Мой день» без координат («Нет координат»); адреса приходят урезанными (Fontanka / «Место посадки - Лиговский пр. 10»).
- Live list API для SPb pier/bus coords уже есть; SSR payload тоже содержит lat/lng после DR.7.
- Реальные пробелы: (1) `LocationCard`/`InstitutionCard`/layouts **не передавали `address`** в `AddToDayRouteButton` - в LS только title/city; (2) lean list select без `city.id`/`city.slug` → `cityId`/`citySlug` всегда null; (3) list DTO брал raw lat/lng без `resolvePublicVenueCoordinates`; (4) `enrichBareStreetAddress` делал `ул. г. Санкт-Петербург, …`.

### Решения
- Day-route item: поле `address`; catalog/detail/event add paths пишут полный address + lat/lng snapshot.
- `/my-day`: показать address (formatStreetAddress, без дубля если title уже содержит улицу); enrich matches по id **и** slug дописывает coords/address.
- Lean + `mapPublicVenueListItem`: cityId/citySlug; coords через `resolvePublicVenueCoordinates`.
- `venue-normalize`: не префиксовать `ул.` к city/settlement parts; strip `г. City`.

### Проблемы
- ~~Нужен MSK web+API deploy~~ → live **BUILD_ID=`uAAeJS3sG_GuPNfbwQqKy`** (`705d13d`+). Smoke SPb locations: coords 20/20, cityId 20/20; Fontanka 105 + tochka-sbora address+lat/lng; matches отдаёт address. Старые LS без address - enrich на `/my-day` или передобавить.
- Residual: «ул. г. Пушкин…» на Екатерининском дворце (poisoned cache / `г.` word-boundary) - follow-up strip в normalize.

---

## 2026-08-01 - /my-day: ложный «Точки из разных городов» при одном СПб

### Наблюдения
- Owner screenshot: 5/8 точек, все с городом **«Санкт-Петербург»** (Эрмитаж / Русский музей text + каталог Лиговский / Гранд Макет / Булла), но жёлтый warning «Точки из разных городов…».
- `dayRouteHasMixedCities`: `venueCityKey` сначала брал `id:{cityId}` для каталога и `title:{city}` для text-stop → разные ключи при одном городе.
- UI ещё OR-ил `payload.multiCityWarning` поверх локальной проверки.

### Решения
- `normalizeDayRouteCityTitle` + `dayRouteHasMixedCities`: приоритет нормализованного title; cityId→title из sibling rows; id-only fallback.
- `DayRoutePanel`: при наличии city/cityId на точках доверять локальной проверке (не false-positive от API).
- Enrich matches: более полный address; подтянуть city/cityId/citySlug если пусто.
- Unit: catalog cityId + text same title → not mixed.

### Проблемы
- ~~Нужен MSK deploy + smoke: catalog + text все СПб → нет warning; matches работают~~ → MSK `705d13d` (в `fc4e419`) **BUILD_ID=`uAAeJS3sG_GuPNfbwQqKy`**. Chunk `6404` содержит `normalizeDayRouteCityTitle` (`replace(/ё/g` + `[\s\-]+`). Unit 33/33; matches `tochka-sbora` → address+coords, `multiCityWarning=false`.

---

## 2026-08-01 - /my-day: 3-я текстовая точка «Не удалось добавить» (QuotaExceeded)

### Наблюдения
- Owner screenshot: Точки · 2/8 (Эрмитаж, Русский музей), форма Гранд Макет + адрес + город + coords `59.887991, 30.330520` → красный **«Не удалось добавить точку. Попробуйте ещё раз»**, кнопка Add enabled (не MAX=8).
- Clean live repro с теми же полями на пустом LS - OK (3/8). Отказ воспроизводится только когда `localStorage.setItem(dayRoute)` бросает **QuotaExceeded** на росте payload 2→3 (~+200B).
- Slim-retry без `imageUrl` не помогает: text stops уже без картинок, payload только растёт. Same-origin page caches (`daibilet:venue-page:*`, `event-page:*`, …) из legacy public SSR забивают квоту.

### Решения
- `writeDayRoute`: round-trip verify после setItem; при fail - `evictDayRouteDisposableCaches(0)` (все disposable page-cache ключи, не трогая dayRoute/favorites/auth/city) → retry full+slim.
- `parseDayRouteCoordsInput`: NBSP/fullwidth comma / европейский `59,88, 30,33`.
- Unit: quota + page-cache eviction → Grand Maket 3/8. E2E: `scripts/e2e-day-plan-grand-maket.mjs`.

### Проблемы
- ~~Нужен MSK deploy + E2E 2→Grand Maket→3/8 under near-full LS~~ → MSK `a6a35c2` **BUILD_ID=`7lA4l2wG63Ia_3fdgqLsC`**. E2E `scripts/e2e-day-plan-grand-maket.mjs`: 2→Grand Maket→3/8 OK (coords persisted, page caches evicted under quota).

---

## 2026-08-01 - /my-day text planner: лимит до 8 (не MIN=2)

### Наблюдения
- Owner: текстовый планировщик на `/my-day` «принимает только 2 точки», нужно до 8.
- Live probe на `0f24fe6` / BUILD `iWvkrKtHTJQ6ZfXtsf6wI`: add 1→8 уже работал, счётчик `N/8`, кнопка disabled только на 8/8. `DAY_ROUTE_MAX=8`, `DAY_ROUTE_MIN=2` только для UX «день сложился».
- Риск регрессии: stale React `atMax` / silent write-fail очищал title без роста count; E2E раньше останавливался на 2 и не ловил MIN-as-cap.

### Решения
- `submitTextStop`: лимит по `readDayRouteFresh().venues.length >= DAY_ROUTE_MAX`; при неудачном add не чистить поля, показать ошибку.
- Комментарии: MIN ≠ add ceiling. E2E `scripts/e2e-day-plan-text.mjs` гоняет 0→8 и падает если add disabled на 2.

### Проблемы
- ~~Нужен MSK deploy + smoke 5 текстовых точек~~ → MSK `85b4a63` **BUILD_ID=`lTTVacKQjRXqQAABoBDgl`**. E2E 0→8: add enabled на 2/8, disabled только на 8/8; счётчик `N/8`. Smoke 5 точек OK.

---

## 2026-08-01 - /my-day standalone text planner (без каталога)

### Наблюдения
- Owner: catalog «В мой маршрут» по-прежнему ломается у них; нужен планировщик, не завязанный на `/locations`.
- Требование: добавлять точки текстом на `/my-day`, счётчик N/8, persist localStorage, без cityId-gate.

### Решения
- `addTextStopToDayRoute` + synthetic ids `text_*`; optional note/city/coords (`lat, lng`).
- `/my-day`: форма «Добавить» сверху; список ↑↓/удалить/очистить; CTA «Можно добавлять места текстом».
- Matches API только для catalog ids; text-only → блок «Подходящие экскурсии» скрыт.
- Share `?day=t:Title|t:Title2` hydrate без API.
- Unit: text add / count / coords / share; E2E `scripts/e2e-day-plan-text.mjs`.

### Проблемы
- Catalog buttons оставлены как secondary path; не дебажили в этом pass.
- ~~MSK deploy + E2E~~ → `0f24fe6` **BUILD_ID=`iWvkrKtHTJQ6ZfXtsf6wI`**. E2E text planner 0→1→2 без каталога.

---

## 2026-08-01 - Day-route: toast «Не удалось добавить точку» на 2-й точке

### Наблюдения
- Owner: клик по другой локации (тот же город) → toast **«Не удалось добавить точку»** (не «Уже в маршруте»).
- Строка только в `AddToDayRouteButton.feedbackAfter`: count не вырос и `sameDayRouteVenue` false.
- Город/`cityId` add **не блокирует** (mixed city только держит dominant cityId).
- Playwright happy-path на live 1→2→3 зелёный; точный toast воспроизведён при throw `localStorage.setItem` на 2-й записи (quota/private).
- Дополнительный риск: stale `snapshotCache` (raw совпал, state битый) → add думает bucket пуст и перезаписывает LS.

### Решения
- `writeDayRoute`: honor failure; retry slim без `imageUrl`; freeze+clone cache; subscribers получают mutable clone.
- `addToDayRoute` / button: `readDayRouteFresh()` до/после; при failed write возвращаем previous state.
- E2E regression: `scripts/e2e-day-route-multiadd.mjs`.
- Unit: quota fail keeps 1; slim retry; null vs cityId same title appends.

### Проблемы
- ~~Нужен MSK deploy + тот же E2E зелёный~~ → MSK `9bbe493` **BUILD_ID=`WKT1rWN1718h0x0jsrX5K`**. `scripts/e2e-day-route-multiadd.mjs` 1→2→3 desktop/mobile + hard/soft detail: toast «Добавлено · N/8». Poisoned snapshotCache больше не затирает 1-ю точку (fresh LS read).

---

### Наблюдения
- Owner: клик по локации, которой **нет** в маршруте → toast **«Уже в маршруте»**, точка не добавляется (BUILD `S_RAZ0azumKgT_beN19UH` / `d9b639c`).
- Compact add-only после `d9b639c` вызывал `isInDayRoute(id, state, slug)` с правилом «любой needle == любой stored id/slug». Если в LS у точки A `slug` совпадал с `id` точки B (или наоборот), B ложно считалась уже в маршруте → early-return без `addToDayRoute`.
- `feedbackAfter` при неизменном count всегда писал «Уже в маршруте», даже когда точки реально не было в storage.

### Решения
- `isInDayRoute` при **обоих** id+slug → только `sameDayRouteVenue` (id↔id или slug↔slug); одиночный locator по-прежнему матчит id или slug (share/panel).
- Compact / intent=day / toast: membership только через `sameDayRouteVenue`; «Уже» только если точка реально в LS; иначе add → «Добавлено · N/8».
- Unit: pathological `slug === otherVenue.id` не блокирует add; slug-as-id must-see ↔ catalog `venue_*`+same slug по-прежнему alias.

### Проблемы
- ~~Нужен MSK deploy + Playwright~~ → MSK `6c604f3` **BUILD_ID=`1HV6yidGN5MSbZU4idc7s`**. Proof: EMPTY0 + SEED1 на `/locations` - 2 чужих точки → «Добавлено · N/8»; pathological `slug===otherId` тоже ADD (не «Уже»).

---

## 2026-08-01 - Day-route: owner «не более 1 точки» - inert SSR click + catalog toggle

### Наблюдения
- Owner снова: **не добавляется более 1 точки** (prior Playwright «1→2→3» - suspect).
- Catalog path на live с паузой 2s: 1→2→3 реально работает (уникальные id, badge sync).
- Detail hard-nav: клик при `waitUntil=commit` / delay **0ms** - кнопка уже в DOM (`data-venue-id` верный, `aria-pressed=false`), но **LS не пишется** (нет `LS_WRITE`). Delay ≥50ms - add OK. Root cause: SSR рисует **enabled** `<button>` до hydration; клик до hydrate = silent no-op. Owner после промаха по Link на карточке попадает на detail и жмёт «В мой маршрут» сразу - вторая точка «не добавляется».
- Catalog compact `toggleDayRoute`: повторный тап по уже зелёной кнопке **снимает** точку → снова 1; выглядит как «вторая не добавляется».

### Решения
- `AddToDayRouteButton`: `live` gate (`useLayoutEffect`) - до client ready кнопка **disabled** (нет мёртвых кликов); toast «Добавлено · N/8» / «Уже в маршруте» / reject reasons.
- Catalog `compact`: **add-only** (убрать точку - в «Мой день» или full detail toggle).
- `day-route` store: `window.__daibiletDayRouteRuntime` singleton + dedupe на `writeDayRoute`.

### Проблемы
- ~~Нужен MSK deploy + Playwright proof~~ → MSK `d9b639c` **BUILD_ID=`S_RAZ0azumKgT_beN19UH`**. Proof: /locations+/venues+/detail 1→2→3, toast «Добавлено · N/8», early-commit `live=0 disabled`, add-only guard держит 1 при re-click green.

---

## 2026-08-01 - INC.504.20: SSR hang снова (owner fury) + cron `%` убивал healthcheck

### Наблюдения
- Owner: «ЕПРСТ! опять SSR???» - live hang `:3001` `/` и `/events` curl **timeout 0 bytes**.
- `daibilet-web` active, MemoryCurrent **~1.6G** / MemoryMax 2G / MemoryHigh 1.5G; next-server не отвечал.
- Warm procs в момент обнаружения не было; warm log последнее окно `12/12 ok` (~17:12 UTC).
- Cron healthcheck **стрелял каждую минуту** (syslog), но `ssr-health.log` пуст и `journalctl -t daibilet-ssr-health` пуст → restart никогда не выполнялся.
- Root cause ops: в `/etc/cron.d/daibilet-tasks` inline `date -u +%Y-…` с **голым `%`**. Cron трактует `%` как newline и обрезает CMD на `date -u +` → `bash -lc` syntax error (stderr в void, No MTA). Фикс INC.504.19 (`CODE=$?`) был в файле, но restart-ветка мертва из-за `%`.
- Prisma `Connection terminated` в этом окне в journal не всплыл; peak memory ~1.5G на stop.

### Решения
- Immediate: `pkill -f '[w]arm-hub-pages'`; SIGKILL + `systemctl start daibilet-web` → Ready; local TTFB **~0.01-0.03s** 200; external **~0.05-0.07s** 200.
- **Warm OFF** в live `/etc/cron.d/daibilet-tasks` (было `*/12`; commented, optional `0 */2` later).
- Healthcheck вынесен в `deploy/cron/ssr-healthcheck.sh` (нет `%` в cron.d); recovery = **SIGKILL+start** (не `restart`, который зависает на hung Next); flock + `timeout 90s`.
- Dry: live BAD=0; closed-port `DAIBILET_SSR_HEALTH_DRY_RUN=1` → log+logger, без kill.
- Repo canon + Diary/Tasktracker; docs/cron commit+push, **без** web redeploy.

### Проблемы
- Root cause hang (event-loop / SWR / INC.504.15 Prisma) open. Warm временно выключен как mitigation нагрузки.
- Любой будущий inline `%` в cron.d без `\%` снова обезвредит job - держать логику в `.sh`.

---

## 2026-08-01 - Day-route: badge «1» vs 3× «В маршруте» desync

### Наблюдения
- Owner screenshot `/locations`: header **«Маршрут · 1»**, но green **«В маршруте»** на Ligovsky + Fontanka 71 + Fontanka 105.
- Live Playwright happy-path 1→2→3 по LS/`data-day-route-count` уже работал; forced LS=1 не давал false-positive на sibling ids.
- Архитектурный зазор: кнопки держали локальный `useState(active)` после `toggle` return, бейдж читал только `localStorage` через DOM-event; bfcache/failed write/stale React → рассинхрон count vs green buttons.

### Решения
- Единый snapshot: `subscribeDayRoute` + `useSyncExternalStore` (`useDayRouteState`) для badge и `AddToDayRouteButton`.
- `writeDayRoute`: emit subscribers только после успешного `setItem`; pageshow/storage invalidate cache.
- `readDayRoute`: drop blank id, dedupe same id/slug twins.
- Unit: sibling Fontanka/Ligovsky false-positive + subscribe lengths 1→2→3.

### Проблемы
- Live MSK: commit `ff852a9` (tip `505fad6`), **BUILD_ID=`spsgbupFbWeJyWDuz2XNi`**. Playwright: badge===active===LS на 0→1→2→3 (Ligovsky/Fontanka71/Fontanka105); forced LS=1 не подсвечивает siblings.

---

## 2026-08-01 - Location map: zoom-out (`-`) broken on OSM embed

### Наблюдения
- Owner: на location page причала «Фонтанки 105» кнопка `-` на карте не отдаляет (красный круг на скрине); `+` работает.
- Карта = `OsmMapEmbed` → iframe `openstreetmap.org/export/embed.html` (теперь MapLibre, не Leaflet).
- Smoke: `.maplibregl-ctrl-zoom-out` кликабелен и не `disabled`, но с начального `fitBounds` визуальный zoom-out no-op; zoom-in меняет кадр. Upstream embed фактически держит пол у стартового zoom.

### Решения
- `OsmMapEmbed` переписан на client Leaflet (`leaflet` dep): `minZoom=3` / `maxZoom=19` / стартовый `16`, свои `+/-` (RU titles), OSM tiles + зелёный pin.
- `ResizeObserver` только `invalidateSize` (больше не перезагружает iframe bbox).
- CSS: transparent `.daibilet-osm-marker`; leaflet z-index 0 под site chrome.

### Проблемы
- ~~Нужен SPB build → MSK `.next` swap~~ → MSK-only deploy `4c93418` **BUILD_ID=`HDL3hw0HUymPBt_oi5syV`**. Live smoke Fontanka 105: iframe=0, leaflet=1, screenshot hash меняется на `-` и `+`.

---

## 2026-08-01 - INC.504.19: SSR hang снова (owner 504) + healthcheck bugfix

### Наблюдения
- Owner: снова 504 / no HTML TTFB на prod (~19:49 MSK / 16:49 UTC).
- Immediate smoke `:3001` `/`: curl **15s timeout, 0 bytes** (accept-loop hang). `/events` не успел до recovery.
- next-server RSS **~1480MB** (MemoryMax=2G); при stop SWR catalog `2817 sessions in 111125ms` на том же процессе.
- Warm log в окне hang: `0/12 ok` (fetch failed) + timeout на `/` и city hubs. Warm cron `*/12`+flock **не** thrashing.
- `ssr-health.log` пуст / `journalctl -t daibilet-ssr-health` пуст при живом cron каждую минуту → healthcheck **не сработал** и не thrashing.
- Bug: `TTFB=$(curl ... || echo 999)` при connect-hang даёт multiline `0.000000\n999` → `bc` → 0 → restart never. Prisma `Connection terminated` в этом окне **не** в journal (в отличие от INC.504.18).
- nginx: upstream timed out / connection refused на 3001; ~39×504 в окне 16:40-16:52 UTC (owner `178.66.*` + bots).

### Решения
- Safe `pkill -f '[w]arm-hub-pages'`; stop + SIGKILL leftover next-server; `systemctl start daibilet-web` → Ready ~1.1s.
- After: local `/` TTFB **~0.04s** 200; `/events` **~0.02s**; external `--resolve` daibilet.ru **~0.05-0.07s** 200. **BUILD_ID=`gEmtnqRsq_L56ejFTXSav`**.
- Live fix `/etc/cron.d/daibilet-tasks`: detect `curl CODE!=0` OR `TTFB>5`; flock `/var/lock/daibilet-ssr-health.lock` anti-thrash. Dry-run: live BAD=0, closed-port BAD=1.
- Repo canon: `deploy/cron/daibilet-tasks`. Docs-only commit (no web redeploy).

### Проблемы
- Root cause hang (event-loop / catalog SWR pressure / INC.504.15 Prisma) open. Healthcheck - safety net only.
- Частые deploy stop→start окна сегодня (~1.5-2м) дают user-visible 504 отдельно от hang.

---

## 2026-08-01 - Day-route: owner «не добавляет 2-ю» - UX gap + catalog harden

### Наблюдения
- Live Playwright на `daibilet.ru`: catalog `/locations` и `/venues` 0→1→2→3 по `daibilet:dayRoute` и `data-day-route-count` **уже работает** (уникальные `data-venue-id`, LS_WRITE, badge sync). Soft-nav detail тоже 1→2.
- Owner screenshot `/my-day` 1/8 Fontanka: баннер «добавьте ещё 1» без ссылок; карточки «Подходящие экскурсии» - только ссылки на событие (покрытие start/stop), не CTA добавления стопов.
- Мобильная кнопка каталога была icon-only (~34px) поверх `<Link>` карточки - легко попасть в навигацию вместо add.

### Решения
- `/my-day`: блок «Добавить точку» → `/locations?city=…` + `/venues?city=…` + явная подсказка про «В мой маршрут».
- Matches API: `routeVenues` (start+STOP stubs с coords); UI «Добавить места экскурсии» / chip «В маршрут».
- Catalog: лейбл всегда виден, z-20 wrapper stopPropagation, badge «Маршрут · N» на mobile.
- Phase-0: must-see CTA + presets + event add-from-event (в том же ship).
- MSK deploy `2d3f7a4` → **BUILD_ID=`gEmtnqRsq_L56ejFTXSav`**. Smoke: catalog 0→1→2→3 + coords; `/my-day` CTA → locations → 2-я точка; Яндекс не blocked.

### Проблемы
- У многих water tours в БД нет STOP routeItems - bulk add с карточки экскурсии пуст; путь - CTA в каталог.

---

## 2026-08-01 - Day-route: catalog stripped lat/lng (all locations «Нет координат»)

### Наблюдения
- Owner screenshot: «Причал на Фонтанке 53» в Мой день с «Нет координат», Яндекс заблокирован, 1/8.
- Live API detail/matches: у Fontanka / tochka-sbora coords **есть**. SPb locations catalog API: **20/20 (100%)** с coords.
- Playwright: multi-add 1→2→3 на live **уже работает** (detail soft-nav + catalog cards). Add с detail пишет lat/lng в localStorage.
- Add с `/locations` catalog: lat/lng в storage **null** сразу после клика. Root cause: `toVenueCatalogCard` в `VenuePages` выкидывал latitude/longitude из SSR карточек (`VenueCatalogCard` без полей; SSR HTML `latitudeCount=0`). Enrich на `/my-day` подтягивал coords после matches, но до ответа UI показывал «Нет координат» (и owner воспринимал как поломку).

### Решения
- `VenueCatalogCard` + `toVenueCatalogCard` сохраняют lat/lng (reject 0,0); LocationCard Pick включает coords.
- Unit: `venue-catalog-card.test.ts`. Phase-0 presets/event CTA отложены до после фикса.
- MSK deploy `5c6ffc1` → **BUILD_ID=`faYl1EovDayQLYvHsV8kQ`**. Playwright: catalog add пишет coords сразу; 1→2→3; `/my-day` «ТОЧКИ · 3/8», `Нет координат`=0, Yandex не blocked. SPb locations API coords **100% (20/20)**.

### Проблемы
- Старые записи в localStorage без coords: открыть `/my-day` (enrich) или передобавить после деплоя.
- Owner «не добавляет 2-ю точку» на live до фикса часто смешивался с «Нет координат»/Яндекс unavailable при 1 точке из каталога без lat/lng; multi-add path (detail+catalog) на live уже давал 1→2→3.

---

## 2026-08-01 - Day-route: coords not pulled into «Мой день»

### Наблюдения
- Owner: «Место посадки — Лиговский пр. 10» в «Мой день» с «Нет координат» / Яндекс недоступен; «координаты вообще не подтягиваются».
- В БД у `tochka-sbora` (`venue_5661…`) coords **есть** (59.934, 30.335); matches API их отдаёт. Пробел в клиенте: add в localStorage без lat/lng, UI читал coords только из payload по exact `id`.

### Решения
- Persist `latitude`/`longitude` в `DayRouteVenueItem`; передавать с карточек/деталок; `buildDayRouteCoordsMap` + merge id/slug; `enrichDayRouteFromMatchVenues` после matches.
- Commit `f8eaaa2` → MSK deploy **BUILD_ID=`21HhuN-BOse5tR4o8D0Uc`**.

### Проблемы
- Старые точки в localStorage без coords подтянутся при открытии `/my-day` (enrich); иначе передобавить.

---

## 2026-08-01 - Day-route multi-add recheck + missing coords backfill

### Наблюдения
- Owner: снова «нельзя добавить несколько точек» в «Мой день»; часть локаций без координат (хотя coords давались вчера).
- Live Playwright (detail soft-nav, catalog cards, must-see, mobile related): **1→2→3** в `daibilet:dayRoute` уже работает на BUILD `wcK6bf1ElP9vDu-ZTDEvN` (фиксы multi-add на месте).
- Реальный пробел по coords: **29** PUBLISHED/CANDIDATE без lat/lng. Из них SPb **11**, Москва **8**. Editorial must-see (`ermitazh`, `saint-petersburg-*`) coords **есть**; параллельные TC institution rows (`kazanskiy-sobor-7abab1bd1ddf`, `kunstkamera-…`, `mariinskiy-…`, `russkiy-muzey-…`, `yusupovskiy-…`, `pavlovskiy-…`) coords **не получили** - enrich матчит по editorial slug, не по title.
- Баг DTO: `Number(null)===0` → public venue API отдавал `lat:0,lng:0` (null-island); DayRoutePanel тоже мог считать 0,0 валидными для Yandex CTA.

### Решения
- Harden soft-nav: `usePathname` slug в `VenuePageView` (params иногда отстаёт от URL); badge count всегда виден; `cityId` на Location/Institution cards.
- `isValidCoordinatePair` / backend `isValidVenueCoordinatePair` + `resolvePublicVenueCoordinates`: reject 0,0; не Number(null).
- `scripts/backfill-missing-venue-coords.js` + twin-fill по title; apply на MSK.
- Deploy MSK-only `deploy-prod-next.sh`; Playwright proof multi-add + coords smoke.
- Live: commit `a0f11ce`, **BUILD_ID=`wcJsYlkCYd1869HV9B1c-`**. Backfill **21** venues (SPb must-see institutions + Moscow/etc.); осталось 8 junk без города (банкетные / YUTONG / test museum).

### Проблемы
- Junk pier stubs без города (банкетные залы / YUTONG) могут остаться без coords - не must-see.
- Owner perception «не добавляет точки» часто смешивается с «нет маршрута в Яндекс» при null coords.

---

## 2026-08-01 - Day-route matches: duplicate TC siblings

### Наблюдения
- Owner: в «Мой день» → «Подходящие экскурсии» ~6 одинаковых карточек ( titlе «Обзорная… Эрмитажа», `0 из 1 · ещё 1 рядом · от 1 500 ₽`).
- Live probe `GET /api/day-route/matches?venueIds=ermitazh`: **24** matches, только **2** unique titles (hyphen vs space в «Санкт[-]Петербург»), все score=1 nearby; разные `eventId` / slug с id-suffix (`…-69ca5d…`, `tc-6a3932…-…`).
- Root cause: TicketsCloud dated siblings = отдельные `Event` rows; match API дедупил только по `event.id`, UI `key={eventId}` → визуальные дубли одного продукта.

### Решения
- Pure helpers: `dayRouteEventBaseSlug` / `normalizeDayRouteTitleKey` / `dedupeDayRouteMatches` (best: score → coverage → min price).
- `matchDayRouteVenues` дедупит siblings **до** sort/limit.
- Unit: `day-route-score.test.ts` (strip slug + hyphen title + keep cheapest).
- Deploy MSK: commit `270790d`, BUILD_ID=`a1C8wIWfv5xrllhohrdOE`. Smoke `venueIds=ermitazh`: matches 24→**8**, hermitage overview cards **1** (price 1500), `dup_titles=[]`; `/my-day` 200 + noindex.

### Проблемы
- Dedupe по base slug/title - pragmatic UX; полный metaExternalId group (как event page) - follow-up если понадобится точнее across sources.

---

## 2026-08-01 - SPB build host retired; web deploy = MSK-only

### Наблюдения
- Owner: SPB builder (`213.171.7.16` / Intelligent Hoopoe) больше не нужен; live catalog остаётся только на MSK `.184`.
- Исторический канон «SPB build → MSK atomic `.next` swap» и одноразовые `.deploy-tmp/spb-build*.sh` устарели.
- SSH probe 2026-08-01: `daibilet_staging_key` → `.16` **OK** (`6726557-ls758282.twc1.net`, up ~146d). Alias `daibilet-spb` в локальном SSH config **нет** (часто `Permission denied` был из-за другого ключа / `id_ed25519`).
- На `.16` сейчас: PG Docker leftover `daibilet-tours-postgres` healthy; `/opt/daibilet` ~4G + staging ~1.6G; nginx site; public web/api/timers уже disabled (MIG.8); failed leftover rebuild units; backups `/root/backups` ~265M.

### Решения
- **Канон web deploy:** MSK-only - `BRANCH=feat/next-monorepo ./deploy/scripts/deploy-prod-next.sh` на `daibilet-msk` / `201.24.125.184` (stop web → build → start).
- Обновлены `.cursorrules`, Project, current-state, spb-finance-host, migration docs, Tasktracker MIG.9.7, qa.
- VM **не** уничтожаем из агента: owner удаляет Intelligent Hoopoe в панели Timeweb после чеклиста (backup off-box при желании).
- Finance `.159` / YooKassa / catalog live на `.184` - **не трогать** при удалении `.16`.

### Проблемы
- Исторические упоминания SPB→MSK в старых Diary/Tasktracker записях оставляем как audit trail.
- Перед wipe `.16`: убедиться, что Teplohod IP allowlist знает **MSK `.184`** (старые runbooks ещё ссылались на `.16`).
- Одноразовые скрипты в `.deploy-tmp/*spb*` не канон - не коммитить; агентам не использовать.

---

## 2026-08-01 - Day-route multi-add harden + Yandex multi-stop

### Наблюдения
- Owner: на live снова нельзя добавить больше 1 точки в «Мой день» (карточки `/locations|/venues` и detail).
- Предыдущие фиксы `a2c1b32` / `987516b` синхронизировали SSR payload по slug, но `venue` всё ещё падал на stale `payload?.venue` без проверки URL slug на soft-nav (первый paint / reusable client tree) → «добавить B» тогглило id A.
- Дополнительный риск: пустой `id` схлопывал все add в один слот.

### Решения
- `venueMatchesRouteSlug` + sync reset при смене slug (`activeSlug` / `useParams`); layout `key={venue.id}`; Add button `normalizeDayRouteVenueId` (reject blank).
- `/my-day`: reorder ↑↓ + persist, nearest-neighbor «Оптимизировать порядок», CTA «Маршрут в Яндекс.Картах» через `rtext=lat,lng~…&rtt=pd` (маршрут, не pins).
- Unit: multi-add / blank-id / stale slug / yandex URL / NN optimize.
- Deploy MSK in-place: commit `355eec1` → **BUILD_ID=`4-AqPsButr_VcuwLGcyFk`**. Smoke `/my-day` 200 + noindex; matches 200 (3 venues by id).

### Проблемы
- SPB `.16` pubkey denied → MSK in-place. Browser MCP в агенте недоступен - live multi-add доказан логикой + chunk markers; owner smoke badge 2→3 желателен.

---

## 2026-08-01 - `/locations` type chips: global counts vs city (20 vs 151)

### Наблюдения
- Owner screenshot: СПб `(20)` в city control, но чипы `Причал (36)` / `Открытая локация (151)` - глобальные.
- Selected chip «Открытая локация» + вопрос к 151 vs city 20.

### Решения
- `LocationsCatalogView`: facet counts / list base / «Найдено из» считаются по `cityScopedVenues`.
- Смена города сбрасывает `type`; orphan `type=` без matches в городе → «Все локации».
- «Все локации» показывает count в скоупе города.

### Проблемы
- Deep-link `?type=outdoor_location` при наличии типа в городе остаётся intentional; без matches сбрасывается.
- Live MSK: commit `bc994b6`, BUILD_ID=`4-AqPsButr_VcuwLGcyFk` (chunk содержит `cityScopedVenues`); SPb API smoke: 20 = pier14+attraction3+outdoor2+bus1.

---

## 2026-08-01 - Home hero: navy base under photo (undo blue overlay)

### Наблюдения
- Owner correction: в `b59bc7a` ошибочно положили navy gradient **поверх** фото (`from-[#0a174b]/…` / `#122868` wash). Нужен был legacy **base** `#122868` под картинками (placeholder до load), без синей вуали на фото.

### Решения
- Оставили `HomeHero` / public section `!bg-[#122868]` / `bg-[#122868]` как base layer.
- Убрали custom blue `overlayClassName` у `HeroMedia` → дефолтный лёгкий slate gradient для контраста текста.
- `HomeHeroBackground` (web + public): overlays вернули к slate (`slate-900/15` + `from-slate-950/75…`), не navy wash.

### Проблемы
- Канон web deploy: MSK in-place `pnpm web:build` (SPB build host retired). **BUILD_ID=`wcK6bf1ElP9vDu-ZTDEvN`**. Smoke `/`: 200 origin+HTTPS; HTML `!bg-[#122868]`; нет `from-[#0a174b]` / blue wash.

---

## 2026-08-01 - `/locations?city=` empty (all cities) + day-route multi-add

### Наблюдения
- Owner: `/locations?city=*` показывает 0 площадок для любого города; «Мой день» по-прежнему max 1 точка на live.
- API `:4000/api/public/venues?family=location` - 251 локация (СПб 20, Москва 29) - backend OK.
- Origin `:3001/locations` - полный HTML (~286KB, pier/venue payload); внешний HTTPS через nginx - **пустой** HTML (~172KB, `venue_=0`) при `x-cache-status: HIT` + `proxy_cache_valid 200 30m`.
- Root cause Bug A: soft-timeout 2.5s на catalog DTO → пустой SSR `venues=[]` → nginx кэширует пустой 200 на 30м для всех `?city=`.
- Day-route: `a2c1b32` уже в source/BUILD, но soft-nav мог снова подставлять stale `initialPayload` (slug mismatch); CTA «Локации» из `/my-day` ставил `?city=slug` (moscow) вместо title → 0 строк фильтра.

### Решения
- `VenueListPage`: timeout 4s; при empty → `noStore()` + retry без empty fallback; client fetch safety-net в `LocationsCatalogView`.
- City filter: `resolveCatalogCityFilter` (slug→label); DayRoutePanel locationsHref по `venue.city` title.
- `VenuePageView`: применять SSR payload только если slug/id совпадает; иначе fetch; render venue тоже от matched props.
- Ops: `rm -rf /var/cache/nginx/daibilet/*` + reload - после purge smoke Москва/СПб/Казань/Сочи `venue_>0`.
- Deploy: commit `987516b` → MSK in-place web build **BUILD_ID=`IffsRTTeclktlvq7PQweq`** + nginx purge. External smoke 4 cities: `venue_=51`, pier>0, `/my-day` 200.

### Проблемы
- nginx `proxy_cache_valid 200 30m` всё ещё может отравиться любым пустым 200; noStore+retry снижает риск, полный bypass cache для empty - follow-up.
- SPB `.16` pubkey denied → MSK in-place web build.

---

## 2026-08-01 - Venue 404 «Модная среда 1823» (transport junk + gate deploy)

### Наблюдения
- Live `/venues/modnaya-sreda-1823-68d4062e38b75e8343b393ca`: soft-404 («Площадка не найдена»), API venue DTO → `null` до фикса.
- DB: id `venue_68d4062e…`, kind `CLUB_BAR_RESTAURANT`, `pageStatus=NONE` (позже ensure → `CANDIDATE`), 6+ future active sessions; address/description есть.
- `61f1116` (MEETING_POINT/`NONE` curated escape) на ветке и задеплоен, но **недостаточен** для этого slug: kind уже club, блокер - `isTransportVehicleVenueName('Модная среда 1823')` (multi-word + год) → junk → hub false.
- SPB `.16` SSH denied → MSK in-place `pnpm web:build` + restart api/web (dto в SSR через `@daibilet/backend/public-read`).

### Решения
- `61f1116`: curatedMeetingPoint допускает `NONE` при sessions; TC import `generic_location`+events→`CANDIDATE`.
- `921abe4`: ужесточить fleet-regex; institution kinds не режутся transport-junk; тест + `scripts/ensure-modnaya-sreda-venue.js` (`CANDIDATE`).
- Live smoke: HTML **200** title «Модная среда 1823: афиша…»; API 200 (`slug` canonical `modnaya-sreda-1823`); sample `phase-g-test-museum` 200. **BUILD_ID=`YYuWaKq2MGFkUSNVioLJp`**.

### Проблемы
- Event→venue ссылки на junk/non-hub venues остаются (VENUE.L3).
- Канон SPB→MSK atomic swap временно недоступен (`.16` publickey).

---

## 2026-08-01 - Web deploy verify: venue gate + junk title (921abe4)

### Наблюдения
- Owner запросил deploy. Local `feat/next-monorepo` уже sync с origin (HEAD `921abe4` = junk-title fix; включает venue gate `61f1116`). Unpushed commits: нет.
- На MSK параллельно уже шёл in-place rebuild (`/tmp/msk-rebuild-junk-fix.sh`, после ensure-modnaya). Повторный deploy не стартовал.
- SPB `.16` в этой итерации не использовался (канон recent: MSK in-place при denied SPB SSH).

### Решения
- Дождались завершения чужого rebuild; live подтверждён без второго swap.
- **BUILD_ID=`YYuWaKq2MGFkUSNVioLJp`** (mtime ~14:23 UTC). HEAD на диске `921abe4`. `daibilet-web` + `daibilet-api` active.
- Smoke HTTPS: `/` 200, `/events` 200, `/venues/modnaya-sreda-1823-68d4062e38b75e8343b393ca` 200 (title «Модная среда 1823…», API :4000 venue 200). Phase-g sample 200.

### Проблемы
- В HTML flight payload встречается строка «Страница не найдена» (false soft-404 при grep), при этом title/venue payload валидны - не трактовать как 404.
- In-place `pnpm web:build` на живом `.next` по-прежнему риск thrash; предпочтителен SPB tar → atomic swap, когда `.16` доступен.

## 2026-08-01 - INC.504.18: owner 504 report - site already recovered

### Наблюдения
- Owner: снова 504 на production (~17:06 MSK / 14:06 UTC).
- Immediate smoke (без restart): local `:3001` `/` `/events` `/cities` **200**, TTFB ~0.01-0.05s; API `/api/health` **200** ~3ms; external `--resolve` `.184` `/` **200** TTFB ~0.05-0.07s.
- nginx access: **21×504** в окне `13:01-13:18` UTC (Googlebot + user `178.66.*`); после `14:00` - **0×504**. Error log: `upstream timed out while connecting to upstream` → Next не принимал коннекты (event-loop hang), не DNS.
- Journal `daibilet-web` @13:17: Prisma `Connection terminated unexpectedly` (home-stats / public-city-articles / catalog soft-expire) + `unhandledRejection`; затем Stopping→Started @13:18-13:20 (recovery).
- Доп. окна downtime от deploy/restart (не healthcheck): 13:55:52→13:57:25 (~93с) и 14:03:59→14:05:45 (~106с). Owner-репорт совпал с концом второго окна. `ssr-health.log` пуст, `journalctl -t daibilet-ssr-health` пуст → healthcheck **не** thrashing.
- Active **BUILD_ID=`rs16U9aCCKYbVyTyCjMyo`** (mtime 14:04). Soft-timeouts **present** (`src/lib/soft-timeout.ts` + SiteLayout / HomePageContent / VenuePages). `TimeoutStopSec=25` live. next-server RSS ~980-1000MB (MemoryMax=2G). Cron `/etc/cron.d/daibilet-tasks`: warm `*/12`+flock+90s OK (warm log 12/12); healthcheck `TTFB>5` → restart + `pkill -f '[w]arm-hub-pages'`.

### Решения
- Recovery restart **не** делали: HTML уже жив, warm не thrashing.
- Docs-only: INC.504.18 + tracker. Root cause hang (Prisma pool / event-loop) остаётся INC.504.15. Deploy stop→start gap ~1.5-2м - отдельный ops риск (пользователь видит 504 в окне atomic swap).

### Проблемы
- Soft-timeouts не спасают от полного hang accept-loop (как INC.504.13).
- Healthcheck поставлен @13:24 (после hang) - на инцидент 13:01-13:18 не успел среагировать.

---

## 2026-08-01 - UX research: Locations + mobile catalog brief

### Наблюдения
- Owner: `/locations` непонятен; mobile layout путает; выбор города неочевиден; каталог неудобен.
- Code: `CityPicker` в header `hidden lg:block`; на mobile город только в `MobileNavSheet` **после** nav/FAQ.
- `/locations` = venue family `location` (причалы/парки/точки сбора), не «города»; H1 «Локации и точки сбора» + map hero конфликтует с mental model «куда поехать».
- Live `/locations` `/events` `/cities` → 200. Конкуренты (Яндекс Афиша, Kassir, Afisha.ru, Eventbrite, Aviasales-like): город всегда видим; city-first; отдельного «Локации» в primary nav нет.

### Решения
- Docs brief: [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md). Build order: LOC1 city chip → LOC2 menu → rename/IA → locations dense → catalog context → sheet picker.
- Tracker UX.LOC0–9 + qa.md owner questions. UI rewrite не в этом проходе. Docs-only commit+push.

### Проблемы
- Browser MCP tab недоступен для скриншотов; live проверен curl/HTTP + code audit. Визуальные описания конкурентов - по публичным страницам/паттернам.

---

## 2026-08-01 - Home hero: restore legacy navy blue (not black)

### Наблюдения
- Owner: чёрный фон hero на главной отталкивает; вернуть синий как в legacy.
- Live HomeHero шёл через `HeroLayout` dark (`bg-slate-950`) + `HeroMedia` slate overlay - near-black атмосфера.
- Эталон синего: owner city navy `#122868` / deep `#0a174b` (HERO3n+); catalog legacy `from-sky-500 via-primary-600 to-indigo-700`.

### Решения
- Только главная: `HomeHero` `!bg-[#122868]` + overlay `from-[#0a174b]/80 via-[#122868]/45 to-primary-900/30`.
- Зеркало legacy public: `App.tsx` section + `HomeHeroBackground` overlays (slate → navy).
- Layout/композиция без изменений. Commit `b59bc7a` + push; SPB `.16` SSH недоступен → MSK in-place build+restart **BUILD_ID=`fX5_o-dvDlkd7wnhgo_Kv`**. Smoke `/`: 200, HTML содержит `122868` / `0a174b` / `!bg-[#122868]`.

### Проблемы
- Канон SPB→MSK atomic swap временно недоступен (`.16` Permission denied publickey); использован MSK-local build (RAM ок).

---

## 2026-08-01 - INC.504.17: канон `/etc/cron.d/daibilet-tasks` + SSR healthcheck

### Наблюдения
- После recovery INC.504.13 сайт жив; warm-only `*/3` был OFF.
- `systemctl show daibilet-web -p User` → **пусто** (unit без `User=`); процесс `next-server`/`pnpm` под **root**.
- `bc` уже установлен; `NODE_OPTIONS=--max-old-space-size=1280` уже в drop-in `memory.conf` (MemoryMax=2G) - поднимать heap до 2048 без restart не делали (headroom под Max мал, риск после hang).

### Решения
- Live MSK: создан `/etc/cron.d/daibilet-tasks` (trailing NL): warm `*/12` от **root** + flock `/var/lock/daibilet-warm-hubs.lock` + `timeout 90s` + `cd /opt/daibilet`; healthcheck каждую минуту на `http://127.0.0.1:3001/` (curl `\%{time_starttransfer}`, bc >5s → journald + `/var/log/daibilet/ssr-health.log` + `systemctl restart` + `pkill -f '[w]arm-hub-pages'`).
- Старые `/etc/cron.d/daibilet-warm-hubs` и `.bak.` переименованы в `*.disabled.<ts>` (без double-warm).
- Smoke без restart: `/` TTFB ~0.021s 200; `/events` ~0.009s 200.

### Проблемы
- Root cause hang (Prisma/event-loop) всё ещё open; healthcheck - ops safety net, не фикс кода.
- Опциональный bump `NODE_OPTIONS` до 2048 отложен: уже 1280 + MemoryMax=2G.

---

## 2026-08-01 - INC.504.13: повторный SSR hang / nginx 504

### Наблюдения
- API жив (~1ms health/events), HTML `/` `/events` - TTFB hang 8s+, 0 байт → nginx 504.
- `next-server` RSS пик **1.7G**; journal снова Prisma `Connection terminated unexpectedly` (public-city-articles / catalog).
- Soft-timeouts PERF.SSR1 уже в BUILD, но hang всё равно - event-loop / Prisma pool, не только долгий await.
- `systemctl restart` зависал на graceful stop hung Next; сработал только **SIGKILL** по PID pnpm/next.

### Решения
- SIGKILL + `systemctl start daibilet-web` → Ready ~1.1s; cold catalog rebuild ~15s; smoke local `/` 200ms → затем 22ms.
- External `--resolve` `.184`: `/` `/events` `/cities` **200**, TTFB ~0.16-0.21s.
- `/etc/cron.d/daibilet-warm-hubs` **полностью отключён** (было `*/3` + flock+90s). Repo template тоже OFF; commented `*/15` + WARM_CONCURRENCY=1.
- systemd drop-in `stop-timeout.conf`: **TimeoutStopSec=25** + KillMode=control-group (live + repo) - чтобы restart не висел 90с+.
- Follow-up: Prisma pool в web-процессе; warm не возвращать на `*/3` без smoke TTFB.

### Проблемы
- Root cause hang не снят кодом - только ops mitigation (restart + disable warm).
- `pkill -f warm-hub-pages.mjs` с MSK через SSH опасен: совпадение с командной строкой bash убивает саму сессию.

---

## 2026-08-01 - Blog schedule shift: очередь на сегодня

### Наблюдения
- Новые статьи не «ломались»: `PUBLISHED` + future `publishedAt`, public filter `publishedAt <= now`.
- Ближайший слот был 03.08; пауза с 29.07 выглядела как простой.

### Решения
- Сдвиг 12 будущих MD `publishedAt` (−2 дня; volhov → **01.08 10:05 MSK** сразу в выдачу).
- `blog:upsert --force-published-at` на MSK + revalidate `/blog`.

### Проблемы
- Нет.

---

## 2026-08-01 - SSR hang: SiteLayout destinations + warm soft defaults

### Наблюдения
- Live: API/health живы; HTML `/` `/events` `/cities` давали 0 байт 8s+ (TTFB hang). Journal: Prisma `Connection terminated unexpectedly` в daibilet-web.
- Restart `daibilet-web` сразу вернул TTFB ~0.02-0.14s - зависание runtime/cold DTO, не nginx/DNS.

### Решения
- `SiteLayout`: soft-timeout 900ms на `getCachedDestinations` (пустой chrome > hung TTFB).
- `/cities`: `getCachedDestinations` вместо raw `buildPublicDestinationsDto` + timeout 2.5s.
- Home: soft-timeout 800ms на `getHomeCoverFingerprints` (egress HEAD).
- `/venues|/locations` list: soft-timeout 2.5s на catalog DTO.
- `warm-top-event-pages`: default N=40, concurrency=2, fetch timeout 8s, flock single-flight.
- Deploy: `11fe214` → SPB→MSK **BUILD_ID=`rNVioNw6J2R2nOpPkbsM6`**. Smoke local: `/` 78ms, `/events` 22ms, `/cities` 18ms, `/venues` 25ms, `/podborki` 14ms.

### Проблемы
- Prisma connection drops в web-процессе при давлении - отдельный follow-up (pool/timeout), сейчас fail-soft SSR.

---

## 2026-08-01 - Must-see editorial batch6 (13 городов, 78 точек)

### Наблюдения
- Owner: Кострома, Курган, Курск, Липецк, Мурманск, Саранск, Смоленск, Сыктывкар, Тамбов, Хабаровск, Чебоксары, Чита, Южно-Сахалинск (по 6).
- У всех 13 городов `mustSee` был пустым - нужны slug + insert Venue.
- Owner-координаты с ошибкой города: «Коми пасы» (56.x/Йошкар-Ола) и Чувашский нацмузей (54.x/Саранск) - исправлены на локальные (~61.67/50.84 и ~56.14/47.25).

### Решения
- `must-see-editorial.json` → 390; batch6 артефакт 78; aliases batch6 в enrich (`lipeck`, `habarovsk`, `yuzhno-sahalinsk`).
- `cityInfo` mustSee заполнен для 13 ключей; slugify ь/ъ → пусто (канон seed).
- MSK apply: **32 insert + 46 update**; soft-sign twin-slug **29× HIDDEN**; API restart; smoke owner HookFact.
- Commits `5b5c3da` + `ebf0398` → SPB build → MSK atomic `.next` **BUILD_ID=`-qqq_t2f_YXevgHdjOf7E`**. Smoke `/cities/kostroma` (Ипатьевский), `/venues/kostroma-muzey-syra` 200.

### Проблемы
- Черновик JSON сначала ушёл с placeholder HookFact - пересобран из owner-текстов перед apply (`ebf0398`).
- Два прохода soft-sign slugify дали twin Venue; канон без soft-дефисов, twins HIDDEN.

---

## 2026-08-01 - Must-see editorial batch5 (10 городов, 60 точек)

### Наблюдения
- Owner: Астрахань, Барнаул, Белгород, Благовещенск, Брянск, Иваново, Йошкар-Ола, Калуга, Кемерово, Киров (по 6).
- У всех 10 городов `mustSee` был пустым (только sights) - нужны slug + insert Venue.

### Решения
- `must-see-editorial.json` → 312; batch5 артефакт 60; aliases batch5 в enrich.
- `cityInfo` mustSee заполнен для 10 ключей (в т.ч. `blagoveschensk-amurskaya-oblast`, `kirov-kirovskaya-oblast`, `yoshkar-ola`, `astrahan`).
- MSK apply: 60 insert; API restart; smoke 10/10 owner HookFact.
- Commit `378b6e1` → push → SPB build → MSK atomic `.next` **BUILD_ID=`CtYJ2QqOPWHTXK4oaaEZ_`**. Smoke `/cities/astrahan` (mustSee «Астраханский кремль»), `/locations/astrahan-astrahanskiy-kreml`.

### Проблемы
- Нет.

---

## 2026-08-01 - Must-see editorial batch4 (12 городов, 72 точки)

### Наблюдения
- Owner: Томск, Ульяновск, Ижевск, Орёл, Оренбург, Абакан, Псков, Севастополь, Симферополь, Пенза, Волгоград, Архангельск (по 6).
- У Архангельска в cityInfo был пустой `mustSee` (только sights) - без slug нельзя было линковать хаб.

### Решения
- `must-see-editorial.json` → 252; batch4 артефакт 72; aliases batch4 в enrich.
- `cityInfo.arhangelsk.mustSee` с 6 slug (в т.ч. insert 6 Venue на MSK).
- MSK apply: 66 update + 6 insert; API restart; smoke 12/12 hookFact owner-тексты.
- Commit `031cfff` → push → SPB build → MSK atomic `.next` **BUILD_ID=`jv6nKn9t5UJhx8Wsd3_3l`**. Smoke `/cities/arhangelsk` 200 (mustSee «Малые Корелы»), `/locations/tomsk-lagernyy-sad` 200.

### Проблемы
- Нет.

---

## 2026-08-01 - Must-see editorial batch3 (10 городов, 57 точек)

### Наблюдения
- Owner: Владивосток(5), Вологда(6), Иркутск(5), Пермь(6), Сортавала(6), Саратов(6), Улан-Удэ(5), Челябинск(6), Рязань(6), Ставрополь(6).
- У Перми slug без city-prefix (`permskaya-galereya`, `naberezhnaya-kamy`, …).

### Решения
- `must-see-editorial.json` → 180; batch3 артефакт 57; aliases в enrich-скрипте.
- MSK apply 57 + API restart.

### Проблемы
- Локальный workspace временно пропал с диска - re-clone `feat/next-monorepo` @`4bd5df9` перед batch3.

---

## 2026-08-01 - Rostov must-see #6: Центральный рынок

### Наблюдения
- Owner дослал 6-ю точку Ростова: `rostov-na-donu-tsentral-nyy-rynok-staryy-bazar` (ранее batch2 был 5/6).

### Решения
- Добавлен editorial в `must-see-editorial.json` / batch2; MSK apply + API restart; база 123.

### Проблемы
- Нет.

---

## 2026-07-31 - Must-see editorial batch2 (9 городов, 53 точки)

### Наблюдения
- Owner прислал пулы Омск, Уфа, Великий Новгород, Тверь, Краснодар, Сочи, Тюмень, Воронеж, Ростов-на-Дону (Ростов: 5 точек, без Центрального рынка).
- Venue-строки уже были после cityInfo seed; нужны hookFact / description / wayToFind / coords / address.

### Решения
- Дописан `scripts/data/must-see-editorial.json` до 122; batch2 артефакт `must-see-editorial-batch2.json` (53).
- Алиасы городов batch2 в `enrich-must-see-editorial.js` (как в seed-cityinfo).
- MSK `--apply` 53/53 update, `preservedShort`; restart `daibilet-api`.

### Проблемы
- Нет (cities resolve OK). Следующие города по запросу owner.

---

## 2026-08-01 - Day-route multi-add + площадки

### Наблюдения
- Owner: в маршрут попадала только одна локация; логично добавлять и площадки.
- `addToDayRoute` сам по себе append-ит; баг UI: soft-nav `/locations/[slug]` → `/locations/[other]` оставлял stale `payload` в `VenuePageView` (effect early-return при `initialPayload?.venue`), кнопка «В мой маршрут» тогглила id предыдущей точки.
- Вторичный wipe: share hydrate `?day=` делал `replaceDayRouteFromVenues` и затирал уже набранные точки.

### Решения
- `VenuePageView`: sync SSR payload при смене slug + `key={slug}` на `VenueDetailPage`.
- `hydrateDayRouteFromShare`: не затирать local-superset; после hydrate `router.replace('/my-day')`.
- Affordance: `AddToDayRouteButton` на `InstitutionVenueLayout`, `LocationCard`, `InstitutionCard` (модель уже venueId).
- Unit: multi-add + hydrate keep-superset.

### Проблемы
- Deploy: SPB `.16` Permission denied publickey → MSK-local build. Commit `a2c1b32` → **BUILD_ID=`rs16U9aCCKYbVyTyCjMyo`**. Smoke: `/my-day` 200 + noindex; `/locations` `/venues` 200; loc/venue detail 200.
- Bonus: nginx `location /api/` слал day-route на legacy API (404). Добавлен `^~ /api/day-route/` → `daibilet_web`; публичный matches теперь 200.

---

## 2026-07-31 - Day-route polish MVP (`/my-day`)

### Наблюдения
- Owner: polish «Собери свой день» без coords/STOP/finance; badge был только `lg:flex` - на мобилке счётчик пропадал.
- «N из M» раньше считал nearby как полное покрытие - против ТЗ (`coveragePct` = STOP+start).

### Решения
- `/my-day`: empty states (0 точек / 0 матчей), лимит 2-8, multi-city warning, бейджи в маршруте/старт/рядом/нет, toast «Скопировано», mobile padding.
- Header: `DayRouteBadge` всегда в sticky + «Мой день» в mobile sheet; live sync через `DAY_ROUTE_CHANGED_EVENT` / storage.
- Unit: `day-route.test.ts` (parse/share/mixed/hydrate helpers) + score tests.

### Проблемы
- Качество матча всё ещё упирается в Phase 0 STOP/coords (параллельный чат).
- Deploy: commit `56bbb237` → SPB build → MSK atomic `.next` **BUILD_ID=`Mt5-YY9GU-T83jOIjxN0Q`**. Smoke `/my-day` 200 + noindex; matches API 200.

---

## 2026-07-31 - Must-see editorial enrich (12 городов, 69 точек)


### Наблюдения
- Owner дал HookFact / О локации / Как добраться / coords / адрес / метро для топ must-see (СПб, Москва, Казань, Калининград, Владимир, Ярославль, Екатеринбург, НН, Новосибирск, Красноярск, Тула, Самара).
- `shortDescription` карточек cityInfo уже был - нельзя затирать.
- Часть страниц API возвращала `null`: в `description`/`short` слово «памятник» роняло kind в `meeting_point`; ATTRACTION-дубли (ВДНХ, Спас) выигрывали merge по events.

### Решения
- `scripts/data/must-see-editorial.json` + `scripts/enrich-must-see-editorial.js`: пишем `hookFact` / `description` / `wayToFind` / coords / address / metroStation; `shortDescription` только если пусто.
- MSK apply: 69 update. Hide stubs `vdnh-8af81f3a0643`, `spas-na-krovi-995a65eafe4e`.
- `dto.js`: explicit CMS kinds (`outdoor_location` / `attraction` / theater / museum*) побеждают meeting_point heuristic до проверки «памятник» в тексте.
- Pier-merge key: только `причал|пристань` (не голые «набережные») - иначе must-see променады проигрывали pier-близнецам.
- Smoke API: 69/69 OK_with_hook, 0 NULL, 0 slug mismatch. API restart на MSK.

### Проблемы
- Набережные всё ещё в pier-merge key по «набереж» - следить, если появятся pier-близнецы с events.

---

## 2026-07-31 - LE.9 Admin suggest + DR.2 share `?day=`

### Наблюдения
- Owner: «да, супер, продолжаем» после MVP geo + day-route (BUILD `baXnUSpZjxRiogKVC7Y6s`).
- Favorites = только localStorage; готового `PUT/GET /api/me/day-route` / user favorites day-bucket нет.

### Решения
- LE.9: `GET /api/admin/events/:id/venue-link-suggestions` + `POST …/venue-links:apply` (mode=merge only, STOP only, не wipe, не трогает `Event.venueId`). Admin UI «Подобрать рядом» → чекбоксы → rows → save через существующий PUT.
- DR.2: `/my-day?day=id1,slug2` hydrate localStorage + «Копировать ссылку»; страница уже noindex. Phase 2 auth sync **отложен** до появления user day-route/favorites API.
- Coords gap: без массового seed; Пермь dry-run раньше показал 1 candidate с coords - нужно точечное editorial/coords, не `--auto-high` на прод без owner apply.

### Проблемы
- Качество suggest упирается в coverage lat/lng у PUBLISHED/CANDIDATE venues.

### Deploy
- Commit `998361cb` → push → SPB build → MSK atomic `.next` **BUILD_ID=`-sKmVUBgu0IedqpkrxVaW`** + `systemctl restart daibilet-api`.
- Smoke MSK: `/my-day` 200 + noindex + «Мой день»; `/api/day-route/matches` 200; API stats 200. Finance `.159` не трогали.

---

## 2026-07-31 - Geo autolink CLI + «Собери свой день» MVP

### Наблюдения
- Owner: делать оба ТЗ; Phase A geo CLI сначала, затем Phase B day-route.
- MSK dry-run `--city=perm`: 143 events, 1 candidate venue с coords/pageStatus (мало coords у must-see) → 1 medium suggest; apply не гоняли.

### Решения
- CLI `scripts/suggest-venue-route-links.js` + `scripts/lib/venue-route-geo.js`: haversine/bbox, пороги 150/300/500, merge STOP only, никогда не трогает `Event.venueId`, не пишет START/NEARBY_HUB.
- Unit: `scripts/venue-route-geo.test.mjs`, `apps/web/src/lib/day-route-score.test.ts`.
- Day-route: localStorage `dayRoute`, `AddToDayRouteButton`, header badge, `/my-day` noindex, `GET /api/day-route/matches` (score 3*STOP+2*start+1*nearby). Без комбо/finance.

### Проблемы
- У Перми почти нет candidate venues с lat/lng + PUBLISHED/CANDIDATE → dry-run бедный; нужно coords seed / geo Phase C editorial.

### Deploy
- Commit `2a83331d` → push → SPB build → MSK atomic `.next` **BUILD_ID=`baXnUSpZjxRiogKVC7Y6s`**.
- Smoke MSK: `/` 200, `/my-day` 200 + `noindex, nofollow` + «Мой день», `/api/day-route/matches` 200. Finance `.159` не трогали.

---

## 2026-07-31 - Docs: ТЗ geo-autolink + «Собери свой день»

### Наблюдения
- Owner запросил ТЗ на geo-автопривязку экскурсий к локациям и отдельно на фичу «Собери свой день».
- Канон Location↔Excursion уже в коде: `EventVenueRouteItem` STOP, `Event.venueId`=старт, public `stopEvents` vs `nearbyEvents` (~300 м) без merge.

### Решения
- Зафиксированы draft ТЗ: [tz-geo-venue-route-autolink.md](./tz-geo-venue-route-autolink.md) (пороги 150/300/500, dry-run/apply, admin suggest) и [tz-soberi-svoy-den.md](./tz-soberi-svoy-den.md) (localStorage, score STOP>start>nearby, noindex, без комбо в MVP).
- Связь: geo-autolink = Phase 0 dependency качества «Собери свой день».
- Tasktracker: LE.8/LE.9, DR.1/DR.2. Docs-only: commit+push, без web deploy.

### Проблемы
- Нет.

---

## 2026-07-31 - City hero HERO3p: adaptive right gutter ladder

### Наблюдения
- После HERO3o (`md:4%` / `lg:10%`) на ультрашироком фото уехало вправо и прилипало к rim.
- Mid (как НН раньше) должен оставаться ближе к правому краю без navy-дыры; xl+ нужен заметный gutter (~16-20%).

### Решения
- Лестница right-%: `md:4%` → `lg:10%` → `xl:16%` → `2xl:20%`.
- `leftFillDesktop` calc и `rightGutter` width синхронизированы под те же %.
- Soft fade md+ и mobile full-bleed без изменений; mask не возвращали; `md:right-[20%]` не восстанавливали (только 2xl).

### Проблемы
- Нет.

### Deploy
- Commit `5e15123a` (+ comment-guard `ae05a327`) → push → SPB build → MSK atomic `.next` **BUILD_ID=`Z3MIKd0glXMUeTfnLRgU8`**.
- Smoke `/cities/nizhny-novgorod`: `right-[4%]` / `lg:right-[10%]` / `xl:right-[16%]` / `2xl:right-[20%]`; soft edge fade; 16:9; no mask / `#000000` / `md:right-[20%]`. Finance `.159` не трогали.

---

## 2026-07-31 - Location page: hide empty excursion UI

### Наблюдения
- Owner (скрин «Самарская набережная»): на точке без STOP-экскурсий показывались «0 экскурсий», CTA «Посмотреть экскурсии» и empty-block «Пока нет привязанных…».
- Nearby («Рядом») - отдельный блок; не путать со stopEvents.

### Решения
- `LocationVenueLayout.client.tsx` (web): hero count + CTA только при `stopEvents.length` / `stopEventCount` > 0.
- Секция `#venue-stop-events` рендерится только если есть stopEvents или nearbyEvents; empty state убран.
- Public-дубль без этого UI не трогали. City hero файлы не трогали.

### Проблемы
- Нет.

### Deploy
- Commit `3271bfcb` → push → SPB build → MSK atomic `.next` **BUILD_ID=`slptXB74NiKJwSUqiCO7t`**.
- Smoke `/locations/samara-samarskaya-naberezhnaya`: no `0 экскурсий` / CTA / empty-block; есть «О локации», share, «Рядом ещё точки».

---

## 2026-07-31 - City hero HERO3o: photo closer to right rim

### Наблюдения
- Owner (скрин Нижний Новгород, mid-width): огромная пустая navy зона справа от фото.
- HERO3n держал жёсткий `md:right-[20%]` на всех md+ - на mid-width «дыра» справа.

### Решения
- Photo gutter breakpoint-specific: `md:right-[4%]` / `lg:right-[10%]` (вместо hard 20%).
- `leftFillDesktop` calc и `rightGutter` width синхронизированы (`4%` / `10%`).
- Soft edge fade md+ и mobile full-bleed без изменений; mask не возвращали.

### Проблемы
- Нет.

### Deploy
- Commit `c814ca54` → push → SPB build → MSK atomic `.next` **BUILD_ID=`_uJZrw56NXeR2mgb5NxaB`**.
- Smoke `/cities/nizhny-novgorod`: `right-[4%]` / `lg:right-[10%]` / `w-[4%]` / `lg:w-[10%]`; no `right-[20%]`; soft `city-hero-photo-edge-fade`; 16:9; `pt-16`; no mask / `#000000`. Finance `.159` не трогали.

---

## 2026-07-31 - City hero HERO3n: drop alpha-mask (rollback)

### Наблюдения
- Owner: HERO3m mask (~38% L/R) слишком большой; на mobile странно режет full-bleed.
- «Почти супер» было до alpha-mask (HERO3k); нужен откат mask/overlay на фото, не весь hero.

### Решения
- Убран `.city-hero-photo-mask` из `photoFrame` и правило из `globals.css`.
- Вернули лёгкий soft edge fade (~15% L/R) как overlay, **только md+** (`hidden md:block`) - mobile full-bleed без L/R прозрачности.
- Сохранены: light navy `#122868` панели (без `#000` slam), `pt-16`, `mt-5`, 16:9, `right-[20%]`.

### Проблемы
- Нет.

### Deploy
- Commit `c2e2f4c4` → push → SPB build → MSK atomic `.next` **BUILD_ID=`yZkioNIzo_sXcC2xFFbmy`**.
- Smoke `/cities/samara`: no `city-hero-photo-mask`; soft `city-hero-photo-edge-fade`; `#122868` panels; 16:9 / `right-[20%]` / `pt-16`; no `#000000`.

---

## 2026-07-31 - City hero HERO3m: light at photo seam, deepen toward rim

### Наблюдения
- HERO3l (`77d0e282` / BUILD `jHtvwxZAR2TRG9YhqGoVj`) не то: убрали тёмное с **внешних** краёв секции.
- Owner хотел убрать тёмный/«грязный» стык **ближе к картинке** (фото↔navy), либо сильнее прозрачность краёв фото.
- Канон: у photo-edge - светлый синий `#122868`; тёмные stops только дальше от фото (к rim).

### Решения
- `fadeLeftDesktop`: `#0a174b`/`#0B1B48` у outer left → длинный plateau `#122868` у photo edge.
- `fadeRightGutter`: soft → `#122868` у photo → deepen `#0d1f5c`/`#0B1B48`/`#0a174b` к правому rim.
- `.city-hero-photo-mask`: alpha fade расширен ~28% → ~38% L/R, мягче steps (меньше dirty band).
- Направление градиентов **не инвертировали** (уже light@photo / deep@rim); усилили plateau + mask.

### Проблемы
- Нет.

### Deploy
- Commit `1b1873a9` → push → SPB build → MSK atomic `.next` **BUILD_ID=`-PTytb5araL9R7DTMqQjD`**.
- Smoke `/cities/samara`: leftGrad ends `#122868 100%`; right `#122868`→`#0a174b` rim; mask `#000 38%`; hex `0B1B48` present; no `#000000`.

---

## 2026-07-31 - City hero HERO3l: lighter navy, no black rims

### Наблюдения
- Owner Самара: фон читается почти чёрным; красные X на L/R швах + круг на mid panel.
- Base `#0a174b` + stops `#000` / `#050e28` на leftGrad и right gutter «чернили» края под mask alpha.

### Решения
- `CITY_NIGHT_HERO`: base `#122868`, mid `#0d1f5c`, deep `#0a174b` (owner swatch как самый тёмный stop).
- Убраны `#000` / `#000000` из fadeLeftDesktop / fadeLeftMobile / fadeRightGutter.
- `.city-hero-photo-mask` alpha без изменений (mask `#000` = opaque, не цвет фона).

### Проблемы
- Нет.

### Deploy
- Commit `77d0e282` → push → SPB build → MSK atomic `.next` **BUILD_ID=`jHtvwxZAR2TRG9YhqGoVj`**.
- Smoke `/cities/samara`: HTML `122868` / `0d1f5c` / `0a174b`; нет `#000000`; styles `background-color:#122868` + gradients without black rims; `city-hero-photo-mask` + CSS_MASK_OK.

---

## 2026-07-31 - City hero HERO3k: real mask-image (не overlay)

### Наблюдения
- Owner: швы слева/справа на фото - «брак» (красные волны на стыках). Overlay navy поверх фото не убирает геометрический край opaque pixels.
- HERO3g/3i soft fade = `backgroundImage` overlay; live seam остаётся.

### Решения
- `.city-hero-photo-mask` в `apps/web/app/globals.css`: `-webkit-mask-image` / `mask-image` linear-gradient, soft ~25-28% L/R → alpha 0.
- Класс на `CITY_NIGHT_HERO.photoFrame` (CityPageView + skeleton). Overlay `photoEdgeFade` удалён.
- Mobile full-bleed тоже masked. Mobile gap HERO3j (`mt-5 md:mt-3`) не откатывали.

### Проблемы
- Нет.

### Deploy
- Commit `0db07eb3` → push → SPB build → MSK atomic `.next` **BUILD_ID=`9A0T7hjLeA1YtvBHDt7d8`**.
- Smoke `/cities/samara`: HTML `city-hero-photo-mask`; CSS bundle `-webkit-mask-image`/`mask-image`; old `city-hero-photo-edge-fade` отсутствует; mobile gap `mt-5` на месте.

---

## 2026-07-31 - City hero: mobile gap after lead

### Наблюдения
- Owner СПб mobile: после brief сразу tag «Белые ночи» - мало воздуха перед tag/stats/CTA.

### Решения
- Meta-блок (tag+stats+CTA): `mt-5 md:mt-3` после lead; desktop без раздувания.
- Skeleton `CityLoadingState` + `SiteChromeSkeleton`: CTA row `mt-5 md:mt-3`. Fades/navy/`pt-16` без изменений.

### Проблемы
- Нет.

### Deploy
- Commit `55253504` → push → SPB build → MSK atomic `.next` **BUILD_ID=`U0vFfMpCCjrvys2yhOxCI`**.
- Smoke `/cities/saint-petersburg`: `mt-5 md:mt-3`, `pt-16`, `#0a174b`, `city-hero-photo-edge-fade`.

---

## 2026-07-31 - City hero: right edge fade + mobile top padding

### Наблюдения
- Owner после soft left fade (BUILD `8DwUkz2XCFh58Z20GVN_p`): справа fade слабо / недостаточно (шов фото→gutter).
- Mobile: после equal `py-8` title близко к верху - нужно ~2× воздуха сверху.

### Решения
- `fadePhotoEdges`: правая кромка зеркалит левую (~15% navy→transparent→navy); `fadeRightGutter` soft ~7%.
- Mobile content: `pt-16 pb-8` / `sm:pt-20 sm:pb-10`; md+ `md:py-10`. Skeleton sync через `CITY_NIGHT_HERO`.
- Без отката 16:9 / `right-[20%]` / left fade / navy `#0a174b`.

### Проблемы
- Нет.

### Deploy
- Commit `0cfe8aa2` → push → SPB build → MSK atomic `.next` **BUILD_ID=`E_ATa3U0g3Km35xQ8KFac`**.
- Smoke `/cities/saint-petersburg`: `city-hero-photo-edge-fade`, right mirror `transparent 85%` / `rgba(…,0.78) 97%`, `pt-16`/`pb-8`, `#0a174b`, `16/9`, `right-[20%]`.

---

## 2026-07-31 - City hero: soft photo-edge fade (navy↔photo seam)

### Наблюдения
- Owner скрин СПб: жёсткий вертикальный шов на левом краю фото (navy панель `#0a174b` стыкуется с фото без blend).
- LeftGrad/right gutter уже плавные; режется именно кромка самого изображения.

### Решения
- `CITY_NIGHT_HERO.photoEdgeFade` + `fadePhotoEdges`: overlay на фото (md+), navy→transparent ~12–15% слева и лёгкий fade справа в gutter.
- Класс-маркер `city-hero-photo-edge-fade` для smoke.
- Подключено в CityPageView + CityLoadingState + SiteChromeSkeleton. Mobile py / 16:9 / `right-[20%]` / `#0a174b` без отката.

### Проблемы
- Нет.

### Deploy
- Commit `49d7c616` → push → SPB build → MSK atomic `.next` **BUILD_ID=`8DwUkz2XCFh58Z20GVN_p`**.
- Smoke `/cities/saint-petersburg`: `city-hero-photo-edge-fade`, `rgba(10,23,75,…)` edge grad, `#0a174b`, `16/9`, `right-[20%]`.

---

## 2026-07-31 - City hero mobile: equal top/bottom padding

### Наблюдения
- Owner скрин Красноярск: mobile night-hero top-heavy - сверху большой зазор, снизу CTA почти к краю.
- Причина: fixed `h-[280px]` + `justify-end` прижимал колонку вниз; `py-8` не спасал визуально при длинном title+lead+stats+2 CTA.

### Решения
- `CITY_NIGHT_HERO.section`: mobile/sm `min-h-[280|320]`, md+ fixed `h-[360px]` (16:9/gutter без изменений).
- `content`: `py-8`/`sm:py-10` + `justify-center` до md; `md:h-full md:justify-end`. Длинный контент растит секцию, низ не сжимается.
- HERO3g navy `#0a174b` сохранён (уже в ветке).

### Проблемы
- Нет.

### Deploy
- Commit + push + SPB→MSK atomic (BUILD_ID после smoke).

---

## 2026-07-31 - City hero HERO3g: owner swatch navy `#0a174b`

### Наблюдения
- Owner приложил скрин photo-edge цвета: доминирующий navy ≈ `#0a174b` (рядом `#0B194B`), не near-black `#000c2a`.
- HERO3f с `#000c2a` / `#010d2d` визуально читался как «только чёрный» - стоп у фото слишком тёмный.

### Решения
- Канон `CITY_NIGHT_HERO.navy = #0a174b`, mid `#050e28`.
- Left: `#000 → #050e28 → #0a174b` у края фото; right gutter: soft → `#0a174b` → mid → `#000` на правом краю.
- Section/underlay base `#0a174b` (не flat black). Skeleton/CityPageView comments sync.

### Проблемы
- Нет.

### Deploy
- Commit `cebe4133` → push → SPB build → MSK atomic `.next` **BUILD_ID=`C7lHo3iG3HDEDn8xbDvHt`**.
- Smoke `/cities/moscow`: grads `#000→#050e28→#0a174b` / right `#0a174b→#050e28→#000`; `#000c2a` отсутствует; flat `#000` base нет.

---

## 2026-07-31 - Owner: авто-commit/deploy для продуктовых итераций

### Наблюдения
- Owner отменил ask-first commit для UI/product итераций: после рабочего локального результата агент сам commit + push; web deploy (SPB build → MSK atomic swap) если затронут live runtime/UI. Docs-only handoff = commit+push без deploy.

### Решения
- Обновлён `.cursorrules` правило 1 + блок жёстких запретов (finance `.159` / YooKassa / supplier LC / no force-push / no wide CTA / no secrets).

### Проблемы
- Нет.

---

## 2026-07-31 - City hub article cards: bus ≠ river related links

### Наблюдения
- Скрин: `moskva-avtobusnaya-obzornaya` («Автобусная обзорная…») на city hub показывала речные («Адмирал», теплоходы) рядом с корректной карточкой ужина на теплоходе.
- `CityHubArticleTeaser` → `matchArticleSessions`: статья topic=`tours`, речная сессия детектилась как `river`+`tours` (слово «обзорн/экскурси») и проходила intersect по `tours`; плюс слабые keyword hits («обзорная», «Москва»).

### Решения
- Exclusive-вертикали: session с `river`/`standup`/`concerts` без той же темы у статьи → reject (не через общий `tours`).
- Vertical require: если в статье «автобус» / «теплоход|речн» - у session должен быть тот же сигнал.
- Тесты: moscow bus vs river; river dinner vs bus.

### Проблемы
- Нет relatedEventIds/editorial override в коде - чинили только автоматчер. Commit/deploy по просьбе.

---

## 2026-07-31 - City hero HERO3f: 16:9 + navy fades from photo edges

### Наблюдения
- Owner: «верни оригинальные пропорции» + «где синий градиент? вижу только чёрный».
- HERO3e ошибочно поставил `md:aspect-[5/4]` (пример из промпта); до этого aspect не было (`md:w-[20%]`), owner ожидает landscape **16:9**.
- Синий пропал: section/underlay `bg/#000`, leftGrad full-bleed с navy-стопом у **правого края секции** (не у фото) + 0–40% solid black → визуально «только чёрный».

### Решения
- Photo: `md:aspect-[16/9]` + `max-w-[min(56%,640px)]` (height-driven, `right-[20%]` сохранён).
- Left fill: `right-[calc(20%+min(56%,640px))]` до края фото; grad `to right #000 → #010d2d → #000c2a` (navy у фото, чёрный только слева).
- Right gutter: soft ~3.5% → `#000c2a` → `#010d2d` → `#000` на краю.
- Section/underlay base снова `#000c2a` (не flat black). Skeleton sync.

### Проблемы
- Owner сказал «давай» - commit + push + MSK deploy выполнен.

### Deploy
- Commits: `092fa703` (HERO3f + exclusive verticals), `b1691614` (handoff); parallel `a50d1657` (.cursorrules).
- SPB build → MSK atomic `.next` **BUILD_ID=`r39aqSMuoLnZ4xDmPwZLc`**. Smoke `/cities/moscow`: `#000c2a` / `16/9` / `right-[20%]` в HTML; related links client-side (SSR карточка автобуса без event href - соседняя речная карточка ожидаема).

---

## 2026-07-31 - Owner: где новые локации в каталоге?

### Наблюдения
- Live MSK web BUILD_ID=`cUv55TBxYLmFcxlC_1Eev` (HERO3c) - не признак hub-gate.
- MSK DB: 6 Perm must-see Venue **есть** (PARK/MONUMENT/…, PUBLISHED|CANDIDATE, migrate 20260731* applied, hookFact ok).
- Live API: `/api/public/venues?city=Пермь` → только 4 event-venues (бары/ДК); must-see **не в listing**. Page `/api/public/venues/{slug}` → `null` (нет address-profile exception / нет content-place gate в **running** dto.js).
- На диске `/opt/daibilet/apps/backend/src/public-venue-hub-gate.js` лежит (11:42), но **live dto.js (09:37) его не импортирует**; `isPublicVenueHub` всё ещё `events<=0 → false`. API process с 09:47.
- cityInfo mustSee: **246** пунктов / **7** со slug (Пермь 6 + Эрмитаж); **239** без entity slug.

### Решения
- Без deploy backend hub-gate (dto + restart) seed Москвы/др. в каталоге не появится - seed MSK bulk **не делали**.
- Добавлен `scripts/seed-cityinfo-must-see-venues.js` (dry-run / `--apply` / `--write-cityinfo`).
- План: 1) deploy+restart API с content-place gate 2) apply seed 3) write cityInfo slugs 4) web rebuild если нужны кликабельные titles.

### Проблемы
- Owner видит gap: «взять из главных мест» сделано частично (Пермь entity+slug в репо), но live listing gate не выкачен → каталог пуст по content places.

---

## 2026-07-31 - City hero HERO3e: aspect photo + right gutter 20%

### Наблюдения
- HERO3d `md:w-[20%] md:right-0` дал тонкую «иголку» flush справа; градиент был наоборот (navy слева, чёрный у фото).

### Решения
- HERO3e: photo `md:right-[20%]` + `h-full w-auto aspect-[5/4] max-w-[min(48%,560px)]` (ширина от высоты, не viewport %).
- Left fill full-bleed under photo: `to right #000 → #000c2a` (navy у левого края фото).
- Right gutter `right:0 w-[20%]`: transparent 3.5% → navy → black.
- Stacking: leftGrad → photo → rightGutter; content z-1 без scrim.

### Проблемы
- Owner ждёт visual на MSK - atomic deploy после commit.
- **Deployed:** commit `1a75ad81` → SPB build → MSK atomic `.next` **BUILD_ID=`wJR6Y559Vh3KmnXskIdsC`**. Smoke moscow chunk: `right-[20%]`, `aspect-[5/4]`, grad `#000→#000c2a`, нет `md:w-[20%]`.

---

## 2026-07-31 - City hero HERO3d: 20% photo, midnight `#000c2a`

### Наблюдения
- Владелец отверг HERO3c golden-ratio (~38.2%): фото должно быть ~20% справа; navy семпла - deep midnight `#000c2a` / `#010d2d`, не teal-ish `#050a12`.

### Решения
- `CITY_NIGHT_HERO`: photo `md:w-[20%]`, left opaque panel `w-[80%]` (`#000c2a → #000`, без soft fade в фото), right `to left: #000 → #000c2a → transparent 3.5%`; mobile denser left fill.
- Layers в `CityPageView` / `SiteChromeSkeleton` / loading: base + photo + leftFill + fadeRight; текст `z-[1]`, без scrim. Owner: выкатывай.

### Проблемы
- Deploy: atomic `.next` swap MSK после commit (см. BUILD_ID в Tasktracker после smoke).

---

## 2026-07-31 - Content places in /venues|/locations hub (0 events)

### Наблюдения
- Owner: mustSee «Главные места» должны линковаться и **появляться в каталогах** `/venues` (institution) / `/locations` (location) по kind.
- Каталог строился через `publicVenueHubRows` → `isPublicVenueHub` с `requireEvents` по умолчанию true: CANDIDATE/PUBLISHED парки/памятники/музеи без сессий отфильтровывались.
- Доп. блокер: `isMeetingPointLikeRow` ловил «памятник» в title даже при CMS kind `MONUMENT`.
- Lean top-500 по `_count.events` мог не подтягивать zero-event content places.

### Решения
- Gate: `public-venue-hub-gate.js` - content kinds (park/monument/outdoor/attraction/museum*/theater) + PUBLISHED|CANDIDATE + minimal profile (title + shortDescription|hookFact|description) → hub без events.
- `isMeetingPointLikeRow`: явный resolved kind ≠ venue/other не считается meeting_point по тексту.
- Lean fetch: union content DB kinds PUBLISHED|CANDIDATE.
- Venue page 0 sessions: allow content-place profile без обязательного address.
- City hub UI: title → `resolveCityPlaceTitleHref` (Link). Explicit slugs: SPB Эрмитаж; Пермь 6; остальные - soft-match по venues города или gap до seed.

### Проблемы
- Soft-match MSK/др. mustSee без entity slug в cityInfo - нужны seed/CMS; gate готов, как только entity появится.

---

### Наблюдения
- Cursor закрыл Location↔Excursion Phase A/B + HERO3c (MSK live `cUv55TBxYLmFcxlC_1Eev`); prod migrate/STOP-контент ещё у Codex/owner.

### Решения
- Handoff: `docs/codex-handoff-2026-07-31-location-excursion.md` (canon STOP/geo, next: migrate + perm seed + editorial STOP).

### Проблемы
- Catalog migrate + SSH finance для Codex по-прежнему внешние блокеры.

---

## 2026-07-31 - Location↔Excursion rename to owner canon

### Наблюдения
- Owner-канон: `EventVenueRouteItem` / `RouteItemRole` / таблица `event_venue_route_items` (не `EventVenueLink`).
- Migrate на prod ещё не применяли - можно переписать migration in place.

### Решения
- Schema: enum `RouteItemRole` (`STOP`, `START`, `NEARBY_HUB`), model `EventVenueRouteItem` `@@map("event_venue_route_items")`, relations `Event.routeItems` / `Venue.routeItems`; `Venue.hookFact` и `Event.venueId` без изменений.
- Migration folder `20260731140000_event_venue_route_items_hook_fact`; dto raw SQL на новую таблицу/enum; seed Перми обновлён под fixture.

### Проблемы
- Prod migrate + контент STOP-пунктов ещё впереди (LE.7).

---

## 2026-07-31 - Location↔Excursion Phase B (API + UI + Perm seed)

### Наблюдения
- Schema Phase A готова (`EventVenueRouteItem`, `Venue.hookFact`); нужны admin write, public DTO и контент Перми.
- `Event.venueId` остаётся только точкой старта; остановки - явные STOP-пункты маршрута.

### Решения
- Admin: `buildAdminEventDetail.venueLinks`, `PUT/PATCH /api/admin/events/:id/venue-links`, форма STOP-рядов в Next admin; `hookFact` в updateAdminVenue.
- Public: `stopEvents` / `nearbyEvents` (geo 300м, подпись «Рядом», не merge), `venueStops` на event page, `stopEventCount` + hook на LocationCard.
- Seed: `scripts/seed-perm-must-see-venues.js` (6 slug Перми); cityInfo perm.mustSee уже со slug.

### Проблемы
- Migrate `20260731140000_event_venue_route_items_hook_fact` на prod до записи route items/hookFact.
- Связки экскурсия↔STOP для Перми ещё не заполнены контентом (только venues seed).

---

## 2026-07-31 - Location↔Excursion Phase A (schema)

### Наблюдения
- Нужна связь many-to-many Event↔Venue для остановок экскурсий (не только `Event.venueId` start).
- На карточках локаций нужен короткий hook-текст (`hookFact`).

### Решения
- Prisma (канон): enum `RouteItemRole` (`STOP`, `START`, `NEARBY_HUB`), model `EventVenueRouteItem` → `event_venue_route_items`, `Venue.hookFact`.
- Migration `20260731140000_event_venue_route_items_hook_fact` (файлы only; migrate на prod не гоняли).
- MVP роль: `STOP`; `START`/`NEARBY_HUB` reserved. `Event.venueId` = старт.

### Проблемы
- Deploy migrate до admin/API wiring Phase B+.

---

## 2026-07-31 - VenueKind PARK + MONUMENT

### Наблюдения
- Owner: добавить типы локаций **парк** и **памятник** в каталог «Важные места»; платный вход в парк (Монрепо) опционален и рано мешать в catalog/finance.
- Канон kinds: Prisma `VenueKind` + public snake_case в `venue-meta` / `dto.js` `resolvePublicVenueKind`. Ранее `парк|сквер` инференсился в `outdoor_location`; «памятник» в тексте - сигнал `meeting_point` (экскурсии).
- `bus` / `museum`/`art_space` показывают паттерн public-only kind без DB; для park/monument нужен CMS store → enum + migrate.

### Решения
- Prisma: `PARK`, `MONUMENT` + migration `20260731130000_venue_kind_park_monument`.
- Public slugs: `park` / `monument`; RU: Парк / Памятник; plurals Парки / Памятники; template `location`.
- Infer: `\bпарк\b|сквер` → `park` (не парковка); `monument` только при явном CMS kind (не авто из «памятник …», чтобы не сломать meeting points).
- Explicit `stored === park|monument` раньше meeting-point heuristics.
- UI: catalog filters, LocationCard gradients, park-like hero, map tip / search `/locations`.
- Park admission / finance projection: **не делаем**; future note в qa.md + Tasktracker VK.6.

### Проблемы
- Deploy migrate на MSK/SPB catalog DB до записи kinds из admin.
- Backfill существующих outdoor park-названий не делали (public infer подхватит `park` по имени даже при stored `OUTDOOR_LOCATION`/`OTHER`/`VENUE`).

---

## 2026-07-31 - City hub «Главные места» → venue/location

### Наблюдения
- Owner: заголовки блока «Главные места» на city hub не кликабельны; chip «Музеи →» ведёт только в категорию.
- Источник: `apps/web/src/lib/cityInfo.ts` (`mustSee` / `sights`); UI `CitySightsSection` в `CityPageView.client.tsx`.
- Prod API Пермь: 6 editorial мест (галерея, Пермяк, набережная, Хохловка, Театр-Театр, Эспланада) **нет** как published/candidate venue/location с совпадающим именем. Есть PERMM (`muzei-sovremennogo-iskusstva-permm`), но его нет в mustSee.

### Решения
- Модель пункта: optional `href` | `venueSlug` | `locationSlug`; резолв `resolveCityPlaceHref` + runtime match по venues города (`resolveCityPlaceTitleHref`, только published/candidate).
- UI: title = `Link` при наличии href; chip категории без изменений. Fallback mustSee из venues получает `href` через `venueHref`.
- Заполнено: СПб «Эрмитаж» → `venueSlug: ermitazh` (prod PUBLISHED `/venues/ermitazh`). Пермь - без битых ссылок до создания entity.

### Проблемы
- Нужны slug/создание сущностей Перми (и большинства mustSee других городов) от владельца каталога.

---

## 2026-07-31 - City admission title + pay CTA host

### Наблюдения
- Owner: блок города «Музеи и входные билеты» спорный (museums+galleries vs museums+exhibitions); seed `shortDescription` светил «STUB checkout».
- CTA «Оформить» должен вести на `pay.daibilet.ru/checkout/admissions/{slug}` (STUB/YooKassa на finance), не на `checkout.daibilet.ru`.

### Решения
- UI: заголовок **«Музеи и арт-галереи»**, subtitle «Входные билеты без сеанса в афише».
- Mapper: `sanitizeAdmissionShortDescription` прячет seed-копирайт со `STUB`; `resolveAdmissionCheckoutUrl` default/rewrite → `https://pay.daibilet.ru` (+ `NEXT_PUBLIC_*` в deploy-prod-next / .env.example).
- Deploy MSK: SPB build → **BUILD_ID=`lGrO-MIR8XMZLXbCJH6fh`**; env MSK уже `FINANCE_*` / `NEXT_PUBLIC_FINANCE_CHECKOUT_BASE_URL=https://pay.daibilet.ru`.
- Smoke: HTML без `checkout.daibilet.ru` / без `STUB`; RSC `canSell=true`, `checkoutPath=/checkout/admissions/phase-g-test-museum-entry`, `shortDescription:null`; city chunk содержит «Музеи и арт-галереи» + bake `pay.daibilet.ru`.

### Проблемы
- Блок admission в HTML появляется после client `contentReady` - raw curl без hydrate не видит «Оформить»/href, только flight payload + JS chunks.

---

## 2026-07-31 - Menu routes: brand loading shells

### Наблюдения
- Home/city shell уже был (`SiteChromeSkeleton` + `app/loading.tsx`); клики по главному меню (События/Города/Площадки/Локации/Подборки/Блог) всё ещё могли давать пустой soft-nav кадр.
- `/blog`: внешний Suspense вокруг `BlogListView` (с `SiteLayout`) при bailout `useSearchParams` в `BlogListHero` подменял весь chrome на bare skeleton.
- На MSK параллельные `web:build` (editors-pick / slot-grid) крутили `.next`; mid-build web падал без `prerender-manifest.json`.

### Решения
- `loading.tsx` → `SiteChromeSkeleton` на `/events`, `/cities`, `/venues`(+`[slug]`), `/locations`(+`[slug]`), `/podborki`(+`[intent]`/`[city]`), `/blog` (плюс уже были `/` и `/cities/[slug]`).
- Blog: убран outer Suspense; `BlogListHero` в своём Suspense под SiteLayout. Podborki: pulse-скелет вместо текста «Загружаем…». Em-dash в aria-label skeleton → дефис.
- Source scp (без CityPageView/EventCard overwrite) + exclusive build; live chunks loading на всех menu routes. Smoke HTML: header+«Дайбилет»+aria-busy, не spacer-only. **BUILD_ID=`HL2bMp0TxgnzWNKKehZgG`** (slot-grid rebuild подхватил shell source). Без commit.

### Проблемы
- Residual `BAILOUT_TO_CLIENT_SIDE_RENDERING` в hidden slot остаётся (как на home) - first paint уже с chrome.
- Параллельные MSK builds без flock продолжают гонять `.next` - нужен deploy lock (PERF.D1 discipline).

---

## 2026-07-31 - City hero thrash: confirmed overwrite, live restored to 1.1

### Наблюдения
- Editorial/slot-grid MSK rebuilds снова крутили .next (web stop mid-flight). Заявленный CMV69QaA_nTH1z_YVhn1m уже не live.
- Паттерн подтверждён: поздние MSK pnpm web:build без git-commit hero-diff откатывают UI, если source на билде старый.

### Решения
- Source CityPageView.client.tsx + city-night-hero.ts (+ SiteChromeSkeleton через CITY_NIGHT_HERO) синхронизированы local = SPB .16 = MSK /opt/daibilet (md5 match).
- Live после concurrent slot-grid build: **BUILD_ID=HL2bMp0TxgnzWNKKehZgG**; chunk page-699de4d723a324bd.js: 1024px*1.1 + object-contain, **zero** 1.2.
- Smoke /cities/saint-petersburg и /cities/moskva = 200 (local+public); nginx cache purged.

### Проблемы
- Commit hero-fix всё ещё не в git - следующий rebuild с чистого git снова может затереть. Нужен commit + scp source перед любым build.

## 2026-07-31 - EventCard slot pills: hanging left (not center)

### Наблюдения
- Owner: висящий 3-й слот и одиночный слот не должны центрироваться в ряду - только в левой колонке, как левый слот пары.

### Решения
- `EventCardSlotChips` (compact): убран `col-span-2 justify-center` для нечётного остатка; сетка `grid-cols-2` заполняется L→R, висящий/одиночный остаётся в левой ячейке. Wide/nowrap не трогали.

### Проблемы
- Нет.

---

## 2026-07-31 - EventCard slot pills: 2-col grid distribution

### Наблюдения
- Owner: пилюли дат («31 июл, 15:00») на карточке при wrap слипались по центру (пара на 1-й строке + одиночный на 2-й).
- Нужно: на строке с 2+ слотами - равные отступы от краёв; одиночный на строке - по центру.

### Решения
- `EventCardSlotChips` (compact): `grid grid-cols-2`; последний нечётный - `col-span-2 justify-center`. Wide/nowrap не трогали.
- Source scp MSK+SPB; rebuild MSK exclusive flock. **BUILD_ID=`HL2bMp0TxgnzWNKKehZgG`**. Editorial/showcase markers сохранены. Без commit.
- **Скорректировано** в записи выше: висящий/одиночный - left column, не center ряда.

### Проблемы
- Риск отката при git-only rebuild без этого diff.

---

## 2026-07-31 - INC.504.4: catalog SWR rebuild off Next event-loop

### Наблюдения
- Recurring hang `daibilet-web`: `Public catalog DTO cache rebuilt (swr): 2619 sessions in ~170s` на том же event-loop, что и request path → 502/slow; orphan `jest-worker` PPID=1 усиливает CPU/RAM pressure.
- SWR уже делал `void schedule*` в окне stale, но (1) hard-expire всё ещё `await` rebuild; (2) background inline rebuild всё равно монополизирует loop; (3) dual cache Next DTO vs API `dto.js`.

### Решения
- `public-catalog.dto.ts`: forever soft-SWR (есть sessions → никогда не await rebuild на request path); disk snapshot `var/cache/public-catalog-dto.json`; mode `child|inline|off` (`DAIBILET_CATALOG_REBUILD_MODE`, web default `child` via `DAIBILET_WEB_PORT` / systemd); cold await cap 8s; chunked map + setImmediate в inline.
- Cron `deploy/cron/daibilet-catalog-dto-cache` (*/4 flock 180s) + `scripts/rebuild-public-catalog-dto-cache.mjs`; post-TC-sync warm тоже пишет disk (не ломая TC sync).
- `dto.js` publicCatalogSessions: soft-expire тоже void schedule (не await hard-expire).
- `scripts/reap-orphan-jest-workers.sh` + cron */10; systemd web `DAIBILET_CATALOG_REBUILD_MODE=child`.
- Next подхватит DTO-фикс после web bake (transpilePackages); до bake: reap orphans + cron disk/reap.
- **MSK live 2026-07-31:** disk snapshot 2622 sessions / 13M; cron catalog-dto + reap-jest; systemd drop-in `DAIBILET_CATALOG_REBUILD_MODE=child`; web bake **BUILD_ID=`GMlh5-uhf-R2iVlZbSFXY`**; smoke `:3001` home warm ~0.07с / events ~0.01с; API forever-SWR via dto.js restart.

### Проблемы
- INC.504.5 (unify dual cache) открыт.
- Child spawn на cold first-hit после purge всё ещё может ждать disk до `PUBLIC_CATALOG_COLD_AWAIT_MS` (8с) - лучше держать cron disk тёплым.

---

## 2026-07-31 - City hero HERO3c: golden-ratio без зеркал

### Наблюдения
- Зеркальные бока (HERO3/3b) усложняли layout и на ultrawide всё равно выглядели как «письмо»; нужен простой CSS-слой по φ.

### Решения
- Убраны `CityHeroMirrorWing` / `sideMirror*` полностью; skeleton sync без mirror placeholders.
- Композиция: base `#050a12` + left fade (`38.2%→61.8%` desktop / сильнее на mobile) + right fade `#010204` + фото справа `w-[38.2%]` (`object-cover`, city focus).
- Copy/CTA в `contentInner` ~`md:max-w-[55%]`; градиенты только в media `z-0` под контентом (не scrim поверх текста).
- Высоты прежние `h-[280|320|360]`. Только local - без commit/deploy.

### Проблемы
- MSK live **BUILD_ID=cUv55TBxYLmFcxlC_1Eev** (SPB build → atomic .next swap). Commits 2ef9c1b2 + 170d747 (strip place-href). Push: нет.

---

## 2026-07-31 - City hero mirror: откат stretch + fix layout

### Наблюдения
- Предыдущий UX.HERO3 растягивал зеркала на весь leftover gutter (`sideGutterWidth`) и клал scrim `z-[2]` поверх заголовка (текст «под фильтром»).

### Решения
- Откат stretch: `sideMirrorWidth` = 10% ширины картинки, крылья flush к `imageFrame`; снаружи - navy CSS gradient секции.
- Fade зеркала через `mask-image` → transparent (без upscale / без paint поверх page).
- Media layer `z-0`, content `z-[1]` - scrim не перекрывает текст.

### Проблемы
- Только local; MSK live ещё на старом stretch-mirror - нужен redeploy после проверки.
- **Superseded** HERO3c (golden-ratio, без зеркал).

---

## 2026-07-31 - City hero ultrawide: mirrored edge wings

### Наблюдения
- На ultrawide боковые поля hero выглядели как hard crop / плоский slate letterbox вокруг PNG ≤110%.
- Lock: main photo не upscale >10% (`calc(1024px*1.1)` + `object-contain`); night navy, не purple.

### Решения
- `CITY_NIGHT_HERO`: navy `#0b1220`, `sideGutterWidth`, fixed `h-[280|320|360]`.
- `CityHeroMirrorWing`: зеркало ~10% края (`width:1000%` + `scaleX(-1)`), stretch в gutter, linear fade в `#0b1220`.
- SSR/skeleton sync: `SiteChromeSkeleton` city + `CityLoadingState` на том же shell.
- Source scp `.16`+`.184`; build SPB → tar `.next` → MSK. Live chunk: `sideGutterWidth` / `scaleX(-1)` / `1000%` / `1024px*1.1` / `object-contain`.
- **BUILD_ID (MSK live)=`lGrO-MIR8XMZLXbCJH6fh`** (после нашего `Sn6QB83fgrq84VIhFOftI` disk перезаписали параллельным rebuild с тем же source-патчем). Smoke `/cities/saint-petersburg` 200. Без commit.

### Проблемы
- Параллельные web rebuild на MSK снова сменили BUILD_ID mid-deploy; фича в live chunk сохранена.
- Commit не делали - риск отката git-only rebuild без scp source.
- **Позже откатили stretch** (см. запись выше / UX.HERO3b).

---

## 2026-07-31 - Event page forever-load / 502 (web hung)

### Наблюдения
- URL `/events/tc-6a3bbc8b78fb6e98b319d8a5-tvoe-daleko-leto-vo-dvore`: public HEAD → **502** (~7с cold), `:3001` connection refused.
- `daibilet-web` в `deactivating` / MemoryHigh 1.4G; nginx `recv() failed` + `Connection refused` upstream.
- Перед падением: `Public catalog DTO cache rebuilt (swr): 2619 sessions in 170385ms`; DB `Connection terminated unexpectedly`; orphan `jest-worker` PPID=1 (~96% CPU ×2) от mid-build.
- Не `no-store`: после подъёма event page `Cache-Control: s-maxage=300`, `x-nextjs-cache` MISS→HIT. Finance на event SSR нет. `public-event-dto-v2` + `revalidate=300` уже на месте.

### Решения
- `systemctl restart daibilet-web` (после mid-restart `.next` без `prerender-manifest` → crash-loop, пока параллельный build не дописал артефакты).
- Reap orphan jest-workers PPID=1 cwd `/opt/daibilet` → RAM available 0.98Gi→5.5Gi.
- Warm URL; `loading.tsx` для `events/[slug]` добавлен в workspace (deploy следующего web build).
- After: `:3001` cold ~0.94с MISS / warm ~0.014с HIT; public warm ~0.06с HIT. BUILD_ID=`CMV69QaA_nTH1z_YVhn1m`.

### Проблемы
- INC.504.4: catalog SWR rebuild 170с на event-loop всё ещё launch-risk.
- Параллельные `next build` на MSK ломают `.next` mid-restart - нужен exclusive lock + reap (PERF.D1).

---

## 2026-07-31 - City night hero: CLS / HTML vs hydrate height mismatch

### Наблюдения
- Owner: стартовый размер hero в HTML не совпадал с гидратированным Next (прыжок / CLS).
- Причины: (1) `min-h-[280/320/360]` рос от контента/шрифтов; (2) `SiteChromeSkeleton` / city `loading` / `CityLoadingState` - короткий `py-10` strip vs night shell; (3) `onError` картинки переключал shell на короткий strip без фото.

### Решения
- Общий `CITY_NIGHT_HERO` (`city-night-hero.ts`): фиксированные `h-[280|320|360]`, imageFrame `1024px*1.1`, `object-contain`.
- `CityPageView`: layout lock через `nightShell = Boolean(heroImage)` (ошибка PNG не схлопывает высоту).
- `SiteChromeSkeleton variant="city"` + `cities/[slug]/loading.tsx` + `CityLoadingState` на том же shell.
- Deploy MSK без commit (SPB build → tar `.next`). **BUILD_ID=`yvt23s2J2qJustslJex5K`**. Local `/cities/saint-petersburg` 200; HTML содержит `h-[280|320|360]` + `1024px*1.1`, без `min-h-[280]`; page chunk `object-contain` + те же классы.

### Проблемы
- Commit не делали - риск отката git-only rebuild на MSK.

---

## 2026-07-31 - Home FCP: blank 2-3s from useSearchParams CSR bailout

### Наблюдения
- Owner: открытие daibilet.ru - пауза 2-3с, потом страница. Curl warm `/`: TTFB ~0.15-0.22с, `x-nextjs-cache: HIT`, `s-maxage=300`, nginx HIT - не cold SSR и не nginx wait.
- HTML ~508KB, но в `<body>` только `BAILOUT_TO_CLIENT_SIDE_RENDERING` + пустой `site-header-spacer`. Контент в RSC scripts; first paint ждал JS (CSR bailout из `useSearchParams` в `SelectedCityProvider`/`SiteHeader` внутри `SiteLayout` Suspense).
- ISR на `/` уже был; псевдо-HTML = paintable chrome до hydrate, не отдельный static index вне Next.

### Решения
- `CitySearchParamsBridge` + inner Suspense в `SelectedCityProvider`; убрать `useSearchParams` из `SiteHeader`/`NavigationProgress`.
- `SiteChromeSkeleton` (бренд «Дайбилет» + pulse) как fallback `SiteLayout` Suspense; `app/loading.tsx` + `cities/[slug]/loading.tsx`.
- Deploy MSK: source scp + rebuild (конкурирующие `next build` убивали процесс / ломали `.next`; web кратков временно из-за missing `prerender-manifest.json`, восстановлен).
- After: body сразу `<header>` + logo + skeleton (`aria-busy`); warm TTFB ~0.17-0.22с HIT `s-maxage=300`. BUILD на диске после восстановления `ysb9LiafxuxE8ptQkYg6t`.

### Проблемы
- Полный SSR main всё ещё за Suspense/`$?` (скелет → контент после JS/stream); 1 residual BAILOUT в hidden slot. Долгосрочно: route-group layout с SiteLayout вне page.
- Commit не делали - риск отката при следующем git-only rebuild.
- На MSK параллельные агенты `next build` (PPID=1 workers) - нужен lock/reap (PERF.D1).

---

## 2026-07-31 - City hub top-query counts ≠ city landing

### Наблюдения
- Баг: хаб Самары «Топ-запросы» показывал standup **4**, family **6→5**, concerts **17**, а city-URL лендинга отдавал другие цифры (часто **1 / 4 / 0**).
- Root cause: `buildPublicLandingPage*` сначала брал национальный match, потом `slice(0, 48)`, а `finalizeLandingPayload` фильтровал по городу уже урезанный список. Региональные офферы вне national top-48 пропадали из stats/grid.
- Карточки хаба / `landings-catalog?city=` считали по полному city-scoped rematch - источник правды для count.

### Решения
- Helper `selectLandingPageSessions` (`public-landing-page-sessions.ts`): **city-scope → затем SSR cap 48**; `stats.events` / `landing.events` = uncapped `matchCount`.
- API/DTO/`?city=` на `/api/public/landings/:slug`; SSR `fetchLandingPageDto(slug, citySlug)`; client fetch с `?city=`.
- `finalizeLandingPayload` сохраняет uncapped API stats, если фильтр не отбросил строки.
- Unit: `select-landing-page-sessions.test.ts`. Deploy MSK: api restart + web **BUILD_ID=`ysb9LiafxuxE8ptQkYg6t`**. Без commit.

### Проблемы
- Smoke Самара after: hub/catalog/API/HTML standup **4**, family **5**, concerts **17** (совпадают). Pre-fix landing filter from national top-48: ~1 / ~4 / **0**.

---

## 2026-07-31 - City hub hero: restore + harden 110% ultrawide cap

### Наблюдения
- Owner: фото города на ultrawide снова увеличивалось сильнее +10%.
- Live MSK chunk (`BUILD vo1CLfHKIo9X2CDMkkHPA`, podborki deploy) содержал `1024px*1.2` + `object-cover` - предыдущий фикс `7uLbKp6GCdnYtn2PkrTGx` (`1.1`) был перезаписан поздним rebuild с устаревшим source на `.184`.
- На SPB `.16` source уже был `1.1`, на MSK source оставался `1.2`. Дополнительно `object-cover` + `fill`/`h-full` мог апскейлить кадр по высоте hero выше 110% intrinsic.

### Решения
- `CityPageView.client.tsx`: `w/max-w = min(100%, calc(1024px*1.1))` (без `w-full` сверх cap), `object-contain object-center`, sizes `1126px`, letterbox-градиенты сохранены.
- Source scp на `.16` + `.184`; build SPB → tar `.next` → MSK; nginx purge; restart `daibilet-web`.
- **BUILD_ID=`ikMw9FRXSb-HNgZKjaLxM`**. Smoke `/cities/saint-petersburg` 200; live chunk `page-cde89f…` содержит `1024px*1.1` + `object-contain` (нет `1.2`).

### Проблемы
- Commit не делали. Риск: следующий MSK rebuild из git без этого diff снова откатит - нужен commit или дисциплина scp source перед build.

---

## 2026-07-31 - Finance sprint lock + YooKassa secret on `.159`

### Наблюдения
- Owner вставил ответы Codex: границы, webhook URL, verify/reconcile, dual-run STUB, ledger MVP, m2m Bearer, return URL, week plan W1-4.
- Локальный файл `F:\coding\daibilet-repo\.env` отсутствовал; источник - `.env.txt` (SHOP_ID=1424801; SECRET_KEY meta present). Значение секрета не логировали.
- На `.159` до merge уже были строки YooKassa; Cursor сделал безопасный scp+python merge, `chmod 600`, restart `daibilet-finance-api`, health 200.
- Egress smoke: `api.yookassa.ru` и `github.com` → HTTP 000, curl exit 28 (Resolving timed out); `nslookup` к `127.0.0.53` - communications error. Health localhost 200.
- `DAIBILET_YOOKASSA_CHECKOUT` оставлен `0`; `VERIFY_WEBHOOK=0`; STUB=1. Create-payment smoke не запускали.
- Codex SSH на `.159` не авторизуется - нужен ключ `daibilet_spb_finance` / pubkey от owner.

### Решения
- Канон зафиксирован в `catalog-finance-projection.md` §11-12, `qa.md`, `Tasktracker` FIN.LC*/W1-4, MIG.9.5.
- Webhook: `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook`; pay = user surface; dual-webhook skip если не было live payments.
- Wide catalog CTA out. TC/TEP secrets off finance.
- Owner blocker: Diligent Polydeuces outbound **443 + DNS**. После green - flip CHECKOUT=1 и Week 1 create-payment.

### Проблемы
- Egress/DNS с `.159` мёртв - Week 1 blocked несмотря на `SECRET_KEY=<set>`.
- Локальный путь owner назвал `.env`, фактически `.env.txt` - сверить кабинет ЮKassa (sandbox vs live prefix) без paste в чат.

---



## 2026-07-31 - INC.504.12: MSK Next hang / nginx 504 (MemoryMax + warm-hub pile-up)

### Наблюдения
- После SIGKILL restart сайт снова 200. До этого: hung Next (`daibilet-web`), cgroup **MemoryMax ~1.3G / available 0B**, RSS ~1.2G; pile-up `warm-hub-pages.mjs` (cron `*/3` без flock); venue SSR тормозил на finance fetch.
- Хост MSK `.184`: **7.8Gi RAM**, swap 0. Старые лимиты (High 1100M / Max 1400M / heap 896) были узки для catalog SWR + SSR.

### Решения
- systemd drop-in `daibilet-web.service.d/memory.conf`: **MemoryHigh=1500M**, **MemoryMax=2G**, heap **1280**, **MemoryAccounting=yes**, **OOMPolicy=continue** (не OOM-kill весь box; unit уже `Restart=always`). Watchdog не ставили (Next без sd_notify).
- `/etc/cron.d/daibilet-warm-hubs`: **flock -n** `/var/lock/daibilet-warm-hubs.lock` + **timeout 90s** (--kill-after 15s). Скрипт: per-fetch AbortSignal 15s + total deadline 75s. Застрявших процессов на момент фикса не было; smoke warm 12/12 ok.
- Finance projection: в live chunk было `AbortSignal.timeout(3e3)`; **hot-patch 2500** в `.next/server/chunks/1876.js` + source ts на диске. Полный web rebuild всё ещё желателен, чтобы не потерять патч при следующем деплое из старого артефакта.
- `.16` не трогали. Commit не делали. Backup: `/root/daibilet-harden-backup-20260731T082459Z`.

### Проблемы
- Cold venue сразу после restart мог упереться в таймаут curl 20s (после прогрева `/venues/phase-g-test-museum` -> 200 ~0.08s). Постоянные Memory: **High 1.5G / Max 2G / heap 1280** при 7.8Gi host.


## 2026-07-31 - Landing matcher: city is filter, not match

### Наблюдения
- Follow-up после moscow-museums: в `explainLandingRuleMatch` финальный `matches` всё ещё был `… || rule.city` - любой city-scoped rule без blockers и без requiredAny* заливал весь городской inventory.
- Рискованные правила с `city` и слабым/отсутствующим positive signal: **spb-yards** (только `requiredAnySubcategories` в fast-path, без requiredAnyKeywords/groups) и исторически **moscow-museums** (уже заткнут per-rule). Остальные city-rules уже с required*: bridges-night, moscow-dinner-boat, country-tours.

### Решения
- Global fix в `landing-rules.ts`: city только сужает (wrong city → blocker); sufficient positive = tags/keywords/required*/venue. `rule.city` убран из финального OR.
- Unit test `city alone is never a sufficient landing match` для museums/yards/dinner/country/bridges.
- MSK: `scp landing-rules.ts` + `systemctl restart daibilet-api`. Web rebuild не нужен.
- Smoke API: moscow-museums **61** (standup 0), bus-tours **48**, country-tours **5**, standup **530**, spb-yards **9**, bridges-night **10**, moscow-dinner-boat **11**, river **136**, rooftops **6**.

### Проблемы
- Нет: per-rule museum one-off не плодили. Commit по запросу.

## 2026-07-31 - moscow-museums: standup leak

### Наблюдения
- На `/moscow/moscow-museums` и `GET /api/public/landings/moscow-museums` в выдаче были стендап-шоу (Comedy Hub, «Стендап по-Женски», Гиновян и т.п.).
- Root cause: в `explainLandingRuleMatch` при отсутствии blockers финальный `matches` = true из‑за `rule.city` даже без тегов/keywords. У `moscow-museums` был `city: Москва`, но не было `requiredAnyKeywords` → весь московский inventory (~699).
- Теги `Искусство`/`Творчество` в rule.tags расширяли fast-path без музейного сигнала.

### Решения
- `landing-rules.ts`: `requiredAnyKeywords` (музе/выставк/мастер-класс/галере/экспозиц/эмаль); tags сужены до Музеи/Мастер-класс(ы)/Выставки; `excludeTags` Юмор/Stand up/Комедия/…; `excludeKeywords` стендап/comedy/open mic/юмор/…
- MSK: `scp landing-rules.ts` + `systemctl restart daibilet-api`. Web rebuild не нужен (листинг с API).
- Smoke API: events **699→61**, standup в sessions **5→0**; все 48 page sessions museum-ish. Commit не делали.

### Проблемы
- HubTags/destinations в HTML ещё могут показывать старый count `moscow-museums` (~683) до SWR catalog refresh - на карточки листинга не влияет.

## 2026-07-31 - Erarta art_space override (crumbs)

### Наблюдения
- Title «Музей современного искусства Эрарта» ловил ветку museum в `classifyMuseumOrArtSpace` (есть «Музей»).
- Hot `dto.js` чинил только `daibilet-api`; Next бандлит classifier в `.next/server/chunks` - web API/HTML оставались museum до патча чанков + purge ISR.

### Решения
- Source: override `эрарта|erarta|ven_spbboats_erarta` + `музей современного искусства` → `art_space` (web `venue-meta.ts` + backend `dto.js`, id/slug в finalize).
- MSK: hot `dto.js` + restart api; hot patch chunks `1592/279/8700`; rm prerender erarta/ermitazh + `revalidateTag(venue-page)` + restart web.
- Smoke: erarta crumbs `Арт-пространства` / `?type=art_space`; ermitazh `Музеи` / `museum`; pages 200. Full web rebuild не делали (SPB build host отдельно). Finance не трогали.

### Проблемы
- ISR HIT держал старые HTML до явного удаления `.next/server/app/venues/{erarta,ermitazh}.*`.

## 2026-07-31 - Landing match widen (owner product lock)

### Наблюдения
- Owner lock: сначала **расширить matching** существующих landings (bus/country/rooftops), hand-smoke; **не** плодить лендинги под один музей/франшизу (Гарри Поттер, Матрёшка и т.п.); **besplatno/бесплатно** не строить; landings = **top search queries**, не inventory dump; city-scoped top-query (стендап в Казани и т.п.) - постепенно после match-fix.
- Prod: `bus-tours` ~17 vs тысячи с автобусными тегами; `country-tours` (СПб) ~5 vs ~1.5k title-хитов по пригородам; `rooftops` был SPb-only в `LANDING_ALLOWED_CITY_SLUGS`, хотя rule уже national (Москва смотровые).

### Решения
- `landing-rules.ts` (SoT; dto импортирует):
  - **bus-tours:** убран `requiredTitleKeywordGroups`; fast path по subcategory/tag + venue hop-on; группы автобусный+экскурсионный в content; exclude трансфер/аэропорт/такси.
  - **country-tours:** топонимы (Гатчина, Царское, Ораниенбаум, Ломоносов, Стрельна, Репино, …); экскурсионный сигнал `экскурс|тур|выезд|маршрут`; exclude концерт/спектакль/стендап.
  - **rooftops:** display «Смотровые площадки и крыши»; keywords Москва-Сити; subcategory fast path; exclude автобусные панорамы.
  - **walking-tours:** лёгкий widen (subcategory/tags + пешая/авторск).
- Front: снят SPb-only lock `rooftops` из `LANDING_ALLOWED_CITY_SLUGS`; SEO label «Смотровые площадки».
- Стратегия зафиксирована: top-query landings; no single-museum; no бесплатно; next = city-scoped top queries после smoke.

### Проблемы
- Matching live на MSK: `scp landing-rules.ts` + `dto.js` + restart `daibilet-api`.
- Live counts после fix (API `:4000`): bus **17→48**, country **5→5** (в public catalog мало sellable загородных СПб; «~1.5k» было raw title inventory), rooftops **6** (title «Смотровые…»; уже Мск+СПб+Красноярск), walking **46→68** (снят скрытый cap `slice(0,48)` со stats).
- City-URL `/progulki-po-krysham/moscow` - после web rebuild (`landing-routes` unlock). National matching уже API.
- Commit не делали (по запросу).

---

## 2026-07-31 - City hub hero: ultrawide upscale 20% → 10%

### Наблюдения
- City PNG ~1024px на ultrawide при `max-w calc(1024px*1.2)` (+20%) выглядел слишком мыльным.

### Решения
- `CityPageView.client.tsx`: cap `1024px*1.1` (+10%); side fill slate gradient без изменений.
- Build SPB `.16` → MSK `.184` **BUILD_ID=`7uLbKp6GCdnYtn2PkrTGx`**; nginx purge + restart `daibilet-web`.
- Smoke `/cities/saint-petersburg` и `/cities/moskva` = 200; chunk содержит `1024px*1.1`.

### Проблемы
- Нет. Commit не делали (по запросу).

---

## 2026-07-31 - /podborki: federal landings stay visible for city filter

### Наблюдения
- Strict `landingMatchesBoundCity` на `/podborki` скрывал MULTI_CITY/national (речные, автобусные, стендап…) при городе в шапке → пустой empty для Казани и др.
- City-scoped URL уже есть (`/avtobusnye-ekskursii/moscow`); `finalizeLandingPayload` фильтрует сессии по path-city; SelectedCityProvider уже умел менять город на MULTI_CITY path.

### Решения
- Каталог: refetch `/api/public/landings-catalog?city=` + `mergePodborkiCityCatalogItems` (city-bound ∪ national с ≥1 event в городе).
- Helpers: `landingMatchesCatalogCity`, `mergePodborkiCityCatalogItems`; тесты в `landing-bound-city.test.ts`.
- Карточки: href → city-scoped; бейдж города на national при фильтре.
- SelectedCityProvider: national MULTI_CITY без сегмента города → `replace` на `/{slug}/{city}` из storage (как `?city=` на каталогах).
- Empty только если нет city-bound и нет national с матчами по городу.

### Проблемы
- Deploy MSK: build на `.184` → **BUILD_ID=`vo1CLfHKIo9X2CDMkkHPA`**; smoke `/podborki` 200; `landings-catalog?city=moscow|Москва|kazan` непустой. Без commit.
- Сопутствующий фикс: `scopePublicCatalogSessions` нормализует SEO slug (`moscow`↔`moskva`).

---

## 2026-07-31 - /podborki: city badge + strict header-city filter

### Наблюдения
- Подборки с `rule.city` / CITY path (`moscow-museums`, `spb-yards`, …) на карточках не отличались от федеральных.
- `?city=` на `/podborki` раньше пересчитывал лендинги по событиям города (включая MULTI_CITY); owner: при городе в шапке - только имеющиеся по нему city-bound.
- `/podborki` не был в `CITY_FILTER_PATHS` - хедер не синкал URL.

### Решения
- Бейдж города на `LandingDirectionCard` (+ featured/trending) через `resolveLandingBoundCitySlug`.
- Strict filter: выбранный город → только city-scoped / single-city allowlist; национальные скрыты.
- Empty: «Пока готовых подборок по выбранному городу еще нет» + лёгкий hint с дефисом.
- `/podborki` в `CITY_FILTER_PATHS` + `SelectedCityProvider` sync как у `/events`.

### Проблемы
- Для Казани и большинства городов список может быть пустым до появления city-bound посадок - ожидаемо при strict.
- Deploy MSK: build SPB `.16` → scp `.next` → **BUILD_ID=`wxRQ2b31UHjLd4G3Fu_PY`**; smoke `/podborki` 200.

---

## 2026-07-31 - SPBBOATS seed: Эрмитаж + Эрарта на MSK catalog

### Наблюдения
- SoT legacy: `F:\coding\SPBBOATS\packages\backend\prisma\seed-venues.ts` (не `D:\coding\…`).
- В SPb-блоке сида явная арт-площадка: `erarta` (`venueType: ART_SPACE`). Других `GALLERY` в СПб нет.
- В MSK PG уже был TC-venue `gosudarstvennyi-ermitazh-*` kind=`CONCERT_HALL` CANDIDATE + 34 Event - не трогали.
- City SoT slug на MSK: `санкт-петербург` (`city_498817`); latin `sankt-peterburg` в таблице отсутствует.

### Решения
- Upsert catalog venues: `ermitazh` / `erarta`, ids `ven_spbboats_ermitazh` / `ven_spbboats_erarta`, kind `MUSEUM_ART_SPACE`, `PUBLISHED`, `isIndexable=true`.
- Скрипт: `scripts/ensure-spb-hermitage-erarta-venues.js` (паттерн CF.P2e).
- Finance / AdmissionProduct / YooKassa: не сидили (контент-сид). `phase-g-test-museum` не меняли.
- Smoke: API+public HTML 200 на `/venues/ermitazh` и `/venues/erarta`.

### Проблемы
- `heroImageUrl` пустой (как в SPBBOATS seed `imageUrl: null`) - не битый URL; cover backfill через `ensure-catalog-covers` позже по желанию.
- Public crumbs для Эрарты = «Музеи» (в title есть «Музей»), хотя legacy type = ART_SPACE.

---

## 2026-07-31 - Venue page slow: no-store SSR + admission-only client refetch

### Наблюдения
- Report: `/venues/phase-g-test-museum` again slow. Warm before fix: Windows TTFB ~0.17-0.32с, MSK local `:3001` ~0.03с, finance HTTPS ~0.10-0.15с (`FINANCE_API_BASE_URL=https://…` already OK; AbortSignal timeout 3s already).
- Root: venue/location HTML был `Cache-Control: private, no-store` (Prisma DTO без `unstable_cache`) vs city hubs ISR `s-maxage`. Каждый hit = full SSR; cold catalog rebuild в том же Next-процессе ~11-23с → выбросы TTFB.
- Доп.: `VenuePageView` client refetch `/api/public/venues/:slug` когда `sessions.length===0` (admission-only) - лишний cold DTO после paint (nginx: page 06:15:25 → API 06:15:31).
- Memory: next-server ~830-940MB / MemoryMax 1.3G; catalog SWR каждые ~3мин.

### Решения
- `getCachedPublicVenueDto` (`unstable_cache` tag `venue-page`, revalidate 300) + пустой `generateStaticParams` → route `●` ISR.
- Venue SSR: `Promise.allSettled` DTO∥finance + hard timeout admission 2.5s (fail-soft); finance fetch timeout 2.5s.
- Client: skip refetch if `initialPayload?.venue` (в т.ч. 0 sessions).
- Deploy: build SPB `.16` → MSK **BUILD_ID=`wltP0t9QlQrxpn1a72LW0`**.
- After: headers `s-maxage=60` (лимит от finance `revalidate:60`) + `x-nextjs-prerender:1`. Cold first Windows TTFB ~15.2с (ISR fill); warm Windows ~0.16-0.19с; MSK public ~0.05-0.07с; local ~5-27ms. Admission slug в HTML есть.

### Проблемы
- Первый hit после deploy/expire всё ещё может быть 10-20с (cold catalog в web-процессе) - owner: вынести catalog rebuild из request path / shared cache с `daibilet-api`, не держать 2.7k sessions rebuild на critical path venue HTML.
- `s-maxage=60` вместо 300 из-за finance fetch revalidate - можно поднять finance `next.revalidate` до 300 если admission TTL ок.

---

## 2026-07-31 - Soft-nav click lag (2-3с без transition)

### Наблюдения
- Owner: клик по Link - 2-3с «тишины» до смены экрана; отдельно от cold `/venues/phase-g-test-museum`.
- Curl prod: warm HTML/RSC TTFB обычно ~0.15-0.4с (`/`, `/cities/moskva`, `/events`, `/blog`). Venue HTML cold был ~5с, warm ~0.18с (finance timeout 2.5с уже fail-soft).
- Prefetch dynamic/no-store: `Next-Router-Prefetch: 1` на blog slug → stub ~225B; полный flight только по клику (~100KB+).
- `prefetch={false}` в коде нет. Sticky city-hub scroll lock 1.2с - только hash-tabs, не глобальные Link.
- Нет pending UI: App Router держит старый экран до RSC; root `loading.tsx` нельзя - `SiteLayout` внутри page, skeleton снял бы header.
- `SiteLayout` на каждом page RSC звал сырой `buildPublicDestinationsDto()` (есть `getCachedDestinations`, но layout его не использовал).

### Решения
- `SiteLayout` → `getCachedDestinations()` (Next Data Cache).
- `NavigationProgress`: top bar + `cursor: progress` сразу на same-origin `<a>` click.
- `experimental.staleTimes` dynamic 30s / static 180s - меньше повторных flight на revisit.
- SEO: SSR HTML/metadata без изменений.

### Проблемы
- Долгосрочно: вынести `SiteLayout` в shared route-group layout, тогда segment `loading.tsx` сможет менять только `<main>`.
- Cold venue / finance - зона другого агента; не дублировать deploy поверх их BUILD_ID без merge.
- **Deploy MSK:** SPB build → scp `.next` → initially `BUILD_ID=Cm6zKdDCV2gLnM4H88VZt`; source patches на диске. Позже другой агент пересобрал → `wxRQ2b31UHjLd4G3Fu_PY`, но `NavigationProgress` / `nav-progress-bar` / `getCachedDestinations` остались в бандле (layout chunk + CSS). Local `:3001` home/events/city 200 warm; venue cold ещё ~7с (не этот фикс).

---

## 2026-07-31 - Venue breadcrumbs IA: admin centers + museum/art_space split

### Наблюдения
- Owner lock: регион в крошках только для не-адм. центров; Москва/СПб уже major; расширить на все адм. центры (Тула и т.п.).
- В `City` нет `isAdminCenter` - ориентир `REGION_HUBS` (столица субъекта) + match city к центру `regionSlug`/`regionTitle`.
- Prisma `VenueKind` один: `MUSEUM_ART_SPACE`. Полный enum-split = миграции на MSK/SPB; для crumbs+`?type=` достаточно public kind.
- Каталог `/venues` синхронизировал `city` в URL, но `type` жил только в React state - клик по type-крошке не работал.

### Решения
- `isAdminCenterVenueBreadcrumbCity` + `resolveVenueBreadcrumbRegion`: адм. центры без сегмента области; мелкие города с `regionSlug` - `Главная → Область → Город → Тип → Title`.
- Public split: `museum` / `art_space` через `classifyMuseumOrArtSpace` (web + dto.js). DB остаётся `MUSEUM_ART_SPACE`. TODO: Prisma `MUSEUM`/`ART_SPACE` + one-time backfill.
- Примеры: Третьяковка → Музеи; Галерея Ильи Глазунова / Люмьер → Арт-пространства.
- Type-крошка: `/venues?type=museum&city=…` / `/venues?type=art_space&city=…` (locations аналогично). URL sync `type` в Venues/LocationsCatalogView.
- Plurals: museum→Музеи, art_space→Арт-пространства.
- Тесты: cityRegionHub.breadcrumb, venue-meta.museum-art, seo-internal-links (21 pass).

### Проблемы
- Без Prisma migrate классификация по title - временный слой (явный TODO), не «навсегда-эвристика» как единственный источник истины.
- Deploy MSK 2026-07-31: build SPB `.16` → tar `.next` → MSK `.184` **BUILD_ID=`wsO4c6SUFXGLWeK2ojk2V`** + hot `dto.js` + restart api/web. Smoke: Glazunov crumbs `Главная → Москва → Арт-пространства` + `/venues?type=art_space&city=Москва`; API `?type=museum|art_space` OK. Finance `.159` не трогали.

---


### Наблюдения
- Catalog API :4000 для phase-g-test-museum уже 200 (dto gate), но Next SSR/HTML был на старом BUILD_ID=cr6GiiddmDKWVErJYCLNj → public /venues/phase-g-test-museum 404.
- NEXT_PUBLIC_FINANCE_CHECKOUT_BASE_URL на MSK отсутствовал; client resolve падал на default checkout.daibilet.ru (и без static inline process.env.NEXT_PUBLIC_*).
- Admission-only institution: contentReady инициализировался только от sessions.length → SSR не рендерил layout/CTA при нуле сессий.

### Решения
- MSK .env: FINANCE_API_BASE_URL=https://finance-api.daibilet.ru, FINANCE_CHECKOUT_BASE_URL=https://pay.daibilet.ru, NEXT_PUBLIC_FINANCE_CHECKOUT_BASE_URL=https://pay.daibilet.ru.
- Build на SPB .16 с dto gate + finance-projection default/inline pay.daibilet.ru + fix VenuePageView contentReady → Boolean(initialPayload?.venue).
- Deploy: tar .next → MSK /opt/daibilet/apps/web/.next, nginx cache purge, restart daibilet-web. **MSK BUILD_ID=IMlQ1owRKXfLEBRmnSN_T**.
- Smoke: /venues/phase-g-test-museum 200, enue-admission + CTA https://pay.daibilet.ru/checkout/admissions/phase-g-test-museum-entry; city moskva 200 с canSell в projection payload.

### Проблемы
- City hub SSR HTML может не содержать data-block=city-admission (client/editorial path), но canSell и product slug в payload есть. Finance .159 / YooKassa не трогали.## 2026-07-31 - Finance .159: Codex supplier+YooKassa smoke handoff

### Наблюдения
- Deploy на SPB finance `.159` (`/opt/daibilet-finance/app`): ветка `codex/phase2-finance-supplier`.
- Remote tip был `0c1e464`; коммит `147eb436` (supplier YooKassa smoke + onboarding writes) не был на origin tip. На сервер залиты patches `0c1e464..147eb436` (offline: у finance нет egress в интернет / GitHub).
- Deployed SHA на сервере: `c105264` (содержание = серия до `147eb436`; hash другой из-за committer при `git am`).
- `pnpm db:generate` OK; `db:deploy` OK (pending=0) с `DATABASE_URL` из `.env`.
- Seed `backend:checkout:seed-stub-admission -- --reset-capacity` OK (`phase-g-test-museum`).
- Backend typecheck + `supplier:build` OK; nginx reload; API health 200.
- STUB smoke OK: login supplier-test@daibilet.ru; admissions list; POST stub-purchase -> 201 CONFIRMED; public `/api/checkout/stub` -> 201.
- YooKassa smoke не выполнен: `YOOKASSA_SECRET_KEY` отсутствует в `.env`; `DAIBILET_YOOKASSA_CHECKOUT` оставлен `0`. Endpoint отвечает `YOOKASSA_CHECKOUT_DISABLED` (ожидаемо).
- Egress finance `.159`: DNS/TCP наружу FAIL (api.yookassa.ru resolve timeout; 8.8.8.8:53 timeout; 1.1.1.1:443 timeout). Catalog `.184` не трогали.

### Решения
- Env на finance API: `DAIBILET_STUB_CHECKOUT=1`, `DAIBILET_YOOKASSA_CHECKOUT=0`, `DAIBILET_YOOKASSA_VERIFY_WEBHOOK=0`, `YOOKASSA_SHOP_ID=1424801`, `YOOKASSA_RETURN_BASE_URL=https://supplier.daibilet.ru`; добавлен `USER_JWT_SECRET` (был пуст - login 503).
- `pnpm-lock.yaml` откатан к `0c1e464` на сервере (offline-compatible; без registry).
- Catalog MSK / TC/TEP / wide CTA / YooKassa на `.184` - без изменений.

### Проблемы
- Owner: Timeweb SG Diligent Polydeuces / finance `.159` - outbound TCP 443 -> 0.0.0.0/0 (или YooKassa) + DNS; иначе sandbox YooKassa и git fetch невозможны.
- Owner: вставить sandbox `YOOKASSA_SECRET_KEY` (test_...) в `/opt/daibilet-finance/app/.env`, затем `DAIBILET_YOOKASSA_CHECKOUT=1`, restart API, smoke yookassa-purchase + при необходимости `pnpm backend:checkout:yookassa:reconcile -- --apply --grace-minutes=0`.

---

## 2026-07-31 - MSK→finance PASS + CF.P2e slug bridge

### Наблюдения
- Owner открыл Timeweb SG **Fair Snipe**: MSK `.184` egress TCP `80`/`443` → finance `.159`. Ранее self-loop был у **Daring Aquila**.
- С MSK: TCP `:443` OK; `https://finance-api.daibilet.ru/api/health` → 200 (~0.1–0.3с); DNS OK.
- `curl https://github.com` с MSK → **200** - egress шире, чем только `.159` (INC.504.1 частично закрыт; полный outbound audit ещё не делали).
- Было: `FINANCE_API_BASE_URL=http://85.193.80.159` + `FINANCE_API_HOST=finance-api.daibilet.ru` → HTTP Host даёт 301 HTTPS. Стало: `FINANCE_API_BASE_URL=https://finance-api.daibilet.ru`; `FINANCE_API_HOST` закомментирован (не нужен при hostname URL); `FINANCE_CHECKOUT_BASE_URL=https://pay.daibilet.ru`; `daibilet-web`/`daibilet-api` restarted.
- CF.P2e: в MSK PG не было `Venue.slug=phase-g-test-museum`. Seed: id `ven_phase_g_test_museum_catalog`, city `city_524901`/`moskva`, kind `MUSEUM_ART_SPACE`, `pageStatus=PUBLISHED`, `isIndexable=false`. Скрипт: `scripts/ensure-phase-g-test-museum-venue.js`.
- Gate `buildPublicVenuePage`: institution без sessions раньше → null. Hotfix `dto.js` на MSK + в repo: PUBLISHED institution с address+description допускается (admission-only). API `:4000` → venue OK. Next `.next` bundle ещё со старым gate → `/venues/phase-g-test-museum` 404 до web rebuild.
- Smoke city hub `/cities/moskva` (Next `:3001` + public HTTPS): после `revalidate` в RSC есть `phase-g-test-museum-entry`, `checkoutPath`, `canSell`, «Тестовый музей» - finance fetch **не timeout**, projection non-empty. UI-блок `city-admission` за `contentReady` (клиент). Stale Full Route / nginx cache без revalidate может отдавать старый HTML без admission.

### Решения
- Step 1 network (MSK→finance) **closed**.
- Env hygiene HTTPS на catalog; deploy-prod-next defaults обновлены на `https://finance-api.daibilet.ru` / `https://pay.daibilet.ru`.
- CF.P2e DB seed done; venue HTML CTA после следующего web deploy с dto gate.

### Проблемы
- Next venue page ждёт rebuild (бандл не подхватывает live `dto.js`).
- CTA URL на клиенте: `resolveAdmissionCheckoutUrl` читает `FINANCE_CHECKOUT_BASE_URL` (не `NEXT_PUBLIC_*`) - в browser может падать на default `checkout.daibilet.ru` (STUB smoke follow-up).
- YooKassa secrets по-прежнему owner-only.

---

## 2026-07-31 - MSK Timeweb SG: egress self-loop (Daring Aquila)

### Наблюдения
- MSK→finance `.159` всё ещё **FAIL** (TCP/DNS timeout).
- В панели Timeweb SG **«Daring Aquila»** = MSK catalog `.184` (имя панели; в каноне хост - Friendly Pheasant).
- Outbound destination только `201.24.125.184` (self-loop); DNS `:53` тоже на self.

### Решения
- Нужный egress: TCP `80`/`443` → `85.193.80.159`; DNS `:53` → `0.0.0.0/0`. UFW на finance `.159` OK.
- Правка SG - **owner action pending**.
- **Update later 2026-07-31:** owner открыл **Fair Snipe** egress → `.159`; см. запись «MSK→finance PASS» выше. Daring Aquila self-loop - historical.

### Проблемы
- Catalog projection к finance live не заработает, пока Aquila egress не откроют. *(superseded: Fair Snipe PASS)*

---

## 2026-07-30 - Owner minimum locked (agents closed DNS/TLS)

### Наблюдения
- Агенты закрыли что могли без секретов и без destroy: DNS A + TLS SAN для `pay` / `supplier` / `finance-api` → `.159` ✅; apex `daibilet.ru` → MSK `.184` ✅.
- Канон buyer checkout = **`pay.daibilet.ru`** (не `checkout.`); API Host = **`finance-api.daibilet.ru`** (не `finance.`).
- Owner minimum остаётся: Timeweb allow **MSK→`.159`** (TCP timeout), YooKassa sandbox secrets, webhook decision/register.
- Старый СПб `.16` нужен только как **build/reserve** до MIG.9.4/.9.6, затем retire (MIG.9.7). Не apex.
- Catalog venue `phase-g-test-museum` на MSK PG отсутствует; готового seed-скрипта нет → live seed = SSH+DB write = **agent-next**, не трогать MSK из docs-pass.

### Решения
- Docs sync: Tasktracker MIG.9.0 DNS/TLS ✅; MIG.9.5–9.7 **не** done; [migration-spb-to-msk.md](./migration-spb-to-msk.md) current apex → `.184`; projection/qa/spb-finance-host выровнены на pay/finance-api.
- CF.P2e = agent-next slug bridge; без invent secrets и без server destroy.

### Проблемы
- MSK→`.159` сеть и YooKassa credentials - только owner.
- Default в коде `resolveAdmissionCheckoutUrl` ещё `checkout.daibilet.ru` - на prod задавать `FINANCE_CHECKOUT_BASE_URL=https://pay.daibilet.ru`.

---

## 2026-07-30 - CF.P2 deploy follow-up: MSK↛finance TCP

### Наблюдения
- [Implement catalog finance P2 UI](1d8013fd-f5b1-4402-90db-d0a6c4822b46): client+UI+MSK env; later web BUILD `1vHgjub` (ultrawide hero) поверх.
- С MSK `.184` TCP к `.159:80` и `:443` - **timeout** (не nginx Host/301). UFW на `.159` 80/443 open; HTTPS health локально OK.
- TLS на finance уже есть (certbot: supplier/pay/finance-api); HTTP→HTTPS redirect для этих hostnames.
- Catalog venue `phase-g-test-museum` в MSK PG по-прежнему нет - slug bridge open.

### Решения
- Live admission на catalog не заработает без сети MSK→`.159` (Timeweb allow / private net) + slug bridge.
- После сети: `FINANCE_API_BASE_URL` лучше на `https://finance-api.daibilet.ru` (или HTTP internal vhost без 301), Host/IP-only сейчас бессмысленны при TCP fail.

### Проблемы
- MSK egress/filter между ВМ Timeweb - тот же класс, что INC.504 outbound DNS.

---

## 2026-07-30 - Codex CF.P1 contract harden `114dd391`

### Наблюдения
- Codex на `codex/phase2-finance-supplier`: `114dd391 test: guard finance projection contract`.
- Regression: public DTO не светит `paymentMode`, provider/source ids, checkout/internal order ids.
- Guards: `checkoutPath` только при `canSell === true`; public admission держит `purchaseFlow=PLATFORM`.
- Runbook `.159`: `docs/finance-159-smoke-runbook.md` (finance tree) связан с каноном catalog-finance-projection.
- Проверки: backend/contracts `tsc --noEmit`, `public-finance-projection.test.ts`. Worktree чистый; `.184` / TC/TEP/widgets/secrets не трогали.

### Решения
- Принято как hardening поверх P0/P1 - runtime redeploy `.159` не обязателен (tests+docs), tip commit для handoff = `114dd391`.
- Catalog UI уже зеркалит canSell/checkoutPath; контрактные тесты на finance снижают риск регрессии API.

### Проблемы
- Runbook пока только в finance worktree - в monorepo catalog указана ссылка, файл не дублировали.

---

## 2026-07-30 - CF.P1b+P2 catalog admission UI + finance projection client

### Наблюдения
- Finance `.159` public APIs уже live; с MSK/локали для IP нужен `Host: finance-api.daibilet.ru`.
- На catalog `feat/next-monorepo`: HTTP client `apps/web/src/server/finance-projection-client.ts` (AbortSignal 3s, fail-soft), mapper/tests, `AdmissionProductCard`, `VenueAdmissionBlock`, `CityAdmissionBlock`.
- Venue SSR join по `Venue.slug` → `/api/public/venues/:slug/admission-products`. City hub: `citySlug` + `CITY_ADMISSION_MIN_PUBLISHED` (default 1).
- CTA только при `canSell=true` → `FINANCE_CHECKOUT_BASE_URL` + `checkoutPath`. TC/TEP widgets / event slots не трогали; admission не в `/events` feed (P2c later).
- Seed finance: product `phase-g-test-museum-entry`, venue `phase-g-test-museum`, city `moskva`.

### Решения
- Env: `FINANCE_API_BASE_URL`, optional `FINANCE_API_HOST`, `FINANCE_CHECKOUT_BASE_URL`, optional projection token; deploy-prod-next.sh дописывает defaults.
- Wide YooKassa по-прежнему off; STUB на finance.

### Проблемы
- Catalog venue со slug `phase-g-test-museum` отсутствует в MSK Postgres (0 rows) - нужен slug bridge / seed venue.
- **MSK → finance `.159`:** curl timeout 3s - сеть/firewall, live projection с catalog fail-soft пустой.
- DNS `checkout.daibilet.ru` / TLS ещё owner; GitHub DNS на MSK тоже мёртв (deploy через SPB scp `.next`).
- Deploy: `8fa3d00b` + hotfix `0989c2b3` (ISR: `next.revalidate:60` вместо `cache:no-store`); MSK `BUILD_ID=4eAVTHv8N2eeWrzHSw76F`; FINANCE_* в `/opt/daibilet/.env`.

---

## 2026-07-30 - Deploy CF.P0+P1 на finance `.159` + STUB smoke

### Наблюдения
- Codex ветка `codex/phase2-finance-supplier`: `00aa9dcf` PurchaseProjection, `0c1e4648` public finance projection APIs.
- Хост был на `d2477ae`; ff-pull → `0c1e464`, restart `daibilet-finance-api`, health 200.
- Public APIs 200: list/detail/venue/supplier + `/api/public/finance/...`; seed `phase-g-test-museum-entry`, `canSell=true`, `checkoutPath` есть, `paymentMode` нет.
- STUB: `POST /api/checkout/stub` → order `7649542` CONFIRMED; idempotent retry тот же `publicCode`.
- PurchaseProjection: admin `sourceKind=internal`, buyer email hit, supplier LC 3 admission rows включая smoke.
- YooKassa: `DAIBILET_YOOKASSA_CHECKOUT=0`; `YOOKASSA_SHOP_ID`/`SECRET_KEY` отсутствуют - флаг не включали.
- MSK catalog `.184` / TC/TEP не трогали. Projection token env unset (open read OK для smoke).

### Решения
- Runtime на `.159` только из Codex tree; docs sync на `feat/next-monorepo`.
- CF.P0/P1 → ✅ на finance; CF.P0b gate на catalog CTA остаётся; next = Cursor CF.P1b + P2 UI.
- YooKassa: checklist only (§11 catalog-finance-projection); STUB оставить включённым.

### Проблемы
- Без DNS/TLS нельзя зарегистрировать публичный YooKassa webhook на finance.
- Catalog ещё без HTTP client к finance - UI admission на `.184` рано.
- Dual-DB External(catalog)↔Checkout(finance) fan-in для buyer/admin на catalog host ещё не решён.

---

## 2026-07-30 - Lock: catalog ↔ finance projection contour

### Наблюдения
- Owner зафиксировал канон: TC/Teplohod на catalog `.184`; finance `.159` владеет INTERNAL_SALES / AdmissionProduct / checkout; catalog читает только API/projection.
- На `cursor/phase-g-admission-checkout`: admin/supplier admission read, STUB checkout admission, `canSell` readiness - есть. Public `/api/public/admission*` и catalog client - нет.
- `feat/next-monorepo` HEAD без AdmissionProduct schema (phase-g ещё не merge).
- Admin orders + buyer «Мои покупки» = только `ExternalOrder`; supplier LC orders = `CheckoutItem`. Единого `PurchaseProjection` нет.
- Codex на `.159` (`d2477ae`): finance API `:4100`, STUB on, YooKassa off; TC secrets на finance не класть.

### Решения
- Docs lock: [catalog-finance-projection.md](./catalog-finance-projection.md); обновлены [spb-finance-host.md](./spb-finance-host.md), Project, Tasktracker CF.P0–P3, qa.
- **P0** PurchaseProjection (Codex) до wide internal sales.
- **P1** finance public read + catalog client (Codex / Cursor).
- **P2** venue/city/events UI admission (Cursor) после projection.
- Не ломать TC/TEP widgets; не YooKassa на imported events; не писать finance→catalog DB без contract.

### Проблемы
- Dual-DB после split: External на catalog, Checkout на finance - нужен явный fan-in (qa §5–7).
- Service auth и TTL projection ещё открыты (qa §8–10).
- Полный UI/checkout на catalog сейчас **не** делать - только docs + gap.

---

## 2026-07-30 - MIG.9 Phase 3 partial: Codex finance host `.159` beyond P0–2

### Наблюдения
- Inspection agent `e2ac1fb7` на Diligent Polydeuces `85.193.80.159`: Codex продвинул host за Phase 0–2.
- Docker `daibilet-finance-postgres` на `127.0.0.1:5437` - migrations + seed smoke OK.
- systemd `daibilet-finance-api` слушает `127.0.0.1:4100`.
- nginx HTTP: `supplier.daibilet.ru` / `checkout.daibilet.ru` / `finance.daibilet.ru` → supplier dist + `/api` → `:4100`.
- Git: `/opt/daibilet-finance/app` на `codex/phase2-finance-supplier` @ `d2477ae`.
- STUB checkout **on**, YooKassa **off**; TLS ещё нет.
- Codex SSH key на хосте; MSK catalog `.184` не затронут.
- DNS stub A для finance hostnames всё ещё owner TODO (Timeweb).

### Решения
- Docs-only sync: [spb-finance-host.md](./spb-finance-host.md), [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md), Tasktracker MIG.9.2–9.3.
- **Не** SSH-менять `.159` пока Codex активен; **не** трогать MSK.
- Следующий owner-блокер: DNS stub A → затем certbot TLS → Phase 5 YooKassa.

### Проблемы
- Без DNS stub нельзя закрыть TLS / публичный smoke HTTPS.
- Параллельный agent SSH на finance host рискует конфликтом с Codex - координация обязательна.

---

## 2026-07-30 - Event covers: empty cards / Volna / evt-auto 404

### Наблюдения
- Публичный каталог API: **2485** карточек; в выборке 100 - **0** empty / city-placeholder; sample TC+TEP HEAD = 200.
- БД future active sessions (distinct Event): **~21739**; `imageUrl` null/empty = **0**, city placeholder = **0**.
- Проблема была не «нет URL», а **битые локальные** `/images/events/generated/evt-auto-*.jpg` (файла нет на MSK nginx alias) при том что `sessionHasCoverImage` их принимает.
- До фикса: **24** future events на evt-auto (14 distinct URL). У «Волны» (`evt_tep_1511`) был stub; sibling `evt_tep_866/867` уже с живым TEP CDN.
- MSK egress: `api.teplohod.info` / `fonts.googleapis.com` / часто `daibilet.ru` - **DNS fail** с хоста (INC.504.1). Браузеры клиентов TEP картинки грузят.
- Blog «Афиша: Москва» (агент 62ef91d7): отдельно - prefer remote/city cover вместо evt-auto; `moscow.png` = 200.

### Решения
- SQL: 8 events с durable venue CDN вместо evt-auto; Volna → `Event866` dirtyAlias cover.
- На диск MSK: regenerate 6 missing evt-auto JPEG (оставшиеся 16 events / 6 URL).
- Backend `pickFirstUsableEventImageUrl`: сначала durable (CDN/venue/tc), ephemeral evt-auto - после.
- Frontend: `resolveEventCardFallbackImage` → city card в EventCard (код в workspace).
- API restart с обновлённым `event-image-url.ts` / `dto.js`. Web: failed `next build` (Google Fonts) → restore `.next` из backup, service up.

### Проблемы
- ~~Frontend fallback не в prod bundle~~ ✅ SPB `pnpm web:build` @`205f36c` → MSK `BUILD_ID=upzsYYlMO145GFc83zNSH` (без build на MSK). Smoke: Волна `Event866` CDN; `/events` sample CDN, не серые.
- Параллельные агенты гоняли `restore-next.sh` / `redeploy-next.sh` (откат на `nR2dEtI6`) - артефакты sidelined, guard на `/tmp/redeploy-next.sh`.
- TEP sync с MSK не обновит свежие обложки, пока DNS/egress не починят.
- `ensure-catalog-covers` должен деплоить generated files вместе с DB URL (сейчас URL без файла = серые карточки).

---

## 2026-07-30 - City hub: hide empty/false river landings (ЕКБ)

### Наблюдения
- Хаб Екатеринбурга в «Топ-запросы» показывал «Речные прогулки» (8) и «Вечеринки на теплоходе» (4).
- City scoping был верный (сессии города), но counts - ложные: keyword `катер` ⊂ `Екатеринбург` + stale `landingSlugs`.
- Конфиг хаба не курировал ЕКБ → fallback лил все landings с events>0.

### Решения
- `buildPublicLandings`: live rematch через `matchingLandingSlugs` (не доверять stale landingSlugs при наличии title/tags).
- `city-hub-config` ekaterinburg без river; `resolveFeaturedDirections` не авто-промоутит water landings для сухопутных городов.
- Согласовано с tighten `river-cruises` (word-start stem + excludes).
- Фильтр чипов: только `events > 0` после city-scoped rematch.

### Проблемы
- ~~Нужен MSK deploy API~~: scp `public-city-landings.ts` + restart `daibilet-api`; smoke `/api/public/cities/ekaterinburg` - **без** river-cruises/river-party.
- Web source scp'd (config/directions); для belt-and-suspenders water-gate в бандле нужен next rebuild (API fix уже скрывает чипы).

---

## 2026-07-30 - River landing: ЕКБ concert false match

### Наблюдения
- `/rechnye-progulki/ekaterinburg`: единственный «рейс» - sold-out концерт Ben Hall «АнимациЯ / Костя Кулясов».
- Root cause: keyword `катер` как substring внутри `Екатеринбург` в title (`includes`).

### Решения
- `landing-rules.ts`: word-start stem match (`textHasKeywordStem`) - `катер`≠Екатеринбург, `катера` ok.
- `river-cruises`: убран bare `прогулк`; boat/pier stems + excludes (концерт/рок/стендап/анимаци/ben hall).
- SEO fallback «по Екатеринбургу» через BUS_CITY_META dative (web).
- Tests: Ben Hall false-positive + MSK/SPb river keep.

### Проблемы
- Нужен MSK `scp landing-rules.ts` + `systemctl restart daibilet-api` (+ cache warm).

---

## 2026-07-30 - Blog sidebar «Афиша: Москва» broken image

### Наблюдения
- https://daibilet.ru/blog: карточка `BlogAfishaPromo` «Афиша: Москва» - пустая тёмная область / broken image; cover статей ок.
- В `afishaPromos.moscow.imageUrl` был `/images/events/generated/evt-auto-3287bba11438.jpg` (первый session cover из city page).
- Прямой URL: **404** (файла нет в `/opt/daibilet/apps/web/public/images/events/generated/` - только ручные `evt-cover-*`). nginx `location ^~ /images/` → alias web/public.
- `BlogAfishaPromo` использовал сырой `next/image` без SafeImage / unoptimized для `/images/*`.
- Fallback на teplohod CDN через `/_next/image` на MSK → **504** (egress мёртв).

### Решения
- Hotfix: JPEG evt-auto через sharp + сброс image cache (symptomatic).
- Код: sidebar предпочитает `resolveCityCardImage` (`/images/cities/{slug}.png`), remote только fallback; `BlogAfishaPromo` → `SafeImage`.
- Deploy: build на SPB `.16` (fonts) → scp `.next` tarball на MSK `BUILD_ID=kkULngvTnDkN3AMjjxotB`; revalidate `blog-page`.
- Proof: moscow `imageUrl=/images/cities/moscow.png`, optimizer 200.

### Проблемы
- MSK `pnpm web:build` без webpack font-cache падает на `fonts.googleapis.com` (EAI_AGAIN) - только SPB/CI build.
- Параллельный `systemctl stop daibilet-web` на MSK мешал restore; нужен single-flight deploy.

---

## 2026-07-30 - Home city H1 + museums regression

### Наблюдения
- Owner: «почему H1 для города на главной поменяли? где музеи?»
- City H1 был «Экскурсии и события в {City}» (Clean UI lock 2026-07-25) - без слова «музеи», в отличие от national «Экскурсии, музеи и мероприятия».
- Более ранний HC.1: «Куда сходим в [City_Пр]?» - уже superseded Clean UI.
- На главной чип/плитка «Музеи» на месте (`HERO_QUICK_CHIPS` / `HOME_FORMAT_TILES`); d55bff8/33df97f/5f37dc6/7e254f8 H1 не трогали.
- City hub 1.3.7 (`4bb9b38`): SPb museums указывали на `moscow-museums` (нет в payload СПб) → плитка «Музеи» отваливалась; `categoryKey` не срабатывал как fallback.

### Решения
- HomeHero (web + legacy public): city H1 = «Экскурсии, музеи и мероприятия / в {City}» - как national lead.
- SPb featured museums → `exhibitions` + `Музеи и арт`; удалён дубль `sankt-peterburg` без музеев.
- `resolveDirectionFromConfig`: при пустом landing → fallback на category (soft match).
- Тесты: `city-hub-directions.test.ts`, assert museums в config.

### Проблемы
- Нужен web deploy, чтобы H1/museums на prod обновились.

---

## 2026-07-30 - City hub «Зачем ехать»: no wrong related events

### Наблюдения
- Жалоба: карточка `ekb-uralskiy-mars-bazhovskie-ekskursii` на хабе Екб показывала только стендап под тизером.
- `CityHubArticleTeaser` → `matchArticleSessions`: при 0 keyword hits был **quality fallback** по всей афише города (фото + цена) - для Екб это стендап.
- Frontmatter статьи без relatedEventIds; mapping `country-tours` / topic `tours` корректны - баг в матчере, не в MD.

### Решения
- Убран quality fallback: нет совпадений → пустой список (лучше без ссылок, чем чужие).
- Доп. фильтр: если у статьи и у события есть детектируемые темы - требуем пересечение (стендап vs tours).
- Тесты: empty-on-miss + ekb countryside vs standup.

### Проблемы
- Web deploy: SPB build `nR2dEtI6h8GwICxzMBmtX` → MSK (relay via local). На MSK были параллельные перезаписи `.next` - финально locked redeploy @16:27 UTC.

---

## 2026-07-30 - MIG.9 Phase 0–2: Diligent Polydeuces `85.193.80.159` provisioned

### Наблюдения
- SSH с Windows: ключ `~/.ssh/daibilet_spb_finance` (ed25519, comment `daibilet-finance-159`) принят; `daibilet_staging_key` / MSK key - Permission denied.
- Hostname VM: `spb-3-vm-ukly`; Ubuntu 24.04.4; RAM 7.8 Gi; disk `/` 77G (~2G used → ~3G после стека).
- Egress OK: `curl -I https://github.com` → HTTP/2 200; `dig ticketscloud.ru` → `95.129.232.92`; teplohod.info резолвится.
- Timeweb API token в env локальной среды нет - DNS A stub не выставлен из агента.
- `.184` и `.16` не трогались.

### Решения
- UFW active: allow 22/80/443; deny 5432/5437 public; default deny incoming.
- Base: docker 29.6 + compose plugin, nginx, certbot, git, curl, dnsutils, Node 22.23 + corepack `pnpm@11.7.0`, `vm.swappiness=10`.
- Каталоги: `/opt/daibilet-finance`, `/opt/daibilet-staging`, `/opt/daibilet`, `/root/backups`.
- Fresh finance Postgres: container `daibilet-finance-postgres` (`postgres:17-alpine`), volume `daibilet-finance-pg-data`, DB `daibilet_finance`, bind **только** `127.0.0.1:5437` (не catalog dump). Credentials: `/opt/daibilet-finance/postgres/.env` mode 600 on host (не в git).
- Local SSH alias: `Host daibilet-spb8 spb8 daibilet-finance` → `IdentityFile ~/.ssh/daibilet_spb_finance`.
- Docs SSH matrix: `.159` = `daibilet_spb_finance`.
- **Не** деплоили YooKassa / finance app / TLS domains.

### Проблемы
- DNS stub A ещё нужен owner в Timeweb: `checkout.daibilet.ru`, `supplier.daibilet.ru` (opt `finance-api.daibilet.ru`) → `85.193.80.159`; apex/catalog DNS не менять.
- Timeweb panel firewall (если отдельно от UFW) - подтвердить 22/80/443 со стороны панели.
- Phase 3+: finance runtime + TLS + checkout links с catalog; YooKassa webhook позже, без invent secrets.

---

## 2026-07-30 - Decision: lock host roles (catalog / finance / retire)

### Наблюдения
- Owner подтвердил матрицу ролей: не «слепо заменить 4 ГБ на 8 ГБ», а разделить battle catalog и battle finance.
- Friendly Pheasant `201.24.125.184` уже battle catalog (MIG.7/8); AAAA снят owner.
- Intelligent Hoopoe `213.171.7.16` - временный scaffolding (staging/build/config reserve, migration source).
- Diligent Polydeuces `85.193.80.159` - целевой primary finance/supplier/checkout.

### Решения
- **Lock:** `.184` = battle catalog · `.159` = battle finance · `.16` = scaffolding → demolish after smoke.
- Catalog ↔ finance только через API; TC/Teplohod import остаётся на catalog; orders/purchases/suppliers - на finance.
- DNS finance: primary **`checkout.daibilet.ru`**, `supplier.daibilet.ru`, maybe `finance-api.daibilet.ru`; `pay.daibilet.ru` - optional alias (qa).
- YooKassa webhook → новый finance API; старый держать до confirmed smoke, затем отключить.
- `.184` не трогать как prod catalog (только perf/DTO/SSR/DNS). Серверы пока **не** мигрировать - docs only.
- Docs: [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md), [spb-finance-host.md](./spb-finance-host.md), Project host roles, Tasktracker MIG.9.0–9.7.
- Следующий ops-шаг: SSH Phase 0 на `.159` + DNS stub A для checkout/supplier.

### Проблемы
- SSH/firewall на `.159` ещё не проверены.
- Имя checkout vs pay ещё открыто в qa (рекомендация - checkout).
- Продуктовый finance runtime (Phase G) ещё не готов - host roles зафиксированы заранее.

---

## 2026-07-30 - MIG.9 план: СПб 4 ГБ → 8 ГБ (superseded by role lock)

### Наблюдения
- Owner: новый VPS Diligent Polydeuces `85.193.80.159` (~8 ГБ). Старый Intelligent Hoopoe `213.171.7.16` (~4 ГБ) после MIG.8 = finance+staging+build, не public.
- Каталог/DNS prod уже на МСК `201.24.125.184`. Перенос catalog на новый СПб откатил бы MIG.7/8 и риск dual-source.
- В `deploy/scripts` IP `213.171.7.16` не захардкожен (скрипты on-host); IP в docs/runbooks (`deploy-staging.md`, `deploy-timeweb.md`, phases).

### Решения
- Первичный план upsizing: [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md). **Уточнено тем же днём:** finance primary на `.159`, не blind replace всех ролей; см. decision record выше.
- Finance PG - отдельный volume; не restore catalog dump как money DB.
- Tasktracker MIG.9 → фазы 9.0–9.7. Следующий шаг: SSH на `85.193.80.159` (Phase 0).

### Проблемы
- SSH ключ/firewall на новом боксе ещё не проверены с этой среды.
- Teplohod allowlist: менять IP только если sync снова пойдёт со СПб (после MIG.8 обычно нет).

---

## 2026-07-30 - Perf: compact /api/public/home + city SSR hang

### Наблюдения
- `GET /api/public/home` ~1.2MB (`no-store`): 180 полных sessions с description/groupEventIds/per-slot purchaseUrl.
- City HTML зависал на cold catalog rebuild (20-200с) + secondary articles; при stop web на время MSK-build - массовые 502 (robots/favicon/cities).
- AAAA `2a03:6f00:a::2:fa87` есть в DNS; curl -6 с Windows без IPv6 не резолвит - проверить маршрутизацию с dual-stack клиентов.

### Решения
- Compact home card DTO (`toPublicHomeCardSession`) + `sendPublicJson`/`withPublicResponseCache` для `/api/public/home`.
- Events list: description≤200, slots≤4 без per-slot purchaseUrl; cache keys bumped (`catalog-page-v2-lean`, city/home).
- City page: articles timeout 3s + allSettled; city DTO: timeout venue hubs/resolve/city-record; `DAIBILET_PERF_LOG=1` marks.
- Middleware: early bail для static/robots/sitemap/favicon/image extensions.

### Проблемы
- Cold catalog rebuild (dual SWR) всё ещё главный риск first miss после restart - INC.504.4/5.
- AAAA: ops-задача Timeweb (проверить IPv6 до 201.24.125.184 или снять AAAA).

## 2026-07-30 - Cold TTFB ~15-30с после browser cache clear

### Наблюдения
- Warm `/` / `/events`: nginx `X-Cache-Status: HIT`, TTFB ~0.01-0.17с. Browser clear сам по себе не должен бить cold Next.
- Причина 15с: nginx `proxy_cache_valid 5m` без `proxy_cache_background_update` → после TTL первый запрос ждал Next; при miss ISR/home тянул cold catalog (~20с DTO + dual rebuild).
- `/cities/sankt-peterburg`: всегда `Cache-Control: private, no-store` (нет `generateStaticParams` / `unstable_cache`), cold TTFB 23-32с даже повторно.
- Dual SWR: `Public catalog DTO cache` + `Public catalog cache` (dto.js) параллельно 12-90с.

### Решения
- nginx MSK hotfix: `proxy_cache_valid 200 30m`, `proxy_cache_background_update on`, `inactive=120m`, `lock_timeout 5s` (не `expired` - токена нет в nginx).
- City hub: `cached-city-data.ts` (`unstable_cache` + tag `city-page`), `generateStaticParams`/`dynamicParams`, SWR в `public-city.dto.ts`.
- `scripts/warm-hub-pages.mjs` + hook в `deploy-prod-next.sh`; cron warm на MSK.

### Проблемы
- Dual catalog merge (INC.504.5) ещё не сделан - первый cold после purge/restart всё ещё тяжёлый.
- City first ISR miss без warm всё ещё может ждать catalog rebuild.

## 2026-07-30 - UX: home venues city filter + catalog city chip

### Наблюдения
- На главной события фильтруются в `HomeCityAwareSections` по `SelectedCityProvider`, а блок «Популярные места и площадки» рендерился статически из SSR без учёта города.
- В каталоге `/events` активный город был только в хедере; в блоке активных фильтров чипа не было.

### Решения
- `HomeVenuesSection.client.tsx`: клиентский блок площадок с `filterVenuesByCity` (по аналогии с событиями).
- `landing-city.ts`: `filterVenuesByCity`, `resolveCatalogCityLabel`.
- `CatalogActiveFilters`: чип города с сбросом через `persistSelectedCity('all')`.
- Тесты: `landing-city.test.ts` (3 кейса).

### Проблемы
- Нет.

## 2026-07-30 - INC.504.3: teplohod/CDN bypass Next image optimizer

### Наблюдения
- После INC.504.2 локальные `/images/*` обходят `/_next/image`, но обложки teplohod/ticketscloud по-прежнему шли через optimizer.
- MSK outbound TCP/HTTPS мёртв - сервер не может fetch `api.teplohod.info` → 504 на `/_next/image?url=...`.

### Решения
- `remote-image-bypass.ts`: allowlist teplohod.info, ticketscloud, yandexcloud.net, twcstorage.ru, googleapis.com, amazonaws.com.
- `SafeImage`: `unoptimized` для этих хостов - браузер грузит CDN напрямую.
- Deploy: build на SPB `213.171.7.16` @`827ea93`, scp `.next` + sources на MSK, restart `daibilet-web`.
- MSK `BUILD_ID=BAG8dYUqDRmaw8j-CtlR0`; homepage: 0× `/_next/image?url=...teplohod`, bypass в chunk `5216-*.js`.

### Проблемы
- Egress/DNS на MSK не починен - только client-side fetch для внешних CDN.

## 2026-07-30 - PERF.E5 regression: event 404 (Latin slug / Cyrillic DB)

### Наблюдения
- `/events/retro-locman-ot-zaryadya-1294` (и другие TEP с latin public slug) отдавали 404: `resolveEvent` в `public-event.dto.ts` не находил `evt_tep_1294`, потому что fallback сканировал только последние 20k events по `updatedAt`.
- В БД slug кириллический (`рэтро-лоцман-от-зарядья-1294`), публичный URL - транслит.

### Решения
- `resolveEvent`: lookup по `canonicalPath`, `evt_tep_{tail}` + `publicSlug` match, suffix `endsWith` до 20k scan.
- Экспорт helpers (`publicSlug`, `extractEventTrailingLookupToken`, `buildTepEventIdFromTrailingToken`) + unit `public-event.dto.test.ts`.
- MSK hotfix: scp `public-event.dto.ts`, restart `daibilet-api`.

### Проблемы
- 20k scan остаётся last resort - при росте каталога рассмотреть индекс/transliterated slug column.

## 2026-07-30 - INC.504.2: nginx bypass `/images/*` (MSK prod)

### Наблюдения
- Локальные PNG/JPG (`/images/cities/*`, blog covers) шли через `/_next/image` и упирались в зависший web + dead outbound TCP на МСК.
- Статика лежит на диске: `apps/public/public/images` → `sync-public-assets.mjs` → `apps/web/public/images` при build.

### Решения
- `deploy/nginx/patch-prod-nginx-images-static.py`: `location ^~ /images/` → alias `/opt/daibilet/apps/web/public/images/`, expires 30d.
- `deploy-prod-next.sh`: патч при каждом deploy вместе с `/_next/static`.
- `SafeImage`: `unoptimized` для `src` с префиксом `/images/` - HTML не генерирует `/_next/image` для локальной статики.
- Tasktracker: INC.504.2 ✅; INC.504.5 (dual SWR dto.js + public-catalog.dto.ts) → F5.3b.

### Проблемы
- Remote covers (TC CDN, teplohod) по-прежнему через optimizer - нужен INC.504.1 egress/DNS.

## 2026-07-30 - Prod 504: daibilet-web hang (MSK)

### Наблюдения
- Пользователи и nginx: массовые **504** на https://daibilet.ru (MSK `201.24.125.184`).
- `daibilet-web` (Next `:3001`) завис: RSS **~1.1G** при systemd **MemoryMax=1G** - процесс в давлении OOM, ответы не отдавались.
- `journalctl`: синхронный **SWR catalog rebuild** блокировал event loop **49-219 с** на запросах к каталогу/лендингам.
- `/_next/image`: upstream timeout на remote covers (**api.teplohod.info**, **ticketscloud** CDN) - дополнительная нагрузка на зависший web.
- Исходящий **DNS/HTTPS с МСК** по-прежнему фильтруется провайдером (см. Diary 2026-07-30 city hub rollout, агент `403122a2`) - IndexNow/Yandex/github недоступны; часть image fetch тоже страдает.
- PostgreSQL: эпизодические **connection drops** под нагрузкой (digest в journal при рестарте/shutdown).

### Решения
- Ops hotfix (агент `5a577127`): `systemctl restart daibilet-web` + `nginx -t && systemctl reload nginx`.
- После рестарта: главная и ключевые маршруты снова **200**; 504 сняты.

### Проблемы
- **Риск рецидива:** без mitigations тот же сценарий повторится при очередном долгом SWR rebuild + image optimizer + memory pressure.
- Follow-up в Tasktracker (Medium): тикет Timeweb egress/DNS; nginx bypass `/_next/image` для локальных `/images/*`; пересмотр MemoryMax web; async/non-blocking SWR rebuild.

## 2026-07-30 - City hub 1.3.7 rollout (65 standaloneCities)

### Наблюдения
- `CITY_HUB_CONFIG` расширен с 4 пилотных + alias на все 65 `standaloneCities`: per-city `highlightSeason`, `primaryCta`, `featuredDirections` (landing-rules slugs + `categoryKey` API-fallback), `venuesTopN` 8-12.
- Генератор `scripts/gen-city-hub-rollout.mjs` + merge; unit `city-hub-config.test.ts` - 6 тестов OK (coverage 65 slugs, landing slug allowlist).
- MSK prod DNS: `resolv.conf` уже 8.8.8.8/1.1.1.1, но UDP/TCP :53 к внешним резолверам timeout; curl github.com:443 тоже timeout - исходящий трафик фильтруется на уровне провайдера, не misconfig ОС.
- MSK `git HEAD` остаётся `20d10eb`; `git fetch origin` невозможен без offline-доставки.

### Решения
- Rollout конфигов: курортные/прибрежные - chip курортного сезона; Золотое кольцо - «Золотая осень» + walking-tours; речные - `river-cruises`; крупные города venuesTopN 10-12.
- `docs/city-hub-content-gaps.md` - секция sights без affiche CTA для 6 городов с ⚠️ sights.
- Offline deploy на МСК (когда github недоступен): (1) build на СПб или CI, (2) `scp` source diff + `.next` tarball, (3) на МСК `git update-ref refs/remotes/origin/feat/next-monorepo HEAD` или git-shim skip fetch/pull, (4) `deploy-prod-next.sh` с `PATH=/tmp/msk-git-shim:$PATH`, (5) nginx cache purge + revalidate hub paths. См. `tmp-msk-deploy-offline.sh`, Diary 2026-07-30 pilot deploy.

### Проблемы
- DNS на МСК не чинится сменой nameserver - нужен тикет Timeweb на исходящий DNS/HTTPS или постоянный offline pipeline до cutover сети.
- Prod deploy rollout 1.3.7 ждёт offline-сборку (HEAD локально ≠ `acf8291` на origin).

## 2026-07-30 - City hub 1.3.7 pilot deploy (MSK prod)

### Наблюдения
- Commit `4bb9b38` в `feat/next-monorepo`: `city-hub-config`, `city-hub-directions`, `CityPageView`, unit-тесты.
- MSK `git fetch` github.com = `Could not resolve host` - код и `.next` доставлены offline (scp source + tarball со СПб build host).
- СПб `213.171.7.16`: `pnpm web:build` @`4bb9b38`, tarball 93M → МСК `201.24.125.184`.
- Prod smoke (external curl): `/` + `/cities/{sankt-peterburg,moscow,sochi,kazan}` = 200; HTML SPB hub содержит chip «Белые ночи (май-июль)», CTA «Круизы и прогулки», `#directions`.
- Journal: image upstream timeouts, IndexNow timeout к yandex/api.indexnow (исходящий DNS), Prisma digest на shutdown старого web - не блокер после restart.

### Решения
- МСК deploy без `deploy-prod-next.sh` full pull/build: stop web → extract `.next` → restart api/web → nginx cache purge → revalidate paths pilot hubs.
- `BUILD_ID=SaMk82QKT-soddKQ5jcua` на МСК.

### Проблемы
- `deploy-prod-next.sh` на МСК пока требует рабочий github DNS или offline shim - follow-up.
- Rollout `city-hub-config` на остальные 65 standaloneCities - следующий шаг.

## 2026-07-30 - City hub 1.3.7 / P.2h wireframe v2 (пилот)

### Наблюдения
- Wireframe v2 согласован в docs, но в коде все 65 хабов рендерили одинаковый fallback направлений (топ landings API без per-city курации).
- Sights не имели CTA на афишу/landing без явной привязки - ок по v2, но не было и позитивного матча при живых landings.

### Решения
- `apps/web/src/lib/city-hub-config.ts` - per-city `featuredDirections`, `highlightSeason`, `primaryCta`, `venuesTopN`, `hideSections`.
- `city-hub-directions.ts` - `resolveFeaturedDirections` (конфиг ⋈ API, count>0), `matchSightAfficheLink` (CTA только при live landing/category).
- `CityPageView`: hero chip сезона + primary CTA из конфига; `#directions` через curated tiles; sights CTA; venues top-N.
- Пилотные конфиги: `saint-petersburg`/`sankt-peterburg`, `moscow`, `sochi`, `kazan`. Остальные города - прежний API fallback.
- Unit: `city-hub-config.test.ts` (4).

### Проблемы
- (закрыто deploy-записью выше) Web deploy 1.3.7 на MSK @`4bb9b38`.

## 2026-07-30 - F5.3b venue public read в TS

### Наблюдения
- `public-city.dto.ts` / `public-venue.dto.ts` импортировали `publicVenueHubRows`, `resolvePublicVenuesForSessions`, `buildPublicVenuePage`, `buildPublicVenuesCatalog` из `dto.js`.
- Hub tiles уже на Prisma lean (`public-venue-lean.ts`); page/catalog тянули legacy `publicCatalogSessions(db)`.

### Решения
- Новый модуль `public-venue-read.ts`: hub rows, resolve для city hubs, venue page/catalog, map/list helpers, warm cache (`warmPublicVenueCatalogCache`).
- Catalog sessions в TS-пути: `getPublicCatalogSessions()` вместо `publicCatalogSessions(db)` (без venue index cache).
- `dto.js` re-export + `clearPublicVenueReadCache()` в `clearPublicDataCaches`; admin/legacy (`server.js`, warm) без изменения контрактов.
- `public-city.dto.ts`, `public-venue.dto.ts` → `./public-venue-read.js`.
- Тесты: `public-venue-read.test.ts`; `public-city-venues.test.ts` без dto.js.
- Web: `city-hub-seo.test.ts` - relative import `./city-hub-seo.ts`; цепочка `city-hub-seo.ts` / `datetime.ts` / `seo-listing-meta.ts` на relative imports для `node:test`.

### Проблемы
- Public read ещё через dto.js: `public-landing.dto`, `public-articles.dto`, `public-stats.dto`, `public-orders.dto`, `server.js` routes.
- F5.3c: server.js admin TS routes.


### Наблюдения
- `public-catalog.dto.ts` тянул grouping (`mapGroupedPublicSession`, `regroup*`, `dedupe*`, `sessionHasCoverImage`) из `dto.js`.
- `public-city.dto.ts` тянул destination helpers (`publicDestinationFromSession`, `lookupDestinationCatalogSessions`, `buildPublicDestinationRowsFromSessions`, SEO) из `dto.js`.
- Venue hub (`publicVenueHubRows`, `resolvePublicVenuesForSessions`, `buildPublicVenuePage`) остаётся в dto.js - слишком связан с legacy DB + `mapPublicVenueListItem`.

### Решения
- Новые модули: `public-catalog-grouping.ts` (regroup/dedupe/cover + shared purchase-block helpers), `public-destination.ts` (city/destination pure helpers).
- `public-catalog.mapper.ts`: `mapGroupedPublicSession(row, pinnedEventIds)` с `manualLandingStatus`.
- `dto.js` re-export для admin/legacy; внутренние helpers (`normalizeGroupPart`, `sessionGroupIds`, …) импортируются из grouping TS.
- Тесты: `public-catalog-grouping.test.ts`, `public-destination.test.ts`.

### Проблемы
- `public-city-venues.test.ts` hub-case всё ещё импортирует `dto.js` (нужен полный workspace `@daibilet/db`).
- F5.3b: venue catalog/page builders + `server.js` routes.

## 2026-07-30 - ERR_HTTP2_PROTOCOL_ERROR после F5 deploy (nginx cache race)

### Наблюдения
- Браузер: `net::ERR_HTTP2_PROTOCOL_ERROR` на https://daibilet.ru после deploy ~07:57 UTC.
- nginx error.log: `[crit] mkdir()/unlink() "/var/cache/nginx/daibilet/..." failed (2: No such file or directory) while reading upstream` на HTTP/2.0.
- access.log: `GET / HTTP/2.0" 200 0` - ответ 200 с нулевым телом (битый HTTP/2 stream).
- Deploy `deploy-prod-next.sh` делал `rm -rf /var/cache/nginx/daibilet/*` без reload nginx - старые worker'ы продолжали писать в удалённые пути cache.
- `/_next/static/*` на диске OK (`apps/web/.next/static/`); chunks отдают 200. Ошибка `layout.css` - ложный HEAD от диагностики (файл переименован в hash-css).

### Решения
- Prod MSK: восстановлен `/var/cache/nginx/daibilet` (mkdir + chown www-data), `nginx -t && systemctl reload nginx`.
- Добавлен `/etc/tmpfiles.d/nginx-daibilet-cache.conf` для автосоздания cache dir после reboot.
- `deploy-prod-next.sh`: reload nginx ДО и ПОСЛЕ purge proxy cache, чтобы worker'ы не писали в удалённые пути.

### Проблемы
- Отдельно: upstream timeout на `/_next/image` и RSC prefetch при нагрузке (не HTTP/2 protocol error).

---

## 2026-07-30 - F5.1 + F5.2 landing/catalog TS

### Наблюдения
- `dto.js` держал ~260 строк дубля `LANDING_RULES` + matchers (~200 строк) параллельно `landing-rules.ts`.
- `public-catalog.dto` тянул datetime/subcategories из dto при наличии TS-модулей.

### Решения
- F5.2: `landing-rules.ts` + `LANDING_SLUG_ALIASES`, `resolveLandingRuleBySlug`, `sessionMatchesLandingSlug`; dto импортирует rules/matchers; `buildPublicLandings` → `public-city-landings.ts`.
- F5.1: catalog datetime → `public-datetime`; subcategories → `public-catalog.mapper`; city landings без dto.
- JsonLd/SEO фикс (event/help вне SiteLayout) + smoke `scripts/smoke-rich-results.mjs`.

### Проблемы
- `mapGroupedPublicSession` / city venue hub ещё в dto.js (F5.3).

---

### Наблюдения
- Prod Next на МСК снова залипал на `:3001` (catalog SWR) - `systemctl restart daibilet-web` вернул ответы.
- Event/help JSON-LD были только в RSC flight (escaped), не в View Source: `<script ld+json>` внутри `SiteLayout` → client boundary (`SiteProviders`/`SelectedCityProvider`). City/venue иногда проходили, event/help - нет.
- www → non-www: nginx 301 на `https://daibilet.ru/` (2.3.1 ok).

### Решения
- SEO: `JsonLdScripts` вне `SiteLayout` (event/help/city/venue); smoke `scripts/smoke-rich-results.mjs` (walk `@graph`).
- F5.1: канон saleable/price в `catalog-availability.ts` (`isSaleableEventForPublic` alias); datetime → `public-datetime.ts`; offers → `public-offers.ts`; `dto.js` импортирует/реэкспортирует; `public-event.dto.ts` без saleable/datetime/offers из dto.js.
- Tasktracker: 2.2.5/2.3.1; F5.1 🔄 (helpers done; catalog/city/venue builders ещё из dto.js).

### Проблемы
- Полный F5.1 (pure Prisma public catalog/city/venue) остаётся следующим шагом.
- При выносе datetime случайно перезаписали существующий `public-datetime.ts` без `prismaWallTimeToIso` → API crash loop; сразу смержили Prisma wall-time helpers + datetime API; API снова `200`.
- `.next` SEO-fixкс собран на СПб и выкачен на МСК; localhost smoke: home/city/help/event/venue LD ok.

---
## 2026-07-30 - Landing buy CTA missing (lean DTO stripped URLs)

### Наблюдения
- На всех лендингах пропали рабочие кнопки покупки: `toPublicCatalogListItem` отдавал lean-карточки без `purchaseUrl`/`widgetUrl`, а `LandingPurchaseButton` без URL не открывает TC/TEP виджет.

### Решения
- Вернули purchase URL fields (+ slot.purchaseUrl) в `public-catalog-list-item.ts`.
- Rebuild `.next` на СПб → deploy МСК; smoke: river/bus payload снова с `purchaseUrl`/`widgetUrl`/`account.teplohod`.

### Проблемы
- Таблица `Landing` пуста и на МСК, и на СПб (0 rows) - managed landings API 404; rule-based path из dto.js работает.

---

## 2026-07-30 - PERF.E5 + SEO-хвост Этап 1–2

### Наблюдения
- Event DTO всё ещё тянул `getPublicCatalogSessions` ради related/group/landing - дорого на cold.
- Venue JSON-LD Place уже был; UI-крошки venues/locations обрывались на городе без title.

### Решения
- PERF.E5: `loadPublicEventDto` без full catalog; related через `loadRelatedSessionsFromDb` (city/category + upcoming).
- `/about`, footer link; `VenueBreadcrumbsNav`; heading «Варианты билетов»; Tasktracker 1.1.4/1.2.6/1.4.1/1.4.4/2.2.4/PERF.E5.
- F5.0 карта: [phases/f5-retire-dto-map.md](./phases/f5-retire-dto-map.md).

### Проблемы
- API PERF.E5 live на МСК: cold/refresh event ~0.14–0.50с, cache ~2ms, related=12. Next SSR event page подхватит после `web:build`/deploy.
- Web UI (about/crumbs/variants): source на `/opt/daibilet`, live HTML после rebuild.
- F5.1+ не стартовали (по плану после E5).

---

## 2026-07-30 - MIG.8: СПб decommission public → finance+staging host

### Наблюдения
- DNS prod уже на МСК; СПб всё ещё крутил web/api + `daibilet-tc-catalog-sync.timer` + crontab (tep-catalog, tc-orders, reviews, blog digest) — риск двойного sync в разные PG.

### Решения
- Snapshot: `/root/backups/daibilet-pg-mig8-20260730.dump` (27M, sha256) + `daibilet-pg-volume-mig8-20260730.tgz`.
- `systemctl stop/disable` `daibilet-web`, `daibilet-api`, `daibilet-tc-catalog-sync.timer`.
- Crontab prod-jobs закомментированы `# MIG.8 disabled`; backup `crontab-before-mig8-20260730.txt`.
- PG Docker + nginx оставлены. Catalog truth = МСК. Docs: [spb-finance-host.md](./spb-finance-host.md).

### Проблемы
- Staging units по-прежнему disabled (подъём только по явному запросу).
- Finance PG должен быть отдельным volume, не shared с catalog MSK.

---

## 2026-07-30 - TC widget z-index: overlay above iframe shell

### Наблюдения
- Owner FURY на `/events/tc-699c76d7…-mavzolei-lenina…`: нативный TC снова «не выше всех».
- BUY.8b (`988ae7e`) уже убрал CheckoutModal вокруг TC; баг stacking остался отдельно.
- `tcwidget.js`: backdrop `#tc-widget-overlay` (inline ~1e9+3) + classless fixed shell (inline ~1e9+4) с `iframe.tc-widget-frame_popup`.
- Наш CSS поднимал `#tc-widget-overlay` до `2147483000 !important`, а shell оставался на inline `1000000004` → затемнение TC поверх iframe, клики/видимость «под» chrome.

### Решения
- `globals.css`: overlay `2147482990`; shell через `body > div:has(iframe.tc-widget-frame_popup)` + frame = `2147483000`; Fancybox отдельно.
- `TcWidget.client`: `liftTcWidgetLayers()` при появлении виджета (+ re-lift 50/300ms).
- `PurchaseOpeningFeedback`: детект shell через `:has(iframe.tc-widget-frame_popup)`.

### Проблемы
- ~~Нужен prod smoke URL мавзолея после deploy.~~ ✅ `2ec37f4` live: CSS `2147482990` + `:has(iframe.tc-widget-frame_popup)`, JS `liftTcWidgetLayers`, HTTP 200.

---

## 2026-07-30 - Saleable ≠ display price (≥100)

### Наблюдения
- Owner clarification: «не писать цены в карточках, если ниже 100р» - не «не запускать в продажу».
- Public sale gate (`isSaleableEventForPublic` + SQL `saleable` CTE + lean catalog filter) требовал `priceFrom >= 100` → события с null/low display price (~61 «Без цены») не попадали в каталог/лендинги даже при виджете и расписании.

### Решения
- `isSaleable` / catalog include: widget + upcoming/open schedule; цена опциональна.
- `hasDisplayPrice` / UI: «от N ₽» только при ≥100; иначе CTA без цены («Купить» / «Купить билет»), без «Бесплатно»/«Скоро»/«Цена уточняется».
- Admin chip `priceBlocked` / «Без цены» оставлен как метрика display-price gap, не block from sale.
- SEO/meta: по-прежнему не выдумывать «от 100» (`formatRealPriceRub` / `appendRealPriceToDescription`).

### Проблемы
- Из ~61 «Без цены» в каталог вернутся те, у кого purchaseReady + расписание; без виджета/сессий по-прежнему отсекаются.

---


### Наблюдения
- Owner screenshot (Антон Борисов / стендап): поверх нативного TC UI видна наша оболочка CheckoutModal («Покупка билета», «В новой вкладке», footer «Не открывается?»).
- BUY.8/BUY.9 временно открывали `ticketscloud.com/v1/widgets/common` в iframe внутри нашей модалки - TC уже полный виджет со своим header/close/promo.
- TEP `account.teplohod.info/order/...` - обычная страница, не самодостаточный popup-виджет, iframe-shell уместен.

### Решения
- TC: снова `tcwidget.js` (`openTcWidget` / `TcWidgetButton` / `TcSessionSlot`); fallback только `_blank`/popup URL без фейкового chrome вокруг чужой модалки.
- TEP: `CheckoutModal` оставляем (event + landing).
- Комментарий в `CheckoutModal`: TEP-only; не оборачивать TC widgets/common.

### Проблемы
- Нужен prod deploy + smoke TC event (Борисов) и один TEP river CTA.

---


### Наблюдения
- Owner: «не починил» второй ряд слотов после `618fdd6` (UI limit 4).
- Prod SPB `f7b9b0d`: UI уже `COMPACT_MOBILE_SLOT_LIMIT=4` + grid 2×2; API всё ещё режет слоты.
- `/api/public/events`: max `upcomingSlots.length=3` при `sessionCount` 20-63.
- Двойной cap: `hydrateCatalogUpcomingSlots(..., LIST_SLOT_PREVIEW_LIMIT=3)` + `toPublicCatalogListItem` `slice(0, 3)`.
- Чипы исключают primary (`collectAllDisplaySlotLabels`) → из 3 слотов API остаётся **2 чипа** = один ряд 2×2.

### Решения
- `LIST_SLOT_PREVIEW_LIMIT = 5` (export из list-item, import в catalog dto).
- `CATALOG_CARD_SLOT_TARGET = 5` (hydrate до primary+4 chips).
- UI/format без изменений: узкие 2×2 до 4, wide 3 в ряд, `30 июл, 13:20`.

### Проблемы
- Поднимать только UI-лимит бесполезно, пока list DTO режет до 3.

---

## 2026-07-29 - Event page perf: owner отложил на post-MSK

### Наблюдения
- Cold `/events/[slug]` всё ещё тяжёлый из-за catalog path; quick win `hydrateSlots: false` уже в коде (`132b6a6`).
- Follow-ups: warm top-100–300, `generateStaticParams` top-N, развязка event DTO от full catalog.

### Решения
- Owner: не делать до переезда prod на МСК VPS. Задачи PERF.E3–E5 / E4b в Tasktracker с меткой «после переезда на МСК».
- PERF.E3 на МСК: выкатить/проверить; E4/E4b - первые quick wins после cutover; E5 - средний приоритет, крупнее.

### Проблемы
- Пока DNS на СПб - verify cold TTFB post-hydrateSlots на live prod не в приоритете относительно MIG.*.

---

## 2026-07-30 - MSK cutover live + build/PERF event pages

### Наблюдения
- DNS A `daibilet.ru` → `201.24.125.184` (публичные резолверы); post-smoke `/` `/events` `/blog` landings stats = 200 с МСК.
- PERF.E3 на МСК: cold event TTFB ~0.12–0.17с, warm ~8ms (`hydrateSlots: false` уже в DTO).
- `next build` на МСК ранее падал на fonts.googleapis DNS - деплой через pull+build с heap 5120 / cpus retune.

### Решения
- Build retune: без `cpus:1`/`workerThreads:false`, SSG concurrency 2, heap 5120Mi.
- PERF.E4b: `generateStaticParams` top-N (default 200, `EVENT_SSG_TOP_N`).
- PERF.E4: `scripts/warm-top-event-pages.mjs` + hook в `deploy-prod-next.sh`.
- PERF.E5 отложен (архитектура event без full catalog).

### Проблемы
- AAAA СПб / IPv6 на МСК - follow-up.
- СПб hot-standby ещё держим (MIG.8).

---

## 2026-07-30 - MSK cutover prep + build limits retune

### Наблюдения
- МСК standby готов: PG restore, код `2ec37f4`, `.next` со СПб, TLS/nginx, cron; smoke через `--resolve …201.24.125.184` = 200.
- DNS `daibilet.ru` всё ещё `213.171.7.16` (СПб) - cutover ждёт панель Timeweb.
- `next build` на МСК падал на `getaddrinfo EAI_AGAIN fonts.googleapis.com` (исходящий DNS/фильтр); обошли копией `.next` со СПб.
- Лимиты `cpus:1` / heap 2560Mi с SPB 3.8Gi на МСК 8Gi будут тормозить деплой.

### Решения
- Retune (локально, до push): убрать `workerThreads:false`+`cpus:1`; `staticGenerationMaxConcurrency: 2`; heap/`NODE_OPTIONS` build → 5120Mi (`next-build.mjs` + `deploy-prod-next.sh`).
- PERF.E3–E5 уже в Tasktracker; после DNS - verify E3, затем warm/top-N/E5.

### Проблемы
- Без смены A-записей на `201.24.125.184` трафик остаётся на СПб.

---

## 2026-07-29 - SSH МСК + снимок перед переездом СПб→МСК

### Наблюдения
- Старый МСК IP `81.19.135.200`: ICMP OK, TCP 22 с дома и LTE = `filtered`; на eth0 tcpdump во время проб = 0 packets при живом sshd `:22`, ufw off, INPUT ACCEPT.
- Timeweb сменил публичный IP на `201.24.125.184` (hostname `msk-1-vm-5a5i`). SSH с ключом `daibilet_msk80_key` OK; локальный alias `daibilet-msk`.
- СПб prod `213.171.7.16` остаётся DNS live (`daibilet.ru`), git `618fdd6`, PG Docker healthy, TLS OK, RAM 3.8 Gi.
- МСК уже имеет `/opt/daibilet` (git `8588ccf`), `daibilet-web`/`daibilet-api`/`nginx` active, RAM 7.8 Gi; **нет** Postgres/`5437`, **нет** `:443`/letsencrypt; API stats local 500.
- Локальный клон `daibilet-push` с битым `.git` (пропал HEAD/часть objects); рабочий клон для коммитов - `daibilet-deploy-fix`.

### Решения
- Документы: `docs/migration-spb-to-msk.md`, обновлены `current-state.md` / Tasktracker / эта запись.
- Cutover не начинать, пока на МСК нет PG+restore, TLS и SHA ≥ prod.

### Проблемы
- DNS/трафик ещё на СПб; МСК - тёплый standby, не prod.
- Не коммитить `.env` и дампы БД.

---

## 2026-07-29 - TC catalog sync: false ALERT importedEvents

### Наблюдения
- Nightly `tc-catalog-sync.sh` писал ALERT `importedEvents missing` при реальном успехе (worker exit 0, `importedEvents` есть в полном логе).
- Проверка делала `tail -80` / `tail -20` по shared `/var/log/daibilet/tc-catalog-sync.log`; covers/warm/revalidate после импорта выталкивали JSON summary из окна.

### Решения
- `deploy/cron/tc-catalog-sync.sh`: stdout/stderr воркера в per-run `RUN_LOG`, проверка `importedEvents` и `exitCode` по нему + `SYNC_EXIT`; затем `cat` в stdout для systemd/cron append.
- `deploy/scripts/verify-tc-catalog-sync.sh`: срез лога от последнего `start worker tc-catalog` за сегодня (awk), без `tail -120`.
- TEP cron без аналогичного `tail -80` check - не меняли.

### Проблемы
- Нужен pull/deploy скрипта на `/opt/daibilet`, иначе следующий nightly снова ловит старый false alert.

---

## 2026-07-29 - Концерты: исключить автобусные туры

### Наблюдения

- На /kontserty (concerts-genre) в ленте был автобусный тур Вечерняя симфония Петербурга - на автобусе (	c-6a4276fc65a592a5d04b0e1a-vechernyaya-simfoniya-peterburga-na-avtobuse).
- Категория Экскурсии, тег/subcategory Автобусные туры; матч шёл по keyword симфон в title.

### Решения

- Dual-edit landing-rules.ts + runtime dto.js: для concerts-genre excludeTags Автобусные туры / Автобусные экскурсии, excludeKeywords автобус/автобусн (+ venue в excludeKeywordFields).
- Тест: bus + «симфония» не попадает в концерты; обычный симфонический концерт остаётся.

### Проблемы

- До F5 правила всё ещё дублируются вручную в dto.js.

---

## 2026-07-29 - EventCard: meta под фото + слоты 2×2 / 3 в ряд

### Наблюдения
- Owner (mobile screenshot): строка ★ / длительность / город была под названием; ожидание - сразу под фото над title (как в list/`EventCardHorizontal`).
- В git с Clean UI title всегда был выше meta на вертикальной карточке; Horizontal уже meta→title. `33df97f` только прятал meta на compact mobile, порядок не менял.
- Слоты: flex-wrap давал то 2 в ряд, то столбик; weekday в `dateLabel` съедал ширину.

### Решения
- `EventCard`: порядок Image → meta → title → tags → schedule/address → slots → footer. Schedule+адрес из mobile UX сохранены; tags на compact mobile по-прежнему `hidden sm:flex`.
- Слоты: узкая/`compact` - 2×2 до 4 и на mobile, и на sm+; широкая/default + Horizontal - до 3 в одну линию; формат `30 июл, 13:20` без weekday; «ещё N».

### Проблемы
- Нет. Коммит/пуш/deploy через `daibilet-deploy-fix`.

---

## 2026-07-29 - Blog cards: mid-sentence «...» от flex-1 + line-clamp

### Наблюдения
- Owner (скрин `/blog`): в карточках «почему...» / «не...» посреди фразы, хотя текст продолжается на следующей строке.
- Excerpt в MD без троеточий; JS-truncate тоже не добавляет `...`.

### Решения
- `BlogPostCard` default/small: убрать `flex-1` с `<p class="line-clamp-*">`, spacer `<div className="flex-1" />` отдельно (как уже для large в H.8h).
- Meta остаётся внизу карточки; ellipsis только при реальном overflow на последней видимой строке clamp.

### Проблемы
- Нет. Коммит/пуш/deploy через `daibilet-deploy-fix` (push worktree сломан).

---

## 2026-07-29 - Blog excerpt UX + column SEO desc

### Наблюдения
- Owner: на `/blog/[slug]` excerpt дублировал лид body; на `/blog` large/featured склеивали excerpt + lead (`expandListingExcerpt`).
- Meta description колонок начинался с «Колонка {Имя}:» / «Авторская колонка {Имя}:».

### Решения
- Article hero без `description` (excerpt только для listing/SEO).
- Listing: excerpt only; large/featured - body OR excerpt, без склейки.
- `stripColumnMetaPrefix` в SEO metadata, social-preview, upsert; почищены frontmatter/static cards.

### Проблемы
- В temp `daibilet-push` object store сломан - коммит/пуш/deploy через `daibilet-deploy-fix`.

---

## 2026-07-29 - Blog polish batch (все кроме 5 owner)

### Наблюдения
- Owner уже переписал 5 статей (Сочи, Калининград, Красноярск, Ярославль, Нева/каналы) - их не трогали.
- Остальные PUBLISHED материалы в `content/blog` приведены к тому же редакционному тону: короче лиды, без AI-штампов, только дефис `-`, 1-2 inline-шорткода.
- У ~19 постов не хватало cover/inline файлов на диске при `PUBLISHED` в frontmatter.

### Решения
- Причёсаны 37 PUBLISHED (и затронутые тексты) статей; 2 HIDDEN оставлены без тяжёлой переписки.
- Сгенерированы недостающие cover + inline (+ inline-2) в `apps/public/public/images/blog/{slug}*.jpg`.
- Коммит/пуш через чистый clone `daibilet-deploy-fix` (object store в temp-push сломан).

### Проблемы
- Claude CLI в среде не вызывался: полировка агентами Cursor в духе owner-samples + editorial persona guides.

---

## 2026-07-29 - Event page buy: CheckoutModal (не `_blank`)

### Наблюдения
- Owner URL `/events/...-910` (`evt_tep_910`, TEPLOHOD): «открывается не в модалке» - новая вкладка.
- Root: event page держал `TeplohodWidgetEmbed` + hero `openTeplohodWidget`; при сбое Fancybox `bindTeplohodBuyFallback` → `window.open` через 700ms. Лендинги уже на `CheckoutModal` (BUY.8).

### Решения
- `EventBuyCard` / `EventHeroBuyButton` → `CheckoutModalButton` с `resolveTeplohodCheckoutUrl` / `buildTcCheckoutUrl` (как landing).
- `TcSessionSlot` / `TcWidgetButton` → тот же `CheckoutModal` (iframe + «В новой вкладке»); z-index модалки `2147483000`.
- Landing `LandingPurchaseButton` без изменений.

### Проблемы
- Catalog hidden-anchor path (`openTcWidget`) ещё может popup - follow-up; event page smoke: `...-910`.

---

## 2026-07-29 - Landing buy: instant CheckoutModal iframe

### Наблюдения
- Owner: «Купить» на лендингах не должен ждать lazy embed → Fancybox → `window.open(_blank)`.
- `account.teplohod.info/order/event-order` без `X-Frame-Options` / `frame-ancestors` в ответе HEAD - iframe допустим.
- `ticketscloud.com` homepage: `Content-Security-Policy: frame-ancestors 'none'`; widget URL может отличаться - в модалке всегда CTA «В новой вкладке».
- В репо уже был неподключённый `CheckoutModal.client.tsx` (с 2a75cea).

### Решения
- `LandingPurchaseButton` → `CheckoutModalButton` с `resolveTeplohodCheckoutUrl` / `buildTcCheckoutUrl` (без TeplohodWidgetButton / TcWidgetButton на лендингах).
- Modal: мгновенный shell «Открываем оплату…», iframe, Escape/backdrop, z-100000; через 4.5s без onLoad - баннер + deep-link; footer всегда.
- Event page hero / vendor embed path без изменений; catalog cards без `landingActions` по-прежнему ведут на event page.

### Проблемы
- Если TC widget URL тоже с `frame-ancestors 'none'`, iframe будет пустым после onLoad - UX опирается на «Открыть в новой вкладке». Нужен smoke на живом TC-лендинге.

---

## 2026-07-29 - Prod Network: /_next/image 500/504 + reviews 404

### Наблюдения
- Owner DevTools на daibilet.ru @`33df97f`: много `/_next/image` 500/504 (GCS, api.teplohod.info, локальные `/images/events`) и `GET /api/reviews/events/...-706` → 404.
- `ticketscloud-prod.storage.googleapis.com` не в `remotePatterns` → Next `"url" parameter is not allowed` (400); в каталоге чаще yandex twin.
- TEP без `dirtyAlias` → upstream HTML 400 → Next `"upstream response is invalid"`.
- 504/502 в nginx: `upstream timed out` / `recv() failed` на next-server во время/после UX-deploy (cold image cache + ~1GB RSS next на 3.8Gi VPS).
- Reviews route живой: по `evt_tep_706` 200; по public latin slug 404, потому что в DB slug кириллический (`sourceSlug`).

### Решения
- `remotePatterns`: добавить `ticketscloud-prod.storage.googleapis.com`.
- `resolveReviewEvent`: TEP public slug → `evt_tep_{id}` + match `publicSlugLite`.
- `isPlaceholderEventImageUrl`: TEP URL без `dirtyAlias` считать placeholder (не гнать в optimizer).

### Проблемы
- Пик 504 после рестарта next остаётся capacity-проблемой; нужен deploy фиксов + при необходимости unoptimized/CDN bypass для тяжёлых remote covers.

---

## 2026-07-29 - Fix TEP/TC widget overlays + column badge

### Наблюдения
- На /events Fancybox TEP открывался под PurchaseOpeningHost / venue modal и был некликабелен.
- На лендингах CTA мог уходить в битый TC-path из-за tep id в extractTcEventIdFromSession; fail-shell блокировал повторные клики.
- Owner: бейдж колонок «От автора», курсивная подпись в конце статьи.

### Решения
- Vendor Fancybox/TC z-index 2147483000; venue modal z-99980; shell auto-dismiss при появлении checkout; isPurchaseOpeningActive только opening.
- LandingPurchaseButton: TEP первым; extractTcEventIdFromSession не возвращает teplohod ids.
- Column UI: badge «От автора» + signature `{name}, штатный корреспондент Дайбилет`; .cursorrules п.8.

### Проблемы
- Локальный worktree daibilet-push с битым git object store - коммит из свежего clone.
## 2026-07-27 - Prod 404: Былинный Берег (past event + search)

### Наблюдения

- URL `/events/tc-6a08d60c3aa2e7a8469953dc-былинныи-берег-2026` (и latin/short варианты) → HTTP 404.
- В prod DB событие есть: `evt_6a08d60c3aa2e7a8469953dc`, status `READY`, slug с кириллицей `былинныи` (без й).
- Session: `2026-07-24 06:00` → `2026-07-25 21:00` (UTC). Сегодня 2026-07-27 → прошло.
- `buildPublicEventDto` → `isSaleableEventForPublic` false → `null` → Next `notFound()`. Это не slug/encoding bug.
- Каталог `/api/public/events?q=былинный` уже не отдаёт past; header search `/api/public/search` отдавал мёртвую ссылку.
- Блог `fentezi-fest-bylinnyy-bereg` ≠ TC event; Fantasy Fest (`6a0a1d4d…`) жив (200).

### Решения

- Search: фильтр upcoming/saleable session в `public-search.dto.ts` (align с gate страницы).
- Blog: убрать deep-link на прошедший Былинный берег, вести на Fantasy Fest (latin slug).
- Архив past-event page вместо 404 - решение owner (сейчас by design).

### Проблемы

- SEO soft-404 для `isIndexable` past events остаётся, пока нет archive mode.

---

## 2026-07-27 - Fix: 2ГИС route URL (directions)

### Наблюдения

- Prod-регрессия после смены Google→2ГИС: `routeSearch/rsType/car/to/{lon},{lat}` редиректит на `/spb` без точки назначения.

### Решения

- URL: `https://2gis.ru/directions/tab/car/points/|{lon},{lat}` (актуальная схема directions, from пустой).

### Проблемы

- Старый `routeSearch` на вебе 2ГИС больше не прокидывает координаты.

---

## 2026-07-27 - Venue routes: Google Maps → 2ГИС

### Наблюдения

- На страницах площадок (`LocationVenueLayout` / `InstitutionVenueLayout`, web + public) кнопка маршрута вела на Google `maps/dir`.
- Рядом уже был labeled deep-link «Яндекс.Карты»; Google в UX не назывался.
- Для РФ аудитории 2ГИС предпочтительнее Google Maps.

### Решения

- Заменили destination URL на `https://2gis.ru/routeSearch/rsType/car/to/{lon},{lat}` (порядок lon,lat).
- Хелпер `build2gisRouteUrl(lat, lng)` в `apps/web` и `apps/public` (`lib/maps.ts`).
- Подпись кнопки: «Маршрут в 2ГИС» (по аналогии с Яндексом). Кнопки «открыть на карте» / Яндекс не трогали.

### Проблемы

- Нет. После commit - deploy-prod-next на `feat/next-monorepo`.

---

## 2026-07-27 - Blog: list ISR cache, hero minimal, pack C deploy

### Наблюдения

- /blog на prod до деплоя: Cache-Control private no-cache, TTFB ~1.08s; hero со stat card и подпиской newsletter.
- Pack C (11 статей + hover captions) уже в 1024610; остался код perf + HeroLayout как у cities.

### Решения

- cached-blog-data.ts + unstable_cache 300s, tag blog-list, без await searchParams на page shell.
- BlogListHero -> HeroLayout minimal; убраны подписка и stat card; skeleton в BlogListView/page.
- revalidate-next-blog.js + internal revalidate route: tag blog-list.

### Проблемы

- После push: deploy-prod-next.sh, затем npm run blog:upsert на prod для pack C MD.

---

## 2026-07-27 - Blog: снять open-air с Hero, перепрошить Макса (Акунин)

### Наблюдения

- Owner: колонка `open-air-festy-vyhodnoi-ru` («ужас какой») - сленг Птушкина/Perito не зашёл; нужна другая статья в Blog Hero и литературный register Макса (в духе Акунина).

### Решения

- `open-air-festy-vyhodnoi-ru` → `status: HIDDEN` (MD + migration upsert).
- Blog Hero (`isFeatured`) → `fentezi-fest-bylinnyy-bereg` (фесты на выходные, cover + inline, longform).
- Полный rewrite `fentezi-fest-bylinnyy-bereg.md`: изящная проза, «вы», без сленга и штампов.
- `01-max.md` + `personas.json`: прототип Борис Акунин вместо Птушкина; убраны канон «Хей, читатели!» / «Мир лучше видеть…».
- Migration `20260727120000_blog_featured_fentezi`: isFeatured swap + HIDDEN open-air.
- Исправлены карточки `blog-posts.ts` (web+public) для fentezi (были чужие title/excerpt).

### Проблемы

- Commit → deploy-prod-next → migrate → `blog:upsert` ×2 slug + revalidate `/blog`.

---

## 2026-07-27 - Event description: TC comma lists and section headings

### Наблюдения

- Owner: `tc-6a172134…reki-i-kanaly…` на prod выглядел как «сырое» описание: только `<p>`, без H3/UL.
- Фикс `f92b1d6` (Teplohod marker-less newline lists) на prod работает - formatter вызывается в `EventDescription` SSR.
- Ticketscloud отдаёт другой формат: заголовок секции без двоеточия (`Основные достопримечательности`), список достопримечательностей одной строкой через запятую, длинные `Маршрут:` / `Продолжительность:`.
- `tc-sync` перезаписывает `Event.description` сырьём (`description = excluded.description`); admin override защищён `EventOverride.description` + `event-import-guard.js`. Форматирование - только at render time, persist formatted HTML не нужен.

### Решения

- `parseCommaSeparatedListAfterIntro`: «…увидеть X, Y, Z и многие другие…» → `<p>` intro + `<ul>`.
- `parseLabelValueLine`: длинные `Label: value` → `<h3>` + `<p>` (Маршрут, Продолжительность).
- `parseAttentionLine`: `Внимание! …` → `<h3>Внимание</h3>` + абзац.
- Расширен whitelist заголовков (`основные достопримечательности`, …); em-dash → `-` в user-facing copy.
- Тесты: TC river sample + regression Kremlin Teplohod UL.

### Проблемы

- Commit + deploy-prod-next; smoke `tc-6a172134…` + Kremlin cruise на `<h3>`/`<ul>`.
- **Prod @`f5d85f6`:** deploy EXIT:0; `tc-6a172134…` SSR 4×`<h3>` + `<ul>` 15 landmarks; Kremlin cruise regression 3×`<ul>` 4×`<p>`.

---

## 2026-07-27 - Roadmap batch: SYNC.4, SEO handoff, Metrika, BUY.5 lazy TEP

### Наблюдения

- **SYNC.4:** prod timer `daibilet-tc-catalog-sync.timer` active; LAST **2026-07-27 03:20:01 UTC** → `importedEvents:21145`, `worker.job.done exitCode:0` (~4m40s). NEXT **2026-07-28 03:20 UTC**. Script `+x`, `NODE_OPTIONS=--max-old-space-size=1536` в unit.
- **SEO.IN2/IN3:** `robots.txt` на prod ссылается на `https://daibilet.ru/sitemap.xml`. Переобход и добавление sitemap в кабинеты - только владелец.
- **CV.2b-e:** код шлёт 3 цели (`product_card_click`, `select_tickets`, `catalog_interstitial_click`); `purchase_success` намеренно не шлётся без widget callback.
- **BUY.5:** каждый `TeplohodWidgetButton` монтировал hidden `TeplohodWidgetEmbed` → N× XHR `widget/embed` на крупных лендингах (~86 на river moscow).

### Решения

- SYNC: `deploy/scripts/verify-tc-catalog-sync.sh` (утренний post-check); `tc-catalog-sync.sh` exit 1 если в хвосте лога нет `importedEvents>0` или `exitCode:0`.
- SEO: `docs/webmaster-top15-checklist.md` - sitemap GSC/Вебмастер + TOP-15 URL + пошаговый переобход.
- Metrika: `docs/metrika-goals-checklist.md` - goal ids, wired files, CODE vs MARKETER, Webvisor SOP.
- BUY.5: `TeplohodWidgetButton` prop `lazyEmbed=true` (default) - embed только на первый клик; script prefetch на hover сохранён; `openTeplohodPurchase` / Fancybox fixes (ac91b0f/b02f657) без изменений.

### Проблемы

- **28.07 03:20 UTC** ещё не прошёл - утром 28.07 запустить `verify-tc-catalog-sync.sh` на prod.
- Deploy BUY.5 + sync script alert после commit. ✅ prod @`59fd4d8` EXIT:0 (2026-07-27).

---

## 2026-07-27 - PERF.OOM: build memory tuning (4GB VPS)

### Наблюдения

- `next build` на 2 vCPU / 3.8Gi: OOM (137) при static gen; orphan jest-worker уже закрыт PERF.D1.
- `cpus: 1` и `staticGenerationMaxConcurrency: 2` были в next.config; не хватало `workerThreads: false`, source maps off, явного heap cap.

### Решения

- PERF.OOM1: `next.config.ts` — `workerThreads: false`, `productionBrowserSourceMaps: false` (сохранены PERF SSG flags).
- PERF.OOM2: `apps/web/scripts/next-build.mjs` + deploy `NODE_OPTIONS=--max-old-space-size=2560` перед `web:build`.
- PERF.OOM3: `deploy-prod-next.sh` — idempotent `vm.swappiness=10` (+ persist `/etc/sysctl.conf` если root/sudo).

### Проблемы

- Deploy smoke после ship; при нехватке RAM на build — снизить concurrency, не только heap.
- **Prod @`9da574d` (includes `073f1d3`):** deploy EXIT:0; `vm.swappiness=10`; build `NODE_OPTIONS=2560`; event `s-maxage=300` (не no-store).

---

## 2026-07-27 - Event page ISR + deploy orphan jest-worker reap

### Наблюдения

- `/events/[slug]` имел `revalidate=300`, но без `generateStaticParams` и без Next Data Cache на Prisma DTO → cold SSR + `Cache-Control: private, no-store` (нет `x-nextjs-cache`).
- Metadata и page вызывали `buildPublicEventDto` дважды; page ещё ходил в `prisma.review` без cache.
- `/events` list: `generateMetadata` ждал `searchParams` → no-store (PERF.L4).
- Orphan `jest-worker` (PPID=1) от aborted `next build` жгли CPU/RAM часами.

### Решения

- PERF.E1: `generateStaticParams() => []` + `dynamicParams=true`; `getCachedPublicEventDto` / `getCachedEventAggregateRating` через `unstable_cache` (tag `event-page`, 300s); общий helper для metadata+page.
- PERF.L4: metadata `/events` без `await searchParams` (канон unfiltered).
- PERF.D1: `deploy-prod-next.sh` reap orphan jest-worker/next-build с PPID=1 и cwd under `/opt/daibilet` до/после `web:build`.
- Revalidate: tag `event-page` + `clearPublicEventDtoCache` в internal revalidate.

### Проблемы

- ~~Smoke Cache-Control / HIT / orphan ps после exclusive deploy.~~ ✅ Prod @`c799c31` EXIT:0.
  - `/events/[slug]`: cold `x-nextjs-cache: MISS` ~1360ms → warm **HIT** ~16–19ms; `Cache-Control: s-maxage=300, stale-while-revalidate=…`
  - Build: `● /events/[slug]`, `○ /events` (5m); `/events` list HIT.
  - Reap pre/post signaled 0; post-deploy orphan jest-worker PPID=1 = 0.

---

## 2026-07-27 - Prod latency: orphan next-build workers + event no-store (RAM 8GB?)

### Наблюдения

- Owner: «очень долгий ответ» даже на `/events/[slug]`. Вопрос: апгрейд до 8GB?
- **Box:** 2 vCPU / **3.8Gi** RAM, swap 2G+4G. В момент аудита: used ~3.0Gi, **available ~0.5Gi**, swap used **1.3–1.4Gi**, load 2.8–3.4, `vmstat` si ~0.9–1.5 MB/s (thrashing), idle ~0%.
- **RSS:** `next-server` ~840–970Mi; `daibilet-api` (server-entry) ~350–630Mi; **два orphan `jest-worker` (PPID=1)** с `npm_lifecycle_event=build`, cwd=`apps/web`, живые **>25ч** с Jul 26 06:52/06:56: **~91% CPU каждый**, RSS **~700Mi + ~565Mi**.
- OOM за ~30д: **112** `Out of memory: Killed` (пики Jul 12–13 и cascade Jul 18: next-server и api). `oom-watch.sh` крутится каждые 5 мин.
- **TTFB (до kill):** `/` HIT s-maxage=300 ~0.14с; landing ISR ok; **event cold 1.5–2.6с**, warm 0.17–0.30с; везде на events **`Cache-Control: private, no-store`** (нет `x-nextjs-cache`). `/events` list тоже no-store (`generateMetadata` + `searchParams`).
- Код: `events/[slug]` имеет `revalidate=300`, но **нет `generateStaticParams`**, DTO/prisma без `unstable_cache` → фактический **dynamic SSR**. `buildPublicEventDto` дважды (metadata+page), in-process Map 5 мин; cold тянет `getPublicCatalogSessions()`.
- **После `kill` orphan workers:** available **~1.8–2.0Gi**, swap used ~0.6Gi, idle **100%**, warm event TTFB **~0.15–0.19с**. no-store на events остаётся.

### Решения

- Немедленный ops-fix: убить orphan jest-worker от оборванного `next build` (не деплой). Deploy должен reap child workers / не оставлять build PPID=1.
- Вердикт **8GB:** **YES, но не first step и не вместо ISR.** Steady-state после чистки на 3.8Gi терпим (~2Gi available); **8GB WHEN** нужны concurrent TC import/build без stop-web и чтобы убрать хронические OOM (112/мес). Больше swap alone не лечит CPU thrash.
- Альтернативы/приоритет: (1) reap orphan build + exclusive deploy flock; (2) ISR/`unstable_cache` для event detail + убрать searchParams из metadata `/events` или смириться с list no-store; (3) не гонять full TC sync днём рядом с web; (4) отдельный API/worker host позже; (5) апгрейд RAM как capacity insurance.

### Проблемы

- Event pages структурно без CDN/ISR HIT → каждый cold slug = тяжёлый SSR; под CPU pressure это секунды.
- Повтор orphan workers при следующем mid-deploy kill снова съест box.

---

## 2026-07-27 - TEP purchase shell: false fail over open Fancybox

### Наблюдения

- Owner UX: shell «Не вышло автоматически» при том, что Fancybox TEP («Шаг 1 из 4») открывается (bridges / night-bridges).
- Root cause: `waitForTeplohodFancyboxContent` требовал iframe внутри `.fancyboxtkt-*`; при контейнере без iframe (или late paint) путь делал второй click / `dismissTeplohodFancybox` + `window.open` вне user-gesture → `none` → fail toast поверх живого виджета.
- Prod был на `ac91b0f` (BUY.4 fast-path) - детекция успеха всё ещё узкая.

### Решения

- Success = `.fancyboxtkt-*` / `.fancybox-*` / `iframe[src*="account.teplohod.info"]` / body `fancyboxtkt-active`.
- `openTeplohodPurchase`: один click; ждать buy-link до ~4.5с; никогда не dismiss открытый Fancybox; popup только если checkout не виден.
- `failPurchaseOpening`: если vendor checkout уже в DOM - `complete` вместо fail.
- Smoke: `.tmp-measure/smoke-tep-no-fail.mjs` (CTA → checkout, fail shell не остаётся).
- Prod exclusive deploy `EXIT:0` @`b02f657`; smoke: moscow 57ms, `/sankt-peterburg/night-bridges` 43ms, `/rechnye-progulki/sankt-peterburg` 41ms; `failAt=null`, iframe `account.teplohod.info`.

### Проблемы

- N×hidden embed XHR на больших лендингах (BUY.5) по-прежнему удлиняет first-arm buy-link.

---

## 2026-07-27 - Owner audit: TEP widgets site-wide

### Наблюдения

- Prod HEAD `ac91b0f` (BUY.4) задеплоен; `daibilet-web` active; в бандле нет `TI_Tickets`, есть `ti-tickets-event-tickets-buy` / fancybox selectors.
- Поверхности: `LandingPurchaseButton` → `TeplohodWidgetButton` (лендинги, EventCard landingActions, blog buy, bridges); event page `TeplohodWidgetEmbed` + hero `openTeplohodWidget`; `CatalogPurchaseAnchors` есть в коде, но `suppressPurchaseAnchors=true` по умолчанию и нигде не снимается → на catalog/home hidden TEP DOM не монтируется.
- Lean list DTO (`toPublicCatalogListItem`) намеренно без `purchaseUrl`/`widgetUrl`; лендинги опираются на `purchaseProvider=TEPLOHOD` + `evt_tep_*` → client `resolveTeplohodCheckoutUrl` (`account.teplohod.info/order/event-order?widget_id&event_id`).
- Spot-check prod: river Moscow 46 TEP, dinner `/moscow/dinner-boat` 12 TEP, party 28 TEP, home data 24 TEP ids; event-683: `data-event-id="683"`, wrapper, checkout с `event_id=683`, dead `teplohod.info/event/*` = 0. `/uzhin-na-teplohode` → 404 (канон `/moscow/dinner-boat`). SPB river: 1 TEP (`evt_tep_1378`).
- Ложный алерт «URL без event_id»: в RSC `\\u0026event_id=` обрезался простым regex до `\`.

### Решения

- Конкурирующий exclusive deploy не стартовали (в полёте был `deploy-tep-open` → EXIT:0).
- Код не трогали: явных broken buy-link на проде нет; N×hidden embed остаётся known follow-up.

### Проблемы

- P1 perf: каждый `TeplohodWidgetButton` монтирует hidden embed → ~2× CTA на лендинге (list + card) → десятки XHR embed.
- P2 latent: `TeplohodWidgetEmbed` берёт raw `purchaseUrl` раньше `resolveTeplohodCheckoutUrl` (если когда-то придёт URL только с `widget_id`).
- P2 footgun: `extractTcEventIdFromSession` умеет вернуть tep id; TC-path сейчас gated `getTcWidgetIds`/provider.
- P3: `/uzhin-na-teplohode` 404; SPB river почти без TEP (контент/фильтр, не виджет).

---

## 2026-07-27 - TEP widget open latency on landings

### Наблюдения

- Prod `/rechnye-progulki/moscow`: 43 TEP CTA, 0 TC. Script `widget.js` ~471KB vs TC `tcwidget.js` ~21KB.
- После load: 86 hidden embeds + buy-links, но `window.TI_Tickets` всегда `undefined` (IIFE).
- Наш `openTeplohodPurchase` ждал `TI_Tickets.init` до 8с → shell ~20мс, vendor fail ~21с.
- Прямой click по `.ti-tickets-event-tickets-buy` → fancybox iframe ~50мс.
- Параллельно 86 XHR `account.teplohod.info/widget/embed/...` (waterfall ~секунды на page load).

### Решения

- `ensureTeplohodWidgetScript`: resolve на `onload`, без ожидания private API.
- `openTeplohodPurchase`: fast-path click по готовой buy-link; убран artificial 400ms sleep.
- Prefetch: `link rel=preload` + script inject на mount/hover (`prefetchTeplohodWidgetScript`).
- Lazy-embed отложен (vendor без public `init` не гарантирует late mount).

### Проблемы

- 86 embeds / XHR на большом лендинге остаются (отдельный follow-up: IntersectionObserver / shared host).
- Browser MCP tab недоступен; замеры через puppeteer-core + Chrome.

---

## 2026-07-27 - Owner audit: speed + pre-finance + full sync

### Наблюдения

- Warm speed после PERF.L1–L3 (`c433652`): landings `s-maxage=3600` + `x-nextjs-cache: HIT`, TTFB ~0.11–0.14с (median). `/` `s-maxage=300` HIT ~0.13с. `/rechnye-progulki` больше не outlier (~0.11с / 231KB).
- Остаточный `no-store`: только `/events` (PERF.L4: `generateMetadata` ждёт `searchParams`) - warm TTFB ~0.23–0.35с, size ~660KB. `/progulki-po-krysham` стабильно `MISS` при `s-maxage=3600` (TTFB всё равно ~0.12–0.13с) - anomaly, не blocker.
- Full sync habit: **TEP** ✅ (~307с, 214 events, providerLinks 20566, light revalidate + IndexNow). **TC** fetch ✅ (21155 events / catalog ~245MB), import ⛔: (1) `tc-catalog-sync.sh` без `+x` → nightly 23–26.07 часто `203/EXEC`; (2) import OOM на JSON.parse при MemoryMax=900M → `spawnSync` status=null маскировал SUCCESS; (3) daytime import с heap 1536 + stop-web зависал `idle in transaction` ~30+ мин и блокировал `tc:orders` - abort, web restored.
- Последний **реальный** TC import с `importedEvents:22106`: **2026-07-24 21:00 UTC**. Dual-edit `landing-rules.ts`↔`dto.js` **не** часть catalog sync (только ручной регламент до F5).

### Решения

- Prod hotfix: `chmod +x` tc-catalog-sync.sh; systemd unit `NODE_OPTIONS=--max-old-space-size=1536`, MemoryHigh/Max 1600M/2000M, TimeoutStartSec=45min.
- Code: fail-on-signal в `scripts/tc-sync.js` + `apps/worker/src/run-job.mjs`; git filemode `100755` на tc-catalog-sync.sh; unit в `deploy/systemd/`.
- Pre-финконтур: не стартовать Phase G, пока widget-first контур (TC orders cron, admin ExternalOrder, buy UX, legal/privacy, no fake metrics) стабилен; `purchase_success` без widget callback - не слать fake.

### Проблемы

- Nightly TC import после 24.07 фактически битый (OOM / noexec) при зелёном exitCode - нужна проверка после ближайшего 03:20 с новым MemoryMax/heap.
- Daytime full TC import на 3.8Gi конкурирует с api/orders - только maintenance window / stop-web + без overlap orders.

---

## 2026-07-27 - PERF.L1–L3: landings ISR + catalog SWR

### Наблюдения

- Speed audit: warm landings ~0.15–0.25с, но выбросы TTFB ~10–13с (`/rechnye-progulki`) на том же dynamic SSR-пути.
- `await searchParams` в `app/[segment]/**/page.tsx` форсировал `Cache-Control: private, no-store`, убивая `revalidate=3600` (нет `s-maxage` / `x-nextjs-cache: HIT`).
- `publicCatalogSessions` TTL 5 мин без SWR: после expiry запрос ждал полный rebuild (секунды).
- Fallback `buildPublicLandingPage` (без managed Landing) сериализовал весь matched catalog в RSC; managed уже lean+slice 48.

### Решения

- Landings: page/generateMetadata без `searchParams`; genre/tag читает `LandingPageView` с URL (concerts-genre).
- Catalog: SWR fresh 5м / stale 30м (`PUBLIC_CATALOG_STALE_MS`), soft-invalidate в `clearPublicDataCaches`; то же в `public-catalog.dto.ts`.
- Fallback landing DTO: `toPublicCatalogListItem` + `.slice(0, 48)`; stats по полному matched count.
- `/events` metadata с searchParams оставлен (SEO tradeoff, PERF.L4 deferred).

### Проблемы

- **Prod @`c433652`:** exclusive `deploy-prod-next` EXIT:0; build: `● /[segment]` / `● /[segment]/[segment2]` с `revalidate=1h` (было ƒ no-store).
- Smoke curl (warm): landings `Cache-Control: s-maxage=3600` + `x-nextjs-cache: HIT`; TTFB ~0.12–0.20с. `/rechnye-progulki` raw ~231KB (было ~705KB). `/` cold MISS ~12с после deploy, затем HIT ~0.12–0.14с (`s-maxage=300`).

---

## 2026-07-26 - CV.L-Content: GPT packs A-G (NY…bridges)

### Наблюдения

- Owner вставил JSON для new-year, planetarium, rooftops, country-tours, river-party, family-kids, bridges-night.
- Канон блоков: Hero → Tips/CW → Schedule → How-to → FAQ → Checklist → Reviews(real only).
- Fake reviews в seasonal/bridges data больше не рендерятся (`LandingReviews` = null).

### Решения

- `landing-content-packs.ts`: howTo/FAQ/checklist по slug; CW tips обновлены в `landing-context-widgets.ts`.
- NY FAQ в `seasonal-landings`; bridges tips/howTo/FAQ/checklist в `bridges-landing` + TonightTips/ShipChecklist.
- `LandingPageView`: CW перед расписанием; HowTo/FAQ/checklist из pack; chip match OR по запятым; без рейтинга/sold в default how-to.
- Дефис `-` only; family FAQ «30-45 минут».

### Проблемы

- Exclusive deploy: prod HEAD `b083a7e` (contains `2f3ccd9` 4-stat + content packs). Smoke OK: `/novyj-god`, `/saint-petersburg/planetarium`, `/saint-petersburg/night-bridges`.
- Follow-up: GPT FAQ имел приоритет ниже CMS FAQ block - fixed `b083a7e` (pack wins).

---

## 2026-07-26 - Owner lock: полный selling strip Hero (4 колонки)

### Наблюдения

- Owner: кусок countdown+CTA+4 stats на night-bridges - самый продающий; агенты ошибочно обрезали нижнюю полосу до 2 колонок (`md:max-w-lg`).
- Для НГ нужен тот же каркас: «До Нового Года / N дней» → «Выбрать событие · min-max» + «Смотреть афишу»; снизу 4 стата.
- На прочих лендингах верхний countdown может отсутствовать, **нижние 4 колонки обрезать нельзя**.

### Решения

- `BridgesHeroBlock`: восстановлены sold + 4.7 + диапазон (`md:grid-cols-4`); CTA bridges остаётся «от min».
- `LandingHeroCtaBlock`: full 4-stat strip; optional `leading` countdown; NY `priceOnCta=range`, labels «Выбрать событие» / «Смотреть афишу».
- Plan/Tasktracker: hero social-proof strip = owner lock (не путать с секцией Отзывы / real Review).

### Проблемы

- Нужен exclusive deploy; BUY optimistic shell - отдельно если ещё не на prod.

---

## 2026-07-26 - CV.L-Hero rollout: atmosphere for ALL landing profiles

### Наблюдения

- Owner: после thin CV.L-Hero (только SeasonalHeroCountdown + CSS tokens) bus/river/dinner/default всё ещё выглядели как плоский `gradient-hero-lovable` - gap vs night-bridges.
- `useAtmosphereHero = isBridges || countdownKind` блокировал rollout.

### Решения

- Shared `LandingHeroCtaBlock` + `resolveLandingHeroTheme`: dark atmosphere + amber CTA «от min» + honest stats (count + price range) для bus/river/dinner/seasonal/default (+ slug themes rooftop/planetarium/stage/family/country/party).
- Bridges: Palace hours countdown без изменений; fake ★/sold уже сняты.
- Seasonal: countdown days only; CTA в shared block.
- Buy UX: `PurchaseOpeningHost` + TC/Teplohod optimistic «Открываем оплату…» (продолжение).

### Проблемы

- CV.L-Order (перестановка Tips→Schedule→…) ещё as-is.
- Browser MCP click-smoke недоступен в среде - нужен prod smoke после exclusive deploy.

---

## 2026-07-26 - Landing buy: optimistic «Открываем оплату…» + honest bridges stats

### Наблюдения

- После `c984d8a` (pointer-events-none на `.tc-widget-trigger`) клики доходят, но UX всё ещё «мёртвый»: `await ensureTcWidgetScript` до 8с без UI; popup fallback после await часто блокируется браузером → silent no-op.
- Prod HTML night-bridges уже содержал `pointer-events-none` / `tc-widget-trigger`, но fake ★4.7 / «билетов продано» ещё на месте.

### Решения

- `PurchaseOpeningHost` + imperative begin/fail/complete: мгновенный shell «Открываем оплату…», double-tap guard, retry + deep-link fallback.
- `openTcWidget` ждёт видимый TC shell (MutationObserver), retry click, иначе popup; TC/Teplohod кнопки показывают «Открываем…».
- Bridges hero: убраны fake sold/4.7 - только рейсы + диапазон цен; `LandingReviews` скрыт (CV.L-debt) до real `Review`.
- Vendor overlays z-index выше opening shell (100050).

### Проблемы

- Browser MCP в этой среде не открыл вкладку для click-smoke - проверка через exclusive deploy + curl/manual.
- CV.L-Order (перестановка блоков 1-7) и L2/L3/L4b контент - ещё open.

---

## 2026-07-26 - Bridges hero CTA: от min, range only in stats

### Наблюдения

- После BR.PR1 (`ae3c86c`) оранжевая CTA «Выбрать рейс» показывала min-max (`990-2 490 ₽`) - owner хочет range только в стате «ДИАПАЗОН ЦЕН».

### Решения

- `BridgesHeroBlock` / sticky CTA: `formatPriceFrom` (`от {min} ₽`); stats cell: `formatMoneyRange` + `moneyRangeStatLabel`.
- Не пересекались с buy-button agent (TC trigger overlay) - только price label helpers / BridgesLandingSelling.

### Проблемы

- Deploy pending после merge.

---

## 2026-07-26 - Landing buy CTAs not clickable (TC trigger overlay)

### Наблюдения

- На лендингах («Купить» / «Выбрать» / widget open) CTA выглядят нормально, но клики не доходят до React `onClick` / виджет не открывается.
- Каталог уже прятал `.tc-widget-trigger` как `pointer-events-none fixed -left-[9999px]`; `TcWidgetButton` / `TcSessionSlot` на лендингах оставляли только CSS `position:absolute` + clip.
- Глобальный `button { min-height: 44px }` + intrinsic width по тексту лейбла раздували невидимый hit-box; N триггеров на schedule (desktop+mobile) перекрывали видимые кнопки.
- Analytics `select_tickets` (66676a0), ContextWidget, badges - не root cause.

### Решения

- Выровняли hidden TC triggers с каталогом: off-screen + `pointer-events: none` в web/public.
- Усилили `.tc-widget-trigger` в globals (fixed, min 0, pointer-events none) и исключили из touch min-height rule.
- `LandingPurchaseButton`: всегда `relative z-[2]` на видимом CTA (defense in depth). Goals `select_tickets` по-прежнему в `handleClick` до `openTcWidget`.

### Проблемы

- Prod landings кратко отдавали 502 во время чужих exclusive deploys (service stop mid-build). Smoke после deploy обязателен.

---

## 2026-07-26 - Night-bridges SEO lead: wall of text + triple pad

### Наблюдения

- Owner: `/saint-petersburg/night-bridges` SEO-блок «Разводные мосты: ночные рейсы» - стена текста, не на всю ширину container, финальная фраза про карточку события ×3.
- Корневая причина: seed `seo-listing-texts.ts` дотягивали pad-предложением до ~1000 символов (на части листингов 1-3×); UI `LandingSeoBottom` держал `max-w-3xl` внутри уже `container-page`.

### Решения

- Убрали pad из всех seed body; night-bridges переписали на 3 абзаца; остальные нарезали через `\n\n`.
- `sanitizeSeoListingBody` / `splitSeoListingParagraphs` - runtime защита от повторного glue; `LandingSeoBottom` на полную ширину контейнера (`max-w-none`, без `max-w-3xl`).
- Не трогали `LandingPageView` (parallel seasonal/buy-button) - только SEO data + SeoBottom.

### Проблемы

- Deploy отложен: dirty `LandingPageView`/`globals.css` у другого агента; exclusive deploy после их merge/smoke.

---

## 2026-07-26 - Owner UX: Hero-first landing unification (CV.L-Hero)

### Наблюдения

- Owner стартует унификацию с Hero: typography + atmosphere как у night-bridges, адаптировать по категории; для NY/seasonal countdown в **днях**, не клон часов до Дворцового.
- Канон блоков: Hero → Советы → Расписание → Как выбрать → FAQ → Attention → Отзывы (только real).
- Bridges H1 «сегодня, дата» - осознанно (ночное расписание); NY уже без даты (SEO.NY1).
- Parallel/agent bridges price-range уже в `ae3c86c` (BR.PR1) - CV.L-Hero не трогал bridges stats / soldEstimate.

### Решения

- План: owner block order + gap table профилей в `landing-master-template-plan.md`.
- GPT briefs (RU): `docs/landing-content-gpt-briefs.md` на tips/how-to/FAQ/checklist; reviews не генерировать.
- Thin Hero: `SeasonalHeroCountdown` (дни до НГ / 9 мая) + CSS tokens `gradient-newyear-hero` / `landing-hero-atmosphere`; wire в seasonal hero.
- Reviews: documented hide-until-`Review` (CV.L-debt); fake не изобретали.

### Проблемы

- Порядок секций ещё as-is (tips часто после schedule / внутри ContextWidget) - CV.L-Order.
- Deploy отложен: не конфликтовать с bridges price deploy; smoke `/novyj-god` после merge.

---

## 2026-07-26 - Bridges hero price range (night-bridges)

### Наблюдения

- Owner: на `/saint-petersburg/night-bridges` label «ДИАПАЗОН ЦЕН», value только `990 ₽`. API sessions: 990..2490, но `stats.priceTo` отсутствовал.
- SSR `finalizeLandingPayload` не пересчитывал min/max; клиент пропускал refetch при hydrated landing.
- «18 500+ билетов» и «4.7 рейтинг» - hardcoded marketing (`soldEstimate = groups*1850`, константа 4.7).

### Решения

- Backend landing stats: `priceTo = max(prices)`; SSR/client finalize через `resolveSessionPriceRange`.
- `formatMoneyRange`: `990-2 490 ₽` / `от 990 ₽`; label `диапазон цен` только при min≠max, иначе `цена от`.
- Fake social proof не убирали (scope) - только комментарий в hero.

### Проблемы

- ~~Нужен commit + exclusive deploy-prod-next + smoke HTML на диапазон.~~ ✅ prod: `990-2 490 ₽`, API `priceTo:2490`.
- Fake social proof (soldEstimate / 4.7) остаётся - BR.PR2.

---

## 2026-07-26 - SEO technical launch checklist (vs Lovable sample)

### Наблюдения

- Owner checklist + Lovable `generateMetadata` для `[city]/[category]` - sample с багами (canonical template, fake rating sort, wrong genitive). В Daibilet уже CHPU landings + `seo-listing-meta` + sitemap chunks.
- `landing-seo.pricePhrase` всегда писал «от 100 рублей» при отсутствии `priceFrom` - выдуманная цена в description.
- robots disallow не включал `/api/`. National metadata часто брал только CMS seoTitle без `resolveLandingSeo`/stats.
- Параллельные агенты трогали EmptyState/Metrika/ContextWidget - правки SEO в robots, landing-seo, landing-route-page, seo-listing-meta, globals chips; LandingPageView только chips + «Показать ещё».

### Решения

- Чеклист: `docs/seo-launch-checklist.md` + Tasktracker SEO.LC1–LC6.
- `formatRealPriceRub` / `appendRealPriceToDescription`; city×category meta с реальным priceFrom; national через `resolveLandingSeo` + профиль.
- robots `CRAWL_DISALLOW`: `/api/`, account, admin, login, reviews/write.
- Landing grid page=48 + «Показать ещё»; catalog/landing chips `min-h-11`.

### Проблемы

- Owner: sitemap в Вебмастере + переобход TOP (SEO.IN2/IN3) - вне кода.
- Deploy после merge с параллельными landing-коммитами.

---

## 2026-07-26 - Owner CRO: Metrika goals + empty-state + optimistic UI

### Наблюдения

- До спринта в коде был только `catalog_interstitial_click` (CV.2b). Воронка card → виджет → оплата не инструментирована.
- Покупка уходит во внешний виджет Ticketscloud / Teplohod; thank-you page и стабильный client callback успеха отсутствуют. Fake `purchase_success` на redirect в виджет - запрещён.
- Пустые лендинги (0 сессий / жёсткие фильтры) давали dead-end «Ничего не найдено» / «По этим фильтрам вариантов нет».
- Favorites уже localStorage-first (нет backend sync). Filter chips на лендингах уже клиентский `useMemo` (мгновенно).

### Решения

- Расширен `catalog-analytics.ts`: goals `product_card_click`, `select_tickets`, `purchase_success` (helper ready), `catalog_interstitial_click`. Wired: EventCard(s), TC/Teplohod buy, catalog purchase open.
- **Purchase semantics:** `select_tickets` = открытие виджета / CTA купить. `purchase_success` = только после реального сигнала (widget callback / thank-you / server pixel) - сейчас не шлётся.
- Маркетолог: создать JS-цели с id ровно как выше + Webvisor 10-15 мин/день первый месяц (CV.2c-f).
- `LandingEmptyState` + SSR related hits при offerCount=0 (`shouldLoadEmptyRelatedHits`); catalog empty с линками на речные/подборки.
- Favorites: optimistic setState + rollback on storage error. Chips: audit OK, без переписывания.

### Проблемы

- Нужен push + deploy-prod-next для prod smoke воронки.
- `purchase_success` остаётся ops/engineering follow-up, когда появится TC success hook или thank-you URL.

---

## 2026-07-26 - Landing ContextWidget (CV.L4 thin) + NY H1 coord

### Наблюдения

- Owner расширил матрицу ContextWidget: planetarium, rooftops, zagorodnye, vecherinki, detyam, novyj-god.
- Lovable предлагал Prisma `Category.widgetData` + `app/[city]/[category]` - несовместимо с CHPU landings и политикой no-fake-rating.
- Parallel agent уже правил NY H1 без «сегодня, дата» в `landing-seo` / seasonal / route metadata.

### Решения

- Config `data/landing-context-widgets.ts` по canonical slug; UI `LandingContextWidget` text-first chips (Clean UI); soft client filter по match.
- Wire в `LandingPageView` после `#variants`.
- План обновлён: матрица + JSON shape; запрет Prisma Category.widgetData.
- NY SEO diff от parallel agent включён в тот же deploy slice.

### Проблемы

- Follow-up CV.L4b: yards/dinner/standup/museums.
- Нужен push + deploy-prod-next.

---

## 2026-07-26 - Fix NY landing H1 «сегодня, дата»

### Наблюдения

- На `/novyj-god` H1 был абсурден: «Новый год сегодня, 26 июля: лучшие точки обзора и экскурсии».
- `resolveLandingSeo` для `profile=seasonal` всегда клеил `сегодня, {date}` и суффикс «точки обзора» (шаблон салюта).

### Решения

- Сезонные лендинги: `buildStaticH1Parts` без даты.
- `new-year`: национальный «Новый год в России: экскурсии, каникулы и праздничные программы»; city «Новый год в {Пр}: куда сходить и купить билеты».
- Meta title/description для NY без «сегодня»; SSR metadata через `resolveLandingSeo`.
- `salute-9-may` сохраняет «точки обзора», тоже без «сегодня».

### Проблемы

- Нет.

---

## 2026-07-26 - Landing master template (CRO L1)

### Наблюдения

- Owner: унифицировать лендинги вокруг Night Bridges; Lovable-промпты адаптировать к CHPU + `LandingPageView`, без параллельного `app/[city]/[category]`.
- Основной список на лендингах - schedule rows (`LandingScheduleList` / dinner / bridges), не `EventCard` grid (`LandingEventsGrid` почти мёртв).
- `PublicSessionDto` уже даёт `tags` / `subcategories` / `category` - бейджи без schema migration.
- На schedule rows жили fake ★ через `estimateRating` / `estimateReviewCount` (и bridges cruise cards) - противоречит HC.3 / CV.11.

### Решения

- План: `docs/landing-master-template-plan.md` (CV.L1–L6).
- L1: `landing-card-badges.ts` + `LandingCardBadgeRow`; показ на schedule/dinner rows и `EventCard` при `landingActions`; dinner horizontal badge chips (client filter); fake ★ сняты с этих поверхностей.
- Trust strip в hero уже есть - отдельный TrustBlock не добавляли.
- Prisma `Event.rating` не трогаем; «Хит» только из `sessionCount` / `landingSlugs`.

### Проблемы

- Legacy `LandingReviews` + bridges hardcoded ratings / sort «По рейтингу» на части профилей - долг CV.L-debt / L2+.
- Bridges cruise cards всё ещё показывают pseudo-rating - вне thin L1.
- Нужен commit + deploy-prod-next для smoke dinner/standup/yards.

---

## 2026-07-26 - SEO.IN1 IndexNow (Yandex / Bing)

### Наблюдения

- Письмо Яндекс.Вебмастера: ускорить индекс через IndexNow, Sitemap, Метрику, Переобход.
- IndexNow в репо не было (ни key file, ни notify).
- Sitemap уже есть: `/sitemap.xml` (index + chunks) и ссылка в `robots.ts` → `Sitemap: https://daibilet.ru/sitemap.xml`.
- Метрика уже заложена (ID `106786540` / `NEXT_PUBLIC_YANDEX_METRIKA_ID`) - код не изобретали.

### Решения

- `INDEXNOW_KEY` (server-only) → `GET /indexnow-key.txt` (+ `/{key}.txt` via public file); POST batch на `yandex.com/indexnow` + `api.indexnow.org`.
- Триггеры без спама каталогом: `/api/internal/revalidate` (paths HTML), article publish/update (через revalidate blog paths), deploy-warm curated TOP (`INDEXNOW_DEPLOY_PATHS` + `/api/internal/indexnow`).
- Debounce 2s in-process; cap 64 URL/request; skip `/api` `/admin` `/account`.
- Deploy: сгенерировать `INDEXNOW_KEY` в `.env` один раз до рестарта web; keyLocation = `/indexnow-key.txt` (стабильный path, без clash с `[segment]`).

### Проблемы

- Owner: в Вебмастере проверить/добавить sitemap; после deploy - Переобход TOP-15 (SEO.16 / SEO.IN3).
- Первый deploy: динамический `/{key}.txt` route handler проигрывал `[segment]` (HTML 404) - fixed stable `/indexnow-key.txt` + public `/{key}.txt`.

---

## 2026-07-26 - EventBuyCard: только детский тариф вместо диапазона

### Наблюдения

- Prod slug `tc-6a172122e12fa44141b31b60-reki-i-kanaly-obzornaya-vodnaya-progulka-po-sankt-peterburgu`: UI показывал только `750 ₽` и категорию «Детский до 12 лет».
- В БД у события есть полный набор тарифов: Детский 750 / Льготный 950 / Основной 18+ 1100 (плюс служебные 10 ₽ ниже `MIN_DISPLAY_PRICE_RUB`).
- `/api/public/events/{slug}` отдавал только child в `ticketPrices`/`offers`. Каталог при этом знал `priceFrom:750` / `priceTo:1350`.

### Решения

- Корневая причина: `EventOffer` грузились по всей meta/group сессий (сотни sibling eventId) с `orderBy priceRub ASC` + `take 32` → в окно попадали только дешёвые детские офферы.
- `tariffOfferEventIds` = requested + representative + merge peers; sessions по-прежнему по полной группе. Лимит offers 64.
- Правки: `public-event.dto.ts` + legacy `dto.js`. Frontend `getTicketPriceRange` / grouping уже корректны при полном DTO.

### Проблемы

- Full `deploy-prod-next` OOM (137) на `next build` static gen - для этого фикса достаточно `git pull` + `systemctl restart daibilet-api` (web rebuild не нужен).
- Smoke API после restart: `ticketPrices` = Основной 18+ 1100 / Детский 750 / Льготный 950; range 750-1100. Prod @`98aec73`.

---

## 2026-07-26 - Event description: wall-of-text regression

### Наблюдения

- Owner: описания событий снова «простыня» - нет H3/UL/абзацев. Эталон: `kremlevskaya-obzornaya-rechnaya-progulka-po-centru-moskvy-ot-prichala-novospasskii-most-1112`.
- Фича списков была в `18e5f8f` (`formatEventDescriptionHtml`), но `parseEventDescriptionBlocks` после soft-wrap **склеивал все подряд идущие non-bullet строки** через `cleanDisplayText` → один `<p>`.
- Teplohod отдаёт landmark-списки **без** маркеров `-`/`•`/`✅` - только короткие строки после двоеточия; старый пайплайн их не видел как UL.
- Не путать с параллельным buy-card агентом (цены/trust footer).

### Решения

- Не мержить consecutive lines в один paragraph: после soft-wrap каждая структурная строка = block.
- `isPlainEnumerationLine`: 2+ коротких строк без `.!?` → `<ul><li>`; H3/маркерные списки/sanitize HTML path без изменений.
- Тесты: Kremlin-sample + section headings; XSS sanitize сохранён.

### Проблемы

- Нужен commit + deploy-prod-next; smoke URL выше на `<ul>`/`<p>` (не wall-of-text).
- **Prod:** fix `f92b1d6` в ancestry HEAD `09bdff9`; smoke Kremlin cruise: 4×`<p>` + `<ul>` 7 landmarks (Зарядье…Дом Музыки), без wall-of-text `Москвы: Парящий`. Параллельные buy-card/IndexNow деплои валили web mid-build (OOM/SIGTERM) - финальный healthy web поднялся поверх.

---

## 2026-07-26 - Home hero: tourist emotions (не landmarks)

### Наблюдения

- Owner: home hero НЕ должен показывать city landmarks/views; нужны tourist emotions - люди в разных городах (славянская внешность, позитив, не обязательно в камеру).
- Текущий ротатор после `a0a2cf3` крутил `/images/cities/top/*.jpg` (Москва/СПб/Казань…). CMS `HeroBanner` seed перекрывает статический пул.

### Решения

- 6 новых JPG `apps/public/public/images/home/hero-emotion-01..06.jpg` (people-first; landmarks только soft bokeh). `apps/web/public/images` gitignored - sync через `sync-public-assets.mjs`.
- `HOME_HERO_IMAGES` → emotion pool; face-safe object-position ~20-30% Y (как до landmarks).
- Migration `20260726010000_home_hero_emotions`: UPDATE/UPSERT seed_01..06 на emotion paths; cache key `home-hero-banners-v3`.
- Centering overlay из `bcd50e6` (`HeroLayout` text-center) не трогали.

### Проблемы

- Нужен migrate + deploy-prod-next; smoke `/` на `hero-emotion-*.jpg`, без `cities/top` в home hero.
- **Prod @`cd82827`:** migrate `20260726010000` OK; deploy-prod-next OK; `/` SSR содержит все 6 `home/hero-emotion-*.jpg`; ассеты 200; `cities/top` в home hero нет; centering `items-center text-center` сохранён.

---

## 2026-07-26 - Footer city count: cities + regions

### Наблюдения

- Owner: footer «65 городов» vs marketing «более чем в 100» (HOME_TRUST / SEO events).
- Commit `5306f2f` считал только `type === 'city'` (= `standaloneCities`, 65). Регионы (`cityToRegion` hubs) в destinations есть, но отфильтровывались.
- Prod `/api/public/destinations`: 65 city + 36 region = **101**; `PublicStatsDto.stats.destinations` = 101.

### Решения

- `SiteFooter` + home live stats: считать destinations с `events > 0` (cities + regions), как stats/HOME_TRUST «100+». Ссылки в колонке «Города» по-прежнему только city.

### Проблемы

- Нет (честный каталожный count, без fake).

---

## 2026-07-25 - Owner audit: env / robots / CV.9b auth

### Наблюдения

- F4.6: admin уже Next (`admin.daibilet.ru` + `/admin`, Vite `/legacy` retired).
- `NEXT_PUBLIC_*`: только widget/analytics/URL (TC widget token, TEP widget id, Metrika id, site/admin URL). Секреты (`DATABASE_URL`, `TICKETSCLOUD_API_TOKEN`, `ADMIN_PASSWORD*`, `TELEGRAM_*`, JWT) - без `NEXT_PUBLIC_`.
- Middleware: Basic Auth на `/admin*` и host `admin.daibilet.ru` до render; layout `noindex`. В `robots.ts` не было `Disallow: /admin/`.
- CV.9b: PATCH logistics → `/api/admin/venues/[id]` через `adminApiFetch` (forward Basic Auth); backend `isProtectedPath` = все `/api/admin*`. Public - только GET.

### Решения

- Safe pattern: client-only публичные идентификаторы → `NEXT_PUBLIC_*`; server secrets / partner API tokens → без префикса (только Node/API).
- `apps/web/app/robots.ts`: добавить `Disallow: /admin/` (defense-in-depth к Basic Auth + noindex). `admin.daibilet.ru` отдельно закрыт auth middleware.

### Проблемы

- Нет: случайного `NEXT_PUBLIC_` на секретах не найдено; logistics write не был на публичном route.

---

## 2026-07-25 - CV.9e: hide empty metro UI

### Наблюдения

- Owner: `metroStation` nullable; пустое метро нельзя показывать как «🚇 -» / blank row с иконкой.
- `LocationCard` всегда рисовал Train + city - ложный metro UI без `metroStation`.

### Решения

- `VenueLogisticsBloc
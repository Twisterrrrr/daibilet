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
- Нужен MSK deploy (API+web): override живёт в runtime backend; web 502 пока параллельный build.

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
- Нужен MSK deploy + smoke Кострома/Мурманск: пресет → 6/8, badge 6.

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
- Нужен MSK web+API deploy (lean/normalize живут в backend). Старые LS без address - enrich на `/my-day` или передобавить.

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
- Нужен MSK deploy + smoke: catalog + text все СПб → нет warning; matches работают.

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

- `VenueLogisticsBlock.nonEmptyLogisticsText`: trim + hide `-`/`—`/`–`; metro/wayToFind/parking независимо.
- `LocationCard` (web): Train только при non-empty `metroStation`; public LocationCard - убран fake Train.
- DTO: `normalizeNullableString` для logistics в public venue/event payload; list item отдаёт `metroStation`.

### Проблемы

- Нет (commit + deploy-prod-next).

---

## 2026-07-25 - Home hero: multi-city rotator

### Наблюдения

- Owner: на `/` hero крутит только питерские кадры (Исаакий и т.п.).
- Причина: seed `HeroBanner` (`home-hero-friends-selfie`, `hero-slavic-01/04/06`) перекрывает статический `HOME_HERO_IMAGES`; почти все slavic - СПб.

### Решения

- `HOME_HERO_IMAGES` → 6 landmark JPG из `cities/top/`: Москва, СПб, Казань, Екатеринбург, Нижний, Самара (уже на диске, без stock video).
- Migration `20260725130000_home_hero_multi_city`: UPDATE seed_01..04 + INSERT seed_05/06; cache key `home-hero-banners-v2`.
- `heroFramesFromBanners`: focus через `objectPositionForHeroSrc` (landmark ~40-45% Y); centering overlay из `bcd50e6` не трогали.

### Проблемы

- Нужен migrate + deploy-prod-next; после деплоя smoke `/` на `cities/top/*.jpg` в ротаторе.
- **Prod:** migrate `20260725130000` OK; deploy @`70de525`+ (ancestry includes `a0a2cf3`); `/` SSR содержит все 6 `cities/top/*.jpg`; ассеты 200; slavic/selfie в home hero нет.

---

## 2026-07-25 - SEO.20 listing garbage audit

### Наблюдения

- Owner plan (pseudocode) имел битый Telegram URL (`telegram.org{token}`) и пустой regex `/[]/`; `is_active` нет в Prisma `Event`.
- Скидочный `/скидк[аиоу]/i` слишком шумный для легитимных описаний партнёров.

### Решения

- Конфиг `apps/backend/src/listing-garbage-config.ts` + audit `listing-garbage-audit.ts` + `telegram.ts` (API `https://api.telegram.org/bot{token}/sendMessage`).
- CLI `scripts/audit-listings.js` / `pnpm audit:listings`; фильтр ≈ saleable public catalog (status, schedule, purchaseReady; display price optional); slim select id/title/description/slug (+ override).
- Mojibake: `\uFFFD` + UTF-8-as-Latin1 `[ÐÑ][\u0080-\u00FF]`; `скидк*` **пропущен**; CAPS - soft (≥70% upper Cyrillic в title); HTML-теги только в title (description CMS tags игнор).
- Cron wrapper `deploy/cron/audit-listings.sh` + README; установка crontab на prod отдельно (⏳), не в deploy-prod-next. Telegram env на prod пока **missing**.

### Проблемы

- Без Telegram env скрипт warn+skip (ок для dry-run). Prod cron - после проверки env владельцем.

---

## 2026-07-25 - /venues type chips + hero center align

### Наблюдения

- В hero `/venues` type chips (`flex-wrap justify-center`) последний чип «Клуб / ресторан (N)» уходил один на вторую строку.
- Параллельно готов uncommitted home/centered-hero align в `HeroLayout` - объединили в один коммит.

### Решения

- `VenuesCatalogView`: `horizontal-snap-row` + `flex-nowrap` + `w-max min-w-full justify-center` - одна линия со скроллом при overflow, центрирование когда помещаются; чуть плотнее `px-4` / `h-10` / `max-w-5xl`.
- `HeroLayout` centered: колонка `max-w-5xl items-center`; `HeroCopy` остаётся `max-w-3xl` + `text-balance` / tracking compensation для brand.

### Проблемы

- На очень узких экранах нужен swipe по ряду (ожидаемо); orphan-wrap снят.

---

## 2026-07-25 - Launch Set ready

### Наблюдения

- Owner audit restates launch readiness. Prod known `3e30c8e` уже нёс CV polish (zero CTA, soft banners, human dates, blog min price, how-to-buy spacing).
- Реальный UI-gap: blog interstitial eyebrow всё ещё «Интересно» вместо «Из Блога».
- CV.9 logistics: код уже в `714822c` (другой агент) - не дублировали; на prod ещё не выкатан (нужен migrate+deploy).

### Решения

- **Done (код):** CV.1 zero sticky CTA «Нет подходящих событий»; CV.2 soft `#F8F9FA` + badge «Подборка»/«Из Блога»; category tabs dim/disable при 0; landings `<option disabled>` при `events===0`; CV.3 how-to-buy `mt-20`+`bg-slate-50`; CV.4 blog `[buy]` только `от N ₽`; CV.12 human dates; CV.9a-d `@714822c`; docs SEO.9b/20/21 + CV.2b в Tasktracker/qa.
- **Ops (вне feature-кода):** SEO.9b phone (🚫 ждём 8-800); CV.2b Metrika/GTM кабинет; SEO.20 код ✅ / cron ⏳; SEO.21 monthly tags; CV.9 prod migrate+deploy.
- **Follow-up:** price chips без facet counts - не блокер.

### Проблемы

- Нет launch-blocker в коде после badge fix. Остальное - ops/owner.

---

## 2026-07-25 - Owner: закрытие hanging QA (blog / F4 / SEO)

### Наблюдения

- В `qa.md` висели блоки 2026-07-23 (антиспам блога, F4 landing matching, SEO-листинги), хотя F4.6 уже done и часть SEO уже внедрена (rooftops national, TOP-15, `MIN_LISTING=6`). Нужны lasting rules в docs без feature-кода + явные follow-up задачи.
- CV.2b Metrika/GTM handoff по interstitial уже зафиксирован отдельно и остаётся ⏳ у маркетолога.

### Решения

- **Blog anti-spam:** KEEP хаос-темп при YM/GSC 80–90% (owner weekly); throttle 1/day + commercial DTO в шаблонах только при mass «малоценная»/excluded. Пн-колонки 1/нед, HIDDEN не жечь. Pack B = новый угол (intent/цены/карты), не rewrite 9 longreads.
- **F4/matching:** early admin.vhost был не нужен (Vite до cutover) → сейчас Next after F4.6. Env: явный `DAIBILET_ADMIN_API_URL` в unit admin (не shared web). Codegen правил - не до F5 (dual `dto.js` + `landing-rules.ts`). Daily garbage audit (encoding/stopwords/CAPS/empty tags → Telegram) → **SEO.20** High ⏳.
- **SEO commercial:** TOP-15 editorial only, URL/mapping freeze. National rooftops → смотровые (thin empty SPB roofs). Launch без телефона; footer email; реквизиты off contacts → `/requisites`; YM Webmaster/Business по ИНН/ОГРНИП; **SEO.9b** 🚫 до 8-800 (ASAP после approve). MIN_LISTING=6 KEEP; soft 10. Cards light / SEO на CHPU. Monthly tag promote (не ad-hoc) → **SEO.21** Medium ⏳.

### Проблемы

- SEO.9b blocked на одобрение 8-800 у владельца.
- SEO.20 код готов (`audit:listings`); cron на prod ⏳. SEO.21 - backlog.
- SEO.8c шире rooftops: полный rule-audit ещё 🔄.
- CV.2b по-прежнему ждёт настройки цели/триггера в кабинетах.

---

## 2026-07-25 - Catalog interstitial analytics handoff

### Наблюдения

- Frontend уже пушит `catalog_interstitial_click` через `ym reachGoal` + `dataLayer` (CV.2). В `qa.md` висел вопрос: хватает ли raw push или нужны цель/триггер в кабинетах.

### Решения

- Owner: raw push **ok / done**; отчёты конверсий требуют настройки в кабинетах.
- Метрика: Цель → JS-событие → id `catalog_interstitial_click` (строго, case-sensitive).
- GTM: Custom Event trigger `catalog_interstitial_click` + Tag (GA4/pixel).
- Handoff маркетологу: один event id, ~2 мин в кабинетах. Код трекинга не менять. Задача **CV.2b** в Tasktracker.

### Проблемы

- Пока цель/триггер не созданы - клики по interstitial не видны в conversion reports (события уходят, но кабинет их не считает).

---

## 2026-07-25 - CV.9 Venue logistics: shipped (commit)

### Наблюдения

- Owner закрыл open Q: Yandex iframe без API key; OSM keep на venue pages; address sync-only; slim logistics в event SSR.
- Реализация CV.9a-d в `714822c`. Launch Set audit не дублировал код.

### Решения

- **CV.9a-d** в git; prod требует migrate `20260725120000_venue_logistics` + deploy-prod-next.
- OSM→Yandex unify на venue pages - backlog.

### Проблемы

- Coverage lat/lng неполная (HC.11) - modal fallback на external button.

---

## 2026-07-25 - Owner audit: catalog / home / blog / dates

### Наблюдения

- Sticky «Показать N» при нуле всё ещё читалось как «Ничего не найдено»; баннеры в сетке выглядели как тёмные EventCard.
- Home «Как купить» сливалось с блоками выше/footer; blog `[buy]` мог ломать ряд цена+CTA диапазоном.
- Системная маска даты на карточках (`сб, 25 июл.`) выглядела машинной.

### Решения

- CV.1: zero CTA `disabled`, pastel gray, текст «Нет подходящих событий».
- CV.2: interstitial на `#F8F9FA` / accent 5%, corner badge «Подборка»|«Из Блога» (было «Интересно»); analytics без изменений.
- CV.3: how-to-buy `mt-20` + `bg-slate-50`.
- CV.4: только `formatPriceFrom` (от N ₽) + min-width у цены рядом с CTA.
- CV.12: `formatShowcaseSessionDate` → `25 июля, суббота в 07:15`; open-date без часов. CV.5 (скидки) не трогали.

### Проблемы

- Нет (локальные правки, без commit/deploy).

---

## 2026-07-25 - CV.9 Venue logistics: architecture / backlog

### Наблюдения

- Owner назвал работу «Спринт CV.5», но в Tasktracker **CV.5** = sort «скидки» (deferred), **CV.9** = «как найти». Канон эпика logistics = **CV.9**; CV.5 не трогаем.
- `Venue` уже имеет `address`, `latitude`, `longitude`. Полей metro / way-to-find / parking в Prisma нет.
- Public venue pages: блок «Как добраться» почти только адрес+город; карта - `OsmMapEmbed` (OSM iframe) + deep-link Яндекс / маршрут 2ГИС.
- Next admin `/admin/venues/[id]` и `updateAdminVenue` **не** пишут address/coords/logistics (только SEO/kind/pageStatus/descriptions).
- `/events/[slug]` venue в hero - `<Link>` на `/venues|locations` (уход со страницы). Паттерн modal уже есть (`CheckoutModal`).
- HC.11: неполный lat/lng на catalog cards - отдельно; page DTO coords уже резолвятся.

### Решения

- Спека: [venue-logistics-spec.md](./venue-logistics-spec.md). Поля: `metroStation`, `wayToFind` (@db.Text), `parkingInfo`; manual CMS; geocode template 🚫.
- Подзадачи **CV.9a-d** в Tasktracker (schema → admin → public block → event modal + Yandex iframe).
- Empty state: скрыть logistics-блок, если нет address и все три новых поля null.
- Modal на event: logistics + Yandex map-widget iframe; fallback на полную страницу venue; OSM на venue page пока не ломаем.
- Open Q (Yandex API key? OSM vs Yandex parity? editable address?) - в `qa.md`.

### Проблемы

- Coverage lat/lng на части площадок слабая (карта/modal marker) - не блокер схемы, влияет на UX CV.9d.
- Два admin surface (Next канон + Vite source) - правки канона Next; Vite только при явной parity-нужде.

---

## 2026-07-25 - Owner decisions: conversion backlog lock

### Наблюдения

- В `qa.md` висели 5 открытых Q по video / sold tickets / скидкам / venue logistics / blog auto-embeds - владелец закрыл решениями.
- Stock muted video и hardcoded «продано N» выглядят дёшево и бьют доверие сильнее, чем отсутствие social proof.
- Auto-match событий по тегам блога даёт высокий misfire и убивает эффект native `[buy]` (CV.4).

### Решения

- **Home video (HC.10 / CV.6 / H.7):** KEEP photo rotator до продакшн-съёмки; stock muted loops 🚫; предпочтение - реальные фото МСК/СПб WebP/AVIF; video hero deferred.
- **Social proof sold (CV.11):** только после реального TC Order aggregate; до - честные каталожные counts (CV.3); fake counts 🚫.
- **Catalog discounts (CV.5):** не строить sort до `discount`/`strikePrice` в DTO; backlog до sync architecture sprint.
- **Venue «как найти» (CV.9):** CMS admin-поле (метро + ориентир), manual; geocode template из адреса 🚫.
- **Blog auto-embeds (CV.8):** 🚫 rejected; только manual `[buy slug=…]` / admin custom field.

### Проблемы

- Нет продакшн video-ассета и нет стабильного public Order paid aggregate.
- `discount`/`strikePrice` отсутствуют в sync DTO - блокер CV.5 до architecture sprint.

---

## 2026-07-25 - Owner: сетки без сироты + «Залы»→«Музеи»

### Наблюдения

- В сетках форматов/подборок при фиксированных `lg:grid-cols-3` на 4 карточках оставалась сирота (3+1).
- На `/venues` H1 в клиенте: «Залы, театры и пространства» - владелец: «что за залы??».

### Решения

- `balanced-tile-grid.ts`: колонки так, чтобы либо одна строка, либо последний ряд ≥2.
- Home formats/promo/venues/trust + `/podborki` секции на balanced grid.
- Display-only: venues H1 «Музеи…»; `displayCatalogLabel(Залы→Музеи)` в chips/labels; slug/API не трогали.

### Проблемы

- Нет (commit + deploy-prod-next + smoke).

---

## 2026-07-25 - Conversion surfaces: каталог / home / blog

### Наблюдения

- Owner brief по 5 поверхностям: `/events`, `/`, `/podborki`, `/blog`, `/venues`.
- Gap: mobile filters уже bottom sheet, но без live count; сетка монотонна; home без how-it-works; blog `[buy]` был кнопкой с «сайт партнёра».
- Fake «15 000 проданных» / «24/7 Telegram» / скидки без DTO - не внедряем (HC.3).

### Решения

- CV.1: draft preview `GET /api/public/events?limit=1` → sticky «Показать N вариантов».
- CV.2: interstitial баннеры каждые 8 карточек (rooftops / river / podborki / blog).
- CV.3: live counts + блок «Как купить билет» (3 шага).
- CV.4: `[buy]` → native card с ценой и CTA.
- Video / скидки / auto related events / venue logistics - в backlog CV.5-CV.9.

### Проблемы

- Preview count бьёт catalog API на каждый draft-change (debounce 280ms) - ок для MVP.
- Без video-ассета hero остаётся photo (HeroMedia уже умеет videoSrc).

---

## 2026-07-25 - CV express QA + hotfix

### Наблюдения

- Debounce preview был 280ms (ниже целевых 300-400); zero-CTA disabled, но visually primary+opacity.
- Interstitial на mobile выше карточки (колонка + description); клики без аналитики.
- Шаг 3 «Как купить» акцентировал «не распечатывать»; email/SMS были размазаны по шагам.
- Blog `[buy]`: цена уже с live DTO; при недоступном виджете терялись title/price.

### Решения

- CV.1: debounce 350ms + abort; zero CTA нейтральный gray «Ничего не найдено».
- CV.2: compact mobile banner (max-h ~11.5rem, description hidden); `trackCatalogBannerClick` → dataLayer/ym.
- CV.3: шаг 3 - email + SMS + смартфон на входе; без printer-fear.
- CV.4: `cache: 'no-store'` + показ live title/price даже в fallback.

### Проблемы

- Нет (hotfix без commit).

---


### Наблюдения

- В выдаче description начинался с «Покупка у организатора. Оплата… не на daibilet.ru» - это был trust-tile (уже сменён в `d98d399`), Google/Yandex подмешивали body (partner + footer).

### Решения

- Meta home: lead «Купите билеты… онлайн» + счётчики городов.
- `data-nosnippet` на partner и footer blurb.
- Help FAQ: ответы без «платёж не на daibilet.ru» / имён виджетов в первых ответах.

### Проблемы

- Пока сниппет в индексе не обновится - нужна переобходка главной в Вебмастере.

---


### Наблюдения

- City hub SEO: пассивный CTA «оплата у билетного оператора» + громоздкий SEO-текст снижали доверие.
- `/events`: page за пределами totalPages; facets считались по всему каталогу → пустые комбинации фильтров; дата только пресетами.
- Карточки: теги смешивали категорию и «Площадка: …»; CTA «Подробнее»; диапазон цен без расшифровки.
- Event detail: нет пошагового сценария покупки; open-date + системное время; «билетной системы организатора» в trust.

### Решения

- `city-faq.ts` / city hero: короткий human-first SEO + CTA «купить билет онлайн».
- Catalog: conditional facets, clamp page + redirect, empty-state «Сбросить», date input в toolbar + «2 недели» в advanced.
- Labels: фильтр `Площадка:` / vessel names; 1 genre chip на карточке; CTA «Купить билет»; цена «от …».
- EventBuyCard: шаги дата → тарифы → купить; open-date без системного времени; цена «от» + hint; trust без «прослойки».

### Проблемы

- Полный конструктор «кол-во человек» внутри витрины по-прежнему в виджете TC/TEP - без iframe API нельзя.
- Landing SEO (`seo-listing-texts.ts`) ещё содержит формулировки «у оператора» - отдельный проход.

---


### Наблюдения

- Owner: «не вижу всех превью» - «Формат отдыха» и «Тематические подборки» обрезались в ScrollRail; часть плиток выглядела как тёмный solid (сильный overlay / null image на `/podborki`).

### Решения

- Format tiles: `lg:grid-cols-4` без скролла; ScrollRail только `<lg`.
- Thematic home: `lg:grid-cols-3`; `/podborki` секции «По типу»/«Для кого»: `lg:grid-cols-3 xl:grid-cols-4`.
- ScrollRail: обе стрелки при overflow (край muted); peek ~14px; стрелки на `top-[33%]` (не поверх title карточки).
- Overlay светлее; `resolveLandingCardImage` всегда даёт JPG (home fallback); `bg-slate-800` под фото.

### Проблемы

- Параллельный search-bar агент - не откатывать. `apps/web/public/images` gitignored, sync на build.
- **Prod @`5d11482`:** deploy-prod-next OK; `/` 200; HTML `lg:grid-cols-4` + `lg:grid-cols-3`; 4× format + promo JPG 200; `home/` sync 10 файлов.

---

## 2026-07-25 - Fix empty `/progulki-po-krysham` (rooftops rule)

### Наблюдения

- Prod `GET /api/public/landings/rooftops` → `events:0`. DB: нет строки `Landing` slug=rooftops; `LandingMatch`=0.
- В каталоге нет SPB roof-туров: все «крыша» в СПб - концерты/вечеринки (правильно excluded). Ближайший релевант: смотровые Москва-Сити + музейный «выход на крышу» (Красноярск).
- Правило было `city: Санкт-Петербург` + title-only `экскурс|прогулк|тур` - национальная витрина оставалась пустой.

### Решения

- `landing-rules.ts` + runtime `dto.js`: убран city-lock; title-сигналы + `смотр|посещени`; required group `крыш|руф|смотр`; tags +`Смотровые площадки`; exclude +джаз/стендап.
- City-URL `/progulki-po-krysham/saint-petersburg` по-прежнему только СПб (ALLOWLIST + filterSessionsByCity). Москва в sitemap city-path не добавляется.
- SEO seed для национального rooftops; тесты расширены.

### Проблемы

- SPB city-landing может остаться thin/empty до появления реальных экскурсий по крышам Питера в sync.

---

## 2026-07-25 - ScrollRail: prev/next для горизонтальных рядов

### Наблюдения

- Owner: на десктопе в подборках / rails неясно, как скроллить вправо (overflow-x без явного UX).

### Решения

- Новый `ScrollRail.client.tsx`: md+ ChevronLeft/Right, только при overflow; hide на краях; smooth scroll ~1 карточка.
- Подключено: HomeEventRail / HomeNowSection, home format+promo tiles, `/podborki` категории и быстрые chips.
- Мобиле: swipe + thin scrollbar; кнопки `hidden md:inline-flex`. Не трогали hero copy / tmp-*.

### Проблемы

- Параллельные агенты (fonts / roof landing) - не откатывать их файлы при merge.
- **Prod @`cf9ccfd`:** deploy-prod-next OK (после коллизии параллельных билдов); `/` и `/podborki` 200; chunks `page-*.js` содержат «Прокрутить вправо»; `fac6863` в ancestry.

---

## 2026-07-25 - CU.2b next/font + photo title color + hero H1 wrap

### Наблюдения

- Lean `node_modules/next/font/*` был пустым stub dirs; полный `@next/font` (font-data + loaders) восстанавливается из npm tarball next@15.5.20 - пустой `font/google/index.js` у Next 15 нормален (webpack target).
- Owner скрин: title на photo-карточках `/podborki` («По типу событий» / «Для кого») почти чёрный - глобальный `h1-h4 { text-graphite }` перебивал inheritance `text-white`.
- Home H1 ломал «Экскурсии, музеи и мероприятия» mid-phrase на 2-3 строки.
- BlogAfishaPromo «Афиша: {город}»: title-ссылка без base `text-white` (только hover) - на navy блоке нечитаема.

### Решения

- `apps/web/src/lib/fonts.ts`: Manrope + Inter + Source Serif 4 через `next/font/google` (CSS vars `--font-manrope|inter|source-serif`); layout без Google Fonts `<link>`; Tailwind `fontFamily` на `var(--font-*)`.
- globals: убран `text-graphite` с `h1-h4`; `:where(.text-white|.bg-slate-9*) :is(h1..h4) { color: inherit }`; photo titles явно `text-white`; BlogAfishaPromo Link `text-white`; overlay затемнён.
- HomeHero: первая смысловая строка `lg:whitespace-nowrap`; HeroCopy чуть мягче clamp размера на md.

### Проблемы

- Нужен commit + deploy-prod-next; smoke `/` Network: `/_next/static/media/*` без fonts.googleapis.com; `/blog` afisha title белый; `/podborki` titles белые на фото.

---

## 2026-07-25 - Clean UI фазы 3-4 + home photo tiles + pin fix

### Наблюдения

- Owner: pin на «Куда сходить сейчас» показывал `("ЯКарелия") адрес · город` одной строкой.
- Featured blog на home: глобальный `h3 { text-graphite }` перетирал белый title на photo overlay.
- Блоки «Формат отдыха» и «Тематические подборки» были на кислотных градиентах.

### Решения

- `resolveEventCardPinLines`: primary = адрес/город, secondary = провайдер без `("…")`.
- Featured blog title/badge → явный `text-white`.
- 10 JPG в `apps/public/public/images/home/` + photo cover tiles (format + promo) с dark overlay.
- CU.8/CU.4 polish: CityCard tags, InstitutionCard, BlogPostCard, LandingDirectionCard, HeaderSearch overlay под токены; лёгкий hover translate/scale.
- next/font self-host: follow-up CU.2b (закрыт отдельной записью).

### Проблемы

- JPG ~2MB/шт - приемлемо для smoke; при необходимости follow-up compress/webp.
- Public `home-scenarios` legacy не трогали (отдельный surface).

---

## 2026-07-25 - Clean UI фаза 2: header, event page, filters

### Наблюдения

- Owner одобрил фазу 2 и просит сразу commit + deploy-prod-next + smoke.
- Фаза 1 (токены + EventCard) уже на ветке (`4fea264` / `04c0c21`). Hero copy зафиксирован: eyebrow Дайбилет; H1 «Экскурсии, музеи…» / city «Экскурсии и события»; subtitle про «Найдите, куда сходить…».
- Amber CTA на event hero расходился с brand-blue токеном карточек.

### Решения

- Header: sticky glass (`bg-white/95` + blur), лёгкая нижняя линия, graphite hover на иконках Lucide, без тяжёлых рамок в dropdown/mobile sheet.
- Footer: `surface-muted`, больше воздуха (`py-14/16`), DaibiletLogo, иерархия без «простыни» borders.
- Event detail: больше whitespace; meta Lucide outline (возраст/длительность/адрес); buy-card `shadow-card` без border-box; CTA hero/widget → `primary-600`; убраны кислотные emerald/red pills и glass chips на фото.
- Filters: chips `rounded-xl` (не pill-шум), search bar soft shadow, воздух toolbar→grid; advanced panel без тяжёлых borders.
- SEO metadata / HomeHero copy не трогали.

### Проблемы

- Осталось CU.8: CityCard / InstitutionCard / landing tiles.
- Smoke на проде после deploy-prod-next: `/`, `/events`, один `/events/[slug]`, header/footer, chips.

---

## 2026-07-25 - Clean & Contextual UI: фундамент + карточки каталога

### Наблюдения

- Owner-бриф Airbnb/Klook/GYG: меньше визуального шума, фото и прозрачные условия.
- Было: Google Fonts CSS import (Inter + Space Grotesk + Source Serif), карточки с `border-slate-200`, цена-пил на фото, кислотный amber-star, секции `py-12/16`.
- Lucide уже в проекте - оставляем единый стиль иконок.

### Решения

- `next/font` в локальном lean `node_modules/next` пустой (`font/google` без файлов) - подключили Manrope+Inter+Source Serif через `<link preconnect>` в root layout (эквивалент по визуалу; self-host next/font - follow-up когда пакет полный).
- Токены 60/30/10: white / graphite `#1A1D20` + surface `#F8F9FA` / brand-blue CTA (`primary-600` #2563eb).
- Карточки: `rounded-card` 16px, soft shadow без жёсткой рамки, meta Lucide stroke graphite, цена+CTA внизу, padding 16-20, gap 12.
- Section spacing: класс `.section-y` 64/80px на home rails; grid gap 5→6 на `/` и `/events`.
- HomeHero копирайт не трогали (параллельный агент).

### Проблемы

- Показ владельцу: нужен commit + deploy-prod-next (UI-only). Локально: `/` и `/events` после `pnpm --filter web dev`.
- Следующие фазы: header/footer, event detail, filters toolbar, city/venue cards.

---

## 2026-07-24 - SEO: дубли title (Яндекс/Google отчёт)

### Наблюдения

- Группа из 8 URL с title «Дайбилет — экскурсии, музеи и события» (обход 04-05.07): `/venues`, `/legal`, `/privacy`, `/events?…`.
- Точная строка совпадает со старым `DEFAULT_TITLE` в `social-preview.js` (и близка к root `HOME_SEO_TITLE`); не с текущим hero H1 («Куда сходим…»).
- На проде сейчас: `/venues` и `/events` уже имеют свои `<title>`, но `/legal` и `/privacy` наследуют **og:title** с главной из root layout.
- `/events?category|date=…` делят один static title (metadata без searchParams после bf97706).
- Два event URL из отчёта (`tc-6a3cdbb7…` / `tc-6a3cdba5…`) сейчас **404**; живые «Золотой век СССР» - разные TC-сессии (с/без трансфера). Дубль title был из шаблона `{title}: билеты и расписание` без даты. 404 события показывают home title через layout default.

### Решения

- `/legal`, `/privacy`: свои title + `buildShareMetadata` (OG/Twitter больше не с home).
- `/events`: `generateMetadata(searchParams)` → уникальный title по category/date/city/q; filtered → `noindex,follow`, canonical `/events`.
- Event detail: `buildEventPageMetaTitle` + дата/площадка disambiguator; default seoTitle в DTO тоже с ближайшей датой.
- `not-found.tsx` со своим title; `HOME_SEO_TITLE` / social-preview DEFAULT без em dash.
- Тело `/events` по-прежнему без await searchParams (каталог client refetch).

### Проблемы

- `generateMetadata` с searchParams может снова сделать `/events` dynamic (не ○ ISR) - осознанный SEO tradeoff; тяжёлый filtered SSR не вернули.
- Нужен deploy-prod-next (+ backend если social-preview/DTO на :4000) и переобход в Вебмастере.

---

## 2026-07-24 - Blog inline: контент был, UI «прятал» фото

### Наблюдения

- Повторный owner-запрос «почти нет картинок в статьях». Контент после `@b1b23b5` уже ок: `blog:check-inline` 0/0; live prod HTML содержит 1–2 `-inline` (+ файлы 200).
- Реальная причина слабого удержания внимания: в `apps/web` `BlogFloatedSection` рендерил float `max-w-[15.5rem]` / `sm:max-w-[14.5rem]` (~232px) - рядом с full-bleed hero картинка выглядела как миниатюра / «её нет».

### Решения

- Float: `max-w-md` / `sm:max-w-[20rem]` / `md:max-w-md`; первое body-image всегда standalone `max-w-2xl`.
- `IMAGE_SIZES.blogInline` + чуть сильнее frame (rounded-xl / shadow-md).

### Проблемы

- Нужен deploy-prod-next (UI-only; upsert не нужен). Коммит по запросу владельца.

---

## 2026-07-24 - Blog: обязательные inline-фото в теле статей

### Наблюдения

- Owner: в статьях блога почти нет картинок внутри текста; нужны 1-2 на статью для удержания внимания (cover уже был обязателен).
- Аудит `content/blog`: 24/33 файла уже имели `[image …]` shortcode + `-inline.jpg`; **9 SEO-гидов** пачки (Москва/СПб/Казань/Екб) опубликованы без inline - GPT-промпт помечал плейсхолдер как «можно один раз».
- Рендерер `BlogArticleContent` уже поддерживает `[image]` и `![alt](url)`; фильтр `filterDuplicateImageBlocks` вырезает только src === cover.

### Решения

- Правила: `.cursorrules` п.7; `docs/seo-guide-articles-gpt-prompt.md` + plan - inline **обязательны 1-2**; upsert warn + `scripts/blog-check-inline-images.js` (`blog:check-inline`).
- В 9 гидах: GenerateImage `{slug}-inline.jpg` + `-inline-2.jpg`, шорткоды в MD, sync-bodies; добит missing `bylinnyy-…-inline-2.jpg`.
- Public `parseImageBlock` - parity с markdown `![]()`.

### Проблемы

- HeroLayout full-width уже был в `@8aaf1b1` - вне scope этого фикса.
- **Prod @`b1b23b5`:** deploy-prod-next OK; `blog:upsert` ×33; smoke: moscow/ekb-stendap/kazan HTML с cover + `-inline` + `-inline-2` (200).

---

## 2026-07-24 - `/cities` top tiles: отдельные daytime-превью

### Наблюдения

- Owner: верхние popular-плитки на `/cities` визуально совпадали с каталогом «Все города» (одинаковый night blue cityscape).

### Решения

- Новые уникальные JPG: `apps/public/public/images/cities/top/{slug}.jpg` для SPb, Moscow, Kazan, Ekaterinburg, Nizhny, Samara (дневные landmarks, разные moods).
- `CityCard` + `resolveCityCardImage(..., { variant: 'top' })`; только hero top-6 на `/cities` берут top-ассеты, каталог ниже оставляет `/images/cities/*.png`.

### Проблемы

- Нет. **Prod @`fbbbaf7`:** deploy-prod-next OK; `/cities` 200; `imageVariant":"top"` ×6 в RSC; ассеты `/images/cities/top/{moscow,saint-petersburg,kazan,ekaterinburg,nizhny-novgorod,samara}.jpg` → 200; каталог остаётся на `/images/cities/*.png`.

---

## 2026-07-24 - Cover `ekb-uralskiy-mars-bazhovskie-ekskursii`: карьеры вместо cityscape


### Наблюдения

- Owner screenshot: карточка гида про Уральский Марс показывала синий night cityscape (Храм на Крови / небоскрёбы) - это `cities/ekaterinburg`.
- На диске уже лежал файл `/images/blog/{slug}.jpg`, но это был PNG под расширением `.jpg` (и/или кэш старого placeholder); `-og.jpg` на prod был 404.

### Решения

- Новая уникальная GenerateImage-обложка: красные глиняные карьеры, бирюзовые озёра, пара туристов со спины, без города.
- Сохранены настоящий JPEG + `*-og.jpg` 1200x630 в `apps/public/public/images/blog/`.
- Frontmatter `coverImageUrl` уже указывал верный путь - менять MD/DB не нужно.

### Проблемы

- Нет (commit + deploy-prod-next + smoke карточки).

---

## 2026-07-24 - Floating «Наверх» на длинных public-страницах

### Наблюдения

- Owner: на хабах, блоге, каталогах не хватает кнопки «Наверх» после длинного скролла.

### Решения

- Один client-компонент `ScrollToTop.client` в `SiteLayout`: появляется после ~1 viewport, smooth scroll (с учётом `prefers-reduced-motion`), `aria-label`, позиция выше mobile bottom chrome (`bottom` + safe-area).
- Стиль: белая pill + slate border/shadow, без flashy purple; site-wide на всех страницах через `SiteLayout`.

### Проблемы

- Нет. **Prod @`bc56bba`** (включает `ff55d9f`): chunk `5216-*` с «Наверх»; smoke `/` `/blog` `/events` `/venues` `/locations` `/podborki` `/cities/sankt-peterburg` → 200.

---

## 2026-07-24 - /locations hero: каталог, не tourist CTA

### Наблюдения

- Owner: «Что посмотреть в первую очередь» на `/locations` звучит как CTA «куда сходить», а не как каталог локаций.

### Решения

- H1: «Локации и точки сбора» (+ гео `в {City_Пр}` при фильтре города).
- Подзаголовок и meta/OG: фактологичные причалы/парки/места встречи, без «куда идти» / «в первую очередь».

### Проблемы

- Нет. **Prod @`68ce275`** (включает `a533538`): `/locations` 200; H1/title «Локации и точки сбора»; без «Что посмотреть» / «куда идти».

---

## 2026-07-24 - TTFB checklist: static vs Next + ISR for events/podborki

### Наблюдения

- Owner checklist: сеть vs backend. Prod static `/test.html` TTFB ~10-55ms (HTTP/2), `/` после фикса ~50-90ms HIT `s-maxage=300`.
- До фикса `/` 10-60s + `no-store` из-за `await connection()` и S3 HEAD fingerprints на request path.
- `/events` `/podborki` city hub: `await searchParams` → dynamic `no-store` (ƒ), несмотря на `revalidate`.
- Сервер: 3.8Gi RAM, swap почти пуст, load ~0.5-1.2; next-server ~1Gi RSS. TLS HTTP/2 ok.

### Решения

- nginx `location = /test.html` → `/var/www/daibilet/test.html` (probe).
- Home: уже `1d0ed0e` (без connection + `getHomeCoverFingerprints` unstable_cache).
- `/events`: SSR только default catalog; URL-фильтры в `CatalogShell` (client).
- `/podborki`: SSR city=all + `getCachedPodborkiMeta`; `?city=` refetch client.
- City hub: убран `searchParams` (?hub= только через allowlist env).

### Проблемы

- **Prod @`bf97706`:** `/` `/events` `/podborki` → ○ ISR `s-maxage=300`, warm TTFB ~50-60ms; static `/test.html` ~58ms.
- City hub `/cities/[slug]` всё ещё ƒ `no-store` (dynamic segment); warm ~0.15s. Follow-up: `generateStaticParams` / убрать live Date из SSR title.

---

## 2026-07-24 - Home TTFB: убрать connection() + cache fingerprints

### Наблюдения

- Prod `/` TTFB 4-58s (MISS), `/cities` ~0.1-0.4s HIT при `revalidate=300`.
- `await connection()` в `HomePageContent` форсировал dynamic `no-store` на каждый запрос.
- `resolveCoverContentFingerprints` (sync S3 HEAD) шёл на request path вне `unstable_cache` с каталогом.

### Решения

- Убран `connection()` с home; hero уже в `unstable_cache` 300s (`getActiveHeroBanners`).
- `getHomeCoverFingerprints` - `unstable_cache` 300s + `HOME_PAGE_CACHE_TAG`; HEAD только на miss, не на каждый SSR.
- Basename + ETag dedupe rails (Harry Potter / unique covers) сохранены.

### Проблемы

- Нет (commit + deploy-prod-next + smoke TTFB).

---

## 2026-07-24 - Ultrawide hero: откат *-uw art-direction

### Наблюдения

- Owner: «зачем так увеличивать фото для ultrawide? раньше же было хорошо».
- `2004e4b` (70vh min-h) уже отвергнут; `a2531f5` (`*-uw.jpg` через `<picture>`) всё ещё давал ощущение увеличенного/агрессивного crop на широких экранах.

### Решения

- Убрали `<picture>` media-switch на `*-uw.jpg` в `HeroMedia` / `HomeHeroBackground`.
- На ultrawide тот же landscape, что на обычном desktop; высоты hero без 70vh inflation.
- Мягкий face-safe `object-position` оставлен. Photo heroes только `/` и `/venues`.
- Удалены 7 ассетов `*-uw.jpg` из `apps/public/public/images/hero/`.

### Проблемы

- Нет. **Prod @`982d89c`:** deploy-prod-next OK; `/` `/venues` `/events` 200; HTML/chunks без `*-uw.jpg` / `HERO_ULTRAWIDE`; orphan `apps/web/public/images/hero/*-uw.jpg` сняты с диска; photo frames venues 03/05 без ultrawideSrc.

---

## 2026-07-24 - /blog topic chips: scroll к ленте

### Наблюдения

- Owner: клик по фильтрам Стендап/Маршруты/Детям/Концерты ставит `?topic=`, но viewport остаётся в hero - кажется, что кнопки не работают.

### Решения

- `BlogListFiltered`: якорь `id="blog-feed"` + `scroll-mt-24`.
- `BlogListHero`: после topic click и Enter в поиске - `scrollIntoView({ behavior: 'smooth' })`; active chip `bg-primary-700` + ring/shadow + `aria-pressed`.

### Проблемы

- Нет. **Prod @`292c92b`:** deploy-prod-next OK (параллельный build добил наш SIGTERM 143, финальный deploy поднял web); `/blog` 200; HTML `scroll-mt-24`/`aria-pressed`; chunk с `blog-feed` + `scrollIntoView`.

---

## 2026-07-24 - /events UX brief: единая search bar

### Наблюдения

- Owner: детальный brief вместо расплывчатого declutter - дубли даты/категорий, trust-теги, микро-подборки на первом экране, сортировка отдельно от view.

### Решения

- Hero: гео H1 + короткий subtitle; без матрицы Когда/Что, без trust-чипов (city в header).
- Единая плашка: Поиск → Дата (Любая/Сегодня/…) → Фильтры → Найти.
- Одна лента категорий (Lucide-иконки + counts); без emoji.
- «Сегодня вечером / Бесплатно / До 2000» - блок «Быстрые» внутри панели Фильтры.
- Sort «По времени / Дешевле / Популярное» справа рядом с grid/list; карточки выше.

### Проблемы

- Нет.

---

## 2026-07-24 - Hero conversion pack (home/events/catalogs/blog)

### Наблюдения

- Owner brief: conversion heroes на `/`, `/events`, `/cities`, `/podborki`, `/blog`, `/locations`, `/venues` + landing trust; photo только home+venues (остальное strip/minimal/withMap).
- Политика возврата: «бесплатная отмена за 24ч» нельзя - условия у организатора.
- Video hero: ассета ≤5MB в репо нет. VenueCatalogCard без lat/lng → «Рядом со мной» нельзя без фейка.

### Решения

- `/`: H1 «Куда сходим в [City_Пр]?», подзаголовок про билеты, chips (речные/музеи/rooftops/стендап/топ), CTA «Найти билеты».
- `/events`: `EventsCatalogHero` - гео H1, матрица Когда+Что на существующие date/category/q/landing, trust microcopy без photo-overlay.
- Landings: trust strip (email / возврат по правилам / e-вход); убраны fake «продано» и рейтинг в hero.
- `/locations` `/venues`: гео H1, type chips в hero, emoji убраны; venues photo сохранён; плашка N площадок / M событий.
- `/cities`: live suggestions «Казань (N событий)» + якоря Популярные/А-Я.
- `/podborki`: emotional H1, mood chips, seasonal banner; presets без emoji.
- `/blog`: «Материал недели», newsletter «Нам по пути» + stub `POST /api/public/newsletter`.
- Event CTA: крупнее amber кнопка; scarcity только из реального `vacant`.

### Проблемы

- P2: video loop; venues geolocation; events featured split / search preview.

---

## 2026-07-24 - /blog featured: больше текста, без белой дыры над CTA

### Наблюдения

- Owner (скрин featured): большая белая пустота между excerpt и кнопками «Читать» / «Смотреть расписание» - тот же класс бага, что city hub «Зачем ехать» (`mt-auto` / flex stretch при коротком тексте).
- Featured капал excerpt на 280 символов - заметно короче large magazine card.

### Решения

- `BlogFeaturedHero`: `expandLargeListingCopy` ~900 символов / 2 абзаца, `line-clamp-[8]`/`[10]`; убран `mt-auto` у CTA (кнопки сразу под meta).
- `BlogPostCard` large: без `flex-1` на excerpt (дыра внутри clamp), copy до 900, `line-clamp-[10]`/`[12]`.
- `expandLargeListingCopy` default maxChars 760→900.

### Проблемы

- Нет. **Prod @`5fcc79d`** (включает `55aaa9d`): `/blog` 200; featured lead ~894 символа, `line-clamp-[8]/[10]`, без `mt-auto` у CTA.

---

## 2026-07-24 - /cities: hubTags в одну строку на top tiles

### Наблюдения

- Owner (скрин `/cities`): у СПб/Москва/Казань чипы hubTags переносились на 2 строки (Концерты/Стендап → Экскурсии); нижний ряд укладывал 3 чипа в линию. Карточки казались уже после max-w-5xl + stretch + aside «Популярные города».

### Решения

- `CityHubTags`: max 3, `flex-nowrap` + `whitespace-nowrap`, плотнее padding/text (`px-2 py-0.5 text-[10px]`), `min-w-0 shrink` + truncate.
- `/cities` grid: чуть шире колонка tiles (`2.35fr` / `0.9fr`, map `minmax(12.5rem,…)`), меньше gap между карточками; aside RussiaMap сохранён.

### Проблемы

- Нет (commit + deploy-prod-next).

---

## 2026-07-24 - Catalog covers: no empty Event/Venue after import

### Наблюдения

- Owner: на `/venues` карточки без фото (градиент), в т.ч. Sortavala.
- Prod: **948** visible venues без `heroImageUrl`; у **934** уже есть event CDN/local image; **14** совсем пустые; **55** active events без image.
- Lean fallback `f7e0071` брал event image, но `isRealPublicHeroCandidate` / `pickRealPublicImageUrl` принимали **только https** - локальные `/images/events/tc-*.jpg` (Sortavala) отбрасывались → градиент.

### Решения

- Policy: после TC/TEP import всегда `ensure-catalog-covers` - сначала promote provider/event image на Venue, generate (sharp SVG→JPEG) только если пусто.
- Accept `/images/events|venues/*` как usable cover (не `/images/cities/`).
- Hook: `tc-sync` (full + ids), `tep:sync`, worker `tep-catalog`.
- Harry Potter taboo на home не трогаем (только rails filter).

### Проблемы

- Нет. **Prod @`5fcc79d` (includes `4f11520`):** backfill `ensure-catalog-covers` → venues **promoted 939** + **generated 9**; events **55** updated (**11** unique sharp covers). DB: `venues_no_hero=0`, `events_no_image=0`. Sortavala `glavnaya-ploschad-sortavala-*` → local TC jpg. API `/api/public/venues` sample 30/30 with hero. Harry Potter taboo на home не трогали.

---

## 2026-07-24 - Home rails: content-fingerprint cover dedupe

### Наблюдения

- Owner: дубли фото на главной всё ещё видны после `4e18b60` (basename-only).
- Prod «Выбор редакции»: 4 карточки teplohod с разными basename (`7eea401c46-1.jpg`, `c9f7e2bdf1-1.jpeg`, …) имеют один SHA256 и один S3 ETag `8bce469f…` - идентичный бинарник под разными именами.

### Решения

- `collectSessionImageDedupeKeys`: basename + size-suffix strip, TC asset id, dirtyAlias↔file, local `tc-{id}`, teplohod hex-N stem.
- Home build: `resolveCoverContentFingerprints` (HEAD ETag, in-memory TTL) → `takeUnique` исключает одинаковый контент; gaps заполняются следующими кандидатами.
- Pool главной: catalog limit 50→80, cache key `home-catalog-v5-cover-dedupe`.
- Покрыто: Выбор редакции, Куда сходить (все вкладки), Популярное (общий pickState).

### Проблемы

- Нет (commit + deploy-prod-next).

---

## 2026-07-24 - Owner: photo hero только `/` и `/venues`

### Наблюдения

- Owner: «зачем все hero теперь как на главной?? достаточно было на главной и в площадках!! откати обратно».
- Photo `imageOverlay` раскатили на `/events`, `/locations`, `/cities`, `/blog` (пакеты `47430af`, `8ec241c` + ultrawide).
- `/podborki` оставался `minimal` - откат не нужен.

### Решения

- Хирургический restore компонентов до photo-hero: `CatalogShell` + `events/page` (`SectionPageHero` strip), `LocationsCatalogView` (`withMap` + RussiaMap), `cities/page` (`minimal` + top tiles/map) + `CitiesCatalogView` (`hideIntro`), `BlogListHero` (интерактивный search/topics strip).
- Сохранены: `/` HomeHero photo, `/venues` imageOverlay, ultrawide `*-uw.jpg` для оставшихся photo heroes, копирайт «статьи» в blog hero, cities ISR 86400.
- Header / afisha sidebar / venue covers - вне scope, не трогали.

### Проблемы

- Нет (commit + deploy-prod-next + smoke).

---

## 2026-07-24 - /blog: вернуть Афишу в угол + swap колонок

### Наблюдения

- Owner correction: «я просил поменять местами блоки и афишу в углу сделать более интересной для пользователя, а не убрать».
- `e43ee4e` ошибочно убрал promo из сайдбара под «Свежее» и вставил mid-feed strip - осталась пустая дыра в углу.

### Решения

- Desktop: колонки swap - «Свежее»+Афиша слева (`lg:order-1`), Featured справа (`lg:order-2`); mobile Featured сверху.
- `BlogAfishaPromo` снова в углу под Fresh ×3: cover события/city, «Билеты от N», weekend, titles, chips, CTA.
- Mid-feed вставка из magazine/list убрана (не дублировать).

### Проблемы

- Нет. **Prod @`ab1dc94` (includes `9be0a98`):** `/blog` smoke OK - swap grid, Fresh+Афиша в углу (цена/weekend/CTA), без mid-feed `blog-afisha-promo`.

---

## 2026-07-24 - /venues: вернули cover fallback после lean `_count`

### Наблюдения

- Owner: «площадки не подтягивают изображения» на `/venues`.
- Prod API: у топ-площадок (`muzei-garri-pottera` и др.) `heroImageUrl: null`, хотя detail page картинку получает через session fallbacks.
- Регрессия `9af3910`: `publicVenueHubRows` стал вызывать `resolveVenueHeroImageUrl(row, null)` и больше не строил `heroImageFallbacks` из catalog sessions.

### Решения

- Lean SQL `fetchVenueHeroImageFallbacks` в `public-venue-lean.ts`: `DISTINCT ON (venueId)` по Event+EventOverride imageUrl (без hydrate sessions).
- `publicVenueHubRows` снова резолвит cover через fallbacks только для venues без stored `heroImageUrl`.
- Detail path не ломался (там fallbacks из sessions остались).

### Проблемы

- Нет (нужен commit + deploy API; cache hub 5 мин сбросится рестартом).

---

## 2026-07-24 - /blog afisha promo: под первые 3 статьи фида

### Наблюдения

- Owner: «СОБЫТИЯ ГОРОДА / Афиша: Москва» squashed в сайдбаре под «Свежее» - перенести под первые три статьи основного фида.
- Сайдбар «Свежее» должен остаться только из 3 свежих карточек.

### Решения

- Убран promo из `BlogFeaturedHero` (aside = только Fresh ×3 + min price).
- `BlogAfishaPromo` - full-width banner (фото + цена/weekend + 1-2 titles + chips + CTA), geo из header.
- Вставка: magazine - после первого trio/блока; list - после 3-й строки.
- Данные те же: `resolveBlogSidebarPromoMap` / `buildPublicCityDto`.

### Проблемы

- Нет. **Prod:** `e43ee4e` + client-bundle fix `d47c300`; deploy-prod-next OK @`5e06ae8` (далее поверх шли ultrawide/venue commits). SSR first paint фида - follow-up `displayPosts`.

---

## 2026-07-24 - /blog sidebar promo: полезная афиша вместо stock-photo

### Наблюдения

- Owner: плитка под «Свежее» (тёмный mic, «СОБЫТИЯ ГОРОДА», «Афиша: Москва») беззубая - декоративная, без ценности.
- Город на скрине из header geo; Fresh уже показывает min price по городу статьи.

### Решения

- `BlogSidebarPromo.client` читает header geo (`useSelectedCityOptional`) и показывает prefetch-данные афиши.
- SSR `resolveBlogSidebarPromoMap`: priority cities + города featured/hot через `buildPublicCityDto` (как Fresh prices).
- В тайле: «Билеты от N ₽», weekend count, 1-2 ближайших title, chips (landing/category → `/events?city=` или CHPU), cover события или city vibe image.
- Fallback lite из `selectedDestination` (events + hubTags), если rich promo нет.

### Проблемы

- Нет (commit + deploy ниже).

---

## 2026-07-24 - /events + /locations: photo hero как у venues

### Наблюдения

- Owner после странной карты на `/locations`: «и hero для каталога тогда уж сделай нормальный».
- `/events` оставался на `SectionPageHero` (slate strip) без photo overlay.
- `/locations` `withMap` + abstract pin/RussiaMap в hero не выглядел как нормальный catalog hero; параллельный агент чинит map - не конфликтовать.

### Решения

- `/locations`: `HeroLayout` `imageOverlay` + `HeroMedia` (frames 04/01) + search/city/sort в белой панели (как `/venues`); fake map из hero убран.
- `/events`: `CatalogShell` `withPhotoHero` - imageOverlay + stats + search/city/date в hero; sticky toolbar compact (категории + advanced filters); sort chips ниже.
- Intent-подборки без photo hero - прежний `SectionPageHero` + CatalogShell.

### Проблемы

- Нет. **Prod @`47430af`:** deploy-prod-next OK; `/events` 200 + `hero-slavic-02` + «Каталог событий»; `/locations` source `imageOverlay` + frames 04/01 в chunk `7113-*.js`.

---

## 2026-07-24 - /blog: client crash Unknown encoding base64url

### Наблюдения

- Owner console на `/blog`: `Uncaught TypeError: Unknown encoding: base64url` в `nextCursor` / `publishedAt` (page chunk).
- Причина: `blog-cursor.ts` из `44887fb` брал ветку `Buffer.toString('base64url')`, когда в клиенте есть Buffer-полифилл без encoding `base64url` (Next/webpack). «Показать ещё» падало; возможен каскад 502.

### Решения

- Encode/decode только через `btoa`/`atob` + base64url replace (+ TextEncoder/Decoder). Без `Buffer` в shared-модуле, который импортирует `BlogListFiltered.client.tsx`.
- Формат курсора совместим с прежним Node `base64url` (roundtrip совпадает).

### Проблемы

- Нет (commit + deploy).

---

## 2026-07-24 - /locations hero: убрали fake pin-grid

### Наблюдения

- Owner: aside `/locations` - «идея интересная, но реализовано странно»: abstract grid + pins не читаются как география.
- Leaflet/Mapbox в репо нет; настоящую карту сейчас не вводим.

### Решения

- Aside = тот же спокойный `RussiaMap` («Популярные города»), что на `/cities`.
- Удалён `LocationsPinMap` (grid stub). `map-tip` API + flat markers helpers оставлены для будущего Leaflet/Mapbox.
- Hero `withMap` + white header не трогали.

### Проблемы

- Нет (commit + deploy ниже).

---

## 2026-07-24 - /cities + /blog: photo hero как у venues

### Наблюдения

- Владелец: hero у `/venues` и `/locations` нравится; `/cities` и `/blog` были унылым slate strip.

### Решения

- `/cities`: `HeroLayout` `imageOverlay` + `HeroMedia` (slavic-01/04), eyebrow stats, поиск+сортировка в белой панели; top tiles + map ниже hero (композиция карточек не откатывали).
- `/blog` `BlogListHero`: тот же `imageOverlay` + `HeroMedia` (slavic-02/06); search + topic chips внутри (glass chips). Geo H1 и `?q=`/`?topic=` сохранены.
- Кадры отличны от venues (03/05).

### Проблемы

- Нет. **Prod @`067763d`** (код `8ec241c`): `/cities` `/blog` 200; blog HTML с `hero-slavic-02`; cities frames в page chunk.

---

## 2026-07-24 - /cities: симметрия tiles+aside (container-page)

### Наблюдения

- Nested `max-w-5xl` под photo-hero снова давал left-bias у сетки и «Популярные города».

### Решения

- `CitiesCatalogView`: tiles+RussiaMap на `container-page grid items-stretch` (ось как «Все города»). Commits `48ab593` + `3b98afe`.
- `/podborki`: H1+row в `HeroLayout` minimal `max-w-5xl`. `/blog` featured без nested max-w.

### Проблемы

- Нет. Prod web/api active @`15592bf` (ancestor `3b98afe`); `/cities` 200; chunk содержит `container-page grid items-stretch`.

---

## 2026-07-24 - Owner blind spots: Prisma pool, lean catalog, pg_trgm, map hydration

### Наблюдения

- PrismaClient в `@daibilet/db` кэшировался на `globalThis` только вне production - при re-eval/дублях графа импортов adapter-pg открывал лишние Pool.
- `/podborki` тянул полный `getPublicCatalogSessions()` только ради тегов/totalEvents (закрыто owner pack + `unstable_cache`).
- Header search гидрировал весь catalog sessions и делал JS `includes` на каждый keystroke.
- `/locations` aside был stub `RussiaMap`; нужен pin map без огромного JSON локаций в client props.

### Решения

1. **Prisma singleton:** всегда pin на `globalThis.__daibiletPrisma` + shared `pg.Pool` (`DAIBILET_PG_POOL_MAX`, default 8).
2. **Lean + cache:** venues `select`+`_count`; surfaces cache 600s; Redis не вводили (follow-up).
3. **Search:** migration `pg_trgm` + GIN; `public-search.dto` на similarity/ILIKE + synonyms. Meilisearch = P2.
4. **Map:** `LocationsPinMap` получает только `{ id, lat, lng }[]`; tip - `GET /api/public/venues/map-tip`.

### Проблемы

- Legacy `createDb` Pool (`max: 3`) отдельно от Prisma pool - унификация позже.
- Landings catalog DTO всё ещё rule-match по sessions (память 5м).
- Deploy: migrate `20260724050000_pg_trgm_search` + deploy-prod-next.

---

## 2026-07-24 - SEO foundations audit: Place JSON-LD + sitemap locations

### Наблюдения

- CHPU уже живы: /blog|cities|venues|locations|events/[slug]; Prisma slug @unique на Article/City/Venue/Event/Landing.
- Sitemap - не монолитный pp/sitemap.ts (удалён ранее): index + chunks + MIN_LISTING_OFFERS_FOR_INDEX=6.
- Event JSON-LD (цена/дата/адрес) и BreadcrumbList/ItemList уже SSR; на venue был только BreadcrumbList.
- Chunk venues в sitemap всегда писал /venues/{slug} даже для location-template (живой URL /locations/{slug}).

### Решения

- uildVenuePlaceJsonLd: Place + PostalAddress + GeoCoordinates; breadcrumbs учитывают /locations vs /venues.
- Event.location.url → venue CHPU при наличии slug.
- Sitemap venues → canonicalPath / enueHref (locations|venues).
- Экспорт 	ransliterateSlug из 
outes.ts (паритет с backend publicCitySlug).

### Проблемы

- Параллельные mid-deploy на prod валили `.next` (502). Дожали exclusive deploy; **Prod @`15592bf`** (включает SEO `35bc5c6`): web+api active; smoke Place+geo на venue, Event.location.url+price, sitemap 200.

---
## 2026-07-24 - Owner pack: podborki categories, blog rank/cursor, cities hub tags

### Наблюдения

- `/podborki` держал tag soup вместо смысловых блоков; Landing = подборка, нужен category layer.
- `/blog` фильтровал по `?city=` жёстко и пагинировал offset; город шапки только менял H1.
- `/cities` карточки показывали сухой счётчик без кликабельных направлений; ISR был 1h.

### Решения

- Prisma `LandingCategory` + `Landing.categoryId`, migrate `20260724040000_landing_category` (by-type / for-whom / seasonal) + backfill; UI - горизонтальные карусели.
- Blog: rank-then-others по городу шапки; cursor pagination; canonical `/blog/{slug}`. API: `rankCitySlug`/`cursor`/`excludeFeatured`.
- Cities: `hubTags` в destinations DTO; mini-tags на `CityCard`; `revalidate = 86400`.

### Проблемы

- Параллельные агенты трогали `dto.js`/Diary - owner-pack SHA `30e87fe` + `44887fb`. Deploy: migrate + deploy-prod-next.

---

## 2026-07-24 - Blog afisha promo: pg out of client bundle

### Наблюдения

- `e43ee4e` ломал `next build`: `BlogAfishaPromo.client` тянул `blog-sidebar-promo` с dynamic `public-read` → webpack `Can't resolve 'net'|'tls'` (pg).

### Решения

- `resolveBlogSidebarPromoMap` вынесен в `blog-sidebar-promo.server.ts`; client импортирует только pure helpers/types.

### Проблемы

- Параллельный deploy-prod на e43ee4e падал; web оставался inactive до фикса.

---

## 2026-07-24 - Ultrawide: альтернативные кадры вместо гигантского hero

### Наблюдения

- Owner feedback на `2004e4b`: не нужен гигантский min-h / 70vh на ultrawide - нужны **альтернативные широкие изображения**, чтобы `object-cover` не кромсал 3:2 кадр.

### Решения

- Откат `HERO_LAYOUT_MEDIA_SECTION_CLASS` / content flex min-h (70vh, `100vw/2.35`, 2xl bumps) в `HeroLayout` - высота снова от контента + padding (как до `2004e4b`).
- Face-safe `object-position` оставлен (пул + `objectPositionForHeroSrc`).
- Добавлены 21:9 ассеты `*-uw.jpg` (2560x1080) в `public/images/hero/` (web + public sync): cover-crop face-safe из существующего slavic/friends пула.
- `HeroMedia` / `HomeHeroBackground`: `<picture>` + `media="(min-aspect-ratio: 21/9), (min-width: 1536px)"` → ultrawide src; mobile/desktop 16:9 высоты не трогали.

### Проблемы

- Нет. **Prod @`a2531f5`:** deploy-prod-next OK; sync 7×`*-uw.jpg`; `/` `/events` `/venues` `/locations` 200; `hero-slavic-02-uw.jpg` 200; HTML без `70vh` hero inflation.

---

## 2026-07-24 - Ultrawide: hero strip crop (home + catalog)

### Наблюдения

- На 21:9 / 32:9 `HeroLayout` imageOverlay сжимался в низкую полосу по контенту; `object-cover` по 3:2 кадрам (1536x1024) оставлял ~15-20% высоты - резал лица/края даже после face-safe focus (`37678e6`).
- Каталоги (events/venues/locations/cities/blog) шли с `object-center` без пула focus.
- Более широких ассетов в `/images/hero` нет - только те же 3:2.

### Решения

- ~~`HeroLayout` media: `2xl` min-h `min(70vh,34rem)` + `@media (min-aspect-ratio: 21/9)` min-h…~~ **REVERTED** - см. запись выше про альтернативные кадры.
- `HeroMedia`: нет `objectPosition` → `objectPositionForHeroSrc` (пул slavic/friends) или `HOME_HERO_OBJECT_POSITION_DEFAULT` - оставлено.
- Per-frame focus в `home-hero-images` - ultrawide Y-bumps под tall hero убраны вместе с min-h.

### Проблемы

- Owner: «а нахрена такой гигантский hero для ultrawide?? я имел в виду нужны альтернативные изображения».
- **Prod @`d47c300`** (includes `2004e4b`): deploy-prod-next OK; CSS с min-aspect-ratio / tall hero - заменяется следующим деплоем.

---

## 2026-07-24 - Home hero: face-safe object-position

### Наблюдения

- На `/` головы/лица «съедались» на разных viewport: `HeroMedia` получал кадры без `objectPosition` и падал в `object-center`.

### Решения

- `heroFramesFromBanners` прокидывает responsive `object-position` (~50% / 22-28% Y) из `home-hero-images`; для CMS HeroBanner (без focusX/Y) - `HOME_HERO_OBJECT_POSITION_DEFAULT`.
- Venues/cities/blog heroes не трогали (по-прежнему `object-center`).

### Проблемы

- Первый deploy упёрся в параллельные `next build` / OOM на 3.8Gi; после swap+exclusive build prod поднялся.
- **Prod @`15592bf`** (fix `37678e6`): `/` 200, hero `object-[50%_28%]` + `md:object-[50%_22%]`; `/venues` `/locations` без изменений focus.

---
## 2026-07-24 - /cities: симметрия tiles+aside после photo-hero

## 2026-07-24 - /cities: симметрия tiles+aside после photo-hero

### Наблюдения

### Решения

- `CitiesCatalogView`: grid tiles+RussiaMap прямо на `container-page` (ось как у «Все города»), без nested max-w; aside `self-stretch`.
- Ранее (`48ab593`): `HeroLayout` minimal - общий max-w-5xl для H1+children (`/podborki`); blog featured без nested max-w.

### Проблемы

- Redeploy: параллельные агенты убивали `next build` (SIGTERM/OOM). Итог: prod web up @`15592bf` (ancestor includes `3b98afe`); source tiles на `container-page grid items-stretch`; `/cities` 200 (CSR bailout - классы в chunk).

---
## 2026-07-24 - Home rails: Harry Potter taboo + cover dedupe

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ `/` ╨▓ ┬л╨Т╤Л╨▒╨╛╤А ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╕┬╗ ╤Г╤Е╨╛╨┤╨╕╨╗ pinned ┬л╨Ъ╨╛╨╝╨▒╨╛ 1┬╗ ╤Б venue ╨Ь╤Г╨╖╨╡╨╣ ╨У╨░╤А╤А╨╕ ╨Я╨╛╤В╤В╨╡╤А╨░ (title ╨▒╨╡╨╖ ┬л╨Я╨╛╤В╤В╨╡╤А┬╗).
- ╨б╨╛╤Б╨╡╨┤╨╜╨╕╨╡ ╨║╨░╤А╤В╨╛╤З╨║╨╕ ╨╝╨╛╨│╨╗╨╕ ╨┤╨╡╨╗╨╕╤В╤М ╨╛╨┤╨╜╤Г ╨╕ ╤В╤Г ╨╢╨╡ ╨╛╨▒╨╗╨╛╨╢╨║╤Г (basename ╨┐╨╛╤Б╨╗╨╡ strip query); ╨┐╤А╨╕ pin-only ╨┐╤Г╨╗╨╡ ╤Б╨╗╨╛╤В╤Л ╨╜╨╡ ╨┤╨╛╨╖╨░╨┐╨╛╨╗╨╜╤П╨╗╨╕╤Б╤М.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `home-rail-taboos.ts`: ╤Д╨╕╨╗╤М╤В╤А ╨┐╨╛ title/venue/venueSlug/slug/groupKey (harry potter / ╨│╨░╤А╤А╨╕ ╨┐╨╛╤В╤В╨╡╤А / muzei-garri-potteraтАж).
- `takeUnique` ╨▓ editors-pick / home-now / popular (web+public): skip taboo; image key = basename.
- `buildEditorsPickEvents`: pin first тЖТ skip taboo/dupes тЖТ fill from ╨╛╤Б╤В╨░╨╗╤М╨╜╤Л╤Е ╨║╨░╨╜╨┤╨╕╨┤╨░╤В╨╛╨▓.
- `normalizeSessionImageKey` (+ backend catalog twin): strip query, basename; unwrap `/_next/image?url=`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В (commit + deploy-prod-next).

---

## 2026-07-24 - SiteHeader: premium glass chrome

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╤И╨░╨┐╨║╨░ ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗╨░ ╨┐╨╗╨╛╤Б╨║╨╛ ╨╛╤В╨╜╨╛╤Б╨╕╤В╨╡╨╗╤М╨╜╨╛ ╨╛╨▒╨╜╨╛╨▓╨╗╤С╨╜╨╜╤Л╤Е content pages; ╨╜╤Г╨╢╨╡╨╜ premium header ╨▒╨╡╨╖ ╨╗╨╛╨╝╨║╨╕ city/search/auth/mobile.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `SiteHeader`: glass (`bg-white/55-70` + `backdrop-blur-xl`), nav tab-tray ╤Б active white pill, solid primary ┬л╨Т╨╛╨╣╤В╨╕┬╗, ╨┐╨╛╨╕╤Б╨║ ╨║╨░╨║ chip-╤Б╨╗╨╛╤В.
- `CityPicker` `header`: chip border/bg/shadow (╨╗╨╛╨│╨╕╨║╨░ picker ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣). Mobile drawer: ╤В╨╛╤В ╨╢╨╡ tray + CTA ╨Т╨╛╨╣╤В╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Commit + deploy-prod-next.

---

## 2026-07-24 - /venues + /locations: lean `_count`, skeletons, title index

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Owner tip: ╨║╨░╤В╨░╨╗╨╛╨│ ╨┐╨╗╨╛╤Й╨░╨┤╨╛╨║/╨╗╨╛╨║╨░╤Ж╨╕╨╣ ╤В╤П╨╜╤Г╨╗ ╨┐╨╛╨╗╨╜╤Л╨╣ `publicCatalogSessions` ╤А╨░╨┤╨╕ count ╨╜╨░ ╨┐╨╗╨╕╤В╨║╨░╤Е; ╤Д╨╕╨╗╤М╤В╤А╤Л ╨┤╨░╨▓╨░╨╗╨╕ full-page loader; ╨┐╨╛╨╕╤Б╨║ ╨┐╨╛ title ╨▒╨╡╨╖ ╨╕╨╜╨┤╨╡╨║╤Б╨░.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `publicVenueHubRows` + admin venues list: Prisma lean `select` + `_count.events` (status not HIDDEN/DRAFT) ╤З╨╡╤А╨╡╨╖ `public-venue-lean.ts`; water/bus facets - ╨╗╤С╨│╨║╨╕╨╣ SQL aggregate ╨▒╨╡╨╖ hydrate sessions/offers.
- UI: `VenueCatalogSkeletons` + Suspense fallback; city/type filters ╤З╨╡╤А╨╡╨╖ `useTransition` тЖТ pulse-╨║╨░╤А╤В╨╛╤З╨║╨╕ ╨▓╨╝╨╡╤Б╤В╨╛ ╨╢╤С╤Б╤В╨║╨╛╨│╨╛ loader.
- Schema: `Venue @@index([title])`, migration `20260724030000_venue_title_search_index` (admin/public `contains` ╨┐╨╛ title).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Count ╨╜╨░ ╨┐╨╗╨╕╤В╨║╨░╤Е ╤В╨╡╨┐╨╡╤А╤М active Event rows, ╨╜╨╡ saleable groupKey ╨╕╨╖ ╨║╨░╤В╨░╨╗╨╛╨│╨░ - ╨▓╨╛╨╖╨╝╨╛╨╢╨╜╤Л ╨╜╨╡╨▒╨╛╨╗╤М╤И╨╕╨╡ ╤А╨░╤Б╤Е╨╛╨╢╨┤╨╡╨╜╨╕╤П ╤Ж╨╕╤Д╤А vs ╨░╤Д╨╕╤И╨░; DTO shape ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣.
- Commit `9af3910` ╨╖╨░╨┐╤Г╤И╨╡╨╜ ╨▓ `feat/next-monorepo`. SSH deploy ╤Б ╤Н╤В╨╛╨╣ ╤Б╤А╨╡╨┤╤Л - `Permission denied (publickey)` ╨║ `213.171.7.16`. ╨Э╤Г╨╢╨╡╨╜ ╤А╤Г╤З╨╜╨╛╨╣ `BRANCH=feat/next-monorepo ./deploy/scripts/deploy-prod-next.sh` (╨┐╨╛╨┤╤Е╨▓╨░╤В╨╕╤В migrate `20260724030000_venue_title_search_index`).

---

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: hero ╤Г `/venues` ╨╕ `/locations` ╨╜╤А╨░╨▓╨╕╤В╤Б╤П (╤Д╨╛╤В╨╛/╨░╤В╨╝╨╛╤Б╤Д╨╡╤А╨░, stats, ╨┐╨╛╨╕╤Б╨║ ╨▓ hero); `/cities` ╨╕ `/blog` ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗╨╕ ╨║╨░╨║ ╤Г╨╜╤Л╨╗╤Л╨╣ slate strip.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `/cities`: `HeroLayout` `imageOverlay` + `HeroMedia` (slavic-01/04), eyebrow stats (`pluralCities` ┬╖ `pluralEvents`), ╨┐╨╛╨╕╤Б╨║ + ╤Б╨╛╤А╤В╨╕╤А╨╛╨▓╨║╨░ ╨▓ ╨▒╨╡╨╗╨╛╨╣ ╨┐╨░╨╜╨╡╨╗╨╕; top tiles + `RussiaMap` ╨╜╨╕╨╢╨╡ hero ╨╜╨░ `max-w-5xl` (╤Ж╨╡╨╜╤В╤А╨╕╤А╨╛╨▓╨░╨╜╨╕╨╡ ╨║╨░╤А╤В╨╛╤З╨╡╨║ ╨╜╨╡ ╨╛╤В╨║╨░╤В╤Л╨▓╨░╨╗╨╕).
- `/blog` `BlogListHero`: ╤В╨╛╤В ╨╢╨╡ `imageOverlay` + `HeroMedia` (slavic-02/06); search + topic chips ╨▓╨╜╤Г╤В╤А╨╕ hero (╤З╨╕╨┐╤Л ╨║╨░╨║ ╨╜╨░ home: glass ╨╜╨░ ╤В╤С╨╝╨╜╨╛╨╝). Geo H1 ╨╕ `?q=`/`?topic=` ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╤Л.
- ╨Ъ╨░╨┤╤А╤Л ╨╛╤В╨╗╨╕╤З╨╜╤Л ╨╛╤В venues (03/05), ╤З╤В╨╛╨▒╤Л ╤А╨╛╤В╨░╤В╨╛╤А ╨╜╨╡ ╨┤╤Г╨▒╨╗╨╕╤А╨╛╨▓╨░╨╗ ╤Б╨╛╤Б╨╡╨┤╨╜╨╕╨╡ ╨║╨░╤В╨░╨╗╨╛╨│╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy + smoke `/cities` `/blog` ╨┐╨╛╤Б╨╗╨╡ commit.

---

## 2026-07-24 - /cities: ╤Б╨╕╨╝╨╝╨╡╤В╤А╨╕╤П H1 + ╤Б╨╡╤В╨║╨░ (╨╛╨┤╨╜╨░ ╨╛╤Б╤М max-w-5xl)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ `d1ccd8a` ╨▓╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╨╗╨╡╨▓╤Л╨╣ ╨╛╤В╤Б╤В╤Г╨┐ viewportтЖТ╨║╨░╤А╤В╨╛╤З╨║╨╕ ╨╝╨╡╨╜╤М╤И╨╡ ╨┐╤А╨░╨▓╨╛╨│╨╛ ╨╛╤В asideтЖТ╨║╤А╨░╨╣. ╨Я╤А╨╕╤З╨╕╨╜╨░: H1 ╨╜╨░ ╨┐╨╛╨╗╨╜╨╛╨╣ `container-page` (`max-w-7xl`), ╨░ ╨║╨╛╨╝╨┐╨╛╨╖╨╕╤Ж╨╕╤П ╤Б ╨▓╨╗╨╛╨╢╨╡╨╜╨╜╤Л╨╝ `mx-auto max-w-5xl` - ╨▓╨╕╨╖╤Г╨░╨╗╤М╨╜╨╛/╨╛╤Б╨╡╨▓╨╛ left-biased ╨╛╤В╨╜╨╛╤Б╨╕╤В╨╡╨╗╤М╨╜╨╛ title. ╨в╨░ ╨╢╨╡ ╨╗╨╛╨▓╤Г╤И╨║╨░ ╨╜╨░ `/podborki` (H1 wide, row nested) ╨╕ `/blog` featured ╨▓╨╜╤Г╤В╤А╨╕ wider parent.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `HeroLayout` `minimal`: ╨╛╨┤╨╕╨╜ `mx-auto max-w-5xl` ╨▓╨╛╨║╤А╤Г╨│ brand/H1/description/**children** - ╨╛╨▒╤Й╨░╤П ╨╛╤Б╤М ╨┤╨╗╤П `/cities` ╨╕ `/podborki`.
- ╨г╨▒╤А╨░╨╜ nested `max-w-5xl` ╤Г children ╨╜╨░ `/cities` ╨╕ `/podborki` (╨╛╤Б╤В╨░╤С╤В╤Б╤П `items-stretch` grid).
- `/blog` `BlogFeaturedHero`: ╤Г╨▒╤А╨░╨╜ nested `max-w-5xl` - ╤А╤П╨┤ ╨╜╨░ ╤И╨╕╤А╨╕╨╜╨╡ ╤В╨╛╨│╨╛ ╨╢╨╡ `container-page`, ╤З╤В╨╛ ╨╕ search hero ╨▓╤Л╤И╨╡.
- `RussiaMap` / trending: `self-stretch` + flex-col (╤Б╤В╤А╨╡╨╗╨║╨░/╨╜╨╕╨╖ aside ╨║ ╨╜╨╕╨╖╤Г ╤Б╨╡╤В╨║╨╕). ╨Ю╨▒╨╗╨░╤З╨╜╤Г╤О ╨║╨░╤А╤В╤Г ╨╜╨╡ ╨▓╨╛╨╖╨▓╤А╨░╤Й╨░╨╗╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy + smoke ╨┐╨╛╤Б╨╗╨╡ commit.

---

## 2026-07-24 - /cities: top tiles + ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╨│╨╛╤А╨╛╨┤╨░┬╗ ╨▒╨╡╨╖ ╨▒╨╡╨╗╨╛╨╣ ╨┤╤Л╤А╤Л

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж (╤Б╨║╤А╨╕╨╜ `/cities`): `HeroLayout` split ╨╜╨░ ╨┐╨╛╨╗╨╜╨╛╨╣ `container-page` ╤А╨░╨╖╤К╨╡╨╖╨╢╨░╨╗ ╤Б╨╡╤В╨║╤Г ╨║╨░╤А╤В╨╛╤З╨╡╨║ ╨╕ aside ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╨│╨╛╤А╨╛╨┤╨░┬╗ ╨║ ╨║╤А╨░╤П╨╝; ╨┐╨╛╤Б╨╡╤А╨╡╨┤╨╕╨╜╨╡ ╨╛╨│╤А╨╛╨╝╨╜╤Л╨╣ gutter. Aside ╨╜╨╡ ╤В╤П╨╜╤Г╨╗╤Б╤П ╨┐╨╛ ╨▓╤Л╤Б╨╛╤В╨╡ ╤Б╨╡╤В╨║╨╕ (╨║╨░╨║ ╤А╨░╨╜╤М╤И╨╡ ╨╜╨░ podborki).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `/cities`: `HeroLayout` `minimal` + ╨║╨╛╨╝╨┐╨╛╨╖╨╕╤Ж╨╕╤П `mx-auto max-w-5xl items-stretch` `2fr / minmax(14rem,1fr)` + `lg:gap-5` (╨║╨░╨║ `/podborki` / blog featured).
- `RussiaMap`: `flex h-full flex-col` ╤З╤В╨╛╨▒╤Л ╨┐╨░╨╜╨╡╨╗╤М stretch'╨╕╨╗╨░╤Б╤М; ╨╛╨▒╨╗╨░╤З╨╜╤Л╨╣ SVG ╨╜╨╡ ╨▓╨╛╨╖╨▓╤А╨░╤Й╨░╨╗╨╕.
- `HeroLayout` split default ╤В╨╛╨╢╨╡ ╨╜╨░ max-w-5xl + stretch (╨╜╨░ ╤Б╨╗╤Г╤З╨░╨╣ ╨┐╨╛╨▓╤В╨╛╤А╨╜╨╛╨│╨╛ ╨╕╤Б╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╨╜╨╕╤П).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╡╤А╨▓╤Л╨╣ `deploy-prod-next` ╤Г╨┐╨░╨╗ ╨╜╨░ mid-build `.next` ENOENT (web ╤Б `Restart=always` ╤Г╤Б╨┐╨╡╨▓╨░╨╗ ╨┐╨╛╨┤╨╜╤П╤В╤М╤Б╤П ╨▓╨╛ ╨▓╤А╨╡╨╝╤П `next build`). ╨Ф╨╛╨╢╨░╨╗╨╕: `Restart=no` runtime override тЖТ clean build тЖТ start. **Prod @`d1ccd8a`:** `/cities` 200, HTML ╤Б `max-w-5xl items-stretch`. Hero ╤Д╨╛╤В╨╛ city hub (`/cities/[slug]`) - ╨▓╨╜╨╡ ╤Б╨║╨╛╤Г╨┐╨░.

---

## 2026-07-24 - /blog: featured + ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗ ╨▒╨╡╨╖ ╨▒╨╡╨╗╨╛╨╣ ╨┤╤Л╤А╤Л

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж (╤Б╨║╤А╨╕╨╜): featured ╨╕ ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗ ╨┐╤А╨╕╨╢╨░╤В╤Л ╨║ ╨║╤А╨░╤П╨╝ `container-page` (`max-w-7xl`), ╨┐╨╛╤Б╨╡╤А╨╡╨┤╨╕╨╜╨╡ ╨╛╨│╤А╨╛╨╝╨╜╤Л╨╣ gutter; thumbs ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗ ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗╨╕ ╨║╤А╨╛╤И╨╡╤З╨╜╤Л╨╝╨╕ / ╤А╨░╨╖╤К╨╡╨╖╨╢╨░╨╗╨╕╤Б╤М ╨┐╨╛ ╨▓╤Л╤Б╨╛╤В╨╡ ╨╕╨╖-╨╖╨░ `flex-1` ╨╜╨░ ╤Б╤В╤А╨╛╨║╨░╤Е.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `BlogFeaturedHero`: ╨║╨░╨║ ╨╜╨░ `/podborki` - `mx-auto max-w-5xl` + `2fr / minmax(16rem,1fr)` + `lg:gap-5`. Interactive H1 (`BlogListHero`) ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.
- Thumbs: ╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜╨╜╤Л╨╣ `size-20` (80├Ч80), `items-center` ╨┐╨╛ ╤Б╤В╤А╨╛╨║╨╡; ╤Г╨▒╤А╨░╨╜╤Л `flex-1`/`h-full` ╨╜╨░ li - ╨▓╤Л╤Б╨╛╤В╨░ ╤Б╤В╤А╨╛╨║╨╕ = ╨║╨╛╨╜╤В╨╡╨╜╤В + thumb. Promo ╨┐╨╗╨╕╤В╨║╨░ ╨╖╨░╨▒╨╕╤А╨░╨╡╤В ╨╛╤Б╤В╨░╤В╨╛╨║ ╨▓╤Л╤Б╨╛╤В╤Л ╤Б╨░╨╣╨┤╨▒╨░╤А╨░ (`flex-1`).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`d1ccd8a` (╨╜╨░╤И `90f6151`):** `/blog` 200; section `mx-auto max-w-5xl` + thumbs `size-20`; H1 search hero ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣. `/podborki` ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

---

## 2026-07-24 - /podborki: ╤Ж╨╡╨╜╤В╤А╨╕╤А╨╛╨▓╨░╨╜╨╕╨╡ featured + trending

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ equal-height 70/30 ╨╜╨░ ╨┐╨╛╨╗╨╜╨╛╨╣ `container-page` (`max-w-7xl`) ╨║╨╛╨╗╨╛╨╜╨║╨╕ ╤Г╨╡╨╖╨╢╨░╨╗╨╕ ╨║ ╨╗╨╡╨▓╨╛╨╝╤Г/╨┐╤А╨░╨▓╨╛╨╝╤Г ╨║╤А╨░╤О; ╨┐╨╛╤Б╨╡╤А╨╡╨┤╨╕╨╜╨╡ ╨▓╨╕╨╖╤Г╨░╨╗╤М╨╜╤Л╨╣ gutter. ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╤А╨░╨▓╨╜╨╛╨╝╨╡╤А╨╜╤Л╨╡ ╨╛╤В╤Б╤В╤Г╨┐╤Л ╨╛╤В ╨║╤А╨░╤С╨▓, ╨╜╨╡ ╨┐╤А╨╕╨╢╨╕╨╝╨░╤В╤М ╨▓ ╤Г╨│╨╗╤Л.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `LandingsCatalogView`: ╤Б╨╡╤В╨║╨░ `mx-auto max-w-5xl` + `2fr / minmax(14rem,1fr)` + `lg:gap-5`, `items-stretch` ╤Б╨╛╤Е╤А╨░╨╜╤С╨╜. H1/description ╨╛╤Б╤В╨░╤О╤В╤Б╤П ╨╜╨░ ╨┐╨╛╨╗╨╜╨╛╨╣ ╤И╨╕╤А╨╕╨╜╨╡ ╨║╨╛╨╜╤В╨╡╨╣╨╜╨╡╤А╨░.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`d1ccd8a` (╨║╨╛╨┤ `533d40a`):** `/podborki` 200; HTML ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В `max-w-5xl items-stretch`.

---

## 2026-07-24 - Blog: interactive H1 + ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗├Ч3

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: `/blog` SectionPageHero ╤Б╨╗╨╕╤И╨║╨╛╨╝ ╨┐╨╗╨╛╤Б╨║╨╕╨╣; ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗ ╨▒╨╡╨╖ ╨┐╤А╨╡╨▓╤М╤О ╨╕ ╨▒╨╡╨╖ ╨║╨╛╨╝╨╝╨╡╤А╤З╨╡╤Б╨║╨╛╨│╨╛ ╤П╨║╨╛╤А╤П ╨╜╨░ ╨░╤Д╨╕╤И╤Г.
- ╨У╨╛╤А╨╛╨┤ ╨╕╨╖ ╤И╨░╨┐╨║╨╕ (`SelectedCityProvider`) ╨╜╨╡ ╨▓╨╗╨╕╤П╨╗ ╨╜╨░ H1 ╨▒╨╗╨╛╨│╨░.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `BlogListHero`: search-focused ╨▒╨╗╨╛╨║ (rounded-3xl, soft primary tint), H1 geo-aware ╤З╨╡╤А╨╡╨╖ `cityToPrepositional`, `?q=` + ╨▒╤Л╤Б╤В╤А╤Л╨╡ `?topic=` ╤З╨╕╨┐╤Л ╨▒╨╡╨╖ full reload, ╤Б╤З╤С╤В╤З╨╕╨║ ╨│╨░╨╣╨┤╨╛╨▓.
- `BlogFeaturedHero` ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗: 3 ╨┐╨╛╨╖╨╕╤Ж╨╕╨╕, thumb 80├Ч80 `rounded-lg`, ╤Ж╨▓╨╡╤В╨╜╤Л╨╡ city pills, ╤Б╤В╤А╨╛╨║╨░ ┬л╨С╨╕╨╗╨╡╤В╤Л ╨▓ {City_╨Я╤А} ╨╛╤В N тВ╜┬╗ (Ticket) ╨╕╨╖ `buildPublicCityDto.stats.priceFrom` / fallback CHPU landings catalog.
- Feed: ╨┐╨╛╨╕╤Б╨║/╤В╨╡╨╝╤Л ╤Г╨▒╤А╨░╨╜╤Л ╨╕╨╖ `BlogListFiltered` (╨╛╤Б╤В╨░╨╗╨╕╤Б╤М city/author + view).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`c39d124` (╨╜╨░╤И `b45995c`):** `/blog` 200; H1 search hero + `╨б╨▓╨╡╨╢╨╡╨╡`├Ч3 thumbs; ┬л╨С╨╕╨╗╨╡╤В╤Л ╨▓ ╨Х╨║╨░╤В╨╡╤А╨╕╨╜╨▒╤Г╤А╨│╨╡ ╨╛╤В 200 тВ╜┬╗ ╨╕╨╖ `stats.priceFrom`.

---

## 2026-07-24 - /podborki: ┬л╨Т ╤В╤А╨╡╨╜╨┤╨╡┬╗ equal-height ╤Б featured

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Hero split ╤Б╤В╨░╨▓╨╕╨╗ title|aside ╤Б `lg:items-center`: ╨▒╨╗╨╛╨║ ┬л╨Т ╤В╤А╨╡╨╜╨┤╨╡┬╗ ╤Б╨╕╨┤╨╡╨╗ ╨║╨╛╤А╨╛╤В╨║╨╛╨╣ ╨║╨░╤А╤В╨╛╤З╨║╨╛╨╣, ╨╜╨╕╨╖ ╨╜╨╡ ╤Б╨╛╨▓╨┐╨░╨┤╨░╨╗ ╤Б featured-╨▒╨░╨╜╨╜╨╡╤А╨╛╨╝.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `LandingsCatalogView`: `HeroLayout` `minimal` + ╤Б╨╡╤В╨║╨░ 70/30 `items-stretch` ╨┤╨╗╤П featured ╨╕ trending (siblings, ╤Б╨┐╨╕╤Б╨╛╨║ ╤Б╨▓╨╡╤А╤Е╤Г ╨▓╨╜╤Г╤В╤А╨╕ ╨┐╨╛╨╗╨╜╨╛╨╣ ╨▓╤Л╤Б╨╛╤В╤Л ╨┐╨░╨╜╨╡╨╗╨╕). ╨в╤А╨╡╨╜╨┤╤Л ╨╜╨╡ ╤Г╨┤╨░╨╗╤П╨╗╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В (commit + deploy-prod-next).

---

## 2026-07-24 - Venues/Locations: ╨┤╤Г╨▒╨╗╤М ╨║╤А╨╛╤И╨╡╨║, ╤Б╨║╨╗╨╛╨╜╨╡╨╜╨╕╨╡, map stub

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- `/venues` ╨╕ `/locations`: ┬л╨У╨╗╨░╨▓╨╜╨░╤П > тАж┬╗ ╨┤╨▓╨░╨╢╨┤╤Л - `VenueListPage` ╤А╨╕╤Б╨╛╨▓╨░╨╗ ╨║╤А╨╛╤И╨║╨╕, ╨╖╨░╤В╨╡╨╝ `HeroLayout` ╤Б╨╜╨╛╨▓╨░.
- Hero stats: ┬л54 ╨У╨Ю╨а╨Ю╨Ф╨Ю╨Т┬╗ ╨╕╨╖-╨╖╨░ naive `cityCount <= 4` ╨▒╨╡╨╖ mod10/teens; ╨┤╨╗╤П 54 ╨╜╤Г╨╢╨╜╨╛ ┬л╨│╨╛╤А╨╛╨┤╨░┬╗.
- `/locations` (╨╕ `/cities`): SVG cloud-blob RussiaMap ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗ ╨║╨░╨║ ╤Б╨╗╨╛╨╝╨░╨╜╨╜╤Л╨╣ stub.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨г╨▒╤А╨░╨╗╨╕ page-level ╨║╤А╨╛╤И╨║╨╕ ╨╕╨╖ `VenueListPage`; ╨╡╨┤╨╕╨╜╤Б╤В╨▓╨╡╨╜╨╜╤Л╨╣ ╨╕╤Б╤В╨╛╤З╨╜╨╕╨║ - `HeroLayout` breadcrumbs (╨║╨░╨║ ╨╜╨░ cities/podborki).
- Eyebrow: `pluralVenues` / `pluralCities` ╨╕╨╖ `@/lib/format`.
- `RussiaMap`: ╨┐╤А╤П╨╝╨╛╤Г╨│╨╛╨╗╤М╨╜╨░╤П ╨┐╨░╨╜╨╡╨╗╤М ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╨│╨╛╤А╨╛╨┤╨░┬╗ ╨▓╨╝╨╡╤Б╤В╨╛ irregular SVG outline.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В (commit + deploy-prod-next).

---

## 2026-07-24 - Blog: interactive H1 + ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗├Ч3

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: `/blog` SectionPageHero ╤Б╨╗╨╕╤И╨║╨╛╨╝ ╨┐╨╗╨╛╤Б╨║╨╕╨╣; ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗ ╨▒╨╡╨╖ ╨┐╤А╨╡╨▓╤М╤О ╨╕ ╨▒╨╡╨╖ ╨║╨╛╨╝╨╝╨╡╤А╤З╨╡╤Б╨║╨╛╨│╨╛ ╤П╨║╨╛╤А╤П ╨╜╨░ ╨░╤Д╨╕╤И╤Г.
- ╨У╨╛╤А╨╛╨┤ ╨╕╨╖ ╤И╨░╨┐╨║╨╕ (`SelectedCityProvider`) ╨╜╨╡ ╨▓╨╗╨╕╤П╨╗ ╨╜╨░ H1 ╨▒╨╗╨╛╨│╨░.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `BlogListHero`: search-focused ╨▒╨╗╨╛╨║ (rounded-3xl, soft primary tint), H1 geo-aware ╤З╨╡╤А╨╡╨╖ `cityToPrepositional`, `?q=` + ╨▒╤Л╤Б╤В╤А╤Л╨╡ `?topic=` ╤З╨╕╨┐╤Л ╨▒╨╡╨╖ full reload, ╤Б╤З╤С╤В╤З╨╕╨║ ╨│╨░╨╣╨┤╨╛╨▓.
- `BlogFeaturedHero` ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗: 3 ╨┐╨╛╨╖╨╕╤Ж╨╕╨╕, thumb 80├Ч80 `rounded-lg`, ╤Ж╨▓╨╡╤В╨╜╤Л╨╡ city pills, ╤Б╤В╤А╨╛╨║╨░ ┬л╨С╨╕╨╗╨╡╤В╤Л ╨▓ {City_╨Я╤А} ╨╛╤В N тВ╜┬╗ (Ticket) ╨╕╨╖ `buildPublicCityDto.stats.priceFrom` / fallback CHPU landings catalog.
- Feed: ╨┐╨╛╨╕╤Б╨║/╤В╨╡╨╝╤Л ╤Г╨▒╤А╨░╨╜╤Л ╨╕╨╖ `BlogListFiltered` (╨╛╤Б╤В╨░╨╗╨╕╤Б╤М city/author + view).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В (commit + deploy ╨╜╨╕╨╢╨╡).

---

## 2026-07-24 - City hub ┬л╨Ч╨░╤З╨╡╨╝ ╨╡╤Е╨░╤В╤М┬╗: gap ╨▓ large card

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Magazine 1+2 ╨╜╨░ city hub: large card ╤Б╨╗╨╡╨▓╨░ ╤В╤П╨╜╤Г╨╗╨░╤Б╤М `h-full` + `flex-1 justify-between` ╨┤╨╛ ╨▓╤Л╤Б╨╛╤В╤Л ╨┤╨▓╤Г╤Е small ╤Б╨┐╤А╨░╨▓╨░ - ╨╝╨╡╨╢╨┤╤Г related events ╨╕ ┬л╨Ю╤В╨║╤А╤Л╤В╤М ╨╝╨░╤В╨╡╤А╨╕╨░╨╗┬╗ ╨╛╨│╤А╨╛╨╝╨╜╨░╤П ╨▒╨╡╨╗╨░╤П ╨┐╤Г╤Б╤В╨╛╤В╨░ (╨б╨Я╨▒).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `CityHubArticleTeaser` large: ╨▒╨╡╨╖ `h-full`/`flex-1`/`justify-between`; ╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜╨╜╤Л╨╣ aspect ╤Г cover; CTA ╤Б ╨╛╨▒╤Л╤З╨╜╤Л╨╝ `mt-4`.
- Grid: `items-start` + `lg:self-start` ╨╜╨░ lead; related sessions large ╨┤╨╛ 4.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В (deploy ╨┐╨╛╤Б╨╗╨╡ commit).

---

## 2026-07-24 - Blog Featured Hero: CTA-╨┐╨╗╨╕╤В╨║╨░ ╨┐╨╛╨┤ ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╤Б╨┐╤А╨░╨▓╨░ ╨┐╨╛╨┤ ╤Б╨┐╨╕╤Б╨║╨╛╨╝ ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗ ╨▒╨╛╨╗╤М╤И╨░╤П ╨▒╨╡╨╗╨░╤П ╨┐╤Г╤Б╤В╨╛╤В╨░ - ╨▓╨╕╨╖╤Г╨░╨╗╤М╨╜╨╛ ╨╜╨╡ ╤Г╤А╨░╨▓╨╜╨╛╨▓╨╡╤И╨╕╨▓╨░╨╡╤В ╨╗╨╡╨▓╤Л╨╣ featured.
- ╨б╨║╤А╨╕╨╜ ekb-stendap cityscape: ╨╜╨░ prod cover ╤Г╨╢╨╡ ╤Б╤Ж╨╡╨╜╨░/╨╝╨╕╨║╤А╨╛╤Д╨╛╨╜ (/images/blog/ekb-stendap-uralskiy-yumor.jpg, 2.0MB) - ╤Б╨║╤А╨╕╨╜ ╤Г╤Б╤В╨░╤А╨╡╨╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- BlogFeaturedHero: ╨┐╨╛╨┤ ╤Б╨┐╨╕╤Б╨║╨╛╨╝ - promo tile (blog-hero-promo.jpg, ╨╝╨╕╨║╤А╨╛╤Д╨╛╨╜) + CTA ┬л╨Р╤Д╨╕╤И╨░: {╨│╨╛╤А╨╛╨┤}┬╗ (events/hub) ╨╕╨╗╨╕ ┬л╨б╨╝╨╛╤В╤А╨╡╤В╤М ╨▓╤Б╨╡ ╨│╨░╨╣╨┤╤Л┬╗ -> /podborki; mt-auto flex-1 ╨▓╤Л╤А╨░╨▓╨╜╨╕╨▓╨░╨╡╤В ╨▓╤Л╤Б╨╛╤В╤Г ╤Б ╨╗╨╡╨▓╨╛╨╣ ╨║╨╛╨╗╨╛╨╜╨║╨╛╨╣.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`72ea839`:** `/blog` ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В `╨б╨▓╨╡╨╢╨╡╨╡` + `blog-hero-promo` + CTA ┬л╨Р╤Д╨╕╤И╨░┬╗.

---

## 2026-07-24 - Hero-╨╖╨╛╨╜╤Л: HeroLayout + home rotator (P0/P1/P2)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨╡╨╣╤В╤А╨░╨╗╤М╨╜╤Л╨╣ `SectionPageHero` ╤Г╤А╨░╨▓╨╜╤П╨╗ catalog surfaces, ╨╜╨╛ ╨▓╨╗╨░╨┤╨╡╨╗╨╡╤Ж ╤Е╨╛╤З╨╡╤В ╤Н╨╝╨╛╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╤Л╨╣ first viewport ╨╜╨░ home / cities / podborki / venues / locations.
- Blog magazine Featured Hero - ╨┐╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╤Л╨╣ ╨┐╨╛╤В╨╛╨║: ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕ `/blog`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ю╨▒╤Й╨╕╨╣ `HeroLayout` (`minimal | withMap | imageOverlay | split | video`) + `HeroMedia` (next/image priority, rotator/video).
- Prisma `HeroBanner` + migration `20260724020000_hero_banner` (seed 4 ╨▒╨░╨╜╨╜╨╡╤А╨░) + admin `/admin/hero-banners` toggle isActive.
- Home: brand-first ┬л╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В┬╗, headline ┬л╨Э╨░╨╣╨┤╨╕╤В╨╡, ╨║╤Г╨┤╨░ ╤Б╤Е╨╛╨┤╨╕╤В╤М ╨▓ ╤Н╤В╨╕ ╨▓╤Л╤Е╨╛╨┤╨╜╤Л╨╡┬╗, ╨┐╨╛╨╕╤Б╨║ ╨У╨╛╤А╨╛╨┤/╨Ф╨░╤В╨░/╨Ъ╨░╤В╨╡╨│╨╛╤А╨╕╤П, frames ╨╕╨╖ HeroBanner (fallback static pool).
- `/cities` split + SVG map RF (╨Ь╨б╨Ъ/╨б╨Я╨▒/╨Ъ╨░╨╖╨░╨╜╤М), top city tiles, revalidate 3600.
- `/podborki` editorial 70/30: featured banner + trending; ╤А╨╛╨╗╨╕ ╤З╨╡╤А╨╡╨╖ `Landing.layoutVariant` HERO_FEATURED/HERO_TRENDING + slug fallback.
- `/venues` dark imageOverlay + search ┬л╤В╨╡╨░╤В╤А ╨╕╨╗╨╕ ╨║╨╗╤Г╨▒┬╗; `/locations` withMap stub (RussiaMap + filters).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Local migrate: postgres :5437 down; `prisma.config.ts` jiti/babel broken locally (generate ╨╛╨▒╤Е╨╛╨┤╨╕╨╗╨╕ `--schema` ╨▒╨╡╨╖ config). Prod: `db:deploy` sequential ╨┐╨╛╤Б╨╗╨╡ generate.
- **Prod @`72ea839`:** migrate `20260724020000_hero_banner` OK (HeroBanner seed titles ╨╜╨░ `/`); deploy-prod-next OK; smoke `/` `/cities` `/podborki` `/venues` `/locations` `/blog` 200.

---

## 2026-07-24 - Trust UI: ╨░╨┤╤А╨╡╤Б ╨╕ ╤А╨╡╨║╨▓╨╕╨╖╨╕╤В╤Л ╤В╨╛╨╗╤М╨║╨╛ ╨╜╨░ contacts/requisites

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╤Б╨║╤А╤Л╤В╤М ╨▒╨╗╨╛╨║ ╤О╤А╨╕╨┤╨╕╤З╨╡╤Б╨║╨╛╨│╨╛ ╨░╨┤╤А╨╡╤Б╨░ (╨Ю╨║╤В╤П╨▒╤А╤М╤Б╨║╨░╤П) ╨╕ ╤Г╨▒╤А╨░╤В╤М ╨Ш╨Э╨Э/╨Ю╨У╨а╨Э╨Ш╨Я ╤Б ╨│╨╗╨░╨▓╨╜╨╛╨╣/╤Д╤Г╤В╨╡╤А╨░ - ╨╜╨░ `/contacts` ╨┤╨╛╤Б╤В╨░╤В╨╛╤З╨╜╨╛.
- ╨Ф╨╛╨┐╨╛╨╗╨╜╨╕╤В╨╡╨╗╤М╨╜╨╛: ┬л╨Ю╨У╨а╨Э╨Ш╨Я ╤Б ╨╜╨╛╨▓╨╛╨╣ ╤Б╤В╤А╨╛╨║╨╕┬╗ - ╨╜╨╡ ╨▓ ╨╛╨┤╨╜╤Г ╨╗╨╕╨╜╨╕╤О ╤Б ╨Ш╨Э╨Э.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `SiteFooter`: ╤Г╨▒╤А╨░╨╜╤Л ╤Б╤В╤А╨╛╨║╨╕ ╨Ш╨Э╨Э/╨Ю╨У╨а╨Э╨Ш╨Я ╨╕ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨░╤П ╤Б╤Б╤Л╨╗╨║╨░ ┬л╨а╨╡╨║╨▓╨╕╨╖╨╕╤В╤Л┬╗ ╨┐╨╛╨┤ email (╤Б╤Б╤Л╨╗╨║╨░ ┬л╨а╨╡╨║╨▓╨╕╨╖╨╕╤В╤Л┬╗ ╨▓ ╨║╨╛╨╗╨╛╨╜╨║╨╡ ╨Ъ╨╛╨╝╨┐╨░╨╜╨╕╤П ╨╛╤Б╤В╨░╤С╤В╤Б╤П).
- `/contacts`: ╤Б╨║╤А╤Л╤В ╨▒╨╗╨╛╨║ ╨░╨┤╤А╨╡╤Б╨░; ╨╛╤А╨│╨░╨╜╨╕╨╖╨░╤Ж╨╕╤П + ╨Ш╨Э╨Э/╨Ю╨У╨а╨Э╨Ш╨Я ╨╕ ╤Б╤Б╤Л╨╗╨║╨░ ╨╜╨░ `/requisites` ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╤Л. ╨Я╨╛╨╗╨╜╤Л╨╣ ╨░╨┤╤А╨╡╤Б ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╨╜╨░ `/requisites`.
- `/contacts`: ╨Ш╨Э╨Э ╨╕ ╨Ю╨У╨а╨Э╨Ш╨Я ╨▓╤Л╨▓╨╡╨┤╨╡╨╜╤Л ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╝╨╕ `<p>` (╨Ю╨У╨а╨Э╨Ш╨Я ╨▓╤Б╨╡╨│╨┤╨░ ╤Б ╨╜╨╛╨▓╨╛╨╣ ╤Б╤В╤А╨╛╨║╨╕).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`72ea839`** (trust @`3c287c6` + `fc6f817`): `/` ╨▒╨╡╨╖ ╨Ш╨Э╨Э/╨Ю╨У╨а╨Э╨Ш╨Я/╤О╤А.╨░╨┤╤А╨╡╤Б╨░; `/contacts` ╤Б ╨Ш╨Э╨Э+╨Ю╨У╨а╨Э╨Ш╨Я, ╨▒╨╡╨╖ ╨▒╨╗╨╛╨║╨░ ╨░╨┤╤А╨╡╤Б╨░.

---

## 2026-07-24 - Blog Hero: isFeatured + informational layout (LCP)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ┬л╨│╨╗╨░╨▓╨╜╨░╤П┬╗ ╨║╨░╨║ ╨┐╨╡╤А╨▓╨░╤П magazine-╨║╨░╤А╤В╨╛╤З╨║╨░ ╨┤╨░╤С╤В ╨┐╨╗╨╛╤Е╨╛╨╣ LCP (lazy) ╨╕ ╨╜╨╡╤В ╤Г╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╤П ╨╕╨╖ ╨░╨┤╨╝╨╕╨╜╨║╨╕.
- ╨Э╤Г╨╢╨╡╨╜ ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ Hero ╨╜╨░╨┤ ╤Д╨╕╨┤╨╛╨╝ (╨╕╨╜╤Д╨╛╤А╨╝╨░╤Ж╨╕╨╛╨╜╨╜╤Л╨╣: ╨▒╨░╨╜╨╜╨╡╤А ╤Б╨╗╨╡╨▓╨░ + 3-4 ╤Б╨▓╨╡╨╢╨╕╤Е ╤Б╨┐╤А╨░╨▓╨░), ╨╜╨╡ full-bleed kenburns.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Prisma `Article.isFeatured Boolean @default(false)` + migration; API last-wins (╨┐╤А╨╕ set true ╤Б╨▒╤А╨░╤Б╤Л╨▓╨░╨╡╤В ╨╛╤Б╤В╨░╨╗╤М╨╜╤Л╨╡).
- `/blog`: SectionPageHero strip тЖТ BlogFeaturedHero (`next/image` priority, sizes 768/60vw) тЖТ ╤Д╨╕╨╗╤М╤В╤А╤Л/╤Д╨╕╨┤ ╨▒╨╡╨╖ ╨┤╤Г╨▒╨╗╤П featured.
- Fallback: latest published ╨▓ ╤В╨╛╨╝ ╨╢╨╡ Hero-╨║╨╛╨╝╨┐╨╛╨╜╨╡╨╜╤В╨╡ ╤Б priority.
- Admin `/admin/articles`: ╨║╨╛╨╗╨╛╨╜╨║╨░/toggle ┬л╨Т Hero┬╗ + ╤З╨╡╨║╨▒╨╛╨║╤Б ╨▓ ╤А╨╡╨┤╨░╨║╤В╨╛╤А╨╡.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. Migration `20260724010000_article_is_featured` ╨┐╤А╨╕╨╝╨╡╨╜╨╡╨╜╨░ ╨╜╨░ prod; API ╨╛╤В╨┤╨░╤С╤В `isFeatured`. Smoke `/blog`: ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ Hero + strip, cover preload (`rel=preload as=image`), featured ╨╜╨╡ ╨▓ magazine cards. Prod HEAD ╨▓╨║╨╗╤О╤З╨░╨╡╤В `d34fd28` (╨┐╨╛╨╖╨╢╨╡ promo sidebar @`72ea839`).

---

## 2026-07-24 - `/blog` UX: ╤В╨╡╨╝╤Л, ╨┐╨╛╨╕╤Б╨║, load more, CTA, ╨┤╨░╤В╨░ large

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╨╜╨░ ╨╗╨╕╤Б╤В╨╕╨╜╨│╨╡ ╨╜╨╡ ╤Е╨▓╨░╤В╨░╨╗╨╛ ╤В╨╡╨╝ (╨б╤В╨╡╨╜╨┤╨░╨┐/╨б ╨┤╨╡╤В╤М╨╝╨╕/╨Ь╨░╤А╤И╤А╤Г╤В╤Л/╨Ъ╨╛╨╜╤Ж╨╡╤А╤В╤Л), ╨┐╨╛╨╕╤Б╨║╨░, ╨┐╨░╨│╨╕╨╜╨░╤Ж╨╕╨╕ ┬л╨Я╨╛╨║╨░╨╖╨░╤В╤М ╨╡╤Й╤С┬╗, CTA ╨╜╨░ ╨║╨░╤А╤В╨╛╤З╨║╨░╤Е ╨╕ ╨╖╨░╨╝╨╡╤В╨╜╨╛╨╣ ╨┤╨░╤В╤Л ╨╜╨░ large.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨в╨╡╨╝╤Л: `blog-topics.ts` + `?topic=`; ╤З╨╕╨┐╤Л ╨╜╨░ `/blog` (╨│╨╛╤А╨╛╨┤/╨░╨▓╤В╨╛╤А ╨▒╨╡╨╖ ╨┤╤Г╨▒╨╗╤П).
- ╨Я╨╛╨╕╤Б╨║: ╤Б╤В╤А╨╛╨║╨░ `?q=` ╨┐╨╛ title/excerpt/tag/body lead (`searchText`).
- Load more: initial 12, ╨║╨╜╨╛╨┐╨║╨░ ┬л╨Я╨╛╨║╨░╨╖╨░╤В╤М ╨╡╤Й╤С┬╗.
- CTA: `resolveBlogListingCta` тЖТ ┬л╨б╨╝╨╛╤В╤А╨╡╤В╤М ╤А╨░╤Б╨┐╨╕╤Б╨░╨╜╨╕╨╡┬╗ (CHPU) / ┬л╨Ъ ╤Б╨╛╨▒╤Л╤В╨╕╤П╨╝┬╗; large: title тЖТ ╤В╨╡╨║╤Б╤В тЖТ chips тЖТ CTA тЖТ meta; list: ╤П╨▓╨╜╨░╤П ╨║╨╜╨╛╨┐╨║╨░.
- ╨Ф╨░╤В╨░ large: `resolveBlogCardDateLabel` (publishedAt тЖТ editorialDate) + Calendar ╨▓ meta.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`bd8ec37`:** deploy-prod-next OK; smoke `/blog` - ╨┐╨╛╨╕╤Б╨║, ╤В╨╡╨╝╤Л, ┬л╨Я╨╛╨║╨░╨╖╨░╤В╤М ╨╡╤Й╤С┬╗, ┬л╨б╨╝╨╛╤В╤А╨╡╤В╤М ╤А╨░╤Б╨┐╨╕╤Б╨░╨╜╨╕╨╡┬╗/┬л╨Ъ ╤Б╨╛╨▒╤Л╤В╨╕╤П╨╝┬╗, ╨┤╨░╤В╨░ large.

---

## 2026-07-24 - BlogPostCard large: continuous excerpt above chips

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╨╜╨░ large-╨║╨░╤А╤В╨╛╤З╨║╨╡ `/blog` ╨┐╨╡╤А╨▓╤Л╨╣ ╨░╨▒╨╖╨░╤Ж ╤А╨╡╨╖╨░╨╗╤Б╤П `line-clamp` ╤Б `тАж`, ╨╖╨░╤В╨╡╨╝ chips, ╨╖╨░╤В╨╡╨╝ ╨▓╤В╨╛╤А╨╛╨╣ ╨░╨▒╨╖╨░╤Ж - ╤В╨╡╨║╤Б╤В ╨┐╤А╨╡╤А╤Л╨▓╨░╨╗╤Б╤П mid-sentence.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╨╛╤А╤П╨┤╨╛╨║ large: title тЖТ continuous excerpt (1тАУ2 ╨░╨▒╨╖╨░╤Ж╨░, ╨╛╨▒╤Й╨╕╨╣ `line-clamp-9`) тЖТ quick-links chips тЖТ meta footer.
- `expandLargeListingCopy`: ╨▒╨╡╨╖ split ╨┐╨╛ ╨┐╤А╨╛╨▒╨╡╨╗╤Г mid-phrase; ╨╡╤Б╨╗╨╕ ╨╜╨╡╤В ╨│╤А╨░╨╜╨╕╤Ж╤Л ╨┐╤А╨╡╨┤╨╗╨╛╨╢╨╡╨╜╨╕╤П - ╨╛╨┤╨╕╨╜ ╨░╨▒╨╖╨░╤Ж.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`e3fa7bc`:** deploy-prod-next OK.

---

## 2026-07-23 - Blog: ╨░╨▓╤В╨╛╤А╤Л ╨║╨╛╨╗╨╛╨╜╨╛╨║ brand blue

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╨░╨▓╤В╨╛╤А╨╛╨▓ ╨║╨╛╨╗╨╛╨╜╨╛╨║ (╨Ь╨░╨║╤Б/╨Ш╨│╨╛╤А╤М/...) ╨▓╤Л╨┤╨╡╨╗╤П╤В╤М ╤Б╨╕╨╜╨╕╨╝, ╨╜╨╡ ╤Б╨╡╤А╤Л╨╝ ╨║╨░╨║ ┬л╨а╨╡╨┤╨░╨║╤Ж╨╕╤П┬╗; ╨▒╨╡╨╣╨┤╨╢╨╕ ┬л╨Ъ╨╛╨╗╨╛╨╜╨║╨░┬╗ ╨╜╨╡ ╨▓╨╛╨╖╨▓╤А╨░╤Й╨░╤В╤М.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `blogAuthorNameClassName(articleType)`: column -> `text-primary-600` (light) / `text-primary-300` (hero dark); ╨╕╨╜╨░╤З╨╡ slate/white.
- Listing: BlogPostCard + BlogListRows; ╤Б╤В╨░╤В╤М╤П: BlogArticleHero (╨▒╨╡╨╖ tag ┬л╨Ъ╨╛╨╗╨╛╨╜╨║╨░┬╗); related strip/sidebar ╨▒╨╡╨╖ label ┬л╨Ъ╨╛╨╗╨╛╨╜╨║╨░┬╗.
- Merge ╤Б B.24 view toggle (`0741106`) + badges-off.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`ed874cb`**.

---

## 2026-07-23 - `/blog` view toggle (magazine | list)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: magazine-╤Б╨╡╤В╨║╨░ ╨╛╨║, ╨╜╨╛ ╨╜╤Г╨╢╨╡╨╜ ╨┐╨╡╤А╨╡╨║╨╗╤О╤З╨░╤В╨╡╨╗╤М ╨╜╨░ ╨╕╨╜╤Д╨╛╤А╨╝╨░╤В╨╕╨▓╨╜╤Л╨╣ ╤Б╨┐╨╕╤Б╨╛╨║ (╨║╨░╨║ ╨▓ ╨║╨░╤В╨░╨╗╨╛╨│╨╡). Cover badges (tag/city ╨╜╨░ ╤Д╨╛╤В╨╛) ╤Г╨▒╨╕╤А╨░╨╡╨╝ - ╨▓ list ╨╛╨╜╨╕ ╨╜╨╡ ╨╜╤Г╨╢╨╜╤Л ╨╜╨░ thumb.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `blog-view-mode.ts`: modes `magazine` \| `list`; persist `localStorage` key `blog:viewMode`; URL `?view=list` (aliases `grid`/`cards` тЖТ magazine). Default = magazine.
- Toggle icon (LayoutGrid / List) ╤Б╨┐╤А╨░╨▓╨░ ╨▓ strip ╤Д╨╕╨╗╤М╤В╤А╨╛╨▓ `/blog`; list = `BlogListRows` (thumb ╤Б╨╗╨╡╨▓╨░, title/excerpt/meta/chips ╤Б╨┐╤А╨░╨▓╨░, ╨▒╨╡╨╖ ╨▒╨╡╨╣╨┤╨╢╨╡╨╣ ╨╜╨░ ╤Д╨╛╤В╨╛).
- Parallel: ╤Г╨▒╤А╨░╨╜╤Л `CoverBadges` ╤Б magazine cards; large-card copy split ╤З╨╡╤А╨╡╨╖ `expandLargeListingCopy`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`ed874cb`** (╨▓╨║╨╗╤О╤З╨░╨╡╤В `0741106`): toggle ╨╜╨░ `/blog`; smoke aria ┬л╨Т╨╕╨┤ ╤Б╨┐╨╕╤Б╨║╨░ ╤Б╤В╨░╤В╨╡╨╣┬╗.

---

## 2026-07-23 - Blog markdown: links / H2 / NOTE / prices

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╨║╨░╤З╨╡╤Б╤В╨▓╨╡╨╜╨╜╤Л╨╣ MD ╨│╨╕╨┤╨╛╨▓ ╨╜╨░ live ╨▓╤Л╨│╨╗╤П╨┤╨╕╤В ╨╝╨╛╨╜╨╛╨╗╨╕╤В╨╛╨╝ - ╤Б╨╗╨░╨▒╤Л╨╡ ╨░╨║╤Ж╨╡╨╜╤В╤Л; ╤А╨╕╤Б╨║ ╨▒╨╕╤В╤Л╤Е ╤Б╤Б╤Л╨╗╨╛╨║, NOTE, ╨╕╨╡╤А╨░╤А╤Е╨╕╨╕ H2/H3; ╤Ж╨╡╨╜╤Л ┬л╨╛╤В N тВ╜┬╗ ╨▒╨╡╨╖ ╨▓╤Л╨┤╨╡╨╗╨╡╨╜╨╕╤П; ╨╜╤Г╨╢╨╜╨░ ╤А╨░╨▒╨╛╤З╨░╤П ╨▓╨╜╤Г╤В╤А╨╡╨╜╨╜╤П╤П ╨┐╨╡╤А╨╡╨╗╨╕╨╜╨║╨╛╨▓╨║╨░.
- Smoke prod kazan/moscow: `<a href>`, `<h2>/<h3>`, `role="note"` ╤Г╨╢╨╡ ╨▒╤Л╨╗╨╕ ╨┐╨╛╤Б╨╗╨╡ hotfix `f68a95d`, ╨╜╨╛: H2 ╨▒╨╡╨╖ inline/╤П╨║╨╛╤А╨╡╨╣, ╤Ж╨╡╨╜╤Л plain text, ╨║╨╗╨╕╨║ ╨┐╨╛ ╤Б╤Б╤Л╨╗╨║╨╡ ╨▓╤Б╨╡╨│╨┤╨░ `preventDefault` (╨╗╨╛╨╝╨░╨╗ Ctrl/Cmd+click), ╨▓╨╕╨╖╤Г╨░╨╗╤М╨╜╨╛ ╨╝╨░╨╗╨╛ ╨╕╨╡╤А╨░╤А╤Е╨╕╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `apps/web/src/lib/blog-markdown.ts`: tokenize `[text](url)` / bold / italic + pragmatic price wrap; `parseNoteBlock` ╤Б attrs, ╨┤╨╛╨┐╤Г╤Б╨║╨░╤О╤Й╨╕╨╝╨╕ `]` ╨▓ quoted text; heading parse + slug anchors; `parseGuideStructure` ╨┤╨╗╤П ╤В╨╡╤Б╤В╨╛╨▓.
- `BlogArticleContent`: H2/H3 ╤Б `id`, inline markdown, ╤Б╨╕╨╗╤М╨╜╨╡╨╡ spacing/border ╤Г H2, ╤П╤А╤З╨╡ links/lists; `#` ╨▓ ╤В╨╡╨╗╨╡ тЖТ h2.
- `BlogArticleNote` / CTA: ╨╛╨▒╤Й╨╕╨╣ `SHORTCODE_ATTRS`; NOTE inset ╤Г╤Б╨╕╨╗╨╡╨╜.
- `blog-navigate`: modifier/middle-click ╨╛╤Б╤В╨░╨▓╨╗╤П╤О╤В native open-in-new-tab.
- ╨в╨╡╤Б╤В╤Л: `blog-markdown.test.ts` (9). Parallel unify headers / large-card ╤Г╨╢╨╡ ╨▓ `fc5e309` / `0be544f`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-23 - `/blog` large card: ╨╜╨╕╨╢╨╡ cover, ╨┤╨╗╨╕╨╜╨╜╨╡╨╡ excerpt

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╨║╤А╤Г╨┐╨╜╤Л╨╣ ╨▒╨╗╨╛╨║ magazine (╤Д╨╛╤В╨╛) ┬л╨╜╨╡ ╨╕╨╜╤Д╨╛╤А╨╝╨░╤В╨╕╨▓╨╜╨╛┬╗ - ╤Б╨╗╨╕╤И╨║╨╛╨╝ tall cover, excerpt ╨▓ 1-2 ╤Б╤В╤А╨╛╨║╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `BlogPostCard` large/mirrored: cover `aspect-[2/1]` ╨▓╨╝╨╡╤Б╤В╨╛ `lg:flex-1` (╨▒╨╛╨╗╤М╤И╨╡ ╨╜╨╡ ╤А╨░╤Б╤В╤П╨│╨╕╨▓╨░╨╡╤В╤Б╤П ╨╜╨░ row-span-2); ╤В╨╡╨║╤Б╤В + chips ╨╜╨░ `flex-1`.
- Excerpt large: `line-clamp-6`; ╨╜╨░ `/blog` excerpt ╤А╨░╤Б╤И╨╕╤А╤П╨╡╤В╤Б╤П ╨╕╨╖ lead body (`expandListingExcerpt`, ~420 ╤Б╨╕╨╝╨▓╨╛╨╗╨╛╨▓). Small cards ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣ layout.
- Quick-links chips ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╤Л.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-23 - ╨Х╨┤╨╕╨╜╤Л╨╣ ╨╜╨╡╨╣╤В╤А╨░╨╗╤М╨╜╤Л╨╣ strip ╤И╨░╨┐╨╛╨║

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╤Г╤А╨░╨▓╨╜╤П╤В╤М ╤И╨░╨┐╨║╨╕ ╨║╨░╤В╨░╨╗╨╛╨│╨░, ╤Б╤В╨░╤В╨╡╨╣, ╨│╨╛╤А╨╛╨┤╨░ ╨╕ ╨┐╨╛╨┤╨▒╨╛╤А╨╛╨║. ╨г ╨▒╨╗╨╛╨│╨░ ╤Г╨╢╨╡ ╨▒╤Л╨╗ strip `bg-slate-50` + H1; ╤Г `/podborki` - fuchsia gradient; ╤Г city hub - full-bleed photo; ╤Г `/events` - H1 ╨▓╨╜╤Г╤В╤А╨╕ ╨║╨╛╨╜╤В╨╡╨╜╤В╨░ ╨▒╨╡╨╖ strip.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ъ╨░╨╜╨╛╨╜: `SectionPageHero` = `PageBreadcrumbBar` + `bg-slate-50` + H1 `font-display` + ╨║╨╛╤А╨╛╤В╨║╨╕╨╣ support. `gradientClass` deprecated/ignored.
- ╨Я╤А╨╕╨╝╨╡╨╜╨╡╨╜╨╛: `/events`, `/blog` (`BlogListHero` wrapper), city hub (╨▒╨╡╨╖ ╤Д╨╛╤В╨╛), `/podborki`, intent pages.
- `CatalogShell` ╨▒╨╛╨╗╤М╤И╨╡ ╨╜╨╡ ╨┤╤Г╨▒╨╗╨╕╤А╤Г╨╡╤В H1 - ╤В╨╛╨╗╤М╨║╨╛ ╤Б╤З╤С╤В╤З╨╕╨║ + controls.
- City photo hero ╤Б╨╜╤П╤В ╨┐╨╛ ╤П╨▓╨╜╨╛╨╣ ╨┐╤А╨╛╤Б╤М╨▒╨╡ ╤Г╤А╨░╨▓╨╜╤П╤В╤М; ╤Д╨╛╤В╨╛ ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨╜╨░ ╨║╨░╤А╤В╨╛╤З╨║╨░╤Е ╨│╨╛╤А╨╛╨┤╨░/╨░╤Д╨╕╤И╨╡.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`db34d03` (╨║╨╛╨┤ `fc5e309`):** deploy-prod-next OK; smoke `/events` `/blog` `/cities/sankt-peterburg` `/podborki` - `bg-slate-50` + crumbs + H1, ╨▒╨╡╨╖ fuchsia/full-bleed city photo.

---

## 2026-07-23 - `/blog` listing: ╨╜╨╡╨╣╤В╤А╨░╨╗╤М╨╜╨░╤П ╤И╨░╨┐╨║╨░

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: full-bleed `BlogListHero` ╤Б kenburns/╤Д╨╛╤В╨╛ ┬л╤Г╨╢╨░╤Б┬╗ - ╨╜╤Г╨╢╨╜╨░ ╨┐╤А╨╛╤Б╤В╨░╤П ╨╜╨╡╨╣╤В╤А╨░╨╗╤М╨╜╨░╤П ╨┐╨╛╨╗╨╛╤Б╨║╨░.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `BlogListHero`: ╤Г╨▒╤А╨░╨╗╨╕ ╤Д╨╛╤В╨╛/motion/╤В╤С╨╝╨╜╤Л╨╣ overlay; ╨║╤А╨╛╤И╨║╨╕ + strip `bg-slate-50`, H1 `font-display`, ╨║╨╛╤А╨╛╤В╨║╨╕╨╣ description.
- Magazine grid ╨╜╨╕╨╢╨╡ ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕; article hero ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-23 - ╨Я╤А╨░╨▓╨╕╨╗╨╛: cover ╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╨╡╨╜ + ╨┤╨╛╨│╨╡╨╜╨╡╤А╨░╤Ж╨╕╤П bylinnyy

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨а╨╡╤И╨╡╨╜╨╕╨╡ ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░: ╨║ ╨╗╤О╨▒╨╛╨╣ blog article ╨▓╤Б╨╡╨│╨┤╨░ ╨│╨╡╨╜╨╡╤А╨╕╤А╤Г╨╡╨╝ ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╣ cover (GenerateImage), ╨╜╨╡ city-placeholder.
- ╨Р╤Г╨┤╨╕╤В `content/blog` ├Ч `apps/public/public/images/blog/{slug}.jpg`: ╨Ь╨б╨Ъ/╨б╨Я╨▒ ├Ч6 ╨╕ batch A ╤Г╨╢╨╡ ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╡; missing cover ╤В╨╛╨╗╤М╨║╨╛ ╤Г `bylinnyy-bereg-fentezi-fest-volhov` (PUBLISHED) ╨╕ `bylinnyy-bereg-fentezi-fest` (HIDDEN).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╤А╨░╨▓╨╕╨╗╨╛ ╨╖╨░╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜╨╛: `.cursorrules` ┬з6, `docs/seo-guide-articles-gpt-prompt.md`, `docs/seo-guide-articles-plan.md`.
- ╨б╨│╨╡╨╜╨╡╤А╨╕╤А╨╛╨▓╨░╨╜╤Л 2 cover JPG тЖТ `apps/public/public/images/blog/{slug}.jpg` (frontmatter ╤Г╨╢╨╡ ╤Г╨║╨░╨╖╤Л╨▓╨░╨╗ ╨┐╤Г╤В╨╕).
- Parallel WIP (large-card fill ╨▓ `BlogPostCard`) ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕; font revert ╨╕ cadence ╤Г╨╢╨╡ ╨▓ ╨╕╤Б╤В╨╛╤А╨╕╨╕ ╨▓╨╡╤В╨║╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-23 - Blog typography: ╨╛╤В╨║╨░╤В Source Serif

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╤И╤А╨╕╤Д╤В╤Л ╨▓ ╨▒╨╗╨╛╨│╨╡ ╨┐╨╛╤Б╨╗╨╡ magazine redesign (`a4ecab6`) ┬л╨╜╨╡ ╤В╨╡┬╗ - Source Serif ╨╜╨░ H1/H2/H3 ╨╕ listing titles ╤З╤Г╨╢╨╡╤А╨╛╨┤╨╜╤Л ╨╛╤В╨╜╨╛╤Б╨╕╤В╨╡╨╗╤М╨╜╨╛ ╨╛╤Б╤В╨░╨╗╤М╨╜╨╛╨│╨╛ ╤Б╨░╨╣╤В╨░.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Т╨╡╤А╨╜╤Г╨╗╨╕ site default: Space Grotesk (`font-display`) / bold ╨╜╨░ hero, article H2/H3, cards, sidebar, strip.
- ╨г╨▒╤А╨░╨╗╨╕ drop cap ╨╕ serif pull-quote; ╤Ж╨╕╤В╨░╤В╤Л ╨╜╨░ `font-display`.
- Magazine layout (grid/sidebar/quotes anatomy) ╨╛╤Б╤В╨░╨▓╨╕╨╗╨╕; Source Serif ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨┤╨╗╤П city editorial hub.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`6656adf`:** `deploy-prod-next` OK; `/blog` + ╨╗╨╛╨╜╨│╤А╨╕╨┤╤Л ╨▒╨╡╨╖ `font-serif`/`blog-dropcap`, H1 ╨╜╨░ `font-display`.

---

## 2026-07-23 - ╨Ь╨б╨Ъ/╨б╨Я╨▒ covers + magazine `/blog` hero

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨г 6 ╨│╨╕╨┤╨╛╨▓ ╨Ь╨б╨Ъ/╨б╨Я╨▒ cover ╨▒╤Л╨╗ city-placeholder (~95KB, ╨┤╨▓╨░ ╨╛╨┤╨╕╨╜╨░╨║╨╛╨▓╤Л╤Е ╤Е╤Н╤И╨░ moscow/spb).
- Batch A (╨Ъ╨░╨╖╨░╨╜╤М/╨Х╨║╨▒ ├Ч3) ╤Г╨╢╨╡ ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╡ - ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.
- Listing `/blog` ╤Б╨╕╨┤╨╡╨╗ ╨╜╨░ generic `SectionPageHero` (amber-rose gradient) - ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗ ╨║╨░╨║ ╤А╨░╨╖╨┤╨╡╨╗-dashboard, ╨╜╨╡ magazine.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨б╨│╨╡╨╜╨╡╤А╨╕╤А╨╛╨▓╨░╨╜╤Л 6 landscape JPG тЖТ `apps/public/public/images/blog/{slug}.jpg`; frontmatter ╤Г╨╢╨╡ ╤Г╨║╨░╨╖╤Л╨▓╨░╨╗ ╤Н╤В╨╕ ╨┐╤Г╤В╨╕.
- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜ `blog-list-hero.jpg` + `BlogListHero`: full-bleed ╤Д╨╛╤В╨╛, Source Serif H1, ╨▒╤А╨╡╨╜╨┤ eyebrow, kenburns/rise motion.
- Article hero: ╤З╤Г╤В╤М ╨▓╤Л╤И╨╡ plane, amber brand eyebrow, full-bleed sizes, ╤В╨╡ ╨╢╨╡ motion keyframes.
- F4.6 ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-23 - ╨Р╨╜╤В╨╕╤Б╨┐╨░╨╝ ╨┐╤Г╨▒╨╗╨╕╨║╨░╤Ж╨╕╨╣: ╤Е╨░╨╛╤Б-╨│╤А╨░╤Д╨╕╨║ + ╨║╨╛╨╗╨╛╨╜╨║╨╕ ╨┐╨╜

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╤А╨░╨▓╨╜╨╛╨╝╨╡╤А╨╜╤Л╨╡ 3/╨┤╨╡╨╜╤М ╨▓ 09:00 ╨╕ ╤Б╤В╨░╤В╤М╨╕-╨▒╨╗╨╕╨╖╨╜╨╡╤Ж╤Л ╨▓╤Л╨│╨╗╤П╨┤╤П╤В ╨║╨░╨║ ╤Б╨┐╨░╨╝ ╨┤╨╗╤П ╨░╨│╤А╨╡╨│╨░╤В╨╛╤А╨░.
- ╨й╨╕╤В: ╨░╨▓╤В╨╛╤А╤Б╨║╨╕╨╡ ╨║╨╛╨╗╨╛╨╜╨║╨╕ (╨Ь╨░╨║╤Б / ╨Р╨╜╨╜╨░ / ╨Х╨╗╨╡╨╜╨░ / ╨Ш╨│╨╛╤А╤М / ╨Р╤А╤В╤Г╤А) - ╨┐╤Г╨▒╨╗╨╕╨║╨╛╨▓╨░╤В╤М ╨▓ **╨┐╨╜**, ╨▒╨╡╨╖ SEO-╨│╨╕╨┤╨╛╨▓ ╨▓ ╤В╨╛╤В ╨╢╨╡ ╨┤╨╡╨╜╤М.
- ╨Э╨╡╨╛╨┐╤Г╨▒╨╗╨╕╨║╨╛╨▓╨░╨╜╨╜╤Л╨╡ ╨║╨╛╨╗╨╛╨╜╨║╨╕ ╨▓ ╤А╨╡╨┐╨╛: `open-air-festy-vyhodnoi-ru` (╨Ь╨░╨║╤Б, ╨▒╤Л╨╗╨░ HIDDEN), `bylinnyy-bereg-fentezi-fest-volhov` (╨Ш╨│╨╛╤А╤М, HIDDEN). ╨Ф╤Г╨▒╨╗╤М ╨Ь╨░╨║╤Б╨░ `bylinnyy-bereg-fentezi-fest` ╨╛╤Б╤В╨░╨▓╨╗╨╡╨╜ HIDDEN.
- Live 23.07 (3 ╨│╨╕╨┤╨░) ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╨╡╤А╨╡╤Б╨╛╨▒╤А╨░╨╜ ╨║╨░╨╗╨╡╨╜╨┤╨░╤А╤М: 2 (╨┐╤В) / 1 (╤Б╨▒) / ╨▓╤Б-╨┐╨╡╤А╨╡╤А╤Л╨▓ / ╨┐╨╜-╨║╨╛╨╗╨╛╨╜╨║╨░ / 2 (╨▓╤В) / 1 (╤Б╤А); ╨▓╤А╨╡╨╝╨╡╨╜╨░ 11:15, 16:40, 14:25, 10:35, 11:50, 18:20, 15:10, 12:20 MSK.
- ╨Ь╨╕╨║╤Б ╤И╨░╨▒╨╗╨╛╨╜╨╛╨▓ ~тЕУ long / ~тЕУ top5 / ~тЕУ events ╨╖╨░╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜ ╨▓ plan + GPT-prompt (`template_type`).
- Frontmatter `publishedAt` ╤Г 6 ╨│╨╕╨┤╨╛╨▓ + 2 ╨║╨╛╨╗╨╛╨╜╨╛╨║; upsert prod `--force-published-at`.
- **Safety marker:** ╨╕╨╜╨┤╨╡╨║╤Б 80тАУ90% - ╨╛╨║; ┬л╨╝╨░╨╗╨╛╤Ж╨╡╨╜╨╜╨░╤П┬╗ / ╨▓╨╜╨╡ ╨╕╨╜╨┤╨╡╨║╤Б╨░ - ╤Б╨╜╨╕╨╖╨╕╤В╤М ╨┤╨╛ 1 ╨│╨╕╨┤/╨┤╨╡╨╜╤М (owner ╨▓ ╨Т╨╡╨▒╨╝╨░╤Б╤В╨╡╤А╨╡) - ╤Б╨╝. `docs/qa.md`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨в╨╡╨║╤Б╤В╤Л ╤Г╨╢╨╡ ╨╜╨░╨┐╨╕╤Б╨░╨╜╤Л ╨║╨░╨║ long (~5тАУ7╨║); ╤Б╨╝╨╡╨╜╨░ template_type ╨┤╨╗╤П ╤З╨░╤Б╤В╨╕ URL - ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╛╨╜╨╜╤Л╨╣ ╨┤╨╛╨╗╨│ ╨┐╨░╤З╨║╨╕ B / polish, ╨╜╨╡ ╨▒╨╗╨╛╨║╨╡╤А ╨│╤А╨░╤Д╨╕╨║╨░.

---

## 2026-07-23 - SEO guides: owner anti-AI rewrite (9 ╤И╤В.)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж ╨┐╨╡╤А╨╡╨┐╨╕╤Б╨░╨╗ ╨▓╤Б╨╡ 9 ╨│╨╕╨┤╨╛╨▓ (╨┐╨░╤З╨║╨░ A + ╨Ь╨б╨Ъ/╨б╨Я╨▒); `validation-report.json` - 5000-7000, NOTE, ╨▒╨╡╨╖ em/en dash, ╨▒╨╡╨╖ `/events?q=`, articleType gid.
- Desktop MD ╨▒╤Л╨╗╨╕ `status: DRAFT` ╨▒╨╡╨╖ `publishedAt`; schedule-╨╕╨╜╤Д╤А╨░ ╤Г╨╢╨╡ ╨╜╨░ `PUBLISHED` + future `publishedAt`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ч╨░╨╝╨╡╨╜╨╡╨╜╤Л ╤В╨╡╨╗╨░ `content/blog/{slug}.md`; covers ╨Ъ╨░╨╖╨░╨╜╤М/╨Х╨║╨▒ ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╤Л; ╨Ь╨б╨Ъ/╨б╨Я╨▒ placeholders.
- ╨б╤В╨░╤В╤Г╤Б ╨▓ ╤А╨╡╨┐╨╛/CMS: `PUBLISHED` + `publishedAt` ╨┐╨╛ ╨║╨░╨╗╨╡╨╜╨┤╨░╤А╤О 23/24/25.07 09:00 MSK (╨╜╨╡ DRAFT - cron ╨╜╨╡ ╨╜╤Г╨╢╨╡╨╜).
- ╨Ъ╨░╤А╤В╨╛╤З╨║╨╕ `blog-posts` (web+public) + `blog:sync-bodies`; plan ╨╛╤В╨╝╨╡╤З╨╡╨╜ owner rewrite.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В. **Prod @`c5c70bc`:** deploy + upsert ├Ч9 `--force-published-at`; live 23.07 = 3├Ч200 (╨Ъ╨░╨╖╨░╨╜╤М/╨Х╨║╨▒/╨Ь╨╛╤Б╨║╨▓╨░); 24-25.07 = 404 ╨┤╨╛ ╤Б╨╗╨╛╤В╨░.

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Listing ╤Г╨╢╨╡ ╨╕╨╝╨╡╨╗ asymmetric grid (`45b013b`); ╤Б╤В╨░╤В╤М╤П ╨╛╤Б╤В╨░╨▓╨░╨╗╨░╤Б╤М ┬л╨║╨░╤А╤В╨╛╤З╨╜╨╛╨╣┬╗ ╤Б display Grotesk ╨╕ ╨▒╨╡╨╖ journal anatomy.
- ╨Т ╨▒╤А╨╡╨╜╨┤╨╡ ╤Г╨╢╨╡ ╨╡╤Б╤В╤М Source Serif 4 (`--font-serif`) ╨╕ Space Grotesk - ╨┤╨╗╤П longread ╨▒╨╡╤А╤С╨╝ serif, body Inter.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Article: hero ╤Б serif H1 + lead; drop cap; pull quotes (`>` ╨╕ `[QUOTE]`); NOTE ╨║╨░╨║ magazine inset; body 16-18px / lh ~1.6.
- Sidebar: ┬л╨Я╨╛ ╤В╨╡╨╝╨╡┬╗ (city hub / events / blog filter / CTA ╨╕╨╖ MD) + ╨║╨╛╨╝╨┐╨░╨║╤В╨╜╤Л╨╡ related.
- ╨Э╨╕╨╖ ╤Б╤В╨░╤В╤М╨╕: strip ┬л╨Ф╨░╨╗╤М╤И╨╡ ╨┐╨╛ ╤В╨╡╨╝╨╡┬╗ ╨▒╨╡╨╖ inline widget.
- Listing: serif ╨╜╨░ large titles, ╨▒╨╛╨╗╤М╤И╨╡ white space ╨╝╨╡╨╢╨┤╤Г ╤А╤П╨┤╨░╨╝╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Sticky ┬л╨╢╨╕╨▓╤Л╨╡┬╗ ╤Б╨╛╨▒╤Л╤В╨╕╤П ╨╕╨╖ public API / TC widget ╨▓╨╜╤Г╤В╤А╨╕ MD - v2.

---

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- `/blog` ╨▒╤Л╨╗ ╤А╨░╨▓╨╜╨╛╨╝╨╡╤А╨╜╨╛╨╣ ╤Б╨╡╤В╨║╨╛╨╣ 3 ╨║╨╛╨╗╨╛╨╜╨║╨╕ - ╨▓╨╕╨╖╤Г╨░╨╗╤М╨╜╨╛ ╨┐╨╗╨╛╤Б╨║╨╛, ╨▒╨╡╨╖ ╤А╨╕╤В╨╝╨░.
- City hub teasers (╨┤╨╛ 3 ╤И╤В) ╤В╨╛╨╢╨╡ ╤И╨╗╨╕ ╨╛╨┤╨╕╨╜╨░╨║╨╛╨▓╤Л╨╝╨╕ ╨║╨░╤А╤В╨╛╤З╨║╨░╨╝╨╕ ╨▓ ╤А╤П╨┤.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `BlogMagazineGrid`: desktop ╨▒╨╗╨╛╨║╨╕ ╨┐╨╛ 3 - ╨║╤А╤Г╨┐╨╜╨░╤П ~2/3 + ╨┤╨▓╨╡ stacked ~1/3, ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╣ ╨▒╨╗╨╛╨║ ╨╖╨╡╤А╨║╨░╨╗╤М╨╜╨╛; ╤Е╨▓╨╛╤Б╤В pair/single ╨░╨║╨║╤Г╤А╨░╤В╨╜╨╛.
- `BlogPostCard` variants `large|small|default` (╨▓╤Л╤И╨╡ cover / ╨║╤А╤Г╨┐╨╜╨╡╨╡ title ╤Г large).
- City hub `CityHubArticlesGrid` ╨┐╤А╨╕ 3 ╤В╨╕╨╖╨╡╤А╨░╤Е - ╤В╨╛╤В ╨╢╨╡ 2/3+1/3 ╤А╨╕╤В╨╝.
- Mobile: single column, ╨║╤А╤Г╨┐╨╜╤Л╨╡ ╨║╨░╤А╤В╨╛╤З╨║╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-23 - Admin preview ╤Б╤В╨░╤В╨╡╨╣ (draft / scheduled)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Public `/blog/[slug]` ╨╛╤В╨┤╨░╤С╤В ╤В╨╛╨╗╤М╨║╨╛ `PUBLISHED`; ╤З╨╡╤А╨╜╨╛╨▓╨╕╨║╨╕ ╨╕ ╨╛╤В╨╗╨╛╨╢╨╡╨╜╨╜╤Л╨╡ (`publishedAt` ╨▓ ╨▒╤Г╨┤╤Г╤Й╨╡╨╝) ╨╜╨╡ ╨▓╨╕╨┤╨╜╤Л ╨┤╨╛ go-live.
- ╨Я╤А╨╕ ╨│╤А╨░╤Д╨╕╨║╨╡ max 3/day ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╤Г ╨╜╤Г╨╢╨╡╨╜ ╨▓╨╕╨╖╤Г╨░╨╗╤М╨╜╤Л╨╣ QA (NOTE callouts, cover, typography) ╨┤╨╛ ╨┐╤Г╨▒╨╗╨╕╨║╨░╤Ж╨╕╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ш╨╖╨╛╨╗╨╕╤А╨╛╨▓╨░╨╜╨╜╤Л╨╣ route `(article-preview)/admin/articles/[id]/preview` - ╨▒╨╡╨╖ `AdminNextShell`, ╤В╨╛╤В ╨╢╨╡ `BlogArticleView` + markdown pipeline.
- Auth: middleware Basic Auth ╨╜╨░ `/admin/*`; metadata `robots: noindex`.
- ╨С╨░╨╜╨╜╨╡╤А: ┬л╨з╨╡╤А╨╜╨╛╨▓╨╕╨║┬╗ / ┬л╨Ч╨░╨┐╨╗╨░╨╜╨╕╤А╨╛╨▓╨░╨╜╨╛ ╨╜╨░ тАж┬╗ (future `publishedAt`) / ╤Б╤В╨░╤В╤Г╤Б╤Л review/published/archive.
- ╨Ъ╨╜╨╛╨┐╨║╨╕ ┬л╨Я╤А╨╡╨▓╤М╤О┬╗ ╨▓ list + edit. ╨Я╨╛╨╗╨╡ ╨║╨░╨╜╨╛╨╜╨░ ╨╛╤Б╤В╨░╤С╤В╤Б╤П `publishedAt` (schedule-╨░╨│╨╡╨╜╤В: `PUBLISHED` + future `publishedAt`, public filter `publishedAt <= now`).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В (finance ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕). **Prod @`b664b84`:** deploy OK; preview ╨▒╨╡╨╖ auth тЖТ 401; ╤Б Basic Auth тЖТ 200 + `noindex` + ╨▒╨░╨╜╨╜╨╡╤А.

---

## 2026-07-23 - SEO guides: max 3/day + schedule publishedAt

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╨╜╨╡ ╨▒╨╛╨╗╨╡╨╡ 3 ╤Б╤В╨░╤В╨╡╨╣ ╨▓ ╨┤╨╡╨╜╤М live; ╨╛╤Б╤В╨░╨╗╤М╨╜╨╛╨╡ ╨▓ ╨│╤А╨░╤Д╨╕╨║; ╨▓ ╨┤╨╜╨╡╨▓╨╜╨╛╨╣ ╨┐╨░╤З╨║╨╡ ╨╝╨╕╨║╤Б╨╛╨▓╨░╤В╤М ╨│╨╛╤А╨╛╨┤╨░.
- ╨Э╨░ prod ╨┐╨░╤З╨║╨░ A (3) + ╨Ь╨б╨Ъ/╨б╨Я╨▒ (6) ╨▒╤Л╨╗╨╕ live ╤А╨░╨╖╨╛╨╝.
- Public API ╤Д╨╕╨╗╤М╤В╤А╨╛╨▓╨░╨╗ ╤В╨╛╨╗╤М╨║╨╛ `status=PUBLISHED`, ╨▒╨╡╨╖ `publishedAt <= now` - future date ╨╜╨╡ ╤Б╨║╤А╤Л╨▓╨░╨╗ URL.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Runtime: `buildPublicArticlesList` / `buildPublicArticlePage` - ╤Г╤Б╨╗╨╛╨▓╨╕╨╡ `(publishedAt is null or publishedAt <= now())`.
- ╨Ъ╨░╨╗╨╡╨╜╨┤╨░╤А╤М 09:00 MSK: 23.07 - ╨Ъ╨░╨╖╨░╨╜╤М/╨Х╨║╨▒/╨Ь╨╛╤Б╨║╨▓╨░; 24.07 - ╨Х╨║╨▒/╨б╨Я╨▒/╨Ь╨╛╤Б╨║╨▓╨░; 25.07 - ╨Ь╨╛╤Б╨║╨▓╨░/╨б╨Я╨▒/╨б╨Я╨▒.
- Frontmatter `publishedAt` + `blog:upsert --force-published-at`; ╨┐╤А╨░╨▓╨╕╨╗╨╛ ╨▓ plan + GPT prompt.
- ╨б╤В╨░╤В╤Г╤Б ╨╛╤Б╤В╨░╤С╤В╤Б╤П `PUBLISHED` (╨╜╨╡ DRAFT): ╤А╨░╤Б╨┐╨╕╤Б╨░╨╜╨╕╨╡ ╤З╨╡╤А╨╡╨╖ ╨┤╨░╤В╤Г, cron ╨╜╨╡ ╨╜╤Г╨╢╨╡╨╜.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- 25.07 ╨╜╨╡╨╕╨╖╨▒╨╡╨╢╨╜╨╛ 2├Ч╨б╨Я╨▒ (╨╛╤Б╤В╨░╤В╨╛╨║ ╨╕╨╜╨▓╨╡╨╜╤В╨░╤А╤П 3 ╨Ь╨б╨Ъ + 3 ╨б╨Я╨▒ ╨┐╨╛╤Б╨╗╨╡ ╨┤╨▓╤Г╤Е ╤Б╨╝╨╡╤И╨░╨╜╨╜╤Л╤Е ╨┤╨╜╨╡╨╣).

---

## 2026-07-23 - SEO guides ╨Ь╨б╨Ъ/╨б╨Я╨▒ тЖТ ╨▒╨╗╨╛╨│

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Р╤А╤Е╨╕╨▓ `daibilet-guides-moscow-spb.zip`: 6 MD (╨Ь╨╛╤Б╨║╨▓╨░ 2 ╨┤╨╜╤П / ╤А╨╡╤З╨╜╤Л╨╡ / ╤Г╨╢╨╕╨╜; ╨б╨Я╨▒ 3 ╨┤╨╜╤П / ╨Э╨╡╨▓╨░-╨║╨░╨╜╨░╨╗╤Л / ╨║╨╛╨╜╤Ж╨╡╤А╤В╤Л).
- Frontmatter ╤Б╨╛╨▓╨┐╨░╨╗ ╤Б╨╛ ╤Б╤Е╨╡╨╝╨╛╨╣; ╨┤╨╗╨╕╨╜╨╜╤Л╤Е ╤В╨╕╤А╨╡ ╨╜╨╡╤В; `[NOTE]` + CTA ╨╜╨░ ╨╢╨╕╨▓╤Л╨╡ CHPU ╨Ь╨б╨Ъ/╨б╨Я╨▒.
- ╨Э╨╡ ╨┐╨╡╤А╨╡╤Б╨╡╨║╨░╨╡╤В╤Б╤П ╤Б╨╛ slug ╨┐╨░╤З╨║╨╕ A (╨Ъ╨░╨╖╨░╨╜╤М/╨Х╨║╨▒).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `PUBLISHED` ╨▓ `content/blog/` + ╨║╨░╤А╤В╨╛╤З╨║╨╕ `blog-posts` (web+public), `blog-meta`, `blog:sync-bodies`.
- Cover: ╨┐╨╗╨╡╨╣╤Б╤Е╨╛╨╗╨┤╨╡╤А `cities/moscow.png` / `saint-petersburg.png` тЖТ `/images/blog/{slug}.jpg` (TODO ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╡ ╤Д╨╛╤В╨╛).
- ╨Я╨╗╨░╨╜ `docs/seo-guide-articles-plan.md`: ID 11, 12, 18, 19, 30 + ╨║╨╛╨╜╤Ж╨╡╤А╤В╤Л ╨б╨Я╨▒ ╨╛╤В╨╝╨╡╤З╨╡╨╜╤Л ╤А╨░╨╖╨╝╨╡╤Й╤С╨╜╨╜╤Л╨╝╨╕.
- ╨Я╨╛╨╖╨╢╨╡ ╤А╨░╨╖╨╜╨╡╤Б╨╡╨╜╤Л ╨┐╨╛ ╨║╨░╨╗╨╡╨╜╨┤╨░╤А╤О тЙд3/╨┤╨╡╨╜╤М (╤Б╨╝. ╨╖╨░╨┐╨╕╤Б╤М ╨▓╤Л╤И╨╡).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╡ ╨╛╨▒╨╗╨╛╨╢╨║╨╕/inline ╨╡╤Й╤С ╨╜╨╡ ╤Б╨╜╤П╤В╤Л - city placeholder.

---

## 2026-07-23 - Batch A: ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╡ cover ╨▓╨╝╨╡╤Б╤В╨╛ city-placeholder

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ prod ╤Г ╨│╨╕╨┤╨╛╨▓ batch A (`kazan-2-3-dnya-samostoyatelno-karta`, `ekb-stendap-uralskiy-yumor`, `ekb-uralskiy-mars-bazhovskie-ekskursii`) cover ╨▒╤Л╨╗ ╨║╨╛╨┐╨╕╨╡╨╣ `cities/*.png`.
- Frontmatter ╤Г╨╢╨╡ ╤Г╨║╨░╨╖╤Л╨▓╨░╨╗ `/images/blog/{slug}.jpg`; ╨╝╨╡╨╜╤П╤В╤М MD ╨╜╨╡ ╨╜╤Г╨╢╨╜╨╛.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨б╨│╨╡╨╜╨╡╤А╨╕╤А╨╛╨▓╨░╨╜╤Л 3 ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╡ landscape-╨╛╨▒╨╗╨╛╨╢╨║╨╕ (╨▒╨╡╨╖ ╤В╨╡╨║╤Б╤В╨░/╨╗╨╛╨│╨╛╤В╨╕╨┐╨╛╨▓) тЖТ `apps/public/public/images/blog/{slug}.jpg`.
- Sync ╨▓ Next public ╨╕╨┤╤С╤В ╤З╨╡╤А╨╡╨╖ `apps/web/scripts/sync-public-assets.mjs` ╨╜╨░ build.
- Moscow-spb zip / F4 ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Inline-╤Д╨╛╤В╨╛ ╨┤╨╗╤П batch A ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╨╜╨╡ ╤Б╨┤╨╡╨╗╨░╨╜╤Л (╨▓╨╜╨╡ scope ╤Н╤В╨╛╨╣ ╨╖╨░╨┤╨░╤З╨╕).

---

## 2026-07-23 - Fix `[NOTE]` mid-article: nested markdown links

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ prod `/blog/kazan-2-3-dnya-samostoyatelno-karta` ╤Б╤Л╤А╨╛╨╣ `NOTE label=тАж` ╤А╨╡╨╜╨┤╨╡╤А╨╕╨╗╤Б╤П ╨║╨░╨║ ╨╛╨┤╨╜╨░ ╤Б╨╕╨╜╤П╤П ╤Б╤Б╤Л╨╗╨║╨░.
- ╨Т╤Б╨╡ 3 guide batch A ╨╕╨╝╨╡╤О╤В `[╨░╨╜╨║╨╛╤А](url)` ╨▓╨╜╤Г╤В╤А╨╕ `text="тАж"`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `parseNoteBlock` / `CTA_REGEX`: ╨▓╨╝╨╡╤Б╤В╨╛ `[^\]]+` - `(?:[^\]"]|"[^"]*")+`, ╤З╤В╨╛╨▒╤Л `]` ╨▓╨╜╤Г╤В╤А╨╕ ╨║╨░╨▓╤Л╤З╨╡╨║ ╨╜╨╡ ╨╛╨▒╤А╤Л╨▓╨░╨╗ ╨▒╨╗╨╛╨║.
- ╨Я╨╛╨┤╨┤╨╡╤А╨╢╨░╨╜ bare `NOTE label=тАж` ╨▒╨╡╨╖ ╤Б╨║╨╛╨▒╨╛╨║.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨б╤В╨░╤А╤Л╨╣ regex + inline link-╨┐╨░╤А╤Б╨╡╤А ╤Б╨║╨╗╨╡╨╕╨▓╨░╨╗╨╕ `[NOTE тАж [╨░╨╜╨║╨╛╤А]` ╨▓ ╨╛╨┤╨╕╨╜ `<a href=url>` - ╨╛╤В╤Б╤О╨┤╨░ ┬л╤Б╨╕╨╜╤П╤П ╤Б╤В╤А╨╛╨║╨░┬╗.

---

## 2026-07-23 - F4.6 hard-retire Vite /legacy

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж ╨▓╤Л╨▒╤А╨░╨╗ F4.6: ╨┤╨╛╨▒╨╕╤В╤М schedule/sales/source, landing blocks, buyers (+ unarchive/delete), ╨╖╨░╤В╨╡╨╝ ╤Г╨▒╤А╨░╤В╤М `/legacy`.
- Landing blocks write API ╨▓ ╨▒╤Н╨║╨╡╨╜╨┤╨╡ ╨╜╨╡ ╨▒╤Л╨╗╨╛ (Vite = preview). Mapping inbox / audit-log ╨▓ Vite ╤Г╨╢╨╡ stub тЖТ `/`.
- Finance / blog content ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Next: event ops panels; landing blocks preview; `/admin/buyers`; order unarchive + hard delete.
- Hard-retire: nginx ╨▒╨╡╨╖ `/legacy`, deploy ╨▒╨╡╨╖ Vite build/rsync, middleware `/legacy` тЖТ `/admin`.
- **Vite retire status: YES** (served SPA). `apps/admin` source ╨╝╨╛╨╢╨╡╤В ╨╛╤Б╤В╨░╤В╤М╤Б╤П ╨▓ ╨╝╨╛╨╜╨╛╤А╨╡╨┐╨╛.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Blocks CRUD write - ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ future API, ╨╡╤Б╨╗╨╕ ╨┐╨╛╨╜╨░╨┤╨╛╨▒╨╕╤В╤Б╤П ╤А╨╡╨┤╨░╨║╤В╨╕╤А╨╛╨▓╨░╨╜╨╕╨╡ ╤Б╨╛╤Б╤В╨░╨▓╨░ ╨▒╨╗╨╛╨║╨╛╨▓.

---

## 2026-07-23 - F4.5 rare ops (taxonomy / ticket-link / ECR / Reviews)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж ╨▓╤Л╨▒╤А╨░╨╗ F4.5 rare ops (╨╜╨╡ freeze): taxonomy, ticket-link, ECR/Reviews + candidates.
- API ╤Г╨╢╨╡ ╨▒╤Л╨╗: `/api/admin/taxonomy`, event taxonomy PATCH, order tickets POST, reviews, event-change-requests, landing candidates.
- ╨Я╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╨╛ guides batch A - content/blog ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Next: taxonomy form ╨╜╨░ `/admin/events/[id]`; ticket upsert + candidates ╨╜╨░ orders; candidates search ╨╜╨░ landings; `/admin/reviews`; `/admin/change-requests` (+ detail).
- Nav: ╨Ю╤В╨╖╤Л╨▓╤Л + ECR.
- Soft-retire checklist ╨╛╨▒╨╜╨╛╨▓╨╗╤С╨╜; **Vite hard-retire: NO** (schedule/sales, content blocks, buyers, unarchive/delete).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╨╗╨╜╤Л╨╣ Vite Events sheet (╤А╨░╤Б╨┐╨╕╤Б╨░╨╜╨╕╨╡/╨┐╤А╨╛╨┤╨░╨╢╨╕) ╨╕ landing blocks editor ╨▓╤Б╤С ╨╡╤Й╤С ╨╜╤Г╨╢╨╜╤Л.
- Finance ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

---

## 2026-07-23 - SEO guide ╨┐╨░╤З╨║╨░ A (ID 1, 8, 10) тЖТ ╨▒╨╗╨╛╨│

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Р╤А╤Е╨╕╨▓ `daibilet-guides-batch-a.zip`: 3 MD ╤Н╤В╨░╨╗╨╛╨╜╨░ (╨Ъ╨░╨╖╨░╨╜╤М 2-3 ╨┤╨╜╤П, ╤Б╤В╨╡╨╜╨┤╨░╨┐ ╨Х╨║╨▒, ╨г╤А╨░╨╗╤М╤Б╨║╨╕╨╣ ╨Ь╨░╤А╤Б).
- Frontmatter GPT ╤Б╨╛╨▓╨┐╨░╨╗ ╤Б╨╛ ╤Б╤Е╨╡╨╝╨╛╨╣ `content/blog`; ╨┤╨╗╨╕╨╜╨╜╤Л╤Е ╤В╨╕╤А╨╡ ╨╜╨╡╤В; `[NOTE]` + CTA ╨╜╨░ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╤С╨╜╨╜╤Л╨╡ CHPU.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨а╨░╨╖╨╝╨╡╤Й╨╡╨╜╤Л `content/blog/{kazan-2-3-dnya-samostoyatelno-karta,ekb-stendap-uralskiy-yumor,ekb-uralskiy-mars-bazhovskie-ekskursii}.md` (`PUBLISHED`).
- ╨Ъ╨░╤А╤В╨╛╤З╨║╨╕ ╨▓ `blog-posts` (web+public), `blog-meta` (+ ╤Д╨╕╨╗╤М╤В╤А `ekaterinburg`), `blog:sync-bodies`.
- Cover: `/images/blog/{slug}.jpg` (╤Б╨╜╨░╤З╨░╨╗╨░ city-placeholder; ╨┐╨╛╨╖╨╢╨╡ ╨╖╨░╨╝╨╡╨╜╨╡╨╜╤Л ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╝╨╕ ╤Д╨╛╤В╨╛ - ╤Б╨╝. ╨╖╨░╨┐╨╕╤Б╤М ╨▓╤Л╤И╨╡).
- ╨Я╨╗╨░╨╜: `docs/seo-guide-articles-plan.md` - ╨┐╨░╤З╨║╨░ A ╨╛╤В╨╝╨╡╤З╨╡╨╜╨░ ╤А╨░╨╖╨╝╨╡╤Й╤С╨╜╨╜╨╛╨╣.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Inline-╤Д╨╛╤В╨╛ ╨┤╨╗╤П batch A ╨╡╤Й╤С ╨╜╨╡ ╤Б╨┤╨╡╨╗╨░╨╜╤Л (covers ╨╖╨░╨║╤А╤Л╤В╤Л ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨╣ ╨╖╨░╨┐╨╕╤Б╤М╤О).

---

## 2026-07-23 - F4.4 Orders/Venues/Cities + soft-retire legacy

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ F4.3 daily edit Events/Landings ╤Г╨╢╨╡ ╨▓ Next; ╨╛╨┐╨╡╤А╨░╤В╨╛╤А╤Б╨║╨╕╨╣ ╨╛╤Б╤В╨░╤В╨╛╨║: Orders mirror, Venues/Cities SEO.
- ╨Я╨╛╨╗╨╜╤Л╨╣ Vite Events/Orders sheet ╤Б╨╗╨╕╤И╨║╨╛╨╝ ╨▓╨╡╨╗╨╕╨║ ╨┤╨╗╤П hard retire ╨▓ ╨╛╨┤╨╜╨╛╨╝ ╨╕╨╜╨║╤А╨╡╨╝╨╡╨╜╤В╨╡.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Next: `/admin/orders` (+ detail/archive/sync), `/admin/venues/[id]`, `/admin/cities/[id]`.
- Nav: Orders/Venues/Cities ready.
- Soft-retire: nginx/docs mark `/legacy` deprecated; Vite build ╨╛╤Б╤В╨░╤С╤В╤Б╤П.
- Checklist full retire: `docs/phases/phase-f4-retire-legacy.md`.
- **Vite retire possible: NO** (taxonomy, candidates, ticket-link, ECR ╨▒╨╡╨╖ Next-╨╖╨░╨╝╨╡╨╜╤Л).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Ticket upsert / unarchive / delete ╨╛╤Б╤В╨░╤О╤В╤Б╤П ╨╜╨░ Vite.
- Finance ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

---

## 2026-07-23 - SEO guide batch #1 + blog NOTE callout

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж ╤Г╤В╨▓╨╡╤А╨┤╨╕╨╗ 10 ╨┐╤Г╤В╨╡╨▓╨╛╨┤╨╕╤В╨╡╨╗╨╡╨╣ (5 ╨Ъ╨░╨╖╨░╨╜╤М + 5 ╨Х╨║╨▒) ╤Б mid CTA ╨╕ ╨┐╤А╨░╨▓╨╕╨╗╨░╨╝╨╕ ╨╛╤Д╨╛╤А╨╝╨╗╨╡╨╜╨╕╤П.
- `/zagorodnye-ekskursii/{city}` ╨▓ ╤А╨╛╤Г╤В╨╕╨╜╨│╨╡ ╤А╨░╨╖╤А╨╡╤И╤С╨╜ ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П `saint-petersburg`; ╨┤╨╗╤П ╨Ъ╨░╨╖╨░╨╜╨╕/╨Х╨║╨▒ CTA ╨╖╨░╨│╨╛╤А╨╛╨┤╨╜╤Л╤Е ╤В╨╡╨╝ = `/ekskursii/{city}/`.
- ╨Ю╤В╨┤╨╡╨╗╤М╨╜╨╛╨│╨╛ CHPU ┬л╤Б╨╝╨╛╤В╤А╨╛╨▓╤Л╨╡ ╨┐╨╗╨╛╤Й╨░╨┤╨║╨╕┬╗ ╨╜╨╡╤В тЖТ ╨Х╨║╨▒ ╤Б╨╝╨╛╤В╤А╨╛╨▓╤Л╨╡ CTA = `/ekskursii/ekaterinburg/`.
- ╨Т ╨▒╨╗╨╛╨│╨╡ ╤Г╨╢╨╡ ╨▒╤Л╨╗╨╕ `[CTA]` / `[buy]` / `[image]`, ╨╜╨╛ ╨╜╨╡ ╨▒╤Л╨╗╨╛ ╨╜╨░╤В╨╕╨▓╨╜╨╛╨╣ mid-article ╨┐╨╗╨░╤И╨║╨╕ ┬л╨Т╨░╨╢╨╜╨╛┬╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Batch #1 ╨╖╨░╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜ ╨▓ `docs/seo-guide-articles-plan.md` (+ csv); GPT batch-╨┐╤А╨╛╨╝╨┐╤В - `docs/seo-guide-articles-gpt-prompt.md`.
- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜ `BlogArticleNote` + ╨┐╨░╤А╤Б╨╡╤А `[NOTE label="тАж" text="тАж"]` ╨▓ `BlogArticleContent`; `![alt](TODO-photo)` ╤А╨╡╨╜╨┤╨╡╤А╨╕╤В╤Б╤П ╨║╨░╨║ ╨┐╨╗╨╡╨╣╤Б╤Е╨╛╨╗╨┤╨╡╤А.
- ╨Я╨╛╨╗╨╜╤Л╨╡ 10 ╤В╨╡╨║╤Б╤В╨╛╨▓ ╨╜╨╡ ╨┐╨╕╤И╨╡╨╝ ╨▓ ╤Н╤В╨╛╨╝ ╤В╨╕╨║╨╡╤В╨╡; ╨│╨╡╨╜╨╡╤А╨░╤Ж╨╕╤П ╤Г ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░ ╨▓ GPT, ╤А╨░╨╖╨╝╨╡╤Й╨╡╨╜╨╕╨╡ ╨┐╨░╤З╨║╨░╨╝╨╕ MD ╨▓ Cursor.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Intent `/podborki/besplatno/kazan` ╨╝╨╛╨╢╨╡╤В ╨▒╤Л╤В╤М thin (&lt; 6) - CTA ╨▓╤Б╤С ╤А╨░╨▓╨╜╨╛ ╨║╨░╨╜╨╛╨╜╨╕╤З╨╡╤Б╨║╨╕╨╣ intent URL.

## 2026-07-23 - F4.3 Events/Landings deep CRUD тЖТ Next

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Vite EventsPage ~1539 LOC (8 tabs) ╨╕ LandingsPage ~802 LOC - ╨┐╨╛╨╗╨╜╤Л╨╣ port ╨▓ ╨╛╨┤╨╜╨╛╨╝ ╨╕╨╜╨║╤А╨╡╨╝╨╡╨╜╤В╨╡ ╤А╨╕╤Б╨║╨╛╨▓╨░╨╜.
- ╨Ю╨┐╨╡╤А╨░╤В╨╛╤А╤Б╨║╨╕╨╣ hot path: override ╤В╨╡╨║╤Б╤В╨╛╨▓ + ╤Б╤В╨░╤В╤Г╤Б ╨┐╤Г╨▒╨╗╨╕╨║╨░╤Ж╨╕╨╕; pin/exclude + SEO ╨╗╨╡╨╜╨┤╨╕╨╜╨│╨░.
- Backend PATCH ╤Г╨╢╨╡ ╨│╨╛╤В╨╛╨▓ (`/override`, `/moderation`, `/landings/:slug`, `/matches/:eventId`).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Next `/admin/events/[id]`: Content + SEO + Media override + ModerationPanel (server actions).
- Next `/admin/landings/[slug]`: SEO form + Pin/Hide/Auto ╨╜╨░ sample/excluded.
- List deep-links ╨▓╨╡╨┤╤Г╤В ╨▓ Next; Vite ╤Б╤Б╤Л╨╗╨║╨╕ ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П taxonomy / candidates.
- Zod `mergeGroupKey` ╨▓ override schema (typed path).
- Docs: `phase-f4-deep-crud.md`; Tasktracker F4.3 тЬЕ; next = F4.4 remaining legacy.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- canPublish gate ╨╜╨░ detail - soft (╨╕╨╖ list q=id); PUBLISHED disabled ╨┐╤А╨╕ blockers.
- Candidates search ╨╕ taxonomy ╨╛╤Б╤В╨░╤О╤В╤Б╤П ╨╜╨░ `/legacy` ╨┤╨╛ F4.4.
- Finance ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

---

## 2026-07-23 - F4.2 Sync jobs тЖТ apps/worker

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- `apps/worker` ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╨╛╨▓╨░╨╗; sync ╨╢╨╕╨╗ ╨▓ root `scripts/*` + cron/systemd + spawn ╨╕╨╖ `server.js`.
- Admin Sources ╤Г╨╢╨╡ ╨▒╤М╤С╤В ╨▓ legacy API (`POST тАж/ticketscloud/sync`, `тАж/tep/sync`) - ╤В╨╛╤В ╨╢╨╡ pipeline.
- Long-running worker daemon ╨╜╨░ 3.8Gi ╨╜╨╡╨╢╨╡╨╗╨░╤В╨╡╨╗╨╡╨╜ (OOM risk ╤Г╨╢╨╡ ╤Б╨╜╨╕╨╝╨░╨╗╨╕ out-of-process oneshot).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜ `@daibilet/worker`: CLI `bin/run.mjs` ╤Б jobs `tc-catalog` / `tep-catalog` / `tc-orders` / `tep-orders` / `health`.
- Jobs ╤В╨╛╨╗╤М╨║╨╛ spawn ╤В╨╡╤Е ╨╢╨╡ root scripts (╨▒╨╡╨╖ ╨┐╨╡╤А╨╡╨┐╨╕╤Б╤Л╨▓╨░╨╜╨╕╤П TC/TEP).
- `deploy/cron/*-sync.sh` ╨┐╨╡╤А╨╡╨▓╨╡╨┤╨╡╨╜╤Л ╨╜╨░ worker CLI; systemd timers ╨▒╨╡╨╖ ╤Б╨╝╨╡╨╜╤Л ExecStart.
- Admin triggers ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕: ╤Б╨╛╨▓╨╝╨╡╤Б╤В╨╕╨╝╨╛╤Б╤В╤М Sources ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╨░.
- Docs: `docs/phases/phase-f4-worker.md`; Tasktracker F4.2 тЬЕ; next = F4.3 deep CRUD port.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Prod ╨┐╨╛╨┤╤Е╨▓╨░╤В╨╕╤В worker ╨┐╨╛╤Б╨╗╨╡ git pull (╨┐╨╛╨╗╨╜╤Л╨╣ `deploy-prod-next` ╨╜╨╡ ╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╨╡╨╜ ╨┤╨╗╤П CLI-only).
- `tep-orders` ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г stub / cron off.


### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨г╤В╨▓╨╡╤А╨╢╨┤╤С╨╜╨╜╤Л╨╣ TOP-15 ╨╜╤Г╨╢╨╡╨╜ ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╤Г ╨┤╨╗╤П ╤А╤Г╤З╨╜╨╛╨│╨╛ ╨┐╨╡╤А╨╡╨╛╨▒╤Е╨╛╨┤╨░ ╨▓ ╨п╨╜╨┤╨╡╨║╤Б.╨Т╨╡╨▒╨╝╨░╤Б╤В╨╡╤А / GSC - ╨░╨│╨╡╨╜╤В ╨▓ ╨┐╨░╨╜╨╡╨╗╨╕ ╨╜╨╡ ╨╗╨╛╨│╨╕╨╜╨╕╤В╤Б╤П.
- Landings chunk ╨╜╨░ prod ╤Г╨╢╨╡ ╤Д╨╕╨╗╤М╤В╤А╤Г╨╡╤В thin (< 6 ╨╛╤Д╤Д╨╡╤А╨╛╨▓): ╨Ъ╨░╨╖╨░╨╜╤М/╨║╤А╤Л╤И╨╕/╨╖╨░╨│╨╛╤А╨╛╨┤╨╜╤Л╨╡ ╨╕ ╤А╤П╨┤ TOP URL ╨║╨╛╤А╤А╨╡╨║╤В╨╜╨╛ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В ╨▓ sitemap.
- Static sitemap ╤Б╨╗╨╡╨┐╨╛ ╨▓╨║╨╗╤О╤З╨░╨╗ ╨▓╤Б╨╡ `/podborki/{intent}` ╨▒╨╡╨╖ ╨┐╤А╨╛╨▓╨╡╤А╨║╨╕ ╨╛╤Д╤Д╨╡╤А╨╛╨▓: `/podborki/besplatno` ╨▒╤Л╨╗ ╨▓ sitemap ╨┐╤А╨╕ `noindex,follow`.
- City hubs `/cities/kazan` ╨╕ `/cities/ekaterinburg` ╨▓ cities chunk ╨╡╤Б╤В╤М; indexable ╨Х╨║╨▒-╤Б╤В╨╡╨╜╨┤╨░╨┐ ╨╡╤Б╤В╤М ╨▓ landings.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨б╨╛╨▒╤А╨░╨╜ ╨║╨╛╨┐╨╕╨┐╨░╤Б╤В TOP-15 ╨░╨▒╤Б╨╛╨╗╤О╤В╨╜╤Л╤Е URL ╨┤╨╗╤П ╨┐╨╡╤А╨╡╨╛╨▒╤Е╨╛╨┤╨░ (owner action).
- `buildStaticSitemapEntries` ╤Б╤В╨░╨╗ async: intents (╨╕ city-variants ╨┐╤А╨╕╨╛╤А╨╕╤В╨╡╤В╨╜╤Л╤Е ╨│╨╛╤А╨╛╨┤╨╛╨▓) ╨┐╨╛╨┐╨░╨┤╨░╤О╤В ╨▓ sitemap ╤В╨╛╨╗╤М╨║╨╛ ╨┐╤А╨╕ тЙе `MIN_LISTING_OFFERS_FOR_INDEX`.
- ╨Я╨╗╨░╨╜ ╨║╨╛╨╜╤В╨╡╨╜╤В╨╜╨╛╨╣ ╨▓╨╛╤А╨╛╨╜╨║╨╕: `docs/seo-guide-articles-plan.md` (+ csv) - 30 ╤В╨╡╨╝ ╨Ъ╨░╨╖╨░╨╜╤М/╨Х╨║╨▒/╨Ь╨б╨Ъ/╨б╨Я╨▒ ╤Б CHPU ╨╕ ╨┐╤А╨╕╨╛╤А╨╕╤В╨╡╤В╨╛╨╝. ╨Я╨╛╨╗╨╜╤Л╨╡ ╤В╨╡╨║╤Б╤В╤Л ╨╜╨╡ ╨┐╨╕╤И╨╡╨╝ ╨┐╨░╤З╨║╨╛╨╣.
- Sitemap ╨┤╨╗╤П ╨┐╨░╨╜╨╡╨╗╨╡╨╣: `https://daibilet.ru/sitemap.xml` (index).
- **Prod smoke @`7a8aa6c` (╨║╨╛╨┤ fix `0fe5140`):** `/sitemaps/static.xml` ╨▒╨╡╨╖ thin `/podborki/besplatno`; `/podborki/na-vyhodnye` ╨╕ ╤Б╨╛╤Б╨╡╨┤╨╜╨╕╨╡ indexable intents ╨╜╨░ ╨╝╨╡╤Б╤В╨╡; landings ╨▒╨╡╨╖ ╨Ъ╨░╨╖╨░╨╜╤М/╨║╤А╤Л╤И/╨╖╨░╨│╨╛╤А╨╛╨┤╨╜╤Л╤Е thin; `/cities/kazan` + `/cities/ekaterinburg` ╨▓ cities chunk; ╨Х╨║╨▒-╤Б╤В╨╡╨╜╨┤╨░╨┐ ╨▓ landings.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨з╨░╤Б╤В╤М TOP-15 ╤Б╨╡╨╣╤З╨░╤Б thin (`noindex`) - ╨┐╨╡╤А╨╡╨╛╨▒╤Е╨╛╨┤ ╨▓╤Б╤С ╤А╨░╨▓╨╜╨╛ ╨╕╨╝╨╡╨╡╤В ╤Б╨╝╤Л╤Б╨╗, ╨╜╨╛ ╨╕╨╜╨┤╨╡╨║╤Б╨░╤Ж╨╕╤П ╨┤╨╛╨╢╨┤╤С╤В╤Б╤П тЙе 6 ╨╛╤Д╤Д╨╡╤А╨╛╨▓ ╨┐╨╛╤Б╨╗╨╡ sync/matching.
- ╨Ю╤В╨┐╤А╨░╨▓╨║╨░ sitemap ╨╕ ╨║╨╗╨╕╨║╨╕ ╨▓ ╨Т╨╡╨▒╨╝╨░╤Б╤В╨╡╤А╨╡/GSC - ╤В╨╛╨╗╤М╨║╨╛ ╤А╤Г╨║╨░╨╝╨╕ ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░.

---

## 2026-07-23 - Hero ╨│╨╗╨░╨▓╨╜╨╛╨╣: ╤А╨╛╤В╨░╤Ж╨╕╤П ╤Б╨╗╨░╨▓╤П╨╜╤Б╨║╨╕╤Е ╤В╤Г╤А╨╕╤Б╤В╨╛╨▓

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Hero ╨▒╤Л╨╗ ╨╛╨┤╨╕╨╜ ╨║╨░╨┤╤А (`home-hero-friends-selfie.jpg` + mobile crop); ╤Н╤В╨░╨╗╨╛╨╜ ╨▓ `apps/public/public/images/hero/`, sync ╨▓ Next ╨┐╤А╨╕ `web:build`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜╤Л 6 ╨║╨░╨┤╤А╨╛╨▓ `hero-slavic-01..06.png` (╤Б╨╗╨░╨▓╤П╨╜╤Б╨║╨░╤П ╨▓╨╜╨╡╤И╨╜╨╛╤Б╤В╤М, ╨┐╨╛╨╖╨╕╤В╨╕╨▓╨╜╤Л╨╡ ╤Н╨╝╨╛╤Ж╨╕╨╕, ╤А╨░╨╖╨╜╤Л╨╡ ╤Б╤Ж╨╡╨╜╤Л).
- ╨Я╤Г╨╗ `HOME_HERO_IMAGES` (7 ╤И╤В. ╤Б ╤Г╤З╤С╤В╨╛╨╝ ╤Б╤В╨░╤А╨╛╨│╨╛ selfie); SSR-╨▓╤Л╨▒╨╛╤А `pickHomeHeroImage()` + `connection()` ╨╜╨░ ╨║╨░╨╢╨┤╤Л╨╣ ╨╖╨░╨┐╤А╨╛╤Б ╨▒╨╡╨╖ hydration flash.
- Alt ╨╜╨░ ╤А╤Г╤Б╤Б╨║╨╛╨╝; `HomeHeroBackground` ╨┐╤А╨╕╨╜╨╕╨╝╨░╨╡╤В ╨▓╤Л╨▒╤А╨░╨╜╨╜╤Л╨╣ ╤Б╨╡╤В.

**Prod @`ee002e7`:** deploy-prod-next OK; `/` dynamic; 5 ╨╖╨░╨┐╤А╨╛╤Б╨╛╨▓ тЖТ ╤А╨░╨╖╨╜╤Л╨╡ hero (`slavic-01`, selfie, `slavic-05`, тАж); PNG 200.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-23 - SEO ╨Ъ╨░╨╖╨░╨╜╤М/╨Х╨║╨▒: ╨┐╨░╨┤╨╡╨╢╨╕ + 3 meta-╤И╨░╨▒╨╗╨╛╨╜╨░ + thin cards


### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨░╨┤╨╡╨╢╨╕ ╨Ъ╨░╨╖╨░╨╜╨╕/╨Х╨║╨░╤В╨╡╤А╨╕╨╜╨▒╤Г╤А╨│╨░ ╤Г╨╢╨╡ ╨▒╤Л╨╗╨╕ ╨▓ `city-declension.ts`; ╨╜╨╡ ╤Е╨▓╨░╤В╨░╨╗╨╛ ╨╡╨┤╨╕╨╜╨╛╨╣ API `{City_╨Ш╨╝/╨а╨╛╨┤/╨Я╤А}` ╨┐╨╛ slug ╨╕ ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╤Е ╤Д╨╛╤А╨╝╤Г╨╗ meta.
- ╨Я╨╛╤А╨╛╨│ ╨╕╨╜╨┤╨╡╨║╤Б╨░ `MIN_LISTING_OFFERS_FOR_INDEX = 6` ╨╛╤Б╤В╨░╨▓╨╗╨╡╨╜ (╨╜╨╡ ╨┐╨╛╨┤╨╜╨╕╨╝╨░╤В╤М).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `resolveCityCases` / `isSeoExpansionCity` + slugтЖТ╨╕╨╝╤П ╨▓ `city-declension.ts`.
- ╨и╨░╨▒╨╗╨╛╨╜ тДЦ1 listing (╨Ъ╨░╨╖╨░╨╜╤М/╨Х╨║╨▒): title ╤Б `:`, description ┬л╨Р╨║╤В╤Г╨░╨╗╤М╨╜╨░╤П ╨░╤Д╨╕╤И╨░ ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╕тАж Daibilet.ru┬╗ (`seo-listing-meta.ts`). ╨Ь╨╛╤Б╨║╨▓╨░/╨б╨Я╨▒ ╨▒╨╡╨╖ ╤А╨╡╨│╤А╨╡╤Б╤Б╨░ (╤Б╤В╨░╤А╤Л╨╣ dash / ┬л╨Ш╤Й╨╡╤В╨╡тАж┬╗).
- ╨и╨░╨▒╨╗╨╛╨╜ тДЦ2 hub: `╨Р╤Д╨╕╤И╨░ {╨а╨╛╨┤} {╨У╨╛╨┤} - ╨║╤Г╨┤╨░ ╤Б╤Е╨╛╨┤╨╕╤В╤МтАж` (`city-hub-seo.ts`).
- ╨и╨░╨▒╨╗╨╛╨╜ тДЦ3 event: title ╤Б optional ┬л╨╛╤В N ╤А╤Г╨▒.┬╗ (`seo-event-meta.ts`).
- Thin trick: ╨┐╤А╨╕ ╤А╨╛╨▓╨╜╨╛ 6тАУ7 ╨╛╤Д╤Д╨╡╤А╨░╤Е - `LandingThinRelatedCards` (3тАУ4 ╨║╨░╤А╤В╨╛╤З╨║╨╕ ╤Б╨╝╨╡╨╢╨╜╤Л╤Е ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╣) ╤А╤П╨┤╨╛╨╝ ╤Б ┬л╨б╨╝╨╛╤В╤А╨╕╤В╨╡ ╤В╨░╨║╨╢╨╡┬╗.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-23 - SEO owner brief: ╨┐╨╛╤А╨╛╨│ 6, ╤В╨╡╨│╨╕ тЖТ CHPU, trust contacts

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨С╨░╨╖╨░ ~2400 ╤Б╨╛╨▒╤Л╤В╨╕╨╣: ╨б╨Я╨▒ ~819, ╨Ь╨╛╤Б╨║╨▓╨░ ~663, ╨Х╨║╨░╤В╨╡╤А╨╕╨╜╨▒╤Г╤А╨│ ~57, ╨Ъ╨░╨╖╨░╨╜╤М ~51. ╨Я╨╛╤А╨╛╨│ ╨╕╨╜╨┤╨╡╨║╤Б╨░╤Ж╨╕╨╕ ╨╗╨╕╤Б╤В╨╕╨╜╨│╨╛╨▓ 10-12 ╤Б╤А╨╡╨╢╨╡╤В ╨┐╨╛╨╗╨╛╨▓╨╕╨╜╤Г ╨┐╨╛╤Б╨░╨┤╨╛╨║ ╨Х╨║╨▒/╨Ъ╨░╨╖╨░╨╜╤М.
- `/podborki` ╨╛╨▒╨╗╨░╨║╨╛ ╤В╨╡╨│╨╛╨▓ ╨▓╨╡╨╗╨╛ ╨╜╨░ thin `/events?q=тАж`, ╤Е╨╛╤В╤П CHPU landings/intent ╤Г╨╢╨╡ ╨╡╤Б╤В╤М.
- ╨Ъ╨╛╨╜╤В╨░╨║╤В╤Л: email ╨╡╤Б╤В╤М, ╤В╨╡╨╗╨╡╤Д╨╛╨╜╨░ ╨╜╨╡╤В (╨╢╨┤╤С╨╝ 8-800). ╨Ш╨Э╨Э/╨Ю╨У╨а╨Э╨Ш╨Я ╨▒╤Л╨╗╨╕ ╨╜╨░ `/contacts`, ╨╜╨╛ ╨▓ ╤Д╤Г╤В╨╡╤А╨╡ ╤А╨╡╨║╨▓╨╕╨╖╨╕╤В╤Л ╨╜╨╡ ╤Б╨▓╨╡╤В╨╕╨╗╨╕╤Б╤М - ╨┤╨╗╤П ╨п╨╜╨┤╨╡╨║╤Б╨░ (╨╜╨╕╤И╨░ ╨▒╨╕╨╗╨╡╤В╤Л) ╤Б╨╗╨░╨▒╤Л╨╣ trust.
- ╨в╨╡╨║╤Б╤В╤Л ╨▓ ╨║╨░╤А╤В╨╛╤З╨║╨░╤Е ╨┤╨╗╤П ╤А╨╛╨▒╨╛╤В╨╛╨▓ ╨▒╨╡╨┤╨╜╨╛╨▓╨░╤В╤Л; ╤Д╨╛╨║╤Г╤Б SEO ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨╜╨░ ╨╗╨╕╤Б╤В╨╕╨╜╨│╨░╤Е, ╨║╨░╤А╤В╨╛╤З╨║╨╕ ╨╜╨╡ ╤А╨░╨╖╨┤╤Г╨▓╨░╨╡╨╝.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `MIN_LISTING_OFFERS_FOR_INDEX = 6` ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╤С╨╜ ╨╕ ╨╛╤Б╤В╨░╨▓╨╗╨╡╨╜; soft-╤Ж╨╡╨╗╤М `SOFT_LISTING_OFFERS_TARGET = 10`.
- `buildCatalogTagHref` / `resolveCatalogTagHref`: ╤В╨╡╨│ тЖТ CHPU landing/intent (city-aware); `/events?q=` ╤В╨╛╨╗╤М╨║╨╛ fallback. ╨Э╨░ ╤В╨╛╨┐-24 ╤В╨╡╨│╨░╤Е ╨║╨░╤В╨░╨╗╨╛╨│╨░: **23 CHPU / 1 fallback** (`╨и╨╛╤Г - ╨┐╤А╨╛╨│╤А╨░╨╝╨╝╨░`).
- ╨д╤Г╤В╨╡╤А: ╨Ш╨Э╨Э + ╨Ю╨У╨а╨Э╨Ш╨Я ╤А╤П╨┤╨╛╨╝ ╤Б email + ╤Б╤Б╤Л╨╗╨║╨░ ╨╜╨░ `/requisites`. `/contacts`: ╨Ш╨Э╨Э/╨Ю╨У╨а╨Э╨Ш╨Я ╤Г╤Б╨╕╨╗╨╡╨╜╤Л (╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╡ ╤Б╤В╤А╨╛╨║╨╕, ╨╜╨╡ muted). ╨в╨╡╨╗╨╡╤Д╨╛╨╜ ╨╜╨╡ ╨┤╨╛╨▒╨░╨▓╨╗╤П╨╡╨╝.

**Prod @`c72364f`:** deploy-prod-next OK; `/podborki` tag cloud - 23 CHPU + 1 query fallback; home footer ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В ╨Ш╨Э╨Э/╨Ю╨У╨а╨Э╨Ш╨Я; `/contacts` ╤А╨╡╨║╨▓╨╕╨╖╨╕╤В╤Л ╨╜╨░ ╨╝╨╡╤Б╤В╨╡.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ 8-800 / ╨│╨╛╤А╨╛╨┤╤Б╨║╨╛╨╣ ╨╜╨╛╨╝╨╡╤А pending ╤Г ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░ (SEO.9).
- ╨з╨░╤Б╤В╤М ╤А╨╡╨┤╨║╨╕╤Е ╤В╨╡╨│╨╛╨▓ ╨╛╤Б╤В╨░╨╜╨╡╤В╤Б╤П ╨╜╨░ query-fallback - ╤А╨░╤Б╤И╨╕╤А╤П╤В╤М ╤Б╨╗╨╛╨▓╨░╤А╤М ╨┐╨╛ ╨╝╨╡╤А╨╡ ╨┐╨╛╤П╨▓╨╗╨╡╨╜╨╕╤П ╨▓ ╨╛╨▒╨╗╨░╨║╨╡.

---

## 2026-07-23 - SEO: ╨▓╨╜╤Г╤В╤А╨╡╨╜╨╜╤П╤П ╨┐╨╡╤А╨╡╨╗╨╕╨╜╨║╨╛╨▓╨║╨░ + JSON-LD ItemList

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╤Г╨╢╨╡╨╜ ╤Б╨║╨▓╨╛╨╖╨╜╨╛╨╣ ╨▓╨╡╤Б ╤Б ╨│╨╗╨░╨▓╨╜╨╛╨╣ ╨╜╨░ CHPU-╨┐╨╛╤Б╨░╨┤╨║╨╕; ╨║╤А╨╛╤И╨║╨╕ ╤Б╨╛╨▒╤Л╤В╨╕╤П ╨▓╨╡╨╗╨╕ ╨╜╨░ `/events`, ╨▒╨╡╨╖ ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╕; ╨╜╨░ ╨╗╨╕╤Б╤В╨╕╨╜╨│╨░╤Е ╨╜╨╡ ╨▒╤Л╨╗╨╛ ┬л╨б╨╝╨╛╤В╤А╨╕╤В╨╡ ╤В╨░╨║╨╢╨╡┬╗ ╨╕ SSR `ItemList`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨д╤Г╤В╨╡╤А: ╨▒╨╗╨╛╨║ ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╤П┬╗ (╨Ь╨╛╤Б╨║╨▓╨░ / ╨б╨Я╨▒) ╤Б ╤А╨╡╨░╨╗╤М╨╜╤Л╨╝╨╕ CHPU ╨╕ `/podborki/{intent}/{city}` (`seo-internal-links.ts`).
- Event breadcrumbs: `╨У╨╗╨░╨▓╨╜╨░╤П тЖТ ╨У╨╛╤А╨╛╨┤ тЖТ Landing тЖТ Title` + matching ╨┐╨╛ `landingSlugs` / ╤Н╨▓╤А╨╕╤Б╤В╨╕╨║╨╡; JSON-LD BreadcrumbList ╤Б╨╛╨│╨╗╨░╤Б╨╛╨▓╨░╨╜.
- Landing: ╨▒╨╗╨╛╨║ ┬л╨б╨╝╨╛╤В╤А╨╕╤В╨╡ ╤В╨░╨║╨╢╨╡┬╗ (╨║╨╛╨╜╤Д╨╕╨│ slug├Чcity) ╨╜╨░╨┤ SEO-╤В╨╡╨║╤Б╤В╨╛╨╝; SSR `BreadcrumbList` + `ItemList` ╤В╨╛╨╗╤М╨║╨╛ ╨╜╨░ CHPU ╨┐╤А╨╕ non-empty sessions.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

**Prod @`0cf20db`:** footer ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╤П┬╗ ╨╜╨░ `/` ╤Б╨╛ ╨▓╤Б╨╡╨╝╨╕ 8 CHPU/intent URL; event standup SPB breadcrumbs `╨У╨╗╨░╨▓╨╜╨░╤П тЖТ ╨б╨░╨╜╨║╤В-╨Я╨╡╤В╨╡╤А╨▒╤Г╤А╨│ тЖТ ╨б╤В╨╡╨╜╨┤╨░╨┐ ╨╕ ╤О╨╝╨╛╤А`; `/rechnye-progulki/saint-petersburg/` - ┬л╤З╨░╤Б╤В╨╛ ╨╕╤Й╤Г╤В┬╗ + SSR `BreadcrumbList` + `ItemList`.

---

## 2026-07-23 - catalog cards: eye-line object-position

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ ╨║╨░╤А╤В╨╛╤З╨║╨░╤Е ╨║╨░╤В╨░╨╗╨╛╨│╨░ (Pianissimo: ╨з╨╡╤Д╨░╨╜╨╛╨▓ / ╨Ь╨╛╤О╨╜ ╨о╨╜) `object-fit: cover` ╨▒╨╡╨╖ `object-position` (╨┤╨╡╤Д╨╛╨╗╤В center 50%) ╤А╨╡╨╖╨░╨╗ ╨┐╨╛╤А╤В╤А╨╡╤В╨╜╤Л╨╡ ╨░╤Д╨╕╤И╨╕ ╨┐╨╛ ╨│╨╗╨░╨╖╨░╨╝/╨╗╨▒╤Г ╨▓ 16:9 ╨┐╤А╨╡╨▓╤М╤О.
- ╨Э╨░ ╤Б╤В╤А╨░╨╜╨╕╤Ж╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╤П ╤Г╨╢╨╡ ╨▒╤Л╨╗ eye-focus (`event-image-focus.ts`, default `center 18%` + overrides Saprykin/Nurminsky).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜ `resolveEventCardObjectPosition`: ╤В╨╡ ╨╢╨╡ overrides, default `center 20%` ╨┐╨╛╨┤ 16:9 card crop.
- ╨Я╨╛╨┤╨║╨╗╤О╤З╨╡╨╜╨╛ ╨▓ `EventCard` / Showcase / `EventCardHorizontal`. Hero API ╨╜╨╡ ╨╝╨╡╨╜╤П╨╗╤Б╤П (`center 18%`).
- ╨в╨╛╤З╨╡╤З╨╜╤Л╨╡ Pianissimo overrides ╨╜╨╡ ╨╜╤Г╨╢╨╜╤Л: ╨┤╨╡╤Д╨╛╨╗╤В ╨┤╨╡╤А╨╢╨╕╤В ╨│╨╗╨░╨╖╨░ ╨▓ ╨║╨░╨┤╤А╨╡.

**Prod @`539f571`:** deploy-prod-next OK; `/events?q=Pianissimo` HTML ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В `object-position: center 20%`; event hero Pianissimo ╨╛╤Б╤В╨░╤С╤В╤Б╤П `center 18%`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-23 - mobile UX ╨║╨░╤В╨░╨╗╨╛╨│╨░ `/events`

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ ╤Г╨┐╤А╨╛╤Й╨╡╨╜╨╕╤П toolbar (`bfc8cb7`) desktop ╤Б╤В╨░╨╗ ╤З╨╕╤Й╨╡, ╨╜╨╛ mobile ╨╛╤Б╤В╨░╨▓╨░╨╗╤Б╤П ┬л╤Б╨╢╨░╤В╤Л╨╝ desktop┬╗: ╨┐╨╛╨╗╨╜╤Л╨╣ search + select ╨┤╨░╤В╤Л + ╤В╤П╨╢╤С╨╗╤Л╨╣ active-card, sort ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛, page-size ╨▓ title.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Sticky compact bar (╨┐╨╛╨┤ site header): ╨┐╨╛╨╕╤Б╨║-pill / ╤З╨╕╨┐ ╨┤╨░╤В╤Л / ╨╕╨║╨╛╨╜╨║╨░ ╨д╨╕╨╗╤М╤В╤А╤Л ╤Б badge; ╤А╨░╤Б╨║╤А╤Л╤В╨╕╨╡ ╨┐╨╛╨╕╤Б╨║╨░ ╨┐╨╛ ╤В╨░╨┐╤Г.
- ╨У╨╛╤А╨╕╨╖╨╛╨╜╤В╨░╨╗╤М╨╜╤Л╨╣ date scroller (╨Ы╤О╨▒╨░╤П / ╨б╨╡╨│╨╛╨┤╨╜╤П / ╨Ч╨░╨▓╤В╤А╨░ / ╨Т╤Л╤Е╨╛╨┤╨╜╤Л╨╡ / ╨Т╨╡╤З╨╡╤А) ╨▓╨╝╨╡╤Б╤В╨╛ select ╨╜╨░ mobile.
- ╨Ъ╨░╤В╨╡╨│╨╛╤А╨╕╨╕ ╤Б ╨▒╨╛╨╗╤М╤И╨╕╨╝ visual weight + snap; ╨┐╨╛╨┤╨▒╨╛╤А╨║╨╕ secondary; sort chips + view ╤Г ╨▓╤Л╨┤╨░╤З╨╕; page-size ╤В╨╛╨╗╤М╨║╨╛ desktop.
- ╨Я╨░╨│╨╕╨╜╨░╤Ж╨╕╤П: ╨╜╨░ mobile siblingCount=0 (╤Г╨╢╨╡ ╨╛╨║╨╜╨╛ ╨╜╨╛╨╝╨╡╤А╨╛╨▓) + prev/next.
- URL/query, city-in-header, live search, advanced drawer ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣ ╨║╨╛╨╜╤В╤А╨░╨║╤В╨░.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Browser MCP ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╡╨╜ ╨┤╨╗╤П viewport-smoke ╨┤╨╛ ╨┤╨╡╨┐╨╗╨╛╤П; ╨┐╤А╨╛╨▓╨╡╤А╨║╨░ ╤З╨╡╤А╨╡╨╖ curl HTML + ╤А╤Г╤З╨╜╨╛╨╣ ╤В╨╡╨╗╨╡╤Д╨╛╨╜.

---

## 2026-07-23 - ╤Г╨┐╤А╨╛╤Й╨╡╨╜╨╕╨╡ ╤Д╨╕╨╗╤М╤В╤А╨╛╨▓ ╨║╨░╤В╨░╨╗╨╛╨│╨░ ╨╕ numbered pagination

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨С╨╗╨╛╨║ ╤Д╨╕╨╗╤М╤В╤А╨╛╨▓ `/events` ╨▒╤Л╨╗ ╨┐╨╡╤А╨╡╨│╤А╤Г╨╢╨╡╨╜: ╨│╨╛╤А╨╛╨┤ ╨┤╤Г╨▒╨╗╨╕╤А╨╛╨▓╨░╨╗╤Б╤П (╤Е╨╡╨┤╨╡╤А + ╤З╨╕╨┐ + select), live-╤З╨╕╨┐╤Л ╤Б╨╝╨╡╤И╨╕╨▓╨░╨╗╨╕╤Б╤М ╤Б ╤Д╨╛╤А╨╝╨╛╨╣ ╨╕ ╨║╨╜╨╛╨┐╨║╨╛╨╣ ┬л╨Э╨░╨╣╤В╨╕┬╗, ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╕ ╨╕ ╨┐╨╛╨┤╨▒╨╛╤А╨║╨╕ ╤И╨╗╨╕ ╨┤╨▓╤Г╨╝╤П ╤В╤П╨╢╤С╨╗╤Л╨╝╨╕ ╤А╤П╨┤╨░╨╝╨╕.
- ╨Я╨░╨│╨╕╨╜╨░╤Ж╨╕╤П ╨▒╤Л╨╗╨░ ╤В╨╛╨╗╤М╨║╨╛ prev/next ╨▒╨╡╨╖ ╨┐╤А╤Л╨╢╨║╨░ ╨╜╨░ ╨╜╨╛╨╝╨╡╤А ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Л.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Toolbar: ╨┐╨╛╨╕╤Б╨║ ┬╖ ╨┤╨░╤В╨░ ┬╖ ┬л╨д╨╕╨╗╤М╤В╤А╤Л┬╗; ╨│╨╛╤А╨╛╨┤ ╤Г╨▒╤А╨░╨╜ ╨╕╨╖ toolbar ╨╕ ╨╕╨╖ active-chips; ┬л╨Э╨░╨╣╤В╨╕┬╗ ╤Г╨▒╤А╨░╨╜ (debounce + Enter); ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╕ - primary intent; ╨┐╨╛╨┤╨▒╨╛╤А╨║╨╕ ╤Б╨╗╨░╨▒╨╡╨╡/╤Б╨▓╨╛╤А╨░╤З╨╕╨▓╨░╤О╤В╤Б╤П; ╤Б╨╛╤А╤В ╤Г ╨▓╤Л╨┤╨░╤З╨╕.
- `CatalogPaginationLinks`: numbered window `1 тАж ╨╛╨║╤А╨╡╤Б╤В╨╜╨╛╤Б╤В╤М тАж last` + prev/next, query params ╤Б╨╛╤Е╤А╨░╨╜╤П╤О╤В╤Б╤П.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---



### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Hero CTA ╨▓╤Л╨▓╨╛╨┤╨╕╨╗ ╤В╨╛╤В ╨╢╨╡ ╤Д╨╛╤А╨╝╨░╤В ╤Ж╨╡╨╜╤Л, ╤З╤В╨╛ ╨╕ buy-card. ╨Ф╨╗╤П ╤Б╨╛╨▒╤Л╤В╨╕╤П Anastasiya Vysotskaya LADYNSAX payload ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В ╤В╨╛╤З╨╜╤Л╨╡ ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╕ ╨╛╤В 1 000 ╨┤╨╛ 3 000 тВ╜, ╨┐╨╛╤Н╤В╨╛╨╝╤Г ╨▓ ╨║╨╜╨╛╨┐╨║╨╡ ╨┐╨╛╤П╨▓╨╗╤П╨╗╤Б╤П ╨┤╨╕╨░╨┐╨░╨╖╨╛╨╜.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨д╨╛╤А╨╝╨░╤В╤В╨╡╤А╤Л ╤А╨░╨╖╨┤╨╡╨╗╨╡╨╜╤Л: hero CTA ╨▓╤Б╨╡╨│╨┤╨░ ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╡╤В ╨╝╨╕╨╜╨╕╨╝╤Г╨╝ ╨▓ ╨▓╨╕╨┤╨╡ `╨╛╤В 1 000 тВ╜`, ╨░ buy-card ╤Б╨╛╤Е╤А╨░╨╜╤П╨╡╤В ╨╛╨┤╨╜╤Г ╤В╨╛╤З╨╜╤Г╤О ╤Ж╨╡╨╜╤Г ╨╕╨╗╨╕ ╨┤╨╕╨░╨┐╨░╨╖╨╛╨╜ ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╣.
- ╨Т ╨▓╨╕╨┤╨╕╨╝╤Л╤Е ╤Б╤В╤А╨╛╨║╨░╤Е event page ╨╖╨░╨╝╨╡╨╜╨╡╨╜╤Л ╨┤╨╗╨╕╨╜╨╜╤Л╨╡ ╨╕ ╤Б╤А╨╡╨┤╨╜╨╕╨╡ ╤В╨╕╤А╨╡ ╨╜╨░ ╨╛╨▒╤Л╤З╨╜╤Л╨╣ ╨┤╨╡╤Д╨╕╤Б.
- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜╤Л ╤В╨╡╤Б╤В╤Л ╨┤╨╗╤П hero ╤Б ╨╝╨╕╨╜╨╕╨╝╨░╨╗╤М╨╜╨╛╨╣ ╤Ж╨╡╨╜╨╛╨╣, ╨┤╨╕╨░╨┐╨░╨╖╨╛╨╜╨░ buy-card ╨╕ ╨╛╨┤╨╜╨╛╨╣ ╤В╨╛╤З╨╜╨╛╨╣ ╤Ж╨╡╨╜╤Л.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-23 - ╨┐╨╗╨░╨▓╨╜╤Л╨╣ ultrawide hero city hub

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨г hero ╨│╨╛╤А╨╛╨┤╨░ ╨╜╨░ ╤И╨╕╤А╨╕╨╜╨░╤Е ╨╛╤В 1600px ╨┐╤А╨╕╨╝╨╡╨╜╤П╨╗╨╛╤Б╤М ╤А╨╡╨╖╨║╨╛╨╡ ╤Г╨▓╨╡╨╗╨╕╤З╨╡╨╜╨╕╨╡ ╨╕╨╖╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╤П: ╨▓╤Л╤Б╨╛╤В╨░ ╤Б╤А╨░╨╖╤Г ╤Б╤В╨░╨╜╨╛╨▓╨╕╨╗╨░╤Б╤М 118%, ╨░ ╤И╨╕╤А╨╕╨╜╨░ ╨╝╨╡╨╜╤П╨╗╨░╤Б╤М ╨┤╨╛ 72vw. ╨Э╨░ ╨┐╨╡╤А╨╡╤Е╨╛╨┤╨╡ ╤Б ╨╛╨▒╤Л╤З╨╜╨╛╨│╨╛ desktop ╤Н╤В╨╛ ╤Б╨╛╨╖╨┤╨░╨▓╨░╨╗╨╛ ╨╖╨░╨╝╨╡╤В╨╜╤Л╨╣ ╤Б╨║╨░╤З╨╛╨║ ╨║╨╛╨╝╨┐╨╛╨╖╨╕╤Ж╨╕╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨╗╤П `CityHeroDefault` ╤А╨░╨╖╨╝╨╡╤А hero-╨║╨░╨┤╤А╨░ ╨┐╨╛╤Б╨╗╨╡ 1600px ╤А╨░╤Б╤Б╤З╨╕╤В╤Л╨▓╨░╨╡╤В╤Б╤П ╤З╨╡╤А╨╡╨╖ `clamp()`: ╤Б╤В╨░╤А╤В╤Г╨╡╤В ╤Б ╨┐╤А╨╡╨╢╨╜╨╕╤Е desktop 50rem ╨╕ 100% ╨▓╤Л╤Б╨╛╤В╤Л, ╨╖╨░╤В╨╡╨╝ ╨┐╨╗╨░╨▓╨╜╨╛ ╤А╨░╤Б╤В╤С╤В ╨┤╨╛ 70rem ╨╕ 118% ╨╜╨░ ultrawide.
- `sizes` ╤Б╨╕╨╜╤Е╤А╨╛╨╜╨╕╨╖╨╕╤А╨╛╨▓╨░╨╜ ╤Б ╨╜╨╛╨▓╨╛╨╣ ╤Д╨╛╤А╨╝╤Г╨╗╨╛╨╣ ╤И╨╕╤А╨╕╨╜╤Л, ╤З╤В╨╛╨▒╤Л ╨▒╤А╨░╤Г╨╖╨╡╤А ╨╖╨░╨┐╤А╨░╤И╨╕╨▓╨░╨╗ ╨┐╨╛╨┤╤Е╨╛╨┤╤П╤Й╨╕╨╣ ╤А╨░╨╖╨╝╨╡╤А ╨╕╨╖╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╤П.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Ы╨╛╨║╨░╨╗╤М╨╜╤Л╨╡ Node/pnpm-╨╕╨╜╤Б╤В╤А╤Г╨╝╨╡╨╜╤В╤Л ╨▓ ╤А╨░╨▒╨╛╤З╨╡╨╝ ╨╛╨║╤А╤Г╨╢╨╡╨╜╨╕╨╕ ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╜╤Л, ╨┐╨╛╤Н╤В╨╛╨╝╤Г ╨░╨▓╤В╨╛╨╝╨░╤В╨╕╤З╨╡╤Б╨║╨░╤П ╨┐╤А╨╛╨▓╨╡╤А╨║╨░ ╤Б╨▒╨╛╤А╨║╨╕ ╨╜╨╡ ╨▓╤Л╨┐╨╛╨╗╨╜╨╡╨╜╨░. ╨Ш╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╡ ╨╛╨│╤А╨░╨╜╨╕╤З╨╡╨╜╨╛ utility-╨║╨╗╨░╤Б╤Б╨░╨╝╨╕ Tailwind ╨▓ ╨║╨╗╨╕╨╡╨╜╤В╤Б╨║╨╛╨╝ hero.

---

## 2026-07-23 - ╤В╨╛╤З╨╜╨╛╤Б╤В╤М ╨▓╤Л╨┤╨░╤З╨╕ ╨╖╨░╨│╨╛╤А╨╛╨┤╨╜╤Л╤Е ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╣

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Prod `GET /api/public/landings/country-tours` ╨╛╤В╨┤╨░╨▓╨░╨╗ 10 ╤Б╨╡╤Б╤Б╨╕╨╣. ╨Э╨░╤А╤П╨┤╤Г ╤Б ╤В╤А╨╡╨╝╤П ╨┐╤А╨╛╤Д╨╕╨╗╤М╨╜╤Л╨╝╨╕ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╤П╨╝╨╕ ╤В╤Г╨┤╨░ ╨┐╨╛╨┐╨░╨┤╨░╨╗╨╕ ╤Б╨┐╨╡╨║╤В╨░╨║╨╗╨╕, ╨║╨╛╨╜╤Ж╨╡╤А╤В╤Л, ╨╝╤Г╨╖╤Л╨║╨░╨╗╤М╨╜╤Л╨╡ ╤З╤В╨╡╨╜╨╕╤П ╨╕ ╨╕╨╜╤В╨╡╤А╨░╨║╤В╨╕╨▓╨╜╤Л╨╡ ╨┐╤А╨╛╨│╤А╨░╨╝╨╝╤Л, ╨╡╤Б╨╗╨╕ ╨▓ ╨╕╤Е ╨╜╨░╨╖╨▓╨░╨╜╨╕╨╕ ╨▓╤Б╤В╤А╨╡╤З╨░╨╗╨╕╤Б╤М ╨Я╨╡╤В╨╡╤А╨│╨╛╤Д, ╨Я╤Г╤И╨║╨╕╨╜ ╨╕╨╗╨╕ ╨┤╤А╤Г╨│╨╛╨╣ ╨┐╤А╨╕╨│╨╛╤А╨╛╨┤.
- ╨Я╤А╨╕╤З╨╕╨╜╨░: ╨┐╤А╨░╨▓╨╕╨╗╨╛ `country-tours` ╤Б╤З╨╕╤В╨░╨╗╨╛ ╨┤╨╛╤Б╤В╨░╤В╨╛╤З╨╜╤Л╨╝ ╨╛╨┤╨╕╨╜ ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╤З╨╡╤Б╨║╨╕╨╣ keyword ╨▓ content-╨┐╨╛╨╗╤П╤Е ╨╕ ╨╜╨╡ ╤В╤А╨╡╨▒╨╛╨▓╨░╨╗╨╛ ╨┐╤А╨╕╨╖╨╜╨░╨║╨░ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨╗╤П `country-tours` ╨┤╨╛╨▒╨░╨▓╨╗╨╡╨╜╤Л ╨┤╨▓╨╡ ╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╤М╨╜╤Л╨╡ ╨│╤А╤Г╨┐╨┐╤Л ╤Б╨╕╨│╨╜╨░╨╗╨╛╨▓: `╤Н╨║╤Б╨║╤Г╤А╤Б` ╨╕ ╨╛╨┤╨╕╨╜ ╨╕╨╖ ╤В╨╛╨┐╨╛╨╜╨╕╨╝╨╛╨▓/╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╨╣ ╨╖╨░╨│╨╛╤А╨╛╨┤╨╜╨╛╨╣ ╨┐╨╛╨╡╨╖╨┤╨║╨╕. ╨б╨╕╨│╨╜╨░╨╗ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕ ╨╝╨╛╨╢╨╡╤В ╨┐╤А╨╕╤Е╨╛╨┤╨╕╤В╤М ╨╕╨╖ ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╕, ╤В╨╡╨│╨░ ╨╕╨╗╨╕ ╨╜╨░╨╖╨▓╨░╨╜╨╕╤П.
- ╨Ю╨│╤А╨░╨╜╨╕╤З╨╡╨╜╨╕╨╡ ╨│╨╛╤А╨╛╨┤╨░ `╨б╨░╨╜╨║╤В-╨Я╨╡╤В╨╡╤А╨▒╤Г╤А╨│` ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╨╛. ╨а╨╡╨│╤А╨╡╤Б╤Б╨╕╨╛╨╜╨╜╤Л╨╣ ╤В╨╡╤Б╤В ╨┐╨╛╨║╤А╤Л╨▓╨░╨╡╤В ╤А╨╡╨╗╨╡╨▓╨░╨╜╤В╨╜╤Л╨╡ ╨░╨▓╤В╨╛╨▒╤Г╤Б╨╜╤Л╨╡ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕ ╨▓ ╨Я╨╡╤В╨╡╤А╨│╨╛╤Д ╨╕ ╨Т╤Л╨▒╨╛╤А╨│, ╨░ ╤В╨░╨║╨╢╨╡ ╨║╨╛╨╜╤Ж╨╡╤А╤В╤Л, ╤В╨╡╨░╤В╤А, ╨╝╨░╤Б╤В╨╡╤А-╨║╨╗╨░╤Б╤Б╤Л ╨╕ ╨╝╨╛╤Б╨║╨╛╨▓╤Б╨║╤Г╤О ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╤О ╨║╨░╨║ ╨╛╤В╤А╨╕╤Ж╨░╤В╨╡╨╗╤М╨╜╤Л╨╡ ╤Б╨╗╤Г╤З╨░╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Ш╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╡ ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛╨╡: ╨╜╨░ prod ╤Б╤В╨░╤А╨░╤П ╨▓╤Л╨┤╨░╤З╨░ ╤Б╨╛╤Е╤А╨░╨╜╨╕╤В╤Б╤П ╨┤╨╛ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨│╨╛ ╨╖╨░╨┐╤А╨╛╤И╨╡╨╜╨╜╨╛╨│╨╛ ╨┤╨╡╨┐╨╗╨╛╤П. ╨Ы╨╛╨║╨░╨╗╤М╨╜╤Л╨╡ Node/pnpm-╨╕╨╜╤Б╤В╤А╤Г╨╝╨╡╨╜╤В╤Л ╨▓ ╤А╨░╨▒╨╛╤З╨╡╨╝ ╨╛╨║╤А╤Г╨╢╨╡╨╜╨╕╨╕ ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╜╤Л, ╨┐╨╛╤Н╤В╨╛╨╝╤Г ╨░╨▓╤В╨╛╨╝╨░╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ ╨╖╨░╨┐╤Г╤Б╨║ ╤В╨╡╤Б╤В╨░ ╨╕ ╤В╨╛╤З╨╜╤Л╨╣ ╨┐╨╡╤А╨╡╤Б╤З╤С╤В ╨┐╨╛╤Б╨╗╨╡ ╨┐╤А╨░╨▓╨╕╨╗╨░ ╨╜╨╡ ╨▓╤Л╨┐╨╛╨╗╨╜╨╡╨╜╤Л.

---

## 2026-07-23 - ╤Г╤В╨▓╨╡╤А╨╢╨┤╤С╨╜╨╜╤Л╨╣ SEO launch set TOP-15

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т category├Чcity ╨║╨╛╨╜╤В╤Г╤А╨╡ ╤Г╨╢╨╡ ╨▒╤Л╨╗╨╕ ╤А╨╡╤З╨╜╤Л╨╡ ╨┐╤А╨╛╨│╤Г╨╗╨║╨╕ ╨╕ ╤Б╤В╨╡╨╜╨┤╨░╨┐, ╨╜╨╛ ╨╜╨╡ ╤Е╨▓╨░╤В╨░╨╗╨╛ ╨┐╤А╨░╨▓╨╕╨╗ ╨╕ URL ╨┤╨╗╤П ╨┐╨╡╤И╨╕╤Е, ╨╖╨░╨│╨╛╤А╨╛╨┤╨╜╤Л╤Е ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╣, ╨▓╤Л╤Б╤В╨░╨▓╨╛╨║, ╨╜╨╡╨╛╨▒╤Л╤З╨╜╤Л╤Е ╤В╨╡╨░╤В╤А╨╛╨▓, ╨╛╨▒╤Й╨╕╤Е ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╣ ╨╕ ╨║╤А╤Л╤И.
- ╨б╤В╨░╤А╤Л╨╣ intent slug `na-vyhodnyh` ╤А╨░╤Б╤Е╨╛╨┤╨╕╨╗╤Б╤П ╤Б ╤Г╤В╨▓╨╡╤А╨╢╨┤╤С╨╜╨╜╤Л╨╝ URL.
- ╨Ъ╨╛╨╜╤В╨░╨║╤В╤Л ╤Г╨╢╨╡ ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╤О╤В ╨Ш╨Э╨Э ╨╕ ╨Ю╨У╨а╨Э╨Ш╨Я ╤А╤П╨┤╨╛╨╝ ╤Б ╨┤╨░╨╜╨╜╤Л╨╝╨╕ ╨Ш╨Я, ╨┐╨╛╤Н╤В╨╛╨╝╤Г ╨╜╨╛╨╝╨╡╤А ╤В╨╡╨╗╨╡╤Д╨╛╨╜╨░ ╨╜╨╡ ╤В╤А╨╡╨▒╤Г╨╡╤В╤Б╤П ╨┤╨╗╤П E-A-T ╨╜╨░ ╤В╨╡╨║╤Г╤Й╨╡╨╝ ╤Н╤В╨░╨┐╨╡.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨г╤В╨▓╨╡╤А╨╢╨┤╤С╨╜ launch set ╨╕╨╖ 15 URL: ╤А╨╡╤З╨╜╤Л╨╡ ╨┐╤А╨╛╨│╤Г╨╗╨║╨╕, ╤Б╤В╨╡╨╜╨┤╨░╨┐, ╨┐╨╡╤И╨╕╨╡ ╨╕ ╨╖╨░╨│╨╛╤А╨╛╨┤╨╜╤Л╨╡ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕, ╨▓╤Л╤Б╤В╨░╨▓╨║╨╕ ╨╕ ╨╝╤Г╨╖╨╡╨╕, ╨╜╨╡╨╛╨▒╤Л╤З╨╜╤Л╨╡ ╤В╨╡╨░╤В╤А╤Л, ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕ ╨Ъ╨░╨╖╨░╨╜╨╕, ╨▒╨╡╤Б╨┐╨╗╨░╤В╨╜╤Л╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╤П ╨╕ ╤Б╨╛╨▒╤Л╤В╨╕╤П ╨╜╨░ ╨▓╤Л╤Е╨╛╨┤╨╜╤Л╨╡ ╨▓ ╨Ь╨╛╤Б╨║╨▓╨╡ ╨╕ ╨б╨░╨╜╨║╤В-╨Я╨╡╤В╨╡╤А╨▒╤Г╤А╨│╨╡.
- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜╤Л landing rules, category paths, city variants, SEO meta labels ╨╕ editorial seed ╨┤╨╗╤П ╨╜╨╛╨▓╤Л╤Е slug: `walking-tours`, `country-tours`, `exhibitions`, `unusual-theatres`, `excursions`, `rooftops`.
- `rooftops` ╨╕ `country-tours` ╨╛╨│╤А╨░╨╜╨╕╤З╨╡╨╜╤Л ╨б╨░╨╜╨║╤В-╨Я╨╡╤В╨╡╤А╨▒╤Г╤А╨│╨╛╨╝ ╨▓ ╤А╨╛╤Г╤В╨╕╨╜╨│╨╡, static params ╨╕ sitemap. ╨Ь╨╛╤Б╨║╨╛╨▓╤Б╨║╨░╤П ╨┐╨╛╤Б╨░╨┤╨║╨░ ╨║╤А╤Л╤И ╨╜╨╡ ╤Б╨╛╨╖╨┤╨░╤С╤В╤Б╤П ╨╕ ╨╜╨╡ ╨┐╨╛╨┐╨░╨┤╨░╨╡╤В ╨▓ sitemap.
- ╨Ъ╨░╨╜╨╛╨╜╨╕╤З╨╡╤Б╨║╨╕╨╣ intent URL: `na-vyhodnye`; `na-vyhodnyh` permanently redirect ╨╜╨░ ╨╜╨╡╨│╨╛.
- ╨Я╨╛╤А╨╛╨│ ╨╕╨╜╨┤╨╡╨║╤Б╨░╤Ж╨╕╨╕ ╤Б╨╛╤Е╤А╨░╨╜╤С╨╜: `MIN_LISTING_OFFERS_FOR_INDEX = 6`. ╨Я╤А╨╕ ╨╝╨╡╨╜╤М╤И╨╡╨╝ ╤З╨╕╤Б╨╗╨╡ ╨╛╤Д╤Д╨╡╤А╨╛╨▓ URL ╨┤╨╛╤Б╤В╤Г╨┐╨╡╨╜, ╨╜╨╛ ╨┐╨╛╨╗╤Г╤З╨░╨╡╤В `noindex,follow` ╨╕ ╨╕╤Б╨║╨╗╤О╤З╨░╨╡╤В╤Б╤П ╨╕╨╖ sitemap.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Ш╨╜╨┤╨╡╨║╤Б╨░╤Ж╨╕╤П ╨║╨░╨╢╨┤╨╛╨╣ URL ╨╖╨░╨▓╨╕╤Б╨╕╤В ╨╛╤В ╨╜╨░╨╗╨╕╤З╨╕╤П ╨╝╨╕╨╜╨╕╨╝╤Г╨╝ ╤И╨╡╤Б╤В╨╕ ╨░╨║╤В╤Г╨░╨╗╤М╨╜╤Л╤Е ╨╛╤Д╤Д╨╡╤А╨╛╨▓ ╨┐╨╛╤Б╨╗╨╡ sync ╨║╨░╤В╨░╨╗╨╛╨│╨░. DB seed landing ╨╜╨╡ ╨╜╤Г╨╢╨╡╨╜: ╨┐╤А╨░╨▓╨╕╨╗╨░ ╤Д╨╛╤А╨╝╨╕╤А╤Г╤О╤В ╨▓╤Л╨┤╨░╤З╤Г ╨┐╨╛ ╨┤╨░╨╜╨╜╤Л╨╝ ╨║╨░╤В╨░╨╗╨╛╨│╨░.
- ╨Я╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ ╨╜╨╛╨╝╨╡╤А 8-800 ╨╕╨╗╨╕ ╨│╨╛╤А╨╛╨┤╤Б╨║╨╛╨╣ ╨╜╨╛╨╝╨╡╤А pending ╤Г ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░; ╤Д╨╡╨╣╨║╨╛╨▓╤Л╨╣ ╤В╨╡╨╗╨╡╤Д╨╛╨╜ ╨╜╨╡ ╨┤╨╛╨▒╨░╨▓╨╗╤П╨╡╤В╤Б╤П.

---

## 2026-07-22 тАФ SEO-╨╗╨╕╤Б╤В╨╕╨╜╨│╨╕ / ╨з╨Я╨г category├Чcity (╨┐╤А╨╕╨╛╤А╨╕╤В╨╡╤В vs ╨▒╨╗╨╛╨│)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ю╤А╨│╨░╨╜╨╕╨║╨░ ╤Г╨┐╨╕╤А╨░╨╡╤В╤Б╤П ╨▓ thin query-URL (`/events?тАж`) ╨╕ ╨╜╨╡╤Е╨▓╨░╤В╨║╤Г ╨╕╨╜╨┤╨╡╨║╤Б╨╕╤А╤Г╨╡╨╝╤Л╤Е category├Чcity ╨┐╨╛╤Б╨░╨┤╨╛╨║.
- ╨г╨╢╨╡ ╨╡╤Б╤В╤М ╨║╨╛╨╜╤В╤Г╤А landings (`/rechnye-progulki/moscow`) ╨╕ city hubs; ╨╜╨╡╨╗╤М╨╖╤П ╨┐╨╗╨╛╨┤╨╕╤В╤М `/{city}/category`.
- ╨п╨╜╨┤╨╡╨║╤Б ╤И╤В╤А╨░╤Д╤Г╨╡╤В ╨║╨╛╨╝╨╝╨╡╤А╤З╨╡╤Б╨║╨╕╨╡ ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Л ╤Б ╨┐╤Г╤Б╤В╨╛╨╣/╨▒╨╡╨┤╨╜╨╛╨╣ ╨▓╤Л╨┤╨░╤З╨╡╨╣.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨д╨╛╤А╨╝╤Г╨╗╤Л meta ╨▓ `seo-listing-meta.ts` (╨│╨╛╨┤ ╨▓ title, description ╨▒╨╡╨╖ ╤Б╤В╤А╨╡╨╗╨╛╨║).
- Editorial seed `seo-listing-texts.ts` (~18 ╤В╨╡╨║╤Б╤В╨╛╨▓) + fallback; ╨▒╨╗╨╛╨║ `LandingSeoBottom` ╨┐╨╛╨┤ ╤Б╨╡╤В╨║╨╛╨╣.
- ╨Я╨╛╤А╨╛╨│ ╨╕╨╜╨┤╨╡╨║╤Б╨░╤Ж╨╕╨╕ ╨╗╨╕╤Б╤В╨╕╨╜╨│╨╛╨▓: **тЙе 6** ╨╛╤Д╤Д╨╡╤А╨╛╨▓ (`noindex,follow` ╨╕╨╜╨░╤З╨╡); sitemap landings ╤Д╨╕╨╗╤М╤В╤А╤Г╨╡╤В thin city-variants.
- Intent-╨┐╨╛╨┤╨▒╨╛╤А╨║╨╕ `/podborki/{intent}` / `{city}`; contacts; EventTrustStrip; footer/sitemap.
- ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В ╨┐╤А╨╛╨┤╤Г╨║╤В╨░: SEO-╨╗╨╕╤Б╤В╨╕╨╜╨│╨╕ ╨▓╤Л╤И╨╡ ╨╛╨▒╤Л╤З╨╜╨╛╨│╨╛ ╨▒╨╗╨╛╨│╨░ (Tasktracker SEO.*).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ┬л╨н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕ ╨┐╨╛ ╨║╤А╤Л╤И╨░╨╝┬╗ ╨╡╤Й╤С ╨╜╨╡╤В ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨│╨╛ landing slug - ╨╜╤Г╨╢╨╡╨╜ seed ╨╛╤В ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░ ╨╕╨╗╨╕ intent ╤Б `q`.
- ╨С╨╡╨╖ ╨╢╨╕╨▓╨╛╨│╨╛ ╨║╨░╤В╨░╨╗╨╛╨│╨░ ╨▓ CI ╨╜╨╡╨╗╤М╨╖╤П ╨│╨░╤А╨░╨╜╤В╨╕╤А╨╛╨▓╨░╤В╤М ╤Б╨┐╨╕╤Б╨╛╨║ thin URL; ╨┐╤А╨╛╨▓╨╡╤А╨║╨░ ╨╜╨░ ╨╖╨░╨┐╤А╨╛╤Б╨╡ + sitemap async filter.
- ╨з╨░╤Б╤В╤М SEO-╤В╨╡╨║╤Б╤В╨╛╨▓ ╨┤╨╛╨▒╨╕╤В╨░ ╨┤╨╛ 1000+ ╤Б╨╕╨╝╨▓╨╛╨╗╨╛╨▓ ╤И╨░╨▒╨╗╨╛╨╜╨╜╤Л╨╝ ╤Е╨▓╨╛╤Б╤В╨╛╨╝ - ╨╜╤Г╨╢╨╡╨╜ editorial polish (SEO.10).

---

## 2026-07-22 тАФ ╨Ъ╨╛╨╗╨╛╨╜╨║╨░ ╨Р╤А╤В╤Г╤А╨░: ╨Ъ╨░╨╖╨░╨╜╤М ╨╜╨░ ╨▓╨║╤Г╤Б (╨╝╨░╤Б╤В╨╡╤А-╨║╨╗╨░╤Б╤Б╤Л)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т ╨║╨░╤В╨░╨╗╨╛╨│╨╡ ╨╡╤Б╤В╤М 4 ╨Ь╨Ъ ╨Ф╨╛╨╝╨░-╨╝╤Г╨╖╨╡╤П ╨н╤З╨┐╨╛╤З╨╝╨░╨║╨░ + ╤В╨░╤В╨░╤А╤Б╨║╨╕╨╣ ╨│╨░╤Б╤В╤А╨╛╤Г╨╢╨╕╨╜; venue slug `dom-muzei-echpochmaka`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨б╤В╨░╤В╤М╤П `kazan-na-vkus-master-klassy`: `authorId=artur`, `citySlug=kazan`, cover + distinct `-inline.jpg`.
- ╨Т╨╜╤Г╤В╤А╨╡╨╜╨╜╨╕╨╡ ╤Б╤Б╤Л╨╗╨║╨╕: 4 ╨Ь╨Ъ, venue, `/cities/kazan`, ╨│╨░╤Б╤В╤А╨╛╤Г╨╢╨╕╨╜.
- Meta ╨▓ `blog-meta.ts` + ╤В╨╕╨╖╨╡╤А ╨▓ `blog-posts.ts`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В (╨╛╨┐╤Г╨▒╨╗╨╕╨║╨╛╨▓╨░╨╜╨╛: deploy `@93d3a07`, upsert PUBLISHED, smoke 200 + ╨▓╤Б╨╡ ╨▓╨╜╤Г╤В╤А╨╡╨╜╨╜╨╕╨╡ ╤Б╤Б╤Л╨╗╨║╨╕).

---

## 2026-07-22 тАФ City hub ├Ч blog phase 3 (CMS citySlug)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨е╨░╨▒ ╨▒╤А╨░╨╗ ╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╤Л╨╣ top-20 ╤Б╤В╨░╤В╨╡╨╣ тЖТ ╨│╨╛╤А╨╛╨┤╤Б╨║╨╕╨╡ ╨╝╨░╤В╨╡╤А╨╕╨░╨╗╤Л ╨╝╨╛╨│╨╗╨╕ ╨╜╨╡ ╨┐╨╛╨┐╨░╤Б╤В╤М ╨▓ picker.
- `cityId` ╤З╨░╤Б╤В╨╛ null: frontmatter `saint-petersburg`, ╨░ `City.slug` = `sankt-peterburg`.
- Admin ╨╜╨╡ ╨┤╨░╨▓╨░╨╗ ╨┐╤А╨░╨▓╨╕╤В╤М citySlug; pseudo-╨│╨╛╤А╨╛╨┤╨░ multi/regions ╨╢╨╕╨╗╨╕ hardcoded CASE ╨▓ SQL.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ъ╨╛╨╗╨╛╨╜╨║╨░ `Article.citySlug` + migration backfill; ╨╕╨╜╨┤╨╡╨║╤Б.
- Public/admin API: `?citySlug=` + `includeBroad=1`; hub fetch limit 40 city+broad.
- Picker: ╤П╨▓╨╜╤Л╨╣ CMS citySlug = ╤В╨╛╨╗╤М╨║╨╛ ╤В╨╛╤З╨╜╨╛╨╡ ╤Б╨╛╨▓╨┐╨░╨┤╨╡╨╜╨╕╨╡ (title heuristics ╤В╨╛╨╗╤М╨║╨╛ ╨╡╤Б╨╗╨╕ citySlug ╨┐╤Г╤Б╤В).
- blog-upsert + admin ╨┐╨╛╨╗╨╡ citySlug; alias-resolve City.id.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-22 тАФ City hub: ┬л╨б╨╛╨▓╨╡╤В╤Л┬╗ + on-page SEO ╤Д╤А╨░╨╖╤Л

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ф╨╗╨╕╨╜╨╜╤Л╨╡ ╨╖╨░╨┐╤А╨╛╤Б╤Л (┬л╨░╤Д╨╕╤И╨░, ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕ ╨╕ ╨▒╨╕╨╗╨╡╤В╤ЛтАж┬╗) ╨╢╨╕╨╗╨╕ ╨▓ ╨╛╤Б╨╜╨╛╨▓╨╜╨╛╨╝ ╨▓ `<title>` / meta description; ╨▒╨╗╨╛╨║ `#seo` ╨▒╤Л╨╗ brief + ╤Б╤З╤С╤В╤З╨╕╨║╨╕.
- ┬л╨Я╤А╨░╨║╤В╨╕╨║╨░┬╗ ╨║╨░╨║ ╤П╤А╨╗╤Л╨║ ╤Б╨╡╨║╤Ж╨╕╨╕ ╨╖╨▓╤Г╤З╨░╨╗ ╨║╨░╨╜╤Ж╨╡╨╗╤П╤А╤Б╨║╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Sticky/H2: **╨б╨╛╨▓╨╡╤В╤Л** (╤П╨║╨╛╤А╤М `#practice` ╤Б╨╛╤Е╤А╨░╨╜╤С╨╜).
- `buildCityHubSeoPhrase` + ╤Г╤Б╨╕╨╗╨╡╨╜╨╜╤Л╨╣ `buildCitySeoText` / H2 `#seo`; fallback meta description ╤З╨╡╤А╨╡╨╖ `buildCityHubSeoDescription`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-22 тАФ City hub ├Ч blog phase 2 (mini-row ╤Б╨╡╤Б╤Б╨╕╨╣)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ harden picker (P.2o) ╤В╨╕╨╖╨╡╤А╤Л ╨▓╤Б╤С ╨╡╤Й╤С ╨╜╨╡ ╤Б╨▓╤П╨╖╤Л╨▓╨░╨╗╨╕ ╨╝╨░╤В╨╡╤А╨╕╨░╨╗ ╤Б ╨░╤Д╨╕╤И╨╡╨╣ ╨│╨╛╤А╨╛╨┤╨░ ╨▒╨╡╨╖ ╨║╨╗╨╕╨║╨░ ╨▓ `#affiche`.
- Codex `ArticleEventMiniRow` ╤Г╨╢╨╡ ╨┤╨╡╨╗╨░╨╗ keyword match ╨┐╨╛ ╨╖╨░╨│╤А╤Г╨╢╨╡╨╜╨╜╤Л╨╝ sessions тАФ ╨┐╨╡╤А╨╡╨╜╨╛╤Б╨╕╨╝ ╨▓ Next, ╨▒╨╡╨╖ Vite merge.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `matchArticleSessions` ╨▓ `city-hub-articles.ts`: ╨┤╨╛ 3 ╤Б╨╡╤Б╤Б╨╕╨╣, keyword score тЖТ ╨╕╨╜╨░╤З╨╡ quality fallback.
- `CityHubArticleTeaser` + ╨▓╤Б╨╡ `CityHubArticlesGrid` ╨╜╨░ ╤Е╨░╨▒╨╡ ╨┐╨╛╨╗╤Г╤З╨░╤О╤В `payload.sessions` (╨┐╨╛╨╗╨╜╤Л╨╣ ╤Б╨┐╨╕╤Б╨╛╨║ ╨│╨╛╤А╨╛╨┤╨░, ╨╜╨╡ filtered).
- P.2p тЬЕ; CMS citySlug binding ╨╛╤Б╤В╨░╤С╤В╤Б╤П phase 3.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-22 тАФ City hub ├Ч blog: Codex port ╨▓ phase 1 picker

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╨░╤П ╨▓╨╡╤В╨║╨░ `codex/city-hub-editorial-alt` (Vite `apps/public`) ╨┤╤Г╨▒╨╗╨╕╤А╤Г╨╡╤В IA phase 1; ╤Д╨╕╨╜╨║╨╛╨╜╤В╤Г╤А `codex/phase2-finance-supplier` ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╨╝.
- ╨Э╨░╤И `pickCityHubArticles` ╨▒╤Л╨╗ ╤Б╨╗╨░╨▒╨╡╨╡: ╨╝╨░╨╗╨╛ ╨░╨╗╨╕╨░╤Б╨╛╨▓, ╨╜╨╡╤В ╨╛╤В╤Б╨╡╨▓╨░ ╤З╤Г╨╢╨╛╨│╨╛ ╨│╨╛╤А╨╛╨┤╨░ тЖТ ╤Б╤В╨░╤В╤М╤П ┬л╨▓ ╨Ь╨╛╤Б╨║╨▓╨╡┬╗ ╨╝╨╛╨│╨╗╨░ ╨┐╨╛╨┐╨░╤Б╤В╤М ╨╜╨░ ╤Е╨░╨▒ ╨б╨Я╨▒ ╤З╨╡╤А╨╡╨╖ generic gid.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╨╛╤А╤В ╨▓ Next `apps/web`: ╤А╨░╤Б╤И╨╕╤А╨╡╨╜╨╜╤Л╨╡ `CITY_ALIASES` (╨║╨╕╤А╨╕╨╗╨╗╨╕╤Ж╨░ + ╤Б╤В╨╡╨╝╤Л), `containsForeignCitySignal`, broad `multi/regions`, tie-break ╨┐╨╛ `publishedAt`, ╤И╨╕╤А╨╡ keywords ╤Б╨╡╨║╤Ж╨╕╨╣.
- Unit-╤В╨╡╤Б╤В╤Л `city-hub-articles.test.ts` (6). Vite/finance ╨╕╨╖ Codex ╨╜╨╡ ╨╝╨╡╤А╨╢╨╕╨╝.
- Phase 2 (P.2p): mini-row ╤Б╨╡╤Б╤Б╨╕╨╣ ╨╜╨░ ╤В╨╕╨╖╨╡╤А╨╡ тАФ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╣ ╤И╨░╨│.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-22 тАФ Admin smoke 0.3 + ╤В╨╡╤Б╤В╨╛╨▓╨░╤П ╨┐╨╛╨║╤Г╨┐╨║╨░ ╨╖╨░╨║╤А╤Л╤В╤Л

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ ╨╖╨░╨║╤А╤Л╤В╨╕╤П browser 0.2 ╨▓ docs ╨╡╤Й╤С ╨▓╨╕╤Б╨╡╨╗╨╕ Admin smoke (login/sources) ╨╕ ╨╛╨┐╤Ж. ╤В╨╡╤Б╤В╨╛╨▓╨░╤П ╨┐╨╛╨║╤Г╨┐╨║╨░ тЖТ ExternalOrder.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- 0.3.1 / 0.3.3 / 0.3.6 / 0.3.7 тЖТ тЬЕ ╨┐╨╛ ╤А╤Г╤З╨╜╨╛╨╝╤Г ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╤О ╨╜╨░ prod.
- ╨з╨╡╨║╨╗╨╕╤Б╤В 0.2: ╤В╨╡╤Б╤В╨╛╨▓╨░╤П ╨┐╨╛╨║╤Г╨┐╨║╨░ тЖТ ExternalOrder ╨╛╤В╨╝╨╡╤З╨╡╨╜╨░ тЬЕ.
- ╨н╤В╨░╨┐ 0 smoke exit criteria ╨▓╤Л╨┐╨╛╨╗╨╜╨╡╨╜╤Л (TEP orders ╨╛╤Б╤В╨░╤С╤В╤Б╤П тП╕ тАФ ╨╜╨╡╤В API ╤Г ╨┐╨░╤А╤В╨╜╤С╤А╨░).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-22 тАФ L.3 TC catalog sync: ╤Б╨╜╨╕╨╖╨╕╤В╤М ╨╜╨░╨│╤А╤Г╨╖╨║╤Г ╨╜╨░ prod

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╨╗╨╜╤Л╨╣ `tc:sync` ╨┤╨╜╤С╨╝ ╨║╨╛╨╜╨║╤Г╤А╨╕╤А╤Г╨╡╤В ╤Б API/Next ╨╖╨░ CPU/RAM (3.8Gi).
- `syncProviderLinksForSource` ╨╜╨░ `--ids` ╨▓╤Б╤С ╤А╨░╨▓╨╜╨╛ ╨┐╨╡╤А╨╡╤Б╨╛╨▒╨╕╤А╨░╨╗ ProviderLink ╨┐╨╛ ╨▓╤Б╨╡╨╝╤Г TC source.
- `RawImportRecord` upsert ╨▓╤Б╨╡╨│╨┤╨░ ╨┐╨╡╤А╨╡╨┐╨╕╤Б╤Л╨▓╨░╨╗ JSON ╨┤╨░╨╢╨╡ ╨┐╤А╨╕ ╤В╨╛╨╝ ╨╢╨╡ `payloadHash`.
- Post-sync `invalidatePublicCaches({ warm: true })` = full warm (venues/cities/landings/admin).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `deploy/cron/tc-catalog-sync.sh` + `daibilet-tc-catalog-sync.{service,timer}` тАФ nightly 03:20, flock/nice/ionice, ╨╗╨╛╨│ `/var/log/daibilet/tc-catalog-sync.log`.
- `syncProviderLinksForSource(client, sourceId, { eventIds })`; `tc:sync --ids` ╨┐╨╡╤А╨╡╨┤╨░╤С╤В imported Event ids.
- RawImport upsert: `WHERE payloadHash IS DISTINCT FROM excluded.payloadHash` (TC/TEP catalog + orders).
- Light warm: `warmPublicCachesLight` + `POST /api/internal/public-cache`; `post-catalog-sync-warm.mjs`; full warm ╤В╨╛╨╗╤М╨║╨╛ ╨┐╤А╨╕ `TC_CATALOG_SYNC_FULL_WARM=1`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Timer ╨╜╤Г╨╢╨╜╨╛ enable ╨╜╨░ prod ╨┐╨╛╤Б╨╗╨╡ deploy (`systemctl enable --now daibilet-tc-catalog-sync.timer`).

**Prod @`efc8459`:** deploy-prod-next OK; `daibilet-tc-catalog-sync.timer` enabled, next `2026-07-23 03:20 UTC`; smoke `POST /api/internal/public-cache` warm=light тЖТ 200.

---

## 2026-07-22 тАФ Browser smoke 0.2 ╨╖╨░╨║╤А╤Л╤В

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т Tasktracker/current-state ╨║╨╛╨╗╨╛╨╜╨║╨░ Browser ┬л╨Ъ╤Г╨┐╨╕╤В╤М┬╗ ╨▓╨╕╤Б╨╡╨╗╨░ тП│ ╤Б 2026-07-13 ╨┐╤А╨╕ ╤Г╨╢╨╡ ╨╖╨╡╨╗╤С╨╜╨╛╨╝ API `check:widgets`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ч╨░╨║╤А╤Л╤В╤Л 0.2.1тАУ0.2.4 ╨╕ 0.4.4 (browser) ╨┐╨╛ ╤А╤Г╤З╨╜╨╛╨╝╤Г ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╤О: ╨▓╨╕╨┤╨╢╨╡╤В╤Л TC/TEP ╨╜╨░ prod ╨╛╤В╨║╤А╤Л╨▓╨░╤О╤В╤Б╤П.
- ╨Ю╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨░╤П ╤В╨╡╤Б╤В╨╛╨▓╨░╤П ╨┐╨╛╨║╤Г╨┐╨║╨░ тЖТ ExternalOrder: тЬЕ 2026-07-22 (╨╖╨░╨║╤А╤Л╤В╨╛ ╨▓╨╝╨╡╤Б╤В╨╡ ╤Б Admin smoke).
- Admin smoke 0.3: тЬЕ 2026-07-22.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-22 тАФ L.2 Images: next/image + WebP/AVIF

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Hot-path UI (╨║╨░╤В╨░╨╗╨╛╨│, ╨│╨╗╨░╨▓╨╜╨░╤П, city hub, blog, venues) ╨╛╤В╨┤╨░╨▓╨░╨╗ ╤Б╤Л╤А╤Л╨╡ `<img>` JPG/PNG ╤Б TC/TEP CDN ╨▒╨╡╨╖ ╤А╨╡╤Б╨░╨╣╨╖╨░.
- Prod ╨▒╨╡╨╖ `sharp` тЖТ ╨┤╨╡╤Д╨╛╨╗╤В╨╜╤Л╨╣ Next image optimizer ╤Б╨╗╨░╨▒╤Л╨╣/╨╝╨╡╨┤╨╗╨╡╨╜╨╜╤Л╨╣.
- ╨е╨╛╤Б╤В╤Л ╨╛╨▒╨╗╨╛╨╢╨╡╨║: `ticketscloud-prod.storage.yandexcloud.net`, `s3.twcstorage.ru`, ╨┐╨╗╤О╤Б ╤Б╤В╨░╨▒╨╕╨╗╤М╨╜╤Л╨╣ `api.teplohod.info`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `next.config.ts`: `formats` avif/webp, `minimumCacheTTL` 7d, ╤Г╤А╨╡╨╖╨░╨╜╨╜╤Л╨╡ `deviceSizes`/`imageSizes`, `remotePatterns` ╨┤╨╗╤П CDN.
- `SafeImage.client.tsx` + `IMAGE_SIZES`; ╨╖╨░╨╝╨╡╨╜╨░ `<img>` ╨▓ EventCard/CityCard/blog/hub/heroes/venues/search/favorites.
- `@daibilet/web` dependency `sharp` ╨┤╨╗╤П prod encode.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╡╤А╨▓╤Л╨╣ ╤Е╨╛╨╗╨╛╨┤╨╜╤Л╨╣ `/_next/image` ╨╜╨░ VPS ╨┤╨░╤С╤В CPU spike тАФ ╨║╤Н╤И 7d + nginx `proxy_cache` ╨╜╨░ `/` ╤Б╨╝╤П╨│╤З╨░╤О╤В ╨┐╨╛╤Б╨╗╨╡ ╨┐╤А╨╛╨│╤А╨╡╨▓╨░.
- Inline blog markdown images ╨▒╨╡╨╖ fallback placeholder ╨┐╤А╨╕ 404 (╤А╨░╨╜╤М╤И╨╡ ╤Б╨║╤А╤Л╨▓╨░╨╗╨╕╤Б╤М) тАФ ╤А╨╡╨┤╨║╨╕╨╣ ╨║╨╡╨╣╤Б.

**Prod @`9646968`:** `deploy-prod-next` OK; sharp ╨▓ `apps/web`; proof `Accept: image/avif` тЖТ `content-type: image/avif` ╨┤╨╗╤П hero ╨╕ remote TEP S3; `/events` HTML ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В `/_next/image?url=тАж`.

---

## 2026-07-22 тАФ Prod deploy load + city hub blog @`bb65e4a`

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Rebase ╨┐╨╛╨▓╨╡╤А╤Е `7787c30` (FAQ city-only / empty directions): ╨║╨╛╨╜╤Д╨╗╨╕╨║╤В╤Л ╨▓ `CityPageView` / Tasktracker / Diary.
- `curl -I` (HEAD) ╨╜╨░ public API ╨┤╨░╤С╤В 404/`no-store` тАФ ╨╗╨╛╨╢╨╜╤Л╨╣ ╤Б╨╕╨│╨╜╨░╨╗; ╨┐╤А╨╛╨▓╨╡╤А╤П╤В╤М GET.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Merge: ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╤Л chip UX P.2kтАУn + H3 ┬л╨з╤В╨╛ ╨║╤Г╨┐╨╕╤В╤М ╤Б╨╡╨╣╤З╨░╤Б┬╗ + ╤В╨╕╨╖╨╡╤А╤Л; Tasktracker P.2o + L.1.
- `deploy-prod-next` OK @`bb65e4a`. Proof: GET `/api/public/events?limit=50` тЖТ `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`; `?ids=` 200; hub SPB тАФ sticky `#about|#affiche|#sights|#practice|#more` + `/blog/*` teasers.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Images webp/`next/image` (╨┐.6 ╨░╤Г╨┤╨╕╤В╨░) тАФ ╨╡╤Й╤С ╨╜╨╡ ╨▓ ╤Н╤В╨╛╨╝ ╤А╨╡╨╗╨╕╨╖╨╡.

---

## 2026-07-22 тАФ Load fixes: catalog cache headers, landing refetch, favorites ids

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Prod `/api/public/events` ╨╕╨┤╤С╤В ╨▓ legacy API (`:4000`), ╨╜╨╡ ╨▓ Next. TS `public-catalog-handler` ╨╛╤В╨▓╨╡╤З╨░╨╗ `Cache-Control: no-store` тЖТ ╨▒╤А╨░╤Г╨╖╨╡╤А/nginx ╨╜╨╡ ╨║╤Н╤И╨╕╤А╨╛╨▓╨░╨╗╨╕ ╨║╨░╤В╨░╨╗╨╛╨│.
- `LandingPageView` ╨┐╤А╨╕ ╨╜╨░╨╗╨╕╤З╨╕╨╕ SSR `initialPayload` ╨▓╤Б╤С ╤А╨░╨▓╨╜╨╛ ╨┤╨╡╨╗╨░╨╗ `fetch(..., cache: 'no-store')`.
- `FavoritesPanel` ╤В╤П╨╜╤Г╨╗ `limit=300 no-store`.
- nginx: `proxy_cache_path` ╨▒╤Л╨╗, ╨╜╨╛ `proxy_cache` ╨▓ `location /` ╨╜╨╡ ╨┐╤А╨╕╨╝╨╡╨╜╤П╨╗╤Б╤П; `limit_req` ╨╜╨░ `daibilet.ru /api/` ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╨╛╨▓╨░╨╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Public handlers тЖТ `sendPublicJson` (`public, max-age=60, s-maxage=300, swr=600`).
- Next `/api/public/events` тЖТ `getCachedCatalog`.
- Landing: skip client refetch ╨╡╤Б╨╗╨╕ SSR landing ╤Г╨╢╨╡ ╨╡╤Б╤В╤М.
- Favorites: `?ids=` (max 50) ╨▒╨╡╨╖ no-store; catalog page sizes 50/100.
- nginx prod: ╨▓╨║╨╗╤О╤З╤С╨╜ `proxy_cache` ╨╜╨░ `/` + `limit_req` ╨╜╨░ `daibilet.ru /api/`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Images webp/avif тАФ ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ ╤В╤А╨╡╨║ (╨┐.6 ╨░╤Г╨┤╨╕╤В╨░).

---

## 2026-07-22 тАФ City hub ├Ч blog phase 1 (editorial teasers)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨е╨░╨▒ ╨▒╤Л╨╗ ╨┐╨╛╤Б╨╡╤А╨╡╨┤╨╕╨╜╨╡ ╨╝╨╡╨╢╨┤╤Г ╨▓╨╕╤В╤А╨╕╨╜╨╛╨╣ ╨╕ ╤Б╨┐╤А╨░╨▓╨╛╤З╨╜╨╕╨║╨╛╨╝: brief/travel/FAQ ╨╡╤Б╤В╤М, ╨▒╨╗╨╛╨│ ╨╢╨╕╨╗ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛ ╨╜╨░ `/blog`.
- `citySlug` ╤Г ╤Б╤В╨░╤В╨╡╨╣ ╨╖╨░╨┐╨╛╨╗╨╜╨╡╨╜ ╤Б╨╗╨░╨▒╨╛; API `?citySlug=` ╨╜╨╡ ╤П╨▓╨╗╤П╨╡╤В╤Б╤П ╤Б╤В╤А╨╛╨│╨╕╨╝ ╤Д╨╕╨╗╤М╤В╤А╨╛╨╝ тАФ ╨╜╤Г╨╢╨╡╨╜ fallback-╨┐╨╛╨┤╨▒╨╛╤А.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨д╨░╨╖╨░ 1: 5 sticky tabs (`#about` `#affiche` `#sights` `#practice` `#more`); ╤Б╤В╨░╤А╤Л╨╡ ╤П╨║╨╛╤А╤П `#travel/#faq/#directions/#venues` ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╤Л ╨▓╨╜╤Г╤В╤А╨╕ ╤А╨╛╨┤╨╕╤В╨╡╨╗╨╡╨╣.
- SSR: `buildPublicArticlesListDto` + `mergeBlogCards` + `pickCityHubArticles` (╨╗╨╕╨╝╨╕╤В╤Л 2/1/2/1/1, ╨▒╨╡╨╖ ╨┐╨╛╨▓╤В╨╛╤А╨╛╨▓).
- `CityHubArticleTeaser`: cover/title/excerpt, badges, CTA ┬л╨б╨╝╨╛╤В╤А╨╡╤В╤М ╨▓ ╨░╤Д╨╕╤И╨╡┬╗ (scroll `#affiche`) + ┬л╨Ю╤В╨║╤А╤Л╤В╤М ╨╝╨░╤В╨╡╤А╨╕╨░╨╗┬╗.
- ╨Я╤Г╤Б╤В╤Л╨╡ ╨▒╨░╨║╨╡╤В╤Л ╨╜╨╡ ╤А╨╡╨╜╨┤╨╡╤А╤П╤В╤Б╤П; ╨╜╨╡ ╨▓╨╛╨╖╨▓╤А╨░╤Й╨░╨╡╨╝ ┬л╨б╤В╨╛╨╕╤В ╨▓╨╜╨╕╨╝╨░╨╜╨╕╤П┬╗ (╤Б╨╜╤П╤В╨╛ ╤А╨░╨╜╨╡╨╡).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Mini-row ╤Б╨╛╨▒╤Л╤В╨╕╨╣ ╨╕ ╤В╨╛╤З╨╜╨░╤П CMS-╨┐╤А╨╕╨▓╤П╨╖╨║╨░ citySlug тАФ ╤Д╨░╨╖╤Л 2тАУ3.

---

## 2026-07-19 тАФ City hub FAQ: ╤В╨╛╨╗╤М╨║╨╛ city-specific, ╨▒╨╡╨╖ ╨┐╨╗╨░╤В╤Д╨╛╤А╨╝╤Л

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ `/cities/sankt-peterburg` accordion FAQ ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╗ ╨┐╨╗╨░╤В╤Д╨╛╤А╨╝╨╡╨╜╨╜╤Л╨╡ ╨▓╨╛╨┐╤А╨╛╤Б╤Л: ┬л╨Ъ╨░╨║╨╕╨╡ ╤Ж╨╡╨╜╤ЛтАж┬╗, ┬л╨Ь╨╛╨╢╨╜╨╛ ╨╗╨╕ ╨▓╤Л╨▒╤А╨░╤В╤М ╨┐╨╗╨╛╤Й╨░╨┤╨║╤ГтАж┬╗, ┬л╨Э╤Г╨╢╨╜╨░ ╨╗╨╕ ╤А╨╡╨│╨╕╤Б╤В╤А╨░╤Ж╨╕╤П ╨╜╨░ ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В╨╡тАж┬╗.
- `buildCityFaqItems` ╨│╨╡╨╜╨╡╤А╨╕╤А╨╛╨▓╨░╨╗ FAQ ╨┐╤А╨╛ ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В; `CityPageView` ╨╝╨╡╤А╨╢╨╕╨╗ ╨╡╨│╨╛ ╤Б `cityInfo.faq`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `buildCityFaqItems` = ╤В╨╛╨╗╤М╨║╨╛ `cityInfo.faq` (editorial) ╨┤╨╗╤П indexable ╨│╨╛╤А╨╛╨┤╨╛╨▓; ╨▒╨╡╨╖ FAQ тАФ ╨┐╤Г╤Б╤В╨╛╨╣ ╨╝╨░╤Б╤Б╨╕╨▓ тЖТ `#faq` ╤Б╨║╤А╤Л╤В.
- JSON-LD `FAQPage` тАФ ╤В╨╛╤В ╨╢╨╡ city FAQ, ╨▒╨╡╨╖ platform mix.
- Default + editorial ╤З╨╡╤А╨╡╨╖ ╨╛╨▒╤Й╨╕╨╣ `CityPageView`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy `deploy-prod-next` OK @`9bc8fa7`.
- **Proof** `/cities/sankt-peterburg` + `?hub=editorial`: ╨╜╨╡╤В ┬л╤А╨╡╨│╨╕╤Б╤В╤А╨░╤Ж╨╕╤П ╨╜╨░ ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В╨╡┬╗ / ┬л╨Ъ╨░╨║╨╕╨╡ ╤Ж╨╡╨╜╤ЛтАж┬╗ / ┬л╨Ь╨╛╨╢╨╜╨╛ ╨╗╨╕ ╨▓╤Л╨▒╤А╨░╤В╤М ╨┐╨╗╨╛╤Й╨░╨┤╨║╤ГтАж┬╗; ╨╡╤Б╤В╤М city FAQ (╨Я╨╛╨┤╨╛╤А╨╛╨╢╨╜╨╕╨║, ╤А╨░╨╖╨▓╨╛╨┤╨║╨░ ╨╝╨╛╤Б╤В╨╛╨▓, ╨н╤А╨╝╨╕╤В╨░╨╢); `#faq` + JSON-LD FAQPage ╤Б 3 city questions.

---

## 2026-07-19 тАФ City hub `#directions`: ╤В╨╛╨╗╤М╨║╨╛ chips ╤Б count > 0

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ Rostov-╨╜╨░-╨Ф╨╛╨╜╤Г ╨▓ ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╤П┬╗ landings ╤Б ╤З╨╕╤Б╨╗╨╛╨╝ ╨╛╨║ (╨Э╨╛╨▓╤Л╨╣ ╨│╨╛╨┤, ╨б╤В╨╡╨╜╨┤╨░╨┐тАж), ╨░ ┬л╨Ь╨╡╤А╨╛╨┐╤А╨╕╤П╤В╨╕╤П┬╗ / ┬л╨а╨░╨╖╨▓╨╗╨╡╤З╨╡╨╜╨╕╤П┬╗ ╤И╨╗╨╕ ╨▒╨╡╨╖ ╤Б╤З╤С╤В╤З╨╕╨║╨░ тАФ ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗╨╕ ╨║╨░╨║ ╨╝╤С╤А╤В╨▓╤Л╨╡ ╨┐╨╛╨┤╨▒╨╛╤А╨║╨╕.
- ╨Ъ╨╛╤А╨╡╨╜╤М: ╨▓ `PopularDirections` category-chips ╤Е╨░╤А╨┤╨║╨╛╨┤╨╕╨╗╨╕ `count: 0`, ╤Е╨╛╤В╤П facet ╨╕╨╖ hub feed ╨╕╨╝╨╡╨╗ ╤А╨╡╨░╨╗╤М╨╜╤Л╨╡ ╤Б╤З╤С╤В╤З╨╕╨║╨╕ (15 / 1).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `CityPageView` (default + editorial): landings ╨╕ categories ╨▓ `#directions` ╤В╨╛╨╗╤М╨║╨╛ ╨┐╤А╨╕ `count > 0`; category chips ╨▒╨╡╤А╤Г╤В ╤А╨╡╨░╨╗╤М╨╜╤Л╨╣ count; `hasDirections` тАФ ╨┐╨╛ ╤В╨╛╨╝╤Г ╨╢╨╡ ╨┐╤А╨░╨▓╨╕╨╗╤Г.
- ╨Э╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕ gap date/category chips (╨┐╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╤Л╨╣ ╤Д╨╕╨║╤Б).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Commit `044e441` ╤Г╨╢╨╡ ╨▒╤Л╨╗ ╨▓ origin; ╨┐╤А╨╡╨┤╤Л╨┤╤Г╤Й╨╕╨╣ ╨░╨│╨╡╨╜╤В ╨╖╨░╨▓╨╕╤Б mid-deploy. ╨Ф╨╛╨╢╨░╨╗╨╕: `deploy-prod-next` OK @`044e441`.
- **Proof** `/cities/rostov-na-donu` + `?hub=editorial`: `#directions` тАФ ╨▓╤Б╨╡ chips ╤Б count > 0 (╨Э╨╛╨▓╤Л╨╣ ╨│╨╛╨┤ 2, ╨б╤В╨╡╨╜╨┤╨░╨┐ 2, ╨Ф╨╡╤В╤П╨╝ 2, ╨Ъ╨╛╨╜╤Ж╨╡╤А╤В╤Л 8, ╨Ь╨╡╤А╨╛╨┐╤А╨╕╤П╤В╨╕╤П 15, ╨а╨░╨╖╨▓╨╗╨╡╤З╨╡╨╜╨╕╤П 1); ╨┐╤Г╤Б╤В╤Л╤Е ╨▒╨╡╨╖ ╤З╨╕╤Б╨╗╨░ ╨╜╨╡╤В.

---

## 2026-07-19 тАФ City hub: gap ╨╝╨╡╨╢╨┤╤Г date ╨╕ category chips

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ ╨░╤Д╨╕╤И╨╡ city hub date chips ╨╕ category chips ╨▓ ╨╛╨┤╨╜╨╛╨╝ ╤А╤П╨┤╤Г, ╨╜╨╛ ╨╝╨╡╨╢╨┤╤Г ╨│╤А╤Г╨┐╨┐╨░╨╝╨╕ (┬л╨Т╤Л╤Е╨╛╨┤╨╜╤Л╨╡┬╗ тЖФ ┬л╨Т╤Б╨╡ N┬╗) ╤В╨╛╤В ╨╢╨╡ `gap-1.5`, ╤З╤В╨╛ ╨╕ ╨▓╨╜╤Г╤В╤А╨╕ ╨│╤А╤Г╨┐╨┐╤Л тАФ ╨▓╨╕╨╖╤Г╨░╨╗╤М╨╜╨╛ ╤Б╨╗╨╕╨┐╨░╤О╤В╤Б╤П.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Т `CityPageView` (default + editorial ╤З╨╡╤А╨╡╨╖ ╨╛╨▒╤Й╨╕╨╣ ╨║╨╛╨╝╨┐╨╛╨╜╨╡╨╜╤В): ╤Г ╤А╤П╨┤╨░ ╤Д╨╕╨╗╤М╤В╤А╨╛╨▓ `gap-x-4 gap-y-1.5` ╨╝╨╡╨╢╨┤╤Г ╨│╤А╤Г╨┐╨┐╨░╨╝╨╕; ╨▓╨╜╤Г╤В╤А╨╕ `DateFilterChips` / `CategoryFilter` ╨╛╤Б╤В╨░╨▓╨╗╨╡╨╜ ╨║╨╛╨╝╨┐╨░╨║╤В╨╜╤Л╨╣ `gap-1.5`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy prod `@9a36f48` OK. Proof: chunk `/cities/[slug]/page-*.js` ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В `gap-x-4 gap-y-1.5`; `/cities/murmansk` + `?hub=editorial` тЖТ 200.

---

## 2026-07-19 тАФ ╨Р╨┤╤А╨╡╤Б: ┬л╨Я╤А╨╛╤Б╨┐╨╡╨║╤В ╨Ъ╨╛╨╗╤М╤Б╨║╨╕╨╣┬╗ тЖТ ┬л╨Ъ╨╛╨╗╤М╤Б╨║╨╕╨╣ ╨┐╤А╨╛╤Б╨┐╨╡╨║╤В┬╗

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ ╤Е╨░╨▒╨╡ ╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║╨░ ╤Г ╨┐╨╗╨╛╤Й╨░╨┤╨║╨╕ ┬л╨Ь╨╡╨│╨░ ╨Ъ╤А╤Г╨╢╨║╨░┬╗ (`/venues/mega-kruzhka`) ╨▓ ╤Б╨┐╨╕╤Б╨║╨╡ venues ╨▓╤Л╨▓╨╛╨┤╨╕╨╗╤Б╤П ╤Б╤Л╤А╨╛╨╣ `venue.address`: ┬л╨Я╤А╨╛╤Б╨┐╨╡╨║╤В ╨Ъ╨╛╨╗╤М╤Б╨║╨╕╨╣, 158/1┬╗ (╨┐╨╛╤А╤П╨┤╨╛╨║ ╤В╨╕╨┐╨░ ╤Г╨╗╨╕╤Ж╤Л ╨╕╨╖ TC/API).
- `formatStreetAddress` ╤Г╨╢╨╡ ╤З╨╕╤Б╤В╨╕╨╗ ╨│╨╛╤А╨╛╨┤/╨╕╨╜╨┤╨╡╨║╤Б, ╨╜╨╛ ╨╜╨╡ ╨┐╨╡╤А╨╡╤Б╤В╨░╨▓╨╗╤П╨╗ ┬л╤В╨╕╨┐ + ╨┐╤А╨╕╨╗╨░╨│╨░╤В╨╡╨╗╤М╨╜╨╛╨╡┬╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Т `apps/web|public/src/lib/address.ts`: ╨┤╨╗╤П ╨┐╤А╨╕╨╗╨░╨│╨░╤В╨╡╨╗╤М╨╜╤Л╤Е (-╤Б╨║╨╕╨╣/-╨╜╨░╤П/тАж) ┬л╨Я╤А╨╛╤Б╨┐╨╡╨║╤В X┬╗ / ┬л╨г╨╗╨╕╤Ж╨░ X┬╗ тЖТ ┬лX ╨┐╤А╨╛╤Б╨┐╨╡╨║╤В┬╗ / ┬лX ╤Г╨╗╨╕╤Ж╨░┬╗; ╨│╨╡╨╜╨╕╤В╨╕╨▓╤Л (┬л╨┐╤А╨╛╤Б╨┐╨╡╨║╤В ╨Ь╨╕╤А╨░┬╗, ┬л╤Г╨╗╨╕╤Ж╨░ ╨Ы╨╡╨╜╨╕╨╜╨░┬╗) ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╨╝.
- City hub venues list: `formatStreetAddress(venue.address)` ╨▓╨╝╨╡╤Б╤В╨╛ ╤Б╤Л╤А╨╛╨│╨╛ ╨░╨┤╤А╨╡╤Б╨░.
- ╨в╨╡╤Б╤В╤Л: `apps/web/src/lib/address.test.ts`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy prod `@8d65740` OK. Proof `/cities/murmansk` + `/venues/mega-kruzhka`: UI ┬л╨Ъ╨╛╨╗╤М╤Б╨║╨╕╨╣ ╨┐╤А╨╛╤Б╨┐╨╡╨║╤В┬╗; ╨▓ ╨С╨Ф `Venue` address ╤В╨╛╨╢╨╡ ╨╛╨▒╨╜╨╛╨▓╨╗╤С╨╜ (`╨┐╤А╨╛╤Б╨┐╨╡╨║╤В ╨Ъ╨╛╨╗╤М╤Б╨║╨╕╨╣тАж` тЖТ `╨Ъ╨╛╨╗╤М╤Б╨║╨╕╨╣ ╨┐╤А╨╛╤Б╨┐╨╡╨║╤ВтАж`).

---

## 2026-07-19 тАФ City hub: ╨▒╨╡╨╖ ╨┐╨╛╨┤╨╖╨░╨│╨╛╨╗╨╛╨▓╨║╨░ ╨▓╤Л╨┤╨░╤З╨╕, chips ╨▓ ╨╛╨┤╨╜╤Г ╤Б╤В╤А╨╛╨║╤Г, ╨▒╨╡╨╖ ┬л╨б╤В╨╛╨╕╤В ╨▓╨╜╨╕╨╝╨░╨╜╨╕╤П┬╗

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╨┤╨╖╨░╨│╨╛╨╗╨╛╨▓╨╛╨║ ╨░╤Д╨╕╤И╨╕ (┬лN ╤Б╨╛╨▒╤Л╤В╨╕╨╣ ╨▓ ╤В╨╡╨║╤Г╤Й╨╡╨╣ ╨▓╤Л╨┤╨░╤З╨╡. ╨Я╨╛╨▓╤В╨╛╤А╤П╤О╤Й╨╕╨╡╤Б╤ПтАж┬╗) ╤И╤Г╨╝╨╡╨╗ ╨┐╨╛╨┤ H2.
- Date chips ╨╕ category chips ╤И╨╗╨╕ ╨┤╨▓╤Г╨╝╤П ╤А╤П╨┤╨░╨╝╨╕ ╨╜╨░ desktop.
- ╨С╨╗╨╛╨║ ┬л╨б╤В╨╛╨╕╤В ╨▓╨╜╨╕╨╝╨░╨╜╨╕╤П ╨▓ {╨│╨╛╤А╨╛╨┤╨╡}┬╗ ╨┤╤Г╨▒╨╗╨╕╤А╨╛╨▓╨░╨╗ ╤В╨╡ ╨╢╨╡ ╨║╨░╤А╤В╨╛╤З╨║╨╕, ╤З╤В╨╛ ╨╕ ╨╛╤Б╨╜╨╛╨▓╨╜╨░╤П ╨░╤Д╨╕╤И╨░ (╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║: ╨б╨▓╨╡╤В╨░ + ╨Ь╨╕╤А╨░╨╢ ╨┤╨▓╨░╨╢╨┤╤Л).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨г╨▒╤А╨░╨╜ ╨┐╨╛╨┤╨╖╨░╨│╨╛╨╗╨╛╨▓╨╛╨║ ╨▓ `CityCatalogHeader` (default + editorial).
- Date + category chips: ╨╛╨▒╤Й╨╕╨╣ ╤А╤П╨┤ `flex-wrap` / `md:flex-nowrap` (+ horizontal scroll ╨╜╨░ desktop ╨┐╤А╨╕ ╨┐╨╡╤А╨╡╨┐╨╛╨╗╨╜╨╡╨╜╨╕╨╕).
- ╨б ╤Е╨░╨▒╨░ ╤Б╨╜╤П╤В `RecommendedEvents` / `rankRecommended` тАФ ╨░╤Д╨╕╤И╨░ `#affiche` ╨╡╨┤╨╕╨╜╤Б╤В╨▓╨╡╨╜╨╜╤Л╨╣ ╤Б╨┐╨╕╤Б╨╛╨║ ╨║╨░╤А╤В╨╛╤З╨╡╨║.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy prod `@2808ed5` OK. Proof `/cities/murmansk`: ╨╜╨╡╤В ┬л╨б╤В╨╛╨╕╤В ╨▓╨╜╨╕╨╝╨░╨╜╨╕╤П┬╗; ╨╜╨╡╤В ┬лN тАж ╨▓ ╤В╨╡╨║╤Г╤Й╨╡╨╣ ╨▓╤Л╨┤╨░╤З╨╡ / ╨Я╨╛╨▓╤В╨╛╤А╤П╤О╤Й╨╕╨╡╤Б╤ПтАж┬╗; `md:flex-nowrap` ╨╜╨░ chips; ╤А╨╛╨▓╨╜╨╛ 2 ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╡ ╨║╨░╤А╤В╨╛╤З╨║╨╕ (╨б╨▓╨╡╤В╨░ + ╨Ь╨╕╤А╨░╨╢), ╨▒╨╡╨╖ ╨┤╤Г╨▒╨╗╤П.

---

## 2026-07-19 тАФ City hub: ╤Б╨╛╨│╨╗╨░╤Б╨╛╨▓╨░╨╜╨╜╤Л╨╡ ╤Б╤З╤С╤В╤З╨╕╨║╨╕ ╤З╨╕╨┐╨╛╨▓ (48 vs 635)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ ╨б╨Я╨▒ ┬л╨Т╤Б╨╡ 48┬╗ ╤А╤П╨┤╨╛╨╝ ╤Б ┬л╨Ь╨╡╤А╨╛╨┐╤А╨╕╤П╤В╨╕╤П 635+┬╗: ╤А╨░╨╖╨╜╤Л╨╡ ╨▒╨░╨╖╤Л.
- `CITY_SSR_SESSION_LIMIT = 48` тЖТ `payload.sessions`; `city.categories` ╤Б╤З╨╕╤В╨░╨╗╨╕╤Б╤М ╨┐╨╛ ╨▓╤Б╨╡╨╝ `matchedSessions` (~850).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Backend: `city.categories` = countBy ╨┐╨╛ ╤В╨╛╨╣ ╨╢╨╡ `sessions` slice, ╤З╤В╨╛ ╨▓ payload; hero `stats.events` = full-city.
- Client: ╤З╨╕╨┐╤Л ╨╕╨╖ `payload.sessions`; ╤З╨╕╤Б╨╗╨╛ ╤В╨╛╨╗╤М╨║╨╛ ╤Г ╨░╨║╤В╨╕╨▓╨╜╨╛╨│╨╛; default title ┬л╨С╨╗╨╕╨╢╨░╨╣╤И╨╕╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╤П┬╗.
- Popular tags ╤Г╨╢╨╡ ╤Б╨╜╤П╤В╤Л (`5aa84d3`) тАФ ╨╜╨╡ ╨▓╨╛╨╖╨▓╤А╨░╤Й╨░╨╡╨╝.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Ф╨╛: sessions=48, ╨Ь╨╡╤А╨╛╨┐╤А╨╕╤П╤В╨╕╤ПтЙИ635. ╨Я╨╛╤Б╨╗╨╡: sum(categories) тЙд sessions.length.

---

## 2026-07-19 тАФ City hub: ╨▒╨╡╨╖ popular tags, quieter chips

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ ╨░╤Д╨╕╤И╨╡ ╤Е╨░╨▒╨░ (╨б╨Я╨▒) ╨▒╨╗╨╛╨║ ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╤В╨╡╨│╨╕┬╗ ╨┤╤Г╨▒╨╗╨╕╤А╨╛╨▓╨░╨╗ ╨▓╨╡╤Б ╤Д╨╕╨╗╤М╤В╤А╨╛╨▓; date chips (navy) ╨╕ category chips (primary blue) ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗╨╕ ╨║╨░╨║ ╨┤╨▓╨░ ╤В╤П╨╢╤С╨╗╤Л╤Е ╤А╤П╨┤╨░ pills ╨▒╨╡╨╖ ╨╡╨┤╨╕╨╜╨╛╨╣ ╤Б╨╕╤Б╤В╨╡╨╝╤Л.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨г╨▒╤А╨░╨╜ `PopularTags` ╤Б city hub affiche (default + editorial ╤З╨╡╤А╨╡╨╖ ╨╛╨▒╤Й╨╕╨╣ `CityPageView`).
- Date + category chips: ╨╛╨▒╤Й╨╕╨╣ `hubFilterChipClass` тАФ `rounded-md`, ╨╝╨╡╨╜╤М╤И╨╕╨╣ padding, quiet border, ╨╡╨┤╨╕╨╜╤Л╨╣ active (`slate-800` / `zinc-900`).
- ╨д╨╕╨╗╤М╤В╤А ╨┐╨╛ tag ╤Б ╤Е╨░╨▒╨░ ╤Б╨╜╤П╤В (╤В╨╡╨│╨╕ ╨╛╤Б╤В╨░╤О╤В╤Б╤П ╨╜╨░ event page / ╨┐╨╛╨┤╨▒╨╛╤А╨║╨░╤Е).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy prod `@5aa84d3` OK. Proof `/cities/sankt-peterburg`: ╨╜╨╡╤В ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╤В╨╡╨│╨╕┬╗; chips `rounded-md border px-2.5`; active `slate-800` (╨╜╨╡ primary blue). Editorial `?hub=editorial` тАФ ╤В╨╛╨╢╨╡ ╨▒╨╡╨╖ tag cloud.

---

## 2026-07-19 тАФ City hub editorial template (P.2i experiment)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨д╨░╨╖╨░ 1 (`d877813`) тАФ default IA: affiche first + sticky + FAQ accordion.
- Lovable Vite mock (`city-hub-redesign`) тАФ moodboard only: light zinc, serif H1, poster 4:5 cards; ╨╜╨╡ ╨┐╨╛╤А╤В ╤Б╤В╨╡╨║╨░ (TanStack/bun/shadcn/terracotta).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╤Л╨╣ template: `hubTemplate: 'editorial' | 'default'`; `CityPageViewEditorial` тЖТ `CityPageView hubTemplate="editorial"`.
- ╨Т╨║╨╗╤О╤З╨╡╨╜╨╕╨╡: `?hub=editorial` (╨╗╤О╨▒╨╛╨╣ ╨│╨╛╤А╨╛╨┤); `?hub=default` ╤Д╨╛╤А╤Б╨╕╤А╤Г╨╡╤В ╤Д╨░╨╖╤Г 1; optional env `CITY_HUB_EDITORIAL_SLUGS` allowlist (╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╤В 65 ╨│╨╛╤А╨╛╨┤╨╛╨▓ ╨┐╨╛ ╤Г╨╝╨╛╨╗╤З╨░╨╜╨╕╤О).
- Visual: Source Serif 4 H1/H2, zinc-50, compact counters, sticky tabs, affiche poster-cards (`AffichePosterCard`), ╤В╨╡ ╨╢╨╡ API/`cityInfo` ╨┤╨░╨╜╨╜╤Л╨╡.
- Default phase 1 ╨▒╨╡╨╖ ╤А╨╡╨│╤А╨╡╤Б╤Б╨╕╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy prod `@6efe0d8` OK. Proof:
  - Default: https://daibilet.ru/cities/sankt-peterburg тАФ dark hero (`border-primary-950`), ╨╜╨╡╤В `font-serif` / `bg-zinc-50`.
  - Editorial: https://daibilet.ru/cities/sankt-peterburg?hub=editorial тАФ `font-serif` H1, `bg-zinc-50`, poster `aspect-[4/5]`, ╤В╨╛╤В ╨╢╨╡ `#affiche` IA.

---

## 2026-07-19 тАФ City hub ╤Д╨░╨╖╨░ 1 (P.2f) ╤А╨╡╨░╨╗╨╕╨╖╨╛╨▓╨░╨╜╨░

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Wireframe v1 ╨╖╨░╨║╤А╤Л╤В ╨║╨╛╨┤╨╛╨╝ ╨▓ `CityPageView`: ╨┐╨╛╤А╤П╨┤╨╛╨║ Hero тЖТ sticky tabs тЖТ `#affiche` тЖТ `#directions` тЖТ `#venues` тЖТ `#travel` тЖТ `#sights` тЖТ `#faq` тЖТ `#seo`.
- Lovable-╤А╨╡╨┐╨╛ ╨╜╨╡ ╨┐╨╛╤А╤В╨╕╤А╨╛╨▓╨░╨╗╨╕ тАФ ╤В╨╛╨╗╤М╨║╨╛ IA/UX ╨▓╤Л╨▓╨╛╨┤╤Л (╨░╤Д╨╕╤И╨░ ╨▓╤Л╤И╨╡ ╨│╨╕╨┤╨░, ╨╛╨┤╨╕╨╜ FAQ accordion, ╨║╨╛╨╝╨┐╨░╨║╤В╨╜╤Л╨╡ ╤Б╤З╤С╤В╤З╨╕╨║╨╕).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Sticky tabs + IntersectionObserver scrollspy; mobile horizontal chips.
- ╨з╨╕╨┐╤Л **╨б╨╡╨│╨╛╨┤╨╜╤П / ╨Т╤Л╤Е╨╛╨┤╨╜╤Л╨╡** ╤З╨╡╤А╨╡╨╖ `datetime` TZ helpers (╨║╨░╨║ ╨╜╨░ event/landing).
- FAQ: editorial `cityInfo.faq` + generated `faqItems` ╨▓ ╨╛╨┤╨╜╨╛╨╝ accordion (one-open).
- Alias `#city-schedule` тЖТ `#affiche` (╨╕ ╤Б╤В╨░╤А╤Л╨╡ `#city-*` ╤П╨║╨╛╤А╤П); `cityEventsHref` тЖТ `#affiche`.
- P.2f тЬЕ; deploy prod ╨┐╨╛╤Б╨╗╨╡ push `feat/next-monorepo`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy prod `@d877813` OK. Proof: `/cities/sankt-peterburg` тАФ ╨┐╨╛╤А╤П╨┤╨╛╨║ `affiche тЖТ directions тЖТ venues тЖТ travel тЖТ sights тЖТ faq тЖТ seo`, sticky nav, ╤З╨╕╨┐╤Л ╨б╨╡╨│╨╛╨┤╨╜╤П/╨Т╤Л╤Е╨╛╨┤╨╜╤Л╨╡, ╨╛╨┤╨╕╨╜ FAQ H2.

---

## 2026-07-19 тАФ City SEO title: ╨╕╨╝╨╡╨╜╨╕╤В╨╡╨╗╤М╨╜╤Л╨╣ + ╨┤╨░╤В╨░ ┬л╤Б╨╡╨│╨╛╨┤╨╜╤П┬╗

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨░╤В╤В╨╡╤А╨╜ P.2d ┬л╨б╨╛╨▒╤Л╤В╨╕╤П ╨▓ тАж ╨╜╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П┬╗ (╨┐╤А╨╡╨┤╨╗╨╛╨╢╨╜╤Л╨╣) ╤Е╤Г╨╢╨╡ ╤Б╤В╨░╤А╨╛╨│╨╛ brand-title ┬л╨У╨╛╤А╨╛╨┤: ╨░╤Д╨╕╤И╨░, ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕ ╨╕ ╨▒╨╕╨╗╨╡╤В╤Л┬╗.
- ╨Э╤Г╨╢╨╡╨╜ ╤Б╨╕╨│╨╜╨░╨╗ ╨░╨║╤В╤Г╨░╨╗╤М╨╜╨╛╤Б╤В╨╕: ┬л╨╜╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П, {╨┤╨░╤В╨░}┬╗ (MSK, ╤З╨╡╨╗╨╛╨▓╨╡╨║╨╛╤З╨╕╤В╨░╨╡╨╝╨╛).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Title standalone hubs: `{City}: ╨░╤Д╨╕╤И╨░, ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕ ╨╕ ╨▒╨╕╨╗╨╡╤В╤Л ╨╜╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П, {19 ╨╕╤О╨╗╤П} | ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В` (╨╕╨╝╨╡╨╜╨╕╤В╨╡╨╗╤М╨╜╤Л╨╣ ╨┐╨░╨┤╨╡╨╢).
- ╨е╨╡╨╗╨┐╨╡╤А `buildCityHubSeoTitle` (web / public / backend DTO + legacy `dto.js`); `generateMetadata` ╨▓╤Б╨╡╨│╨┤╨░ ╤Б╤З╨╕╤В╨░╨╡╤В title ╤Б ╨╢╨╕╨▓╨╛╨╣ ╨┤╨░╤В╨╛╨╣.
- Description ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣ (locative).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy prod `@2079e3a` OK. Proof (view-source ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡): `/cities/sankt-peterburg` тЖТ `<title>╨б╨░╨╜╨║╤В-╨Я╨╡╤В╨╡╤А╨▒╤Г╤А╨│: ╨░╤Д╨╕╤И╨░, ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕ ╨╕ ╨▒╨╕╨╗╨╡╤В╤Л ╨╜╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П, 19 ╨╕╤О╨╗╤П | ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В</title>`.

---

## 2026-07-19 тАФ City hub wireframe v2 (╤Д╨░╨╖╨░ 2, city-specific)


### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨а╨╕╤Б╨║ ╤Д╨░╨╖╤Л 2: ╨╛╨┤╨╕╨╜ UI ╨╜╨░ 65 ╤Е╨░╨▒╨╛╨▓ ╨▒╨╡╨╖ fingerprint тАФ ╨║╨╛╨┐╨╕╨┐╨░╤Б╤В╨░ ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╨╣ ╨╕ CTA.
- ╨д╨░╨╖╨░ 1 (v1) ╨╖╨░╨║╤А╤Л╨▓╨░╨╡╤В ╨║╨░╤А╨║╨░╤Б: ╨░╤Д╨╕╤И╨░ ╨▓╤Л╤И╨╡, sticky, FAQ accordion, ╤З╨╕╨┐╤Л ╨б╨╡╨│╨╛╨┤╨╜╤П/╨Т╤Л╤Е╨╛╨┤╨╜╤Л╨╡.
- ╨Я╤А╨╛╨┤╤Г╨║╤В ╤Д╨░╨╖╤Л 2: ╨┐╨╗╨╕╤В╨║╨╕ ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╨╣, ╤Г╤Б╨╕╨╗╨╡╨╜╨╕╨╡ ╨░╤Д╨╕╤И╨╕, sightsтЖТ╨░╤Д╨╕╤И╨░ ╤В╨╛╨╗╤М╨║╨╛ ╨┐╤А╨╕ ╤А╨╡╨░╨╗╤М╨╜╨╛╨╣ ╨┐╤А╨╕╨▓╤П╨╖╨║╨╡, venues ╤В╨╛╨┐-N ╨▒╨╡╨╖ ╨║╨░╤А╤В╤Л. ╨д╨░╨╖╨░ 3 (╨┐╨╛╨│╨╛╨┤╨░/╨╝╨╛╤Б╤В╤Л, bento, ╨║╨░╤А╤В╨░, dark ╨б╨Я╨▒) тАФ ╨▓╨╜╨╡ scope.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ч╨░╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜ IA: [city-hub-wireframe-v2.md](./city-hub-wireframe-v2.md) тАФ ╨┐╤А╨╕╨╜╤Ж╨╕╨┐ city-specific (╨╛╨▒╤Й╨╕╨╣ ╨║╨░╤А╨║╨░╤Б + per-city ╨║╨╛╨╜╤Д╨╕╨│).
- ╨Ъ╨╛╨╜╤Д╨╕╨│-╨╕╨┤╨╡╤П: `featuredDirections[]`, `highlightSeason`, `hideSections?`, `primaryCta?` (╤А╨░╤Б╤И╨╕╤А╨╡╨╜╨╕╨╡ `cityInfo` ╨╕╨╗╨╕ ╤Б╨╛╤Б╨╡╨┤╨╜╨╕╨╣ `cityHubConfig`; ╨▒╨╡╨╖ ╨║╨╛╨┤╨░).
- Fingerprint-╨┐╤А╨╕╨╝╨╡╤А╤Л: ╨б╨Я╨▒, ╨б╨╛╤З╨╕, ╨Ъ╨░╨╖╨░╨╜╤М, ╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║, ╨Ь╨╛╤Б╨║╨▓╨░.
- P.2g wireframe тЬЕ; P.2h ╤А╨╡╨░╨╗╨╕╨╖╨░╤Ж╨╕╤П тП│. Docs only, ╨▒╨╡╨╖ deploy.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В (╨╛╨╢╨╕╨┤╨░╨╡╤В code-task P.2h ╨┐╨╛╤Б╨╗╨╡/╨▓╨╜╨░╤Е╨╗╤С╤Б╤В ╤Б P.2f).

---

## 2026-07-19 тАФ City hub wireframe v1 (╤Д╨░╨╖╨░ 1)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨в╨╡╨║╤Г╤Й╨╕╨╣ `/cities/[slug]` (`CityPageView`): hero тЖТ travel тЖТ sights тЖТ guide FAQ тЖТ ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╤П/venues/tags тЖТ recommended тЖТ **╨░╤Д╨╕╤И╨░ `#city-schedule` ╨▓╨╜╨╕╨╖╤Г** тЖТ SEO тЖТ ╨▓╤В╨╛╤А╨╛╨╣ FAQ тАФ ╨│╨╕╨┤ ╨╝╨╡╤И╨░╨╡╤В ╨┤╨╛╨╣╤В╨╕ ╨┤╨╛ ╨┐╨╛╨║╤Г╨┐╨║╨╕.
- ╨Ъ╨╛╨╜╤В╨╡╨╜╤В 65 ╤Е╨░╨▒╨╛╨▓ ╨│╨╛╤В╨╛╨▓ ╨┐╨╛ brief/travel/faq; sights ╨╝╨╡╤Б╤В╨░╨╝╨╕ тЪая╕П; ╤Д╨╛╤В╨╛-bento ╨╕ ╨║╨░╤А╤В╨░ ╨╜╨╡ ╨╛╨▒╨╡╤Б╨┐╨╡╤З╨╡╨╜╤Л ╨┤╨░╨╜╨╜╤Л╨╝╨╕.
- ╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╤Б╨╛╨│╨╗╨░╤Б╨╛╨▓╨░╨╗ wireframe ╤Д╨░╨╖╤Л 1 **╨▒╨╡╨╖** ╨║╨╛╨┤╨░ Lovable.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ч╨░╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜ IA: [city-hub-wireframe-v1.md](./city-hub-wireframe-v1.md) тАФ sticky tabs, ╨░╤Д╨╕╤И╨░ ╨▓╤Л╤И╨╡ ╨│╨╕╨┤╨░, FAQ accordion (╨╛╨┤╨╕╨╜ ╨▒╨╗╨╛╨║), ╨║╨╛╨╝╨┐╨░╨║╤В╨╜╤Л╨╡ ╤Б╤З╤С╤В╤З╨╕╨║╨╕, ╤З╨╕╨┐╤Л ╨б╨╡╨│╨╛╨┤╨╜╤П/╨Т╤Л╤Е╨╛╨┤╨╜╤Л╨╡, ╤Б╨▓╨╡╤В╨╗╨░╤П ╨╕╨╖╨┤╨░╤В╨╡╨╗╤М╤Б╨║╨░╤П ╤Б╨╡╤В╨║╨░.
- ╨п╨║╨╛╤А╤П: `#affiche` (+ alias `#city-schedule`), `#directions`, `#venues`, `#travel`, `#sights`, `#faq`.
- Out of scope ╤Д╨░╨╖╤Л 1: ╨┐╨╛╨│╨╛╨┤╨░/╨╝╨╛╤Б╤В╤Л, bento sights, ╨║╨░╤А╤В╨░ ╨┐╨╗╨╛╤Й╨░╨┤╨╛╨║, dark redesign 65, ╤В╤С╨╝╨╜╤Л╨╣ ╨░╨║╤Ж╨╡╨╜╤В ╨б╨Я╨▒.
- ╨Ю╤Ж╨╡╨╜╨║╨░ ╤А╨╡╨░╨╗╨╕╨╖╨░╤Ж╨╕╨╕: **M** (~1тАУ2 eng-╨┤╨╜╤П); wireframe = docs only.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В (╨╛╨╢╨╕╨┤╨░╨╡╤В ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ code-task ╨┐╨╛╤Б╨╗╨╡ wireframe).

---

## 2026-07-19 тАФ City SEO: ┬л╨╜╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П┬╗ ╨▓ title ╤Е╨░╨▒╨╛╨▓

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Title standalone city hubs: ┬л╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║: ╨░╤Д╨╕╤И╨░, ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕ ╨╕ ╨▒╨╕╨╗╨╡╤В╤Л | ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В┬╗ тАФ ╨▒╨╡╨╖ ╤Б╨╕╨│╨╜╨░╨╗╨░ ┬л╤Б╨╡╨│╨╛╨┤╨╜╤П┬╗.
- Description ╤Г╨╢╨╡ ╤Б locative (┬л╨▓ ╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║╨╡┬╗) ╨┐╨╛╤Б╨╗╨╡ P.2c; ╨┤╤Г╨▒╨╗╨╕╤А╨╛╨▓╨░╤В╤М ┬л╨╜╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П┬╗ ╨▓ description ╨╜╨╡ ╨╜╤Г╨╢╨╜╨╛.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Default `seoTitle`: `╨б╨╛╨▒╤Л╤В╨╕╤П ${entityLabel} ╨╜╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П | ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В` (DTO + legacy `dto.js`).
- `generateMetadata` / client `applyCityMeta` / social-preview fallbacks ╤Б╨╛╨│╨╗╨░╤Б╨╛╨▓╨░╨╜╤Л.
- Description ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣ (locative ╨╛╤Б╤В╨░╤С╤В╤Б╤П, ╨▒╨╡╨╖ ╨▓╤В╨╛╤А╨╛╨│╨╛ ┬л╨╜╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П┬╗).
- Deploy prod `@48e6147` (╨▓╨║╨╗╤О╤З╨░╨╡╤В `d49f463` + Suspense/SiteLayout build-fixes).
- Proof (view-source): `/cities/murmansk` тЖТ `<title>╨б╨╛╨▒╤Л╤В╨╕╤П ╨▓ ╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║╨╡ ╨╜╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П | ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В</title>` (locative + ┬л╨╜╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П┬╗).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╡╤А╨▓╤Л╨╣ deploy ╤Г╨┐╤С╤А╤Б╤П ╨▓ `/locations` useSearchParams ╨╕ ╨▓ SiteLayout fallback ╤Б children ╨▓╨╜╨╡ provider тАФ ╨┐╨╛╤З╨╕╨╜╨╡╨╜╨╛ ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╝╨╕ ╨║╨╛╨╝╨╝╨╕╤В╨░╨╝╨╕.
- SSH ╨║ prod ╨╜╨╡╤Б╤В╨░╨▒╨╕╨╗╨╡╨╜ (banner timeout); ╨┤╨╡╨┐╨╗╨╛╨╣ ╤З╨╡╤А╨╡╨╖ nohup + poll ╨╗╨╛╨│╨░.

---

## 2026-07-19 тАФ Prod: ╨┐╤Г╤Б╤В╤Л╨╡ ╨│╨╗╨░╨▓╨╜╨░╤П ╨╕ `/events` (stats null.name)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- `/api/public/stats` тЖТ 500: `Cannot read properties of null (reading 'name')` ╨▓ `destinationSummaryRowsFast` (`publicDestinationForCity` ╨▓╨╛╨╖╨▓╤А╨░╤Й╨░╨╡╤В `null` ╨┤╨╗╤П foreign/unroutable ╨│╨╛╤А╨╛╨┤╨╛╨▓).
- `getHomePageData` ╤З╨╡╤А╨╡╨╖ `Promise.all` тАФ ╨┐╨░╨┤╨╡╨╜╨╕╨╡ stats ╨╛╨▒╨╜╤Г╨╗╤П╨╗╨╛ ╨▓╨╡╤Б╤М home (editors-pick / rails ╨▒╨╡╨╖ ╨║╨░╤А╤В╨╛╤З╨╡╨║).
- `/api/public/events` ╨▒╤Л╨╗ ╨╢╨╕╨▓ (2371+); ╨║╨░╤В╨░╨╗╨╛╨│ ╨▒╨╡╨╖ `?city=` ╨╜╨░ ╨║╨╗╨╕╨╡╨╜╤В╨╡ ╤Б╨▒╤А╨░╤Б╤Л╨▓╨░╨╗ SSR ╨▓ ╤Б╨║╨╡╨╗╨╡╤В╨╛╨╜╤Л ╨╜╨░ ╨▓╤А╨╡╨╝╤П city bootstrap.
- `daibilet-api` / `daibilet-web` active; OOM ╨▓ dmesg ╨╜╨╡╤В; web ╨┐╨╛╨┤ memory high ╨┐╨╛╤Б╨╗╨╡ ╤А╨╡╤Б╤В╨░╤А╤В╨╛╨▓.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Hotfix prod: `dto.js` тАФ null-safe `destination?.name` ╨▓ stats/admin/public rows; restart `daibilet-api` + `daibilet-web`, ╤Б╨▒╤А╨╛╤Б `.next/cache`.
- Worktree: `getHomePageData` тЖТ `Promise.allSettled`; SiteLayout Suspense fallback ╤Б╨╛╤Е╤А╨░╨╜╤П╨╡╤В `{children}`; CatalogShell ╨╜╨╡ ╨╖╨░╤В╨╕╤А╨░╨╡╤В SSR catalog ╨┐╤А╨╕ city bootstrap.
- Proof: stats 200 (`events:2487`); home HTML ╤Б `evt_`├Ч30 + ┬л╨Т╤Л╨▒╨╛╤А ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╕┬╗; `/events?city=╨Ь╨╛╤Б╨║╨▓╨░` ╤Б ╨║╨░╤А╤В╨╛╤З╨║╨░╨╝╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- SiteLayout/CatalogShell/`Promise.allSettled` ╨╖╨░╨║╨╛╨╝╨╝╨╕╤З╨╡╨╜╤Л ╨▓ `feat/next-monorepo` тАФ ╨╜╤Г╨╢╨╡╨╜ web rebuild ╨╜╨░ prod ╨┐╤А╨╕ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╡╨╝ deploy.
- ╨Э╨╡ ╨┤╨╡╨┐╨╗╨╛╨╕╤В╤М ╨┐╨╛╨▓╨╡╤А╤Е ╨░╨║╤В╨╕╨▓╨╜╨╛╨│╨╛ favicon-╨░╨│╨╡╨╜╤В╨░ ╨▒╨╡╨╖ ╨║╨╛╨╛╤А╨┤╨╕╨╜╨░╤Ж╨╕╨╕.

---

## 2026-07-19 тАФ City hub: events>0 / venues=0 (╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- `/cities/murmansk`: events=2, venues=0 ╨┐╤А╨╕ ╨╢╨╕╨▓╨╛╨╣ ╨┐╨╗╨╛╤Й╨░╨┤╨║╨╡ ┬л╨Ь╨╡╨│╨░ ╨Ъ╤А╤Г╨╢╨║╨░┬╗ (`venue_5ea93efb186c38b2a9d379bd`, pageStatus=CANDIDATE).
- ╨б╨╛╨▒╤Л╤В╨╕╤П ╨║╨╛╤А╤А╨╡╨║╤В╨╜╨╛ ╤Б╨▓╤П╨╖╨░╨╜╤Л ╤З╨╡╤А╨╡╨╖ `Event.venueId`; `/venues/mega-kruzhka` ╨╛╤В╨┤╨░╤С╤В events=2.
- `publicVenueHubRows(limit=500)` ╨▒╨╡╤А╤С╤В top-N ╨┐╨╛ SQL count; ┬л╨Ь╨╡╨│╨░ ╨Ъ╤А╤Г╨╢╨║╨░┬╗ ╨╜╨░ ╤А╨░╨╜╨│╨╡ **511** тЖТ ╨╜╨╡ ╨┐╨╛╨┐╨░╨┤╨░╨╗╨░ ╨▓ hub.
- `publicVenuesForSessionsFromHub` ╨╕╤Б╨║╨░╨╗ ╤В╨╛╨╗╤М╨║╨╛ ╨▓ hubRows ╨┐╨╛ `venueId` тЖТ ╨┐╤Г╤Б╤В╨╛╨╣ ╤Б╨┐╨╕╤Б╨╛╨║ ╨╕ stats.venues=0.
- Landings ╤Г╨╢╨╡ ╤Б╤З╨╕╤В╨░╨╗╨╕ venues=1 (╨┤╤А╤Г╨│╨╛╨╣ ╨┐╤Г╤В╤М) тАФ UI ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗ ╨┐╤А╨╛╤В╨╕╨▓╨╛╤А╨╡╤З╨╕╨▓╨╛.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `resolvePublicVenuesForSessions`: ╨┐╨╛╤Б╨╗╨╡ hub-match ╨┤╨╛╨│╤А╤Г╨╢╨░╨╡╤В missing `venueId` ╤З╨╡╤А╨╡╨╖ `venueRowsByIds`.
- Match hub ╤В╨░╨║╨╢╨╡ ╨┐╨╛ ╨╜╨╛╤А╨╝╨░╨╗╨╕╨╖╨╛╨▓╨░╨╜╨╜╨╛╨╝╤Г `venueSlug`.
- `countDistinctSessionVenues` ╨┤╨╗╤П `city.venues` / `stats.venues` ╨┐╨╛ ╨▓╤Б╨╡╨╝ ╤Б╨╡╤Б╤Б╨╕╤П╨╝ ╨│╨╛╤А╨╛╨┤╨░ (╨╜╨╡ cap display-list).
- UI: CTA ┬л╨Т╤Б╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╤П┬╗ тАФ `gap-2` + `shrink-0` ╤Г ╨╕╨║╨╛╨╜╨║╨╕ Ticket.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨У╨╗╨╛╨▒╨░╨╗╤М╨╜╤Л╨╣ hub catalogue ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г top-500; city hubs ╨▒╨╛╨╗╤М╤И╨╡ ╨╛╤В ╨╜╨╡╨│╨╛ ╨╜╨╡ ╨╖╨░╨▓╨╕╤Б╤П╤В ╨┤╨╗╤П ╤Б╤З╤С╤В╤З╨╕╨║╨░ ╨┐╨╗╨╛╤Й╨░╨┤╨╛╨║ ╤Б╨╛╨▒╤Л╤В╨╕╨╣.

---

## 2026-07-19 тАФ City copy: ╨┐╤А╨╡╨┤╨╗╨╛╨╢╨╜╤Л╨╣ ╨┐╨░╨┤╨╡╨╢ (┬л╨▓ ╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║╨╡┬╗)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- UI ╤Е╨░╨▒╨╛╨▓ ╨┐╨╕╤Б╨░╨╗ ┬л╨з╤В╨╛ ╨┐╨╛╤Б╨╝╨╛╤В╤А╨╡╤В╤М ╨▓ ╨│╨╛╤А╨╛╨┤╨╡ ╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║┬╗ / ┬л╨Т╤Б╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╤П ╨▓ ╨│╨╛╤А╨╛╨┤╨╡ тАж┬╗ тАФ ╨│╤А╨░╨╝╨╝╨░╤В╨╕╤З╨╡╤Б╨║╨╕ ╨╜╨╡╨▓╨╡╤А╨╜╨╛.
- `city-declension` ╨┐╨╛╨║╤А╤Л╨▓╨░╨╗ ~40 ╨│╨╛╤А╨╛╨┤╨╛╨▓; fallback ╨▓ `cityInPrepositional` ╨▒╤Л╨╗ `╨▓ ╨│╨╛╤А╨╛╨┤╨╡ ${name}` ╨┤╨╗╤П ╨╕╨╝╤С╨╜ ╨▒╨╡╨╖ -╨░.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨а╨░╤Б╤И╨╕╤А╨╡╨╜ ╤Б╨╗╨╛╨▓╨░╤А╤М `CITY_FORMS` (web + public) + ╤Н╨▓╤А╨╕╤Б╤В╨╕╨║╨░; ╨┤╨╛╨▒╨░╨▓╨╗╨╡╨╜ `inCityPrepositional`.
- CityPage / city-faq / metadata: `╨▓ ${locative}`, ╨▒╨╡╨╖ ┬л╨▓ ╨│╨╛╤А╨╛╨┤╨╡ X┬╗.
- `destinationPrepositional` ╨▓ `dto.js` тАФ ╤В╨╛╤В ╨╢╨╡ ╨┐╤А╨╕╨╜╤Ж╨╕╨┐.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-19 тАФ City hubs: ╨б╨░╤А╨░╨╜╤Б╨║ brief + ╨Ш╨▓╨░╨╜╨╛╨▓╨╛/╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║ sights

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨г ╨б╨░╤А╨░╨╜╤Б╨║╨░ ╨▒╤Л╨╗╨╕ travel/FAQ/sights, ╨╜╨╛ `brief` ╨▒╤Л╨╗ ╨┐╤Г╤Б╤В╤Л╨╝ тАФ hero ╨┐╨░╨┤╨░╨╗ ╨╜╨░ fallback.
- ╨Ш╨▓╨░╨╜╨╛╨▓╨╛ ╨╕ ╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║ тАФ ╨┐╨╛╤Б╨╗╨╡╨┤╨╜╨╕╨╡ тЭМ ╨┐╨╛ sights ╨▓ gap-╨╝╨░╤В╤А╨╕╤Ж╨╡ ╤Б╤А╨╡╨┤╨╕ standalone hubs.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨б╨░╤А╨░╨╜╤Б╨║: ╨╖╨░╨┐╨╛╨╗╨╜╨╡╨╜ `brief` (╤В╨╡╨║╤Б╤В ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░).
- ╨Ш╨▓╨░╨╜╨╛╨▓╨╛ / ╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║: ╤В╨╛╨┐-6 `sights[{title,text}]`; ╨╛╨┐╨╡╤З╨░╤В╨║╨░ ┬л╨║╨╛╨╜╤Б╤В╤А╤Г╤Б╤В╤А╤Г╨║╤В╨╕╨▓╨╕╨╖╨╝╨░┬╗ тЖТ ┬л╨║╨╛╨╜╤Б╤В╤А╤Г╨║╤В╨╕╨▓╨╕╨╖╨╝╨░┬╗.
- ╨Ю╨▒╨╜╨╛╨▓╨╗╤С╨╜ `docs/city-hub-content-gaps.md` (brief 65/65, sights тЭМ = 0).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-19 тАФ City hubs: travel + FAQ wave 3 (43 ╨│╨╛╤А╨╛╨┤╨░)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ч╨░╨║╤А╤Л╤В╤Л ╨▓╤Б╨╡ ╨╛╤Б╤В╨░╨▓╤И╨╕╨╡╤Б╤П gaps ╨┐╨╛ `travel`/`faq`: ╨Р╨▒╨░╨║╨░╨╜тАж╨п╤А╨╛╤Б╨╗╨░╨▓╨╗╤М (43 ╤Е╨░╨▒╨░).
- ╨Ю╨┐╨╡╤З╨░╤В╨║╨╕: ╨╜╨╛╨▓╨│╨╛╤А╨╛╨┤╤Б╨║╨╕╨╣ ┬л╨╝╨╡╨┤-╤Б╤В╨░╨▓╨╡handling┬╗ тЖТ ┬л╨╝╤С╨┤-╤Б╤В╨░╨▓╨╗╨╡╨╜╤М┬╗; ╨▓╨╛╨╗╨│╨╛╨│╤А╨░╨┤╤Б╨║╨╕╨╣ FAQ ╨╝╨╡╤В╤А╨╛╤В╤А╨░╨╝╨░ ┬л╨╜╨░╨╝╨╡╤В/╨╜╨░ ╨╜╨╡╨╝┬╗ тЖТ ┬л╨╜╨░ ╨╜╨╡╨│╨╛ ╨┐╤А╨╛╨║╨░╤В╨╕╤В╤М╤Б╤П┬╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨░╨╜╨╜╤Л╨╡ ╨▓ `CITY_INFO` (web + public parity); ╤А╨╡╨╜╨┤╨╡╤А/JSON-LD ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣.
- ╨Ь╨░╤В╤А╨╕╤Ж╨░ `docs/city-hub-content-gaps.md`: travel тЬЕ **65/65**, FAQ тЬЕ **65/65**.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-19 тАФ City hubs: sights + travel/FAQ wave 2 + gaps table

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜╨╛ ╨┐╨╛╨╗╨╡ `sights[{title,text}]`; ╤Б╨╡╨║╤Ж╨╕╤П ┬л╨з╤В╨╛ ╨┐╨╛╤Б╨╝╨╛╤В╤А╨╡╤В╤М┬╗ ╨╜╨░ hub (╨┐╤А╨╕╨╛╤А╨╕╤В╨╡╤В ╨╜╨░╨┤ legacy `mustSee`).
- Wave 2 travel/FAQ: ╨Ъ╤Г╤А╨│╨░╨╜, ╨Ы╨╕╨┐╨╡╤Ж╨║, ╨Ъ╨╡╨╝╨╡╤А╨╛╨▓╨╛, ╨з╨╕╤В╨░, ╨Ъ╨╕╤А╨╛╨▓, ╨С╨░╤А╨╜╨░╤Г╨╗, ╨з╨╡╨▒╨╛╨║╤Б╨░╤А╤Л (+ ╨б╨░╤А╨░╨╜╤Б╨║ ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣).
- Sights: 15 (╨б╨╝╨╛╨╗╨╡╨╜╤Б╨║тАж╨е╨░╨▒╨░╤А╨╛╨▓╤Б╨║) + 8 (╨Ъ╤Г╤А╨│╨░╨╜тАж╨з╨╡╨▒╨╛╨║╤Б╨░╤А╤Л) = 22 ╤Е╨░╨▒╨░ ╤Б ╤В╨╛╨┐-6.
- ╨С╨░╤А╨╜╨░╤Г╨╗: ╨╝╤Г╨╖╨╡╨╣ ┬л╨Ь╨╕╤А ╨▓╤А╨╡╨╝╨╡╨╜╨╕┬╗; ╨Ь╨░╨╗╨╛-╨в╨╛╨▒╨╛╨╗╤М╤Б╨║╨░╤П ╨▒╨╡╨╖ ╨┤╤Г╨▒╨╗╤П ┬л╨┐╨╡╤И╨╡╤Е╨╛╨┤╨╜╤Л╨╣┬╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `docs/city-hub-content-gaps.md` тАФ ╨╝╨░╤В╤А╨╕╤Ж╨░ brief/sights/travel/FAQ ╨┐╨╛ ╨▓╤Б╨╡╨╝ 65 standaloneCities.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-19 тАФ City hubs: travel + FAQ wave 2 (╨Ъ╤Г╤А╨│╨░╨╜тАж╨з╨╡╨▒╨╛╨║╤Б╨░╤А╤Л)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╤В╨╛╤А╨░╤П ╨┐╨░╤З╨║╨░: ╨Ъ╤Г╤А╨│╨░╨╜, ╨Ы╨╕╨┐╨╡╤Ж╨║ (`lipeck`), ╨Ъ╨╡╨╝╨╡╤А╨╛╨▓╨╛, ╨з╨╕╤В╨░, ╨Ъ╨╕╤А╨╛╨▓ (`kirov-kirovskaya-oblast`), ╨С╨░╤А╨╜╨░╤Г╨╗, ╨з╨╡╨▒╨╛╨║╤Б╨░╤А╤Л; ╨б╨░╤А╨░╨╜╤Б╨║ ╤Г╨╢╨╡ ╨▒╤Л╨╗ ╨▓ wave 1.
- ╨а╨╡╨╜╨┤╨╡╤А/JSON-LD ╤Г╨╢╨╡ ╨╜╨░ ╨╝╨╡╤Б╤В╨╡ ╤Б wave 1 тАФ ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨░╨╜╨╜╤Л╨╡ `CITY_INFO`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- +7 ╨│╨╛╤А╨╛╨┤╨╛╨▓ ╤Б `travel`/`faq` (web + public parity); ╨б╨░╤А╨░╨╜╤Б╨║ ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣ (╤В╨╡╨║╤Б╤В╤Л ╤Б╨╛╨▓╨┐╨░╨╗╨╕).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-19 тАФ City hubs: travel + FAQ (15 ╨│╨╛╤А╨╛╨┤╨╛╨▓)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж ╨┤╨░╨╗ ╨▒╨╗╨╛╨║╨╕ ┬л╨Ъ╨░╨║ ╨┤╨╛╨▒╤А╨░╤В╤М╤Б╤П / ╨╗╤Г╤З╤И╨╕╨╣ ╤Б╨╡╨╖╨╛╨╜┬╗ ╨╕ 3 FAQ ╨╜╨░ ╨│╨╛╤А╨╛╨┤ ╨┤╨╗╤П 15 ╤Е╨░╨▒╨╛╨▓.
- ╨Т ╨╕╤Б╤Е╨╛╨┤╨╜╨╕╨║╨╡ ╨б╨╝╨╛╨╗╨╡╨╜╤Б╨║╨░ ╨▒╤Л╨╗╨░ ╨╛╨┐╨╡╤З╨░╤В╨║╨░ ┬л╨║╨╛╨╜custom╨╜╤Л╨╣┬╗ тЖТ ╨╕╤Б╨┐╤А╨░╨▓╨╗╨╡╨╜╨╛ ╨╜╨░ ┬л╨║╤Г╤Б╤В╨░╤А╨╜╤Л╨╣ ╨▓╤П╨╗╨╡╨╜╤Л╨╣ ╤Б╨░╤Е╨░╤А┬╗.
- ╨б╨░╤А╨░╨╜╤Б╨║ ╨╜╨╡ ╨╕╨╝╨╡╨╗ `CITY_INFO.brief` тАФ ╨┤╨╛╨▒╨░╨▓╨╗╨╡╨╜ entry ╤В╨╛╨╗╤М╨║╨╛ ╤Б travel/faq.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨а╨░╤Б╤И╨╕╤А╨╡╨╜ `CityInfoEntry`: optional `travel`, `faq[{q,a}]` ╨▓ `apps/web` + parity `apps/public`.
- ╨Э╨░ `/cities/{slug}` ╨┐╨╛╤Б╨╗╨╡ hero: ╤Б╨╡╨║╤Ж╨╕╨╕ ┬л╨Ъ╨░╨║ ╨┤╨╛╨▒╤А╨░╤В╤М╤Б╤П ╨╕ ╨║╨╛╨│╨┤╨░ ╨╡╤Е╨░╤В╤М┬╗ ╨╕ ┬л╨з╨░╤Б╤В╤Л╨╡ ╨▓╨╛╨┐╤А╨╛╤Б╤Л┬╗ (╨┐╤А╨╛╤Б╤В╨░╤П ╨▓╤С╤А╤Б╤В╨║╨░).
- JSON-LD `FAQPage`: ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╛╨╜╨╜╤Л╨╣ FAQ prepend ╨║ ╨▒╨╕╨╗╨╡╤В╨╜╨╛╨╝╤Г ╤З╨╡╤А╨╡╨╖ `buildCityEditorialFaqItems`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-19 тАФ City hubs: ╨╡╤Й╤С 9 brief (╨з╨╕╤В╨░тАж╨е╨░╨▒╨░╤А╨╛╨▓╤Б╨║)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨з╨╕╤В╨░ ╨▓ ╨╕╤Б╤Е╨╛╨┤╨╜╨╕╨║╨╡ ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░ ╨▒╤Л╨╗╨░ ╨┤╨▓╨░╨╢╨┤╤Л (┬л╨У╨╛╤А╨╛╨┤ ╨┐╤А╨╕╨▓╨╗╨╡╨║╨░╨╡╤ВтАж┬╗ / ┬л╨з╨╕╤В╨░ ╨┐╤А╨╕╨▓╨╗╨╡╨║╨░╨╡╤ВтАж┬╗) тАФ ╨╛╤Б╤В╨░╨▓╨╗╨╡╨╜ ╨╛╨┤╨╕╨╜ ╤В╨╡╨║╤Б╤В ╤Б ┬л╨з╨╕╤В╨░ ╨┐╤А╨╕╨▓╨╗╨╡╨║╨░╨╡╤ВтАж┬╗.
- Prod-slug: `lipeck` (╨╜╨╡ lipetsk), `kirov-kirovskaya-oblast`, `habarovsk` (╨╜╨╡ khabarovsk).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- +9 `brief` ╨▓ `CITY_INFO` (web + public): chita, kirov-kirovskaya-oblast, kurgan, lipeck, ivanovo, kemerovo, cheboksary, barnaul, habarovsk.
- ╨Р╨╗╨╕╨░╤Б╤Л: `kirov`тЖТ`kirov-kirovskaya-oblast`, `lipetsk`тЖТ`lipeck`, `khabarovsk`тЖТ`habarovsk`.
- ╨Ю╨┐╨╡╤З╨░╤В╨║╨░ ┬л╨Ш╨╕╨╜╨┤╤Г╤Б╤В╤А╨╕╨░╨╗╤М╨╜╨╛╨╡┬╗ тЖТ ┬л╨Ш╨╜╨┤╤Г╤Б╤В╤А╨╕╨░╨╗╤М╨╜╨╛╨╡┬╗ (╨Ъ╨╡╨╝╨╡╤А╨╛╨▓╨╛).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-19 тАФ City hubs: brief-╨╛╨┐╨╕╤Б╨░╨╜╨╕╤П 14 ╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А╨╛╨▓

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ю╨┐╨╕╤Б╨░╨╜╨╕╤П city hub ╤А╨╡╨╜╨┤╨╡╤А╤П╤В╤Б╤П ╨╕╨╖ ╤Б╤В╨░╤В╨╕╤З╨╡╤Б╨║╨╛╨│╨╛ `CITY_INFO.brief` (`apps/web` + ╨┐╨░╤А╨╕╤В╨╡╤В `apps/public`), ╨╜╨╡ ╨╕╨╖ `City.introText` ╨▓ ╨С╨Ф.
- Hero ╨╜╨░ `/cities/{slug}` ╨▒╨╡╤А╤С╤В `guide?.brief` ╤З╨╡╤А╨╡╨╖ `resolveCityInfo`; SEO-╨▒╨╗╨╛╨║ тАФ `resolveCityBrief` ╨▓ `city-faq.ts`.
- Prod-slug тЙа ┬л╨╡╤Б╤В╨╡╤Б╤В╨▓╨╡╨╜╨╜╤Л╨╣┬╗ ╤В╤А╨░╨╜╤Б╨╗╨╕╤В: `arhangelsk`, `astrahan`, `yuzhno-sahalinsk`, `blagoveschensk-amurskaya-oblast` (╨Р╨╝╤Г╤А╤Б╨║╨░╤П, ╨╜╨╡ ╨С╨░╤И╨║╨╛╤А╤В╨╛╤Б╤В╨░╨╜).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜╤Л 14 `brief` ╨▓ `CITY_INFO` (╤Б╨╝╤Л╤Б╨╗ ╤В╨╡╨║╤Б╤В╨╛╨▓ ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░, ╤В╨╛╨╜ ╤Б╨░╨╣╤В╨░).
- ╨Р╨╗╨╕╨░╤Б╤Л: `arkhangelsk`тЖТ`arhangelsk`, `astrakhan`тЖТ`astrahan`, `yuzhno-sakhalinsk`тЖТ`yuzhno-sahalinsk`, `blagoveshchensk`(+`-amurskaya-oblast`)тЖТ`blagoveschensk-amurskaya-oblast`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-19 тАФ Geo: ╤Е╨▓╨╛╤Б╤В allowlist + cut ╨╖╨░╤А╤Г╨▒╨╡╨╢╤М╤П

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ expand ╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А╨╛╨▓ ╨╛╤Б╤В╨░╨▓╨░╨╗╨╛╤Б╤М **63** ╨│╨╛╤А╨╛╨┤╨░ ╤Б ╨┐╤А╨╕╤З╨╕╨╜╨╛╨╣ ╤В╨╛╨╗╤М╨║╨╛ `allowlist` (╨┤╤Л╤А╤Л: ╤Б╨╛╨▒╤Л╤В╨╕╤П ╨╜╨╡ ╨▓ city ╨╕ ╨╜╨╡ ╨▓ region destination).
- ╨Т `cityToRegion` ╨╛╤И╨╕╨▒╨╛╤З╨╜╨╛ ╨▒╤Л╨╗╨╛ `╨Ю╤Б╨░╨║╨░`тЖТ`╨п╨┐╨╛╨╜╨╕╤П` (non-RF ╨┐╨╛╨┐╨░╨┤╨░╨╗╨╛ ╨▓ routing).
- ╨С╨░╤В╤Г╨╝╨╕ (2 READY) тАФ ╨╖╨░╤А╤Г╨▒╨╡╨╢╤М╨╡, ╨╜╨╡ ╨┤╨╗╤П ╨┐╤Г╨▒╨╗╨╕╤З╨╜╨╛╨│╨╛ ╨║╨░╤В╨░╨╗╨╛╨│╨░ ╨а╨д.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜ `foreignCities` ╨▓ `city-routing.ru.json` (╨С╨░╤В╤Г╨╝╨╕, ╨Ю╤Б╨░╨║╨░); filter ╨▓ `mapGroupedPublicSession` + `isAllowedPublicDestination`.
- ╨е╨▓╨╛╤Б╤В 63: **59** тЖТ ╤Б╤Г╨▒╤К╨╡╨║╤В ╤З╨╡╤А╨╡╨╖ `cityToRegion`; **╨Ч╨╡╨╗╨╡╨╜╨╛╨│╤А╨░╨┤/╨й╨╡╤А╨▒╨╕╨╜╨║╨░тЖТ╨Ь╨╛╤Б╨║╨▓╨░**, **╨Я╤Г╤И╨║╨╕╨╜тЖТ╨б╨░╨╜╨║╤В-╨Я╨╡╤В╨╡╤А╨▒╤Г╤А╨│**; **╨С╨░╤В╤Г╨╝╨╕** cut; ╨▒╨╡╨╖ ╨╝╨░╨┐╨┐╨╕╨╜╨│╨░ тАФ **0**.
- `standaloneCities` ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕ (╨╝╨╡╨╗╨║╨╕╨╡ ╨╜╨╡ ╨┤╨╛╨▒╨░╨▓╨╗╤П╨╗╨╕). REGION_HUBS ╤А╨░╤Б╤И╨╕╤А╨╡╨╜ ╨┐╨╛╨┤ ╨╜╨╛╨▓╤Л╨╡ ╤Б╤Г╨▒╤К╨╡╨║╤В╤Л ╤Б ╤Г╨╢╨╡ ╤Б╤Г╤Й╨╡╤Б╤В╨▓╤Г╤О╤Й╨╕╨╝╨╕ ╤Ж╨╡╨╜╤В╤А╨░╨╝╨╕.
- Docs: `geo-excluded-cities.md`, Tasktracker G.6.
- **Prod:** deploy-prod-next OK. Proof: `foreignCities`=[╨С╨░╤В╤Г╨╝╨╕,╨Ю╤Б╨░╨║╨░]; destinations city=65 region=36; foreign not in dest; Batumi search items=0; ╨Ь╨Ю/╨Ы╨Ю/╨Ъ╤А╨░╤Б╨╜╨╛╨┤╨░╤А/╨а╨╛╤Б╤В╨╛╨▓/╨С╨░╤И╨║╨╛╤А╤В╨╛╤Б╤В╨░╨╜/╨з╨╡╨╗╤П╨▒╨╕╨╜╤Б╨║/╨б╤В╨░╨▓╤А╨╛╨┐╨╛╨╗╤М/╨Т╨╛╤А╨╛╨╜╨╡╨╢ тАФ ╨╡╤Б╤В╤М.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- `╨а╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░ ╨Ф╨░╨│╨╡╤Б╤В╨░╨╜` (╨Ъ╨░╤Б╨┐╨╕╨╣╤Б╨║) ╨▒╨╡╨╖ hub-╤Ж╨╡╨╜╤В╤А╨░ ╨▓ standalone тАФ ╤А╨╡╨│╨╕╨╛╨╜ ╨╝╨╛╨╢╨╡╤В ╨┐╨╛╤П╨▓╨╕╤В╤М╤Б╤П orphan-╨║╨░╤А╤В╨╛╤З╨║╨╛╨╣; ╨╛╨║ ╨┐╤А╨╕ 1 ╤Б╨╛╨▒╤Л╤В╨╕╨╕.

---

## 2026-07-19 тАФ Geo-╨┐╨╛╨╗╨╕╤В╨╕╨║╨░: ╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А╤Л + region buckets + ╨з╨╡╨╗╨╜╤Л

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж ╨╖╨░╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╗: ╨Э╨░╨▒╨╡╤А╨╡╨╢╨╜╤Л╨╡ ╨з╨╡╨╗╨╜╤Л = ╨в╨░╤В╨░╤А╤Б╤В╨░╨╜ тЖТ ╨┐╨╛╨┤ ╨║╨░╤А╤В╨╛╤З╨║╨╛╨╣ ╨Ъ╨░╨╖╨░╨╜╨╕ (┬л╤Б╨╛╨▒╤Л╤В╨╕╤П ╨╛╨▒╨╗╨░╤Б╤В╨╕┬╗), ╨╜╨╡ standalone.
- `cityToRegion` тАФ ╤И╤В╨░╤В╨╜╨░╤П ╤Б╨▓╤С╤А╤В╨║╨░ ╨▓ ╤Б╤Г╨▒╤К╨╡╨║╤В, **╨╜╨╡** ┬л╨┤╤Л╤А╨░┬╗ allowlist.
- Allowlist: ╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А + saleable тЖТ `standaloneCities` + hub; ╨╜╨╡-╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А тЖТ `cityToRegion`; ╨╝╨╡╨╗╨║╨╕╨╡ ╨┐╨╛╤Б╤С╨╗╨║╨╕ (╨б╨╛╤А╤В╨░╨▓╨░╨╗╨░, ╨Ы╨╡╨▒╤П╨╢╤М╨╡) ╤В╨╛╨╗╤М╨║╨╛ ╨▓ region.
- ╨С╨░╨│: `isPublicRegionName` ╤П╨║╨╛╤А╨╕╨╗ `$/(тАж|╤А╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░)$`, ╨░ ┬л╨а╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░ ╨в╨░╤В╨░╤А╤Б╤В╨░╨╜┬╗ ╨╜╨░╤З╨╕╨╜╨░╨╡╤В╤Б╤П ╤Б ┬л╨а╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░┬╗ тЖТ ╤А╨╡╨│╨╕╨╛╨╜ ╨╛╤В╤Д╨╕╨╗╤М╤В╤А╨╛╨▓╤Л╨▓╨░╨╗╤Б╤П; `\b` ╨▓ JS ╤Б ╨║╨╕╤А╨╕╨╗╨╗╨╕╤Ж╨╡╨╣ ╨╜╨╡╨╜╨░╨┤╤С╨╢╨╡╨╜.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Regex: `/^╤А╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░(?:\s|$)/iu` **╨╕╨╗╨╕** ╤Б╤Г╤Д╤Д╨╕╨║╤Б `╨╛╨▒╨╗╨░╤Б╤В╤М|╨║╤А╨░╨╣|╤А╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░|╨╛╨║╤А╤Г╨│`.
- `city-routing.ru.json`: +29 ╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А╨╛╨▓ ╨▓ standalone (╨╕╤В╨╛╨│╨╛ 65); ╤А╨░╤Б╤И╨╕╤А╨╡╨╜ `cityToRegion` (╨в╨╛╨╗╤М╤П╤В╤В╨╕тЖТ╨б╨░╨╝╨░╤А╤Б╨║╨░╤П, ╨з╨╡╨╗╨╜╤ЛтЖТ╨в╨░╤В╨░╤А╤Б╤В╨░╨╜, ╨б╨╛╤А╤В╨░╨▓╨░╨╗╨░тЖТ╨Ъ╨░╤А╨╡╨╗╨╕╤П, тАж).
- `REGION_HUBS` ╤А╨░╤Б╤И╨╕╤А╨╡╨╜ (╨Я╤А╨╕╨╝╨╛╤А╤М╨╡, ╨Р╨╗╤В╨░╨╣, ╨б╨░╨╝╨░╤А╨░, ╨з╨╡╨╗╤П╨▒╨╕╨╜╤Б╨║, ╨С╨░╤И╨║╨╛╤А╤В╨╛╤Б╤В╨░╨╜, тАж) ╨┤╨╗╤П ╤Б╤Б╤Л╨╗╨║╨╕ ┬л+ ╤А╨╡╨│╨╕╨╛╨╜┬╗ ╨┐╨╛╨┤ ╨║╨░╤А╤В╨╛╤З╨║╨╛╨╣ ╤Ж╨╡╨╜╤В╤А╨░.
- ╨Ф╨╛╨║╤Г╨╝╨╡╨╜╤В╤Л: Project / Tasktracker G.* / geo-excluded-cities.md.
- **Prod @`6f0fcf7`:** deploy-prod-next OK. Proof: destinations city=65, ╨з╨╡╨╗╨╜╤Л ╨╜╨╡ city; `╨а╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░ ╨в╨░╤В╨░╤А╤Б╤В╨░╨╜` events=12; `/cities/respublika-tatarstan` ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╡╤В ╨┐╨╗╨╛╤Й╨░╨┤╨║╨╕ ┬л╨Э╨░╨▒╨╡╤А╨╡╨╢╨╜╤Л╨╡ ╨з╨╡╨╗╨╜╤Л┬╗; ╨Т╨╗╨░╨┤╨╕╨▓╨╛╤Б╤В╨╛╨║/╨е╨░╨▒╨░╤А╨╛╨▓╤Б╨║/╨з╨╡╨▒╨╛╨║╤Б╨░╤А╤Л ╨▓ standalone.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨е╨░╨▒╤Л ╨╜╨╛╨▓╤Л╤Е ╨│╨╛╤А╨╛╨┤╨╛╨▓ thin (listing) тАФ ╨╛╨║ ╨┐╨╛ ╨┐╨╛╨╗╨╕╤В╨╕╨║╨╡; ╨║╨╛╨╜╤В╨╡╨╜╤В SEO тАФ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛ (P.2).
- ╨в╨╛╤З╨╜╤Л╨╡ `City.title` ╤Б ╤Б╨║╨╛╨▒╨║╨░╨╝╨╕ (`╨Ъ╨╕╤А╨╛╨▓ (╨Ъ╨╕╤А╨╛╨▓╤Б╨║╨░╤П ╨╛╨▒╨╗╨░╤Б╤В╤М)`, `╨С╨╗╨░╨│╨╛╨▓╨╡╤Й╨╡╨╜╤Б╨║ (╨Р╨╝╤Г╤А╤Б╨║╨░╤П ╨╛╨▒╨╗╨░╤Б╤В╤М)`) ╨┤╨╛╨╗╨╢╨╜╤Л ╤Б╨╛╨▓╨┐╨░╨┤╨░╤В╤М ╤Б ╨С╨Ф.
- SWC: ╨║╨╗╤О╤З `╨Щ╨╛╤И╨║╨░╤А-╨Ю╨╗╨░` ╨▒╨╡╨╖ ╨║╨░╨▓╤Л╤З╨╡╨║ ╨╗╨╛╨╝╨░╨╗ `web:build` тЖТ hotfix `6f0fcf7`.

---

## 2026-07-19 тАФ ╨Р╤Г╨┤╨╕╤В ╨│╨╛╤А╨╛╨┤╨╛╨▓ ╨▓╨╜╨╡ public destinations

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Prod: 180 ╨│╨╛╤А╨╛╨┤╨╛╨▓ ╤Б READY ╨╕/╨╕╨╗╨╕ saleable; ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ ╨║╨░╤В╨░╨╗╨╛╨│ тАФ **36** city destinations (+ 4 region).
- ╨Ш╤Б╨║╨╗╤О╤З╨╡╨╜╨╛ **144** ╨│╨╛╤А╨╛╨┤╨░: ╤Б╨╝. `docs/geo-excluded-cities.md`.
- ╨Ф╨╛╨╝╨╕╨╜╨╕╤А╤Г╤О╤Й╨╕╨╡ ╨┐╤А╨╕╤З╨╕╨╜╤Л (╨╜╨░ ╨╝╨╛╨╝╨╡╨╜╤В ╨░╤Г╨┤╨╕╤В╨░): `allowlist` 126, `cityToRegion` 8, `no-saleable` 8, `republic-regex` 1 (╨Э╨░╨▒╨╡╤А╨╡╨╢╨╜╤Л╨╡ ╨з╨╡╨╗╨╜╤Л), `other` 1.
- API ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨░╨╡╤В: ┬л╨а╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░ ╨в╨░╤В╨░╤А╤Б╤В╨░╨╜┬╗ / ┬л╨а╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░ ╨е╨░╨║╨░╤Б╨╕╤П┬╗ **╨╜╨╡╤В** ╨▓ destinations тАФ `isPublicRegionName` ╤Б ╤П╨║╨╛╤А╨╡╨╝ `$` ╨╜╨╡ ╨╝╨░╤В╤З╨╕╤В ┬л╨а╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░ тАж┬╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ю╤В╤З╤С╤В ╨╖╨░╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜ ╨▓ `docs/geo-excluded-cities.md`.
- **╨б╨▓╨╡╤А╤Е ╨░╤Г╨┤╨╕╤В╨░ (╤В╨╛╤В ╨╢╨╡ ╨┤╨╡╨╜╤М):** geo-╨┐╨╛╨╗╨╕╤В╨╕╨║╨░ ╨┐╤А╨╕╨╝╨╡╨╜╨╡╨╜╨░ тАФ ╤Б╨╝. ╨╖╨░╨┐╨╕╤Б╤М ┬лGeo-╨┐╨╛╨╗╨╕╤В╨╕╨║╨░: ╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А╤Л + region buckets + ╨з╨╡╨╗╨╜╤Л┬╗. `cityToRegion` ╨▓ ╤Б╨▓╨╛╨┤╨║╨╡ ╨▒╨╛╨╗╤М╤И╨╡ ╨╜╨╡ ╤В╤А╨░╨║╤В╤Г╨╡╤В╤Б╤П ╨║╨░╨║ ┬л╨┤╤Л╤А╨░┬╗.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ~~`republic-regex`~~ тАФ ╨╕╤Б╨┐╤А╨░╨▓╨╗╨╡╨╜╨╛ ╨▓ ╨╖╨░╨┐╨╕╤Б╨╕ geo-╨┐╨╛╨╗╨╕╤В╨╕╨║╨╕ ╨╜╨╕╨╢╨╡ ╨┐╨╛ ╨┤╨╜╨╡╨▓╨╜╨╕╨║╤Г / ╨▓╤Л╤И╨╡ ╨┐╨╛ ╨▓╤А╨╡╨╝╨╡╨╜╨╕.

---

## 2026-07-19 тАФ ╨Я╤А╨╛╨┤╤Г╨║╤В╨╛╨▓╨░╤П ╤Б╤В╤А╨░╤В╨╡╨│╨╕╤П: ╨╜╨╡ ╤А╨╡╨║╨╗╨░╨╝╨╕╤А╨╛╨▓╨░╤В╤М ┬л╨┐╤Г╤Б╤В╤Л╤И╨║╤Г┬╗

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨д╨╕╨║╤Б╨░╤Ж╨╕╤П ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░: ┬л╨╜╨╡ ╤Е╨╛╤З╤Г ╨┐╨╛╨║╨░ ╤А╨╡╨║╨╗╨░╨╝╨╕╤А╨╛╨▓╨░╤В╤М ╨┐╤Г╤Б╤В╤Л╤И╨║╤Г, ╤Б╨╛╤Б╤А╨╡╨┤╨╛╤В╨╛╤З╤Г╤Б╤М ╨╜╨░ ╤Б╤В╨░╤В╤М╤П╤Е, ╤Е╨░╨▒╨░╤Е, ╤Д╨╕╨╜╨║╨╛╨╜╤В╤Г╤А╨╡┬╗.
- ╨Т╨╕╤В╤А╨╕╨╜╨░ ╨╡╤Й╤С ╨╜╨╡ ╨│╨╛╤В╨╛╨▓╨░ ╨║ ╨┐╨╗╨░╤В╨╜╤Л╨╝ ╨║╨░╨╜╨░╨╗╨░╨╝: ╤Е╨░╨▒╤Л/╨║╨╛╨╜╤В╨╡╨╜╤В ╨╕ ╨▒╨░╨╖╨╛╨▓╤Л╨╣ ╤Д╨╕╨╜╨║╨╛╨╜╤В╤Г╤А (╨Ы╨Ъ ╨┐╨╛╤Б╤В╨░╨▓╤Й╨╕╨║╨╛╨▓) тАФ ╨┐╤А╨╕╨╛╤А╨╕╤В╨╡╤В╨╜╨╡╨╡ ╤А╨╡╨║╨╗╨░╨╝╤Л.
- ╨Ь╨░╤Б╤Б╨╛╨▓╨╛╨╡ ╤А╨░╤Б╤И╨╕╤А╨╡╨╜╨╕╨╡ allowlist ╨│╨╛╤А╨╛╨┤╨╛╨▓ ╨▒╨╡╨╖ ╨│╨╛╤В╨╛╨▓╤Л╤Е city hubs ╤А╨░╨╖╨┤╤Г╨▓╨░╨╡╤В ╨║╨░╤В╨░╨╗╨╛╨│ ╨▒╨╡╨╖ SEO/UX-╤П╨║╨╛╤А╤П.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- **╨а╨╡╨║╨╗╨░╨╝╨░ / paid acquisition тАФ ╨╛╤В╨╗╨╛╨╢╨╡╨╜╨░** ╨┤╨╛ ╨│╨╛╤В╨╛╨▓╨╜╨╛╤Б╤В╨╕ ╨▓╨╕╤В╤А╨╕╨╜╤Л: city hubs + ╨║╨╛╨╜╤В╨╡╨╜╤В (AI/╤Б╤В╨░╤В╤М╨╕) + ╨▒╨░╨╖╨╛╨▓╤Л╨╣ finance contour.
- **╨д╨╛╨║╤Г╤Б ╤Б╨╡╨╣╤З╨░╤Б:** AI/╤Б╤В╨░╤В╤М╨╕, city hubs `/cities/{slug}`, finance contour / ╨Ы╨Ъ ╨┐╨╛╤Б╤В╨░╨▓╤Й╨╕╨║╨╛╨▓.
- **Allowlist ╨│╨╛╤А╨╛╨┤╨╛╨▓:** ╨╜╨╡ ╤А╨░╨╖╨┤╤Г╨▓╨░╤В╤М ╨╝╨░╤Б╤Б╨╛╨▓╨╛ ╨▒╨╡╨╖ ╤Е╨░╨▒╨╛╨▓; ╨╜╨╛╨▓╤Л╨╡ ╨│╨╛╤А╨╛╨┤╨░ тАФ ╤В╨╛╨╗╤М╨║╨╛ ╤Б ╤Е╨░╨▒╨╛╨╝ (╨╕╨╗╨╕ ╨╛╤Б╨╛╨╖╨╜╨░╨╜╨╜╤Л╨╝ ╨╕╤Б╨║╨╗╤О╤З╨╡╨╜╨╕╨╡╨╝).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В тАФ ╨┐╤А╨╛╨┤╤Г╨║╤В╨╛╨▓╤Л╨╣ ╨┐╤А╨╕╨╛╤А╨╕╤В╨╡╤В; execution ╨▓ Tasktracker (P.*).

---

## 2026-07-19 тАФ ╨Ъ╨░╤В╨░╨╗╨╛╨│: ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╡ ╨┐╨╕╨║╤В╨╛╨│╤А╨░╨╝╨╝╤Л ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╣

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ `/events` ╤З╨╕╨┐╤Л ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╣: ┬л╨Т╤Б╨╡┬╗ = тЬи, ┬л╨н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕┬╗ = ЁЯЪМ, ╨╛╤Б╤В╨░╨╗╤М╨╜╤Л╨╡ ╤В╨╛╨┐-╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╕ ╨┐╨░╨┤╨░╨╗╨╕ ╨▓ fallback ЁЯОл.
- ╨Ь╨░╨┐╨┐╨╕╨╜╨│ ╨▓ `apps/web/src/lib/catalog-view-mode.ts` ╨┐╨╛╨║╤А╤Л╨▓╨░╨╗ ╤В╨╛╨╗╤М╨║╨╛ ╨н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕/╨а╨╡╤З╨╜╤Л╨╡/╨Ъ╨╛╨╜╤Ж╨╡╤А╤В╤Л/╨Ф╨╡╤В╤П╨╝; ╨╜╨╡ ╨▒╤Л╨╗╨╛ ┬л╨Ь╤Г╨╖╨╡╨╕ ╨╕ ╨░╤А╤В┬╗, ┬л╨а╨░╨╖╨▓╨╗╨╡╤З╨╡╨╜╨╕╤П┬╗, ┬л╨Ь╨╡╤А╨╛╨┐╤А╨╕╤П╤В╨╕╤П┬╗, ┬л╨Р╨║╤В╨╕╨▓╨╜╤Л╨╣ ╨╛╤В╨┤╤Л╤Е┬╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨а╨░╤Б╤И╨╕╤А╨╡╨╜ `CATEGORY_EMOJI`: ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╣ emoji ╨╜╨░ ╨║╨░╨╢╨┤╤Г╤О ╤В╨╛╨┐-╨║╨░╤В╨╡╨│╨╛╤А╨╕╤О; ╨╜╨╡╨╕╨╖╨▓╨╡╤Б╤В╨╜╤Л╨╡ тЖТ тЬи (╨╜╨╡ ticket).
- ╨Я╨░╤А╨╕╤В╨╡╤В ╨▓ legacy `apps/public` CatalogPage.
- ╨а╨╡╨╜╨┤╨╡╤А ╤З╨╕╨┐╨╛╨▓: `CatalogToolbar.client.tsx` тЖТ `categoryEmoji(item.name)`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В тАФ ╨▒╨░╨│ ╨╝╨░╨┐╨┐╨╕╨╜╨│╨░, ╨╜╨╡ ╤А╨╡╨╜╨┤╨╡╤А╨░.

---

## 2026-07-19 тАФ CI: pnpm missing before setup-node cache

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Job `validate-build-test` ╨┐╨░╨┤╨░╨╗ ╨╖╨░ ~14тАУ19╤Б ╨╜╨░ `feat/next-monorepo` ╨╕ PR #1 (╤В╨╛╤В ╨╢╨╡ branch, title hero-stats).
- ╨Ю╤И╨╕╨▒╨║╨░: `Unable to locate executable file: pnpm` ╨╜╨░ ╤И╨░╨│╨╡ `actions/setup-node@v4` ╤Б `cache: pnpm`.
- ╨Я╨╛╤Б╨╗╨╡ ╤Д╨╕╨║╤Б╨░ ╨┐╨╛╤А╤П╨┤╨║╨░: `backend:typecheck` тАФ `exactOptionalPropertyTypes` / `noUncheckedIndexedAccess` (╨▓╨║╨╗╤О╤З╨╡╨╜╤Л ╨▓ e9d72f1, ╤А╨░╨╜╤М╤И╨╡ CI ╨╜╨╡ ╨┤╨╛╤Е╨╛╨┤╨╕╨╗).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Т `.github/workflows/ci.yml` ╨┐╨╛╤Б╤В╨░╨▓╨╕╤В╤М `pnpm/action-setup@v4` **╨┤╨╛** `setup-node` (cache ╤В╤А╨╡╨▒╤Г╨╡╤В pnpm ╨▓ PATH).
- Widen optional types (`| undefined`) + guards ╨┤╨╗╤П indexed access ╨▓ reviews/auth/catalog/image-url.
- ╨Ю╤В╨┤╨╡╨╗╤М╨╜╨╛╨╣ ╨▓╨╡╤В╨║╨╕ hero-stats ╨╜╨╡╤В: PR #1 = `feat/next-monorepo`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╤Б╨╗╨╡ typecheck: `web:build` prerender `/` тЖТ Prisma `Can't reach database server at 127.0.0.1:5437` (hero stats / `getHomePageData` ╨▒╨╡╨╖ catch).
- Fallback: `getHomePageData` тЖТ empty payloads ╨┐╤А╨╕ ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╜╨╛╨╣ ╨С╨Ф (╨║╨░╨║ SiteLayout).

---

## 2026-07-19 тАФ TC on-demand sync `--ids`

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Full `tc:sync` ╤В╤П╨╢╤С╨╗╤Л╨╣; ╨┤╨╗╤П ╤В╨╛╤З╨╡╤З╨╜╨╛╨│╨╛ ╨┤╨╛╨▒╨░╨▓╨╗╨╡╨╜╨╕╤П/╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╨╕╤П ╤Б╨╛╨▒╤Л╤В╨╕╨╣ ╨╜╤Г╨╢╨╡╨╜ ╨┐╤Г╤В╤М ╨┐╨╛ ╤Б╨┐╨╕╤Б╨║╤Г Ticketscloud ids.
- ╨Т proto ╤Г╨╢╨╡ ╨╡╤Б╤В╤М `EventsRequest.ids`; upsert pipeline (`importCatalogEvent`) ╤Г╨╢╨╡ ╨│╨╛╤В╨╛╨▓.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `npm run tc:sync` тЖТ `scripts/tc-sync.js`: ╨▒╨╡╨╖ ╤Д╨╗╨░╨│╨╛╨▓ = full fetch+import+revalidate; ╤Б `--ids=...` = gRPC by ids тЖТ normalize тЖТ ╤В╨╛╤В ╨╢╨╡ upsert (╨╜╨╡ insert-only).
- `--dry-run` ╤Б `--ids`: ╤В╨╛╨╗╤М╨║╨╛ fetch+normalize, ╨▒╨╡╨╖ ╨С╨Ф.
- Shared `scripts/lib/tc-catalog-fetch.js`; `importCatalogEvents(..., { skipMissingFromCatalog: true })` ╨┤╨╗╤П ids-╤А╨╡╨╢╨╕╨╝╨░.
- Admin: `POST /api/v1/tc/sync?ids=a,b&dry-run=1`.
- Prod smoke: dry-run + upsert `6a5a15629c0d02f149eb31b7`, `6a4b7eb321d4fca102f90689` тЖТ +2 EventSourceLink (30637тЖТ30639).
- **Prod @6cc137d:** `git pull` + `daibilet-api` restart; `npm run tc:sync -- --help` OK.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Ids-╤А╨╡╨╢╨╕╨╝ ╨┐╨╛╤Б╨╗╨╡ upsert ╨▓╤Б╤С ╨╡╤Й╤С ╨│╨╛╨╜╤П╨╡╤В ╨┐╨╛╨╗╨╜╤Л╨╣ `ProviderLink` resync ╨┐╨╛ source (~6s) тАФ ╨┐╤А╨╕╨╡╨╝╨╗╨╡╨╝╨╛; scoped sync ╨╝╨╛╨╢╨╜╨╛ ╨╛╤В╨╗╨╛╨╢╨╕╤В╤М.
- ╨Э╨╡ ╨╖╨░╨╝╨╡╨╜╨░ nightly/full sync: ╤Ж╨╡╨╜╤Л/╨┤╨░╤В╤Л ╨╛╤Б╤В╨░╨╗╤М╨╜╤Л╤Е ╤Б╨╛╨▒╤Л╤В╨╕╨╣ ╨╜╨╡ ╨╛╨▒╨╜╨╛╨▓╨╗╤П╤О╤В╤Б╤П.

---

## 2026-07-19 тАФ Anti-flash ╨║╨░╤В╨░╨╗╨╛╨│╨░: ╨╜╨╡ ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╤В╤М SSR ┬л╨▓╤Б╨╡ ╨│╨╛╤А╨╛╨┤╨░┬╗

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т `361dc4c` ╤Г╨╢╨╡ ╨▒╤Л╨╗╨╕ venues/locations + `cityReady`, ╨╜╨╛ ╨╜╨░ `/events` ╨▒╨╡╨╖ `?city=` ╨╛╤Б╤В╨░╨▓╨░╨╗╤Б╤П flash ╨║╨╛╨╜╤В╨╡╨╜╤В╨░: ╨┐╨╛╤Б╨╗╨╡ resolve storage ╨╜╨░ ╨╛╨┤╨╕╨╜ ╨║╨░╨┤╤А ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╗╤Б╤П SSR-╨║╨░╤В╨░╨╗╨╛╨│ ┬л╨▓╤Б╨╡ ╨│╨╛╤А╨╛╨┤╨░┬╗ (toolbar ╤Г╨╢╨╡ ╤Б ╨г╤Д╨╛╨╣), ╨╖╨░╤В╨╡╨╝ client fetch.
- ╨Я╤А╨╕╤З╨╕╨╜╨░: `useState(initialCatalog)` + `loading=false` ╨┐╤А╨╕ ╨╜╨░╨╗╨╕╤З╨╕╨╕ SSR payload; `cityBootstrapPending` ╤Б╨╜╨╕╨╝╨░╨╗╤Б╤П ╨┤╨╛ ╨╖╨░╨▓╨╡╤А╤И╨╡╨╜╨╕╤П fetch ╤Б effective city.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `CatalogShell`: SSR catalog ╨┤╨╛╨▓╨╡╤А╤П╨╡╨╝ ╤В╨╛╨╗╤М╨║╨╛ ╨╡╤Б╨╗╨╕ URL ╤Г╨╢╨╡ ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В `city`; ╨╕╨╜╨░╤З╨╡ ╤Б╤В╨░╤А╤В ╤Б `catalog=null` / skeleton тЖТ fetch ╤Б ╨│╨╛╤А╨╛╨┤╨╛╨╝ ╨╕╨╖ ╤И╨░╨┐╨║╨╕ (`effectiveQueryKey`).
- Deep-link ╤Б ╤П╨▓╨╜╤Л╨╝ `city=` ╨╕ ╤Б╨▒╤А╨╛╤Б `persistSelectedCity('all')` ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣.
- Venues/Locations ╤Г╨╢╨╡ ╤Д╨╕╨╗╤М╤В╤А╤Г╤О╤В client-side ╨┐╨╛ effective city тАФ ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ SSR-flash ╨╜╨╡ ╨╖╨░╤В╤А╨░╨│╨╕╨▓╨░╨╡╤В.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╤А╤П╨╝╨╛╨╣ ╨╖╨░╤Е╨╛╨┤ ╨╜╨░ `/events` ╨▒╨╡╨╖ city: ╨║╤А╨░╤В╨║╨╕╨╣ skeleton ╨▓╨╝╨╡╤Б╤В╨╛ ┬л╨Т╤Б╨╡ ╨│╨╛╤А╨╛╨┤╨░┬╗ (╨╛╨╢╨╕╨┤╨░╨╡╨╝╨╛ ╨▒╨╡╨╖ cookie-SSR).
- **Prod @4c09cdb:** `deploy-prod-next` OK; `/events`, `/venues`, `/locations` 200. (╨Ъ╨╛╨╝╨╝╨╕╤В ╤Б╨╝╨╡╤И╨░╨╜ ╤Б CI pnpm-fix тАФ anti-flash ╨▓ ╤В╨╛╨╝ ╨╢╨╡ SHA.)

---

## 2026-07-19 тАФ UX: ╨│╨╛╤А╨╛╨┤ ╤И╨░╨┐╨║╨╕ тЖТ venues/locations + anti-flash `/events`

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ `4772789` ╨│╨╛╤А╨╛╨┤ ╤И╨░╨┐╨║╨╕ ╨┐╨╛╨┐╨░╨┤╨░╨╗ ╨▓ `/events`, ╨╜╨╛ ╤Д╨╕╨╗╤М╤В╤А ╨╜╨░ `/venues` ╨╕ `/locations` ╨╛╤Б╤В╨░╨▓╨░╨╗╤Б╤П ╨╗╨╛╨║╨░╨╗╤М╨╜╤Л╨╝ `useState('all')` ╨╕ ╨╕╨│╨╜╨╛╤А╨╕╤А╨╛╨▓╨░╨╗ ╤И╨░╨┐╨║╤Г.
- ╨Э╨░ `/events` ╨▒╤Л╨╗ flash: ╨┐╨╡╤А╨▓╤Л╨╣ ╨║╨░╨┤╤А ┬л╨Т╤Б╨╡ ╨│╨╛╤А╨╛╨┤╨░┬╗, ╨╖╨░╤В╨╡╨╝ `router.replace` ╤Б ╨│╨╛╤А╨╛╨┤╨╛╨╝ ╨╕╨╖ `localStorage` тАФ ╨┐╨╛╤В╨╛╨╝╤Г ╤З╤В╨╛ inject ╤И╤С╨╗ ╨▓ `useEffect` ╨┐╨╛╤Б╨╗╨╡ paint, ╨░ ╤В╤Г╨╗╨▒╨░╤А ╤З╨╕╤В╨░╨╗ ╤В╨╛╨╗╤М╨║╨╛ URL.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ю╨▒╤Й╨╕╨╣ ╨║╨╛╨╜╤В╤Г╤А `CITY_FILTER_PATHS` (`/events`, `/venues`, `/locations`): inject `city=` ╨╕╨╖ storage, nav-╤Б╤Б╤Л╨╗╨║╨╕ ╤Б ╨│╨╛╤А╨╛╨┤╨╛╨╝, ╤Б╨╝╨╡╨╜╨░ ╨▓ ╤И╨░╨┐╨║╨╡ ╨╛╨▒╨╜╨╛╨▓╨╗╤П╨╡╤В query ╤В╨╡╨║╤Г╤Й╨╡╨╣ ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Л; ╤Б╨▒╤А╨╛╤Б тЖТ `persistSelectedCity('all')`.
- Anti-flash: `cityReady` + placeholder ┬л╨У╨╛╤А╨╛╨┤тАж┬╗ ╨┤╨╛ resolve; `useLayoutEffect` ╨┤╨╗╤П sync/replace; `CatalogShell` ╨┐╨╛╨┤╤Б╤В╨░╨▓╨╗╤П╨╡╤В effective city ╨┤╨╛ ╨┐╨╛╤П╨▓╨╗╨╡╨╜╨╕╤П ╨▓ URL.
- Venues/Locations: ╤Д╨╕╨╗╤М╤В╤А ╨│╨╛╤А╨╛╨┤╨░ ╤З╨╡╤А╨╡╨╖ URL `?city=` + storage, ╨║╨░╨║ ╨║╨░╤В╨░╨╗╨╛╨│.
- ╨Ъ╨╛╨┤ venues/locations+cityReady ╤Б╨╗╤Г╤З╨░╨╣╨╜╨╛ ╤Г╨╡╤Е╨░╨╗ ╨▓ `361dc4c` (docs tc:sync); ╨┤╨╛╨╢╨╕╨╝ anti-flash SSR ╨▓ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨╝ fix-commit.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╨╗╨╜╤Л╨╣ SSR ╨▒╨╡╨╖ cookie ╨▓╤Б╤С ╨╡╤Й╤С ╨╜╨╡ ╨╖╨╜╨░╨╡╤В ╨│╨╛╤А╨╛╨┤ ╨┤╨╛ hydrate тАФ ╨┐╨╛╤Н╤В╨╛╨╝╤Г pending-placeholder, ╨░ ╨╜╨╡ ┬л╨Т╤Б╨╡ ╨│╨╛╤А╨╛╨┤╨░┬╗.
- Deploy: `deploy-prod-next` ╨┐╨╛╤Б╨╗╨╡ commit.

---

## 2026-07-19 тАФ UX: ╨│╨╛╤А╨╛╨┤ ╤И╨░╨┐╨║╨╕ тЖТ ╤Д╨╕╨╗╤М╤В╤А ╨║╨░╤В╨░╨╗╨╛╨│╨░ `/events`

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М: ╨▓ ╤И╨░╨┐╨║╨╡ ╨▓╤Л╨▒╤А╨░╨╜ ╨│╨╛╤А╨╛╨┤ (╨╜╨░╨┐╤А. ╨г╤Д╨░), ╨┐╨╡╤А╨╡╤Е╨╛╨┤ ╨▓ ┬л╨б╨╛╨▒╤Л╤В╨╕╤П┬╗/`/events` ╨╛╤В╨║╤А╤Л╨▓╨░╨╗ ╨║╨░╤В╨░╨╗╨╛╨│ ╨▒╨╡╨╖ `city=` тАФ ╤Д╨╕╨╗╤М╤В╤А ╨│╨╛╤А╨╛╨┤╨░ ╨┐╤А╨╕╤Е╨╛╨┤╨╕╨╗╨╛╤Б╤М ╨▓╤Л╨▒╨╕╤А╨░╤В╤М ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛.
- ╨У╨╛╤А╨╛╨┤ ╤И╨░╨┐╨║╨╕ ╤Г╨╢╨╡ ╨╢╨╕╨╗ ╨▓ `localStorage` (`daibilet:selected-city`) ╤З╨╡╤А╨╡╨╖ `SelectedCityProvider`, ╨░ ╨║╨░╤В╨░╨╗╨╛╨│ ╤З╨╕╤В╨░╨╗ ╤В╨╛╨╗╤М╨║╨╛ URL `?city=`.
- ╨б╨╝╨╡╨╜╨░ ╨│╨╛╤А╨╛╨┤╨░ ╨▓ ╤И╨░╨┐╨║╨╡ ╨╜╨░ `/events` ╤Г╨╢╨╡ ╨╛╨▒╨╜╨╛╨▓╨╗╤П╨╗╨░ query тАФ ╨╗╨╛╨╝╨░╨╗╨░╤Б╤М ╨╕╨╝╨╡╨╜╨╜╨╛ ╨╜╨░╨▓╨╕╨│╨░╤Ж╨╕╤П ╨▒╨╡╨╖ ╤П╨▓╨╜╨╛╨│╨╛ `city`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Э╨░ `/events` ╨▒╨╡╨╖ `city=` тАФ `router.replace` ╤Б ╨│╨╛╤А╨╛╨┤╨╛╨╝ ╨╕╨╖ storage (`mergeStoredCityIntoEventsParams`); deep-link ╤Б ╨┤╤А╤Г╨│╨╕╨╝ `city=` ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╨╝ ╨╕ ╤Б╨╕╨╜╤Е╤А╨╛╨╜╨╕╨╖╨╕╤А╤Г╨╡╨╝ ╨▓ storage.
- ╨б╤Б╤Л╨╗╨║╨╕ ┬л╨б╨╛╨▒╤Л╤В╨╕╤П┬╗, hero-chips `/eventsтАж`, ╨┐╨╛╨╕╤Б╨║ ╤И╨░╨┐╨║╨╕, ╨╕╨╖╨▒╤А╨░╨╜╨╜╨╛╨╡ тАФ `catalogHrefWithSelectedCity`.
- ╨б╨▒╤А╨╛╤Б ╨│╨╛╤А╨╛╨┤╨░ ╨▓ ╤В╤Г╨╗╨▒╨░╤А╨╡/╤З╨╕╨┐╨╡ тЖТ `persistSelectedCity('all')`, ╤З╤В╨╛╨▒╤Л auto-inject ╨╜╨╡ ╨▓╨╡╤А╨╜╤Г╨╗ ╨│╨╛╤А╨╛╨┤.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Ъ╨╛╤А╨╛╤В╨║╨╕╨╣ double-fetch ╨▓╨╛╨╖╨╝╨╛╨╢╨╡╨╜ ╨┐╤А╨╕ ╨┐╤А╤П╨╝╨╛╨╝ ╨╖╨░╤Е╨╛╨┤╨╡ ╨╜╨░ `/events` ╨▒╨╡╨╖ city (╤Б╨╜╨░╤З╨░╨╗╨░ ╨▒╨╡╨╖ ╤Д╨╕╨╗╤М╤В╤А╨░, ╨╖╨░╤В╨╡╨╝ replace) тАФ ╨┐╤А╨╕╨╡╨╝╨╗╨╡╨╝╨╛; nav-╤Б╤Б╤Л╨╗╨║╨╕ ╤Б╤А╨░╨╖╤Г ╤Б city.
- **Prod @4772789:** `deploy-prod-next` OK, `/events` 200, revalidate tags home/catalog.

---

## 2026-07-19 тАФ Event page: TZ ╤А╨╡╨│╨╕╨╛╨╜╨░ ╤Б╨╛╨▒╤Л╤В╨╕╤П (= ╨▓╨╕╨┤╨╢╨╡╤В)


### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ъ╨░╤А╤В╨╛╤З╨║╨░ ╨г╤Д╨░ (`тАжlesha-kotoryi-ustroilsyaтАж`): hero/╤Б╨╡╨░╨╜╤Б ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╗╨╕ **16:00** ╨┐╤А╨╕ `startsAt=2026-08-02T13:00:00.000Z` тАФ ╤Н╤В╨╛ **Europe/Moscow**, ╨╜╨╡ ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛╨╡ ╨г╤Д╤Л.
- ╨Ъ╨░╤В╨░╨╗╨╛╨│/related ╤Г╨╢╨╡ ╤Д╨╛╤А╨╝╨░╤В╨╕╤А╨╛╨▓╨░╨╗╨╕ ╤З╨╡╤А╨╡╨╖ `resolveCityTimeZone` тЖТ `Asia/Yekaterinburg` тЖТ **18:00**; event page (`public-event.dto.ts` `mapSession`) ╨▓╤Л╨╖╤Л╨▓╨░╨╗ `formatDate/formatTime` **╨▒╨╡╨╖** TZ тЖТ default `SITE_TIME_ZONE=Europe/Moscow`.
- JSON-LD `startDate` ╨╛╤Б╤В╨░╨▓╨░╨╗╤Б╤П ISO UTC (╨║╨╛╤А╤А╨╡╨║╤В╨╜╨╛ ╨║╨░╨║ ╨░╨▒╤Б╨╛╨╗╤О╤В╨╜╤Л╨╣ instant).
- ╨Ы╨Ъ ┬л╨б╨╡╨░╨╜╤Б: Europe/Moscow┬╗ (`BuyerOrderCard`) тАФ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨╡ ╨┐╤А╨░╨▓╨╕╨╗╨╛ ╨╖╨░╨║╨░╨╖╨╛╨▓, ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ш╤Б╤В╨╛╤З╨╜╨╕╨║ TZ: `resolveCityTimeZone(city, destination)` ╨╕╨╖ `city-timezone` (╨╛╨▓╨╡╤А╤А╨░╨╣╨┤╤Л ╨│╨╛╤А╨╛╨┤╨╛╨▓ + ╤А╨╡╨│╨╕╨╛╨╜╤Л), ╨╜╨╡ browser TZ ╨╕ ╨╜╨╡ forced MSK.
- `mapSession` + `event.timeZone`; hydrate catalog slots ╨╕ TS mapper ╤В╨╛╨╢╨╡ ╤Б city TZ; TcWidget fallback `toLocale*` ╤Г╨▓╨░╨╢╨░╨╡╤В `session.timeZone`.
- Unit: `city-timezone-display.test.ts` (╨г╤Д╨░тЖТ18:00 YEKT vs 16:00 MSK).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- In-memory `PUBLIC_EVENT_CACHE_MS` (5 ╨╝╨╕╨╜) тАФ ╨┐╨╛╤Б╨╗╨╡ deploy API ╨╜╤Г╨╢╨╡╨╜ restart (╨╕╨╗╨╕ ╨┤╨╛╨╢╨┤╨░╤В╤М╤Б╤П TTL).
- Proof: slug ╨▓╤Л╤И╨╡ тАФ `timeLabel=18:00`, `timeZone=Asia/Yekaterinburg`, hero ┬л╨С╨╗╨╕╨╢╨░╨╣╤И╨╕╨╣: тАж 18:00┬╗.
- **Proof prod @9f1f744:** API + HTML тАФ `Asia/Yekaterinburg` / `18:00` (╨▒╤Л╨╗╨╛ MSK `16:00`); JSON-LD `startDate` ╨╛╤Б╤В╨░╤С╤В╤Б╤П `2026-08-02T13:00:00.000Z`.

---

## 2026-07-19 тАФ URL: flat paths, SEO ╤З╨╡╤А╨╡╨╖ city hubs

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ю╨▒╤Б╤Г╨╢╨┤╨░╨╗╤Б╤П city-prefix ╨▓ path (`/{city}/venues/...` ╨╕ ╨░╨╜╨░╨╗╨╛╨│╨╕). ╨г╤Б╤В╨╜╨░╤П ╤Д╨╛╤А╨╝╤Г╨╗╨╕╤А╨╛╨▓╨║╨░ ┬л╤А╨░╨╖╨▓╨╕╨▓╨░╤В╤М ╨┐╨░╨▒╤Л┬╗ ╨▓ ╨║╨╛╨╜╤В╨╡╨║╤Б╤В╨╡ city URL = **╤Е╨░╨▒╤Л** (city hubs), ╨╜╨╡ ╨▒╨░╤А╤Л.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- **URL ╨╛╤Б╤В╨░╤О╤В╤Б╤П flat:** `/events/{slug}`, `/venues/{slug}`, `/cities/{slug}`. City-prefix ╨▓ path **╨╜╨╡** ╨▓╨▓╨╛╨┤╨╕╨╝.
- SEO-╤Д╨╛╨║╤Г╤Б: ╤А╨░╨╖╨▓╨╕╤В╨╕╨╡ ╨│╨╛╤А╨╛╨┤╤Б╨║╨╕╤Е ╤Е╨░╨▒╨╛╨▓ `/cities/{slug}` + landings; breadcrumbs/JSON-LD ╤Б ╨│╨╛╤А╨╛╨┤╨╛╨╝; sitemap/canonical (╨║╨░╨║ ╨╡╤Б╤В╤М / ╨┤╨╛╤А╨░╤Й╨╕╨▓╨░╤В╤М).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В: ╤Б╤Е╨╡╨╝╨░ path ╨╜╨╡ ╨╝╨╡╨╜╤П╨╡╤В╤Б╤П тЖТ ╨▒╨╡╨╖ ╨╝╨╕╨│╤А╨░╤Ж╨╕╨╕ URL/╤А╨╡╨┤╨╕╤А╨╡╨║╤В╨╛╨▓.

---

## 2026-07-19 тАФ Event page: ╨┤╤Г╨▒╨╗╨╕ ╤З╨╕╨┐╨╛╨▓ ╨▓ ┬л╨в╨╡╨│╨╕┬╗

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ event page ╤Б╨╡╨║╤Ж╨╕╤П ┬л╨в╨╡╨│╨╕┬╗ ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╗╨░ `╨а╨╛╨║, ╨и╨╛╤Г - ╨┐╤А╨╛╨│╤А╨░╨╝╨╝╨░, ╨а╨╛╨║, ╨и╨╛╤Г - ╨┐╤А╨╛╨│╤А╨░╨╝╨╝╨░` (╨┐╤А╨╕╨╝╨╡╤А: `tc-6969ae12140cc49e8ef266e3-neveroyatnyi-koncert-gruppy-kino`).
- `/api/public/events/{slug}` ╨╛╤В╨┤╨░╤С╤В ╨╛╨┤╨╕╨╜╨░╨║╨╛╨▓╤Л╨╡ labels ╨╕ ╨▓ `event.tags`, ╨╕ ╨▓ `event.subcategories` (backend `pickCatalogSubcategories` ╨▒╨╡╤А╤С╤В labels ╨╕╨╖ tags, ╨║╨╛╨│╨┤╨░ subcategory-╤Б╨╗╨╛╤П ╨╜╨╡╤В ╨╕╨╗╨╕ ╨╛╨╜ ╤Б╨╛╨▓╨┐╨░╨┤╨░╨╡╤В).
- UI `EventTags` ╨┤╨╡╨╗╨░╨╗ `[...tags, ...subcategories]` ╨▒╨╡╨╖ dedupe тЖТ ╨▓╨╕╨╖╤Г╨░╨╗╤М╨╜╤Л╨╡ ╨┤╤Г╨▒╨╗╨╕; React `key={tag}` ╤В╨╛╨╢╨╡ ╨║╨╛╨╜╤Д╨╗╨╕╨║╤В╨╛╨▓╨░╨╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `uniqueEventTagLabels`: unique ╨┐╨╛ `trim` + `toLocaleLowerCase('ru')`, ╨┐╨╛╤А╤П╨┤╨╛╨║ ╨┐╨╡╤А╨▓╨╛╨│╨╛ ╨▓╤Е╨╛╨╢╨┤╨╡╨╜╨╕╤П, limit 12.
- `EventTags` ╨╝╨╡╤А╨╢╨╕╤В ╨╛╨▒╨░ ╨╝╨░╤Б╤Б╨╕╨▓╨░ ╤З╨╡╤А╨╡╨╖ ╤Н╤В╨╛╤В ╤Е╨╡╨╗╨┐╨╡╤А.
- Unit-╤В╨╡╤Б╤В ╨╜╨░ ╨║╨╡╨╣╤Б ╨а╨╛╨║ / ╨и╨╛╤Г - ╨┐╤А╨╛╨│╤А╨░╨╝╨╝╨░.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy Next (web-only); API ╨╝╨╡╨╜╤П╤В╤М ╨╜╨╡ ╤В╤А╨╡╨▒╤Г╨╡╤В╤Б╤П тАФ payload ╨║╨╛╤А╤А╨╡╨║╤В╨╡╨╜, ╨▒╨░╨│ ╨╜╨░ merge ╨▓ UI.
- **Proof prod @9658b9f:** HTML `/events/tc-6969ae12140cc49e8ef266e3-neveroyatnyi-koncert-gruppy-kino` тАФ ╨▓ ╤Б╨╡╨║╤Ж╨╕╨╕ ┬л╨в╨╡╨│╨╕┬╗ ╤А╨╛╨▓╨╜╨╛ 2 `span.rounded-full` (╨а╨╛╨║, ╨и╨╛╤Г - ╨┐╤А╨╛╨│╤А╨░╨╝╨╝╨░), ╨▒╨╡╨╖ ╨┐╨╛╨▓╤В╨╛╤А╨╛╨▓.

---

## 2026-07-19 тАФ Prod crash: cleanDisplayText is not defined

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ъ╨╗╨╕╨╡╨╜╤В╤Б╨║╨╕╨╣ `ReferenceError: cleanDisplayText is not defined` ╨▓ chunk `7198-*.js` ╨╜╨░ event pages (╨╕ SSR digest ╨▓ journal `daibilet-web`).
- ╨б╨╕╨╝╨┐╤В╨╛╨╝ ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗ ╨║╨░╨║ ChunkLoadError/502 ╨╜╨░ ╤Б╤В╨░╤В╨╕╨║╨╡ ╨┐╤А╨╕ ╤А╨╡╤Б╤В╨░╤А╤В╨░╤Е Next (OOM / mid-deploy), ╨╜╨╛ ╨║╨╛╤А╨╜╨╡╨▓╨╛╨╣ runtime-╨▒╨░╨│ тАФ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╨╕╨╡ ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛╨│╨╛ ╨▒╨╕╨╜╨┤╨╕╨╜╨│╨░ ╤Д╤Г╨╜╨║╤Ж╨╕╨╕.
- ╨Т `event-page-utils.ts` ╨▒╤Л╨╗ ╤В╨╛╨╗╤М╨║╨╛ `export { cleanDisplayText, тАж } from './event-description-format'` тАФ re-export **╨╜╨╡** ╤Б╨╛╨╖╨┤╨░╤С╤В ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛╨╡ ╨╕╨╝╤П; ╨▓╤Л╨╖╨╛╨▓╤Л `cleanDisplayText(...)` ╨▓╨╜╤Г╤В╤А╨╕ ╤В╨╛╨│╨╛ ╨╢╨╡ ╨╝╨╛╨┤╤Г╨╗╤П ╨┐╨░╨┤╨░╨╗╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ч╨░╨╝╨╡╨╜╤С╨╜ bare re-export ╨╜╨░ `import { cleanDisplayText, тАж } from './event-description-format'` + ╤П╨▓╨╜╤Л╨╣ `export { тАж }`.
- Commit + deploy-prod-next; smoke `/events` ╨╕ event slug ╨┐╨╛╤Б╨╗╨╡ hard refresh.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- MemoryHigh Next (~1.1G) ╨╜╨░ 3.8Gi ╤Е╨╛╤Б╤В╨╡: ╨┐╤А╨╕ ╨┤╨╡╨┐╨╗╨╛╨╡/╨╜╨░╨│╤А╤Г╨╖╨║╨╡ ╨▓╨╛╨╖╨╝╨╛╨╢╨╜╤Л ╨║╤А╨░╤В╨║╨╕╨╡ 502 ╨╜╨░ `/_next/static` ╨┐╨╛╨║╨░ ╤Б╤В╨░╤В╨╕╨║╨░ ╨┐╤А╨╛╨║╤Б╨╕╤А╤Г╨╡╤В╤Б╤П ╤З╨╡╤А╨╡╨╖ Node. ╨Ю╤В╨┤╨╡╨╗╤М╨╜╨╛ ╤А╨░╤Б╤Б╨╝╨╛╤В╤А╨╡╤В╤М `alias` ╨╜╨░ `.next/static` ╨▓ nginx.

---

## 2026-07-19 тАФ ╨Ы╨Ъ ╨╖╨░╨║╨░╨╖╨╛╨▓: 404 / ╨▓╤А╨╡╨╝╤П / truncate

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨б╤Б╤Л╨╗╨║╨░ ╨╕╨╖ ╨╖╨░╨║╨░╨╖╨░ ╨╜╨░ past dated TC slug (`тАж-14-iyulya-21-30`) ╨┤╨░╨▓╨░╨╗╨░ 404/╨┐╤Г╤Б╤В╤Г╤О ╨║╨░╤А╤В╨╛╤З╨║╤Г тЖТ ┬л╨Ю╤Б╤В╨░╨▓╨╕╤В╤М ╨╛╤В╨╖╤Л╨▓┬╗ ╨▒╨╡╤Б╨┐╨╛╨╗╨╡╨╖╨╡╨╜ (resolve ╨╛╤В╨╖╤Л╨▓╨╛╨▓ ╨▒╤Л╨╗ ╤В╨╛╨╗╤М╨║╨╛ ╨┐╨╛ ╤В╨╛╤З╨╜╨╛╨╝╤Г `slug`).
- ╨Т ╤Б╤В╤А╨╛╨║╨╡ ╨▒╨╕╨╗╨╡╤В╨░ ╨┤╨▓╨╡ ┬л╨│╨╛╨╗╤Л╨╡┬╗ ╨┤╨░╤В╤Л/╨▓╤А╨╡╨╝╨╡╨╜╨╕ ╨▒╨╡╨╖ ╨┐╨╛╨┤╨┐╨╕╤Б╨╡╨╣; `formatDateTime` ╨▒╨╡╨╖ `Europe/Moscow`.
- ╨С╨╗╨╛╨║ ╨┐╨╛╨║╤Г╨┐╨░╤В╨╡╨╗╤П: `max-w-[170px] truncate` ╨╛╨▒╤А╨╡╨╖╨░╨╗ ┬л╨Ф╨░╤В╨░ ╨┐╨╛╨║╤Г╨┐╨║╨╕┬╗ ╨╜╨░ desktop.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `buyer-order-event-links.js`: ╨┤╨╗╤П account/public orders ╤А╨╡╨╖╨╛╨╗╨▓ `eventUrl` тЖТ meta-sibling / merge ╤Б ╨▒╨╗╨╕╨╢╨░╨╣╤И╨╕╨╝ ╨▒╤Г╨┤╤Г╤Й╨╕╨╝ ╤Б╨╡╨░╨╜╤Б╨╛╨╝; `eventId` ╨┐╨╛╨║╤Г╨┐╨║╨╕ ╤Б╨╛╤Е╤А╨░╨╜╤П╨╡╨╝ ╨┤╨╗╤П verification.
- Soft-404 ╨▓ `loadPublicEventDto`: unsaleable slug тЖТ ╨╛╨┤╨╜╨╛╤А╨░╨╖╨╛╨▓╤Л╨╣ hop ╨╜╨░ sibling ╤Б future session.
- Reviews: `resolveReviewEvent` ╨┐╨╛ id / `tc-{24hex}-*` / slug; `/reviews/write` ╤А╨░╨▒╨╛╤В╨░╨╡╤В ╨┐╨╛ `eventId`+`orderRef` ╨┤╨░╨╢╨╡ ╨▒╨╡╨╖ ╨┐╤Г╨▒╨╗╨╕╤З╨╜╨╛╨╣ ╨║╨░╤А╤В╨╛╤З╨║╨╕ (`forceFormOpen`).
- UI: ┬л╨б╨╡╨░╨╜╤Б: тАж┬╗ (MSK), ┬л╨Ф╨░╤В╨░ ╨┐╨╛╨║╤Г╨┐╨║╨╕┬╗ ╨▒╨╡╨╖ truncate, ╤И╨╕╤А╨╡ ╨║╨╛╨╗╨╛╨╜╨║╨░ buyer.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Deploy Next + API ╨┐╨╛╤Б╨╗╨╡ commit.

---

## 2026-07-19 тАФ Event description: ╨╝╨░╤А╨║╨╡╤А╤Л тЖТ ╤Б╨┐╨╕╤Б╨║╨╕

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ event page plain-text description ╤Б `тЬЕ` / `- ` ╤Б╤Е╨╗╨╛╨┐╤Л╨▓╨░╨╗╤Б╤П ╨▓ ╨╛╨┤╨╜╤Г ╨┐╤А╨╛╤Б╤В╤Л╨╜╤О: `cleanDisplayText` ╨╖╨░╨╝╨╡╨╜╤П╨╗ `\n` ╨╜╨░ ╨┐╤А╨╛╨▒╨╡╨╗╤Л ╨▓╨╜╤Г╤В╤А╨╕ blank-line ╨▒╨╗╨╛╨║╨╛╨▓.
- ╨н╤В╨░╨╗╨╛╨╜: `tc-699c7af75b4672904c313d52-seks-v-sssr-intimnye-tainy-stolicy-18` тАФ checkmark-╨┐╤Г╨╜╨║╤В╤Л ╨╕ ╨▒╨╗╨╛╨║ ┬л╨Ю╤А╨│╨░╨╜╨╕╨╖╨░╤Ж╨╕╨╛╨╜╨╜╤Л╨╡ ╨┤╨╡╤В╨░╨╗╨╕:┬╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ь╨╛╨┤╤Г╨╗╤М `event-description-format.ts`: ╨┤╨╡╤В╨╡╨║╤В line bullets (`тЬЕ`/`тАв`/`-`/`тАУ`/`тАФ`) ╨╕ inline ╨┐╨╛╤Б╨╗╨╡ ╨┤╨▓╨╛╨╡╤В╨╛╤З╨╕╤П; ╤А╨╡╨╜╨┤╨╡╤А `<p>`/`<h3>`/`<ul><li>` ╤Б escape + sanitize.
- ╨г╨╢╨╡ ╨│╨╛╤В╨╛╨▓╤Л╨╣ HTML ╨╜╨╡ ╨┐╨╡╤А╨╡╤А╨░╨╖╨▒╨╕╤А╨░╨╡╤В╤Б╤П тАФ ╤В╨╛╨╗╤М╨║╨╛ sanitize.
- `EventDescription` ╨▓╤Б╨╡╨│╨┤╨░ ╤З╨╡╤А╨╡╨╖ `formatEventDescriptionHtml`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Bare `export { cleanDisplayText } from 'тАж'` ╨╜╨╡ ╨┤╨░╨▓╨░╨╗ ╨╗╨╛╨║╨░╨╗╤М╨╜╤Л╨╣ ╨▒╨╕╨╜╨┤╨╕╨╜╨│ тЖТ `ReferenceError` ╨▓ ticket helpers (╤Б╨╝. ╨╖╨░╨┐╨╕╤Б╤М ╨▓╤Л╤И╨╡).
- **Proof prod:** slug `seks-v-sssrтАж` тАФ RSC HTML ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В `<ul>` (7 checkmark + 5 org details), ╨╝╨░╤А╨║╨╡╤А╤Л ╤Б╨╜╤П╤В╤Л, ╨░╨▒╨╖╨░╤Ж╤Л/`<h3>` ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╤Л.

---

## 2026-07-19 тАФ ╨а╨░╤Б╤И╨╕╤А╨╡╨╜╨╜╤Л╨╡ ╤Д╨╕╨╗╤М╤В╤А╤Л ╨║╨░╤В╨░╨╗╨╛╨│╨░ тЖТ popup

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- `CatalogAdvancedFiltersPanel` ╤А╨░╤Б╨║╤А╤Л╨▓╨░╨╗╤Б╤П inline ╨┐╨╛╨┤ ╤В╤Г╨╗╨▒╨░╤А╨╛╨╝ ╨╕ ╤А╨░╨╖╨┤╤Г╨▓╨░╨╗ `/events`.
- ╨Я╨╛╨╕╤Б╨║ ╨▓ ╤И╨░╨┐╨║╨╡ ╤Г╨╢╨╡ ╨╕╤Б╨┐╨╛╨╗╤М╨╖╤Г╨╡╤В overlay-modal (`HeaderSearch` variant=`overlay`): backdrop, Esc, `role="dialog"`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨д╨╕╨╗╤М╤В╤А╤Л ╨╛╤В╨║╤А╤Л╨▓╨░╤О╤В╤Б╤П ╨║╨╜╨╛╨┐╨║╨╛╨╣ ┬л╨д╨╕╨╗╤М╤В╤А╤Л┬╗ ╨▓ `CatalogToolbar` ╨║╨░╨║ portal-modal (╤В╨╛╤В ╨╢╨╡ UX, ╤З╤В╨╛ ╨┐╨╛╨╕╤Б╨║).
- Desktop: ╤Ж╨╡╨╜╤В╤А╨╕╤А╨╛╨▓╨░╨╜╨╜╨░╤П ╨╝╨╛╨┤╨░╨╗╨║╨░ `max-w-2xl`; mobile: bottom sheet (`items-end`, `rounded-t-2xl`, safe-area).
- Draft + ┬л╨Я╤А╨╕╨╝╨╡╨╜╨╕╤В╤М┬╗ / ┬л╨б╨▒╤А╨╛╤Б╨╕╤В╤М┬╗; Esc + backdrop; focus trap; badge ╤Б ╤З╨╕╤Б╨╗╨╛╨╝ ╨░╨║╤В╨╕╨▓╨╜╤Л╤Е advanced-╤Д╨╕╨╗╤М╤В╤А╨╛╨▓.
- Query-params (`from`/`to`/`minPrice`/`maxPrice`/`ageMax`/`landing`) ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣ ╤Б╤Е╨╡╨╝╤Л; ╤Б╤З╤С╤В╤З╨╕╨║ ╨▒╨╛╨╗╤М╤И╨╡ ╨╜╨╡ ╨▓╨║╨╗╤О╤З╨░╨╡╤В `category` (╨╛╨╜╨░ ╨▓ ╤З╨╕╨┐╨░╤Е ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╣).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╡╤А╨▓╤Л╨╣ `deploy-prod-next.sh`: Next build ╤Г╨┐╨░╨╗ ╨╜╨░ `next-font-manifest.json`; retry ╨┐╨╛╤Б╨╗╨╡ `rm -rf apps/web/.next` ╤Б╨╛╨▒╤А╨░╨╗╤Б╤П, ╨╜╨╛ SSH ╨╛╨▒╨╛╤А╨▓╨░╨╗╤Б╤П ╨┤╨╛ `systemctl start daibilet-web` тЖТ 502. ╨Ф╨╛╨╢╨░╨╗╨╕ ╨▓╤А╤Г╤З╨╜╤Г╤О: start web + smoke `/events` 200. Prod HEAD `be8ee55`.

---

## 2026-07-19 тАФ ╨Ь╨╛╨┤╤Г╨╗╤М ╨╛╤В╨╖╤Л╨▓╨╛╨▓ (ExternalOrder / TC)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т Prisma ╤Г╨╢╨╡ ╨▒╤Л╨╗╨╕ `Review*` / `ReviewRequest`, runtime API/UI/cron ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╨╛╨▓╨░╨╗╨╕.
- SPBBOATS ╨╖╨░╨┐╤А╨╡╤Й╨░╨╗ ╨╛╤В╨╖╤Л╨▓╤Л ╨┤╨╗╤П TC/TEP; ╤Г ╨░╨│╤А╨╡╨│╨░╤В╨╛╤А╨░ ╨╛╤Б╨╜╨╛╨▓╨╜╨╛╨╣ ╨┐╤Г╤В╤М ╨╜╨░╨╛╨▒╨╛╤А╨╛╤В тАФ ╤З╨╡╤А╨╡╨╖ `ExternalOrder`/tickets.
- ╨Ъ╨░╤В╨░╨╗╨╛╨│ ╤Г╨╢╨╡ ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╗ ╨┐╤Б╨╡╨▓╨┤╨╛╤А╨╡╨╣╤В╨╕╨╜╨│; JSON-LD Event ╨▒╨╡╨╖ AggregateRating.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Т╨╡╤А╨╕╤Д╨╕╨║╨░╤Ж╨╕╤П: email ╨╕/╨╕╨╗╨╕ ticket/order тЖФ ExternalOrder (done/confirmed) + event match (meta-siblings / mergeGroupKey); deep-link `ReviewRequest.token`.
- Public: `/reviews/write`, ╨▒╨╗╨╛╨║ ╨╜╨░ event page; displayName ┬л╨Ш╨▓╨░╨╜ ╨Ъ.┬╗, ╨▒╨╡╨╣╨┤╨╢ ┬л╨Я╨╛╨║╤Г╨┐╨║╨░ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨░┬╗.
- Admin: `/reviews` тАФ approve/reject/hide.
- Cron `review-requests` ╨┐╨╛╤Б╨╗╨╡ ╤Б╨╡╤Б╤Б╨╕╨╕; SMTP optional (graceful skip).
- UI ╨┐╤Б╨╡╨▓╨┤╨╛ 4.5тАУ5.0 ╨┤╨╛ 10; AggregateRating ╤В╨╛╨╗╤М╨║╨╛ ╨┐╤А╨╕ тЙе10 APPROVED.
- Disputes / ╨Ы╨Ъ ╨┐╨╛╤Б╤В╨░╨▓╤Й╨╕╨║╨░ ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨С╨╡╨╖ `SMTP_*` ╨┐╨╕╤Б╤М╨╝╨░ ╨╜╨╡ ╤Г╤Е╨╛╨┤╤П╤В (ReviewRequest ╨▓╤Б╤С ╤А╨░╨▓╨╜╨╛ ╤Б╨╛╨╖╨┤╨░╤С╤В╤Б╤П).
- Deploy: migrate `20260719150000_review_external_order` + nodemailer ╨┐╤А╨╕ ╨▓╨║╨╗╤О╤З╨╡╨╜╨╕╨╕ SMTP.
- Commit `1c2b156` ╨╖╨░╨┐╤Г╤И╨╡╨╜ ╨▓ `feat/next-monorepo`; SSH deploy ╤Б ╤Н╤В╨╛╨╣ ╤Б╤А╨╡╨┤╤Л тАФ `Permission denied (publickey)` ╨║ `213.171.7.16`. ╨Э╤Г╨╢╨╡╨╜ ╤А╤Г╤З╨╜╨╛╨╣ `deploy-prod-next.sh` ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡.

---

## 2026-07-19 тАФ City FAQ + thin noindex (╨┐╤Г╨╜╨║╤В 5)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- City page ╨╕╨╝╨╡╨╗ hero/catalog, ╨╜╨╛ ╨▒╨╡╨╖ FAQ/SEO text ╨╕ ╨▒╨╡╨╖ SSR JSON-LD; `generateMetadata` ╨▓╤Б╨╡╨│╨┤╨░ indexable.
- ╨Т ╨║╨░╤В╨░╨╗╨╛╨│╨╡ ╨╡╤Б╤В╤М thin-╨│╨╛╤А╨╛╨┤╨░ (1тАУ2 ╤Б╨╛╨▒╤Л╤В╨╕╤П: `abakan`, `orel`, `pskov`) ╤А╤П╨┤╨╛╨╝ ╤Б ╤В╨╛╨╗╤Б╤В╤Л╨╝╨╕ (`moskva` ~668, `sankt-peterburg` ~826).
- ╨Я╤Г╤Б╤В╨╛╨╣ FAQPage ╨╜╨░ thin-╤Б╤В╤А╨░╨╜╨╕╤Ж╨╡ ╨▓╤А╨╡╨┤╨╡╨╜ ╨┤╨╗╤П SEO.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `hub-indexability.ts`: city thin ╨╡╤Б╨╗╨╕ `events < 3` (╨╕ ╨╜╨╡ strong); venue thin ╨╡╤Б╨╗╨╕ `events < 1` ╨╕╨╗╨╕ `isIndexable === false`.
- Strong cities whitelist (`moskva`/`sankt-peterburg`/╨║╤А╤Г╨┐╨╜╤Л╨╡ ╤Е╨░╨▒╤Л) ╨▓╤Б╨╡╨│╨┤╨░ indexable.
- City FAQ + SEO text ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П indexable; SSR `FAQPage` + `BreadcrumbList`; metadata `robots: noindex,follow` ╨┤╨╗╤П thin.
- Sitemap cities/venues ╤Д╨╕╨╗╤М╤В╤А╤Г╨╡╤В thin.
- Venue detail ╤В╨╛╨╢╨╡ `robots` + BreadcrumbList SSR.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- **Proof prod** (deploy `9af7b45`): `/cities/moskva` тАФ `index, follow` + SSR `FAQPage`/`BreadcrumbList` + UI FAQ; `/cities/abakan` тАФ `noindex, follow`, ╨▒╨╡╨╖ FAQPage/FAQ UI; ╨б╨Я╨▒ indexable.
- ╨Ю╤З╨╡╤А╨╡╨┤╤М ╨┐╤Г╨╜╨║╤В╨╛╨▓ 1тАУ5 ╨╖╨░╨║╤А╤Л╤В╨░.

---

## 2026-07-19 тАФ Sitemap index + chunks / robots (╨┐╤Г╨╜╨║╤В 4)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Prod ╨╛╤В╨┤╨░╨▓╨░╨╗ ╨╛╨┤╨╕╨╜ ╨┐╨╗╨╛╤Б╨║╨╕╨╣ `urlset` ╨╜╨░ `/sitemap.xml` (static + cities + eventsтЙд2000 + venuesтЙд1000) тАФ ╤А╨╕╤Б╨║ ╤Г╨┐╨╕╤А╨░╨╜╨╕╤П ╨▓ ╨╗╨╕╨╝╨╕╤В ╨╛╨┤╨╜╨╛╨╣ ╨┐╤А╨╛╤Б╤В╤Л╨╜╨╕ ╨┐╤А╨╕ ╤А╨╛╤Б╤В╨╡ ╨║╨░╤В╨░╨╗╨╛╨│╨░.
- `robots.txt` ╤Г╨╢╨╡ Allow `/` + Sitemap ╨╜╨░ `/sitemap.xml`; scrapers `liliabots` Disallow; Googlebot/Yandex ╨╜╨╡ ╨▒╨╗╨╛╨║╨╕╤А╨╛╨▓╨░╨╗╨╕╤Б╤М.
- Native Next `generateSitemaps` ╨╜╨╡╤Б╤В╨░╨▒╨╕╨╗╨╡╨╜ ╨┤╨╗╤П ╨║╨╛╤А╨╜╨╡╨▓╨╛╨│╨╛ index тЖТ ╨║╨░╤Б╤В╨╛╨╝╨╜╤Л╨╡ route handlers.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨г╨┤╨░╨╗╤С╨╜ ╨╝╨╛╨╜╨╛╨╗╨╕╤В╨╜╤Л╨╣ `app/sitemap.ts`.
- Index: `app/sitemap.xml/route.ts` тЖТ `sitemapindex` ╤Б╨╛ ╤Б╤Б╤Л╨╗╨║╨░╨╝╨╕ ╨╜╨░ chunks.
- Chunks: `app/sitemaps/[chunk]/route.ts` + `lib/sitemap-data.ts` тАФ `static`, `events`, `cities`, `venues`, `landings`, `blog`.
- Events ╨╕╨╖ public catalog (`hydrateSlots: false`); venues `isIndexable !== false`; blog ╨╕╨╖ `buildPublicArticlesListDto` (╤Г╨╢╨╡ indexable); landings ╨╕╨╖ canonical category/city paths.
- `robots.ts`: Allow `*` / Googlebot / Yandex; Sitemap тЖТ `https://daibilet.ru/sitemap.xml` (index).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- City FAQ (╨┐╤Г╨╜╨║╤В 5) ╨╖╨░╨║╤А╤Л╤В ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨╣ ╨╖╨░╨┐╨╕╤Б╤М╤О ╨▓╤Л╤И╨╡.
- **Proof prod** (deploy `4282895`): `/robots.txt`, `/sitemap.xml` (sitemapindex), `/sitemaps/{static,events,cities,venues,landings,blog}.xml` тАФ ╨▓╤Б╨╡ **200**; events chunk ~2394 URL.

---

## 2026-07-19 тАФ SSR JSON-LD Event + BreadcrumbList

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ `/events/[slug]` ╨▒╤Л╨╗ `generateMetadata`, ╨╜╨╛ ╨▓ HTML source ╨╜╨╡ ╨▒╤Л╨╗╨╛ `application/ld+json` ╨┤╨╗╤П Event/Breadcrumbs (╨▓ ╨╛╤В╨╗╨╕╤З╨╕╨╡ ╨╛╤В blog/`layout` WebSite+Organization).
- UI-╨║╤А╨╛╤И╨║╨╕ ╨▓ hero ╤И╨╗╨╕ ╨║╨░╨║ ╨б╨╛╨▒╤Л╤В╨╕╤П тЖТ ╨У╨╛╤А╨╛╨┤ тЖТ Venue тЖТ Category тАФ ╨╜╨╡ ╤Б╨╛╨▓╨┐╨░╨┤╨░╨╗╨╕ ╤Б Tasktracker 1.2.1.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜ shared helper `apps/web/src/lib/structured-data.ts`: `buildEventBreadcrumbs`, `buildBreadcrumbListJsonLd`, `buildEventJsonLd`, `buildEventPageJsonLd`.
- Event page RSC ╤А╨╡╨╜╨┤╨╡╤А╨╕╤В ╨┤╨▓╨░ SSR `<script type="application/ld+json">`: `@type: Event` (+ `Offer` ╨┐╤А╨╕ ╤Ж╨╡╨╜╨╡) ╨╕ `BreadcrumbList` (╨У╨╗╨░╨▓╨╜╨░╤П тЖТ ╨б╨╛╨▒╤Л╤В╨╕╤П тЖТ ╨У╨╛╤А╨╛╨┤? тЖТ Title).
- Hero breadcrumbs ╤Б╨╕╨╜╤Е╤А╨╛╨╜╨╕╨╖╨╕╤А╨╛╨▓╨░╨╜╤Л ╤Б ╤В╨╡╨╝ ╨╢╨╡ helper (╨╛╨┤╨╕╨╜ source of truth; ╨║╨╗╨╕╨╡╨╜╤В╤Б╨║╨╕╨╣ LD ╨╜╨╡ ╨┤╤Г╨▒╨╗╨╕╤А╤Г╨╡╤В╤Б╤П).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Sitemap (╨┐╤Г╨╜╨║╤В 4 / 2.1.x) ╨╖╨░╨║╤А╤Л╤В ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨╣ ╨╖╨░╨┐╨╕╤Б╤М╤О ╨▓╤Л╤И╨╡.
- City FAQ/BreadcrumbList SSR (1.3.x / 2.2.3) тАФ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╣ ╤Н╤В╨░╨┐.
- **Proof prod:** `https://daibilet.ru/events/retro-locman-ot-zaryadya-1294` тАФ ╨▓ HTML source: `Event` (+ `Offer`), `BreadcrumbList`, ╨┐╨╗╤О╤Б root `WebSite`/`Organization`. Deploy `d8bf381`.

---

## 2026-07-19 тАФ ╨а╨╡╨│╤А╨╡╤Б╤Б╨╕╨╛╨╜╨╜╤Л╨╡ ╤В╨╡╤Б╤В╤Л: Teplohod image + TC fake open-date

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨д╨╕╨║╤Б╤Л B.15/B.16 ╤Г╨╢╨╡ ╨▓ prod, ╨╜╨╛ unit-╨┐╨╛╨║╤А╤Л╤В╨╕╨╡ ╨▒╤Л╨╗╨╛ ╤В╨╛╨╜╨║╨╕╨╝; `public-event-widget-fallback.test.ts` ╨╜╨╡ ╨▓╤Е╨╛╨┤╨╕╨╗ ╨▓ `test:ts`.
- Gate ┬л╤Б╨╕╨╜╤В╨╡╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ widget-slot┬╗ ╨╕ `pickPrimarySessionPurchase` ╨╢╨╕╨╗╨╕ ╨▓╨╜╤Г╤В╤А╨╕ `public-event.dto.ts` ╨▒╨╡╨╖ ╨┐╤А╤П╨╝╨╛╨│╨╛ ╨╕╨╝╨┐╨╛╤А╤В╨░ ╨▓ ╤В╨╡╤Б╤В╨░╤Е.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Т╤Л╨╜╨╡╤Б╨╡╨╜╤Л ╤З╨╕╤Б╤В╤Л╨╡ ╤Е╨╡╨╗╨┐╨╡╤А╤Л ╨▓ `public-event-widget-fallback.ts`; dto ╨╕╤Б╨┐╨╛╨╗╤М╨╖╤Г╨╡╤В ╨╕╤Е.
- ╨а╨░╤Б╤И╨╕╤А╨╡╨╜╤Л `event-image-url.test.ts` (╨╜╨╡╤В twcstorage/X-Amz ╨▓ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В╨╡, encode, non-TEP untouched) ╨╕ widget-fallback (dated RECURRING/SINGLE, meta-sibling purchase switch).
- `catalog-availability` + mapper: dated TC тЙа ┬л╨Ю╤В╨║╤А╤Л╤В╨░╤П ╨┤╨░╤В╨░┬╗.
- `npm test` / `test:ts` ╨▓╨║╨╗╤О╤З╨░╤О╤В ╨╛╨▒╨░ ╤Д╨░╨╣╨╗╨░; suite **57 pass**.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╤Г╨╜╨║╤В 3 (JSON-LD) ╨╜╨╡ ╨╜╨░╤З╨░╤В. ╨Ф╨╡╨┐╨╗╨╛╨╣ API ╨╜╨╡ ╨╜╤Г╨╢╨╡╨╜ (╤В╨╛╨╗╤М╨║╨╛ ╤В╨╡╤Б╤В╤Л + extract ╨▒╨╡╨╖ ╤Б╨╝╨╡╨╜╤Л ╨┐╨╛╨▓╨╡╨┤╨╡╨╜╨╕╤П).

---

## 2026-07-19 тАФ 0.5.8 SQL read-model ╨┤╨╗╤П admin Events

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Hot path: `getCachedAdminGroupedEvents` тЖТ `eventRows(db, null, { lean: true })` тЖТ `groupAdminEventRows` тЖТ filter/slice ╨▓ JS.
- Cold cache ~25s / OOM ╤А╨╕╤Б╨║ ╨╜╨░ 3.8Gi: Node ╨┤╨╡╤А╨╢╨░╨╗ ╨┐╨╛╨╗╨╜╤Л╨╣ grouped catalog ╨▓ RAM.
- Public catalog ╤Г╨╢╨╡ hydrate-only-page, ╨╜╨╛ base cache ╨▓╤Б╤С ╨╡╤Й╤С full sessions (╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ ╨┐╤Г╨╜╨║╤В).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Э╨╛╨▓╤Л╨╣ ╨╝╨╛╨┤╤Г╨╗╤М `admin-events-sql-read-model.js`: group key ╨▓ SQL (= `adminEventGroupKey`), LIMIT/OFFSET ╨┐╨╛ ╨│╤А╤Г╨┐╨┐╨░╨╝, ╤Д╨╕╨╗╤М╤В╤А╤Л ╨▓ SQL.
- `buildAdminEventsList`: SQL page тЖТ hydrate ╤В╨╛╨╗╤М╨║╨╛ sibling ids ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Л (`eventRowsByIds`, max 2500) тЖТ `groupAdminEventRows` (exact readiness/override/landingHits).
- `buildAdminDashboard`: metrics ╨╕╨╖ SQL aggregates (`launch.source=admin_event_groups_sql`), ╨▒╨╡╨╖ full catalog.
- TTL cache ~45s ╨╜╨░ SQL page variants; invalidate ╨▓╨╝╨╡╤Б╤В╨╡ ╤Б `invalidateAdminGroupedEventsCache`.
- Startup: ╨┐╨╛╨╗╨╜╤Л╨╣ admin catalog warm **off** ╨┐╨╛ ╤Г╨╝╨╛╨╗╤З╨░╨╜╨╕╤О (`DAIBILET_ADMIN_STARTUP_WARM=1` ╨┤╨╗╤П Landings SWR).
- Landings list ╨┐╨╛╨║╨░ ╨╜╨░ ╤Б╤В╨░╤А╨╛╨╝ `getCachedAdminGroupedEvents` (╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╣ ╤И╨░╨│).
- ╨в╨╡╤Б╤В╤Л: `admin-events-sql-read-model.test.ts`; bench: `scripts/bench-admin-events-sql.mjs`.
- **Prod bench @86bd059:** cold SQL page **5.5s** / list **6.2s**, warm list **0.35s**; `rowsLoaded=444` vs raw `30839`; heap╬Ф ~6тАУ7тАпMB. ╨С╤Л╨╗╨╛ cold ~16тАУ25s + full catalog in RAM.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- SQL readiness/canPublish тАФ ╨░╨┐╨┐╤А╨╛╨║╤Б╨╕╨╝╨░╤Ж╨╕╤П ╨┤╨╗╤П ╤Д╨╕╨╗╤М╤В╤А╨╛╨▓/╨╝╨╡╤В╤А╨╕╨║; ╤Б╤В╤А╨╛╨║╨╕ ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Л тАФ exact JS.
- `view=landing_match` ╤Д╨╕╨╗╤М╤В╤А╤Г╨╡╤В ╨┐╨╛ `LandingMatch`, ╨╜╨╡ ╨┐╨╛ ╨┐╨╛╨╗╨╜╨╛╨╝╤Г `LANDING_RULES` engine.
- Public catalog SQL page + landings match SQL тАФ ╨╡╤Й╤С ╨▓ backlog (╨┐╤Г╨╜╨║╤В 2+).
- SourceCode enum: ╨╜╤Г╨╢╨╡╨╜ `::text` ╨▓ coalesce ╤Б `''` (╨╕╨╜╨░╤З╨╡ 22P02).

---

## 2026-07-19 тАФ ╨У╨╗╨░╨▓╨╜╨░╤П: ╨┐╤А╨╛╨┐╨░╨╗╨╕ ╨╛╨▒╨╗╨╛╨╢╨║╨╕ Teplohod (signed S3)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ daibilet.ru ╨▓ ┬л╨Т╤Л╨▒╨╛╤А ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╕┬╗ / ┬л╨Ъ╤Г╨┤╨░ ╤Б╤Е╨╛╨┤╨╕╤В╤М┬╗ ╤Б╨╡╤А╤Л╨╡ ╨┐╨╗╨╡╨╣╤Б╤Е╨╛╨╗╨┤╨╡╤А╤Л ╤Г ╤З╨░╤Б╤В╨╕ ╨║╨░╤А╤В╨╛╤З╨╡╨║.
- ╨а╨░╨▒╨╛╤З╨╕╨╡: `ticketscloud-prod.storage.yandexcloud.net`, ╨╗╨╛╨║╨░╨╗╤М╨╜╤Л╨╡ `/images/cities`, blog covers.
- ╨С╨╕╤В╤Л╨╡: `s3.twcstorage.ru/teplohod-private/...` ╤Б `X-Amz-Expires=21600` (~6╤З) тАФ ╨┐╨╛╤Б╨╗╨╡ TTL HEAD тЖТ 500/fail, `img.onError` тЖТ ╤Б╨╡╤А╤Л╨╣ ╤Д╨╛╨╜.
- Live TEP API ╤Б╨╡╨╣╤З╨░╤Б ╨╛╤В╨┤╨░╤С╤В 186/187 first-image ╨║╨░╨║ signed S3; ╤Б╤В╨░╨▒╨╕╨╗╤М╨╜╤Л╨╣ `api.teplohod.info/v1/image?item=EventN&dirtyAlias=тАж` ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г 200.
- ╨Т ╨С╨Ф: ~186 `Event.imageUrl` ╤Б twcstorage (╨┐╨╛╤Б╨╗╨╡ sync).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `stabilizeTeplohodImageUrl`: signed S3 тЖТ `https://api.teplohod.info/v1/image?item=EventтАж&dirtyAlias=тАж`.
- ╨Я╤А╨╕╨╝╨╡╨╜╨╕╤В╤М ╨▓ `pickFirstUsableEventImageUrl` (TS + legacy `dto.js`) ╨╕ ╨▓ `tep-import-fixtures.js` ╨┐╤А╨╕ ╨╖╨░╨┐╨╕╤Б╨╕.
- One-shot rewrite ╨▓ prod DB + restart API + revalidate home.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╨║╨░ sync ╨╜╨╡ ╨╛╨▒╨╜╨╛╨▓╨╗╤С╨╜ ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡, ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╣ `tep:sync` ╤Б╨╜╨╛╨▓╨░ ╨╝╨╛╨│ ╨▒╤Л ╨┐╨╕╤Б╨░╤В╤М signed URL тАФ ╨┐╨╛╤Н╤В╨╛╨╝╤Г ╨┐╨░╤В╤З import ╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╨╡╨╜ ╨▓╨╝╨╡╤Б╤В╨╡ ╤Б serve-time rewrite.

---



### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ъ╨▓╨╡╤Б╤В ┬л╨Ю╤Б╨╛╨▒╨╛ ╨╛╨┐╨░╤Б╨╡╨╜┬╗ (`тАж6a3d444cтАж`, ╤Б╨╗╨╛╤В 19.07 04:30тАУ06:30 UTC) ╤Г╨╢╨╡ ╨╖╨░╨║╨╛╨╜╤З╨╕╨╗╤Б╤П; ╨▓ TC widget ╨┐╨╛ ╤Н╤В╨╛╨╝╤Г `eventId` тАФ ┬л╨Ь╨╡╤А╨╛╨┐╤А╨╕╤П╤В╨╕╨╡ ╨┐╤А╨╛╤И╨╗╨╛.┬╗
- Sibling ╤Б ╨▒╤Г╨┤╤Г╤Й╨╡╨╣ ╨┤╨░╤В╨╛╨╣ (`тАж6a3d446fтАж`, 26.07) ╨▓ ╨▓╨╕╨┤╨╢╨╡╤В╨╡ ╨┐╤А╨╛╨┤╨░╤С╤В╤Б╤П ╨╜╨╛╤А╨╝╨░╨╗╤М╨╜╨╛ (╨╜╨╡╤Б╨║╨╛╨╗╤М╨║╨╛ ╤Б╨╗╨╛╤В╨╛╨▓).
- Meta: `6a3d42ebe5b04d07b3b015fa`. ╨Т ╨С╨Ф ╨┤╨╡╤Б╤П╤В╨║╨╕ RECURRING-╤Б╨╗╨╛╤В╨╛╨▓, ╨╜╨╡ OPEN_DATE.
- ╨С╨░╨│ UI: ╨┐╨╛╤Б╨╗╨╡ ╤Д╨╕╨╗╤М╤В╤А╨░ ╨┐╤А╨╛╤И╨╡╨┤╤И╨╕╤Е ╤Б╨╡╤Б╤Б╨╕╨╣ `buildWidgetOnlySessions` ╤Б╨╕╨╜╤В╨╡╨╖╨╕╤А╨╛╨▓╨░╨╗ ┬л╨С╨╕╨╗╨╡╤В╤Л ╤Б ╨╛╤В╨║╤А╤Л╤В╨╛╨╣ ╨┤╨░╤В╨╛╨╣┬╗ ╨┤╨╗╤П **╨╗╤О╨▒╨╛╨│╨╛** TicketsCloud тЖТ ╨╛╤В╨║╤А╤Л╨▓╨░╨╗╤Б╤П ╨┐╤А╨╛╤В╤Г╤Е╤И╨╕╨╣ `eventId`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨б╨╕╨╜╤В╨╡╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ widget-slot ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П `OPEN_DATE` / `open_date` (╨╕ ╨▓ `public-event.dto.ts`, ╨╕ ╨▓ legacy `dto.js`).
- ╨Я╨╛╨┤╤В╤П╨│╨╕╨▓╨░╨╡╨╝ siblings ╨┐╨╛ `EventSourceLink.metaExternalId`, ╤З╤В╨╛╨▒╤Л past slug ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╗ ╨▒╤Г╨┤╤Г╤Й╨╕╨╡ ╤Б╨╡╨░╨╜╤Б╤Л.
- `pickPrimarySessionPurchase` ╨┐╨╡╤А╨╡╨║╨╗╤О╤З╨░╨╡╤В `externalId` / `purchaseUrl` / widgetPayload ╨╜╨░ ╨▒╨╗╨╕╨╢╨░╨╣╤И╨╕╨╣ ╨┐╤А╨╛╨┤╨░╨▓╨░╨╡╨╝╤Л╨╣ ╤Б╨╗╨╛╤В.
- ╨в╨╡╤Б╤В: `public-event-widget-fallback.test.ts`. ╨Р╤Г╨┤╨╕╤В ╨▒╨╗╨╛╨│╨░: `scripts/audit-blog-event-links.mjs`.

### ╨Ф╨╛╨▒╨╕╨▓╨║╨░ blog dead links (╤В╨╛╤В ╨╢╨╡ ╨┤╨╡╨╜╤М)

- ╨Р╤Г╨┤╨╕╤В `scripts/audit-blog-event-links.mjs`: 82 ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╤Е `/events` ╨╕╨╖ MD; ╨┐╨╛╤Б╨╗╨╡ API-╤Д╨╕╨║╤Б╨░ ┬л╨Ю╤Б╨╛╨▒╨╛ ╨╛╨┐╨░╤Б╨╡╨╜┬╗ OK.
- ╨Я╤А╨╛╤И╨╡╨┤╤И╨╕╨╡ SINGLE ╨▒╨╡╨╖ meta (╨╛╤А╨│╨░╨╜/╨┤╨╢╨░╨╖/╤Б╤В╨╡╨╜╨┤╨░╨┐/╨▒╨░╨╗╨╡╤В/тАж) тЖТ ╤Б╤Б╤Л╨╗╨║╨╕ ╨▓ 8 ╤Б╤В╨░╤В╤М╤П╤Е ╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╤Л ╨╜╨░ ╨▒╨╗╨╕╨╢╨░╨╣╤И╨╕╨╡ ╨▒╤Г╨┤╤Г╤Й╨╕╨╡ ╤Б╨╗╨╛╤В╤Л + upsert PUBLISHED.
- ╨д╨╡╤Б╤В╨╕╨▓╨░╨╗╨╕ ┬л╨С╤Л╨╗╨╕╨╜╨╜╤Л╨╣ ╨▒╨╡╤А╨╡╨│┬╗ / ┬л╨д╤Н╨╜╤В╨╡╨╖╨╕ ╨д╨╡╤Б╤В┬╗: wide-lifetime (┬л╨Ф╨░╤В╤Л ╨▓ ╨▓╨╕╨┤╨╢╨╡╤В╨╡┬╗), ╨╜╨╡ ╨▒╨░╨│ fake open-date.

---

## 2026-07-19 тАФ Blog: ╨╛╤В╨╗╨╛╨╢╨╕╤В╤М ╨┐╨╡╤А╨▓╤Л╨╣ inline image ╨┐╨╛╤Б╨╗╨╡ hero

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ mobile ╨┐╨╛╤Б╨╗╨╡ cover hero ╤Б╤А╨░╨╖╤Г ╤И╤С╨╗ body `[image]`: float-╤Б╨╡╨║╤Ж╨╕╤П ╤Б╤В╨░╨▓╨╕╨╗╨░ `<img>` ╨┐╨╡╤А╨▓╤Л╨╝ ╨▓ DOM, ╨▓╨╕╨╖╤Г╨░╨╗╤М╨╜╨╛ ╨┤╨▓╨╡ ╨║╨░╤А╤В╨╕╨╜╨║╨╕ ╨┐╨╛╨┤╤А╤П╨┤.
- ╨в╨╕╨┐╨╕╤З╨╜╤Л╨╣ MD: 1 ╨░╨▒╨╖╨░╤Ж тЖТ `[image]` (╨│╨╕╨┤╤Л); ╨║╨╛╨╗╨╛╨╜╨║╨╕ ╤Г╨╢╨╡ ╨╜╨╕╨╢╨╡ тАФ ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╨╝.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `deferLeadingImageBlock` ╨┐╨╛╤Б╨╗╨╡ `filterDuplicateImageBlocks`: ╨┐╨╡╤А╨▓╤Л╨╣ image ╨┐╨╡╤А╨╡╨╜╨╛╤Б╨╕╤В╤Б╤П ╨┐╨╛╤Б╨╗╨╡ тЙе2 paragraph-╨▒╨╗╨╛╨║╨╛╨▓ (╨▓╨╡╨╖╨┤╨╡, ╨╜╨╡ ╤В╨╛╨╗╤М╨║╨╛ mobile).
- ╨г╨▒╤А╨░╨╜╨░ ╨▓╨╡╤В╨║╨░ `paragraph + next image` тЖТ float: ╨┐╤А╨╡╨┤╤И╨╡╤Б╤В╨▓╤Г╤О╤Й╨╕╨╣ ╤В╨╡╨║╤Б╤В ╨▒╨╛╨╗╤М╤И╨╡ ╨╜╨╡ ╨╖╨░╤В╤П╨│╨╕╨▓╨░╨╡╤В╤Б╤П ╨┐╨╛╨┤ image-first layout.
- ╨Я╤А╨░╨▓╨║╨╕ ╨▓ `apps/web` ╨╕ `apps/public` `BlogArticleContent.tsx`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В: coverтЙаinline ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╤З╨╡╤А╨╡╨╖ `filterDuplicateImageBlocks`.

---

## 2026-07-19 тАФ Blog: ╨▓╨╡╤А╨╜╤Г╤В╤М ╤Д╨╛╤В╨╛ ╨▓ ╤Б╤В╨░╤В╤М╨╕ (cover + distinct inline)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨г ╨▓╤Б╨╡╤Е PUBLISHED ╤Б╤В╨░╤В╨╡╨╣ cover ╨╕ `[image]` ╨▓ MD/DB ╨▒╤Л╨╗╨╕, ╨╜╨╛ ╨▓ HTML body ╨║╨░╤А╤В╨╕╨╜╨║╨░ ╨┐╤А╨╛╨┐╨░╨┤╨░╨╗╨░: `filterDuplicateImageBlocks` ╨▓╤Л╤А╨╡╨╖╨░╨╡╤В inline, ╨╡╤Б╨╗╨╕ `src` ╤Б╨╛╨▓╨┐╨░╨┤╨░╨╡╤В ╤Б `coverImageUrl`.
- ╨н╤В╨░╨╗╨╛╨╜: `fentezi-fest-bylinnyy-bereg` ╤Г╨╢╨╡ ╨╕╨╝╨╡╨╗ ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ `-inline.jpg` тЖТ ╨╜╨░ ╤Б╤В╤А╨░╨╜╨╕╤Ж╨╡ 2 img.
- ╨Т `apps/web/public/images/` ╨╜╨╡ ╤Е╨▓╨░╤В╨░╨╗╨╛ sync `muzyka-v-osobnyakah-spb.jpg` (╤Н╤В╨░╨╗╨╛╨╜ ╨▓ `apps/public/...`).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨б╨│╨╡╨╜╨╡╤А╨╕╤А╨╛╨▓╨░╨╜╤Л ╨░╤В╨╝╨╛╤Б╤Д╨╡╤А╨╜╤Л╨╡ `{slug}-inline.jpg` (╨▒╨╡╨╖ ╤В╨╡╨║╤Б╤В╨░), ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╤Л ╨▓ `apps/public/public/images/blog/` (+ ╨╗╨╛╨║╨░╨╗╤М╨╜╤Л╨╣ sync web).
- Frontmatter: ╤П╨▓╨╜╤Л╨╣ `coverImageUrl`; body `[image]` тЖТ `-inline.jpg`; `blog:sync-bodies`.
- Commit ╤В╨╛╨╗╤М╨║╨╛ blog-╨░╤А╤В╨╡╤Д╨░╨║╤В╨╛╨▓ (╨╜╨╡ ╤В╤А╨╛╨│╨░╤В╤М ╨┐╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╤Л╨╣ jazz-landing), `deploy-prod-next` + `blog:upsert` ├Ч19.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- HIDDEN `bylinnyy-bereg-*` ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╨▒╨╡╨╖ cover-╤Д╨░╨╣╨╗╨╛╨▓ ╨╜╨░ ╨┤╨╕╤Б╨║╨╡ (╨╜╨╡ ╨▓ scope PUBLISHED).
- Internal revalidate endpoint ╨▓╨╡╤А╨╜╤Г╨╗ 401; ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Л ╨▓╤Б╤С ╤А╨░╨▓╨╜╨╛ ╨╛╤В╨┤╨░╤О╤В cover+inline ╨┐╨╛╤Б╨╗╨╡ upsert (SSR ╨╕╨╖ Article).

### ╨Ф╨╛╨▒╨╕╨▓╨║╨░ (╤В╨╛╤В ╨╢╨╡ ╨┤╨╡╨╜╤М)

- Prod `@af32532`, `blog:upsert` ├Ч19 PUBLISHED тАФ OK.
- Smoke: 4 ╤Б╤В╨░╤В╤М╨╕ HTML ╤Б 2├Ч `/images/blog/*` (cover+inline), ╨▓╤Б╨╡ img 200.
- API `/api/public/articles`: **19/19** ╤Б `coverImageUrl`.

---

## 2026-07-19 тАФ Home SEO: ╤В╨╛╤З╨╜╤Л╨╣ ╤И╨░╨▒╨╗╨╛╨╜ description

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Title ╤Г╨╢╨╡ ╨╛╨║: ┬л╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В тАФ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕, ╨╝╤Г╨╖╨╡╨╕ ╨╕ ╨╝╨╡╤А╨╛╨┐╤А╨╕╤П╤В╨╕╤П ╨▓ ╨│╨╛╤А╨╛╨┤╨░╤Е ╨а╨╛╤Б╤Б╨╕╨╕┬╗.
- Description ╨╜╨░ prod ╨▒╤Л╨╗ ╨▓ ╨┤╤А╤Г╨│╨╛╨╝ ╨┐╨╛╤А╤П╨┤╨║╨╡: ┬л╨С╨╕╨╗╨╡╤В╤Л ╨╜╨░ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕ ╨╕ ╤Б╨╛╨▒╤Л╤В╨╕╤П: тАж ╨Р╤Д╨╕╤И╨░ ╨╝╤Г╨╖╨╡╨╡╨▓тАж┬╗ тАФ ╨╜╤Г╨╢╨╡╨╜ ╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜╨╜╤Л╨╣ SERP-╤В╨╡╨║╤Б╤В.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨и╨░╨▒╨╗╨╛╨╜: `╨Р╤Д╨╕╤И╨░ ╤Б╨╛╨▒╤Л╤В╨╕╨╣, ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╣ ╨╕ ╨╝╨╡╤А╨╛╨┐╤А╨╕╤П╤В╨╕╨╣ ╨▓ ╨│╨╛╤А╨╛╨┤╨░╤Е ╨а╨╛╤Б╤Б╨╕╨╕. ╨С╨╕╨╗╨╡╤В╤Л ╨╛╨╜╨╗╨░╨╣╨╜: ╨Ь╨╛╤Б╨║╨▓╨░ тАФ {n}, ╨б╨░╨╜╨║╤В-╨Я╨╡╤В╨╡╤А╨▒╤Г╤А╨│ тАФ {m}, ╨Ъ╨░╨╖╨░╨╜╤М тАФ {k}, ╨Х╨║╨░╤В╨╡╤А╨╕╨╜╨▒╤Г╤А╨│ тАФ {e}` (╨┤╨╗╨╕╨╜╨╜╨╛╨╡ ╤В╨╕╤А╨╡).
- Counts ╤В╨╛╨╗╤М╨║╨╛ ╨╢╨╕╨▓╤Л╨╡ ╨╕╨╖ `getHomeDestinations` (slug-╤Е╨░╨▒╤Л); fallback ╨▒╨╡╨╖ ╤Е╨░╤А╨┤╨║╨╛╨┤-╤Ж╨╕╤Д╤А.
- Title ╨▒╨╡╨╖ ╤Ж╨╕╤Д╤А; layout default + OG/Twitter ╤З╨╡╤А╨╡╨╖ ╤В╨╡ ╨╢╨╡ ╨║╨╛╨╜╤Б╤В╨░╨╜╤В╤Л.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Counts ╨▓ SERP ╤Б ╨╗╨░╨│╨╛╨╝ ISR (~300s); ╨┐╨╛╤Б╨╗╨╡ deploy ╨╜╤Г╨╢╨╡╨╜ curl title/description ╨╜╨░ prod.

---

## 2026-07-19 тАФ Home SEO title + city counts in description

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Title ╨▓╨║╨╗╨░╨┤╨║╨╕/default ╨▒╤Л╨╗ ╤Б╨║╤Г╨┤╨╜╤Л╨╣: ┬л╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В тАФ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕, ╨╝╤Г╨╖╨╡╨╕ ╨╕ ╨▒╨╕╨╗╨╡╤В╤Л┬╗ (~40 ╤Б╨╕╨╝╨▓.), description ╨▒╨╡╨╖ ╨│╨╡╨╛╨│╤А╨░╤Д╨╕╨╕ ╨╕ ╨╛╨▒╤К╤С╨╝╨░ ╨║╨░╤В╨░╨╗╨╛╨│╨░.
- ╨Э╨░ ╨│╨╗╨░╨▓╨╜╨╛╨╣ ╤Г╨╢╨╡ ╨╡╤Б╤В╤М `getHomeDestinations` (ISR/`unstable_cache`) ╤Б `events` ╨┐╨╛ ╨│╨╛╤А╨╛╨┤╨░╨╝ тАФ ╨╝╨╛╨╢╨╜╨╛ enrichment ╨▒╨╡╨╖ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨│╨╛ API.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Default title тЖТ ┬л╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В тАФ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕, ╨╝╤Г╨╖╨╡╨╕ ╨╕ ╨╝╨╡╤А╨╛╨┐╤А╨╕╤П╤В╨╕╤П ╨▓ ╨│╨╛╤А╨╛╨┤╨░╤Е ╨а╨╛╤Б╤Б╨╕╨╕┬╗; template `%s | ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В` ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣.
- Home `generateMetadata`: description/OG/Twitter ╤Б counts ╤В╨╛╨┐-╤Е╨░╨▒╨╛╨▓ (╨Ь╨╛╤Б╨║╨▓╨░, ╨б╨Я╨▒, ╨Ъ╨░╨╖╨░╨╜╤М, ╨Х╨║╨░╤В╨╡╤А╨╕╨╜╨▒╤Г╤А╨│) ╨╕╨╖ destinations; title ╨▒╨╡╨╖ counts (╤З╨╕╤В╨░╨╡╨╝╨╛╤Б╤В╤М тЙд~70).
- ╨Ъ╨╛╨╜╤Б╤В╨░╨╜╤В╤Л/helper ╨▓ `seo-meta.ts` (`HOME_SEO_TITLE`, `buildHomeSeoDescription`).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Counts ╨▓ SERP ╨╛╨▒╨╜╨╛╨▓╨╗╤П╤О╤В╤Б╤П ╤Б ╨╗╨░╨│╨╛╨╝ ISR (~`revalidate` home); ╨┐╤А╨╕ ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╜╨╛╤Б╤В╨╕ DB тАФ fallback description ╨▒╨╡╨╖ ╤Ж╨╕╤Д╤А.

---

## 2026-07-19 тАФ Blog soft-links: ╨║╨░╤В╨░╨╗╨╛╨│ тЖТ ╨╗╨╡╨╜╨┤╨╕╨╜╨│╨╕

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т `chto-poslushat-jazz` ┬л╨┤╨╢╨░╨╖╨╛╨▓╨╛╨╣ ╨░╤Д╨╕╤И╨╡ ╨Ь╨╛╤Б╨║╨▓╤Л┬╗ ╨▓╨╡╨╗╨░ ╨╜╨░ ╤Б╤Л╤А╨╛╨╣ ╨║╨░╤В╨░╨╗╨╛╨│ `/events?q=╨┤╨╢╨░╨╖&city=moscow`, ╨░ ╨╜╨╡ ╨╜╨░ ╨╗╨╡╨╜╨┤╨╕╨╜╨│ ╨╢╨░╨╜╤А╨░.
- ╨Ъ╨░╨╜╨╛╨╜: `concertsLandingHref('moscow','jazz')` тЖТ `/kontserty/moscow/?genre=╨Ф╨╢╨░╨╖` (prod 200, landing ┬л╨Ъ╨╛╨╜╤Ж╨╡╤А╤В╤ЛтАж┬╗).
- ╨Р╤Г╨┤╨╕╤В soft-links ┬л╨░╤Д╨╕╤И╨╡ X / ╨┐╨╛╨┤╨▒╨╛╤А╨║╨╡┬╗: ╨╡╤Й╤С 3 ╤Б╤В╨░╤В╤М╨╕ ╤Б╤Б╤Л╨╗╨░╨╗╨╕╤Б╤М ╨╜╨░ city catalog ╨┐╤А╨╕ ╨╜╨░╨╗╨╕╤З╨╕╨╕ ╤В╨╡╨╝╨░╤В╨╕╤З╨╡╤Б╨║╨╛╨│╨╛ ╨╗╨╡╨╜╨┤╨╕╨╜╨│╨░.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ч╨░╨╝╨╡╨╜╤Л: jazz тЖТ `/kontserty/moscow/?genre=╨Ф╨╢╨░╨╖`; ╤Б╤В╨╡╨╜╨┤╨░╨┐ ╨б╨Я╨▒ тЖТ `/stendap-i-yumor/`; ╨Ъ╨░╨╖╨░╨╜╤М ╤А╨╡╤З╨╜╤Л╨╡ тЖТ `/rechnye-progulki/kazan/`; ╨░╨▓╤В╨╛╨▒╤Г╤Б╤Л ╨Ь╨б╨Ъ тЖТ `/avtobusnye-ekskursii/moscow/`.
- `blog:sync-bodies` + prod `blog:upsert` ├Ч4 + `revalidate` paths/tags articles.
- ╨У╨╛╤А╨╛╨┤╤Б╨║╨╕╨╡ `/cities/{slug}` ╨▓ `afisha-regionalnye-goroda` ╨╛╤Б╤В╨░╨▓╨╗╨╡╨╜╤Л (╨╜╨╡╤В ╤В╨╡╨╝╨░╤В╨╕╤З╨╡╤Б╨║╨╛╨│╨╛ ╨╗╨╡╨╜╨┤╨╕╨╜╨│╨░).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╨╗╨╜╤Л╨╣ `deploy-prod-next.sh` ╨╜╨╡ ╨│╨╛╨╜╤П╨╗╨╕: ╨║╨╛╨╜╤В╨╡╨╜╤В ╤Б╤В╨░╤В╨╡╨╣ ╨╕╨╖ `Article` ╨┐╨╛╤Б╨╗╨╡ upsert; static bodies ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡ ╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╤Л SCP ╨┤╨╗╤П ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╡╨│╨╛ ╨▒╨╕╨╗╨┤╨░.

---

## 2026-07-19 - Teplohod orders: ╨╛╤В╨╗╨╛╨╢╨╡╨╜╨╛ (╨╜╨╡╤В API ╤Г ╨┐╨░╤А╤В╨╜╤С╤А╨░)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨░╤А╤В╨╜╤С╤А teplohod.info ╨┐╨╛╨┤╤В╨▓╨╡╤А╨┤╨╕╨╗: **╤Д╤Г╨╜╨║╤Ж╨╕╨╛╨╜╨░╨╗╨░ ╨▓╤Л╨│╤А╤Г╨╖╨║╨╕/API ╨╖╨░╨║╨░╨╖╨╛╨▓ ╨╜╨╡╤В**.
- ╨Я╨╛╨│╨╛╨╜╤П ╨╖╨░ `TEP_ORDERS_TOKEN` / IP probe / import **╨╛╤Б╤В╨░╨╜╨╛╨▓╨╗╨╡╨╜╨░**. ╨Ъ╨░╤В╨░╨╗╨╛╨│ TEP (IP allowlist, `api.teplohod.info/v1`) ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Prod crontab: ╤Б╤В╤А╨╛╨║╨░ `tep-orders-sync` (`*/15`) **╤Г╨┤╨░╨╗╨╡╨╜╨░**; `tc-orders-sync` (`*/10`) ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.
- `scripts/tep-sync-orders.js` + `npm run tep:orders` ╨╛╤Б╤В╨░╤О╤В╤Б╤П ╨▓ ╤А╨╡╨┐╨╛ ╨║╨░╨║ **╨╖╨░╨│╨╛╤В╨╛╨▓╨║╨░**, ╨╜╨╡ ╨░╨║╤В╨╕╨▓╨╜╤Л╨╣ prod-path.
- Docs: ╤Б╤В╨░╤В╤Г╤Б **╨╛╤В╨╗╨╛╨╢╨╡╨╜╨╛ / ╨╜╨╡╤В API**; ╤Д╨╛╤А╨╝╤Г╨╗╨╕╤А╨╛╨▓╨║╨╕ ╨┐╤А╨╛ ┬л╨╜╤Г╨╢╨╡╨╜ TEP_ORDERS_TOKEN ╨║╨░╨║ ╨▒╨╗╨╛╨║╨╡╤А┬╗ ╤Б╨╜╤П╤В╤Л.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Ч╨░╨║╨░╨╖╤Л Teplohod ╨▓ ╨░╨┤╨╝╨╕╨╜╨║╨╡ ╨┐╨╛╤П╨▓╤П╤В╤Б╤П ╤В╨╛╨╗╤М╨║╨╛ ╨╡╤Б╨╗╨╕ ╨┐╨░╤А╤В╨╜╤С╤А ╨┤╨╛╨▒╨░╨▓╨╕╤В API ╨╕╨╗╨╕ ╨╕╨╜╨╛╨╣ ╨║╨░╨╜╨░╨╗. TC orders ╤А╨░╨▒╨╛╤В╨░╤О╤В.

---

# Diary тАФ Daibilet

╨в╨╡╤Е╨╜╨╕╤З╨╡╤Б╨║╨╕╨╣ ╨┤╨╜╨╡╨▓╨╜╨╕╨║ ╨┐╤А╨╛╨╡╨║╤В╨░. ╨д╨╛╤А╨╝╨░╤В ╨╖╨░╨┐╨╕╤Б╨╕: **╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П**, **╨а╨╡╤И╨╡╨╜╨╕╤П**, **╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л**.

---

## 2026-07-19 тАФ Teplohod orders sync (╨║╨░╤А╨║╨░╤Б + probe)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ъ╨░╤В╨░╨╗╨╛╨│ TEP (`TEP_API_URL=https://api.teplohod.info/v1`, IP allowlist) ╨╛╤В╨┤╨░╤С╤В `events`/`cities`; ╨▓╤Б╨╡ ╤Г╨│╨░╨┤╨░╨╜╨╜╤Л╨╡ paths `/orders`, `/bookings`, `/sales` ╨╕ ╤В.╨┐. тЖТ **404**.
- ╨Э╨░ `account.teplohod.info` ╨╢╨╕╨▓╨╛╨╣ REST: `GET /api/orders` ╨╕ `/api/widgets`, `/api/profile`, `/api/events` тЖТ **401 Unauthorized** (endpoint ╨╡╤Б╤В╤М, credentials ╨╜╨╡╤В). ╨Т `.env` prod ╨╜╨╡╤В `TEP_ORDERS_TOKEN` / `TEPLOHOD_API_*`.
- ╨Я╤Г╨▒╨╗╨╕╤З╨╜╨╛╨╣ ╤Б╤Е╨╡╨╝╤Л ╨╛╤В╨▓╨╡╤В╨░ orders ╤Г ╨┐╨░╤А╤В╨╜╤С╤А╨░ ╨╜╨╡╤В; email-╨┐╨░╤А╤Б╨╕╨╜╨│ ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╨╛╤В╨▓╨╡╤А╨│╨╜╤Г╤В.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `scripts/tep-sync-orders.js` + `npm run tep:orders`: upsert ╨▓ `ExternalOrder`/`ExternalTicket` (source `src_teplohod`), ╨╕╨┤╨╡╨╝╨┐╨╛╤В╨╡╨╜╤В╨╜╨╛; ╨▒╨╡╨╖ ╤В╨╛╨║╨╡╨╜╨░ тЖТ `status=BLOCKED` (╨╜╨╡ SUCCESS).
- Default URL: `https://account.teplohod.info/api/orders`; auth `bearer` / `access-token` / `both`.
- Cron `deploy/cron/tep-orders-sync.sh` `*/15` ╤А╤П╨┤╨╛╨╝ ╤Б `tc-orders` `*/10` (orders-only, ╨║╨░╤В╨░╨╗╨╛╨│ ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╤В).
- API: `POST /api/v1/tep/orders/sync` (+ admin alias).
- ╨Ф╨╛╨║╤Г╨╝╨╡╨╜╤В╨╕╤А╨╛╨▓╨░╨╜ ╤Б╨┐╨╕╤Б╨╛╨║ ╨▓╨╛╨┐╤А╨╛╤Б╨╛╨▓ ╨┐╨░╤А╤В╨╜╤С╤А╤Г (qa + integrations).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Ш╨╝╨┐╨╛╤А╤В **0 ╨╖╨░╨║╨░╨╖╨╛╨▓** ╨┤╨╛ ╨▓╤Л╨┤╨░╤З╨╕ ╤В╨╛╨║╨╡╨╜╨░/╤Б╤Е╨╡╨╝╤Л. ╨Я╨╛╤Б╨╗╨╡ ╤В╨╛╨║╨╡╨╜╨░ ╨╜╤Г╨╢╨╡╨╜ smoke `--dry-run` ╨╕ ╤Б╨▓╨╡╤А╨║╨░ ╨┐╨╛╨╗╨╡╨╣ ╨╝╨░╨┐╨┐╨╕╨╜╨│╨░.
- ╨Э╨╡╨╕╨╖╨▓╨╡╤Б╤В╨╜╨╛, ╤Д╨╕╨╗╤М╤В╤А╤Г╨╡╤В ╨╗╨╕ account API ╨┐╨╛ `widget_id` / dateFrom тАФ ╨┐╨╡╤А╨╡╨┤╨░╤С╨╝ ╨║╨░╨║ query aliases.

---

## 2026-07-19 тАФ Admin: editable Cities + article publishedAt

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Cities ╨▓ ╨░╨┤╨╝╨╕╨╜╨║╨╡ ╨▒╤Л╨╗╨╕ read-only (`GET /api/admin/cities` + ╨▒╨╡╨╣╨┤╨╢ ┬л╤В╨╛╨╗╤М╨║╨╛ ╤З╤В╨╡╨╜╨╕╨╡┬╗); ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ ╨║╨░╤В╨░╨╗╨╛╨│ ╨│╨╛╤А╨╛╨┤╨╛╨▓ ╨╢╨╕╨▓╤С╤В ╨╜╨░ Prisma `City` (title/slug/SEO/intro/`isDestination`), ╨▒╨╡╨╖ `isActive`/`sortOrder`.
- ╨б╤В╨░╤В╤М╨╕: `upsertAdminArticle` ╤Г╨╢╨╡ ╨┐╤А╨╕╨╜╨╕╨╝╨░╨╗ `publishedAt`, ╨╜╨╛ UI ╨╜╨╡ ╨╖╨░╨│╤А╤Г╨╢╨░╨╗/╨╜╨╡ ╤Б╨╛╤Е╤А╨░╨╜╤П╨╗ ╨┐╨╛╨╗╨╡ тАФ ╨╜╨╡╨╗╤М╨╖╤П ╨▒╤Л╨╗╨╛ ╤А╨░╨╖╨╜╨╡╤Б╤В╨╕ ╨┤╨░╤В╤Л ╨▒╨╗╨╛╨│╨░ ╨▒╨╡╨╖ SQL.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- API: `GET/PATCH /api/admin/cities/:id` тАФ update City; slug unique тЖТ 409 `slug_not_unique`; invalidate public caches.
- Admin Cities: sheet-╤Д╨╛╤А╨╝╨░ (title, slug, SEO, intro, hero, isDestination); ╤А╨╡╨│╨╕╨╛╨╜╤Л ╨▓ ╤Б╨┐╨╕╤Б╨║╨╡ ╨╜╨╡ PATCH (╤В╨╛╨╗╤М╨║╨╛ City).
- Admin Articles: datetime-local `publishedAt`, ╨║╨╛╨╗╨╛╨╜╨║╨░ ╨┤╨░╤В╤Л ╨▓ ╤Б╨┐╨╕╤Б╨║╨╡; ╨┐╤А╨╕ publish ╨┐╤Г╤Б╤В╨░╤П ╨┤╨░╤В╨░ тЖТ now (UI + backend).
- Docs: Project/Tasktracker/Diary ╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╤Л (B.9/B.10).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨б╨╝╨╡╨╜╨░ slug ╨│╨╛╤А╨╛╨┤╨░ ╨╗╨╛╨╝╨░╨╡╤В ╤Б╤В╨░╤А╤Л╨╡ `/cities/{old}` URL тАФ ╨╛╨┐╨╡╤А╨░╤В╨╛╤А╤Г ╨╜╤Г╨╢╨╜╨░ ╨╛╤Б╤В╨╛╤А╨╛╨╢╨╜╨╛╤Б╤В╤М; 301 ╨╜╨╡ ╨┤╨╡╨╗╨░╨╡╨╝ ╨▓ ╤Н╤В╨╛╨╝ ╤В╨╕╨║╨╡╤В╨╡.
- Region rows ╨▓ destination rollup ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╨▒╨╡╨╖ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨│╨╛ PATCH.

---

## 2026-07-19 тАФ ╨Я╨╡╤А╨▓╨░╤П ╨║╨╛╨╗╨╛╨╜╨║╨░ ╨Р╨╜╨╜╤Л (╨╛╤Б╨╛╨▒╨╜╤П╨║╨╕ ╨б╨Я╨▒)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨┐╤А╨╕╤Б╨╗╨░╨╗ longform ┬л╨Ь╤Г╨╖╤Л╨║╨░ ╤Б ╨░╨┤╤А╨╡╤Б╨╛╨╝тАж┬╗; ╤Б╨╗╤Г╨╢╨╡╨▒╨╜╨░╤П ╤Б╤В╤А╨╛╨║╨░: ╨╝╨░╤В╨╡╤А╨╕╨░╨╗ ╨╝╨╛╨╢╨╜╨╛ ╨┐╤Г╨▒╨╗╨╕╨║╨╛╨▓╨░╤В╤М; ╨┐╨╛╤Б╤В╨╛╤П╨╜╨╜╨░╤П ╤А╤Г╨▒╤А╨╕╨║╨░ тАФ ┬л╨У╨╛╤А╨╛╨┤ ╨║╤А╤Г╨┐╨╜╤Л╨╝ ╨┐╨╗╨░╨╜╨╛╨╝┬╗ (╨▓╨╝╨╡╤Б╤В╨╛ ╨┐╤А╨╡╨╢╨╜╨╡╨│╨╛ ┬л╨Ь╨╡╨╢╨┤╤Г ╤Н╨┐╨╛╤Е╨░╨╝╨╕┬╗).
- Multi-event тЖТ ╤В╨╛╨╗╤М╨║╨╛ `/events/{slug}`, ╨▒╨╡╨╖ `[buy]`.
- ╨б╨▓╨╡╤А╨║╨░ READY (prod): ╨Я╨╛╨╗╨╛╨▓╤Ж╨╛╨▓/╨Т╨╕╨▓╨░╨╗╤М╨┤╨╕ 2700тАУ5100 тВ╜; ╨и╤А╤С╨┤╨╡╤А/╨С╨╡╤В╤Е╨╛╨▓╨╡╨╜ ╨╛╤В 2000 тВ╜; ╨Ф╨╡╤А╨╢╨░╨▓╨╕╨╜ ╨┐╤А╨╕ ╤Б╨▓╨╡╤З╨░╤Е ╨╛╤В 3000 тВ╜ тАФ ╤Ж╨╡╨╜╤Л ╨▓ ╤В╨╡╨║╤Б╤В╨╡ ╤Б╨╛╨▓╨┐╨░╨╗╨╕, ╨┐╤А╨░╨▓╨╛╨║ ╨╜╨╡ ╨┐╨╛╤В╤А╨╡╨▒╨╛╨▓╨░╨╗╨╛╤Б╤М.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ъ╨░╨╜╨╛╨╜ ╨║╨╛╨╗╨╛╨╜╨║╨╕ ╨╛╨▒╨╜╨╛╨▓╨╗╤С╨╜ ╨▓ `02-anna.md` + `personas.json`.
- Slug `muzyka-v-osobnyakah-spb`, `authorId=anna`, `publishedAt=2026-07-19`.
- Event-╤Б╤Б╤Л╨╗╨║╨╕: ╨Т╨╕╨▓╨░╨╗╤М╨┤╨╕/╨Я╨╛╨╗╨╛╨▓╤Ж╨╛╨▓ `tc-69d01bfbee2762c27d4c183a-╨▓╨╕╨▓╨░╨╗╤М╨┤╨╕-╨▓╤А╨╡╨╝╨╡╨╜╨░-╨│╨╛╨┤╨░`; ╨и╤А╤С╨┤╨╡╤А `tc-69f1fae720d81aa098c549a2-тАж-╨▒╨╡╤В╤Е╨╛╨▓╨╡╨╜`; ╨Ь╤П╤Б╨╜╨╕╨║╨╛╨▓ `tc-6a392512b8ea7c7883162f0b-╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╤П-╨┐╨╛-╨╛╤Б╨╛╨▒╨╜╤П╨║╤Г-╨╝╤П╤Б╨╜╨╕╨║╨╛╨▓╨░`; ╨Ф╨╡╤А╨╢╨░╨▓╨╕╨╜ `tc-6a43b6be712a5d192f1793c5-╨▓-╤Б╨▓╨╡╤З╨░╤Е-╤И╨╡╨┤╨╡╨▓╤А╤Л-╨║╨╗╨░╤Б╤Б╨╕╨║╨╕-╨▓-╤Г╤Б╨░╨┤╤М╨▒╨╡-╨┤╨╡╤А╨╢╨░╨▓╨╕╨╜╨░`.
- ╨Ю╨▒╨╗╨╛╨╢╨║╨░ ╤Б╨│╨╡╨╜╨╡╤А╨╕╤А╨╛╨▓╨░╨╜╨░ тЖТ `apps/public/public/images/blog/muzyka-v-osobnyakah-spb.jpg`.
- Commit тЖТ `deploy-prod-next` тЖТ `blog:upsert --slug=muzyka-v-osobnyakah-spb`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╤Л╨╣ dirty worktree (admin audit / blog part 2) тАФ ╨▓ ╨║╨╛╨╝╨╝╨╕╤В ╨║╨╛╨╗╨╛╨╜╨║╨╕ ╨Р╨╜╨╜╤Л ╨╜╨╡ ╨▓╨║╨╗╤О╤З╨░╨╗╨╕ ╤З╤Г╨╢╨╕╨╡ ╨┐╤А╨░╨▓╨║╨╕.

---

## 2026-07-19 тАФ ╨С╨╗╨╛╨│ ╤З╨░╤Б╤В╤М 2 (7 ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╛╨╜╨╜╤Л╤Е ╨│╨╕╨┤╨╛╨▓)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨┐╤А╨╕╤Б╨╗╨░╨╗ 7 ╨┐╨╡╤А╨╡╤А╨░╨▒╨╛╤В╨░╨╜╨╜╤Л╤Е evergreen-╤В╨╡╨║╤Б╤В╨╛╨▓ (┬л╤З╨░╤Б╤В╤М 2┬╗).
- ╨Т╤Б╨╡ multi-event тЖТ ╤В╨╛╨╗╤М╨║╨╛ markdown `/events/{slug}`, ╨▒╨╡╨╖ `[buy]`.
- `spb-razvod-mostov-kakoi-reis` ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕; ╨╛╨▒╨╜╨╛╨▓╨╗╤С╨╜ ╨║╨╛╨╝╨▒╨╕╨╜╨╕╤А╨╛╨▓╨░╨╜╨╜╤Л╨╣ `spb-rooftop-guide`.
- ╨Ъ╨╛╨╗╨╛╨╜╨║╨░ ╨Ь╨░╨║╤Б╨░ `fentezi-fest-bylinnyy-bereg` ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨░╤Б╤М.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ю╨┐╤Г╨▒╨╗╨╕╨║╨╛╨▓╨░╨╜╤Л slug: `kazan-rechnye-progulki`, `moskva-rechnye-progulki-zaryade`, `spb-rooftop-guide`, `spb-stendap-gid`, `moskva-master-klass-emal`, `myuzikly-teatr-novichok-msk-spb`, `spb-planetarium-gid` (`authorId=editorial`).
- ╨б╨▓╨╡╤А╨║╨░ READY: ~40 ╤Б╤Б╤Л╨╗╨╛╨║ ╨╜╨░ ╤Б╨╛╨▒╤Л╤В╨╕╤П; ╤Ж╨╡╨╜╤Л ╤Б╤В╨╡╨╜╨┤╨░╨┐╨░/╨▒╨░╨╗╨╡╤В╨░/╨▓╨╛╨╖╤А╨░╤Б╤В╨░ ╨╛╤А╨│╨░╨╜╨░ ╨┐╨╛╨┐╤А╨░╨▓╨╗╨╡╨╜╤Л ╨┐╨╛ ╨░╤Д╨╕╤И╨╡.
- Commit тЖТ `deploy-prod-next` тЖТ `blog:upsert` ├Ч7.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- READY ╨╜╨░ ╨б╨▓╨╕╤П╨╢╤Б╨║/╨С╨╛╨╗╨│╨░╤А ╨▓ ╨░╤Д╨╕╤И╨╡ ╨╜╨╡╤В тАФ ╨▓ ╤В╨╡╨║╤Б╤В╨╡ ╨╛╤Б╤В╨░╨╗╨╕╤Б╤М ╨▒╨╡╨╖ ╤Б╤Б╤Л╨╗╨╛╨║, ╨╛╤В╤Б╤Л╨╗╨║╨░ ╨║ `/city/kazan`.
- ╨г ╤З╨░╤Б╤В╨╕ ┬л╤В╤А╨╕ ╤А╨░╨╖╨▓╨╛╨┤╨╜╤Л╤Е┬╗ ╨▓ ╨С╨Ф ╨▒╨╕╤В╤Л╨╡ `priceFromRub=10`; ╨┤╨╗╤П ╨│╨╕╨┤╨░ ╨▓╨╖╤П╤В ╨▓╨░╨╗╨╕╨┤╨╜╤Л╨╣ slug ╤Б 1050 тВ╜.

---

## 2026-07-19 тАФ ╨Ч╨░╨║╤А╤Л╤В╨╕╨╡ ╨┤╤Л╤А ╨░╤Г╨┤╨╕╤В╨░ ╨░╨┤╨╝╨╕╨╜╨║╨╕

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ш╤Б╤В╨╛╤З╨╜╨╕╨║ ╨░╤Г╨┤╨╕╤В╨░: canvas `admin-audit` + Diary 2026-07-14; P0 (╨╗╨╕╨╝╨╕╤В 10k / ╨╝╨╡╤В╤А╨╕╨║╨╕ DashboardтЙаEvents) ╤Г╨╢╨╡ ╨▒╤Л╨╗╨╕ ╨╖╨░╨║╤А╤Л╤В╤Л ╤А╨░╨╜╨╡╨╡ (`eventRows(db, null)` + `getCachedAdminGroupedEvents`).
- ╨Ю╤Б╤В╨░╨▓╨░╨╗╨╕╤Б╤М P1: detail ╨▒╨╡╨╖ override/source description, nav stubs, localhost:5178 ╨▓ ╨▒╨░╨╜╨┤╨╗╨╡, canPublish тЙа high readiness.
- ╨Ч╨░╨║╨░╨╖╤Л: 17/18 archived тАФ ╨╜╨╡ ╨▒╨░╨│ sync; `archiveStaleCancelledOrders` ╤Г╨▓╨╛╨┤╨╕╤В cancelled/expired/тАж ╤Б╤В╨░╤А╤И╨╡ 30 ╨┤╨╜╨╡╨╣. Confirmed ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╤В.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `GET /api/admin/events/:id` тЖТ `event` + `override` (LEFT JOIN); UI Content/SEO/Media ╨│╨╕╨┤╤А╨╕╤А╤Г╨╡╤В ╨╕╨╖ detail.
- Lean `eventRows`: `left(e.description, 4000)` ╨▓╨╝╨╡╤Б╤В╨╛ `null`.
- `publishGate` ╤Г╤З╨╕╤В╤Л╨▓╨░╨╡╤В high `readinessIssues` тЖТ blockers тЖТ `canPublish=false`.
- Nav: ╤Г╨▒╤А╨░╨╜╤Л mapping/taxonomy/audit stubs; Cities/Buyers тАФ ╨▒╨╡╨╣╨┤╨╢ ┬л╤В╨╛╨╗╤М╨║╨╛ ╤З╤В╨╡╨╜╨╕╨╡┬╗; Settings ╨▒╨╡╨╖ localhost ╨╕ ╨▒╨╡╨╖ ┬лauth ╨╛╤В╨║╨╗╤О╤З╨╡╨╜╨░┬╗.
- CORS: ╨┤╨╗╤П `/api/admin` ╨╕ sync/db ╨▒╨╛╨╗╤М╤И╨╡ ╨╜╨╡╤В `Access-Control-Allow-Origin: *`.
- ╨в╨╡╤Б╤В╤Л: `auth.test.ts`, `publish-gate.test.ts`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╨╗╨╜╤Л╨╣ SQL read-model ╨┤╨╗╤П Events (╨▒╨╡╨╖ in-memory group) тАФ ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г perf backlog (0.5.8).
- ECR ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╤Б╨║╤А╤Л╤В ╨▓ prod (`VITE_DAIBILET_EVENT_CHANGE_REQUESTS` ╨╜╨╡ ╨▓╨║╨╗╤О╤З╨░╨╡╨╝).

---

## 2026-07-19 тАФ Blog: ╤В╨╛╨╗╤М╨║╨╛ ╤Б╤Б╤Л╨╗╨║╨╕ ╨▓ multi-event + ╤Б╨▓╨╡╤А╨║╨░ ╤Ж╨╡╨╜/meta

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨г╤В╨╛╤З╨╜╨╡╨╜╨╕╨╡ ╨┐╤А╨╛╨┤╤Г╨║╤В╨░: ╨▓ ╨╛╨▒╨╖╨╛╤А╨░╤Е ╤Б ╨╜╨╡╤Б╨║╨╛╨╗╤М╨║╨╕╨╝╨╕ ╤Б╨╛╨▒╤Л╤В╨╕╤П╨╝╨╕ тАФ markdown-╤Б╤Б╤Л╨╗╨║╨╕ ╨╜╨░ `/events/{slug}`, ╨▒╨╡╨╖ `[buy]`. Buy ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П single-offer ╤Б╤В╨░╤В╨╡╨╣.
- ╨Т MD ╤З╨░╤Б╤В╨╛ ╨▒╤Л╨╗╨╕ **╨╗╨░╤В╨╕╨╜╤Б╨║╨╕╨╡** ╤Е╨▓╨╛╤Б╤В╤Л slug, ╨▓ prod READY тАФ **╨║╨╕╤А╨╕╨╗╨╗╨╕╤З╨╡╤Б╨║╨╕╨╡** (╤В╨╛╤В ╨╢╨╡ TC id).
- `priceFromRub=10` ╤Г ╤З╨░╤Б╤В╨╕ ╤А╨╡╨╣╤Б╨╛╨▓ ╨║ ╨Ф╨▓╨╛╤А╤Ж╨╛╨▓╨╛╨╝╤Г/╨в╤А╨╛╨╕╤Ж╨║╨╛╨╝╤Г тАФ ╨░╤А╤В╨╡╤Д╨░╨║╤В; ╤А╨╡╨░╨╗╤М╨╜╤Л╨╣ min offer **1500** / **1300**.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨г╨▒╤А╨░╨╜╤Л ╨▓╤Б╨╡ `[buy]` ╨╕╨╖ ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╛╨╜╨╜╤Л╤Е multi-event ╨│╨╕╨┤╨╛╨▓ ╨╕ ╨║╨╛╨╗╨╛╨╜╨║╨╕ ╨Ь╨░╨║╤Б╨░ `fentezi-fest-bylinnyy-bereg` (╨╛╤Б╤В╨░╨╗╨╕╤Б╤М 2 ╤Б╤Б╤Л╨╗╨║╨╕).
- ╨ж╨╡╨╜╤Л: ╨б╨║╨╗╤П╤А 2500, ╨Ю╤А╨│╨░╨╜ 2000, ╨У╨░╤А╤А╨╕ ╨Я╨╛╤В╤В╨╡╤А from 940, ╨╝╨╛╤Б╤В╤Л 1500, ╨║╨╛╨╝╨╝╤Г╨╜╨░╨╗╨║╨░ 850, ╨в╤А╤Г╨╝╨░╨╜ 400, ╨Ы╨╡╨▒╨╡╨┤╨╕╨╜╨╛╨╡ 2000.
- ┬л╨ж╨╕╤А╨║ ╨Ь╨░╨║╤Б╨╕╨╝╤Г╤Б┬╗ ╨г╤Д╨░: READY slug ╨╜╨╡╤В тЖТ ╤В╨╡╨║╤Б╤В ╨▒╨╡╨╖ ╤Ж╨╡╨╜╤Л/╤Б╤Б╤Л╨╗╨║╨╕, ╨╛╤В╤Б╤Л╨╗╨║╨░ ╨║ `/cities/ufa`.
- Meta seoDescription ╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╤Л ╨▒╨╡╨╖ ╨▓╤А╨░╨╜╤М╤П ╨┐╨╛ ╤Ж╨╡╨╜╨░╨╝; `blog:sync-bodies` + upsert.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨ж╨╕╤А╨║ ╨Ь╨░╨║╤Б╨╕╨╝╤Г╤Б ╨▓ ╨║╨░╤В╨░╨╗╨╛╨│╨╡ ╨╜╨╡ ╨╜╨░╨╣╨┤╨╡╨╜ тАФ ╨╜╨╡ ╨╗╨╕╨╜╨║╤Г╨╡╨╝.
- ╨Я╨╛╤Б╨╗╨╡ ╨┐╤А╨░╨▓╨╛╨║ ╨╜╤Г╨╢╨╡╨╜ deploy Next (static bodies fallback) + `blog:upsert` ╨▓ Article.

---

## 2026-07-19 тАФ ╨Я╨░╨║╨╡╤В ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╛╨╜╨╜╤Л╤Е ╤Б╤В╨░╤В╨╡╨╣ ╨▒╨╗╨╛╨│╨░ (verbatim)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨┐╤А╨╕╤Б╨╗╨░╨╗ 10 ╨┐╨╡╤А╨╡╤А╨░╨▒╨╛╤В╨░╨╜╨╜╤Л╤Е evergreen-╤В╨╡╨║╤Б╤В╨╛╨▓ (╨▒╨╗╨╛╨║ ┬л╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В: ╨┐╨╡╤А╨╡╤А╨░╨▒╨╛╤В╨░╨╜╨╜╤Л╨╡ ╤Б╤В╨░╤В╤М╨╕ ╨▒╨╗╨╛╨│╨░┬╗).
- `spb-razvod-mostov-kakoi-reis` ╤А╨░╨╜╨╡╨╡ ╨▒╤Л╨╗ HIDDEN + 301 тЖТ rooftop; ╨╜╤Г╨╢╨╡╨╜ ╤Б╨╜╨╛╨▓╨░ ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ PUBLISHED slug.
- ╨Ъ╨╛╨╗╨╛╨╜╨║╨░ ╨Ь╨░╨║╤Б╨░ `fentezi-fest-bylinnyy-bereg` ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨░╤Б╤М.
- ╨б╨▓╨╡╤А╨║╨░ ╤Ж╨╡╨╜ ╤Б prod READY (API): ╨▒╨╛╨╗╤М╤И╨╕╨╜╤Б╤В╨▓╨╛ ╤Б╨╛╨▓╨┐╨░╨╗╨╕; ╤А╨░╤Б╤Е╨╛╨╢╨┤╨╡╨╜╨╕╤П ╨╛╤Б╤В╨░╨▓╨╗╨╡╨╜╤Л ╨▓ ╤В╨╡╨║╤Б╤В╨╡ ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤П.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ю╨▒╨╜╨╛╨▓╨╗╨╡╨╜╤Л `content/blog/*.md` + `blog:sync-bodies` + `blog-posts`/`blog-meta` (`authorId=editorial`).
- ╨б╨╜╤П╤В 301 ╤Б `spb-razvod-mostov-kakoi-reis`; rooftop ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨╣ ╤Б╤В╨░╤В╤М╤С╨╣.
- `[buy]` ╤В╨╛╨╗╤М╨║╨╛ ╨╜╨░ ╨╜╨░╨╣╨┤╨╡╨╜╨╜╤Л╨╡ READY slug; ╨╝╤П╨│╨║╨╕╨╡ ╤Б╤Б╤Л╨╗╨║╨╕ ╨╜╨░ `/events/тАж`, ╨│╨╛╤А╨╛╨┤╨░ ╨╕ `/bridges-night` / `/vecherinki-na-teplohode`.
- Commit тЖТ `deploy-prod-next` тЖТ `blog:upsert` ├Ч10.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л / ╤А╨░╤Б╤Е╨╛╨╢╨┤╨╡╨╜╨╕╤П ╤Ж╨╡╨╜ (╤В╨╡╨║╤Б╤В vs ╨║╨░╤А╤В╨╛╤З╨║╨░)

| ╨б╨╛╨▒╤Л╤В╨╕╨╡ | ╨Т ╤В╨╡╨║╤Б╤В╨╡ | ╨Э╨░ prod |
|---------|----------|---------|
| ╨Ш╨│╨╛╤А╤М ╨б╨║╨╗╤П╤А Jazz Classic Community | ╨╛╤В 500 тВ╜ | minPrice **2500** |
| ╨Ю╤А╨│╨░╨╜ ╨▓ ╨Я╨╗╨░╨╜╨╡╤В╨░╤А╨╕╨╕. ╨С╨╡╨╗╤Л╨╡ ╨╜╨╛╤З╨╕ | ╨╛╤В 600 тВ╜ | minPrice **2000** |
| ╨Ь╤Г╨╖╨╡╨╣ ╨У╨░╤А╤А╨╕ ╨Я╨╛╤В╤В╨╡╤А╨░ (╨┤╨╡╤В╤Б╨║╨╕╨╡) | ╨╛╤В 1390 тВ╜ | ╨║╨░╤А╤В╨╛╤З╨║╨░ ╨╝╤Г╨╖╨╡╤П **940** (╨┤╨╡╤В╤Б╨║╨╕╨╣ ╤В╨░╤А╨╕╤Д ╨╝╨╛╨│ ╨╛╤В╨╗╨╕╤З╨░╤В╤М╤Б╤П) |
| ╨Ф╨▓╨╛╤А╤Л/╨┐╨░╤А╨░╨┤╨╜╤Л╨╡ ┬л╨▓╤Е╨╛╨┤┬╗ | ╨╛╤В 590 тВ╜ (╤Б╨║╨╕╨┤╨║╨░) | ╨╡╤Б╤В╤М READY ╨╖╨░ 590; ╤Б╨╛╤Б╨╡╨┤╨╜╨╕╨╡ ┬л╨┤╨▓╨╛╤А╤Л ╨Я╨╡╤В╤А╨╛╨│╤А╨░╨┤╤Б╨║╨╛╨╣┬╗ ╨╛╤В **290** |
| ╨Ъ╨╛╨╝╨╝╤Г╨╜╨░╨╗╨║╨░ ╨▓ ╤Б╨▓╤П╨╖╨║╨╡ ┬л╨┤╨▓╨╛╤А╤Л+╨┐╨░╤А╨░╨┤╨╜╤Л╨╡┬╗ | ╨╛╤В 990 тВ╜ | ╨╛╤В╨┤╨╡╨╗╤М╨╜╨░╤П ┬л╨н╨║╤Б╨║╤Г╤А╤Б╨╕╤П ╨┐╨╛ ╨║╨╛╨╝╨╝╤Г╨╜╨░╨╗╤М╨╜╤Л╨╝┬╗ ╨╛╤В **850** |
| ╨Э╨╛╤З╨╜╨░╤П ╨┐╤А╨╛╨│╤Г╨╗╨║╨░ ╨║ ╨Ф╨▓╨╛╤А╤Ж╨╛╨▓╨╛╨╝╤Г/╨в╤А╨╛╨╕╤Ж╨║╨╛╨╝╤Г | ╨╛╤В 1100 тВ╜ | ╨▒╨╗╨╕╨╢╨░╨╣╤И╨╕╨╣ READY ┬л╨║ ╨Ф╨▓╨╛╤А╤Ж╨╛╨▓╨╛╨╝╤Г ╨╕ ╨в╤А╨╛╨╕╤Ж╨║╨╛╨╝╤Г┬╗ **1500** |
| ┬л╨ж╨╕╤А╨║ ╨Ь╨░╨║╤Б╨╕╨╝╤Г╤Б┬╗ (╨г╤Д╨░) | ╨╛╤В 1200 тВ╜ | READY slug **╨╜╨╡ ╨╜╨░╨╣╨┤╨╡╨╜** (╤В╨╡╨║╤Б╤В ╨▒╨╡╨╖ buy) |

---

## 2026-07-19 тАФ ╨Ъ╨░╨╜╨╛╨╜ ╨Ь╨░╨║╤Б╨░ ╨╖╨░╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜: ┬л╨е╨╡╨╣, ╤З╨╕╤В╨░╤В╨╡╨╗╨╕!┬╗

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╤Л╨╣ ╨░╨│╨╡╨╜╤В ╤Д╨╕╨╗╤М╤В╤А╨╛╨▓ ╨▓╨╡╤А╨╜╤Г╨╗ ╤Б╤В╨░╤А╤Л╨╣ ╨║╨░╨╜╨╛╨╜ ┬л╨н╨╣, ╨║╤В╨╛ ╨╜╨░ ╨╝╨░╤А╤И╤А╤Г╤В╨╡!┬╗ / ┬л╨Я╤Г╤В╨╡╤И╨╡╤Б╤В╨▓╤Г╨╣╤В╨╡тАж┬╗ ╨╕ open-air PUBLISHED тАФ ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨╛╤В╨▓╨╡╤А╨│.
- ╨Э╨░ ╨┐╤А╨╛╨┤╨╡ ╨╜╤Г╨╢╨╡╨╜ ╨┐╨╛╨╗╨╜╤Л╨╣ ╤В╨╡╨║╤Б╤В `fentezi-fest-bylinnyy-bereg` + `[buy]` ╨╜╨░ ╨┤╨▓╨░ TC-╤Б╨╛╨▒╤Л╤В╨╕╤П.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `01-max.md` / `personas.json` / README: ╨║╨░╨╜╨╛╨╜ ╤В╨╛╨╗╤М╨║╨╛ ┬л╨е╨╡╨╣, ╤З╨╕╤В╨░╤В╨╡╨╗╨╕!┬╗ тЖТ ┬л╨Ь╨╕╤А ╨╗╤Г╤З╤И╨╡ ╨▓╨╕╨┤╨╡╤В╤М ╤Б╨▓╨╛╨╕╨╝╨╕ ╨│╨╗╨░╨╖╨░╨╝╨╕!┬╗; ┬л╨н╨╣тАж┬╗ ╨▓ ╤Б╨┐╨╕╤Б╨║╨╡ ╨╖╨░╨┐╤А╨╡╤Й╤С╨╜╨╜╤Л╤Е.
- Upsert: fest PUBLISHED (6699 chars, has_hey/buy/mir), open-air HIDDEN.
- Prod HTML verified: has_hey=true, has_ey=false, buy labels/slugs present; open-air 404.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Concurrent `next build` ╨╜╨░ 4GB RAM тЖТ ENOENT pages-manifest / OOM; ╨╜╤Г╨╢╨╡╨╜ flock + stop web ╨╜╨░ ╨▓╤А╨╡╨╝╤П ╨▒╨╕╨╗╨┤╨░.

---

## 2026-07-19 тАФ ╨Я╤А╨╛╨┤-verify: ╨║╨░╨╜╨╛╨╜ ╨Ь╨░╨║╤Б╨░ ╨╜╨░ `fentezi-fest-bylinnyy-bereg`

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ц╨░╨╗╨╛╨▒╨░: ╨╜╨░ ╨┐╤А╨╛╨┤╨╡ ╤П╨║╨╛╨▒╤Л ╨╡╤Й╤С ┬л╨н╨╣, ╨║╤В╨╛ ╨╜╨░ ╨╝╨░╤А╤И╤А╤Г╤В╨╡┬╗ (╨║╨╛╤А╨╛╤В╨║╨╕╨╣ ╤З╨╡╤А╨╜╨╛╨▓╨╕╨║). Curl + DB ╨┐╨╛╤Б╨╗╨╡ upsert ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╤О╤В ╨┐╨╛╨╗╨╜╤Л╨╣ ╨║╨░╨╜╨╛╨╜.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╨╛╨▓╤В╨╛╤А╨╜╤Л╨╣ `blog:upsert --slug=fentezi-fest-bylinnyy-bereg` + revalidate paths/tags.
- DB: `has_hey=true`, `has_ey=false`, `has_mir=true`, `has_buy=true`, ~6699 chars.
- `docs/Project.md`: ╨║╨░╨╜╨╛╨╜ ╨Ь╨░╨║╤Б╨░ ╨┐╤А╨╕╨▓╨╡╨┤╤С╨╜ ╨║ ┬л╨е╨╡╨╣, ╤З╨╕╤В╨░╤В╨╡╨╗╨╕!┬╗ / ┬л╨Ь╨╕╤А ╨╗╤Г╤З╤И╨╡ ╨▓╨╕╨┤╨╡╤В╤М ╤Б╨▓╨╛╨╕╨╝╨╕ ╨│╨╗╨░╨╖╨░╨╝╨╕!┬╗.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В (smoke curl OK).

---

## 2026-07-19 тАФ ╨д╨╛╤А╨╝╨░╤В ┬л╨а╨╡╨┤╨░╨║╤Ж╨╕╤П┬╗ + rewrite 4 ╨│╨╕╨┤╨╛╨▓

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨╖╨░╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╗ ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ ╤Д╨╛╤А╨╝╨░╤В ╨╛╨▒╤Й╨╕╤Е ╤Б╤В╨░╤В╨╡╨╣ (╨╜╨╡ ╨║╨╛╨╗╨╛╨╜╨║╨╕): ╨▒╨╡╨╖ ╨┐╤А╨╕╨▓╨╡╤В╤Б╤В╨▓╨╕╨╣ ╨┐╨╡╤А╤Б╨╛╨╜, ╨┐╨╛╨╝╨╛╤Й╤М ╨▓ ╨▓╤Л╨▒╨╛╤А╨╡, ╤З╨╡╤Б╤В╨╜╤Л╨╡ ╨╛╨│╨╛╨▓╨╛╤А╨║╨╕, ╤П╤Б╨╜╤Л╨╣ ╨▓╤Л╨▓╨╛╨┤.
- ╨з╨╡╤В╤Л╤А╨╡ ╤В╨╡╨║╤Б╤В╨░ ╨╜╨░ ╨╖╨░╨╝╨╡╨╜╤Г: ╨║╤А╤Л╤И╨╕+╨╝╨╛╤Б╤В╤Л, ╨┤╨╡╤В╨╕, ╨┤╨╢╨░╨╖, ╨╝╨╡╤Б╤В╨░ ╨▓ ╨╖╨░╨╗╨╡.
- `spb-rooftop-guide` ╨╕ `spb-razvod-mostov-kakoi-reis` ╨┐╨╡╤А╨╡╤Б╨╡╨║╨░╨╗╨╕╤Б╤М ╨┐╨╛ ╤В╨╡╨╝╨╡ ╨╝╨╛╤Б╤В╨╛╨▓.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨╛╨║╤Г╨╝╨╡╨╜╤В ╤Д╨╛╤А╨╝╨░╤В╨░: `docs/ai-journalists/00-editorial.md`.
- ╨Ю╨▒╨╜╨╛╨▓╨╗╨╡╨╜╤Л MD + ╤Б╤В╨░╤В╨╕╨║╨░ ╨┤╨╗╤П 4 slug; `kuda-poyti-s-detmi` тЖТ `authorId=editorial`.
- `spb-razvod-mostov-kakoi-reis` тЖТ HIDDEN + 301 ╨▓ `blog/[slug]/page.tsx` тЖТ `/blog/spb-rooftop-guide`.
- Soft-╤Б╤Б╤Л╨╗╨║╨╕ ╨╜╨░ READY ╤Б╨╛╨▒╤Л╤В╨╕╤П + `[buy]` (MVP ╤Г╨╢╨╡ ╨╡╤Б╤В╤М): ╨║╤А╤Л╤И╨░, 5 ╨╝╨╛╤Б╤В╨╛╨▓, ╨╝╨╛╤А╤П╨║╨╕, ╨┤╨╢╨╡╨╝, ╨б╨║╨╗╤П╤А.
- `publishedAt` ╨╜╨╡ ╤Б╨▒╤А╨░╤Б╤Л╨▓╨░╨╡╨╝ (upsert coalesce).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-19 тАФ ╨Ъ╨╛╨╗╨╛╨╜╨║╨░ ╨Ь╨░╨║╤Б╨░: ╨┐╨╛╨╗╨╜╤Л╨╣ ╤В╨╡╨║╤Б╤В + `[buy]` shortcode

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ъ╨╛╤А╨╛╤В╨║╨╕╨╣ ╤З╨╡╤А╨╜╨╛╨▓╨╕╨║ ╨╜╨░ `fentezi-fest-bylinnyy-bereg` (fe99420) ╨╛╤В╨▓╨╡╤А╨│╨╜╤Г╤В: ╨╜╤Г╨╢╨╡╨╜ ╨┐╨╛╨╗╨╜╤Л╨╣ ╨║╨░╨╜╨╛╨╜ ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤П (┬л╨е╨╡╨╣, ╤З╨╕╤В╨░╤В╨╡╨╗╨╕!┬╗ тЖТ ┬л╨Ь╨╕╤А ╨╗╤Г╤З╤И╨╡ ╨▓╨╕╨┤╨╡╤В╤М ╤Б╨▓╨╛╨╕╨╝╨╕ ╨│╨╗╨░╨╖╨░╨╝╨╕!┬╗).
- ╨Э╤Г╨╢╨╜╨░ ╨┐╨╛╨║╤Г╨┐╨║╨░ ╨╕╨╖ ╤Б╤В╨░╤В╤М╨╕ ╨▒╨╡╨╖ MDX: ╨┐╨░╤А╤Б╨╡╤А shortcode ╨║╨░╨║ ╤Г `[CTA]` / `[image]`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╨╡╤А╨╡╨╖╨░╨┐╨╕╤Б╨░╨╜ `content/blog/fentezi-fest-bylinnyy-bereg.md` ╨┐╨╛╨╗╨╜╤Л╨╝ ╤В╨╡╨║╤Б╤В╨╛╨╝ ╨Ь╨░╨║╤Б╨░; ╨┤╤Г╨▒╨╗╨╕ (`*-volhov`, `bylinnyy-bereg-fentezi-fest`, `open-air-festy-vyhodnoi-ru`) тЖТ HIDDEN.
- MVP `[buy slug="тАж" label="тАж"]` тЖТ `BlogBuyButton.client.tsx` тЖТ `LandingPurchaseButton` / fallback `/events/{slug}`.
- ╨Ъ╨╜╨╛╨┐╨║╨╕: `tc-6a08d60c3aa2e7a8469953dc-bylinnyi-bereg-2026`, `tc-6a0a1d4d69c61af2fb0eb202-fentezi-fest-2026`.
- ╨Ъ╨░╨╜╨╛╨╜ ╨Ь╨░╨║╤Б╨░ ╨▓ `01-max.md` / `personas.json`: ╨┐╤А╨╕╨▓╨╡╤В╤Б╤В╨▓╨╕╨╡ ┬л╨е╨╡╨╣, ╤З╨╕╤В╨░╤В╨╡╨╗╨╕!┬╗, ╤Д╨╕╨╜╨░╨╗ ┬л╨Ь╨╕╤А ╨╗╤Г╤З╤И╨╡ ╨▓╨╕╨┤╨╡╤В╤М ╤Б╨▓╨╛╨╕╨╝╨╕ ╨│╨╗╨░╨╖╨░╨╝╨╕!┬╗.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╤В.

---

## 2026-07-19 тАФ ╨Ъ╨╛╨╗╨╛╨╜╨║╨░ ╨Ь╨░╨║╤Б╨░: rewrite тЖТ `fentezi-fest-bylinnyy-bereg`

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╕╨╗╨╛╤В `open-air-festy-vyhodnoi-ru` (╨┐╨╡╤Б╨╛╨║ + ╨Р╨▓╤В╨╛╨┤╤А╨╛╨╝) ╨╛╤В╨▓╨╡╤А╨│╨╜╤Г╤В ╨║╨░╨║ ┬л╨╜╨░╨▒╨╛╤А ╨▒╤Г╨║╨▓┬╗; ╨╜╤Г╨╢╨╜╨░ ╨╛╨┤╨╜╨░ ╤Б╨▓╤П╨╖╨╜╨░╤П ╨╕╤Б╤В╨╛╤А╨╕╤П.
- ╨Т ╨░╤Д╨╕╤И╨╡ ╨╢╨╕╨▓╤Л╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╤П: ╨С╤Л╨╗╨╕╨╜╨╜╤Л╨╣ ╨С╨╡╤А╨╡╨│ 2026 ╨╕ ╨д╤Н╨╜╤В╨╡╨╖╨╕ ╨д╨╡╤Б╤В 2026 тАФ ╨╛╨┤╨╜╨░ ╨┐╨╗╨╛╤Й╨░╨┤╨║╨░ ╤Г ╨Ч╨░╤Е╨░╤А╤М╨╕╨╜╨╛ (╨Т╨╛╨╗╤Е╨╛╨▓), ╤Б╨╛╤Б╨╡╨┤╨╜╨╕╨╡ ╨┤╨░╤В╤Л, ╨╛╨┤╨╜╨╕ ╨╛╤А╨│╨░╨╜╨╕╨╖╨░╤В╨╛╤А╤Л.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Э╨╛╨▓╨░╤П ╨║╨╛╨╗╨╛╨╜╨║╨░ `fentezi-fest-bylinnyy-bereg` (╨Ь╨░╨║╤Б): 4 ╨░╨▒╨╖╨░╤Ж╨░ + ╤Д╨╕╨╜╨░╨╗, ~1430 ╨╖╨╜╨░╨║╨╛╨▓ visible; ╨║╨░╨╜╨╛╨╜ ┬л╨н╨╣, ╨║╤В╨╛ ╨╜╨░ ╨╝╨░╤А╤И╤А╤Г╤В╨╡!┬╗ / ┬л╨Я╤Г╤В╨╡╤И╨╡╤Б╤В╨▓╤Г╨╣╤В╨╡. ╨Ю╨╜╨╛ ╤В╨╛╨│╨╛ ╤Б╤В╨╛╨╕╤В┬╗.
- ╨б╤В╨░╤А╤Л╨╣ `open-air-festy-vyhodnoi-ru` тЖТ `status: HIDDEN` (MD + upsert).
- ╨Э╨╛╨▓╤Л╨╡ ╨╛╨▒╨╗╨╛╨╢╨║╨░/inline; byline ╨▓ `BlogArticleHero` ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╡╤В `authorName` (╨Ь╨░╨║╤Б), ╨╜╨╡ ╤В╨╕╨┐ ┬л╨Ъ╨╛╨╗╨╛╨╜╨║╨░┬╗.
- ╨Я╤Г╨▒╨╗╨╕╨║╨░╤Ж╨╕╤П: commit тЖТ push тЖТ `deploy-prod-next.sh` тЖТ `blog:upsert` ╨╛╨▒╨╛╨╕╤Е slug.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Pseudo-city `regions` ╨┤╨╗╤П ╨Э╨╛╨▓╨│╨╛╤А╨╛╨┤╤Б╨║╨╛╨╣ ╨╛╨▒╨╗╨░╤Б╤В╨╕ ╨▓ ╤Д╨╕╨╗╤М╤В╤А╨╡ ╨▒╨╗╨╛╨│╨░ (╨╜╨╡╤В ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨│╨╛ City slug ╨▓ ╨║╨░╤А╤В╨╛╤З╨║╨╡).

---

## 2026-07-19 тАФ ╨С╨╗╨╛╨│: ╤Д╨╕╨╗╤М╤В╤А╤Л ╨│╨╛╤А╨╛╨┤+╨░╨▓╤В╨╛╤А + ╨║╨░╨╜╨╛╨╜ ╨┐╤А╨╕╨▓╨╡╤В╤Б╤В╨▓╨╕╤П ╨Ь╨░╨║╤Б╨░

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ `/blog` ╨╜╤Г╨╢╨╜╤Л ╤И╨░╤А╨╕╤А╤Г╨╡╨╝╤Л╨╡ ╤Д╨╕╨╗╤М╤В╤А╤Л; ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ ┬л╤В╨╕╨┐ ╤Б╤В╨░╤В╤М╨╕┬╗ ╨┤╤Г╨▒╨╗╨╕╤А╤Г╨╡╤В ╨│╨╛╨╗╨╛╤Б ╨░╨▓╤В╨╛╤А╨░ (╨║╨╛╨╗╨╛╨╜╨║╨░ = ╨Ь╨░╨║╤Б ╨╕ ╤В.╨┐.).
- ┬л╨Ъ╨░╤Б╨░╤В╨╕╨║╨╕, ╨┐╤А╨╕╨▓╨╡╤В┬╗ ╤Б╨╗╨╕╤И╨║╨╛╨╝ ╨▒╨╗╨╕╨╖╨║╨╛ ╨║ ╨╝╨░╤А╨║╨╡╤А╤Г ╨Я╤В╤Г╤И╨║╨╕╨╜╨░ тАФ ╤А╨╕╤Б╨║ ╨┐╨╗╨░╨│╨╕╨░╤В╨░.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Prisma: `Article.authorId` / `authorName` / `articleType` + ╨╝╨╕╨│╤А╨░╤Ж╨╕╤П ╤Б backfill ╨┐╨╛ slug.
- UI: ╨┤╨▓╨░ ╤Д╨╕╨╗╤М╤В╤А╨░ тАФ **╨У╨╛╤А╨╛╨┤** ╨╕ **╨Р╨▓╤В╨╛╤А** (╨╕╨╝╨╡╨╜╨░: ╨Ь╨░╨║╤Б, ╨Р╨╜╨╜╨░, ╨Х╨╗╨╡╨╜╨░, ╨а╨╡╨┤╨░╨║╤Ж╨╕╤ПтАж); query `?city=&author=`.
- ╨Ъ╨░╨╜╨╛╨╜ ╨Ь╨░╨║╤Б╨░: ╨┐╤А╨╕╨▓╨╡╤В╤Б╤В╨▓╨╕╨╡ **┬л╨н╨╣, ╨║╤В╨╛ ╨╜╨░ ╨╝╨░╤А╤И╤А╤Г╤В╨╡!┬╗**; ╨┐╤А╨╛╤Й╨░╨╜╨╕╨╡ ┬л╨Я╤Г╤В╨╡╤И╨╡╤Б╤В╨▓╤Г╨╣╤В╨╡. ╨Ю╨╜╨╛ ╤В╨╛╨│╨╛ ╤Б╤В╨╛╨╕╤В┬╗ ╨╛╤Б╤В╨░╨▓╨╗╨╡╨╜╨╛.
- ╨Ю╨▒╨╜╨╛╨▓╨╗╨╡╨╜╤Л `01-max.md`, `personas.json`, ╤Б╤В╨░╤В╤М╤П `open-air-festy-vyhodnoi-ru`, upsert/DTO.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Pseudo-╨│╨╛╤А╨╛╨┤╨░ `regions` / `multi` ╨┤╨╗╤П ╤Д╨╕╨╗╤М╤В╤А╨░ (╨╜╨╡╤В ╤Б╤В╤А╨╛╨║╨╕ ╨▓ `City`) тАФ ╨╝╨░╨┐╨┐╨╕╨╜╨│ ╨▓ DTO ╨┐╨╛ slug.

---

## 2026-07-19 тАФ ╨Ъ╨╛╨╗╨╛╨╜╨║╨░ ╨Ь╨░╨║╤Б╨░: `open-air-festy-vyhodnoi-ru`

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╡╤А╨▓╤Л╨╣ ╨┐╨╕╨╗╨╛╤В ┬л╨Ш╨╖╨╜╨░╨╜╨║╨░ ╨╝╨░╤А╤И╤А╤Г╤В╨░┬╗: open-air ╨▓╤Л╤Е╨╛╨┤╨╜╨╛╨│╨╛ (╨┐╨╡╤Б╤З╨░╨╜╤Л╨╣ ╤Д╨╡╤Б╤В + ╨Р╨▓╤В╨╛╨┤╤А╨╛╨╝ ╨д╨╡╤Б╤В ╨╕╨╖ ╨╢╨╕╨▓╨╛╨╣ ╨░╤Д╨╕╤И╨╕).
- ╨д╨╛╤А╨╝╨░: 4тАУ5 ╨░╨▒╨╖╨░╤Ж╨╡╨▓, ~1200тАУ1800 ╨╖╨╜╨░╨║╨╛╨▓, ╨╛╨▒╨╗╨╛╨╢╨║╨░ + inline, ╨║╨░╨╜╨╛╨╜ ╨┐╤А╨╕╨▓╨╡╤В╤Б╤В╨▓╨╕╤П/╤Д╨╕╨╜╨░╨╗╨░ ╨Ь╨░╨║╤Б╨░ + ╨┐╤А╨╕╤С╨╝╤Л Perito (╨▓╨╡╤А╨┤╨╕╨║╤В, ╨╕╨╖╨╜╨░╨╜╨║╨░, ╨╗╨░╨╣╤Д╤Е╨░╨║, ╨▓╨╕╨┤╨╢╨╡╤В).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- MD `content/blog/open-air-festy-vyhodnoi-ru.md` (`authorId=max`); ╨║╨░╤А╤В╨╛╤З╨║╨╕ web+public; `blog:sync-bodies`.
- ╨Я╨╡╤А╨╡╨┐╨╕╤Б╤М ╨┐╨╛╨┤ ╤Б╤В╨░╨╜╨┤╨░╤А╤В ┬з ┬л╨а╨╡╤Д╨╡╤А╨╡╨╜╤Б Perito┬╗ ╨▓ `01-max.md` (╨░╨╗╤М╤В╨╡╤А╨╜╨░╤В╨╕╨▓╨░ ╤З╨╡╨║╨╗╨╕╤Б╤В╤Г, ┬л╨╜╨╛╤А╨╝ ╨╜╨╛ ╨╜╨╡ ╨╜╨╛╤А╨╝┬╗, ╨╕╨╖╨╜╨░╨╜╨║╨░ ╤А╤П╨┤╨╛╨╝ ╤Б ╨║╨░╨╣╤Д╨╛╨╝, CTA ╨▓ ╨▓╨╕╨┤╨╢╨╡╤В).
- ╨Ъ╨░╤А╤В╨╕╨╜╨║╨╕ ╨▓ `apps/public/public/images/blog/` (+ sync web).
- ╨Я╤Г╨▒╨╗╨╕╨║╨░╤Ж╨╕╤П: commit тЖТ push тЖТ `deploy-prod-next.sh` тЖТ `blog:upsert --slug=open-air-festy-vyhodnoi-ru`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- UI byline ╨┐╨╛ `authorId` ╨╡╤Й╤С ╨╜╨╡╤В тАФ ╨╝╨╡╤В╨░╨┤╨░╨╜╨╜╤Л╨╡ ╤В╨╛╨╗╤М╨║╨╛ ╨▓ frontmatter.

---

## 2026-07-19 тАФ ╨а╨╡╤Д╨╡╤А╨╡╨╜╤Б Perito тЖТ ╨║╨╛╨╗╨╛╨╜╨║╨░ ╨Ь╨░╨║╤Б╨░ (╤Б╨╛╨▒╤Л╤В╨╕╤П/╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨┤╨░╨╗ ╤А╨╡╤Д╨╡╤А╨╡╨╜╤Б [Perito / ╨Я╤В╤Г╤И╨║╨╕╨╜ тАФ ╨С╨░╨╗╨║╨░╨╜╤Л](https://perito.media/posts/ptushkin-balcans): ╤Б╨╕╨╗╤М╨╜╤Л╨╡ ╤Б╤В╨╛╤А╨╛╨╜╤Л тАФ ╤А╨╕╤В╨╝ ╨║╨╛╤А╨╛╤В╨║╨╕╤Е ╨▒╨╗╨╛╨║╨╛╨▓, ╤З╨╡╤Б╤В╨╜╤Л╨╣ ╨▓╨╡╤А╨┤╨╕╨║╤В, ╨▒╤Л╤В╨╛╨▓╨░╤П ╨┤╨╡╤В╨░╨╗╤М, ╤Д╨╛╤В╨╛ ╨╜╨░ ╤Б╨╡╨║╤Ж╨╕╤О, ╤А╨░╨╖╨│╨╛╨▓╨╛╤А╨╜╤Л╨╣ ╤В╨╛╨╜ ╨▒╨╡╨╖ PR.
- ╨Э╤Г╨╢╨╜╨╛ ┬л╨▒╨╗╨╕╨╖╨║╨╛, ╨╜╨╛ ╨┐╨╛ ╤Б╨╛╨▒╤Л╤В╨╕╤П╨╝ ╨╕ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╤П╨╝┬╗, ╨╜╨╡ ╤В╤А╨╡╨▓╨╡╨╗ ╨┐╨╛ ╤Б╤В╤А╨░╨╜╨░╨╝.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Т `docs/ai-journalists/01-max.md` ╨┤╨╛╨▒╨░╨▓╨╗╨╡╨╜╨░ ╤Б╨╡╨║╤Ж╨╕╤П **┬л╨а╨╡╤Д╨╡╤А╨╡╨╜╤Б Perito┬╗**: ╨░╨┤╨░╨┐╤В╨░╤Ж╨╕╤П ╨┐╤А╨╕╤С╨╝╨╛╨▓ (╨╛╤З╨╡╤А╨╡╨┤╤М, ╨│╨╕╨┤, ╨▓╨╕╨┤╨╢╨╡╤В, ╤З╤В╨╛ ╨▓╨╖╤П╤В╤М, ╨╕╨╖╨╜╨░╨╜╨║╨░, ╤Н╨╝╨╛╤Ж╨╕╤П 1.5тАУ2 ╨╝╨╕╨╜).
- System prompt ╨Ь╨░╨║╤Б╨░: 4тАУ5 ╨░╨▒╨╖╨░╤Ж╨╡╨▓, 1200тАУ1800 ╨╖╨╜╨░╨║╨╛╨▓; README + `personas.json` + `content-blog-plan.md` ╤Б╨╕╨╜╤Е╤А╨╛╨╜╨╕╨╖╨╕╤А╨╛╨▓╨░╨╜╤Л.
- ╨з╤Г╨╢╨╛╨╣ ╤В╨╡╨║╤Б╤В ╨╜╨╡ ╨║╨╛╨┐╨╕╤А╤Г╨╡╨╝ тАФ ╤В╨╛╨╗╤М╨║╨╛ ╤Д╨╛╤А╨╝╨░ ╨╕ ╤З╨╡╤Б╤В╨╜╨╛╤Б╤В╤М ╤Г╨│╨╗╨░.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╕╨╗╨╛╤В `open-air-festy-vyhodnoi-ru` ╤Б╤А╨░╨╖╤Г ╨┐╨╕╤Б╨░╨╗╤Б╤П ╨┐╨╛╨┤ ╨╛╨▒╨╜╨╛╨▓╨╗╤С╨╜╨╜╤Л╨╣ ╨║╨░╨╜╨╛╨╜ (Perito-╨┐╤А╨╕╤С╨╝╤Л + System prompt ╨Ь╨░╨║╤Б╨░).

---

## 2026-07-19 тАФ ╨С╨╗╨╛╨│: ╤А╨░╨╖╨╜╨╡╤Б╤В╨╕ publishedAt (7тАУ19 ╨╕╤О╨╗╤П)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╤Б╨╡ 17 PUBLISHED ╤Б╤В╨░╤В╨╡╨╣ ╨╜╨░ prod ╨╕╨╝╨╡╨╗╨╕ ╨┤╨░╤В╤Л ╨╗╨╕╨▒╨╛ ╨╕╤О╨╜╤М╤Б╨║╨╕╨╡ evergreen, ╨╗╨╕╨▒╨╛ ╨┐╨░╤З╨║╤Г ╨╜╨░ 18тАУ19 ╨╕╤О╨╗╤П (4 ╨╜╨╛╨▓╤Л╤Е MD).
- ╨б╨┐╨╕╤Б╨╛╨║ ╨╜╨░ `/blog` ╤Б╨╛╤А╤В╨╕╤А╤Г╨╡╤В╤Б╤П ╨┐╨╛ `Article.publishedAt` ╨╕╨╖ API; static `date` ╨▓ `blog-posts.ts` тАФ fallback.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨а╨░╨▓╨╜╨╛╨╝╨╡╤А╨╜╨╛-╨╡╤Б╤В╨╡╤Б╤В╨▓╨╡╨╜╨╜╨╛ ╤А╨░╨╖╨╜╨╡╤Б╨╡╨╜╤Л ╨┤╨░╤В╤Л **2026-07-07 тАж 2026-07-19**: evergreen ╤А╨░╨╜╤М╤И╨╡, 4 ╤Б╨▓╨╡╨╢╨╕╤Е ╨│╨╕╨┤╨░ ╨▒╨╗╨╕╨╢╨╡ ╨║ ╤Б╨╡╨│╨╛╨┤╨╜╤П.
- ╨Ю╨▒╨╜╨╛╨▓╨╗╨╡╨╜╤Л `apps/web` + `apps/public` `blog-posts.ts`, frontmatter ╨▓ `content/blog/*.md`, ╨┐╤А╤П╨╝╨╛╨╣ `UPDATE` ╨╜╨░ prod.
- `blog:upsert` ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╤В ╤Б╤Г╤Й╨╡╤Б╤В╨▓╤Г╤О╤Й╨╕╨╣ `publishedAt` (coalesce) тАФ ╨┤╨╗╤П ╨┤╨░╤В ╨╜╤Г╨╢╨╡╨╜ SQL/admin PATCH.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╤Б╨╗╨╡ UPDATE ╨╜╤Г╨╢╨╡╨╜ revalidate/cache flush ╨┐╤Г╨▒╨╗╨╕╤З╨╜╨╛╨│╨╛ `/api/public/articles` (TTL ╨║╤Н╤И╨░).

---

## 2026-07-19 тАФ Favicon: ╨▒╨╕╨╗╨╡╤В ╤Б╨╗╨╕╤И╨║╨╛╨╝ ╨╝╨╡╨╗╨║╨╛ ╨▓╨╛ ╨▓╨║╨╗╨░╨┤╨║╨╡

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т tab ╨▒╤А╨░╤Г╨╖╨╡╤А╨░ ╤Б╨╕╨╜╨╕╨╣ ╨▒╨╕╨╗╨╡╤В ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗ ╨║╤А╨╛╤И╨╡╤З╨╜╤Л╨╝: ╨┤╨╕╨░╨│╨╛╨╜╨░╨╗╤М╨╜╤Л╨╣ ╤Б╨╕╨╗╤Г╤Н╤В + ╨▒╨╛╨╗╤М╤И╨╛╨╡ ╨┐╤А╨╛╨╖╤А╨░╤З╨╜╨╛╨╡ ╨┐╨╛╨╗╨╡ (~30тАУ40% ╨╗╨╕╨╜╨╡╨╣╨╜╨╛╨│╨╛ ╤А╨░╨╖╨╝╨╡╤А╨░).
- ╨н╤В╨╛ ╨╕╨╝╨╡╨╜╨╜╨╛ favicon ╨▓╨║╨╗╨░╨┤╨║╨╕, ╨╜╨╡ Google SERP.
- ╨Я╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╤Л╨╣ ╨┤╨╡╨┐╨╗╨╛╨╣ ╨╜╨░ 3.8Gi RAM ╨╗╨╛╨╝╨░╨╗ Next (OOM/SIGTERM) тАФ ╤Б╨░╨╣╤В ╨║╤А╨░╤В╨║╨╛ ╨╛╤В╨┤╨░╨▓╨░╨╗ 502, ╨╖╨░╤В╨╡╨╝ ╨▓╨╛╤Б╤Б╤В╨░╨╜╨╛╨▓╨╗╨╡╨╜.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨г╨▓╨╡╨╗╨╕╤З╨╡╨╜ fill (~90% ╨║╨░╨┤╤А╨░); ╨▓╤А╨╡╨╝╨╡╨╜╨╜╨╛ ╨╜╨░ prod тАФ ╨│╨╛╤А╨╕╨╖╨╛╨╜╤В╨░╨╗╤М╨╜╤Л╨╣ classic ticket (Flaticon-style, `#4A7FD4`), ╤З╤В╨╛╨▒╤Л ╤Г╨▒╤А╨░╤В╤М ┬л╨┐╤Г╨│╨░╤О╤Й╤Г╤О┬╗ ╨╝╨╡╨╗╨║╤Г╤О ╨┤╨╕╨░╨│╨╛╨╜╨░╨╗╤М.
- PNG: 32 / 48 / 96 / apple 180 / 192 / 512 + `favicon.ico`; `site.webmanifest` ╤Б 192+512.
- `layout.tsx` metadata.icons + `manifest: /site.webmanifest`. ╨Я╤А╨╛╨▓╨╡╤А╨╡╨╜╨╛ live: `/favicon-48x48.png`, `/icon-512x512.png`, `/site.webmanifest` тЖТ 200.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Ъ╤Н╤И favicon ╨▓ ╨▒╤А╨░╤Г╨╖╨╡╤А╨╡ ╨░╨│╤А╨╡╤Б╤Б╨╕╨▓╨╜╤Л╨╣ тАФ hard refresh / ╨╜╨╛╨▓╨░╤П ╨▓╨║╨╗╨░╨┤╨║╨░.
- ╨Э╨╡ ╨│╨╛╨╜╤П╤В╤М ╨┤╨▓╨░ `next build`/`deploy-prod-next` ╨╛╨┤╨╜╨╛╨▓╤А╨╡╨╝╨╡╨╜╨╜╨╛ ╨╜╨░ prod (OOM).

---

## 2026-07-19 тАФ Favicon: ╤Б╨╜╨╛╨▓╨░ 45┬░, ╨╜╨╛ ╨║╤А╤Г╨┐╨╜╤Л╨╣ fill

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ ╨╖╨░╨╝╨╡╨╜╤Л ╨╜╨░ ╨│╨╛╤А╨╕╨╖╨╛╨╜╤В╨░╨╗╤М╨╜╤Л╨╣ Flaticon ticket ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨╛╨╢╨╕╨┤╨░╨╡╤В ╤Б╨╜╨╛╨▓╨░ ╨┐╨╛╨▓╨╛╤А╨╛╤В ~45┬░.
- ╨У╨╛╤А╨╕╨╖╨╛╨╜╤В╨░╨╗╤М ╨▒╤Л╨╗╨░ ╨╜╨░╨╝╨╡╤А╨╡╨╜╨╜╨╛╨╣ ╤А╨╡╨░╨║╤Ж╨╕╨╡╨╣ ╨╜╨░ ╨╢╨░╨╗╨╛╨▒╤Г ┬л╨┤╨╕╨░╨│╨╛╨╜╨░╨╗╤М ╨╝╨╡╨╗╨║╨░╤П/╨┐╤Г╨│╨░╤О╤Й╨░╤П┬╗, ╨╜╨╡ ╤Д╨╕╨╜╨░╨╗╤М╨╜╤Л╨╝ ╨╛╤В╨║╨░╨╖╨╛╨╝ ╨╛╤В ╤Г╨│╨╗╨░.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨в╨╛╤В ╨╢╨╡ ╤Б╨╕╨╗╤Г╤Н╤В ticket_1912 / `#4A7FD4`, `rotate(45)` + `scale(0.88)` тЖТ AABB ~88тАУ90% ╨║╨░╨┤╤А╨░, ╨╝╨░╨╗╨╛ padding.
- ╨Я╨╡╤А╨╡╨│╨╡╨╜╨╡╤А╨╕╤А╨╛╨▓╨░╨╜╤Л 32/48/96, apple 180, 192/512, logo-192, ico, svg (`apps/web/public` + legacy `apps/public/public/favicon.svg`).
- layout/manifest ╨▒╨╡╨╖ ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╣.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╤Г╨╢╨╡╨╜ hard refresh / ╨╜╨╛╨▓╨░╤П ╨▓╨║╨╗╨░╨┤╨║╨░ ╨╕╨╖тАС╨╖╨░ ╨║╤Н╤И╨░ favicon.

---

## 2026-07-19 тАФ Favicon: ╨╖╨╡╤А╨║╨░╨╗╤М╨╜╤Л╨╣ ╤Г╨│╨╛╨╗ rotate(-45)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ `rotate(45)` ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╤Г╤В╨╛╤З╨╜╨╕╨╗: ╨╜╤Г╨╢╨╜╨░ **╨┤╤А╤Г╨│╨░╤П ╤Б╤В╨╛╤А╨╛╨╜╨░** ╨┤╨╕╨░╨│╨╛╨╜╨░╨╗╨╕ тЖТ `rotate(-45)`.
- ╨Ъ╤А╤Г╨┐╨╜╤Л╨╣ fill (`scale(0.88)`, ~88тАУ90% ╨║╨░╨┤╤А╨░) ╨╛╤Б╤В╨░╨▓╨╗╤П╨╡╨╝.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- SVG: `translate(24 24) rotate(-45) scale(0.88) translate(-24 -24)` ╨▓ `apps/web/public/favicon.svg` + legacy `apps/public/public/favicon.svg`.
- ╨Я╨╡╤А╨╡╨│╨╡╨╜╨╡╤А╨╕╤А╨╛╨▓╨░╨╜╤Л PNG 32/48/96, apple 180, 192/512, logo-192 ╨╕ `favicon.ico`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Hard refresh / ╨╜╨╛╨▓╨░╤П ╨▓╨║╨╗╨░╨┤╨║╨░ ╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╤М╨╜╤Л тАФ ╨▒╤А╨░╤Г╨╖╨╡╤А╨╜╤Л╨╣ ╨║╤Н╤И favicon ╨╜╨╡ ╨╕╨╜╨▓╨░╨╗╨╕╨┤╨╕╤А╤Г╨╡╤В╤Б╤П ╤Б╨░╨╝.

---

## 2026-07-19 тАФ Favicon: ╨╛╨┐╤В╨╕╤З╨╡╤Б╨║╨╛╨╡ ╤Ж╨╡╨╜╤В╤А╨╕╤А╨╛╨▓╨░╨╜╨╕╨╡ ╨┐╨╛╤Б╨╗╨╡ rotate(-45)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╛ ╨▓╨║╨╗╨░╨┤╨║╨╡ Chrome ╤Б╨╕╨╜╨╕╨╣ ╨▒╨╕╨╗╨╡╤В ╨╛╤Й╤Г╤Й╨░╨╗╤Б╤П **╤Б╨╝╨╡╤Й╤С╨╜╨╜╤Л╨╝ ╨▓╨╗╨╡╨▓╨╛-╨▓╨▓╨╡╤А╤Е**.
- AABB ╨┐╨╛╤Б╨╗╨╡ `rotate(-45) scale(0.88)` ╨│╨╡╨╛╨╝╨╡╤В╤А╨╕╤З╨╡╤Б╨║╨╕ ╨┐╨╛ ╤Ж╨╡╨╜╤В╤А╤Г (╤А╨░╨▓╨╜╤Л╨╡ pad), ╨╝╨░╤Б╤Б╨░ ╨┐╨╛╤З╤В╨╕ ╨▓ ╤Ж╨╡╨╜╤В╤А╨╡; ╨▓╨╕╨╖╤Г╨░╨╗╤М╨╜╤Л╨╣ ╤Б╨┤╨▓╨╕╨│ ╨┤╨░╤С╤В ╨╛╨┐╤В╨╕╨║╨░: ╨┐╨╛╨╗╨╜╤Л╨╡ ╤Г╨│╨╗╤Л ╨║╨╛╤А╨╛╤В╨║╨╛╨╣ ╨╛╤Б╨╕ ╤Б╨╝╨╛╤В╤А╤П╤В ╨▓ TL/BR, ╨▓╤Л╤А╨╡╨╖╤Л тАФ ╨▓ BL/TR.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ъ╨╛╨╝╨┐╨╡╨╜╤Б╨░╤Ж╨╕╤П ╨┐╨╛╤Б╨╗╨╡ pivot: `translate(24 24) translate(1.2 1.2) rotate(-45) scale(0.88) translate(-24 -24)`.
- ╨Ю╨▒╨╜╨╛╨▓╨╗╨╡╨╜╤Л SVG (`apps/web/public` + legacy `apps/public/public`) ╨╕ ╨┐╨╡╤А╨╡╨│╨╡╨╜╨╡╤А╨╕╤А╨╛╨▓╨░╨╜╤Л 32/48/96, apple 180, 192/512, logo-192, `favicon.ico`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Hard refresh / ╨╜╨╛╨▓╨░╤П ╨▓╨║╨╗╨░╨┤╨║╨░ тАФ ╨║╤Н╤И favicon ╨▓ Chrome ╨╜╨╡ ╤Б╨▒╤А╨░╤Б╤Л╨▓╨░╨╡╤В╤Б╤П ╤Б╨░╨╝.

---

## 2026-07-19 тАФ ┬л╨Т╤Л╨▒╨╛╤А ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╕┬╗: ╨┤╨╡╨┤╤Г╨┐ combo-family (╨╜╨╡ ╤Г╨▒╨╕╤А╨░╤В╤М ╤Б╨╡╨║╤Ж╨╕╤О)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╤Г╤В╨╛╤З╨╜╨╕╨╗: ╤Б╨╡╨║╤Ж╨╕╤О ┬л╨Т╤Л╨▒╨╛╤А ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╕┬╗ **╨╛╤Б╤В╨░╨▓╨╕╤В╤М**, ╨╜╨╛ ╨╜╨╡ ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╤В╤М ╨┐╨░╤З╨║╤Г near-duplicate ┬л╨Ъ╨╛╨╝╨▒╨╛ 1/2/5/7┬╗ ╨Ь╤Г╨╖╨╡╨╣ ╨У╨░╤А╤А╨╕ ╨Я╨╛╤В╤В╨╡╤А╨░.
- ╨г ╨║╨╛╨╝╨▒╨╛ ╤А╨░╨╖╨╜╤Л╨╡ `groupKey` (`ticketscloud|╨║╨╛╨╝╨▒╨╛ N|тАж`), ╨┐╨╛╤Н╤В╨╛╨╝╤Г ╤Б╤В╨░╤А╤Л╨╣ dedup ╨┐╨╛ groupKey/title ╨╜╨╡ ╤Б╤Е╨╗╨╛╨┐╤Л╨▓╨░╨╗ siblings.
- ╨Я╤А╨╡╨┤╤Л╨┤╤Г╤Й╨░╤П ╨┐╤А╨░╨▓╨║╨░ ╨╛╤И╨╕╨▒╨╛╤З╨╜╨╛ ╨▓╤Л╤А╨╡╨╖╨░╨╗╨░ ╨▓╨╡╤Б╤М ╨▒╨╗╨╛╨║ тАФ ╨╛╤В╨║╨░╤В╨╕╨╗╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨б╨╡╨║╤Ж╨╕╤П `#editors-pick` ╨▓╨╛╨╖╨▓╤А╨░╤Й╨╡╨╜╨░ ╨▓ `HomePageContent` / legacy `App.tsx`.
- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜ `sessionFamilyKey`: ╨╜╨░ ╨╛╨┤╨╜╨╛╨╣ ╨┐╨╗╨╛╤Й╨░╨┤╨║╨╡ ╨▓╤Б╨╡ title ╨▓╨╕╨┤╨░ ┬л╨Ъ╨╛╨╝╨▒╨╛тАж┬╗ тЖТ ╨╛╨┤╨╕╨╜ ╤Б╨╗╨╛╤В; `merge|` groupKey ╤В╨╛╨╢╨╡ family.
- `seenFamilies` ╨▓ shared `HomePickState` ╨┤╨╗╤П editors-pick / home-now / popular.
- ╨д╨░╨╣╨╗╤Л: `home-showcase-sections.ts`, `home-now-section.ts` (web + public).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Ф╨╛╨╗╨│╨╛╤Б╤А╨╛╤З╨╜╨╛ ╨╗╤Г╤З╤И╨╡ ╨┐╤А╨╛╤Б╤В╨░╨▓╨╕╤В╤М `mergeGroupKey=harry-potter-spb` ╨▓ override (╤Б╨║╤А╨╕╨┐╤В ╤Г╨╢╨╡ ╨╡╤Б╤В╤М) тАФ ╤В╨╛╨│╨┤╨░ ╨║╨░╤В╨░╨╗╨╛╨│ ╤Б╨░╨╝ ╤Б╤Е╨╗╨╛╨┐╨╜╨╡╤В siblings.

---

## 2026-07-19 тАФ ╨Ш╨Ш-╨╢╤Г╤А╨╜╨░╨╗╨╕╤Б╤В╤Л: ╨║╨░╨╜╨╛╨╜ ╨Ь╨░╨║╤Б/╨Р╨╜╨╜╨░/╨Х╨╗╨╡╨╜╨░/╨Ш╨│╨╛╤А╤М/╨Р╤А╤В╤Г╤А

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╤Г╤В╨╛╤З╨╜╨╕╨╗: ╨╜╤Г╨╢╨╜╤Л **╨║╨╛╨╗╨╛╨╜╨║╨╕-╤Б╤В╨░╤В╤М╨╕** ╨╕ **╤Б╤В╨╕╨╗╤М ╨┐╨╕╤Б╤М╨╝╨░**, ╨╜╨╡ ┬л╨│╨╛╨╗╨╛╤Б┬╗/╨┐╨╛╨┤╨║╨░╤Б╤В.
- ╨д╨╕╨╜╨░╨╗╤М╨╜╤Л╨╡ System prompt ╨╖╨░╨╝╨╡╨╜╨╕╨╗╨╕ ╨▓╤Л╨╝╤Л╤И╨╗╨╡╨╜╨╜╤Л╨╡ ╨╕╨╝╨╡╨╜╨░ (╨а╨╛╨┤╨╕╨╛╨╜/╨Р╨│╨╗╨░╤П/тАж) ╨╜╨░ ╨Ь╨░╨║╤Б, ╨Р╨╜╨╜╨░, ╨Х╨╗╨╡╨╜╨░, ╨Ш╨│╨╛╤А╤М, ╨Р╤А╤В╤Г╤А.
- ╨г `Article` / `BlogPost` ╨╜╨╡╤В ╨┐╨╛╨╗╤П author тАФ byline ╨┐╨╛╨║╨░ ╤З╨╡╤А╨╡╨╖ docs/frontmatter.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╨╡╤А╨╡╨┐╨╕╤Б╨░╨╜ `docs/ai-journalists/`: `01-max` тАж `05-artur`, `personas.json` v2, README ╨▒╨╡╨╖ ╤В╨╡╤А╨╝╨╕╨╜╨╛╨╗╨╛╨│╨╕╨╕ voice/audio.
- ╨Т ╨║╨░╨╢╨┤╨╛╨╝ ╨┐╤А╨╛╤Д╨╕╨╗╨╡ ╨║╨░╨╜╨╛╨╜╨╕╤З╨╡╤Б╨║╨╕╨╣ ╨▒╨╗╨╛╨║ `## System prompt` ╨┤╨╛╤Б╨╗╨╛╨▓╨╜╨╛; ╤Б╤В╤А╤Г╨║╤В╤Г╤А╨░ ╨╖╨░╨╝╨╡╤В╨║╨╕ тАФ 4 ╨░╨▒╨╖╨░╤Ж╨░.
- ╨Ъ╨╛╨╗╨╛╨╜╨║╨╕: ┬л╨Ш╨╖╨╜╨░╨╜╨║╨░ ╨╝╨░╤А╤И╤А╤Г╤В╨░┬╗, ┬л╨Ь╨╡╨╢╨┤╤Г ╤Н╨┐╨╛╤Е╨░╨╝╨╕┬╗, ┬л╨б╨┐╨╛╨║╨╛╨╣╨╜╤Л╨╣ ╨╝╨░╤А╤И╤А╤Г╤В┬╗, ┬л╨Ь╨╡╤Б╤В╨╛ ╤Б╨╕╨╗╤Л┬╗, ┬л╨Э╨░ ╨▓╨║╤Г╤Б┬╗.
- ╨Я╨╕╨╗╨╛╤В: **╨Р╨╜╨╜╨░** ╨╕╨╗╨╕ **╨Х╨╗╨╡╨╜╨░** тАФ ╨╗╤Г╤З╤И╨╕╨╣ fit ╤Б ╤В╨╡╨║╤Г╤Й╨╡╨╣ ╨░╤Д╨╕╤И╨╡╨╣.
- ╨Ь╨░╤В╨╡╤А╨╕╨░╨╗ ╨╜╨╡ ╨┐╨╕╤Б╨░╤В╤М, ╨┐╨╛╨║╨░ ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨╜╨╡ ╨┤╨░╤Б╤В ╤В╨╡╨╝╤Г.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Fair-use: ╨▓ ╨│╨░╨╣╨┤╨░╤Е ╤В╨╛╨╗╤М╨║╨╛ ╨║╨╛╤А╨╛╤В╨║╨╕╨╡ ╨╝╨░╤А╨║╨╡╤А╤Л/URL; ╨┐╨╛╨╗╨╜╤Л╨╡ ╤З╤Г╨╢╨╕╨╡ ╤В╨╡╨║╤Б╤В╤Л ╨╜╨╡ ╨║╨╛╨┐╨╕╤А╨╛╨▓╨░╤В╤М ╨▓ ╨▒╨╗╨╛╨│.
- Prisma `authorId` ╨╛╤В╨╗╨╛╨╢╨╡╨╜ ╨┤╨╛ ╤А╨╡╨░╨╗╤М╨╜╤Л╤Е ╨║╨╛╨╗╨╛╨╜╨╛╤З╨╜╤Л╤Е ╨┐╤Г╨▒╨╗╨╕╨║╨░╤Ж╨╕╨╣.

---

## 2026-07-19 тАФ ╨Ш╨Ш-╨╢╤Г╤А╨╜╨░╨╗╨╕╤Б╤В╤Л ╨▒╨╗╨╛╨│╨░: ╨┐╨╡╤А╤Б╨╛╨╜╤Л ╨╕ ╤Б╤В╨╕╨╗╨╡╨▓╤Л╨╡ ╨│╨░╨╣╨┤╤Л (╤З╨╡╤А╨╜╨╛╨▓╨╕╨║ ╨╕╨╝╤С╨╜, superseded)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╤Г╨╢╨╜╤Л ╨╜╨╡╤Б╨║╨╛╨╗╤М╨║╨╛ ╤Г╤Б╤В╨╛╨╣╤З╨╕╨▓╤Л╤Е ╨╝╨░╨╜╨╡╤А ╨┐╨╕╤Б╤М╨╝╨░ ╨║╨╛╨╗╨╛╨╜╨╛╨║, ╨░ ╨╜╨╡ ╨╡╨┤╨╕╨╜╤Л╨╣ ┬л╨╜╨╡╨╣╤А╨╛-SEO┬╗ ╤В╨╛╨╜.
- ╨г `Article` / `BlogPost` ╨╜╨╡╤В ╨┐╨╛╨╗╤П author тАФ byline ╨┐╨╛╨║╨░ ╤В╨╛╨╗╤М╨║╨╛ ╤З╨╡╤А╨╡╨╖ docs/frontmatter.
- ╨в╨╡╨║╤Г╤Й╨╕╨╣ ╨║╨░╤В╨░╨╗╨╛╨│ ╤Б╨╕╨╗╤М╨╜╨╡╨╡ ╨╖╨░╨▓╤П╨╖╨░╨╜ ╨╜╨░ ╨Ь╨б╨Ъ/╨б╨Я╨▒ ╨║╤Г╨╗╤М╤В╤Г╤А╤Г, ╤А╨╡╨║╨╕, ╤Б╨╡╨╝╤М╤О, ╤В╨╡╨░╤В╤А/╨▓╤Л╤Б╤В╨░╨▓╨║╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╨╡╤А╨▓╨╕╤З╨╜╤Л╨╣ ╤З╨╡╤А╨╜╨╛╨▓╨╕╨║ ╤Б ╨╕╨╝╨╡╨╜╨░╨╝╨╕ ╨а╨╛╨┤╨╕╨╛╨╜/╨Р╨│╨╗╨░╤П/╨Ь╨╕╨╗╨░/╨в╨╕╤Е╨╛╨╜/╨Я╨░╨▓╨╡╨╗ тАФ **╨╖╨░╨╝╨╡╨╜╤С╨╜** ╨║╨░╨╜╨╛╨╜╨╛╨╝ ╨Ь╨░╨║╤Б/╨Р╨╜╨╜╨░/╨Х╨╗╨╡╨╜╨░/╨Ш╨│╨╛╤А╤М/╨Р╤А╤В╤Г╤А (╤Б╨╝. ╨╖╨░╨┐╨╕╤Б╤М ╨▓╤Л╤И╨╡).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨в╨╡╤А╨╝╨╕╨╜ ┬лvoice┬╗ ╨┐╤Г╤В╨░╨╗ ╤Б ╨░╤Г╨┤╨╕╨╛ тАФ ╤Г╨▒╤А╨░╨╜ ╨▓ ╨┐╨╛╨╗╤М╨╖╤Г ┬л╤Б╤В╨╕╨╗╤М ╨┐╨╕╤Б╤М╨╝╨░ / register┬╗.

---

## 2026-07-19 тАФ Admin group readiness: NO_FUTURE ╨╜╨╡ ╨▒╨╗╨╛╨║╨╕╤А╤Г╨╡╤В ╨┐╤А╨╕ future-sibling

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- `groupAdminEventRows` / UI `groupAdminRows` ╨▒╤А╨░╨╗╨╕ `worstReadiness` ╨┐╨╛ siblings: past-only ╤Б╨╗╨╛╤В ╤Б `NO_FUTURE_SESSIONS` ╨║╤А╨░╤Б╨╕╨╗ ╨▓╤Б╤О ╨║╨░╤А╤В╨╛╤З╨║╤Г ╨║╨░╨║ ┬л╨С╨╗╨╛╨║╨╡╤А┬╗, ╨┤╨░╨╢╨╡ ╨╡╤Б╨╗╨╕ ╨▓ ╨│╤А╤Г╨┐╨┐╨╡ ╨╡╤Б╤В╤М ╨▒╤Г╨┤╤Г╤Й╨╕╨╣ ╤Б╨╡╨░╨╜╤Б.
- Representative `startsAt` = earliest тЖТ ╨┐╨╛╤Б╨╗╨╡ merge ╨╜╨╡╨╗╤М╨╖╤П ╤Б╤Г╨┤╨╕╤В╤М ╨╛ future ╤В╨╛╨╗╤М╨║╨╛ ╨┐╨╛ ╨┐╨╛╨╗╤О ╨│╤А╤Г╨┐╨┐╤Л.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ ╨│╤А╤Г╨┐╨┐╨╕╤А╨╛╨▓╨║╨╕: `finalizeGroupedAdminReadiness` тАФ ╨╡╤Б╨╗╨╕ ╨▓ ╨│╤А╤Г╨┐╨┐╨╡ ╨▒╤Л╨╗ future-╤Б╨╗╨╛╤В, ╤Г╨▒╤А╨░╤В╤М ╤В╨╛╨╗╤М╨║╨╛ `NO_FUTURE_SESSIONS`; ╨┐╤А╨╛╤З╨╕╨╡ high-issues ╨╛╤Б╤В╨░╨▓╨╗╤П╤О╤В `blocked`.
- Backend: merge `readinessIssues`/`readinessCodes` + ╤Д╨╗╨░╨│ `_groupHasFutureSession`; admin UI тАФ ╨╖╨╡╤А╨║╨░╨╗╤М╨╜╨░╤П ╨╗╨╛╨│╨╕╨║╨░.
- Unit: `apps/backend/src/admin-group-readiness.test.ts`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╤Г╨╢╨╡╨╜ ╨┤╨╡╨┐╨╗╨╛╨╣ **API** (dto.js / admin grouped cache), ╨╕╨╜╨░╤З╨╡ prod ╨┐╤А╨╛╨┤╨╛╨╗╨╢╨╕╤В ╨╛╤В╨┤╨░╨▓╨░╤В╤М ╤Б╤В╨░╤А╤Л╨╣ `worstReadiness`. Admin static тАФ ╨╢╨╡╨╗╨░╤В╨╡╨╗╨╡╨╜ ╨┤╨╗╤П ╨║╨╗╨╕╨╡╨╜╤В╤Б╨║╨╛╨│╨╛ regroup, ╨╜╨╛ source of truth тАФ backend cache.

---

## 2026-07-19 тАФ Prod: 4 ╤Б╤В╨░╤В╤М╨╕ + upsert + digest cron

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Deploy `feat/next-monorepo` тЖТ `/opt/daibilet` (SHA `63b6af3`), Next health OK.
- `npm run blog:upsert`: 4 ╤Б╤В╨░╤В╤М╨╕ `PUBLISHED` ╨▓ `Article`; ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╡ URL `/blog/...` тЖТ 200.
- ╨Я╨╡╤А╨▓╤Л╨╣ `blog:weekly-digest`: ╤Б╨╛╨╖╨┤╨░╨╜ `afisha-nedeli-2026-07-18` status=`REVIEW`, public 404 (╨╛╨╢╨╕╨┤╨░╨╡╨╝╨╛).
- Crontab: ╤Б╨╛╤Е╤А╨░╨╜╤С╨╜ `*/10` tc-orders; ╨┤╨╛╨▒╨░╨▓╨╗╨╡╨╜ `0 7 * * 0` blog-weekly-digest.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨░╨╣╨┤╨╢╨╡╤Б╤В **╨╜╨╡** ╨┐╤Г╨▒╨╗╨╕╨║╨╛╨▓╨░╤В╤М ╨░╨▓╤В╨╛╨╝╨░╤В╨╛╨╝ тАФ ╤В╨╛╨╜╨║╨╕╨╣ ╤З╨╡╤А╨╜╨╛╨▓╨╕╨║ (2 ╤Б╨╛╨▒╤Л╤В╨╕╤П, ╨╜╤Г╨╢╨╜╨░ ╤А╨╡╨┤╨░╨║╤В╤Г╤А╨░); ╨┐╤Г╨▒╨╗╨╕╨║╨░╤Ж╨╕╤П ╨▓╤А╤Г╤З╨╜╤Г╤О ╨▓ Admin тЖТ ╨С╨╗╨╛╨│.
- Temp ops-╤Б╨║╤А╨╕╨┐╤В╤Л ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡/╨╗╨╛╨║╨░╨╗╤М╨╜╨╛ ╤Г╨┤╨░╨╗╨╕╤В╤М ╨┐╨╛╤Б╨╗╨╡ ╨┐╤А╨╛╨│╨╛╨╜╨░.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Digest SQL ╤Б╨╡╨╣╤З╨░╤Б ╤Б╨╗╨░╨▒╨╛ ╨╜╨░╨┐╨╛╨╗╨╜╤П╨╡╤В ╨Ь╨б╨Ъ/╨б╨Я╨▒ (0 capital ╨▓ ╨┐╨╡╤А╨▓╨╛╨╝ ╨┐╤А╨╛╨│╨╛╨╜╨╡) тАФ ╨┤╨╛╨╜╨░╤Б╤В╤А╨╛╨╕╤В╤М ╤Д╨╕╨╗╤М╤В╤А city slug / createdAt ╨▓ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╡╨╝ ╤Ж╨╕╨║╨╗╨╡.

---

## 2026-07-19 тАФ 4 ╤Б╤В╨░╤В╤М╨╕ ╨▒╨╗╨╛╨│╨░ + weekly digest

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╤П╤В╤Л╨╣ ╨╖╨░╨│╨╛╨╗╨╛╨▓╨╛╨║ (┬л╨Ъ╨░╨║ ╨║╤Г╨┐╨╕╤В╤М ╨▒╨╕╨╗╨╡╤В ╨╜╨░ ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В╨╡┬╗) ╤Б╨╜╤П╤В ╨┐╨╛ ╤А╨╡╤И╨╡╨╜╨╕╤О ╨┐╤А╨╛╨┤╤Г╨║╤В╨░ тАФ ╨╗╨╕╤И╨╜╨╕╨╣ trust/help.
- ╨Я╤А╨╛╨┤ ╤З╨╕╤В╨░╨╡╤В ╤Б╤В╨░╤В╤М╨╕ ╨╕╨╖ `Article`; ╤Б╤В╨░╤В╨╕╨║╨░ `blog-posts.ts` тАФ ╨║╨░╤А╤В╨╛╤З╨║╨╕ + SSR fallback; ╨┐╨╛╨╗╨╜╤Л╨╣ ╤В╨╡╨║╤Б╤В ╤А╨░╨╜╤М╤И╨╡ ╨▓ fallback ╤Б╨▓╨╛╨┤╨╕╨╗╤Б╤П ╨║ excerpt.
- ╨Ю╨▒╨╗╨╛╨╢╨║╨╕ ╤Н╤В╨░╨╗╨╛╨╜╨╜╨╛ ╨╗╨╡╨╢╨░╤В ╨▓ `apps/public/public/images/blog/` ╨╕ ╨║╨╛╨┐╨╕╤А╤Г╤О╤В╤Б╤П ╨▓ Next public.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ъ╨╛╨╜╤В╨╡╨╜╤В 4 ╤Б╤В╨░╤В╨╡╨╣ ╨▓ `content/blog/*.md`; sync ╤В╨╡╨╗ тЖТ `blog-article-bodies.ts`; upsert тЖТ `npm run blog:upsert`.
- ╨Ю╨▒╨╗╨╛╨╢╨║╨╕ ╤Б╨│╨╡╨╜╨╡╤А╨╕╤А╨╛╨▓╨░╨╜╤Л (1536├Ч1024), ╨┐╨╛╨┤╨║╨╗╤О╤З╨╡╨╜╤Л ╨┐╨╛ slug.
- Weekly digest: `scripts/blog-weekly-digest.js` + `deploy/cron/blog-weekly-digest.sh` (╨▓╤Б 07:00), status=`REVIEW`, ╨▒╨╡╨╖ auto-publish.
- ╨Ф╨╛╨║╤Г╨╝╨╡╨╜╤В╤Л: [content-blog-plan.md](./content-blog-plan.md), [deploy/cron/README.md](../deploy/cron/README.md).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨С╨╡╨╖ ╨┤╨╡╨┐╨╗╨╛╤П ╨╕ `blog:upsert` ╨╜╨░ prod ╨┐╨╛╨╗╨╜╤Л╨╡ ╤В╨╡╨║╤Б╤В╤Л ╨▓ ╨С╨Ф ╨╜╨╡ ╨┐╨╛╤П╨▓╤П╤В╤Б╤П (SSR fallback ╤Г╨╢╨╡ ╨╛╤В╨┤╨░╤С╤В bodies ╨╕╨╖ ╤Б╤В╨░╤В╨╕╨║╨╕).
- ╨Я╨╡╤А╨▓╤Л╨╣ cron-╨┐╤А╨╛╨│╨╛╨╜ ╨┤╨░╨╣╨┤╨╢╨╡╤Б╤В╨░ ╨╜╤Г╨╢╨╜╨╛ ╨┐╨╛╤Б╤В╨░╨▓╨╕╤В╤М ╨▓╤А╤Г╤З╨╜╤Г╤О ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡ (`crontab`).

---

## 2026-07-19 тАФ ╨Ш╨╜╨▓╨╡╨╜╤В╨░╤А╤М ╤Б╤В╨░╤В╨╡╨╣ ╨▒╨╗╨╛╨│╨░ (╨░╨╜╤В╨╕╨┤╤Г╨▒╨╗╨╕)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ф╨▓╨░ ╨╕╤Б╤В╨╛╤З╨╜╨╕╨║╨░ ╨║╨╛╨╜╤В╨╡╨╜╤В╨░: ╤Б╤В╨░╤В╨╕╨║╨░ `apps/web/src/data/blog-posts.ts` ╨╕ prod `Article`.
- ╨Ч╨░╨┐╤А╨╛╤Б ╨║ ╨С╨Ф ╤Б prod: ╨╕╨╖ `/opt/daibilet/apps/backend` + `NODE_PATH=тАж/node_modules` ╨╕ `.cjs` (package `"type":"module"` ╨╗╨╛╨╝╨░╨╡╤В `require` ╨▓ `.js`; `/tmp` + ╨│╨╛╨╗╤Л╨╣ `pg` тАФ ╨╜╨╡╤В).
- ╨б╤В╨░╤В╨╕╨║╨░ ╨╕ ╨С╨Ф: ╨┐╨╛ **13** ╤Б╤В╨░╤В╨╡╨╣, ╨╛╨┤╨╕╨╜╨░╨║╨╛╨▓╤Л╨╡ slug; ╨╖╨░╨│╨╛╨╗╨╛╨▓╨║╨╕ ╨▓ ╨С╨Ф ╤З╤Г╤В╤М ╨┤╨╗╨╕╨╜╨╜╨╡╨╡ SEO-╨▓╨░╤А╨╕╨░╨╜╤В╤Л.
- ╨г╨╢╨╡ ╨╖╨░╨║╤А╤Л╤В╤Л: ╤Б╨╡╨╝╤М╤П, ╨║╨╛╨╜╤Ж╨╡╤А╤В╤Л, ╨┤╨╢╨░╨╖ ╨Ь╨б╨Ъ, ╤А╨╡╨║╨╕ ╨Ь╨б╨Ъ/╨Ъ╨░╨╖╨░╨╜╤М, ╨║╤А╤Л╤И╨╕/╨╝╨╛╤Б╤В╤Л/╨┤╨▓╨╛╤А╤Л/╤Б╤В╨╡╨╜╨┤╨░╨┐/╨┐╨╗╨░╨╜╨╡╤В╨░╤А╨╕╨╣ ╨б╨Я╨▒, ╨░╨▓╤В╨╛╨▒╤Г╤Б ╨Ь╨б╨Ъ, ╤Н╨╝╨░╨╗╤М, ╤А╨╡╨│╨╕╨╛╨╜╤Л.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╤А╨░╨▓╨╕╨╗╨╛ ┬л╨╜╨╡ ╨┐╨╛╨▓╤В╨╛╤А╤П╤В╤М╤Б╤П┬╗ ╨╖╨░╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╨╜╨╛ ╨▓ [content-blog-plan.md](./content-blog-plan.md): ╨╕╨╜╨▓╨╡╨╜╤В╨░╤А╤М ╨╛╨▒╨╛╨╕╤Е ╨╕╤Б╤В╨╛╤З╨╜╨╕╨║╨╛╨▓ + 5 ╨╜╨╛╨▓╤Л╤Е ╨╖╨░╨│╨╛╨╗╨╛╨▓╨║╨╛╨▓ ╨▓╨╜╨╡ ╨╖╨░╨║╤А╤Л╤В╤Л╤Е ╨║╨╗╨░╤Б╤В╨╡╤А╨╛╨▓.
- Temp `tmp-list-articles` ╨┐╨╛╤Б╨╗╨╡ ╨╕╨╜╨▓╨╡╨╜╤В╨░╤А╤П ╤Г╨┤╨░╨╗╤С╨╜ (╨╗╨╛╨║╨░╨╗╤М╨╜╨╛ ╨╕ ╤Б prod).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╤А╨╕ ╤А╨░╤Б╤Е╨╛╨╢╨┤╨╡╨╜╨╕╨╕ ╤Б╤В╨░╤В╨╕╨║╨░тЖФ╨С╨Ф ╨║╨░╤А╤В╨╛╤З╨║╨╕/SEO ╨╝╨╛╨│╤Г╤В ┬л╨┐╨╗╤Л╤В╤М┬╗ тАФ ╨┐╨╡╤А╨╡╨┤ ╨┐╤Г╨▒╨╗╨╕╨║╨░╤Ж╨╕╨╡╨╣ ╨╜╨╛╨▓╤Л╤Е ╤Б╤В╨░╤В╨╡╨╣ ╤Б╨▓╨╡╤А╤П╤В╤М ╨╛╨▒╨░ ╨╕╤Б╤В╨╛╤З╨╜╨╕╨║╨░.

---

## 2026-07-19 тАФ ╨п╨╜╨┤╨╡╨║╤Б.╨Ь╨╡╤В╤А╨╕╨║╨░ ╨╜╨░ ╨┐╤Г╨▒╨╗╨╕╤З╨╜╨╛╨╝ Next

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т `apps/web` ╨╜╨╡ ╨▒╤Л╨╗╨╛ GTM/GA/╨Ь╨╡╤В╤А╨╕╨║╨╕ тАФ ╤В╨╛╨╗╤М╨║╨╛ JSON-LD ╨╕ ╨▓╨╕╨┤╨╢╨╡╤В╤Л TC/TEP.
- Privacy/Legal ╤Г╨╢╨╡ ╤Г╨┐╨╛╨╝╨╕╨╜╨░╤О╤В ╨п╨╜╨┤╨╡╨║╤Б.╨Ь╨╡╤В╤А╨╕╨║╤Г ╨║╨░╨║ ╨▓╨╛╨╖╨╝╨╛╨╢╨╜╤Л╨╣ ╨╕╨╜╤Б╤В╤А╤Г╨╝╨╡╨╜╤В ╨░╨╜╨░╨╗╨╕╤В╨╕╨║╨╕.
- Admin (`apps/admin`) тАФ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛╨╡ ╨┐╤А╨╕╨╗╨╛╨╢╨╡╨╜╨╕╨╡; ╤Б╤З╤С╤В╤З╨╕╨║ ╨╜╤Г╨╢╨╡╨╜ ╤В╨╛╨╗╤М╨║╨╛ ╨╜╨░ daibilet.ru.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ъ╨╗╨╕╨╡╨╜╤В╤Б╨║╨╕╨╣ `YandexMetrika` (`next/script` `afterInteractive`) + `<noscript>` pixel ╨▓ root `layout.tsx`.
- ID: `106786540` (override ╤З╨╡╤А╨╡╨╖ `NEXT_PUBLIC_YANDEX_METRIKA_ID`), init: `ssr`, webvisor, clickmap, ecommerce `dataLayer`, accurateTrackBounce, trackLinks.
- ╨Я╨░╤В╤В╨╡╤А╨╜ env ╨║╨░╨║ ╤Г ╨▓╨╕╨┤╨╢╨╡╤В╨╛╨▓; ╨▓ admin ╨Ь╨╡╤В╤А╨╕╨║╤Г ╨╜╨╡ ╤Б╤В╨░╨▓╨╕╨╝.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨е╨╕╤В╤Л ╨┐╨╛╤П╨▓╤П╤В╤Б╤П ╨▓ ╨║╨░╨▒╨╕╨╜╨╡╤В╨╡ ╨Ь╨╡╤В╤А╨╕╨║╨╕ ╤В╨╛╨╗╤М╨║╨╛ ╨┐╨╛╤Б╨╗╨╡ ╨┤╨╡╨┐╨╗╨╛╤П Next ╨╜╨░ prod; SPA-╨┐╨╡╤А╨╡╤Е╨╛╨┤╤Л App Router ╨┐╤А╨╕ `ssr:true` ╨╛╨▒╤Л╤З╨╜╨╛ ╨╛╨║, ╨┐╤А╨╕ ╤Б╨╛╨╝╨╜╨╡╨╜╨╕╤П╤Е тАФ ╨┐╤А╨╛╨▓╨╡╤А╨╕╤В╤М ┬л╨╛╨╜╨╗╨░╨╣╨╜┬╗ ╨┐╨╛╤Б╨╗╨╡ ╨║╨╗╨╕╨╡╨╜╤В╤Б╨║╨╛╨╣ ╨╜╨░╨▓╨╕╨│╨░╤Ж╨╕╨╕.

---

## 2026-07-19 тАФ ╨б╨║╤А╨╡╨╣╨┐╨╡╤А liliabots.ru ╨║╨╛╨┐╨╕╤А╤Г╨╡╤В ╨░╤Д╨╕╤И╤Г

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т Google ╨▓╤Л╨┤╨░╤З╨╡ `liliabots.ru` ╨╕╨╜╨┤╨╡╨║╤Б╨╕╤А╤Г╨╡╤В ╨║╨░╤А╤В╨╛╤З╨║╨╕ ╤Б ╨▒╤А╨╡╨╜╨┤╨╛╨╝ ┬л╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В┬╗ (title/snippet ╤Б ╤Ж╨╡╨╜╨░╨╝╨╕ ╨╕ ╨┐╨╗╨╛╤Й╨░╨┤╨║╨░╨╝╨╕) тАФ ╨╖╨╡╤А╨║╨░╨╗╨╛/╨┐╨░╤А╤Б╨╡╤А ╨║╨╛╨╜╤В╨╡╨╜╤В╨░.
- ╨Я╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ HTML ╨╕ `/api/public/*` ╨╛╤В╨║╤А╤Л╤В╤Л ╨▒╨╡╨╖ ╤Б╨╡╤Б╤Б╨╕╨╕ (by design MVP); rate limit ╨╜╨░ API ╤Г╨╢╨╡ ╨╡╤Б╤В╤М (60r/m).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `robots.txt`: `User-agent: liliabots|liliabot` тЖТ `Disallow: /`.
- Nginx: `map $daibilet_block_scraper` + `403` ╨╜╨░ `daibilet.ru` / `api.daibilet.ru` (`patch-prod-nginx-scraper-block.py`).
- ╨Я╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╨╛: ╨╢╨░╨╗╨╛╨▒╨░ ╨▓ Google ╨╜╨░ ╨║╨╛╨┐╨╕╤А╨╛╨▓╨░╨╜╨╕╨╡ (Remove outdated content / Legal) тАФ UA-╨▒╨╗╨╛╨║ ╨╜╨╡ ╤Г╨┤╨░╨╗╤П╨╡╤В ╤Г╨╢╨╡ ╨┐╤А╨╛╨╕╨╜╨┤╨╡╨║╤Б╨╕╤А╨╛╨▓╨░╨╜╨╜╤Л╨╡ ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Л ╨╖╨╡╤А╨║╨░╨╗╨░.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨б╨║╤А╨╡╨╣╨┐╨╡╤А ╨╝╨╛╨╢╨╡╤В ╤Е╨╛╨┤╨╕╤В╤М ╤Б ╨┐╨╛╨┤╨┤╨╡╨╗╤М╨╜╤Л╨╝ Chrome UA тАФ ╤В╨╛╨│╨┤╨░ ╨╜╤Г╨╢╨╡╨╜ Cloudflare Bot Fight / WAF ╨╕ ╤Г╨╢╨╡╤Б╤В╨╛╤З╨╡╨╜╨╕╨╡ HTML rate limit.

---

## 2026-07-19 тАФ Cron TC orders-only + ╨║╨╛╨╜╤В╨╡╨╜╤В-╨┐╨╗╨░╨╜ ╨▒╨╗╨╛╨│╨░

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Ч╨╡╤А╨║╨░╨╗╨╛ ╨╖╨░╨║╨░╨╖╨╛╨▓ Ticketscloud ╨╜╨░ prod ╨╜╨╡ ╨╛╨▒╨╜╨╛╨▓╨╗╤П╨╗╨╛╤Б╤М ╤Б 13.07 тАФ sync ╤В╨╛╨╗╤М╨║╨╛ ╤А╤Г╤З╨╜╨╛╨╣, ╨▒╨╡╨╖ cron; ╨║╨░╤В╨░╨╗╨╛╨│ (TEP 6╤З) ╨╖╨░╨║╨░╨╖╤Л ╨╜╨╡ ╤В╤П╨╜╨╡╤В.
- Teplohod orders API ╨▓ ╨╕╨╜╤В╨╡╨│╤А╨░╤Ж╨╕╨╕ ╨╜╨╡ ╨╛╨┐╨╕╤Б╨░╨╜; email-╨┐╨░╤А╤Б╨╕╨╜╨│ ╨╛╤В╨║╨╗╨╛╨╜╤С╨╜ ╨║╨░╨║ MVP-╨┐╤Г╤В╤М.
- ╨С╨╗╨╛╨│ ╨┤╨░╨▓╨╜╨╛ ╨╜╨╡ ╨╛╨▒╨╜╨╛╨▓╨╗╤П╨╗╤Б╤П; ╨╜╤Г╨╢╨╡╨╜ ╨║╨╛╨╜╤В╨╡╨╜╤В-╨┐╨╗╨░╨╜ ╨╕ ╨╡╨╢╨╡╨╜╨╡╨┤╨╡╨╗╤М╨╜╤Л╨╣ ╨┤╨░╨╣╨┤╨╢╨╡╤Б╤В ╨╜╨╛╨▓╤Л╤Е ╤Б╨╛╨▒╤Л╤В╨╕╨╣.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `deploy/cron/tc-orders-sync.sh` + crontab `*/10` ╤В╨╛╨╗╤М╨║╨╛ `npm run tc:orders` (`created_at=from,to`, lookback 3 ╨┤╨╜╤П, flock). ╨Ъ╨░╤В╨░╨╗╨╛╨│ ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╨╝.
- Smoke 2026-07-18: ╨╕╨╝╨┐╨╛╤А╤В╨╕╤А╨╛╨▓╨░╨╜ 1 ╨╖╨░╨║╨░╨╖ TC `done` (╨┐╨╡╤А╨▓╨░╤П ╨▓╨╜╨╡╤И╨╜╤П╤П ╨┐╤А╨╛╨┤╨░╨╢╨░) + 1 ╨▒╨╕╨╗╨╡╤В.
- ╨Ъ╨╛╨╜╤В╨╡╨╜╤В-╨┐╨╗╨░╨╜: [content-blog-plan.md](./content-blog-plan.md) тАФ 5 ╨╖╨░╨│╨╛╨╗╨╛╨▓╨║╨╛╨▓ + ╨┤╨╕╨╖╨░╨╣╨╜ weekly digest тЖТ Article status=`review`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- TEP-╨┐╤А╨╛╨┤╨░╨╢╨╕ ╨▓ ╨░╨┤╨╝╨╕╨╜╨║╨╡ ╨┐╨╛╤П╨▓╤П╤В╤Б╤П ╤В╨╛╨╗╤М╨║╨╛ ╨┐╨╛╤Б╨╗╨╡ partner orders API.
- Auto-publish ╨┤╨░╨╣╨┤╨╢╨╡╤Б╤В╨░ ╨▒╨╡╨╖ ╤А╨╡╨┤╨░╨║╤В╨╛╤А╨░ тАФ ╨╜╨╡ ╨▓╨║╨╗╤О╤З╨░╤В╤М.

---

## 2026-07-18 тАФ Google SERP: favicon + WebSite JSON-LD

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т ╨▓╤Л╨┤╨░╤З╨╡ Google ╤Б╨░╨╣╤В ╨╛╤В╨╛╨▒╤А╨░╨╢╨░╨╗╤Б╤П ╨║╨░╨║ ╤Б╨╡╤А╤Л╨╣ ╨│╨╗╨╛╨▒╤Г╤Б + URL `daibilet.ru` ╨▓╨╝╨╡╤Б╤В╨╛ ┬л╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В┬╗ ╨╕ ╤Ж╨▓╨╡╤В╨╜╨╛╨╣ ╨╕╨║╨╛╨╜╨║╨╕.
- ╨Э╨░ ╨┐╤А╨╛╨┤╨╡ `GET /favicon.ico` тЖТ **404**; ╨▓ HTML ╨╜╨╡ ╨▒╤Л╨╗╨╛ `link rel="icon"` ╤Б PNG.
- SSR JSON-LD `WebSite` + `Organization` ╤Г╨╢╨╡ ╨▒╤Л╨╗ ╨▓ `apps/web/app/layout.tsx`, ╨╜╨╛ `Organization.logo` ╤Г╨║╨░╨╖╤Л╨▓╨░╨╗ ╨╜╨░ ╨╜╨╡╤Б╤Г╤Й╨╡╤Б╤В╨▓╤Г╤О╤Й╨╕╨╣ `/favicon.ico`.
- `robots.txt` ╨╕╨║╨╛╨╜╨║╨╕ ╨╜╨╡ ╨▒╨╗╨╛╨║╨╕╤А╤Г╨╡╤В (`Allow: /`).
- `og:site_name` / title template (`%s | ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В`) ╤Г╨╢╨╡ ╨╖╨░╨┤╨░╨╜╤Л ╨▓ root metadata.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜╤Л ╤Б╤В╨░╨▒╨╕╨╗╤М╨╜╤Л╨╡ PNG: `/favicon-48x48.png`, `/favicon-96x96.png`, `/icon-192x192.png`, `/logo-192x192.png`, `/apple-touch-icon.png` (+ SVG/ICO fallback) ╨▓ `apps/web/public/`.
- ╨Т root `metadata.icons` тАФ `rel="icon"` type `image/png` (48/96/192) ╨╕ apple-touch.
- JSON-LD `Organization.logo` тЖТ `https://daibilet.ru/logo-192x192.png` (192├Ч192); `WebSite.name` = ┬л╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В┬╗, SearchAction ╨╜╨░ `/events?q={search_term_string}`.
- ╨Ф╨╗╤П ╨┐╨╛╤П╨▓╨╗╨╡╨╜╨╕╤П ╨▓ SERP ╨╜╤Г╨╢╨╡╨╜ ╨┤╨╡╨┐╨╗╨╛╨╣ Next + ╨┐╨╡╤А╨╡╨╛╨▒╤Е╨╛╨┤ Google (╨┤╨╜╨╕/╨╜╨╡╨┤╨╡╨╗╨╕).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨С╨╡╨╖ commit/push ╤Б╤В╨░╨╜╨┤╨░╤А╤В╨╜╤Л╨╣ `deploy-prod-next.sh` (git pull) ╨┐╤А╨░╨▓╨║╨╕ ╨╜╨╡ ╨┐╨╛╨┤╤Е╨▓╨░╤В╨╕╤В.

---

## 2026-07-18 тАФ ╨а╤Г╤Б╨╕╤Д╨╕╨║╨░╤Ж╨╕╤П UI ╨░╨┤╨╝╨╕╨╜╨║╨╕

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╛ ╨▓╤Б╨╡╤Е ╤А╨░╨╖╨┤╨╡╨╗╨░╤Е ╨░╨┤╨╝╨╕╨╜╨║╨╕ ╨╛╤Б╤В╨░╨▓╨░╨╗╨╕╤Б╤М ╨░╨╜╨│╨╗╨╕╨╣╤Б╨║╨╕╨╡ ╨▒╨╡╨╣╨┤╨╢╨╕ ╨╕ ╨┐╨╛╨┤╨┐╨╕╤Б╨╕: `imported`, `need attention`, `backend`, `Save`/`Close`, ╤Б╤В╨░╤В╤Г╤Б╤Л `published`/`review`/`auto`, SEO-╨╝╨╡╤В╨║╨╕ `index`/`noindex`, `Override`/`Source`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╨╡╤А╨╡╨▓╨╡╨┤╨╡╨╜╤Л ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М╤Б╨║╨╕╨╡ ╤Б╤В╤А╨╛╨║╨╕ ╨▓ ╤Б╤В╤А╨░╨╜╨╕╤Ж╨░╤Е Events, Landings, Articles, Venues, Sources, Mapping, Settings, Dashboard, Change Requests ╨╕ ╨▓ shell/primitives.
- `StatusBadge` ╨┐╨╛ ╤Г╨╝╨╛╨╗╤З╨░╨╜╨╕╤О ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╡╤В ╤А╤Г╤Б╤Б╨║╨╕╨╡ ╤Б╤В╨░╤В╤Г╤Б╤Л ╨▓╨╝╨╡╤Б╤В╨╛ ╤Б╤Л╤А╤Л╤Е `live`/`draft`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Ш╨╝╨╡╨╜╨░ ╨┐╤А╨╛╨▓╨░╨╣╨┤╨╡╤А╨╛╨▓ (Ticketscloud, Teplohod.info) ╨╕ ╤В╨╡╤Е╨╜╨╕╤З╨╡╤Б╨║╨╕╨╡ slug/SEO-╨┐╨╛╨╗╤П ╨╛╤Б╤В╨░╨▓╨╗╨╡╨╜╤Л ╨║╨░╨║ ╨▒╤А╨╡╨╜╨┤╤Л/╤В╨╡╤А╨╝╨╕╨╜╤Л.

---

## 2026-07-18 тАФ Full sync TC+TEP

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- `tc:full-sync` ╨╜╨░ prod ╤Б╨╛╤Е╤А╨░╨╜╨╕╨╗ catalog; `tc-import-catalog` ╤Г╨┐╨░╨╗ ╨╜╨░ `Event_slug_key` тАФ `slugify(...).slice(0,120)` ╨╛╨▒╤А╨╡╨╖╨░╨╗ `externalId` ╤Г ╨┤╨╗╨╕╨╜╨╜╤Л╤Е title.
- `tep:sync` ╨╖╨░╨▓╨╡╤А╤И╨╕╨╗╤Б╤П: 187 events / 18129 sessions / 18577 ProviderLink.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `buildEventSlug(title, externalId)` тАФ suffix id ╨▓╤Б╨╡╨│╨┤╨░ ╨▓╨╜╤Г╤В╤А╨╕ 120 ╤Б╨╕╨╝╨▓╨╛╨╗╨╛╨▓; ╨┐╨╛╨▓╤В╨╛╤А╨╜╤Л╨╣ `tc:import` ╨┐╨╛╤Б╨╗╨╡ ╤Д╨╕╨║╤Б╨░.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- тАФ

---


### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨б `md` ╨│╨░╨╝╨▒╤Г╤А╨│╨╡╤А ╤Б╨║╤А╤Л╨▓╨░╨╗╤Б╤П, ╨░ desktop-nav ╨▓╨║╨╗╤О╤З╨░╨╗╤Б╤П, ╨╜╨╛ City/Search тАФ ╤В╨╛╨╗╤М╨║╨╛ ╤Б `lg` тЖТ ╨╜╨░ ╨┐╨╗╨░╨╜╤И╨╡╤В╨╡ ╤И╨░╨┐╨║╨░ ╨┐╨╡╤А╨╡╨┐╨╛╨╗╨╜╤П╨╗╨░╤Б╤М ╨╕ ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗╨░ ┬л╨╜╨╡╨░╨┤╨░╨┐╤В╨╕╨▓╨╜╨╛╨╣┬╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ь╨╛╨▒╨╕╨╗╤М╨╜╨╛╨╡ ╨╝╨╡╨╜╤О ╨┤╨╛ `lg`; desktop nav ╤Б `lg`, ╨▓╤В╨╛╤А╨╛╤Б╤В╨╡╨┐╨╡╨╜╨╜╤Л╨╡ ╤Б╤Б╤Л╨╗╨║╨╕ ╤Б `xl`.
- ╨Э╨░ `<lg` ╨▓ ╤И╨░╨┐╨║╨╡ ╤В╨╛╨╗╤М╨║╨╛ ╨│╨░╨╝╨▒╤Г╤А╨│╨╡╤А + ╨╗╨╛╨│╨╛╤В╨╕╨┐; ╨┐╨╛╨╕╤Б╨║ / FAQ / ╨▓╤Е╨╛╨┤ / ╨╕╨╖╨▒╤А╨░╨╜╨╜╨╛╨╡ тАФ ╨▓ sheet.
- ╨б `lg` тАФ ╨┐╨╕╨║╤В╨╛╨│╤А╨░╨╝╨╝╤Л ╨┤╨╡╨╣╤Б╤В╨▓╨╕╨╣ ╨▓ ╤И╨░╨┐╨║╨╡ ╨║╨░╨║ ╤А╨░╨╜╤М╤И╨╡.
- Spacer height: 4rem ╨┤╨╛ lg, 4.5rem ╤Б lg.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- тАФ

---


### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ `860c818` (restore legacy widgets) ╨╕╨╖ `TeplohodWidget.client.tsx` ╨┐╤А╨╛╨┐╨░╨╗ `bootstrapTeplohodWidgets()` / ╨┐╨╛╨▓╤В╨╛╤А╨╜╤Л╨╣ `TI_Tickets.init`.
- ╨Э╨░ `/events/[slug]` ╨╛╤Б╤В╨░╨▓╨░╨╗╤Б╤П ╨┐╤Г╤Б╤В╨╛╨╣ `.teplohod-info-wrapper` ╨▒╨╡╨╖ ╨║╨╜╨╛╨┐╨║╨╕ тАФ script ╨│╤А╤Г╨╖╨╕╨╗╤Б╤П, ╨╜╨╛ init ╨┐╨╛╤Б╨╗╨╡ hydration ╨╜╨╡ ╨▓╤Л╨╖╤Л╨▓╨░╨╗╤Б╤П.
- ╨Э╨░ ╨╗╨╡╨╜╨┤╨╕╨╜╨│╨░╤Е lean DTO ╨▒╨╡╨╖ `purchaseUrl`/`externalId`; `LandingPurchaseButton` ╨╖╨▓╨░╨╗ `getTeplohodWidgetIds` ╨▒╨╡╨╖ ╨┐╨░╤А╤Б╨╕╨╜╨│╨░ `evt_tep_*`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Т╨╛╤Б╤Б╤В╨░╨╜╨╛╨▓╨╗╨╡╨╜ bootstrap + wait ╨╜╨░ `TI_Tickets.init`, retry mount, fallback ╨╜╨░ `account.teplohod.info`.
- Event buy card ╨┐╨╡╤А╨╡╨┤╨░╤С╤В `purchaseUrl` ╨▓ embed.
- ╨Ы╨╡╨╜╨┤╨╕╨╜╨│╨╕: `getTeplohodWidgetIdsFromSession` + `resolveTeplohodCheckoutUrl` (ID ╨╕╨╖ `evt_tep_*`).
- ╨Ъ╨░╤В╨░╨╗╨╛╨│ `/events` ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╨▒╨╡╨╖ widget markup (`suppressPurchaseAnchors`).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- тАФ

---


### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╨╗╨╜╤Л╨╣ admin catalog cache (~25s cold) ╨┐╤А╨╕ TTL 60s ╨╖╨░╤Б╤В╨░╨▓╨╗╤П╨╗ Events/Dashboard/Landings ╤Б╨╜╨╛╨▓╨░ ╨╢╨┤╨░╤В╤М ╨┐╤А╨╕ ╨║╨░╨╢╨┤╨╛╨╝ ┬л╨┐╤А╨╛╤В╤Г╤Е╨░╨╜╨╕╨╕┬╗.
- ╨Я╨╛╤Б╨╗╨╡ SWR ╨║╨░╤В╨░╨╗╨╛╨│╨░: Events/Dashboard ~10тАУ40тАпms, ╨╜╨╛ Landings ~700тАУ800тАпms (`matchesRule` ├Ч rules ├Ч ~3k) ╨╕ Sources ~2.5тАпs (╤В╤П╨╢╤С╨╗╤Л╨╣ SQL).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Stale-while-revalidate ╨║╨░╤В╨░╨╗╨╛╨│╨░: fresh 5 ╨╝╨╕╨╜, stale ╨┤╨╛ 30 ╨╝╨╕╨╜ + ╤Д╨╛╨╜╨╛╨▓╤Л╨╣ rebuild; soft-invalidate; warm ╨╜╨░ startup.
- Landings: memo `adminLandingsBaseCache` ╨┐╨╛ `catalogBuiltAt` + fingerprint saved landings; invalidate ╨╜╨░ PATCH landing/match.
- Sources: SWR fresh 2 ╨╝╨╕╨╜ / stale 10 ╨╝╨╕╨╜; invalidate ╨▓╨╝╨╡╤Б╤В╨╡ ╤Б admin catalog.
- Warm startup: ╨┐╨╛╤Б╨╗╨╡ grouped cache ╨┐╤А╨╛╨│╤А╨╡╨▓╨░╨╡╨╝ Landings list + Sources.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╡╤А╨▓╤Л╨╣ cold ╨┐╨╛╤Б╨╗╨╡ hard-expire ╨▓╤Б╤С ╨╡╤Й╤С ╨┤╨╛╤А╨╛╨│╨╛╨╣ тАФ ╤А╨╡╨┤╨║╨╕╨╣ ╨║╨╡╨╣╤Б.
- Hotfix ╨┐╨╛╤Б╨╗╨╡ `dcada19`: ╨┐╤А╨╕ ╨▓╤Б╤В╨░╨▓╨║╨╡ landings-╨║╤Н╤И╨░ ╨┐╤А╨╛╨┐╨░╨╗ `let adminGroupedEventsCache` тЖТ warm ╨┐╨░╨┤╨░╨╗ ╤Б ReferenceError; ╨▓╨╛╤Б╤Б╤В╨░╨╜╨╛╨▓╨╗╨╡╨╜╨╛.

---

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- `eventRows(..., 10000)` ╨╛╨▒╤А╨╡╨╖╨░╨╗ admin Events/Landings; dashboard ╨▒╤А╨░╨╗ saleable public groups тЖТ ╤А╨░╤Б╤Е╨╛╨╢╨┤╨╡╨╜╨╕╨╡ 2526 vs 1353.
- Lean `description=null` ╨┤╨░╨▓╨░╨╗ ╨╗╨╛╨╢╨╜╤Л╨╣ WEAK_DESCRIPTION ╨┐╨╛╤З╤В╨╕ ╨╜╨░ ╨▓╤Б╤С╨╝ ╨║╨░╤В╨░╨╗╨╛╨│╨╡.
- ╨Т cache declaration ╤Б╨▓╨╛╨╣╤Б╤В╨▓╨╛ ╨▒╤Л╨╗╨╛ `events`, ╨░ ╨║╨╛╨┤ ╤З╨╕╤В╨░╨╗ `.items` (╨┐╨╛╤Б╨╗╨╡ populate ╨┐╨╕╤Б╨░╨╗╨╛╤Б╤М `items` тАФ ╤Е╤А╤Г╨┐╨║╨╛).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Admin cache: ╨┐╨╛╨╗╨╜╤Л╨╣ `eventRows(null)`, single-flight promise, ╨║╨╗╤О╤З `items`.
- Dashboard launch metrics ╨╕╨╖ ╤В╨╛╨│╨╛ ╨╢╨╡ `getCachedAdminGroupedEvents` (`source: admin_event_groups`).
- Lean: `descriptionLength` ╨┤╨╗╤П readiness; `eventRowsByIds` ╤З╨╡╤А╨╡╨╖ `WHERE id = ANY(...)`.
- Landing candidates ╨┐╨╡╤А╨╡╨╕╤Б╨┐╨╛╨╗╤М╨╖╤Г╤О╤В cache.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╡╤А╨▓╤Л╨╣ cold build admin cache ╨╜╨░ ╨┐╨╛╨╗╨╜╨╛╨╝ ╨║╨░╤В╨░╨╗╨╛╨│╨╡ ╨╝╨╛╨╢╨╡╤В ╨▒╤Л╤В╤М ╨╝╨╡╨┤╨╗╨╡╨╜╨╜╤Л╨╝ (~╤Б╨╡╨║╤Г╨╜╨┤╤Л); ╨║╤Н╤И 60╤Б + single-flight.

---

## 2026-07-14 тАФ ╨Я╨╛╨╗╨╜╤Л╨╣ ╨░╤Г╨┤╨╕╤В ╨░╨┤╨╝╨╕╨╜╨║╨╕ (prod)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т ╤Е╨╛╨┤╨╡ ╨░╤Г╨┤╨╕╤В╨░ `GET /api/admin/events` ╨╕ `/landings` ╨╛╤В╨┤╨░╨▓╨░╨╗╨╕ **500** (`syntax error at or near "text"`): ╨▓ lean `eventRows` SQL template ╤Б╨╗╤Г╤З╨░╨╣╨╜╨╛ ╨┐╨╛╨┐╨░╨╗╨╕ JS `//` ╨║╨╛╨╝╨╝╨╡╨╜╤В╨░╤А╨╕╨╕ ╨┐╨╛╤Б╨╗╨╡ ╤Д╨╕╨║╤Б╨░ override.
- Admin events cache ╤А╨╡╨╢╨╡╤В `eventRows(..., 10000)` тЖТ `sourceEvents=10000`, `groupedEvents=1353`, ╤В╨╛╨│╨┤╨░ ╨║╨░╨║ dashboard/public ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╤О╤В **2526** ╨│╤А╤Г╨┐╨┐; readiness-╨╝╨╡╤В╤А╨╕╨║╨╕ ╤Б╨┐╨╕╤Б╨║╨░ (needs_attention **1352**) ╨╜╨╡ ╤Б╨╛╨▓╨┐╨░╨┤╨░╤О╤В ╤Б dashboard (**0**).
- Stub-╨╜╨░╨▓╨╕╨│╨░╤Ж╨╕╤П: mapping / taxonomy / audit-log / settings; ECR API ╨╡╤Б╤В╤М, UI ╨▓ ╨▒╨░╨╜╨┤╨╗╨╡ ╨▓╤Л╨║╨╗╤О╤З╨╡╨╜.
- Override description ╨▓ lean ╨┐╨╛╤Б╨╗╨╡ ╤Д╨╕╨║╤Б╨░ ╤З╨╕╤В╨░╨╡╤В╤Б╤П (╨┐╤А╨╕╨╝╨╡╤А `evt_tep_370`); source `e.description` ╨▓ lean ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г null.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Hotfix `ea27651`: ╤Г╨▒╤А╨░╨╜╤Л JS-╨║╨╛╨╝╨╝╨╡╨╜╤В╨░╤А╨╕╨╕ ╨╕╨╖ SQL; api restart ╨╜╨░ prod тАФ Events/Landings ╤Б╨╜╨╛╨▓╨░ 200.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Э╨╡╨┐╨╛╨╗╨╜╤Л╨╣ admin-╨║╨░╤В╨░╨╗╨╛╨│ ╨╕╨╖-╨╖╨░ hard limit 10k тАФ P0 ╨║ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╡╨╝╤Г ╤Д╨╕╨║╤Б╤Г.
- ╨а╨░╤Б╤Е╨╛╨╢╨┤╨╡╨╜╨╕╨╡ Dashboard vs Events metrics тАФ P0/P1 ╨┤╨╗╤П ╨╛╨┐╨╡╤А╨░╤Ж╨╕╨╛╨╜╨╜╨╛╨╣ ╨┤╨╛╤Б╤В╨╛╨▓╨╡╤А╨╜╨╛╤Б╤В╨╕.

---

## 2026-07-14 тАФ Legacy widgets + description overrides + paragraphs

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨б╨╛╨▒╤Б╤В╨▓╨╡╨╜╨╜╨░╤П iframe-╨╝╨╛╨┤╨░╨╗╨║╨░ checkout тАФ ╨╗╨╕╤И╨╜╨╕╨╣ ╨▓╨╡╨╗╨╛╤Б╨╕╨┐╨╡╨┤; ╨▓ legacy (`apps/public`) ╨┐╨╛╨║╤Г╨┐╨║╨░ ╤И╨╗╨░ ╤З╨╡╤А╨╡╨╖ TC `data-tc-event` click ╨╕ Teplohod embed + `.ti-tickets-event-tickets-buy`.
- Override ╨╛╨┐╨╕╤Б╨░╨╜╨╕╤П ┬л╨╜╨╡ ╤Б╨╛╤Е╤А╨░╨╜╤П╨╗╤Б╤П┬╗: lean `eventRows` ╨╛╨▒╨╜╤Г╨╗╤П╨╗ `override.description` / SEO-╤В╨╡╨║╤Б╤В╤Л тЖТ ContentTab ╨╛╤В╨║╤А╤Л╨▓╨░╨╗╤Б╤П ╨┐╤Г╤Б╤В╤Л╨╝ ╨╕ PATCH ╨╖╨░╤В╨╕╤А╨░╨╗ ╨С╨Ф `null`.
- ╨Ю╨┐╨╕╤Б╨░╨╜╨╕╤П ┬л╨┐╨╛╨╗╨╛╤В╨╡╨╜╤Ж╨╡╨╝┬╗: ╨▓ Next `splitDescriptionParagraphs` ╨╜╨╡ ╨╕╨╝╨╡╨╗ legacy fallback ╨┐╨╛ ╨╛╨┤╨╕╨╜╨╛╤З╨╜╤Л╨╝ `\n` (╤В╨╛╨╗╤М╨║╨╛ blank lines), ╨╖╨░╤В╨╡╨╝ `cleanDisplayText` ╤Б╤Е╨╗╨╛╨┐╤Л╨▓╨░╨╗ ╨▓╤Б╤С ╨▓ ╨╛╨┤╨╕╨╜ ╨░╨▒╨╖╨░╤Ж.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Purchase CTA ╤Б╨╜╨╛╨▓╨░ ╨╜╨░ legacy-╨▓╨╕╨┤╨╢╨╡╤В╤Л (╨▒╨╡╨╖ CheckoutModal ╨▓ CTA).
- Lean admin list ╤Б╨╜╨╛╨▓╨░ ╨╛╤В╨┤╨░╤С╤В override text fields; ╨┐╨╛╤Б╨╗╨╡ PATCH ╨╕╨╜╨▓╨░╨╗╨╕╨┤╨╕╤А╤Г╨╡╨╝ `adminGroupedEventsCache`.
- `splitDescriptionParagraphs` ╨║╨░╨║ ╨▓ legacy (+ soft-wrap join); ╨╖╨░╨│╨╛╨╗╨╛╨▓╨║╨╕ ╤А╨░╨╖╨┤╨╡╨╗╨╛╨▓ тЖТ `<h3>` ╨┐╨╛ ╤Н╨▓╤А╨╕╤Б╤В╨╕╨║╨╡.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Source `e.description` ╨▓ lean-╤Б╨┐╨╕╤Б╨║╨╡ ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г null (╤В╤П╨╢╤С╨╗╨╛╨╡ ╨┐╨╛╨╗╨╡) тАФ ╨▓ ContentTab ╨┐╨╛╨┤╨┐╨╕╤Б╤М Source ╨╝╨╛╨╢╨╡╤В ╨▒╤Л╤В╤М ╨┐╤Г╤Б╤В╨╛╨╣; override ╨┐╤А╨╕ ╤Н╤В╨╛╨╝ ╤З╨╕╤В╨░╨╡╤В╤Б╤П/╨┐╨╕╤И╨╡╤В╤Б╤П ╨║╨╛╤А╤А╨╡╨║╤В╨╜╨╛.

---

## 2026-07-14 тАФ Checkout via own iframe modal (TC + TEP)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т╨╡╨╜╨┤╨╛╤А╨╜╤Л╨╡ tcwidget.js / Teplohod Fancybox ╨╜╨╡╤Б╤В╨░╨▒╨╕╨╗╤М╨╜╤Л ╨▓ Next (synthetic click, style#loader, fallback races).
- Checkout URL ╨╛╨▒╨╛╨╕╤Е ╨┐╤А╨╛╨▓╨░╨╣╨┤╨╡╤А╨╛╨▓ **╨╝╨╛╨╢╨╜╨╛ ╨▓╤Б╤В╤А╨░╨╕╨▓╨░╤В╤М ╨▓ iframe** (╨╜╨╡╤В X-Frame-Options).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `CheckoutModal` + `CheckoutModalButton`: ╨╜╨░╤И╨░ ╨╝╨╛╨┤╨░╨╗╨║╨░ ╤Б iframe ╨╜╨░ `ticketscloud.com/v1/widgets/common` ╨╕ `account.teplohod.info/order/event-order`.
- Event page / landing / catalog purchase CTA ╨┐╨╡╤А╨╡╨▓╨╡╨┤╨╡╨╜╤Л ╨╜╨░ ╤Н╤В╤Г ╨╝╨╛╨┤╨░╨╗╨║╤Г тАФ ╨┐╤А╨╡╨┤╤Б╨║╨░╨╖╤Г╨╡╨╝╤Л╨╣ UX ╨▒╨╡╨╖ ╨╖╨░╨▓╨╕╤Б╨╕╨╝╨╛╤Б╤В╨╕ ╨╛╤В vendor DOM.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╨┤╤Е╨╛╨┤ ╨╛╤В╨╛╨╖╨▓╨░╨╜: ╨▓╨╡╤А╨╜╤Г╨╗╨╕╤Б╤М ╨║ legacy vendor widgets (╤Б╨╝. ╨╖╨░╨┐╨╕╤Б╤М ╨▓╤Л╤И╨╡).

---

## 2026-07-14 тАФ Root cause: TC style#ticketscloud-loader misdetected as spinner

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Т `tcwidget.js` `#ticketscloud-loader` тАФ ╤Н╤В╨╛ **`<style>` ╨▓ `<head>`**, ╨░ ╨╜╨╡ DOM-╤Б╨┐╨╕╨╜╨╜╨╡╤А. ╨Я╨╛╤Б╨╗╨╡ ╨┐╨╡╤А╨▓╨╛╨│╨╛ ╨╖╨░╨┐╤Г╤Б╨║╨░ ╨╛╨╜ ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨╜╨░╨▓╤Б╨╡╨│╨┤╨░.
- Next `openTcWidget` ╤Б╤З╨╕╤В╨░╨╗ ╨╡╨│╨╛ ┬лstuck loading┬╗, ╤Б╨╜╨╛╤Б╨╕╨╗ overlay/`dismissTcWidget` ╨╕ ╨╛╤В╨║╤А╤Л╨▓╨░╨╗ popup тАФ TC-╨╝╨╛╨┤╨░╨╗╨║╨░ ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗╨░ ┬л╨╜╨╡ ╨│╤А╤Г╨╖╨╕╤В╤Б╤П┬╗.
- Teplohod ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛ ╨╗╨╛╨╝╨░╨╗╨╕ auto-`window.open` ╨╜╨░ account (╤Г╨╢╨╡ ╤З╨╕╨╜╨╕╨╗╨╕); ╨╛╤Б╤В╨░╨▓╨╕╨╗╨╕ Vite-╨┐╨╛╨┤╨╛╨▒╨╜╤Л╨╣ init + ╨▒╨╡╨╖ ╨░╨│╤А╨╡╤Б╤Б╨╕╨▓╨╜╨╛╨│╨╛ dismiss.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Visible = iframe **╨╕╨╗╨╕** `div#tc-widget-overlay` (╨╜╨╡ STYLE).
- ╨С╨╛╨╗╤М╤И╨╡ ╨╜╨╡ ╤Г╨┤╨░╨╗╤П╨╡╨╝ `style#ticketscloud-loader`; ╨╜╨╡ ╤Б╤З╨╕╤В╨░╨╡╨╝ ╨╡╨│╨╛ stuck.
- `openTcWidget`: ensure + `ticketsCloudWidget.init` + click; popup fallback ╤В╨╛╨╗╤М╨║╨╛ ╨╡╤Б╨╗╨╕ shell ╨╜╨╡ ╨┐╨╛╤П╨▓╨╕╨╗╤Б╤П ~4╤Б.
- Teplohod: `async` script + ╨┐╨╛╨▓╤В╨╛╤А╨╜╤Л╨╣ `init` ╨┐╨╛╤Б╨╗╨╡ paint.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- тАФ

---

## 2026-07-14 тАФ Teplohod fancybox killed by account fallback

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ event 554 (`тАж-za-1-chas-554`) ╨▓╨╕╨┤╨╢╨╡╤В Teplohod ╤А╨╕╤Б╤Г╨╡╤В ╨║╨╜╨╛╨┐╨║╤Г ┬л╨Ъ╤Г╨┐╨╕╤В╤М ╨▒╨╕╨╗╨╡╤В╤Л┬╗ inline; ╨▓╤Л╨▒╨╛╤А ╨┤╨░╤В/╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╣ ╨┤╨╛╨╗╨╢╨╡╨╜ ╨╛╤В╨║╤А╤Л╨▓╨░╤В╤М╤Б╤П ╨▓ Fancybox-╨╝╨╛╨┤╨░╨╗╨║╨╡.
- ╨Э╨░╤И `bindTeplohodBuyFallback` ╤З╨╡╤А╨╡╨╖ 2.5s ╨╛╤В╨║╤А╤Л╨▓╨░╨╗ `account.teplohod.info` ╨▓╨╛ ╨▓╨║╨╗╨░╨┤╨║╨╡, ╨╡╤Б╨╗╨╕ Fancybox ╨╡╤Й╤С ╨╜╨╡ ╨┤╨╡╤В╨╡╨║╤В╨╕╨╗╤Б╤П тАФ UX ┬л╨╜╨╡ ╨▓ ╨╝╨╛╨┤╨░╨╗╨║╨╡┬╗ + ╨▓╤В╨╛╤А╨░╤П ╨║╨╜╨╛╨┐╨║╨░ fallback.
- `openTeplohodPurchase` ╨╝╨╛╨│ ╨╖╨░╨║╤А╤Л╨▓╨░╤В╤М ╨┐╤Г╤Б╤В╨╛╨╣ Fancybox ╨╕ ╤В╨╛╨╢╨╡ ╤Г╨▓╨╛╨┤╨╕╤В╤М ╨▓╨╛ ╨▓╨╜╨╡╤И╨╜╨╕╨╣ checkout.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨г╨▒╤А╨░╨╜ auto-`window.open` ╤Б ╨║╨╗╨╕╨║╨░ buy; fallback-╤Б╤Б╤Л╨╗╨║╨░ ╤В╨╛╨╗╤М╨║╨╛ ╨╡╤Б╨╗╨╕ ╨║╨╜╨╛╨┐╨║╨░ Teplohod ╤В╨░╨║ ╨╕ ╨╜╨╡ ╤Б╨╝╨╛╨╜╤В╨╕╤А╨╛╨▓╨░╨╗╨░╤Б╤М (~8╤Б).
- `openTeplohodPurchase` ╨▒╨╛╨╗╤М╤И╨╡ ╨╜╨╡ dismiss'╨╕╤В Fancybox; ╨▓╨╜╨╡╤И╨╜╨╕╨╣ URL тАФ last resort.
- z-index ╨┤╨╗╤П `.fancyboxtkt-*`; parse `event_id` ╨╕╨╖ account checkout URL.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- тАФ

---

## 2026-07-14 тАФ TC widget infinite loader again

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ ╨║╨╗╨╕╨║╨░ ┬л╨Ъ╤Г╨┐╨╕╤В╤М┬╗ Ticketscloud ╤А╨╕╤Б╤Г╨╡╤В `#tc-widget-overlay` + `#ticketscloud-loader` ╨┤╨╛ iframe.
- `isTcWidgetVisible` ╤Б╤З╨╕╤В╨░╨╗ overlay ╤Г╤Б╨┐╨╡╤Е╨╛╨╝ тЖТ fallback ╨╜╨░ `purchaseUrl` ╨╜╨╡ ╤Б╤А╨░╨▒╨░╤В╤Л╨▓╨░╨╗, loader ╨║╤А╤Г╤В╨╕╨╗╤Б╤П ╨▒╨╡╤Б╨║╨╛╨╜╨╡╤З╨╜╨╛.
- TEP: `ensureTeplohodWidgetScript` ╨╝╨╛╨│ resolve ╨┤╨╛ ╨┐╨╛╤П╨▓╨╗╨╡╨╜╨╕╤П `TI_Tickets.init`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Visible = ╤А╨╡╨░╨╗╤М╨╜╤Л╨╣ iframe (╨╜╨╡ overlay/loader); stuck loading тЖТ dismiss + popup fallback.
- Teplohod script wait ╨┤╨╛ `TI_Tickets.init`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- iframe ╨╝╨╛╨╢╨╡╤В ╨┐╨╛╤П╨▓╨╕╤В╤М╤Б╤П ╨┐╤Г╤Б╤В╤Л╨╝ ╨╕ ╨▓╤Б╤С ╨╡╤Й╤С ╨║╤А╤Г╤В╨╕╤В╤М╤Б╤П тАФ ╨╡╤Б╨╗╨╕ ╨┐╨╛╨▓╤В╨╛╤А╨╕╤В╤Б╤П, ╨┤╨╛╨▒╨░╨▓╨╕╤В╤М ╨┐╤А╨╛╨▓╨╡╤А╨║╤Г contentDocument/timeout ╨▓╨╜╤Г╤В╤А╨╕ iframe.

---

## 2026-07-14 тАФ Catalog list description restored

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Lean list DTO ╤Г╨▒╤А╨░╨╗ `description` ╨▓╨╝╨╡╤Б╤В╨╡ ╤Б widget URL / full slots; ╨╜╨░ `/events` ╨│╨╛╤А╨╕╨╖╨╛╨╜╤В╨░╨╗╤М╨╜╤Л╨╡ ╨║╨░╤А╤В╨╛╤З╨║╨╕ ╨┐╨╛╤В╨╡╤А╤П╨╗╨╕ excerpt ╨┐╤А╨╕ ╤В╨╛╨╝, ╤З╤В╨╛ UI (`formatListDescription`) ╤Г╨╢╨╡ ╨╡╨│╨╛ ╨╢╨┤╨░╨╗.
- ╨Ю╤Б╨╜╨╛╨▓╨╜╨╛╨╣ perf-╨▓╤Л╨╕╨│╤А╤Л╤И ╨▒╤Л╨╗ ╨╛╤В ╨▓╨╕╨┤╨╢╨╡╤В╨╛╨▓ ╨▓ list HTML ╨╕ hydrate page-only, ╨╜╨╡ ╨╛╤В ╤Б╨░╨╝╨╛╨│╨╛ ╤В╨╡╨║╤Б╤В╨░ ╨╛╨┐╨╕╤Б╨░╨╜╨╕╤П.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `toPublicCatalogListItem` ╤Б╨╜╨╛╨▓╨░ ╨╛╤В╨┤╨░╤С╤В `description` ╨║╨░╨║ plain-text excerpt (тЙд420 ╤Б╨╕╨╝╨▓╨╛╨╗╨╛╨▓, ╨▒╨╡╨╖ HTML).
- `PublicCatalogListItemDto.description` ╨▓╨╛╨╖╨▓╤А╨░╤Й╤С╨╜ ╨▓ ╨║╨╛╨╜╤В╤А╨░╨║╤В; `EventCardHorizontal` ╤В╨╕╨┐╨╕╨╖╨╕╤А╨╛╨▓╨░╨╜ ╨┐╨╛╨┤ list DTO.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╨╗╨╜╤Л╨╣ HTML description ╨▓ list ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╨╜╨╡ ╨╜╤Г╨╢╨╡╨╜ (╤А╨░╨╖╨┤╤Г╨▓╨░╨╡╤В JSON); detail ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨╜╨░ event page.

---

## 2026-07-14 тАФ ChunkLoad ╨┐╨╛╤Б╨╗╨╡ redeploy + harden deploy

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ `deploy-prod-next.sh` ╤Б╤В╨░╤А╤Л╨╡ ╨▓╨║╨╗╨░╨┤╨║╨╕ ╨╖╨░╨┐╤А╨░╤И╨╕╨▓╨░╨╗╨╕ chunk hashes ╨┐╤А╨╡╨┤╤Л╨┤╤Г╤Й╨╡╨│╨╛ ╨▒╨╕╨╗╨┤╨░ тЖТ 404 / `ChunkLoadError` (Application error).
- ╨Р╨║╤В╤Г╨░╨╗╤М╨╜╤Л╨╣ HTML ╤Г╨╢╨╡ ╤Б╤Б╤Л╨╗╨░╨╗╤Б╤П ╨╜╨░ ╨╜╨╛╨▓╤Л╨╡ chunks; ╨┐╤А╨╛╨▒╨╗╨╡╨╝╨░ ╨║╨╗╨╕╨╡╨╜╤В╤Б╨║╨╛╨│╨╛ ╨║╤Н╤И╨░ ╤Б╨╡╤Б╤Б╨╕╨╕, ╨╜╨╡ nginx static proxy.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Prod: `systemctl stop daibilet-web` тЖТ `rm -rf apps/web/.next/cache` тЖТ start тЖТ internal revalidate (home/catalog tags+paths).
- `deploy-prod-next.sh`: ╨╛╤З╨╕╤Б╤В╨║╨░ `.next/cache` ╨┐╨╡╤А╨╡╨┤ start + post-deploy `POST /api/internal/revalidate`; **re-exec ╨┐╨╛╤Б╨╗╨╡ `git pull`**, ╤З╤В╨╛╨▒╤Л ╤Е╨▓╨╛╤Б╤В ╤Б╨║╤А╨╕╨┐╤В╨░ ╨╜╨╡ ╨╛╤Б╤В╨░╨▓╨░╨╗╤Б╤П ╨╛╤В ╤Б╤В╨░╤А╨╛╨╣ ╨▓╨╡╤А╤Б╨╕╨╕.
- `ChunkLoadRecovery` ╨▓ root layout: ╨╛╨┤╨╕╨╜ `location.reload()` ╨╜╨░ ChunkLoad / dynamic import failure per session.
- Prod: ╨╖╨░╨┐╨╛╨╗╨╜╨╡╨╜ ╨┐╤Г╤Б╤В╨╛╨╣ `DAIBILET_NEXT_REVALIDATE_SECRET` (╤А╨░╨╜╤М╤И╨╡ ╨▓╤Б╨╡╨│╨┤╨░ 401).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- PowerShell+SSH quoting ╨╗╨╛╨╝╨░╨╡╤В Bearer/json ╨▓ one-liner; ╨┤╨╗╤П ad-hoc ╨╗╤Г╤З╤И╨╡ remote Python/scp.
- ╨Э╨░ prod `DAIBILET_NEXT_REVALIDATE_SECRET` ╨▓ `.env` ╨▒╤Л╨╗ **╨┐╤Г╤Б╤В╤Л╨╝** тЖТ post-sync/deploy revalidate ╨▓╤Б╨╡╨│╨┤╨░ 401; ╤Б╨│╨╡╨╜╨╡╤А╨╕╤А╨╛╨▓╨░╨╜ ╨╕ ╨┐╤А╨╛╨┐╨╕╤Б╨░╨╜ ╨╜╨╛╨▓╤Л╨╣ ╤Б╨╡╨║╤А╨╡╤В, web+api ╨┐╨╡╤А╨╡╨╖╨░╨┐╤Г╤Й╨╡╨╜╤Л.

---

## 2026-07-14 тАФ Docs + commit + prod deploy (admin pagination + catalog perf)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Worktree ╤Б╨╛╨┤╨╡╤А╨╢╨░╨╗ ╨░╨┤╨╝╨╕╨╜╤Б╨║╤Г╤О ╨┐╨░╨│╨╕╨╜╨░╤Ж╨╕╤О, compact dashboard, catalog lean DTO, SEO redirects ╨╕ Teplohod checkout fix тАФ ╨▒╨╡╨╖ ╨┐╤Г╤И╨░.
- ╨Ю╨┤╨╜╨╛╤А╨░╨╖╨╛╨▓╤Л╨╡ `scripts/inspect-*` / `probe-*` / `scrape-*` ╨╜╨╡ ╨▓╤Е╨╛╨┤╤П╤В ╨▓ ╨║╨╛╨╝╨╝╨╕╤В.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ф╨╛╨║╤Г╨╝╨╡╨╜╤В╤Л: Project/Tasktracker/Diary/current-state ╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╤Л ╨┐╨╛╨┤ ╨║╨╛╨╜╤В╤А╨░╨║╤В╤Л admin API ╨╕ catalog perf rules.
- Deploy: `feat/next-monorepo` @ `6175ad5` тЖТ prod (`deploy-prod-next.sh`); nginx wwwтЖТapex 301 ╨┐╤А╨╕╨╝╨╡╨╜╤С╨╜; Next matcher hotfix (static array).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- SQL LIMIT read-model (0.5.8) ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╝ perf-╨▒╨╗╨╛╨║╨╛╨╝ ╨┐╨╛╤Б╨╗╨╡ warm-cache wins.
- ╨Э╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡ ╨┐╨╡╤А╨╡╨┤ pull ╨▒╤Л╨╗ stash `pre-deploy-f59d52c` (╨╗╨╛╨║╨░╨╗╤М╨╜╤Л╨╡ hotfix-╤Д╨░╨╣╨╗╤Л) тАФ ╨╜╨╡ ╨┐╨╛╤В╨╡╤А╤П╤В╤М ╨┐╤А╨╕ ╨╜╨╡╨╛╨▒╤Е╨╛╨┤╨╕╨╝╨╛╤Б╤В╨╕.

---

## 2026-07-14 тАФ Catalog/perf + metrics + SEO redirects

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- `/api/public/events?limit=50` ╤Б╨╛╨▒╨╕╤А╨░╨╗ ╨▓╨╡╤Б╤М grouped catalog ╨╕ hydrat╨╕╨╗ upcomingSlots ╨┤╨╛ ╤В╤Л╤Б╤П╤З╨╕ ╨║╨░╤А╤В╨╛╤З╨╡╨║, ╨┐╨╛╤В╨╛╨╝ slice.
- ╨Т HTML `/events` ╨▓ ╨║╨░╨╢╨┤╨╛╨╣ ╨║╨░╤А╤В╨╛╤З╨║╨╡ ╨╢╨╕╨╗╨╕ ╤Б╨║╤А╤Л╤В╤Л╨╡ TC/Teplohod widget-╨▒╨╗╨╛╨║╨╕.
- Dashboard launch metrics ╤Б╤З╨╕╤В╨░╨╗ raw Event rows, public `/stats` тАФ saleable groupKey.
- SSR city/landing ╤В╨░╤Й╨╕╨╗╨╕ 160тАУ240 ╨┐╨╛╨╗╨╜╤Л╤Е ╤Б╨╡╤Б╤Б╨╕╨╣ (~1.7тАУ2 ╨Ь╨С HTML).
- `www.daibilet.ru` ╨╕ ╤Б╤В╨░╤А╤Л╨╡ `/river-cruises` ╨╜╨╡ 301.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Catalog API: shared cache ╨▒╨╡╨╖ full slot hydrate; hydrate ╤В╨╛╨╗╤М╨║╨╛ page slice; lean list DTO ╨▒╨╡╨╖ widget URL.
- Catalog cards: `suppressPurchaseAnchors` ╨┐╨╛ ╤Г╨╝╨╛╨╗╤З╨░╨╜╨╕╤О; horizontal ╨▒╨╡╨╖ widget markup.
- Dashboard launch metrics = public catalog groups (`source: public_catalog_groups`); UI ╨┐╤А╨╡╨┤╨┐╨╛╤З╨╕╤В╨░╨╡╤В `launch.groupedEvents`.
- City SSR тЙд48 lean items; landing sessions тЙд48 lean.
- Middleware/next.config: wwwтЖТapex + `/river-cruises`тЖТ`/rechnye-progulki`; `pageTitle`/`og:url` route-specific.
- Warm/revalidate: stats, events page, SPB/MSK, river/bus landings.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╨╗╨╜╤Л╨╣ SQL LIMIT ╨╜╨░ ╨│╤А╤Г╨┐╨┐╨░╤Е (╨▒╨╡╨╖ in-memory filter catalog) ╨▓╤Б╤С ╨╡╤Й╤С ╨▓╨┐╨╡╤А╨╡╨┤╨╕ тАФ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛ materialized PublicCatalogGroup.

---

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Codex acceptance: ╨╜╨╡ ╤В╨╛╨╗╤М╨║╨╛ client-side slice; API `page/limit/q` тЖТ `{ page, pages, limit, total, rows }`.
- Gaps: cities ╨▒╨╡╨╖ pager; landings list ╨▒╨╡╨╖ page params; landing detail hard-cap `events.slice(0, 160)` ╨▒╨╡╨╖ ┬л╨Ф╨░╨╗╨╡╨╡┬╗; dashboard ╤А╨░╨╜╤М╤И╨╡ ╨╡╤Й╤С ╨╛╤В╨┤╨░╨▓╨░╨╗ ╨┐╤Г╤Б╤В╤Л╨╡ `*Rows` ╨╝╨░╤Б╤Б╨╕╨▓╤Л (╨╕ importJob).
- Events/venues/buyers/orders ╤Г╨╢╨╡ ╨╕╨╝╨╡╨╗╨╕ envelope + UI pager, ╨╜╨╛ events/venues ╨▓╤Б╤С ╨╡╤Й╤С filter-after-full-load (╨╜╨╡ SQL OFFSET).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Cities: `destinationSummaryRowsFast` + `page/limit/q` + UI ╨Э╨░╨╖╨░╨┤/╨Ф╨░╨╗╨╡╨╡.
- Landings list/detail: page envelope; detail events paginated (`page/limit/q`); reuse `getCachedAdminGroupedEvents`.
- Dashboard contract: ╤В╨╛╨╗╤М╨║╨╛ `generatedAt` + `metrics` (compact).
- hydrateAdminData ╨▒╨╛╨╗╤М╤И╨╡ ╨╜╨╡ ╨╖╨░╤В╨╕╤А╨░╨╡╤В ╨╗╨╛╨║╨░╨╗╤М╨╜╤Л╨╡ row-fallback ╤З╨╡╤А╨╡╨╖ `Object.assign` ╨▓╤Б╨╡╨│╨╛ payload.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- **Performance blocker (╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣):** `buildAdminEventsList` / landings match ╨▓╤Б╤С ╨╡╤Й╤С ╤Б╨╛╨▒╨╕╤А╨░╤О╤В ╨┐╨╛╨╗╨╜╤Л╨╣ grouped catalog ╨▓ JS, ╨┐╨╛╤В╨╛╨╝ slice. ╨Э╤Г╨╢╨╡╨╜ Prisma/SQL read-model ╤Б group+filter+page ╨▓ ╨С╨Ф.

---

## 2026-07-14 тАФ Teplohod widget fallback тЖТ ┬л╨Ю╤И╨╕╨▒╨║╨░!┬╗

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ ╨┤╨╕╤Б╨║╨╛╤В╨╡╨║╨╡ `event/1375` ╨║╨╗╨╕╨║ ╨┐╨╛ ╨▓╨╕╨┤╨╢╨╡╤В╤Г ╨╛╤В╨║╤А╤Л╨▓╨░╨╗ fallback `https://teplohod.info/event/1375`, ╨░ ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╡ `/event/{id}` ╤Г Teplohod ╤Б╨╡╨╣╤З╨░╤Б ╨╛╤В╨┤╨░╤О╤В 404 ┬л╨Ю╤И╨╕╨▒╨║╨░!┬╗.
- ╨а╨░╨▒╨╛╤З╨╕╨╣ checkout: `https://account.teplohod.info/order/event-order?widget_id=14208&event_id=тАж` (╤В╨╛╤В ╨╢╨╡ URL, ╤З╤В╨╛ ╨▓ fancybox `data-src`).
- Fallback ╤Б╤А╨░╨▒╨░╤В╤Л╨▓╨░╨╗ ╤З╨╡╤А╨╡╨╖ ~700тАпms, ╨╡╤Б╨╗╨╕ fancybox ╨╡╤Й╤С ╨╜╨╡ ╤Б╨╝╨╛╨╜╤В╨╕╤А╨╛╨▓╨░╨╗╤Б╤П.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `buildTeplohodUrl` / purchase URLs тЖТ account checkout + `widget_id`.
- ╨Ш╨│╨╜╨╛╤А ╤Б╤В╨░╤А╤Л╤Е `offerDeeplinkUrl` ╨╜╨░ teplohod.info/event/* ╨┤╨╗╤П TEP.
- ╨Ъ╨╗╨╕╨╡╨╜╤В: `resolveTeplohodCheckoutUrl`, timeout fallback 2.5тАпs.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╡ ╨║╨░╤А╤В╨╛╤З╨║╨╕ ╨╜╨░ teplohod.info/event/* ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╜╤Л тАФ ╨╖╨░╨▓╨╕╤Б╨╕╨╝╨╛╤Б╤В╤М ╨╛╤В account checkout.

---

## 2026-07-13 тАФ Admin lists: pagination / load

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Р╨┤╨╝╨╕╨╜╤Б╨║╨╕╨╡ ╤Б╨┐╨╕╤Б╨║╨╕ (orders/buyers/events/landings/venues) ╨│╤А╤Г╨╖╨╕╨╗╨╕ ╨┐╨╛╤З╤В╨╕ ╨▓╤Б╤С ╨▓ ╨┐╨░╨╝╤П╤В╤М: `eventRows(10000)` ╤Б ╨┐╨╛╨╗╨╜╤Л╨╝╨╕ `description`, ╤Г ╨╖╨░╨║╨░╨╖╨╛╨▓ тАФ `jsonb_agg` ╨▓╤Б╨╡╤Е ╨▒╨╕╨╗╨╡╤В╨╛╨▓, ╨┐╨░╨│╨╕╨╜╨░╤Ж╨╕╤П ╨▒╤Л╨╗╨░ ╤В╨╛╨╗╤М╨║╨╛ ╨▓ JS ╨┐╨╛╤Б╨╗╨╡ ╨┐╨╛╨╗╨╜╨╛╨╣ ╨▓╤Л╨▒╨╛╤А╨║╨╕.
- UI pager ╨╜╨░ Events/Orders ╤Г╨╢╨╡ ╨▒╤Л╨╗, ╨╜╨░ Buyers/Venues тАФ ╨╜╨╡╤В; Landings ╤В╨░╤Й╨╕╨╗╨╕ ╨┐╨╛╨╗╨╜╤Л╨╣ ╨║╨░╤В╨░╨╗╨╛╨│ ╤А╨░╨┤╨╕ ╤Б╤З╤С╤В╤З╨╕╨║╨╛╨▓ ╨┐╤А╨░╨▓╨╕╨╗.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Orders/Buyers: lean SQL (counts + distinct titles ╨▒╨╡╨╖ ╨┐╨╛╨╗╨╜╨╛╨│╨╛ jsonb ╨▒╨╕╨╗╨╡╤В╨╛╨▓); ╨┤╨╡╤В╨░╨╗╨╕ ╨▒╨╕╨╗╨╡╤В╨╛╨▓ тАФ ╤В╨╛╨╗╤М╨║╨╛ ╨▓ `GET /orders/:id`.
- Events/Landings: `eventRows(..., { lean: true })` ╨▒╨╡╨╖ description/SEO blob; ╨║╤Н╤И grouped events 60╤Б ╨┤╨╗╤П ╤Б╨┐╨╕╤Б╨║╨░ ╤Б╨╛╨▒╤Л╤В╨╕╨╣.
- Venues/Buyers: page/limit ╨▓ API + pager ╨▓ UI.
- ╨Ю╤В╨▓╨╡╤В ╤Б╨┐╨╕╤Б╨║╨░ ╨╖╨░╨║╨░╨╖╨╛╨▓ ╨╜╨╡ ╤В╨░╤Й╨╕╤В tickets payload тАФ sheet ╨╕ ╤В╨░╨║ ╨┐╨╛╨┤╨│╤А╤Г╨╢╨░╨╡╤В detail.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╨╗╨╜╨░╤П ╨╖╨░╨╝╨╡╨╜╨░ ╨╜╨░ SQL `LIMIT/OFFSET` ╨┤╨╗╤П events ╨┐╨╛╤Б╨╗╨╡ `groupAdminEventRows` ╨╡╤Й╤С ╨▓╨┐╨╡╤А╨╡╨┤╨╕: ╨┐╨╛╨║╨░ lean + cache, ╤Д╨╕╨╗╤М╤В╤А╤Л ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╨╜╨░ ╤Б╨│╤А╤Г╨┐╨┐╨╕╤А╨╛╨▓╨░╨╜╨╜╨╛╨╝ ╨╜╨░╨▒╨╛╤А╨╡.
- ╨Я╨╛╨╕╤Б╨║╨╛╨▓╤Л╨╣ q ╨┐╨╛ ╨╜╨╛╨╝╨╡╤А╤Г ╨▒╨╕╨╗╨╡╤В╨░ ╨▓ ╤Б╨┐╨╕╤Б╨║╨╡ ╨╖╨░╨║╨░╨╖╨╛╨▓ ╤Б╨╗╨░╨▒╨╡╨╡ (╨╜╨╡╤В ticket ids ╨▓ lean row) тАФ ╨┤╨╡╤В╨░╨╗╨╕ ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╨▓ ╨║╨░╤А╤В╨╛╤З╨║╨╡ ╨╖╨░╨║╨░╨╖╨░.

---

## 2026-07-11 тАФ Slice 5: help, blog, legal, my-orders

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Slice 5 ╨┐╨╛╤А╤В╨╕╤А╨╛╨▓╨░╨╜ ╨╕╨╖ Vite `apps/public`: trust pages, FAQ `/help`, ╨▒╨╗╨╛╨│ (static fallback + API), `/my-orders` lookup.
- Codex (`codex/phase2-foundation`, `229ad3b`) ╨┐╤А╨╛╨┤╨╛╨╗╨╢╨░╨╡╤В Phase 2 backend: schema, Event Change Requests, docs ╨┐╨╛ spbboats; ╨║╨╛╨╝╨╝╨╕╤В `5b18225` ╨┐╨╡╤А╨╡╨▓╨╛╨┤╨╕╤В **`apps/public` ╨╜╨░ Next + proxy** тАФ ╨║╨╛╨╜╤Д╨╗╨╕╨║╤В╤Г╨╡╤В ╤Б Path B (`apps/web`).
- Client-╨║╨╛╨╝╨┐╨╛╨╜╨╡╨╜╤В╤Л (`HelpPage`, `MyOrdersPage`) ╨╜╨╡ ╨╝╨╛╨│╤Г╤В ╨╕╨╝╨┐╨╛╤А╤В╨╕╤А╨╛╨▓╨░╤В╤М async `SiteLayout` (╤В╤П╨╜╨╡╤В `pg` ╨▓ client bundle).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Slice 5 тАФ ╤В╨╛╨╗╤М╨║╨╛ `apps/web`, ╨▒╨╡╨╖ merge Codex Next/proxy.
- `SiteLayout`: try/catch ╨┐╤А╨╕ `buildPublicDestinationsDto` тАФ build ╨▒╨╡╨╖ ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛╨╣ ╨С╨Ф ╨╜╨╡ ╨┐╨░╨┤╨░╨╡╤В.
- `HelpPage` / `MyOrdersPage`: ╨╛╨▒╤С╤А╤В╨║╨░ `SiteLayout` ╨╜╨░ server `page.tsx`, ╨║╨╛╨╜╤В╨╡╨╜╤В тАФ ╨▓ client view.
- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜╤Л `public-articles.dto`, `public-orders.dto`, API routes `/api/public/articles`, `/orders`.
- Header: ╤Б╤Б╤Л╨╗╨║╨░ ┬л╨Я╨╛╨╝╨╛╤Й╤М┬╗; footer: blog, help, legal links.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Ы╨╛╨║╨░╨╗╤М╨╜╤Л╨╣ `pnpm web:build` ╨▒╨╡╨╖ Postgres ╨╜╨░ `:5437` тАФ static pages ╤Б ╨┐╤Г╤Б╤В╤Л╨╝ footer city block (╨╜╨░ prod ╨┐╤А╨╕ build ╨С╨Ф ╨┤╨╛╤Б╤В╤Г╨┐╨╜╨░).
- Wholesale merge Codex ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╨╜╨╡╨▓╨╛╨╖╨╝╨╛╨╢╨╡╨╜ (~429 files diff).

---

## 2026-07-10 тАФ F3 staging cutover ╨▓╤Л╨┐╨╛╨╗╨╜╨╡╨╜

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Staging ╤Б╨╡╤А╨▓╨╡╤А ╨▒╤Л╨╗ ╨╜╨░ `integrate/mvp-launch` + Node 20; ╨┤╨╗╤П F3: Node 22, pnpm, checkout `feat/next-monorepo`.
- `start-web.sh` ╨▓ systemd ╨┐╨╡╤А╨╡╤Б╨╛╨▒╨╕╤А╨░╨╗ Next ╨┐╤А╨╕ ╨║╨░╨╢╨┤╨╛╨╝ start тАФ ╨╖╨░╨╝╨╡╨╜╤С╨╜ ╨╜╨░ `start-web-prod.sh`.
- nginx `/api/` тЖТ `:4001` (legacy), `/` тЖТ Next `:3000`.
- Smoke script ╨┐╨░╨┤╨░╨╗ ╨╕╨╖-╨╖╨░ `pipefail` + pipeline ╨▓╨╜╨╡ `check()` тАФ ╨╕╤Б╨┐╤А╨░╨▓╨╗╨╡╨╜╨╛.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Deploy: `deploy-staging-next.sh`, `patch-staging-next.py`, `daibilet-web-staging.service`.
- Staging URL: https://staging.daibilet.ru тАФ SSR catalog/landings ╨▓ HTML.
- Prod cutover тАФ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╣ ╤И╨░╨│ (rollback plan ╨╜╤Г╨╢╨╡╨╜).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- `/api/health` ╤З╨╡╤А╨╡╨╖ nginx = backend (by design); Next health ╨╜╨░ `:3000` ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛.
- Widget click тАФ manual smoke.

---

## 2026-07-10 тАФ Codex audit + split ╤Б╤В╤А╨░╤В╨╡╨│╨╕╤П + ╤Б╤В╨░╤А╤В F3

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Э╨░ GitHub **╨╜╨╡╤В** ╨▓╨╡╤В╨║╨╕ `codex/phase2-finance-next`; Codex ╤А╨░╨▒╨╛╤В╨░╨╡╤В ╨▓ **`codex/phase2-foundation`** (`229ad3b`, unrelated history ╤Б `feat/next-monorepo`).
- Codex ╤Б╨┤╨╡╨╗╨░╨╗ Phase 2 schema (~66 models), Event Change Requests, admin queue тАФ **╤Ж╨╡╨╜╨╜╨╛ ╨┤╨╗╤П cherry-pick**.
- Codex ╤В╨░╨║╨╢╨╡ ╨┐╨╡╤А╨╡╨▓╤С╨╗ **`apps/public` ╨╜╨░ Next ╤Б proxy** ╨╜╨░ `:4000` (`5b18225`) тАФ **╨║╨╛╨╜╤Д╨╗╨╕╨║╤В╤Г╨╡╤В** ╤Б Path B (`apps/web`, full-stack read).
- Cursor F2 complete: `apps/web`, 36 landing SSG paths, parity script.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- **Canonical public Next:** ╤В╨╛╨╗╤М╨║╨╛ `apps/web` ╨╜╨░ `feat/next-monorepo`. Codex Next/proxy **╨╜╨╡ ╨╝╨╡╤А╨╢╨╕╤В╤М**.
- **╨Ш╨╜╤В╨╡╨│╤А╨░╤Ж╨╕╤П Codex:** cherry-pick schema + event change requests + admin contracts **╨┐╨╛╤Б╨╗╨╡ F3 cutover** ([codex-cherry-pick-plan.md](./codex-cherry-pick-plan.md)).
- Handoff ╨╛╨▒╨╜╨╛╨▓╨╗╤С╨╜: [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md).
- F3 ╨░╤А╤В╨╡╤Д╨░╨║╤В╤Л: `deploy-staging-next.sh`, `daibilet-web-staging.service`, `staging-next.conf.snippet`, `launch-staging-smoke-next.sh`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Wholesale merge `codex/phase2-foundation` тЖТ guaranteed conflicts (schema, Next app location, lockfile).
- F3 server-side deploy ╤В╤А╨╡╨▒╤Г╨╡╤В ops ╨╜╨░ staging (213.171.7.16) тАФ ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛ ╤В╨╛╨╗╤М╨║╨╛ scripts/docs.

---

## 2026-07-10 тАФ F2 ╨╖╨░╨║╤А╤Л╤В: landings ISR, filters, widgets, parity

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Legacy landings ╨╕╤Б╨┐╨╛╨╗╤М╨╖╤Г╤О╤В ╤Б╨╗╨╛╨╢╨╜╤Г╤О URL-╤Б╤Е╨╡╨╝╤Г: category-first (`/rechnye-progulki/moscow/`) ╨╕ city-first (`/saint-petersburg/night-bridges/`). ╨Ы╨╛╨│╨╕╨║╨░ ╨┐╨╛╤А╤В╨╕╤А╨╛╨▓╨░╨╜╨░ ╨╕╨╖ `landing-routes.ts` SPA.
- `buildPublicLandingPage` / `buildPublicLandingPageManaged` ╤Г╨╢╨╡ ╨▓ `dto.js`; ╨┤╨╗╤П Next ╨┤╨╛╤Б╤В╨░╤В╨╛╤З╨╜╨╛ wrapper `public-landing.dto.ts` ╨┐╨╛ ╨░╨╜╨░╨╗╨╛╨│╨╕╨╕ ╤Б venue/city.
- Next build pre-render╨╕╤В 36 landing paths (9 one-segment + 23 two-segment) ╤Б `revalidate=3600`.
- ╨Ъ╨░╤В╨░╨╗╨╛╨│ typed DTO ╨╕╤Б╨┐╨╛╨╗╤М╨╖╤Г╨╡╤В `from`/`to` ╨┤╨╗╤П date range; legacy URL тАФ `dateFrom`/`dateTo`. ╨Ь╨░╨┐╨┐╨╕╨╜╨│ ╨┤╨╛╨▒╨░╨▓╨╗╨╡╨╜ ╨▓ `parseCatalogPageQuery`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Landings: ISR + `generateStaticParams` ╨┤╨╗╤П top slugs; catch-all `[segment]`/`[segment2]`/`[segment3]` ╤Б `notFound()` ╨┤╨╗╤П ╨╜╨╡-landing ╨┐╤Г╤В╨╡╨╣.
- Middleware 301: `/landings/*` ╨╕ misordered `/{city}/{category}` тЖТ canonical landing href.
- Widgets: SSR ╤А╨╡╨╜╨┤╨╡╤А╨╕╤В ╤Ж╨╡╨╜╤Г/╨╛╨┐╨╕╤Б╨░╨╜╨╕╨╡; `PurchaseWidget.client.tsx` тАФ Teplohod тЖТ TC тЖТ external link.
- Parity: `pnpm backend:next:parity` тАФ ╤А╨░╤Б╤И╨╕╤А╨╡╨╜╨╜╤Л╨╣ catalog (city/date/sort) + landing slugs + optional HTTP compare (`WEB_BASE_URL` vs `LEGACY_BASE_URL`).
- F3 checklist ╨▓╤Л╨╜╨╡╤Б╨╡╨╜ ╨▓ ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ doc.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- `pnpm` ╨╜╨╡ ╨▓ PATH ╨╜╨░ ╨╜╨╡╨║╨╛╤В╨╛╤А╤Л╤Е Windows-╤Б╤А╨╡╨┤╨░╤Е тАФ ╤Б╨▒╨╛╤А╨║╨░ ╤З╨╡╤А╨╡╨╖ `npm exec pnpm -- web:build`.
- `/podborki` ╤Б `searchParams` ╨╛╤Б╤В╨░╤С╤В╤Б╤П dynamic (╞Т) ╨╜╨╡╤Б╨╝╨╛╤В╤А╤П ╨╜╨░ `revalidate` тАФ ╨┐╤А╨╕╨╡╨╝╨╗╨╡╨╝╨╛ ╨┤╨╗╤П MVP.
- ╨Я╨╛╨╗╨╜╤Л╨╣ UI landings (3600 ╤Б╤В╤А╨╛╨║ SPA) ╨╜╨╡ ╨┐╨╛╤А╤В╨╕╤А╨╛╨▓╨░╨╜ тАФ ╤Г╨┐╤А╨╛╤Й╤С╨╜╨╜╤Л╨╣ SSR view + EventCard grid.

---

## 2026-07-10 тАФ F2 core: catalog, event, city, venue SSR

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Next bundler ╨╗╨╛╨╝╨░╨╗ `createRequire` ╨▓ `db.ts` тАФ ╨╖╨░╨╝╨╡╨╜╤С╨╜ ╨╜╨░ ╨┐╤А╤П╨╝╨╛╨╣ `import pg`.
- `@daibilet/backend` ╨▓ `transpilePackages`, `pg` ╨▓ `serverExternalPackages`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Read path ╤З╨╡╤А╨╡╨╖ `@daibilet/backend/public-read` ╨▒╨╡╨╖ HTTP proxy.
- Catalog default 100, selector 100/200/300 ╨▓ `@daibilet/contracts/catalog`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Type casts ╨▓ public-city.dto.ts ╨┤╨╗╤П ╤Б╨╛╨▓╨╝╨╡╤Б╤В╨╕╨╝╨╛╤Б╤В╨╕ ╤Б Next build тАФ ╨▓╤А╨╡╨╝╨╡╨╜╨╜╨╛ ╨┤╨╛ F5.

---

## 2026-07-10 тАФ F1: monorepo shell

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Path B ╤Г╤В╨▓╨╡╤А╨╢╨┤╤С╨╜: SEO ╨╜╨╡ ╨╛╤В╨║╨╗╨░╨┤╤Л╨▓╨░╨╡╨╝, full-stack Next.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- pnpm workspaces, apps/web Next 15, packages/contracts + config.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Prod ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨╜╨░ Vite ╨┤╨╛ F3 cutover.

---

## 2026-07-10 тАФ F3 prod cutover + Post-F3 cherry-pick (slice 1тАУ4)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Prod Next ╨╜╨░ **:3001** (staging :3000) тАФ ╨╛╨┤╨╕╨╜ ╤Е╨╛╤Б╤В, ╤А╨░╨╖╨╜╤Л╨╡ ╨┐╨╛╤А╤В╤Л.
- Snapshot rollback: `/var/backups/daibilet/pre-next-20260710-185139`.
- `next build` OOM ╨╜╨░ 3.8GB RAM тАФ workaround: ╨╛╤Б╤В╨░╨╜╨╛╨▓╨╕╤В╤М staging Next ╨╜╨░ ╨▓╤А╨╡╨╝╤П build.
- Smoke: SSR ╤З╨╡╤А╨╡╨╖ nginx тЬЕ; ╨╗╨╛╨║╨░╨╗╤М╨╜╤Л╨╣ `:3001` health ╨╝╨╛╨╢╨╡╤В ╤Д╨╗╨░╨┐╨░╤В╤М ╨┐╤А╨╕ restart systemd.
- Codex cherry-pick: 4 migrations + schema 29тЖТ66 models, ECR backend + admin contracts + Vite page.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- Prod nginx patched (`patch-prod-next.py`), `daibilet-web` enabled.
- Cherry-pick ╤З╨╡╤А╨╡╨╖ `git checkout origin/codex/phase2-foundation -- <paths>` (╨╜╨╡ wholesale merge).
- Admin UI ╨╖╨░ `VITE_DAIBILET_EVENT_CHANGE_REQUESTS=1`; API routes wired ╨▓ `server-entry.ts`.
- Codex Next/proxy (`5b18225`) ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г **skip**.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- `pnpm db:deploy` ╨╜╨░ staging/prod ╨╡╤Й╤С ╨╜╨╡ ╨▓╤Л╨┐╨╛╨╗╨╜╨╡╨╜ тАФ ╨╜╤Г╨╢╨╡╨╜ backup `5438`/`5437`.
- `backend:test:ts` ╨╜╨╡ ╨▓╨║╨╗╤О╤З╨░╨╡╤В ECR tests тАФ ╨╖╨░╨┐╤Г╤Б╨║╨░╤В╤М ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛ `tsx --test src/event-change-request-*.test.ts`.

---

## 2026-07-10 тАФ Next UI polish (slice 1): design system + shell + home

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- F3 data path ╨│╨╛╤В╨╛╨▓, ╨╜╨╛ Next ╨▓╤Л╨│╨╗╤П╨┤╨╡╨╗ ┬л╨│╨╛╨╗╤Л╨╝┬╗: 3 nav-╤Б╤Б╤Л╨╗╨║╨╕, ╨╝╨╕╨╜╨╕╨╝╨░╨╗╤М╨╜╤Л╨╣ footer, ╨┐╤А╨╛╤Б╤В╤Л╨╡ ╨║╨░╤А╤В╨╛╤З╨║╨╕.
- Vite public ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В ╨┐╨╛╨╗╨╜╤Л╨╣ design system (~290 ╤Б╤В╤А╨╛╨║ CSS) ╨╕ Header/Footer ╤Б 7 ╤А╨░╨╖╨┤╨╡╨╗╨░╨╝╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Я╨╛╤А╤В `globals.css` + tailwind tokens ╨╕╨╖ `apps/public`.
- Header: fixed blur, mobile sheet, ╨┐╨╛╨╗╨╜╨░╤П nav (events/cities/venues/locations/podborki).
- Footer: 4 ╨║╨╛╨╗╨╛╨╜╨║╨╕ (╤Б╨╛╨▒╤Л╤В╨╕╤П, ╨│╨╛╤А╨╛╨┤╨░, ╨║╨╛╨╝╨┐╨░╨╜╨╕╤П), email.
- Home: gradient hero + ╨┐╨╛╨╕╤Б╨║, ╨┐╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╤П, city cards, format tiles, trust block.
- EventCard: ╤А╨╡╨╣╤В╨╕╨╜╨│, price pill, hover, category chip.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╨╗╨╜╤Л╨╣ UI parity (landings block renderer, catalog advanced filters, auth/favorites) тАФ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╡ slices.
- `/images/cities/*.png` тАФ static assets ╨╜╨░ nginx, ╨╜╨╡ ╨▓ repo; fallback emoji + `heroImageUrl` ╨╕╨╖ API.

---

## 2026-07-11 тАФ Next UI polish (slice 3): event page hero + sticky buy

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- ╨Я╨╛╤Б╨╗╨╡ slice 1тАУ2 event page ╨╛╤Б╤В╨░╨▓╨░╨╗╨░╤Б╤М ╨╜╨░ ╤Г╨┐╤А╨╛╤Й╤С╨╜╨╜╨╛╨╝ `PurchaseWidget`: ╨▒╨╡╨╖ hero, ╨▒╨╡╨╖ sticky buy card, ╨▒╨╡╨╖ ╤Б╨┐╨╕╤Б╨║╨░ ╤Б╨╡╨░╨╜╤Б╨╛╨▓.
- Vite `EventPage.tsx` тАФ ╤Н╤В╨░╨╗╨╛╨╜: full-bleed hero, breadcrumbs, mobile CTA, buy card ╤Б ╨║╨░╤В╨╡╨│╨╛╤А╨╕╤П╨╝╨╕/╤Б╨╡╨░╨╜╤Б╨░╨╝╨╕, TC slot-╨║╨╗╨╕╨║╨╕, Teplohod embed.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `EventHero` + `EventBuyCard` ╨▓ `EventPage.client.tsx`; ╨╛╨┐╨╕╤Б╨░╨╜╨╕╨╡/╤В╨╡╨│╨╕ тАФ `EventPageSections.tsx`.
- ╨г╤В╨╕╨╗╨╕╤В╤Л: `event-page-utils.ts` (╤Ж╨╡╨╜╤Л, ╨▓╨╛╨╖╤А╨░╤Б╤В, HTML ╨╛╨┐╨╕╤Б╨░╨╜╨╕╨╡), `event-purchase.ts` (TC targets, purchasable sessions).
- `TcWidget.client.tsx`: `TcSessionSlot`, hero/default `TcWidgetButton`, session rows.
- `TeplohodWidget.client.tsx`: embed ╤Б `#teplohod-widget`, CSS override, hero scroll+click.
- Layout `/events/[slug]`: hero тЖТ 2-col (content + sticky `top-20`) тЖТ related events.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- Slice 4 (landings block renderer) ╨╕ slice 5 (auth/help/legal) тАФ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╡.
- QuickInfo ╨╜╨░ event page ╤Г╨┐╤А╨╛╤Й╤С╨╜ vs Vite (╨▒╨╡╨╖ event-location resolver) тАФ ╨┤╨╛╤Б╤В╨░╤В╨╛╤З╨╜╨╛ ╨┤╨╗╤П functional parity.

---

## 2026-07-11 тАФ Next UI polish (slice 4): landings content blocks

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Backend (`dto.js`) ╤Г╨╢╨╡ ╨╛╤В╨┤╨░╤С╤В `blocks` (DB `LandingContentBlock` ╨╕╨╗╨╕ `buildDefaultLandingBlocks`).
- Next `LandingPageView` ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╗ ╤В╨╛╨╗╤М╨║╨╛ ╨╖╨░╨│╨╛╨╗╨╛╨▓╨╛╨║ + ╨║╨░╤А╤В╨╛╤З╨║╨╕ ╤Б╨╛╨▒╤Л╤В╨╕╨╣ тАФ ╨▒╨╡╨╖ trust/value/city grid/FAQ.

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- `LandingContentBlocks` + `LandingFaqSection` тАФ ╨┐╨╛╤А╤В ╤В╨╕╨┐╨╛╨▓ ╨▒╨╗╨╛╨║╨╛╨▓ ╨╕╨╖ Vite.
- ╨в╨╕╨┐╨╕╨╖╨░╤Ж╨╕╤П `PublicLandingPageDto.blocks` тЖТ `LandingContentBlockDto[]`.
- ╨б╨╡╨║╤Ж╨╕╤П ╤Б╨╛╨▒╤Л╤В╨╕╨╣ `#variants` ╨┤╨╗╤П CTA anchor.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╨╗╨╜╤Л╨╣ landing parity (hero sticky, filters, bridges/dinner profiles) тАФ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛, ╨╜╨╡ slice 4.
- Slice 5: auth/pages (`/help`, `/blog`, legal).

## 2026-07-19 тАФ Google Search Console verification

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨Э╤Г╨╢╨╡╨╜ HTML-╤Д╨░╨╣╨╗ ╨▓╨╡╤А╨╕╤Д╨╕╨║╨░╤Ж╨╕╨╕ Google ╨┐╨╛ URL `/googleb3313872246ac993.html`, ╨┐╨╛ ╨░╨╜╨░╨╗╨╛╨│╨╕╨╕ ╤Б Yandex (`apps/web/public/yandex_*.html`).
- ╨б╤В╨░╤В╨╕╨║╨░ Next ╨╛╤В╨┤╨░╤С╤В╤Б╤П ╨╕╨╖ `apps/web/public/`; ╨┤╤Г╨▒╨╗╨╕╤А╨╛╨▓╨░╨╜╨╕╨╡ ╨▓ `apps/public/public/` ╨┤╨╗╤П verify-╤Д╨░╨╣╨╗╨╛╨▓ ╨╜╨╡ ╤В╤А╨╡╨▒╤Г╨╡╤В╤Б╤П.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜ `apps/web/public/googleb3313872246ac993.html`; commit + deploy ╨╜╨░ prod, ╤З╤В╨╛╨▒╤Л URL ╤Б╤А╨░╨╖╤Г ╨╛╤В╨▓╨╡╤З╨░╨╗ 200.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- ╨Э╨╡╤В.
---

## 2026-07-19 - Prod CPU/RAM mitigation (legacy Docker off + systemd limits + TEP spread)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П

- Host 3.8Gi: swap ╨▒╤Л╨╗ ╨┐╨╛╤З╤В╨╕ ╨┐╨╛╨╗╨╜╤Л╨╣ (~2Gi used) ╨┐╤А╨╕ ╨╛╨┤╨╜╨╛╨▓╤А╨╡╨╝╨╡╨╜╨╜╨╛╨╝ legacy Docker + staging + prod Next/API.
- Prod ╤В╤А╨░╤Д╨╕╨║: nginx тЖТ systemd `daibilet-web:3001` / `daibilet-api:4000`; ╨С╨Ф prod = `daibilet-tours-postgres:5437`.
- Legacy compose (frontend/backend/admin/supplier/postgres16/redis) ╨╕ staging (api:4001, postgres:5438, redis) ╨╜╨╡ ╨╛╨▒╤Б╨╗╤Г╨╢╨╕╨▓╨░╨╗╨╕ daibilet.ru / admin.daibilet.ru.
- TEP auto-sync ╨║╨░╨╢╨┤╤Л╨╡ 360 ╨╝╨╕╨╜ + ╤Б╤А╨░╨╖╤Г warm/revalidate (~30тАУ45s warm) ╨┤╨░╨▓╨░╨╗╨╕ ╨┐╨╕╨║ ╨▓╨╝╨╡╤Б╤В╨╡ ╤Б import (~80тАУ120s).

### ╨а╨╡╤И╨╡╨╜╨╕╤П

- ╨Ю╤Б╤В╨░╨╜╨╛╨▓╨╗╨╡╨╜╤Л (stop + `restart=no`, volumes **╨╜╨╡** ╤Г╨┤╨░╨╗╤П╨╗╨╕╤Б╤М): legacy Docker stack + staging postgres/redis; systemd `daibilet-api-staging` / `daibilet-web-staging` stop+disable.
- ╨Ю╤Б╤В╨░╨▓╨╗╨╡╨╜: `daibilet-tours-postgres`, `daibilet-web`, `daibilet-api`.
- systemd MemoryHigh/MemoryMax + `NODE_OPTIONS=--max-old-space-size` (web 896/1400M, api 1024/1536M); drop-ins ╨▓ `deploy/systemd/*.service.d/memory.conf`.
- TEP: default interval 12h; warm delay 15 min; startup delay 10 min; import ╤З╨╡╤А╨╡╨╖ `nice`; env ╨▓ `deploy/env/prod.env.example`.
- ╨Ь╨╛╨╜╨╕╤В╨╛╤А╨╕╨╜╨│: `deploy/scripts/watch-tep-sync-load.sh`, `deploy/scripts/oom-watch.sh` (+ hourly cron).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л

- ╨Я╨╛╤Б╨╗╨╡ stop available RAM ╨▓╤Л╤А╨╛╤Б, swap ╤Г╨┐╨░╨╗ ~2GiтЖТ~65Mi тАФ ╨╜╤Г╨╢╨╜╨╛ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╤М ╤Б╤В╨░╨▒╨╕╨╗╤М╨╜╨╛╤Б╤В╤М ╨┐╨╛╨┤ ╨╗╨╕╨╝╨╕╤В╨░╨╝╨╕ MemoryMax ╨┐╤А╨╕ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╡╨╝ sync.
- staging.daibilet.ru ╨▓╤А╨╡╨╝╨╡╨╜╨╜╨╛ ╨▒╨╡╨╖ API/DB ╨┤╨╛ ╤П╨▓╨╜╨╛╨│╨╛ start ╨║╨╛╨╜╤В╨╡╨╣╨╜╨╡╤А╨╛╨▓/units.
- Rollback: `docker start` ╨╜╤Г╨╢╨╜╤Л╤Е ╨║╨╛╨╜╤В╨╡╨╣╨╜╨╡╤А╨╛╨▓; `systemctl enable --now daibilet-*-staging`; ╤Г╨▒╤А╨░╤В╤М drop-ins / ╨▓╨╡╤А╨╜╤Г╤В╤М `TEP_AUTO_SYNC_*`.


---

## 2026-07-19 - Admin grouped readiness: future sibling clears NO_FUTURE_SESSIONS

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨Я╨╛╤Б╨╗╨╡ ╨│╤А╤Г╨┐╨┐╨╕╤А╨╛╨▓╨║╨╕ sibling-╤Б╨╛╨▒╤Л╤В╨╕╨╣ past-only ╤Б╨╗╨╛╤В ╤Б `NO_FUTURE_SESSIONS` ╨║╤А╨░╤Б╨╕╨╗ ╨▓╤Б╤О ╨║╨░╤А╤В╨╛╤З╨║╤Г ╨║╨░╨║ blocked, ╨┤╨░╨╢╨╡ ╨╡╤Б╨╗╨╕ ╨▓ ╨│╤А╤Г╨┐╨┐╨╡ ╨╡╤Б╤В╤М future-╤Б╨╡╨░╨╜╤Б.
- Backend (`groupAdminEventRows` / `finalizeGroupedAdminReadiness`) тАФ source of truth; Admin UI ╨╖╨╡╤А╨║╨░╨╗╨╕╤В ╤В╤Г ╨╢╨╡ ╨╗╨╛╨│╨╕╨║╤Г.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- `finalizeGroupedAdminReadiness`: ╨┐╤А╨╕ `groupHasFutureSession` ╤Б╨╜╨╕╨╝╨░╨╡╤В╤Б╤П ╤В╨╛╨╗╤М╨║╨╛ `NO_FUTURE_SESSIONS`; ╨╛╤Б╤В╨░╨╗╤М╨╜╤Л╨╡ high-issues ╨╛╤Б╤В╨░╤О╤В╤Б╤П.
- ╨Ч╨╡╤А╨║╨░╨╗╨╛ ╨▓ `apps/admin/src/pages/EventsPage.tsx`; unit-╤В╨╡╤Б╤В `admin-group-readiness.test.ts` ╨▓ `test:ts`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- Prod deploy ╨▓╤Л╨┐╨╛╨╗╨╜╨╡╨╜: API `daibilet-api` + admin static `/var/www/daibilet/admin` ╨╜╨░ `bb7fc9c`.
- Health OK; unit-╤В╨╡╤Б╤В admin-group-readiness 4/4 ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡.

---

## 2026-07-19 - Deploy: grouped readiness fix (API + admin)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨Ч╨░╨┤╨╡╨┐╨╗╨╛╨╡╨╜ `bb7fc9c`: restart `daibilet-api`, Vite build admin тЖТ `/var/www/daibilet/admin`.
- ╨С╨╡╨╖ ╨┐╨╛╨╗╨╜╨╛╨│╨╛ `deploy-prod-next.sh` (Next web ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕).
- Health `/api/health` OK; `admin-group-readiness.test.ts` 4/4 pass ╨╜╨░ prod.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- Source of truth тАФ backend grouping; admin static ╨╛╨▒╨╜╨╛╨▓╨╗╤С╨╜ ╨╖╨╡╤А╨║╨░╨╗╨╛╨╝ UI.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- Auto-stash ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡ ╨┐╨╛╤Б╨╗╨╡ pull (untracked drop-ins ╤Г╨╢╨╡ ╨▓ commit) тАФ ╨╝╨╛╨╢╨╜╨╛ drop; ╨╜╨╡ ╨▓╨╗╨╕╤П╨╡╤В ╨╜╨░ readiness.

---

## 2026-07-19 - CPU/RAM audit follow-up (cron +x, TEP isolation, oom-watch)

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- 	c-orders-sync.sh ╨╜╨░ prod ╨▒╤Л╨╗ ╨▒╨╡╨╖ execute bit тЖТ crontab */10 ╨┐╨╕╤Б╨░╨╗ Permission denied.
- In-process TEP auto-sync + full public warm ╨╜╨░ ╨║╨░╨╢╨┤╨╛╨╝ ╤А╨╡╤Б╤В╨░╤А╤В╨╡ API ╨┤╨░╨▓╨░╨╗╨╕ ╨┐╨╕╨║╨╕ CPU/RAM ╨╜╨░ 3.8Gi.
- Hourly oom-watch ╨╜╨╡ ╨╗╨╛╨▓╨╕╨╗ ╤А╨╛╤Б╤В swap / ╨┐╤А╨╕╨▒╨╗╨╕╨╢╨╡╨╜╨╕╨╡ ╨║ MemoryHigh ╨╝╨╡╨╢╨┤╤Г ╤З╨░╤Б╨░╨╝╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- chmod +x ╨╜╨░ cron/scripts ╨▓ git (100755) ╨╕ ╨╜╨░ prod; flock ╨▓ tc-orders ╤Б╨╛╤Е╤А╨░╨╜╤С╨╜.
- Deploy discipline: ╨║╨╛╨╝╨╝╨╡╨╜╤В╨░╤А╨╕╨╣ ╨▓ deploy-prod-next.sh + README тАФ ╨╛╨┤╨╕╨╜ controlled restart sequence.
- TEP: TEP_AUTO_SYNC_ENABLED=0 + cron/systemd 	ep-catalog-sync (nice + MemoryMax); in-process fallback ╤Б startup delay 45m + skip-if-fresh 6h.
- DAIBILET_PUBLIC_STARTUP_WARM=0 тАФ ╨┐╨╛╨╗╨╜╤Л╨╣ warm ╤В╨╛╨╗╤М╨║╨╛ post-sync delayed.
- oom-watch ╨║╨░╨╢╨┤╤Л╨╡ 5 ╨╝╨╕╨╜; alerts ╨▓ oom-watch-alerts.log ╨┐╤А╨╕ swap>350Mi ╨╕╨╗╨╕ MemoryCurrentтЙе90% MemoryHigh.
- PG ╨▓ Docker ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕ (optional later, documented).

### Prod apply (2026-07-19)
- Commit 9fb19c3 pulled; cron +x; env TEP_AUTO_SYNC_ENABLED=0, startup delay 45m / skip-if-fresh 6h, DAIBILET_PUBLIC_STARTUP_WARM=0.
- Crontab: 	c-orders */10, oom-watch */5, 	ep-catalog-sync 20 */12.
- One restart daibilet-api only. Smoke: API/web health 200; tc-orders ran (no Permission denied); journal: in-process TEP disabled + startup warm skipped.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- ╨Я╨╛╤Б╨╗╨╡ ╤Б╨╝╨╡╨╜╤Л env ╨╜╤Г╨╢╨╡╨╜ **╨╛╨┤╨╕╨╜** restart daibilet-api (╨╜╨╡ ╨┐╨░╤З╨║╨╛╨╣).
- ╨Я╨╡╤А╨▓╤Л╨╡ ╨╝╨╕╨╜╤Г╤В╤Л ╨┐╨╛╤Б╨╗╨╡ ╨╛╤В╨║╨╗╤О╤З╨╡╨╜╨╕╤П startup public warm тАФ cold cache ╨┤╨╛ ╨┐╨╡╤А╨▓╨╛╨│╨╛ ╤В╤А╨░╤Д╨╕╨║╨░ / post-sync warm.


## 2026-07-19 тАФ Prod: ╨▒╨╕╤В╤Л╨╣ .next mid-deploy + cleanDisplayText

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨Я╨╛╤Б╨╗╨╡ ╤Д╨╕╨║╤Б╨░ cleanDisplayText ╨┐╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╤Л╨╣ deploy ╨╛╤Б╤В╨░╨▓╨╕╨╗ .next ╨▒╨╡╨╖ prerender-manifest.json тЖТ daibilet-web crash-loop, ╤Б╨░╨╣╤В 502 / Application error.
- ╨б╤В╨░╤В╨╕╨║╨░ /_next/static ╤З╨╡╤А╨╡╨╖ proxy ╨╜╨░ Node: ╨┐╤А╨╕ down Next тЖТ 502 ╨╜╨░ chunks.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- `systemctl stop` тЖТ `rm -rf apps/web/.next` тЖТ `pnpm web:build` тЖТ start; `/events` ╨╕ event slug 200, journal ╨▒╨╡╨╖ `cleanDisplayText`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- ╨Э╨╡╨╗╤М╨╖╤П ╨┐╨░╤А╨░╨╗╨╗╨╡╨╗╨╕╤В╤М ╨┤╨▓╨░ `deploy-prod-next` ╨╜╨░ ╨╛╨┤╨╜╨╛╨╝ ╤Е╨╛╤Б╤В╨╡.


## 2026-07-22 тАФ ╨Ъ╨╛╨╗╨╛╨╜╨║╨░ ╨Х╨╗╨╡╨╜╤Л: ╨б╨Я╨▒ ╤Б ╤А╨╡╨▒╤С╨╜╨║╨╛╨╝ ╨▓ ╨┤╨╛╨╢╨┤╤М

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨в╨╡╨║╤Б╤В ╨║╨╛╨╗╨╛╨╜╨║╨╕ ╨┐╤А╨╛ ╤З╨╡╤В╤Л╤А╨╡ indoor-╤Д╨╛╤А╨╝╨░╤В╨░ (╨┐╨╗╨░╨╜╨╡╤В╨░╤А╨╕╨╣, ╨Ь╤Г╨╖╨╡╨╣ ╨Ь╨░╤В╤А╨╡╤И╨║╨╕, ╨У╨░╤А╤А╨╕ ╨Я╨╛╤В╤В╨╡╤А, ╨Ю╤Б╨╛╨▒╨╜╤П╨║ ╨Ь╤П╤Б╨╜╨╕╨║╨╛╨▓╨░) + ╨╖╨░╨┐╨░╤Б╨╜╨╛╨╣ outdoor (╨┐╨╡╤Б╤З╨░╨╜╤Л╨╡ ╤Б╨║╤Г╨╗╤М╨┐╤В╤Г╤А╤Л).
- ╨Я╨╛╤Б╨╗╨╡ pnpm blog:upsert ╤Б╤В╤А╨░╨╜╨╕╤Ж╨░ ╨▓ ╨С╨Ф PUBLISHED, ╨╜╨╛ revalidate ╤Б ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛╨│╨╛ PowerShell ╨╗╨╛╨╝╨░╨╗╤Б╤П ╨╜╨░ Authorization: Bearer (host resolve / 401).

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- ╨б╤В╨░╤В╤М╤П `spb-s-rebenkom-v-dozhd`, authorId `elena`, citySlug `saint-petersburg`; cover + distinct inline.
- Soft-links ╨╜╨░ venues/events ╨║╨░╤В╨░╨╗╨╛╨│╨░; deploy-prod-next + upsert.
- Revalidate ╨╜╨░╨┤╤С╨╢╨╜╨╡╨╡ ╨│╨╛╨╜╤П╤В╤М **╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡** ╤З╨╡╤А╨╡╨╖ SSH + here-doc (curl ╤Б Bearer ╨╕╨╖ .env), ╨╜╨╡ ╨╕╨╖ Windows PowerShell.
- Smoke 200: page, cover, inline; ╨▓ HTML тАФ ╨Х╨╗╨╡╨╜╨░, ╨з╨╕╤В╨░╨╣╤В╨╡ ╤В╨░╨║╨╢╨╡, ╤Б╤Б╤Л╨╗╨║╨╕ ╨╜╨░ ╤Б╨╛╨▒╤Л╤В╨╕╤П/╤Е╨░╨▒.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- ╨н╨║╤А╨░╨╜╨╕╤А╨╛╨▓╨░╨╜╨╕╨╡ Bearer ╨▓ PowerShell ╨┐╤А╨╕ remote curl тАФ ╨╜╨╡ ╨╕╤Б╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╤М ╨╛╨┤╨╜╨╛╤Б╤В╤А╨╛╤З╨╜╤Л╨╣ ssh ╤Б ╨▓╨╗╨╛╨╢╨╡╨╜╨╜╤Л╨╝╨╕ ╨║╨░╨▓╤Л╤З╨║╨░╨╝╨╕.

### Prod proof (2026-07-23)
- Deploy `05a5901` + nginx patch; admin SSL тЖТ LE `api.daibilet.ru` cert (SAN includes admin).
- Smoke: `https://daibilet.ru/events` 200; `https://admin.daibilet.ru/` 401 ╨▒╨╡╨╖ auth / 200 ╤Б Basic Auth (Next dashboard HTML); `/legacy` 200; `/events` `/sources` 200.
- Public site ╨╜╨╡ ╨╖╨░╤В╤А╨╛╨╜╤Г╤В.

## 2026-07-23 - F4.1c: cutover admin.daibilet.ru тЖТ Next

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- Prod admin ╨▒╤Л╨╗ Vite static root + nginx auth_basic + `/api` тЖТ :4000.
- Next ╤Г╨╢╨╡ ╨╕╨╝╨╡╨╗ `/admin/*` ╤Б Basic Auth ╨╕ live screens (F4.0тАУF4.1b); deep Events/Landings CRUD ╨╡╤Й╤С ╨╜╨░ Vite.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- ╨Т╨░╤А╨╕╨░╨╜╤В B: `admin.daibilet.ru` тЖТ Next proxy; middleware host rewrite `/`тЖТ`/admin`, `/events`тЖТ`/admin/events`.
- Vite ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨╜╨░ `admin.daibilet.ru/legacy/` (`VITE_ADMIN_BASE=/legacy/`, basename) ╨┤╨╗╤П override/matches.
- `NEXT_PUBLIC_VITE_ADMIN_URL` default тЖТ `тАж/legacy`. Nginx patch `patch-prod-admin-next.py`; deploy rsync тЖТ `/var/www/daibilet/legacy`.
- Docs: [phase-f4-admin-cutover.md](./phases/phase-f4-admin-cutover.md). Smoke: `scripts/smoke-admin-next-cutover.sh`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- htpasswd ╨╕ ADMIN_* ╨┤╨╛╨╗╨╢╨╜╤Л ╤Б╨╛╨▓╨┐╨░╨┤╨░╤В╤М (╨┤╨▓╨╛╨╣╨╜╨╛╨╣ Basic Auth nginx+Next).
- Prod deploy ╤Б ╤Н╤В╨╛╨╣ ╨╝╨░╤И╨╕╨╜╤Л ╨╝╨╛╨╢╨╡╤В ╤Г╨┐╨╕╤А╨░╤В╤М╤Б╤П ╨▓ SSH keys - ╨┐╨░╤В╤З ╨┐╤А╨╕╨╝╨╡╨╜╤П╨╡╤В╤Б╤П ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡ ╤З╨╡╤А╨╡╨╖ deploy script.
- ╨Я╨╛╨╗╨╜╤Л╨╣ retire Vite - ╨┐╨╛╤Б╨╗╨╡ port Events/Landings edit (╨╜╨╡ F4.2 worker).

## 2026-07-23 - F4.1b: Sources / Settings ╨▓ Next admin

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- Vite Sources: GET `/api/admin/sources` + POST TC/TEP sync. Sync-health - alias ╨╜╨░ Sources.
- Vite Settings: ╨╜╨╡╤В `/api/admin/settings`; ╤В╨╛╨╗╤М╨║╨╛ read-only UX (flags/roles/links).

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- `/admin/sources`: cards + table health, openIssues, last sync; server actions sync Ticketscloud/Teplohod.
- `/admin/sync-health` тЖТ redirect ╨╜╨░ `/admin/sources`.
- `/admin/settings`: read-only (auth/API base, imports, public URLs, static feature flags, role stubs). Writable toggles ╨╜╨╡ ╨┤╨╛╨▒╨░╨▓╨╗╤П╨╗╨╕.
- Nav: Sources ╨╕ Settings ready. SEO public ╤Д╨░╨╣╨╗╤Л ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╗╨╕.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- Sync POST ╨╝╨╛╨╢╨╡╤В ╨▒╤Л╤В╤М ╨┤╨╛╨╗╨│╨╕╨╝; UI ╨┤╨╡╨╗╨░╨╡╤В form POST ╨╕ ╨╢╨┤╤С╤В redirect. ╨Ф╨╗╤П prod ╨╜╤Г╨╢╨╡╨╜ timeout/proxy ╨║╨░╨║ ╤Г Vite.
- Cutover admin subdomain (F4.1c) ╨╡╤Й╤С ╨╜╨╡ ╨╜╨░╤З╨░╤В.

## 2026-07-23 - F4.1a: Events / Landings / Articles ╨▓ Next admin

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- Vite Events/Landings - ╤В╤П╨╢╤С╨╗╤Л╨╡ sheet/CRUD (override, taxonomy, pin/exclude). Articles CRUD ╨║╨╛╨╝╨┐╨░╨║╤В╨╜╨╡╨╡ ╨╕ ╤Г╨╢╨╡ ╨╜╨░ `/api/admin/articles`.
- F4.1 ╤Г╨╢╨╡ ╨┤╨░╨╗ server fetch + Basic Auth forward; ╨┐╨╡╤А╨╡╨╕╤Б╨┐╨╛╨╗╤М╨╖╤Г╨╡╨╝ ╨┤╨╗╤П ╤Б╨┐╨╕╤Б╨║╨╛╨▓.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- Routes: `/admin/events` (search/view/page), `/admin/landings` + `/admin/landings/[slug]` (read-only sample), `/admin/articles` + `/new` + `/[id]` (save/archive server actions).
- Event override / landing matches ╨╛╤Б╤В╨░╤О╤В╤Б╤П deep-link ╨▓ Vite ╨┤╨╛ F4.1c.
- Nav shell: Dashboard / Events / Landings / Articles marked ready; pathname-based active state.
- Deploy ╨╜╨╡ ╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╨╡╨╜ ╨┤╨╗╤П public; ╨┐╤А╨╛╨▓╨╡╤А╨║╨░: ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛ ╤Б API `:4000` + ADMIN_* ╨╕╨╗╨╕ prod `/admin/*` ╨┐╨╛╤Б╨╗╨╡ web deploy.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- Landing detail API ╤В╤П╨╢╤С╨╗╤Л╨╣ (full grouped catalog) - ╨╜╨░ Next ╨▒╨╡╤А╤С╨╝ ╤В╨╛╨╗╤М╨║╨╛ sample page=1 limit=20.
- Articles delete ╨╜╨░╨╝╨╡╤А╨╡╨╜╨╜╨╛ ╨╜╨╡ ╨┐╨╛╤А╤В╨╕╨╗╨╕ (╤В╨╛╨╗╤М╨║╨╛ archive); hard-delete ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨▓ Vite.

## 2026-07-23 - F4.1: live Dashboard ╨▓ Next `/admin`

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- Vite Dashboard ╤В╤П╨╜╨╡╤В `/api/admin/dashboard`, `/api/admin/sources`, `/api/admin/orders?limit=1` ╤Б same-origin Basic Auth.
- ╨Э╨░ public Next (`daibilet.ru`) admin API ╨╢╨╕╨▓╤С╤В ╨╜╨░ legacy `:4000`; browser same-origin `/api` ╤Б daibilet.ru ╨╝╨╛╨╢╨╡╤В ╨╛╤В╨╗╨╕╤З╨░╤В╤М╤Б╤П ╨╛╤В admin.daibilet.ru.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- Server Component `force-dynamic`: fetch ╨║ `DAIBILET_ADMIN_API_URL` / `DAIBILET_API_INTERNAL_URL` / `DAIBILET_API_URL` (default `http://127.0.0.1:4000`).
- Authorization ╨╕╨╖ request headers ╨┐╤А╨╛╨▒╤А╨░╤Б╤Л╨▓╨░╨╡╤В╤Б╤П ╨╜╨░ API ╨┐╨╛╤Б╨╗╨╡ middleware Basic Auth.
- UI parity ╨║╨╗╤О╤З╨╡╨▓╤Л╤Е ╨▒╨╗╨╛╨║╨╛╨▓: top metrics, ╨║╨░╤В╨░╨╗╨╛╨│/launch, SEO, sources, orders. Deep-links ╨╜╨░ Vite admin ╨┤╨╛ port ╤Н╨║╤А╨░╨╜╨╛╨▓.
- Deploy: ╨▒╨╡╨╖╨╛╨┐╨░╤Б╨╡╨╜ ╨┤╨╗╤П public (╤В╨╛╨╗╤М╨║╨╛ `/admin`); ╨╜╤Г╨╢╨╡╨╜ ADMIN_* ╨▓ env web-╨┐╤А╨╛╤Ж╨╡╤Б╤Б╨░. ╨Х╤Б╨╗╨╕ API env ╨╜╨╡ ╨┐╤А╨╛╨║╨╕╨╜╤Г╤В - ╤Б╤В╤А╨░╨╜╨╕╤Ж╨░ ╨┐╨╛╨║╨░╨╢╨╡╤В ╨▒╨░╨╜╨╜╨╡╤А ╨╛╤И╨╕╨▒╨╛╨║ ╨▒╨╡╨╖ ╨┐╨╛╨╗╨╛╨╝╨║╨╕ ╨▓╨╕╤В╤А╨╕╨╜╤Л.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- ╨Я╤А╨╕ ╤В╨╛╨╗╤М╨║╨╛ `ADMIN_PASSWORD_SHA256` ╨▒╨╡╨╖ plaintext ╨╜╨░ web ╨▓╤Б╤С ╤А╨░╨▓╨╜╨╛ ╨╛╨║: ╨▒╤А╨░╤Г╨╖╨╡╤А ╤И╨╗╤С╤В ╨┐╨░╤А╨╛╨╗╤М, Next ╤Д╨╛╤А╨▓╨░╤А╨┤╨╕╤В ╨╖╨░╨│╨╛╨╗╨╛╨▓╨╛╨║.
- ╨Ы╨╛╨║╨░╨╗╤М╨╜╨╛ ╨▒╨╡╨╖ ╨┐╨╛╨┤╨╜╤П╤В╨╛╨│╨╛ `:4000` dashboard ╨┐╨╛╨║╨░╨╢╨╡╤В errors - ╨╛╨╢╨╕╨┤╨░╨╡╨╝╨╛.

## 2026-07-23 - F4 kickoff: admin shell ╨▓ Next

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- F4 ╤А╨░╨╜╨╡╨╡ ╨▒╤Л╨╗ ╤В╨╛╨╗╤М╨║╨╛ ╨▓ backlog (F4.1/F4.2 тП│), ╤А╨╡╨░╨╗╨╕╨╖╨░╤Ж╨╕╨╕ ╨▓ `apps/web` ╨╜╨╡ ╨▒╤Л╨╗╨╛.
- ╨Ъ╨░╨╜╨╛╨╜ ╨╛╨┐╨╡╤А╨░╤В╨╛╤А╨║╨╕: Vite `apps/admin` ╨╜╨░ admin.daibilet.ru; API admin ╨┐╨╛╨┤ Basic Auth ╨▓ legacy backend.
- ╨Я╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╨╛ ╨╕╨┤╤Г╤В SEO interlinking ╨╕ catalog tweaks - F4 kickoff ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╤В ╨╕╤Е ╤Д╨░╨╣╨╗╤Л.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- ╨Я╨╡╤А╨▓╤Л╨╣ ╨╕╨╜╨║╤А╨╡╨╝╨╡╨╜╤В: `apps/web/app/(admin)/admin` (stub dashboard + shell), Edge Basic Auth ╨▓ `middleware` ╨╜╨░ `/admin`, `robots: noindex`.
- Credentials contract ╨║╨░╨║ ╤Г backend: `ADMIN_EMAIL`/`ADMIN_USER` + `ADMIN_PASSWORD` ╨╕╨╗╨╕ `ADMIN_PASSWORD_SHA256`.
- Vite admin ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨║╨░╨╜╨╛╨╜╨╛╨╝ ╨┤╨╛ cutover; Finance contour ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╨╝.
- ╨б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╣ ╤И╨░╨│: port DashboardPage ╨╜╨░ live `/api/admin/dashboard`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- Next middleware ╨╜╨░ Edge - ╨╜╨╡╨╗╤М╨╖╤П ╨╕╨╝╨┐╨╛╤А╤В╨╕╤А╨╛╨▓╨░╤В╤М `apps/backend` Node `auth.ts`; ╨┤╤Г╨▒╨╗╨╕╤А╨╛╨▓╨░╨╜ ╨╝╨╕╨╜╨╕╨╝╨░╨╗╤М╨╜╤Л╨╣ Edge helper `admin-basic-auth.ts`.
- Prod deploy ╤Н╤В╨╛╨│╨╛ ╨╕╨╜╨║╤А╨╡╨╝╨╡╨╜╤В╨░ ╨╛╨┐╤Ж╨╕╨╛╨╜╨░╨╗╨╡╨╜: `/admin` ╨╜╨░ public host ╨▒╨╡╨╖╨╛╨┐╨░╤Б╨╡╨╜ (auth + noindex), ╨╜╨╛ cutover admin subdomain ╨╜╨╡ ╨┤╨╡╨╗╨░╨╡╨╝.

## 2026-07-23 - landing matching audit and product priority

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж ╤Г╤В╨▓╨╡╤А╨┤╨╕╨╗ F4 admin тЖТ Next ╨║╨░╨║ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╣ ╨║╤А╤Г╨┐╨╜╤Л╨╣ ╨┐╨╛╤В╨╛╨║. Finance contour ╨╛╤В╨╗╨╛╨╢╨╡╨╜, ╨┐╨╛╨║╨░ ╨▓╨╕╤В╤А╨╕╨╜╨░ ╨╕ ╨┐╤А╨╛╨┤╤Г╨║╤В ╨╜╨╡ ╨│╨╛╤В╨╛╨▓╤Л.
- Prod audit ╨▓╤Б╨╡╤Е ╨░╨║╤В╨╕╨▓╨╜╤Л╤Е landing rules ╨┐╨╛╨║╨░╨╖╨░╨╗ ╤П╨▓╨╜╤Л╨╡ ╤Б╨╡╨╝╨░╨╜╤В╨╕╤З╨╡╤Б╨║╨╕╨╡ ╨╛╤И╨╕╨▒╨║╨╕: ╨║╨╛╨╜╤Ж╨╡╤А╤В ╨╜╨░ ╨║╤А╤Л╤И╨╡ ╨┐╨╛╨┐╨░╨┤╨░╨╗ ╨▓ `rooftops`, ╨░ ╨║╨╛╨╜╤Ж╨╡╤А╤В ╤Б╨╛ ╤Б╤В╨░╤А╤Л╨╝ ╤В╨╡╨│╨╛╨╝ ┬л╨Э╨╛╨▓╤Л╨╣ ╨│╨╛╨┤┬╗ ╨┐╨╛╨┐╨░╨┤╨░╨╗ ╨▓ `new-year`.
- `bus-tours` ╨╕╤Б╨║╨╗╤О╤З╨░╨╗ ╨║╨╛╤А╤А╨╡╨║╤В╨╜╤Л╨╡ Hop on - hop off ╨╝╨░╤А╤И╤А╤Г╤В╤Л ╨▒╨╡╨╖ ╨╖╨░╨┐╨╛╨╗╨╜╨╡╨╜╨╜╨╛╨╣ ╨┐╨╛╨┤╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╕, ╤Е╨╛╤В╤П ╨╜╨░╨╖╨▓╨░╨╜╨╕╨╡ ╤Б╨╛╨┤╨╡╤А╨╢╨░╨╗╨╛ ╨┤╨╛╤Б╤В╨░╤В╨╛╤З╨╜╤Л╨╡ ╨┐╤А╨╕╨╖╨╜╨░╨║╨╕.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- `rooftops` ╤В╤А╨╡╨▒╤Г╨╡╤В ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╛╨╜╨╜╤Л╨╣/╨┐╤А╨╛╨│╤Г╨╗╨╛╤З╨╜╤Л╨╣ ╤Б╨╕╨│╨╜╨░╨╗ ╨╕ ╨╕╤Б╨║╨╗╤О╤З╨░╨╡╤В ╨║╨╛╨╜╤Ж╨╡╤А╤В╤Л, ╨╝╤Г╨╖╤Л╨║╤Г, ╨▓╨╡╤З╨╡╤А╨╕╨╜╨║╨╕ ╨╕ ╤Д╤Г╤А╤И╨╡╤В╤Л.
- `new-year` ╤В╤А╨╡╨▒╤Г╨╡╤В ╤Б╨╡╨╖╨╛╨╜╨╜╤Л╨╣ ╤В╨╡╤А╨╝╨╕╨╜ ╨▓ ╨╖╨░╨│╨╛╨╗╨╛╨▓╨║╨╡, ╨░ ╨╜╨╡ ╤В╨╛╨╗╤М╨║╨╛ ╤Г╤Б╤В╨░╤А╨╡╨▓╤И╨╕╨╣ ╤В╨╡╨│.
- `bus-tours` ╨▒╨╛╨╗╤М╤И╨╡ ╨╜╨╡ ╤В╤А╨╡╨▒╤Г╨╡╤В ╨╖╨░╨┐╨╛╨╗╨╜╨╡╨╜╨╜╤Г╤О ╨┐╨╛╨┤╨║╨░╤В╨╡╨│╨╛╤А╨╕╤О: ╤Б╤В╤А╨╛╨│╨╕╨╡ ╨░╨▓╤В╨╛╨▒╤Г╤Б╨╜╤Л╨╣ ╨╕ ╨╛╨▒╨╖╨╛╤А╨╜╤Л╨╣ ╤Б╨╕╨│╨╜╨░╨╗╤Л ╨▓ ╨╜╨░╨╖╨▓╨░╨╜╨╕╨╕ ╨╛╤Б╤В╨░╤О╤В╤Б╤П ╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╤М╨╜╤Л╨╝╨╕.
- ╨Я╨╛╤Б╨╗╨╡ deploy ╨╜╤Г╨╢╨╜╨╛ ╨┐╨╛╨▓╤В╨╛╤А╨╕╤В╤М snapshot/audit ╨▓╤Б╨╡╤Е landing rules ╨╕ ╨▓╤А╤Г╤З╨╜╤Г╤О ╨┐╤А╨╛╤Б╨╝╨╛╤В╤А╨╡╤В╤М ╤И╨╕╤А╨╛╨║╨╕╨╡ ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╕ `concerts-genre`, `exhibitions`, `unusual-theatres`, `excursions`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- ╨Ф╨╛ F5 ╨┐╤А╨░╨▓╨╕╨╗╨░ ╨┤╤Г╨▒╨╗╨╕╤А╤Г╤О╤В╤Б╤П ╨▓ `landing-rules.ts` ╨╕ runtime `dto.js`, ╤З╤В╨╛ ╤Б╨╛╨╖╨┤╨░╤С╤В ╤А╨╕╤Б╨║ ╨┐╨╛╨▓╤В╨╛╤А╨╜╨╛╨│╨╛ drift.
- ╨Я╨╡╤А╨▓╤Л╨╣ smoke ╨┐╨╛╤Б╨╗╨╡ rule deploy ╨▓╤Л╤П╨▓╨╕╨╗ ╨╡╤Й╤С ╨╛╨┤╨╕╨╜ legacy path: `buildPublicLandingPageManaged` ╤Д╨╕╨╗╤М╤В╤А╨╛╨▓╨░╨╗ `session.landingSlugs`, ╨░ ╨╜╨╡ ╨╕╤Б╨┐╨╛╨╗╨╜╤П╨╗ `matchesRule`. ╨Я╨╛╤Н╤В╨╛╨╝╤Г ╨╗╤О╨▒╨╛╨╡ ╤Г╤Б╤В╨░╤А╨╡╨▓╤И╨╡╨╡ ╨┐╨╛╨╗╨╡ `landingSlugs` ╨╝╨╛╨│╨╗╨╛ ╨▓╨╡╤А╨╜╤Г╤В╤М ╨╜╨╡╤А╨╡╨╗╨╡╨▓╨░╨╜╤В╨╜╤Г╤О ╨▓╤Л╨┤╨░╤З╤Г. Runtime filter ╨┐╨╡╤А╨╡╨▓╨╡╨┤╤С╨╜ ╨╜╨░ `matchesRule`; ╨╜╤Г╨╢╨╡╨╜ ╨║╨╛╤А╤А╨╡╨║╤В╨╕╤А╤Г╤О╤Й╨╕╨╣ ╨┐╨╛╤Б╨╗╨╡╨┤╨╛╨▓╨░╤В╨╡╨╗╤М╨╜╤Л╨╣ deploy.

## 2026-07-23 - country-tours: source of runtime rules

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- `GET /api/public/landings/country-tours` ╨╜╨░ legacy API `:4000` ╨╕ Next route handler ╨┐╨╛╨╗╤Г╤З╨░╤О╤В landing ╤З╨╡╤А╨╡╨╖ `buildPublicLandingPageManaged` ╨╕╨╖ `apps/backend/src/dto.js`.
- `LandingMatch` ╨▓ ╤Н╤В╨╛╨╝ ╨┐╤Г╤В╨╕ ╤Е╤А╨░╨╜╨╕╤В ╤В╨╛╨╗╤М╨║╨╛ ╤А╤Г╤З╨╜╤Л╨╡ `PINNED` ╨╕ `EXCLUDED`; ╨░╨▓╤В╨╛╨╝╨░╤В╨╕╤З╨╡╤Б╨║╨╕╨╡ match rows ╨╜╨╡ ╤Д╨╛╤А╨╝╨╕╤А╤Г╤О╤В public ╨▓╤Л╨┤╨░╤З╤Г.
- Commit `502a282` ╤Г╨╢╨╡╤Б╤В╨╛╤З╨╕╨╗ ╤В╨╛╨╗╤М╨║╨╛ `landing-rules.ts`, ╨┐╨╛╤Н╤В╨╛╨╝╤Г legacy `dto.js` ╨┐╤А╨╛╨┤╨╛╨╗╨╢╨░╨╗ ╨╝╨░╤В╤З╨╕╤В╤М ╨║╨╛╨╜╤Ж╨╡╤А╤В╤Л ╨╕ ╤В╨╡╨░╤В╤А╨░╨╗╤М╨╜╤Л╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╤П ╨┐╨╛ ╤Б╨╗╨╛╨▓╨░╨╝ ┬л╨Я╨╡╤В╨╡╤А╨│╨╛╤Д┬╗, ┬л╨Я╤Г╤И╨║╨╕╨╜┬╗ ╨╕ ╨┤╤А╤Г╨│╨╕╨╝ ╤В╨╛╨┐╨╛╨╜╨╕╨╝╨░╨╝.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- ╨б╨╕╨╜╤Е╤А╨╛╨╜╨╕╨╖╨╕╤А╨╛╨▓╨░╨╜╨╛ ╨┐╤А╨░╨▓╨╕╨╗╨╛ `country-tours` ╨▓ `dto.js`: ╨╛╨┤╨╜╨╛╨▓╤А╨╡╨╝╨╡╨╜╨╜╨╛ ╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╤М╨╜╤Л ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╛╨╜╨╜╤Л╨╣ ╨╕ ╨╖╨░╨│╨╛╤А╨╛╨┤╨╜╤Л╨╣/╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╤З╨╡╤Б╨║╨╕╨╣ ╤Б╨╕╨│╨╜╨░╨╗╤Л.
- ╨Ф╨╛ F5 ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╤П landing rules ╨▓ TypeScript ╨╕ `dto.js` ╨▓╨╜╨╛╤Б╤П╤В╤Б╤П ╨┐╨░╤А╨╜╨╛. ╨Я╤А╨╛╨┤╨╛╨▓╤Л╨╣ deploy ╨┤╨╛╨╗╨╢╨╡╨╜ ╨┐╨╡╤А╨╡╨╖╨░╨┐╤Г╤Б╤В╨╕╤В╤М `daibilet-api`, ╤В╨░╨║ ╨║╨░╨║ process ╨╕╤Б╨┐╨╛╨╗╨╜╤П╨╡╤В ╨╕╤Б╤Е╨╛╨┤╨╜╤Л╨╣ ESM `server.js`/`dto.js`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- ╨Ы╨╛╨║╨░╨╗╤М╨╜╨░╤П ╨╛╨▒╨╛╨╗╨╛╤З╨║╨░ ╨╜╨╡ ╨╜╨░╤Е╨╛╨┤╨╕╤В `pnpm`, ╨┐╨╛╤Н╤В╨╛╨╝╤Г backend tests/typecheck ╨╝╨╛╨╢╨╜╨╛ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╤М ╨╜╨░ prod deploy host.

### Prod proof
- Commit `a67fa48` ╨╛╤В╨┐╤А╨░╨▓╨╗╨╡╨╜ ╨▓ `feat/next-monorepo`. ╨Я╨╡╤А╨╡╨┤ deploy ╨╛╨▒╨╜╨░╤А╤Г╨╢╨╡╨╜ ╨╕ ╨┤╨╛╨╢╨┤╨░╨╗╨╕╤Б╤М ╨╖╨░╨▓╨╡╤А╤И╨╡╨╜╨╕╤П ╨┤╤А╤Г╨│╨╛╨│╨╛ `deploy-prod-next`; ╨╖╨░╤В╨╡╨╝ ╨▓╤Л╨┐╨╛╨╗╨╜╨╡╨╜ ╨╛╨┤╨╕╨╜ ╨┐╨╛╤Б╨╗╨╡╨┤╨╛╨▓╨░╤В╨╡╨╗╤М╨╜╤Л╨╣ `deploy-prod-next.sh` ╤Б restart API ╨╕ Next build.
- `GET :4000/api/public/landings/country-tours` ╨╕ `GET :3001/api/public/landings/country-tours` ╨╛╤В╨┤╨░╤О╤В ╨┐╨╛ 3 ╨║╨░╤А╤В╨╛╤З╨║╨╕: ┬л╨в╤Г╤А ╨▓ ╨Т╤Л╨▒╨╛╤А╨│ - ╨и╨▓╨╡╨┤╤Б╨║╨╛╨╡ ╤Б╨╡╤А╨┤╤Ж╨╡ ╨а╨╛╤Б╤Б╨╕╨╕┬╗, ┬л╨Ъ╤Г╤А╤Б ╨╜╨░ ╨Ъ╤А╨╛╨╜╤И╤В╨░╨┤╤В: ╨╕╤Б╤В╨╛╤А╨╕╤П, ╨░╤А╤Е╨╕╤В╨╡╨║╤В╤Г╤А╨░, ╤Д╨╛╤А╤В╤Л ╤Б ╨▓╨╛╨┤╤Л┬╗, ┬л╨н╨║╤Б╨║╤Г╤А╤Б╨╕╤П ╨▓ ╨Я╤Г╤И╨║╨╕╨╜ (╨▒╤Л╨▓╤И╨╡╨╡ ╨ж╨░╤А╤Б╨║╨╛╨╡ ╨б╨╡╨╗╨╛) ╤Б ╨┐╨╛╤Б╨╡╤Й╨╡╨╜╨╕╨╡╨╝ ╨╗╨╕╤Ж╨╡╤П┬╗.
- ╨Т ╨▓╤Л╨┤╨░╤З╨╡ ╨╜╨╡╤В ┬л╨Я╨╕╨║╨╛╨▓╨╛╨╣ ╨┤╨░╨╝╤Л┬╗, ╨║╨╛╨╜╤Ж╨╡╤А╤В╨╛╨▓ ╨╕ ╨┤╤А╤Г╨│╨╕╤Е ╨║╤Г╨╗╤М╤В╤Г╤А╨╜╤Л╤Е ╤Б╨╛╨▒╤Л╤В╨╕╨╣ ╨┐╨╛ ╤Б╨╛╨▓╨┐╨░╨┤╨╡╨╜╨╕╤О ╤В╨╛╨┐╨╛╨╜╨╕╨╝╨░.

## 2026-07-22 - Admin articles: sync to public + archive/delete + author

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨Я╤А╨░╨▓╨║╨╕ Article ╨╕╨╖ ╨░╨┤╨╝╨╕╨╜╨║╨╕ ╨┐╨╕╤Б╨░╨╗╨╕╤Б╤М ╨▓ Postgres, ╨╜╨╛ Next ╨┤╨╡╤А╨╢╨░╨╗ in-memory DTO-╨║╤Н╤И ╤Б╤В╨░╤В╨╡╨╣ 5 ╨╝╨╕╨╜ ╨╕ ╨╜╨╡ ╤А╨╡╨▓╨░╨╗╨╕╨┤╨╕╤А╨╛╨▓╨░╨╗ /blog.
- HIDDEN/╨░╤А╤Е╨╕╨▓ ╨╝╨╛╨│ ┬л╨▓╨╛╤Б╨║╤А╨╡╤Б╨░╤В╤М┬╗ ╤З╨╡╤А╨╡╨╖ static fallback 
esolveStaticArticle.
- ╨Т UI ╨╜╨╡ ╨▒╤Л╨╗╨╛ ╨░╨▓╤В╨╛╤А╨░, ╤Г╨┤╨░╨╗╨╡╨╜╨╕╤П ╨╕ ╤П╨▓╨╜╨╛╨│╨╛ ╨░╤А╤Е╨╕╨▓╨░.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- clearPublicArticlesDtoCache ╨╜╨░ invalidate + ╨▓ Next /api/internal/revalidate.
- ╨Я╨╛╤Б╨╗╨╡ create/update/delete: 
evalidateNextBlogArticle (/blog, slug, city hub).
- cmsOwned ╨┤╨╗╤П ╨╜╨╡╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╤Е slug - ╨▒╨╡╨╖ static fallback.
- Admin: ╨║╨╛╨╗╨╛╨╜╨║╨░/╨┐╨╛╨╗╨╡ ╨Р╨▓╤В╨╛╤А, ╨║╨╜╨╛╨┐╨║╨╕ ┬л╨Т ╨░╤А╤Е╨╕╨▓┬╗ (HIDDEN) ╨╕ ┬л╨г╨┤╨░╨╗╨╕╤В╤М┬╗ (DELETE).

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- ╨Я╨╛╤Б╨╗╨╡ ╨┤╨╡╨┐╨╗╨╛╤П ╨╜╤Г╨╢╨╡╨╜ restart daibilet-api, ╨╕╨╜╨░╤З╨╡ handlers ╨▓ API-╨┐╤А╨╛╤Ж╨╡╤Б╤Б╨╡ ╤Б╤В╨░╤А╤Л╨╡.

## 2026-07-22 - Telegram preview: broken AAAA / IPv6

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨б╤В╨░╤В╤М╤П `https://daibilet.ru/blog/kazan-na-vkus-master-klassy` ╨╛╤В╨┤╨░╤С╤В ╨┐╨╛╨╗╨╜╤Л╨╣ OG (title/description/image) ╨┐╨╛ IPv4, cover JPEG 200 OK.
- ╨Т DNS Timeweb ╨╡╤Б╤В╤М AAAA `2a03:6f01:1:2::ef11`, ╨╜╨╛ ╨╜╨░ VPS ╨╜╨╡╤В ╤А╨░╨▒╨╛╤З╨╡╨│╨╛ global IPv6: eth0 ╤В╨╛╨╗╤М╨║╨╛ link-local, curl ╨┐╨╛ AAAA ╤В╨░╨╣╨╝╨░╤Г╤В╨╕╤В╤Б╤П.
- Telegram ╨╕ ╤З╨░╤Б╤В╤М ╨║╤А╨░╤Г╨╗╨╡╤А╨╛╨▓ ╨┐╤А╨╡╨┤╨┐╨╛╤З╨╕╤В╨░╤О╤В IPv6 ╨┐╤А╨╕ ╨╜╨░╨╗╨╕╤З╨╕╨╕ AAAA тЖТ ╨┐╤А╨╡╨▓╤М╤О ╤Б╤Б╤Л╨╗╨║╨╕ ╨╜╨╡ ╤Б╤В╤А╨╛╨╕╤В╤Б╤П (╨│╨╛╨╗╤Л╨╣ URL ╨▓ ╤З╨░╤В╨╡).
- `@WebpageBot` ╨╝╨╛╨╢╨╡╤В ╨▓╨╕╨┤╨╡╤В╤М ╨┐╤А╨╡╨▓╤М╤О (╤З╨░╤Б╤В╨╛ ╤Е╨╛╨┤╨╕╤В ╨┐╨╛ IPv4), ╨░ ╨╛╨▒╤Л╤З╨╜╤Л╨╡ ╤З╨░╤В╤Л - ╨╜╨╡╤В: ╤Н╤В╨╛ ╨╜╨╡ ┬л╨▒╨╗╨╛╨║╨╕╤А╨╛╨▓╨║╨░ ╤Б╨░╨╣╤В╨░┬╗, ╨░ DNS AAAA + negative cache Telegram.
- ╨Э╨░ 2026-07-22 ╨▓╨╡╤З╨╡╤А╨╛╨╝ AAAA ╨▓╤Б╤С ╨╡╤Й╤С ╨▓ DNS (`dig AAAA daibilet.ru` тЖТ ╤В╨╛╤В ╨╢╨╡ ╨░╨┤╤А╨╡╤Б, curl -6 тЖТ No route to host).

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- ╨г╨┤╨░╨╗╨╕╤В╤М AAAA ╤Г `daibilet.ru` / `www` / `api` / `admin` ╨▓ ╨┐╨░╨╜╨╡╨╗╨╕ DNS Timeweb (╨┐╨╛╨║╨░ IPv6 ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡ ╨╜╨╡ ╨╜╨░╤Б╤В╤А╨╛╨╡╨╜), ╨╗╨╕╨▒╨╛ ╨║╨╛╤А╤А╨╡╨║╤В╨╜╨╛ ╨▓╤Л╨┤╨░╤В╤М ╨░╨┤╤А╨╡╤Б ╨╜╨░ eth0 ╨╕ ╨┐╤А╨╛╨▓╨╡╤А╨╕╤В╤М ╨╝╨░╤А╤И╤А╤Г╤В╨╕╨╖╨░╤Ж╨╕╤О.
- ╨Я╨╛╤Б╨╗╨╡ ╤Б╨╝╨╡╨╜╤Л DNS: TTL ~5-10 ╨╝╨╕╨╜, ╨╖╨░╤В╨╡╨╝ ╨▓ ╤З╨░╤В ╤Б╨╗╨░╤В╤М URL ╤Б `?v=2` (╨╕╨╗╨╕ ╨╜╨╛╨▓╤Л╨╣ URL) - WebpageBot ╤Б╨░╨╝ ╨┐╨╛ ╤Б╨╡╨▒╨╡ ╨║╤Н╤И ╤З╨░╤В╨░ ╨╜╨╡ ╤Б╨▒╤А╨░╤Б╤Л╨▓╨░╨╡╤В.
- nginx: social bots тЖТ `/api/public/social-preview?path=$uri` (╤З╨╕╤Б╤В╤Л╨╣ OG HTML, ╨▒╨╡╨╖ Next `private, no-store` ╨╕ ╨▒╨╡╨╖ meta refresh).
- Venue metadata: ╤П╨▓╨╜╤Л╨╡ `twitter:title`/`twitter:description` + fallback description; ╨╕╨╜╨░╤З╨╡ Twitter-╨║╨░╤А╤В╨╛╤З╨║╨░ ╨╜╨░╤Б╨╗╨╡╨┤╨╛╨▓╨░╨╗╨░ title/description ╨│╨╗╨░╨▓╨╜╨╛╨╣.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- ╨Т╨║╨╗╤О╤З╨╡╨╜╨╕╨╡ IPv6 ╨╜╨░ Timeweb ╨▒╨╡╨╖ ╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╨╛╨│╨╛ ╨░╨┤╤А╨╡╤Б╨░ ╨╜╨░ ╨╕╨╜╤В╨╡╤А╤Д╨╡╨╣╤Б╨╡ ╨╛╤Б╤В╨░╨▓╨╗╤П╨╡╤В AAAA ┬л╨╝╤С╤А╤В╨▓╤Л╨╝┬╗ - ╤Е╤Г╨╢╨╡, ╤З╨╡╨╝ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╨╕╨╡ AAAA.
- ╨Я╨╛╨║╨░ AAAA ╨╢╨╕╨▓, ╨┐╤А╨╡╨▓╤М╤О ╨▓ ╤З╨░╤В╨░╤Е ╨▒╤Г╨┤╤Г╤В ╨╜╨╡╤Б╤В╨░╨▒╨╕╨╗╤М╨╜╤Л ╨┤╨░╨╢╨╡ ╨┐╤А╨╕ ╨╕╨┤╨╡╨░╨╗╤М╨╜╤Л╤Е OG.

## 2026-07-22 - Orders: TC sets without tickets[] are not ┬лmissing mirror┬╗

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨Ч╨░╨║╨░╨╖ TC `113996822` (╨Ш╨│╤А╨╛╨Т╨╡╤З╨╡╤А) status=done, ╨╛╨┐╨╗╨░╤В╨░ 1089 тВ╜, ╨╜╨╛ `tickets: []`.
- ╨Я╨╛╨╖╨╕╤Ж╨╕╤П ╨▓ `values.sets_values` (┬л╨б 19:00 - ╨Ш╨│╤А╨╛╨Т╨╡╤З╨╡╤А┬╗) - ╤Д╨╛╤А╨╝╨░╤В set/admission, ╨╜╨╡ seat-╨▒╨╕╨╗╨╡╤В.
- ╨Р╨┤╨╝╨╕╨╜╨║╨░ ╨┐╨╛╨╝╨╡╤З╨░╨╗╨░ ┬л╨Э╨╡╤В ╨▒╨╕╨╗╨╡╤В╨╛╨▓ ╨▓ ╨╖╨╡╤А╨║╨░╨╗╨╡┬╗ ╨╗╨╛╨╢╨╜╨╛.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- `mapAdminOrderRow`: ╨╡╤Б╨╗╨╕ ╨╡╤Б╤В╤М `sets_values`, ╨╜╨╡ ╤Б╤В╨░╨▓╨╕╤В╤М missingArtifact; ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╤В╤М ╤Б╨╕╨╜╤В╨╡╤В╨╕╤З╨╡╤Б╨║╨╕╨╡ ╨┐╨╛╨╖╨╕╤Ж╨╕╨╕ ╨╜╨░╨▒╨╛╤А╨░.
- `tc-sync-orders`: ╨┐╤А╨╕ ╨┐╤Г╤Б╤В╨╛╨╝ `tickets[]` ╨┐╨╕╤Б╨░╤В╤М ExternalTicket ╨╕╨╖ `sets_values` ╤Б origin=`set`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- ╨б╤В╨░╤А╤Л╨╡ ╨╖╨░╨║╨░╨╖╤Л ╨▒╨╡╨╖ ╤А╨╡-╤Б╨╕╨╜╨║╨░ ╤Г╨╢╨╡ ╤З╨╕╨╜╤П╤В╤Б╤П ╤Н╨▓╤А╨╕╤Б╤В╨╕╨║╨╛╨╣ ╨▓ DTO; ╨┐╨╛╨╗╨╜╤Л╨╣ backfill ╨╖╨╡╤А╨║╨░╨╗╨░ - ╤З╨╡╤А╨╡╨╖ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╨╣ orders sync.

## 2026-07-22 - Blog: preserve admin textarea line breaks

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨Т ╨░╨┤╨╝╨╕╨╜╨║╨╡ Enter ╨▓ textarea ╤Б╨╛╤Е╤А╨░╨╜╤П╨╗╤Б╤П ╨▓ content, ╨╜╨╛ ╨╜╨░ ╤Б╨░╨╣╤В╨╡ HTML ╤Б╤Е╨╗╨╛╨┐╤Л╨▓╨░╨╗ ╨╛╨┤╨╕╨╜╨╛╤З╨╜╤Л╨╣ \\n ╨▓ ╨┐╤А╨╛╨▒╨╡╨╗ ╨▓╨╜╤Г╤В╤А╨╕ `<p>`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- `renderInline` ╨▓ BlogArticleContent (web + public): ╨╛╨┤╨╕╨╜╨╛╤З╨╜╤Л╨╣ Enter тЖТ `<br>`, ╨┐╤Г╤Б╤В╨░╤П ╤Б╤В╤А╨╛╨║╨░ ╨┐╨╛-╨┐╤А╨╡╨╢╨╜╨╡╨╝╤Г ╨╜╨╛╨▓╤Л╨╣ ╨░╨▒╨╖╨░╤Ж.
- ╨Я╨╛╨┤╤Б╨║╨░╨╖╨║╨░ ╨┐╨╛╨┤ ╨┐╨╛╨╗╨╡╨╝ ┬л╨в╨╡╨║╤Б╤В ╤Б╤В╨░╤В╤М╨╕┬╗ ╨▓ ArticlesPage.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- ╨б╤В╨░╤А╤Л╨╡ MD ╤Б ┬л╨╝╤П╨│╨║╨╛╨╣┬╗ ╤А╨░╨╖╨▒╨╕╨▓╨║╨╛╨╣ ╨┤╨╗╨╕╨╜╨╜╤Л╤Е ╤Б╤В╤А╨╛╨║ ╨╜╨░ 80 ╤Б╨╕╨╝╨▓╨╛╨╗╨╛╨▓ ╤В╨╛╨╢╨╡ ╨┐╨╛╨║╨░╨╢╤Г╤В ╨┐╨╡╤А╨╡╨╜╨╛╤Б╤Л - ╨┐╤А╨╕ ╨╜╨╡╨╛╨▒╤Е╨╛╨┤╨╕╨╝╨╛╤Б╤В╨╕ ╨┐╤А╨░╨▓╨╕╤В╤М ╨▓╤А╤Г╤З╨╜╤Г╤О.

## 2026-07-23 - Infinite reload: ChunkLoadRecovery + nested main

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨Т╨╗╨░╨┤╨╡╨╗╨╡╤Ж: ╤Б╤В╤А╨░╨╜╨╕╤Ж╨░ ┬л╨┐╨╛╤Б╤В╨╛╤П╨╜╨╜╨╛ ╤А╨╡╤Д╤А╨╡╤И╨╕╤В╤Б╤П┬╗. ╨Т╨╛╤Б╨┐╤А╨╛╨╕╨╖╨▓╨╡╨┤╨╡╨╜╨╛ ╨╜╨░ `https://daibilet.ru/blog`: ~18 full document loads / 12 ╤Б.
- Console: React minified #418 (hydration text mismatch) ╨╕╨╖ chunk `/_next/static/chunks/567e3fde-тАжjs`.
- ╨Я╨╛╤Б╨╗╨╡ ╨║╨░╨╢╨┤╨╛╨│╨╛ reload nginx ╨╛╤В╨┤╨░╨▓╨░╨╗ 429 ╨╜╨░ ╤Б╤В╨░╤В╨╕╨║╤Г (╤И╤В╨╛╤А╨╝ ╨╖╨░╨┐╤А╨╛╤Б╨╛╨▓).
- `ChunkLoadRecovery` (harden `a712127`) ╨╝╨░╤В╤З╨╕╨╗ **╨╗╤О╨▒╨╛╨╣** ErrorEvent, ╤Г ╨║╨╛╤В╨╛╤А╨╛╨│╨╛ `event.filename` ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В `/_next/static/chunks/`, ╨╕ ╨╜╨░ mount ╤Б╤А╨░╨╖╤Г ╤Б╨╜╨╕╨╝╨░╨╗ one-shot ╤Д╨╗╨░╨│ тЖТ ╨▒╨╡╤Б╨║╨╛╨╜╨╡╤З╨╜╤Л╨╣ `location.reload()`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- `ChunkLoadRecovery`: ╤Г╨▒╤А╨░╤В╤М match ╨┐╨╛ filename; reload ╤В╨╛╨╗╤М╨║╨╛ ╨╜╨░ ╤А╨╡╨░╨╗╤М╨╜╤Л╤Е ChunkLoad/dynamic-import ╤Б╨╛╨╛╨▒╤Й╨╡╨╜╨╕╤П╤Е ╨╕╨╗╨╕ ╨╜╨░ failed `<script src="тАж/_next/static/chunks/тАж">`; ╤Д╨╗╨░╨│ ╤З╨╕╤Б╤В╨╕╤В╤М ╤З╨╡╤А╨╡╨╖ 15 ╤Б ╤Б╤В╨░╨▒╨╕╨╗╤М╨╜╨╛╤Б╤В╨╕, ╨╜╨╡ ╤Б╤А╨░╨╖╤Г ╨╜╨░ mount.
- ╨г╨▒╤А╨░╤В╤М ╨▓╨╗╨╛╨╢╨╡╨╜╨╜╤Л╨╣ `<main>` ╨▓╨╜╤Г╤В╤А╨╕ `SiteLayout` (blog list/article, podborki, city/venue hubs, trust shell) тАФ ╨╜╨╡╨▓╨░╨╗╨╕╨┤╨╜╤Л╨╣ HTML ╨╕ ╨╕╤Б╤В╨╛╤З╨╜╨╕╨║ hydration #418.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- Hydration #418 ╨╜╨░ blog ╨╝╨╛╨╢╨╡╤В ╨╡╤Й╤С ╨╝╨╡╨╗╤М╨║╨░╤В╤М ╨▓ console ╨┤╨╛ ╨┐╨╛╨╗╨╜╨╛╨│╨╛ ╨▓╤Л╤А╨░╨▓╨╜╨╕╨▓╨░╨╜╨╕╤П SSR/client; ╨▒╨╡╨╖ ChunkLoad-╨╗╤Г╨┐╨░ ╤Б╤В╤А╨░╨╜╨╕╤Ж╨░ ╨▒╨╛╨╗╤М╤И╨╡ ╨╜╨╡ ╨║╤А╤Г╤В╨╕╤В╤Б╤П.

## 2026-07-23 - Chunk 400 / cities/%5Bslug%5D: mid-deploy static via Node

### ╨Э╨░╨▒╨╗╤О╨┤╨╡╨╜╨╕╤П
- ╨Ъ╨╛╨╜╤Б╨╛╨╗╤М ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░: CSS + `cities/%5Bslug%5D/page-*.js` тЖТ **400**, `ChunkLoadError: Loading chunk 804 failed`.
- Access log: ╨▓ 20:47:00 ╤В╨╡ ╨╢╨╡ URL ╨┤╨░╨╗╨╕ 400; ╤З╨╡╤А╨╡╨╖ ~1 ╨╝╨╕╨╜ (╨┐╨╛╤Б╨╗╨╡ restart web) - 200. 400 ╤В╨░╨║╨╢╨╡ ╨╜╨░ chunks **╨▒╨╡╨╖** ╤Б╨║╨╛╨▒╨╛╨║ тЖТ ╨╜╨╡ WAF ╨╜╨░ `%5B`.
- Deploy ╨┤╨╡╨╗╨░╨╗ `pnpm web:build` ╨┐╤А╨╕ ╨╢╨╕╨▓╨╛╨╝ `next start` (stop ╨▒╤Л╨╗ ╤В╨╛╨╗╤М╨║╨╛ ╨┐╨╡╤А╨╡╨┤ clear cache) тЖТ mid-build ╨┐╨╡╤А╨╡╨╖╨░╨┐╨╕╤Б╤М `.next/static`.
- `/_next/static` ╤И╤С╨╗ ╤З╨╡╤А╨╡╨╖ `location /` + Node + `proxy_cache`.

### ╨а╨╡╤И╨╡╨╜╨╕╤П
- nginx `location ^~ /_next/static/` тЖТ `alias` ╨╜╨░ `apps/web/.next/static/` (╨╝╨╕╨╜╤Г╤П Node/cache).
- `deploy-prod-next.sh`: **stop web before build**; apply `patch-prod-nginx-next-static.py`.

### ╨Я╤А╨╛╨▒╨╗╨╡╨╝╤Л
- Downtime ╨╜╨░ ╨▓╤А╨╡╨╝╤П `web:build` ╤З╤Г╤В╤М ╨┤╨╗╨╕╨╜╨╜╨╡╨╡; ╨╖╨░╤В╨╛ ╨╜╨╡╤В ╨╛╨║╨╜╨░ 400/ChunkLoad ╨╜╨░ ╨╛╤В╨║╤А╤Л╤В╤Л╤Е ╨▓╨║╨╗╨░╨┤╨║╨░╤Е.

## 2026-07-27 - Venue: Lumiere Hall hub 404

### Наблюдения
- /venues/art-prostranstvo-lyumer-holl-g-moskva-54cabc2b9cb5385a9f65b95a отдавала 404: TC import ставил MEETING_POINT + pageStatus=NONE, площадка выпадала из public hub.

### Решения
- guessVenueType: арт-пространство / Lumiere / иммерсив -> museum_art.
- 	c-import-catalog: не понижать institution kinds при upsert.
- scripts/ensure-lumiere-hall-venue.js + override адреса; prod apply -> MUSEUM_ART_SPACE, CANDIDATE, title «Арт-пространство Люмьер Холл».
- Deploy 6e17cce, revalidate path venue-page.

### Проблемы
- Slug lyumer - техническая транслитерация; display title содержит «Люмьер».




## 2026-07-31 - Finance .159 egress PASS; CHECKOUT=1

### Наблюдения
- Owner обновил finance SG outbound: UDP 53 → 8.8.8.8; TCP → все адреса (все TCP порты); UDP 53 → все адреса.
- Re-verify с Diligent Polydeuces 85.193.80.159: https://api.yookassa.ru/v3/payments → **401** (PASS connectivity), dns ~0.004s / total ~0.07s; TCP 443 → 1.1.1.1 OK; /api/health ok.
- В .env: DAIBILET_YOOKASSA_CHECKOUT=1 (STUB=DAIBILET_STUB_CHECKOUT=1, VERIFY=DAIBILET_YOOKASSA_VERIFY_WEBHOOK=0); YOOKASSA_SECRET_KEY=<set>; systemctl restart daibilet-finance-api → active.
- Optional phase-g smoke: supplier login OK; POST yookassa-purchase → **YOOKASSA_PAYMENT_FAILED** (shopId/secret mismatch на стороне ЮKassa; egress до API уже жив).

### Решения
- Week1 checkout flag включён после egress green.
- Дальше: сверить SHOP_ID/SECRET_KEY с кабинетом ЮKassa (sandbox), затем FIN.LC3 confirmationUrl smoke.

### Проблемы
- Purchase smoke не дал confirmationUrl: ошибка ключей магазина, не сети.


## 2026-07-31 - MSK catalog webpack thrash / partial deploy

### Наблюдения
- Live console: cascade Uncaught (in promise) TypeError: e[o] is not a function из webpack-*.js + chunks (6367, 8392, 2830, page-*) - классический рассинхрон webpack runtime vs chunks.
- На MSK за ~10 мин несколько stop/start daibilet-web (09:41, 09:42, 09:49, 09:50 UTC) при параллельных catalog deploy (hero / back-to-top) - высокий риск thrash .next.
- Prev BUILD на диске (backup /tmp/daibilet-web-next-prev): lGrO-MIR8XMZLXbCJH6fh. После атомарного swap (~10:25 UTC): 4FE8q3QbUiYefGylGZDxp (= SPB /opt/daibilet/apps/web).

### Решения
- Не запускать третий параллельный scp: на .16/.184 idle (нет scp/rsync/build).
- Проверка целостности: SHA256 BUILD_ID + webpack-92d7ca63add51006.js + 6367/8392/2830/pp/page-* совпадают MSK↔SPB; HTTPS отдаёт те же SHA; HTML-ссылки на chunks без missing; один BUILD dir в static/.
- Purge nginx proxy_cache /var/cache/nginx/daibilet (было ~60 файлов stale).
- Smoke: / и /cities/moscow → 200; chunk fetch 200; daibilet-web active с 10:25:15 UTC.

### Проблемы
- Launch-blocker снят для текущего BUILD, но процесс хрупкий: два параллельных catalog deploy в .next снова дадут тот же symptom. Правило: один атомарный tar/swap .next с .16 → MSK, stop→extract→purge cache→start; не билдить Next на MSK; не параллелить.

## 2026-07-31 - MSK web BUILD thrash (post-hotfix overwrite)

### Наблюдения
- После webpack hotfix (4FE8q3QbUiYefGylGZDxp, backup /tmp/daibilet-web-next-prev) другой deploy снова сменил live на 9d85kXChGb8qjnDLr_ARy (slots/63a7f3a4+); web restart ~10:29 UTC.

### Решения
- Verify-first: BUILD/HTML/chunks/SHA MSK↔HTTPS согласованы на 9d85… - restore не делали.

### Проблемы
- Повторный thrash деплоев .next на MSK без атомарного gate; /moscow soft-404 в prerender, рабочий city URL /cities/moscow.


## 2026-07-31 - Seed cityInfo mustSee: skip-no-city → 0 (MSK)

### Наблюдения
- `scripts/seed-cityinfo-must-see-venues.js`: cityId резолвится из ключа cityInfo (latin: moscow, kazan, …) через `CITY_SLUG_ALIASES` + title/fuzzy.
- На MSK `City.slug` почти везде кириллица (`москва`, `казань`, `санкт-петербург`); плюс дубль `moskva`/Москва. Й в slug схлопнут в и (`нижнии-новгород`, `великии-новгород`).
- До фикса: mustSee 246 → inserted 23 / updated 7 / **skip-no-city 216** (алиасы только у ~5 хабов).

### Решения
- Расширены `CITY_SLUG_ALIASES` + `CITY_TITLE_ALIASES` на все hub-ключи cityInfo; `resolveCity` грузит индекс City и матчит с нормализацией ё→е / й→и.
- MSK `--apply`: **skip-no-city 0**, inserted 216 / updated 30 (повтор: updated 246).
- `--write-cityinfo` на MSK → pull в локальные `apps/web` + `apps/public` cityInfo (246 slug-патчей, dirty для commit). Web не деплоили.

### Проблемы
- Moscow must-see привязались к latin `moskva` (первый hit в aliases), не к `москва` — оба title Москва. Listing smoke: /locations|/venues и detail pages (kreml/ermitazh/petergof) отдают must-see; полный список на каталоге пагинирован.

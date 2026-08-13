## 2026-08-13 - My Day: аудит «Вход свободный» по всем точкам

### Наблюдения
- Теги Парк / Прогулка / Арт-объект сами ставили свободный вход. Ботанический сад, Петергоф, Павловск, колоннада с тегом «виды» расходились с реальностью.
- Подсказка в окне маршрута вешала бейдж «Вход свободный» на первый парк или храм. Исаакий в этой логике выглядел бесплатным.

### Решения
- Чип только для явной улицы: площадь, сквер, мост, набережная, бульвар, проспект, улица. Парк/сад/храм/особняк/зоопарк/петергоф - без чипа, пока нет реального билета.
- «Дворцовая площадь» не путаем с «дворцом» (отрезали ложный match `дворц`).
- Free-window upsell берёт тот же helper, что карточка. Audit-тест гоняет mustSee + пресеты + пригороды.

### Проблемы
- Летний сад / Новая Голландия тоже без чипа: лучше молчать, чем врать про Петергоф. Live после «выкатывай».

---

## 2026-08-13 - My Day: место ≠ причал/шоу, не выдумывать бесплатный вход

### Наблюдения
- Адмиралтейство в золотом треугольнике склеивалось с «Причал Адмиралтейство»: fuzzy `includes` по длинному имени, в пресете не было `locationSlug`.
- «Вход свободный» ставили по умолчанию, если нет ticketUrl. Исаакий и колоннада - платный интерьер.
- Эрмитаж как точка маршрута подтягивал балет за 5000 ₽ (тип Событие, чужой thumb) вместо музея. Шоу должно жить в рекомендациях.
- Адрес с 2GIS/Yandex: `Дворцовая наб., 34///Dvortsovaya Emb., 34`.

### Решения
- Preset: Адмиралтейство → `saint-petersburg-admiralteystvo`; Эрмитаж → `venueSlug: ermitazh`. Matcher отвергает лишний kind (причал/театр/балет). Явный slug не падает в loose name.
- Чип «Вход свободный» только для явной улицы (площадь/мост/набережная/проспект). Парки, сады, храмы, особняки - без выдумки; билет - только если он реально есть.
- Place-stop не получает `eventId` с афиши. Балет не клеится как admission на музей; может остаться «Рядом» / в блоке событий.
- `formatStreetAddress` отрезает `///` и латинский хвост.

### Проблемы
- Старый маршрут в localStorage может держать причал/балет, пока гость не пересоберёт пресет. Live после Deploy MSK web / «выкатывай».

---

## 2026-08-13 - My Day: hover номера + билеты в карточке

### Наблюдения
- Owner: hover на номер точки еле виден; «Билеты от …» оторваны от карточки (висели под article, перед пешим плечом).
- Lovable: номер - primary disk; active на карте `scale(1.35)`. Price pill внутри карточки рядом с dwell, не снаружи.

### Решения
- Номер: hover/active = белый диск + primary текст + лёгкий scale (как просил owner). Карта: тот же инверт + Lovable scale.
- CTA билетов в ряд meta (чип цены / dwell), внутри article.

### Проблемы
- Нет. Live после Deploy MSK web.

---

## 2026-08-13 - My Day toolbar: адаптив как у Lovable

### Наблюдения
- Owner: карточка маршрута не схлопывалась в одну линию, хотя справа пусто. Режим / оптимизация / экспорт жили тремя block-строками.
- Причина: compact-mobile (`flex-nowrap` + отдельный ряд mode) и «mobile screenshot parity». В `daibilet-planner` иначе: `flex-wrap` Пешком+Оптимизировать+По часам+корзина; с `lg` экспорт на ту же строку (`lg:flex-row lg:flex-wrap`, `lg:border-t-0`).

### Решения
- Тот же каркас, что у Lovable. Узко: экспорт под разделителем. Широко (container ≥36rem или viewport lg): одна wrapping-строка. Ширина колонки списка, не только viewport (карта открыта/свернута).

### Проблемы
- Нет. Live после Deploy MSK web.

---

## 2026-08-13 - Live: Deploy MSK web `31694312986`

### Наблюдения
- Owner: «выкатывай». HEAD `21d3c64` (nearby events в низ маршрута) ещё не был на live; предыдущий swap `31693704581` стоял на `de6f2cab`.

### Решения
- Deploy MSK web `31694312986` success, 3m9s. SHA `21d3c64aa74bb0e900f8ecacb6c5c0cd1f3a53a5`. BUILD_ID=`DNWhE8Cu-cNOGBAQRWMDI`.
- Smoke: `/` `/my-day` `/places` → 200; BUILD_ID в HTML home.

### Проблемы
- Нет.

---

## 2026-08-13 - События поблизости: из подбора в низ маршрута

### Наблюдения
- Owner: блок «События поблизости» / «Найдено: 0» не относится к «Выбору Дайбилет». Пустое состояние с STOP-связями висело в picker.

### Решения
- Убран из вкладки picks. «Выбор Дайбилет» только hot picks.
- Если есть совпадения - рекомендация внизу itinerary: 3 карточки + «Показать ещё». Без пустого «Найдено: 0».

### Проблемы
- Нет. Live Deploy MSK web `31694312986` BUILD_ID=`DNWhE8Cu-cNOGBAQRWMDI`.

---

## 2026-08-13 - City hub blog: не чужой город

### Наблюдения
- Owner: на хабе одного города вылезают статьи блога про другой. Блок «Из блога» обещал материалы о городе, а picker подмешивал generic gid без citySlug и чужой CMS citySlug (джаз Москвы на хабе СПб).

### Решения
- Чужой явный `citySlug` на хаб не попадает. Без slug - отсев по названию чужого города.
- About / афиша / sights - только city-hit. Generic how-to без города убраны. multi/regions могут в practice, на карточке бейдж города.
- Копирайт: «Материалы про {город}. Общие гиды на несколько городов подписаны на карточке.»

### Проблемы
- Нет. Live Deploy MSK web `31693704581` (`de6f2cab`); подтверждено `31694312986`.

---

## 2026-08-13 - Мой день: единый поиск вместо trio

### Наблюдения
- Раздел Места уже ищет одним полем. В `/my-day` в вкладке «Выбор Дайбилет» оставались три combobox: локации / площадки / события («Отдельный поиск по типам»). На мобилке это был единственный поиск (header compact скрыт до lg).

### Решения
- Trio снят. Один `DayRouteSearchSelect` на `unifiedSearchOptions` (loc+ven+event, round-robin) с бейджем Площадка / Локация / Событие.
- Поле в шапке picker sheet - доступно с любой вкладки. Desktop header search тот же helper.
- Ссылки каталога: места (`/places`) · события · хаб города.

### Проблемы
- Нет. Live Deploy MSK web `31693704581` (`de6f2cab`); подтверждено `31694312986`.

---

## 2026-08-13 - Длинный H1 события и мобильные крошки

### Наблюдения
- На PDP вроде «В Рускеалу на ретропоезде: Водопады и мраморный каньон» заголовок одной строкой занимает всю ширину hero.
- Последний crumb = тот же title, на мобилке дублирует H1 и съедает строку.

### Решения
- `splitLongTitleAtBreak`: если title > 48 символов, ломаем после первого `: ` или пробельного дефиса (` - `, в т.ч. длинное тире поставщика). Знак остаётся на первой строке. Не ломаем «Санкт-Петербург».
- Event hero: `<br />` на этом месте. JSON-LD BreadcrumbList без изменений.
- Мобилка (`< md`): скрываем последний crumb на Event PDP, venue/location nav и blog article bar. H1 остаётся источником текущего названия.

### Проблемы
- Нет. Live Deploy MSK web `31693704581` (`de6f2cab`); подтверждено `31694312986`.

---

## 2026-08-13 - Дворец с билетом на вход = площадка

### Наблюдения
- Owner: если во дворец/собор можно купить билет (Юсуповский), это не «достопримечательность с улицы».
- Эвристика `дворец` → `ATTRACTION` сажала Юсуповский, Екатерининский, Исаакий, Спас на Крови в `/locations`. cityInfo Юсуповского уже `mustSeeFilter: museum`, но `locationSlug`.

### Решения
- Критерий: билет **войти в здание** / сеанс внутри → `/venues` (`MUSEUM_ART_SPACE`). Фасад и ансамбль без входного продукта → `/locations`.
- Allowlist в `PALACE_MUSEUM_RE`: Юсуповский, Екатерининский, Павловский, Гатчинский, Мраморный, Михайловский замок, Петергофский дворец, Исаакий, Спас на Крови.
- Живой upgrade существующих `locationSlug` (Юсуповский) - по запросу owner (kind + 301).

### Проблемы
- Нет. Prod DB не трогали.

---

## 2026-08-13 - Единый поиск раздела «Места»

### Наблюдения
- Owner: в одном разделе нет смысла разделять поиски. Музей и набережная должны находиться одним полем, с тегом семейства. Mixed grid без запроса (`UX.LOC9`) остаётся later; поиск - обязательно сейчас.
- Было: `/places` без поиска; `/venues` и `/locations` фильтровали `q` только внутри своего family. Шапка на этих URL вела Enter в афишу.

### Решения
- `PlacesSearch` на хабе и в каталогах; Enter / «Все результаты» → `/places?q=` без family-фильтра API.
- Подсказки и сетка результатов: тег Площадка / Локация; клик на карточку - прежний `/venues` или `/locations` slug.
- Header overlay в разделе Места сабмитит туда же, не в `/events`.
- Entity URL не переписываем.

### Проблемы
- Live после Deploy MSK web.

---

## 2026-08-13 - Локация-кластер: Новая Голландия / Севкабель

### Наблюдения
- Owner: НГ и Севкабель - идеальные локации-кластеры (зонтичный бренд). Заводить как одну большую локацию; внутри - площадки/гастро и события. В планировщик в 95% случаев кладётся родитель на 2-3 часа, не каждый ресторан.
- Сейчас оба уже `OUTDOOR_LOCATION` → `/locations` (эвристика). `parentId` в Prisma нет. Nested `places[]` с хаба города сняты (Бутылка/Кузница) - правильно: дети не на карточке must-see.

### Решения
- Канон [place-cluster-canon.md](./place-cluster-canon.md): родитель = локация; дети = те же `Venue` с `parentId`; v1 без внуков; family ребёнка по обычному kind; события на кластере или точной площадке; PDP «Что внутри» + агрегат афиши; add = родитель.
- Не апгрейдить зонтик в `/venues` из-за афиши острова. Twin запрещён.
- `CAT.PLACE-CLUSTER` - schema/PDP/seed пилота; в этом проходе docs-only.

### Проблемы
- Нет. Код не пилим, пока owner не скажет билдить.

---

## 2026-08-13 - Потенциальные площадки сразу в venues

### Наблюдения
- После хаба «Места» split «С афишей» / «Достопримечательности» стал пользовательским. Owner: музеи, театры и места, куда можно продать билет, сажать в venues сразу, не ждать первой афиши.
- Канон option A это уже говорил, но seed-эвристики могли увести филармонию / консерваторию / ДК в `ATTRACTION` (`BUILDING_ATTRACTION_RE`), а `reclassifyOutdoorBuilding` переводил музеи в `ATTRACTION` (локации).

### Решения
- `inferMustSeeKindAndFamily`: театр / музей / концертный зал (филармония, консерватория, ДК, дом культуры, культурный центр) → institution kinds до buildings.
- `reclassifyOutdoorBuilding` для этих имён возвращает `THEATER` / `MUSEUM_ART_SPACE` / `CONCERT_HALL`, не `ATTRACTION`.
- Дворцы / соборы / крепости без institution-роли остаются `/locations`.
- Prod UPDATE существующих misclassified ATTRACTION - только по запросу owner (URL `/locations` → `/venues` + 301).

### Проблемы
- Нет. Live catalog не меняется без seed/apply и без API/web deploy.

---

## 2026-08-13 - Nav: Города • События • Места + hub `/places`

### Наблюдения
- Owner: «Места» - всеобъемлющий раздел; площадки и локации живут в `/venues` и `/locations`. Порядок меню: Города → События → Места (легче воспринимается). Не ломать ссылки на карточки.
- Раньше `/places` был deferred как mixed grid; для no-traffic фазы достаточно umbrella-хаба.

### Решения
- Primary nav V1.1: Города • События • Места • Подборки • Блог.
- Новый `/places`: два входа (с афишей / достопримечательности) + CTA «Мой день».
- Entity URL канон без изменений; breadcrumbs каталогов: Главная → Места → Площадки|Локации.
- `UX.LOC3` superseded; mixed grid (`UX.LOC9`) остаётся later.

### Проблемы
- Нет.

---

## 2026-08-13 - Public: hide Next «Application error» screen

### Наблюдения
- Live `daibilet.ru` мог показывать английский Next fallback: `Application error: a client-side exception has occurred while loading daibilet.ru`. Для пользователя это выглядит как сломанный сайт.
- Причина UI: в `apps/web/app` не было `error.tsx` / `global-error.tsx`. Любой uncaught client error (часто ChunkLoadError после swap `.next`) падал в дефолт Next.
- `ChunkLoadRecovery` в layout уже был, но срабатывает после гидрации; если упал root layout - слушатель не жив.

### Решения
- `app/error.tsx` + `app/global-error.tsx` + `PublicErrorScreen`: русский экран с Обновить / На главную / Афиша (plain `<a>`, без App Router).
- Chunk-ошибка: один `location.reload()` (тот же flag, что у recovery).
- `instrumentation-client.ts` вешает recovery до гидрации; helpers вынесены в `chunk-load-recovery.ts`.

### Проблемы
- Полностью «не падать» нельзя: остаётся спокойный русский recovery. Живой экран сменится после Deploy MSK web.

---

## 2026-08-13 - City sync Variant B (header + planner)

### Наблюдения
- UX-дыры: Event PDP / city hub не синхронизировали шапку; empty афиши по городу был тупым; смена города и add из другого города опирались на `window.confirm` только на `/my-day`.
- Owner: Вариант B в этой итерации (один `daibilet:dayRoute`, кастомные модалки). Вариант A (trips per city) - бэклог.

### Решения
- Event PDP: `EventPageCitySync` → `setCity(..., { persistOnly, skipRouteConfirm })` без трогания маршрута.
- Landing path с `citySlug` (не только MULTI_CITY) write-through в шапку.
- Catalog empty: city-primary copy + плитки `/cities/{spb|kazan|sochi}`; при доп. фильтрах - reset primary, hubs secondary.
- Глобальный guard `setCity` + `CityConfirmModal`; add foreign city → clear+add+sync шапки.
- `MYDAY.TRIPS-PER-CITY (A)` зафиксирован в Tasktracker/qa; старт после стабилизации B на live.

### Проблемы
- Нет.

---

## 2026-08-12 - Ligovskii pr. 10/118: pier → bus

### Наблюдения
- Owner: карточка `Лиговский пр., 10 / 118` (у входа в гостиницу Октябрьская) показывала бейдж «Причал», хотя это точка посадки автобуса.
- Live API: `venue_69de200e0d6b9816eb4af146`, public slug `ligovskii-pr-10-u-glavnogo-vhoda-v-gostinicu-oktyabrskaya`, `type=pier`.
- DB slug кириллический (`лиговскии-пр-10-…-69de200e…`); kind был `PIER`. Соседи `tochka-sbora` / `ligovskii-pr-10b` уже `bus`.
- Postgres MCP `query` read-only и после auth падал с пустым `-32603`; UPDATE через SSH MSK + node/pg (канон как `pl-vosstaniya`).

### Решения
- Prod DB: `kind` `PIER` → `MEETING_POINT` только по `id=venue_69de200e0d6b9816eb4af146`.
- Override `publicKind: bus` в `scripts/data/venue-address-overrides.json` (installed on MSK + restart `daibilet-api`).
- Revalidate tags `venue-page`/`public-surfaces` + path `/locations/…`. Live API `type=bus`, H1 без «Причал», chip «Автобусы».

### Проблемы
- Нет.

---

## 2026-08-12 - SEO Подборки: пилот-2 NN+Perm в план (без кода)

### Наблюдения
- Owner: «ок. ставим в план» - следующий охват после КГД+СПб: Нижний Новгород + Пермь.
- Пилот-1 live (meta/self-canonical/index + Stage-1 SeoOverride); рано расширять allowlist без сигнала из Вебмастера.

### Решения
- Задача `SEO.PODBORKI-PILOT-2` (Высокий, Запланировано/waiting): расширить `PODBORKI_SEO_PILOT_CITY_SLUGS` на `nizhny-novgorod` + `perm` через ~1–2 недели после закрепления пилот-1.
- Scope: meta/self-canonical/index + intents; кастом SeoOverride только 1–2 ключа на город.
- Критерий старта: нет склейки с `/cities`, приемлемый статус в поиске у КГД+СПб. Код/`PILOT_CITIES` **не** трогаем в этом проходе; docs-only commit+push, без web deploy.

### Проблемы
- Нет.

---

## 2026-08-12 - Mobile hamburger dead during SSR/loading

### Наблюдения
- Owner: на мобилке пока грузится SSR гамбургер некликабелен.
- `SiteChromeSkeleton` (route `loading.tsx` + Suspense) рисовал мёртвый `span` вместо меню.
- `SiteHeader` открывал sheet только через React `onClick` после гидрации толстого client-бандла.

### Решения
- Zero-JS checkbox disclosure: `MobileNavDisclosure` в skeleton + `MobileNavTrigger`/`MobileNavLayer` в header (sheet вне `backdrop-blur` header).
- `SiteLayout`: SiteHeader вне content Suspense (`omitHeader` fallback).
- Меню открывается из SSR HTML до гидрации; desktop `lg:hidden` без изменений.

### Проблемы
- Нет.

---

## 2026-08-12 - SEO Этап 1: 5 SeoOverride HTML (KGD+SPB)

### Наблюдения
- Owner дал 5 реальных HTML (standup/excursions КГД; bridges-night/spb-yards/river-cruises СПб) + FAQ.
- Агент 73c77a2f застрял mid-flight после wiring рельсы; продолжили upsert скриптом.

### Решения
- Upsert `scripts/data/seo-override-stage1.json` → `SeoOverride` (customTitle/Description/H1/Text).
- Рендер `customText` через `LandingSeoBottom` overrideHtml на landing pages.
- Canonical хаба: self `/podborki?city=` (metadataBase), не apex-only.

### Проблемы
- Deploy/migrate на MSK обязательны до live smoke текстов.

---

## 2026-08-12 - SEO Подборки: шаблонизатор + SeoOverride (без seed)

### Наблюдения
- Owner финальный код-пакет: SeoOverride + SEO_TEMPLATES (Group C + E) + generateMetadata на хабе и ЧПУ-интентах.
- Sample содержал баги: битый canonical, emoji, «ДайБилет», em dash, noindex хаба `all`, stub CatalogComponent.

### Решения
- Prisma `SeoOverride` (nullable customs, @@unique citySlug+landingSlug); migration без seed фейков.
- Утилита `apps/web/src/lib/seo/get-landing-seo.ts`: DB override → template → fallback; бренд **Дайбилет**; дефис; без emoji.
- Хаб: `/podborki` и `?city=all` = index; пилот KGD/SPB = self-canonical `/podborki?city=` + template; non-pilot `?city=` = noindex.
- Intent×city: шаблоны Group E + self-canonical; stablePilotIndex не ломали.
- UI каталога `LandingsCatalogView` сохранён; seoText блок только при DB override.

### Проблемы
- Таблица пустая до Этапа 1 - закрыто upsert 5 текстов.

---

## 2026-08-12 - SeoOverride + Stage-1 HTML (KGD/SPB) + self-canonical smoke

### Наблюдения
- Owner sample путал canonical пилота с корнем `https://daibilet.ru` - канон пилота = **self** `/podborki?city={seoSlug}`.
- Stage-1: 5 реальных HTML (standup/excursions КГД + bridges-night/spb-yards/river-cruises СПб) без фейков.

### Решения
- Prisma `SeoOverride` + `getLandingSeo` (override → template → fallback); intent×city meta по шаблонам Group E.
- Hub: pilot index+self-canonical; non-pilot `?city=` noindex; `/podborki` и `city=all` остаются index.
- LandingSeoBottom рендерит `customText`; upsert `upsert-seo-override-stage1.mjs`.

### Проблемы
- Нет.

---

## 2026-08-11 - SEO Подборки: финальная стратегия пилота (KGD+SPB)

### Наблюдения
- Owner финал: пилот только kaliningrad + saint-petersburg; moscow Meta leftover безвредно.
- Live smoke: Group C `?city=` уже unique meta + self-canonical; Group E self-canonical OK, но `besplatno`/`na-vyhodnye` × KGD/SPB были `noindex` из-за порога 6; `/salut-9-maya` 200 + `noindex`.
- Group A/B (bridges-night, spb-yards, country-tours): не трогать; soft `?city=` избыточен.

### Решения
- `stablePilotIndex` + `hasSeoSkeleton` в `evaluateListingIndexability`; wiring intent×city, landing-route (salute), sitemap (+KGD в listing cities).
- Salute: index круглый год + off-season stub copy; каталог по-прежнему может скрывать (`OFF_SEASON_LANDING_SLUGS`).
- Docs plan/qa/Tasktracker под Groups A-E. Editorial category index - не откатывали.

### Проблемы
- Soft `?city=` Meta всё ещё dynamic (await searchParams) - осознанный trade-off до маркера ЧПУ.

---

## 2026-08-11 - Category×city: index при editorial SEO (bypass порога 6)

### Наблюдения
- Owner: `/stendap-i-yumor/kaliningrad` - SEO-каркас важнее порога `<6` офферов; 3–5 событий в афише нормально; непрерывная индексация.
- До фикса: `evaluateListingIndexability` всегда `noindex,follow` при 1–5 офферах.

### Решения
- `hasSeoListingEditorial(landing, city)` - exact пара (без national fallback).
- `evaluateListingIndexability({ hasEditorialSeoText })` → reason `editorial_seo_hub`, index при ≥1; `zero_offers` остаётся noindex.
- Wiring: `landing-route-page` metadata + landings sitemap. Docs qa/Project/Tasktracker.

### Проблемы
- KGD не в `PRIORITY_LISTING_CITY_SLUGS` - URL indexable в robots, но в landings sitemap chunk пока не попадает (отдельный follow-up при расширении priority cities).

---

## 2026-08-11 - SEO Подборки: Meta-пилот на soft `?city=` (не ЧПУ)

### Наблюдения
- Owner LOCKED: сначала Meta/Canonical на `?city=`, не маркерный ЧПУ; canonical self; пилот kgd/spb/msk; идейный хаб vs афиша city.
- Факт slug: destinations `moskva`/`sankt-peterburg`; SEO path `moscow`/`saint-petersburg` (`/cities/sankt-peterburg` → 308 на saint-petersburg). Meta канон = SEO path.

### Решения
- Код: `podborki-city-seo.ts` + `(catalog)/page.tsx` searchParams; H1 props в LandingsCatalogView.
- Fork зафиксирован: маркер `/podborki/c/{city}` - следующий спринт после индексации без склейки.
- Plan/qa/Tasktracker обновлены; intents не трогали.

### Проблемы
- await searchParams → `/podborki` dynamic (осознанный trade-off пилота).

---

## 2026-08-11 - Rewrite: Москва за 48 часов

### Наблюдения
- Owner rewrite moscow-2-dnya-samostoyatelno-marshrut: сити-брейк День 1-2; emoji убраны из H2; дефис вместо длинного тире.
- /ekskursii/moscow и /rechnye-progulki/moscow live 200; cover/inline уже на диске.

### Решения
- MD + blog-posts web/public + sync-bodies; author editorial; commit 28533548.
- MSK upsert + revalidate; Deploy MSK web 31532073831.

### Проблемы
- Очередь Deploy MSK web сильно отменялась параллельными rewrite; дождались success.

---

## 2026-08-11 - SEO Подборки: city ЧПУ - анализ без внедрения

### Наблюдения
- Owner brief: `/podborki/{city}` (пример `sankt-peterburg` / `moskva`) вместо soft `?city=`; meta/H1; card blurbs; цепочка блог→подборка. Жёстко: перелинковку не трогать без полной проверки.
- Сейчас: хаб `apps/web/app/podborki/(catalog)` SSR city=all + client `?city=`; intents уже ЧПУ `/podborki/{intent}[/{city}]`. `[intent]` съест будущий city-сегмент → 404 без новой схемы роута.
- Slug: бриф TEP-формы vs SEO-канон landings `moscow` / `saint-petersburg` (aliases есть). Inventory: CityPageView + interstitials на query; header/footer/home/blog в основном на `/podborki`; sitemap без city-хабов подборок.

### Решения
- Документ плана: [seo-podborki-chpu-plan.md](./seo-podborki-chpu-plan.md). Фазы 0→4; Phase 0 = этот аудит. Код URL/перелинковки **не** делать до qa-ответов.
- Трек `SEO.PODBORKI-CITY-*` **отдельный** от My Day Lovable/routes и от category `seo-listing-texts` (см. запись Category hub SEO ниже).
- Безопасных точечных багов без миграции не найдено (`?city=` - осознанный soft-filter + ISR).

### Проблемы
- Без канона slug + схемы vs intents любой «быстрый» ЧПУ даст 404 или дубли с `/cities/{slug}`.

---

## 2026-08-11 - Category hub SEO-текст (Калининград стендап) + My Day routes plan

### Наблюдения
- Owner: thin `/stendap-i-yumor/kaliningrad` полупустой для роботов; нужен постоянный SEO-каркас под листингом.
- Инфра уже есть: `LandingSeoBottom` + `seo-listing-texts` (key `landingSlug:citySlug`); без editorial - generic fallback.
- Live страница 200, но `noindex,follow` при `<6` офферов (`seo-listing-meta`) - текст сам по себе индекс не откроет.
- My Day share: `/my-day?items=` + short `/d/{code}` (redirect). ЧПУ `/routes/{city}/{slug}` нет - большая фича.

### Решения
- Добавлен editorial `standup:kaliningrad` (owner copy, дефисы, бренд Дайбилет) в `seo-listing-texts`; пустых city×category не выдумываем.
- Docs: qa (index vs editorial; My Day routes MVP/риски), Tasktracker SEO.LISTING-KGD + SEO.MYDAY-ROUTES.
- Полную фабрику маршрутов / новую БД-таблицу в этом проходе не делаем.

### Проблемы
- Owner goal «топ-3 Яндекса» конфликтует с текущим noindex thin-listing - ждём ответ в qa.

---

## 2026-08-11 - EKB стендап: уральский юмор (rewrite)

### Наблюдения
- Owner rewrite `ekb-stendap-uralskiy-yumor`: 3 формата + 3 лайфхака; title «Уральский юмор без цензуры…».
- `/stendap-i-yumor/ekaterinburg` live 200; cover/inline/og уже на диске.

### Решения
- Verbatim owner + дефисы; emoji из H2 убраны; image shortcodes; author editorial.
- Commit `09de1fb1`; MSK upsert + sync-public-assets + revalidate; Deploy MSK web (очередь concurrency).
- Live smoke 200: title/форматы/лайфхаки/ссылка/inline.

### Проблемы
- Параллельные Deploy MSK web часто cancel друг друга; контент на live уже через upsert+revalidate.

---

## 2026-08-11 - Колонка Анны: музыка в особняках СПб (rewrite)

### Наблюдения
- Owner rewrite `muzyka-v-osobnyakah-spb`: 4 площадки (Половцов / Шрёдер / Мясников / Державин); emoji убран из H2.
- Live title был «Музыка с адресом…» - обновлён под новый тон: «Концерт в особняке: 4 площадки…».
- Старый slug Мясникова 404; рабочие: excursion, jazz garden, venue 200. Afisha `/events?city=saint-petersburg&q=особняк` = 200.

### Решения
- Verbatim owner + дефисы; адреса; image shortcodes; cover/inline/og уже на диске.
- MD + blog-posts web/public + `blog:sync-bodies`; MSK upsert + revalidate + Deploy MSK web.

### Проблемы
- Нет.

---

## 2026-08-11 - Колонка Анны: дискотеки Москвы (rewrite)

### Наблюдения
- Owner rewrite `moskva-vechernie-diskoteki-shou`: тон «я нашла» → column Анна; slug без изменений.
- Старый slug ВИА «Дорогие друзья» давал 404; live URL `tc-6a4e10eb...` 200. Подборка `/vecherinki-na-teplohode` 200.

### Решения
- Verbatim owner + дефисы; без emoji; image shortcodes; cover/inline/og уже на диске.
- MD + blog-posts web/public + blog-meta + sync-bodies; MSK upsert + revalidate + Deploy MSK web.

### Проблемы
- Нет.

---

## 2026-08-11 - Rewrite: Уральский Марс / Бажов (Екб)

### Наблюдения
- Owner rewrite slug `ekb-uralskiy-mars-bazhovskie-ekskursii`: 3 сценария + автобус/машина; emoji из H2 убрать; дефис вместо длинного тире.
- Cover/inline/og уже на диске; `/ekskursii/ekaterinburg` = 200.

### Решения
- MD + blog-posts web/public + `blog:sync-bodies`; author editorial; MSK upsert + revalidate + Deploy MSK web.

### Проблемы
- Нет.

---
## 2026-08-11 - Колонка Анны: ночной Сочи без глянца

### Наблюдения
- Owner дайджест Сочи (рок/стендап/джаз); стиль «Полевая правда» → `articleType=column`, автор Анна; Макс уже материал недели → `isFeatured=false`.
- Live 6 event URL = 200; адреса: Треугольник Кирова 56, Грот Островского 19, Hosta Spot пирс №330, Федина дача Черноморская 12.

### Решения
- MD `sochi-noch-bez-glyanca-rok-stendap-dzhaz` PUBLISHED now; cover+2 inline+og; blog-posts web+public; `blog:sync-bodies`.
- Commit+push; MSK upsert + sync-public-assets + revalidate; Deploy MSK web.

### Проблемы
- Нет.

---
## 2026-08-11 - Колонка Артура: гастроспектакль «Вий» (Челябинск)

### Наблюдения
- Owner текст ужин-спектакля «Вий» в Horse Head; Макс только что материал недели → автор Артур («На вкус»).
- Live event 200, priceFrom=5500, venue ул. Труда, 91.

### Решения
- MD `chelyabinsk-vii-gastro-spektakl` (column, PUBLISHED now); cover+2 inline+og; blog-posts web+public; sync-bodies.
- Commit+push; MSK upsert + sync-public-assets + revalidate; Deploy MSK web.

### Проблемы
- Нет.

---
## 2026-08-11 - Колонка Макса: «Как перестать гулять по кругу» (материал недели)

### Наблюдения
- Owner текст 5 сценариев Москвы; срочный вырез куска `словах «черно-белые дни», «сентябрь горит» или` → стык `Если при треках Linkin Park и МакSим…`.
- Нужны адреса, рабочие `/events`, cover+2 inline+og, `isFeatured` как материал недели.

### Решения
- MD `kak-perestat-gulyat-po-krugu-moskva` (`authorId=max`, column); blog-posts web+public; `blog:sync-bodies`.
- Commit `5e703d2c`; MSK upsert PUBLISHED + SQL `isFeatured` swap; sync-public-assets; revalidate `/blog`+article; Deploy MSK web `31525508276`.
- Smoke: lyric fix OK, badge «От автора», 6 event links 200, cover/og 200, slug на `/blog`.

### Проблемы
- `blog-upsert` не пишет `isFeatured` - только SQL/admin.

---

## 2026-08-11 - Closed 17:30 slot stuck in ISR/nginx

### Наблюдения
- Owner: на «История в тарелке» виден закрытый 17:30 (15.08). API уже без STAND_BY; HTML `x-nextjs-cache HIT` + nginx `proxy_cache` держали stale session `sess_6a43de0d` (TC STAND_BY).
- TC сверка meta: 8 STAND_BY / 10 PUBLIC. Остальные 17:30 в TC реально PUBLIC (vacant>0).
- Дыра: `tc:sync --ids` warm не бил `/events/[slug]` + nginx; UI `listPurchasableSessionVariants` мог fallback на blocked.

### Решения
- Soft-redirect если opened event STAND_BY → nearest PUBLIC sibling; UI никогда не рисует blocked; `tc:sync` передаёт `TC_REVALIDATE_EVENT_SLUGS` + nginx purge в warm.
- Ops: revalidate `:3001` + purge nginx для slug.

### Проблемы
- Полный web artifact нужен для client filter/slice; API+scripts закрывают stale HTML сразу.

---

## 2026-08-11 - Event page: missing TC slots (slice 5)

### Наблюдения
- Owner: live `/events/...-6a43de0d9a11d83d48179599` (История в тарелке, KGD) показывал только 5 слотов при 10+ PUBLIC в meta-группе.
- TC: каждый timeslot = отдельный Event; meta `6a43dc57…` → 36 children (16 cancelled / 9 STAND_BY / 11 PUBLIC в DB; live TC на момент сверки 10 PUBLIC / 8 STAND_BY среди upcoming).
- `public-event.dto.ts`: `take: 12` + `.slice(0, 5)` обрезал saleable sessions после фильтра STAND_BY/closed.

### Решения
- Лимиты: fetch 64 / display 32 (`PUBLIC_EVENT_SESSION_*`).
- MSK: `tc:sync --ids=` по siblings + restart API (без web deploy).

### Проблемы
- Описание продукта упоминает ещё 15:30 локально; в TC/DB только wall 17:30 и 19:30 (KGD). Слоты STAND_BY корректно скрыты.

---

## 2026-08-11 - My Day: Lovable «Шаг 2 из 2» card

### Наблюдения
- При 1-2 точках был plain sky-alert «добавьте ещё» (только belowMin=1); Lovable показывает dashed lavender card «Шаг 2 из 2» с CTA.

### Решения
- Card `data-day-step2-card` при `venues.length > 0 && < 3`: eyebrow Шаг 2 из 2, title с N из DAY_ROUTE_SOFT, primary «+ Добавить ещё места» → picker places, secondary «Спланировать по часам» → `setHourPlanOn(true)`.
- Hour plan gate снят с DAY_ROUTE_MIN (работает с 1+ точек); sky belowMin supersede этой карточкой.

### Проблемы
- Нет.

---

## 2026-08-11 - My Day: horizontal main places + Lovable stop cards

### Наблюдения
- В drawer «Главные места» карточки снова выглядели как узкие портреты: `sm:grid-cols-2` в узком sheet сжимал thumb+текст.
- Stop-cards itinerary отставали от Lovable (шевроны, пустой pin-tile, слабые типы).

### Решения
- Must-see в picker: одна колонка, `flex-row`, крупный thumb слева (`h-24 w-28`), title+desc справа, `+` справа (`data-day-must-see-layout=horizontal-row`).
- List stop cards: number+grip only, type tag, soft time `12:25-14:25`, chips «Можно купить билет» / «Вход свободный» / dwell, thumb справа; keyboard DnD (Space/Enter/arrows/Escape).
- Типы: must-see + `venueTypeLabel` из каталога; Gantt strip при «По часам»; PDF с картой (canvas+print); «Сохранить как сценарий» (localStorage).

### Проблемы
- GPX/KML ещё deferred; jspdf не ставили (workspace install) - PDF через print dialog.
- Live MSK - batch / «выкатывай».

---

## 2026-08-11 - My Day toolbar: orphan trash wrap

### Наблюдения
- Owner: корзина clear-route уезжала на отдельную строку под Пешком/Авто/Оптимизировать/По часам; export ряд визуально разъезжался vs Lovable.

### Решения
- `MyDayToolbar`: actions `flex-nowrap` + `shrink-0` + горизонтальный scroll на узких; export всегда отдельной строкой (снят `lg:flex-row` side-by-side); единая высота `h-9` / trash `h-9 w-9`.

### Проблемы
- Live MSK web - batch / «выкатывай».

---

## 2026-08-11 - My Day: Lovable sticky route toolbar

### Наблюдения
- При непустом маршруте H1 держал generic Save/Clear/Share; Lovable держит sticky route card (stats, mode, optimize, hours, trash, export, типы точек, dnd-hint).

### Решения
- `MyDayToolbar`: stats (N точек + дистанция + total с dwell), Пешком/На авто, Оптимизировать, По часам, trash, export PDF/печать + Поделиться (GPX/KML отложены).
- «Типы точек» pills + «Показано X из Y» + dnd-hint; фильтр скрывает точки в списке/карте.
- H1 Save/Clear/Share row убран при непустом дне - действия в toolbar.

### Проблемы
- GPX/KML / «Сохранить как сценарий» / PDF-с-картой (карта в PDF) - не 1:1 Lovable, см. gap audit.
- Live MSK web - batch / «выкатывай».

---

## 2026-08-11 - Region hub: previews + map open by default

### Наблюдения
- «Куда съездить» и city rail были text/pin-only; карта свёрнута по умолчанию.

### Решения
- Photo-first topPlaces (imageUrl → city asset → session cover); city rail тот же fallback; `mapOpen` = true.
- Helper `region-place-preview.ts`; optional `imageUrl` в regionInfo DTO.

### Проблемы
- Deploy по «выкатывай».

---

## 2026-08-11 - My Day: Lovable H1 scope + own-place geocode

### Наблюдения
- H1 subtitle был readiness `N точек из 10` - не как Lovable (`7 точек · 3 пригорода` = каталог города / пригороды).
- Sticky «Купить билеты на маршрут» слишком рано на partial/empty day.
- «Своё место» без lat/lng оставалось list-only.

### Решения
- H1: `buildMyDayCityScopeLine(mustSee|locations, significantSuburbs)` + ссылка на хаб; separator `·`.
- Убран sticky buy CTA; остаются «Добавить места» / «Посмотреть готовый день». Per-stop ticket CTA не трогали.
- Soft geocode: `/api/day-route/geocode` (Nominatim + city viewbox) + кнопка «Найти на карте»; add без coords по-прежнему ок.
- Бонусом: `/my-day?city=` читается SelectedCityProvider (readsCityQueryParam).

### Проблемы
- Live MSK web - batch / по запросу owner («выкатывай»).

---

## 2026-08-11 - My Day empty: Lovable step card order

### Наблюдения
- Empty My Day всё ещё читался как старый «Собери свой день»: порядок блоков не совпадал со скрином Lovable (picker bar → dashed «Шаг 1 из 2»).

### Решения
- Empty branch: `MyDayPickerLaunch` сверху, затем `renderEmptyStarter` (step card + map preview / city picker).
- Копирайт launch bar выровнен с Lovable (дефис `-`, без em dash): «Сценарии, главные места, пригороды и рекомендации - в одной боковой панели».
- Desktop Save/Share/Open route в empty header не дублировали: в нашем shell они завязаны на непустой маршрут; city chip уже в другом месте.

### Проблемы
- Live MSK web - batch / по запросу owner (локально + push ветки достаточно).

---

## 2026-08-11 - Home popular cities: mobile tap dead + false «0 событий»

### Наблюдения
- Owner phone: карточки «Популярные города» (`HomePopularCitiesRail`) не открывают хаб (скрин с Пермью).
- Live href каноничны (`/cities/perm` 200); API events у городов >0. Не dead link.
- Deploy `31499687634` (SHA `50435cdc` hang-bound) ещё in_progress; live был `249a9e67`.

### Решения
- Root cause tap: loop-normalize на `scroll` во время touch прыгал `scrollLeft` / micro-scroll в overflow-x+snap гасил click. Fix: skip wrap while pointer down; touch/pen tap → `router.push(/cities/…)`; swipe >12px глотает click.
- «0 событий» при живых venues: `CountUp` стартует с 0 и IO в horizontal rail часто не стартует. Compact `CityCard` - сразу `pluralEvents(n)`.

### Проблемы
- Нужен Deploy MSK web после push + hard refresh на телефоне.

---

## 2026-08-11 - Region Hub Tier A UX (Подмосковье → шаблон)

### Наблюдения
- Region hub читался как простыня однотипных EventCard: дубли CTA, слабая ось «далеко ли ехать?», доминирование одной площадки в ленте.

### Решения
- Lean `RegionEventCard` (фото-доминанта, дата, город, один genre bubble, один CTA).
- City avatar rail + sticky date rail / genre chips; пояса МКАД из `data/geo/region-city-belts.ru.json` (пилот `moskovskaya-oblast`).
- `groupRegionAfficheSessions`: схлопывание серий venue (≥3 или ≥40% ленты).
- Compact OSM orient map (клик = city filter). Section banding white / slate-50.

### Проблемы
- Шоссе-коридоры и cluster map - out of v1.
- Остальные Tier A без belt JSON получают UI каркас без поясов.

---

## 2026-08-11 - MSK: accelerate /api/public/home cold rebuild

### Наблюдения
- После `48a49340` home снова живой, но cold `?refresh=1` после restart API ~6.4-7.5s.
- Profile `buildPublicHome`: venues hub SQL ~4.9s + `buildPublicLandings` rematch ~1.5s; catalog disk adopt ~0.3-0.5s.

### Решения
- `publicVenuesForHome`: soft hub или top-N venueIds из sessions + lean SQL (без Event JOIN); full hub warm в фоне.
- `buildPublicLandings({ preferCachedSlugs: true })`: без rematch + агрегация O(sessions*slugs).
- На MSK: файлы в `/opt/daibilet/apps/backend/src` + `systemctl restart daibilet-api`.
- After: cold ~0.7s, refresh2 ~0.3s, warm ~7ms.

### Проблемы
- Первый hit после restart всё ещё платит ~0.5s disk catalog promote - ок для Soft-SWR; startup warm optional.

---

## 2026-08-11 - MSK: /api/public/home stale fallback (publicVenues)

### Наблюдения
- Live GET `/api/public/home` отдавал `generatedAt=2026-05-30` из `apps/public/data.js`.
- journal: `Falling back to apps/public/data.js: publicVenues is not defined`.
- Localhost API warm: destinations/home ~10ms; cold catalog SWR adopt 0.2-2s; host load OK.
- nginx `/api/public/*` -> `:4000` (не Next). Next `:3001/api/public/home` = 404.

### Решения
- Export `publicVenues` из `public-venue-read.js`, import в `dto.js`.
- `buildPublicHome`: один `publicCatalogSessions` + derive destinations (без второго full scan).
- Commit `48a49340`; на MSK checkout двух файлов + `systemctl restart daibilet-api`.
- After: home `generatedAt` live, dest=98/events=2941; warm ~15-155ms; `/` ~163ms.

### Проблемы
- ~~Cold `home?refresh=1` localhost ~7.5s (catalog+venues hub) - отдельный perf pass.~~ → fixed 2026-08-11 (~0.7s cold).
- MSK git tip всё ещё старый checkout; файлы пропатчены точечно.

---

## 2026-08-11 - My Day: picker side drawer (Lovable)

### Наблюдения
- Inline shelf (сценарии / места / пригороды / picks / своё) перегружал `/my-day`.
- Lovable: компактный launch + left Sheet «Подбор точек».

### Решения
- `MyDayPickerLaunch` + `MyDayPickerSheet` (portal overlay).
- Контент подбора только в drawer по вкладкам; страница = маршрут + карта.
- Empty CTA / mobile «Добавить места» / between insert открывают drawer.

### Проблемы
- Accordion chrome внутри вкладок places/own ещё можно упростить.
- Boat wizard сидит во вкладке «Своё место».

---

## 2026-08-11 - My Day Wave 1.5: Lovable visual parity

### Наблюдения
- Owner: Wave 1 shell alone looked crooked vs Lovable - legacy wanderlog cards + wrap toolbar + grid toggle.
- Goal: visual parity of cards/toolbar without changing LS / share / notes schema.

### Решения
- List-only itinerary (drop Сетка/Список toggle from UI).
- Stop card: number circle + grip | title/address/pills | thumb; commerce chips below.
- Toolbar: dense actions row with horizontal scroll (no wrap chaos).
- Between-leg: dashed Lovable leg (`км · ~мин пешком/авто`) + hover `+`.

### Проблемы
- Grid card branch still in file (dead); full delete later.
- PDF/GPX = Wave 2; ticket CTA polish = Wave 3.

---

## 2026-08-11 - My Day Wave 1: Lovable UX rebuild (wireframe)

### Наблюдения
- Owner: пересобрать `/my-day` по паттернам `daibilet-planner` (Lovable), адаптивно desktop/tablet/mobile.
- Текущий `DayRoutePanel` ~5.4k строк - god-component; data layer (`day-route.ts`, share API, notes, between-leg) оставляем.
- В Lovable нет Gantt: itinerary + legs + «По часам» badges; PDF/GPX - Волна 2; ticket CTA - Волна 3 (наш moat).

### Решения (Волна 1 wireframe)
```
MyDayShell
├─ list column (scroll)
│  ├─ MyDayToolbar (sticky): N точек · км · мин · Пешком/Авто · Оптимизировать · По часам · Share
│  ├─ MyDayItinerary: cards + between-leg tips/+ · hour badges · overflow banner
│  └─ MyDayAddShelf: scenarios / must-see / search / boat (as-is)
└─ map column (lg sticky)
   ├─ collapse → 56px rail
   ├─ DayRouteOsmMap + hover sync
   └─ mobile: FAB → bottom sheet ~85vh (не fullscreen-only)
```
- Модули: `apps/web/src/components/my-day/*` + `useMyDayController` (layout state Wave 1).
- Не копируем Vite/TanStack/shadcn SPA и mock cities.

### Проблемы
- Полный вынос всего state из panel в controller - следующий шаг; Wave 1 = shell + toolbar + map collapse/sheet + schedule banner.
- Tip: см. commit Wave 1; Deploy MSK web после push.

---

## 2026-08-11 - Homepage: popular cities rail while(scrollLeft) hang

### Наблюдения
- Owner: hangs only on `/`; other pages OK. Hypothesis: infinite scroll of cities.
- Code: `HomePopularCitiesRail` only on home. Not network infinite scroll - capped `orderPopularRailCities(..., 12)` × `LOOP_COPIES=3` DOM clones. No IntersectionObserver / load-more fetch.
- Risk: `wrapScrollIntoLoopBand` / arrow pre-shift used unbounded `while (scrollLeft …) scrollLeft ±= setWidth`. Browsers clamp `scrollLeft`; if layout not ready (`maxScrollLeft << setWidth`), assignment is no-op → main-thread freeze, homepage-only.

### Решения
- Bound loop (`LOOP_COPIES+2`) + break when `scrollLeft` does not change after write. Arrow path reuses same helper.

### Проблемы
- SSR home still heavier than `/cities` (articles/fingerprints/catalog); separate from this client freeze path.

---

## 2026-08-11 - my-day: drop must-see bulk CTA

### Наблюдения
- Owner screenshot: у «Главные места» синяя кнопка «Добавить главные места» (sparkle) съедала вертикаль и дублировала chips/карточки (добавление по клику на место).

### Решения
- `DayRoutePanel`: убрать `data-day-must-see-bulk` + `addAllMustSee` / `mustSeeAddable`; оставить `MustSeeFilterTabs` и список мест.

### Проблемы
- Нет. Tip `8b889e85`; Deploy MSK web `31473922071`; BUILD_ID=`FZI5gnbEMamJmDZd6NqvN`.

---

## 2026-08-11 - Popular cities rail: infinite loop rollback on arrows

### Наблюдения
- После `ea6c7897` (snap pause + RO width-only) стрелки на последнем городе откатывали рейку к MSK под H2 вместо бесконечного loop.
- `programScrollRef` глушил `normalizeLoop` на время smooth scroll; на `scrollend` snap включали **до** wrap → `snap-mandatory` + `scroll-padding` якорили к title gutter (видимый rollback). У края track `scrollTo` ещё и clamp в `maxScrollLeft`.

### Решения
- Pre-shift в loop-band `[0.5, 1.5)×setWidth` перед arrow glide (с запасом под шаг 3 карточки).
- На finish: `normalizeLoop({ force })` **пока snap=none**, затем restore snap.
- `wrapScrollIntoLoopBand` через while (не один ±setWidth).

### Проблемы
- Нет.

---

## 2026-08-11 - Homepage CSS 404 / preload noise after artifact swap

### Наблюдения
- Owner console: `Failed to load …/124723ded0d5f3c3.css` 404; ~77 Chrome warnings «preloaded but not used» для `/_next/static/css/*.css`.
- Live HTML сейчас: BUILD_ID=`YwGFANzFPBZkzySBwJd_H`, только 3 stylesheet (`fdfb…`, `f621…`, `29c7…`) - все HTTP 200.
- Owner hashes `124723…` / `6b2e1b…` / `5989a2…` на диске **нет** (404) и в текущем HTML не ссылаются → stale HTML/tab после серии Deploy MSK web (logo agent + другие), не баг preload в `apps/web`.
- `/`: `Cache-Control: s-maxage=300, stale-while-revalidate=31535700`; nginx purge после swap есть, но open tabs / короткий HTML cache всё равно держат старые CSS hashes. `swap` полностью заменяет `.next` → hashed static пропадает сразу.

### Решения
- `swap-web-next-artifact.sh`: после atomic swap merge из `.next.prev/static/{css,chunks,media}` с `cp -rn` (no-clobber) - compat-окно для старого HTML.
- Preload-warnings без 404: Next App Router / Chrome noise (нет явного CSS preload в apps/web) - не чиним отдельно.
- Owner: hard refresh после стабилизации деплоя.

### Проблемы
- Быстрые параллельные Deploy MSK web усиливают окно desync; concurrency group без cancel-in-progress - очередь ок, но tabs всё равно видят старый document.

---

## 2026-08-11 - Logo: static й-кратка (no animation)

### Наблюдения
- Owner rage: на live читалось «Даибилет» без й; point-1 в viewBox 500 схлопывался до ~2-3px; анимация с `both` могла оставить opacity 0. Owner: «просил без анимации».

### Решения
- point-1 = em-sized SVG circle over «и» (`.breveMark`) - всегда читаемая кратка й.
- Desktop: static routes + point-2/3 сразу видны. Mobile: только wordmark + point-1 (arcs/pebbles hidden).
- Убраны все `@keyframes` / routeIn / land / landFinal. `animated` prop deprecated no-op.

### Проблемы
- Нет.

---

## 2026-08-11 - my-day: notes must not trigger coords banner

### Наблюдения
- Добавление «Заметка» поднимало amber banner «Без координат: 1. В Яндекс уйдут…» - owner: отсебятина; notes нужны.

### Решения
- `countDayRoutePlacesMissingCoords` исключает `note_*`; banner только если у place-стопов нет lat/lng.
- Feature notes не трогаем.

### Проблемы
- Нет.

---

## 2026-08-11 - my-day: list layout + free-window city scope

### Наблюдения
- Список: pin и ↑↓ скучены; thumb у правой стены stretched card - огромный gap.
- «Свободное окно» могло предложить билет Сортавалы на день в Перми (header city ≠ route city; upsell без city filter).
- Mode walk/auto дублировался в between-leg; owner: советы между точками идеальны, mode только у общего км/мин сверху.

### Решения
- List: вертикальная ось ↑ / pin / ↓; ряд `pin | content(+pad) | thumb | actions` без `ml-auto` gap.
- Free-window: `buildDayRouteFreeWindowCityScope` (route majority wins) + filter кандидатов; copy «Между точками около N.»
- Between-leg: stats + transitTip + «+»; top mode - icon-compact.

### Проблемы
- Нет.

---

## 2026-08-11 - my-day: notes + Kryukov Nikolsky + heading copy

### Наблюдения
- Owner batch: polish list/grid; real between-stop notes (remove «Добавить список»); insert search without blue hint; SPB Berthold route previews/coords; Никольский = Николо-Богоявленский на Крюковом (не Кронштадт); heading «Маршрут из N точек».

### Решения
- `formatDayRouteStopsHeading` → `Маршрут из N {genitive}` (1 точки / 2-4+ точек / 21 точки); soft/hard suffixes.
- Notes: `addNoteStopToDayRoute` + share `n:` tokens; menu place+note only; insert UI = placeholder + Отмена.
- Kryukov: preset slug `nikolo-bogoyavlenskiy` + coords/address; `repairDayRouteKronstadtNikolskyStops` + block loose name-match to Kronstadt naval.
- Editorial coords for Berthold-route SPB slugs; Hohlovka duplicate `travelVector` cleared when = desc.

### Проблемы
- Нет. Live: Deploy MSK web после push.

---

## 2026-08-10 - my-day: Wanderlog list between-leg + insert

### Наблюдения
- Owner: список «Мой день» как Wanderlog - teal pin, thumb справа, между карточками leg `10 мин • 810 м` + «Маршруты», hover `+` на пунктире (место / заметка / список).

### Решения
- `DayRoutePanel`: list cards pin+meta+thumb; HTML5 DnD reorder планов; `DayRouteBetweenInsert` (connector, walk/auto stats из haversine+mode, «Маршруты» switcher walk/auto); `+` → insertAfter + поиск; заметка/список - toast «Скоро».
- Stats реальные из `segmentMeters` / `estimateDayRouteTravelMinutes`; без координат - stub «маршрут». Мультимодалка - UI stub.

### Проблемы
- Нет.

---

## 2026-08-10 - my-day: hide Шаги + dismiss free window

### Наблюдения
- Owner screenshot: горизонтальный stepper «Шаги» мешает; карточки Сетка/Список оставляем.
- «Свободное окно» без dismiss - нельзя убрать подсказку.

### Решения
- `SHOW_DAY_ROUTE_STEPS = false` в `DayRoutePanel.client.tsx` (вернуть `true` для restore).
- Dismiss X на блоке «Свободное окно» - React state на сессию (`freeWindowDismissed`).

### Проблемы
- Нет.

---

## 2026-08-10 - my-day: Шаги always + restore Сетка

### Наблюдения
- После travel-product pass toggle стал «Шаги | Список» и timeline прятался в list mode (`6000b9d9`).
- Owner: горизонтальные «Шаги» всегда над точками; тоггл только детали снизу - «Сетка | Список».

### Решения
- `DayRouteStopViewMode` снова `grid | list`; default/migrate `timeline`→`grid`.
- `DayRouteStopsTimeline` всегда при ≥1 stop; toggle меняет `variant` карточек + CSS fence/list.
- Persist key `daibilet:dayRouteStopView` без смены.

### Проблемы
- Нет.

---

## 2026-08-10 - Event 404: TC STAND_BY → TEP twin redirect

### Наблюдения
- URL `/events/nochnoi-kruiz-…-6a1ef2c0422ee8677bad10e3` → HTTP 404 (Next ISR HIT + API `not_found`).
- Event `evt_6a1ef2c0422ee8677bad10e3` есть в БД (READY, sessions+offers), но `sourceStatus=STAND_BY` (TC sales stopped). Вся meta-семья (~45) тоже STAND_BY.
- Suffix resolve по hex id уже работал; soft-sibling redirect упирался в STAND_BY siblings.
- Живой twin: Teplohod `evt_tep_910` (`…-diskotekoi-i-puteshestviem-…-910`), тот же набор слов в title.

### Решения
- `findNearestSaleableSiblingSlug`: фильтр on-sale (не STAND_BY/closed).
- Soft-404 fallback `findSaleableTitleTwinSlug` (token-set fingerprint, same city).
- Event page: `permanentRedirect` на `canonicalPath`, если requested slug ≠ live slug.

### Проблемы
- Нужен deploy API + Deploy MSK web (ISR 404 cache HIT). Catalog listing STAND_BY по-прежнему скрыт - ок.

---

## 2026-08-10 - my-day boat piers: dedupe / routes / distance

### Наблюдения
- Wizard «Добавить теплоход»: дубли «Университетская наб. 13» vs «наб., 13» (TC + TEP).
- Карточки с `events=0` и junk-placeholder («причал будут известны позже…») всё ещё кликабельны.
- «Дворцовая набережная, 18» (`venue_681d44a7…`) без lat/lng в API → нет «~N м от маршрута».

### Решения
- `day-route-boat`: `normalizeBoatPierLabel` / `boatPierDedupeKey` / `dedupeBoatPiers` / `pierHasBoatRoutes`; known coords fallback для Дворцовой 18; `rankBoatPiers` enrich+dedupe.
- Wizard: только bookable piers; не дублировать address=name в subtitle.
- `ensure-spb-dvortsovaya-18-pier-merge.js`: пишет latitude/longitude при --apply (DB backfill отдельно).

### Проблемы
- Prod DB coords для Дворцовой 18 всё ещё null до backfill/apply; UI уже считает дистанцию через fallback.

---

## 2026-08-10 - Venue PDP: metro + Hermitage batch v3

### Наблюдения
- В репо не было nearest-metro; только ручной `metroStation` / editorial.
- Owner: hero/contacts метро для MSK/SPB; Hermitage UX (tabs/fact/gallery/open-now/copy).

### Решения
- Data: `metro-stations-msk-spb.ts` из nextgis/metro4all (182 MSK + 64 SPB), haversine ≤2.5 км.
- `resolveNearestMetroStationName`: DB/editorial first, else nearest; silent omit.
- Institution + Location layouts: адрес ` • ` м. … в hero; 🚇 в контактах.
- Hermitage: gallery (2 real covers), «Открыто сейчас», thumbs в «Ближайшие события», Афиша tab if sessions, copy «Также можно посетить» + nearby disclaimer.

### Проблемы
- Нет.

---

## 2026-08-10 - Hermitage PDP UX v3 (tabs / факт / hide tickets)

### Наблюдения
- Owner: коммерческий блок «Билеты» + hero chips лишние; часы в sidebar ниже карты; нет hookFact как на city hub; табы шумные (афиша / экскурсии / контакты).

### Решения
- `InstitutionVenueLayout`: без hero badges/chips; без editorial commercial tickets / CTA «Купить билет».
- Билеты (tab + `VenueAdmissionBlock`) только при `admissionProducts` (внутренний ЛК).
- Sticky tabs: О месте → Билеты(LC) → Как посетить → Вопросы → Отзывы → Похожие.
- Секции: Факт → О месте → …; экскурсии+similar в одном «Похожие»; sidebar часы над картой.
- Editorial `hookFact` для `ermitazh` (+ overlay если DB пуст).

### Проблемы
- Venue reviews API нет - секция «Отзывы» placeholder.
- External `tickets` в editorial сохранены на будущее, UI не рендерит.

---

## 2026-08-10 - Hermitage PDP: SPBBOATS commercial UX

### Наблюдения
- Live H1/SEO: «Эрмитаж (Зимний дворец)» вместо канона «Государственный Эрмитаж»; metro null; related = standup/бары.
- Own tickets пусты (нет sessions/admission); только STOP-экскурсия конкурировала в hero.
- SPBBOATS seed hours 10:30 vs editorial/official visitus 11:00.

### Решения
- Editorial overlay `ermitazh`: displayTitle, tickets от 500 ₽ → hermitage tickets URL, phone/site, feature icon chips в hero.
- `InstitutionVenueLayout`: коммерческий hero (цена + «Купить билет»), адрес `•` метро, блок «Билеты» первым, STOP под «Также можно посетить с экскурсией», контакты в sidebar, similar только museums/cultural.
- `publicRelatedVenues`: affinity ranking (museum≠nightlife); client `filterSimilarInstitutionVenues` hide-if-empty.
- Часы: оставляем official hermitagemuseum.org visitus (11:00); seed 10:30 documented as superseded.

### Проблемы
- Prod DB title/seoH1 ещё legacy до ensure-скрипта / admin write; UI+metadata уже через overlay.
- API restart на MSK нужен для relatedVenues в JSON; UI уже фильтрует client-side.

---

## 2026-08-10 - Hermitage PDP: layout + alias redirect

### Наблюдения
- Owner 404 на `/venues/gosudarstvennyi-ermitazh` (TC twin / alternate translit); в `next.config` был только `gosudarstvennyy-ermitazh` → `ermitazh`. Канон `/venues/ermitazh` уже 200.
- Institution PDP: feature chips в hero лишние; нет метро в hero (`metroStation` null в prod API); «В маршрутах» выше «О месте»; text link «Открыть на карте» дублирует кнопки карты.

### Решения
- Permanent redirect `gosudarstvennyi-ermitazh` → `/venues/ermitazh` (рядом с yy-вариантом).
- `InstitutionVenueLayout`: без hero chips; metro в hero (`м. …`, editorial fallback `Адмиралтейская`); секции О месте → Как посетить → экскурсии → похожие → FAQ; табы в том же порядке; features chips в «О месте»; убран «Открыть на карте».

### Проблемы
- Venue reviews API на institution PDP нет (ReviewSection event-only) - FAQ внизу; блок отзывов не добавляли.

---

### Наблюдения
- Order MSK→SPB уже верный, но initial scroll центрировал пару: слева под H2 торчали Краснодар и др.

### Решения
- `HomePopularCitiesRail.jumpToFocus`: left-align Москвы к gutter `.container-page` под «Популярные города»; SPB сразу справа; left infinite peek остаётся в gutter; resize/RO пересчитывают якорь. Loop normalize без изменений.
- Deploy MSK web tip (вместе с logo breve-line + city hero CTAs).

### Проблемы
- Нет.

---

## 2026-08-10 - Logo breve-line + city hub hero CTAs

### Наблюдения
- Owner: вместо чёрной точки над «и» - короткая сплошная черта (й-breve), от правого конца которой продолжается синий пунктир маршрута.
- City hub hero: убрать search «Найти экскурсию…»; вернуть кнопки Афиша + Подборки событий.

### Решения
- `DaibiletLogo`: убран `point-1` circle; solid blue quadratic breve `M152 58 Q170 52 188 58`; dashed `ROUTE_1` стартует с `(188,58)` → mid `(315,31)`; mid circle + X без изменений; static.
- `CityHeroStrip`: без search form; button CTAs Афиша → events?city=, Подборки событий → podborki?city=; H1/brief/badge/stats сохранены.
- Commit+push + Deploy MSK web.

### Проблемы
- Нет.

---

## 2026-08-10 - City hub: brief in hero; first submenu «Зачем ехать»

### Наблюдения
- Owner: description back IN HERO; first submenu = «Зачем ехать» (не body «Описание» первым). Предыдущий about-блок с «Описание» ломал IA.

### Решения
- `brief` снова в `CityHeroStrip`; sticky/jump первый пункт → `#sights` «Зачем ехать».
- `hookFact` callout внутри `#sights` после H2; отдельный body «О городе» снят.
- Batch deploy вместе с mobile selects / dedupe rail / covers.

### Проблемы
- Нет.

---

## 2026-08-10 - /events mobile: restore date + type selects; batch deploy

### Наблюдения
- Live mobile `/events` снова показывал date chips + type chips + calendar (после `ad5f3dc0`), хотя owner-договорённость: search + два dropdown (Дата / Тип события).
- Desktop date rail оставляем; «Сейчас выбирают» дублировал первую страницу карточек 1:1.

### Решения
- Mobile: `CatalogToolbar` - search + `MobileDateSelect` / `MobileCategorySelect`; chip rails и hero date rail только `md+`.
- Dedupe live rail IDs из сетки; calendar chip baseline `h-9` + `pb-0` на snap-row; disco cover с людьми/руками; city hub `#about` facts; Kievsky cruise remap.
- Commit+push + Deploy MSK web; restart `daibilet-api` ради EVENT_PACK remap.

### Проблемы
- Нет.

---

## 2026-08-10 - City hub: restore Описание / Факты / Зачем ехать before scenarios

### Наблюдения
- После `b3b52684` на city hub первый body-блок после tabs стал «Готовые сценарии»; `CityWhyGoSection` (brief + hookFact) сняли, places rail прятали при named presets, H2 «Зачем ехать» заменили на сценарии.

### Решения
- Общий шаблон `CityPageView`: после tabs снова `#about` - Описание (`brief`) и Факты (`hookFact`) из `cityInfo`.
- `#sights`: H2 «Зачем ехать {город}» + must-see places, затем H3 «Готовые сценарии» + magazine presets. Code in `b113a927`; docs `ba4ff652`+; **без** web deploy.

### Проблемы
- Нет.

---

## 2026-08-10 - Hermitage PDP: SPBBOATS content layer (editorial)

### Наблюдения
- Research pack `venue-seeds-hermitage-garage`: у SPBBOATS per-venue highlights/FAQ/features; у Daibilet FAQ был generic, chips не было, часы только в ticket overlay.
- В БД нет колонок highlights/faq/features/openingHours - prod seed write не нужен для показа на live.

### Решения
- `venue-editorial-content.ts`: slug overlay для `ermitazh` (highlights, feature chips, FAQ) - hyphen-only, без CMS template.
- `InstitutionVenueLayout`: chips в hero, highlights в «О месте», per-venue FAQ, sidebar «Часы работы» через `resolveVenueOpeningHours`.
- Часы `ermitazh` / Главный штаб выровнены с официальным графиком (Пн выходной; Ср/Чт/Вс 11-18; Вт/Пт/Сб 11-20).
- Garage skip. Commit+push + Deploy MSK web.

### Проблемы
- Нет.

---

## 2026-08-10 - /events: calendar corner + cruise covers + live rail width

### Наблюдения
- В title band date rail справа пустое место - owner ждал calendar/range (после `221e37ab` system date input сняли из toolbar).
- «Сейчас выбирают»: flyer PNG `evt_tep_186/187/1222` с baked-in «РЕЧНАЯ ПРОГУЛКА ПО ЦЕНТРУ МОСКВЫ» дублировали title.
- Live rail узже search/toolbar: фиксированные `w-44` карточки оставляли пустые поля по краям контейнера.

### Решения
- `CatalogDateRail`: chip-кнопка календаря справа + popover from/to → `from`/`to` catalog URL (как advanced filters).
- EVENT_PACK remap 186→leto-kievsky, 187→leto-zaryade, 1222→moscow-center-loop; live rail через `resolveEventCardPrimaryImage`.
- `CatalogLiveRail`: `w-full` + `md:flex-1` карточки на ширину `container-page`. Commit+push; **без** web deploy.

### Проблемы
- Нет.

---

## 2026-08-10 - Homepage: full-bleed vs boxed rhythm

### Наблюдения
- После P0-P2 секции всё ещё читались как одинаковые `container-page` блоки: города без серой полосы, My Day как сжатый white-card баннер, блог как boxed magazine grid.

### Решения
- Канон ритма: hero full → editors boxed → cities full `#F5F5F7` (rail left=gutter, right bleed, scrollbar hidden) → My Day full graphite `#0F172A` → popular/collections boxed → blog full magazine (copy + «Читать гайд», фото к краю).
- CSS: `.breakout`, `.home-bleed-rail`; shell `overflow-x-hidden`. Commit+push; **без** web deploy.

### Проблемы
- Нет.

---

## 2026-08-10 - Event covers: убрать плашки/текст + развести дубли

### Наблюдения
- На popular rails (MSK/SPB/EKB/Kazan) много supplier CDN PNG с baked-in текстом (Комбо HP, «Лето в Москве», CityTour QR, music lotto/bingo, EKB terrace flyer) - дешевят карточки.
- Exact content-dupes: речные маршруты (4/3/2 siblings), вечерний SPB pair, EKB open-mic / «Больно смотреть», matryoshka logo twin, Kazan kaleidoscope stubs ~23-30KB.

### Решения
- GenerateImage ×46 атмосферных JPG без текста/лого → `apps/public|web/public/images/events/generated/evt-cover-*.jpg`.
- `EVENT_PACK_IMAGES` + `resolveEditorialEventImage` (LOCATION_PACK-style): wire web `event-card-image`, public EventCard(s), backend `public-catalog.mapper` (57 event id keys).
- Prod DB `Event.imageUrl` не трогали; editorial overlay на чтении. Commit+push; **без** web deploy.

### Проблемы
- Долг: ещё десятки standup/афишных PNG по MSK/SPB (Fat/PRO variants частично закрыты одной парой кадров); artvibes×3 делят один cover; полный каталог не регенерировали.

---

## 2026-08-10 - City hub «Ближайшие события»: cleanup + compact rail

### Наблюдения
- Блок афиши на city hub: Cards/Table toggle, subtitle «Что купить сейчас», два этажа чипов (даты + категории), шумные category·city / address на карточках.
- Параллельный agent `7d0ca73a` начал тот же cleanup; institution text-grid Variant A не трогали, чтобы не драться.

### Решения
- Убраны toggle и subtitle; один soft-pill ряд категорий (без date chips).
- `EventCard` `cityHub`: venue name only, `line-clamp-2`, tall cover `3/4`, без badge pile; price+CTA `mt-auto`.
- Compact snap carousel (~1.5 / 4-5), scrollbar hidden; `dedupeHubSessions` по groupKey/slug.
- Commit+push; **без** web deploy.

### Проблемы
- Нет.

---

## 2026-08-10 - City hub hero: remove search, restore CTA buttons

### Наблюдения
- Owner screenshot SPB hub: search bar «Найти экскурсию…» + «Подобрать» лишний; текстовые links «Афиша · Подборки событий →» вместо кнопок.

### Решения
- Shared `CityHeroStrip` (`CityPageView`): убран search form; возвращены button CTAs Афиша → `/events?city=` и Подборки событий → `/podborki?city=`; brief/badge/stats/H1 без изменений; postcard night-hero shell снова без forced min-h под search.
- Commit+push + Deploy MSK web (owner iterating live).

### Проблемы
- Нет.

---

## 2026-08-10 - City hub UX: search hero + scenarios merge + collections grid

### Наблюдения
- City hub (`/cities/[slug]`) читался как длинный search-report: postcard brief + weak CTAs, amber «Интересный факт», три фрагмента маршрутов/мест/конструктора, тонкие banner-strips подборок, blog cards с ценами и «Смотреть афишу».

### Решения
- Hero: убран brief и dual CTA; крупный city-aware search (`Подобрать` → `/events?city=&q=`); один тихий link на афишу; mobile jump chips Афиша/Маршруты/Площадки/Блог. Amber about-блок снят.
- «Готовые сценарии дня»: magazine cover carousel (`CityDayPresetBlock` hub mode); click → load в day-route + scroll к `#day-constructor`; places rail скрыт при named presets. «Ближайшие события» не трогали.
- Подборки: 3-4 col tile grid, без city badge на cover, meta под фото. Blog hub cards: cover + title + reading time only.
- Commit+push; **без** web deploy.
- **Superseded (hero search):** 2026-08-10 entry «City hub hero: remove search, restore CTA buttons».

### Проблемы
- Нет.

---

## 2026-08-10 - `/my-day`: thumbs + suburb dead space + must-see dense

### Наблюдения
- После `af70051d`: у многих шагов маршрута пустые thumbs (LS slim дропает `imageUrl`); magazine suburb (Архангельское) давал огромную серую полосу `aspect-[16/10]` без cover; «Главные места» стали клоном cover-карусели «Выбор Дайбилет».

### Решения
- `resolveDayRouteStopImage` + timeline/list thumbs: пересборка cover из editorial slug maps (LOCATION_PACK / must-see), gradient fallback вместо пустого круга.
- Magazine suburb: без cover - без media-панели (badge у title); с cover - photo left/top, `max-h ~14rem`, не full-bleed empty band. Gen новых suburb covers не делали (8/8 MSK suburbs без asset - gap не small).
- «Главные места»: вернули dense grid title+desc+thumb+`+` (`layout=dense`); «Выбор Дайбилет» остаётся large cover carousel.

### Проблемы
- Cover-файлы значимых пригородов Москвы (Архангельское и др.) по-прежнему отсутствуют в editorial map - отдельный asset batch.
- Deploy MSK web - по «выкатывай» (этот месседж - только push).

---

## 2026-08-10 - Homepage visual rhythm (P0-P2)

### Наблюдения
- Owner: city hub / daibilet.ru home без ритма - тяжёлый hero (subtitle + 3 dropdowns + wrap chips), два конфликтующих event-блока подряд («Куда сходить сейчас» tabs + «Популярное сейчас» grid), статичный синий My Day banner, полные grids городов/подборок на first paint.
- Badge pile на rail covers расходился с sitewide clean-cover каноном.

### Решения
- **P0 Hero:** убран marketing description; hint в форме; mobile = city+find (без category dropdown); один soft swipe-ряд (даты mobile + quick chips).
- **P0 Выбор редакции:** showcase rail ~1.5 / 3-3.5 visible; rail covers без multi-color badges; EventCard footer `mt-auto`, radius 16px.
- **P1:** слияние now+popular → одна секция «Популярно на этой неделе» (фото-carousel + date tabs); убита вторая сетка.
- **P1 My Day:** вместо ad-banner - preview конструктора (3 шага с + → `/my-day`).
- **P2:** города и подборки - горизонтальные swipe rails (не endless grids).
- Commit+push; **без** web deploy.

### Проблемы
- Нет.

---

## 2026-08-10 - `/events`: date rail in title band + one soft chip row

### Наблюдения
- Owner empty screenshot: date rail still felt like a separate floor; quick + category looked like two systems under search; system `input[type=date]` рядом с поиском.
- `ad5f3dc0` уже перенёс даты в hero и слил ряды, но визуально не дотягивало до «в полосе заголовка» / одной soft-ленты.

### Решения
- `EventsCatalogHero`: date rail в title band (mobile под subtitle; `md+` в одну линию с H1/subtitle).
- `CatalogToolbar`: один soft scroll (quick+categories) сразу под search в sticky-блоке; убран native date input; FAB/advanced sheet без изменений.
- Soft date chips (`rounded-full`, компактнее).

### Проблемы
- Deploy MSK web - по «выкатывай» (этот месседж - только push).

---

## 2026-08-10 - Venue/location previews: institution gaps closed

### Наблюдения
- Live audit: locations focus gaps **1/719** (Мурманск «Алёша»); institutions without editorial/hub hero **94/1277** (museums/theaters/art_space на `/venues/generated/*` stubs). Bars/concert halls в основном с реальными hub-фото.
- Editorial map на диске был полный для прошлых location packs; institution family почти не покрыта.

### Решения
- GenerateImage ×92 + wire already-on-disk Erarta/Эрмитаж → `apps/public/public/images/venues/{city}/` + `LOCATION_PACK_IMAGES` (+94 slug).
- Prod DB `heroImageUrl` не трогали: карточки берут editorial overlay через `resolveVenueHeroImage`.
- Moscow sharp-stubs ~15–25KB в must-see pack оставлены как quality debt (карта есть, кадр слабый) - не блокер catalog empty.

### Проблемы
- JPG без sharp compress в agent env - тяжёлые файлы; при необходимости отдельный compress-pass.
- ~55 Moscow must-see sharp-stubs (~15–25KB) - quality debt, не empty.
- Deploy: web **31342186797** tip `88708eac` BUILD_ID=`RWJuTMEW-R707-yh7VQwJ`; API restart MSK 23:34Z (pier `2f0b8099`).

---

## 2026-08-10 - `/my-day`: travel product visuals (P0-P2)

### Наблюдения
- Owner: «Мой день в Москве» выглядел как admin/Excel - серые chip walls сценариев, text-only пригород (Архангельское), сетка-забор stop cards, плотный must-see grid vs живой «Выбор Дайбилет».

### Решения
- **P0 suburb magazine:** `DayTripCanonCard` `magazine` + cover (`heroImageUrl` / gradient), lead, max 4 «Что посмотреть», primary «В маршрут» (`AddMany` variant `primary`). `SuburbsCarousel` compact → magazine.
- **P0 stops timeline:** `DayRouteStopsTimeline` (numbered circles + connector + thumb); grid fence → list + timeline; toggle «Шаги / Список».
- **P0 scenarios:** `CityDayPresetBlock` snap-cards (фото/gradient + bold title) вместо gray pills; primary CTA в detail.
- **P1 must-see:** горизонтальная карусель крупных cover-карточек (+ в углу), как hot picks.
- **P2 mobile:** sticky tabs `[Карта и шаги (N)] | [+ Добавить места]`; sticky primary «Посмотреть готовый день» / buy / add.
- Commit+push; **без** web deploy.

### Проблемы
- Нет cover-файла для Архангельского в editorial map - magazine fallback gradient до появления asset.

---

## 2026-08-10 - `/podborki`: один filter-system + clean covers

### Наблюдения
- Owner: сильная идея контента, но страница перегружена тройным слоем фильтров (mood chips + black category tabs + «Быстрые подборки») и «вторым экраном» (`Каталог подборок` + дубль city picker).
- На карточках city badge и цветные pill («N событий» / цена) накрывали фото.

### Решения
- Один filter-system: primary black tabs (`По типу` / `Для кого` / `Сезонное`) + один ряд soft gray tags под активным табом; moods/quick intents сложены в `PODBORKI_CATEGORY_TAGS`.
- Убраны блоки «Быстрые подборки», «Каталог подборок», дубль CityPicker и popular rail; flow: H1 → filters → featured+тренды → grid.
- Tile/featured: на фото только title + «Смотреть»; meta `N событий · от X ₽` под картинкой; featured slug дедупится из grid.
- Deploy не трогаем - commit+push ветки.

### Проблемы
- Нет.


---

## 2026-08-10 - `/venues` quiet catalog redesign

### Наблюдения
- Owner: `/venues` тёмный full-bleed hero + marketing copy, чёрные bordered chips, «Найдено · стр.», цветные pills и крупный «В маршрут» на фото - вне sitewide UX-канона.

### Решения
- Убран dark hero / HeroMedia / copy «Электронные билеты…»; белый `HeroLayout` minimal: breadcrumbs + H1 «Театры и музеи {город}».
- Search + city + sort в одной строке (`#F5F5F7`); категории - один horizontal swipe `catalog-chip` rail без счётчиков на pills.
- Meta junk: вместо «Найдено · стр.» - subtle `pluralVenues(total)` + toggle вид.
- `InstitutionCard`: чистое фото; iconOnly «В маршрут» top-right; meta `ТИП · ГОРОД` над названием (`hideCity` при city filter); blurb `line-clamp-2`; equal-height + `mt-auto` на ряд афиши; Ticket + «Афиша».
- Commit+push; deploy по «выкатывай».

### Проблемы
- Нет.

---

## 2026-08-10 - Sitewide UX recipe (owner canon)

### Наблюдения
- Owner зафиксировал sitewide UX-рецепт для каталогов и карточек (минимализм, mobile-first). Параллельные page polish идут по этому канону.

### Решения
- Канон (LOCKED в `docs/Project.md` → UI standards):
  1. **One filter row on mobile** - категории / даты / теги = один horizontal swipe-rail.
  2. **No system junk** - убрать «Найдено N», «стр. 1 из 10», instructional copy, disabled-дубли кнопок.
  3. **Clean covers** - фото продаёт эмоцию; цена / места / даты / meta под картинкой, не цветные pill на фото.
  4. **One icon pack** - тонкие монохромные line-иконки; без смеси цветных emoji в chrome UI.
- Статус сессии (без выдумок):
  - **Live** (~`964c4567` batch): `/cities` list+toolbar; venue schedule rail + afisha order; scenarios padding.
  - **В ветке / не обязательно live:** `/events` dates in hero (`ad5f3dc0`); restore ширины schedule cards; pier dates investigate/fix; `/locations` polish; `/podborki` polish; `/blog` polish - часть может ещё идти у агентов → **in progress / pending**.
- Tasktracker: `UX.SITEWIDE-MINIMALISM`. Docs-only commit+push; deploy не трогаем.

### Проблемы
- Нет (канон docs); runtime polish страниц - ongoing.

---

## 2026-08-10 - `/blog` magazine polish (toolbar / fresh / afisha)

### Наблюдения
- Owner: технический шум на индексе блога - счётчик «Найдено», тяжёлые selects, toggle вида, синие city pills + ticket CTA в «Свежее», перегруженная afisha-карточка.

### Решения
- Toolbar: убран счётчик; city/author = borderless text + thin chevron; строка фильтров `hidden md:block`; view toggle убран (magazine default).
- Hero: search + soft topic chips (`#F5F5F7`, radius ~20) на всех breakpoints.
- Fresh mini-cards: muted caps `ГОРОД · N МИН`; без commercial ticket line.
- Afisha promo: atmospheric photo + «Гид по лучшим событиям {город}» + один CTA; без списка событий / genre chips / цен.
- Deploy по «выкатывай».

### Проблемы
- Нет.

---

## 2026-08-10 - `/locations` quieter catalog + vertical cards

### Наблюдения
- Owner: city-scoped `/locations` шумный (subtitle, wrap chips, «Найдено · стр.», heavy «В маршрут» на фото, horizontal cards).

### Решения
- Hero: title «Локации в {city}»; subtitle убран; chips = один horizontal scroll (catalog-chip), popular first; search+city одна строка; link «Площадки…» тихий под search.
- Meta: вместо «Найдено / стр. N из M» - subtle `{N} локаций` рядом с sort.
- `LocationCard`: vertical equal-height grid (1/2/3/4); type tag translucent; blurb `line-clamp-2`; «В маршрут» в тексте (compact); `hideCity` при city filter.
- Skeletons / related / landing grids под vertical cards. Deploy по «выкатывай».

### Проблемы
- Нет.

---

## 2026-08-10 - Pier date rail: only today

### Наблюдения
- Owner: `/locations/admiralteiskaya-nab-10-45` date rail показывает только сегодняшнюю дату, хотя у рейсов `sessionCount` 22-240.
- Live API: 4 grouped sessions, у каждой `upcomingSlots.length === 1` (nearest), `hydrateSlots: false` на venue PDP.

### Решения
- `loadVenuePageCatalogSessions`: после venue-scoped slice hydrate `upcomingSlots` через `hydrateCatalogUpcomingSlots(..., VENUE_PAGE_SLOT_LIMIT=96)`.
- Полный catalog soft-load по-прежнему без hydrate (perf); гидратятся только 1-120 сессий площадки.
- Date rail/`availableDates` снова видят все дни с отправлениями; default = nearest day.

### Проблемы
- Deploy по «выкатывай» (нужен API + web, hydrate на backend).

---

## 2026-08-10 - Venue schedule cards: restore width

### Наблюдения
- После nest date-rail в location/institution (`lg:col-span-2`) сетка `sm:grid-cols-2 xl:grid-cols-3` оставляла одну карточку узкой колонкой справа от пустоты.

### Решения
- `VenueEventsGrid`: `grid-cols-1 sm:grid-cols-2` (без xl:3). Table mode не возвращали.

### Проблемы
- Нет.


---

## 2026-08-10 - MSK web deploy (cities/venue/scenarios batch)

### Наблюдения
- Owner: «выкатывай» после cities sort/toolbar, venue schedule rail, venue section order, scenarios padding.
- Previous live tip `a271a78e` BUILD_ID=`Mby7MP2KiGFvNEWzY_qC4`.

### Решения
- Deploy MSK web `31336541746` success; tip `964c4567`; BUILD_ID=`SR08A3UaBJ4IlLsjQcK4n`.
- Live since `a271a78e`: cities one-list+toolbar (`2965a338`), venue date-rail schedule (`28795f43`+`97b27739`), location admission+rail nest (`f71de42c`), scenario outer padding (`8f4a0967`), venue afisha section order.

### Проблемы
- Нет.


---

## 2026-08-10 - `/events`: даты в hero, один ряд чипов

### Наблюдения
- Под поиском было 3 ряда чипов (даты / quick / категории); owner хотел упростить.

### Решения
- Date rail перенесён в `EventsCatalogHero` (под H1/subtitle) на всех breakpoints.
- Под поиском один horizontal row: quick (`Сегодня вечером` / `Бесплатные` / `С детьми`) + категории; mobile date/type selects убраны (без дублей).
- Search row: поиск + Найти + календарь/фильтры (desktop) / FAB фильтры (mobile).

### Проблемы
- Deploy по «выкатывай» (MSK deploy может идти параллельно - не трогаем).

---

## 2026-08-10 - Scenarios panel: outer card padding

### Наблюдения
- После title-flush контент панели сценария («Золотой треугольник» и т.п.) визуально лип к левому/правому краю белой карточки: убрали hanging gutter, но outer inset остался слабым (`px-4`).

### Решения
- `CityDayPresetBlock` `SCENARIO_CARD_PAD`: `px-5 sm:px-6` (+ прежний vertical). Title-flush только для выравнивания номеров остановок с title, не для снятия card padding.

### Проблемы
- Deploy по «выкатывай».

---

## 2026-08-10 - Venue/location: афиша выше discovery

### Наблюдения
- На `/venues` и `/locations` блок `#venue-program` рендерился после всего layout - ниже «Связанные хабы» / «Похожие площадки».

### Решения
- Афиша передаётся `children` в `LocationVenueLayout` / `InstitutionVenueLayout` сразу после primary-контента.
- «Связанные хабы» и «Похожие площадки» остаются внизу основной колонки.

### Проблемы
- Deploy по «выкатывай».

---

## 2026-08-10 - `/cities` sort + toolbar row

### Наблюдения
- «По алфавиту» выглядело сломанным: top-8 + 2 октета рендерились отдельно и вырезались из `CitiesCatalogView` через `excludeSlugs`, поэтому sort трогал только хвост.
- Кнопки «Куда поехать?» / «Популярные» / «По алфавиту» стояли под поиском; owner хотел одну строку (search left, controls right).

### Решения
- Убраны featured slices (hero top-8, second/third octet); один `#cities-all` список сортируется целиком.
- `CitiesHeroSearch`: flex row sm+ - input `flex-1`, controls справа; на узких экранах controls wrap под поиск.

### Проблемы
- Deploy по «выкатывай».

---

## 2026-08-10 - MSK web batch deploy (events+cities+scenarios)

### Наблюдения
- Owner: «выкатывай» - batch после filter sheet / mobile selects / scenarios title-flush / cities clean.

### Решения
- Deploy MSK web `31335835810` success; tip `a271a78e`; BUILD_ID=`Mby7MP2KiGFvNEWzY_qC4`.

### Проблемы
- нет.

---

## 2026-08-10 - Venue «Расписание и билеты»: compact date rail

### Наблюдения
- Owner: над карточками событий на location/venue - технический subtitle, stats «Показано N», category tabs, toggle Таблица/Карточки, шум «Ближайшая дата» + disabled Сегодня/Завтра.

### Решения
- `VenuePageView`: только заголовок + горизонтальный date rail (дни с отправлениями, стили `catalog-date-chip`) + compact calendar; cards-only; table/category/stats removed.
- `venue-program`: filter = `all` | ISO day; `buildVenueDateRailChips` / `availableDates`; при выбранной дате - только группы с слотами на этот день.

### Проблемы
- Deploy по «выкатывай».

---

## 2026-08-10 - Scenarios panel: title-flush, blog+CTA one row

### Наблюдения
- Owner: пустой gutter слева от заголовка (нет цифры сценария); «Читать в блоге» под title; «В маршрут» справа отдельно.

### Решения
- `CityDayPresetBlock`: drop hanging num grid (`title-flush`); stops `1. Name` с левого края title.
- Head row: title + blog link + «В маршрут» в одной wrap-строке; timing ниже.

### Проблемы
- Deploy по «выкатывай».

---

## 2026-08-09 - `/events` mobile: search + date/type selects

### Наблюдения
- Owner: «Найти» отдельно под поиском; chip-рейлы (дата/быстрые/категории) шумят на мобилке - вопрос про дропдауны даты и типа.

### Решения
- Mobile: поиск + «Найти» в одной строке; `Любая дата` / `Все типы` как soft selects; chip-рейлы только md+.
- Evening / day presets в date select; FAB «Фильтры» без изменений.

### Проблемы
- Deploy по «выкатывай».

---

## 2026-08-09 - `/events` mobile chips + filter sheet air

### Наблюдения
- Категории («Все», «Экскурсии»…) пропадали на мобилке: весь toolbar (search+rail+quick+categories) был sticky и выше viewport.
- Advanced filters sheet: двойные date inputs, рамки у чипов, чёрный active, «до 0+», «1-3К».

### Решения
- Sticky только search-ряд; date rail / quick / categories в document flow.
- Sheet: одно поле «Любая дата» → раскрытие range; soft chips `#F5F5F7` без ring; active `primary`; цена RU-лейблы; возраст `0+` без «до»; select с шевроном.
- «Сегодня вечером» вынесено в quick-ленту каталога; блок «Быстрые» убран из sheet.

### Проблемы
- Deploy MSK web - по «выкатывай».

---

## 2026-08-09 - Hub scenarios: two-col + hanging nums

### Наблюдения
- Owner (скрин «Классическая Пермь за 1 день»): список стопов одноколоночный слева, справа пусто; нет согласованных margins / вынесенных цифр.

### Решения
- `CityDayPresetBlock` light panel: тот же gutter/text vertical, что `DayTripCanonCard` (`2rem`/`2.25rem` + centered nums).
- Title / timing / CTA на text-колонке; stops `md:columns-2` при ≥4 пунктах (mobile одна колонка).
- Markers: `data-day-preset-align=gutter-text`, `data-day-preset-stops-layout=two-col|one-col`.

### Проблемы
- Deploy MSK web - batch / по запросу.

---

## 2026-08-09 - `/cities` clean first screen + card tags

### Наблюдения
- Owner: без серого lead; placeholder в поиске; vibe без эмодзи (hover md+); region как chip рядом с hub tags.

### Решения
- Hero: drop description; placeholder Scenario 1; Lucky CTA «Куда поехать?»; sort `?sort=popular|name` для `#cities-all`.
- CityCard: hubTags + region chip; vibe Lucide muted, hidden mobile / opacity on desktop hover.
- `city-vibe-tags`: emoji → Lucide icon keys.

### Проблемы
- Deploy по «выкатывай».

---

## 2026-08-09 - scenarios CTA beside title + batch MSK web deploy

### Наблюдения
- Owner: «В маршрут» сбоку от названия; весь блок панели по центру высоты; выкатить вместе с events UX P1-P4.

### Решения
- `CityDayPresetBlock`: title+CTA one row; content cluster `justify-center` in panel.
- Deploy MSK web tip `feat/next-monorepo` (events Yandex-lite + scenarios).

### Проблемы
- -

---

## 2026-08-09 - `/events` UX P1-P4 (no Quick buy)

### Наблюдения
- Owner: Яндекс-принципы (свайп дат, disclosure, hints, живые сигналы); P5 quick buy рано / грузит сервер.

### Решения
- Date rail: Любая / Сегодня / Завтра / Выходные + 7 дней; mobile без date select.
- Categories: pin топ facets + «Ещё» sheet; quick chips только Бесплатные / С детьми.
- Search focus hints из facets (без extra API).
- Live rail «Сейчас выбирают» / «Популярное сейчас» только из текущего page payload; усилены реальные бейджи.

### Проблемы
- Deploy - по «выкатывай».

---

## 2026-08-09 - `/events` catalog mobile-first redesign

### Наблюдения
- HeroLayout на афише съедал first viewport; нужен denser path к карточкам.
- List DTO без рейтинга - ★ не добавляли.

### Решения
- `EventsCatalogHero`: compact breadcrumbs + H1 + subtitle (без HeroLayout).
- `CatalogToolbar`: легче search bar, pill chips; mobile sticky FAB «Фильтры (N)» → тот же advanced bottom sheet; кнопка в баре с `md+`.
- `EventCard` + `.event-card`: rounded-2xl, border, hover lift (hover:hover), aspect 16/10, glass date, category uppercase, price primary, line-clamp-2; бейджи сохранены.
- Сетка: 1 / sm:2 / lg:3 / xl:4.

### Проблемы
- Deploy MSK web - по запросу «выкатывай».

---

## 2026-08-09 - Perm: editorial seed pack «5 необычных музеев» (all five)

### Наблюдения
- Owner: seed на все пять точек из `perm-neobychnye-muzei`, не 1-2.
- Мотовилиха уже PUBLISHED как `perm-muzey-motovilihinskih-zavodov` - без дубля.

### Решения
- cityInfo (web+public): +4 mustSee museum + upsert desc Мотовилихи; slugs `perm-muzey-retro-garazh`, `perm-muzey-motovilihinskih-zavodov`, `perm-muzey-kukol`, `perm-muzey-istorii-svyazi`, `perm-muzey-istorii-pgniu`.
- Heroes: blog inline → `apps/*/public/images/venues/perm/muzey-*.jpg` + `PERM_IMAGES`.
- Blog: адресные ссылки → `/venues/{slug}` (внешние сайты сохранены где были).
- Prod MSK: `seed-perm-must-see-pack.js --apply` (insert-missing).

### Проблемы
- Hub mustSee chips / editorial map в бандле - после web deploy batch (cityInfo + city-place-images уже в ветке).
- Fuzzy bare «Музей»→Sortavala: фикс `d6437672` уже на MSK + API restart вместе с этим seed.

### Live
- Commit `64b4ddfa`; MSK seed insert **4** / Motovilikha upsert desc; smoke `/venues/{5}` + `/api/public/venues/{5}` + heroes **200**.

---

## 2026-08-09 - venue afisha: bare «Музей» no longer hijacks Perm cards

### Наблюдения
- `/venues/perm-muzey-motovilihinskih-zavodov` и `/venues/perm-muzey-permskikh-drevnostey` показывали экскурсию Сортавалы (venue title в каталоге = «Музей»).
- `lookupVenueCatalogSessions` / `collectVenueSessionLookupContexts`: `nameKey.startsWith(sessionName)` без порога длины.

### Решения
- `venueTextKeysFuzzyMatch`: exact OK; prefix только если shorter ≥ 12 символов.
- Регрессионные тесты на оба Perm slug + bare «Музей».

### Проблемы
- Нужен restart `daibilet-api` на MSK (tsx читает src).

---

## 2026-08-09 - museum twin rematch + STOP «с посещением» + institution nearby

### Наблюдения
- Каноны must-see (`ermitazh`, Русский музей…) показывали 0 афиши: события на TC-twin / `tochka-sbora`.
- Institution PDP не рендерил `nearbyEvents` / STOP - только `sessions`.

### Решения
- Prod MSK: `rematch-museum-twins.js` - on-site (без «посещени*») twin→канон, twin HIDDEN; туровые title не трогаем `Event.venueId`.
- Prod MSK: `seed-museum-stop-links-by-title.js` - STOP для Эрмитаж (291), Исаакий (153), Петропавловка (92).
- Web: Institution PDP блок «В маршрутах» / «Рядом»; карточки показывают `stopEventCount` как «N в маршрутах».
- API lean: `fetchVenueStopEventCounts` + enrich `stopCounts` в `/venues/event-counts`.

### Проблемы
- Live UI/lean counts - после API+web deploy batch; DB STOP уже на MSK.
- Deduped stopEvents на PDP режет до уникальных title (лимит 48) - на карточке нужен raw stop count из lean.

---



### Наблюдения
- Екатерининский дворец (`saint-petersburg-ekaterininskiy-dvorets`) отдавался как `monument`.
- Большой Петергофский дворец: бейдж `park`, hero - портрет пианиста с HIDDEN-концерта Pianissimo; события скрыты, постер остался на Venue.heroImageUrl.
- Причина PARK: в `PARK_RE` голый токен `петергоф` срабатывал раньше `дворец` → ATTRACTION.

### Решения
- Prod: оба kind → `ATTRACTION`; hero → editorial jpg (Екатерининский / petergof.jpg).
- Heuristics: PARK/MONUMENT не перебивают `BUILDING_ATTRACTION_RE` (дворец/собор…).
- `city-place-images`: map для slug Петергофского дворца.
- API restart; web deploy для image map - batch / по запросу (DB hero уже чинит каталог).

### Проблемы
- HIDDEN события (Pianissimo / экскурсии) не возвращаем в каталог - это ожидаемо.

---

## 2026-08-09 - opening hours overlay: 122 published museums

### Наблюдения
- Owner: добить график для **122** нормальных PUBLISHED без часов (139−17).

### Решения
- `venue-opening-hours.ts`: map **137** slug (было 17; +121 из 122).
- Пропуск: `perm-galereya-2517` (юрлицо/источник часов не подтверждён).
- Главный штаб Эрмитажа выровнен с `ermitazh` (вт выходной).
- Источники: офиц. сайты + туристические справочники; на UI остаётся holiday caveat.

### Проблемы
- Сезонные/экскурсионные режимы сжаты в 2-4 строки; актуальность лучше сверять с сайтом площадки.
- Live билеты - после web deploy batch.

---

## 2026-08-09 - publish candidate museums + opening hours overlay

### Наблюдения
- В CANDIDATE `MUSEUM_ART_SPACE` ~70 записей: ~половина мусор/коммерция, ~15-20 нормальные музеи.
- Owner: опубликовать нормальные, затем проставить график.

### Решения
- Prod MSK: **19** venue → `PUBLISHED` + `isIndexable`; missing `canonicalPath` → `/venues/{slug}`.
- Пропуск: дубль Третьяковки (Lavrushinsky), Царицыно/Кусково как «зал/комната».
- Первый batch часов: 17 slug; затем расширено до 137 (см. запись выше).

### Проблемы
- Cyrillic slug хвосты Ticketland остаются; отдельный rename не делали.

---

## 2026-08-09 - bulk fix canonicalPath locations↔venues mismatch

### Наблюдения
- После Яани Кирик: **796** venue с `canonicalPath` не из того семейства (kind institution → `/locations`, или наоборот).
- Из них PUBLISHED **11**, CANDIDATE **728**, NONE **57**.

### Решения
- MSK SQL: для всех non-HIDDEN поменять префикс `/locations`↔`/venues` по `INSTITUTION_VENUE_KINDS` (slug хвост сохранён). Applied **796**.
- CANDIDATE тоже правим: иначе при publish снова мина; код redirect-loop уже защищает, но SEO/canonical остаются кривыми.
- API restart после apply; dry-run повторно → **0**.

### Проблемы
- `resolvePublicVenueKindFromRow` может ещё сдвигать public type vs DB kind - отдельный аудит по DTO при необходимости.

---

## 2026-08-09 - location PDP redirect loop (Yaani Kirik)


### Наблюдения
- Owner: `https://daibilet.ru/locations/cerkov-svyatogo-apostola-ioanna-yaani-kirik-691e1ef…` «лежит сайт».
- API 200; Next отдавал **308** ~86KB `__next_error__`.
- Venue type ошибочно `club_bar_restaurant` → `template=institution`, а stored `canonicalPath` = `/locations/…`.
- `VenueDetailPage` при family mismatch делал `permanentRedirect(canonicalPath)` → петля `/locations`→`/locations`.

### Решения
- Web: cross-family redirect только через `venueHref` (не canonicalPath); `venueCanonicalPath()` отбрасывает чужое семейство.
- API: `resolvePublicVenueCanonicalPath` в `public-venue-read.js`.
- Prod data: kind церкви → `ATTRACTION`, canonicalPath → `/locations/…` без id-хвоста (когда SSH доступен).

### Проблемы
- ISR может держать 308 до revalidate/purge; после web deploy проверить оба URL.

---

## 2026-08-09 - river-cruises: Карелия / Ладожские шхеры


### Наблюдения
- На `/rechnye-progulki/saint-petersburg` два почти одинаковых оффера (~6980₽, 07:00): «Водная прогулка на катерах по Ладожским Шхерам» (пл. Восстания, «Хит») и «Карелия. Ладожским Шхерам».
- Это не городская речная прогулка по СПб, а выезд (автобус от сборного пункта) + катера на Ладоге. В каталоге два разных TC-события, не баг двойного рендера.

### Решения
- `landing-rules` `river-cruises`: `excludeKeywords` карели/ладож/шхер/валаам/кижи/рускеал/сортавал/приозерск (+ regression test).
- Live: scp `landing-rules.ts` + restart `daibilet-api` (web rebuild не нужен; листинг с API/catalog).

### Проблемы
- Дубль двух TC-продуктов на загородных лендингах остаётся отдельной темой (merge/hide), не блокирует правку river-cruises.

---

## 2026-08-09 - Москва deep pack (mustSee 144 + 10 presets + suburbs)

### Наблюдения
- Owner передал «золотой» путеводитель Москвы: топ-локации по категориям (адрес + coords), 10 дневных сценариев и углублённые пригороды (Сергиев Посад, Истра, Коломна, Звенигород) + ещё 4 day-trip.
- Phase C baseline был 58 mustSee / 5 presets - далеко от capital target ~200.

### Решения
- web+public `cityInfo.moscow`: **144** mustSee с фильтрами (вкл. houses/mansions/secret/gastro/creative), **10** `dayRoutePresets` (msk-1…10; blog CTA на msk-1), suburbs с logistics/gastro/nested POI.
- Кремль и Красная площадь разведены (новые slug); дефис `-` в copy; тире ИИ вычищены.
- Docs: Project факт, Tasktracker MS.MSK-GROW200 / MS.TIER5.

### Проблемы
- Новые `locationSlug` без prod seed / `MOSCOW_IMAGES` - на хабе editorial ok, карточки каталога и фото - follow-up по запросу owner.

---

## 2026-08-09 - TC cancelled events («Мероприятие отменено организатором»)

### Наблюдения
- Owner: `/events/tc-…-stendap-na-letnike` открывает виджет TC с модалкой «Мероприятие отменено организатором».
- У TC в gRPC только `PUBLIC` / `STAND_BY`. Полная отмена убирает событие из обоих фидов, а у нас оставался stale PUBLIC + event-level widget URL.

### Решения
- `deactivateMissingTicketscloudEvents`: missing из PUBLIC∪STAND_BY → `Event.sourceStatus=cancelled`, `HIDDEN`, sessions `isActive=false`.
- Full import вызывает deactivation; `npm run tc:reconcile-missing` - оперативный reconcile.
- `resolveTcPurchaseTarget` / `isEventPurchaseBlocked`: не открывать TC, если event/sessions sales-blocked.

### Проблемы
- Нужен прогон `tc:reconcile-missing` на MSK (тяжёлый PUBLIC+STAND_BY fetch), иначе live URL останется до nightly full-sync.

---

## 2026-08-09 - TC STAND_BY reconcile (sales stopped vs visible cards)

### Наблюдения
- Owner: TC виджет «Продажи временно остановлены организатором», а карточка у нас ещё видна.
- Корневая причина: `tc-full-sync` тянул только `status=PUBLIC`. Событие, ушедшее в `STAND_BY` на TC, больше не попадало в fetch → в БД оставался stale `sourceStatus` (PUBLIC/active/open_date).

### Решения
- `fetchNormalizedCatalog`: `statuses[]` - merge PUBLIC + STAND_BY.
- `tc-full-sync` пишет оба статуса в `catalog.public.json`.
- `npm run tc:reconcile-standby` - быстрый upsert только STAND_BY (skipMissing).
- Public filter по `STAND_BY` уже был (`abb583f6`); после reconcile карточки пропадают без открытия TC.

### Проблемы
- Полный PUBLIC+STAND_BY nightly дольше по gRPC; reconcile-standby - оперативный патч без full sync.

---

## 2026-08-09 - Location previews: хвост 217 (не «0»)

### Наблюдения
- Owner: после батча `a4b642d7` (171) на `/locations` всё ещё карточки без фото.
- Live критерий карточки: `toVenueCatalogCard` → `resolveVenueHeroImage(slug, hub)`. Фото есть только если slug в editorial map **или** hub не stub (`/venues/generated/*`).
- Аудит family=location (715): focus monument/outdoor/attraction без resolved hero = **217** (park 72 и gastro 51 уже закрыты; pier/bus/sport — hub/editorial ок). СПб = 56–57.
- На диске у многих gaps уже лежали sharp-stub JPG ~15KB по path `/images/venues/{city}/…`, но **без** записи в `LOCATION_PACK_IMAGES`, а hub в API = generated stub → UI = градиент+иконка (не 404, не city image).
- Предыдущий отчёт «0» считал только свой scoped batch 171, не весь каталог.

### Решения
- GenerateImage ×217 → overwrite stubs в `apps/public/public/images/venues/…`; `LOCATION_PACK_IMAGES` 171→388.
- Commit `fac18e4c` + Deploy MSK web **31309867002** (sync-public-assets в swap). Prod DB `heroImageUrl` не трогали: карточки берут editorial overlay.
- Post-deploy audit: focusGaps **0/615**; sample JPG live 200 ~2.8–4.1MB (не stub ~15KB).

### Проблемы
- ISR `revalidate=300` у `/locations` — после deploy возможен короткий stale window.
- Часть JPG тяжёлые (без sharp в agent env); при необходимости отдельный compress-pass.

---

## 2026-08-09 - Canon panels: bg inset breathing room

### Наблюдения
- Owner (Логистика | Гастро): после выравнивания текста по «Выборг» серый/жёлтый фон «короткий» слева - текст у края панели.

### Решения
- `DayTripCanonCard` desktop: logistics `sm:-ml-4` + `sm:pl-4` (фон влево, текст на title vertical); gastro `sm:pl-4` (тот же inset). Mobile `px-2.5` без изменений.

### Проблемы
- Нет. Live: Deploy MSK web **31308732076** @`73509693` (tip `67aeff5f`) BUILD_ID=`SH7xtIXBki0ZEfrBkwYe3`; смотреть Выборг / Куршская коса.

---

## 2026-08-09 - Perm: Губаха / Усьва one card

### Наблюдения
- Owner: chips «Усьва (день 1)» + «Губаха (день 2)» - снова одна карточка; дни обозначать внутри.

### Решения
- web+public `cityInfo`: одна suburb «Губаха / Усьва» (`perm-gubakha-usva`); `dayLabel` на places; preset `perm-gubakha-usva`.
- `DayTripCanonCard` + `SuburbsCarousel`: рендер заголовков «День 1 - Усьва» / «День 2 - Губаха», нумерация POI внутри дням.
- Остальные Perm suburbs (Хохловка, Кунгур, Православный Урал, Кунгурский экстрим) без изменений.

### Проблемы
- Deploy MSK web **31308285355** @`0f7363b9` BUILD_ID=`rcEaipEqElKkWcTQI1VD2`.

---

## 2026-08-09 - Public: hide closed/suspended sale slots

### Наблюдения
- Owner: в публичной выдаче видны слоты с закрытыми/приостановленными продажами.
- TC `STAND_BY` (= продажи остановлены) не входил в blocklist `sourceStatus`; `isActive=false` / `cancelledAt` не фильтровались на event page и hydrate slots.

### Решения
- Канон в `catalog-availability`: `PUBLIC_SALES_BLOCKED_STATUSES` (+ `stand_by`, `closed`, …), `isPublicSalesStatusBlocked` / `isPublicSessionRowOnSale`.
- `ACTIVE_SESSION_SQL` + catalog saleable SQL / mapper / event DTO / hydrate / grouping / dto.js / listing audit - один список.
- Данные в БД не трогаем; admin/supplier views без изменений.

### Проблемы
- Нужен Deploy MSK API (+ catalog rebuild если кеш), чтобы live совпал.

---

## 2026-08-09 - EventCard: drop «Выбрать сеанс»


### Наблюдения
- Owner: на карточке каталога hover-кнопка «Выбрать сеанс» наезжает на цену «от … ₽» рядом с «Купить билет» - дубль одного действия.

### Решения
- Убрали secondary Link «Выбрать сеанс» из футера `EventCard`; остались цена слева и один CTA «Купить билет».

### Проблемы
- Нет. Live: Deploy MSK web **31308004380** @`95b7d2a8` BUILD_ID=`HR7QZofnxFLxEIb8loJVL`; смотреть футер карточки на `/events`.

---

## 2026-08-09 - Guide day-plan open (not my-day accordion)

### Наблюдения
- Owner (КГД коса): логистика/гастро/«Что посмотреть» с ↓ tips казались спрятанными в accordion «Собери свой день».

### Решения
- `/my-day`: scenarios + suburbs вынесены из accordion в always-open `data-day-guide` секции с DayTripCanonCard.
- Accordion оставили только для сборки маршрута (must-see / своё место / matches).
- Hub city page не дублировали - там guide уже открыт.

### Проблемы
- Deploy MSK web ASAP.

---

## 2026-08-09 - Must-see filter chips: 2-row mobile scroll

### Наблюдения
- Owner (СПб hub): чипы «Главные места / Музеи / …» под «Зачем ехать» wrap на 5+ строк на mobile.

### Решения
- `MustSeeFilterTabs`: mobile `grid-flow-col grid-rows-2` + horizontal scroll; sm+ `flex-wrap`.
- Не трогали scenarios/suburbs chips (отдельные блоки).

### Проблемы
- Deploy вместе с canon gutter / tips / scenarios carousel.

---

## 2026-08-09 - Canon gutter align + tips + scenarios carousel

### Наблюдения
- Owner №3 (Выборг desktop): текст должен сидеть на одной вертикали с «В» заголовка; цифры badge+1.2.3 - в gutter слева, центрированы под кружком.
- Mobile: шире блоки; scenarios chips wrap раздражает - нужна карусель как у пригородов.
- Tips между точками обещаны в my-day после «В маршрут».

### Решения
- `DayTripCanonCard`: CSS grid gutter (`2.25rem`) + text column; nums `justify-center` под badge; panel `sm:pl-0`; mobile meta full-width + tighter padding.
- my-day: `transitTip` между stop-карточками (`data-day-transit-between`), merge сохраняет tip; demo tips Петергоф/бар короче.
- Scenarios chips: mobile `flex-nowrap overflow-x-auto`, sm+ wrap.

### Проблемы
- Deploy MSK web ASAP; смоук Выборг + Петергоф + /my-day.

---

## 2026-08-09 - Bridges/my-day boat times: TZ −3ч + slot dedupe

### Наблюдения
- Owner: развод мостов не бывает в 20:55; на карточке main `20:55`, chips `23:55` (и тройной дубль).
- Live `landing=bridges-night`: `startsAt=…T17:55Z`/`timeLabel=20:55`, slots `…T20:55Z`/`23:55`.

### Решения
- Root cause: в `public-catalog.mapper` `toIsoString(Date)` делал `prismaWallTimeToIso` (−3ч), а jsonb `upcomingSlots` (string) — нет → primary −3ч vs chips.
- Фикс: один `normalizeStartsAt` для Date/string; primary = earliest unique slot; dedupe по MSK HH:mm; hydrate всегда sync primary; boat wizard format+dedupe Europe/Moscow; `startsAtToHHMM`/soft-timing без `getHours()`.

### Проблемы
- Нет. Live: API `a905d477` + catalog rebuild; Deploy MSK web **31306448807** BUILD_ID=`Cw8DFKoqPUl8GZ-NI-yc_`; bridges main `23:55` (was `20:55`).

---

## 2026-08-09 - DayTripCanonCard align + transitTip visible

### Наблюдения
- Owner: Петергоф - logistics/list глубже title; цифры съехали; tips не видно; scenarios numbers.

### Решения
- Canon: `[badge][content][mirror spacer]`; headings flush с title; meta body в padded panel под heading.
- List: `w-6 tabular-nums` слева; tips между пунктами; Петергоф + KGD classic tips заполнены.
- Scenarios light: numbered stops + tips, CTA под списком; day-route хранит `transitTip`, between-card tip в my-day.

### Проблемы
- Deploy MSK web ASAP.

---

## 2026-08-09 - DayTripCanonCard title-column align

### Наблюдения
- Owner «проблемы со вкусом»: Царское — body не по левому краю title; цифры списка не колонкой.

### Решения
- Контент (логистика / sights / CTA) в колонке title справа от badge (`flex gap-3` + `flex-1`).
- Список: `w-5 shrink-0 text-right tabular-nums` + текст справа; transitTip в той же сетке.
- Meta-боксы: симметричный `px-4`.

### Проблемы
- Deploy MSK web ASAP.

---

## 2026-08-09 - scenarios chips = suburbs wrap + SPB dedupe

### Наблюдения
- Owner: «почему нельзя так вывести сценарии для десктопа???» — скрин пригородов: numbered chips `flex-wrap` на всю ширину, selected dark pill.
- Дубли в СПб scenarios: «Петергоф: парк и фонтаны» и «Царское Село / Пушкин» уже в significantSuburbs.

### Решения
- `CityDayPresetBlock`: chips как hub-suburbs — `flex flex-wrap gap-2`, без horizontal scroll / ChevronDown / truncate.
- Удалены presets `spb-petergof` и `spb-tsarskoe-selo` из web+public `cityInfo` (остались только в пригородах).
- DayTripCanonCard уже `w-full` без max-w-2xl (`07f55d7e`).

### Проблемы
- Нужен Deploy MSK web, чтобы live совпал с HEAD.

---

## 2026-08-09 - transitTip + logistics pack (NN / SPB / Perm / KGD)

### Наблюдения
- Owner: между точками suburb/preset нужен короткий совет по перемещению; плюс оптимальные порядки НН, СПБ (треугольник / Петроградка / Бертгольд / барный) и tips к уже переставленным Perm/KGD.

### Решения
- Schema: `transitTip?: string` на `CityMustSeeItem` / `CitySuburbPlace`; UI - серая строка над пунктом в `DayTripCanonCard` («Что посмотреть»); scenarios light panel не трогали.
- NN: Городец / Семёнов / Дивеево / Макарьево - порядок + timingNote + tips; presets `nn-semenov-day` / `nn-makaryev-day`.
- SPB presets: Золотой треугольник, Петроградка (по часовой от Авроры), Бертгольд→Новая Голландия, Барный (без Гражданки/поп-дискотек).
- Perm/KGD: tips на places к логистике гида; UI copy только дефис `-`.

### Проблемы
- Ship: `c5d644d8` · Deploy MSK web **31305337295** · **BUILD_ID=`gOTUGQNTVuIsCS_1DvAT_`**.

---

## 2026-08-09 - KGD suburbs logistics (гид)

### Наблюдения
- Owner: порядок точек в пригородах Калининграда не совпадал с реальной day-trip логистикой (коса «вглубь», Зеленоградск сквозной, Светлогорск спуск/канатка, Балтийск утро/паром, Янтарный авто→пешком).

### Решения
- Данные only (web+public `cityInfo` significantSuburbs + coast presets): новый порядок places, `travelVector`/`timingNote`/`gastroStop` где нужно; `timingNote` на suburb → `logisticsExtra` в SuburbsCarousel (layout DayTripCanonCard не трогали).
- Вилла Порт → Порр; маяк + Пётр I; променад Янтарного в desc парка.

### Проблемы
- Deploy MSK web `31304947725` на SHA `7644445c` - success.

---

## 2026-08-09 - Hotfix: suburb card width + POI row layout

### Наблюдения
- Live (KGD Куршская коса): max-w-2xl белые поля; номера POI «над» текстом с огромными дырами (grid на `li` без list-none).
- Сценарии не должны быть полным DayTripCanonCard.

### Решения
- Canon card: `w-full max-w-none`; POI `ol list-none` + `li flex items-start gap-2` (номер shrink-0 слева).
- Scenarios: лёгкий chips+panel + CTA «В маршрут» как suburb compact (уже в `f7d4c478`).

### Проблемы
- Ship+Deploy MSK web — ниже после GHA.

---

## 2026-08-09 - Perm suburbs logistics (гид)

### Наблюдения
- Owner: невозможные «один день» планы в Perm suburbs - Белая гора+Ермак+Плакун (Сылва без моста, крюк 80-100+ км); Губаха/Усьва+Полюд в один день.
- Хохловка: комфортнее против часовой, финал - сользавод и панорама. Кунгур: сначала центр пешком, пещера авто, пряники на выезде в Пермь.

### Решения
- Данные only (web+public `cityInfo`): переставлены stops Хохловки/Кунгура; `travelVectorBlurb` + suburb/preset `timingNote`.
- «Белая гора» разбита на **Православный Урал** (монастырь-крест-купель-Плакун) и **Кунгурский экстрим** (Ермак, стык с Кунгуром).
- «Губаха / Усьва» разбита на **Усьва (день 1)** + **Губаха (день 2)**; Полюд убран. Presets: `perm-orthodox-ural-day`, `perm-kungur-extrem-day`, `perm-usva-day1`, `perm-gubakha-day2`.
- Layout/UX scenarios vs suburbs не трогали (параллельный агент).

### Проблемы
- Ship: `7644445c` · Deploy MSK web **31304947725** · **BUILD_ID=`mi3IHPRLphsEf9IgHXj9a`**.

---

## 2026-08-09 - Scenarios ≠ suburb canon card; full width

### Наблюдения
- Owner: зря сузили Пригороды/Сценарии (`max-w-2xl mx-auto`); сценариям не нужен полный DayTripCanonCard (логистика/гастро/«Что посмотреть» с desc) — только chips как у пригородов + лёгкий detail; CTA «В маршрут» должна совпадать с пригородами.

### Решения
- `DayTripCanonCard`: убран `mx-auto max-w-2xl` → `w-full` (только suburbs).
- `CityDayPresetBlock`: откат detail к прежнему лёгкому panel (title/timing/description/stops list); chips сохранены; CTA = compact Route+slate как у `AddManyToDayRouteButton`.
- Scenarios больше не импортируют canon card.

### Проблемы
- Ship+Deploy MSK web — см. Tasktracker UX.SCENARIOS-LIGHT / commit после push.

---

## 2026-08-09 - Top cities suburbs: density expand (NN / Perm / KGD)

### Наблюдения
- Owner: «пробегись по НН, Перми, Калининграду по пригородам» - лимит ~5 был шаблоном, как у СПб.
- KGD/Perm: все suburbs ровно 4–5; NN: `significantSuburbs` отсутствовали (только in-city presets).

### Решения
- Правило density (7–9 / 4–6) явно распространено на top cities suburbs в Project/qa.
- KGD: коса/Зеленоградск/Светлогорск 5→7, Янтарный 4→5, Балтийск 5; timingNote на coast presets.
- Perm: Хохловка/Кунгур/Губаха 5→7, Белая гора 5; presets `perm-hohlovka-day` / `perm-kungur-day` + timingNote.
- NN: seed 4 suburbs (Городец 7 / Семёнов 5 / Дивеево 7 / Макарьев 5) + day presets с timingNote.
- Coords: `suburb-nested-coords.json`; web+public twin sync. UI layout redesign не трогали.

### Проблемы
- Ship: `a21bd869` · Deploy MSK web **31302449342** · **BUILD_ID=`2Z1zYZAF8wT1dGb3O9h2i`**; smoke hub: KGD «Лебединое озеро», Perm «Смотровая над заливом», NN «Городец»/«Дивеево».

---

## 2026-08-09 - DayTripCanonCard: сценарии = пригороды

### Наблюдения
- Owner: «ой, может и готовые сценарии в хабе сделать как Пригороды? красиво выглядит».
- Нужен один visual language, не два разных «красивых» стиля.

### Решения
- Общий `DayTripCanonCard` - шапка / logistics|gastro / «Что посмотреть» / CTA, без SVG icons.
- `SuburbsCarousel` + `CityDayPresetBlock` на одном компоненте (chips + выбранная карточка).
- Preset schema: optional `logisticsExit` / `travelVector*` / `gastroStop`; Петергоф+Царское заполнены.

### Проблемы
- Ship: `c5629984` · Deploy MSK web **31302281791** · **BUILD_ID=`6JBH32eZcthpObBsPUpA0`**.

---

## 2026-08-09 - Suburb cards: канон вёрстки (Петергоф-макет)

### Наблюдения
- Owner дал HTML-макет карточки пригорода: шапка (номер+название+вектор), grid Логистика|Гастро, «Что посмотреть» ol, CTA «В маршрут».
- Уточнение: без SVG-пиктограмм в секциях - текстовые заголовки достаточны.
- Compact my-day раньше прятал logistics/gastro - канон нужен и на hub, и на my-day.

### Решения
- Единый panel → вынесен в `DayTripCanonCard` (shared с scenarios).
- Schema: `logisticsExit`, `gastroStop{name,blurb}`; fallback `stationName` / `gastroHint`.
- SPB 11 suburbs: structured meta в web+public; Гатчина - свой blurb (не копия Петергофа).

### Проблемы
- Ship: `c5629984` · Deploy MSK web **31302281791** · **BUILD_ID=`6JBH32eZcthpObBsPUpA0`** (общий пакет с scenarios).

---

## 2026-08-09 - Пенаты: маркер уехал в Финский залив

### Наблюдения
- Owner my-day / пригород: точка «Музей-усадьба И. Е. Репина «Пенаты»» стояла в воде, не у Репино на берегу.
- Старые coords `60.1565, 29.8625` совпали с коттеджным посёлком «Мои Пенаты», не с музеем (Приморское ш., 411).

### Решения
- OSM museum: `60.15586, 29.89661` → `cityInfo` (web+public) + `scripts/data/suburb-nested-coords.json`.
- Соседние курортные pins: Комаровский берег `60.1825, 29.7855`, некрополь `60.20462, 29.79991`, Сестрорецкий Рубеж `60.11295, 29.9712`.
- Это static significantSuburbs nested POI (не Venue/DB) → нужен web deploy.

### Проблемы
- Ship: `40dfb39a` (+ docs `4ef0fd33`) · Deploy MSK web **31301794203** · **BUILD_ID=`Ii06dV4RMXS8xzEZiQuiy`**.

---

## 2026-08-09 - SPB suburbs: nested POI по насыщенности (не жёсткие 5)

### Наблюдения
- Owner: «разве надо ограничиваться пятью точками? может расширим если есть смысл».
- Во всех 11 `significantSuburbs` СПб было ровно 5 nested POI - редакционный шаблон, hard-limit в UI нет.
- У плотных дворцово-парковых ансамблей must-see запас шире пятёрки (Большой дворец / Верхний сад / Марли; парк / Камеронова / Китайская деревня и т.д.).

### Решения
- Правило LOCKED в Project/qa: объём nested = по насыщенности (7–9 плотные, 4–6 компактные), не единые 5.
- Расширение: Петергоф 5→8, Царское 5→8, Кронштадт 5→7, Гатчина 5→6, Павловск 5→7, Ораниенбаум 5→7, Выборг 5→8; Стрельна / Курортный / Шлиссельбург / Сосновый Бор остались 5.
- Пресеты `spb-petergof` / `spb-tsarskoe-selo` → 8 stops; `timingNote` сдвинут на более ранний старт.
- Coords: +16 в `suburb-nested-coords.json`; web + public `cityInfo`.

### Проблемы
- Ship: `088cfe71` · Deploy MSK web **31301708432** · **BUILD_ID=`f1YPffw6I_wxfeh3iRANZ`**; SPB hub 200 + «Большой дворец Петергофа» в HTML.

---

## 2026-08-09 - Day routes: timingNote в head пресета

### Наблюдения
- Гид / owner: отдельные сценарии нужно привязывать ко времени или рекомендовать, когда быть на первой точке - особенно пригороды, иначе не успеть.
- Подробности ок в статье; в продукте - краткое примечание в head маршрута.

### Решения
- LOCKED в `docs/qa.md`: UX-правило day routes / presets + поле `timingNote`.
- `CityDayRoutePreset.timingNote?` в `cityInfo` (web + public); рендер в `CityDayPresetBlock` под title chips panel; пустое → не показывать.
- СПб примеры: `spb-petergof`, `spb-tsarskoe-selo` (осмысленный copy, дефис `-`).
- Boat / purchase / ticket handoff не трогали.

### Проблемы
- Ship: `cde2a697` · Deploy MSK web **31301074864** · **BUILD_ID=`lwjCDA2vbaW1gDR3CzMg2`**; SPB hub HTML содержит «Петергоф: парк».

---

## 2026-08-09 - Event buy-card: убрали open-date how-it-works из блока цен

### Наблюдения
- Owner: зелёная полоска «1 Покупаете / 2 Код на email / 3 Приходите…» в блоке цен — «ужас», убрать целиком (не чинить overlap).
- Нужны категории тарифов + вилка min–max; без how-it-works в price UI.

### Решения
- Удалён `OpenDateStepper` и hero-строка how-it-works из `EventPage.client.tsx`.
- Buy-card: `formatBuyCardPrice` снова показывает вилку `min - max ₽`; список «Категории билетов» из `ticketPrices` / offers; empty state «Цена уточняется» без stepper.
- Источник цен: `payload.ticketPrices` (канон) → иначе `offers.priceRub` → sessions/stats fallback (`getTicketPriceRange` / `buildGroupedTicketCategories`).

### Проблемы
- Ship: `b6648ae7` · Deploy MSK web **31300726933** · **BUILD_ID=`7Epi1rGECNBCNmjEXaPiF`**.

---

### Наблюдения
- Owner после FIX.VENUE-PAGE-HANG: «а в events?»
- `/events` пагинация шла через `CatalogPaginationLinks` **без** `onPageChange` → `<Link ?page=>`.
- App Router soft-nav → `events/(catalog)/loading.tsx` (SiteChromeSkeleton wipe) + remount `CatalogShell`.
- Дополнительно клиент при любом refetch ставил `loading` и подменял сетку skeleton'ом (`loading || …`).

### Решения
- `CatalogShell`: local `listPage` + `popstate` + `history.pushState`; `onPageChange` → buttons (как venues/locations).
- Fetch `/api/public/events` берёт `page` из `listPage` (pushState не обновляет Next `searchParams`).
- Stale-first: skeleton только если `!catalog`; при page switch остаются старые карточки + «Обновляем…».
- Server page slice API уже был (не client-slice всего каталога) — меняли только navigation/UX path.

### Проблемы
- Filter/sort по-прежнему `router.push` (могут задевать loading.tsx) — вне scope пагинации.
- Ship: `22f9c4ab` · Deploy MSK web **31300245196** · **BUILD_ID=`2QPP1b_Ed-1ffhxo3VXFw`**.

---

## 2026-08-09 - Hub night vs catalog daytime city covers

### Наблюдения
- Owner: night→day замена должна была затронуть только `/cities` catalog + главную, не hero хаба `/cities/[slug]`.
- `resolveCityImage` (hub) звал тот же путь, что catalog, и после overwrite night PNG в `cities/{slug}.png` хаб тоже стал дневным.

### Решения
- Восстановили 56 night covers из git (`31fe061a` / `f780ac4c^`) в `apps/public/public/images/cities/night/{slug}.png`.
- `resolveCityCardImage` — daytime (`cities/top/*.jpg`); `resolveCityImage` — night если есть, иначе day fallback.
- Города без исторической ночи (абакан и др. day-only batch) остаются дневными в хабе.

### Проблемы
- Нет.

---

## 2026-08-09 - Hub: сценарии как my-day + афиша rail

### Наблюдения
- Owner: «готовые сценарии в хабе города как в my-day» — **mobile и desktop**.
- Hub `CityDayPresetBlock` без `embedded` рисовал вертикальный card list; my-day — chips + один detail panel.
- «Ближайшие события» — вертикальная сетка до 48 карточек («полотенце»).

### Решения
- `CityDayPresetBlock`: named presets всегда chips+panel (hub и my-day); card-list path убран; skeleton тоже chips.
- Hub афиша (`CityEventsGrid`): `ScrollRail` — mobile swipe, md+ prev/next; `showcaseRail` / poster cards в горизонтальном ряду.
- Day routes / preset availability / boat wizard / purchase modal не трогали.

### Проблемы
- GHA run `31299644782` в UI помечен cancelled (concurrency), но Swap on MSK успел завершиться; live `/cities/moscow` отдаёт `data-day-presets-mode=chips` + `data-city-events-rail`, BUILD_ID=`XmUXa_zhYAnUPDqEPpQYP`.

---

## 2026-08-09 - Owner: «Купить билет» = purchase modal, не wizard modal

### Наблюдения
- Owner обвёл «Купить билет» и сказал: должно открываться в модалке, не на весь экран.
- Имелось в виду: **checkout TicketsCloud / виджет покупки** в overlay.
- Коммит `81d740a6` ошибочно сделал portal-modal из шагов boat wizard (причал/маршрут/время).

### Решения
- Откат wizard UI к inline panel (как до `81d740a6`).
- Новый `DayRoutePurchaseCta`: TC → native `tcwidget.js` modal; иначе `CheckoutModal` iframe.
- Stop CTA / sticky «Купить билеты» / Hot Pick: vendor checkout URL → modal, не `window.open`.

### Проблемы
- Извинение owner: неверно поняли задачу; wizard-as-modal выкатывали зря.

---

## 2026-08-09 - /locations|/venues `?page=` soft-nav hang

### Наблюдения
- Owner: пагинация на `/locations` и `/venues` «висит» при смене страницы.
- HTML TTFB и API `?page=N&counts=0` тёплые (~0.1–0.5s); зависание UX.
- `<Link ?page=>` → App Router soft-nav → `(catalog)/loading.tsx` (SiteChromeSkeleton wipe) + повторный SSR `VenueListPage` (page1 shell) + после remount клиент ждал city-shell **до** slice page N.
- Даже raw `<a onClick=preventDefault>` не спасал: App Router перехватывает same-origin anchors.

### Решения
- `CatalogPaginationLinks`: optional `onPageChange` через **`<button>`** + `history.pushState` (без RSC soft-nav).
- Locations/Venues: local `listPage` + popstate; page>1/typed — сначала API slice (`counts=0`), shell в фоне.
- Stale cards остаются на экране на время fetch.

### Проблемы
- Deep-link `?page=N` по-прежнему SSR page1 + client hydrate slice (приемлемо).

---

## 2026-08-09 - INC.504.26: full-JSON consumers + API hang guard

### Наблюдения
- Owner: «мы же уже чинили API/SSR (504.5c) — что ещё не так?» + гипотеза «любая страница грузит весь JSON».
- Live: API hung ~06:17–06:21 (health/events TTFB timeout); web ISR ещё 200. `memory.swap.max=max`, swap_used → **4014Mi**, API MemoryCurrent у потолка High; restart в 06:21:48 (тот же инцидент, что location PDP 500).
- Disk catalog **16MB**; location PDP warm ~1.55s тянул `getPublicCatalogSessions()` + full scan. List `/venues|/locations` уже lean+`counts=0` — гипотеза для list **нет**, для PDP/city **да**.

### Решения
- Memory Soft-SWR **держит v2 indexes**; `resolveCatalogSessionsByVenueKeys` / `ByDestinationKeys`; venue PDP: SQL hero + index/soft 2.5s; city soft+index.
- Ops: `api-healthcheck.sh` + cron; `MemorySwapMax=512M`. Canon: [catalog-full-json-consumers.md](./catalog-full-json-consumers.md).
- my-day events fetch `limit=100` → `48`.

### Проблемы
- `/api/public/events` всё ещё держит full sessions в памяти для filter (page slice out) — 504.5d Redis deferred.

---

## 2026-08-09 - CRITICAL: location PDP soft-unavailable `connection()` → HTTP 500

### Наблюдения
- Live `/locations/saint-petersburg-bar-hroniki` (и другие location/gastro PDP) → **500**.
- API `daibilet-api`: memory high 1.1G / available ~124K / swap ~3.2G → venue DTO timeout; journal `[venue-dto-cache] unavailable ... timeout`.
- После timeout soft-branch вызывал `await connection()` → digest **`DYNAMIC_SERVER_USAGE`** → HTTP 500 (не soft 200).
- Cover path для bar-hroniki в editorial map есть; root cause не missing image.

### Решения
- Ops: `systemctl restart daibilet-api` → DTO 200 (~6.5s cold); PDP снова 200 пока API жив.
- Code: убрать `connection()` / `noStore()` с soft-unavailable в `VenuePages` + metadata; soft 200 HTML (≤ `revalidate` 300s) вместо 500. Обновить `safe-not-found` комментарий.

### Проблемы
- API swap-pressure может повториться (catalog dual SWR / memory high) - следить отдельно; web больше не должен 500-ить soft branch. Mitigated further in INC.504.26.

---

## 2026-08-09 - Boat wizard: step «Время» в модалке

### Наблюдения
- Owner: шаг «3. ВРЕМЯ» в `DayRouteBoatWizard` (маршрут вроде MORNING CLUB CRUISE, CTA «В маршрут» / «Купить билет») открывался как full-bleed inline panel на всю ширину страницы, а не как overlay.

### Решения
- Все шаги wizard (причал → маршрут → время) переведены в portal-модалку: dimmed backdrop, bottom sheet на mobile / centered `max-w-lg` на sm+, `max-height` + scroll body, Escape/backdrop/«Закрыть».
- CTA «В маршрут» / «Купить билет» без изменений логики; `data-day-boat-*` сохранены.

### Проблемы
- Первый GHA run упал на «SSH tunnel up but MSK API :4000 not healthy»; rerun `--failed` → success, **BUILD_ID=`tBAB7m9Y6YW8i3yukypOC`** (вместе с `c0d61b6d` scenarios gate).

---

## 2026-08-09 - Location + gastro previews: основная масса

### Наблюдения
- Owner: долг по превью открытых локаций (`/locations`: monuments/landmarks/embankments/bridges/parks + gastro); «нехорошо обманывать».
- Аудит live API family=location: focus kinds monument/outdoor/park/attraction = **171** PUBLISHED без уникального cover (stub/city/empty); gastro **51/51** уже в editorial map, но **27** sharp-градиентов (~18–22KB) вместо реальных фото.
- Gastro живёт в family=`location` (kind/`type=gastro`), карточки `/locations` (+ My Day через `resolveVenueHeroImage`), не `/venues` institution.

### Решения
- GenerateImage уникальные дневные/атмосферные JPG → `apps/public/public/images/venues/{city}/` (не трогали `images/cities/*`).
- Закрыто: **171/171** location gaps + **27** gastro stub→AI; `LOCATION_PACK_IMAGES` (171) в `city-place-images.ts`; gastro paths в `GASTRO_PACK_IMAGES` перезаписаны теми же URL.
- Приоритет: СПб → NN/топ-дыры → rest регионов.

### Проблемы
- Hub `heroImageUrl` у gastro по-прежнему может быть `/venues/generated/*`; карточки берут editorial через `resolveVenueHeroImage` / client overlay.

---

## 2026-08-09 - /my-day SPB: сценарии не «доплывают»

### Наблюдения
- Owner: на `/my-day` по СПб сначала ~4 готовых сценария, затем ещё появляются.
- В `CITY_INFO` у СПб **6** named presets; часть (`spb-1…3`, барный) резолвится по `dayRouteId`/slug без каталога (≥3 точки), `spb-4`/`spb-5` (Коломна, Литературный) - почти name-only и ждут matchSources.
- `/my-day` грузит locations/venues progressive (поиск не ждёт Promise.all) → `CityDayPresetBlock` фильтрует `available` на каждом апдейте → chips pop-in.

### Решения
- `venueMatchCatalogReady` в `DayRoutePanel`: ready только после settle locations+venues (events не блокируют).
- `CityDayPresetBlock.catalogPending`: единый skeleton chips+panel до готовности; потом полный отфильтрованный набор сразу.
- Hub (`CityPageView`) без изменений: venues уже SSR, `catalogPending` default false.

### Проблемы
- Live web deploy не делали - проверить после следующего deploy MSK web.

---

## 2026-08-09 - Replace remaining night city covers with daytime

### Наблюдения
- Owner: на /cities всё ещё тёмные карточки (Иркутск…Вологда + Suzdal/Sortavala); legacy root PNG у top-октетов тоже были night.

### Решения
- GenerateImage ×14 для red-V + suzdal/sortavala → cities/top/*.jpg + overwrite PNG; CITY_DAYTIME_PREVIEW_SLUGS.
- Тёмные PNG городов с уже светлым top/*.jpg пересобраны из JPG (без повторной генерации).
- Deploy MSK web + sync-public-assets.

### Проблемы
- Нет.

---

## 2026-08-09 - Daytime city covers for 29 catalog cities

### Наблюдения
- Owner: ошибочно выкатили night batch (18); нужен полный переход на дневные обложки как у top/second/third octet.
- Оставались 11 городов каталога без cover (Сыктывкар…Симферополь).

### Решения
- GenerateImage ×29 sunny daytime landmark JPG; sharp → cities/top/{slug}.jpg (1200×750) + overwrite cities/{slug}.png daytime.
- CITY_DAYTIME_PREVIEW_SLUGS + aliases; resolveCityCardImage предпочитает daytime JPG (не night PNG).
- Commit+push + Deploy MSK web (swap уже зовёт sync-public-assets.mjs).

### Проблемы
- Нет.

---

## 2026-08-09 - Finance contour: Stage 0 live + roadmap

### Наблюдения
- Owner: Stage 0 admission ticket core **по коду закрыт** и уже **live on `.159`** (checkout, return URL, public lookup, `TKT-*`, projections).
- Открыт один runtime-шаг: доплатить sandbox → `CONFIRMED` + `ticketNumbers` + public lookup.
- Ранее в docs «webhook cabinet DONE» расходится с owner wording: webhook на `finance-api…/webhook` ещё нужно зарегистрировать/verify; `pay.` только return/user.

### Решения
- Канон полного `docs/qa.md` на `feat/next-monorepo`: § Открыто п.1–2 обновлены; добавлен § Roadmap финконтура (closeout → webhook → buyer → operator → supplier LK → refunds light → live gates).
- Tasktracker: M1.*/FIN.W1/MIG.9.5 sync под live code + register/verify gate.
- Docs-only commit+push; **без** finance `.159` / MSK web deploy / secrets.

### Проблемы
- Нет. Runtime closeout и cabinet register - owner/ops, не агентский deploy.

---

# Diary

## 2026-08-09 - INC.504.5c: stat-gated disk promote (Codex)

### Наблюдения
- Hot path API перед fresh memory hit всё ещё мог трогать disk promote и парсить ~17MB JSON (v1/v2) - блокировка event loop даже на «быстрых» request.
- Коммит Codex `313a745f` (`codex/inc-504-public-catalog-stat-gate`) был только в owner worktree `D:/coding/tours-feat-next-monorepo`, на origin не запушен - интегрировали эквивалент в `feat/next-monorepo` с reconcile под disk **v2+indexes**.

### Решения
- Memory cache check **до** любого disk promote.
- `loadPublicCatalogDiskCacheWithStat`: при совпадении mtime - `unchanged`, без `readFile`/`JSON.parse` (v1 и v2).
- Promote в `public-catalog.dto.ts` держит `catalogDiskKnownMtimeMs`; в memory кладём sessions, indexes остаются на disk для dto.js hydrate.
- `DAIBILET_CATALOG_REBUILD_MODE=off` без SQL fallback на request (как было).
- MSK: pull + restart `daibilet-api` (web deploy не нужен).

### Проблемы
- Redis INC.504.5d по-прежнему deferred.
- Нужен live smoke latency после restart API.

## 2026-08-09 - QA locks: editorial seed, route linking, finance hosts, CI secrets

### Наблюдения
- Owner утвердил пакет архитектурных ответов в qa: identity/seed, CANDIDATE, nested POI, Location↔Excursion, DNS/webhook/Path A-B, `publicCode` format, CI Deploy MSK web secrets уже в GitHub; Catalog Worker Redis deferred; Buyer refunds Stage 2+.
- Read-only MSK: **Redis отсутствует** (нет redis-cli / units / docker). Catalog disk-worker timer **active**; канон unit уже в `deploy/systemd/` + cron script.

### Решения
- `docs/qa.md`: блоки закрыты LOCKED (2026-08-09 / ранее 2026-07-31 и 2026-08-07 для finance). Buyer LK refunds - out of Stage 0.
- Артефакты в репо (без apply на `.159`): `deploy/nginx/pay.daibilet.ru.split.conf.example`, `docs/checklists/yookassa-e2e-sandbox.md`.
- `publicCode` Path A: маскированный токен example `KSD-8492-NX7`; result `?order={publicCode}`.
- OPS.CI4 ✅; INC.504.5c канон = существующие deploy units; 504.5d Redis deferred (нужен новый isolated, не reuse).
- Proposed alert thresholds P1 20–30m / P3 <50% last-good - until measured.
- E2e sandbox остаётся ⏳ до прогона трёх сценариев.

### Проблемы
- Execution backlog: enforcement seed UX, `cityInfo` radii, LE.10–11, FIN.W1 e2e; Redis install decision перед 504.5d.

---

## 2026-08-09 - INC.504.5c: catalog worker 203/EXEC + catalog stale-first

### Наблюдения
- Owner: «всё ещё долго тянем события, локации и площадки».
- HTML `/locations|/venues|/events` warm TTFB ~0.16-0.20s (снаружи); API localhost warm venues ~1-2ms / events ~50ms.
- Cold `/api/public/venues?limit=24` без family: **6.8s** (совпало с journal adopt 6580ms под swap).
- Catalog Worker: с 21:23 UTC `daibilet-catalog-dto-rebuild.service` **203/EXEC** (script без +x / ExecStart прямой path) → disk mtime застыл на 21:15; `CRITICAL P1: catalog disk staleness`.
- UX: `/locations|/venues` после SelectedCity bootstrap **сбрасывали SSR-карточки в []** и ждали city fetch - ощущение «висит».

### Решения
- systemd: `ExecStart=/bin/bash …/rebuild-public-catalog-dto.sh` (не зависит от +x).
- Web: stale-first в `LocationsCatalogView` / `VenuesCatalogView` - не wipe списка на city-hydrate.
- Live: chmod +x + unit reload + oneshot rebuild; web deploy для stale-first.

### Проблемы
- WEB.LIGHT.B1 (venue hub disk snapshot) ещё открыт - cold hub после API restart всё ещё SQL await.
- Redis INC.504.5d по-прежнему deferred.

---

## 2026-08-09 - my-day TC buy: HTTPForbidden bad token

### Наблюдения
- Owner live: `/my-day` СПб → «Купить билет» на слоте «По рекам и каналам…» отдаёт сырой JSON `{"error":"HTTPForbidden","reason":"bad token","status":null}`.
- URL покупки шёл на TicketsCloud widget с `token=r:…` (JWT с префиксом). Curl: `r:` → 403 bad token; без `r:` → 200 HTML виджета.
- `provider-purchase.ts` / import добавляли `r:` в query; `dto.js` уже снимал. Event PDP часто работал через `normalizeTcPurchaseUrl`, boat wizard открывал raw `purchaseUrl`.

### Решения
- Backend: bare JWT в TC widget URL + sanitize stored offer URLs (`.org`→`.com`, strip `r:`).
- Web my-day: normalize в boat wizard / day-route ticketUrl / catalog fallback open.
- Launch-blocker: commit+push + MSK API restart + Deploy MSK web.

### Проблемы
- Disk catalog cache может ещё держать старые `r:` URL до rebuild - фронт-normalize закрывает UX сразу.

---

## 2026-08-09 - Dvortsovaya nab. 18: merge pier duplicates

### Наблюдения
- На `/locations` два причала по одному адресу: TC `venue_681d44a7…` (88 events, kind ошибочно CONCERT_HALL) и TEP `venue_tep_65` (1 event, shortDescription = «Москва»).
- Скан других явных twins СПб: Университетская 13/17 и Английская - разные дома/типы, не мержили; Воскресенская угол - уже частично в overrides, без массового auto-merge.

### Решения
- Канон `venue_681d44a7fc03029d63123730`: title/address `Дворцовая набережная, 18`, kind `PIER`, `PUBLISHED`, shortDescription с причалом №4 (дефис вместо длинного тире).
- Twin `venue_tep_65`: rematch 1 Event → канон (итого 89), `HIDDEN` + `isIndexable=false`, alias TEPLOHOD/65 → канон.
- `scripts/ensure-spb-dvortsovaya-18-pier-merge.js`; tep-import map place `65` → канон; override в `venue-address-overrides.json`; `KNOWN_PIER_ADDRESS_PATTERNS` + `dvortsovaya-18`.
- Prod MSK apply + API restart; web deploy не нужен.

### Проблемы
- Следующий TEP import без обновлённого `tep-import-fixtures.js` на MSK снова может создать twin - нужен pull ветки на host (или дождаться обычного deploy скриптов).

---

## 2026-08-09 - INC.504.5c polish: async disk promote in API

### Наблюдения
- Sync `readFileSync`+`JSON.parse` 17MB на warm path / health давал риск 150-300мс event-loop stall каждые ~8 мин.

### Решения
- API: `loadPublicCatalogDiskCacheAsync` + `promoteDiskCacheIfNewerAsync` (coalesced); warm path отдаёт memory сразу, promote в фоне; cold await async.
- Atomic swap `catalogCache = {...}`.
- Health staleness: только `stat` mtime, без parse JSON.
- Sync load остаётся для Catalog Worker write-guards.

### Проблемы
- `JSON.parse` всё ещё sync на promote; worker_thread - если p99 всё ещё пикает.

---

### Наблюдения
- Owner: Redis sketch «на потом», но «если за пару дней - скорее за». Redis на MSK не канон; уже есть disk snapshot + child spawn.

### Решения
- Транспорт: **shared disk** (не Redis). systemd `daibilet-catalog-dto-rebuild.timer` каждые 8 мин → `deploy/cron/rebuild-public-catalog-dto.sh`.
- API: `DAIBILET_CATALOG_REBUILD_MODE=off` (не spawn/inline). Soft-SWR только memory+disk.
- Artifact **v2**: sessions + serialized legacy indexes; dto.js hydrate Maps без пересчёта на API.
- Guards: empty/anomaly write block; health rate-limited `CRITICAL P1: catalog disk staleness`.
- Redis/gzip = INC.504.5d deferred.

### Проблемы
- Cold start без файла: oneshot `systemctl start daibilet-catalog-dto-rebuild.service` до трафика.
- **MSK live `7b5c5e5b`:** timer enabled; disk v2 2943 sessions + indexes (~17MB); API `REBUILD_MODE=off`; health 200; venue 200; MemoryCurrent ~576MB; legacy cron.d catalog-dto отключён.

---

## 2026-08-08 - Future: Catalog Worker + Redis (после INC.504.5c)

### Наблюдения
- Owner: «на потом» - вынести тяжёлый SQL/map/indexes из Main API в Catalog Worker; транспорт датасета ~3k sessions с мин. network/CPU на парсинг.

### Решения (не implement сейчас)
- **Транспорт:** Shared Redis (gzip JSON `catalog:sessions` + `catalog:indexes`) - победитель vs S3/disk vs HTTP/gRPC streaming (streaming = overkill для 5-15MB).
- **Схема:** DB → Worker (SQL+blob+indexes) → Redis → Pub/Sub `catalog:updated` / poll → Main API in-memory Soft-SWR → Next.
- **Алерты:** P1 staleness (`catalog:updated_at` > 2×TTL); P2 worker OOM/crash (API деградирует на Redis/stale); P3 пустой/аномальный размер артефакта - блок записи, оставить старый кэш.
- Предпосылка: сначала INC.504.5c (индексы в DTO/disk, выпил второго слоя dto.js), потом отдельный worker+Redis если RSS/CPU всё ещё жмут.

### Проблемы
- Redis на MSK сейчас может отсутствовать / не быть каноном - оценить infra до старта.
- Не смешивать с текущим child-mode disk snapshot без явного owner go.

---

## 2026-08-08 - INC.504.5b: эксплуатация adopt-шва (fallback / event loop / RSS)

### Наблюдения
- Review шва: uncontrolled `legacy inline SQL fallback` под нагрузкой = мгновенный возврат к hang/swap; sync adopt индексов 200-400мс может подморозить event loop; dual in-memory (DTO blob + dto.js indexes) держит RSS высоким.

### Решения
- Fallback: сначала forever-stale sessions; SQL только cold+no-stale, cooldown 45м (`DAIBILET_LEGACY_CATALOG_SQL_COOLDOWN_MS`); лог `CRITICAL P1: ... legacy inline SQL fallback` для алерта.
- Adopt: `setImmediate` между buildDestination/venue/slug/facets.
- План мирного времени: аудит consumers dto.js → индексы в DTO/disk → выпил второго слоя (INC.504.5c).

### Проблемы
- Алерт в Sentry/ELK/Prometheus на строку `legacy inline SQL fallback` - ops, не в коде.
- RSS dual-representation остаётся до INC.504.5c.

---

## 2026-08-08 - INC.504.5: dual catalog Soft-SWR collapsed

### Наблюдения
- После INC.VENUE-SOFT: API hang / Recv-Q / swap ~1.9G связывали с dual Soft-SWR - два независимых rebuild (~2.6k sessions) каждые ~5-6 мин: `dto.js` (`schedulePublicCatalogRebuild` → SQL inline) + `public-catalog.dto.ts` (child/disk).
- Venue/city/catalog DTO уже брали TS path; home/landing/legacy `buildCatalogSessions` и warmup всё ещё гоняли второй SQL rebuild в процессе API.

### Решения
- Канон rebuild: только `public-catalog.dto.ts` (+ `DAIBILET_CATALOG_REBUILD_MODE=child` / disk snapshot / flock cron).
- `dto.js` `publicCatalogSessions`: adopt sessions из `getPublicCatalogSessions` + локальные indexes (slug/facets); shared array reference; SQL `publicCatalogSessionsFast` - только emergency fallback при падении import/DTO.
- Journal: вместо `Public catalog cache rebuilt` → `Public catalog legacy cache adopted from DTO` (мс, не 12-22с).
- API-only: git pull + `systemctl restart daibilet-api` на MSK; web deploy не нужен.
- **MSK live `5c9d8d4e`:** `DAIBILET_CATALOG_REBUILD_MODE=child`; health 200 ~1мс; venue DTO 200 (`stage-standup-club-krasnyi-zal`); journal `legacy cache adopted from DTO (cold): 2938 sessions in 353ms` + `DTO rebuild spawned (force-refresh)` (child); нет второго SQL rebuild в API. Node RSS ~526MB после smoke; systemd MemoryCurrent ~1.25G (после force-refresh child).

### Проблемы
- Steady-state indexes в dto.js остаются (дешёвые); полный F5 удаление legacy catalog path - отдельно.

---

## 2026-08-08 - INC.VENUE-SOFT: все /locations|/venues «Площадка временно недоступна»

### Наблюдения
- Owner: soft screen на всех площадках + «жесткие тормоза»; усталость от рецидивов после 78701d3b.
- API systemd `active`, но `GET :4000/api/health` timeout 5-20с; listen Recv-Q=39; node RSS ~1.1G / swap peak ~1.9G.
- Next `[venue-dto-cache] unavailable ... timeout` → soft 200; Full Route Cache: **43/45** prerender HTML были soft-poison (`x-nextjs-cache` STALE + nginx HIT).
- Prod API venue DTO при живом процессе был OK раньше; slug канон (`nizhniy`, не typo). Catalog SWR в journal каждые ~6 мин по 12-22с (dto.js dual cache, INC.504.5).

### Решения
- Ops: `systemctl restart daibilet-api`; удалить soft prerender `.html/.rsc/.meta`; `revalidateTag(venue-page)` + nginx purge + warm. Live smoke: health/venues/locations/home 200, soft=false, ~50-80мс.
- Ops: `DAIBILET_CATALOG_REBUILD_MODE=child` в MSK `.env` - тяжёлый rebuild не на request event loop API.
- Code: soft-unavailable → `await connection()` (не кэшировать soft HTML); venue DTO timeout 5s→8s (cold race).

### Проблемы
- Dual catalog SWR закрыт в отдельной записи INC.504.5 (тот же день).
- Code soft-cache fix нужен web deploy пачкой; ops уже восстановил live.

---

## 2026-08-08 - /my-day: scenarios mobile + must-see above suburbs + POI desc md+

### Наблюдения
- После `ab4d01f7` «Готовые сценарии» были `hidden lg:block` - на mobile пропали (старый mobile stack после Hot Picks не оставили).
- Порядок: scenarios → suburbs → must-see → custom; owner хочет must-see выше пригородов.
- Compact Петергоф: справа пустое место у numbered POI - на desktop нужны короткие desc как на хабе.

### Решения
- Accordion stack на всех брейкпоинтах: **сценарии → главные места → пригороды → своё место**.
- Embedded scenarios: chips + одна detail-панель (как suburbs accordion).
- Compact suburbs: POI `desc` через `hidden md:inline`; mobile name-only.
- Без live deploy.

### Проблемы
- Нет.

---

### Наблюдения
- Owner: «а ты сгенерировал картинки для следующих 8 городов в этом стиле? что-то не вижу где» - скрин top-8 (белый текст на фото).
- JPG второго октета уже в git с `d842d70c` (`apps/public/public/images/cities/top/{krasnodar,krasnoyarsk,novosibirsk,voronezh,ufa,perm,chelyabinsk,ryazan}.jpg`) и на `origin/feat/next-monorepo`, но live не показывал тот же вид.
- Причины: (1) карточки 9-16 шли с `tone="light"` (белый fog + тёмный текст) - другой chrome vs top-8; (2) GHA swap меняет только `.next`, nginx `/images/` → `apps/web/public/images` (gitignore) без `sync-public-assets` на MSK.

### Решения
- Второй октет: тот же `CityCard` chrome что top-8 (`imageVariant="top"`, default dark scrim / white type).
- Ранжирование: top-8 pins → daytime second-octet set → остальное по popularity.
- Deploy MSK web + `node apps/web/scripts/sync-public-assets.mjs` на MSK; warm `/cities`.

### Проблемы
- Нет (после sync ассетов на MSK).

---

## 2026-08-08 - INC.LOC404: STALE HTML 404 на must-see locations (Владимирский собор)

### Наблюдения
- Live `https://daibilet.ru/locations/saint-petersburg-vladimirskiy-sobor` → HTTP 404; owner launch-blocker.
- Prod API `GET /api/public/venues/saint-petersburg-vladimirskiy-sobor` → 200, `pageStatus=PUBLISHED`, `template=location`, slug канон.
- Origin `/venues/{slug}` был 200, `/locations/{slug}` - отравленный ISR HTML 404 (`x-nextjs-cache` HIT/STALE, SWR ~1y). Тот же класс: Исаакий / Казанский.
- Root class: transient API miss/error в `getCachedPublicVenueDto` превращался в `null` → `safeNotFound()` → Full Route Cache 404; после восстановления API HTML 404 оставался.
- Scan SPB `locationSlug` (177): после purge 175 OK; API-miss только пригороды Гатчина/Павловский дворец (нет Venue row) - не тот класс.

### Решения
- Ops: `revalidate` tags `venue-page` + paths трёх соборов; `rm -rf /var/cache/nginx/daibilet/*` + nginx reload; warm. Live Владимирский / Исаакий / Казанский → 200.
- Code: true miss (`venue_dto_miss`) → null/404; прочие ошибки DTO → rethrow → `unavailable` (soft 200), не HTML 404 poison; cache key v7.
- Canon: `/venues` vs `/locations` - `permanentRedirect` на `canonicalPath` / `venueHref` по template.
- Web deploy (launch-blocker hardening) через GHA Deploy MSK web.

### Проблемы
- Suburb locationSlug без Venue (Гатчина/Павловск) остаются 404 до seed - отдельно.

---

## 2026-08-08 - City multi-collections hidden outside priority allowlist

### Наблюдения
- Owner: «а почему по городам мультиподборки не отдаются? концерты и тп».
- API `/api/public/cities/{slug}` для Краснодара/Уфы/etc. отдавал `concerts-genre`/`standup`, но хаб «Топ-запросы» был пуст по CHPU-ссылкам.
- `normalizeKnownCitySlug` знал только короткий priority allowlist (~15 городов). Остальные destination slug → `null` → `landingMatchesCatalogCity` false → hub/`podborki` резали мультиподборки; `/kontserty/krasnodar` парсился как subcategory, не city.

### Решения
- `normalizeKnownCitySlug`: принимать destination-like slug вне allowlist; reserved path segments (`kontserty`, `events`, `all`, …) отклонять.
- `/podborki` city loading fallback: `landingMatchesCatalogCity` вместо bound-only.
- `LANDING_CITY_SLUGS` / `resolveLandingCityName`: полный список destination cities (иначе `/kontserty/krasnodar` без city SEO).
- Unit: Krasnodar hub + route `/kontserty/krasnodar` + city name map.

### Проблемы
- Нужен web deploy на MSK, чтобы owner увидел на live.

---

## 2026-08-08 - Pier titles: no decorative dash + Sinopskaya 10А

### Наблюдения
- Owner: «Причал — Адмиралтейская наб., 10 / а зачем тире в названиях причалов??»
- Owner: «Причал Синопская наб., 10 поправь на 10А - и всегда после импорта исправляй на 10А!»
- Display rename в `formatPierLocationDisplayName` собирал `Причал — {address}` (em dash).
- Prod: канон `venue_629f8f730fdb465f9b2c54d0` (`prichal-na-sinopskoi-nab-10-…`) title/address с домом **10**; twin TEP `venue_tep_72` (2 события).

### Решения
- Pier display rename как у bus: только shortAddress, без префикса `Причал —` (бейдж уже «Причал»).
- `LocationCard`: strip legacy `Причал —/–/-`.
- Канон Синопская **10А** (кириллическая А): override + `rewriteSinopskayaHouseNumber` в `venue-normalize`; import hooks `scripts/lib/venue-address-overrides.js` в TC/TEP; TEP place `72` → канон; ensure `scripts/ensure-spb-sinopskaya-10a-pier.js`.
- Prod MSK PG applied: canon 10А, twin HIDDEN + rematch 2 events. Web deploy не гоняли (DB already live; dash-fix в API после следующего batch deploy).

### Проблемы
- Нет.

---

## 2026-08-08 - /locations + /venues: infinite scroll → classic pagination

### Наблюдения
- Owner: «может нам от lazy load перейти к пагинации? очень долго грузит страницы».
- `/locations` и `/venues` копилили карточки через cursor + IntersectionObserver (`CatalogInfiniteSentinel`) + «Показать ещё» - DOM и сеть росли без верхней границы.
- `/events` уже на classic `?page=` (`CatalogPaginationLinks`); блог и legacy `apps/public` CatalogPage ещё на load-more.

### Решения
- API `buildPublicVenuesCatalog`: `?page=` (1-based offset); cursor оставлен для совместимости.
- Клиент: page size **24**, URL `?page=N`, сброс page на смене city/type/search/sort; progressive shell + type chips + event-counts enrich сохранены.
- SSR page 1 без изменений (SEO first paint). Live deploy - пачкой / по запросу owner.

### Проблемы
- Нет. Оставшийся lazy: `/blog` cursor feed, city hub IO (не catalog list), legacy public CatalogPage.

---

### Наблюдения
- Owner desktop: scenarios + suburbs должны быть такими же collapsed rows, как «Главные места» / «Добавить своё место».
- Map split уже откатан (`9c800f50`); compact suburbs (`259d4605`).

### Решения
- DayRoutePanel accordion stack (все collapsed by default, exclusive open): сценарии → пригороды → главные места → своё место; затем matches / hot picks / catalog.
- `CityDayPresetBlock embedded` + `SuburbsCarousel hideHeader` без дубля заголовка/карточки.
- Suburbs на my-day: compact truncated.

### Проблемы
- Нет.

---

## 2026-08-08 - /my-day suburbs: restore truncated compact panel

### Наблюдения
- Owner: на мобиле my-day снова большой hub-like блок пригородов («Где выходить», гастро, длинные точки) - нужен усеченный compact.
- `compact` prop уже передавался из DayRoutePanel; раздулся сам `renderCompactPanel`.

### Решения
- Compact снова: title (+ vector inline) + numbered names + bulk CTA; без station/gastro/essay/POI desc.
- Hub (`CityPageView`, без `compact`) без изменений - полный panel.
- Map split уже откатан в `9c800f50`; nearby under-stops остаются removed.

### Проблемы
- Нет.

---

## 2026-08-08 - /my-day: map back under list (no desktop split)

### Наблюдения
- Owner: «карту на my-day верни обратно как было» - отказ от sticky aside split из `18136002`.
- Nearby under-stop chips оставляем убранными.

### Решения
- Desktop снова одноколоночный: карта под списком (`data-day-route-map-desktop`), без `data-day-split` / sticky aside.
- Mobile fullscreen map mode без изменений.
- Under-stop «Поблизости» по-прежнему removed.

### Проблемы
- Без live deploy - проверка локально / preview.

---

## 2026-08-08 - Suburbs panel: vector inline after title

### Наблюдения
- Подзаголовок вектора/вокзала («Юго-Западный и Морской вектор - Балтийский вокзал») сидел отдельной строкой под названием пригорода.

### Решения
- Hub + compact: vector `span` inline после title с `ml-2.5`; body с `mt-3` как у gap gastro → numbered places.

### Проблемы
- Нет.

---

## 2026-08-08 - /my-day: desktop split + no nearby under stops

### Наблюдения
- Owner: под стопами дубль «Поблизости» лишний при наличии карты и «Свободное окно».
- Desktop был одноколоночный (карта под списком после rollback `8f8c69f`); нужен снова Wanderlog-style split ≥lg.
- Mobile fullscreen map mode (`data-day-mobile-map-mode`) оставить.

### Решения
- Desktop ≥lg: `data-day-split` ~45/55, left scroll, sticky `data-day-split-map` справа; container `lg:max-w-[90rem]`.
- Убраны under-stop nearby chips (grid+list); venue/ticket CTA и free window сохранены.
- Accordion «События поблизости» не трогали.
- **Update:** split снова откатан owner-ом в пользу карты под списком; nearby removal остаётся.

### Проблемы
- Без live deploy в этой итерации - проверка локально / preview.

---

## 2026-08-08 - Landing hero CTA «от» + real schedule priceTo

### Наблюдения
- Hero primary CTA на non-NY лендингах показывал min-max (`299-5 500 ₽`) после `9e80bc91` (`priceOnCta='range'`).
- Кнопки строк расписания честно давали одну цену: в `publicCatalogSessionsFast` не было `priceTo` в CTE, hotfix `7c5f2210` оставил `max("priceFrom") as priceTo`.
- UI уже вызывал `formatLandingBuyPrice(from, to)` - данных range не было.

### Решения
- Hero CTA: default/`from` (NY остаётся `range`); stats «диапазон цен» без изменений.
- Bridges hero CTA: снова `formatPriceFrom`.
- dto.js catalog SQL: `sessionPriceToRub` + `offerPriceMaxRub` → normalized `priceTo`; group `max("priceTo")`.
- Landing stats prices: min/max по `priceFrom`+`priceTo`.
- Commit+push, без live deploy (нужен API restart + catalog rebuild на MSK).

### Проблемы
- Live range на кнопках появится только после API pull/restart и пересборки catalog cache.

---
## 2026-08-08 - GASTRO covers + My Day editorial images

### Наблюдения
- 51 PUBLISHED GASTRO на MSK: все со stub /venues/generated/ (СПб 43, KGD 5, Мск 1, Астрахань 1, Ростов 1).
- Outdoor/monument covers уже в city-place-images, но My Day (match hydrate / enrich / share stub) брал raw hub hero без resolveVenueHeroImage.

### Решения
- 15 GenerateImage (топ СПб + ключевые рынки) + 26 sharp pack + 10 уже на диске → map GASTRO_PACK_IMAGES + SPB markets.
- My Day: resolveVenueHeroImage в day-route-from-place, enrichDayRouteFromMatchVenues, DayRoutePanel match/card/share hydrate.
- Commit+push без live deploy (batch).

### Проблемы
- Postgres MCP недоступен; inventory через SSH MSK psql.

## 2026-08-08 - Fontanka 51-53: merge pier duplicates

### Наблюдения
- На `/locations` два причала: `prichal-na-fontanke-53` (TC `venue_60b602…`, хорошее shortDescription) и TEP `venue_tep_53` (shortDescription = список теплоходов «Адель»…).
- Адрес канона был «д. 53»; TEP - «51-53». Оба в каталоге с ~5 saleable; у TC сотни Event.venueId.
- cityInfo blurbs на эти slug не ссылаются.

### Решения
- Канон: `venue_60b602fed94a1fa681b69c1d` / `prichal-na-fontanke-53` → title/address 51-53, editorial description, `PUBLISHED`.
- Twin `venue_tep_53`: rematch 5 `evt_tep_*` → канон, `HIDDEN` + `isIndexable=false`, alias TEPLOHOD/53 → канон.
- `scripts/ensure-spb-fontanka-51-53-pier-merge.js`; tep-import: preserve HIDDEN + map place `53` → канон; override в `venue-address-overrides.json`.

### Проблемы
- Без API restart public cache может ещё отдавать twin; web deploy не нужен (контент в DB).
- Следующий TEP import без обновлённого скрипта снова приклеит события к twin - нужен pull скрипта на MSK.

---
## 2026-08-08 - Почему «пляшут» цифры (owner report)

### Наблюдения
- Home trust strip («Событий») брал `catalogPayload.total` (`/api/public/events`), footer - sum `destination.events` → Δ≈30-40 при одинаковых 98 городах.
- `/venues` «В афише = весь каталог» - уже починено `26047494`; live API отдаёт `venuesWithEvents` (smoke ~1101 / 1245).
- `/locations` eyebrow `710+` - `formatCountFloorTenPlus`; exact в `7c5f2210`, на live Deploy `31260953355`.
- Третий канон: `/api/public/stats.events` (~3031 saleable groups) - не для UI social proof.

### Решения
- Общий хелпер `catalogSocialStats` для home trust strip + SiteFooter (один formula).
- Канон: eyebrow catalog size; «В афише» = venuesWithEvents; locations = exact N; global events/cities = destinations with events>0.

### Проблемы
- Home destinations cache vs layout destinations TTL могут чуть разъехаться по времени - формула одна.
- Deploy web для alignment home/footer ещё не катили (commit+push only).

---
## 2026-08-08 - Follow-up: deploy HEAD, priceTo hotfix, teplohod 404, locations eyebrow

### Наблюдения
- Deploy `31260330696` был на `8ac8a706`; live дотянули до HEAD через `31260471862` / `31260953355`.
- API без рестарта после git pull не отдавал `venuesWithEvents`; после рестарта catalog SQL с `max("priceTo")` упал (колонки нет в CTE) - public stats/catalog cache fail.
- `/locations/teplohod-moskva-99` (public slug) = `Venue` `теплоход-москва-99-...` / id `venue_6a4d0400...`.
- Footer events (sum destinations with events>0) != `/api/public/stats.events` (saleable groups) - разные каноны.

### Решения
- Hotfix: `max("priceFrom") as priceTo` в `publicCatalogSessionsFast` (`7c5f2210`); API pull+restart.
- Locations eyebrow: exact `formatNumber` вместо `formatCountFloorTenPlus`.
- Venue HIDDEN + `isIndexable=false` для teplohod junk slug; API 404, web 404 после swap.
- `venuesWithEvents` снова в institution list stats (1101 / 1245).

### Проблемы
- Настоящий min-max `priceTo` по сессиям ещё не в SQL - сейчас alias от `priceFrom`.
- Sync/import может снова выставить pageStatus не HIDDEN - мониторить teplohod slug.
- Hero «В афише» client-only: в curl SSR строки может не быть, данные `venuesWithEvents` в payload есть.

---
## 2026-08-08 - /venues hero: «В афише» ≠ весь каталог

### Наблюдения
- Hero subtitle «В афише 1 245 площадок · 1 139 событий» врал: `stats.venues` = весь family `institution` (вкл. 0-event content places), а формулировка «В афише» читается как площадки с событиями.
- Eyebrow «1 245 площадок · N городов» для размера каталога корректен; chips типов суммируются в тот же total.
- `stats.events` после `1f510b3e` уже sum distinct products over filtered universe (не page/slots) - на скрине 1 139 выглядит согласованно с event≠slots.

### Решения
- API `stats.venuesWithEvents`: count venues с `events > 0` в filtered universe; `stats.venues` остаётся catalog size.
- Hero: eyebrow = `stats.venues`; «В афише X площадок · Y событий» = `venuesWithEvents` + `events`.
- Type-chip path сохраняет city-scoped afisha stats на hero (не подменяет type-slice).

### Проблемы
- Postgres MCP в сессии недоступен - точный X не сверен SQL; логика по коду. Live deploy batch/по запросу.

---

### Наблюдения
- Owner UX: в ряду действий покупки secondary «Вопрос по заказу»; возврат только по правилам площадки; без self-serve refund.
- Support inbox уже в продукте: `hello@daibilet.ru` (`ContactForm`, empty-state LK).

### Решения
- `BuyerOrderCard`: mailto с `publicCode`/номером заказа, кодами билетов (если есть), событием, email; hint «Возврат по правилам площадки. Ответим в рабочие часы.»
- Список `/account/purchases`: тот же hint у заголовка; Daibilet + widget/TC rows.

### Проблемы
- Нет.

### Future (не Stage 0)
- Owner note: после единого ваучера в ЛК - слоты с частичной отменой / заменой с доплатой; см. qa § Buyer LK / refunds / Stage 2+.

---

## 2026-08-08 - CRITICAL: location/venue PDP `noStore`+`notFound` → HTTP 500

### Наблюдения
- Live `/locations/cerkov-svyatogo-apostola-ioanna-yaani-kirik` → HTTP 500 (репро). API origin `:4000` DTO 200; web journal digest **`DYNAMIC_SERVER_USAGE`**.
- Тот же digest на missing slug (`zzz-missing`) и API-404 площадках (`petropavlovskaya-krepost`, `letniy-sad`) → стабильный **500 вместо 404**.
- Корень (уточнение после деплоя `safeNotFound`): на ISR (`revalidate`) любой `fetch(cache:'no-store')` (uncached retry, admission parallel, или bare no-store внутри `unstable_cache`) + затем `notFound()` → `Page changed from static to dynamic at runtime` / digest **DYNAMIC_SERVER_USAGE** → HTTP 500. Transient API 502/timeout шёл в тот же путь.

### Решения
- `safeNotFound()` без `noStore` для true miss (HTTP 404).
- Venue/city DTO load: только `unstable_cache`; fetch внутри с `revalidateSeconds` (v6-isr-fetch), без bare no-store.
- Venue/city page: DTO → miss/notFound **до** parallel no-store secondary (admission/articles).
- Unavailable → soft page без `noStore`.

### Проблемы
- Deploy MSK после follow-up commit (launch-blocker).

---

## 2026-08-08 - Architecture: lightweight web + robots (WEB.LIGHT)

### Наблюдения
- Owner (после UI/bug batch): длинный хвост при открытии страницы; сайт должен быть легковесным и хорошим для роботов.
- Уже закрытый фундамент: home ISR (`5b15d6a1`), soft-404→HTTP 404, city/venue STALE 404 poison, venue hub SWR (`b7c39325`), progressive venues shell, locations без карты, suburbs без snap-carousel.
- Открытый хвост: cold venue hub rebuild, HTML `/` ~730KB (PERF.WM4), client maps/hydrate, fonts, waterfalls, dual catalog SWR.

### Решения
- Канон-план: `docs/web-lightweight-seo.md` (ranked causes, target SSR/ISR + progressive, payload budgets, NEVER critical path, Phase A/B/C + acceptance).
- Эпик Tasktracker `WEB.LIGHT.*`; не дублировать SWR/shell - наращивать поверх.

### Проблемы
- Runtime ещё не трогали (docs-only). Disk snapshot venue hub и lean home HTML - Phase A/B.

---

---

## 2026-08-08 - /venues loadMore hang «Загружаем...»

### Наблюдения
- Owner: после 24 из ~1250 кнопка «Показать ещё» висит на «Загружаем...» N секунд.
- `d6336346` уже звал shell `counts=0`, но `fetchVenuePageProgressive` / locations loadMore **ждали event-counts до append**.
- Live: cold `/api/public/venues?counts=0` → nginx **504 ~60s**; warm page2 shell ~365ms + event-counts ~257ms.
- Shell hub cold rebuild всё ещё делал `fetchVenueHeroImageFallbacks` по тысячам venue без hero - дорого; SSR/ISR мог отдать page-1 из Next cache без прогрева API.

### Решения
- Client `/venues`+`/locations`: append shell сразу, снять loadingMore, enrich counts в фоне; пустой envelope не сбрасывает cursor (retry после 504).
- Backend shell rebuild: skip hero-fallback SQL; soft-SWR across full/shell keys so page-2 не ждёт cold lean SQL если sibling hub уже есть.
- `withPublicResponseCache`: single-flight per key (анти-stampede на cursor pages).

### Проблемы
- Полный cold miss после API restart всё ещё строит lean hub (без counts/heroes) - быстрее, но не мгновенно; warm/SWR закрывает типичный loadMore path.

---

## 2026-08-08 - /venues: «Показать ещё» + progressive loadMore

### Наблюдения
- Owner: «Найдено: 1 245 · показано 24» / «а остальные как смотреть??»
- Cursor API (`nextCursor`/`hasMore`) уже был; UI держал только невидимый `CatalogInfiniteSentinel`.
- `loadMore` ждал full event-counts на каждой странице → hang/тихий fail.
- Type chips обнуляли `nextCursor` после client-filter первых 24.

### Решения
- Явная кнопка «Показать ещё N» на `/venues` и `/locations` + sentinel как secondary.
- `loadMore` = shell `counts=0` + enrich event≠slots (как progressive first paint).
- Type filter всегда догружает server page с cursor (city-scoped chips/stats сохранены).

### Проблемы
- Нет (ожидаем MSK deploy smoke).

---

## 2026-08-08 - Suburbs UX: hub chips + My Day accordion (no heavy carousel)

### Наблюдения
- Owner скрин «Значимые пригороды» СПб: tall-card snap-carousel тяжело скроллится вбок.
- Причины: `snap-x snap-mandatory` + `scroll-smooth`, высокие плотные карточки (5 POI с desc), arrow gutters / скрытый scrollbar, nested horizontal vs vertical page scroll, ResizeObserver/scroll sync на каждый тик.
- Ask: хаб - горизонтально без «листания»; my-day - горизонтальный аккордеон по тапу на пригород.

### Решения
- `SuburbsCarousel`: хаб = wrap-chips имён + одна detail-панель; my-day (`compact`) = horizontal chip accordion (tap toggle) + одна expanded-панель.
- Убран card-rail (`horizontal-snap-row` / arrows / dots / mandatory snap) из suburbs.
- Docs: Project.md layout note; smoke SPB hub + my-day после MSK deploy.

### Проблемы
- Нет. Live: Deploy MSK `31252106157` **BUILD_ID=`s-owIkAGLosjNneQIvCtt`** (HEAD `18afa783`, includes `54c22b33`); SPB hub 200, `data-city-suburb-chips` + 12 chips + 1 panel, no `data-city-suburb-rail`; my-day 200 (suburbs client-side after city).

---

## 2026-08-08 - Full-site link audit: missing DTO → HTTP 500

### Наблюдения
- Owner: «проверяй все линки»; Samara hub уже 200 (INC.CITY404).
- Crawl ~485 URL: массовые venue/location 500 при нагрузке; slow retry - живые DTO 200.
- **Systemic:** `/api/public/{cities,venues,events}/{missing}` → **200 + `null`**; web `generateMetadata`/`unstable_cache` miss → **page HTTP 500** (не 404). Пример: `/venues/bastion-holl` с хаба Калининграда.
- Footer СПб «Смотровые» → `/progulki-po-krysham/moscow/`.
- Samara article HIDDEN (owner); rostov/novosibirsk future `publishedAt`.

### Решения
- Handlers city/venue/event: miss → **404** `{error:not_found}`.
- Web: cache catch `*_dto_miss` (includes), JSON null as miss, metadata try/catch; footer rooftops → saint-petersburg.
- Report: `docs/link-audit-2026-08-08.md`.

### Проблемы
- Dead hub cards без DTO остаются (после фикса будут 404, не 500) - нужна data cleanup.
- Transient 502 under load - capacity, не slug.
- Live miss 500 digests: `DYNAMIC_SERVER_USAGE` = (1) `noStore()+notFound` на ISR, (2) uncached `fetch cache:no-store` вне `unstable_cache`. Fix: `safeNotFound` + cache-only miss. Smoke: bastion/nocity **404**, samara/moskva **200**.

---

## 2026-08-08 - INC.CITY404.4: revalidate 500 (CI-baked city-routing path)

### Наблюдения
- После Samara hub fix (`afadaa2e`) live `/cities/samara` 200, но `POST /api/internal/revalidate` на MSK → 500.
- journal: `ENOENT .../home/runner/work/.../city-routing.ru.json` - Next CI bake абсолютного `import.meta.url` в бандл; на VPS пути runner нет.
- Цепочка: revalidate → `@daibilet/backend/public-read` → `city-timezone.js` читал JSON без try/catch.

### Решения
- `project-root.js` / `city-routing-config.js`: резолв корня через `DAIBILET_PROJECT_ROOT` → walk `cwd` → fallback `import.meta.url`; безопасный load.
- Подключено в `city-timezone.js`, venue-read, destination, catalog.mapper, dto, public-city.dto.

### Проблемы
- Нет (smoke: revalidate HTTP 200 `ok:true`; `/cities/samara` origin+public 200; BUILD_ID=`_1j1yvH-SEeT_Wp_aEO77`).

---

## 2026-08-08 - /venues progressive: shell cards → event counts

### Наблюдения
- Owner: при смене города сначала отдавать площадки, счётчики событий - следом.
- Distinct product SQL на cold hub всё ещё дорогой; type chips зависят только от `venue.type`.

### Решения
- API `?counts=0`: shell hub без distinct counts/facets; `countsPending` в envelope.
- `GET /api/public/venues/event-counts?ids=` - event≠slots через `fetchVenueDistinctEventCounts`.
- Client `/venues`: city switch paints shell + type chips, затем enrich; pulse на badge.
- Warm full hub переиспользуется для shell (без лишнего pending); после shell cold - background full rebuild.

### Проблемы
- Нет.

---

## 2026-08-08 - Sitewide hang: venues hub cold rebuild + catalog no-store

### Наблюдения
- Owner: «всё висит»; `/locations` total ~9с при TTFB ~0.2с (soft-timeout 4с + unbounded retry).
- Live API cold: `/api/public/venues?family=location&limit=24` **~21с**; destinations cold ~8с; warm после прогрева ~0.18с.
- `/venues`+`/locations` HTML: `Cache-Control: private, no-store` - `noStore()` вызывался **до** успешного retry пустого soft-timeout.
- City hubs Pack C: parallel STALE 404 (см. запись выше) - API 200, nginx/Next держали 404.

### Решения
- Backend: forever soft-SWR + single-flight для `publicVenueHubRows` и `buildPublicVenuesDto` (как catalog INC.504.4).
- Lean SQL: chunk IN(venueId) по 400 для distinct counts / water-bus facets.
- Web: `VenueListPage` - `noStore` только при финальном empty; bounded retry; cache key `v5`.
- City miss cache + deploy revalidate paths (parallel agent) + `/venues` `/locations` в post-deploy tags `public-surfaces`.

### Проблемы
- Cold first miss после API restart всё ещё дорогой (~rebuild hub); SWR спасает последующие запросы. Disk snapshot для venue hub - follow-up.

---

## 2026-08-08 - CRITICAL: city hubs STALE 404 (Samara / Pack C)

### Наблюдения
- Owner: `https://daibilet.ru/cities/samara` → 404. Диагностика: API `/api/public/cities/samara` и origin `:3001` стабильно **200**; seed/slug/cityInfo на месте.
- Публичный nginx держал **STALE 404** (`x-nextjs-cache: STALE`, `stale-while-revalidate` ~1y) после transient miss во время деплоя/API hiccup. Тот же класс бага, что venue DTO miss (`b0d3e290` / `36105314`).
- В пике отравы также мелькали `/cities/moscow`, `/cities/sochi`, `/cities/kaliningrad`. Pack C после purge: ufa/rostov/novosibirsk/sochi/kaliningrad/krasnoyarsk/yaroslavl → **200**.

### Решения
- Hotfix live: `rm -rf /var/cache/nginx/daibilet/*` + nginx reload на MSK; warm hubs.
- Code (как venues): `cached-city-data` v4 не кэширует soft-null; `loadCityDtoOrNull` + uncached retry; `noStore()` перед `notFound()` на `/cities/[slug]`.
- `deploy-prod-next.sh`: post-deploy paths включают Pack C hubs + `skipIndexNow:true` (revalidate route на live 500 из-за baked CI path `city-routing.ru.json` - отдельно).

### Проблемы
- `POST /api/internal/revalidate` на MSK → 500 (`ENOENT .../home/runner/work/.../city-routing.ru.json`). Nginx purge/warm обходит; нужен follow-up на geo path / IndexNow import.

---

## 2026-08-08 - Hide Samara Pack C guide (owner)

### Наблюдения
- Owner: Самара `samara-vykhodnye-dva-dnya-bez-gonki` - «вообще скрывай»; без конкретики, толку нет. Retitle/anglicism polish отменены.

### Решения
- MD: `status: HIDDEN` + `isIndexable: false` (как moscow companions `05ca3238`).
- Hub: `blogSlug` на Самаре не стоял - чистка cityInfo не нужна.
- MSK `blog:upsert --slug=…` + revalidate `/blog` + article path; web deploy не требуется.

### Проблемы
- Нет.

---

## 2026-08-08 - /venues: city=all + type chips + event≠slots

### Наблюдения
- «Все города» на /venues не держалось: bare URL без `?city=` снова получал город из localStorage через `mergeStoredCityIntoSearchParams`.
- Чипы типов (Музеи N…) и «Найдено» могли оставаться глобальными, пока в поиске уже выбран город.
- Счётчики «7 985 событий» на карточках считали строки `Event` / слоты TC, а не логические продукты.
- Афиша на PDP пустела: сессии в каталоге висели на child-slug (`…-hogvarts-holl-…`), карточка - на parent.

### Решения
- Явный sentinel `?city=all` в city-change-nav / Venues+Locations / SelectedCityProvider; storage очищается; inject storage не трогает `city=all`.
- VenuesCatalogView: city-scoped base cache для чипов типов + мгновенный type switch; fetch key только ASCII slug.
- Lean hub: `fetchVenueDistinctEventCounts` (mergeGroupKey || нормализованный title), не raw `_count.events`.
- Venue PDP session lookup: prefix slug + shared title + related hub contexts.
- CITY_SLUG_CANONICAL: `spb` / `peterburg` → `sankt-peterburg` (header filter).

### Проблемы
- Distinct-by-title эвристика; идеал - стабильный product id от поставщика. Child/parent merge по-прежнему title/slug-based.

---


### Наблюдения
- Seed вёл на битые slug: `tretyakovskaya-galereya`, `gosudarstvennyy-ermitazh` (канон: `moscow-tret-yakovskaya-galereya`, `ermitazh`; `erarta` уже 200).
- Ticketscloud №113184626 (KXM-494695) без Скачать/Открыть - только internal source показывал CTA.
- Owner: «Отзыв» в том же ряду, что Скачать/Открыть, и только после старта; на билете - «Вернуться в покупки».
- Owner: в номере билета не должно быть фамилии - internal `DB…`/`TKT-…` без ФИО; external = код партнёра as-is.

### Решения
- Seed + redirects на живые venue slug; cache key venue DTO `v3` (сброс возможного ISR null на `/venues/ermitazh`).
- Rich widget import → свой BuyerTicketCard (партнёрский код в QR); sparse → «Билет отправлен на e-mail …».
- «Отзыв» outline-кнопка в том же action-ряду; только если `startsAt` в прошлом.
- Ticket page: ArrowLeft + «Вернуться в покупки».
- Seed codes: `DB26-784501..03` / `TKT-784501..03` (без BUTIN). Format lock в museum-contract-readiness S0.TKT.1.
- Print: `@page` 14mm + card `padding: 12mm` (не `p-0`), чтобы контент и разделители не липли к краю листа.
- Print brand: сверху карточки строка с `DaibiletLogo` + «Электронный билет» (`print:flex`, на экране скрыта).
- Open-date warning: «Уточняйте график работы в планируемый день посещения» вместо «приходить за 15-20 минут».
- Open-date: часы с editorial overlay по `venueSlug` (`venue-opening-hours.ts`) - в Prisma Venue поля часов ещё нет; unknown slug → fallback copy. При часах: блок «Часы работы» + holiday caveat.

### Проблемы
- Ticket page для TC опирается на localStorage handoff с `/account/purchases`; deep-link без кэша остаётся soft. Полный server lookup ExternalOrder - follow-up.
- Venue.openingHours в schema отсутствует - до CMS/finance поля держим curated slug map (не выдумывать часы для неизвестных площадок).

---

## 2026-08-08 - Restore v.butin@yandex.ru SiteUser password hash

### Наблюдения
- Seed UX.BUY-14 ошибочно прогнал `scripts/seed-buyer-purchases-profile.js --apply --reset-password` на уже существующий личный тестовый `SiteUser` `v.butin@yandex.ru` (создан 2026-07-12).
- Temp password попал только в `/opt/daibilet/secrets/buyer-seed-v-butin.txt`; plaintext старого пароля нигде не бэкапился (ни secrets, ни transcripts, ни docs).
- Postgres archive_mode=off, SQL dumps с SiteUser нет; но `SiteUser` не вакуумился (`n_dead_tup=9`) - старый `passwordHash` остался в heap dead tuples.

### Решения
- Восстановлен **точный** pre-reset scrypt hash из heap (`scrypt:c072082f86c9494fbd5533f058b67cab:…`) в live MSK `SiteUser`. Temp seed login теперь 401.
- Plaintext старого пароля **не** найден (кандидаты из project probes / admin не совпали) - owner входит своим запомненным паролем; если не вспомнит - сказать какой поставить.
- Аудит на MSK: `/opt/daibilet/secrets/buyer-password-restore-v-butin.txt` (не в git). Seed-файл помечен INVALIDATED.
- Guard в `scripts/seed-buyer-purchases-profile.js`: для existing SiteUser `--reset-password` без `--i-understand-destroys-existing-password` отказывается; при force сначала пишет `.before-reset.bak` с old hash.

### Проблемы
- Без plaintext нельзя e2e-подтвердить login от имени агента - только восстановление hash + отказ temp. Нужен smoke от owner.

---

## 2026-08-08 - Supplier taxonomy: open-date vs events (owner lock)

### Наблюдения
- Owner clarification к Stage 0 / Codex museum readiness brief: поставщик - не обязательно музей; типы площадок разные.
- Есть продавцы по открытой цене (в первую очередь музеи и арт-пространства) и продавцы событий - разовых или повторяющихся (regular/irregular) в периоде с категориями билетов и ценой.

### Решения
- Канон в [museum-contract-readiness.md](./museum-contract-readiness.md): **Supplier ≠ museum-only**; два режима - **линейная/открытая дата (`OPEN_DATE`)** = Stage 0; **события/сеансы (`EVENTS`)** = Stage 1.
- Stage 0 формулировка: «первый договор с open-date поставщиком (музей/арт)», не «только музей». Scope Stage 0 не расширять в event scheduling.
- Обновлены Codex copy-paste, Tasktracker `M1.*`, qa (taxonomy LOCKED + вопрос музей vs арт), Project.md one-liner.
- Docs-only: commit+push, без web deploy / runtime.

### Проблемы
- Нет. Открыто только: какой именно первый open-date контрагент (музей vs арт / slug).

---

## 2026-08-07 - Museum-1 readiness: roles matrix + Codex Stage 0 brief

### Наблюдения
- Owner: продумать все логичные функции контура для всех ролей; поставить Codex задачу до первого договора с музеем; затем Stage 1 (поставщик с расписанием) и Stage 2 (полный ЛК: клиенты/заказы/финотчётность).
- Catalog Path A buyer UX (thin checkout, ticket page, purchases list, demo) уже закрыт Cursor; finance create-payment sandbox (FIN.LC3) OK; webhook e2e / reconcile / issuance order≠ticket / public order DTO / supportPhone / SMTP - ещё gaps.
- Wide CTA и Path B calc для музея запрещены product lock.

### Решения
- Новый канон: [museum-contract-readiness.md](./museum-contract-readiness.md) - матрица ролей, Stage 0 DONE/TODO/TEST, e2e T1-T8, Stage 1/2 outlines, out-of-scope, copy-paste «Задача для Codex».
- Tasktracker epic `M1.*` (критический) указывает Codex на этот doc.
- qa.md: блок Museum-1 owner questions (fiscal, ticket format, scanner day-1, SMTP host, support phone, first venue, refunds).
- Docs-only: commit+push, без MSK web deploy.

### Проблемы
- Launch-blockers для договора остаются на Codex/`.159`: admission create-payment public path, return_url catalog, webhook e2e, reconcile, ticket issuance, order DTO, supplier LC Path A.

---

## 2026-08-08 - Buyer purchases seed for v.butin@yandex.ru

### Наблюдения
- Owner не видел список билетов в «Мои покупки». На MSK catalog уже есть `SiteUser` v.butin@yandex.ru и 1 widget ExternalOrder (TC open mic) - без кнопок Скачать/Открыть.
- Finance public purchases-by-email ещё soft/empty (UX.BUY-6). Internal compact list берётся из `/checkout/actions/internal-purchases`.

### Решения
- Catalog fixture `apps/web/src/lib/buyer-purchases-seed.ts`: 3 музейных STUB заказа `DB26-784501..03` (Третьяковка / Эрмитаж / Эрарта) для email `v.butin@yandex.ru`.
- Fan-in в `internal-purchases` + lookup в `checkout/actions/order` (билет `/checkout/ticket/{code}`).
- Script `scripts/seed-buyer-purchases-profile.js` - ensure SiteUser; `--reset-password` пишет temp creds только в server file (не в git/chat).
- Нужен web deploy (fixture в apps/web). Finance `.159` не трогали.
- Ship: `90ac5cc7` · Deploy **31247448301** · MSK **BUILD_ID=`FSLIUs463XJKQZkOL_njJ`** · `internal-purchases` source=`catalog-seed` total=3 · ticket pages HTTP 200.
- SiteUser уже был; temp password сброшен в `/opt/daibilet/secrets/buyer-seed-v-butin.txt` (не в git/chat).
- **Инцидент:** сброс пароля существующего личного профиля недопустим. См. запись «Restore v.butin…» выше - hash восстановлен из heap; seed script ужесточён.

### Проблемы
- Пока нет m2m purchases-by-email, seed живёт в catalog web; после UX.BUY-6 можно сузить/убрать.

---

## 2026-08-07 - Account purchases: compact list + download

### Наблюдения
- Owner: `/account/purchases` - билеты удобным списком, не в полный рост; скачать прямо там.
- Full ticket+map остаётся на `/checkout/ticket/{code}`; PDF API в каталоге нет - только print CSS + `window.print`.

### Решения
- `BuyerOrderCard` → компактные строки (статус, название, дата/сумма, действия); без полной `BuyerTicketCard` в списке.
- Primary: «Скачать» → `openBuyerTicketDownload` → `/checkout/ticket/{code}?print=1` (новая вкладка, auto `window.print` / Save as PDF).
- Secondary: «Открыть» → страница билета с картой.
- Кнопка на карточке билета: «Скачать / распечатать».
- Ship: `60a783b4` · MSK **BUILD_ID=`lr_2kHu4E71Ae91U5LXfw`** · `/account/purchases` + demo ticket HTTP 200.

### Проблемы
- Настоящий server-side PDF ещё нет; UX опирается на print dialog браузера.

---

## 2026-08-07 - Buyer ticket map: uniform page scroll

### Наблюдения
- Owner: карта справа ок, но «прокрутка действует не одинаково» - левая колонка ехала со страницей, правая sticky + max-h и жесты Leaflet перехватывали скролл.

### Решения
- Убран `lg:sticky` / `max-h` у map panel - обе колонки скроллятся вместе со страницей.
- `OsmMapEmbed` `pageScrollFriendly`: wheel zoom off; drag/touch unlock после клика; `touch-action: pan-y` пока locked.
- Ship: `c1d40e2f` · live tip `60a783b4` · **BUILD_ID=`lr_2kHu4E71Ae91U5LXfw`** · demo HTTP 200.

### Проблемы
- Нет.

---

## 2026-08-07 - Buyer ticket page: venue map block

### Наблюдения
- Owner: на странице билета справа равнозначный блок с картой и пином площадки (не внутри печатной карточки).

### Решения
- Page layout `lg:grid-cols-2`: билет | OSM Leaflet map (`OsmMapEmbed` / `BuyerTicketVenueMapPanel`).
- Mobile: карта ниже билета (QR остаётся в первом viewport). Print: map `print:hidden`.
- DTO: `venueLatitude`/`venueLongitude`; demo Третьяковка 55.7415/37.6201; soft-enrich из `/api/public/venues/{slug}`.
- Ship: `9088eb80` · MSK **BUILD_ID=`kmmoWrUnfs9ap8QBd4z75`** · demo HTTP 200.

### Проблемы
- Без coords в DTO/catalog map-блок не показывается.

---

## 2026-08-07 - Buyer ticket: 500px adaptive + print actions hide

### Наблюдения
- Owner: desktop/tablet = 2 колонки (текст слева, QR справа); phone <500px = QR сверху под номером; печать - без синей/серой кнопок действий.

### Решения
- Breakpoint `min-[500px]` / mockup `max-width: 500px`: QR `order-1` на phone, 2-col с 500px+.
- Print CSS: `[data-buyer-ticket-actions]` + `.print:hidden` hidden; ticket full width; print всегда 2-col.
- Detail rows stack on phone, side-by-side from 500px.
- Ship: `88fba3bf` + `f060277d` · MSK **BUILD_ID=`W4QpN2EaaFUk32IZsAwFi`** · demo HTTP 200.

### Проблемы
- Нет.

---

## 2026-08-07 - Buyer ticket card: owner mockup hierarchy

### Наблюдения
- Owner прислал polished HTML mockup: QR в фокусе (на mobile сверху), дата самым видным, крупный контраст, чистая карточка под смартфон и A4.
- Предыдущий layout: ticket number в сером блоке, QR справа снизу на десктопе, дата в dl-строках - не соответствовал иерархии mockup.

### Решения
- `BuyerTicketCard` пересобран под mockup: header (тип + № билета) → main (дата primary / событие / площадка / адрес + QR, `order-first` на mobile) → details (посетитель, состав × qty, итого, код заказа secondary, покупка, support если есть) → warning (15-20 мин + не светить QR) → Print + Copy code.
- Helpers: `formatBuyerTicketWhen`, `formatTicketLineItemsCompact`.
- Demo `/checkout/ticket/demo` без изменений API - та же fixture.
- Ship: `85c8dfd4` · MSK **BUILD_ID=`ct1lgVvvXSEKIIe1GmofQ`** · demo HTTP 200.

### Проблемы
- Реальные заказы по-прежнему sparse без полного finance DTO.

---

## 2026-08-07 - Early publish Pack C: Самара

### Наблюдения
- Owner: выбрать ONE город из списка (Самара/Уфа/Ростов/Нск/Сочи/КГД/Красноярск/Ярославль) и опубликовать сейчас.
- Все 8 MD уже готовы (cover+2 inline на диске, status PUBLISHED), но live 404 из-за будущего `publishedAt` (Pack C календарь с 14–24 авг).
- Самара = A11, первый слот регионального пакета, самый ранний в календаре; ассеты уже 200 на CDN.

### Решения
- `publishedAt` → `2026-08-07T19:40:00+03:00`; date «7 авг 2026».
- Commit `836a75f8` + push; MSK pull; `blog:upsert --slug=… --force-published-at`.
- Revalidate tags `blog-page`/`articles` + paths `/blog`, article, `/cities/samara`.
- Web: concurrent `deploy-prod-next` (ticket redesign) поднял **BUILD_ID=`ct1lgVvvXSEKIIe1GmofQ`** с нашим коммитом в истории.
- Smoke live: article/listing/hub 200; cover+inline в HTML.
- msk-2…5 companions не трогали.

### Проблемы
- Отдельный собственный rebuild не стартовали: на MSK уже шёл deploy-lock; дождались чужого build и сделали upsert+revalidate.

---

## 2026-08-07 - Buyer ticket demo preview (`/checkout/ticket/demo`)

### Наблюдения
- Owner: на реальных заказах карточка часто sparse - нужен визуальный эталон полного билета со всеми полями.
- Finance seed на `.159` не обязателен и рискованнее; catalog demo достаточно для QA.

### Решения
- Статический route `/checkout/ticket/demo` (приоритетнее `[publicCode]`) + fixture `buildDemoBuyerTicketOrder()`.
- Разные `ticketNumber` и `publicCode`; категории Взрослый/Льготный/Детский; notices; demo support phone; QR без finance.
- Без seed CheckoutOrder на finance.
- Ship: `938c0b9c` · Deploy **31194500195** · **BUILD_ID=`AxY25gz4cpfuKxB9sf-yd`** · URL https://daibilet.ru/checkout/ticket/demo

### Проблемы
- Реальные заказы останутся sparse, пока finance lookup DTO / Path A не отдаёт полный набор полей.

---

## 2026-08-07 - Buyer ticket card: full visit fields

### Наблюдения
- Owner: на `/checkout/ticket/{code}` нужны дата/время (или срок open-date), событие, площадка, адрес, плательщик, категории+qty, сумма, дата покупки, 2 notice, телефон поддержки.
- Finance STUB create уже отдаёт `buyer.name`, `subject.venueTitle`, `item.ticketTitle/quantity`, `paidAt/totals`; product detail - `validTo` / `OPEN_DATE`. Address - catalog venue; support phone в public supplier/product **нет**.

### Решения
- Расширен `BuyerInternalOrderRecord` + finance map + localStorage normalize/merge.
- Admission BFF обогащает заказ: product `validTo`/venue + catalog address; form принимает имя/фамилию (optional).
- UI soft-fail (секция только при данных); open-date → «Действует до»; notices всегда; support phone скрыт если нет.
- Gaps для Codex finance: address/validUntil/supportPhone/multi-items в public order lookup DTO.
- Ship: `94d932f6` · Deploy **31193227838** · **BUILD_ID=`fbv4D-L-6qEj1yHNUgMhj`**.

### Проблемы
- Без cache + без стабильного order-by-code lookup карточка остаётся sparse (UX.BUY-6).
- Multi-category qty на Path A thin form пока 1 offer×qty; полный basket = Path B later.

---

## 2026-08-07 - Ticket page: order code ≠ ticket number

### Наблюдения
- Owner: на `/checkout/ticket/{code}` код показывался трижды (hero / title «Заказ N» / «Код заказа»).
- Уточнение: музеям нужен **отдельный номер билета** vs код заказа; сейчас в модели только `CheckoutOrder.publicCode`.

### Решения
- Hero «Ваш билет» без повтора номера; title не дублирует `Заказ {code}`.
- Карточка: крупный **«Код заказа»** = `publicCode`; **«Номер билета»** отдельно (пока тот же код + подпись про сканер музея); optional `ticketNumber` в типе на будущее.
- QR caption: «ссылка на страницу билета» (не пропуск музея).
- qa.md LOCKED draft: order ≠ ticket; issuance A/B later.
- Ship: `9cd66ed2` · Deploy **31190783370** · **BUILD_ID=`vH1YOLuir-6HoFg7VQAgQ`**.

### Проблемы
- Реальный museum ticket id / scanner issuance ещё нет - UI честно показывает временное совпадение.

## 2026-08-07 - Must-see hub targets LOCKED (~200 / ~50)

### Наблюдения
- Owner product lock: capitals hub (MSK+SPB) ~**200** must-see/places; other cities ~**50** start (не capitals-wide).
- Approx now: SPB ~184 (near), Moscow ~58 (needs grow), top-8 still on old floor/large (~12-18 mindset).

### Решения
- Docs канон обновлён: снят ориентир capitals 30-50+ и large tourist 12-18.
- **CANDIDATE / sync Venue ≠ hub count** - хаб только curated mustSee (+ suburbs и т.п.).
- Tasktracker: MS.TIER1/2 lock, PH2.CITY2 grow, PH2.CITY3 top-8~50, MS.MSK-GROW200 (gap ~142).

### Проблемы
- Москва: content gap ~142 curated точек до ~200.
- Top-8: нужна смена цели с 12-18 на ~50 без раздувания до capitals-wide.

---

## 2026-08-07 - Buyer checkout: два пути (LOCKED)

### Наблюдения
- Owner: simple museum / direct ticket ≠ complex calc UI.
- Catalog thin entry + result + account на redirect-пути; FIN.LC3 sandbox confirmationUrl OK.
- Public `/api/checkout/yookassa` пока event-only (admission validation); soft-fallback STUB до Codex.

### Решения
- **LOCKED 2026-08-07 — два пути:**
  1. **Path A (NOW):** simple museum / direct ticket → thin email → create-payment → redirect YooKassa `confirmationUrl`. Без complex checkout.
  2. **Path B (FUTURE, OK):** complex calc UI когда нужен внутренний сложный pricing; **не** для simple museum CTA.
- Docs: qa.md §4c, Tasktracker UX.BUY-8, catalog-finance-projection Path A/B.

### Проблемы
- Webhook e2e PENDING→SUCCEEDED ещё open (FIN.W1).
- Wide catalog CTA по-прежнему out.
- Public admission→YooKassa ещё Codex (UX.BUY-5).

---

## 2026-08-07 - Webmaster «Долгий ответ сервера» (TTFB / home ISR)

### Наблюдения
- Yandex Webmaster: среднее время ответа страниц >3с.
- Live warm TTFB (curl `time_starttransfer`, 2026-08-07): `/` ~0.20с, `/events` ~0.17с, `/cities/moscow` ~0.15с, `/cities/sankt-peterburg` ~0.21с, `/my-day` ~0.17с, `/venues` ~0.17с, `/blog` ~0.20с, blog slug ~0.20с. **Но** `/` total ~1.8-3.1с (HTML ~730KB), `Cache-Control: private, no-store`, nginx `X-Cache-Status: MISS`.
- Хабы `/events` `/cities/*` `/my-day` `/blog` - `s-maxage` + `x-nextjs-cache: HIT/STALE`, nginx HIT.
- MSK: web+API active, load ~0.75/4c, mem OK (~2.5/7.8Gi), next RSS ~0.9G, NRestarts=0. API `/api/health` ~2ms.
- SSR health log: ложные SIGKILL при `TTFB=0.02-0.25` + `curl=28` (body timeout `--max-time 5` на тяжёлом `/`) → cold-start storms; journal: частые `home-venues` TimeoutError (venues fetch на home **не использовался** UI).
- Soft-404 агент параллельно (loading.tsx) - не пересекались по nginx; blog `[slug]` ISR - наш слой поверх.

### Решения
- Home: убрать raw `fetchPublicApiJson` articles (`cache:no-store`) из RSC → `getHomeArticles` + `unstable_cache`; выкинуть мёртвые home venues/stats из `getHomePageData`.
- Blog `[slug]`: `getCachedBlogArticle` / `getCachedBlogRelated` (тот же no-store → dynamic баг).
- `ssr-healthcheck.sh`: `--max-time` 12с; SKIP recover если curl=28 при OK TTFB≤5с (не accept-loop hang).
- Deploy: `5b15d6a1` GHA **31179359213** **BUILD_ID=`h-wuzCSpK1J_r3Ox9MklZ`**. Post-smoke `/`: `s-maxage=300` + Next HIT + nginx HIT, TTFB ~0.16с, total ~0.33с (было ~2-3с). Healthcheck script installed on MSK.

### Проблемы
- HTML `/` ~730KB остаётся тяжёлым (owner/host follow-up: lean home DTO / gzip already; VM upgrade не срочен при load <1).
- Prisma hero banners всё ещё в web-процессе (INC.504.15); warm-hub cron OFF.
- API venues?limit=200 иногда ~5с под нагрузкой - отдельный backend perf, не блокер после снятия с home SSR.

---

## 2026-08-07 - SEO soft-404 → HTTP 404 (Yandex Webmaster)

### Наблюдения
- Yandex: daibilet.ru отдаёт soft-404 (HTTP 200 + UI «не найдена») на несуществующие URL.
- Live probe до фикса (все **200**, `NEXT_HTTP_ERROR_FALLBACK`, noindex): `/this-page-does-not-exist-xyz123`, `/events/no-such-slug-zzz`, `/venues/no-such`, `/cities/no-such`, `/blog/no-such`, `/locations/no-such`, `/foo/bar`.
- Корень: `notFound()` вызывался корректно, но `app/loading.tsx` + segment `loading.tsx` (в т.ч. parent над `[slug]`) включали streaming → статус блокировался на 200.
- Prod nginx: Next proxy (не SPA `try_files → index.html`). Staging example всё ещё SPA fallback - не live apex.

### Решения
- Удалён root `app/loading.tsx` и detail `loading.tsx` у routes с `notFound()`.
- Catalog skeletons перенесены в `(catalog)/loading.tsx` (URL не меняется) - soft-nav на листингах сохранён, detail/catch-all без streaming до `notFound()`.
- `generateMetadata` / landing metadata тоже зовут `notFound()` при отсутствии сущности.
- Регрессия: `seo-http-404-loading.test.ts` (запрет loading на notFound-сегментах).

### Проблемы
- После первого swap nginx `proxy_cache` ещё держал soft-404 как 200 HIT/STALE на части URL; origin уже 404 (`?soft404fix=1`).
- В `swap-web-next-artifact.sh` добавлен `rm -rf /var/cache/nginx/daibilet/*` (как в full deploy-prod-next).
- Live after purge redeploy: все probe URL → **HTTP 404**, valid `/` `/events` `/cities/moscow` → 200. BUILD_ID=`9tTC33CUihsVjB1M_cDp9` HEAD=`61bb52dd`.
- Soft-nav на detail PDP без segment loading - только NavigationProgress; catalog loading остаётся.

---

## 2026-08-07 - Buyer ticket fulfillment UX closed without Codex

### Наблюдения
- Owner: закрыть buyer ticket fulfillment (как выглядит билет, куда уходит, ЛК) на Cursor/catalog, не ждать Codex на `.159`.
- YooKassa sandbox pay уже даёт CONFIRMED (пример publicCode 4476287); Path A thin checkout на catalog есть.
- На MSK `/opt/daibilet/.env` **нет** `SMTP_*` - письмо покупателю сейчас skip.
- Finance order-by-code / purchases-by-email public API по-прежнему soft/empty - account опирается на localStorage + soft fan-in.

### Решения
- URL canon ticket:
  - thank-you `/checkout/result?order={publicCode}` (карточка билета + print/QR/copy)
  - dedicated `/checkout/ticket/{publicCode}`
  - account `/account/purchases` → кнопка «Открыть билет»
- BFF: `POST /checkout/actions/notify-ticket` (SMTP graceful); admission возвращает `ticketUrl`, `catalogReturnWithOrder`, `emailSent`.
- Return wiring: catalog передаёт base `…/checkout/result`; после create знает `catalogReturnWithOrder=…?order={code}`. **Finance handoff:** YooKassa `return_url` = этот URL (не supplier SPA). Пока return без `?order=` - recovery из localStorage на result.
- Email: если появятся `SMTP_HOST`+`SMTP_FROM` на web process + nodemailer - письмо со ссылкой; иначе UI «сохраните код / ссылку».
- Wide CTA не трогали. Secrets / `.159` не трогали.
- Ship: `ca8332f4` · MSK Deploy **31186135682** · **BUILD_ID=`DZbsDCMDPTaUyaA071LUP`**. Email: `smtp_not_configured` (ожидаемо).

### Проблемы
- PDF attach / webhook PENDING→CONFIRMED notify = finance-only (остаётся Codex/`.159`).
- Стабильный purchases-by-email без localStorage = UX.BUY-6 (Codex).
- QR картинка через api.qrserver.com (MVP); код заказа всегда на карточке для печати offline.
- YooKassa `return_url` всё ещё может указывать на supplier/pay, если finance не выставил catalog URL - handoff.

---

## 2026-08-07 - Buyer UX MVP on daibilet.ru (Cursor catalog track)

### Наблюдения
- `pay.daibilet.ru` сейчас отдаёт supplier SPA; `/checkout/admissions/*` там без buyer-формы.
- Finance public STUB admission работает: `POST /api/checkout/stub` + `admissionProductSlug` + `admissionOfferId` + `buyer` → 201 `publicCode`.
- Public `/api/checkout/yookassa` пока event-only (admission → validation eventId); FIN.LC3 confirmationUrl был через finance/supplier path.
- Стабильного public order-by-code / purchases-by-email ещё нет - account soft-fail + localStorage cache после checkout.
- Owner: Codex строит **параллельный** buyer experiment на pay/.159 - catalog track не ждёт и не merge-ит поверх.

### Решения
- URL canon **catalog / Cursor:** 
  - checkout `https://daibilet.ru/checkout/admissions/{slug}`
  - result `https://daibilet.ru/checkout/result?order={publicCode}`
  - account `https://daibilet.ru/account/purchases`
- CTA admission: same-origin relative path (env `FINANCE_CHECKOUT_BASE_URL` / `BUYER_CHECKOUT_HOST=pay` только если явно нужен pay).
- BFF: `POST /checkout/actions/admission`, `GET /checkout/actions/order`, `GET /checkout/actions/internal-purchases` (finance soft; вне nginx `/api/` → backend :4000).
- Split: Cursor = UX/UI; Codex = fulfillment PDF/mail, admission YooKassa public, order lookup APIs, pay experiment.

- Ship: commits `d13b68a5` + BFF path fix `98b02aa9`; MSK Deploy **31178880463** **BUILD_ID=`yLJ-Q_y3Eo-p8_NM0luGe`**.
- Live smoke: `POST /checkout/actions/admission` → 201 STUB `publicCode=9378416`; pages `/checkout/admissions/…` + `/checkout/result` 200.

### Проблемы
- Без Codex public order API result/account опираются на ответ checkout + localStorage.
- nginx `/api/*` → backend :4000, поэтому BFF лежит под `/checkout/actions/*` (не `/api/`).
- Wide catalog CTA по-прежнему out.

---

## 2026-08-07 - YooKassa webhook cabinet = canon finance-api

### Наблюдения
- Owner подтвердил: в кабинете ЮKassa webhook URL = `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook` (events: `payment.succeeded`, `waiting_for_capture`, `canceled`).
- Ранее было ошибочно `pay.daibilet.ru` (buyer surface, не API webhook).

### Решения
- FIN.W1 / MIG.9.5: cabinet register ✅; next = e2e sandbox pay verify PENDING→SUCCEEDED.
- Docs-only commit; secrets / web deploy не трогали.

### Проблемы
- Нет новых. API auto-register по-прежнему 401 auth type - не нужно после ручной регистрации.

---

## 2026-08-07 - FIN.LC3 smoke closed (finance `.159`)

### Наблюдения
- Owner/Codex: `daibilet-finance-api` restarted, active; `https://finance-api.daibilet.ru/api/health` → 200.
- Flags on `.159`: `DAIBILET_YOOKASSA_CHECKOUT=1`, `DAIBILET_STUB_CHECKOUT=1`, `DAIBILET_YOOKASSA_VERIFY_WEBHOOK=1`; `YOOKASSA_SHOP_ID` / `SECRET` set (no values in docs/git).
- YooKassa sandbox create-payment: confirmationUrl OK, mode YOOKASSA, paymentStatus PENDING, publicCode 6037662; no `YOOKASSA_PAYMENT_FAILED`.
- STUB smoke OK: mode STUB, CONFIRMED/SUCCEEDED, publicCode 9032330, warnings [].
- Webhook register via API → 401 `invalid_credentials` «Authentication type is not allowed»: payment API works with current pair; webhook management not allowed for this API access.
- Wide CTA not touched; `.184` / TC / TEP not touched; no secrets committed.

### Решения
- FIN.LC3 закрыт (sandbox purchase smoke).
- Canonical webhook URL остаётся `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook`.
- Next (owner): register webhook вручную в кабинете ЮKassa **или** получить доступ/token с правом webhook-management.
- FIN.W1 / MIG.9.5: webhook = owner-manual / blocked on cabinet auth type; create-payment path уже зелёный.

### Проблемы
- Авто-регистрация webhook через API недоступна для текущего типа credentials магазина (401 auth type). Не блокер payment create; блокер только webhook delivery setup до ручной регистрации.

---

## 2026-08-07 - Москва Phase C hub ship (companions msk-2…5)

### Наблюдения
- После `65c8d8b` + Deploy **31170119217** (**BUILD_ID=`hZRMIROKILBA5UyaG8PI4`**) hub/my-day/venue covers live; companions ещё 404 soft.
- Gastro brands по-прежнему ждут owner list (в pack только Даниловский рынок).
- Первый upsert с `publishedAt` 14:00+03 не проходил фильтр `publishedAt <= now()` (сервер ~10:51 UTC) - исправлено на 12:xx+03 + `--force-published-at` + restart API.

### Решения
- 4 companion-гида PUBLISHED: `moscow-zamoskvoreche-tretyakovka`, `moscow-vdnh-kosmos-den`, `moscow-vorobevy-gory-siti`, `moscow-kolomenskoe-tsaritsyno` (cover + 2 inline + CTA `/my-day?city=moscow`).
- MSK: sync-public-assets + blog-upsert; Deploy **31171583238** **BUILD_ID=`YDWwMoEX33uU7Y3eajUtJ`** HEAD `1caebb65`.
- Smoke: 4 blog 200 + body/CTA; hub/my-day 200; cover jpg 200.
- Tasktracker: MS.TIER4 / MS.TIER5 / PH2.CITY2 закрыты по hub pack.

### Проблемы
- Hub must-see карусель text+CTA (без фото) - editorial covers на my-day / venue PDP - by design.

---

## 2026-08-07 - Москва Phase C live (seed + images)

### Наблюдения
- Owner OK на draft 58 mustSee / 8 suburbs / 5 presets.
- Deploy MSK web run **31166455240** success (SHA `ac94123`, cityInfo draft already live).
- Prod seed: 52 inserted, 6 skipped-exists; cityInfo slug unchanged (уже были).
- Coords enrich from cityInfo: 52 updated, 6 already, DB `no_coords=0` for 58 moscow-*.

### Решения
- `scripts/apply-moscow-mustsee-coords.js` + `scripts/generate-moscow-venue-covers.mjs`.
- Covers: 12 GenerateImage (Главные) + 46 sharp catalog pack → `/images/venues/moscow/` (web+public); `MOSCOW_IMAGES` в `city-place-images.ts`.
- Ship commit `65c8d8b`; Deploy MSK web **31170119217** success; **BUILD_ID=`hZRMIROKILBA5UyaG8PI4`**.
- Smoke: `/cities/moscow` 200, `/my-day?city=moscow` 200, `/locations/moscow-krasnaya-ploschad-i-kreml` 200, `/images/venues/moscow/vdnh.jpg` 200.

### Проблемы
- Local sharp был broken (detect-libc); gen на MSK + local после fix.

---

## 2026-08-07 - F5.3b closed: public-venue-read

### Наблюдения
- F5.3b висел: Diary 2026-07-30 заявлял `public-venue-read.ts`, но файл в git не попал; `public-city.dto` / `public-venue.dto` снова тянули builders из `dto.js`.
- Exit F5.3b ошибочно включал retire `server.js`; owner: полный parity venue hub + снять server.js как цель.
- Stale docs ещё писали dual-edit `dto.js` + `landing-rules.ts` (F5.2 уже SoT = landing-rules).

### Решения
- `apps/backend/src/public-venue-read.js`: hub/page/catalog/resolve/published/merge + kind/gate helpers; cache clear/warm.
- Next path: `public-city.dto` / `public-venue.dto` / `public-search.dto` → `./public-venue-read.js` (не dto.js).
- `buildPublicVenuePage`: lazy `getPublicCatalogSessions()` из `public-catalog.dto`.
- `dto.js` re-export для legacy `server.js` / warm; `clearPublicDataCaches` → `clearPublicVenueReadCache()`.
- Тесты: `public-venue-read.test.ts` + `public-city-venues` (17 pass). Docs: Tasktracker F5.3b ✅; f5-retire-dto-map; Project/qa dual-edit сняты.
- Scope: admin venue routes / delete server.js → F5.3c+; INC.504.5 dual catalog SWR отдельно.

### Проблемы
- Thin util copies (`publicCitySlug` и city routing) ещё в dto.js и venue-read - не business dual-edit rules.
- Hotfix после extract: `publicEventSlug` забыт в `mapSlimPublicStopEvent` → venue page 500; fixed `2bdeeb2`.
- MSK live: GH Deploy MSK web @`7201be8` **BUILD_ID=`4fbNTV2DxiwjqKsrLmILJ`** + API HEAD `2bdeeb21`; smoke `/venues/ermitazh` API+web 200.

---

## 2026-08-07 - Москва hub Phase C draft (MS.TIER4)

### Наблюдения
- Owner: «по Москве сегодня соберем хаб - места, картинки, пригороды, seed/link/suburbs/vectors/гиды к сценариям линк с my-day».
- До прохода Москва была floor **6** mustSee, без suburbs / presets / venue images. СПб Phase B - эталон.

### Решения
- Draft pack в `CITY_INFO.moscow` (web + public), commit `3d3c917`: **58** mustSee с фильтрами, **8** suburbs (40 POI) + travel vectors, **5** presets (`msk-1`…`msk-5`).
- Docs: `docs/drafts/moscow-must-see-draft.md`, `moscow-route-articles-plan.md`; patch-script `scripts/data/patch-moscow-hub-pack.js`; suburb coords +40.
- Companion: `moscow-2-dnya-…` → `msk-1` + CTA `/my-day?city=moscow`. Гастро-бренды не выдумывали.

### Проблемы
- Owner OK на состав; local/prod DB seed не применён (нет DATABASE_URL / ECONNREFUSED :5437); place images `/images/venues/moscow/` пусто; 4 companion-статьи только в плане.

---

## 2026-08-07 - Venues vs locations: owner OK option A + nav V1

### Наблюдения
- Owner подтвердил architecture option A: URL-семейство от kind/role, не от ticket availability.
- Риск путаницы: «пока нет билетов» ошибочно уводили institution в `/locations`.

### Решения
- Музей/театр/зал без афиши → `/venues`; buy-chrome скрыт до offers/sessions.
- Sights / parks / piers / gastro-as-day-point → `/locations`.
- Commerce = только UI chrome. Оси: kind→URL, offers→chrome, pageStatus→модерация.
- Nav **V1** (оставить `/locations` в primary). `/places` deferred. Rename лейбла «Места и точки сбора» = UX.LOC3 follow-up.
- Docs: qa LOCKED, catalog-location-venue-canon note, Tasktracker UX.LOC8 / PH2.LOC1 decided. Docs-only commit+push; web deploy не нужен.

### Проблемы
- Нет.

---

## 2026-08-07 - PH2.LOC2: CityPicker вне бургера (mobile)

### Наблюдения
- Owner: закрыть PH2.LOC2 - «через пиктограмму и дропдаун».
- В `apps/web` уже было: sticky `CityPicker` variant `header` = MapPin icon-only до `sm` + portal-dropdown (UX.LOC1 / `cc05efa`); desktop без изменений.
- В legacy `apps/public` город ещё был `hidden lg:block` - только в sheet внизу.

### Решения
- PH2.LOC2 → ✅ (канон web = pin вне бургера; public Header/CityPicker выровнены под тот же паттерн, city в sheet сверху).
- Новый MSK web deploy не нужен: runtime уже на live с UX.LOC1.

### Проблемы
- Нет.

---

## 2026-08-07 - SPB `.16` Intelligent Hoopoe: труп, MSK-only inventory

### Наблюдения
- Owner confirmed: Timeweb SPB VPS `213.171.7.16` (Intelligent Hoopoe) - «убираем везде, он уже труп».
- Агент не удаляет VM в панели Timeweb: wipe/billing = owner, если машина ещё крутится.

### Решения
- Активные docs/runbooks/scripts: MSK-only (`.184` catalog+build · `.159` finance). Убраны инструкции SSH/build/deploy на `.16`.
- MIG.9.7 → ✅ (repo/ops); Diary/Tasktracker/Project/current-state/spb-finance-host обновлены.
- Teplohod allowlist: боевой sync IP = **`201.24.125.184`**, не `.16`. Owner: сверить в кабинете Teplohod перед/после wipe старого IP.
- Исторические записи Diary / audit snapshots не переписывались wholesale.

### Проблемы
- Если `.16` ещё в биллинге Timeweb - owner должен удалить/выключить VM в панели.

---

## 2026-08-07 - Owner: Метрика цели + Вебмастер sitemap/переобход уже сделаны

### Наблюдения
- Owner подтвердил: цели Яндекс.Метрики (`product_card_click`, `select_tickets`, `catalog_interstitial_click`, опц. `purchase_success`) и Вебмастер (sitemap `https://daibilet.ru/sitemap.xml` + переобход TOP-15) **давно сделаны**; пустые отчёты = нет трафика, не открытый owner TODO.

### Решения
- Закрыты в Tasktracker: CV.2b–CV.2e, SEO.IN2–IN3, SEO.T5, SEO.LC6, SEO.16 (+ чеклисты/qa).
- Docs-only commit+push; web deploy не нужен.
- CV.2f (Webvisor SOP) и код `purchase_success` (нет widget callback) остаются отдельно.

### Проблемы
- Нет.

---


## 2026-08-07 - CI Deploy MSK web: SSG without local DB/API

### Наблюдения
- `Deploy MSK web` падал на hosted runner: Prisma P1001 `127.0.0.1:5437` в `top-event-slugs` (soft warn ok) и hard-fail prerender `/` - `fetch failed` / ECONNREFUSED `:4000`.
- Root cause `/`: `withSoftTimeout` ловил только hang, не reject; `getHomeCoverFingerprints` → `getHomeCatalog` бросал ECONNREFUSED и валил `Promise.all` в `HomePageBody`. CI не имел ни Postgres, ни API; workflow не прокидывал `DATABASE_URL` / tunnel (намеренно - не открывать prod DB публично).

### Решения
- Workflow: SSH local-forward `GH:4000 → MSK 127.0.0.1:4000` перед `pnpm web:build` (секреты `MSK_SSH_*`); health `/api/health` или `/api/public/stats`.
- `EVENT_SSG_TOP_N=0` в CI - skip Prisma event SSG без `DATABASE_URL` / без DB tunnel.
- Soft-fail safety net: `withSoftTimeout` ловит reject; home fingerprints try/catch; `/podborki` `allSettled`; landing candidate soft-catch; `fetchPublicApiJson` soft-null на build+unavailable+`notFoundAsNull`.
- Канон сохранён: CI build + atomic swap; Postgres не торчит наружу; fallback `deploy-prod-next.sh` на MSK.

### Проблемы
- Нет (ожидаем re-dispatch workflow после push на `feat/next-monorepo` + sync workflow на `main`).

---

## 2026-08-07 - CI Deploy MSK web workflow (artifact swap)

### Наблюдения
- Owner: «почему не CI?» - SSH сам быстрый, тормозит in-place `web:build` на 4GB MSK.

### Решения
- Workflow `.github/workflows/deploy-msk-web.yml` (workflow_dispatch): CI `pnpm web:build` → tgz `.next` → scp → `swap-web-next-artifact.sh` (flock, stop, swap, health, rollback `.next.prev`).
- Secrets: `MSK_SSH_HOST`, `MSK_SSH_USER`, `MSK_SSH_KEY` (+ optional NEXT_PUBLIC_*).
- Fallback: прежний `deploy-prod-next.sh` на MSK.

### Проблемы
- До первых secrets workflow только соберёт artifact при `skip_swap` или упадёт на SSH step.

---

## 2026-08-06 - My Day grid offers: compact shell + «Билеты от» + inline Поблизости

### Наблюдения
- Owner: «Афиша» → «Билеты от N ₽»; shell тянулся из-за items-stretch/flex-1; nearby лейбл отдельно + w-full пилюли.

### Решения
- Venue CTA: «Билеты от N ₽».
- Grid: items-start, shell без flex-1/h-full.
- Nearby: «Поблизости» + hug links в одном flex-wrap ряду.

### Проблемы
- Нет.

---

## 2026-08-06 - Blog: hide «Хаб Регионы» CTA

### Наблюдения
- В «Дальше по теме» для статей с citySlug=`regions` рисовалась кнопка «Хаб Регионы» → `/cities/regions` (псевдогород, не хаб).

### Решения
- `resolveBlogCityHref` / `resolveBlogCityEventsHref` возвращают null для regions/multi и лейблов Регионы / Несколько городов / Без города (web+public).

### Проблемы
- Нет.

---

## 2026-08-06 - My Day stop offers: venue link + лейбл + equal grid

### Наблюдения
- Предыдущие агенты по my-day offers упали; в WIP уже были helpers `dayRouteOfferIsVenueBound` / empty chip (без «Билет оформляется…»), grid/list layout и handoff off (`703d1ca` / `eca4c00`).
- Owner: лейбл «События поблизости» над офферами; venue без даты → ссылка на площадку + «от N ₽»; grid не раздувать; list pills center; модалка off.

### Решения
- Chip pending: empty label (не UI «Билет оформляется…»).
- Venue-bound CTA: `Link` на venue page + price; event buy-pill только для event-as-stop.
- Nearby upsells: лейбл + chips; при 2+ - вертикальный список под карточкой, `justify-center`.
- Grid: `items-stretch`, shell равной высоты, офферы `data-day-stop-offers-below` вне shell.

### Проблемы
- Нет.

### Live
- Commit `ebac995`; MSK **BUILD_ID=`lToO4hCB_xvFKPGzX8dKL`**. Smoke: `/my-day` HTTPS+local **200**; код на MSK с `dayRouteOfferIsVenueBound` / `data-day-stop-offers-label` / handoff flag false.

---

## 2026-08-06 - Event hero: кликабельный бейдж площадки

### Наблюдения
- На PDP бейдж pin+название площадки в hero был `<span>` (не кликабелен); адрес ниже открывал модалку через `EventVenueTrigger`.

### Решения
- `EventPage.client.tsx` `EventHero`: при `venueId`/`venueSlug` бейдж → `Link` на `venueHref` (`/venues` или `/locations`); hover/underline. Без slug/id - span, без мёртвой ссылки.

### Проблемы
- Нет.

### Live
- Commit `9a9722a`; MSK **BUILD_ID=`KqGMFbvqJXi3JrYxNtIje`**. Smoke: `/events/tc-6a354197f25c30e2516f5990-elitnyi-stand-up` 200, HTML `href="/venues/evgenich-na-rubinshteina-6930909cfc27bb700696490f"`.

---

## 2026-08-06 - My-day: выключили модалку «Оформили билет?»

### Наблюдения
- Owner: уведомление/модалку «Оформили билет?» пока лучше убрать (раньше clarification был «не убирать» - пересмотр UX).
- Flow покупки: `<a target=_blank>` / `window.open(ticketUrl)` остаются; модалка только handoff после клика.

### Решения
- `DayRoutePanel.client.tsx`: флаг `SHOW_DAY_TICKET_HANDOFF_MODAL = false` + gated `setTicketHandoff` и render. Код модалки сохранён для возврата.

### Проблемы
- Нет.

### Live
- Commit `eca4c00`; MSK **BUILD_ID=`WA7He7JopvW8n-kr9KReK`**. Smoke: `/my-day` 200; handoff-маркеры в HTML нет (флаг off).

---

## 2026-08-06 - `/venues`+`/locations`: faster first list + drop secondary filters

### Наблюдения
- Curl HTML ~0.3s; «медленно» = клиент после paint: `cityReady` → лишний `fetchVenueCatalogPage` даже когда SSR `initialPage` уже under «все города»; skeleton прятал полезный SSR-список.
- `/locations`: Leaflet + pins на desktop сразу конкурировали с first useful list.
- Secondary-чипы scale (venues) и logistics (locations) - рано как фильтр (owner: убрать).

### Решения
- Skip refetch когда `feedQueryKey === initialQueryKey` (как CatalogShell на `/events`); skeleton только если `venues.length === 0`.
- Map: `dynamic()` + pins только при `showMap`; desktop idle/`requestIdleCallback` (~2.5s), mobile off до клика.
- Page size 36→24; debounce поиска уже был (250ms).
- UI scale/logistics chips выпилены; `?scale=`/`?logistics=` не шлём с клиента (API оставлен). Блок «Логистика» на карточке venue не трогали.

### Проблемы
- Нет.

### Live
- Commit `b1ad969`; MSK **BUILD_ID=`8B9zL38_0_PF3aLi_QgFt`**. Smoke: `/venues` `/locations` 200; HTML без «Все масштабы» / «Любая логистика»; kind-чипы «Все точки» на месте.

---

## 2026-08-06 - Pier card showed ship «Москва-99» as venue title

### Наблюдения
- Owner: бейдж ПРИЧАЛ, title «Теплоход «Москва – 99»», address Адмиралтейская наб., 10, city Москва.
- Канон: это имя судна; причал = Воскресенская наб., 10, Санкт-Петербург (не Адмиралтейская, не Москва из корпуса).
- Live: `venue_6a4d040007d4af979f35e566` / `teplohod-moskva-99`; twin `teplohod-moskva-64` уже на Воскресенской, но cityId=Москва.

### Решения
- Override + ensure script: title/address → Воскресенская наб., 10, city SPB.
- Системно: pier display не показывает hull-name; city inference strips «Москва-N» / «Теплоход «…»»; SPB embankment addresses infer Санкт-Петербург.
- Detail path: normalize(+id) before pier display name.

### Проблемы
- TC venue.name = судно; без override address мог остаться Адмиралтейской из supplier - канон owner = Воскресенская.
- Commit `b3260aa`; MSK **BUILD_ID=`hd6dzEAUlinQkyxz8kEng`**; ensure DB title/address/kind=PIER; smoke API name `Причал — Воскресенская наб., 10`, city Санкт-Петербург.

---

## 2026-08-06 - Tretyakov TC venue title was street address

### Наблюдения
- Owner: карточка venue показывала «Москва, Лаврушинский переулок», хотя shortDescription и события про Третьяковскую галерею (Шишкин, Лаврушинский пер., 10).
- TC stub `venue_6a1fd5158bd71b8ae77e127c` / `moskva-lavrushinskii-pereulok-10-…`: title=address. Канон must-see `moscow-tret-yakovskaya-galereya` уже «Третьяковская галерея», но 0 событий; у TC-строки ~378 events.

### Решения
- Prod DB: title → «Третьяковская галерея», address → «Лаврушинский переулок, 10».
- Override в `scripts/data/venue-address-overrides.json` + `scripts/fix-moscow-tretyakovka-venue-title.js`.
- Unit: `venue-normalize.test.js` (id + match).

### Live
- Commit `b7caf93`; MSK deploy completed (**BUILD_ID=`TPHCAYseu7pbeD6mNHEZq`**), затем concurrent deploy сменил tip на **`GaFFsO9l2pR-JVxoCPWFn`**.
- Smoke `/locations/moskva-lavrushinskii-pereulok-10-…`: title «Третьяковская галерея», address «Лаврушинский переулок, 10», без title-адреса в HTML.

---

## 2026-08-06 - Multi-landing «Все города» stuck on city redirect

### Наблюдения
- Owner: `/progulki-po-krysham/` (и другие multi) - чип «Все города» не держится, уводит на город (часто Москва).
- `SelectedCityProvider` на national URL (`/{intent}/` без city) делал `router.replace` в `/{intent}/{storedCity}/` из localStorage - как `?city=` у каталогов, но ломал канон агрегации.

### Решения
- Убран auto-inject stored city → multi-landing path.
- National `/{intent}/` = «Все города»; chip вызывает `setCity('all')` (чистит storage + CHPU без city).
- Single-city / city-scoped landings не затронуты (`CITY_SCOPED_LANDING_SLUGS`).

### Проблемы
- Нет.

### Live
- Commit `fec351b`; MSK **BUILD_ID=`gR6L-p00T5e5YGU3tMO8j`**. Smoke: `/progulki-po-krysham` 200, «Все города»×4, cityNav×2; `/progulki-po-krysham/moscow` + single-city dinner/bridges 200.

---

## 2026-08-06 - My Day stop offers: grid overlap + list gap

### Наблюдения
- Grid (lg:3 cols): `lg:flex-row` place|offers внутри узкой карточки - chips наезжали на thumb/maps/X, `~мин/км` уезжал под картинку.
- List: place-cluster с `flex-1` + commerce `lg:justify-end` - пилюли у правого края с гигантским whitespace.

### Решения
- Grid: всегда stacked `place-then-offers` (main row, offers ниже) - колонки слишком узкие для side-by-side.
- List: `place-offers-tight` - place `lg:w-auto lg:flex-none` (без `flex-1`); commerce `justify-start` без `lg:justify-end`.
- `data-day-stop-layout`: `place-then-offers` / `place-offers-tight`.

### Проблемы
- Нет.

### Live
- Commit `51f2141` (deploy HEAD `c7bfb13`); MSK **BUILD_ID=`UB4mAZHXczwOOfwND5chE`**; smoke `/my-day` local+https **200**.

---

## 2026-08-06 - Perm: добили превью must-see / suburbs

### Наблюдения
- Owner: не все точки Перми имеют превью на hub / my-day.
- Было 19/43 slug в `PERM_IMAGES` + файлы в `apps/public/public/images/venues/perm/`.

### Решения
- +24 GenerateImage → `venues/perm/` (gastro, музеи, архитектура, suburb parents Kungur/Belaya Gora/Gubakha).
- `PERM_IMAGES` = полный набор 43 slug из cityInfo (mustSee + suburb roots + nested со slug).
- Seed/prod DB не нужен: editorial cover резолвится статикой через `lookupEditorialPlaceImage`.

### Проблемы
- Нет.

### Live
- Commit `2ee5bf1`; MSK **BUILD_ID=`wN-IZ38TNvl4wjTyGylky`**; covers `/images/venues/perm/*` **200** (43 files); `/cities/perm` **200**. Seed не нужен.

---

## 2026-08-06 - `/cities` map: только 8–11 пинов вместо всех городов

### Наблюдения
- Owner: на https://daibilet.ru/cities на карте только ~8 городов.
- `RussiaMap` строил маркеры из hardcoded `CITY_PINS` (~11 major hubs). Top-8 на странице - только плитки-герой (`TOP_CITIES_COUNT`), карта к ним не должна быть привязана.
- Live destinations: 65 городов (`type=city`); PublicDestinationDto без lat/lng.

### Решения
- `city-map-coords.ts`: центры всех standalone/live городов (API slug + SEO aliases + RU names).
- `RussiaMap`: пины = все `destinations` type=city с координатами; `data-cities-map-pins`; счётчик в шапке карты.
- Top-8 tiles без изменений.

### Проблемы
- Нет (покрытие 65/65 по live API slugs, unit test).

### Live
- Commit `b17c53a`; MSK **BUILD_ID=`XqE2Bn0VE2kfPHTvm6z82`**; `/cities` 200; HTML `data-cities-map-pins="65"`.

---

## 2026-08-06 - Suburbs cards: hanging nums + anno-size text

### Наблюдения
- Owner: пункты списка крупнее/темнее аннотации; текст и CTA уезжали от линии заголовка; номера должны висеть влево под круглым бейджем.

### Решения
- `SuburbsCarousel` compact+hub: CSS grid `badge|content`; POI nums в col1 под бейджем; имя/desc и «В маршрут» в col2 = линия title/anno; `text-sm leading-5` как anno.

### Проблемы
- Нет.

---

## 2026-08-06 - My-day suburbs: anno + 3-up desktop

### Наблюдения
- Compact suburbs rail: нет мини-аннотации под названием, CTA «В маршрут» справа, на desktop одна широкая карточка.

### Решения
- Compact: `place.desc` под заголовком (`line-clamp-3`), CTA слева под списком точек.
- Desktop: до 3 карточек (`md:2` / `lg:3`); hub rail тоже 3-up.
- CityCard desktop clip уже закрыт в `0a7e8af`.

### Проблемы
- Нет.

---

## 2026-08-06 - Home: restore «Выбор редакции»


### Наблюдения
- Owner: с главной пропал блок «Выбор редакции».
- Root cause: `8d844ae` (personal guide MVP) заменил `HomeCityAwareSections` на упрощённый `HomeGuideEvents` («Куда сходить» only) - editors-pick rail отпал вместе с секцией.

### Решения
- Вернул `HomeCityAwareSections` в `HomePageContent` после городов / My Day banner: `#editors-pick` → home-now tabs → «Популярное».
- Данные те же (`buildHomePageSectionsSync` / PINNED + catalog fill) - не пустой API.
- Не трогал параллельные правки My Day banner / city under-tag font.

### Проблемы
- Нет.

---

## 2026-08-06 - Landing titles + holiday date windows

### Наблюдения
- Owner: H1/title вида «Экскурсии — Москва сегодня…» (em dash + именительный) и дубль города «…в Москве — Москва».
- Двойное двоеточие `: :` перед «афиша» на rooftops и др.
- Сезонные посадки (салют / NY / день города / valentine) показывали события вне праздничного окна; UI «Любая дата» тоже не был ограничен.

### Решения
- `landing-seo`: `{Intent} в {City_Пр} сегодня, {date}: афиша…`; strip city/dash glue; normalize colon; H1=`<title>`.
- `landing-event-windows`: окна salute=9 May, NY=24 Dec-14 Jan, valentine=9-19 Feb, moscow-city-day=1st Sat Sep ±1d.
- SSR `finalizeLandingPayload` + client filter + date chips ограничены окном (без unbounded «любая дата»).

### Проблемы
- Параллельный mobile city-switcher правит `LandingPageView.client.tsx` - держать оба фикса в одном коммите ветки.

### Live
- MSK BUILD_ID=`KWAMgGe2IltGyCb_4gusR` @`a87135f`. Smoke: `/ekskursii/moscow` title «Экскурсии в Москве сегодня, 6 августа: афиша, цены и билеты»; museums без дубля; `/moscow/den-goroda` «…, 4-6 сентября: афиша…» (окно, без «сегодня»).

---

## 2026-08-06 - Multi-landing mobile city switch restored

### Наблюдения
- Owner: на multi-landings mobile нет city filter/switcher - «беззубость мультиподхода»; спросил, специально ли.
- Не специально: `LandingFilters.showCityFilter` гасился через `!landingCity` на ЧПУ `/{intent}/{city}`; после city-filter stats тоже одномерные.
- Header CityPicker на mobile - только pin; in-page switch отсутствовал.

### Решения
- `LandingMultiCitySwitch`: чипы «Все города» + priority/guide cities → тот же intent другого города.
- Mobile hero (`md:hidden`) под H1 + sticky filters (chips вместо select).
- Список городов не из отфильтрованных stats (PRIORITY / bus / river / seasonal order).

### Проблемы
- Параллельный агент может править landing titles в тех же файлах - коммитить только city-switch hunks.

### Live
- MSK BUILD_ID=`wEmnlocTyWo2TN1TtTixI` @`523f374` (+ docs follow-up). Smoke mobile UA: `/ekskursii/moscow`, `/vystavki-i-muzei/moscow`, `/peshie-ekskursii/saint-petersburg` → 200, `aria-label="Сменить город"` ×2 (hero+filters), «Все города» + cross-city links.

---

## 2026-08-06 - Venues catalog: infinite «Обновляем список…» for Perm

### Наблюдения
- Owner: `/venues` с Пермью висит на скелетонах «Обновляем список…».
- API `/api/public/venues?city=perm|Пермь` 200, ~16-23 venues - не backend hang.
- Playwright: `?city=perm` (ASCII) ок; `?city=Пермь` (кириллица из header/storage) ловит abort thrash / soft-nav pending.
- Баг UX: `listPending = cityPending || isPending || catalogLoading`; abort finally не снимал loading; early-return при `!cityReady && !urlCity` оставлял skeleton.

### Решения
- `?city=` в catalog nav / storage inject / header → ASCII destination slug.
- Venues+Locations: request-id loading, clear on early-return; listPending без isPending.
- Стабильный `cityFetchKey` по resolved title.

### Проблемы
- Старые deep-link с кириллическим `?city=` всё ещё открываются, но больше не клинят skeleton.

### Live
- Commits `2c23d1d` + `84076fd`; MSK **BUILD_ID=`e-XzQltin9RuCjX0zo1VU`**.
- Smoke Playwright: `/venues?city=perm` и Cyrillic → «Найдено: 23», pending=0; `/cities/perm` 200.

---


### Наблюдения
- Owner дал полный гайд Перми (main/museums/gastro + 5 арт-площадок + suburbs Хохловка/Кунгур/Белая гора/Губаха-Усьва).
- В cityInfo было только 6 пунктов; Хохловка дублировалась бы как mustSee и suburb.
- Seed insert-missing раньше не писал address/lat/lng - my-day опирается на coords в cityInfo.
- Предыдущий агент завис на Nominatim; довели без geocoding API: curated coords + `suburb-nested-coords.json`.

### Решения
- `perm.mustSee` = 35 уникальных мест с `mustSeeFilter`, address, lat/lng; legacy slugs сохранены (`permskaya-galereya`, `naberezhnaya-kamy`, `teatr-teatr`, `permskaya-esplanada`, `permsky-solenye-ushi`; `muzej-hohlovka` только в suburbs).
- `significantSuburbs` x4, 20 nested POI с coords; dayRoutePresets x2.
- `address` в CityMustSeeItem / SuburbPlace + fallback в `dayRouteItemFromMustSee`.
- 19 GenerateImage → `apps/public/public/images/venues/perm/` + `PERM_IMAGES` / полный `PERM_COORDS` (43 slug).
- `scripts/data/suburb-nested-coords.json` +20 Perm nested (как KGD/SPB).
- `scripts/seed-perm-must-see-pack.js` insert-missing + soft coords/address backfill.
- web + public `cityInfo` sync (блоки равны).

### Проблемы
- Локального DATABASE_URL нет - seed на MSK после deploy.
- Nominatim не использовали (rate-limit / abort); owner/curated coords.

### Live
- Commits `fe810e0` (pack+previews) + `3a637c6` (coords expand); MSK **BUILD_ID=`lYsWHccwLK_ab0KcRNm_i`**.
- Seed: insert **37** / skip **6** legacy; smoke `/cities/perm` local+https **200** (ЦГК/Шпагин/НьюТон/suburbs + «В маршрут»); `/my-day` **200**; covers `/images/venues/perm/*` **200**.

---

## 2026-08-06 - City hub / podborki: Perm direction cards bleed (badge + images + copy)

### Наблюдения
- Owner на хабе Перми: на карточках направлений бейдж «Санкт-Петербург», одно и то же SPB-фото (Спас на Крови / `format-tours.jpg`) на экскурсиях / пеших / загородных / крышах, у rooftops subtitle про Москва-Сити.

### Решения
- `LandingCityBadge`: в city context бейдж = выбранный город; city-bound чужого города скрыт.
- `resolveFeaturedDirections`: gate через `landingMatchesCatalogCity` (режет `country-tours` / `spb-yards` на Перми).
- `landing-images`: уникальные обложки + override для `perm` (Кама / центр); fallback больше не `format-tours.jpg`.
- `landing-rules` rooftops subtitle без Москва-Сити.
- City hub `PopularDirections`: `showFilterCityBadge`.

### Проблемы
- cityInfo must-see Перми не трогали (параллельный агент).

### Live
- Commit `e39b0a2`; MSK **BUILD_ID=`IZ3zP74TeExUVdQgfDRFw`**; smoke `/cities/perm` 200; directions: 0×«Санкт-Петербург», есть «Пермь», covers `perm/kama`+`city-center`, без `format-tours`; rooftops subtitle без Москва-Сити; API restart для rules.

---

## 2026-08-06 - City hub must-see: sparse card width cap

### Наблюдения
- Owner (Пермь): после sparse-grid 2 места растянуты на всю ширину; огромный зазор title ↔ «В маршрут».

### Решения
- `CitySightsMustSeeList` sparse: колонки `minmax(0,min(22rem,calc(50vw-3rem)))` как у carousel `auto-cols`; `md:w-max` + `justify-items-start` вместо `md:w-full`. Mobile без изменений.

### Проблемы
- Нет (layout-only; cityInfo Perm pack не трогали).

### Live
- Commit `d94a407`; MSK **BUILD_ID=`KIUzWWqOhq_t5Woo8FLpd`**; smoke `/cities/perm` local+https **200**; HTML `sparse-grid` + capped `min(22rem`.

---

## 2026-08-06 - `/cities` OSM map: «Скоро события» вместо счётчиков

### Наблюдения
- Пины `RussiaMap` всегда показывали «Скоро события», хотя карточки городов имели реальные `events` (Москва ~800+, СПб ~900+).
- `CITY_PINS` используют SEO slug (`moscow`, `saint-petersburg`, `nizhny-novgorod`), а `/api/public/destinations` отдаёт DB/TEP slug (`moskva`, `sankt-peterburg`, `nizhniy-novgorod`). Lookup по exact slug давал 0.

### Решения
- `RussiaMap.client.tsx`: индекс events по raw slug + `normalizeCitySlug` + fallback по имени города.
- SEO href пинов (`/cities/moscow` и т.п.) не трогали.

### Проблемы
- Параллельные MSK deploy после нашего build кратко гасили web (502); live tip `ee6fd749` включает фикс.

### Live
- Commit `3df066c` (в tip `ee6fd749`); MSK **BUILD_ID=`cr_HR-Mm4jbjC788zYriW`**; `/cities` 200; pin lookup: moscow 806, saint-petersburg 893, kazan 57.

---

## 2026-08-06 - City hub must-see: sparse horizontal grid

### Наблюдения
- Owner (Пермь): при 2 местах в «Зачем ехать» / «Главные места» карточки стопкой в одной узкой колонке, справа пусто. 2-row `grid-flow-col` карусель бессмысленна при <4 пунктах.

### Решения
- `CitySightsMustSeeList` (`CityPageView.client.tsx`): если `visiblePlaces.length < 4` на md+ - горизонтальный грид (`1` / `2` / `3` cols), `data-city-must-see-layout="sparse-grid"`; стрелки карусели скрыты.
- При ≥4 - прежняя 2-row column-flow карусель (`layout="carousel"`). Mobile swipe без изменений.
- CTA «В маршрут»: на md+ рядом с title (как suburbs); на mobile под описанием.

### Проблемы
- Параллельный MSK deploy перебил web mid-warm (краткий 502); финальный tip `ee6fd749` включает фикс.

### Live
- Commit `2519d5f` (ancestor of `ee6fd749`); MSK **BUILD_ID=`cr_HR-Mm4jbjC788zYriW`**; smoke `/cities/perm` local+https **200**; HTML `data-city-must-see-layout="sparse-grid"`, 2 cards.

---

## 2026-08-06 - My Day stop offers: desktop right column

### Наблюдения
- Owner: ticket/event pills («Элитный Stand-up · от 600 ₽») сидят под title/address/travel; на desktop справа от title пустое место.

### Решения
- `DayRouteVenueCard` list + grid: mobile по-прежнему stacked (offers ниже); lg+ `flex-row` - слева place/travel/actions, справа `commerceRail` (own column, wrap, max-w ~22rem).
- Не возвращаем chips в один flex-wrap с travel meta (баг owner-v7 overlap).
- `data-day-stop-layout`: `place-offers-lg-row` / `owner-v9-lg-row`.

### Проблемы
- Нет.

### Live
- Commit `a201ea9`; MSK **BUILD_ID=`4cziKHuRaIqdm9UB0NYYW`**; smoke `/my-day` local+https 200.

---

## 2026-08-06 - My Day must-see: always expanded grid

### Наблюдения
- Owner: у «Главные места» кружок на «Свернуть» рядом с «Добавить главные места»; «уберем опцию, будем показывать развернутым».
- Параллельный stop-offers commit (`a201ea9`) случайно захватил этот UX; потом `9a259f4` вернул carousel toggle - откат отменён намеренным коммитом.

### Решения
- Убран toggle `mustSeeExpanded` / `data-day-must-see-expand` («Свернуть»/«Развернуть») и carousel-режим.
- Сетка must-see всегда `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` + `data-day-must-see-expanded="1"`.
- Аккордеон «Главные места» открыт по умолчанию (`openPanel = 'mustSee'`); header chevron оставлен для плотности страницы.
- «Добавить главные места» и filter chips без изменений.

### Проблемы
- Нет.

### Live
- Commit `998bd69`; MSK **BUILD_ID=`4cziKHuRaIqdm9UB0NYYW`**; smoke `/my-day` 200 (public + :3001); chunk `data-day-must-see-expanded`, без `data-day-must-see-expand` / `mustSeeExpanded`.

### Наблюдения
- Owner: на desktop `/cities` кнопки random/Популярные/По алфавиту не в одном ряду; топ-тайлы + карта в узком aside; «Все города (n)» лишний; нужны 8 главных городов со светлыми daytime-превью.

### Решения
- `CitiesHeroSearch`: mobile без изменений (random отдельно, sorts рядом); desktop `sm:flex-row` - все три CTA в одной горизонтальной строке.
- Layout: 8 top tiles (`imageVariant="top"`) → full-width OSM `RussiaMap` → остальной каталог без дублей top-8 (`excludeSlugs`).
- Daytime previews: +`sochi.jpg` / `kaliningrad.jpg` в `cities/top`; `CITY_TOP_PREVIEW_SLUGS` расширен до 8.
- Убраны UI «Все города (n)» в каталоге и ссылка «Все города» в футере карты.

### Проблемы
- Нет.

### Live
- Commit `54a9ffd` (live tip incl. follow-ups → `9a259f4e`); MSK **BUILD_ID=`AF2liBH4Eu1LzXz8b0Yu2`**; smoke `/cities` 200; 8× `cities/top/*.jpg` 200; в HTML нет «Все города»; есть CTA-row + `lg:grid-cols-4` + full-width map `lg:min-h-[22rem]`.

---

## 2026-08-06 - Suburb nested POI: coords for day-route

### Наблюдения
- Owner: «по точкам пригородов вообще нет координат, соответственно маршрут не строится».
- `significantSuburbs` nested POI (СПб 55 + KGD 23): у большинства нет slug; `dayRouteItemFromMustSee` создавал stub `suburb:*` без lat/lng.
- `CitySuburbPlace` не имел полей coords; `SuburbsCarousel` не пробрасывал lat/lng в day-route item.
- Даже точки со slug опирались только на hub venues / editorial map (почти пустой для suburb).

### Решения
- Тип `CitySuburbPlace`: `latitude` / `longitude` / `dayRouteId`.
- `SuburbsCarousel` передаёт coords в `dayRouteItemFromMustSee`.
- Кураторский pack `scripts/data/suburb-nested-coords.json` (78 точек) + `scripts/apply-suburb-nested-coords.js` → inject в web/public `cityInfo`.
- Источники: owner pack SUB/KGD где есть; иначе landmark pins. Выборг: исправлен typo owner SUB lat 59→60.
- Public Kronstadt nested list выровнен с web (Якорная площадь / Петровский док).

### Проблемы
- DB Venue backfill для suburb slug не обязателен для my-day (coords идут из cityInfo в localStorage); PDP по-прежнему на catalog.

### Live
- Commit `39458e4`; MSK **BUILD_ID=`5ueueXbge5GLt1fGTox0I`**; smoke `/my-day` 200, `/cities/kaliningrad` 200 (Светлогорск в HTML).

---

## 2026-08-06 - Hub suburbs: title hierarchy + mobile «Ещё»

### Наблюдения
- Owner скрин блока «Значимые пригороды» (не compact my-day): крупным шёл `travelVector` + stationHub, имя пригорода («Петергоф») оказывалось mid-card.
- На mobile высокая rich-карточка (эссе + гастро + desc у каждого POI) мешала вертикальному скроллу страницы и горизонтальному swipe карусели.

### Решения
- `SuburbsCarousel` hub rich: title = `place.name` (крупный h3), subtitle = `travelVector - stationHub` (`data-city-suburb-vector`); CTA рядом с именем.
- Mobile: по умолчанию короткий layout (имя + вектор + станция + список POI без desc); essay/gastro/POI-desc за кнопкой «Ещё» / «Свернуть». Desktop `md+` - полная rich-карточка без коллапса.
- Compact my-day: позже выровнен отдельно (CTA вниз + loop arrows), иерархия name/vector сохранена.

### Проблемы
- Нет.

### Live
- Commit `915083b` (в live как предок `b40978b`); MSK **BUILD_ID=`jvN4iczAP8rqDdevfj0AW`**; smoke `/cities/saint-petersburg` 200; в HTML `data-city-suburb-title` перед `data-city-suburb-vector`, есть `data-city-suburb-expand`.

---

## 2026-08-06 - Blog share preview: og:image 404 на *-og.jpg

### Наблюдения
- Owner: «почему для статей ссылка передается без превью?» (WhatsApp/Telegram/iMessage unfurl).
- Meta на `/blog/[slug]` уже есть (`og:title/description/image`, `twitter:card=summary_large_image`), URL абсолютный https.
- `resolveBlogShareImage` всегда подставлял `/images/blog/{slug}-og.jpg`, но у большинства PUBLISHED статей файла не было → scraper получал **404** и не рисовал карточку. Cover `.jpg` при этом отдавался 200 (~2MB).

### Решения
- `resolveBlogShareImage`: брать `*-og.*` только если файл есть на диске; иначе fallback на реальный cover URL.
- Сгенерированы недостающие 1200x630 `*-og.jpg` (×117) в `apps/public/public/images/blog/` + скрипт `scripts/generate-blog-og-images.py`.
- Тест `blog-article-seo.test.ts`.

### Проблемы
- Кэш превью у Telegram/FB может держать старый «пустой» unfurl - после деплоя сбросить через debugger / `?v=` один раз.

### Live
- Commit `bdc7c39`; MSK **BUILD_ID=`lSsMWuQohOpyC2-In4hHs`**; sample `*-og.jpg` → 200; meta `og:image` указывает на существующий файл.

---

## 2026-08-06 - Home/cities mobile: formats + hubTags + sort row

### Наблюдения
- Owner: HomeCategoryStack из 3 пунктов выглядел как урезанный фильтр и сидел слишком высоко под My Day.
- hubTags городов снова ушли в колонку на mobile; карточки 42vw узкие для трёх меток в ряд.
- На `/cities` «Популярные»/«По алфавиту» wrap'ились отдельно от random CTA.

### Решения
- `HOME_MOBILE_CATEGORY_STACK`: 6 форматов (Концерты, Спектакли, Экскурсии, Музеи, Речные прогулки, Стендап); UI - 2-col grid; блок после «Куда сходить».
- `CityHubTags`: снова горизонтальный ряд; carousel `50vw` / max `176px`; чуть мельче tag text.
- `CitiesHeroSearch`: random CTA своей строкой; Популярные + По алфавиту вместе ниже.

### Проблемы
- Нет.

### Live
- Commit `092275c` (в live как предок `4ceeb769`); MSK **BUILD_ID=`dyEQk5zL6swNlXdGGDoOH`**; smoke `/` + `/cities` 200; в HTML есть Спектакли / `50vw,176px` / Популярные+По алфавиту.

---

## 2026-08-06 - Mobile catalog density (podborki / locations / blog / city / my-day)

### Наблюдения
- Owner: на `/podborki` сезонная плашка «Летом в приоритете…» лишняя в mobile шапке; scrollbar под mood-chips выглядит недоделанным.
- `/locations`: wrap-чипы типов + логистики съедают половину экрана.
- `/blog`: поиск важнее статей на мобилке - нет; CTA «Больше про …» слишком близко к мета-строке.
- City must-see: кнопки «В маршрут» без воздуха после описания.
- `/my-day`: Главные места в карусели + «Развернуть» дублируют аккордеон на мобилке.

### Решения
- Подборки: season banner `hidden md:block`; mood ScrollRail без scrollbar visual.
- Локации: горизонтальный chip-rail на mobile (swipe), wrap на md+.
- Блог: search form `hidden md:block`; CTA под мета-строкой с `gap-3` на mobile.
- City must-see actions: `my-2.5` (10px).
- My-day must-see: на mobile всегда вертикальный список; «Развернуть» только `sm+`.

### Проблемы
- Нет.

---



### Наблюдения
- Owner: noisy Instagram-style quick chips; «Реки и каналы!» лишний; города ~36vw слишком узкие для названия; Концерт/Стендап/Экскурсии в строку на мобилке; нужен My Day CTA после городов (не в hero).

### Решения
- `HomeStoriesStrip`: quiet white pills + primary-50 icon (без gradient ring); chips = Топ-подборки / Сегодня / Бесплатно; river убран из `HOME_STORIES` и `HOME_CATEGORY_CHIPS`.
- Города: `42vw` / max `152px`; hubTags `flex-col` на mobile.
- `HomeCategoryStack`: Концерты / Стендап / Экскурсии столбиком перед афишей (lg:hidden).
- `HomeMyDayBanner` после «Популярные города»: headline с `inCityPrepositional`, fallback Москва, CTA «Давай попробуем» → `buildMyDayHref`.

### Проблемы
- Нет.
- Live MSK: commit `6946684` (база `7958908`), BUILD_ID=`0zzKBuQ-FGxmWB1pht_QM`, `/` 200; chip «Реки и каналы!» отсутствует (строка остаётся только в event tags JSON).

---

## 2026-08-06 - OSM: снова убрали UA-флаг Leaflet с `/cities`

### Наблюдения
- Owner: на `/cities` после замены SVG→OSM (`ce3d376`) снова виден украинский флаг в attribution.
- Прежний фикс `e12818e` только прятал `.leaflet-attribution-flag` в `globals.css`, но upstream `leaflet.css` задаёт `display: inline !important` и при динамическом `import('leaflet/dist/leaflet.css')` перебивает hide.

### Решения
- Общий `loadDaibiletLeaflet()`: prefix без UA SVG + CSS override после leaflet.css.
- Подключено в `LocationsCatalogMap` (`/cities`, `/locations`), `DayRouteOsmMap`, `OsmMapEmbed`.
- Commit `d5de7b9`; MSK **BUILD_ID=`R3nyHuxEYbZ-N4toJ2Lxo`**; smoke `/cities` 200.

### Проблемы
- Нет.

---

## 2026-08-06 - /cities: SVG-карту заменили на OSM + pins

### Наблюдения
- Owner: текущая карта на `/cities` (упрощённый SVG silhouette + % pins) не нужна в таком виде - либо OSM с пинами, либо убрать.
- На `/cities/[slug]` отдельного map-блока нет; проблема была в index aside `RussiaMap`.
- В проекте уже есть Leaflet OSM: `LocationsCatalogMap` (`/locations`), `DayRouteOsmMap`, `OsmMapEmbed`.

### Решения
- `RussiaMap` переведён на `LocationsCatalogMap` (OSM tiles) + 11 центров крупных городов с lat/lng.
- Клик по пину → `/cities/{slug}`; подпись событий в `typeLabel` маркера.
- City.lat/lng в schema нет - для overview хватило статического списка (тот же набор, что был на SVG-доске).
- Home carousel / CityCard не трогали (параллельный агент).

### Проблемы
- Нет.

---

## 2026-08-06 - Home cities: карусель + тёмные обложки

### Наблюдения
- Owner: на мобиле города не увеличивать и не складывать в высокую колонку; нужен горизонтальный swipe.
- Светлые daytime `cities/top` после `8fd4259` не зашли - вернуть тёмные `/images/cities/*.png`.

### Решения
- Mobile: снова `ScrollRail` с компактными карточками (`~36vw` / max 132px), не full-width stack.
- Home без `imageVariant="top"`; scrim/яркость CityCard откатили к тёмному варианту.
- Hero/search не трогали.

### Проблемы
- Нет.

---

## 2026-08-06 - Home: вернули search-hero с ротацией фото

### Наблюдения
- Owner clarification: модалку «Оформили билет?» в my-day **не** убирать.
- Нужна более ранняя шапка главной: блок поиска (город / дата / категория) + смена фото, не afisha-carousel `HomeGuideHero`.

### Решения
- На `/` снова `HomeHero` + `HeroMedia` rotator (`heroFramesFromBanners` / emotion pool) поверх navy base.
- `HomeGuideHero` отключён с главной (файл в репо остаётся). Stories / cities / events ниже сохранены.
- Ticket-confirm modal в `DayRoutePanel` не трогали.
- Commit `3f1a1f9`; MSK **BUILD_ID=`1x2J9HMR87fUIVEMHeTdt`**; smoke `/` 200 (search + hero-emotion-01..06), `/my-day` 200.

### Проблемы
- Нет.

---

## 2026-08-06 - Home My Day: одна primary CTA

### Наблюдения
- Owner: убрать нижнюю secondary кнопку в правой hero-панели «Мой день» (после удаления блок выглядел пустым).

### Решения
- Убрана secondary «Собрать маршрут»; осталась одна CTA «Спланировать день».
- Панель: `justify-between`, крупнее title/subtext, больше padding, full-width CTA.
- Copy без изменений: «Спланируй свой день {prep}». Deploy не гоняли.

### Проблемы
- Нет.

---

## 2026-08-06 - `/locations`: вернули kind-чипы

### Наблюдения
- Owner screenshot SPB `/locations`: только logistics-чипы «Все точки / Причалы / Автобусы / Пешеходные» - парки, памятники, outdoor, gastro и т.д. пропали.
- Root cause: `LocationsCatalogView` после `107369d` сделал logistics primary UX и спрятал `stats.types`.

### Решения
- Primary chips снова из `LOCATION_CATALOG_TYPE_OPTIONS` + `stats.types` (с fallback extras).
- Logistics оставлены secondary quick-toggles без взаимного сброса `type`.
- В options добавлен `meeting_point`. Deploy web не гоняли.

### Проблемы
- Нет.

---

## 2026-08-06 - Home desktop: anti mobile-stretch

### Наблюдения
- Owner: mobile home ок; desktop - «mobile stretch» (50/50 hero, sausage cities, skinny blog strip, white gaps).

### Решения
- Hero: `md:grid-cols-3` - афиша-карусель `md:col-span-2` (image bg + overlay, компактнее) + Мой день `md:col-span-1` stretch; chips «Реки и каналы!» / «Бесплатно» без отката.
- Cities: mobile snap сохранён; desktop `md:grid-cols-3 lg:grid-cols-6`.
- Podborki: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`, gradient fallback `slate-900→neutral-800`, крупнее текст.
- Blog side: `lg:flex-row` мини-карточки вместо вертикальной полосы.
- Page: `bg-neutral-50`, белые карточки. Deploy не гоняли.

### Проблемы
- Нет.

---

## 2026-08-06 - Home hero: auto-rotate + My Day copy

### Наблюдения
- Owner (desktop annotations): баннер событий - auto-scroll 2с + стрелки L/R; pause hover/focus/touch; reduced-motion.
- Заголовок «Соберите маршрут в Санкт-Петербурге» звучит криво; дательного «по городу» в declension нет.

### Решения
- Auto-rotate 2с; стрелки; pause on hover/focus/touch; `prefers-reduced-motion: reduce` → без auto.
- Headline: «Спланируй свой день {inCityPrepositional(city)}»; CTA primary «Спланировать день».
- Слайды по-прежнему из live catalog (до 5), city-aware (`0dc0f9a`).
- Deploy не гоняли.

### Проблемы
- Нет.

---

## 2026-08-06 - Home hero: ротация реальных событий афиши

### Наблюдения
- Owner: главный баннер должен быть ротируемой афишей разных событий, не миксом CTA (my-day / rivers / podborki).
- Предыдущая итерация (`e11ec78`) дала snap-карусель до 5 смешанных слайдов.

### Решения
- `buildHomeHeroSlides(sessions)` - до 5 слайдов из live catalog (`/api/public/events`, popular + cover diversity); CTA на event PDP.
- City-aware: `HomeGuideHero` фильтрует сессии по выбранному городу (как `HomeGuideEvents`).
- Stories chips («Реки и каналы!», «Бесплатно» и т.д.) без изменений; my-day остаётся боковой панелью bento.
- Auto-rotate не включали - ручной snap + dots.
- Deploy web не гоняли.

### Проблемы
- Нет: при пустом каталоге один fallback-слайд на `/events`.

---

## 2026-08-05 - Home guide: stories labels + hero carousel

### Наблюдения
- Owner screenshot: chips «Река» / «Бесплатное»; главный баннер статичный («Событие недели / Друзья на набережной»).
- Нужны живые предложения (афиша, подборки, my-day), не одна CMS-карточка.

### Решения
- `HOME_STORIES` / `HOME_CATEGORY_CHIPS`: «Реки и каналы!» + «Бесплатно» (href без смены: river landing / free price filter).
- `buildHomeHeroSlides` из banners + promo landings + live events count → до 5 слайдов; `HomeGuideHero` horizontal snap + dots + peek next на mobile.
- Deploy web не гоняли (owner не просил «выкатывай»).

### Проблемы
- Нет: данные слайдов только из уже существующих home sources.

---

## 2026-08-05 - SPB must-see finish: coords backfill + city DTO headroom

### Наблюдения
- После seed 130 новых Venue были без lat/lng; `publicPublishedVenuesByCityId` требовал coords и резал city DTO до 80 - must-see slug в cityInfo были, но payload хаба их не видел.

### Решения
- `backfill-spb-mustsee-coords.js` из owner pack `spb-kgd-venue-coords.json` (76 SPB).
- City DTO: content venues без обязательных coords, cap 250/400, приоритет SPB/NN editorial slug.
- API restart + revalidate `/cities/saint-petersburg`.

### Проблемы
- Точки вне owner pack (много gastro/houses) остаются без coords до кураторского geo-pass; на хаб попадают по slug из cityInfo.

---

## 2026-08-05 - SPB must-see: seed 129 missing catalog PDPs + wire 184/184

### Наблюдения
- Owner: «линкуем и потом выкладываем» - не только hygiene 55, а добить остальные.
- Seed `seed-cityinfo-must-see-venues.js` парсил только ~21 SPB mustSee: non-greedy `[\s\S]*?` рвался на `themeTags: [...]`.
- Slugify: `map[ch] || ch` глотал `ь: ''` (falsy) → soft-sign становился `-` (`bol-shaya`).

### Решения
- Bracket-aware parseMustSee; slugify через `hasOwnProperty`; mustSee seed всегда `PUBLISHED`; existing Venue = skip (не clobber kind).
- cityInfo web+public: **184/184** со slug; MSK insert-missing: **130 inserted** / 54 skipped-exists.
- Deploy MSK: `596b16a`, BUILD_ID=`m88BYqEA8iK42Fq3pNrmq`; API restart; smoke PDP/hub 200 (ранний 500 = transient post-restart).

### Проблемы
- Часть name→kind heuristic грубая (Эрарта как ATTRACTION в dry-run inference) - на existing slug не перезаписываем; новые editorial PDP ок для хаб-линка.

---

## 2026-08-05 - SPB must-see hub ↔ catalog: hygiene after 1c6c2b5

### Наблюдения
- `1c6c2b5` уже убрал nested `places[]` с карточек хаба (Новая Голландия: Бутылка/Кузница) и UI title→PDP.
- В `cityInfo` после того фикса было **86/184** со slug, но live PDP: ~32 soft-404 («Площадка не найдена») - выдуманные `saint-petersburg-*` вне owner pack / без рабочей карточки.
- Owner pack `spb-kgd-venue-coords.json` (76) уже в MSK DB (dry-run: 76 update / 0 insert). Supplier-twins (`russkiy-muzey-c5b60…`, `kunstkamera-7781…`) часто дают **500** на PDP - не линкуем.
- Live hub уже без Бутылка/Кузница; web deploy cityInfo ещё нужен для slug-hygiene на live.

### Решения
- Срезаны soft-404 slug’ы (парки/храмы/гастро из списка 1c6c2b5 без реальной карточки) + битые twin-ссылки (Русский музей / Кунсткамера / Юсуповский / Половцов / Мясников).
- Добавлен 1:1: `Планетарий №1` → `venueSlug: planetarii-1` (PDP 200).
- Итог web `cityInfo`: **55/184 (30%)** со slug, **55/55** live PDP ok. Остальные 129 - нет рабочей каталожной сущности (hub-only).
- Seed apply не требовался (pack уже matched). Deploy нет.

### Проблемы
- Русский музей / Кунсткамера и др. остаются без хаб-линка, пока нет стабильного editorial PDP (не 500 / не soft-404).
- `apps/public` cityInfo почти без SPB slug (legacy) - Next hub = `apps/web`.

---

## 2026-08-05 - `/venues`+`/locations`: lazy cursor + снятие cap 500

### Наблюдения
- Owner: hero и kind chips ровно **500** на `/venues` и `/locations` - «где зарезано».
- Корни: `publicVenueHubRows(..., wideHub ? 2000 : 500)` в `buildPublicVenuesCatalog`; `fetchLeanPublicVenueRows` take max 2000 / default 500; client `limit: '500'`; hero от `venues.length`.

### Решения
- Hub catalog: `VENUE_CATALOG_HUB_MAX=10000`, всегда `requireEvents:false`; warm short-circuit отключён (он и держал 500).
- List: cursor pages `limit=36`, `nextCursor`/`hasMore`; total+stats от полного filtered set.
- UI: IntersectionObserver load-more; фильтры refetch первой пачки; map pins только при `showMap` (`mode=pins`).
- Cache key: `city+kind+cursor(+scale/logistics)` via `unstable_cache` v4.
- Commit+push; web deploy нет.

### Проблемы
- Total/facets всё ещё in-memory после kind-resolution (не сырой SQL COUNT(*)); при >10k venues понадобится DB cursor.

---

## 2026-08-05 - Home: витрина → персональный гид (MVP)

### Наблюдения
- Owner: главная должна вести как гид (Мой день + афиша), а не как витрина с search-hero.
- Desktop: bento (featured ~60% + «Мой день» ~40%) + category chips; mobile: stories + sticky bottom nav.
- Parallel agents трогают events/podborki/venues - правки держали в home-файлах.

### Решения
- Новый каркас: HomeGuideHero, HomeStoriesStrip, HomeBottomNav, HomeGuideEvents, HomePageSkeleton.
- Порядок секций: hero → города → «Куда сходить» → lucky-pick → bento подборки → blog magazine → live trust strip.
- Brand primary/sky; дефис; без «Питер»; без fake reviews.
- Suspense + brand-tinted skeleton; pb-24 + fixed bottom nav на mobile.
- Commit+push; web deploy не делали.

### Проблемы
- Старый HomeHero / HomeCityAwareSections пока в репо (не подключены) - можно вычистить отдельным PR.

---

## 2026-08-05 - spb-s-rebenkom-v-dozhd: «провести» на live CMS

### Наблюдения
- Owner видел на `/blog` строку «Планетарий… как собрать…» и называл её заголовком.
- В MD/`blog-posts.ts` это **excerpt** (уже «провести» с `2fde4d1`); `title`/`seoH1` - «Куда сходить…», без «собрать». В `blog-article-bodies` title нет.
- Live Article после `2fde4d1` ещё держал старый excerpt: upsert не делали; плюс in-memory public API cache.

### Решения
- MSK: `blog-upsert-articles.js --slug=spb-s-rebenkom-v-dozhd` (status остался PUBLISHED).
- Bust API cache (`/api/public/destinations?refresh=1`) + Next revalidate tags `blog-page`/`articles` paths `/blog` + article.
- Smoke: DB/API/local Next/public - excerpt с «провести». Web deploy не делали.

### Проблемы
- Прямой DB upsert не инвалидирует `withPublicResponseCache` у API - нужен refresh/restart.

---

## 2026-08-05 - `/cities` hub: из справочника в увлекательный хаб

### Наблюдения
- Owner: `/cities` выглядел как телефонный справочник - длинные text-heavy карточки, без вайба и без play.
- Нужен shippable срез: сетка, vibe-теги, CountUp, random city, лёгкая карта без тяжёлых deps.

### Решения
- Route: `apps/web/app/cities/page.tsx` + `CitiesCatalogView` / `CityCard` / `CitiesHeroSearch` / `RussiaMap`.
- Компактная сетка 2→4 колонок; descriptions убраны с листинга; hover lift + primary-blue shadow (не orange/purple).
- Статический `city-vibe-tags.ts` (emoji + label, дефис); hubTags chips остаются.
- `CountUp`: IntersectionObserver + rAF 0→N.
- `LuckyCityButton`: roulette имён + модалка «Как насчет {город}?» + CTA хаб/афиша.
- `RussiaMap`: simplified SVG pin-board с tooltip «Город: N событий» (без topoJSON).
- Deploy не делали (канон batch / по запросу).

### Проблемы
- Нет.

---

## 2026-08-05 - /podborki Bento + mood filters

### Наблюдения
- Owner: `/podborki` выглядел как одинаковый список; нужны вовлекающие карточки (фото/градиент), mood chips, разноразмерная сетка.

### Решения
- Mood filters (клиент): Романтическое / С друзьями / С детьми / Под дождь / Бюджетно - `podborki-moods.ts` (slug map + heuristics, без Prisma).
- Bento: `podborki-bento.ts` - river/city-day/seasonal/топ → 2 cols, standup/niche → 1; сетка в `LandingsCatalogView`.
- Карточки: cover или brand gradient (primary/sky/cyan); badges событий + «от X ₽»/«Бесплатно»; hover scale ~1.08; backdrop-blur.
- Netflix-ряд «Популярно в {город}» под bento. Deploy не делали.

### Проблемы
- Нет.

---

## 2026-08-05 - Catalog /events conversion polish (MVP)

### Наблюдения
- Owner: каталог `/events` должен быть конверсионным и визуально дорогим (brand primary/sky, не dark-orange template).

### Решения
- Sticky filter bar (mobile+desktop): backdrop-blur; категории с иконками; active = primary.
- Быстрые тогглы в sticky: Сегодня / Завтра / Бесплатные / С детьми (`date`, `minPrice/maxPrice=0`, `ageMax=12`) - без ломки SEO URL.
- EventCard: date badge на cover; убраны fake ★/посетили; hover CTA «Выбрать сеанс» → event; цена через `formatPriceFrom`.
- Skeleton pulse-карточки при подгрузке; page SEO-пагинация сохранена (infinite scroll не добавляли).
- Deferred: split map view, sticky mini-cart.
- Commit+push; web deploy нет.

### Проблемы
- Нет.

---

## 2026-08-05 - spb-s-rebenkom-v-dozhd: «провести» на live CMS

### Наблюдения
- Owner видел на `/blog` строку «Планетарий… как собрать…» и называл её заголовком.
- В MD/`blog-posts.ts` это **excerpt** (уже «провести» с `2fde4d1`); `title`/`seoH1` - «Куда сходить…», без «собрать». В `blog-article-bodies` title нет.
- Live Article после `2fde4d1` ещё держал старый excerpt: upsert не делали; плюс in-memory public API cache.

### Решения
- MSK: `blog-upsert-articles.js --slug=spb-s-rebenkom-v-dozhd` (status остался PUBLISHED).
- Bust API cache (`/api/public/destinations?refresh=1`) + Next revalidate tags `blog-page`/`articles` paths `/blog` + article.
- Smoke: DB/API/local Next/public - excerpt с «провести». Web deploy не делали.

### Проблемы
- Прямой DB upsert не инвалидирует `withPublicResponseCache` у API - нужен refresh/restart.

---

## 2026-08-05 - Hub suburbs: bulk «В маршрут» у вектора

### Наблюдения
- Owner скрин Петергоф: per-item «В маршрут» у пунктов ol и нижняя кнопка - лишние; смысл - добавить пригород разом. Лейбл «Станция:» звучит сухо.

### Решения
- `CitySignificantSuburbsBlock`: убраны per-row и нижний CTA; одна bulk-кнопка рядом с `<h2>` вектора (бейдж → h2 → «В маршрут»); имя пригорода остаётся `<h3>`; без вектора кнопка у `<h2>` имени.
- `AddManyToDayRouteButton`: добавляет все nested POI слайда одним тапом (stub id из `9c188c9` сохранён).
- Лейбл «Станция:» → «Где выходить:».
- Deploy не делали.

### Проблемы
- Нет.

---

## 2026-08-05 - /blog mobile UX (owner markup)

### Наблюдения
- Owner mobile скрины `/blog`: зачёркнуты topic chips и grid/list toggle; поиск/селекты и карточки слишком низкие по touch-target.

### Решения
- Topic chips в `BlogListHero`: `hidden md:flex` (desktop оставляем).
- View toggle в `BlogListFiltered`: `hidden md:inline-flex`; ниже md всегда magazine (`matchMedia`).
- Search + city/author selects: mobile ~h-14 / text-base, desktop прежние размеры.
- `BlogPostCard` + `BlogFeaturedHero` (+ «Свежее» thumbs): +30-40% min-h/padding/thumbs на &lt;md.
- Excerpt `spb-s-rebenkom-v-dozhd`: «собрать» → «провести» (MD + `blog-posts.ts`).
- Commit+push `2fde4d1`; web deploy не делали.

### Проблемы
- Prod DB excerpt обновится при следующем upsert/seed по запросу owner (локальный source уже «провести»).

---

## 2026-08-05 - MSK deploy: blog card UX + SPB suburbs

### Наблюдения
- Owner: «выкатывай». Ahead of live BUILD_ID `LV0jzT3jaueTAOmX202ic` / web `c8f43ae`: `feb7a61`/`a6c06b7` (blog clamp/serif/contextual CTA) + `9c188c9` (SPB suburbs: h2, ol, В маршрут stubs, no Day-trip).
- Lock clear; MSK-only `BRANCH=feat/next-monorepo ./deploy/scripts/deploy-prod-next.sh` (не SPB .16).

### Решения
- Deploy complete: HEAD `9c188c9`, BUILD_ID=`Jsmb7n_Z-x0_R9CMBr80P`.
- Smoke `/blog` 200: client chunk содержит шаблон «Больше про » + short names (Питер/Москву); `font-serif` на карточках; mid-sentence `line-clamp` снят с lead/excerpt.
- Smoke city hub SPB (`/cities/saint-petersburg`, legacy `sankt-peterburg` → canonical): 200; h2 «Значимые пригороды»; Кронштадт с «В маршрут»; nested `<ol>`; Day-trip отсутствует.
- Warm note: одноразовый 500 на SPB hub mid-warm; повторный smoke 200.

### Проблемы
- Нет.

---

## 2026-08-05 - Hub: пригороды SPB (copy / h2 / «В маршрут»)

### Наблюдения
- Owner скрин блока «Значимые пригороды»: intro с «Day-trip», заголовок не h2, на каждой nested-строке бейдж «пригород», у Кронштадта «В маршрут» только у 1-й и 4-й точек.

### Решения
- Intro → «Поездка на день рядом с городом - …»; убран user-facing day-trip в KGD suburb desc и Project.md.
- Заголовок блока → `<h2>`, имя пригорода (Кронштадт и др.) → `<h3>`; nested POI → `<ol>` без лейбла «пригород» на строках.
- Root cause пропавших кнопок: у Якорной площади / Острова фортов / Петровского дока нет `locationSlug`/`venueSlug`, `dayRouteItemFromMustSee` возвращал `null`. Для `isSuburb` добавлен стабильный editorial stub `suburb:{translit}` - «В маршрут» у каждой точки списка.
- Deploy не делали (owner не просил).

### Проблемы
- Нет.

---

## 2026-08-05 - UX: blog cards polish (clamp / serif / CTA)

### Наблюдения
- Owner после deploy BUILD_ID `LV0jzT3jaueTAOmX202ic`: mid-sentence ellipsis на лидах large/lead; правая колонка magazine с `font-display` vs serif слева; CTA `ml-auto`/`justify-between` на узких карточках; универсальное «Смотреть события».

### Решения
- Убран агрессивный `line-clamp` с excerpt (large/lead/strip/small/list rows); лид живёт в доступной высоте карточки.
- Заголовки magazine + list rows → единый `font-serif`.
- Meta+CTA: `flex-wrap` без `justify-between`/`ml-auto` - CTA слева рядом/под meta.
- `resolveBlogListingCta`: город → «Больше про Питер/Москву/…»; иначе тема (концерты/прогулки/маршруты); fallback «Смотреть афишу».
- Deploy MSK по запросу owner (не в этой итерации).

### Проблемы
- Нет.

---

## 2026-08-05 - UX: blog materials filter under hero + CTA row

### Наблюдения
- Owner: фильтр «Все города / авторы / Найдено» визуально не под hero.
- Root cause: selects были до featured, но «Найдено» жило внутри `feedBody` **после** «материала недели» - блок фильтра выглядел разорванным / ниже.
- Header CityPicker на `/blog` уже `persist` и `/blog` не в `CITY_FILTER_PATHS`; live без deploy мог ещё показывать старый hard-filter.

### Решения
- `BlogListFiltered`: единый materials bar (selects + toggle + Найдено) сразу под hero, до featured/ленты.
- CTA: «Смотреть события», в одной строке с meta, `ml-auto`.
- Тест: `/blog` не city-filter path.

### Проблемы
- Нет. Deploy ждёт «выкатывай».

---

## 2026-08-05 - UX: visual anchors на ленте `/blog`

### Наблюдения
- Owner: уточнил index-driven якоря (lead / каждая 5-я quote без фото), микроанимации, сочные теги, без серых дыр.

### Решения
- Magazine/list: index 0 → `lead`, index % 5 === 4 → `quote` (яркий градиент, без cover).
- Теги: solid color chips; quote surface по теме; CTA `ArrowRight` + `hover:translate-x-1` / `hover:scale-[1.01]`.
- Пустые slug/title не рендерим; без cover - gradient fallback, не серая плита.

### Проблемы
- Нет. Deploy ждёт «выкатывай».

---

## 2026-08-05 - UX: оживление ленты `/blog`

### Наблюдения
- Owner: лента скучная из-за серого фона, однотипной сетки, слабых заголовков и серых заглушек.

### Решения
- `BlogFeaturedHero`: full-bleed cover + текст поверх (serif H2, primary CTA).
- `BlogMagazineGrid`: rhythm trio → banner → strip + editorial break из excerpt featured.
- Карточки: крупнее titles, цветные tag/city chips (`blogTagBadgeClassName`), primary quick-links, BookOpen fallbacks.
- Skeleton/empty: sky/primary gradient вместо flat slate.

### Проблемы
- Нет. Deploy MSK ждёт «выкатывай».

---

## 2026-08-05 - Blog: скрыть сегодняшние статьи кроме «Барный Петербург»

### Наблюдения
- Owner: постепенная публикация - на сайте оставить только «Барный Петербург»; остальные материалы от 2026-08-05 спрятать.
- Top-100 ×5 и Beyond ×7 уже DRAFT (`5b288fa`) - не трогали.

### Решения
- ×5 районных гидов → `status: DRAFT`, `isIndexable: false`:
  `spb-zolotoy-treugolnik-za-1-den`, `spb-vasilevskiy-ostrov-marshrut`, `spb-petrogradskaya-storona`, `spb-kolomna-kanaly`, `spb-vladimirskaya-gastro`.
- Публичным остаётся `spb-barnyy-peterburg-ryumochnye-spikizi` (PUBLISHED).
- В `blog-posts.ts` этих slug не было. Live: upsert DRAFT на MSK + revalidate `/blog` (без web deploy).
- MSK 2026-08-05: upsert ×5 DRAFT/`isIndexable=false`; API `article:null` + soft-404 title; listing без ×5; барный гид PUBLISHED в ленте.

### Проблемы
- Нет. Web deploy не нужен - soft-404 для DRAFT уже live с Top-100 (`61f676e`).

---

## 2026-08-05 - Landing price labels: range / explicit «от»

### Наблюдения
- Live `/moscow/den-goroda`: в строках расписания показывали min как фикс (strip `от` у `formatMoney`).
- У `EventGroup` уже были `priceFrom`/`priceTo` из `resolveSessionPriceRange`; bridges уже рендерил через `formatMoneyRange`.

### Решения
- `LandingScheduleRow` / dinner row / table / editorial facts: `formatMoneyRange(min, max)` → `мин-макс ₽` или `от мин ₽`.
- Зеркало в `apps/public` `LandingPage.tsx`. Код в `be2f075` (push вместе с blog DRAFT). Deploy MSK не делали - ждём owner.

### Проблемы
- Нет. Per-session DTO по-прежнему отдаёт только min билета; range на карточке = разброс mins по сессиям группы.

---

## 2026-08-05 - /blog: decouple header city + materials filter after hero

### Наблюдения
- Owner: статьи блога жёстко завязаны на город в шапке - смена CityPicker прятала чужие материалы.
- `BlogListingBody` + `BlogListFiltered` hard-filter по `useBlogHeaderCity`; `resolveCityChangeNav` на `/blog` вёл на `?city=`.

### Решения
- Лента `/blog` кросс-городская по умолчанию: header city не фильтрует и не меняет featured/feed split.
- In-page фильтр (город + автор) сразу после hero; при активном `?city=`/`?author=`/`topic`/`q` - результаты над блоком «Материал недели»; idle - hero → featured → feed.
- `resolveCityChangeNav`: blog → `persist` (как home/my-day), без авто-`?city=`.

### Проблемы
- Нет. Commit+push без MSK deploy (batch cadence).

---

## 2026-08-05 - Catalog LocationCard: strip Venue crumb tails

### Наблюдения
- После MSK smoke: hub must-see крошки уже срезаны (`preferEditorial` + `stripLocationCrumbTail`), но `/locations` карточка (Троицкий мост) всё ещё заканчивалась на «Нева» - `LocationCard` брал raw `hookFact`/`shortDescription` в обход `dayRouteHookLine`.

### Решения
- `LocationCard` и `InstitutionCard`: blurb через `dayRouteHookLine` (тот же `stripLocationCrumbTail`).
- Тест на catalog-хвост «Ракурс на крепость и ростральные колонны. Нева».
- DB batch clean не делали - display strip durable; следующий web deploy подхватит.

### Проблемы
- Нет. Commit+push без deploy (owner только что задеплоил).

---

## 2026-08-05 - /locations: почему нет сгенерированных фото + фикс overlay

### Наблюдения
- Owner: «почему мы не используем сгенерированные фото в локациях?»
- Wiring уже был: `resolveVenueHeroImage` → SSR `toVenueCatalogCard` / PDP. Эталон JPG в `apps/public/public/images/venues/` (+ sync на build в gitignored `apps/web/public/images`).
- В map только NN pack (~46) + SPB Главные 1-12 + мечеть. Mass Top-100 AI stills (~63 orphan JPG на диске) намеренно сняты из map (owner: нереалистично).
- Баг: city-scoped refetch в `LocationsCatalogView` брал raw `/api/public/venues` **без** editorial overlay → карточки с выбранным городом снова показывали stub/gradient.

### Решения
- `LocationsCatalogView`: `toVenueCatalogCard` на client fetch (как DayRoutePanel / SSR list).
- `VenuePageView`: `withEditorialHero` на soft-nav client fetch.
- Тесты editorial override / stub drop; комментарий map без Top-100.

### Проблемы
- Большинству локаций каталога фото просто не генерировали. Кураторский batch / реальные covers - отдельно; не возвращать mass Top-100 AI в map без OK owner.

---

## 2026-08-05 - SPB hub: editorial blurbs over Venue crumbs

### Наблюдения
- Owner screenshot карточек «В маршрут» (Троицкий мост, Зодчего Росси, Рубинштейна, Университетская наб., Царскосельский лицей, Юсуповский): хвосты-крошки (`Нева`, `пл. Островского`, `Владимирская`, `Васильевский`), строчная у лицея, обрезка mid-thought (`где...`, `Один из...`).
- В `cityInfo` mustSee крошки уже срезаны (`3a41e8f8`); на UI снова появлялись, потому что `dayRouteHookLine` брал Venue `hookFact`/`shortDescription` (старый seed с хвостами и усечением) поверх editorial `desc`.
- Suburb nested POI: 53+ `desc` со строчной буквы в seed (лицей и др.).

### Решения
- Hub / my-day must-see: `preferEditorial: true` - сначала `cityInfo.desc`, Venue только fallback.
- `stripLocationCrumbTail` в `dayRouteHookLine` (defense-in-depth для venue blurbs).
- Seed web+public: capitalize SPB lowercase descs; rewrite 6 annotated blurbs без крошек и без mid-cut.

### Проблемы
- Нет. Commit+push без deploy (по запросу owner).

---

## 2026-08-05 - OUTDOOR reclassify (all cities) + GASTRO + шапка

### Наблюдения
- После SPB/KGD-патча в MSK осталось ~298 `OUTDOOR_LOCATION` (соборы, кремли, рынки) по всем городам.
- Кафе/рестораны в `/locations` лежали как `ATTRACTION`; UI-тип «Гастро» отсутствовал в Prisma.
- В шапке лейбл «Город» / allLabel «Все города» путал с blog-фильтром.

### Решения
- `VenueKind.GASTRO` (location family) + UI label «Гастро»; `CLUB_BAR_RESTAURANT` остаётся institution `/venues`.
- Расширены `venue-kind-heuristics` + `reclassify-outdoor-buildings.js --cities=all` + `reclassify-location-gastro.js`.
- Шапка: `SiteHeader` / public `Header` allLabel и mobile section → «Фильтр по городу» (blog «Все города» не трогали).
- MSK: migrate GASTRO → outdoor 116 (93 ATTRACTION / 11 PARK / 10 MONUMENT / 2 GASTRO) → location gastro итого 12 → restart `daibilet-api`. Web deploy отложен (batch; лейбл шапки на live после batch).

### Проблемы
- Нет. Лейбл шапки на live после web batch.

---

## 2026-08-05 - Outdoor vs Attraction: здания не «Открытая локация»

### Наблюдения
- Чип `/locations?type=outdoor_location` в СПб показывал особняки, дворцы, Адмиралтейство - это здания, не открытый уличный доступ.
- Маппинг: UI `outdoor_location` ← Prisma `OUTDOOR_LOCATION` («Открытая локация»); `attraction` ← `ATTRACTION` («Достопримечательность»). Stored kind побеждает в `resolvePublicVenueKind`.

### Решения
- Канон: outdoor = улица/мост/набережная/площадь/ворота/открытый комплекс; здания → `ATTRACTION`.
- Эвристики: `scripts/lib/venue-kind-heuristics.js` + `scripts/reclassify-outdoor-buildings.js`; seed/enrich must-see переведены на общий infer.
- MSK DB: 41 row (SPB 33 + KGD 8): 39→ATTRACTION, 1→MONUMENT (Медный всадник), 1→PARK (Танцующий лес). API restart. Web deploy не нужен.

### Проблемы
- Нет. Живые outdoors (Дворцовая площадь, мосты, набережные, ворота KGD) остались `OUTDOOR_LOCATION`.

---

## 2026-08-05 - KGD gastro → каталог /locations (owner override)

### Наблюдения
- Ранее 5 gastro в KGD mustSee оставлены hub-only (нет owner FOOD-pack как у SPB).
- Owner: если события не продаём - точка всё равно должна быть в каталоге локаций (`/locations`), не только на хабе.

### Решения
- Kind `ATTRACTION` + `familyHint: location` → `publicVenuePageTemplate` = location (`/locations/...`). Не `CLUB_BAR_RESTAURANT` (institution → `/venues`).
- Пакет `scripts/data/must-see-editorial-kaliningrad-gastro.json` (5) merged в city + `must-see-editorial.json`; `locationSlug` в web/public `cityInfo`.
- Hub-only остаётся только «Здание Кёнигсбергской биржи» (антидубль музея ИЗО).
- MSK: `enrich-must-see-editorial.js --apply --file=...gastro.json`; listing после DB (+ cache); hub-ссылки - после web deploy cityInfo.

### Проблемы
- Параллельный MSK web deploy: DB seed применён без ожидания; web cityInfo в FF `d4e99de`→`2f2e24de`, BUILD_ID=`6J6_Y3VwcR1r3vzfJltw6`. Ранний smoke: 500 на 2 PDP (transient); финал: location 25→30, institution 24, 5/5 PDP 200, hub `/cities/kaliningrad` 200.

---

## 2026-08-05 - Top-100 + Beyond: полностью скрыть с сайта (DRAFT)

### Наблюдения
- Owner правит обе серии в админке; с публичного блога убрать целиком. Place-фото оставить для locations / my-day.

### Решения
- MD ×12 (`spb-top-100-*`, `spb-beyond-top100-*`): `status: DRAFT`, `isIndexable: false`.
- Убраны из `BLOG_POSTS` static feed.
- `SAINT_PETERSBURG_IMAGES`: снова map linked Top-100 places → venues JPG для catalog/PDP/my-day.

### Проблемы
- Нет.

---

## 2026-08-06 - My Day stop cards: offers below main row

### Наблюдения
- Owner screenshot: event/ticket pills перекрывали ~time/km на stop cards. Чисто читался только «Руки Вверх Бар» (без commerce chips в той же flex-строке).

### Решения
- Root: commerceRail стоял sibling в lex-wrap рядом с title/meta/actions (owner-v7 / place-event-row) - при wrap чипы залезали на travel meta.
- Layout owner-v8 / place-then-offers: main row = thumb+N + title/city + time/km + maps/X; offer chips - отдельный full-width ряд ниже с gap. Title·price сохранены.
- Файл: DayRoutePanel.client.tsx. Commit+push; deploy нет.

### Проблемы
- Нет.

---

## 2026-08-05 - My Day stop cards: horizontal offer chips + title

### Наблюдения
- Owner SPB screens: stop-card commerce - варианты событий столбиком справа с дырой в строке; на Comedy Club / Stand Up видно только «Купить билет от X ₽» без имени события.

### Решения
- Root layout: `commerceRail` был `flex-col` + `sm:w-[11.5rem] sm:items-end` (фикс CTA wrap 2026-08-05) - узкая правая колонка. Заменено на `flex flex-row flex-wrap items-center gap-2` chips в общей строке stop-card.
- Root title: ticket CTA рендерил только `formatDayRouteBuyCtaParts` («Купить билет» / цена) без match/venue name. Добавлены `resolveDayRouteOfferTitle` + `formatDayRouteOfferChip` (`Title · от N ₽`); admission/linked match поднимают placeholder title.
- Файлы: `DayRoutePanel.client.tsx`, `day-route-commercial.ts` (+test). Commit+push; deploy нет.

### Проблемы
- Нет.

---

### Наблюдения
- Owner: серия ещё не должна быть в поисковиках; массовые GenerateImage place-кадры не привязаны к реальности.

### Решения
- `isIndexable: false` в frontmatter Parts 1-5; `blog-upsert` читает флаг (PUBLISHED + noindex).
- Убраны per-place `[image]` из тел; возвращены 1-2 atmospheric inline.
- Из `SAINT_PETERSBURG_IMAGES` сняты Top-100 extensions (остались Главные 1-12 + мечеть).

### Проблемы
- Пересъём/кураторские фото по локациям - отдельный проход, не GenerateImage mass.

---

## 2026-08-05 - Top-100: фото на каждую локацию + reuse в my-day/каталоге

### Наблюдения
- В статьях серии Top-100 (части 1-5, точки 1-75) было только cover + 1-2 inline - longread без визуала у мест.
- Owner: компактные float left/right в тексте; те же кадры - в my-day и каталоге `/locations`/`/venues` (object-cover под нужный aspect).

### Решения
- GenerateImage/copy → `apps/public/public/images/blog/spb-top-100-p{NN}-*.jpg` (75 шт.) + копии в `venues/saint-petersburg/` для linked slug.
- В MD: `[image side=left|right]` после первого абзаца каждой `### N`; старые общие `-inline` убраны; `blog:sync-bodies`.
- `BlogArticleContent`: при ≥3 inline все float (не full-width первое).
- `resolveVenueHeroImage` + `toVenueCatalogCard` + `VenueDetailPage` / share meta - editorial wins над hub stub.

### Проблемы
- Нет. Live 2026-08-05: MSK `3ebcaa2`, BUILD_ID=`qL0Q5LhLLeWqYil3I48D6`; `blog:upsert` ×5 Top-100; smoke parts 1/2/5 → 200 + 15 unique place imgs; assets blog/venues 200.

---

## 2026-08-05 - KGD city mustSee → каталог /locations|/venues

### Наблюдения
- Owner: «все локации Калининграда по ходу так и не доехали в каталог».
- Live API: ~9 `family=location`, ~16-17 `family=institution` для kaliningrad. Owner pack KGD-001…011 закрыл только узкий набор; в `cityInfo.mustSee` 35 точек, из них wired было 5, остальные hub-only.
- Парки / ворота / храмы / outdoor без Venue не попадали в `/locations`; музеи без seed - не в `/venues`.

### Решения
- Канон-пакет `scripts/data/must-see-editorial-kaliningrad-city.json` (24 city places) + merge в `must-see-editorial.json`; slug wiring в web/public `cityInfo`.
- Виды: музеи → `MUSEUM_ART_SPACE` (/venues); кирха Св. Семейства → `CONCERT_HALL` (филармония); парки/озера/зоопарк → `PARK`; памятники → `MONUMENT`; ворота/храмы/районы/Дом Советов → `OUTDOOR_LOCATION`.
- Hub-only намеренно: 5 gastro (нет owner-verified FOOD-строк, в отличие от SPB) + «Здание Кёнигсбергской биржи» (антидубль здания музея ИЗО).
- SignificantSuburbs не раздуваем в city-каталог сверх уже seeded POI. Apply на MSK через `enrich-must-see-editorial.js --apply --file=...`.

### Проблемы
- Hub title-links на новые slug требуют web deploy (batch / «выкатывай»). Каталог listing - после MSK DB seed + API cache.
- Первый apply с proximity-dedupe (<100м без title) перезаписал собор островом Канта и схлопнул два памятника у БФУ. Починено `repair-kgd-mustsee-dedupe.js` + ужесточение match в enrich (title/address/slug, не coords alone).

---

## 2026-08-05 - My Day: мечеть ← МТС Live Hall (ложный name-match)

### Наблюдения
- Карточка «Санкт-Петербургская соборная мечеть» в must-see /my-day показывала Ded Moroz + текст «Высокотехнологичный многоуровневый концертный комплекс…» и truncate заголовка.
- Root: `namesLooselyMatch` склеивал мечеть с venue `mts-live-holl-sankt-peterburg` по гео-токенам «санкт»+«петербург»; hook брал `shortDescription`/`heroImageUrl` чужой площадки. У мечети не было `locationSlug`.
- Follow-up owner: на «странице мечети» видно новогоднее шоу «Анна и Эльза». E2E: событие `evt_6a46c069…` корректно на МТС (`venue_67af2b9a…`, ~5.3 км от мечети). В БД уже был TC-stub `sobornaya-mechet-652d…` (coords верные, `MEETING_POINT`/`NONE`) - public API отдавал null, hub уводил на МТС PDP с афишей зала.

### Решения
- Гео-шум в `namesLooselyMatch`; при явном slug без hub-hit - без name-fallback; `locationSlug` + editorial cover/coords; title `line-clamp-2`; seed-запись в `must-see-editorial.json`.
- MSK content: `scripts/fix-spb-sobornaya-mechet-venue.js --apply` - promote stub → `saint-petersburg-sobornaya-mechet`, `ATTRACTION`/`PUBLISHED`, editorial profile; Anna/Elza venueId не трогали. Revalidate `/locations/saint-petersburg-sobornaya-mechet`.
- Smoke: mosque PDP title = мечеть; nearby без Анны/Эльзы/МТС; событие остаётся на МТС Live.

### Проблемы
- Matcher/geo-noise в live Next bundle ещё нужен web deploy («выкатывай») - иначе My Day/hub без явного slug могут снова склеить с МТС на старом клиенте. PDP по editorial slug уже живой после DB+revalidate.

---

## 2026-08-05 - My Day stop rail: buy CTA / match title wrap

### Наблюдения
- Owner: правый рельс списка остановок «Мой день» ломал CTA - иконка билета визуально между «билет» и «от», рубль «₽» уезжал на третью строку; длинные matched-title резались mid-word.
- Root: `commerceRail` в `DayRoutePanel` - одна строка `Купить билет от N ₽` + icon в `inline-flex` при слишком узкой колонке (`min-w-0` / `max-w 42%` без стабильной ширины).

### Решения
- `formatDayRouteBuyCtaParts`: action / price раздельно; UI `[icon] Купить билет` + `от N ₽` с `whitespace-nowrap tabular-nums`.
- Rail: `sm:w-[11.5rem] sm:shrink-0`; event pick - `line-clamp-2` + цена отдельной строкой.
- Commit+push only; live нужен batch/«выкатывай».

### Проблемы
- Нет.

---

### Наблюдения
- Live `/locations/osobnyak-polovcova`: блок «Рядом» (geo 300м, без STOP) показывал 12 карточек - 5× «Queen в Особняке Половцова» (цены 1500/1750/3000) и 6× одинаковая «Обзорная… Исаакиевский собор» по 1200.
- Root cause: `loadNearbyEventsForVenue` отдавал сырые `Event` rows без схлопывания; TC = один продукт на много session-id/slug. Тот же класс бага, что `/my-day` matches (2026-08-03, title-first dedupe).

### Решения
- Backend: `dedupePublicVenueLinkedEvents` (title+venue, min `priceFrom`) до slice(12) в nearby; тот же pass на stopEvents.
- Web safety-net: `dedupeVenueLinkedEvents` в `day-route-score` + `LocationVenueLayout` (`data-venue-linked-events-deduped`).
- UI по-прежнему `formatMoney` → «от X ₽». Radius/STOP-gate без изменений.

### Проблемы
- Закрыто 2026-08-05 MSK: git pull 97a6ad8->0f5e847, systemctl restart daibilet-api, BRANCH=feat/next-monorepo deploy-prod-next. BUILD_ID 8Fo0L9-oGyooggq9uzfYC -> H2fqyKT5FuijMNsiHKmPr. Smoke: nearby Polovtsov 4 unique titles (1x Queen), /locations without soon-excursion copy, flex-wrap chips, new BUILD_ID static 200 / old 404.

---

## 2026-08-05 - Locations: СПб must-see не были в каталоге

### Наблюдения
- Owner: «В locations так и нет добавленных новых объектов» при фильтре Санкт-Петербург.
- В MSK DB owner pack уже был (76 SPB / 11 KGD matched): seed `enrich-must-see-editorial` отработал раньше.
- Глобальный `/api/public/venues?family=location` не отдавал Петропавловскую, Невский, Спас и др.: content-place union в `fetchLeanPublicVenueRows` был `take:400` по A→Z, а до «П» уже 585 точек.
- SSR Locations грузил warm/global список без city; клиент только фильтровал по имени - отсутствующие в global не появлялись.
- Стем «казан» от «Казань» ложно ставил город «Казань» на «Казанский собор» (СПб).

### Решения
- Content-place take поднят до `min(max(take,500),2000)`.
- Location family каталог: без warm short-circuit, hub `requireEvents:false` + limit 2000.
- `LocationsCatalogView`: city-scoped refetch `?family=location&city=…`.
- `inferCityNameFromText` / `resolvePublicVenueCity`: word-boundary stem + приоритет DB city.
- Hygiene: канон slug Казанского собора, kind кафедрального собора КГД.

### Проблемы
- Музеи (Эрмитаж и др.) остаются family=institution → `/venues`, не `/locations` (канон venueSlug).

---

## 2026-08-05 - Deploy cadence: batch / по запросу

### Наблюдения
- Частые per-iteration MSK deploy тормозили работу: 10–20 мин build, deploy-lock между агентами, нестабильный live BUILD_ID.
- Owner подтвердил смену канона: основная часть локально, деплой общим раз в сутки / по запросу.

### Решения
- `.cursorrules` + `Project.md`: авто **commit + push** после продуктовой итерации; **web deploy** - nightly/batch или явный «выкатывай»; исключения сразу для live 500 / critical redirect / security / unblockable launch-blocker.
- Seed/apply prod DB - по запросу или в том же batch.
- Docs-only без изменений: commit + push, без deploy.

### Проблемы
- Нет. Уже запущенные деплои в очереди докатываются; новые итерации без явного запроса на live не деплоим.

---

## 2026-08-05 - Blog longread: один body-размер по эталону owner

### Наблюдения
- Owner: агент «втюхивает» свой стандарт вместо эталона (тёмный mockup / MD).
- Catchphrase был меньше body (`0.9375rem`), H2/H3 на `font-display`, pull-quote гигантский, «Адрес» с левой полосой как tip.

### Решения
- Единый `BODY_TEXT_CLASS` для абзацев, tip-callout, списков, lead.
- Tagline = тот же размер + `font-bold` (без уменьшения).
- Tip callout (`Атмосферная деталь` / `Практический совет` / `Лайфхак`): border-l + body size; `Адрес` - plain body без rail.
- H2/H3 без `font-display` / без underline border-b; pull-quote больше не text-xl/2xl.

### Проблемы
- Нужен web deploy, чтобы увидеть на live.

---

## 2026-08-05 - Venue PDP: setCity не должен выкидывать на /venues

### Наблюдения
- Owner: `/venues/ermitazh` открывается и сразу уводит на общий каталог площадок.
- Причина: `VenuePageView` синхронизировал город хедера через `setCity`, а `resolveCityChangeNav` для PDP `/venues/[slug]` всегда делает navigate → `/venues?city=…`.

### Решения
- `SetCityOptions.persistOnly`: только persist + label, без router navigation.
- `VenuePageView` sync города: `{ skipRouteConfirm: true, persistOnly: true }`.
- Ручная смена города в хедере по-прежнему уводит с PDP на индекс секции (канон).

### Проблемы
- Нет.

---

## 2026-08-05 - SPB mustSee: убрать адресные хвосты из аннотаций

### Наблюдения
- Owner screenshot хаба СПБ «Главные места»: в аннотациях карточек хвосты локаций (`Дворцовая`, `Центр`, `Адмиралтейская`, `канал Грибоедова`, `Петроградская / Заячий`).
- Источник: `desc` в `cityInfo` mustSee (короткие blurbs + crumb). Адрес/метро должны жить в address field, не в 2-строчной аннотации.

### Решения
- Срезаны location crumbs из SPB `mustSee.desc` в `apps/web` и `apps/public` `cityInfo.ts` (editorial sentence only; пунктуация на конце).
- Главные 1-12 в web уже были длинным editorial без хвостов; почищены остальные фильтры + public short blurbs.

### Проблемы
- Нет.

---

## 2026-08-05 - /my-day SPB: editorial covers для Главных 1-12

### Наблюдения
- Owner screenshot: «Выбор Дайбилет» (Советы) и chips «Главные места» SPB показывали dark gradient / MapPin вместо фото (Эрмитаж, Петропавловка, Дворцовая, Исаакий, Спас на Крови…).
- Hub `heroImageUrl` часто dark `/venues/generated` stub; editorial fallback был только для NN.

### Решения
- 12 GenerateImage → `apps/public/public/images/venues/saint-petersburg/*.jpg`.
- `city-place-images.ts`: `SAINT_PETERSBURG_IMAGES` по slug из `cityInfo` mustSee (venueSlug / locationSlug); `dayRouteItemFromMustSee` editorial wins over hub stub.

### Проблемы
- Нет.

---

## 2026-08-05 - Blog hero: перенос перед «Часть N» в сериях Top-100

### Наблюдения
- Owner: H1 Part 1 «Топ-100 мест Петербурга. Часть 1: …» ломался посередине фразы после точки - нужен осознанный перенос строки.

### Решения
- `splitBlogSeriesHeroTitle` в `blog-utils`: паттерн `…. Часть N:` → `<br />` в `BlogArticleHero` (web + legacy public).
- Frontmatter `title` / SEO / карточки без изменений - совместимо с параллельной заменой body Part 1 из Downloads.

### Проблемы
- Нет.

---

## 2026-08-05 - Blog «Читайте также»: top-align thumb + label

### Наблюдения
- Owner screenshot: в сайдбаре related eyebrow «ГОРОД · …» визуально выше верха квадратного thumb.

### Решения
- `BlogRelatedSidebar`: ряд `items-start`, thumb `size-16 self-start`, meta `m-0 leading-none` без отступа сверху - верх лейбла и фото на одной линии.

### Проблемы
- Нет.

---

## 2026-08-05 - Серия «Больше чем ТОП-100» (СПб), Parts 1-7

### Наблюдения
- Owner прислал расширенный цикл за пределами базового ТОП-100: вода/мосты, улицы, особняки, парки (36-46), семья, музеи, пригороды.
- Часть 4 сначала отсутствовала в дампе; текст парков дослан отдельным сообщением и включен в серию.

### Решения
- PUBLISHED MD ×7 (`spb-beyond-top100-chast-{1..7}-*`), cover + 2 inline JPG, soft CTA на хаб/«Мой день», навигация серии только внизу со ссылкой на базовый ТОП-100.
- Пайплайн: `blog:sync-bodies` → commit/push → MSK `deploy-prod-next` → `blog:upsert`.

### Проблемы
- Нет. Индекс: `docs/drafts/beyond-top100-nav.md`.

---

## 2026-08-05 - SPB editorial seed: venue twins and ticketless places

### Наблюдения
- Owner обнаружил twin «Синий Пушкин»: seed создал пустую `PUBLISHED` карточку рядом с действующей площадкой с 144 событиями.
- Причина: enrich сопоставлял только точный title или практически идентичные координаты, поэтому варианты названия и адреса считались новой сущностью.
- El Copitas и несколько гастро-точек без будущих продаваемых событий попадали в `/venues` и получали билетный chrome.

### Решения
- Тонкий twin скрывается, а preset и ссылки используют каноническую event-площадку. Seed усилен нормализованным названием, адресом и радиусом 100 м до create.
- Редакционные SPB гастро-точки без событий переводятся в `/locations`; для любого временно оставшегося institution без продаж UI скрывает цену, CTA, пустую афишу и ticket FAQ, сохраняя маршрут, карту и описание.

### Проблемы
- Redirect со старого thin slug не создается отдельной публичной карточкой: она не успела стать канонической или индексируемой. Старый slug скрыт, ссылки в cityInfo и blog переписаны на единственный target.

---

## 2026-08-05 - KGD owner seed: финальная связка cityInfo

### Наблюдения
- Все 11 строк KGD-001…011 из owner pack уже имеют публичные карточки, но «Район Амалиенау» оставался без `locationSlug`, а точка смотровой Янтарного комбината ссылалась на более общий объект.
- Legacy `apps/public` не получил часть связок nested POI, хотя Next `apps/web` уже показывал их.

### Решения
- Привязаны канонические сущности Амалиенау и смотровой к соответствующим строкам `cityInfo`; в legacy-миррор добавлены ссылки для Дюны Эфа, Танцующего леса, Мурариума, башни Раушена и крепости Пиллау.
- Owner pack остается источником координат и idempotent seed, а каталожный маршрут определяется типом: музеи идут через `/venues`, остальные точки - через `/locations`.

### Проблемы
- Локальный PostgreSQL и MCP-query недоступны. На MSK idempotent apply подтвердил 11 update без `missingCity`; после cache/revalidate smoke hub и шести sample URL завершился HTTP 200.

---

## 2026-08-05 - Legacy alias городского хаба СПб

### Наблюдения
- Canonical `/cities/saint-petersburg` отвечает 200, а legacy transliteration `/cities/sankt-peterburg` вызывает HTTP 500.
- Alias в `cityInfo` и UI-конфигурации не нормализует slug до server-side запроса `/api/public/cities/:slug`, поэтому не защищает HTTP route.

### Решения
- Добавлен permanent redirect на уровне Next config: `/cities/sankt-peterburg` → `/cities/saint-petersburg`.
- Это сохраняет один индексируемый URL, не запускает DTO-построение для legacy slug и не требует изменений каталожных данных.

### Проблемы
- Локальный `pnpm` отсутствует; web typecheck дополнительно блокируют существующие ошибки Prisma и `day-route-match`, не связанные с redirect. Production build на MSK прошёл успешно.
- Deploy warm зафиксировал старый 500 до повторной проверки, но прямой запрос к Next `:3001` и публичный smoke после deploy подтвердили `308` legacy URL и `200` canonical URL.

---

## 2026-08-05 - Owner seed СПб и Калининграда

### Наблюдения
- В широком `cityInfo` СПб и в nested POI пригородов часть редакционных точек не имела каталожной сущности, адреса и координат.
- Owner передал проверенный набор для 55 городских точек СПб, гастро/баров, 12 пригородных POI и 11 точек Калининградской области.
- Owner уточнил SPB-EVENT-001: «Руки Вверх Бар» на Тверской, 22 является петербургской точкой. Используем именно переданные адрес и координаты.

### Решения
- Добавлен версионируемый owner pack `scripts/data/spb-kgd-venue-coords.json` и расширен идемпотентный enrich: дедупликация по slug, title в городе и координатам до insert.
- Скрипт выбирает `venues` для музеев и гастро-площадок, `locations` для улиц, мостов, набережных, парков и памятников; бережет уже существующий публичный slug и умеет проставлять его в `apps/web` cityInfo.
- SPB-EVENT-001 включен в петербургский пакет после корректировки owner, без нормализации или подмены переданных адреса и координат.
- На MSK применены 67 insert и 20 update без пропущенных городов; 67 matching cityInfo записей получили slug. Bar guide upserted в `Article`, «Барный Петербург» получил семь resolvable stop и deployed с BUILD_ID `htTqoT7UE2NcJBJevr_3v`.

### Проблемы
- Локальная PostgreSQL на `127.0.0.1:5437` недоступна, поэтому apply выполняется на MSK catalog host после push. В deploy warm legacy-alias `/cities/sankt-peterburg` ответил 500, однако canonical `/cities/saint-petersburg`, seeded venue и статья после deploy отдают 200.

---

## 2026-08-05 - СПб hub: только собираемые сценарии

### Наблюдения
- Карточки named preset оставались в «Готовых сценариях», если у них был companion-гид, даже когда из каталога не разрешались три точки для плана.
- В карточке число точек было захардкожено с формой «точек», поэтому 2-4 показывались грамматически неверно.

### Решения
- В сценариях hub и «Моего дня» показываются только presets с минимум тремя разрешимыми точками. Несобираемый маршрут не выглядит готовым и не получает CTA «Собрать день».
- Карточка использует общий `dayRoutePointsWord`, который покрывает формы «1 точка», «2-4 точки», «5-20 точек» и дальнейшие стандартные формы.
- `spb-3` переименован в «Петроградская сторона» в Next и legacy cityInfo, а также в companion-гиде.

### Проблемы
- Локальная Windows-среда не содержит Node.js/pnpm. Сборка и финальный smoke выполняются на MSK по каноническому deploy.

---

## 2026-08-05 - Восстановление owner-текста «Барный Петербург»

### Наблюдения
- Опубликованная статья `spb-barnyy-peterburg-ryumochnye-spikizi` была существенно переписана вместо публикации полного текста владельца.
- В исходном тексте требовали проверки несколько фактов: «Залив» находится на Некрасова, 24, а Orthodox работает на Восстания, 4; «Руки Вверх Бар» на Тверской, 22 - московская площадка.
- В каталоге найдены только две точные публичные venue-карточки из статьи: «Евгенич на Рубинштейна» и «Синий Пушкин».

### Решения
- Восстановить структуру, блоки, факты и тон owner-текста почти дословно, дополнив каждый объект реальным адресом.
- Ставить внутренние venue-ссылки только для существующих точных совпадений; для непроверенных или отсутствующих событий использовать мягкую ссылку на афишу Петербурга.
- Сохранить исходные cover и две inline-иллюстрации, slug и привязку к preset `spb-barnyy-peterburg`.

### Проблемы
- Требуются sync статического fallback, upsert production `Article`, MSK deploy и HTTP-проверка.

---

## 2026-08-05 - СПб hub: справка о разводе мостов

### Наблюдения
- Тематическая посадка уже существует по каноническому URL `/saint-petersburg/night-bridges`; создавать дублирующий landing не нужно.
- В `CITY_INFO` уже есть пункт «Дворцовый мост в развод» с сезоном навигации, но практический контекст не был собран в отдельный блок hub.

### Решения
- В блоке «Советы» `/cities/saint-petersburg` добавлена компактная сезонная карточка: основной сезон май-октябрь, точки просмотра Дворцового моста и предупреждение о ежегодно меняющемся графике.
- Карточка ведет на `/saint-petersburg/night-bridges` и в `/my-day?city=saint-petersburg`; FAQ синхронизирован с тем же сезонным ориентиром.
- В `CityInfoEntry` добавлено необязательное поле `seasonalTip`, чтобы аналогичные проверенные сезонные справки могли быть добавлены другим городам без встраивания контента в компонент.

### Проблемы
- Локальный `pnpm typecheck` не запущен: в Windows-окружении нет Node.js/pnpm. MSK production build прошел успешно; после автоматического warm сервис кратко оказался inactive из-за неполного `.next`, затем systemd восстановил runtime. Повторный smoke канонических hub, landing и «Мой день» - 200.

---

## 2026-08-05 - SPB: companion-гиды к готовым дням

### Наблюдения
- В `CITY_INFO` уже были пять готовых сценариев Петербурга, но у них не было companion-материалов в блоге.
- Канонический публичный slug города - `saint-petersburg`; старый `sankt-peterburg` работает только как alias.

### Решения
- Опубликованы пять редакционных гидов: парадный центр, Васильевский остров, Петроградская сторона, Коломна и Владимирская.
- У каждой статьи есть уникальные cover и две inline-иллюстрации, естественные ссылки на `/cities/saint-petersburg` и `/my-day`.
- В `dayRoutePresets` `spb-1` - `spb-5` добавлены соответствующие `blogSlug`, поэтому карточки готовых дней ведут в поясняющий гид.

### Проблемы
- Нет. Нужна production-проверка после deploy.

---

## 2026-08-05 - Пригороды: компактная метка в маршруте

### Наблюдения
- В блоке пригородов на city hub формулировка «не город» создавала лишнее отрицание.
- Остановки, добавленные из `significantSuburbs`, не отличались от городских в «Моем дне».

### Решения
- В hub оставлены чистый бейдж «Пригород» и нейтральное описание day-trip.
- `DayRouteVenueItem.isSuburb` сохраняет контекст при добавлении из карточки пригорода или вложенной точки; в list и grid stop cards рядом с названием показывается компактный бейдж «Пригород».
- `mustSee` и данные пригородов не смешиваются.

### Проблемы
- Нет. Локальная проверка и production deploy - после commit.

---

## 2026-08-05 - City hub: suburbs snap carousel (owner option 2)

### Наблюдения
- Owner: пригороды - subsection под must-see (не merge в chips); layout - screen-by-screen snap (коса → Зеленоградск → …); tone «не город, но стоит».

### Решения
- `CitySignificantSuburbsBlock`: horizontal snap rail (`data-city-suburb-rail`), ~92% card + peek / md full-bleed + arrows + dots; badge «Пригород · не город»; subtitle owner-tone; nested POI `capitalizeSentenceStart` + «В маршрут» если slug/match.
- Не трогали mustSee filters / Главные места.

### Проблемы
- Нет. tip `d6ca3ec`, MSK **BUILD_ID=`kWULGMhmJMpJInMCdIS3k`**; `/cities/kaliningrad` 200; suburb rail + 5 cards + «Это не город» + nested «Дюна Эфа» / «Одна из самых».

---

## 2026-08-04 - City hub: capitalize blurbs + drop mobile expand

### Наблюдения
- Owner: must-see описания с маленькой буквы (Калининград / Храмы); на mobile hub лишний expand («ещё»/«Развернуть»-тон) у blurbs.
- ExpandableBlurb на city hub был с `line-clamp-6` только на mobile - desktop уже full text.

### Решения
- `capitalizeSentenceStart` + применение в `dayRouteHookLine` (все города); suburb nested POI через тот же helper.
- Seed `cityInfo` web+public: 56 lowercase `desc` → sentence case (в т.ч. Калининград mustSee/suburbs).
- City hub must-see/suburbs: убран ExpandableBlurb, полный текст без toggle (my-day carousel↔list «Развернуть» не трогали).

### Проблемы
- Нет. tip `8e29027`, MSK **BUILD_ID=`5rOJ9dbBh58TQKyE5YGPr`**; `/cities/kaliningrad` + `/cities/nizhny-novgorod` 200; blurbs capital; нет «Развернуть»/«ещё»/line-clamp-6 на hub.

---

## 2026-08-04 - Калининград: mustSee 35 + suburb nested POIs

### Наблюдения
- Owner: после curated seed (16) не хватало мест; Кафедральный собор уходил в chip «Храмы» из-за слова «собор» и пропадал из «Главные места».
- Пригороды - отдельные мини-локации с несколькими POI, не пункты mustSee.

### Решения
- `cityInfo` web+public: **mustSee.length=35** (полный owner list, blurbs as-is); `mustSeeFilter` override; собор `mustSeeFilter:'main'` в топе.
- `significantSuburbs` 5 мини-destination + nested `places`: коса 4 / Зеленоградск 5 / Светлогорск 5 / Балтийск 5 / Янтарный 4.
- UI: `CitySignificantSuburbsBlock` рендерит `data-city-suburb-places`; filters: override + кирха + gastro по имени.

### Проблемы
- Нет. tip `9d77eb4`, MSK **BUILD_ID=`bDKOL5rTJ7WEpF37gGNXG`**; `/cities/kaliningrad` 200; собор + suburb POIs в HTML.

---

## 2026-08-04 - /my-day desktop: Пешком/Авто рядом с км·мин

### Наблюдения
- Owner (скрин): на desktop «Пешком / Авто» стояли справа вместе с CTA, хотя должны сразу после `N км · около M мин` слева.

### Решения
- `DayRoutePanel` row 2: `justify-between` - слева `[км · мин][Пешком Авто]` (`data-day-travel-mode-desktop`), справа CTAs; mobile toggle остаётся справа (`data-day-travel-mode-mobile`, `lg:hidden`).

### Проблемы
- Нет. tip `0d2687d`, MSK **BUILD_ID=`8k-1-yqfNDk25ALQgjDBW`**; `/my-day` 200; chunk `data-day-travel-mode-desktop`.

---

## 2026-08-04 - Blog: false empty-city banner for NN

### Наблюдения
- `/blog` при фильтре «Нижний Новгород (3)» / «Найдено: 3» всё равно показывал жёлтый баннер «Пока нет статей про Нижний Новгород».
- Причина: header cityValue (display name / `nizhniy-novgorod`) не канонизировался в `nizhny-novgorod`, `hasLocalPosts=false` → Russia fallback + баннер, а dropdown `?city=` считал статьи по каноническому slug.

### Решения
- `normalizeBlogCitySlug` / `canonicalizeBlogCitySlug`: NN aliases + русское имя → `nizhny-novgorod`; не принимать кириллический display-name как slug.
- Баннер перенесён в `BlogListFiltered`: показ только если у активного фильтра (URL city, иначе header) **0** статей.

### Проблемы
- Нет. tip `d393520`, MSK **BUILD_ID=`8bCshKtFiFhBS9SzTqnaE`**; `/blog?city=nizhny-novgorod` 200; banner absent; NN slugs in HTML.

---

## 2026-08-04 - /my-day readiness: bullet separator

### Наблюдения
- Owner: в subtitle readiness точка после счётчика (`N точек из 10. Страница {City}`) выглядит как конец предложения.

### Решения
- `DayRoutePanel`: после `summaryLine` вместо `.` - ` •` (middle dot), одна строка: `N точек из 10 • Страница {City_Род}`.

### Проблемы
- Нет. tip `2bf58e9`, MSK **BUILD_ID=`J2r1pJc-sK2W_wGzB2KzY`**; `/my-day` 200; source `scopeCityName ? ' •'`.

---

## 2026-08-05 - Москва: День города выше мастер-классов в топе

### Наблюдения
- Owner: на Moscow hub/подборках «Музеи и мастер-классы» вытесняли сезонный City Day, хотя карточка `moscow-city-day` уже есть.
- В `/podborki` seasonal был последним блоком; featured hero брал river/museums по events/HERO_FEATURED.

### Решения
- Hub `featuredDirections`: City Day #1 + CTA `/moscow/den-goroda`; museums опущены и переименованы в «Музеи и выставки».
- Podborki: pin `moscow-city-day` в featured/trending; lift seasonal section when pin present.
- Promo boosts MSK: museums убраны из top boost; `landing-rules` title без «мастер-классы».
- `cityInfo.moscow.seasonalTip` → `/moscow/den-goroda`.

### Проблемы
- Deploy на live не делали (каденс batch / по запросу).

---


### Наблюдения
- Owner: «где лендинг День города в Москве? выключить Салют 9 мая, а события дня города включить в новый».
- STEP 0 (`83271ec`) только исключил «день города» из `salute-9-may` - отдельной посадки не было; live search ~10 Мск City Day событий без landingSlugs.
- `/podborki` уже не показывал `salute-9-may` (events=0), но URL `/salut-9-maya/` оставался пустым.

### Решения
- NEW city-scoped rule `moscow-city-day` (aliases `den-goroda-moskva`): `city=Москва` + required «день города» + exclude Victory Day; URL `/moscow/den-goroda/`.
- `OFF_SEASON_LANDING_SLUGS` = `salute-9-may` - hide from landings-catalog / promo / city hub / search landing cards; page keeps soft-empty.
- Podborki category seasonal; moscow hub featured + highlightSeason «День города».

### Проблемы
- Live MSK **BUILD_ID=J2r1pJc-sK2W_wGzB2KzY** HEAD 2bf58e9 (includes 4555e19); /moscow/den-goroda/ events=11; salute hub hidden; /salut-9-maya/ empty page kept.

---

## 2026-08-04 - LocationCard: chip+CTA stack, no boarding prefix

### Наблюдения
- Owner (скрин hub посадок АВТОБУСЫ): chip «N событий» и «В маршрут» стояли в ряд справа; заголовок с префиксом «Место посадки — …» дублировал адрес в subtitle.

### Решения
- `LocationCard`: правая колонка `flex-col items-end` - chip над «В маршрут»; title без префикса (`stripBoardingPlacePrefix`); subtitle address скрыт при совпадении с title.
- `formatBusLocationDisplayName`: при rename возвращает shortAddress без «Место посадки — ».
- EventCard («В мой день») не трогали.

### Проблемы
- Нет. MSK **BUILD_ID=`B_7ZDd8i_WZurwdjJhMhl`** (HEAD `84d13591`, включает `4f5b675`), SMOKE locations/spb 200; chunk markers `stripBoardingPlacePrefix` / `items-end`.

---

## 2026-08-04 - EventCard: «В мой день» on cover overlay

### Наблюдения
- Owner (скрин grid-каталога): chip «В мой день» в footer слева рядом с ценой выглядел чужеродно; сердце уже top-right на фото.

### Решения
- `EventCard` (grid): `AddToDayRouteButton` перенесён на cover overlay, bottom-right (`variant="overlay"`: white/90 + blur idle, emerald active). Heart остаётся top-right.
- Footer: только цена + «Купить билет». List (`EventCardHorizontal`) без day-route CTA - без изменений.
- Поведение add/remove и a11y labels сохранены; chip виден и на mobile (раньше был `max-sm:hidden` в footer).

### Проблемы
- Нет. Live MSK tip incl. `49be710` (overlay) @`2bf58e9`; **BUILD_ID=`J2r1pJc-sK2W_wGzB2KzY`**; `/events` 200; chunk a11y «Добавить место события в мой день» + overlay/bottom-2.

---

## 2026-08-04 - City hub must-see: full blurbs (no mid-sentence cut)

### Наблюдения
- Owner desktop (скрин NN «Зачем ехать»): описания рвутся mid-sentence / mid-word (`а внутри не…`) из-за узкого `line-clamp-4` + `overflow-hidden` на карточке; ellipsis иногда не виден.
- Source текст (`hookFact`) полный - режет только layout.

### Решения
- Must-see (+ suburbs): `dayRouteHookLine` без maxLen + `ExpandableBlurb` (`line-clamp-6` mobile, `md:line-clamp-none` desktop) + `break-words`; снят `overflow-hidden` с карточки.
- Peek mobile `flex-[0_0_80%]`; presets blog-link new line / padding из `0463a32` сохранены.

### Проблемы
- Нет. tip `4ea04c4`, MSK **BUILD_ID=`PmbO697VdpNToUi9yEI5G`**; nn/public-nn 200; chunk `ExpandableBlurb` + `0_0_80%`.

---

## 2026-08-04 - Header search overlay: X vs placeholder

### Наблюдения
- Mobile: в overlay поиска кнопка X наезжала на placeholder «Поиск событий, городов, подборок…».
- Причина: absolute X поверх input + конфликт Tailwind `pr-3`/`pr-12` (порядок в CSS, не в className).

### Решения
- `HeaderSearch` overlay: ряд flex - input `min-w-0 flex-1` + отдельный hit-area X (`h-10 w-10 shrink-0`), без absolute поверх текста.
- Чуть воздуха в sheet (`px-3/4`, border-b, helper padding).

### Проблемы
- Нет. Live MSK `ee0fa90` **BUILD_ID=`rcgg8GueqCiyG9m8Dr0cg`**.

---

## 2026-08-04 - /my-day mobile annotated polish

### Наблюдения
- Owner (скрин NN, ≥1 stop): «N точек из 10» и «Страница {City}» на разных строках; city picker дублирует шапку; placeholder «Найти…»; лишний helper под «Главные места»; map focus - nav/delete в ряд.

### Решения
- Readiness: одна flex-wrap строка `N точек из 10 • Страница {City_Род}` (bullet после счётчика, ссылка синяя).
- Compact header search: без CityPicker-ряда; placeholder «Добавить место или событие»; quiet «или сменить город» → CityPicker `defaultOpen` + тот же `setCity` confirm.
- Empty starter: CityPicker + «Найти…» без изменений.
- Must-see: убран `data-day-must-see-helper`.
- `renderMapFocusCard`: «Показать маршрут» + «Удалить» column; X отдельно.

### Проблемы
- Нет. tip `3ea8922` (live HEAD later incl. hub blurbs); MSK **BUILD_ID=`PmbO697VdpNToUi9yEI5G`**; `/my-day` 200; chunk: «Добавить место…» / «или сменить город» / `data-day-map-focus-actions` / «Показать маршрут»; без «Собрали для вас топ».

---

## 2026-08-04 - City hub mobile: must-see peek + presets breathing room

### Наблюдения
- Owner (скрин Нижний): peek следующей must-see карточки едва виден при `85%`; описание `line-clamp-4` рвёт фразу на полуслове.
- «Готовые сценарии»: «Читать об этом в блоге» на mobile оставалась inline с title; контент карточки сжат (`p-3`, мелкий text-xs).

### Решения
- Must-see rail: `flex-[0_0_81%]` + `gap-2.5` + `pr-1` на карточке; mobile `line-clamp-5` (md: `line-clamp-4`); padding текста `pr-0.5`.
- `CityDayPresetBlock`: blog-link `flex-col` на mobile / inline `md:flex-row`; больше `px-4 py-3.5`; stacked до `md`; CTA `w-full` mobile; description/points чуть крупнее (`text-[13px]`, `line-clamp-3` mobile).

### Проблемы
- (заполняется после deploy)

---

## 2026-08-04 - Header city change: stay in section

### Наблюдения
- Owner: смена города в хедере на `/cities` (и других секциях) уводила в каталог `/events`.
- Root cause: `SelectedCityProvider.setCity` имел узкие ветки (index catalogs, landings, my-day) и fallback `buildCatalogHref` на всё остальное - в т.ч. `/cities/{slug}`, venue/location PDP, blog.

### Решения
- Канон: смена города в хедере переключает city filter **внутри текущей секции**, не дампит в каталог.
- Чистый хелпер `resolveCityChangeNav` (`apps/web/src/lib/city-change-nav.ts`) + `setCity` path-aware map.
- Матрица: `/cities`→hub; events/venues/locations (+PDP)→section `?city=`; podborki intent→`/podborki/{intent}/{slug}`; blog→persist (in-page `?city=` filter); my-day/home→persist (+confirm на my-day); multi-city landing→swap segment; static→persist only.
- `/my-day` confirm-reset не регрессирован.

### Проблемы
- Нет. tip `ebc52ca` (live tip `4ea04c46`), MSK **BUILD_ID=`PmbO697VdpNToUi9yEI5G`**; unit 6/6; smoke `/cities` `/cities/nizhny-novgorod` 200; chunk `na-vyhodnyh`.

---

## 2026-08-04 - City hub must-see: mobile 85/15 carousel

### Наблюдения
- Owner (скрин Нижний): карточка «Зачем ехать» тянется до края, текст обрезается, peek следующей карточки нет.
- Причина: `ol` с `w-max` делал `%` ширины indefinite → карточка = max-content (длинная строка).

### Решения
- Rail: mobile `flex` + `ol` `contents` (карточки - прямые flex-дети scrollport); `flex-[0_0_85%]` + snap.
- md+: `md:block` / `md:grid` без изменений 2-row.
- Текст: `min-w-0` / `overflow-hidden` / `line-clamp-4` / `break-words`.

### Проблемы
- Нет. tip `3a9bae6` (live tip `d3aa7b29`), MSK **BUILD_ID=`enL85fpbBPEAS0-dH3Aa-`**; smoke nn/nizhny-novgorod 200; chunk `data-city-must-see-rail`.

---

## 2026-08-04 - /my-day presets: blog link inline with title

### Наблюдения
- Owner (скрин): «Читать об этом в блоге» стояла под title пресета - нужна та же строка, сразу после названия.

### Решения
- `CityDayPresetBlock`: title + blog-link в `flex flex-wrap items-baseline gap-x-2`; на md+ обычно одна строка, на узком mobile wrap под title. Стиль ссылки без изменений (blue + underline + ArrowUpRight).

### Проблемы
- Нет. tip `06625e0`, MSK **BUILD_ID=`2NIdFliuqHg4lCRrEYYxP`**; `/my-day` 200; source `flex flex-wrap items-baseline gap-x-2`; chunk «Читать об этом в блоге».

---

## 2026-08-04 - /my-day matches: elevate + drop addable row

### Наблюдения
- Owner: «События поблизости» оказывались внизу после добавления точек (под картой/каталогом) - критичный miss.
- Label/chip-row «Места экскурсии не в маршруте» на match-карточках - лишняя.

### Решения
- `DayRoutePanel` DOM-порядок: **Главные места → События поблизости → Добавить своё место** → Hot Picks / presets / каталог. Matches остаются elevated и при `venues.length > 0`.
- Убраны label + chip-row addable places (+ bulk CTA) на match cards; coverage chips (в маршруте / старт / рядом) сохранены.

### Проблемы
- Нет. tip `3e9b6fa`, MSK **BUILD_ID=`M7xdN7ovP2s4tAjJKQYPY`**; `/my-day` 200; chunk title OK; без «Места экскурсии не в маршруте».

---

## 2026-08-04 - /my-day list stops: title indent from index

### Наблюдения
- Owner desktop list: title «слишком близко» к колонке ↑↓ + номер (красная линия на скрине).

### Решения
- `DayRouteVenueCard` list: кластер index (`data-day-stop-index-cluster`) с внутренним `gap-1`; ряд `gap-1.5 md:gap-3 lg:gap-4` - mobile без изменений, desktop больше горизонтальный зазор до текста.

### Проблемы
- Нет. tip `50bf964` (live tip `5f5bd84`), MSK **BUILD_ID=`M7xdN7ovP2s4tAjJKQYPY`**; `/my-day` 200; chunk `data-day-stop-index-cluster`.

---

## 2026-08-04 - /my-day presets: blog link affordance

### Наблюдения
- Owner: «Читать об этом в блоге» под title выглядела как muted текст, не как ссылка.

### Решения
- `CityDayPresetBlock`: brand/link blue (`text-primary-600` / editorial `text-sky-700`), постоянный underline, `ArrowUpRight`; text-xs font-medium - не конкурирует с CTA «Собрать день».

### Проблемы
- Нет. tip `f48d174` (live tip включает `da64abc`), MSK **BUILD_ID=`YCakLf30htHSZdYu4RI2Q`**; `/my-day` 200.

---

## 2026-08-04 - /my-day empty: restore starter copy + hide dead Share

### Наблюдения
- Owner: empty-state starter «вкуснее» был раньше; сейчас дубль «Добавь своё место или готовый сценарий» (subtitle + invite) и серый full-width «Поделиться» при 0 точках.

### Решения
- Subtitle starter снова канон variant A: «Выбери город и минимум N точки…»; интерактивный invite под поиском сохранён (presets/своё место).
- Desktop/mobile actions (Поделиться / Сохранить / Очистить) рендерятся только при >=1 stop; disabled Share на empty убран.
- Сохранены: hide starter mid-card при >=1, header search, presets blog, must-see, hour-plan.

### Проблемы
- Нет. Live tip `5f5bd84` (feature `1ba63e4`); MSK **BUILD_ID=`M7xdN7ovP2s4tAjJKQYPY`**; `/my-day` 200; empty без Share, starter subtitle без дубля invite.

---

## 2026-08-04 - /my-day must-see: dense actions + full-width expand grid

### Наблюдения
- Owner: «Добавить главные места» + «Развернуть» уезжали вправо (`justify-between`) - пустой горизонтальный зазор; «Развернуть» второй строкой под кнопкой съедал высоту.
- В режиме «Развернуть» карточки оставались с carousel-шириной `lg:w-[min(100%,22rem)]` + flex-wrap - три в ряд слева, справа пустота (? на скрине).

### Решения
- Helper full-width; actions row left-aligned: `[Добавить…] [Развернуть]` в одном `flex-wrap` кластере (без `justify-between`).
- Expanded list: CSS grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; карточки `w-full min-w-0`. Carousel (свёрнуто) без изменений `24rem` snap.

### Проблемы
- Нет. tip `1ba63e4` (live tip `d3aa7b29`), MSK **BUILD_ID=`enL85fpbBPEAS0-dH3Aa-`**; `/my-day` 200; chunk `data-day-must-see-expand`; grid `lg:grid-cols-3`.

---

## 2026-08-04 - hotfix: DayRoutePanel stray `{` broke MSK build

### Наблюдения
- MSK `web:build` FAIL: `DayRoutePanel.client.tsx` Expected `'</'`, got `'{'` у Row 2 distance summary - лишний `{` перед JSX-комментом (после `8b1923f` km-row CTAs).

### Решения
- Удалён orphan `{`; restore `.next.prev` уже поднял web. Redeploy после фикса.

### Проблемы
- Нет. tip `3957b9a`, MSK **BUILD_ID=`neGTZ9t_aXfs0StFNoZZo`**; `/my-day` 200.

---

## 2026-08-04 - /my-day desktop: CTAs on km row + wider city pin

### Наблюдения
- Owner supersede: hour-plan + Optimize на title row теснили «Маршрут · N» - нужно больше воздуха над карточками.
- Стрелка вниз: перенести CTAs на ряд `км · около …`, right-aligned; Пешком/Авто тоже справа.
- City: pin слева имени; «Благовещенск (Амурска…» / NN - жалко места, шире.

### Решения
- Title row: только Маршрут + Сетка/Список (+ mobile Список/Карта).
- Distance row `justify-between`: left = км·мин; right = Пешком/Авто + `data-day-desktop-distance-actions` (lg).
- Mobile mid CTA toolbar и `data-day-mobile-actions-row` без ломки.
- Header CityPicker hero: inline MapPin; `sm:min-w-[18rem] basis-[26rem] max-w-[min(32rem,48%)]`.

### Проблемы
- Live tip `3957b9a` (hotfix JSX), MSK **BUILD_ID=`neGTZ9t_aXfs0StFNoZZo`**; `/my-day` 200.

---

## 2026-08-04 - /my-day: confirm reset on city change

### Наблюдения
- Owner: смена города при непустом маршруте оставляет точки другого города - нужно предложить сброс.

### Решения
- confirmClearDayRouteForCityChange + guard в SelectedCityProvider.setCity на /my-day (хедер + on-page CityPicker).
- 0 stops: смена сразу; >=1: window.confirm; OK -> clear + switch; Cancel -> city value без изменений.
- Share hydrate: skipRouteConfirm (маршрут уже заменён).

### Проблемы
- Live MSK: tip includes `6e5e922`; BUILD_ID=`neGTZ9t_aXfs0StFNoZZo`; `/my-day` 200 (local+public); confirm copy in chunks.

---

## 2026-08-04 - /my-day presets: blog link under title

### Наблюдения
- Owner (скрин): «Читать об этом в блоге» стояла под списком точек, над «Собрать день» - стрелка вверх к title пресета.

### Решения
- `CityDayPresetBlock`: quiet-link сразу под `preset.title` (до description и списка точек); только при `blogSlug`. CTA без изменений.

### Проблемы
- Нет. tip `bb4e2f7` (+ hotfix `3957b9a`), MSK **BUILD_ID=`neGTZ9t_aXfs0StFNoZZo`**; `/my-day` 200; ссылка под title.

---

## 2026-08-04 - /my-day matches: «События поблизости»

### Наблюдения
- Owner screenshot: блок matches показывал стендап/концерты под заголовком «Подходящие экскурсии» - вводит в заблуждение.

### Решения
- Заголовок accordion matches: **«События поблизости»** (`DayRoutePanel`).
- TZ: `tz-soberi-svoy-den.md` синхронизирован. Внутренние chip/empty («Места экскурсии…», empty copy) без изменений - owner просил только rename секции.

### Проблемы
- Нет. tip `1f08893`, MSK **BUILD_ID=`JHo5binbjsG01hIPE_9_0`**; `/my-day` 200; chunk с «События поблизости».

---

## 2026-08-04 - /my-day mobile: wider top actions + walk/auto right

### Наблюдения
- Owner annotated mobile: узкая колонка Поделиться/Сохранить/Очистить top-right - мало тапа, давит H1.
- Пешком/Авто слева у `км · около …` - стрелка в правый край той же строки.

### Решения
- Mobile: `data-day-mobile-actions-row` - full-width ряд `flex-1` кнопок под H1 (`sm:hidden`); H1 на всю ширину; desktop `data-day-desktop-actions` без изменений.
- Distance row: `justify-between` на mobile; `sm:justify-start` - left cluster как desktop polish.

### Проблемы
- Нет. Live tip `9ea1c5e` (в `1f08893`), MSK **BUILD_ID=`JHo5binbjsG01hIPE_9_0`**, `/my-day` 200; chunks: `data-day-mobile-actions-row` + `sm:justify-start`.

---

## 2026-08-04 - /my-day presets: «Читать об этом в блоге»

### Наблюдения
- Owner: на карточках «Готовые сценарии» нужен quiet-link на companion-статью блога (NN: 3 shipped гайда).

### Решения
- `CityDayRoutePreset.blogSlug?: string` в `cityInfo` (web+public).
- NN: `nn-one-day` → `nizhny-novgorod-za-24-chasa`, `nn-instagram` → `instagramnyi-nizhnii`, `nn-history-gastro` → `nizhny-novgorod-marshrut-so-vkusom`.
- `CityDayPresetBlock`: ссылка «Читать об этом в блоге» под списком точек, только если `blogSlug` задан; не конкурирует с «Собрать день».

### Проблемы
- Нет. Live tip `dce0d6c` (+ follow-up tip `441ce9e`/`7fa97bc`), MSK **BUILD_ID=`4sb26gUETqq22pmF7ycwM`**; `/my-day` 200; chunk + source `blogSlug` / «Читать об этом в блоге».

---

## 2026-08-04 - /my-day: «Добавить главные места» primary blue

### Наблюдения
- Bulk CTA `data-day-must-see-bulk` был `bg-slate-900` (тёмный navy) - выбивался из primary CTA my-day (Яндекс / Распланировать = `sky-600`).

### Решения
- Только стиль кнопки: `bg-sky-600 hover:bg-sky-700` (как `data-day-yandex-cta` / mobile hour-plan). Текст и логика без изменений.

### Проблемы
- Нет. Tip `441ce9e` (ancestor tip `1f088934`); MSK **BUILD_ID=`JHo5binbjsG01hIPE_9_0`**; `/my-day` 200; chunk `data-day-must-see-bulk` + `bg-sky-600`.

---

## 2026-08-04 - /my-day desktop: city width + hour-plan on title row

### Наблюдения
- Owner annotated desktop: city pill «Нижний Новг...» truncate; «Распланировать день по часам» в top-right - стрелка вниз к ряду «Маршрут · N» рядом с «Оптимизировать».

### Решения
- Header compact CityPicker: `sm:w/min-w-[16rem] sm:max-w-[18rem]` (было 11.5rem) - полное «Нижний Новгород».
- Top-right `data-day-desktop-actions`: только Сохранить / Очистить / Поделиться.
- Title row `justify-between`: слева Маршрут + Сетка/Список; справа `data-day-desktop-route-title-actions` = Распланировать + Оптимизировать.
- Mobile: mid `data-day-mobile-route-actions` без изменений; toolbar `lg:hidden`.

### Проблемы
- Нет. tip `3957b9a` (наш `8b1923f` + stray-brace fix), MSK **BUILD_ID=`neGTZ9t_aXfs0StFNoZZo`**, `/my-day` 200; chunk `data-day-desktop-distance-actions` + `sm:basis-[26rem]`.

---

## 2026-08-04 - /my-day: hide starter card when route has stops

### Наблюдения
- Owner: после первой точки mid-page starter (город + «Найти место или событие» + invite) выглядит лишним рядом с presets сверху и «Ещё из каталога» снизу.

### Решения
- ≥1 stop: убран bordered `renderUnifiedSearch(false)` под Hot Picks / presets.
- В page header под H1 - компактная one-line строка `data-day-header-search`: CityPicker + unified search (без card / invite).
- Empty (0 stops): starter card `data-day-starter` без изменений.
- Добавление точек: header search, sticky «+ Добавить» (`focusUnifiedSearch` → header), catalog trio, accordion «своё место».

### Проблемы
- Нет. Live tip `c8f918f`, MSK **BUILD_ID=`E2goVq9U7X9ujiRnLliZf`**; `/my-day` 200; chunk `data-day-header-search` + `data-day-starter`.

---

## 2026-08-04 - NN guides: Лайфхак → [NOTE] callout

### Наблюдения
- В теле NN-гайдов «Лайфхак:» и блок «Советы»/«Лайфхаки» шли обычным абзацем без фона.
- Канон уже есть: `[NOTE label="…" text="…"]` → `BlogArticleNote` (amber callout).

### Решения
- `nizhny-novgorod-za-24-chasa`: Лайфхак + 2 совета → NOTE.
- `nizhny-novgorod-marshrut-so-vkusom`: секция Лайфхаки → 2× NOTE.
- `instagramnyi-nizhnii`: Тайминг → NOTE label="Лайфхак".
- Пайплайн: MD → `blog:sync-bodies` → deploy → `blog:upsert` (prod Article).

### Проблемы
- Нет. Live: `94cbe86`, MSK **BUILD_ID=`iQt0EenjDINCgdzm4GPuR`**; `/blog/nizhny-novgorod-za-24-chasa` 3× `role=note`, marshrut 2×, instagramnyi 1×; `blog:upsert` ×3.

---

## 2026-08-04 - /my-day desktop: actions top-right + quiet route chrome

### Наблюдения
- Owner annotated desktop screenshot: Save / Hour plan / Clear слева под H1 - стрелки к top-right рядом с Поделиться.
- Пешком/Авто справа от meta - перенести влево рядом с `км · около …`.
- Mid-list «Открыть в Яндекс.Картах» над карточками - X (дубль); Яндекс оставить в «Карта дня».
- «Оптимизировать» в header карты - X; mid ghost Optimize оставить у list controls.

### Решения
- `data-day-desktop-actions`: Save / Hour plan / Clear + Share в одной top-right группе (`sm:flex`); mobile column без изменений.
- Distance row: `flex-wrap gap-x-3` - meta + text Пешком/Авто слева (не `justify-between`).
- Mid desktop: `data-day-desktop-list-optimize` ghost only; map `data-day-map-yandex-toolbar` - только Яндекс.

### Проблемы
- Нет. Live tip `94cbe86` (наш `c32443f` + blog follow-up), MSK **BUILD_ID=`iQt0EenjDINCgdzm4GPuR`**, `/my-day` 200; chunks: `data-day-desktop-list-optimize` + `data-day-map-yandex-toolbar` + `data-day-desktop-actions`.

---

## 2026-08-04 - My Day: drop planDone checkbox + fuller map focus hint

### Наблюдения
- Owner: «Отметить выполненным» лишний - точку и так удаляют через X; предыдущий move-left отменён.
- Map focus popup: hook обрезан жёстко (120 chars + `line-clamp-2`) - editorial/desc не читается.

### Решения
- Убран `data-day-plan-done` / strikethrough / `onTogglePlanDone` с stop cards; поле `planDone` в localStorage остаётся harmless (без новых toggles).
- Map focus subtitle: `dayRouteHookLine(..., 260)` + `line-clamp-4`; title attribute сохраняет полный текст.

### Проблемы
- Нет. Live: `66bcac4`, MSK **BUILD_ID=`esVyb5mav-fjNqzDQm4-g`**, `/my-day` 200; chunk без `data-day-plan-done` / «Отметить выполненным», есть `line-clamp-4` + focus subtitle.

---

## 2026-08-04 - /my-day mobile: actions column + Распланировать mid CTA

### Наблюдения
- Owner annotated screenshot: Поделиться/Сохранить/Очистить - колонка top-right; mid Yandex marked X (дубль sticky «Карта»); «Распланировать» → primary mid CTA.
- Пешком/Авто pill крал акцент у primary - нужен plain text + underline/weight.

### Решения
- Mobile column `data-day-mobile-actions-col`: Share / Save / Clear stacked; desktop row denser с Hour plan.
- Mid mobile `data-day-mobile-route-actions`: filled «Распланировать» (или «Сбросить время»); Optimize ghost; без Яндекса.
- Desktop/map toolbar: Yandex primary + Optimize (lg+).
- Пешком/Авто: text + bold/underline active, muted inactive - без capsule.

### Проблемы
- Нет. Live tip `66bcac4` (наш `c8b83bd` + follow-ups), MSK **BUILD_ID=`esVyb5mav-fjNqzDQm4-g`**, `/my-day` 200; chunks: `data-day-mobile-actions-col` + `data-day-mobile-route-actions`.

---

## 2026-08-04 - My Day: planDone checkbox leftmost on stop cards

### Наблюдения
- Owner обвёл `data-day-plan-done` между thumb и title и стрелкой указал в крайний левый край карточки - чекбокс мешал читать title/desc.
- Square affordance + aria «Отметить выполненным» из `e5cf78c` оставляем; hour-plan soft times / ticket cards не трогаем.

### Решения
- Grid: порядок `[✓] [↑↓] [thumb+N] [title/meta…] [nav][X]`; чекбокс вне text-col.
- List dense: `[✓] [↑↓] [N] [title…]` - тот же leftmost control.

### Проблемы
- Нет. Deploy/BUILD_ID - после MSK.

---

## 2026-08-04 - /my-day: calm route toolbar hierarchy (mobile)

### Наблюдения
- Owner: блок над списком остановок перегружен - МАРШРУТ + Список/Карта + две жирные кнопки (Оптимизировать / Яндекс) + карточка Итого+Пешком/Авто читаются как три конкурирующие панели.
- Фичи снимать нельзя; нужна иерархия акцентов.

### Решения
- Title: `Маршрут · N точек` (без uppercase-крика).
- Meta: плоская строка `км · около …` + компактный сегмент Пешком/Авто (без nested gray card).
- CTA: один primary filled «Открыть в Яндекс.Картах»; «Оптимизировать маршрут» - ghost/text ниже, не twin.
- Список/Карта и Сетка/Список: quieter segment (`bg-slate-50` + white active), не navy filled.

### Проблемы
- Нет. Deploy/BUILD_ID - после MSK.

---

## 2026-08-04 - My Day: stop-card planDone checkbox layout

### Наблюдения
- Owner на grid-карточках остановок обвёл пустую вертикальную «пилюлю» между thumb и title: непонятно что это и почему сбоку.
- Элемент = `data-day-plan-done` (отметить выполненным / strikethrough), не декоративный leftover.
- Баг layout: round checkbox сидел в отдельном ряду над title (без soft-time выглядел как одинокий outline); `rounded-full` + пустой transparent check читался как пустая рамка.

### Решения
- Checkbox в строке с title (`[✓] Title`); soft-time/Оплачено - отдельный ряд только если есть контент.
- Affordance: квадрат `rounded` + видимый check (slate-300 unchecked), `title`/`aria-label` «Отметить выполненным», фиксированный `size-5` + `self-center`.

### Проблемы
- Нет. Live: `e5cf78c` (+ tip `74fead9`), MSK **BUILD_ID=`Tn0XvhLW4knVakxHU8x6V`**, `/my-day` 200; marker `size-5 min-h-5` + title-row layout.

---

## 2026-08-04 - My Day: must-see mini-card geometry (wider + 2× thumb)

### Наблюдения
- Owner оставил horizontal carousel mini-cards (chips + thumb/title/desc/+); полный откат к accordion-grid не нужен.
- Просьба: карточки более горизонтальные (шире/ниже) и превью ~2×.

### Решения
- Card width `17.5rem` → `24rem`, padding `py-1.5`, gap `3`; thumb `h-12 w-12` → `h-24 w-24` (`sizes=6rem`); title `text-sm`.
- Layout carousel + «Добавить своё место» accordion + hour-plan/groups без изменений.

### Проблемы
- Нет. Live: `754fd12`, MSK **BUILD_ID=`ZqoDR5hR_voM4u3qKvngF`**, `/my-day` 200.

---

## 2026-08-04 - My Day: must-see mini-cards + своё место accordion

### Наблюдения
- Owner: photo-only 3:4 carousel для «Главные места» требует слишком много картинок; нужен откат к denser mini-cards, но горизонтальная карусель (не высокий vertical grid).
- Accordion «Добавить своё место» убрали при search-first create - owner просит вернуть.

### Решения
- Must-see: compact cards (thumb 48px + title + hook description + +) в `snap-x` horizontal carousel; chips без счётчиков и hour-plan/groups без изменений.
- Restored `data-day-plan-accordion` form (title/note/advanced coords); invite «своё место» снова открывает accordion; search create row оставлен как доп. путь.

### Проблемы
- Нет. Live: `5c13bc5`, MSK **BUILD_ID=`uoDz6BgaWtWh7P4AC0wF4`**, `/my-day` 200; chunk markers `data-day-must-see-carousel` + `data-day-plan-accordion`.

---

## 2026-08-04 - INC.504.25: /my-day 502 = deploy×healthcheck race (not my-day SSR)

### Наблюдения
- Owner: `https://daibilet.ru/my-day` 502; `/` и `/cities` тоже 502 в том же окне (не уникальный crash маршрута).
- `/my-day` page = тонкий client shell (`DayRoutePanel`); prerender HTML 200 когда web жив.
- journal: `ENOENT …/.next/prerender-manifest.json` при `next start` mid-deploy; health log `curl=7` → SIGKILL+start каждую минуту пока web stopped на `web:build`; отдельно `curl=28` убивал cold-start (<90s).
- Live после `ba13ec2` deploy: **BUILD_ID=`CbKLIANk3tWkfiFKxUSCW`**, `/my-day` 200; MemoryCurrent ~1.5G / High 1.5G.
- После фикса `59aba2f`: health log `08:56/08:57 SKIP recover: deploy active`; **NRestarts=0**; live **BUILD_ID=`3VxNvT0CDvcI3jB-BMvpP`**; smoke `/my-day` `/` `/cities` 200.

### Решения
- `ssr-healthcheck.sh`: SKIP при fresh `daibilet-web-deploy.active`, missing prerender-manifest, cold-start grace 90s; abort start если marker/manifest пропали после SIGKILL.
- `deploy-prod-next.sh`: flock `/var/lock/daibilet-web-deploy.lock` + active marker на stop→build→start→warm; verify `.next` before start; health wait retries.
- `start-web-prod.sh`: refuse start без prerender-manifest + BUILD_ID.

### Проблемы
- Окно stop→build по-прежнему даёт краткий 502 (ожидаемо); цель - не усугублять crash-loop healthcheck'ом.
- Корневой SSR hang / MemoryHigh pressure (INC.504.15) остаётся открытым.
- Hub warm: `/cities/kazan` 500 на post-deploy warm (11/12 ok) - отдельный follow-up, не блокер my-day.

---

## 2026-08-04 - /my-day: cull unsaleable buy CTA (Полет soft-404)

### Наблюдения
- НН «Стадион Полет»: after add, «Купить» вёл на soft-404 TC slug (`tc-6a32bd…-nizhnii-novgorod`); API `/api/public/events/{slug}` → `null`, HTML soft-404.
- Root cause: `/api/day-route/matches` брал Event с `status notIn HIDDEN/DRAFT` без saleable gate; `applyMatchCommerceToVenues` цеплял single-venue admission на venue stop → `/events/{thin-tc-slug}`.
- Public page: `isSaleableEventForPublic` (schedule + purchaseReady) → null = soft-404. Отдельно: `tc-6a2ada…-evgenii-eremeev…` тот же класс.

### Решения
- `day-route-match-saleable`: Prisma prefilter + JS gate (upcoming/open + widget/TC|TEP link); matches всегда `purchaseReady: true`.
- Commercial: не attach / nearby upsell если `purchaseReady === false`; cull venue-hosted poison из localStorage; ticket CTA не использует `/venues|/locations` как buy.
- Unit: saleable + purchaseReady guard + sanitize null.

### Проблемы
- Thin TC rows в DB остаются; публично уже soft-404. Отдельный unpublish/HIDE - optional data cleanup, не блокер UI.
- MSK **BUILD_ID=`CbKLIANk3tWkfiFKxUSCW`** (`ba13ec2`); smoke: `/my-day` 200; matches `stadion-polet` → 1 saleable match, **0** admission attach; bad TC API → `null`.

---

## 2026-08-04 - Conversion phase STEP 0…3 (salute / podborki / tabular / blog)

### Наблюдения
- Live `salute-9-may` тянул «Речная прогулка на День Города с праздничным фейерверком» (5 сент.) - матч только по `фейерверк`.
- Owner: one phase step-by-step; cities/venues/locations full redesign = next phase.

### Решения
- STEP 0: `landing-rules` - `requiredKeywordGroups` (9 мая / День Победы) + `excludeKeywords` день города; regression test; MSK `scp` + restart api.
- STEP 1: `/podborki` category jump chips, SEO ExpandableBlurb «Развернуть», lazy images, count/priceFrom.
- STEP 2: schedule rows shadow/bg + timeslot chips; sticky filters; `?type=` (category / bridges route); FAQ already below table.
- STEP 3: blog hero chips river/tours; thin `BlogReadingProgress`; BlogPosting + «Читайте также» already present.
- STEP 4 docs: PH2.* cities/venues/locations in Tasktracker; deferred masonry/view counters/sticky buy CTA/CMS buy constructor.

### Проблемы
- После STEP 0 на салюте 0 сессий до появления Victory Day inventory - ожидаемо.
- `[buy]` shortcode renderer есть, в контенте 0 вхождений - content seed deferred.
- Live MSK **BUILD_ID=`BCWcAIglYC8cAP-6Zgr4k`** (включает `eae17f4` + follow-up My Day `e617ac1`); smoke: salute sessions=0 / no city-day, cityday event 200 без `salute-9-may`, `/podborki` `/rechnye-progulki` `/razvodnye-mosty` `/blog` 200.

---

## 2026-08-04 - My Day A/B/C + hybrid hour-plan

### Наблюдения
- Owner: must-see carousel 3:4; groups Купленные/Мои планы; soft «по часам» через bottom sheet (start/end/lunch) без timeline UI; overflow = запасные планы.

### Решения
- Must-see: chips без счётчиков; horizontal photo carousel; copy «Собрали для вас топ-10…».
- Groups: purchased pinned (border + Оплачено + Показать билет); plans with round checkbox + ↑↓; planDone strike.
- Hour-plan: sheet → generate text hints on cards; recalc on plan reorder; lunch ~14-15; overflow group; reset clears hints.
- Wake Lock / brightness soft-fail on ticket modal. Custom search create kept. Yandex Suggest / fake QR deferred.

### Проблемы
- Real QR still needs orders API (qa.md).
- Live: `e617ac1`, MSK **BUILD_ID=`BCWcAIglYC8cAP-6Zgr4k`**, `/my-day` 200 (chunk markers hour-plan / carousel).

---

## 2026-08-04 - My Day UX: copy, tickets, custom search

### Наблюдения
- Owner: must-see helper без «ориентир 10»; ticket cards - freeze reorder + blue accent + «Показать билет»; custom place из поиска; first-block invite зависит от `dayRoutePresets`.

### Решения
- Must-see: «Собрали топ/топ-10 мест в {City_Пр}. Добавьте все…».
- First block: при presets - «своё место или готовый сценарий» (scroll CTA); без presets - только «добавить своё место».
- Search empty → «Добавить своё место "{query}"» instant add; accordion «своё место» убран; на custom card - muted «Указать адрес» (текст, без Yandex Suggest).
- Ticket/session: ↑↓ locked; border-l primary; modal QR only if `ticketQrData`, else stub «билет будет здесь после покупки».

### Проблемы
- Yandex Suggest - нет ключа в проекте (deferred).
- Real QR из orders API - всё ещё open (qa.md); stub only.

---

## 2026-08-04 - Event PDP conversion (funnel first)

### Наблюдения
- Owner: ship `/events/[slug]` before catalog/cities/venues/locations redesign. Catalog chips/load-more pass paused for backlog.
- Prior ship already had open-date stepper + от X price; missing sticky CTA, badge chips, day strip, accordion, map.

### Решения
- Sticky mobile bar `EventStickyBuyBar` («Выбрать билеты» + от X); hero mobile buy removed (no duplicate CTA).
- Hero: badge chips (duration / place / metro / age / discount), rating badge, when/where.
- BuyCard: horizontal day strip → timeslots; open-date stepper kept.
- Accordion: О событии / Маршрут / Как добраться; ticket tips; expand OSM map; ReviewSection limit 3.
- Docs backlog: catalog infinite, cities hub, venue/location monetization.

### Проблемы
- Multi-image carousel / video / adult-child qty / seatmap / taxi - deferred (no data or rebuild TC).
- Live: commit `20b0662`, MSK **BUILD_ID=`v0uP2iuxwDW4oNxWa0B2g`**; smoke `/events` + `kremlevskaya-obzornaya-…` 200 (sticky + accordion markers).

---

## 2026-08-04 - Catalog + event detail UX (A1/A2/B1/B2)

### Наблюдения
- Owner UX audit listing `/events` + event detail: chips с counts («Мероприятия 2092»), trunc select «Любая дата»→«Люб», page-size 50/100 на узких экранах, open-date без how-to, buy-card показывает scary range как primary.
- Parallel agents: home mobile + AddToDayRouteButton - эти файлы не трогали (только порядок day-route CTA в BuyCard).

### Решения
- **A1:** category chips без счётчиков; date select label «Дата» + min-width; calendar input только sm+.
- **A2:** page-size selector `hidden lg:block`; mobile pagination = «Показать ещё N» (без infinite).
- **B1:** open-date stepper под title (hero) + в BuyCard (`eventType=open_date` / flexible sessions).
- **B2:** primary price = **от X ₽**; range → hint; strikethrough `oldPriceRub` если есть (проброс из EventOffer в ticketPrices).
- **Deferred:** empty-state recommend block; full tabs Программа/Где/Отзывы.

### Проблемы
- Нет.

---

## 2026-08-04 - Mobile homepage UX cleanup

### Наблюдения
- Owner review главной на мобилке: hero chips сливаются в тёмную массу; 8 city-tiles / format photo cards съедают высоту; EventCard шумна (иконки + рейтинг); нижние тексты trust/how без clamp.
- Предыдущий MSK deploy `3e91e0e` («В мой день») уже complete (`BUILD_ID=symjivN_JtjbNOfzDYEFl`), деплой не ждал.

### Решения
- Hero: сильнее dark overlay (`HeroMedia` / `HomeHeroBackground`); chips = светлые badge (`bg-white/95`).
- Форматы на mobile: icon-on-white chip rail вместо тёмных photo tiles; города: ScrollRail вместо 2×4 grid.
- EventCard mobile: скрыты meta-icons / rating / duration; цена жирнее; CTA «Купить» без Ticket-icon; day-route chip hidden max-sm; desktop без лома.
- Trust/how: `ExpandableBlurb` «Развернуть» на mobile; чуть больше `--space-section`.
- Discount badge: deferred (нет `oldPrice` в catalog session DTO).
- Hotfix: lucide `Map` shadowing `new Map()` → `Map as MapIcon` (`405ac6d`).
- Live: `2aaea86`+`405ac6d`, MSK **BUILD_ID=`fjFoVm-Yur__0z8lPkrlv`**, `/` 200, markers `data-home-hero-chips` / `bg-slate-950/35` / `Развернуть`.

### Проблемы
- Первый web:build упал на `TypeError: i is not a constructor` (Map shadow); откат `.next.prev`, затем фикс и redeploy OK.
- Параллельный HEAD `c04ca02` (catalog chips, другой агент) поверх наших коммитов; наш UX в ancestry.
---

## 2026-08-04 - Must-see tiers: capitals MSK/SPB wide (corr.)

### Наблюдения
- Owner correction: MSK и SPB **не** капить на 12-18; нужен широкий curated set как у столичного хаба (ориентир 30-50+ / без жёсткого потолка 18).
- Large tourist ~12-18 + tabs остаётся default для **крупных нестоличных** городов.
- Day planner без изменений: soft ~10 / hard ~15; multi-day / presets для остального; hub может показывать много точек с фильтрами.
- Факт: `moscow` / `saint-petersburg` = 6 must-see; широких списков в repo нет - seed не выдумываем.

### Решения
- Project.md: тир **Capitals (MSK+SPB)** = wide 30-50+ quality-guided; правило **hub breadth ≠ day length**; NN = deep pack reference, не единственная модель.
- Tasktracker MS.TIER* + city-hub-content-gaps + этот Diary - выровнены под corr.
- Docs-only: commit + push, без web deploy / без смены `DAY_ROUTE_*`.

### Проблемы
- Phase B content fill blocked до списка owner или OK на draft wide SPB/MSK.

---

## 2026-08-04 - Must-see count tiers canon + MSK/SPB plan

### Наблюдения
- Owner: зафиксировать тиры объёма must-see; ответить что делать с Москвой и СПб (сейчас floor 6 как остальные).
- Факт: `moscow` / `saint-petersburg` = 6 must-see, без presets; `nizhny-novgorod` = 46 + gastro + `dayRoutePresets` (исключение).
- Готовых списков для MSK/SPB в docs / briefs / `.deploy-tmp` нет - seed не выдумываем.
- Day-route уже: soft `DAY_ROUTE_SOFT=10`, hard `DAY_ROUTE_MAX=15`; filter tabs shipped.

### Решения
- (superseded corr. выше) Изначально: floor **6** / typical **6-8** / large tourist **12-18** + tabs / NN exception.
- **Corr. owner:** MSK+SPB = capitals wide (не 12-18); large tourist 12-18 только non-capital default.
- Rollout: Phase A docs ✅; Phase B content одного города; Phase C второй. Рекомендация first: **СПб**, затем Москва.
- Docs-only: commit + push, без web deploy.

### Проблемы
- Нет списка точек от owner - Phase B blocked до confirm города + списка / OK draft.

---

## 2026-08-04 - Must-see batch7: 6-я точка для 6 городов

### Наблюдения
- После batch1-6 + NN в `city-hub-content-gaps` оставались ⚠️ (mustSee=5): Казань, Калининград, Владимир, Владивосток, Иркутск, Улан-Удэ.
- Остальные 60 hubs уже ≥6; dayRoutePresets пока только у НН.

### Решения
- `must-see-editorial-batch7.json` (6) → merge в `must-see-editorial.json` (база 436).
- `cityInfo` web+public: #6 slug + short desc; emdash в desc этих городов → `-`.
- Точки: Кремлёвская наб.; Музей янтаря; Георгиевская; Фуникулёр/Орлиная; Усадьба Сукачева; ул. Ленина.
- MSK enrich `--apply --file=batch7` + web deploy (ниже).

### Проблемы
- Нет. MSK apply **6 insert**; tip `5b724f4`; **BUILD_ID=`dtrpt-eetyBWyJA8DG1ye`**. Smoke 6/6 hubs 200 + slug titles; `/locations/kazan-kremlevskaya-naberezhnaya`, `/venues/kaliningrad-muzey-yantarya`, `/locations/vladivostok-funikulyor` 200. Post-deploy hub warm был до подъёма :3001 (fetch failed) - после старта OK.

---

## 2026-08-04 - Калининград: редакционный city hub

### Наблюдения
- У Калининграда был floor из 6 мест, но в него были смешаны городские точки и дальние направления побережья.
- `dayRoutePresets` описывает один день. Маршрут «Приморский экспресс» из двух разных пар направлений нельзя показывать одной карточкой без ложного обещания компактной логистики.

### Решения
- `cityInfo` в `apps/web` и `apps/public` синхронно расширен до 16 городских must-see: история, музеи, форты, архитектура, парк и две гастрономические точки.
- Куршская коса, Зеленоградск, Светлогорск, Балтийск и Янтарный вынесены в `significantSuburbs`.
- Добавлены три дневных пресета: «Классический Калининград за 1 день» и две самостоятельные части «Приморского экспресса» - коса с Зеленоградском, Светлогорск с Янтарным.
- Ссылки даны только шести существующим venue/location slug. Новые редакционные места не получают выдуманных URL.

### Проблемы
- У большинства новых редакционных точек пока нет подтвержденных публичных сущностей, поэтому они не участвуют в переходах на карточки и в автоматическом разрешении остановок «Мой день».
- MSK deploy завершен успешно: **BUILD_ID=`r2mjG85wAr1M8fH6RkyU-`**. Smoke `https://daibilet.ru/cities/kaliningrad` - HTTP 200, в SSR есть «Классический Калининград за 1 день» и «Музей Мирового океана».

---

## 2026-08-04 - Destinations TTL 86400 + on-demand tag revalidate

### Наблюдения
- Solution 3: `getCachedDestinations` уже `revalidate: 86400` + tags `public-surfaces` / `destinations` (`7835886`), чтобы layout не капил `/events/[slug]` ISR на 300.
- Admin `PATCH /api/admin/cities/:id` вызывал `invalidatePublicCaches('city update')`, но Next invalidator срабатывал только при `warm` или event-update - destinations Data Cache жил до 24ч без bust.

### Решения
- `revalidateNextDestinations` → `POST /api/internal/revalidate` tags `destinations`, `public-surfaces`, `home-page` + paths `/`, `/cities`.
- Invalidator: reason `city update` / `destinations refresh` всегда дергает Next (как `revalidateNextEventPage`).
- `revalidateNextHome` (catalog warm) тоже включает tags destinations/public-surfaces.
- Endpoint уже принимает произвольные `tags`; пример: `{ "tags": ["destinations"] }` + Bearer `DAIBILET_NEXT_REVALIDATE_SECRET`.

### Проблемы
- Нет. Suspense split (Solution 1) не нужен при webhook-backed long TTL.
- Live: commits `12b734c` + docs `5e22378`; после piggyback batch7 tip `5b724f4`, **BUILD_ID=`dtrpt-eetyBWyJA8DG1ye`**. Map-focus (`fcd656f`) ранее: **BUILD_ID=`h8y5jcytDJ7KNTtJnXzBm`**.

---

## 2026-08-04 - City hub: Значимые пригороды + путь хаб→гиды→билеты

### Наблюдения
- Петергоф / Царское / Кронштадт - часть агломерации СПб, но day-trip; в mustSee смешивались с «в городе».
- Каталог saleable ещё узкий: полный рассказ о городе через одну афишу не закрыть.

### Решения
- `cityInfo.significantSuburbs` + блок «Значимые пригороды {City_Род}» на hub (СПб: 3 пункта; Петергоф убран из mustSee, вместо него Стрелка ВО).
- Канон: hub → тематические blog-гиды → CTA билетов по мере роста офферов.
- День по-прежнему soft 10 / hard 15.

### Проблемы
- Царское / Кронштадт / Стрелка пока без entity slug (нет битой ссылки); Петергоф линкуется. Seed entities - follow-up.
- Live: tip `16d10ca`, **BUILD_ID=`pA38C3r_vUStAEuHiAZuO`**; `/cities/sankt-peterburg` 200 + `data-city-significant-suburbs`.

---

## 2026-08-04 - /my-day desktop: map focus card above Leaflet

### Наблюдения
- Клик по маркеру desktop OSM ставил `focusedStopId`, но карточка с `z-20` была под Leaflet panes (z ~400-700).

### Решения
- Обёртка карты `isolate` + focus card / mobile stops rail `z-[1100]` / `z-[1000]`.

### Проблемы
- Нет. MSK tip `fcd656f`, **BUILD_ID=`h8y5jcytDJ7KNTtJnXzBm`**; `/my-day` 200. Warm post-deploy был до готовности :3001 (fetch failed) - web после старта OK.

---

## 2026-08-04 - /events/[slug] runtime ISR 7200 + on-demand revalidate

### Наблюдения
- После `EVENT_SSG_TOP_N=40` тысячи `/events/[slug]` уходят в runtime; `revalidate=300` + общий tag `event-page` давали частые cold fetch к Public API.
- Отдельный `/api/revalidate` не нужен: уже есть `POST /api/internal/revalidate` (Bearer `DAIBILET_NEXT_REVALIDATE_SECRET`).

### Решения
- Page ISR `export const revalidate = 7200`; `EVENT_PAGE_REVALIDATE=7200` в `unstable_cache`.
- `getCachedPublicEventDto` / rating: React `cache()` + `unstable_cache` + tags `event-page` и `event-page:{slug}`.
- Internal revalidate принимает `slug` → tag + path `/events/{slug}`.
- Backend: `revalidateNextEventPage`; admin event updates всегда дергают Next (не только при `warm`); admin forms передают hidden `slug`.
- `fetchPublicApiJson` остаётся `no-store` внутри `unstable_cache` (Data Cache на уровне Next, не native fetch cache).

### Проблемы
- Без `DAIBILET_NEXT_REVALIDATE_SECRET` on-demand skip; stale HTML до 2ч. Проверить секрет на MSK после deploy.
- SiteLayout `getCachedDestinations` с TTL 300 занижал page ISR до `s-maxage=300` (Next берёт min по всем cache на странице) → destinations TTL 86400.
- Live: tip `7835886`, **BUILD_ID=`wxgo6Jh1AliLT36-1eoqe`**; smoke `s-maxage=7200` HIT; `POST /api/internal/revalidate` `{slug}` → tags `event-page` + `event-page:{slug}`.

---

## 2026-08-04 - MSK web:build SSG TimeoutError harden

### Наблюдения
- Failures: prerender `/events/[slug]` → `TimeoutError` (AbortSignal / code 23) on public API fetch mid-`next build`.
- One timeout aborts entire build; broken `.next` left web down until manual restore.

### Решения
- `fetchPublicApiJson`: build-phase retries (3× exponential backoff); `isTimeoutError` helper.
- `/events/[slug]`: soft-catch timeout in page + metadata during `NEXT_PHASE=phase-production-build` → warn + `notFound()` (runtime/`dynamicParams`/revalidate refill).
- `EVENT_SSG_TOP_N` default **40** (was 200); `0` = skip event SSG; deploy exports default 40.
- `deploy-prod-next.sh`: save healthy `.next` → `.next.prev` before build; on fail restore + start web.

### Проблемы
- Soft notFound on timed-out SSG slug may briefly serve 404 until ISR/first regen - better than red deploy. MSK **BUILD_ID=`6ky5NRSMiRIBzAUTqpmMv`** (tip `84232895`), `/my-day` 200; deploy log: `EVENT_SSG_TOP_N=40`, no Export abort.

---

## 2026-08-03 - /my-day mobile: chrome cleanup (hub link + toggles)

### Наблюдения
- «Страница {City_Род}» в одной строке с readiness ломалась посередине рядом с «Поделиться».
- Рядом жили два тоггла с словом «Список»: экран Список|Карта и плотность Сетка|Список.

### Решения
- Hub-ссылка на отдельной строке под readiness.
- `data-day-stop-view-toggle` только `lg+`; на mobile всегда dense list (`effectiveStopViewMode`).
- Список|Карта (`data-day-mobile-view-toggle`) остаётся на mobile. Drawer Wanderlog - вне скоупа.

### Проблемы
- Нет. MSK **BUILD_ID=`RDvpU8E3GRJn5-OE2fLW1`** (tip `4405d364`), smoke `/my-day` 200. (Deploy retry with `EVENT_SSG_TOP_N=40` after SSG timeout on full top-200.)

---

## 2026-08-03 - /my-day mobile: list-first + map mode (Wanderlog)

### Наблюдения
- Sticky OSM 38vh + полный SiteFooter + sticky bar съедали экран: мало места на карточки/поиск.
- У самого Wanderlog на телефоне List и Map - **раздельные режимы**, не split 35-40% карты сверху.

### Решения
- Убран mobile sticky split (`data-day-mobile-map` / 38dvh / expand / viewport lock).
- Mobile list-first: обычный document scroll (`data-day-mobile-list-first`); toggle **Список|Карта** (`data-day-mobile-view-toggle`); режим Карта = fullscreen OSM (`data-day-mobile-map-mode`, body overflow lock).
- Desktop карта `data-day-route-map-desktop` без изменений.
- `/my-day`: `SiteLayout footerVariant="compact"` - логотип + email + copyright + legal, без колонок/популярных направлений.

### Проблемы
- Нет. MSK **BUILD_ID=`0Fnc1S9ndw3dPSeEmy2Za`** (tip `4ffb251b`), smoke `/my-day` 200: `data-site-footer="compact"`; chunk: `data-day-mobile-list-first`, `data-day-mobile-view-toggle`, `data-day-mobile-map-mode` (без 38dvh / map-expand).

---

## 2026-08-03 - City hub «Главные места»: desktop page prev/next

### Наблюдения
- Owner: на md+ карусель must-see лучше листать кнопкой на «экран», а не через видимый horizontal scrollbar.
- Mobile swipe/scroll оставить.

### Решения
- `CitySightsMustSeeList`: prev/next (`data-city-must-see-prev|next`, `hidden md:inline-flex`); `scrollBy(clientWidth)`; scrollbar скрыт на md+.
- Mobile: прежний `horizontal-snap-row` + 85/15; 2-row `md:grid-rows-2` без изменений.

### Проблемы
- Нет. MSK **BUILD_ID=`blIpyGTrMYrwYoh4jkBws`** (tip `33e9ca85`, incl. `5ffbfded`), smoke `/cities/moscow`+`nizhny-novgorod` 200: `data-city-must-see-prev|next`, `md:grid-rows-2`, `scrollbar-width:none`.

---

## 2026-08-03 - City hub owner polish (падеж, hook, rail, venues, no mood quiz)

### Наблюдения
- «Зачем ехать в Москве» - стыд падежа; нужно винительный «в Москву».
- hookFact почти как H2; нужен body `text-sm text-slate-600`.
- «Главные места»: desktop 2-в-столбик карусель; убрать subtitle «Точки…».
- Мини-тест афиши лишний. «Площадки и локации» - одна широкая строка с дырой; нужно `md:grid-cols-2`.

### Решения
- `inCityAccusative` / `cityToAccusative` в `city-declension`; WhyGo title через `cityInAccusative`.
- hookFact: `text-sm leading-6 text-slate-600`.
- Must-see: `md:grid-rows-2` колонки; subtitle убран.
- Удалены `CityMoodQuiz` / mood filter. Venues: `md:grid-cols-2`, name+address stack.

### Проблемы
- Нет. MSK **BUILD_ID=`9Y0CrLqmzM7hckZVe2RRb`** (ветка incl. `e96e999c`, tip `79283095`), smoke `/cities/moscow` 200: `Зачем ехать в Москву`; hook `text-sm … text-slate-600`; `md:grid-rows-2`; venues `md:grid-cols-2`; без subtitle / mood quiz.

---

## 2026-08-03 - City hub «Главные места»: desktop 2-row stack carousel

### Наблюдения
- Owner: desktop «Главные места» снова как 2 карточки **в столбик** на колонку карусели (не горизонтальный ряд крупных карточек); mobile - по одной.
- Подзаголовок «Точки, с которых удобно начать знакомство с городом» убрать.

### Решения
- `CitySightsMustSeeList`: scrollport + `ol` `md:grid md:grid-rows-2 md:grid-flow-col` (колонка = 2 карточки сверху вниз); mobile `flex` + `w-[85%]` peek.
- Убран subtitle под H2 и под H3 списка. HookFact / hero brief / story cards не трогали.

### Проблемы
- Нет. Deploy pending.

---

## 2026-08-03 - City hub: brief обратно в hero, story cards скрыты

### Наблюдения
- Owner после редизайна (`5PaOsq5u2eoVkCSuYdVzh`): в hero пропал short description (brief гасился при наличии hookFact); блок «Истории города» лишний.

### Решения
- `CityHeroStrip`: brief снова всегда в hero (`guide.brief` или fallback).
- `CityWhyGoSection`: только hookFact («Факт дня»); brief не дублируем; UI story cards не рендерим (cityInfo не трогали).
- Tab «Зачем ехать» / `#about` по наличию hookFact.

### Проблемы
- Нет. MSK **BUILD_ID=`DDNYHaaqzcrNwwq6UfUrd`** (`31b5a8b0`), SMOKE_OK `/cities/moscow` 200; hero brief после H1; «Истории города» отсутствует; hub warm transient fetch failed (web restart mid-warm) - сервис active.

---

## 2026-08-03 - City hub: hookFact + IA «Зачем ехать»

### Наблюдения
- Owner прислал description + hookFact для 65 городов (слитый текст 1-65) и ТЗ на переформатирование хаба: hook сразу после hero, «Главные места» выше статей, блог SEO в подвал, афиша Сегодня/Завтра/Выходные + мини-тест настроения.
- В текстах были маркеры `[INDEX]` и длинные тире; Рязань hook обрезан у owner; Чита содержала опечатку «в Сирии».

### Решения
- `cityInfo` (web+public): brief + `hookFact` для 65 городов; плюс grounded hook для Нижнего Новгорода (smoke). Тире нормализованы в `-`, `[INDEX]` вырезан.
- `CityPageView`: порядок Hero → Зачем ехать (hookFact + brief + story cards) → Главные места → Афиша (хиты, Сегодня/Завтра/Выходные, mood quiz) → Советы → Топ-запросы → Из блога (подвал) → SEO.
- Якорь `#about` сохранён; aliases `why-go` / `zachem-ehat`.

### Проблемы
- Нижний Новгород не входил в owner-список 65; hookFact синтезирован из mustSee, не из owner-пакета.
- Партнерский виджет логистики (Ласточки) не делали - только cityInfo travel.
- Deploy: актуальный канон MSK-only (`deploy-prod-next.sh`), не SPB→MSK; live **BUILD_ID=`5PaOsq5u2eoVkCSuYdVzh`** @`0ad064bc`.

---

## 2026-08-03 - City hub «Главные места»: desktop 2-up via max-lg scope

### Наблюдения
- Owner: desktop scroll «Главные места» должен показывать **2 карточки в ряд**, не 1; меньшие разрешения - по 1 (85/15).
- Базовые `w-[85%] min-w-[85%]` без `max-lg:` оставляли риск, что mobile width «побеждает» desktop override в каскаде.

### Решения
- Cards: `max-lg:w-[85%] max-lg:min-w-[85%]` только ниже lg.
- lg+: `lg:w-[calc((100%-1.5rem)/2)] lg:min-w-[calc((100%-1.5rem)/2)] lg:flex-[0_0_calc((100%-1.5rem)/2)]` - ровно ~2 в кадре, scroll сохраняется.
- Rail без изменений: `horizontal-snap-row flex flex-nowrap gap-3 lg:gap-6`.

### Проблемы
- Нет. MSK **BUILD_ID=`A5HAtdeNtF6dr0ehtWJjp`** (`f8ed928`), SMOKE_OK NN 200; SSR×16: `max-lg:w-[85%]` / `max-lg:min-w-[85%]` / `lg:w-[calc((100%-1.5rem)/2)]` / `lg:flex-[0_0_calc((100%-1.5rem)/2)]`; chunk+CSS OK; Playwright desktop ratio≈0.49 bothInView, mobile 0.85.

---

## 2026-08-03 - City hub «Главные места»: restore desktop horizontal rail

### Наблюдения
- Owner: «а зачем ты убрал прокрутку для десктопа для Главных мест по 2 штуки?» - `lg:grid` убил overflow-x scroll.
- Нужно: mobile 85/15 peek оставить; desktop снова horizontal rail с ~2 карточками в кадре.

### Решения
- Убран `lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:overflow-visible`.
- Rail: `horizontal-snap-row flex flex-nowrap snap-x gap-3 lg:gap-6`.
- Cards: mobile `w-[85%] min-w-[85%]`; desktop `lg:w-[calc((100%-1.5rem)/2)] lg:min-w-[calc((100%-1.5rem)/2)]` (~2 cards, gap-6).
- Фильтры / «В маршрут» / blurbs / нумерация без изменений.

### Проблемы
- Нет. MSK **BUILD_ID=`t_kK0qCtPxhAPUbMfhjdg`** (`ce3afd2`), SMOKE_OK `/cities/nizhniy-novgorod` 200; SSR: `w-[85%]` / `min-w-[85%]` / `lg:w-[calc((100%-1.5rem)/2)]` / `lg:min-w-[calc((100%-1.5rem)/2)]`; без `lg:grid` / `grid-rows-2`.

---

## 2026-08-03 - /my-day: SEO package (noindex + share OG)

### Наблюдения
- Owner: title 3 + description A; оставить `noindex,nofollow` до SEO-контента; OG для шаринга сейчас.

### Решения
- Title: `Собери маршрут на день: места, музеи и события` (+ template `| Дайбилет`).
- Description: маршрут / музеи / места / события / план / ссылка (без бренда в desc).
- `buildShareMetadata` + `canonical=/my-day`; robots без изменений.

### Проблемы
- Нет. MSK **BUILD_ID=`qZnQ6TqtoJkKtvxVB9mtI`** (`31a0dc0`), title/desc/og:/robots=noindex verified on `/my-day`.

---

## 2026-08-03 - /my-day: Готовые сценарии under Hot Picks

### Наблюдения
- Owner: под «Выбор Дайбилет» нужны «Готовые сценарии» как на хабе НН (если есть dayRoutePresets / fallback).

### Решения
- `CityDayPresetBlock`: props `navigateToMyDay` / `inMyDay` (на /my-day без redirect, CTA «Собрать день»).
- `DayRoutePanel`: блок сразу под Hot Picks при `hasPageCity`; `namedPresets` из `resolveCityInfo().dayRoutePresets`.
- Marker `data-day-presets=my-day`.

### Проблемы
- Нет. MSK **BUILD_ID=`cM9j1lcFbpgHSogY-npKs`** (`f280018`), `/my-day` 200; chunk has `inMyDay` / presets wiring.

---

## 2026-08-03 - /my-day: progressive catalog load for search

### Наблюдения
- Owner: поиск в starter подвисает - ждёт весь каталог.
- Было: `Promise.all` locations500+venues500+events100; input `disabled` пока `catalogLoading`.

### Решения
- Три семьи грузятся независимо; UI обновляется по мере прихода.
- SearchSelect больше не блокирует input на `loading`; dropdown «Загружаем…» только пока options пусты.
- Trio: per-family `catalogLoadingParts`; marker `data-day-catalog-load=progressive`.

### Проблемы
- Нет. MSK **BUILD_ID=`blIpyGTrMYrwYoh4jkBws`** (`33e9ca8`), `/my-day` 200; chunk: `progressive`.

---

## 2026-08-03 - /my-day: catalog trio always open (no accordion/border)

### Наблюдения
- Owner: «Ещё из каталога» в аккордеоне+бордере теряется на странице.

### Решения
- Секция всегда раскрыта: без `border`/`rounded-2xl` card, без chevron/toggle.
- Markers: `data-day-catalog-open=1`; убран `data-day-accordion=catalog` / `catalogOpen`.

### Проблемы
- Первый прогон: ENOENT `.nft.json` mid-build; повтор с `rm -rf apps/web/.next` → OK.
- MSK **BUILD_ID=`sgVL2jxb2mwH2VaNjj3fm`** (`902fb3b`), `/my-day` 200; chunk: `data-day-catalog-open`; без accordion.

---

## 2026-08-03 - /my-day: «Страница {City_Род}» link in readiness line

### Наблюдения
- Owner: в строке «N точек из 10» добавить `• Страница {город}` со ссылкой на хаб; родительный падеж; bullet 6–8px; primary blue + hover underline.

### Решения
- Header readiness: `summaryLine` + `mx-1.5 •` + `Link` на `cityHubHref` (`/cities/{slug}`).
- Текст: `Страница ${cityToGenitive(scopeCityName)}` (уже есть в `city-declension`).
- Стиль: `text-primary-600 hover:text-primary-700 hover:underline`; marker `data-day-city-hub-link`.

### Проблемы
- Нет. MSK **BUILD_ID=`9Y0CrLqmzM7hckZVe2RRb`** (HEAD includes `b21531b`), `/my-day` 200; chunk: `data-day-city-hub-link` / `Страница `.

---

## 2026-08-03 - /my-day: starter right +10px

### Наблюдения
- Owner: equal-M ок; правый блок опустить на 10px.

### Решения
- Right col: `lg:translate-y-[10px]`.

### Проблемы
- Нет. MSK **BUILD_ID=`umF956jGsTDDLWLKJ4LIl`** (`06a7b34`/`2b204e6`), `/my-day` 200; `lg:translate-y-[10px]`.

---

## 2026-08-03 - /my-day: starter full-width + equal-M (owner)

### Наблюдения
- Owner: mock с `max-w-6xl` / justify-between - неверно.
- 1) контейнер = ширина шапки (`container-page` / full, не 6xl);
- 2) слева / между блоками / справа - равнозначные отступы.

### Решения
- Card `w-full` (`max=full`); desktop `lg:grid-cols-[1fr_auto_1fr_auto_1fr]` equal-M; copy `col-start-2`, form `col-start-4` `w-[400px]`; `items-center` + equal `py`.
- Markers: `inset=equal-m`, `align=col`, `form-w=400px`.

### Проблемы
- Нет. MSK **BUILD_ID=`mHjJgyoGso3NrFan4glCI`** (`8c9d427`), `/my-day` 200; chunk: `equal-m` / `1fr_auto_1fr_auto_1fr` / `lg:w-[400px]`; без `max-w-6xl`.

---

## 2026-08-03 - /my-day: starter = owner Tailwind mock

### Наблюдения
- Owner: предыдущие half-center / edge-balance - не то. Ориентир - явный mock: `max-w-6xl`, `md:justify-between md:items-center`, form `md:w-[400px]`, icon+copy `items-start gap-4`, pad `p-8 md:p-10`.

### Решения
- `renderUnifiedSearch(true)` переписан под mock; CityPicker / DayRouteSearchSelect без замены на raw select.
- Markers: `max=6xl`, `inset=mock`, `align=between-center`, `form-w=400px`.

### Проблемы
- Нет. MSK **BUILD_ID=`WuO0reHDHKNjur8ruOh1i`** (`d9076f5`), SMOKE_OK `/my-day` 200; mock: `max-w-6xl` / `md:w-[400px]` / `between-center`.

---

## 2026-08-03 - /my-day: starter edge-balance + v-center

### Наблюдения
- Owner (desktop скрин): правая группа полей не оптически по центру по высоте; half-center (`grid-cols-2` + center в каждой половине) раздувает правый inset на wide.
- Нужны: вертикальный центр формы в карточке + умеренный отступ справа ≈ воздух от левого copy.

### Решения
- Desktop: `lg:flex-row lg:items-center lg:justify-between` + equal side `lg:px-8 xl:px-10` / `lg:py-6`; form `lg:w-[26rem] shrink-0`.
- Left copy left-aligned (без half `justify-center`); mobile stack A без изменений.
- Markers: `inset=edge-balance`, `align=v-center`.

### Проблемы
- Нет. MSK **BUILD_ID=`46gisQhL6nR_0dsiEP3H2`** (`0c75e27`), SMOKE_OK `/my-day` 200; chunk: `edge-balance` / `v-center` / `lg:px-8` / `lg:py-6` / `lg:w-[26rem]`; без `half-center`.

---

## 2026-08-03 - City hub «Главные места»: mobile 85/15 carousel

### Наблюдения
- Owner: на mobile «Главные места» была 2-row horizontal grid (`grid-rows-2`) - узкие колонки и обрезанная соседняя колонка вместо нормального свайпа.
- Нужна карусель: одна карточка ~85% ширины контейнера, справа peek ~15% следующей; desktop - обычная сетка.

### Решения
- `CitySightsMustSeeList`: `ol[data-city-must-see-rail]` = scrollport (`horizontal-snap-row` + `flex snap-x snap-mandatory`).
- Mobile: card `w-[85%] min-w-[85%] shrink-0 snap-start` + `gap-3` → peek следующей справа.
- `lg+`: `lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:overflow-visible`; card `lg:w-auto lg:min-w-0`.
- Фильтры / «В маршрут» / ExpandableBlurb / нумерация без изменений; `key={activeId}` сбрасывает scroll при смене таба.

### Проблемы
- Нет. MSK **BUILD_ID=`7wFfw5TzkPT6XDTklCiC7`** (`466a38c`), SMOKE_OK `/cities/nizhniy-novgorod` 200; SSR: `w-[85%]`×16 / `min-w-[85%]` / `snap-start` / `lg:grid-cols-2`; без `grid-rows-2`.

---

## 2026-08-03 - /my-day: starter independent half-centering

### Наблюдения
- Owner (скрин с красной mid-line): equal-M `1fr auto 1fr auto 1fr` держит copy и form у midline - в каждой половине контент «прилипает» к центру карточки, а не к центру своей половины.

### Решения
- Desktop: `lg:grid-cols-2 lg:items-center` - две равные половины.
- Left: `data-day-starter-left` = `flex … lg:items-center lg:justify-center` вокруг copy-блока.
- Right: `data-day-starter-right` = тот же half-center; form stack `lg:w-[26rem]` центрируется как группа.
- Card equal `py-*` (sym); mobile compact A без изменений. Markers: `inset=half-center`, `align=half`.

### Проблемы
- Нет. MSK **BUILD_ID=`Nh-E3RXywMq_-DpzDLdBS`** (`5a15fa0`), SMOKE_OK; chunks: `half-center` / `lg:grid-cols-2` / `day-starter-left` / `day-starter-right` / `lg:w-[26rem]` / `pl-5`.

---

## 2026-08-03 - /locations/stadion-polet soft-404

### Наблюдения
- Live `https://daibilet.ru/locations/stadion-polet` → HTTP 200 soft-404 («Площадка не найдена»), `noindex`, `NEXT_HTTP_ERROR_FALLBACK;404`.
- DB: `venue_6252fd6a8bafbd8352a63178` «Стадион "Полёт"» (НН, Чаадаева 16б), kind `SPORT_ACTIVITY_SPACE`, slug был `stadion-polet-{id}`, **pageStatus=NONE**, 0 Event.
- Search находил площадку (`pageStatus <> HIDDEN`) и вёл на `/locations/...`, а `buildPublicVenuePage` возвращал null: zero-event location escape требует status ≠ NONE|HIDDEN; SPORT не content-place.

### Решения
- Prod SQL/ensure: `pageStatus=CANDIDATE`, канонический slug `stadion-polet` (legacy id-suffix резолвится по opaque id).
- `scripts/ensure-stadion-polet-venue.js` для повторяемости.
- Search href → `publicVenueSlug(...)` (не сырой DB slug с opaque suffix).
- Revalidate tag `venue-page` + purge nginx HTML cache.

### Проблемы
- Кэш API (5 мин) и nginx `proxy_cache` держали soft-404 после SQL; без `?refresh=1` / revalidate / purge страница оставалась битой.

---

## 2026-08-03 - /my-day: starter equal py + right ~30% wider

### Наблюдения
- Owner (desktop/ultrawide screenshot): bottom air under «или добавь своё место» больше top; right form узкий; equal-M и `pl-5` оставить.

### Решения
- Убран `lg:min-h-[7.75rem]` (лишний вертикальный объём); card pad `lg:py-5` / mobile `max-lg:py-3.5` / `sm:max-lg:py-4` (pt === pb); обе колонки `lg:items-center`.
- Right auto-col: `lg:w-[20rem] lg:min-w-[16rem]` → `lg:w-[26rem] lg:min-w-[21rem]` (~+30%); left shrink-wrap; grid `1fr auto 1fr auto 1fr` без изменений.
- Link `pl-5` / `mb-0` сохранён. Stop cards не трогали. Marker `data-day-starter-form-w="26rem"`.

### Проблемы
- Нет. MSK **BUILD_ID=`iAH719KaM6rt2dkoNct1L`** (`3e1fc7b`), SMOKE_OK; chunks: `equal-m` / `1fr_auto_1fr_auto_1fr` / `lg:w-[26rem]` / `pl-5` / `form-w`.

---

## 2026-08-03 - /my-day: rollback banner starter → equal-M only

### Наблюдения
- Owner: banner template (`max-w-5xl` + `justify-between`) даёт huge outer voids и tiny middle gap - не то. Нужны только geometry fixes, без fancy chrome.

### Решения
- Rollback starter banner: full-width card (`data-day-starter-max="full"`), desktop `lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center` equal-M, equal `py`, mobile stack A.
- Subtle slate icon box kept; sky/tall field chrome reverted (`h-11` / `min-h-11`).
- «или добавь своё место» `pl-5` (~1–2cm right of field edge).
- Stop cards `owner-v6` не трогали.

### Проблемы
- Нет. MSK live **BUILD_ID=`5xGhCZWOBDZPUtSjGbI6f`** (HEAD includes `0d4e31f` equal-M); first deploy SMOKE_OK was `dBJJrsme4tAv2WPJl1Yxr`, then parallel stop-card commits redeployed. Chunks: `equal-m` / `1fr_auto_1fr_auto_1fr` / `pl-5`; banner/`max-w-5xl` gone.

---

## 2026-08-03 - /my-day: starter banner + stop card v6 templates

### Наблюдения
- Starter: middle hole from 5-col / short left vs tall form; owner gave banner template (`max-w-5xl`, `md:items-center justify-between`).
- Stop cards: new hierarchy template - larger thumb, breathable pad, meta badges for time/distance, larger tap actions.

### Решения
- Starter `data-day-starter-variant="banner"`: `p-6 md:p-8 lg:p-10`, icon in `bg-sky-50` box, form `md:max-w-md gap-3.5`, link `text-sky-700` + `px-1`; stable min-h on form; CityPicker/Search taller `py-3.5` + border.
- Grid stop `owner-v6`: thumb 16 + N on corner; ↑↓ under thumb; title/address/meta badges (`~N мин`, distance); actions `p-2`.
- List dense unchanged. Offers title-first dedupe already live.

### Проблемы
- Owner rejected banner starter - rolled back to equal-M (см. запись выше).

---

## 2026-08-03 - /my-day: dedupe matching excursion cards

### Наблюдения
- «Подходящие экскурсии»: 8 одинаковых карточек «Обзорная… Исаакиевского собора» (одинаковая цена / рядом).
- Root cause: `dayRouteMatchDedupeKey` был **slug-first**. TC sessions = один продукт, разные slug → slug base не схлопывался → N копий. UI рендерил `payload.matches` as-is.

### Решения
- Dedupe key: **title-first** (`normalizeDayRouteTitleKey`, len≥12); slug base как fallback; усилен strip mid-slug mongo ids.
- Client safety-net: `uniqueMatches = dedupeDayRouteMatches(payload.matches)` + `data-day-matches-deduped`; счётчик «Найдено» от unique.
- Unit: 8 unique-slug siblings → 1 card (cheapest).

### Проблемы
- MSK был на `85c5baf` (deploy owner-v5 preflight упал) - нужен полный MSK deploy этого + UI pending.

---

## 2026-08-03 - /my-day: dense list stops + owner-v5 cards

### Наблюдения
- List mode: huge vertical hole between title and address - tall ↑↓ column stretched (`justify-between` / stretch) split chevrons across title/meta rows.
- Card mode: ↑↓ under thumb; title items-center vs thumb; equal py.
- Starter: shared mobile px col + equal py; desktop equal-M 5-track.

### Решения
- List: `data-day-stop-list="dense"` - ↑↓ **side-by-side** next to number (`h-5 self-start`); title/meta `leading-snug` + `mt-0.5`; row `items-start` (never stretch sort column).
- Grid `owner-v5`: `grid-cols-[3rem_minmax(0,1fr)]` thumb|text(items-center) / sort|далее; `items-start` on plan list.
- Starter: `max-lg:py-3.5` + `max-lg:px-3.5` + `lg:grid-cols-[1fr_auto_1fr_auto_1fr]`.

### Проблемы
- Довести MSK deploy до SMOKE_OK; вернуть BUILD_ID.

---

## 2026-08-03 - /my-day: starter true equal-M geometry (5-col grid)

### Наблюдения
- Owner: `lg:grid-cols-2` + gap + `justify-center` в половинах даёт фейковый 50/50 - визуальный gutter между блоками ≠ edge paddings (leftover 1fr сидит между контентом).
- Нужна геометрия `[ M ][ LEFT ][ M ][ RIGHT ][ M ]` где все три M равны и растут на ultrawide; top/bottom M_v равны.

### Решения
- Desktop lg+: `lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center` (без gap/px 50/50).
- Left: `lg:col-start-2` shrink-wrap; right: `lg:col-start-4 lg:w-[20rem] lg:min-w-[16rem] lg:min-h-[7.75rem]`.
- Marker: `data-day-starter-inset="equal-m"`; mobile A / stable disabled-search без изменений.
- Equal `lg:py-5` на card + `items-center` = симметричный вертикальный air.

### Проблемы
- Предыдущий redeploy убивался pkill - этот прогон довести до SMOKE_OK и проверить chunk на `1fr_auto_1fr_auto_1fr`.

---

## 2026-08-03 - /my-day: starter left center + right stretch + stable geometry

### Наблюдения
- Owner furious: left copy stuck at far left of left half; right stack not vertically centered; card collapses when !hasPageCity (yellow notice instead of search).
- Mobile A approved - не трогать.

### Решения
- Grid: `lg:items-stretch` + equal px/gap.
- Left: `lg:flex lg:h-full lg:items-center lg:justify-center` (copy centered in left half).
- Right: `lg:h-full lg:min-h-[7.75rem] lg:justify-center lg:self-stretch`.
- Always render disabled search + flush «или добавь…» when !hasPageCity (`data-day-starter-geometry="stable"`); no yellow card collapse.

### Проблемы
- Owner не видел фиксы: MSK оставался на `170fcde` / BUILD `zWhruNKKc49M4HkJdf7M8` пока origin уже был `85c5baf` (redeploy прерван / self-pkill). После clean MSK **BUILD_ID=`nR2QJSoeHmkwIjfOMIw1A`** (`85c5baf`), SMOKE_OK; live my-day chunk contains `lg:items-stretch` / `2xl:px-20` / `stable`.

---

## 2026-08-03 - /my-day: ultrawide starter equal gap + right column balance

### Наблюдения
- Ultrawide: outer left/right inset и middle gap между колонками должны быть равны и крупнее `2xl:px-16`.
- Правая колонка (город/поиск/ссылка) визуально top-heavy - нужен equal top/bottom air.
- «или добавь своё место» смещена вправо относительно левого края search input.
- Owner (follow-up): mobile starter A на скрине - **канон, не трогать** (inline icon, one-line subtitle, stack, equal py). Правки только lg+/2xl.

### Решения
- Grid: matching `px`/`gap` tokens - `lg:px-8 lg:gap-8`, `xl:px-12 xl:gap-12`, `2xl:px-20 2xl:gap-20`; `data-day-starter-inset="equal-gap"`.
- Right stack: `lg:self-center` (+ left `lg:self-center`); grid `lg:items-center`.
- Link: `pl-0 text-left`, button `m-0 p-0` - flush under search field left edge.
- Mobile (`max-lg`) structure/density без изменений.

### Проблемы
- Нет. MSK **BUILD_ID=`zWhruNKKc49M4HkJdf7M8`** (`170fcde`), SMOKE_OK; equal-gap `2xl:px-20/gap-20` + `lg:self-center` in chunks.

---

## 2026-08-02 - /my-day: starter pad + desktop subtitle + ultrawide inset

### Наблюдения
- Mobile: лишний нижний воздух в empty starter (красная зона на скрине) - pt/pb должны быть симметричны.
- Desktop: subtitle «Выбери город…» - две строки явно.
- Ultrawide: `max-w-6xl` + сжатие карточки - неверный подход; нужна полная ширина колонки + inset от краёв.

### Решения
- Mobile: `py-3` / `sm:py-4` / `lg:py-5` (equal pt/pb); stack `mt-3` вместо `mt-4`.
- Subtitle: `lg:hidden` одна строка; `hidden lg:block` + `<br />` - «Выбери город и минимум 2 точки» / «для составления маршрута».
- Убран `max-w-6xl mx-auto`; card `w-full`; inner grid `lg:px-6 xl:px-10 2xl:px-16` (`data-day-starter-max="full"` + `data-day-starter-inset="edges"`).

### Проблемы
- Нет. MSK **BUILD_ID=`I1b39S7TOIRax4a8s4z--`** (`378fb3e`), SMOKE_OK; starter inset + 2-line subtitle in chunks; `max-w-6xl` gone from starter.

---

## 2026-08-02 - /my-day: starter max-w-6xl on wide screens

### Наблюдения
- Owner: empty starter OK на Full HD, на ultrawide слишком растянут (two-col на всю ширину контейнера).

### Решения
- Starter section only: `mx-auto w-full max-w-6xl` (1152px) + `data-day-starter-max="6xl"`; страница/`container-page` остаётся `max-w-7xl`.
- Mobile A + two-col variant 1 без изменений; events search + placeholder уже в `aeff488`.
- **Superseded** следующей записью (full-width + edge inset).

### Проблемы
- Нет. MSK **BUILD_ID=`Zr8QqKS-qQp6XC5LjYQwu`** (`e307782`), SMOKE_OK; starter `max-w-6xl` + events placeholder in chunks.

---

## 2026-08-02 - /my-day: events in unified search + placeholder

### Наблюдения
- События уже были в `unifiedSearchOptions`, но dropdown `slice(0, 40)` брал только loc→ven в начале: при 250+ местах events не видны.
- Placeholder говорил только про место.

### Решения
- `takeDayRouteSearchOptions`: round-robin `loc:`/`ven:`/`event:` в топ-40.
- Popular events `limit=100` + remote `q` merge (`eventsSearchExtra`) при вводе ≥2 символов.
- Placeholder: «Найти место или событие». Desktop starter two-col уже в `607cba6`.

### Проблемы
- Нет (BUILD_ID после MSK deploy).

---

## 2026-08-02 - /my-day: desktop empty-starter two-column (variant 1)

### Наблюдения
- Owner выбрал desktop empty-starter **variant 1** (две колонки на всю ширину секции). Mobile compact **A** без регрессии.

### Решения
- `renderUnifiedSearch(asStarter)`: `max-lg` - узкий centered column как A; `lg:grid lg:grid-cols-2` - слева icon+title+subtitle, справа city/search/«добавь своё место»; убран `lg:max-w-lg`.
- Markers: `data-day-starter-desktop="two-col"`; stop cards не трогали.

### Проблемы
- Нет (BUILD_ID после MSK deploy).

---

## 2026-08-02 - /my-day: owner-v2 stop card (номер не на thumb)

### Наблюдения
- Owner: live карточка всё ещё с номером на thumb top-left, ↑↓ слева от фото, «далее» отдельно под адресом.

### Решения
- Grid card `data-day-stop-layout="owner-v2"`: flex без absolute; square thumb; `[N][✈][X]` в ряду с title; bottom row `[↑][↓] далее ~`.
- Preflight: number not inside `data-day-stop-thumb`; no GripVertical.

### Проблемы
- Нет. MSK **BUILD_ID=`D_jH5Sawp7UnqaOX4IJsC`** (`d1425e5`), SMOKE_OK.

---

## 2026-08-02 - /my-day: exact stop card + mobile starter A

### Наблюдения
- Owner approved empty-starter **variant A** (mobile): compact inline icon, one-line subtitle, placeholders only, «добавь своё место» under search.
- Stop cards: previous dense band still wrong vs exact markup - number must be top-right with navigate/delete; ↑↓ + «далее ~» same bottom row.

### Решения
- Starter: `data-day-starter-variant="a"`; Route icon `h-6` inline left of title on mobile; `hideLabel` on search; reduced py (~40% vs tall card); desktop keeps more air.
- Grid card: `data-day-stop-top-right` (N + maps + X); thumb left + title/address; `data-day-stop-bottom-row` (↑↓ + далее).

### Проблемы
- Нет. MSK **BUILD_ID=`PqFdFw3F8VBu_mGMaS9MN`** (`e548187`), smoke chunk markers OK.

---

## 2026-08-02 - /locations: убран блок «Популярные города»

### Наблюдения
- Owner: виджет «Популярные города» (Москва/СПб/Казань/Екатеринбург + регионы Центр/Северо-Запад/…) на `/locations` лишний - «можно убрать из локаций вообще».
- Компонент `RussiaMap` также на `/cities` (aside у топ-тайлов) - scope только локации.

### Решения
- Из `LocationsCatalogView` убран desktop-блок с `RussiaMap` и импорт.
- `RussiaMap` оставлен на `/cities` («Все города»).

### Проблемы
- Нет. MSK **BUILD_ID=`SdwQIxr9a9CVj7jfdAKWh`** (`c698f2c`), `/locations` 200.

---

## 2026-08-02 - /my-day: stop cards denser band (owner «еще уже»)

### Наблюдения
- Owner: «далее ~» отдельной строкой внизу + actions не в top-right - карточка всё ещё высокая.

### Решения
- Grid/list: одна плотная полоса - thumb+номер | title+meta(вкл. далее) | maps/X top-right; chevron у thumb.
- Без нижней строки segment / actions bar.

### Проблемы
- Deploy BUILD_ID - после MSK (дождаться/исключить parallel locations build).

---

## 2026-08-02 - /my-day: stop view toggle Сетка | Список

### Наблюдения
- Owner: на десктопе ~3 карточки в ряд; иначе текстовый список с переключателем.
- Width: убран `lg:max-w-5xl` (канон `container-page` max-w-7xl).

### Решения
- Toggle «Сетка» / «Список» (`data-day-stop-view-toggle`), persist `localStorage` key `daibilet:dayRouteStopView`.
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, compact tile cards.
- List: text rows (number + title + meta + actions), без толстых карточек.
- Default: Сетка.

### Проблемы
- Deploy BUILD_ID - после MSK.

---

## 2026-08-02 - /my-day: full container width (drop max-w-5xl)

### Наблюдения
- Owner: узкий контейнер раздела + странные карточки выбранных мест.
- Root: outer `lg:max-w-5xl` сужал `/my-day` относительно канона `container-page` (`max-w-7xl`).
- MSK: failed build после duplicate import оставил `.next` без BUILD_ID - live desync.

### Решения
- Убран `lg:max-w-5xl`; section/list/summary `w-full` (`data-day-section-width=full`).
- Dense stop cards + H1/starter/matches=15 уже в tip - один clean MSK recover deploy.

### Проблемы
- Deploy BUILD_ID - после MSK.

---

## 2026-08-02 - /my-day: H1 «Мой день в…» + centered empty starter

### Наблюдения
- Owner: H1 = «Мой день в {city}» (предложный); без города - «Мой день».
- Empty starter: центрированная карточка с воздухом - иконка → «Собери свой день» → «Выбери город и минимум 2 точки…» → город/поиск столбиком → «или добавь своё место».
- «Собери свой день» остаётся только в starter, не в H1.

### Решения
- H1: `Мой день ${inCityPrepositional(...)}` / fallback «Мой день».
- `renderUnifiedSearch(true)`: centered airy card, stacked city+search (`data-day-city-search-stack`).
- Prior: matches cap=15, dense stops, catalog trio down, Hot Pick clamp - в том же tip.

### Проблемы
- Deploy BUILD_ID - после MSK.

---

## 2026-08-02 - /my-day: matches cap 15 + dense stops + starter row

### Наблюдения
- Owner: точки 9-15 = «Место из маршрута» / «Нет координат» после добавления из Главных мест Нижнего.
- MSK DB: все 46 must-see `nizhny-novgorod-*` уже с lat/lng (ABSENT/NOCOORDS=0).
- Root cause: `GET /api/day-route/matches` и `matchDayRouteVenues` резали locators до **8**, а `DAY_ROUTE_MAX=15`. URL sync `?items=` после 9-й точки переhydrate → stubs.
- Карточки стопов всё ещё «полотенца» - нужен dense single-row.

### Решения
- Matches API + server: cap = `DAY_ROUTE_MAX` (15).
- Share stub: сохранить local title + editorial coords fallback.
- Must-see / Hot Pick one-click: только с coords.
- Stop card: одна строка number+chevron+thumb+title/subtitle+actions; subtitle в одну линию.
- Starter: Город+Поиск в ряд; catalog trio в accordion (из `40c0e2e`).

### Проблемы
- Deploy BUILD_ID - после MSK.

---

## 2026-08-02 - /my-day: starter row + Hot Pick overlay clamp

### Наблюдения
- Owner: в стартере не нужны Локации/Площадки/События - только Город + Поиск в одном ряду и «или добавь своё место».
- Owner screenshot: badge «Объект» налезает на title overlay Hot Pick; длинный hook выталкивает блок вверх.
- Тройку каталога вернуть вниз (accordion «Ещё из каталога»).

### Решения
- `renderUnifiedSearch`: `data-day-city-search-row` grid 2 cols (Город | Поиск); без `renderCatalogTrio`.
- `renderCatalogTrio` снова в accordion catalog (+ boat); subtitle «Отдельный поиск по типам».
- Overlay Hot Pick: badge → title → hook `line-clamp-2` → CTA в одном bottom stack (без top absolute badge).
- Must-see list thumbs: полный hook без нового truncate.

### Проблемы
- Deploy BUILD_ID - после MSK.

---

## 2026-08-02 - /my-day: каталог в стартере + toolbar над маршрутом

### Наблюдения
- Owner: тройка Локации/Площадки/События + «Каталог целиком» - в верхний starter между Город и Поиск.
- Owner: вернуть дубль «Оптимизировать» + «Яндекс.Карты» над блоком Маршрут (карта сохраняет свой toolbar).
- Compact deploy упал на SSG `/events/[slug]` → web crash-loop; нужен один clean recover.

### Решения
- `renderCatalogTrio` в `renderUnifiedSearch` (город → trio → поиск места).
- Accordion «Ещё из каталога» = boat + ссылки (без дубля тройки).
- `data-day-route-toolbar` = `renderMapToolbar()` рядом с H2 Маршрут.
- Полные hooks (`1f378bc`) + compact cards (`76bae1c`) входят в тот же tip.

### Проблемы
- Deploy BUILD_ID - после recover.

---

## 2026-08-02 - /my-day: полный hook без JS `...`

### Наблюдения
- Owner: «не вижу полный текст» на «Главные места» (Кремль/Чкаловская) - mid-sentence `...`.
- Root cause: `dayRouteHookLine` по умолчанию резал до ~100 символов + `...` (не только CSS clamp).

### Решения
- `dayRouteHookLine`: без maxLen = полный текст; truncate только при явном `maxLen`.
- Hot Picks / must-see: без `line-clamp` на hook; hot-picks без лимита 110.
- Compact cards `76bae1c` + этот фикс - один последующий deploy.

### Проблемы
- Deploy BUILD_ID - после MSK.

---

## 2026-08-02 - INCIDENT ChunkLoadError + compact stop cards

### Наблюдения
- Owner console: `/_next/static/css/52bebb7e…` + `page-55e7d273…` 404 / ChunkLoadError - HTML/BUILD_ID desync mid-deploy (parallel `.next` race).
- Owner: stop cards «гигантские» + уже списка vs «Сумма сегментов» - multi-col grid stretch (`sm:grid-cols-2 lg:grid-cols-3` из compact WIP) + tall padding.

### Решения
- Recover: exclusive deploy `956f5fc` → BUILD_ID `N7obZ0TU-juOknOhkW2Kg`; web restart; public CSS/JS 200; stale hashes out of HTML.
- Stop list: `grid-cols-1 items-start gap-2 w-full`; card dense row (`items-center`, thumb h-9, actions inline, less padding); segment hint under card.

### Проблемы
- Deploy compact follow-up BUILD_ID - после следующего MSK deploy.

---

## 2026-08-02 - /my-day: starter сверху + blurbs целиком на мобилке

### Наблюдения
- Owner: empty starter (город/поиск) должен быть **верхним** блоком под H1, не mid-page под Hot Picks / «Главные места».
- Owner: на мобилке контекст карточек мест (Кремль, Чкаловская и т.п.) - **целиком**, без `…` от line-clamp.

### Решения
- `DayRoutePanel`: при пустом плане `renderUnifiedSearch(true)` сразу после header (`data-day-starter=1`); при непустом - secondary под Hot Picks.
- Must-see hooks + Hot Picks hooks: полный текст на `<sm`, `sm:line-clamp-2` на desktop.
- `ExpandableBlurb` / city hub: default clamp `sm:line-clamp-2` (mobile full).
- Desktop split / stop-card sizes не трогали.

### Проблемы
- Deploy/BUILD_ID - после MSK web deploy.

---

## 2026-08-02 - /my-day: откат desktop split, mobile map оставлен

### Наблюдения
- Owner: desktop split (список слева + sticky карта справа ≥1024) не зашёл - вернуть одноколоночный layout, карта под списком маршрута.
- Mobile Wanderlog-like sticky map (~38vh / expand ~85vh) оставить.
- Размер/редизайн stop cards - отдельно, в этой итерации не трогать.

### Решения
- Desktop: убран `lg:grid` / sticky aside; outer `lg:block lg:h-auto lg:max-w-5xl`; карта снова `data-day-route-map-desktop` (`hidden ... lg:block`) под списком стопов.
- Aside mobile-only: `lg:hidden` + `data-day-mobile-map` (не `data-day-split-map`); expand/rail без изменений.
- Stop card markup/стили не менялись.

### Проблемы
- MSK **BUILD_ID=`fsMqASpF2AZAHnq3m-hiK`** HEAD `8f8c69f`; `/my-day` 200; chunks: `data-day-map-expand` / `data-day-mobile-map-split` / `data-day-stop-maps` OK.
- Card size follow-up - открыт для следующей итерации с owner.

---

## 2026-08-02 - /my-day mobile: sticky map split + expand

### Наблюдения
- Owner: на смартфоне (&lt;lg) нужен Wanderlog-like split без bottom-sheet physics: карта сверху ~35-40vh sticky, список снизу со скроллом; кнопка expand ~35↔85vh.
- Desktop lg split (`9f6af02`) на MSK уже был live (`data-day-split` в chunks, BUILD_ID=`5DefDbAaaUHtfw8BAiky3`).

### Решения
- Mobile: `data-day-mobile-map-split` fixed viewport column; map `order-1` h-[38dvh]/ list `order-2` overflow-y; expand `data-day-map-expand` → ~85dvh + list `max-lg:hidden` + горизонтальный rail стопов.
- Leaflet `layoutKey` + ResizeObserver → `invalidateSize` после expand/collapse.
- Nice-to-have: mini `data-day-map-focus-card` (title/nav/delete); per-stop `data-day-stop-maps` (Яндекс).
- Desktop lg grid split без изменений поведения (позднее откатан - см. запись выше).

### Проблемы
- Live: MSK **BUILD_ID=`fsMqASpF2AZAHnq3m-hiK`** (вместе с rollback desktop `8f8c69f`); `/my-day` 200.

### Наблюдения
- Owner: desktop ≥1024 - split ~45/55; левая колонка скроллится, карта sticky справа на всю высоту; мобилка - текущий вертикальный стек.
- Карта в потоке съедала вертикаль и толкала Hot Picks/форму вниз.

### Решения
- `data-day-split` CSS grid lg; left `overflow-y-auto` max-h viewport; right sticky map column с toolbar Optimize/Yandex.
- Mobile map wrap `lg:hidden`; pin click → scroll+highlight stop (`data-day-stop-focused`).
- Список стопов всегда 1 колонка (вертикальный ряд).

### Проблемы
- Deploy follows.

---

## 2026-08-02 - /my-day: compact stops + starter + commercial CTA slice

### Наблюдения
- Owner: раздутые карточки, «Вход свободный» лишний, «далее» внутри карточки; empty «План пока пуст» слабее формы; monetization = Купить билет / Рядом / Ваши билеты; Hot Picks H2 мелко.

### Решения
- Компактный stop card: без free-badge, ETA `далее` под карточкой, session line, buy CTA `от {цена}` / nearby upsell.
- Starter: icon + «Выберите город и минимум 2 точки…» в блоке поиска; «или добавь своё место»; empty dashed убран.
- Hot Picks title `text-xl`/`sm:text-2xl`.
- «Ваши билеты в этой поездке» shell для ticketBought (QR - qa open).
- Matches → admission attach + nearby upsell helpers в `day-route-commercial`.

### Проблемы
- QR из orders API ещё нет.
- Live MSK **BUILD_ID=`meNSWERi0trhkT0vGq8lO`** HEAD `6721c9c`; `/my-day` 200; маркеры в chunks OK.
---

## 2026-08-02 - /my-day: add/remove stop no longer jumps scroll to top

### Наблюдения
- Owner: добавление точки в план дня прокручивало страницу наверх; терялось место в Hot Picks / must-see / списке.
- URL sync после edit делал `router.replace(/my-day?city=&items=…)` - soft-nav App Router + `useSearchParams` в Suspense, даже с `{ scroll: false }` давал скачок к top.
- Параллельно: пустой план → список остановок растёт сверху; абсолютный scrollY сохраняется, визуально «уехали наверх».

### Решения
- Share URL sync: `history.replaceState` (`replaceMyDayUrl`) вместо `router.replace` - адрес обновляется без навигации Next.
- На `daibilet:day-route-changed`: якорь viewport (activeElement / mid probe) + `useLayoutEffect` корректирует scroll после роста/сжатия списка.
- Clear тоже через replaceState; add вне `/my-day` на my-day не навигирует.

### Проблемы
- Deploy OK: commit `103d81e`, MSK **BUILD_ID=`seNyt0ytyOIZEK6GkdEX6`**, `/my-day` 200.

---

## 2026-08-02 - /my-day event stop: дата и время сессии на карточке

### Наблюдения
- Owner: на карточках event-stop в day-route показывать дату и время сессии; можно только время, но если у билета есть дата - не опускать.
- `startsAt` / `sessionLabel` уже писались при add из афиши, но карточка их могла не рендерить без helper.

### Решения
- `formatDayRouteSessionDisplay` / `formatDayRouteStartsAtLabel`: compact `15 авг, 19:00` (Europe/Moscow); soft dayparts («Вечерний сеанс») не показываем как сессию.
- Карточка stop: строка `data-day-session-label` под title; print sheet тот же helper.
- Persist: `dayRouteItemFromEvent` fallback sessionLabel из startsAt; enrich stubs через `/api/public/events` sessions[0] → startsAt/dateLabel/timeLabel.
- Free / non-ticket без сессии - без выдуманных часов. Dayparts Утро/День/Вечер не возвращаем.

### Проблемы
- Deploy/BUILD_ID - после MSK web deploy.

---

## 2026-08-02 - City hub / my-day: must-see blurb «ещё» + title → place

### Наблюдения
- Owner: в «Главные места» blurbs режутся «…» (hookFact), дочитать некуда - ни expand, ни явный переход.
- Скрин совпал с `/my-day` must-see mini-cards (thumb + +); city hub 2-row rail тоже должен отдавать полный текст.

### Решения
- `ExpandableBlurb.client.tsx`: line-clamp-2 + «ещё»/«свернуть» по real overflow.
- City hub `CitySightsMustSeeList`: blurb = hookFact → shortDescription → desc; title Link с underline; 2-row rail без изменений.
- `/my-day` must-see: title → place page; полный hook + «ещё»; «+» отдельно (не целиком button-card).

### Проблемы
- Deploy/BUILD_ID - после MSK web deploy.

---

## 2026-08-02 - /my-day empty starter: форма вместо dashed empty

### Наблюдения
- Owner: empty «План пока пуст» + длинный абзац лишний; стартер = блок города/поиска (как на форме) + иконка Route + короткий hint.
- CTA: «Или своё место» → «или добавь своё место».

### Решения
- Убран dashed empty box («План пока пуст»).
- При пустом плане `data-day-unified-search` с `data-day-starter=1` идёт первым: Route icon + «Выберите город и минимум 2 точки, чтобы создать маршрут» + CityPicker + поиск + ссылка на своё место.
- При непустом плане поиск остаётся secondary под Hot Picks (без starter chrome).
- Поведение city picker / search / custom place accordion без изменений.

### Проблемы
- Deploy/BUILD_ID - после MSK web deploy.

---

## 2026-08-02 - Owner UX: «Готовые сценарии» + H1 «Собери свой день» + event hydrate

### Наблюдения
- Owner: хаб-блок «Готовые дни» выше must-see; H1 `/my-day` «Мой день в {city}»; event-stop после URL sync → «Событие из маршрута» + «Нет координат».
- Buy-ticket `/events/{venueSlug}` уже закрыт ранее (`101d5b8` / BUILD `ixSmgk9DbvgZ4YYbGLgmY`); stub title/coords ещё live.

### Решения
- Хаб: title «Готовые сценарии», subtitle про «Собери свой день»; блок **под** перечень мест (после must-see rail).
- H1: «Собери свой день {inCityPrepositional}»; page title metadata.
- `matchDayRouteVenues`: locator event id/slug → real event title + venue lat/lng + image + eventId/eventSlug.
- `enrichDayRouteFromMatchVenues`: заменяет stub titles, дописывает coords/image/event meta, пересобирает ticketUrl (не venue-as-event).
- `/my-day`: client fallback `/api/public/events/{id}` для leftover stubs в localStorage; catalog add тоже дотягивает coords.
- `dayRouteItemFromEvent`: title = event title; stop без venue допускается через event id.

### Проблемы
- Live MSK **BUILD_ID=`mtXLit644Nhr5cRd4ideD`** (HEAD `3f14a98`; includes hub copy `969b684`). `/my-day` 200.

---

## 2026-08-02 - /my-day: «Выбор Дайбилет» всегда видимый

### Наблюдения
- Owner: «Выбор Дайбилет» оставить в порядке блоков, но вытащить из-под exclusive accordion - всегда видимый блок.

### Решения
- `DayRoutePanel.client.tsx`: Hot Picks - обычная `<section>` (без collapse/chevron); DOM-порядок без сдвига: Главные места → своё место → Выбор Дайбилет → поиск.
- `hotPicks` убран из `DayRouteAccordionId`; exclusive accordion остаётся для mustSee / text / catalog / matches.

### Проблемы
- Live MSK **BUILD_ID=`h6qtQ4t6dt2pUCV2y5kK3`** (HEAD `adac304`); `/my-day` 200; chunks без `data-day-hot-picks-accordion`. Web кратковременно упал на hub warm - auto-restart OK.

---

## 2026-08-02 - Канон: музеи + арт-галереи всегда Venue

### Наблюдения
- Owner: музеи и арт-галереи по умолчанию всегда Площадки (institution), даже только-инфо / без договора - для блока хаба города.
- Старый пример «Эрмитаж → локация до афиши» противоречил lock.

### Решения
- [catalog-location-venue-canon.md](./catalog-location-venue-canon.md): Kind defaults - музеи/галереи → Venue `MUSEUM_ART_SPACE`; парки/набережные/памятники/улицы → Локации; театры/залы/клубы → Площадки.
- Project.md pointer обновлён. Антидубль без изменений.

### Проблемы
- Нет (docs-only).

---

## 2026-08-02 - /my-day: «Купить билет» → `/events/{venueSlug}` 404

### Наблюдения
- Owner: timeline CTA открывал `https://daibilet.ru/events/niko1560` (404). Карточка: «Событие из маршрута», «Билет оформляется…», «Нет координат».
- Root cause: `ticketUrl` / `eventId` / `eventSlug` строились из **venue** slug; hydrate stub для нерезолвнутого locator всегда писал `/events/{token.id}`.

### Решения
- `resolveDayRouteTicketUrl` + `sanitizeDayRouteTicketFields`: никогда не использовать venue/location slug как event; bad `/events/{venueSlug}` → `/venues/{slug}` (программа площадки) или hide CTA.
- Hot Picks affiche/open_date: `resolveHotPickTicketTarget` - real event page only; иначе `/venues/{slug}`.
- Share hydrate stub: `event_*`/`evt_*` → event ticket; иначе venue stub без fake event URL.
- Unit: venue slug must not produce `/events/venueSlug`.

### Проблемы
- Live MSK **BUILD_ID=`ixSmgk9DbvgZ4YYbGLgmY`** (fix in `101d5b8`). Smoke: `/my-day` 200; `/venues/niko1560` 200; `/events/niko1560` «Событие не найдено».

---

## 2026-08-02 - Канон Location vs Venue / антидубли (docs)

### Наблюдения
- Owner: зафиксировать для агентов и контент-ops различие Локация / Площадка и жёсткий антидубль (одна физическая точка = одна публичная карточка).
- Договор с объектом часто путают с типом сущности; на практике афиша может быть без договора, must-see - без афиши.

### Решения
- Новый канон: [catalog-location-venue-canon.md](./catalog-location-venue-canon.md); pointer в Project.md + qa.md + Tasktracker.
- Create: только must-see → локация; есть/будут события → venue сразу; локация→афиша → upgrade или hide+301/alias, не twin PUBLISHED.
- Перед create: поиск slug / название / coords; запрет soft-sign и latin-cyrillic twins.
- Мой день: Локации / Площадки / События - разные семейства; дубли путают UX.

### Проблемы
- Нет (docs-only; web deploy не нужен).

---

## 2026-08-02 - /my-day: flat timeline + «N точек» (no Утро/День/Вечер)

### Наблюдения
- Owner: «МАРШРУТ · 1» читалось как номер маршрута; «ДЕНЬ» - как календарный день; бакеты Утро/День/Вечер неочевидны.
- Move-between-buckets отменён: достаточно плоского списка с ↑↓.

### Решения
- Timeline: убрана группировка `dayPartForStop`; плоский `route.venues` порядок.
- Заголовок: «Маршрут» + «N точка/точки/точек» (`formatDayRouteStopsHeading`), aria без «route #».
- Бейдж индекса: top-align с карточкой (`justify-center`/`h-14` сняты).
- Параллельно: events catalog city name/slug уже в `066363d` (не в этом commit).

### Проблемы
- MSK deploy: **BUILD_ID=`Ywy2ntkkoX6K__8CuMH3H`** (HEAD `7a3de60`); hub warm transiently killed web → restart; `/my-day` local+pub 200; chunks: `data-day-plan-list`, no `data-day-timeline-part`.

---

## 2026-08-02 - /my-day: События в «Ещё из каталога» пустые

### Наблюдения
- Локации/Площадки OK; События - «Нет событий» при выбранном городе (SPB/MSK/NN).
- Live: `GET /api/public/events?city=sankt-peterburg|moskva|nizhniy-novgorod` → total=0; `city=Санкт-Петербург|Москва|Нижний Новгород` → items>0.
- Venues API принимает slug и name; catalog `matchesCatalogQuery` сравнивал только `session.city` / `session.destination` (display title).

### Решения
- Root cause: после city-scoped venues fix DayRoutePanel слал один `city=` (slug||name) и в events - slug не матчился.
- Client: venues остаются на slug||name; events → `pageCityName` (fallback slug).
- Backend: `matchesCatalogCity` также принимает `citySlug` / `sourceCitySlug` (slug callers + defense).

### Проблемы
- MSK live **BUILD_ID=`Ywy2ntkkoX6K__8CuMH3H`** (events fix `066363d` + flat-list `7a3de60`). Smoke: events slug SPB/MSK/NN total>0; venues OK; `/my-day` 200.

---

## 2026-08-02 - /my-day: Hot Picks covers + OSM map + catalog city warm-fix

### Наблюдения
- Hot Picks NN (Кремль/Чкаловская/Покровская/…) показывали MapPin: must-see без hub match → `imageUrl` null.
- Catalog `?family=&city=` short-circuit на warm list: при любом event-venue города editorial 0-event места не попадали в dropdown.
- Owner: карта планировщика на странице (Leaflet/OSM), Яндекс оставить для навигации в пути.

### Решения
- `city-place-images.ts` + `dayRouteItemFromMustSee` editorial `heroImageUrl` fallback; covers в `apps/public/public/images/venues/nizhny-novgorod/` (classic 6 GenerateImage).
- Hot Picks: photo-as-background card + lighter CTA; order: Главные места → своё место → Выбор Дайбилет (Hot Picks always expanded, not accordion).
- `buildPublicVenuesCatalog`: warm shortcut только без `city=` (city-scoped → hub `requireEvents:false`).
- `DayRouteOsmMap`: numbered markers + polyline; блок «Карта дня» под timeline + «Оптимизировать».

### Проблемы
- Stale `/tmp/daibilet-web-deploy.lock` от `myday-hot-picks` (pid мёртв) - снять перед deploy.
- `apps/web/public/images/` gitignore - эталон `apps/public/public/images/` + sync-public-assets на build.

## 2026-08-02 - INC.504: SSR hardening для public Next

### Наблюдения
- Прод-симптом: `daibilet.ru` мог отдавать 0B/504 на HTML, пока backend/admin/finance оставались живыми.
- Root cause в коде: `apps/web` всё ещё тянул `@daibilet/backend/public-read` в SSR и public route handlers, то есть Next-процесс сам выполнял тяжёлые Prisma/DTO-сборки.
- Soft-timeout не спасает blocked event loop: таймер `Promise.race` не тикает, если loop занят синхронной работой или cache stampede.

### Решения
- Добавлен HTTP boundary `apps/web/src/server/public-api-client.ts`: SSR читает public DTO через backend API с `AbortSignal.timeout`.
- Добавлен proxy helper `apps/web/src/server/public-api-proxy.ts`: Next `/api/public/*` больше не собирает DTO внутри web-процесса.
- Переведены hot paths: home, catalog, city/event/venue/landing pages, blog article helpers, destinations/stats/search/venues/landings API.
- Главная получила bounded fallback для hero banners (700 ms) и blog promo articles (1200 ms).
- В `apps/web` прямой `public-read` оставлен только для sitemap и internal revalidate как follow-up, не HTML-hot-path.

### Проблемы
- Локальный `pnpm --filter @daibilet/web typecheck` блокируется версией Node 24 при требовании repo `>=22.13.0 <23`.
- Прямой `tsc --noEmit -p apps/web/tsconfig.json` всё ещё падает на уже существующих ошибках ветки; новых ошибок из SSR hardening helpers в выводе не видно.
- Канон и smoke-план: `docs/inc-504-ssr-hardening.md`.
- **MSK live 2026-08-02:** merge `f93b770` (PR #3), **BUILD_ID=`3zmDWHpY7rXAJgqu0-pnR`**. First deploy failed: prerender needs `daibilet-api` on `:4000` (was inactive); started API + rebuild. Post-deploy API restart briefly SIGKILL web - auto-restarted OK.
- Smoke public: home/events/city/my-day 200; TTFB home~0.13s events~0.08s city~0.07s my-day~0.06s. Chunks HTML↔disk match (0 miss). `public-read` left: sitemap + internal revalidate (+ stray `slug-route-tmp.ts`).
- Risk/canon: `web:build` now requires live backend HTTP; keep `daibilet-api` up before deploy.

---

## 2026-08-02 - Mobile sticky: поиск + city pin + share sheet

### Наблюдения
- City label в шапке съедался; «Поделиться» на /my-day уезжал влево за экран.
- Поиск был только `lg+`.

### Решения
- Sticky: Menu → Logo → City (pin) → **Search** (лупа → HeaderSearch overlay) → Route → Favorites.
- CityPicker header: icon-only до `sm`, popup clamped в viewport.
- Share: mobile bottom sheet (`data-day-share-sheet`); desktop popover `sm+`.

### Проблемы
- Live **BUILD_ID=`EroIFEOGTEMJsFn1Zf3tr`** (`cc05efa`).

---

## 2026-08-02 - /my-day: Hot Picks + paid scenarios without trip date

### Наблюдения
- Owner: «дали инструмент, не дали решение» - mobile dump (search + chips + share) конкурировал с планом.
- Paid paradox: нельзя писать «сегодня 18:30» без даты поездки и нельзя оставлять пустую paid-карточку.

### Решения
- IA: H1 + Share (disabled <1) → **Выбор Дайбилет** (tabs Советы/Культура/Еда и бары, ≤6, ~83vw) → search → timeline Утро/День/Вечер → accordion catalog.
- Offers in `day-route-hot-picks.ts`: **affiche** (Выбрать дату и билеты → Вечер, soft sessionLabel, no startsAt) / **open_date** (Билет на любой день → День) / **free** (Добавить в план).
- Chip pending: «Билет оформляется…»; soft «Вечерний сеанс» без HH:MM.
- Docs: myday-commercial-canon Hot Picks table.

### Проблемы
- Scenario 3 nearest Fri/Sat - backlog.
- MSK deploy: **BUILD_ID=`E6nQnmKCtloz0ynXA2y24`** (HEAD `21a9806`), `/my-day` local+pub 200; chunks: Выбор Дайбилет / Выбрать дату и билеты / Билет на любой день.

---

## 2026-08-02 - /my-day: пустые Локации + copy без «теплоход»

### Наблюдения
- Accordion «Ещё из каталога»: subtitle «Отдельный поиск по типам, теплоход» - owner: «теплоход» в type search непонятен (wizard «Добавить теплоход» оставляем).
- Локации/Площадки: «Нет локаций в этом городе» при выбранном городе (НН/др.).

### Решения
- Root cause: `DayRoutePanel` грузил `/api/public/venues?family=…&limit=500` **без city**, потом клиентский `item.city === pageCityName` по global top-N + exact title.
- Fix: `city=` (slug||name) в venues/events fetch; убран exact client filter; backend warm-list фильтрует город **до** limit + fallback hub 2000/`requireEvents:false` при city miss.
- Subtitle: только «Отдельный поиск по типам».

### Проблемы
- MSK live **BUILD_ID=`E6nQnmKCtloz0ynXA2y24`** (typecat `2f692dc` + follow-ups). Smoke: SPB loc>=19, NN loc=9; subtitle без «теплоход»; wizard «Добавить теплоход» intact.

---

## 2026-08-02 - /my-day header: density + предложный падеж

### Наблюдения
- Owner: в хедере лишние «День собран на N%», «свободное окно», «Яндекс.Карты», дубль «Точки · N».
- H1 «Мой день в Нижний Новгород» - именительный вместо предложного.

### Решения
- Summary: только `N точек из 10` (DAY_ROUTE_SOFT) + `M билетов` при unpaid > 0.
- H1 через `inCityPrepositional` (`city-declension.ts`: словарь + эвристика).
- % / free-window остаются в compute (для chips/upsell), не в header line.

### Проблемы
- Live MSK **BUILD_ID=`_gsuIDWy0smbTa0LMOzng`** (`495c8f0`), `/my-day` 200.

---

## 2026-08-02 - /my-day P5: превью + hookFact (+ Hot Picks)

### Наблюдения
- Owner: в «Мой день» не хватало фото-превью и краткого «зачем сюда» при выборе точек.
- Deferred P5 из commercial canon: hookFact + mini description.

### Решения
- `dayRouteHookLine`: приоритет `Venue.hookFact` → `shortDescription` → editorial `cityInfo.mustSee.desc` (1 строка ~100 символов, emdash → `-`).
- Каталог: `VenueCatalogCard.hookFact` через `toVenueCatalogCard` (API hub уже leanText=false).
- UI: «Выбор Дайбилет» Hot Picks (cover + badge + title + hook + dual CTA); accordion «Главные места» - compact mini-cards (thumb + title + 1-line hook); «Свободное окно» hook под title; search dropdown thumb + hook hint.
- Не раздувать must-see в огромные карточки.

### Проблемы
- Live **BUILD_ID=`E6nQnmKCtloz0ynXA2y24`** (`3f9a70e`+rebuild) `/my-day` 200.

---

## 2026-08-02 - /my-day: soft-warn вместо hard DAY_ROUTE_MAX=10

### Наблюдения
- Owner: жёсткий потолок 10 точек ломал плотный день; Multiday не делать.
- Share/print/short link должны переживать >10 точек.

### Решения
- DAY_ROUTE_SOFT=10 (guideline + soft-warn), DAY_ROUTE_MAX=15 (safety localStorage/URL).
- Copy: «День уже плотный - карта и время могут разъехаться» (дефис).
- UI: Точки · N / N · плотный день без /10 lock; hard banner только на 15.
- Bulk/preset «добавить главные» останавливается на soft + warn; одиночный add до hard.
- Readiness points blend к SOFT, не к hard.

### Проблемы
- MSK deploy: **BUILD_ID=`Yqcz6aa-14QvDHs30n306`** (`bd794f2` readiness→SOFT; soft-warn `2c927fb`), `/my-day` 200.

---

## 2026-08-02 - Мой день: planner + commercial checklist (Wanderlog-style slice)

### Наблюдения
- Owner canon: «Мой день» = **planner + commercial checklist**, не список точек и не Tinder/swipe.
- Паттерн Wanderlog (не копировать визуал 1:1): быстро собрать день без мыслительной нагрузки + коммерческий слой (билеты, readiness, free window).
- Soft purple «Вам поделились» banner ранее снят - share recipient `/d/{code}` должен стать готовым commercial scenario (не возвращать старый баннер as-is).

### Решения
- **Shipped (practical slice / P1-P3 + free-window):**
  1. Unified search сверху + carousel «Рекомендуемые места» (must-see)
  2. Status chips: «Вход свободный» / «Нужен билет» / «Сеанс HH:00» / «Билет отмечен» (`day-route-commercial.ts`)
  3. Readiness: «День собран на X%» + линия `N точек · M билетов · K свободное окно`; `DAY_ROUTE_MAX=10`
  4. Handoff modal после «Купить билет» → `ticketBought` в localStorage
  5. Mobile FAB: Карта / Добавить / Поделиться; при unpaid → «Купить билеты»
  6. «Свободное окно» upsell (gap ≥1200м) - до 3 карточек free/museum/event
- **Formula %:** equal thirds - points (MIN→SOFT blend) + tickets resolved + timed slots among commerce stops.
- **Chip priority:** bought → session → needs_ticket → free.
- Docs: [myday-commercial-canon.md](./myday-commercial-canon.md).

### Проблемы
- Full target IA (Утро/День/Вечер timeline, multi carousels «Исследовать», native price «от X», city templates variants, commercial `/d/{code}` recipient) - backlog P4-P7, не в этом ship.
- Screenshots: verify `/my-day` с городом - header %, carousel, chip на карточке, FAB; click Купить → handoff; 2 точки с coords далеко → free window.

---

## 2026-08-02 - /my-day: короткие ссылки шаринга `/d/{code}`

### Наблюдения
- Owner: Copy / Telegram / WhatsApp / Макс должны отдавать короткую ссылку, не километровый `?city=&items=...`.
- Long query остаётся каноном hydrate (redirect target).

### Решения
- Таблица `day_route_shares` (Prisma `DayRouteShare`): code (7 chars) → citySlug + items + fromName.
- POST `/api/day-route/share` создаёт/reuse код; GET `/d/[code]` Route Handler → HTTP 307 relative Location `/my-day?city=&items=`.
- Share menu: «Скопировать ссылку» + hint «Короткая ссылка»; fallback на long URL при ошибке API.
- Browser URL при редактировании может оставаться long - в шаринге short.

### Проблемы
- ~~MSK deploy~~ → `102443d` **BUILD_ID=`jZmbBH9ZIxyREVMEnwmal`**. Smoke: create `yrskwgn`, `/d/yrskwgn` 307 → `/my-day?city=spb&items=ermitazh%3Afree`, `/my-day` 200.

---

## 2026-08-02 - Мой день: compact accordion UX (mobile)

### Наблюдения
- Owner: «Добавить своё место» внизу страницы - критичный минус на мобилке (далеко скроллить).
- Слишком много одновременно открытых блоков (каталог + must-see + boat + matches + text).

### Решения
- Порядок: header → **Точки (всегда open)** → accordion «Своё место» → «Из каталога» → «Главные места» → «Подходящие экскурсии».
- Exclusive `openPanel`; distance/mode остаётся в секции маршрута.
- CTA «Своё место» в header точек + sticky «Своё»; sticky «Каталог» открывает catalog accordion.

### Проблемы
- Live MSK BUILD_ID=`QrIjNExsel44mrZk0b09y` (`a4ce4e7`); smoke /my-day 200.

---

## 2026-08-02 - Must-see filters: Главные / Гастро / Музеи / Парки / Храмы

### Наблюдения
- Owner: на «Мой день» / city hub блок «Главные места города» смешивал landmarks + гастро + музеи в одну кучу (Нижний: Кремль рядом с «Селёдка и Кофе»).
- cityInfo mustSee не несёт tags; классификация по `venueSlug`/`locationSlug` + kind каталога + name/desc heuristics.

### Решения
- `must-see-filters.ts`: priority gastro → museum → park → temple → main; пустые табы скрыты.
- UI tabs: `DayRoutePanel` + `CityPageView` (`MustSeeFilterTabs`); bulk CTA «Добавить главные места» / «Добавить выбранные».
- Default preset / «Собрать за минуту» берёт main (без гастро).

### Проблемы
- Нет (heuristics без editorial tags в cityInfo; kind из каталога усиливает gastro/museum).

---

## 2026-08-02 - /my-day: убран friend-landing баннер

### Наблюдения
- Owner: фиолетовый баннер «Вам поделились…» / «Сохранить себе» / «Повторить маршрут» лишний - контекст шаринга должен быть в тексте мессенджера, не в persistent UI.
- Print label «Сохранить маршрутный лист» слишком длинный.

### Решения
- Убран `shareLanding` banner + `saveSharedRoute`; `?city=&items=` по-прежнему auto-hydrate в localStorage (редактирование без клика «Сохранить себе»).
- Print CTA: «Сохранить» (desktop + mobile sticky), иконка принтера сохранена.
- `buildDayRouteShareMessage`: «Тебе поделились планом на день… Открой ссылку - маршрут уже в «Мой день», можно править»; Copy кладёт полный текст (не только URL).

### Проблемы
- Нет (UI-only). ~~MSK deploy~~ → **BUILD_ID=`jZmbBH9ZIxyREVMEnwmal`** (`a4ce4e7`+); `/my-day` local+pub 200; chunk содержит «Тебе поделились планом на день».

---

## 2026-08-02 - Нижний: missing day-route coords (DTO, не БД)

### Наблюдения
- Owner: не для всех точек НН передаются lat/lng в «Мой день» / пресеты / «В маршрут».
- MSK DB: **46/46** PUBLISHED `nizhny-novgorod-*` уже с coords (editorial enrich OK). Detail API тоже отдаёт lat/lng.
- City hub `/api/public/cities/nizhny-novgorod`: venues = **24 event-площадки без coords** (concert halls/bars); must-see (ярмарка/кремль/…) **ABSENT**.
- Root cause: (1) `venueRowsByIds` не SELECT-ил `latitude`/`longitude`; (2) hub venues только из sessions; (3) catalog `?city=nizhny-novgorod` не матчил кириллический `нижнии-новгород` / `nizhnii` alias.

### Решения
- `venueRowsByIds`: lat/lng + cityId/citySlug.
- `publicPublishedVenuesByCityId` + `mergeCityPageVenues` в city page DTO (session + published content places).
- `publicVenueRowMatchesCityFilter` + `nizhnii-novgorod` → `nizhniy-novgorod` canon.
- Client: `city-place-coords` editorial map + `dayRouteItemFromMustSee` fallback (hub → place → editorial).

### Проблемы
- Event venues без coords в БД остаются null после DTO-fix (не must-see).
- ~~MSK deploy + smoke~~ → `bee2a2a` **BUILD_ID=`n6C8O0jfVXm2ksCrQ_yKG`**. City hub venues **78/78** with coords; must-see FOUND; catalog `?city=nizhny-novgorod` 30/30 with coords; preset sample 5/5.

---

## 2026-08-02 - /my-day: короткие ссылки шаринга `/d/{code}`

### Наблюдения
- Owner: Copy / Telegram / WhatsApp / Макс должны отдавать короткую ссылку, не километровый `?city=&items=...`.
- Long query остаётся каноном hydrate (redirect target).

### Решения
- Таблица `day_route_shares` (Prisma `DayRouteShare`): code (7 chars) → citySlug + items + fromName.
- POST `/api/day-route/share` создаёт/reuse код; GET `/d/[code]` → redirect `/my-day?city=&items=`.
- Share menu: «Скопировать ссылку» + hint «Короткая ссылка»; fallback на long URL при ошибке API.
- Browser URL при редактировании может оставаться long - в шаринге short.

### Проблемы
- Нужен MSK deploy (web + migrate). BUILD_ID - после деплоя.

---



### Наблюдения
- Owner screenshot: `DayRouteBadge` показывал «Маршрут · 7» + зелёный badge «7» - цифра дублировалась.
- Избранное в sticky было только на `lg+`; на mobile - только в sheet.

### Решения
- `DayRouteBadge`: при count>0 только icon + emerald badge; пустой - icon (+ «Маршрут» на `lg+`). Текст с «· N» убран.
- `FavoritesHeaderButton` в sticky на всех breakpoints; rose badge при count>0.
- `mobile-templates.md` + skeleton slots обновлены под icon-first chrome.

### Проблемы
- Нет (header-only; DayRoutePanel не трогали).

---

## 2026-08-02 - Мой день: канон добора теплохода (Pier→Route→Slot)

### Наблюдения
- Owner зафиксировал funnel для multi-option событий (esp. SPB boats/Teplohod) в «Мой день»: нельзя шарить «теплоход вообще» - только закреплённый слот с временем.
- В каталоге: Venue `type=pier` (~14 SPB), страница причала `/api/public/venues/{slug}` отдаёт `sessions` (часто `offerSourceCode=TEPLOHOD`) + `upcomingSlots`. EventKind в Prisma = SINGLE/RECURRING/OPEN_DATE (не WATER) - водность через pier + TEPLOHOD/категории.

### Решения
- Канон funnel: **Причал → Маршруты с причала → Слот → «В маршрут»** (item с `eventId`+`startsAt`/`sessionLabel`) → share `?city=&items=id:HHMM` осмыслен только после pin.
- MVP UI `/my-day` (SPB first): `DayRouteBoatWizard` + lib `day-route-boat` (rank pier by geo к остановкам / SPB water center; слот в окно соседей; prefer short sightseeing). CTA «Добавить теплоход» + soft suggest у waterfront stops.
- Reuse: `addToDayRoute`, existing buy/share/print agents; ticketUrl из Teplohod purchaseUrl или event page.

### Проблемы
- Duration в API часто нет - durationGuess из title heuristic.
- Москва/другие города - deferred (wizard gate `isSpbDayRouteCity`).
- Полный catalog filter «только water» / dedicated boat API - не делали; берём pier list + venue page sessions.
- ~~MSK deploy~~ → wizard in `0212c13`; live after follow-up MSK rebuild **BUILD_ID=`EdAk08KxqEiFe8Ow1Qg3i`** (HEAD `861fec93`). Chunk `/my-day` содержит `data-day-boat-wizard` + «Добавить теплоход»; pub `/my-day` 200.

---

## 2026-08-02 - Nizhny Novgorod must-see 30 + gastro 10 + 3 presets

### Наблюдения
- Owner: расширить Нижний - 30 must-see + 10 гастро-площадок + 3 именованных пресета «Мой день».
- City slug в БД: кириллический `нижнии-новгород` (aliases `nizhny-novgorod` / `nizhniy-novgorod`). Уже было 6 PUBLISHED must-see.

### Решения
- Editorial JSON `must-see-editorial-nizhny.json` (40) + merge в `must-see-editorial.json` (база 430).
- cityInfo: mustSee 46 (6 канон + 30 + 10 гастро); `dayRoutePresets` x3; UI `CityDayPresetBlock` named presets.
- Covers: `/images/venues/nizhny-novgorod/{owner}.jpg` (уникальные; часть GenerateImage).
- Enrich: `--file=`, heroImageUrl/seo/kind override; gastro = CLUB_BAR_RESTAURANT → `/venues/`.

### Проблемы
- Теги #инстаграмно/#завтрак в schema Venue нет - только в editorial JSON tags; фильтры My Day - follow-up.

## 2026-08-02 - /my-day: маршрутный лист (print/PDF)

### Наблюдения
- Owner приоритет 1-3: (1) сохранить маршрутный лист, (2) канон URL+share, (3) купить+куплен. Share/buy уже live (`42421d4`); print был MVP `window.print` без чистого листа.

### Решения
- Кнопка «Сохранить маршрутный лист» (+ sticky «Лист») → `window.print()` + print-only `DayRoutePrintSheet`.
- Лист: город, дата если есть `startsAt`, нумерованные остановки (адрес/время/билет куплен), между ними haversine км + ETA пешком/авто.
- Screen UI `print:hidden`; SiteHeader/Footer скрыты при печати; `@page` margins в globals.

### Проблемы
- ~~MSK deploy + BUILD_ID~~ → `62564ca` **BUILD_ID=`grb226etQIYA0W1Wi-Myf`**. Smoke `/my-day`+items 200; chunk+print CSS OK. Share/buy без регрессии.

---

## 2026-08-02 - /my-day: viral share city+items + Max

### Наблюдения
- Owner: виральный шаринг - URL лайт без БД `?city=&items=id:HHMM|free`; меню Copy/Telegram/WhatsApp/**Макс**; лендинг для друга.
- Официальный Max deep-link: `https://max.ru/:share?text=` (dev.max.ru).

### Решения
- Канон share: `/my-day?city=spb&items=341:1400,892:free` (+ optional `from=`). Legacy `?day=` ещё парсится, builders пишут city+items.
- Меню «Поделиться»: скопировать / Telegram / WhatsApp / Макс; sticky «Поделиться» на мобилке.
- Friend landing плашка + «Сохранить себе»; на event-stops «Купить билет» + «Билет куплен»; DnD/print/distance MVP.

### Проблемы
- Resolve event-only ids через matches API неполный (stub + ticket URL) - ок для MVP; полный event DTO hydrate - follow-up.
- ~~MSK deploy~~ → `42421d4` **BUILD_ID=`tU1erwiIQtH11jrJCcYZH`**. Smoke `/my-day` + `?city=spb&items=ermitazh:free` 200; chunks: Max share + menu OK.

---

## 2026-08-02 - /my-day: MAX=10, без лишнего копирайта, chips без «в дне»

### Наблюдения
- Owner: подпись «в ДНЕ» на must-see chips лишняя; intro «без перехода в каталог» / «До N точек · город» - шум.
- Лимит 8 точек мало - нужно 10.

### Решения
- Must-see in-route: emerald border + Check, только имя места (без «в дне») - `6345d0a` + follow-up.
- Убраны redundant intro lines в `DayRoutePanel`; счётчик `Точки · N/10` остаётся.
- `DAY_ROUTE_MAX=10`; E2E text/grand-maket обновлены под N/10.

### Проблемы
- ~~MSK deploy + smoke `/my-day` после commit~~ → MSK `8499c92` **BUILD_ID=`q-1BAwZ65koVjH3CunDvi`**. Smoke `/my-day` 200; chunks: `cK=10`, нет «в дне» / «без перехода».

---

## 2026-08-02 - /my-day: on-page city + searchable add (без ухода в каталог)

### Наблюдения
- Owner: город из шапки / ссылки на `/locations|/venues|/events|/cities` уводили со страницы «Мой день». Нужен выбор города и добавление точек на месте.
- Каталог-first IA (`MvYEsYnvAH_KMCxXkt2S6`) оставлял text accordion; ручной ввод остаётся optional.

### Решения
- On-page `CityPicker` + `setCity` на `/my-day` только persist (без `router.push` в афишу).
- Три searchable combobox: локации / площадки / события через `/api/public/venues?family=…` и `/api/public/events?city=…`.
- Must-see: chips + «Добавить главные места» (`resolveCityInfo` + `buildCityDayRoutePreset`), append до MAX=8.
- Ссылки на каталог/хаб - вторичный текст внизу блока.

### Проблемы
- Deploy/smoke: MSK **BUILD_ID=`q-1BAwZ65koVjH3CunDvi`** (`b4fdfd5` + chip fix `6345d0a`). Playwright: SPb location+venue+event+must-see bulk без ухода с `/my-day`.

---

## 2026-08-02 - Blog: volhov soft-404 RCA + column signature dedupe

### Наблюдения
- Owner: `/blog/bylinnyy-bereg-fentezi-fest-volhov` «404»; дубль «Игорь, штатный корреспондент Дайбилет».
- Live: slug **PUBLISHED** (`publishedAt` 2026-08-01 10:05 MSK), cover/inline 200; soft-404 UI у Next отдаёт HTTP 200 с title «Статья не найдена».
- Исторический 404-путь: CMS `HIDDEN` / future `publishedAt` → `cmsOwned` без public row → `notFound()` (static fallback блокируется). HIDDEN-близнец `bylinnyy-bereg-fentezi-fest` сейчас soft-404.
- В body колонок дублировалась UI-подпись; в DB ещё лиды `*Авторская колонка…*` у kazan/muzyka/elena.

### Решения
- Убраны хвосты подписи из MD; `stripColumnBodyChrome` в `blog-content.mjs` + render в `BlogArticleView`.
- 301: `bylinnyy-bereg-fentezi-fest` → `fentezi-fest-bylinnyy-bereg`; `open-air-festy-vyhodnoi-ru` → `moskva-parki-open-air-vyhodnye` (через `next.config` redirects, HTTP 308).
- Upsert затронутых статей + MSK deploy (`ef417ac`).
- Связанные TC-события в DB `READY`, но public soft-404: past (июль), каталог их не отдаёт - не blog-404.

### Проблемы
- Soft-404 блога/событий по-прежнему HTTP 200 (не status 404) - отдельный hardening.

---


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
- Auto-pick / filters / top-up - backlog UX.MYDAY-F. Live MSK BUILD_ID=`MvYEsYnvAH_KMCxXkt2S6` (UI `035c3e8`).

---

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

## 2026-08-04 - Публикация гида «Инстаграмный Нижний»

### Наблюдения
- Для Нижнего Новгорода уже есть именованный сценарий «Инстаграмный Нижний» в `cityInfo` и публичные карточки всех точек маршрута.

### Решения
- Добавлена PUBLISHED-статья `instagramnyi-nizhnii` с реальными ссылками на city hub, локации, гастро-площадку и `/my-day`.
- Сгенерированы уникальные cover и две inline-фотографии, размещённые в `apps/web/public/images/blog` и зеркале `apps/public/public/images/blog`.

### Проблемы
- Глубокая ссылка, которая применяет именованный сценарий напрямую из URL, в текущем `my-day` не поддерживается: сценарий выбирается в интерфейсе.

## 2026-08-04 - Публикация гида «Маршрут со вкусом»

### Наблюдения
- Для Нижнего Новгорода уже есть сущности всех точек гастрономического маршрута и пресет «Исторический и гастрономический гайд» в `cityInfo`.

### Решения
- Добавлена PUBLISHED-статья с проверенными ссылками на city hub, локации, площадки и `/my-day`.
- Для cover и двух inline-блоков сгенерированы уникальные изображения в `apps/public/public/images/blog/`.

### Проблемы
- Именованный пресет пока нельзя применить прямой URL-ссылкой: пользователь выбирает его в интерфейсе «Мой день».

---

## 2026-08-05 - Санкт-Петербург: широкий city hub

### Наблюдения
- Для столичного хаба прежние 6 must-see не покрывали музейные, прогулочные, креативные, семейные и гастрономические сценарии.
- Ссылка на planned blog guide не должна попадать в preset до публикации URL.

### Решения
- `cityInfo` для `saint-petersburg` расширен до 120 городских точек, включая 20 гастрономических во вкладке «Гастрономические точки».
- Добавлены тематические chip: Наука, Литература, Виды, Улицы, Креатив и Секретные, пять кластерных day presets с гастро-остановками и пять пригородных карточек с 25 вложенными POI.
- Пригороды остаются отдельным блоком и не входят в city must-see. `blogSlug` у новых presets пока отсутствуют, так как запланированные статьи еще не опубликованы.

### Проблемы
- Для большинства новых editorial-точек в каталоге пока нет подтвержденных slug или координат. Ссылки не придумываются, а действие «В маршрут» остается доступно там, где точка уже разрешается через существующую сущность.
- MSK deploy `HJMykSPWiCKr0u6cmgWg2` собрался и запустился, но `/cities/sankt-peterburg` отвечает 500 с digest `3602878992`. Ошибка воспроизводится локальным запросом к Next на MSK и зафиксирована до приемки.

---

## 2026-08-05 - Проверка SSR широкого хаба Санкт-Петербурга

### Наблюдения
- На момент расследования активная ревизия web на MSK была `0512565`, а не ошибочная ревизия с digest `3602878992`; текущий live-ответ уже был 200.
- Изолированная production-сборка и SSR-рендер exact ревизии mega-seed `0f8a682` на том же MSK и с тем же public API также вернули 200.

### Решения
- Подтверждено, что `cityInfo` с 120 точками, пятью пригородами и пятью presets сериализуется и рендерится без ошибки. Изменения seed и UI не потребовались.
- Блокер снят после канонического rebuild/deploy ветки `feat/next-monorepo`; проверены 200 для хаба, тематических must-see, пригородов и готовых сценариев.
- После публикации пяти companion-гидов `blogSlug` у каждого preset связан с соответствующей статьей.
- Именованные сценарии с companion-гидом больше не скрываются из-за недостатка разрешимых catalog stop-точек: ссылка на гид видна всегда, а кнопка «В мой день» остается только у маршрута с минимум тремя разрешимыми точками.

### Проблемы
- Первопричину digest `3602878992` из production-логов восстановить нельзя: Next в production записал только digest без исходного stack trace, а exact исходный commit стабильно рендерится после чистой сборки. При повторении инцидента нужен сохраненный серверный stack trace до следующего deploy.

---

## 2026-08-05 - Санкт-Петербург: сценарный слой хаба

### Наблюдения
- Широкий перечень мест требует вложенных точек для составных локаций и понятных векторов загородной поездки.

### Решения
- У городских и пригородных editorial-точек добавлены вложенные `places`, сезонные маркеры, темы, `travelVector`, `stationHub` и локальные гастро-остановки.
- Хаб показывает вложенные точки с отдельным действием «В маршрут», направление и транспортный хаб на карточке пригорода.

### Проблемы
- Локальная production-сборка остановилась до TypeScript-проверки из-за поврежденной зависимости `styled-jsx/style` в `node_modules`; нужна чистая установка зависимостей вне продуктового diff.

---

## 2026-08-05 - Repair SPB cityInfo deploy syntax

### Наблюдения
- Deploy commit `8585d1e` откатился на MSK до `BUILD_ID=3ovHY4yBqkWQ_hi0SWJDf`: TypeScript parser остановился на лишней запятой перед `travelVector` в объекте Петергофа.
- Тот же ошибочный шаблон был в 11 объектах `significantSuburbs` web cityInfo. В public mirror таких malformed объектов не найдено.

### Решения
- Поля `travelVector`, `stationHub` и `gastroHint` перенесены внутрь соответствующих объектов без лишней запятой.
- `node --check apps/web/src/lib/cityInfo.ts` успешно завершился; оба cityInfo дополнительно просканированы на двойные и начальные запятые перед полями.

### Проблемы
- Локальный `pnpm` недоступен в PATH, поэтому полный `pnpm --filter @daibilet/web typecheck` выполняется на MSK в составе канонического deploy.

---

## 2026-08-05 - Owner override SPB travel vectors

### Наблюдения
- Предыдущее распределение пригородов по векторам смешивало направления и не показывало станцию конкретного destination.
- Для Кронштадта owner заменил футшток и Форт Константин на Якорную площадь и Петровский док, а гастро-остановку зафиксировал как «Голландская кухня».

### Решения
- `CitySuburbItem` получил `travelVectorBlurb` и `stationName`; карточка хаба показывает название и хаб вектора, пояснение и станцию destination.
- Введены пять owner-векторов: Южный, Юго-Западный и Морской, Южный Атомный, Северный и Выборгский, Островной и Ладожский. Гастро-остановки назначены по соответствующим пригородам.

### Проблемы
- Локальный `pnpm` недоступен в PATH; синтаксис проверяется Node, а полный web typecheck и build выполняются на MSK deploy.

---

## 2026-08-05 - MSK deploy: blog vitality + landing price range

### Наблюдения
- Owner: «выкатывай». Local eat/next-monorepo был sync с origin (c8f43ae); на MSK lock был clear.
- Канон: BRANCH=feat/next-monorepo ./deploy/scripts/deploy-prod-next.sh на daibilet-msk (.184), без SPB builder.

### Решения
- Fast-forward e2f075c..c8f43ae2, web:build, restart sequence по канону.
- **BUILD_ID=LV0jzT3jaueTAOmX202ic**, HEAD=c8f43ae2. Services daibilet-web/daibilet-api active, deploy lock clear.
- Smoke: /blog 200 - page chunk содержит «Смотреть события», «Свежие материалы», «Фильтр материалов по городу», «Найдено:»; лента не форсится header city.
- Smoke landings: /rechnye-progulki/moscow 200 - ormatMoneyRange (100-1 269 ₽ + формы от … ₽); /avtobusnye-ekskursii/moscow 200 с от.
- Tasktracker: UX.BLOG-LISTING-VITALITY, UX.BLOG-DECOUPLE-CITY, FIX.CITYDAY-PRICE отмечены live с BUILD_ID.

### Проблемы
- Post-deploy warm: 2 event SSG warm 500; hub warm 10/12 (moscow/spb 500 на первом проходе) - не блокирует blog/landing surface; IndexNow api.indexnow.org 403 (yandex 202).

---

## 2026-08-11 - Region Hub IA на HEAD (SWR city DTO)

### Наблюдения
- Stash `feat-region-hubs-ia` опирался на старый city DTO (без SWR / soft-timeout / JsonLdScripts). На `feat/region-hubs` от `origin/feat/next-monorepo` нужна точечная интеграция без отката perf.
- Live tier: C <3, B 3-9, A ≥10 ([region-live-tier.md](./region-live-tier.md)); ручной `tier` в JSON - только editorial hint.

### Решения
- `public-city.dto.ts`: enrichment `buildRegionHubEnrichment` / `buildCityRegionNearby` + `clearRegionHubCaches` при soft-invalidate; форма кэша `{ expiresAt, staleUntil, payload }` сохранена.
- Web: `RegionPageView` для `type=region` (JsonLdScripts); city path (admission/articles/editorial) не тронут; `RegionNearbyStrip` после `#affiche`.
- Contracts + hub-indexability + sitemap regions; geo из `region-hubs.ru.json` / info / strip.

### Проблемы
- Полный typecheck/build в этом workspace не прогоняли (локальный pnpm/node_modules может быть битый). Smoke `region-hub.test.ts` и MSK deploy - после commit.


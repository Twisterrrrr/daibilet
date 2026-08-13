## Public client error UI (2026-08-13)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| FIX.PUBLIC-ERROR-UI | Убрать английский Next fallback «Application error…» с public: error.tsx + global-error.tsx + ранний chunk reload | Критический | 🔄 code; live после Deploy MSK web |

## Event PDP title / breadcrumbs (2026-08-13)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| UX.EVENT-TITLE-BREAK | Длинный H1 события: перенос после `: ` / ` - `; на мобилке скрыть последний crumb (дубль H1) | Средний | ✅ live `31693704581` / `31694312986` |
| FIX.HUB-BLOG-CITY | City hub «Из блога»: не показывать статьи другого города; бейдж города / multi на карточке | Высокий | ✅ live `31693704581` / `31694312986` |
| UX.MYDAY-NEARBY-FOOT | «События поблизости» из picker «Выбор Дайбилет» → низ маршрута, 3 + показать ещё | Высокий | ✅ live `31694312986` BUILD_ID=`DNWhE8Cu-cNOGBAQRWMDI` |
| UX.MYDAY-TOOLBAR-ADAPT | Toolbar маршрута: wrapping как Lovable; export на ту же строку когда колонка широкая | Высокий | ✅ live `31697785067` BUILD_ID=`wOdU6cU5y7ITl_bsyiqqa` |
| UX.MYDAY-STOP-HOVER-TICKET | Номер точки: белый invert + scale на hover; «Билеты от» внутри карточки, не под ней | Высокий | ✅ live `31697785067` BUILD_ID=`wOdU6cU5y7ITl_bsyiqqa` |
| UX.MYDAY-STOP-PLACE-NOT-EVENT | Стоп = место (Адмиралтейство≠причал, Эрмитаж≠балет); «Вход свободный» только outdoor; адрес без `///` EN | Высокий | ✅ live `31697785067` BUILD_ID=`wOdU6cU5y7ITl_bsyiqqa` |
| UX.MYDAY-FREE-ENTRY-AUDIT | Аудит mustSee/пресеты/пригороды: не врать «Вход свободный» (парк/храм/Петергоф/ботаника) | Высокий | ✅ live `31697785067` BUILD_ID=`wOdU6cU5y7ITl_bsyiqqa` |
| UX.MYDAY-PICKER-2COL | Подбор «Главные места»: 2 колонки, когда панель достаточно широкая | Средний | ✅ 2026-08-13; live после Deploy MSK web |
| UX.MYDAY-PICKS-GRID | «Выбор Дайбилет»: сетка карточек вместо горизонтального скролла | Средний | ✅ 2026-08-13; live после Deploy MSK web |

## Nav «Места» hub (2026-08-13)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| CAT.MONUMENTS-PACK | Пак памятников в каталог `/locations`: СПб 35, Мск 35, НН 16, КГД 15, Пермь 15 | Высокий | 🔄 JSON в ветке; apply prod DB - этот запрос owner |
| UX.NAV-PLACES-HUB | Primary: Города•События•Места•Подборки•Блог; `/places` mixed grid; entity URL без ломки | Высокий | 🔄 code; deploy batch / по запросу |
| UX.PLACES-UNIFIED-SEARCH | Один поиск на раздел Места: `/places?q=` mixed + тег Площадка/Локация; каталоги не режут q по family | Высокий | ✅ live `31693704581` / `31694312986` |
| UX.MYDAY-UNIFIED-SEARCH | `/my-day` picker: один поиск места+события с тегом семейства; убрать trio локации/площадки/события | Высокий | ✅ live `31693704581` / `31694312986` |
| CAT.VENUE-PLANT-ON-CREATE | Музеи/театры/залы/ДК сразу в `/venues`; дворец-музей с билетом на вход (Юсуповский) тоже | Высокий | ✅ heuristics 2026-08-13; prod upgrade Юсуповского - по запросу |
| CAT.PLACE-CLUSTER | Кластер: `parentId`+`isCluster`; PDP «Что внутри»+афиша; пилот НГ+Севкабель; add в Мой день = родитель | Высокий | ⏳ docs lock 2026-08-13; schema/PDP не билдить без запроса |
| UX.LOC3 | Rename «Локации» → «Места и точки сбора» | Высокий | ⛔ superseded коротким «Места» |
| UX.LOC9 / PH2.PLC1 | Unified mixed `/places` grid+tags (без поискового запроса) | Высокий | ✅ 2026-08-13; live после Deploy MSK web |

## Mobile header / SSR (2026-08-12)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| FIX.MOBILE-NAV-SSR | Гамбургер кликабелен во время SSR/loading (checkbox disclosure + skeleton) | Критический | ✅ `bc6dd254` Deploy MSK web `31569900956` (tip `37b6d863`) |

## City sync + My Day planner (2026-08-13)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| UX.CITY-SYNC-B | Variant B: Event PDP persistOnly sync; catalog city-empty hubs; global setCity guard + CityConfirmModal; foreign-city add clear+sync | Высокий | 🔄 code; deploy batch / по запросу |
| MYDAY.TRIPS-PER-CITY | Variant A: storage map по `citySlug`, badge per city, без удаления маршрута при switch | Высокий | ⏳ Запланировано; критерий старта - стабилизация B на live |

## SEO listing + My Day routes (2026-08-11)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| SEO.LISTING-KGD | Editorial SEO-блок `standup:kaliningrad` в `seo-listing-texts` + Deploy MSK web | Высокий | ✅ `980c31d9` Deploy MSK web |
| SEO.LISTING-INDEX | Owner: index thin listing при editorial SEO (bypass порога &lt;6; 0 офферов = noindex) | Высокий | ✅ `054324cb` Deploy MSK web `31534724044`; smoke `/stendap-i-yumor/kaliningrad` → `index, follow` |
| SEO.MYDAY-ROUTES | План ЧПУ `/routes/{city}/{slug}` из My Day share (MVP/UGC/noindex/canonical) - docs only | Высокий | ⏳ qa owner; не билдить |

## SEO Подборки city ЧПУ (2026-08-11)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| SEO.PODBORKI-CITY-CHPU | Подборки city SEO: план + пилот Meta на `?city=` (не ЧПУ в этом проходе) | Высокий | 🔄 финал пилота KGD+SPB; маркерный ЧПУ - след. спринт |
| SEO.PODBORKI-CITY-0 | Phase 0: inventory + риски | Высокий | ✅ docs |
| SEO.PODBORKI-CITY-META | Пилот Title/Desc/H1 + self-canonical `?city=` (active: kgd/spb; msk leftover) | Высокий | ✅ code live; smoke OK |
| SEO.PODBORKI-STABLE | Stable index/sitemap пилот × (C MULTI + E) + salute D year-round index | Критический | ✅ `028e24b1` Deploy MSK web `31535631523` |
| SEO.PODBORKI-OVERRIDE | SeoOverride + templates + Stage-1 HTML (5 пар) + intent meta; self-canonical smoke | Критический | ✅ `f8217d70` migrate+upsert MSK; fallback deploy-prod-next; smoke PASS |
| SEO.PODBORKI-PILOT-2 | Пилот-2: расширить `PODBORKI_SEO_PILOT_CITY_SLUGS` на `nizhny-novgorod` + `perm` (meta/self-canonical/index + intents); SeoOverride только 1–2 ключа/город, не пачкой. **Не внедрять сейчас** | Высокий | ⏳ Запланировано / waiting: после закрепления КГД+СПб в Вебмастере (1–2 нед.); критерий старта - qa/plan |
| SEO.PODBORKI-CITY-1 | Phase 1: маркер `/podborki/c/{city}` + 301 | Высокий | ⏳ следующий спринт после индексации пилота |
| SEO.PODBORKI-CITY-3 | Phase 3: card SEO blurbs + «N • от X» | Средний | ⏳ |
| SEO.PODBORKI-CITY-4 | Phase 4: blog banners → подборка → события | Средний | ⏳ after marker URL lock |
| SEO.PODBORKI-TRACK | Не смешивать с My Day / не откатывать `seo-listing-texts` index | Высокий | ✅ |

## Region Hub IA (2026-08-11)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| B.ANNA-MSK-DISCO | Колонка Анны: rewrite moskva-vechernie-diskoteki-shou (3 сценария + советы) | Высокий | ✅ 4e69c323 + bodies 85bfd6df; Deploy MSK web 31532073831 |
| P.2r | Region Hub IA v1: DTO + `RegionPageView` + SEO/robots по live tier | Высокий | ✅ shipped (`feat/region-hubs` → `feat/next-monorepo`) |
| P.2r1 | Live tier C↔B↔A (`resolveRegionLiveTier`); strip на центре только Tier C | Высокий | ✅ |
| P.2r2 | Sitemap: indexable regions (A/B ≥3); Tier C вне карты | Средний | ✅ |
| P.2r3 | `region-info` seed + AI pipeline draft | Средний | ⏳ seed JSON есть; LLM script ⏳ |
| P.2r4 | Smoke `region-hub.test.ts` + MSK deploy | Высокий | ✅ test; deploy batch / по запросу |
| UX.REGION-A1 | Tier A UX Phase A: lean cards, city avatar rail, sticky date+genre, venue series collapse | Критический | ✅ code |
| UX.REGION-A2 | Tier A UX Phase B: `region-city-belts` (MSK oblast) + logistics chip + orient map | Высокий | ✅ code (пилот `moskovskaya-oblast`) |
| UX.REGION-A3 | Tier A previews: topPlaces photo-first + city rail session covers; map open by default | Высокий | 🔄 push; deploy по «выкатывай» |

## Follow-up deploy/smoke (2026-08-08)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| B.ANNA-SOCHI-NIGHT | Колонка Анны: ночной Сочи без глянца (рок/стендап/джаз) | Высокий | 🔄 ship+Deploy MSK web |
| B.ARTUR-VII-CHEL | Колонка Артура: гастроспектакль «Вий» в Челябинске (Horse Head) | Высокий | ✅ `8c77f77f` Deploy MSK web `31528362734` |
| B.MAX-MSK-CIRCLE | Колонка Макса «Как перестать гулять по кругу» + `isFeatured` материал недели | Высокий | ✅ `5e703d2c` upsert+featured; Deploy `31525508276` |
| UX.MUSTSEE-DROP-BULK | my-day «Главные места»: убрать bulk «Добавить главные места»; chips + list остаются | Высокий | ✅ `8b889e85` Deploy MSK web `31473922071` BUILD_ID=`FZI5gnbEMamJmDZd6NqvN` |
| UX.MYDAY-LOVABLE-W1 | `/my-day` Wave 1 Lovable shell: MyDayShell split+collapse map, sticky toolbar, mobile map sheet 85vh, schedule banner, default Список | Критический | 🔄 `9fff7e7e` Deploy `31480928724` |
| UX.MYDAY-LOVABLE-W1.5 | `/my-day` visual parity: Lovable stop cards + dense toolbar; list-only; commerce secondary | Критический | 🔄 `9fb3754f` Deploy `31482332163` |
| UX.MYDAY-STEP2-CARD | `/my-day` Lovable «Шаг 2 из 2» при 1-2 stops; hour plan с 1+; supersede belowMin alert | Критический | ✅ `1ab6f261` Deploy `31517699206` |
| UX.MYDAY-PICKER-SHEET | `/my-day` подбор точек: side drawer (сценарии/места/пригороды/picks/своё), launch bar | Критический | 🔄 in progress |
| UX.MYDAY-MUSTSEE-HROW | Picker «Главные места»: горизонтальные row-cards (thumb left + desc), не 2-col portrait | Критический | ✅ `6b816690` |
| UX.MYDAY-STOP-LOVABLE | Stop cards 1:1 Lovable + types/Gantt/kbd DnD/PDF map/save scenario | Критический | ✅ `6b816690` (GPX/KML deferred) |

| UX.MYDAY-NOTES-NIKOLSKY | `/my-day`: between-stop notes; drop list insert; Kryukov Nikolo (not Kronstadt); Berthold coords; heading «Маршрут из N точек» | Критический | 🔄 `d9f25963` Deploy `31462262773` (prev `31461921550` build fail JSX) |
| UX.MYDAY-LIST-WANDERLOG | `/my-day` Список: pin+thumb cards, between-leg `пешком • м` + «Маршруты», hover `+` insert (место/заметка/список), HTML5 DnD | Критический | 🔄 `e82aaf0e` push; deploy по «выкатывай» |
| UX.MYDAY-HIDE-STEPS | `/my-day`: временно скрыть «Шаги» timeline (`SHOW_DAY_ROUTE_STEPS=false`); dismiss X на «Свободное окно» (session state) | Критический | 🔄 `de54fbc6` Deploy `31430742242` |
| UX.MYDAY-STOPS-GRID | `/my-day`: Шаги timeline always on; toggle Сетка\|Список (restore fence) | Критический | ✅ `77debf04` tip `502dcace` Deploy `31429446266` BUILD_ID=`CbfydAWBpi_OYVn2yFIJt` |
| FIX.EVENT-STANDBY-TEP-TWIN | `/events/…-6a1ef2c…` 404: STAND_BY TC → soft title-twin TEP + permanentRedirect | Критический | ✅ `71a0ccaa` API restart + Deploy `31428772500` |
| FIX.MYDAY-BOAT-PIERS | my-day boat wizard: dedupe pier twins; hide 0-route cards; Dvortsovaya 18 distance via coords fallback | Критический | ✅ `813160fa` Deploy `31428529388` |
| UX.HERMITAGE-PDP-V3 | Hermitage PDP: hide commercial tickets; no hero chips; hours above map; Факт; sticky tabs; gallery; open-now; event thumbs; MSK/SPB nearest metro | Критический | 🔄 `896578ab` Deploy `31428001571` |
| UX.HERMITAGE-SPBBOATS | Hermitage PDP: commercial hero/tickets/contacts; similar museums only; title Государственный Эрмитаж | Критический | ✅ `454b315c` Deploy `31419097355` + API restart MSK |
| FIX.HERMITAGE-ALIAS-PDP | Redirect `gosudarstvennyi-ermitazh`→`ermitazh`; institution PDP: no hero chips, metro, about/visit before routes, FAQ bottom | Критический | ✅ `3fa8979e` Deploy `31415510287` |
| FIX.HOME-CITIES-LOOP | Popular cities rail: restore infinite arrow loop (no snap-back at last city after ea6c7897) | Критический | ✅ `6234df27` Deploy `31469259250` |
| FIX.HOME-CITIES-MOBILE-TAP | Popular cities rail mobile: tap opens city hub (defer loop wrap + touch router.push); compact card static event count | Критический | 🔄 `d279f68b` tip `8a340831` Deploy `31500542809` |
| UX.HOME-CITIES-MSK-ANCHOR | Popular cities rail: MSK left under H2 (adaptive); SPB next; keep infinite loop | Критический | ✅ `5d995893` tip `65276de6` Deploy `31410582677` |
| FIX.SWAP-STATIC-COMPAT | Artifact swap: merge `.next.prev` hashed css/chunks/media (no-clobber) so s-maxage HTML не 404 CSS | Критический | ✅ `fc4d8bd7` Deploy `31468859832` BUILD_ID=`VI6qxKHs2rwnQwwgRsaIn` |
| UX.LOGO-Y-STATIC | Logo: em-кратка point-1 = й always; zero animation; mobile кратка only | Критический | ✅ `4f20ceed` Deploy `31468480615` |
| UX.LOGO-BREVE-LINE | Logo: solid breve-stroke over «и» → dashed route (replace black point-1) | Критический | ✅ `47fcad03` tip `65276de6` Deploy `31410582677` (superseded by UX.LOGO-Y-STATIC) |
| UX.CITY-HUB-HERO-CTAS | City hub hero: remove search; restore Афиша + Подборки событий buttons | Критический | ✅ `47fcad03` tip `65276de6` Deploy `31410582677` |
| UX.CITY-HUB-HERO-BRIEF | City hub: brief in hero; first submenu «Зачем ехать» (не body Описание) | Критический | 🔄 ship |
| UX.EVENTS-MOBILE-SELECTS | `/events` mobile: search + Дата/Тип dropdowns (не chip rails); desktop date rail | Критический | 🔄 ship |
| UX.CITY-HUB-EDITORIAL-ORDER | City hub: Описание + Факты + Зачем ехать before «Готовые сценарии» (restore CityWhyGo / places rail) | Критический | ✅ `b113a927` push; deploy по «выкатывай» |
| UX.EVENTS-CALENDAR-COVERS | `/events`: calendar corner in date rail; remap center-cruise text flyers; live rail full container width | Высокий | ✅ `1c0fd42f` push; deploy по «выкатывай» |
| UX.CITY-HUB-SEARCH-SCENARIOS | City hub: search hero; scenarios magazine merge; collections grid; editorial blog cards; mobile jump chips | Высокий | ✅ `b3b52684` (hero search superseded by UX.CITY-HUB-HERO-CTAS) |
| UX.HOME-BLEED-BOX | Homepage rhythm: cities gray full-bleed rail; My Day graphite band; blog magazine feature; editors/popular/podborki boxed | Высокий | ✅ `0a906fe6` push; deploy по «выкатывай» |
| UX.HOME-RHYTHM | Homepage P0-P2: clean hero+swipe chips; editors rail; merge now/popular; My Day constructor preview; cities/podborki rails | Высокий | ✅ `b48ea8cb` push; deploy по «выкатывай» |
| UX.MYDAY-TRAVEL-PRODUCT | `/my-day`: magazine suburb, stops timeline, scenario snap cards, must-see carousel, mobile shelf tabs | Критический | ✅ `af70051d` Deploy `31342186797` BUILD_ID=`RWJuTMEW-R707-yh7VQwJ` |
| UX.MYDAY-TRAVEL-FOLLOWUP | `/my-day` after af70051d: stop thumbs from editorial maps; suburb no empty cover band; must-see dense+desc (≠ hot picks) | Критический | ✅ `d8451dc5` push; deploy по «выкатывай» |
| UX.PODBORKI-ONE-FILTER | `/podborki`: один filter-system (black tabs + soft tags); kill «Каталог подборок»/дубль city; clean covers (meta under photo); dedupe featured | Высокий | ✅ `eb68f461` Deploy `31342186797` BUILD_ID=`RWJuTMEW-R707-yh7VQwJ` |
| UX.SITEWIDE-MINIMALISM | Sitewide UX: 1 mobile filter rail; no system junk; clean covers (meta under photo); one monochrome line icon pack. Canon LOCKED in Project/Diary | Высокий | ✅ docs locked; 🔄 page polishes ongoing (venues done; locations/podborki/blog) |
| UX.VENUES-CATALOG-QUIET | `/venues`: kill dark hero; white H1; soft chip rail; no Найдено/стр.; clean InstitutionCard (+ icon, meta above title) | Высокий | ✅ `e78f905b` Deploy `31342186797` BUILD_ID=`RWJuTMEW-R707-yh7VQwJ` |
| UX.BLOG-INDEX-POLISH | `/blog`: soft toolbar/chips; quiet fresh meta; simplify afisha promo; drop count+view toggle | Высокий | 🔄 ship; deploy по «выкатывай» |
| UX.LOCATIONS-CATALOG-QUIET | `/locations`: quieter hero/filters; vertical premium cards; no overlay route pill; strip city on address | Высокий | 🔄 ship; deploy по «выкатывай» |
| UX.EVENTS-CHIPS-SIMPLIFY | `/events`: date rail в title band; quick+categories один soft-ряд под search; без system date input | Высокий | ✅ follow-up после `ad5f3dc0`; deploy по «выкатывай» |
| UX.CITIES-SORT-ONE-LIST | `/cities`: один список (без top/octet); sort popular/name на весь набор; toolbar search+controls в одной строке | Высокий | ✅ `2965a338`; deploy по «выкатывай» | Deploy `31336541746` BUILD_ID=`SR08A3UaBJ4IlLsjQcK4n`
| UX.VENUE-AFISHA-ORDER | Venue/location: афиша выше; хабы/похожие ниже | Высокий | ✅ `28795f43`; deploy по «выкатывай» | Deploy `31336541746` BUILD_ID=`SR08A3UaBJ4IlLsjQcK4n`
| UX.VENUE-SCHEDULE-RAIL | Venue «Расписание и билеты»: date rail + calendar; drop table/tabs/stats/subtitle | Высокий | ✅ `28795f43`+`97b27739`; deploy по «выкатывай» | Deploy `31336541746` BUILD_ID=`SR08A3UaBJ4IlLsjQcK4n`
| CONT.VENUE-LOCATION-PREVIEWS | Audit+GenerateImage covers для locations/institutions без превью; wire LOCATION_PACK | Высокий | ✅ `88708eac` Deploy web `31342186797` BUILD_ID=`RWJuTMEW-R707-yh7VQwJ` | |
| FIX.VENUE-DATE-RAIL-SLOTS | Pier/location date rail: hydrate upcomingSlots на venue-scoped slice (не только nearest/today) | Высокий | ✅ `2f0b8099` API restart MSK 23:34Z + web `31342186797` | |
| UX.SCENARIOS-TITLE-FLUSH | Scenarios panel: no empty gutter; blog+CTA on title row | Высокий | ✅ `06b1db6b` Deploy `31335835810` BUILD_ID=`Mby7MP2KiGFvNEWzY_qC4` |
| UX.EVENTS-MOBILE-SELECTS | `/events` mobile: Find in search; date+type dropdowns; chip rails md+ only | Высокий | ✅ `c68d010e` Deploy `31335835810` BUILD_ID=`Mby7MP2KiGFvNEWzY_qC4` |
| UX.EVENTS-FILTERS-AIR | `/events` mobile: sticky search-only (chips visible); filter sheet air + quick evening chip | Высокий | ✅ `f0880cb1` Deploy `31335835810` BUILD_ID=`Mby7MP2KiGFvNEWzY_qC4` |
| UX.CITIES-CATALOG-CLEAN | `/cities` clean hero + hub/region chips; vibe Lucide hover (no emoji) | Высокий | ✅ `b02bccab` Deploy `31335835810` BUILD_ID=`Mby7MP2KiGFvNEWzY_qC4` |
| UX.SCENARIOS-TWO-COL | Hub/my-day scenarios: 2-col stops; CTA beside title + panel v-center | Высокий | ✅ `07dcb587` Deploy `31334844554` |
| UX.EVENTS-YANDEX-LITE | `/events` P1-P4: date rail, category Ещё, search hints, real live rail (no P5) | Высокий | ✅ `d59fd28e` Deploy `31334844554` |
| UX.EVENTS-CATALOG-REDESIGN | `/events` mobile-first: compact hero, filters FAB, modern cards 1/2/3/4 | Высокий | ✅ `d51eb4a2` / live `910faa55` |
| FIX.CANON-PATH-FAMILY | Venue canonicalPath locations↔venues mismatch bulk fix (796) | Высокий | ✅ MSK apply 796; dry-run 0 |
| FIX.LOC-REDIR-LOOP | location↔venues permanentRedirect loop via mismatched canonicalPath (Yaani Kirik) | Критический | ✅ `f3885fe2` Deploy `31317278952`; DB ATTRACTION; smoke 200 |
| FIX.TC-CANCELLED-MISSING | TC: deactivate events missing from PUBLIC∪STAND_BY; block widget on cancelled; `tc:reconcile-missing` | Критический | 🔄 ship + MSK reconcile |
| FIX.TC-STANDBY-RECONCILE | TC sync: fetch STAND_BY + reconcile; hide sales-stopped cards catalog-wide | Критический | ✅ `11af2419` MSK reconcile 7658 STAND_BY; API restart + catalog rebuild |
| UX.CANON-PANEL-INSET | DayTripCanonCard: logistics bg extend left; gastro pl same inset; keep text vertical | Высокий | ✅ `73509693` Deploy MSK web `31308732076` BUILD_ID=`SH7xtIXBki0ZEfrBkwYe3` |
| CONT.PERM-GUBAHA-USVA | Perm: одна chip «Губаха / Усьва» с День 1/2 внутри; не две карточки | Высокий | ✅ `0f7363b9` Deploy MSK web `31308285355` BUILD_ID=`rcEaipEqElKkWcTQI1VD2` |
| FIX.HIDE-CLOSED-SLOTS | Public: скрыть слоты с closed/STAND_BY/paused/isActive=false (catalog layer) | Критический | ✅ `abb583f6` API live MSK `e906ea75`; CI green |
| FIX.EVENT-PAGE-SLOT-CAP | Event page: `take:12`+`slice(0,5)` резал PUBLIC слоты meta-группы (KGD История в тарелке); fetch 64 / display 32 | Критический | ✅ `95274ce6` MSK API restart; live 10 PUBLIC slots |
| FIX.EVENT-CLOSED-SLOT-CACHE | Closed/STAND_BY слоты залипали в ISR+nginx; UI fallback на blocked; soft-redirect STAND_BY slug | Критический | ✅ `0929bbc7`+`a2239a20` MSK API; web Deploy `31523235759` |
| UX.EVENTCARD-DROP-SESSION-CTA | EventCard: убрать дубль «Выбрать сеанс» (overlap с ценой); один CTA «Купить билет» | Высокий | ✅ `95b7d2a8` Deploy MSK web `31308004380` BUILD_ID=`HR7QZofnxFLxEIb8loJVL` |
| FIX.BOAT-TZ-20:55 | Bridges/my-day: primary −3ч vs slots; dedupe HH:mm MSK | Критический | ✅ `a905d477`/`038ea511`; API+catalog rebuild; Deploy MSK web `31306448807` BUILD_ID=`Cw8DFKoqPUl8GZ-NI-yc_` |
| CONT.TRANSIT-TIPS | Schema `transitTip` + UI suburb timeline; NN logistics; SPB triangle/Petrograd/Bertgold/bar; Perm/KGD tips | Высокий | ✅ `c5d644d8` Deploy MSK web `31305337295` BUILD_ID=`gOTUGQNTVuIsCS_1DvAT_` |
| CONT.KGD-LOGISTICS | KGD suburbs/presets: коса углубление+Фрингилла возврат, Зел/Свет/Балт/Янт порядок+timingNote | Высокий | ✅ `7644445c` Deploy MSK web `31304947725` |
| CONT.PERM-LOGISTICS | Perm suburbs/presets: Хохловка CCW, Кунгур центр+пещера, Белая гора split, Усьва/Губаха 2 дня | Высокий | ✅ `7644445c` Deploy MSK web `31304947725` BUILD_ID=`mi3IHPRLphsEf9IgHXj9a` |
| UX.GUIDE-OPEN | my-day: suburbs/scenarios DayTripCanonCard always open (not accordion); accordion = route tools | Критический | 🔄 ship+Deploy MSK web |
| UX.MUSTSEE-CHIPS-2ROW | Hub must-see filter chips: mobile 2-row horizontal scroll; sm+ wrap | Критический | 🔄 ship+Deploy MSK web |
| UX.CANON-ALIGN | DayTripCanonCard desktop: gutter nums + text vertical = title; mobile wider; tips; scenarios carousel | Критический | 🔄 ship+Deploy MSK web |
| UX.SCENARIOS-WRAP | Scenarios chips: mobile carousel (nowrap scroll), sm+ wrap; SPB drop suburb dupes | Критический | 🔄 ship+Deploy MSK web |
| UX.MYDAY-TRANSIT | Between-stop `↓ tip` in my-day list; merge keeps transitTip; Peterhof/bar tips | Высокий | 🔄 ship+Deploy MSK web |
| UX.SCENARIOS-LIGHT | Сценарии light panel; suburb canon full-width; POI row flex; CTA match | Критический | 🔄 ship+Deploy MSK web |
| UX.DAY-TRIP-CANON | DayTripCanonCard для suburbs (full width); scenarios откатили с shared canon | Высокий | ✅ partial `c5629984`; scenarios split → UX.SCENARIOS-LIGHT |
| UX.SUBURB-CARD-CANON | Suburb cards hub/my-day: канон Петергоф-макета (логистика/гастро/что посмотреть/CTA), schema logisticsExit+gastroStop, без SVG icons | Высокий | ✅ superseded by UX.DAY-TRIP-CANON |
| CONT.SPB-SUBURB-DENSITY | SPB suburbs nested POI по насыщенности (не жёсткие 5); presets+timingNote; docs LOCKED | Высокий | ✅ `088cfe71` Deploy MSK web `31301708432` BUILD_ID=`f1YPffw6I_wxfeh3iRANZ` |
| CONT.TOP-SUBURB-DENSITY | NN/Perm/KGD suburbs по насыщенности (+ NN seed); timingNote; docs top-cities rule | Высокий | ✅ `a21bd869` Deploy MSK web `31302449342` BUILD_ID=`2Z1zYZAF8wT1dGb3O9h2i` |
| UX.DAY-TIMING-NOTE | Day presets: `timingNote` в head chips panel; СПб Петергоф+Царское; docs LOCKED | Высокий | ✅ `cde2a697` Deploy MSK web `31301074864` BUILD_ID=`lwjCDA2vbaW1gDR3CzMg2` |
| FIX.EVENTS-PAGE-HANG | `/events` `?page=` soft-nav hang → listPage + pushState + buttons + stale-first | Критический | ✅ `22f9c4ab` Deploy MSK web `31300245196` BUILD_ID=`2QPP1b_Ed-1ffhxo3VXFw` |
| FIX.VENUE-PAGE-HANG | `/locations`/`/venues` `?page=` soft-nav hang → client slice | Критический | ✅ `3a968000` Deploy MSK web BUILD_ID=`9BpSEnRcVf3lhoksHGMJ6` |
| UX.HUB-SCENARIOS-CHIPS | Hub «Готовые сценарии»: chips+panel как my-day на всех breakpoints (не card list) | Высокий | ✅ `eaf4a164` Deploy MSK web `31299644782` BUILD_ID=`XmUXa_zhYAnUPDqEPpQYP` |
| UX.HUB-AFFICHE-RAIL | Hub «Ближайшие события»: mobile swipe carousel + desktop prev/next (не вертикальная простыня) | Высокий | ✅ `eaf4a164` Deploy MSK web `31299644782` BUILD_ID=`XmUXa_zhYAnUPDqEPpQYP` |
| INC.LOC500.SOFTCONN | soft-unavailable `connection()` → DYNAMIC_SERVER_USAGE 500 на location PDP | Критический | ✅ `5221afcd` Deploy MSK web BUILD_ID=`XA_SZgY9mVm0tjISGf6pI` |
| FIX.TC-BAD-TOKEN | my-day «Купить билет» → TC HTTPForbidden bad token (`r:` в URL) | Критический | ✅ `89abc556` API live; web Deploy MSK |
| INC.VENUE-SOFT-ALL | API hang → soft-unavailable poison на всех venue PDP | Критический | ✅ ops restore; code soft≠ISR + catalog child mode |
| INC.LOC404.VLAD | STALE 404 `/locations/saint-petersburg-vladimirskiy-sobor` | Критический | ✅ ops 200; code miss≠unavailable + canon redirect |
| FIX.CITY-MULTI-LANDINGS | normalizeKnownCitySlug: все destination cities → концерты/стендап в hub/podborki | Критический | ✅ code; нужен web deploy |
| FIX.HERO-CTA-FROM | Hero CTA «от min»; stats min-max | Высокий | ✅ code; deploy пачкой |
| FIX.PRICETo-REAL | Catalog SQL real priceTo (offers/sessions max) | Высокий | ✅ dto.js; нужен API restart |
| OPS.DEPLOY-HEAD | Live на `7c5f2210` Deploy `31260953355` BUILD_ID=`dKXqka8q8BXEbdT7y7aRQ` | Критический | ✅ |
| FIX.PRICETo-CTE | Catalog SQL priceTo -> max(priceFrom) hotfix | Критический | ✅ `7c5f2210` (superseded by FIX.PRICETo-REAL) |
| FIX.TEPLOHOD-404 | HIDE venue_6a4d0400... public teplohod-moskva-99 | Высокий | ✅ API/web 404 |
| FIX.LOC-EYEBROW | Exact count вместо 710+ | Высокий | ✅ |
| FIX.VENUES-AFISHA-LIVE | API venuesWithEvents после api restart | Высокий | ✅ 1101 |
| FIX.HOME-FOOTER-EVENTS | Home trust strip = footer via `catalogSocialStats` | Высокий | ✅ code; deploy пачкой |

---
# Tasktracker — Daibilet

**Обновлено:** 2026-08-09
**Источники:** [Project.md](./Project.md), [current-state.md](./current-state.md), [migration-spb-to-msk.md](./migration-spb-to-msk.md), [widget-etalon-slugs.md](./widget-etalon-slugs.md), [content-blog-plan.md](./content-blog-plan.md), [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md), [mobile-templates.md](./mobile-templates.md), [catalog-location-venue-canon.md](./catalog-location-venue-canon.md), [museum-contract-readiness.md](./museum-contract-readiness.md), [web-lightweight-seo.md](./web-lightweight-seo.md)

**Легенда:** ✅ done · 🔄 in progress · ⏳ todo · 🚫 blocked · ⚠️ deferred

---

## UX: /venues hero «В афише» vs catalog total (2026-08-08)

**Контекст:** owner - subtitle «В афише 1 245 площадок» врал (это размер каталога, не afisha).

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| FIX.VENUES-HERO-AFISHA | Hero: `venuesWithEvents` + events (event≠slots); eyebrow = catalog size | Критический | ✅ code; deploy пачкой |

---

## UX: Buyer LK order support mailto (2026-08-08)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| UX.BUYER-SUPPORT.1 | «Вопрос по заказу» secondary в BuyerOrderCard + mailto hello@ | Высокий | ✅ `5d323f73` |
| UX.BUYER-SUPPORT.2 | Hint: возврат по правилам площадки / ответ в рабочие часы | Высокий | ✅ |
| UX.BUYER-SUPPORT.3 | Commit+push+MSK deploy+smoke `/account/purchases` | Высокий | ✅ Deploy `31252460479` **BUILD_ID=`d3ZmqQ12iG6KmwyJHlya3`** (SHA incl. `5d323f73`); chunk has mailto+hint; page 200 |

---

## Incident: location PDP DYNAMIC_SERVER_USAGE 500 (2026-08-08)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| INC.LOC500.1 | Repro `/locations/cerkov-…-yaani-kirik` + MSK logs | Критический | ✅ digest `DYNAMIC_SERVER_USAGE`; API DTO 200 |
| INC.LOC500.2 | Fix: `safeNotFound` + ISR-safe fetch + DTO-before-secondary | Критический | ✅ `5c41eaaa` (+ `75a340c5`/`4263ed0c`) |
| INC.LOC500.3 | Smoke slug 200 + missing 404; spot-check PDPs; commit+push+MSK deploy | Критический | ✅ Deploy `31252808574`; cerkov/osobnyak 200; miss/petropavlovskaya/ermitage 404; 0 DYNAMIC digests |

---

## Epic: WEB.LIGHT - lightweight HTML + robots (2026-08-08)

**Канон:** [web-lightweight-seo.md](./web-lightweight-seo.md)  
**Контекст:** после UI/bug batch; поверх SWR venue hub / progressive venues / soft-404 / home ISR (не дублировать).  
**Deploy:** docs-only сейчас; runtime - batch / по запросу owner.

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| WEB.LIGHT.DOC | Architecture plan ranked causes + budgets + phases | Критический | ✅ `docs/web-lightweight-seo.md` |
| WEB.LIGHT.A1 | Lean home HTML ≤350KB (PERF.WM4) | Высокий | ⏳ |
| WEB.LIGHT.A2 | Home SSR single LCP hero frame; rotator client | Высокий | ⏳ |
| WEB.LIGHT.A3 | Font weights / subset trim | Средний | ⏳ |
| WEB.LIGHT.A4 | Single `priority` LCP audit | Средний | ⏳ |
| WEB.LIGHT.A5 | Live blog `[slug]` ISR HIT (PERF.WM2) | Высокий | ⏳ |
| WEB.LIGHT.A6 | CI guardrails: no soft-404 loading + no null DTO cache | Высокий | ⏳ |
| WEB.LIGHT.A7 | Warm `/venues` `/locations` shell post-deploy | Высокий | ⏳ |
| WEB.LIGHT.B1 | Venue hub disk snapshot / forever-SWR | Критический | ⏳ |
| WEB.LIGHT.B2 | City hub SSR links + defer heavy client | Высокий | ⏳ |
| WEB.LIGHT.B3 | Leaflet only on «Показать карту» | Высокий | ⏳ |
| WEB.LIGHT.B4 | Hero banners via cached API (INC.504.15) | Высокий | ⏳ |
| WEB.LIGHT.B5 | Payload telemetry in smoke | Средний | ⏳ |
| WEB.LIGHT.B6 | Dead hub cards data cleanup (INC.LINK.5) | Высокий | ⏳ |
| WEB.LIGHT.C* | RSC slim / dual SWR merge / PPR / AVIF / crawl report | Низкий | ⏳ later |

---

## UX: /venues pagination beyond 24 (2026-08-08)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| UX.VENUES-MORE.1 | Visible «Показать ещё» + progressive loadMore (shell+enrich) | Критический | ✅ `d6336346` MSK BUILD_ID=`bHSH2B7c6PCvterwiCo3W` |
| UX.VENUES-MORE.2 | Type chips keep server cursor (не null после client-filter) | Высокий | ✅ |
| UX.VENUES-MORE.3 | Same button on `/locations`; commit+push+MSK deploy+smoke | Высокий | ✅ deploy `31252274496` (SHA `ce7183ab` incl. fix); API page2 OK |
| UX.VENUES-MORE.4 | loadMore hang: append shell before enrich; shell hub skip hero SQL + soft-SWR | Критический | ✅ `572ad9ed` Deploy `31254097972` **BUILD_ID=`iOB3OzsLHCu1asqWB4o15`**; API restart; cold shell ~1.9s (было 504/60s), page2 ~0.2–0.4s |
| UX.VENUES-PAGE | Classic `?page=` pagination вместо infinite append на `/venues`+`/locations` (size 24) | Критический | ✅ code; deploy пачкой |

---

## UX: significant suburbs layout (2026-08-08)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| UX.SUBURB.1 | Hub: chips + one detail panel (drop tall snap-carousel) | Высокий | ✅ `54c22b33` |
| UX.SUBURB.2 | My Day: horizontal accordion by suburb chip | Высокий | ✅ compact accordion |
| UX.SUBURB.3 | Commit + push + MSK deploy + SPB smoke | Высокий | ✅ Deploy `31252106157` BUILD_ID=`s-owIkAGLosjNneQIvCtt` (HEAD `18afa783` incl. suburbs); hub 200 + 12 chips / 1 panel; my-day 200 |

---

## Incident: link audit missing-DTO → HTTP 500 (2026-08-08)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| INC.LINK.1 | Crawl daibilet.ru hubs/venues/blog/footer (~485 checks) | Высокий | ✅ `docs/link-audit-2026-08-08.md` |
| INC.LINK.2 | Fix API city/venue/event miss `200 null` → 404 | Критический | ✅ handlers |
| INC.LINK.3 | Fix web miss → 404 not 500 (cache/metadata) | Критический | ✅ cached-*-data + VenuePages/city metadata |
| INC.LINK.4 | Footer SPB rooftops → saint-petersburg | Высокий | ✅ `seo-internal-links.ts` |
| INC.LINK.5 | Dead hub venue cards without DTO (data) | Высокий | ⏳ |
| INC.LINK.6 | MSK deploy API+web for live 500→404 | Критический | ✅ web `4263ed0c` deploy `31252716402`; miss pages **404**; hubs 200; footer SPB rooftops OK |
| INC.LINK.7 | Root cause: ISR `fetch cache:no-store` + `noStore()+notFound` → DYNAMIC_SERVER_USAGE | Критический | ✅ safeNotFound + no uncached miss fetch |

---

## Incident: city hub nginx/ISR STALE 404 (2026-08-08)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| INC.CITY404.1 | Diagnose `/cities/samara` live 404 vs API/origin 200 | Критический | ✅ nginx STALE 404 poison; seed/slug OK |
| INC.CITY404.2 | Hotfix: purge nginx proxy cache + warm Pack C hubs | Критический | ✅ MSK purge; live samara/Pack C **200** |
| INC.CITY404.3 | Code: city DTO no-null cache + `noStore()` before `notFound()` | Критический | ✅ `afadaa2e` Deploy MSK web `31251047111` |
| INC.CITY404.4 | Fix `POST /api/internal/revalidate` 500 (CI-baked `city-routing.ru.json` path) | Высокий | ✅ `2a16482b` MSK **BUILD_ID=`_1j1yvH-SEeT_Wp_aEO77`** revalidate 200; samara 200 |

---

## Epic: First open-date supplier contract (Stage 0) → Codex (2026-08-07; taxonomy 2026-08-08)

**Канон / brief:** [museum-contract-readiness.md](./museum-contract-readiness.md) (таксономия supplier + 2 режима, матрица ролей, copy-paste Codex, e2e).  
**Owner lock:** Supplier ≠ только музей (музей / арт / театр / фестиваль…). **Stage 0** = `OPEN_DATE` / линейная открытая дата. **Stage 1** = события/сеансы (разовые или recurring).  
**Path A only** (linear admissions / OPEN_DATE). Wide CTA out. Path B calc out. Events schedule out of Stage 0. Secrets / `.159` env не трогать из catalog agents.  
Alias `museum-1` = первый open-date контракт (не «музеи forever»).

| ID | Задача | Приоритет | Статус | Owner |
|----|--------|-----------|--------|-------|
| M1.DOC | Docs: readiness matrix Stage 0/1/2 + Codex brief + supplier taxonomy | Критический | ✅ `docs/museum-contract-readiness.md` (taxonomy 2026-08-08) | Cursor arch |
| M1.PAY | Public admission create-payment + `return_url` catalog `?order=` | Критический | ✅ code **live on `.159`** (2026-08-09); closeout = sandbox pay confirm | Codex (UX.BUY-5) |
| M1.WH | Webhook e2e sandbox PENDING→SUCCEEDED + verify + idempotency | Критический | 🔄 canon URL LOCKED; **owner: register/verify cabinet** (свёртка «cabinet DONE»); e2e open ([checklist](./checklists/yookassa-e2e-sandbox.md)) | Owner + Codex (FIN.W1 / MIG.9.5) |
| M1.REC | Reconcile path (manual + timer draft) если webhook lost | Критический | 🔄 timer/ops ✅; runtime confirm в связке с closeout | Codex |
| M1.TKT | Issuance: `ticketNumber` ≠ `publicCode`; order-by-code DTO полный | Критический | ✅ code **live on `.159`**; ⏳ e2e `CONFIRMED` + `ticketNumbers` | Codex |
| M1.BUY | purchases-by-email / m2m для account fan-in | Высокий | 🔄 finance endpoints live; catalog fan-in / m2m consume open | Codex (UX.BUY-6 / CF.P1c) |
| M1.SUP | Open-date supplier template (музей/арт) + LC orders + legal/bank approve + supportPhone DTO | Критический | ⏳ Roadmap §5 Supplier LK MVP | Codex (FIN.W2) |
| M1.OPS | Runbook: reconcile + manual refund/cancel + support search | Высокий | ⏳ Roadmap §4 Operator contour | Codex |
| M1.MAIL | Buyer email link (finance mail или SMTP) / documented fallback | Высокий | ⏳ | Codex + owner SMTP |
| M1.E2E | E2e matrix T1-T8 из readiness doc перед договором | Критический | ⏳ после Stage 0 closeout | Codex + Cursor smoke |
| M1.S1 | Stage 1 outline: events/sessions supplier (one-off + recurring; categories/prices) | Средний | ⚠️ deferred after M1 | - |
| M1.S2 | Stage 2 outline: full LK clients/orders/fin reporting | Средний | ⚠️ deferred after S1 | - |

**Acceptance Stage 0:** код live на `.159`; **остался runtime closeout** - sandbox pay → `CONFIRMED` + `ticketNumbers` + public lookup. Catalog buyer ticket UX (Path A UI) = ✅ Cursor. План дальше: [qa.md](./qa.md) § Roadmap финконтура (buyer/operator/supplier/refunds light/live gates).

---

## Webmaster slow server response (2026-08-07)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| PERF.WM1 | Home `/` private/no-store из raw articles fetch → ISR `unstable_cache` + drop unused venues/stats SSR | Критический | ✅ `5b15d6a1` MSK **BUILD_ID=`h-wuzCSpK1J_r3Ox9MklZ`** Deploy **31179359213** `s-maxage=300` HIT |
| PERF.WM2 | Blog `[slug]` raw fetch → `getCachedBlogArticle` ISR | Высокий | 🔄 code in `5b15d6a1`; live still `no-store` (follow-up) |
| PERF.WM3 | SSR healthcheck: false curl=28 on large `/` → skip if TTFB OK; max-time 12s | Критический | ✅ live script on MSK + `5b15d6a1` |
| PERF.WM4 | Lean home HTML (~730KB) / optional VM upsizing | Средний | ⏳ owner |

## SEO soft-404 / HTTP 404 (2026-08-07)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| SEO.SOFT404 | Yandex: missing pages must return HTTP 404 (not 200 + not-found UI). Root cause: loading.tsx streaming. Fix: `(catalog)/loading` + drop detail/root loading; metadata notFound(); swap purges nginx proxy_cache | Критический | ✅ `61bb52dd` MSK **BUILD_ID=`9tTC33CUihsVjB1M_cDp9`** |

---

## Buyer UX catalog track (Cursor, 2026-08-07)

Параллельно Codex эксперимент на `pay/.159`. Catalog track = `daibilet.ru` / `apps/web`. Не force-merge.

**LOCKED 2026-08-07 (owner):**
- **Path A (NOW):** simple museum / admission → thin email → create-payment → redirect `confirmationUrl` (ЮKassa). Custom multi-step checkout **не** нужен для этого потока.
- **Path B (FUTURE, allowed):** complex internal calc UI when pricing needs it - scaffold `/checkout/calc`; не подключать museum CTA сюда.
- Cursor/Codex parallel = thin redirect + result + account (не heavy form для музеев).

**CLOSED 2026-08-07 (owner: без Codex):** buyer-visible ticket fulfillment UX на catalog - ticket card, «Мои покупки», best-effort mail, return wiring. Wide CTA out.

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| UX.BUY-1 | Path A: thin admission → YooKassa redirect (`/checkout/admissions/[slug]` + actions) | Критический | ✅ thin `7e3eeb1d` |
| UX.BUY-2 | Result / thank-you `/checkout/result?order=publicCode` + ticket card | Критический | ✅ ticket UX |
| UX.BUY-3 | Account purchases: internal (publicCode/status/title + link to ticket) + widget ExternalOrder | Высокий | ✅ |
| UX.BUY-4 | URL canon: Path A vs Path B + pay parallel | Высокий | ✅ |
| UX.BUY-5 | Codex: public admission create-payment → confirmationUrl (+ return `?order=`) | Критический | ✅ code live on `.159`; ⏳ sandbox pay closeout |
| UX.BUY-6 | Codex: m2m / public purchases-by-email для fan-in в account | Высокий | ⏳ Codex / soft localStorage+soft API |
| UX.BUY-7 | Path A polish: offer qty>1, phone, resume unpaid confirmationUrl | Средний | ⏳ thin only |
| UX.BUY-8 | Path B complex calc (cart/multi-offer) — future internal pricing; не museum | Низкий | ⚠️ deferred (allowed later) |
| UX.BUY-9 | Path B scaffold `/checkout/calc` (placeholder; wire later) | Низкий | ✅ `7e3eeb1d` |
| UX.BUY-10 | Ticket page `/checkout/ticket/{publicCode}` (HTML ticket + print + QR) | Критический | ✅ `ca8332f4` + order≠ticket follow-up |
| UX.BUY-10b | «Код заказа» once + «Номер билета» (пока = publicCode + caption); QR = ссылка на страницу; qa LOCKED draft order≠ticket | Критический | ✅ `9cd66ed2` MSK **BUILD_ID=`vH1YOLuir-6HoFg7VQAgQ`** Deploy **31190783370** |
| UX.BUY-10c | Ticket card fields: datetime/validUntil, event, venue, address, payer, categories×qty, total, purchasedAt, notices, support phone (soft-fail) | Критический | ✅ `94d932f6` MSK **BUILD_ID=`fbv4D-L-6qEj1yHNUgMhj`** Deploy **31193227838** |
| UX.BUY-10d | Demo preview `/checkout/ticket/demo` - full fixture card (no finance) for visual QA | Высокий | ✅ `938c0b9c` MSK **BUILD_ID=`AxY25gz4cpfuKxB9sf-yd`** Deploy **31194500195** |
| UX.BUY-10e | Ticket card redesign по owner HTML mockup: QR focus/mobile-top, date top, details+warning, print/copy | Критический | ✅ `85c8dfd4` MSK **BUILD_ID=`ct1lgVvvXSEKIIe1GmofQ`** demo 200 |
| UX.BUY-10f | Ticket adaptive 500px (QR top phone / 2-col tablet+) + print hide actions | Критический | ✅ `88fba3bf`/`f060277d` MSK **BUILD_ID=`W4QpN2EaaFUk32IZsAwFi`** demo 200 |
| UX.BUY-10g | Ticket PAGE: equal-weight OSM map + venue pin (desktop right / mobile below / print hide) | Высокий | ✅ `9088eb80` MSK **BUILD_ID=`kmmoWrUnfs9ap8QBd4z75`** demo 200 |
| UX.BUY-10h | Ticket map scroll parity: drop sticky, pageScrollFriendly Leaflet (no wheel steal) | Высокий | ✅ `c1d40e2f` MSK tip `60a783b4` **BUILD_ID=`lr_2kHu4E71Ae91U5LXfw`** |
| UX.BUY-11 | Best-effort buyer email (SMTP_* on web; else save-code copy) | Высокий | ✅ (MSK SMTP unset → `smtp_not_configured` + UI copy) |
| UX.BUY-12 | YooKassa return → catalog result/ticket (`?order=`); localStorage recovery | Высокий | ✅ catalog; finance must set return_url |
| UX.BUY-13 | Account purchases: compact list + in-place download (`?print=1` / Save as PDF) + secondary open ticket | Высокий | ✅ `60a783b4` MSK **BUILD_ID=`lr_2kHu4E71Ae91U5LXfw`** |
| UX.BUY-14 | Seed purchases for `v.butin@yandex.ru` (3 museum STUB internal + SiteUser ensure) | Высокий | ✅ `90ac5cc7` MSK **BUILD_ID=`FSLIUs463XJKQZkOL_njJ`** Deploy **31247448301** |

---

---

## Event hero venue badge link (2026-08-06)

| ID | Задача | Приоритет | Статус |
|---|---|---|---|
| UX.EVENT-VENUE-BADGE-LINK | Hero badge pin+название площадки → Link на `/venues`/`/locations` (как адрес при наличии slug) | Высокий | ✅ `9a9722a` MSK **BUILD_ID=`KqGMFbvqJXi3JrYxNtIje`** |

## Moskva-99 pier title (2026-08-06)

| ID | Задача | Приоритет | Статус |
|---|---|---|---|
| VEN.MOSKVA99-PIER | TC pier `teplohod-moskva-99`: title был именем судна → Воскресенская наб., 10 (СПБ); city не Москва из корпуса; vessel→pier display + ensure | Высокий | ✅ |

## Tretyakov venue title (2026-08-06)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| VEN.TRETYAKOV-TITLE | TC venue `moskva-lavrushinskii-pereulok-10-…`: title был адресом → «Третьяковская галерея»; address «Лаврушинский переулок, 10»; override + MSK DB | Высокий | ✅ |

## Ops: deploy cadence (2026-08-05)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| OPS.DEPLOY-CADENCE | Канон: commit+push после итерации; MSK web deploy пачкой раз в сутки / по запросу owner; hotfix-исключения | Высокий | ✅ `.cursorrules` + Project.md 2026-08-05 |

## Landing titles + holiday windows (2026-08-06)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| SEO.LAND-TITLE-HUMAN | H1/title: `в {City_Пр}` без em dash/дубля; хвост `сегодня, date: афиша…`; single colon | Критический | ✅ `a87135f` MSK **BUILD_ID=`KWAMgGe2IltGyCb_4gusR`** |
| SEO.LAND-EVENT-WINDOW | Holiday landings: session+UI date filter в календарном окне (salute/NY/city-day/valentine) | Критический | ✅ `a87135f` MSK **BUILD_ID=`KWAMgGe2IltGyCb_4gusR`** |

## Multi-landing mobile city switch (2026-08-06)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.LAND-CITY-MOBILE | Multi-city landings: city chips on mobile (hero + filters); was hidden via `!landingCity` | Высокий | ✅ `523f374`; MSK BUILD_ID=`wEmnlocTyWo2TN1TtTixI`; smoke cityNav=2 on `/ekskursii/moscow` + vystavki + peshie |
| FIX.LAND-ALL-CITIES | Multi-landing «Все города»: не redirect на stored city; national URL держится | Критический | ✅ `fec351b`; MSK BUILD_ID=`gR6L-p00T5e5YGU3tMO8j` |

## Venues catalog hang on city filter (2026-08-06)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| FIX.VENUES-CITY-PENDING | `/venues` Пермь: infinite «Обновляем список…» (Cyrillic `?city=` + abort/isPending) | Критический | ✅ `2c23d1d`+`84076fd`; MSK BUILD_ID=`e-XzQltin9RuCjX0zo1VU`; smoke Найдено:23 |

## Perm unusual museums blog pack (2026-08-09)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CONT.PERM-NEOBYCH-5 | Статья `perm-neobychnye-muzei`: seed/mustSee все 5 музеев + blog `/venues` links + heroes | Высокий | ✅ `64b4ddfa`; MSK seed +4 PUBLISHED; smoke `/venues`×5 + images 200; hub/covers map - next web deploy |

## Perm must-see pack + my-day (2026-08-06)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CONT.PERM-MUSTSEE | Пермь: полный mustSee (35) + 4 suburbs/20 nested coords, dedupe legacy 6 slugs, 19 previews, seed pack, my-day address/coords | Высокий | ✅ `fe810e0`+`3a637c6`; MSK BUILD_ID=`lYsWHccwLK_ab0KcRNm_i`; seed +37; smoke `/cities/perm`+`/my-day` 200 |
| CONT.PERM-PREVIEWS | Пермь: добить превью 24 недостающих slug (gastro/museums/arch/suburb parents) → 43/43 | Высокий | ✅ `2ee5bf1`; MSK BUILD_ID=`wN-IZ38TNvl4wjTyGylky`; static 200 ×43 |

## City hub must-see sparse grid (2026-08-06)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.MUSTSEE-SPARSE | City hub «Главные места»: при <4 местах md+ горизонтальный грид вместо узкой 2-row колонки | Высокий | ✅ `2519d5f`; MSK BUILD_ID=`cr_HR-Mm4jbjC788zYriW`; smoke `/cities/perm` 200 + `sparse-grid` |
| UX.MUSTSEE-SPARSE-CAP | Sparse must-see: не растягивать 1–3 карточки на всю ширину; max-w = carousel `22rem`, left-align | Высокий | ✅ `d94a407`; MSK BUILD_ID=`KIUzWWqOhq_t5Woo8FLpd`; smoke `/cities/perm` 200 + `sparse-grid` + `min(22rem` |

## `/cities` map all pins (2026-08-06)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| FIX.CITIES-MAP-ALL | OSM `/cities`: все live cities (не hardcoded top-11); coords lib + pins=destinations | Высокий | ✅ `b17c53a`; MSK BUILD_ID=`XqE2Bn0VE2kfPHTvm6z82`; live `data-cities-map-pins=65` |

## `/cities` map event counts (2026-08-06)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| FIX.CITIES-MAP-COUNTS | OSM пины `/cities`: реальные `events` вместо «Скоро события» (slug alias SEO↔API) | Высокий | ✅ `3df066c`; MSK BUILD_ID=`cr_HR-Mm4jbjC788zYriW`; lookup moscow/spb/kazan >0 |

## `/cities` desktop redesign (2026-08-06)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.CITIES-DESKTOP | `/cities`: 8 top daytime + full-width map + remaining list; CTA row desktop; без «Все города (n)» | Высокий | ✅ `54a9ffd`; MSK BUILD_ID=`AF2liBH4Eu1LzXz8b0Yu2`; smoke 200 |
| UX.CITIES-OCTET2 | `/cities` ranks 9-16: same dark/white chrome as top-8 + daytime JPG; MSK sync-public-assets | Высокий | ✅ `2db4ee62` Deploy `31276301334` BUILD_ID=`aXcB-Mia_CNSVUQEECgh6` |
| UX.CITIES-DAY-NIGHTFIX | Replace remaining night city covers (12 red-V + suzdal/sortavala + sync dark PNGs) | Высокий | ✅ 
780ac4c Deploy 31286030403 |
| UX.CITIES-HUB-NIGHT | Scope fix: catalog/home daytime; hub hero night from `cities/night/` (56 restored) | Высокий | ✅ `21e8d092` Deploy `31299826751` tip `85144f97`; smoke hub night + catalog day |

## Suburb nested coords → day-route (2026-08-06)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| FIX.SUBURB-COORDS | Nested POI пригородов СПб+KGD: lat/lng в cityInfo + проброс в «В маршрут» / DayRoutePanel | Критический | ✅ `39458e4`; MSK BUILD_ID=`5ueueXbge5GLt1fGTox0I`; 78/78 coords smoke |

## Locations kind chips (2026-08-06)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| FIX.LOC-KIND-CHIPS | `/locations`: вернуть kind-чипы из `stats.types` (park/monument/attraction/…); logistics secondary | Критический | ✅ code; deploy пачкой / по запросу |

## SPB must-see ↔ catalog links (2026-08-05)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| HUB.SPB-NEST-SLUG | Хаб СПб: убрать nested с must-see + title/«В маршрут» → `/locations`\|`/venues` только при реальном PDP | Критический | ✅ nested `1c6c2b5`; seed+wire **184/184**; MSK insert 130; deploy `596b16a` BUILD_ID=`m88BYqEA8iK42Fq3pNrmq` |
| HUB.SPB-SEED-LINK | Seed 129 missing SPB mustSee → Venue + cityInfo slug; fix themeTags parser + soft-sign slugify | Критический | ✅ `596b16a`; MSK inserted 130; coords backfill + city DTO cap follow-up |

## Catalog lazy / venues+locations perf (2026-08-05)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| PERF.VENUE-CAT-LAZY | `/venues`+`/locations`: page=36 + cursor IO + server filters + lean DTO + lazy map pins + cache key; снять take(500) cap на hub/total | Высокий | ✅ code; deploy пачкой / по запросу |

## Home personal guide (2026-08-05)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.HOME-GUIDE | Главная: desktop bento-hero + my-day + categories; mobile stories + bottom nav; секции cities/events/lucky/podborki/blog/trust | Высокий | ✅ 8d844ae; deploy пачкой / по запросу |
| UX.HOME-GUIDE2 | Mobile stories «Реки и каналы!» / «Бесплатно»; hero = snap + **auto 2с** real afisha events (до 5, city-aware); My Day «Спланируй свой день в {prep}» + одна CTA «Спланировать день» | Высокий | ⚠️ superseded UX.HOME-SEARCH: owner вернул classic search-hero |
| UX.HOME-SEARCH | Главная шапка: classic `HomeHero` search (город/дата/категория) + photo rotator; не afisha `HomeGuideHero` | Критический | ✅ `3f1a1f9` MSK **BUILD_ID=`1x2J9HMR87fUIVEMHeTdt`** |
| UX.HOME-DESK | Desktop anti-stretch: bento 2/3+1/3, cities grid, podborki bento, blog side flex-row, bg-neutral-50; mobile as-is | Высокий | ✅ код; deploy пачкой / по запросу |

## Runtime URL integrity (2026-08-05)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| FIX.GASTRO-COVERS-MYDAY | Covers для всех PUBLISHED GASTRO + editorial images в My Day (resolveVenueHeroImage) | Высокий | ✅ AI 15 + sharp 26 + reuse 10; map + DayRoute wiring; deploy batch |
| CONT.LOC-PREVIEWS-MASS | Превью основной массы `/locations` (monument/outdoor/park/attraction) без unique cover | Критический | ✅ 171/171 GenerateImage + LOCATION_PACK_IMAGES; deploy batch |
| CONT.LOC-PREVIEWS-TAIL | Хвост `/locations`: 217 outdoor/attraction/monument без editorial (после mass-171; live всё ещё градиенты) | Критический | ✅ `fac18e4c`; Deploy MSK **31309867002**; LOCATION_PACK 171→388 |
| CONT.GASTRO-PREVIEWS-AI | Gastro stub sharp (~27) → уникальные GenerateImage (family=location) | Высокий | ✅ 27/27 overwrite GASTRO_PACK paths; deploy batch |
| FIX.LOC-EDITORIAL-IMG | `/locations` city refetch без `toVenueCatalogCard` → editorial covers не на карточках; soft-nav PDP тоже | Высокий | ✅ overlay на client fetch; map scope = NN + SPB top-12 (не mass Top-100) |
| MS.KGD-CITY-CATALOG | KGD city mustSee (не только owner 11): seed 24 catalog places + cityInfo slugs; биржа hub-only | Критический | ✅ `22f6f4f`+`7b18498`; MSK insert 22/update 2 + repair sobor/ostrov/monuments; live location ~23→25+, institution ~24 |
| MS.KGD-GASTRO-LOC | Owner override: 5 KGD gastro → `/locations` (ATTRACTION, не CLUB_BAR) + locationSlug wiring | Высокий | ✅ `d4e99de`; MSK insert 5; location 25→30; 5/5 PDP `/locations/*` 200; deploy HEAD `2f2e24de` |
| FIX.OUTDOOR-VS-ATTRACTION | Здания не outdoor: SPB/KGD OUTDOOR→ATTRACTION (+monument/park); heuristics + MSK apply | Высокий | ✅ 41 rows MSK; `venue-kind-heuristics` + reclassify script; API restart; web deploy n/a |
| FIX.OUTDOOR-GASTRO-KINDS | OUTDOOR→точные kinds (all cities); location cafe→`GASTRO`; шапка «Фильтр по городу» | Высокий | ✅ outdoor 116 MSK; gastro 12; commits `a2601ba`…`c3b0ff8`; API restart; web label batch |
| FIX.CITY-ALIAS | Legacy `/cities/sankt-peterburg` → permanent redirect на canonical `/cities/saint-petersburg`, чтобы не вызывать city DTO с неканоническим slug | Критический | ✅ `c5f1869`, MSK BUILD_ID=`IQlhDY1eF5GvuOGLXURHb`; direct и public smoke: 308 → canonical, 200 |
| FIX.EDITORIAL-VENUES | Убрать SPB thin twins, направить zero-event editorial в `/locations`, скрыть ticket chrome без saleable offer и усилить seed dedupe | Критический | ✅ `2897a74`, MSK BUILD_ID=`pB-uPQAXNmSrmo1y5dDNh`; El Copitas 200 без buy CTA, «Синий Пушкин» twin скрыт |

---

## Blog content integrity (2026-08-05)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.BLOG-DECOUPLE-CITY | `/blog`: отвязать ленту от header CityPicker; фильтр материалов сразу после hero; при активном фильтре результаты над «материалом недели» | Высокий | ✅ `c8f43ae`+follow-up; superseded live MSK BUILD_ID=`Jsmb7n_Z-x0_R9CMBr80P` HEAD=`9c188c9`; smoke /blog 200 |
| UX.BLOG-LISTING-VITALITY | `/blog`: featured overlay, magazine mix (banner/strip/lead/quote), serif titles, vivid chips, micro-interactions | Высокий | ✅ `6b3f675`+`c8f43ae`; superseded live MSK BUILD_ID=`Jsmb7n_Z-x0_R9CMBr80P` HEAD=`9c188c9`; smoke /blog 200 |
| UX.BLOG-CARD-POLISH | `/blog` cards: no mid-sentence clamp; serif titles everywhere; CTA left-wrap; contextual CTA labels | Высокий | ✅ `feb7a61`+`a6c06b7`; MSK BUILD_ID=`Jsmb7n_Z-x0_R9CMBr80P` HEAD=`9c188c9`; smoke /blog 200 contextual CTA |
| UX.BLOG-MOBILE-OWNER | `/blog` mobile: hide topic chips + view toggle; +30-40% touch targets / cards; excerpt «провести» (`spb-s-rebenkom-v-dozhd`) | Высокий | ✅ `2fde4d1` push; deploy n/a |
| BLOG.SPB-RAIN-TITLE | `spb-s-rebenkom-v-dozhd`: owner «собрать»→«провести» (фраза в excerpt; title/seoH1 без слова) + MSK upsert + API cache bust | Высокий | ✅ upsert PUBLISHED; live excerpt «провести»; web deploy n/a |
| BLOG.TOP100-PLACE-IMGS | Top-100 / Beyond: скрыть с сайта (DRAFT); place JPG в venues для locations/my-day | Высокий | ✅ `5b288fa`/`61f676e`, MSK BUILD_ID=`kkfM8hMpE0f52IqGemiqu`; ×12 DRAFT, 404 UI |
| BLOG.HIDE-AUG5-EXCEPT-BARS | Скрыть все статьи от 2026-08-05 кроме «Барный Петербург»; постепенная публикация | Критический | ✅ `be2f075` + MSK upsert DRAFT ×5; public only `spb-barnyy-peterburg-ryumochnye-spikizi`; soft-404 / article:null; web deploy n/a |
| BLOG.FUTURE-TO-DRAFT | PUBLISHED+future `publishedAt` → DRAFT (×8 regional; KGD live ×3 остаются PUBLISHED) | Высокий | ✅ `2ebe56cc` + MSK upsert ×8 DRAFT/`isIndexable=false`; web deploy n/a |
| BLOG.HERO-SERIES-BR | Hero H1: перенос после точки перед «Часть N» для Top-100 / Beyond-Top-100 | Высокий | ✅ `07c4fc7`, MSK BUILD_ID=`tU2lr7PmZB4kN1JCHGX_V` |
| BLOG.RESTORE-SPB-BARS | Вернуть owner-текст статьи «Барный Петербург» без SEO-переписывания, проверить реальные адреса, venue links, изображения и production Article | Критический | 🔄 локальный текст восстановлен, ожидаются sync, upsert и MSK deploy |

---

## Conversion surfaces phase (2026-08-04) - STEP 0…3

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| FIX.SALUTE0 | `salute-9-may`: exclude День города + require 9 мая / День Победы | Критический | ✅ `83271ec` live BUILD **`BCWcAIglYC8cAP-6Zgr4k`**; sessions=0, city-day leak gone |
| FIX.CITYDAY-TOP | Москва: City Day выше мастер-классов в hub/podborki/promo; museums title без «мастер-классы» | Высокий | ✅ code; deploy пачкой / по запросу |
| FIX.CITYDAY-PRICE | Landing rows: min as fixed price → `formatMoneyRange` (мин-макс / `от`) | Высокий | ✅ `be2f075`/`c8f43ae`; MSK BUILD_ID=`LV0jzT3jaueTAOmX202ic`; landing range+ot smoke OK |
| UX.POD1 | `/podborki`: category jump chips + SEO «Развернуть» + lazy cards + count/priceFrom | Высокий | ✅ `7535f02` live **`BCWcAIglYC8cAP-6Zgr4k`** |
| UX.POD-BENTO | `/podborki`: Bento grid + mood filters + rich cards (photo/gradient) + badges + popular rail | Высокий | ✅ code commit; deploy пачкой / по запросу |
| UX.POD2 | `/podborki` masonry / view counters / purchase carousel / infinite scroll | Средний | ⚠️ deferred (bento закрывает часть masonry) |
| UX.LAND2 | Tabular landings: clearer rows, timeslot chips, sticky filters, `?type=` | Высокий | ✅ `eae17f4` live **`BCWcAIglYC8cAP-6Zgr4k`** |
| UX.LAND2b | Invent new differentiator DTO badge fields | Низкий | ⚠️ deferred (reuse deriveLandingCardBadges / bridges heuristics) |
| UX.BLOG3 | Blog hub chips river/tours + article reading progress | Высокий | ✅ `eae17f4` live **`BCWcAIglYC8cAP-6Zgr4k`** |
| UX.BLOG3b | Sticky buy CTA + CMS product-card constructor + seed `[buy]` in articles | Средний | ⚠️ deferred (renderer exists; content 0 `[buy]`) |
| FIX.BLOG-EMPTY | False «нет статей про {city}» banner while city filter has matches | Критический | ✅ `d393520` live BUILD **`8bCshKtFiFhBS9SzTqnaE`** |
| FIX.BLOG-RELATED-ALIGN | «Читайте также»: top-align city label with thumb (`items-start`) | Высокий | ✅ `65817a4` live BUILD **`a6m32PsB5Fd_uG4bluOp8`** |

---

## Next phase: cities / venues / locations (from UX briefs)

Не делать full redesign в этой фазе. Канон: [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md), [catalog-location-venue-canon.md](./catalog-location-venue-canon.md), [mobile-templates.md](./mobile-templates.md).

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| PH2.CITY1 | `/cities` hub: compact grid, vibe tags, CountUp, LuckyCity, OSM pins (не SVG) | Средний | ✅ `ce3d376` MSK **BUILD_ID=`1x2J9HMR87fUIVEMHeTdt`** |
| PH2.CITY2 | Capitals hub ~**200**: SPB ~184 near; MSK **58→~200** (MS.MSK-GROW200); CANDIDATE≠hub | Высокий | 🔄 SPB near; MSK grow open |
| PH2.CITY3 | Other / top-8 → ~**50** curated start (не 12-18, не capitals-wide) | Высокий | ⏳ |
| PH2.VEN1 | Venue PDP monetization: clearer ticket path, related events density | Средний | ⚠️ next phase (UX.VENUE-MON) |
| PH2.LOC1 | `/locations` IA: decision V1 keep primary nav (UX.LOC8); label «Места и точки сбора» = UX.LOC3 | Высокий | ✅ decided 2026-08-07 owner A+V1; rename ⏳ LOC3; `/places` deferred |
| PH2.LOC2 | Mobile city chrome: CityPicker visible outside burger (brief quick win) | Критический | ✅ = UX.LOC1 pin+dropdown `cc05efa`; public parity 2026-08-07 |
| PH2.LOC3 | `/locations` hero: drop map-first on mobile; dense city-first | Высокий | ⏳ (partial LOC4 done) |
| PH2.PLC1 | Unified `/places` venues+locations tabs (UX.LOC9) | Низкий | ⚠️ deferred (owner 2026-08-07) |

---

## Catalog + event detail UX (2026-08-04)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.EVT-PDP1 | Sticky mobile CTA «Выбрать билеты» + от X | Критический | ✅ `20b0662` MSK **BUILD_ID=`v0uP2iuxwDW4oNxWa0B2g`** |
| UX.EVT-PDP2 | Hero badge chips + rating + when/where/price | Критический | ✅ |
| UX.EVT-PDP3 | Day strip → timeslots in BuyCard | Высокий | ✅ |
| UX.EVT-PDP4 | Accordion О событии / Маршрут / Как добраться + map expand | Высокий | ✅ |
| UX.EVT-B1 | Open-date how-to stepper under title | Высокий | ✅ |
| UX.EVT-B2 | Price primary «от X ₽» + oldPrice strikethrough | Высокий | ✅ |
| UX.CAT-A1 | Category chips horizontal, no tall counts; date select no «Люб» trunc | Средний | ✅ shipped earlier; further catalog polish = backlog |
| UX.CAT-A2 | Hide page-size; «Показать ещё» | Средний | ✅ shipped earlier; infinite scroll = backlog |
| UX.CAT-A3 | Empty state Popular recommend block | Средний | ⚠️ backlog |
| UX.EVT-B3 | Full tabs Программа if structured data | Низкий | ⚠️ backlog |
| UX.CITY-HUB | `/cities`: compact 2-4 col cards, vibe tags, CountUp, «Куда поехать?», OSM pins (не SVG) | Средний | ✅ `ce3d376` MSK **BUILD_ID=`1x2J9HMR87fUIVEMHeTdt`** |
| UX.VENUE-MON | Venue/location monetization UX | Средний | ⚠️ backlog |
| UX.EVT-SEAT | Venue seatmap / taxi deep-link | Низкий | ⚠️ backlog |

---

## Mobile homepage UX cleanup (2026-08-04)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.HOME-MOB1 | Hero overlay + light category chips | Высокий | ✅ `2aaea86`+`405ac6d` MSK **BUILD_ID=`fjFoVm-Yur__0z8lPkrlv`** |
| UX.HOME-MOB2 | Format tiles → light icon rail; cities → ScrollRail (mobile) | Высокий | ✅ |
| UX.HOME-MOB3 | EventCard mobile denoise (icons/price/CTA); keep buy CTA | Высокий | ✅ |
| UX.HOME-MOB4 | Trust/how ExpandableBlurb + section spacing | Средний | ✅ |
| UX.HOME-MOB5 | Discount badge on card image | Низкий | ⚠️ deferred (нет oldPrice в session catalog DTO) |

---

## Must-see hub targets LOCKED (2026-08-07)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| MS.TIER1 | Канон тиров **LOCKED**: floor 6 / typical 6-8 / **other+top-8 start ~50** / **capitals MSK+SPB ~200** / NN deep pack reference; hub ≠ day (SOFT 10 / MAX 15); **CANDIDATE sync ≠ hub count** | Высокий | ✅ docs lock 2026-08-07 |
| MS.TIER2 | Capitals target **~200** (не 12-18, не 30-50+); other cities **~50** start (не capitals-wide) | Высокий | ✅ docs lock 2026-08-07 |
| PH2.CITY2 | Capitals must-see hub pack: SPB ~184 near ~200; MSK **58 → ~200** (gap ~142 curated, не sync dump) | Высокий | 🔄 SPB near; MSK grow open |
| PH2.CITY3 | Other / top-8 hubs → **~50** curated mustSee на старте (снять ориентир 12-18); не клонировать 200 | Высокий | ⏳ после MSK grow / owner batch |
| MS.MSK-GROW200 | Москва: curated mustSee/places layer с 58 до ~200 (quality slug/coords/hook/filters) | Высокий | 🔄 **144** mustSee + 10 presets + deep suburbs (2026-08-09); gap ~56; seed/images follow-up |

## Must-see count tiers + MSK/SPB (2026-08-04 → corr. 2026-08-07)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| MS.TIER1 | *(superseded by LOCKED block above)* было: 12-18 / capitals 30-50+ | Высокий | ✅ → MS.TIER1 lock |
| MS.TIER2 | *(superseded)* capitals wide plan | Высокий | ✅ → MS.TIER2 lock |
| MS.SUB1 | `significantSuburbs` + блок «Значимые пригороды {City_Род}» на hub; СПб: Петергоф/Царское/Кронштадт | Высокий | ✅ `16d10ca` MSK **BUILD_ID=`pA38C3r_vUStAEuHiAZuO`** |
| MS.SUB3 | Hub suburbs: snap carousel (1 card/screen) + чистый бейдж «Пригород», nested POI capitalize + «В маршрут»; h2/ol/no Day-trip (`9c188c9`); bulk CTA у вектора | Высокий | ✅ `d6ca3ec`+`9c188c9`+bulk; MSK BUILD_ID=`Jsmb7n_Z-x0_R9CMBr80P`; smoke SPB hub 200 |
| MS.SUB4 | Hub suburbs hierarchy: title=`name`, subtitle=`travelVector - stationHub`; mobile «Ещё» для essay/gastro/POI-desc (desktop full) | Высокий | ✅ `915083b` MSK **BUILD_ID=`jvN4iczAP8rqDdevfj0AW`**; smoke SPB hub 200 |
| MS.GUIDE1 | Канон hub → тематические blog-гиды → CTA билетов (закрытие гэпа при узком каталоге) | Высокий | ✅ docs |
| MS.TIER3 | Phase B: Санкт-Петербург - широкий `cityInfo` с тематическими chip, гастро-слоем и пригородами | Высокий | ✅ runtime ~184 (near ~200 lock); gastro/suburbs/presets shipped |
| MS.SPB-KGD-SEED | Owner-verified SPB + KGD must-see, gastro и suburb POI: idempotent catalog dual-write, verified address/coords, slug wiring | Критический | ✅ MSK seed: 67 inserted, 20 updated, no missing city; 67 cityInfo links; deploy 2026-08-05 BUILD_ID=`htTqoT7UE2NcJBJevr_3v` |
| LOC.SPB-MUSTSEE | SPB editorial locations missing from `/locations` despite DB seed (content take 400 A→Z + warm short-circuit) | Критический | ✅ `a8b106e`+follow-ups MSK; catalog shows Петропавловская/Дворцовая/Спас; BUILD_ID=`8Fo0L9-oGyooggq9uzfYC` |
| MS.TIER4 | Phase C: Москва baseline hub ship (не финальный ~200) | Средний | ✅ baseline **58**; coords/images/presets/companions; grow → MS.MSK-GROW200 |
| MS.TIER5 | Phase 2 optional: `dayRoutePresets` / multi-day для MSK/SPB после стабильного широкого каталога | Низкий | ✅ СПб 6; Москва **10** presets msk-1…10 (`msk-1` blog CTA) |
| MS.TIER7 | Сценарии hub: не показывать preset без минимум 3 разрешимых точек и «Собрать день»; склонять «N точка/точки/точек» через общий formatter | Критический | ✅ 2026-08-05 |
| MS.TIER6 | Гастро-пакет отдельно от landmarks (если нужно) - не смешивать в «Главные» | Низкий | ✅ СПб: 20 точек во вкладке «Гастрономические точки» |
| MS.SPB-BRIDGES | Хаб СПб: справочный блок о разводе мостов с сезонным ориентиром, ссылкой на night-bridges и «Мой день» | Средний | ✅ `3c87de0`, MSK BUILD_ID=`IH8INbeVzpCW8pHY46i6b`; smoke 200 |
| MS.SUB2 | Seed entities: Стрелка ВО, Царское Село, Кронштадт (+ enrich) | Средний | ⏳ |

---

## /events/[slug] runtime ISR (2026-08-04)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| PERF.E3 | ISR `revalidate=7200` + `unstable_cache` TTL + React `cache` | Критический | ✅ `7835886` MSK **BUILD_ID=`wxgo6Jh1AliLT36-1eoqe`** `s-maxage=7200` HIT |
| PERF.E4 | Per-slug tags `event-page:{slug}` + `POST /api/internal/revalidate` `slug` | Критический | ✅ smoke OK |
| PERF.E5 | Backend/admin on-demand revalidate on event override (не ждать 2ч) | Критический | ✅ |
| PERF.E6 | Destinations layout cache 86400 (не капить page ISR на 300) | Критический | ✅ `7835886` |
| PERF.E7 | Backend city update → Next tags `destinations` + `public-surfaces` | Критический | ✅ `12b734c` MSK **BUILD_ID=`dtrpt-eetyBWyJA8DG1ye`** |

## MSK web:build SSG harden (2026-08-04)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| OPS.SSG1 | Soft TimeoutError on `/events/[slug]` SSG + metadata | Критический | ✅ `8423289` MSK **BUILD_ID=`6ky5NRSMiRIBzAUTqpmMv`** |
| OPS.SSG2 | `fetchPublicApiJson` build-phase retries (3×) | Критический | ✅ `8423289` |
| OPS.SSG3 | `EVENT_SSG_TOP_N` default 40; `0`=skip; deploy export | Критический | ✅ `8423289` |
| OPS.SSG4 | deploy: `.next.prev` save + restore on build fail | Критический | ✅ `8423289` |

## CI Deploy MSK web SSG (2026-08-07)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| OPS.CI1 | SSH tunnel CI→MSK API :4000 for SSG (no public Postgres) | Критический | ✅ |
| OPS.CI2 | `EVENT_SSG_TOP_N=0` on CI (skip Prisma event prebuild) | Критический | ✅ |
| OPS.CI3 | Soft-fail home/podborki/landings/`withSoftTimeout` on API down | Критический | ✅ |
| OPS.CI4 | GitHub secrets `MSK_SSH_HOST`/`USER`/`KEY` (+ опц. widget tokens) для Deploy MSK web | Критический | ✅ owner 2026-08-09: secrets в repo настроены; «выкатывай» = Actions → Run workflow |

## City hub hookFact + IA (2026-08-03)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CH.HF1 | Owner description+hookFact → cityInfo (65 городов, web+public) | Критический | ✅ |
| CH.HF2 | Phase 1 UI: hookFact после hero + Главные места до афиши + блог в подвал | Критический | ✅ |
| CH.HF3 | Phase 2: story cards, Сегодня/Завтра/Выходные, mood quiz, default FAQ | Высокий | ✅ |
| CH.HF4 | SPB build → MSK atomic `.next` swap + smoke moscow/nn/abakan | Критический | ✅ MSK-only `deploy-prod-next.sh` `0ad064bc` **BUILD_ID=`5PaOsq5u2eoVkCSuYdVzh`**; smoke moscow/nn/abakan 200 + hookFact |
| CH.HF5 | Партнерский виджет логистики (Ласточки/авиа) | Низкий | ⏳ |
| CH.HF6 | Owner follow-up: brief обратно в hero; UI «Истории города» скрыть | Критический | ✅ `31b5a8b0` MSK **BUILD_ID=`DDNYHaaqzcrNwwq6UfUrd`**; smoke moscow: hero brief + нет «Истории города» |

## Header city navigation (2026-08-04)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.CITY-NAV | Header setCity: stay in section (cities hub / catalogs / blog / landings); no catalog dump; keep my-day confirm | Критический | ✅ `ebc52ca` MSK **BUILD_ID=`PmbO697VdpNToUi9yEI5G`** (live tip `4ea04c46`) |

## Catalog EventCard day-route chip (2026-08-04)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.ECARD-DAY-OVERLAY | EventCard grid: «В мой день»/«Добавлено» на cover bottom-right overlay; footer = price+Купить | Высокий | ✅ `49be710` MSK **BUILD_ID=`J2r1pJc-sK2W_wGzB2KzY`** `/events` 200 |

| UX.MYDAY-MOSQUE-MATCH | SPB соборная мечеть: ложный match → МТС Live Hall (Ded Moroz + concert copy / Anna-Elza PDP); truncate title | Критический | ✅ code `2cdebd4`; MSK DB promote+revalidate (`fix-spb-sobornaya-mechet-venue`); web deploy matcher still pending «выкатывай» |
| UX.MYDAY-STOP-CHIPS | Stop cards: offer chips горизонтально (flex-wrap) + всегда title·price (не столбик ml-auto / не голый «Купить билет») | Критический | ✅ `3d2686b` push; deploy n/a |
| UX.MYDAY-STOP-OFFERS-BELOW | Stop cards: offer chips ниже main row (не поверх ~time/km); layout как «Руки Вверх» | Критический | ✅ push; deploy n/a (owner не просил выкатывай) |
| UX.MYDAY-STOP-OFFERS-LG-ROW | Desktop lg+: offers справа в одном ряду с place/travel; mobile stacked ниже | Критический | ✅ `a201ea9`; MSK **BUILD_ID=`4cziKHuRaIqdm9UB0NYYW`** `/my-day` 200 |
| UX.MYDAY-STOP-OFFERS-TIGHT | Grid: offers ниже (не lg-row в 3-col); list: offers сразу после place/actions без flex-1 gap | Критический | ✅ `51f2141`; MSK **BUILD_ID=`UB4mAZHXczwOOfwND5chE`** `/my-day` 200 |
| UX.MYDAY-STOP-OFFERS-VENUE | Venue-bound: афиша площадки+от N; без «Билет оформляется»; лейбл nearby; grid equal shell; handoff off | Критический | ✅ `ebac995`; MSK **BUILD_ID=`lToO4hCB_xvFKPGzX8dKL`** `/my-day` 200 |
| UX.MYDAY-MUSTSEE-ALWAYS | Must-see: убрать Свернуть/Развернуть; всегда full grid; accordion open by default | Высокий | ✅ `998bd69` MSK **BUILD_ID=`4cziKHuRaIqdm9UB0NYYW`** `/my-day` 200 |

## /my-day starter → header search (2026-08-04)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.MYDAY-MOB-ANNOT | Mobile annotated: subtitle one-line + dot; search «Добавить…»; city via quiet link+confirm; drop must-see helper; map focus actions column | Высокий | ✅ `3ea8922` MSK **BUILD_ID=`PmbO697VdpNToUi9yEI5G`** `/my-day` 200 |
| UX.MYDAY-CITY-RESET | Смена города на /my-day: confirm сброс маршрута если >=1 stop (header+on-page) | Высокий | ✅ `6e5e922` MSK **BUILD_ID=`neGTZ9t_aXfs0StFNoZZo`** `/my-day` 200 |
| UX.MYDAY-MATCHES-TITLE | Matches accordion: «Подходящие экскурсии» → «События поблизости» | Высокий | ✅ `1f08893` MSK **BUILD_ID=`JHo5binbjsG01hIPE_9_0`** `/my-day` 200 |
| UX.MYDAY-MATCHES-ORDER | Matches между «Главные места» и «своё место»; drop «Места экскурсии не в маршруте» | Критический | ✅ `3e9b6fa` MSK **BUILD_ID=`M7xdN7ovP2s4tAjJKQYPY`** `/my-day` 200 |
| UX.MYDAY-MUSTSEE-EXPAND | Must-see: «Развернуть»/«Свернуть» - carousel ↔ full-width grid (superseded by ALWAYS) | Высокий | ✅ `1ba63e4` → superseded |
| UX.MYDAY-MUSTSEE-BLUE | Must-see bulk «Добавить главные места»: `sky-600` primary (как Яндекс CTA) | Высокий | ✅ `441ce9e` MSK **BUILD_ID=`JHo5binbjsG01hIPE_9_0`** `/my-day` 200 |
| UX.MYDAY-EMPTY-SHARE | Empty: restore starter subtitle (no invite dup); hide Share/Save/Clear at 0 stops | Высокий | ✅ `1ba63e4` live `5f5bd84` MSK **BUILD_ID=`M7xdN7ovP2s4tAjJKQYPY`** `/my-day` 200 |
| UX.MYDAY-HEADER-SEARCH | ≥1 stop: hide mid starter card; compact city+search under H1; empty starter unchanged | Высокий | ✅ `c8f918f` MSK **BUILD_ID=`E2goVq9U7X9ujiRnLliZf`** `/my-day` 200 |

## /my-day starter geometry (2026-08-03)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.MYDAY-STARTER-EDGE | Desktop empty starter: full (=header) + equal-M L/mid/R | Высокий | ✅ `8c9d427` MSK **BUILD_ID=`mHjJgyoGso3NrFan4glCI`** `/my-day` 200 |
| UX.MYDAY-CITY-HUB | Readiness line: `• Страница {City_Род}` → city hub | Высокий | ✅ `b21531b` MSK **BUILD_ID=`9Y0CrLqmzM7hckZVe2RRb`** `/my-day` 200 |
| UX.MYDAY-CATALOG-OPEN | «Ещё из каталога»: always open, no card border | Высокий | ✅ `902fb3b` MSK **BUILD_ID=`sgVL2jxb2mwH2VaNjj3fm`** `/my-day` 200 |
| UX.MYDAY-SEARCH-PROG | Progressive catalog load - search not gated on Promise.all | Высокий | ✅ `33e9ca8` MSK **BUILD_ID=`blIpyGTrMYrwYoh4jkBws`** `/my-day` 200 |
| UX.MYDAY-PRESETS | «Готовые сценарии» under Hot Picks (cityInfo presets) | Высокий | ✅ `f280018` MSK **BUILD_ID=`cM9j1lcFbpgHSogY-npKs`** `/my-day` 200 |
| UX.MYDAY-PRESET-GATE | SPB/my-day: skeleton до settle locations+venues - без pop-in 4→6 сценариев | Критический | ✅ `c0d61b6d`; MSK **BUILD_ID=`tBAB7m9Y6YW8i3yukypOC`** |
| UX.MYDAY-BOAT-MODAL | 🚫 superseded: wizard-as-modal (`81d740a6`) был неверным прочтением; owner имел в виду purchase modal | Критический | 🚫 rollback inline wizard |
| UX.MYDAY-BUY-MODAL | «Купить билет» → TC native / CheckoutModal overlay (не new tab; не wizard portal) | Критический | ✅ `b3d841a3`; MSK **BUILD_ID=`9BpSEnRcVf3lhoksHGMJ6`** [GHA](https://github.com/Twisterrrrr/daibilet/actions/runs/31299812672) |
| UX.MYDAY-PRESET-BLOG | Preset cards: «Читать об этом в блоге» via `blogSlug` - blue + underline + arrow; desktop inline after title (flex-wrap) | Высокий | ✅ `06625e0` MSK **BUILD_ID=`2NIdFliuqHg4lCRrEYYxP`** `/my-day` 200 |
| SEO.MYDAY-META | /my-day title+desc+OG package; keep noindex until crawlable content | Высокий | ✅ `31a0dc0` MSK **BUILD_ID=`qZnQ6TqtoJkKtvxVB9mtI`** |
| UX.MYDAY-LIST-MAP | Mobile list-first + Список/Карта toggle (no sticky 38vh); compact footer | Критический | ✅ `4ffb251` MSK **BUILD_ID=`0Fnc1S9ndw3dPSeEmy2Za`** `/my-day` 200 |
| UX.MYDAY-CHROME | Mobile: hub link own line; Сетка/Список only lg+; dense list &lt;lg | Высокий | ✅ `4405d36` MSK **BUILD_ID=`RDvpU8E3GRJn5-OE2fLW1`** `/my-day` 200 |
| UX.MYDAY-FOCUS-Z | Desktop/mobile map focus card above Leaflet (`isolate` + z-1100) | Высокий | ✅ `fcd656f` MSK **BUILD_ID=`h8y5jcytDJ7KNTtJnXzBm`** `/my-day` 200 |

---

## /my-day map split (2026-08-02)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.MYDAY-SPLIT-DESK | Desktop ≥lg: list left + sticky map right (`data-day-split`) | Критический | ⚠️ owner rollback 2026-08-08 - single column, map under list (`data-day-route-map-desktop`); nearby still removed |
| UX.MYDAY-SPLIT-MOB | Mobile &lt;lg: sticky map ~38vh + list scroll; expand ~85vh | Критический | ⚠️ superseded by UX.MYDAY-LIST-MAP (list-first + map mode) |
| UX.MYDAY-NEARBY-STOP | Under-stop «Поблизости» chips (grid+list) | Высокий | ✅ removed 2026-08-08 - keep free window + accordion matches |
| UX.MYDAY-CARD-SIZE | Stop cards: compact dense row + full-width list (= summary bar); no multi-col stretch towels | Критический | ✅ `76bae1c`+`949bd78` MSK **BUILD_ID=`QRQxYfwR-Wy7iklNEOIwY`** |
| UX.MYDAY-LIST-TITLE-GAP | Desktop list stops: wider gap index badge → title (`md:gap-3 lg:gap-4`) | Высокий | ✅ `50bf964` MSK **BUILD_ID=`M7xdN7ovP2s4tAjJKQYPY`** `/my-day` 200 |

---

## City hub must-see blurbs (2026-08-02)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.MS1 | «Главные места»: full blurb via ExpandableBlurb (`line-clamp-6` mobile / none desktop); без mid-word clip | Высокий | ✅ `4ea04c4` → superseded UX.HUB-BLURB |
| UX.MS2 | «Главные места»: max-lg 85/15; **md+ 2-row stack**; без subtitle; WhyGo вин. падеж; hook sm; venues md:2col; без mood quiz | Критический | ✅ `e96e999c` MSK **BUILD_ID=`9Y0CrLqmzM7hckZVe2RRb`** moscow smoke 200 |
| UX.MS2b | Hub must-see mobile: fix 85/15 peek (`w-max` ломал % → `contents`+`flex-[0_0_85%]` + line-clamp) | Критический | ✅ `3a9bae6` MSK **BUILD_ID=`enL85fpbBPEAS0-dH3Aa-`** nn 200 |
| UX.MS2c | Hub must-see mobile: peek ~80% + ExpandableBlurb; presets blog link new line + breathing room | Высокий | ✅ `4ea04c4` → expand removed in UX.HUB-BLURB |
| UX.HUB-BLURB | City hub: capitalize must-see/suburb blurbs + drop mobile ExpandableBlurb; seed lowercase `desc` fix | Высокий | ✅ `8e29027` MSK **BUILD_ID=`5rOJ9dbBh58TQKyE5YGPr`** kaliningrad/nn 200 |
| UX.HUB-BLURB2 | SPB hub: preferEditorial over Venue crumbs/truncation; capitalize suburb nested; strip crumb tails | Высокий | ✅ `b293dae` push (no deploy) 2026-08-05 |
| UX.CAT-CRUMB | Catalog LocationCard/InstitutionCard: dayRouteHookLine strip crumb tails (Нева, пл., metro) | Высокий | ✅ `63b1e23` push (no deploy) 2026-08-05 |
| UX.MS3 | «Главные места» md+: page prev/next вместо scrollbar UX; mobile swipe as-is | Высокий | ✅ `5ffbfded` MSK **BUILD_ID=`blIpyGTrMYrwYoh4jkBws`** moscow/nn smoke 200 |

---

## Catalog: Location vs Venue canon (2026-08-02)

Канон: [catalog-location-venue-canon.md](./catalog-location-venue-canon.md).

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CAT.LV0 | Docs: Локация vs Venue, антидубли, upgrade path, Мой день families | Высокий | ✅ docs |
| CAT.LV1 | Audit existing Location+Venue twins / soft-sign / latin-cyrillic (если всплывут) | Средний | ⏳ on demand |
| CAT.LV2 | Admin/import guard: warn before create near-duplicate slug/title/coords | Средний | ⏳ backlog |

---

## INC.504 SSR hardening (2026-08-02)

Canon: [inc-504-ssr-hardening.md](./inc-504-ssr-hardening.md).

| # | Task | Priority | Status |
|---|------|----------|--------|
| INC.504.22 | Move public HTML hot path in `apps/web` off direct `@daibilet/backend/public-read`; SSR/API read through backend HTTP with bounded timeout | Critical | ✅ PR #3 merge `f93b770` MSK **BUILD_ID=`3zmDWHpY7rXAJgqu0-pnR`** |
| INC.504.23 | Move sitemap generation off direct `public-read` or give it a separate bounded backend path | Medium | todo |
| INC.504.24 | Add staging HTTP load smoke for `/`, `/events`, `/cities`, `/venues`, `/api/public/events?limit=50` | High | todo |

---

## Mobile templates canon (2026-08-02)

Канон: [mobile-templates.md](./mobile-templates.md). Owner priority: удобная структура шаблонов мобилки.

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.MOB0 | Audit + канон sticky chrome / hero budget / CTA / sections / chips | Критический | ✅ docs |
| UX.LOC1 | Mobile sticky: city pin + search icon + route/fav | Критический | ✅ `cc05efa` MSK **BUILD_ID=`EroIFEOGTEMJsFn1Zf3tr`** |
| UX.LOC2 | `MobileNavSheet`: «Город» сразу после поиска | Критический | ✅ |
| UX.LOC4 | `/locations`: dense hero; блок «Популярные города» (RussiaMap) убран с локаций | Высокий | ✅ `c698f2c` MSK **BUILD_ID=`SdwQIxr9a9CVj7jfdAKWh`** |
| UX.MOB1 | Shared `MobileStickyActionBar` + location/institution/my-day sticky CTAs | Высокий | ✅ |
| UX.MOB2 | Event mobile hero: не full-viewport (`min(42vh,20rem)`) | Средний | ✅ |
| UX.LOC3 | Rename nav/H1 «Локации» → «Места и точки сбора» (owner target; V1 nav stays) | Высокий | ⏳ |
| UX.LOC5 | `/events` mobile: context line «События в {город}»; banner если city=all | Высокий | ⏳ |
| UX.LOC6 | Bottom-sheet CityPicker: поиск + популярные + «Все города» | Высокий | ⏳ |
| UX.LOC7 | Catalog mobile date UX: один entry (chips/sheet) | Средний | ⏳ |
| UX.LOC8 | IA nav: V1 keep `/locations` in primary (не demote) | Средний | ✅ decided 2026-08-07 owner OK A+V1 |
| UX.LOC9 | Unified `/places` (venues+locations tabs) | Низкий | ⚠️ deferred (owner 2026-08-07) |
| UX.MYDAY-UX0804 | Must-see carousel; ticket groups; hour-plan sheet+soft hints; custom search | Критический | ✅ `e617ac1` MSK **BUILD_ID=`BCWcAIglYC8cAP-6Zgr4k`** `/my-day` 200 |
| UX.MYDAY-MINICARD | Must-see mini-cards (thumb+desc) in H-carousel; restore своё место accordion | Критический | ✅ `5c13bc5` MSK **BUILD_ID=`uoDz6BgaWtWh7P4AC0wF4`** `/my-day` 200 |
| UX.MYDAY-MINICARD2 | Must-see cards wider (24rem) + 2× thumb (96px); keep H-carousel | Критический | ✅ `754fd12` MSK **BUILD_ID=`ZqoDR5hR_voM4u3qKvngF`** `/my-day` 200 |
| UX.MYDAY-PLANCHECK | Stop grid: planDone checkbox beside title (not empty tall pill); square affordance | Критический | ✅ `e5cf78c` затем superseded |
| UX.MYDAY-PLANCHECK2 | planDone checkbox leftmost (superseded - remove control) | Критический | 🚫 superseded by DROP |
| UX.MYDAY-PLANCHECK-DROP | Remove planDone checkbox+strike; map focus hint 260ch / line-clamp-4 | Критический | ✅ `66bcac4` MSK **BUILD_ID=`esVyb5mav-fjNqzDQm4-g`** `/my-day` 200 |
| UX.MYDAY-TOOLBAR | Route chrome: mobile mid = Распланировать primary (no Yandex); Share/Save/Clear column; text walk/auto | Критический | ✅ `c8b83bd` MSK **BUILD_ID=`esVyb5mav-fjNqzDQm4-g`** `/my-day` 200 |
| UX.MYDAY-MOB-POLISH2 | Mobile: top actions full-width row under H1; Пешком/Авто right on km/ETA; desktop chrome intact | Критический | ✅ `9ea1c5e` tip `1f08893` MSK **BUILD_ID=`JHo5binbjsG01hIPE_9_0`** `/my-day` 200 |
| UX.MYDAY-DESK-POLISH | Desktop: actions top-right w/ Share; walk/auto by meta; Yandex only on map; Optimize ghost mid-list | Критический | ✅ `c32443f` tip `94cbe86` MSK **BUILD_ID=`iQt0EenjDINCgdzm4GPuR`** `/my-day` 200 |
| UX.MYDAY-DESK-POLISH2 | City picker wider (NN full); hour-plan + Optimize on «Маршрут · N» title row; top-right Save/Clear/Share only | Критический | ✅ `fa6e1fd` tip `441ce9ea` MSK **BUILD_ID=`4sb26gUETqq22pmF7ycwM`** `/my-day` 200 |
| UX.MYDAY-DESK-POLISH3 | CTAs+walk/auto on km row (right); airy title row; city pin + wider picker (~26rem) | Критический | ✅ `8b1923f` tip `3957b9a` MSK **BUILD_ID=`neGTZ9t_aXfs0StFNoZZo`** `/my-day` 200 |
| FIX.MYDAY-SALEABLE | Cull unsaleable/thin TC buy CTA on venue stops (Полет soft-404) | Критический | ✅ `ba13ec2` MSK **BUILD_ID=`CbKLIANk3tWkfiFKxUSCW`** |
| UX.MYDAY-F | Мой день: filters + auto-pick + top-up (product next) | Высокий | ⏳ поверх MOB канона |
| UX.MYDAY-IA | `/my-day` catalog-first + text accordion (collapsed) | Критический | ✅ live **BUILD_ID=`MvYEsYnvAH_KMCxXkt2S6`** |
| UX.MYDAY-ONPAGE | `/my-day` on-page city + searchable Локации/Площадки/События + must-see chips (no catalog nav) | Критический | ✅ `b4fdfd5`+`6345d0a` MSK **BUILD_ID=`q-1BAwZ65koVjH3CunDvi`** |
| UX.MYDAY-TYPECAT | Type search: city-scoped venues API (не global 500+exact); subtitle без «теплоход»; wizard boat intact | Критический | ✅ `2f692dc`+ live **BUILD_ID=`E6nQnmKCtloz0ynXA2y24`** |
| UX.MYDAY-EVENTS | «Ещё из каталога» → События: city display name + catalog slug match (`citySlug`/`sourceCitySlug`) | Критический | ✅ `066363d` MSK **BUILD_ID=`Ywy2ntkkoX6K__8CuMH3H`** |
| UX.MYDAY-SOFT | /my-day soft-warn SOFT=10 HARD=15; copy плотный день; bulk stop at soft; readiness→SOFT | Критический | ✅ `bd794f2` MSK **BUILD_ID=`Yqcz6aa-14QvDHs30n306`** `/my-day` 200 |
| UX.MYDAY-MAX10 | `/my-day` DAY_ROUTE_MAX 8→10; drop redundant intro copy; must-see chip without «в дне» | Критический | ✅ `8499c92` MSK **BUILD_ID=`q-1BAwZ65koVjH3CunDvi`** smoke `/my-day` 200 |
| UX.MYDAY-FILTERS | Must-see tabs: Главные / Гастро / Музеи / Парки / Храмы (hide empty); bulk respects filter | Критический | ✅ `5ba3e56` MSK **BUILD_ID=`FpLvs9SkQ6VpTMNXw-7ES`** smoke hub NN 5 tabs |
| UX.MYDAY-ACCORDION | `/my-day` compact: route always open; other sections exclusive accordion; «Своё место» under route | Критический | ✅ 2026-08-08 - order: scenarios → must-see → suburbs → custom; scenarios all breakpoints + chips |
| UX.MYDAY-SUBURB-DESC | Compact suburbs: POI short desc on md+ (mobile name-only) | Высокий | ✅ 2026-08-08 |
| UX.MYDAY-SHARE | Viral share `?city=&items=id:HHMM\|free`; menu Copy/TG/WA/**Макс**; buy+bought; DnD/print/distance MVP | Критический | ✅ `42421d4` |
| UX.MYDAY-SHARE-UX | Убран friend-landing баннер; share-текст в мессенджере; print «Сохранить»; hydrate без gate | Критический | ✅ `a4ce4e7`+ MSK **BUILD_ID=`jZmbBH9ZIxyREVMEnwmal`** `/my-day` 200 |
| UX.MYDAY-SHORT | Short share URL `/d/{code}` → redirect `/my-day?city=&items=`; POST `/api/day-route/share`; fallback long URL | Критический | ✅ `102443d` MSK **BUILD_ID=`jZmbBH9ZIxyREVMEnwmal`** smoke create+307 |
| UX.MYDAY-PRINT | Маршрутный лист: print CTA «Сохранить» + `@media print` sheet (город/дата, точки, км+ETA), chrome hide | Критический | ✅ `62564ca` → label shorten в SHARE-UX |
| UX.MYDAY-BOAT | Канон добора теплохода: Pier→Route→Slot→pin (`eventId`+time); share только после слота; SPB MVP wizard | Критический | ✅ `0212c13` MSK **BUILD_ID=`EdAk08KxqEiFe8Ow1Qg3i`** |
| UX.NN-COORDS | НН day-route coords: DTO venueRowsByIds + city hub merge published + city filter aliases + editorial fallback | Критический | ✅ `bee2a2a` MSK **BUILD_ID=`n6C8O0jfVXm2ksCrQ_yKG`** city hub 78/78 coords; preset stops 5/5 |
| UX.MYDAY-COMM | Canon planner+checklist (не swipe): readiness %, chips, buy handoff, recommend carousel, FAB, free-window | Критический | ✅ 4e45f48+ soft-cap follow-ups MSK **BUILD_ID=Yqcz6aa-14QvDHs30n306** |
| UX.MYDAY-SCROLL | Add/remove stop: keep scroll (no jump to top); URL sync via history.replaceState | Критический | ✅ `103d81e` MSK **BUILD_ID=`seNyt0ytyOIZEK6GkdEX6`** |
| UX.MYDAY-HOT | Hot Picks «Выбор Дайбилет»: tabs Советы/Культура/Еда; ≤6; dual CTA affiche/open_date/free; **always-visible** (не accordion) | Критический | ✅ `adac304` MSK **BUILD_ID=`h6qtQ4t6dt2pUCV2y5kK3`** `/my-day` 200 |
| UX.MYDAY-HOT-IMG | Hot Picks covers NN: editorial image lookup + classic 6 GenerateImage; photo-bg cards; catalog city warm-fix; order must-see→своё→hot | Критический | ✅ `6c24691` MSK **BUILD_ID=`p_VZM1zRvVXb6MQNYt_yt`** |
| UX.MYDAY-OSM | `/my-day` Leaflet OSM map: numbered markers + polyline; Оптимизировать у карты; Яндекс external | Критический | ✅ `6c24691` MSK **BUILD_ID=`p_VZM1zRvVXb6MQNYt_yt`** |
| UX.MYDAY-TICKET-URL | `/my-day` ticket CTA: never `/events/{venueSlug}`; sanitize + Hot Pick venue program fallback | Критический | ✅ `101d5b8` MSK **BUILD_ID=`ixSmgk9DbvgZ4YYbGLgmY`** `/my-day` 200; venues/niko1560 OK |
| UX.MYDAY-HDR | `/my-day` header: `N точек из 10` + unpaid билеты; H1 предложный; без %/окно/Яндекс/дубль Точки; subtitle `N • Страница` | Критический | ✅ `2bf58e9` MSK **BUILD_ID=`J2r1pJc-sK2W_wGzB2KzY`** `/my-day` 200 (bullet sep) |
| UX.MYDAY-P4 | Free-window upsell polish (multi-gap / ETA) | Средний | ⏳ partial MVP in COMM |
| UX.MYDAY-P5 | hookFact + mini description on day cards | Средний | ✅ 3f9a70e MSK **BUILD_ID=E6nQnmKCtloz0ynXA2y24** Hot Picks cover+hook; must-see mini-cards; free-window; search thumb+hook |
| UX.MYDAY-P6 | City «собрать за минуту» template variants | Высокий | ⏳ partial: hub «Готовые сценарии» under must-see; H1 «Собери свой день» |
| UX.MYDAY-COPY | Hub presets rename+move; `/my-day` H1 предложный; event hydrate title+coords | Высокий | ✅ `3f14a98` MSK **BUILD_ID=`mtXLit644Nhr5cRd4ideD`** |
| UX.MYDAY-P7 | Commercial `/d/{code}` recipient (tickets/map/paid) - не soft purple banner | Высокий | ⏳ |
| UX.MYDAY-P8 | Timeline flat list (не Утро/День/Вечер); «Маршрут» + «N точек»; badge align | Критический | ✅ `7a3de60` MSK **BUILD_ID=`Ywy2ntkkoX6K__8CuMH3H`** `/my-day` 200 |
| UX.MYDAY-SESSION | Event stop cards: show session date+time (`15 авг, 19:00`); enrich from events API | Критический | 🔄 commit+deploy |
| UX.MYDAY-STARTER | Empty starter: `lg:grid-cols-2`; each half centers own content; form `lg:w-[26rem]`; equal `py`; mobile A | Критический | ✅ `5a15fa0` MSK **BUILD_ID=`Nh-E3RXywMq_-DpzDLdBS`** |
| UX.MYDAY-STOP-V6 | Stop grid owner-v6: larger thumb+N, meta badges, tap actions; list dense unchanged | Критический | ⚠️ superseded by parallel `owner-v7` (`47c17e4`) |
| UX.MYDAY-MATCH-DEDUP | Matches accordion: title-first dedupe (no N identical TC session cards) | Критический | ✅ `64e3f38` |
| UX.MYDAY-COMPACT | Compact stop cards: no «Вход свободный»; ETA under card; session line; buy from price + nearby | Критический | ✅ `6721c9c` MSK **BUILD_ID=`meNSWERi0trhkT0vGq8lO`** |
| UX.MYDAY-TRIP | «Ваши билеты в этой поездке» shell (QR via orders - open in qa) | Высокий | ✅ shell `6721c9c` MSK **BUILD_ID=`meNSWERi0trhkT0vGq8lO`** (QR open) |
| UX.MYDAY-STOP-COMPACT | Stop cards ~½ height; drop «Вход свободный»; ETA line under card | Критический | 🔄 commit+deploy |
| UX.MYDAY-P9 | Extra carousels Рядом / Можно купить + Explore | Средний | ✅ MVP Hot Picks «Выбор Дайбилет» |
| UX.MYDAY-F | Мой день: filters + auto-pick + top-up (product next) | Высокий | ⏳ поверх COMM канона |

Канон: [myday-commercial-canon.md](./myday-commercial-canon.md).

---

## UX: Locations + mobile catalog (2026-08-01)

Brief: [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md). Build order: LOC1→LOC2→LOC4 shipped 2026-08-02; rest below.

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.LOC0 | Research brief: audit `/locations` + mobile `/events` city UX + competitor patterns | Высокий | ✅ docs |
| UX.LOC1 | Mobile sticky header: city chip (сейчас CityPicker только `lg+`; в меню город внизу) | Критический | ✅ 2026-08-02 |
| UX.LOC2 | `MobileNavSheet`: блок «Город» сразу после поиска | Критический | ✅ 2026-08-02 |
| UX.LOC3 | Rename nav/H1 «Локации» → «Места и точки сбора» (owner target; V1 nav stays) | Высокий | ⏳ |
| UX.LOC4 | `/locations`: dense hero; «Популярные города» (RussiaMap) убран с локаций | Высокий | ✅ `c698f2c` MSK **BUILD_ID=`SdwQIxr9a9CVj7jfdAKWh`** |
| UX.LOC5 | `/events` mobile: context line «События в {город}»; banner если city=all | Высокий | ⏳ |
| UX.LOC6 | Bottom-sheet CityPicker: поиск + популярные + «Все города» | Высокий | ⏳ |
| UX.LOC7 | Catalog mobile date UX: один entry (chips/sheet), не select+date input разом | Средний | ⏳ |
| UX.LOC8 | IA nav: V1 keep `/locations` in primary (не demote) | Средний | ✅ decided 2026-08-07 owner OK A+V1 |
| UX.LOC9 | Unified `/places` (venues+locations tabs) | Низкий | ⚠️ deferred (owner 2026-08-07) |
| UX.MAP1 | Location map zoom-out (`-`): OSM MapLibre embed floor → Leaflet `OsmMapEmbed` | Высокий | ✅ `4c93418` MSK **BUILD_ID=`HDL3hw0HUymPBt_oi5syV`** |
| UX.MAP-UA | Leaflet attribution: strip UA flag project-wide (`loadDaibiletLeaflet`) | Высокий | ✅ `d5de7b9` MSK **BUILD_ID=`R3nyHuxEYbZ-N4toJ2Lxo`** `/cities` 200 |
| LOC.BUS1 | `pl-vosstaniya` wrongly pier → bus (override + DB MEETING_POINT + water-only gate) | Критический | ✅ `1698c9e` MSK **BUILD_ID=`uAAeJS3sG_GuPNfbwQqKy`** |

---

## Homepage hero blue restore (2026-08-01)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.HOME1 | Вернуть синий (navy `#122868`) фон hero на главной вместо slate-black | Высокий | ⚠️ partial: `b59bc7a` ошибочно tint поверх фото |
| UX.HOME1b | Owner correction: navy `#122868` только base под фото; убрать blue overlay wash | Критический | ✅ `b185b19` MSK **BUILD_ID=`wcK6bf1ElP9vDu-ZTDEvN`** |

## Location↔Excursion linking (2026-07-31)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| LE.1 | Prisma `EventVenueRouteItem` / `RouteItemRole` + `Venue.hookFact` + migrate `event_venue_route_items` | Высокий | ✅ Phase A (канон owner) |
| LE.2 | Admin API venueLinks + PUT venue-links (STOP only; Event.venueId не трогаем) | Высокий | ✅ |
| LE.3 | Admin UI STOP-форма + venue hookFact | Высокий | ✅ |
| LE.4 | Public DTO: stopEvents / nearbyEvents (300м) / venueStops / hookFact | Высокий | ✅ |
| LE.5 | UI: LocationCard / park-like layout / Event «Маршрут / места» | Высокий | ✅ |
| LE.5c | LocationCard: chip+«В маршрут» vertical right stack; strip «Место посадки» title prefix | Высокий | ✅ `4f5b675` MSK **BUILD_ID=`B_7ZDd8i_WZurwdjJhMhl`** |
| LE.5b | Hide empty excursion UI on location page (hero 0 + empty block) | Высокий | ✅ `3271bfcb` BUILD `slptXB74NiKJwSUqiCO7t` |
| LE.6 | Seed Пермь must-see (6 slugs) + cityInfo slug | Средний | ✅ DB MSK 6 rows; cityInfo slug; listing 🚫 без hub-gate deploy |
| LE.7 | Deploy migrate + контент STOP-связей экскурсий | Высокий | ⚠️ title-seed MSK: Эрмитаж 291 / Исаакий 153 / Петропавловка 92; geo ≤100м + admin validate ещё |
| LE.8 | Geo autolink ТЗ → CLI dry-run/apply (пороги 150/300/500, merge STOP, `Event.venueId` не трогать) | Высокий | ✅ CLI + unit + MSK dry-run perm; radii follow-up: cityInfo dict (default 300 / SPB 400 / suburbs 600) |
| LE.9 | Admin «Подобрать рядом» + merge apply endpoint (suggest UI) | Средний | ✅ GET suggestions + POST `venue-links:apply` merge + UI чекбоксы; Event.venueId не трогаем |
| LE.10 | START/NEARBY_HUB MVP: START=`index:0`; NEARBY_HUB dynamic geo+transport (no admin hardcode) | Высокий | ⏳ docs LOCKED 2026-08-09; implement |
| LE.11 | Card activity preview: один агрегат / вкладки; single-number = `stopEventCount` | Средний | ⏳ docs LOCKED 2026-08-09 |
| DR.1 | «Собери свой день» MVP: кнопка + localStorage + match API (STOP>start>nearby), noindex, без комбо | Высокий | ✅ button/storage/match/`/my-day`; STOP-наполнение городов ещё слабо |
| DR.1b | Day-route polish: empty states, mobile badge, STOP/start/nearby badges, limit/multi-city warnings, copy toast | Высокий | ✅ `56bbb237` BUILD `Mt5-YY9GU-T83jOIjxN0Q` |
| DR.2 | Day-route Phase 1.5 share `?day=` noindex + Phase 2 auth sync | Средний | ✅ share hydrate + copy link; Phase 2 auth sync ⚠️ skip (нет user favorites day-route API) |
| DR.3 | Fix multi-add route: stale VenuePageView + share hydrate overwrite; add venues to day-route | Критический | ✅ `a2c1b32` + follow-up slug-match guard / city title href |
| DR.4 | Multi-add harden (stale payload fallback) + Yandex multi-stop rtext + reorder/optimize | Критический | ✅ `355eec1` BUILD `4-AqPsButr_VcuwLGcyFk` |
| DR.5 | Dedupe day-route matches: TC dated siblings → one card (base slug / title, keep best score+price) | Критический | ✅ `270790d` BUILD `a1C8wIWfv5xrllhohrdOE` |
| DR.6 | Multi-add recheck + null-island coords + backfill missing lat/lng (TC inst duplicates) | Критический | ✅ `a0f11ce` BUILD `wcJsYlkCYd1869HV9B1c-` · backfill 21 coords |
| DR.7 | Catalog cards strip lat/lng → «Нет координат» in Мой день (Fontanka etc.) | Критический | ✅ `5c6ffc1` BUILD `faYl1EovDayQLYvHsV8kQ` |
| DR.8 | /my-day add UX: CTA «Добавить точку» + routeVenues from matches + catalog hit-target | Критический | ✅ `2d3f7a4` BUILD `gEmtnqRsq_L56ejFTXSav` |
| DR.9 | Phase-0: must-see CTA + event «В мой день» + city presets | Высокий | ✅ `2d3f7a4` BUILD `gEmtnqRsq_L56ejFTXSav` |
| DR.10 | Badge «Маршрут · N» vs green «В маршруте» desync on /locations | Критический | ✅ `ff852a9` live BUILD `spsgbupFbWeJyWDuz2XNi` |
| DR.12 | False «Уже в маршруте» on catalog add (id↔slug cross-match) | Критический | ✅ `6c604f3` live BUILD `1HV6yidGN5MSbZU4idc7s` |
| DR.11 | Multi-add still broken for owner: inert SSR button + catalog toggle-off | Критический | ✅ `d9b639c` live BUILD `S_RAZ0azumKgT_beN19UH` |
| DR.13 | Toast «Не удалось добавить точку» on 2nd same-city add (write/LS) | Критический | ✅ `9bbe493` live BUILD `WKT1rWN1718h0x0jsrX5K` |
| DR.14 | /my-day standalone text planner (add by title, no catalog) | Критический | ✅ `0f24fe6` MSK **BUILD_ID=`iWvkrKtHTJQ6ZfXtsf6wI`** |
| DR.15 | Text planner cap: up to 8 stops (MIN=2 must not gate add) | Критический | ✅ `85b4a63` MSK **BUILD_ID=`lTTVacKQjRXqQAABoBDgl`** E2E 0→8 |
| DR.16 | Text planner 3rd stop fail (QuotaExceeded / page-cache LS full) | Критический | ✅ `a6a35c2` MSK **BUILD_ID=`7lA4l2wG63Ia_3fdgqLsC`** E2E Grand Maket 2→3 |
| DR.17 | False mixed-city warning: catalog cityId + text-stop same title | Критический | ✅ `705d13d` MSK **BUILD_ID=`uAAeJS3sG_GuPNfbwQqKy`** |
| DR.18 | Catalog→day-route: missing coords snapshot + truncated/missing address | Критический | ✅ `705d13d`+`fc4e419` MSK **BUILD_ID=`uAAeJS3sG_GuPNfbwQqKy`** cityId 20/20; Fontanka/Ligovsky OK |
| DR.19 | City hub «Собрать за минуту» caps at 4 instead of all must-see (6) | Критический | ✅ `5deb9bd` MSK **BUILD_ID=`uAAeJS3sG_GuPNfbwQqKy`**; Kostroma/Murmansk SSR «6 главных мест» |
| LOC.EMPTY | `/locations?city=` empty for all cities: soft-timeout empty HTML + nginx 30m HIT | Критический | ✅ `987516b` BUILD `IffsRTTeclktlvq7PQweq` + nginx purge |
| LOC.FACET | `/locations` type chip counts global (151) vs city (20); default «Все локации» | Критический | ✅ `bc994b6` BUILD `4-AqPsButr_VcuwLGcyFk` |

## Venue kinds: park + monument (2026-07-31)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| VK.1 | Prisma `VenueKind`: `PARK` + `MONUMENT` + migrate | Высокий | ✅ `20260731130000_venue_kind_park_monument` |
| VK.2 | Public kinds `park`/`monument`: labels, filters, crumbs, cards, map/search location href | Высокий | ✅ |
| VK.3 | Backend resolve/infer: park from name; monument только CMS (не ломать meeting_point «памятник …») | Высокий | ✅ |
| VK.4 | Admin kind options (Vite + Next admin) | Средний | ✅ |
| VK.5 | City hub copy «Важные места» (не «Важные локации») | Низкий | ⏳ если секция ещё не переименована |
| VK.6 | Future: park admission (Монрепо и т.п.) - не в MVP catalog/finance mix | Средний | ⚠️ deferred (см. qa.md) |
| VK.7 | City hub «Главные места»: title → venue/location href | Высокий | ✅ model + UI Link; cityInfo mustSee slug-патч 246 (web+public dirty) |
| VK.8 | Content places в каталогах /venues|/locations без events | Высокий | ✅ в репо; 🚫 live MSK dto.js без import hub-gate → listing/page null |
| VK.9 | Bulk seed mustSee → Venue + cityInfo slug (`seed-cityinfo-must-see-venues.js`) | Высокий | ✅ MSK apply: skip-no-city 0 (было 216); aliases latin→кирилл slug; cityInfo 246 slug dirty |
| VK.10 | Deploy+restart MSK API (dto hub-gate) + smoke Perm 6 in /locations|/venues | Критический | ⏳ blocker видимости для owner |
| VK.11 | Editorial enrich must-see top-12 cities (hookFact/about/way/coords/address/metro) | Высокий | ✅ 69 MSK; shortDescription preserve; CMS kind guard; ATTRACTION twins HIDDEN |
| VK.12 | Editorial enrich batch2: Омск/Уфа/Новгород/Тверь/Краснодар/Сочи/Тюмень/Воронеж/Ростов (53) | Высокий | ✅ 53 update MSK; база 122; shortDescription preserve |
| VK.12b | Ростов: Центральный рынок (Старый базар) editorial #6 | Средний | ✅ MSK; база 123 |
| VK.13 | Editorial enrich batch3: Влад/Вологда/Иркутск/Пермь/Сортавала/Саратов/Улан-Удэ/Челябинск/Рязань/Ставрополь (57) | Высокий | ✅ 57 MSK; база 180 |
| VK.14 | Editorial enrich batch4: Томск/Ульяновск/Ижевск/Орёл/Оренбург/Абакан/Псков/Севастополь/Симферополь/Пенза/Волгоград/Архангельск (72) | Высокий | ✅ 66 upd+6 ins; база 252; arhangelsk mustSee |
| VK.15 | Editorial enrich batch5: Астрахань/Барнаул/Белгород/Благовещенск/Брянск/Иваново/Йошкар-Ола/Калуга/Кемерово/Киров (60) | Высокий | ✅ 60 insert; база 312; mustSee seeded |
| VK.17 | Nizhny: must-see 30 + gastro 10 + 3 day-route presets | Высокий | ✅ `3b982c9` + hub-gate CLUB_BAR; MSK apply 40 ins |
| VK.16 | Editorial enrich batch6: Кострома/Курган/Курск/Липецк/Мурманск/Саранск/Смоленск/Сыктывкар/Тамбов/Хабаровск/Чебоксары/Чита/Южно-Сахалинск (78) | Высокий | ✅ 32 ins+46 upd; twins HIDDEN; база 390; BUILD `-qqq_t2f_YXevgHdjOf7E` |
| VK.18 | Must-see #6 for 6 cities (Казань/Калининград/Владимир/Владивосток/Иркутск/Улан-Удэ) | Высокий | ✅ `5b724f4` MSK 6 ins **BUILD_ID=`dtrpt-eetyBWyJA8DG1ye`**; hubs 6/6 + place pages 200 |
| VK.19 | Калининград: curated city hub 16 мест, 5 пригородов, 3 дневных пресета | Высокий | ✅ superseded VK.20 |
| VK.20 | Калининград: mustSee 35 + 5 suburbs nested POIs (4/5/5/5/4) + собор в Главные места | Высокий | ✅ `9d77eb4` MSK **BUILD_ID=`bDKOL5rTJ7WEpF37gGNXG`** |
| VK.21 | KGD-001…011: связать owner seed с `cityInfo` и каноническими карточками | Высокий | ✅ `80b341c`; MSK seed 11 update + deploy, hub и 6 sample URLs 200 |

## Finance supplier LC smoke (.159) 2026-07-31

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| FIN.LC1 | Deploy Codex supplier series (>=147eb436 content) на `.159` | Критический | done `c105264` (patch am; origin tip still 0c1e464) |
| FIN.LC2 | STUB admission purchase smoke (supplier + /api/checkout/stub) | Критический | done 201 CONFIRMED |
| FIN.LC3 | YooKassa sandbox purchase smoke (confirmationUrl) | Критический | ✅ 2026-08-07 SUCCESS |
| FIN.LC4 | Owner: SG Diligent Polydeuces outbound 443 (+ DNS) | Критический | ✅ PASS (egress green; sandbox create-payment OK 2026-08-07) |
| FIN.LC5 | YOOKASSA_SECRET_KEY на `.159` + CHECKOUT=1 after egress | Критический | ✅ key `<set>`; CHECKOUT=1; VERIFY_WEBHOOK=1; STUB=1 (2026-08-07) |
| FIN.LC6 | Codex SSH access (daibilet_spb_finance / pubkey) | Критический | ⏳ owner: Cursor has key; Codex needs same |
| FIN.W1 | Week1: YooKassa+webhook/reconcile+runbook (4-5d after D0) | Критический | 🔄 Stage 0 code **live on `.159`**; canon webhook URL LOCKED (`finance-api…/webhook`, dual SKIP; `pay.` = return only); **owner gate:** register/verify cabinet; **open runtime:** e2e PENDING→CONFIRMED + ticketNumbers ([checklist](./checklists/yookassa-e2e-sandbox.md)) |
| FIN.W2 | Week2: supplier LC + admin legal/bank approve + capacity reaper | Высокий | ⏳ |
| FIN.W3 | Week3: controlled catalog path + ledger MVP + m2m Bearer | Высокий | ⏳ wide CTA still out |
| FIN.W4 | Week4: harden, scheduled reconcile, docs, smoke matrix | Средний | ⏳ |

## City hub top-query vs landing counts (2026-07-31)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| HUB.TQ1 | City-scope landing sessions before SSR `slice(48)` + shared helper | Критический | ✅ |
| HUB.TQ2 | Pass `?city=` / citySlug through landing DTO, Next API, SSR, client fetch | Критический | ✅ |
| HUB.TQ3 | Deploy MSK api+web, smoke Самара standup/family/concerts | Высокий | ✅ BUILD `ysb9LiafxuxE8ptQkYg6t`; 4/5/17 aligned |

## City hub hero ultrawide (2026-07-31)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.HERO1 | Cap city PNG ≤110% (`1024px*1.1`) + `object-contain` (не height-upscale) | Критический | ✅ MSK `ikMw9FRXSb-HNgZKjaLxM` (без commit) |
| UX.HERO1b | Не дать следующему MSK rebuild затереть source `1.2` поверх | Высокий | ⏳ commit или scp source перед каждым web build |
| UX.HERO2 | CLS: fixed night hero `h-*` + city skeleton/loading match SSR/hydrate | Критический | ✅ MSK `yvt23s2J2qJustslJex5K` (без commit) |
| UX.HERO3 | Ultrawide sides: mirror ~10% + stretch + navy fade `#0b1220` (не flat crop) | Высокий | ❌ откат: stretch на весь gutter + scrim поверх текста |
| UX.HERO3b | Mirror strips ~10% image width рядом с фото + fade→transparent; gutters = navy CSS | Критический | ❌ superseded → HERO3c |
| UX.HERO3c | Golden-ratio city hero: navy `#050a12` + left φ fade + right edge fade + photo ~38.2% right; без зеркал | Критический | ❌ superseded → HERO3d (φ отвергнут владельцем) |
| UX.HERO3d | City hero: photo ~20% right + opaque left `#000c2a→#000` + right soft 3.5%→navy→black; без зеркал | Критический | ❌ superseded → HERO3e (`md:w-[20%]` = иголка + wrong grad) |
| UX.HERO3e | City hero: photo `right-[20%]` aspect-[5/4] + leftGrad black→navy under + right gutter 20%; без зеркал | Критический | ❌ superseded → HERO3f (5:4 + flat black base отвергнуты owner) |
| UX.HERO3f | City hero: 16:9 at `right-[20%]` + leftGrad to photo edge (navy→black) + right soft→navy→black; base `#000c2a` | Критический | ✅ commit `092fa703` MSK `BUILD_ID=r39aqSMuoLnZ4xDmPwZLc` |
| UX.HERO3g | Owner navy `#0a174b` + mobile equal py; photo edge soft fade (seam navy↔photo) | Критический | ✅ `49d7c616` MSK `BUILD_ID=8DwUkz2XCFh58Z20GVN_p` |
| UX.HERO3i | Right photo-edge fade ≈ left (~15%) + mobile `pt-16 pb-8` / `sm:pt-20 sm:pb-10` | Критический | ✅ `0cfe8aa2` MSK `BUILD_ID=E_ATa3U0g3Km35xQ8KFac` |
| UX.HERO3j | Mobile gap after lead before tag/stats/CTA (`mt-5 md:mt-3`) | Высокий | ✅ `55253504` MSK `BUILD_ID=U0vFfMpCCjrvys2yhOxCI` |
| UX.HERO3k | Real `mask-image` on photo (`.city-hero-photo-mask` in globals.css); drop navy overlay | Критический | ✅ `0db07eb3` MSK **BUILD_ID=`9A0T7hjLeA1YtvBHDt7d8`** |
| UX.HERO3l | Lighter navy base `#122868` / mid `#0d1f5c`; no `#000` rim stops under mask | Критический | ❌ superseded → HERO3m (wrong: fixed outer rims, not photo seam) |
| UX.HERO3m | Photo-edge light `#122868` plateau; deepen only toward outer rims; wider ~38% photo mask | Критический | ❌ superseded → HERO3n (mask too wide; mobile bad) |
| UX.HERO3n | Drop `.city-hero-photo-mask`; soft edge fade md-only ~15%; keep `#122868` panels + pt-16/mt-5/16:9/right-20% | Критический | ✅ `c2e2f4c4` MSK **BUILD_ID=`yZkioNIzo_sXcC2xFFbmy`** |
| UX.HERO3o | Photo closer to right: `md:right-[4%]` / `lg:right-[10%]` (+ leftFill/rightGutter sync); kill mid-width navy hole | Критический | ✅ `c814ca54` MSK **BUILD_ID=`_uJZrw56NXeR2mgb5NxaB`** |
| UX.HERO3p | Adaptive right gutter: md4 / lg10 / xl16 / 2xl20 (+ leftFill/rightGutter sync); ultrawide air without mid hole | Критический | ✅ `5e15123a` MSK **BUILD_ID=`Z3MIKd0glXMUeTfnLRgU8`** |

## /podborki city filter (2026-07-31)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| POD.CF1 | Ослабить strict city filter: national/multi видны при ≥1 event в городе + city-bound | Критический | ✅ |
| POD.CF2 | Refetch landings-catalog?city= + merge helpers + тесты | Критический | ✅ |
| POD.CF3 | SelectedCityProvider: sync header city → MULTI_CITY path | Высокий | ✅ |
| POD.CF4 | Deploy web MSK (без commit) | Высокий | ✅ BUILD_ID=`vo1CLfHKIo9X2CDMkkHPA` → later overwritten; hero fix `ikMw9FRXSb-HNgZKjaLxM` |


## UX: event page hang / 502 (2026-07-31)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.EVT1 | Diagnose slow event URL (curl cold/warm, cache headers, journal) | Критический | ✅ root: web hung + catalog SWR 170с + orphan build workers; не no-store |
| UX.EVT2 | Restart daibilet-web + reap orphan jest-workers; warm URL | Критический | ✅ BUILD `CMV69QaA_nTH1z_YVhn1m`; cold~0.94с / warm~0.01с HIT |
| UX.EVT3 | `events/[slug]/loading.tsx` shell | Средний | ✅ в workspace; ⏳ next web deploy |
| UX.EVT4 | Confirm event DTO `unstable_cache` v2 + revalidate 300 (не finance SSR) | Высокий | ✅ уже в проде; finance на event page нет |

## Infra: prod 504 incident (2026-07-30)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| INC.504.1 | MSK egress SG: был self-loop (Daring Aquila); owner **Fair Snipe** TCP 80/443 → `.159` ✅; `github.com` с MSK тоже 200 - шире только-finance; полный outbound audit optional | Критический | 🔄 partially open 2026-07-31 (finance+github OK) |
| INC.504.2 | nginx: прямой bypass `/images/*` static, без `/_next/image` для локальных файлов | Средний | ✅ |
| INC.504.3 | Пересмотр daibilet-web MemoryMax/heap + OOMPolicy=continue (High 1.5G / Max 2G / heap 1280 на 7.8Gi) | Критический | done 2026-07-31 MSK live |
| INC.504.4 | SWR catalog rebuild: non-blocking / async (не блокировать event loop 49-219с) | Критический | ✅ MSK live BUILD `GMlh5-uhf-R2iVlZbSFXY`: disk+child/cron+forever-SWR+reap |
| INC.504.5 | Dual catalog SWR cache (`dto.js` + `public-catalog.dto.ts`) - merge/unify (вынесено из F5.3b) | Средний | ✅ 2026-08-08: dto.js adopt-only; ✅ 504.5b stale-first + SQL cooldown 45м + chunked adopt |
| INC.504.5c | Catalog Worker shared disk: systemd timer, API REBUILD_MODE=off, disk v2 indexes hydrate | Высокий | ✅ канон units + MSK timer; 🔧 2026-08-09 203/EXEC+stale-first; ✅ stat-gate promote (memory-first, mtime skip parse) |
| INC.504.5d | Future: Catalog Worker + Redis gzip (`catalog:sessions/indexes/updated_at`) Soft-SWR; не streaming | Низкий | ⏳ deferred; MSK Redis **нет** (2026-08-09 RO check) → нужен новый isolated; proposed P1 20–30m / P3 <50% last-good |
| INC.504.5-codex | Brief Codex: медленный/нестабильный public API + catalog → [codex-api-catalog-latency-brief.md](./codex-api-catalog-latency-brief.md) | Критический | 📄 2026-08-09 handoff |
| INC.504.6 | nginx proxy_cache SWR: `background_update` + TTL 30m (browser clear ≠ cold Next) | Критический | ✅ |
| INC.504.7 | City hub ISR: `unstable_cache` + `generateStaticParams` (было no-store / 20-30с) | Критический | ✅ |
| INC.504.8 | Cron warm-hub: flock + timeout 90s + per-fetch 15s (anti pile-up) | Критический | done 2026-07-31 MSK live |
| INC.504.9 | Compact `/api/public/home` DTO + cache-control (было ~1.2MB no-store) | Критический | ✅ |
| INC.504.10 | City SSR: secondary timeout 3s + perf marks; lighten events list DTO | Критический | ✅ |
| INC.504.11 | AAAA IPv6: проверить маршрут до MSK или снять AAAA в Timeweb | Высокий | ⏳ |
| INC.504.12 | MSK hang/504 2026-07-31: MemoryMax exhaustion + warm-hub pile-up; finance timeout hot-patch 3s->2.5s; harden systemd/cron | Критический | mitigated on `.184` (rebuild still to bake finance 2500) |
| INC.504.13 | 2026-08-01 повторный hang/504: SIGKILL restart; **disable warm-hub cron** (`*/3`); Prisma disconnect в web | Критический | mitigated live; root cause open |
| INC.504.14 | systemd `TimeoutStopSec=25` + KillMode=control-group для hung Next | Высокий | ✅ live MSK + `deploy/systemd/.../stop-timeout.conf` |
| INC.504.15 | Prisma pool / Connection terminated в daibilet-web (не только API) | Высокий | ⏳ |
| INC.504.16 | Re-enable warm-hub только `*/15`+concurrency1 после smoke TTFB; не `*/3` | Средний | ✅ superseded: канон `*/12` в daibilet-tasks (INC.504.17) |
| INC.504.17 | MSK `/etc/cron.d/daibilet-tasks`: warm `*/12`+flock+90s (User=root) + TTFB healthcheck; old warm-hubs disabled | Критический | ✅ live MSK 2026-08-01; docs |
| INC.504.18 | Owner 504 ~14:06 UTC: site already up; hang был 13:01-13:18 (Prisma + accept timeout); deploy gaps ~1.5м; no restart | Критический | ✅ verified up; root cause = INC.504.15 |
| INC.504.19 | Owner 504 ~16:49 UTC: live hang (0B TTFB); SIGKILL restart; healthcheck bug (`curl \|\| echo 999` → bc never fires); fixed cron + `deploy/cron/daibilet-tasks` | Критический | ✅ mitigated live; root cause still INC.504.15 / event-loop |
| INC.504.20 | Owner fury ~17:19 UTC: live hang again (0B TTFB); SIGKILL+start; **cron `%` truncates healthcheck** (log empty despite minutely fire); warm **OFF**; `ssr-healthcheck.sh` + SIGKILL recovery | Критический | ✅ mitigated live MSK; warm off until hang RC; root still INC.504.15 |
| INC.504.21 | 2026-08-02 ~07:19 UTC: SSR hang 0B TTFB again (~11h next RSS~1.6G); SIGKILL+start; healthcheck silent - script **644 not +x** → Permission denied; chmod 755 + cron via `/bin/bash` | Критический | ✅ mitigated live MSK; auto-net fixed; root still INC.504.15 |
| INC.504.22 | **Codex handoff:** независимый RCA + PR-sized фикс SSR hang (event-loop / Prisma in Next). Brief: [codex-ssr-hang-brief.md](./codex-ssr-hang-brief.md); canon [inc-504-ssr-hardening.md](./inc-504-ssr-hardening.md) | Критический | ✅ merge `f93b770` MSK BUILD `3zmDWHpY7rXAJgqu0-pnR` |
| INC.504.25 | Owner 502 `/my-day` 2026-08-04: не SSR my-day; minutely healthcheck SIGKILL+start mid-deploy (curl=7) → ENOENT prerender-manifest crash-loop; cold-start curl=28 kill. Fix: deploy flock+active marker; healthcheck SKIP; start-web refuse incomplete `.next` | Критический | ✅ `59aba2f` MSK **BUILD_ID=`3VxNvT0CDvcI3jB-BMvpP`**; health SKIP mid-deploy; NRestarts=0; `/my-day` `/` 200 |
| INC.504.26 | 2026-08-09: API hang (health/events TTFB timeout); swap.peak~4G + MemorySwapMax=max; venue/city PDP still full-catalog. Fix: index-scoped+soft PDP/city; API healthcheck; MemorySwapMax=512M; docs [catalog-full-json-consumers.md](./catalog-full-json-consumers.md) | Критический | ✅ `8990eb3c` MSK live |

См. Diary 2026-07-30 «Prod 504: daibilet-web hang», «2026-08-01 INC.504.13», «INC.504.17», «INC.504.18», «INC.504.19», «INC.504.20», «INC.504.21»; brief Codex `INC.504.22`; deploy race `INC.504.25`; full-JSON consumers `INC.504.26`.

---

## Catalog sale vs display price (2026-07-30)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CAT.DP1 | Owner: saleable = widget+schedule; не требовать priceFrom≥100 для каталога | Критический | ✅ |
| CAT.DP2 | Карточки/таблицы: не показывать «от N ₽» / fake price при null или &lt;100 | Критический | ✅ |
| CAT.DP3 | Admin «Без цены» = display-price gap (мониторинг), не block from sale | Средний | ✅ note |

---

## Infra: переезд prod СПб → МСК (2026-07-29)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| MIG.0 | SSH МСК на новом IP `201.24.125.184` (`daibilet-msk`) | Критический | ✅ |
| MIG.1 | Задокументировать снимок СПб/МСК + план cutover | Высокий | ✅ docs |
| MIG.2 | Postgres Docker `:5437` на МСК + restore dump со СПб | Критический | ✅ |
| MIG.3 | Код `2ec37f4` + `.next` со СПб (build на МСК упёрся в fonts.googleapis DNS) | Критический | ✅ |
| MIG.4 | TLS (443) + nginx parity со СПб | Критический | ✅ |
| MIG.5 | Cron/timers (tc-catalog-sync и др.) на МСК | Высокий | ✅ |
| MIG.6 | Smoke на МСК (IP/`--resolve`) до DNS | Критический | ✅ |
| MIG.7 | DNS A `daibilet.ru`/`www` → `201.24.125.184` + post-smoke | Критический | ✅ 2026-07-30 |
| MIG.8 | СПб: stop public web/api + TC timer + crontab sync; PG snapshot; host → finance+staging | Средний | ✅ 2026-07-30 · [spb-finance-host.md](./spb-finance-host.md) |
| MIG.9 | Role lock: `.184` catalog · `.159` battle finance · `.16` **труп** (снят из inventory) | Высокий | ✅ 2026-08-07 · [spb-finance-host.md](./spb-finance-host.md) |
| MIG.9.0 | Phase 0: SSH/firewall `.159` + DNS A `pay`/`supplier`/`finance-api` → `.159` | Критический | ✅ SSH/UFW + DNS A + TLS SAN 2026-07-30 (`checkout`/`finance.` не нужны) |
| MIG.9.1 | Phase 1: base stack docker/nginx/node на `.159` | Высокий | ✅ 2026-07-30 |
| MIG.9.2 | Phase 2: fresh finance PG на `.159` (не catalog dump) | Критический | ✅ PG `:5437` + migrations/seed smoke 2026-07-30 |
| MIG.9.3 | Phase 3: finance app + HTTP/TLS `pay`/`supplier`/`finance-api` | Критический | 🔄 API `:4100` + nginx · TLS ✅ LE SAN pay/supplier/finance-api · STUB on / YooKassa off |
| MIG.9.4 | Phase 4: optional staging/build scaffolding на `.159` (не justification для `.16`) | Средний | ✅ N/A - SPB `.16` retired from build; staging на `.159` optional later |
| MIG.9.5 | Phase 5: YooKassa webhook → finance-api canon; dual only if prior live | Критический | 🔄 canon URL LOCKED `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook` (dual **SKIP**; `pay.` ≠ webhook); VERIFY=1; **owner 2026-08-09:** register/verify cabinet ещё gate (свёртка «cabinet DONE»); next ⏳ e2e + closeout ([checklist](./checklists/yookassa-e2e-sandbox.md)) |
| MIG.9.6 | Phase 6: smoke `pay`/`supplier`/webhook; catalog `.184` без cutover | Критический | ⏳ |
| MIG.9.7 | Phase 7: retire Intelligent Hoopoe `.16` from repo/ops + **wipe VM in Timeweb** | Высокий | ✅ repo/docs/scripts 2026-08-07 (owner confirmed «труп»); **VM wipe в панели Timeweb = owner**, если ещё биллится |
| PERF.OOM4 | MSK: снять `cpus:1`/`workerThreads:false`, heap build 5120Mi | Высокий | ✅ |

План: [migration-spb-to-msk.md](./migration-spb-to-msk.md) · roles/MIG.9: [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md) · [spb-finance-host.md](./spb-finance-host.md)  
Домены finance (**канон**): **`pay.daibilet.ru`** (buyer) · `supplier.daibilet.ru` · `finance-api.daibilet.ru` - DNS+TLS ✅. Alias `checkout.` / `finance.` не обязательны ([qa.md](./qa.md)).  
Owner minimum: MSK→`.159` сеть ✅ · YooKassa `SHOP_ID`/`SECRET=<set>` ✅ · egress `.159` ✅ · FIN.LC3 + Stage 0 code **live** ✅ · webhook canon = finance-api (не pay) · **owner: register/verify cabinet** ⏳ · next ⏳ sandbox closeout CONFIRMED+ticketNumbers · Codex SSH.  
**Web deploy canon:** MSK-only (`deploy-prod-next.sh` / CI Deploy MSK web) на `.184`. SPB `.16` Intelligent Hoopoe = труп (MIG.9.7 ✅ docs; wipe VM = owner Timeweb).

---

## Catalog ↔ finance projection (lock 2026-07-30)

Канон: [catalog-finance-projection.md](./catalog-finance-projection.md). UI/checkout на catalog **не** раскатывать до P0.

| # | Задача | Приоритет | Статус | Owner |
|---|--------|-----------|--------|-------|
| CF.0 | Docs lock: boundary + projection matrix + don'ts | Критический | ✅ 2026-07-30 | Cursor |
| CF.P0 | **PurchaseProjection**: admin (External+Checkout), buyer «Мои покупки», supplier CheckoutItems | Критический | ✅ finance `.159` @ `00aa9dcf` / smoke 2026-07-30 | Codex |
| CF.P0b | Gate: no wide internal sales CTA на `.184` until catalog client+UI | Критический | 🔓 client+UI shipped; wide YooKassa still off; CTA only `canSell` | both |
| CF.P1 | Finance public read APIs: supplier / venue summary / AdmissionProduct list+detail (`canSell`) | Высокий | ✅ `.159` @ `0c1e464` + harden `114dd391` (DTO/canSell/PLATFORM tests + runbook) | Codex |
| CF.P1b | Catalog read client → finance (`FINANCE_API_BASE_URL` + Host + 3s timeout) | Высокий | ✅ `finance-projection-client.ts` | Cursor |
| CF.P1c | Service auth catalog↔finance (m2m Bearer - Codex lock) | Высокий | ⏳ env unset; ETA 0.5-1d | owner+Cursor |
| CF.P2 | Venue page блок «Входные билеты» (test museum) | Высокий | ✅ UI; slug bridge `phase-g-test-museum` если нет в catalog | Cursor |
| CF.P2b | City hub museums/admission при published | Высокий | ✅ `CityAdmissionBlock` (default min=1) | Cursor |
| CF.P2c | `/events`: отдельный card type admission (не slotted event) | Средний | ⏳ card есть; feed later | Cursor |
| CF.P2d | CTA → `pay.daibilet.ru`; TC/TEP widgets regression | Высокий | ✅ canSell gate; widgets untouched; env `FINANCE_CHECKOUT_BASE_URL` → pay | Cursor |
| CF.P2e | Catalog venue slug bridge `phase-g-test-museum` на MSK PG | Средний | ✅ seeded 2026-07-31 (`ven_phase_g_test_museum_catalog`, PUBLISHED, `isIndexable=false`); script `ensure-phase-g-test-museum-venue.js`; Next venue HTML после web rebuild (dto admission-only gate) | Cursor |
| CF.P3 | STUB/YooKassa order видим admin+supplier LC через PurchaseProjection | Высокий | 🔄 STUB ✅; secrets `<set>`; CHECKOUT=0; egress ❌; wide CTA out | Codex |

## PERF event pages (после DNS на МСК)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| PERF.E3 | `hydrateSlots: false` в event DTO | Высокий | ✅ cold TTFB МСК ~0.12–0.17с → warm ~8ms |
| PERF.E4 | Warm top-100–300 `/events/[slug]` после deploy/sync | Высокий | ✅ `scripts/warm-top-event-pages.mjs` + deploy hook |
| PERF.E4b | `generateStaticParams` только top-N | Высокий | ✅ top-N default 200 (`EVENT_SSG_TOP_N`) |
| PERF.E5 | Event page без full catalog (slug→DB + related) | Средний | ✅ 2026-07-30 |
| PERF.V1 | Venue/location ISR (`getCachedPublicVenueDto`) + admission timeout + no client refetch on 0 sessions | Высокий | ✅ 2026-07-31 MSK BUILD `wltP0t9QlQrxpn1a72LW0`; warm ~0.05–0.19с; cold first ~15с = catalog rebuild owner |
| PERF.NAV1 | Soft-nav click lag: `NavigationProgress` + `SiteLayout`→`getCachedDestinations` + `staleTimes` | Высокий | ✅ 2026-07-31 MSK `Cm6zKdDCV2gLnM4H88VZt` |
| PERF.FCP1 | Home/city blank 2-3s: isolate `useSearchParams` + `SiteChromeSkeleton` / `loading.tsx` (не empty spacer) | Критический | ✅ 2026-07-31 MSK: body paints brand+skeleton; TTFB warm ~0.17с HIT `s-maxage=300`; BUILD `ysb9LiafxuxE8ptQkYg6t` |
| PERF.FCP2 | Menu routes brand shells: `/events` `/cities` `/venues` `/locations` `/podborki` `/blog` (+slugs) `loading.tsx` + blog Suspense fix | Критический | ✅ 2026-07-31 MSK smoke OK_CHROME; BUILD `HL2bMp0TxgnzWNKKehZgG` (без commit) |
| PERF.SSR1 | Hung TTFB: SiteLayout/cities/venues soft-timeout + home fingerprints timeout + warm N=40/c=2/flock | Критический | ✅ `11fe214` BUILD `rNVioNw6J2R2nOpPkbsM6` |

---

## Event page perf (после переезда на МСК) (2026-07-29)

**Блокер/зависимость:** все пункты ниже - **после переезда на МСК** (после MIG.7 / DNS cutover). Не блокируют сам переезд. Owner 2026-07-29: отложено post-MSK.

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| PERF.E2 | Diagnose `/events`→`/events/[slug]` slow nav (TTFB cold 1.5–7.5с) | Критический | ✅ root cause: on-demand ISR + catalog hydrate в event DTO |
| PERF.E3 | `buildPublicEventDto`: `getPublicCatalogSessions(..., { hydrateSlots: false })` | Высокий | ✅ код; cold TTFB МСК ~0.12–0.17с → warm ~8ms (2026-07-30) |
| PERF.E4 | Warm top-100–300 популярных `/events/[slug]` после deploy/sync | Высокий | ✅ `scripts/warm-top-event-pages.mjs` + deploy hook |
| PERF.E4b | `generateStaticParams` только top-N (не все ~2600; OOM-safe) | Высокий | ✅ top-N default 200 (`EVENT_SSG_TOP_N`) |
| PERF.E5 | Event page без full catalog: slug → DB + related отдельно | Средний | ✅ 2026-07-30 `public-event.dto` без `getPublicCatalogSessions` |

---

## Landing match: concerts vs bus tours (2026-07-29)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| LAND.C1 | /kontserty: исключить автобусные туры (тег/«на автобусе») из concerts-genre | Высокий | ✅ dual-edit dto.js + landing-rules.ts |
| LAND.M1 | moscow-museums: city-alone match → standup leak; requiredAnyKeywords + exclude standup | Высокий | ✅ 2026-07-31 API 699→61, standup 0; scp+restart |
| LAND.M2 | Global matcher: `rule.city` не sufficient match (filter only); city-alone unit test | Критический | ✅ 2026-07-31 MSK deploy; museums 61, yards 9, bus 48, country 5, standup 530 |

---

## Blog content polish (2026-07-29)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| BLOG.P1 | Причесать все blog MD кроме 5 owner-rewrites | Высокий | ✅ 37 PUBLISHED |
| BLOG.P2 | Cover + 1-2 inline на диске для PUBLISHED | Критический | ✅ missing=0 |
| BLOG.P3 | HIDDEN: bylinnyy-bereg-fentezi-fest, open-air-festy-vyhodnoi-ru | Низкий | ✅ 301 → канон |
| BLOG.P4 | Deploy prod после push feat/next-monorepo | Высокий | ✅ `13f0e18` prod |
| BLOG.P5 | Excerpt UX: listing only / no mash; article без excerpt block | Критический | ✅ |
| BLOG.P6 | SEO desc: strip «Колонка {Имя}:» | Высокий | ✅ |
| BLOG.P7 | Column signature dedupe + volhov soft-404 RCA | Высокий | ✅ 2026-08-02 |

---

## Ops: Venue public pages vs event links (2026-08-01)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| VENUE.L2 | Event→venue 404 «Модная среда 1823»: fleet-junk false positive + MEETING_POINT gate | Критический | ✅ `61f1116` gate + `921abe4` junk regex; MSK in-place web **BUILD_ID=`YYuWaKq2MGFkUSNVioLJp`**; live HTML/API 200 |
| VENUE.L3 | Event/session DTO: не отдавать `venueSlug` (или `venueHasPublicPage=false`) для HIDDEN / non-resolvable hub rows - UI не линкует в 404 | Высокий | ⏳ |
| VENUE.L4 | Soft-sign twin: при HIDDEN twin rematch `Event.venueId` на канонический PUBLISHED/CANDIDATE slug | Средний | ⚠️ museum batch: on-site rematch; туры посещени* → STOP, не venueId |
| VENUE.L5 | Ops ensure `venue_68d4062e…` → `CANDIDATE` (kind уже `CLUB_BAR_RESTAURANT`) | Средний | ✅ `scripts/ensure-modnaya-sreda-venue.js` applied on MSK |
| VENUE.FONTANKA-53 | Дубль причала Фонтанки 51-53: канон TC `prichal-na-fontanke-53`, twin `venue_tep_53` HIDDEN + rematch | Высокий | ✅ ensure + tep-import map; prod apply |
| VENUE.DVORTSOVAYA-18 | Дубль причала Дворцовая 18: канон TC `venue_681d44a7…` PIER+89 events, twin `venue_tep_65` HIDDEN + rematch | Высокий | ✅ ensure + tep-import map place 65; prod apply |
| VENUE.SINOP-10A | Синопская наб. дом 10→10А; pier display без `Причал —`; TEP 72→канон | Высокий | ✅ override+import rewrite+ensure; prod PG applied |

---

## Ops: TC catalog sync reliability (2026-07-27)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| SYNC.1 | `deploy/cron/tc-catalog-sync.sh` executable (`100755`) - nightly 203/EXEC | Критический | ✅ prod chmod + git filemode |
| SYNC.2 | systemd: `NODE_OPTIONS=--max-old-space-size=1536`, MemoryMax≥2G (catalog JSON ~245MB) | Критический | ✅ prod unit + repo `deploy/systemd/` |
| SYNC.3 | `tc-sync` / worker: fail when child killed by signal (OOM masked SUCCESS) | Критический | ✅ code; **deploy на prod ⏳** |
| SYNC.4 | Verify next nightly 03:20: real `importedEvents` + non-zero import, not fetch-only | Критический | 🔄 timer ✅; **2026-07-27 03:20Z** `importedEvents:21145` exitCode:0; **28.07** ⏳ post-check `verify-tc-catalog-sync.sh`; alert в `tc-catalog-sync.sh` |
| SYNC.5 | TEP full sync (habit) | Высокий | ✅ 2026-07-26 22:22Z ~307с / 214 events / 20566 links |
| VENUE.L1 | Lumiere Hall 
enue_54cabc2b9cb5385a9f65b95a: 404 hub (MEETING_POINT/NONE) - ensure script + TC import guard | Критический | ✅ 6e17cce prod + ensure DB | агент |

---

## Landing SSR perf (2026-07-27)


| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| PERF.B1 | /blog ISR: cached list 300s, Suspense shell, minimal hero (no newsletter) | Критический | ✅ 88585ec prod: s-maxage=300 HIT, TTFB ~0.10s (было ~1.08s no-cache) | агент |

---

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| PERF.L1 | Landings ISR: убрать `await searchParams` в `[segment]`/`[segment2]`/`[segment3]`; genre с URL на клиенте | Критический | ✅ `c433652` prod (`s-maxage=3600` + HIT) |
| PERF.L2 | `publicCatalogSessions` SWR (fresh 5м / stale 30м + soft-invalidate), зеркало TS DTO | Критический | ✅ `c433652` prod |
| PERF.L3 | Slim SSR: fallback `buildPublicLandingPage` → lean cards + slice 48 (как managed) | Высокий | ✅ `c433652`; `/rechnye-progulki` ~231KB (было ~705KB) |
| PERF.L4 | `/events` generateMetadata без searchParams (SEO tradeoff vs ISR) | Средний | ✅ `c799c31` prod: `s-maxage=300` + HIT |
| PERF.L5 | `/progulki-po-krysham` warm всегда `x-nextjs-cache: MISS` при s-maxage=3600 | Низкий | ⏳ anomaly (TTFB OK ~0.12с) |
| PERF.E1 | `/events/[slug]` ISR: `generateStaticParams([])` + `unstable_cache` DTO/rating; shared metadata+page | Критический | ✅ `c799c31` prod: cold MISS ~1.4с → warm HIT ~16ms |
| PERF.D1 | Deploy: reap orphan `jest-worker` / leftover `next build` (PPID=1, cwd under `/opt/daibilet`) | Критический | ✅ `c799c31` deploy reap pre/post; orphan=0 |
| PERF.OOM1 | `next.config`: `workerThreads: false`, `productionBrowserSourceMaps: false` | Критический | ✅ `073f1d3` prod |
| PERF.OOM2 | `web:build` heap cap 2560Mi (`next-build.mjs` + deploy NODE_OPTIONS) | Критический | ✅ prod deploy EXIT:0 |
| PERF.OOM3 | Prod `vm.swappiness=10` idempotent in deploy | Высокий | ✅ prod sysctl=10 |

---

## Landing buy UX / TC+Teplohod feedback (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| BUY.1 | Hidden TC triggers не перекрывают CTA (`pointer-events-none`) | Критический | ✅ `c984d8a` |
| BUY.2 | Optimistic shell «Открываем оплату…» + retry/fallback TC+Teplohod | Критический | ✅ код готов; deploy с CV.L-Hero |
| BUY.3 | Bridges: убрать fake ★4.7 / sold-count; hide fake Reviews | Высокий | ✅ |
| BUY.4 | TEP open: не ждать `window.TI_Tickets` (IIFE); fast-path click + preload script | Критический | ✅ `ac91b0f` на prod (2026-07-27) |
| BUY.4b | TEP: Fancybox/iframe = success; не fail/dismiss если виджет уже виден; wait buy-link | Критический | ✅ `b02f657` prod; smoke moscow/bridges/SPB river ~40–57ms, fail shell=0 |
| BUY.5 | TEP: lazy/shared embed на лендингах (убрать N×XHR `widget/embed`) | Высокий | ✅ `59fd4d8` prod deploy |
| BUY.6 | TEP: `TeplohodWidgetEmbed` всегда через `resolveTeplohodCheckoutUrl` (не raw purchaseUrl) | Средний | ⏳ latent defense |
| BUY.7 | Owner site-wide TEP link audit (landings/event/home/dinner/party) | Высокий | ✅ 2026-07-27: broken patterns не найдены; см. Diary |
| BUY.8 | Landing buy: TEP → CheckoutModal iframe; TC → native tcwidget (не iframe-в-iframe) | Критический | ✅ `988ae7e` |
| BUY.8b | TC: убрать CheckoutModal вокруг widgets/common (event/landing/CTA) | Критический | ✅ `988ae7e` |
| BUY.8c | TC: z-index - overlay ниже iframe shell (2147482990 / 2147483000) + liftTcWidgetLayers | Критический | ✅ `2ec37f4` prod |
| BUY.9 | Event page: TEP → CheckoutModal; TC → TcWidgetButton/slots (native) | Критический | ✅ `988ae7e` |

---

## Bridges SEO lead / on-page copy (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| BR.SEO1 | Night-bridges SEO lead: full width + абзацы + дедуп pad ×3; sanitize seed | Высокий | ✅ |
| BR.SEO2 | Проверка остальных landings с тем же pad в `seo-listing-texts` | Высокий | ✅ cleaned all + runtime sanitize |

---

## Bridges hero price range (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| BR.PR1 | Hero stats: real min-max `priceTo` + honest label; CTA only «от min» | Критический | ✅ `ae3c86c`/`6fe5ede`/`f02889e`; prod smoke `priceTo:2490`, hero `990-2 490 ₽` |
| BR.PR2 | Hero 4-stat strip (события/sold/4.7/диапазон) - owner lock, **не обрезать** | Критический | ✅ restored 2026-07-26 (откат ошибочного trim) |

---

## Seasonal landing H1 (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| SEO.NY1 | NY/seasonal H1: убрать «сегодня, дата»; festive framing без «точек обзора» | Критический | ✅ `c008a52`/`776cad9` prod smoke `/novyj-god` |

---

## IndexNow / Yandex Webmaster (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| SEO.IN1 | IndexNow: key file `/indexnow-key.txt` + `/{key}.txt` + notify Yandex/Bing on revalidate / article publish / deploy-warm (без спама каталогом) | Критический | ✅ `96fd5a9` / fix `683455d` / `d355b62`; prod key 200; Yandex IndexNow 202 |
| SEO.IN2 | Owner: добавить sitemap `https://daibilet.ru/sitemap.xml` в Яндекс.Вебмастер (если ещё нет) | Высокий | ✅ 2026-08-07 owner: сделано ранее; нет трафика |
| SEO.IN3 | Owner: Переобход TOP-15 URL после deploy (Вебмастер → Индексирование → Переобход) | Высокий | ✅ 2026-08-07 owner: сделано ранее; нет трафика |
| SEO.IN4 | Метрика уже на сайте (ID 106786540) - не трогать код; цели CV.2b отдельно | — | ✅ already |

---

## SEO technical launch checklist (2026-07-26)

Полная таблица: [seo-launch-checklist.md](./seo-launch-checklist.md). Lovable Category-модель / sample `[city]/[category]` - не принимать.

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| SEO.LC1 | Audit robots/sitemap/canonical/meta/H1/CWV vs owner checklist | Критический | ✅ |
| SEO.LC2 | robots: Disallow `/api/` (+ account/admin/login/reviews/write) | Высокий | ✅ |
| SEO.LC3 | Meta: реальный `priceFrom` only; убрать invent «от 100» в `landing-seo` | Критический | ✅ |
| SEO.LC4 | National + city×category metadata через `buildLandingMetadata` / `seo-listing-meta` | Высокий | ✅ |
| SEO.LC5 | Landing grid «Показать ещё» (page 48) + chip touch ~44px | Средний | ✅ |
| SEO.LC6 | Owner: Webmaster sitemap + reindex TOP | Высокий | ✅ 2026-08-07 = IN2/IN3; owner: сделано ранее; нет трафика |

---

## Event buy-card tariffs (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| BT.1 | Public event DTO: offers из page event, не cheapest-32 по meta-группе | Критический | ✅ |
| BT.2 | Smoke TC «Реки и каналы»: диапазон + все категории в buy-card | Критический | ✅ `98aec73` |
| BT.3 | Убрать open-date how-it-works из price block; вилка + категории | Критический | ✅ `b6648ae7` Deploy MSK **31300726933** BUILD_ID=`7Epi1rGECNBCNmjEXaPiF` |

---

## Clean & Contextual UI (2026-07-25)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CU.1 | Токены + tailwind: fonts, radius 16, soft shadow, graphite, surface muted, section spacing | Критический | ✅ |
| CU.2 | Шрифты Manrope + Inter (+ Source Serif legacy) в root layout (link; next/font follow-up) | Критический | ✅ |
| CU.2b | Self-host через next/font (Manrope+Inter+Source Serif) | Средний | ✅ |
| CU.3 | EventCard / EventCardHorizontal / showcase: Clean UI (фото, meta icons, цена+CTA) | Критический | ✅ |
| CU.4 | Home rails + `/events` grid/list gap и section-y | Высокий | ✅ |
| CU.5 | Header / SiteNav / footer под токены | Высокий | ✅ |
| CU.6 | Event detail page: воздух, meta, CTA | Высокий | ✅ |
| CU.7 | Catalog filters / chips toolbar | Средний | ✅ |
| CU.8 | CityCard / InstitutionCard / landing tiles | Средний | ✅ |
| CU.8b | Home format + thematic tiles: photo covers вместо градиентов | Высокий | ✅ |
| CU.8c | EventCard pin lines: адрес/город vs provider secondary | Высокий | ✅ |
| CU.8e | EventCard: meta под фото; слоты 2×2/3 в ряд, формат без weekday | Высокий | ✅ UI `618fdd6`; API slots 5 `LIST_SLOT_PREVIEW` |
| CU.8e2 | Catalog API: upcomingSlots 3→5 (hydrate+list-item), иначе чипы без primary = max 2 | Критический | ✅ `11ac786` prod |
| CU.8d | Home featured blog: white title on dark overlay | Высокий | ✅ |
| CU.9 | Commit + deploy для owner review | Критический | ✅ `17a56af` (p2) + `4a69541` (p3-4) |
| CU.10 | Blog surfaces + search overlay polish | Средний | ✅ |
| CU.11 | Micro-animations (hover translate/scale) | Низкий | ✅ |
| CU.12 | HorizontalScroll / ScrollRail: prev/next на md+ для home rails и `/podborki` | Высокий | ✅ `fac6863` (prod @`cf9ccfd`) |
| CU.13 | Home/podborki: на lg+ сетка всех превью (format 4 / thematic 3), без обрезки карусели; фото fallback | Высокий | ✅ `5d11482` |
| CU.2b | Self-host через next/font (Manrope+Inter+Source Serif) | Средний | ✅ |

---

## UX conversion fixes (2026-07-25)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.1 | City hub: CTA без «билетного оператора» + короткий SEO-блок | Критический | ✅ |
| UX.2 | `/events`: clamp page, conditional facets, empty-state reset | Критический | ✅ |
| UX.3 | `/events`: сквозной date picker + preset «2 недели» | Высокий | ✅ |
| UX.4 | Карточки: теги без площадки/судна; CTA «Купить билет»; цена «от» | Высокий | ✅ |
| UX.5 | Event detail: шаги покупки, open-date UX, тарифы/hint цены | Критический | ✅ |
| UX.6 | Landing SEO copy без «у оператора» (`seo-listing-texts`) | Средний | ⏳ |
| UX.7 | Home SERP: meta «Купите билеты» + nosnippet partner/footer; help FAQ soften | Критический | ✅ |
| UX.8 | Event description: H3/UL/абзацы (Teplohod marker-less + TC comma lists) | Критический | ✅ `f92b1d6` Teplohod; TC fix `f5d85f6` prod smoke 4×h3 + ul |

---

## Conversion surfaces pack (2026-07-25)

Стратегия по 5 поверхностям (owner brief). Fake sold/rating запрещены (HC.3). Owner lock 2026-07-25: см. `qa.md` (закрыто) + Diary.

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CV.1 | `/events` filters: sticky «Показать N вариантов» + live preview count | Критический | ✅ debounce 350ms; zero CTA: «Нет подходящих событий» (pastel gray) |
| CV.2 | `/events` grid: interstitial баннеры каждые 8 карточек → гиды/подборки | Высокий | ✅ soft tint + badge «Подборка»/«Из Блога»; compact mobile + click track |
| CV.2b | Настроить цель `catalog_interstitial_click` в Метрике + триггер/тег в GTM (маркетолог; frontend push уже есть) | Высокий | ✅ 2026-08-07 owner: цели сделаны ранее; нет трафика; код ✅ |
| CV.2c | Метрика: цель `product_card_click` (клик карточки события) - маркетолог создаёт JS-событие | Критический | ✅ 2026-08-07 owner: сделано ранее; нет трафика; код ✅ |
| CV.2d | Метрика: цель `select_tickets` (клик Купить / открытие виджета TC\|Teplohod) - маркетолог | Критический | ✅ 2026-08-07 owner: сделано ранее; нет трафика; код ✅ |
| CV.2e | Метрика: цель `purchase_success` - маркетолог может создать заранее; **код НЕ шлёт** без callback виджета / thank-you / webhook | Высокий | ✅ 2026-08-07 owner: цель опц. создана ранее; код ❌ ждёт callback |
| CV.2f | Webvisor SOP (маркетолог): первый месяц ежедневно 10-15 мин просмотр сессий воронки card→виджет | Высокий | ⏳ SOP в `docs/metrika-goals-checklist.md` §5 |
| CV.3 | Home: live stats (города/события/площадки) + «Как купить» 3 шага | Высокий | ✅ step3 email/SMS/phone; how-to-buy mt-20 + bg-slate-50; social proof = destinations с events (city+region, ≈stats.destinations) до CV.11 |
| CV.4 | Blog: native `[buy]` card (цена + CTA), без «сайт партнёра» | Высокий | ✅ live DTO + no-store; min `от N ₽` + fixed price width; единственный embed-путь (см. CV.8 🚫) |
| CV.5 | Sort «скидки» в каталоге | Средний | ⚠️ deferred: нет `discount`/`strikePrice` в DTO; ждать sync architecture sprint |
| CV.6 | Home video hero (HC.10) | Средний | ⚠️ deferred: photo rotator KEEP; stock muted loops 🚫; ждать продакшн-съёмку; реальные МСК/СПб WebP/AVIF |
| CV.6b | Home hero multi-city rotator (не только СПб/Исаакий) | Высокий | ✅ superseded CV.6c: landmarks сняты |
| CV.6c | Home hero tourist emotions (people-first, не landmarks) | Высокий | ✅ `home/hero-emotion-0{1-6}.jpg` + HeroBanner migrate `20260726010000` |
| CV.7 | Podborki listing: inline buy на плитках | Низкий | ⏳ покупка уже на CHPU landing |
| CV.8 | Blog: auto related events по тегам статьи | Средний | 🚫 rejected: misfire риск убивает native conversion; только manual `[buy]` / admin field |
| CV.8a | City hub «Зачем ехать»: related sessions без quality fallback + topic intersect | Высокий | ✅ `matchArticleSessions` empty-on-miss; standup≠tours; tests |
| CV.8b | City hub cards: bus/river vertical gate (не подсовывать теплоходы в автобусную статью) | Высокий | ✅ exclusive topics + vertical require; tests `moskva-avtobusnaya-obzornaya` |
| CV.9 | Venue logistics «как найти» (эпик; owner иногда зовёт «Спринт CV.5» - **не** путать с CV.5 discounts) | Высокий | ✅ `714822c` CV.9a-d; OSM→Yandex unify deferred; [venue-logistics-spec.md](./venue-logistics-spec.md); prod = migrate+deploy |
| CV.9a | Prisma: `Venue.metroStation` / `wayToFind` / `parkingInfo` + migrate | Высокий | ✅ `20260725120000_venue_logistics` |
| CV.9b | Admin CMS: секция «Логистика» в Next `/admin/venues/[id]` + PATCH (`normalizeVenuePayload` / `updateAdminVenue`); address sync-only readonly | Высокий | ✅ |
| CV.9c | Public DTO + блок логистики на venue page (`VenueLogisticsBlock`; empty hide если нет address и трёх полей); OSM keep | Высокий | ✅ + owner: hide empty metro/way/parking independently |
| CV.9d | `/events/[slug]`: venue click → modal (логистика + Yandex iframe при coords / external button иначе); slim SSR fields; fallback «Страница площадки» | Средний | ✅ |
| CV.9e | Guard: null/whitespace `metroStation` → no metro UI (иконка+label); same for wayToFind/parking; LocationCard без fake Train | Высокий | ✅ |
| CV.9f | Venue route CTA: Google Maps → 2ГИС (`build2gisRouteUrl`, lon,lat) | Средний | ✅ 2026-07-27 |
| CV.10 | Mood chip «Свидание» на `/podborki` (рядом с «Для двоих») | Низкий | ⏳ |
| CV.11 | Social proof «проданные билеты» (TC Order paid aggregate) | Средний | ⚠️ deferred: только после реального order-aggregate; hardcoded fake 🚫; до - каталожные counts (CV.3) |
| CV.12 | Catalog card dates: human mask `25 июля, суббота в 07:15` | Высокий | ✅ open-date без фейковых часов; не путать с CV.5 (скидки) |

---

## Landing master template / CRO (2026-07-26)

Эталон: Night Bridges. Инкрементально вытаскивать паттерны в shared hooks/components. План: [landing-master-template-plan.md](./landing-master-template-plan.md).  
GPT-брифы на контент-дыры: [landing-content-gpt-briefs.md](./landing-content-gpt-briefs.md).  
Owner-locked порядок: Hero → Советы → Расписание → Как выбрать → FAQ → Attention → Отзывы (только real).  
Запреты: no UnifiedEventCard rewrite каталога; no `app/[city]/[category]`; no fake ★; no prisma rating migration без Review aggregate; no clone palace-bridge hours на NY.

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CV.L-Buy | Restore clickable landing buy CTAs (TC trigger overlay) | Критический | ✅ `TcWidget` off-screen + `pointer-events:none` |
| CV.L-Hero | Hero-first: bridges selling strip на все профили; NY countdown+CTA; **4 stats обязательны** | Критический | ✅ 4-col strip restored + NY layout |
| CV.L-Order | Reorder секций к owner 1-7 на всех профилях | Высокий | ✅ CW/Tips before schedule; howTo→FAQ→checklist→reviews |
| CV.L-Content | Контент tips/how-to/FAQ/checklist по GPT briefs (owner assign) | Высокий | ✅ packs A-G wired (`landing-content-packs` + CW + bridges/NY) |
| CV.L1 | Micro-badges из tags/subcategories/title на schedule rows + EventCard(`landingActions`); dinner badge chips; скрыть fake ★ на этих поверхностях | Критический | ✅ helper `landing-card-badges.ts` |
| CV.L2 | Date chips UX для concert/standup (sticky horizontal, slots без reload) | Высокий | ⏳ chips уже есть на default; polish |
| CV.L3 | River section tabs day/night/dinner (bridges patterns → shared) | Высокий | ⏳ |
| CV.L4 | ContextWidget config по slug (owner matrix: planetarium/rooftops/country-tours/river-party/family-kids/new-year); text-first chips; no Prisma Category.widgetData | Средний | ✅ thin |
| CV.L4b | ContextWidget follow-up: yards / dinner / standup / museums | Средний | ⏳ |
| CV.L5 | Empty-state cross-sell на соседние CHPU / city hub | Высокий | ✅ `LandingEmptyState` + related hits при 0; catalog empty polish |
| CV.L5b | Optimistic UI: favorites heart + verify landing filter chips local | Средний | ✅ favorites local-first optimistic; chips уже client filter |
| CV.L6 | Map start points (Yandex) yards/bridges - после logistics | Низкий | ⏳ later |
| CV.L-debt | Cleanup legacy `LandingReviews` ниже fold; hero 4-stat strip = owner-approved selling (не debt) | Средний | ⏳ Reviews hide until real; strip ✅ |

---

## SEO duplicate titles (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| SEO.T1 | Уникальные title/OG для `/legal` `/privacy`; fix home og inherit | Критический | ✅ |
| SEO.T2 | `/events` + filters: dynamic title + noindex на query | Критический | ✅ |
| SEO.T3 | Event twins: date/venue disambiguator в title | Высокий | ✅ |
| SEO.T4 | `not-found` metadata; HOME/social-preview без em dash | Высокий | ✅ |
| SEO.T5 | Deploy + revalidate / переобход Вебмастер | Критический | ✅ 2026-08-07 owner: переобход сделан ранее; нет трафика |

---

## UX: scroll to top (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| ST.1 | Floating «Наверх» в `SiteLayout` (хабы/блог/каталоги/home) | Высокий | ✅ |

---

## Hero conversion pack (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| HC.1 | `/` H1 «Куда сходим в [City_Пр]?» + chips + CTA «Найти билеты» | Критический | ✅ |
| HC.2 | `/events` strip: гео H1 + матрица Когда/Что + trust (без photo) | Критический | ✅ → HC.2b |
| HC.2b | `/events` UX: единая search bar, одна лента категорий, быстрые в Фильтры | Критический | ✅ |
| HC.3 | Landing trust strip (email / возврат по правилам / e-вход); убраны fake sold/rating | Высокий | ✅ |
| HC.4 | `/locations` гео H1 + type chips в hero; emoji убраны; withMap сохранён | Высокий | ✅ |
| HC.4b | `/locations` H1 «Локации и точки сбора» (каталог, не tourist CTA) | Высокий | ✅ |
| HC.5 | `/venues` гео H1 + format toggles в hero; photo сохранён; emoji убраны | Высокий | ✅ |
| HC.6 | `/cities` live search suggestions + tabs Популярные/А-Я | Высокий | ✅ |
| HC.7 | `/podborki` emotional H1 + mood chips + seasonal banner; emoji presets off | Высокий | ✅ |
| HC.8 | `/blog` «Материал недели» + newsletter UI + `/api/public/newsletter` stub | Высокий | ✅ |
| HC.9 | Event detail: CTA крупнее; scarcity только из real `vacant` | Средний | ✅ partial |
| HC.10 | Home video muted loop ≤5MB | Низкий | ⚠️ deferred (owner 2026-07-25): photo rotator KEEP; stock muted loops 🚫; ждать продакшн-съёмку (=CV.6) |
| HC.11 | `/venues` «Рядом со мной» geolocation sort | Средний | ⚠️ P2 нет lat/lng на VenueCatalogCard |
| HC.12 | `/events` featured split / search preview / tourist tags | Средний | ⚠️ P2 |
| HC.13 | Landing «бесплатная отмена 24ч» | - | 🚫 запрещено политикой (возврат у организатора) |

---

## Catalog covers policy (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CC.1 | Policy: нет Event/Venue без cover; после TC/TEP import - promote CDN, иначе generate | Критический | ✅ `4f11520` |
| CC.2 | Fix lean venue fallback: принимать `/images/events|venues/*` (не только https) | Критический | ✅ `4f11520` |
| CC.3 | `scripts/ensure-catalog-covers.js` + hook в `tc:sync` / `tep:sync` / worker | Критический | ✅ `4f11520` |
| CC.4 | Prod backfill: promote + generate пустые hubs (Sortavala и др.) | Критический | ✅ venues promote 939 + gen 9; events 55 (11 groups); `no_hero=0` / `no_image=0` @`5fcc79d` |
| CC.5 | Prod audit 2026-07-30: empty/city=0; 24 evt-auto (8→CDN venue, 16 files on disk); Volna→TEP866 | Критический | ✅ data+API on MSK |
| CC.6 | Backend: durable CDN/venue before ephemeral `evt-auto` in `pickFirstUsableEventImageUrl` | Высокий | ✅ code on MSK API |
| CC.7 | Frontend EventCard city fallback on SafeImage error | Высокий | ✅ `205f36c` SPB build → MSK `BUILD_ID=upzsYYlMO145GFc83zNSH` |
| CC.8 | MSK egress: TEP sync + `next/font` Google Fonts (rebuild web) | Высокий | ⏳ blocked INC.504.1; web rebuild = **MSK-only** (SPB workaround retired) |

---

## Home rails cover dedupe (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| HR.1 | Taboo Harry Potter + basename cover skip (`4e18b60`) | Критический | ✅ |
| HR.2 | Content fingerprint (ETag) + multi-key URL normalize; refill gaps | Критический | ✅ `ab1dc94` prod |
| HR.3 | Home TTFB: убрать `connection()` + fingerprints в `unstable_cache` 300s | Критический | ✅ `1d0ed0e` prod |
| HR.4 | `/events` `/podborki` city hub: убрать `searchParams` no-store; podborki meta cache | Критический | ✅ `bf97706` prod (`/` `/events` `/podborki` → ○ ISR; city hub ещё ƒ) |

---

## Hero UX (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| H.1 | Shared `HeroLayout` + `HeroMedia` (LCP priority) | Критический | ✅ |
| H.2 | Home imageOverlay/rotator + Prisma `HeroBanner` + admin toggle | Критический | ✅ `72ea839` prod migrate+deploy |
| H.3 | `/cities` split + RF map hover + top tiles ISR 1h | Высокий | ✅ |
| H.3b | `/cities` top tiles + «Популярные города»: max-w-5xl + items-stretch (как podborki) | Критический | ✅ `d1ccd8a` prod |
| H.3c | `/cities`+/`podborki`: H1 и row на одной оси `HeroLayout` max-w-5xl; blog featured = container width | Критический | ✅ |
| H.3d | `/cities` imageOverlay photo hero + search (как venues); tiles/map ниже на max-w-5xl | Критический | 🚫 owner: откат к `minimal`+tiles/map (до `8ec241c`) |
| H.3e | `/cities` hub mini-tags (top landings) + ISR 86400 | Критический | ✅ `44887fb` |
| H.3f | `/cities` hubTags: 3 чипа в одну строку (nowrap + шире tiles vs aside) | Высокий | 🔄 |
| H.3g | `/cities` top tiles: отдельные daytime preview (`cities/top/*.jpg`), каталог без изменений | Критический | ✅ `fbbbaf7` prod |
| H.4 | `/podborki` featured+trending equal-height, centered `max-w-5xl` | Высокий | ✅ `533d40a` prod @`d1ccd8a` |
| H.4b | `/podborki` tag soup → `LandingCategory` + carousels (by-type/for-whom/seasonal) | Критический | ✅ `30e87fe`+`44887fb` |
| H.5 | `/venues` dark imageOverlay + search | Средний | ✅ MVP |
| H.5b | `/events` imageOverlay photo hero + search/city/date (как venues) | Критический | 🚫 owner: откат к `SectionPageHero` strip (до `47430af`) |
| H.6 | `/locations` photo hero (imageOverlay) как venues; map не в hero | Критический | 🚫 owner: откат к `withMap`+RussiaMap (до `47430af`) |
| H.7 | Video loop asset для home | Низкий | ⚠️ deferred (owner 2026-07-25): rotator KEEP; stock loops 🚫; =HC.10/CV.6 |
| H.8 | Blog Featured Hero + interactive list H1 + «Свежее»×3 + min price | Высокий | ✅ `b45995c` prod @`c39d124` |
| H.8b | `/blog` featured+«Свежее»: max-w-5xl composition + square thumbs | Критический | ✅ `90f6151` prod @`d1ccd8a` |
| H.8c | `/blog` list hero → imageOverlay + search/chips внутри (уровень venues) | Критический | 🚫 owner: откат к interactive strip (до `8ec241c`; «статьи») |
| H.8d | `/blog` city rank (header) + cursor pagination + article canonical | Критический | ✅ `44887fb` |
| H.8e | `/blog` client: base64url Buffer crash → btoa/atob cursor | Критический | ✅ `c716a4e` prod |
| H.8f | `/blog` afisha promo: цена/события/chips по geo; full-width после 3 статей фида | Критический | 🚫 owner: не убирать из угла |
| H.8f-fix | Blog afisha promo: split server `resolveBlogSidebarPromoMap` (pg out of client) | Критический | ✅ `d47c300` prod |
| H.8g | `/blog`: swap «Свежее»↔Featured; rich Афиша в углу под Fresh; убрать mid-feed strip | Критический | ✅ `9be0a98` prod @`ab1dc94` |
| H.8h | `/blog` featured/large: длиннее excerpt, без mt-auto/flex-1 дыры над CTA | Критический | ✅ `55aaa9d` prod @`5fcc79d` |
| H.8h2 | `/blog` default/small cards: без flex-1 на line-clamp (ложные «...» mid-phrase) | Критический | ✅ `a0a12b9` prod |
| H.8i | `/blog` topic chips: smooth scroll к `#blog-feed` + явный active chip | Высокий | ✅ `292c92b` prod |
| H.9 | Ultrawide heroes: min-h + face-safe object-position (home+catalog HeroMedia) | Критический | 🚫 reverted (гигантский hero) |
| H.9b | Ultrawide: альтернативные 21:9 кадры (`*-uw.jpg`) + `<picture>`, без min-h inflation | Критический | 🚫 owner: увеличивало фото; откат к desktop landscape |
| H.9c | Ultrawide: убрать `*-uw` art-direction; тот же кадр + мягкий object-position | Критический | ✅ `982d89c` prod |

---

## Catalog perf (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| P.V1 | `/venues`+`/locations`: lean Prisma `_count` вместо session hydrate для плиток | Высокий | ✅ `9af3910` |
| P.V1b | Regression: lean hub дропнул event-image cover fallbacks → пустые карточки `/venues` | Критический | ✅ `f7e0071` prod |
| P.V2 | Suspense + pulse skeletons на фильтрах (city/type), без full-page loader | Высокий | ✅ `9af3910` |
| P.V3 | `Venue @@index([title])` + migrate `20260724030000_venue_title_search_index` | Средний | ✅ `9af3910` (migrate on deploy) |
| PERF.1 | Prisma singleton `globalThis` + shared pg Pool (`@daibilet/db`) | Критический | ✅ `6ce435a` |
| PERF.2 | Lean catalog DTOs + `unstable_cache` 600s для podborki/venues/locations (Redis follow-up) | Высокий | ✅ partial; landings rule-match sessions ещё в DTO |
| PERF.3 | Header search: pg_trgm + synonyms (Meilisearch P2) | Высокий | ✅ `125feab` |
| PERF.3b | Header search: не отдавать past/non-saleable events (404 trap) | Критический | ✅ 2026-07-27 |
| PERF.4 | Meilisearch / full-text service | Средний | ⚠️ P2 deferred |
| PERF.5 | Unify legacy `createDb` Pool with Prisma shared Pool | Средний | ⏳ |
| H.6b | `/locations` pin map: flat `{id,lat,lng}` + map-tip API | Высокий | ⚠️ API оставлен; UI → `RussiaMap` до реальной карты |

---

## Инциденты prod (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| I.1 | Пустые главная + `/events`: stats 500 (`destination.name` on null) → empty home cascade | Критический | ✅ hotfix `dto.js` + restart API/web |
| I.2 | Web follow-up: SiteLayout Suspense fallback + CatalogShell SSR keep (rebuild) | Высокий | ⏳ в worktree `daibilet-push` |
| I.3 | Telegram OG: WebpageBot видит, чаты нет; площадки без title/desc | Критический | 🔄 nginx→social-preview + venue twitter ✅ `1c81cdf`; **блокер: AAAA всё ещё в DNS** |
| I.4 | Infinite full-page reload (`/blog`+): ChunkLoadRecovery матчил hydration #418 по chunk filename | Критический | ✅ `85b8cfe` + deploy-prod-next |
| I.5 | Chunk 400 / `cities/%5Bslug%5D`: mid-build overwrite `.next` + static via Node proxy | Критический | ✅ `ee8daad` + deploy-prod-next |
| UI.1 | Единый нейтральный strip шапок: `/events`, `/blog`, city hub, `/podborki` (+ intents) | Высокий | ✅ `fc5e309` prod @`db34d03` |

---

## Продуктовый фокус (2026-07-22) — SEO-листинги приоритетнее блога

**Сдвиг приоритета:** обычные статьи блога вторичны; фокус на **ЧПУ SEO-листингах** category×city (+ intent `/podborki/...`).

## Решение владельца (2026-07-23; lock 2026-07-25)

- **F4 admin → Next** - ✅ **done (F4.6)**; Vite `/legacy` hard-retired. Канон: Next admin на `admin.daibilet.ru`.
- Launch-фокус: качество landing matching + актуальность событий; landing rules SoT = `landing-rules.ts` (F5.2 ✅; dual-edit снят).
- Finance contour / ЛК поставщиков отложен: продукт ещё не готов. Изменения Codex finance не трогаем.
- Blog anti-spam LOCK: хаос-темп гидов при 80–90% index; 1 пн-колонка/нед; Pack B = новый угол, не rewrite 9 longforms.
- SEO LOCK: TOP-15 editorial focus без URL churn; `MIN_LISTING=6`; CHPU density; телефон только после 8-800.

| # | Задача | Приоритет | Статус | Ownership |
|---|--------|-----------|--------|-----------|
| SEO.1 | Формулы Title/Description category×city (`seo-listing-meta.ts`) | Критический | ✅ | агент |
| SEO.2 | On-page SEO тексты TOP seed (~18 шт., 1000–1200) под сеткой | Критический | ✅ | агент (seed); владелец - утверждение/правки |
| SEO.3 | Thin pages: `noindex,follow` если &lt; 6 офферов; sitemap filter | Критический | ✅ | агент |
| SEO.4 | MULTI_CITY: standup / family-kids / concerts / active-sport + SPB/MSK/Kazan | Высокий | ✅ | агент |
| SEO.5 | Intent ЧПУ `/podborki/{intent}` (+ city) + preset links | Высокий | ✅ | агент |
| SEO.6 | `/contacts` + footer/sitemap trust | Высокий | ✅ | агент |
| SEO.7 | Event trust strip | Средний | ✅ | агент |
| SEO.8 | TOP-15 launch set: водные, стендап, экскурсии, культура, intent; «крыши» только СПб | Высокий | ✅ 2026-07-23; **2026-07-31 amend:** rooftops national (снят SPb-only URL lock) | владелец утвердил, агент внедрил; editorial focus LOCK, без URL churn |
| SEO.8a | Editorial polish текстов TOP-15, в первую очередь новые `walking-tours`, `country-tours`, `exhibitions`, `unusual-theatres`, `excursions`, `rooftops` | Высокий | 🔄 seed готов, нужна редакторская вычитка | владелец + агент |
| SEO.8b | `country-tours`: требовать экскурсионный и направленческий сигналы, исключить культурные события по топонимам | Высокий | ✅ 2026-07-23; **widen 2026-07-31** топонимы+тур/выезд | runtime SoT `landing-rules.ts` |
| SEO.8c | Аудит всех landing rules: исключить мусорные попадания, сверить сэмплы и runtime `dto.js` | Критический | ✅ 2026-07-31 | bus/country/rooftops/walking widen ✅ unit; owner hand-smoke; museum-one-off landings **rejected** |
| SEO.8d | Owner product lock: landings = top queries; no single-museum/franchise; no бесплатно; city-scoped top-query после match smoke | Критический | ✅ strategy 2026-07-31 | Diary + Tasktracker; next proposals text-only |
| SEO.8e | Widen match: bus-tours / country-tours / rooftops (+ light walking); deploy API MSK + hand-smoke | Критический | ✅ 2026-07-31 web `mg7oABb2zIKygPpGUlRlV`; `/progulki-po-krysham/moscow` 200 | bus 17→48; country 5 (catalog thin); rooftops 6+label; walking 46→68; stats uncapped |
| SEO.9 | Trust contacts без телефона (launch policy) | Средний | ✅ политика: футер email only; реквизиты off `/contacts` → `/requisites`; YM Webmaster/Business по ИНН/ОГРНИП | **владелец** (верификация) / агент (UI ✅) |
| SEO.9b | Телефон 8-800 в header + footer (+ contacts), когда номер одобрен | Высокий | 🚫 blocked: ждём утверждённый 8-800 у владельца; ASAP после approve | **владелец** → агент UI |
| SEO.11 | Порог индекса SEO-листингов | Критический | ✅ `MIN_LISTING_OFFERS_FOR_INDEX = 6` (не поднимать; soft-цель редакторов = 10) | агент |
| SEO.12 | Внутренняя перелинковка: футер «Популярные направления», event breadcrumbs → CHPU, «Смотрите также» на листингах | Высокий | ✅ 2026-07-23 | агент |
| SEO.13 | SSR JSON-LD: BreadcrumbList (listing+event) + ItemList только на CHPU landings (non-empty) | Высокий | ✅ 2026-07-23 | агент |
| SEO.14 | `/podborki` tag cloud → CHPU landings/intent вместо `/events?q=` | Высокий | ✅ 2026-07-23 (топ-24: 23 CHPU / 1 fallback) | агент |
| SEO.15 | Казань/Екб: падежи + meta-шаблоны listing/hub/event + thin cards (6–7) | Критический | ✅ 2026-07-23 | агент |
| SEO.16 | Ручной переобход TOP-15 в Яндекс.Вебмастер / GSC | Высокий | ✅ 2026-08-07 owner: сделано ранее; нет трафика | **владелец** |
| SEO.17 | Sitemap: intents без thin (&lt; 6); smoke prod index + landings/static | Высокий | ✅ 2026-07-23 @`0fe5140`+prod | агент |
| SEO.18 | План 20-30 путеводителей → CHPU (`docs/seo-guide-articles-plan.md`) | Высокий | ✅ 2026-07-23 batch #1 = 10 Казань/Екб | агент |
| SEO.19 | Batch #1 генерация/размещение 10 гидов (GPT → MD → blog) | Высокий | ⏳ пачка A+МСК/СПб owner rewrite ✅; хаос-календарь ✅; Pack B = новый commercial угол (top5/events), не rewrite 9 longforms | владелец + агент |
| SEO.19a | Blog mid-article плашка `[NOTE]` (`BlogArticleNote`) | Высокий | ✅ 2026-07-23; hotfix nested `[link](url)` in text= | агент |
| SEO.19f | Blog markdown SEO: links/H2/NOTE harden + price accents + tests | Критический | ✅ `4f6cdb3` prod | агент |
| SEO.19b | Batch A: уникальные cover вместо city-placeholder (3 jpg) | Высокий | ✅ 2026-07-23 | агент |
| SEO.19b2 | МСК/СПб: уникальные cover ×6 + magazine `/blog` hero | Высокий | ✅ 2026-07-23 | агент |
| SEO.19b3 | Правило: cover обязателен до PUBLISHED; догенерация missing (bylinnyy ×2) | Критический | ✅ 2026-07-23 | агент |
| SEO.19c | Публикация гидов: хаос-график + микс городов; `publishedAt` schedule filter | Высокий | ✅ 2026-07-23; safety: throttle 1/day только если mass «малоценная» (owner Webmaster/GSC) | агент |
| SEO.19d | Owner anti-AI rewrite 9 гидов + upsert по графику | Высокий | ✅ 2026-07-23; LOCK: повторный rewrite 9 longforms не делаем | владелец + агент |
| SEO.19e | Антиспам: пн-колонки + template_type long/top5/events + safety индекс | Высокий | ✅ LOCK 2026-07-25: 1 колонка/нед; HIDDEN backlog не жечь быстрее | агент |
| SEO.20 | Listing garbage audit: daily scan saleable public events (encoding / stopwords / CAPS / HTML) → Telegram | Высокий | ✅ код `pnpm audit:listings`; ⏳ cron 04:00 на prod (owner) | агент |
| SEO.21 | Tags dictionary monthly sprint: analyzer (>6–8 live events + Wordstat >0) → admin one-click promote query-fallback → CHPU + meta + sitemap (не ad-hoc) | Средний | ⏳ monthly ops | агент + владелец (approve) |
| SEO.10 | Editorial polish SEO-текстов (убрать шаблонный хвост); URL/mapping TOP-15 не трогать | Средний | ⏳ | владелец + агент |
| P.1 | AI / статьи блога | Средний | ⚠️ deferred vs SEO.1–SEO.7 | — |

---

## Продуктовый фокус (2026-07-19)

Стратегия: не рекламировать «пустышку» — сначала витрина (хабы + контент + базовый финконтур).

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| P.1 | **AI / статьи** — контент, ИИ-колонки, blog ops | Критический | 🔄 |
| P.1-SPB-Routes | Пять PUBLISHED companion-гидов к сценариям СПб: центр, ВО, Петроградка, Коломна, Владимирская; images + `blogSlug` presets | Высокий | ✅ 2026-08-05 |
| P.2 | **City hubs** — усиление `/cities/{slug}` (SEO + контент) | Критический | 🔄 |
| P.2a | Brief-описания 14 адмцентров в `CITY_INFO` (hero/SEO) | Высокий | ✅ 2026-07-19 |
| P.2b | Brief ещё 9 адмцентров (Чита…Хабаровск) в `CITY_INFO` | Высокий | ✅ 2026-07-19 |
| P.2c | Предложный падеж хабов: «в Мурманске», не «в городе Мурманск» | Высокий | ✅ 2026-07-19 |
| P.2d | SEO title city hubs: «{City}: афиша… на сегодня, {date}» (именительный) | Высокий | ✅ `2079e3a` prod proof SPB |
| P.2e | **Wireframe city hub v1** — IA/UX фазы 1 (sticky tabs, афиша выше, FAQ accordion) | Высокий | ✅ [city-hub-wireframe-v1.md](./city-hub-wireframe-v1.md) |
| P.2f | Реализация wireframe v1 в `apps/web` (`CityPageView`) | Высокий | ✅ `d877813` prod |
| P.2f1 | City hub chips: счётчики = выдача (не full-city); лёгкие чипы без «Популярных тегов» | Высокий | ✅ `721bf10` prod |
| P.2g | **Wireframe city hub v2** — IA фазы 2 (city-specific направления, конфиг) | Высокий | ✅ [city-hub-wireframe-v2.md](./city-hub-wireframe-v2.md) |
| P.2h | Реализация wireframe v2 в `apps/web` (плитки направлений, top-N venues, sights CTA) | Высокий | 🔄 пилот СПб/Мск/Сочи/Казань 2026-07-30 |
| P.2i | **Editorial hub template** (Lovable moodboard) — параллельный visual `?hub=editorial` | Средний | ✅ `6efe0d8` prod |
| P.2j | City hub affiche: убрать «Популярные теги»; компактные date/category chips | Высокий | ✅ `5aa84d3` prod |
| P.2k | City hub affiche UX: скрыть подзаголовок счётчика; date+category в одну строку (desktop); убрать «Стоит внимания» (дубль афиши) | Высокий | ✅ `2808ed5` prod proof murmansk |
| P.2l | Адрес UI: «Проспект Кольский» → «Кольский проспект» (нормализатор прилагательных + hub venues) | Средний | ✅ `8d65740` prod + DB |
| P.2m | City hub chips: визуальный gap между группами date и category (`gap-x-4`) | Средний | ✅ `9a36f48` prod |
| P.2n | City hub `#directions`: не рендерить landings/categories с count=0 (без пустых «Мероприятия»/«Развлечения») | Высокий | ✅ `044e441` prod proof rostov-na-donu |
| P.2o | **City hub × blog phase 1** — editorial тизеры (about/affiche/sights/practice/more), sticky 5 tabs | Высокий | ✅ `bb65e4a`; picker harden `2d6bd7f` |
| P.2p | **City hub × blog phase 2** — mini-row до 3 сессий на тизере (keyword match по уже загруженным sessions) | Высокий | ✅ `824bafc` |
| P.2q | **City hub × blog phase 3** — CMS `Article.citySlug`, фильтр API по городу, picker CMS-first | Высокий | ✅ 2026-07-22 |
| L.1 | Catalog API: public Cache-Control + Next `getCachedCatalog`; favorites `?ids=`; landing skip no-store; page sizes 50/100 | Критический | ✅ `bb65e4a` prod; nginx proxy_cache+limit_req ✅ |
| L.2 | Images: `next/image` + WebP/AVIF (`SafeImage`), remotePatterns TC/TEP/S3, sharp, hot-path cards/heroes | Высокий | ✅ `9646968`; follow-up: GCS hostname + TEP dirtyAlias placeholder (код в deploy-fix, ждут deploy) |
| L.2b | Prod `/_next/image` 400/504: `googleapis` remotePatterns; TEP без dirtyAlias; cold-cache после UX `33df97f` | Критический | 🔧 код готов, нужен deploy |
| R.4b | Reviews `GET .../events/:publicSlug` 404 на кириллическом DB slug (TEP) | Высокий | 🔧 `resolveReviewEvent` → `evt_tep_{id}` + publicSlugLite |
| L.3 | TC catalog sync load: nightly timer + flock/nice/ionice; `--ids` ProviderLink filter; RawImport payloadHash skip; light warm | Критический | ✅ `efc8459` prod; timer next 03:20 UTC |
| P.3 | **Finance contour / ЛК поставщиков** — базовый контур | Высокий | ⏳ |
| P.4 | **Реклама / paid acquisition** — до готовности витрины | — | ⚠️ deferred |
| P.5 | **Allowlist городов** — адмцентры с saleable → standalone; остальные → cityToRegion (не «дыра») | Высокий | ✅ 2026-07-19 geo policy |

---

## Geo / destinations (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| G.1 | Fix `isPublicRegionName` для «Республика …» (префикс, без `\b`) | Критический | ✅ |
| G.2 | Челны → Республика Татарстан под карточкой Казани | Критический | ✅ |
| G.3 | Expand standaloneCities адмцентрами с saleable | Высокий | ✅ |
| G.4 | Expand cityToRegion для не-адмцентров (Тольятти, Сортавала, …) | Высокий | ✅ |
| G.5 | Docs + prod deploy geo | Критический | ✅ `6f0fcf7` prod |
| G.6 | Хвост allowlist 63 → cityToRegion; зарубежье (`foreignCities`: Батуми, Осака) | Высокий | ✅ `a63d612` prod (HEAD `c312095`) |

См. [Project.md](./Project.md) § allowlist, [geo-excluded-cities.md](./geo-excluded-cities.md), Diary 2026-07-19.

---

## CI (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CI.1 | `validate-build-test`: pnpm до `setup-node` cache | Критический | ✅ `4c09cdb` |
| CI.2 | Backend typecheck: exactOptional / indexed access | Критический | ✅ `7cc58ac` |
| CI.3 | `web:build` без Postgres: empty home fallback | Критический | ✅ `0f45004` CI green |

---

## Sync / TC (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| S.1 | `tc:sync --ids=...` on-demand upsert (+ `--dry-run`) | Высокий | ✅ `6cc137d` prod |
| S.2 | Admin `POST /api/v1/tc/sync?ids=` | Средний | ✅ `6cc137d` |
| S.3 | Docs + prod smoke 2 ids | Высокий | ✅ +2 ESL |

---

## Event page / UX (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| E.1 | Description: списки `✅` / `•` / `-` → `<ul><li>` + sanitize | Высокий | ✅ 2026-07-19 @38e8d12 prod proof seks-v-sssr |
| E.2 | Unit-тесты обоих кейсов (checkmark + организационные детали) | Высокий | ✅ |
| E.3 | Prod: `ReferenceError: cleanDisplayText is not defined` (re-export без local import в `event-page-utils`) | Критический | ✅ 7cdd4cf + rebuild 38e8d12 |
| E.4 | Теги на event page: dedupe chips (tags∪subcategories) по нормализованному label | Высокий | ✅ 2026-07-19 @9658b9f prod proof kino |
| E.5 | Event page display time = TZ региона события (как виджет), не forced MSK | Критический | ✅ 2026-07-19 @9f1f744 prod proof Уфа 18:00 |
| E.6 | Hero CTA показывает только минимальную цену `от`; buy-card сохраняет диапазон точных категорий | Высокий | ✅ 2026-07-23 |

---

## Блог / контент (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| B.1 | Формат «Редакция» (`docs/ai-journalists/00-editorial.md`) | Высокий | ✅ |
| B.2 | Rewrite 4 гидов + SEO/ссылки/`[buy]` | Высокий | ✅ |
| B.3 | Hide `spb-razvod-mostov-kakoi-reis` + 301 → rooftop | Средний | ✅ → **отменено** (статья снова PUBLISHED) |
| B.4 | Commit → deploy-prod-next → `blog:upsert` ×4+hide | Критический | ✅ |
| B.5 | Пакет 10 редакционных статей (verbatim + buy + upsert) | Критический | ✅ |
| B.6 | Вернуть `spb-razvod-mostov-kakoi-reis` PUBLISHED, снять 301 | Высокий | ✅ |
| B.7 | Multi-event: убрать `[buy]`, только `/events` ссылки; цены/meta по prod; Cyrillic READY slug | Критический | ✅ |
| B.8 | Первая колонка Анны «Город крупным планом»: `muzyka-v-osobnyakah-spb` | Критический | ✅ |
| B.9 | Admin: PATCH городов (City SEO/slug/title) + UI | Высокий | ✅ 2026-07-19 |
| B.10 | Admin: дата публикации статей (`publishedAt`) в UI | Высокий | ✅ 2026-07-19 |
| B.11 | Soft-links блога: каталог → лендинги (jazz/standup/river/bus) | Высокий | ✅ 2026-07-19 upsert+revalidate |
| B.12 | Вернуть фото в статьи: distinct `-inline.jpg` + coverImageUrl + upsert/deploy | Критический | ✅ 2026-07-19 |
| B.12b | Inline 1-2 в каждую статью (правила + 9 SEO-гидов без body images) | Критический | ✅ 2026-07-24 `@b1b23b5` + upsert |
| B.12c | Blog inline UI: увеличить float + 1-е фото full-width (не thumb 14.5rem) | Высокий | 🔄 UI ready, нужен deploy |
| B.13 | Home SEO: title без цифр + description шаблон с живыми counts хабов | Высокий | ✅ 2026-07-19 @789ee67 |
| B.14 | Blog: defer первого `[image]` после 2 абзацев (не сразу под hero) | Высокий | ✅ 2026-07-19 @8ba0a05 |
| B.15 | TC: past dated slug → не «открытая дата» / не «Мероприятие прошло»; meta-siblings | Критический | ✅ e9d72f1 + blog slug refresh |
| B.16 | Home: Teplohod signed S3 covers expire → stabilize to api.teplohod.info proxy | Критический | ✅ 2026-07-19 hotfix prod |
| B.17 | Регрессионные unit-тесты B.15+B.16 (image URL + fake open-date / meta purchase) | Высокий | ✅ 2026-07-19 |
| B.18 | Колонка Артура «На вкус»: `kazan-na-vkus-master-klassy` (МК Эчпочмака + гастроужин) | Критический | ✅ 2026-07-22 @93d3a07 + upsert |
| B.19 | Колонка Елены: `spb-s-rebenkom-v-dozhd` (СПб с ребёнком в дождь) | Критический | ✅ 2026-07-22 upsert + revalidate |
| B.20 | `/blog` magazine layout: listing asymmetric + article journal (serif/dropcap/quotes/sidebar) | Высокий | ✅ `a4ecab6` |
| B.21 | Blog typography: откат Source Serif → site `font-display`; убрать dropcap | Критический | ✅ `230ebc2` (prod includes via `6656adf`+) |
| B.22 | `/blog` large card: cover 2:1 (не flex-fill) + excerpt ~6 строк из lead | Высокий | ✅ `0be544f` (prod via `fc5e309`) |
| B.23 | Blog prose: markdown links/H2 anchors/NOTE/prices + visual accents | Критический | ✅ `4f6cdb3` prod | агент |
| B.23b | NN guides: bare «Лайфхак»/советы → `[NOTE]` callout (3 slug) | Высокий | ✅ `94cbe86` MSK **BUILD_ID=`iQt0EenjDINCgdzm4GPuR`** + upsert | агент |
| B.24 | `/blog` view toggle: magazine-сетка \| список + localStorage/`?view=` | Высокий | ✅ `0741106` prod via `ed874cb` | агент |
| B.24b | Blog cards: убрать cover badges (tag/city на фото) | Высокий | ✅ `b542a45` (+ merge B.24) | агент |
| B.25 | Авторы колонок: brand blue (`text-primary-600`), без бейджа «Колонка» | Высокий | ✅ `ed874cb` prod | агент |
| B.26 | `/blog` UX: темы, поиск, «Показать ещё», CTA CHPU, дата на large | Высокий | ✅ `bd8ec37` prod | агент |
| B.27 | Blog Hero: `Article.isFeatured`, informational hero + admin toggle, LCP priority | Критический | ✅ `72ea839` prod (via d34fd28+) | агент |
| B.28 | Blog Featured Hero: CTA-плитка с promo image под «Свежее» (убрать пустоту) | Критический | ✅ `72ea839` prod | агент |
| B.28b | Afisha promo: цена/тайтлы/chips по header geo; полоса под 3 первыми статьями фида | Критический | 🚫 owner: афиша должна быть в углу | агент |
| B.28c | Owner fix: swap колонок + rich Афиша в углу под «Свежее» (не mid-feed) | Критический | ✅ `9be0a98` prod @`ab1dc94` | агент |
| B.29 | Pack B GPT brief: 9 гидов + 2 колонки Макса (`blog-content-gpt-briefs.md`) | Высокий | ⏳ brief ✅ 2026-07-27; тексты GPT → owner review → agent publish | владелец + агент |
| B.30 | Pack C: 9 гидов + 2 колонки Макса (1024610) | Высокий | ✅ контент+images; blog:upsert prod; slug 404 до publishedAt | владелец + агент |
| B.30a | Owner early-publish: Самара `samara-vykhodnye-dva-dnya-bez-gonki` (из списка 8 городов) | Высокий | ✅ `836a75f8` live; 🚫 owner 2026-08-08 → HIDDEN (без конкретики); hub blogSlug не было | агент |
| B.31 | Blog inline images: подпись (figcaption/alt) скрыта по умолчанию, показ при hover | Средний | ✅ 2026-07-27 `BlogFigure` web+public: `group-hover` + `@media(hover:hover)`, `title`+`alt` на img | агент |
| B.32 | Owner rewrite `ekb-uralskiy-mars-bazhovskie-ekskursii` (3 сценария) | Высокий | 🔄 MD+sync; commit/push/upsert/deploy | агент |

---

## UX каталога (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| U.9 | Чипы категорий: уникальные пиктограммы (не fallback ticket) | Высокий | ✅ `95d959d` prod |
| U.1 | Расширенные фильтры `/events` — popup как поиск (desktop modal + mobile bottom sheet) | Высокий | ✅ |
| U.2 | Draft Apply/Reset, Esc/backdrop, focus trap, badge счётчика | Высокий | ✅ |
| U.3 | Commit + deploy Next | Критический | ✅ `be8ee55` + prod start web (после обрыва SSH mid-deploy) |
| U.4 | Город из шапки → `city=` каталога при `/events` без явного city; deep-link сохранить | Высокий | ✅ |
| U.5 | Commit + deploy-prod-next U.4 | Критический | ✅ `4772789` prod |
| U.6 | Город шапки → фильтр `/venues` и `/locations` (URL + storage + nav) | Высокий | ✅ (в `361dc4c`) |
| U.7 | Anti-flash «Все города»→город на `/events` (и venues/locations): `cityReady` + layout sync | Высокий | ✅ |
| U.8 | Anti-flash: не показывать SSR all-cities до inject; commit + deploy-prod-next U.6–U.8 | Критический | ✅ `4c09cdb` prod |
| U.10 | Catalog cards: eye-line `object-position` (16:9 headshots Pianissimo) | Высокий | ✅ `539f571` prod |

---

## Reviews (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| R.1 | Prisma: Review ↔ ExternalOrder + migration | Критический | ✅ |
| R.2 | API create/list + admin moderate | Критический | ✅ |
| R.3 | Admin UI `/reviews` очередь | Высокий | ✅ |
| R.4 | Public ReviewSection + `/reviews/write` + ЛК deep-link | Высокий | ✅ |
| R.5 | Cron review-request email (SMTP graceful) | Высокий | ✅ |
| R.6 | Capability: TC allowed + verification | Критический | ✅ |
| R.7 | Pseudo 4.5–5.0 UI; AggregateRating ≥10 | Высокий | ✅ |
| R.8 | Tests verification + displayed rating | Высокий | ✅ |
| R.9 | Commit + deploy API/admin/Next | Критический | 🔄 commit `1c2b156` pushed; deploy SSH с этой машины — Permission denied (нужен ключ на prod) |
| R.10 | Disputes / supplier LK | — | 🚫 out of scope |
| R.11 | ЛК: past slug 404 → sibling URL + review by eventId; время сеанса подписано; дата покупки без truncate | Критический | ✅ 085617c deploy |

---

## Этап 0 — Post-cutover hardening (закрыть первым)

**Цель:** prod Next стабилен, покупка через виджеты проверена в браузере, admin операционен, data debt по TC осознан.

**Exit criteria:** все пункты «Browser smoke» и «Admin smoke» ✅; по `tc:sync` — ✅ run **или** ⚠️ defer с записью в decision-log.

### 0.1 Cutover & infra

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.1.1 | Prod nginx → Next `:3001` | Критический | ✅ |
| 0.1.2 | Rollback script / snapshot | Критический | ✅ |
| 0.1.3 | `launch-prod-smoke-next.sh` (SSR curl) green | Критический | ✅ |
| 0.1.4 | Мониторинг 24–48ч post-cutover | Высокий | ✅ |
| 0.1.5 | Deprecate Vite public (`apps/public`) | Средний | ⏳ после закрытия 0.2–0.3 |

### 0.2 Browser smoke — 4 эталонных slug

Список: [widget-etalon-slugs.md](./widget-etalon-slugs.md).  
API-пререквизит: `npm run check:widgets -- --base https://daibilet.ru`

| # | Slug | TC / TEP | API check | Browser «Купить» | Статус |
|---|------|----------|-----------|------------------|--------|
| 0.2.1 | `tc-6a266b49465e94f72b4ef8f6-interaktivnaya-vystavka-nyuton-park` | TC | ✅ 2026-07-13 | ✅ 2026-07-22 | ✅ |
| 0.2.2 | `tc-6a3582f0bbd948da83dece6e-kombo-kvest` | TC | ✅ 2026-07-13 | ✅ 2026-07-22 | ✅ |
| 0.2.3 | `progulka-ot-prichala-kitai-gorod-do-prichala-kievskii-826` | TEP | ✅ 2026-07-13 | ✅ 2026-07-22 | ✅ |
| 0.2.4 | `centralnaya-krugovaya-rechnaya-progulka-ot-parka-zaryade-ves-centr-za-chas-683` | TEP | ✅ 2026-07-13 | ✅ 2026-07-22 | ✅ |

**Чеклист на каждый slug (browser):**

- [x] Hard refresh `/events/{slug}`
- [x] Hero / buy card: цена и CTA видны
- [x] Клик «Купить» → TC modal **или** Teplohod widget
- [x] DevTools console: нет blocking errors
- [x] (опц.) тестовая покупка → ExternalOrder в admin

Закрыто 2026-07-22: ручное подтверждение (prod виджеты работают; API `check:widgets` был ✅ с 2026-07-13). Тестовая покупка → ExternalOrder подтверждена отдельно.

### 0.3 Admin smoke (`:4000` + static admin)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.3.1 | Login (basic auth / realm) | Критический | ✅ 2026-07-22 |
| 0.3.2 | Dashboard metrics загружаются | Высокий | ✅ 2026-07-14 aligned with Events (`admin_event_groups`) |
| 0.3.3 | Sources: TC + Teplohod, last sync | Критический | ✅ 2026-07-22 |
| 0.3.4 | Events: list + detail + override save | Высокий | ✅ full catalog + override lean texts; UI на русском; group readiness future-sibling |
| 0.3.5 | Orders: список реальных заказов (не mock) | Критический | ✅ TC live + cron */10; TEP orders **отложено** (партнёр: нет API, 2026-07-19) |
| 0.3.5a | TEP orders: получить токен + schema у Теплохода, smoke import | Критический | ⏸ отложено — у партнёра нет API заказов; cron tep-orders снят с prod |
| 0.3.6 | Event moderation / publish gate | Средний | ✅ group readiness + admin smoke 2026-07-22 |
| 0.3.7 | Зафиксировать результат в Diary / smoke log | Средний | ✅ 2026-07-22 |

**Admin smoke закрыт 2026-07-22** (ручное подтверждение: login, sources, events, orders, виджет→ExternalOrder). TEP orders остаётся ⏸.

### 0.4 `tc:sync` widgetUrl backfill (prod)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.4.1 | Оценить долг: `check:sync-invariants` на prod | Высокий | ⏳ |
| 0.4.2 | **Вариант A:** `npm run tc:sync` на prod (token, maintenance window) | Средний | ✅ 2026-07-13 (~101s, 17082 widgetUrl) |
| 0.4.3 | **Вариант B:** defer + [decision-log.md](./decision-log.md) (критерии: saleable events OK) | Средний | ✅ 2026-07-13 (до sync) |
| 0.4.4 | Post-sync: `check:widgets` + 0.2 browser smoke повтор | Высокий | ✅ API 2026-07-13 + browser 2026-07-22 |

### 0.5 Ops / auth fixes (post-cutover)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.5.home-editors | «Выбор редакции»: дедуп combo-family (макс. 1 «Комбо» на venue), секцию оставить | Высокий | ✅ 2026-07-19 |

### 0.7 Admin grouped readiness (NO_FUTURE_SESSIONS)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.7.1 | Backend finalizeGroupedAdminReadiness после group | Высокий | ✅ 2026-07-19 |
| 0.7.2 | Admin UI mirror EventsPage | Высокий | ✅ 2026-07-19 |
| 0.7.3 | Unit-тест admin-group-readiness + test:ts | Средний | ✅ 2026-07-19 |
| 0.7.4 | Deploy API (+ admin static) prod | Высокий | ✅ 2026-07-19 bb7fc9c |

### 0.8 Admin audit holes (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.8.1 | Убрать hard limit 10000 admin catalog | Критический | ✅ уже `eventRows(db, null)` |
| 0.8.2 | Dashboard needsAttention ≡ Events | Критический | ✅ `admin_event_groups` |
| 0.8.3 | GET events/:id → event+override | Высокий | ✅ |
| 0.8.4 | Lean source description (left 4000) | Высокий | ✅ |
| 0.8.5 | canPublish ← high readinessIssues | Высокий | ✅ |
| 0.8.6 | Nav stubs / read-only badges / no localhost:5178 | Высокий | ✅ |
| 0.8.7 | Orders archive: проверить правила (не unarchive) | Средний | ✅ documented (stale cancelled 30d) |
| 0.8.8 | ECR остаётся скрыт в prod | Средний | ✅ |
| 0.8.9 | Deploy API + admin static prod | Высокий | ✅ 2026-07-19 `7882d6d` |

### 0.6 CPU/RAM mitigation (prod 3.8Gi)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.6.1 | Stop legacy Docker + staging на prod (без rm -v) | Критический | ✅ 2026-07-19 |
| 0.6.2 | systemd MemoryMax/High + NODE_OPTIONS web/api | Высокий | ✅ 2026-07-19 |
| 0.6.3 | TEP sync cadence + warm delay + nice | Высокий | ✅ 2026-07-19 |
| 0.6.4 | watch-tep-sync-load + oom-watch cron | Средний | ✅ 2026-07-19; oom-watch */5 + alerts |
| 0.6.5 | Замер нагрузки на следующем auto-sync окне | Средний | ⏳ скрипт готов / at optional |
| 0.6.6 | cron +x (tc-orders Permission denied) | Критический | ✅ 2026-07-19 |
| 0.6.7 | TEP out-of-process cron/systemd + DISABLE in-process | Высокий | ✅ 2026-07-19 |
| 0.6.8 | Skip startup TEP sync if fresh + delay 45m | Высокий | ✅ 2026-07-19 |
| 0.6.9 | Убрать двойной public warm (startup off) | Высокий | ✅ 2026-07-19 |
| 0.6.10 | Deploy discipline (один restart) | Средний | ✅ 2026-07-19 docs+script |
| 0.6.11 | PG host migrate / dockerd idle | Низкий | ⏳ documented only — не мигрировать без запроса |

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.5.1 | `USER_JWT_SECRET` prod/staging | Критический | ✅ |
| 0.5.2 | Teplohod widget bootstrap / related cards | Высокий | ✅ |
| 0.5.3 | EventCard title + «Подробнее» links | Высокий | ✅ |
| 0.5.4 | Catalog city filter instant apply | Средний | ✅ |
| 0.5.5 | Мультисобытие `mergeGroupKey` + HP script | Средний | 🔄 код готов, deploy ⏳ |
| 0.5.6 | Admin lists pagination / lean payloads (orders, buyers, events, venues) | Критический | ✅ 2026-07-13 deploy prod |
| 0.5.7 | Admin cities/landings page envelopes + landing detail events pager + compact dashboard | Критический | ✅ 2026-07-14 |
| 0.5.8 | Быстрые переключения админки: SWR catalog + landings base-cache + sources SWR | Высокий | ✅ 2026-07-14 |
| 0.5.8 | Events/landings SQL read-model (no full grouped catalog before slice) | Высокий | ✅ Events+dashboard SQL 2026-07-19; landings/public — ⏳ |
| 0.5.9 | Catalog quick wins: lean DTO, no widgets in list, hydrate page-only, unified metrics, www/SEO redirects, SSR trim, warmup | Критический | ✅ 2026-07-14 |
| 0.5.10 | Teplohod checkout fallback → account.teplohod.info (не teplohod.info/event 404) | Высокий | ✅ 2026-07-14 |
| 0.5.11 | Post-deploy: clear `.next/cache` + revalidate; ChunkLoadError → one reload | Высокий | ✅ 2026-07-14 |
| 0.5.12 | Teplohod: restore TI_Tickets bootstrap on event page + landing `evt_tep_*` buy | Критический | ✅ 2026-07-18 deploy |
| 0.5.13 | Яндекс.Метрика на `apps/web` (ID 106786540, не admin) | Высокий | ✅ код 2026-07-19; deploy ⏳ |

---

## Этап 1 — Public parity & SEO gaps

**Цель:** Next public ≈ legacy по UX/SEO на event/city; глобальный поиск в header.

### 1.1 Header & navigation

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.1.1 | Port `HeaderSearch` → `apps/web` SiteHeader | Высокий | ✅ |
| 1.1.2 | `/api/public/search` parity (debounce, keyboard nav) | Высокий | ✅ |
| 1.1.3 | Mobile: search в drawer | Средний | ✅ |
| 1.1.4 | Страница `/about` | Низкий | ✅ 2026-07-30 |

### 1.2 Event page

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.2.1 | Breadcrumbs: Главная → События → Город? → Title | Высокий | ✅ |
| 1.2.2 | SSR JSON-LD: `Event` + `Offer` | Высокий | ✅ |
| 1.2.3 | SSR JSON-LD: `BreadcrumbList` | Высокий | ✅ |
| 1.2.4 | `generateMetadata` | — | ✅ |
| 1.2.5 | Sticky buy card + TC/TEP widgets | — | ✅ |
| 1.2.6 | Мультисобытие «Варианты билетов» | Средний | ✅ heading + purchaseOptions (≥2) |

### 1.3 City page

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.3.1 | FAQ block (редакционный / из payload) | Высокий | ✅ 2026-07-19; **fix:** только city FAQ @`9bc8fa7` |
| 1.3.1a | City hub FAQ: убрать generated/platform FAQ про Дайбилет | Высокий | ✅ `9bc8fa7` prod proof SPB |
| 1.3.2 | SEO text block (intro + перелинковка) | Высокий | ✅ 2026-07-19 |
| 1.3.3 | SSR JSON-LD: `FAQPage` | Высокий | ✅ 2026-07-19 |
| 1.3.4 | SSR JSON-LD: `BreadcrumbList` | Средний | ✅ 2026-07-19 |
| 1.3.5 | Hero, categories, venues, events grid | — | ✅ |
| 1.3.5a | City hub: venues=0 при events>0 (hub top-500 miss) | Критический | ✅ 2026-07-19 |
| 1.3.6 | `generateMetadata` | — | ✅ |
| 1.3.7 | Развивать city hubs `/cities/{slug}` (контент, перелинковка, landings) | Высокий | ✅ rollout 65 hubs; fix ЕКБ false river chips (live rematch + landlocked water gate) |
| 1.3.8 | City-prefix в path venues/events (`/{city}/venues/...`) | — | 🚫 отклонено 2026-07-19 (flat URL) |

### 1.4 Прочие public routes

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.4.1 | Venues / locations breadcrumbs | Средний | ✅ UI = `VenueBreadcrumbsNav` + JSON-LD |
| 1.4.1a | Breadcrumb IA: admin-center без области; museum vs art_space; type→`?type=` | Высокий | ✅ 2026-07-31 (public split; Prisma enum TODO) |
| 1.4.2 | `/help` FAQ + JSON-LD | — | ✅ |
| 1.4.3 | Landings JSON-LD (client) | — | ✅ |
| 1.4.4 | Фильтр cross-transport subcategories в карточках | Средний | ✅ `pickCatalogSubcategories` / transport conflict |

---

## Этап 2 — SEO foundation (старт параллельно с 1.2–1.3)

**Цель:** indexable routes в sitemap; structured data в HTML source (не только client).

### 2.1 robots & sitemap

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.1.1 | `apps/web/app/robots.ts` (+ `Disallow: /admin/` owner audit 2026-07-25) | Высокий | ✅ 2026-07-19 / fix 2026-07-25 |
| 2.1.2 | `app/sitemap.xml` — index → chunks | Высокий | ✅ 2026-07-19 |
| 2.1.3 | Sitemap chunk: `/events/*` (catalog public) | Высокий | ✅ 2026-07-19 |
| 2.1.4 | Sitemap chunk: `/cities/*` | Высокий | ✅ 2026-07-19 |
| 2.1.5 | Sitemap chunk: `/venues/*`, landings, blog | Средний | ✅ 2026-07-19 |
| 2.1.6 | Smoke: `/robots.txt`, `/sitemap.xml` + chunk 200 | Средний | ✅ 2026-07-19 |

### 2.2 SSR JSON-LD (пересечение с Этап 1)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.2.1 | Shared helper `lib/structured-data.ts` | Высокий | ✅ |
| 2.2.2 | Event page LD+JSON в RSC (View Source) | Высокий | ✅ |
| 2.2.3 | City page LD+JSON в RSC | Высокий | ✅ 2026-07-19 |
| 2.2.4 | Venue page LD+JSON | Средний | ✅ `buildVenuePageJsonLd` Place+BreadcrumbList |
| 2.2.5 | Google Rich Results / validator smoke | Низкий | ✅ 2026-07-30 `smoke-rich-results.mjs` + JsonLd вне SiteLayout; MSK View Source Event/FAQ/Place ok |
| 2.2.6 | Root WebSite/Organization JSON-LD + Google favicon PNG (48/96/192) | Высокий | ✅ 2026-07-19 deploy prod |
| 2.2.7 | Favicon fill ~90%: 32/48/96/180/192/512 + site.webmanifest | Высокий | ✅ |
| 2.2.8 | Favicon: Flaticon ticket_1912 → бренд `#4A7FD4`, classic horizontal | Высокий | ✅ 2026-07-19 deploy prod |
| 2.2.9 | Favicon: тот же билет, rotate 45°, fill ~88–90% (32/48/96/180/192/512/ico/svg) | Высокий | ✅ 2026-07-19 deploy prod fc736e1 |
| 2.2.10 | Favicon: зеркало угла `rotate(-45)`, тот же крупный fill (все PNG/ICO/SVG) | Высокий | ✅ 2026-07-19 deploy prod 70bc59f |
| 2.2.11 | Favicon: оптический recenter `translate(1.2 1.2)` после rotate(-45) | Высокий | ✅ 2026-07-19 `c1ccd48` / prod `@7c59f8d` |

### 2.3 Canonical & indexing policy

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.3.1 | www → non-www (nginx) audit | Средний | ✅ 2026-07-30 `www`→301 `https://daibilet.ru/` |
| 2.3.2 | `noindex` для thin city/venue | Средний | ✅ 2026-07-19 |
| 2.3.3 | staging `noindex` | — | ✅ |

### 2.4 Blog / content ops

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.4.0 | Инвентарь статей (статика + prod `Article`), запрет дублей | Высокий | ✅ 2026-07-19 |
| 2.4.1 | 5 уникальных заголовков + план ([content-blog-plan.md](./content-blog-plan.md)) | Средний | ✅ 2026-07-19 (сверено с инвентарём) |
| 2.4.2 | Написать/опубликовать 4 статьи (без «как купить»; без пересечения с 13) | Высокий | ✅ 2026-07-19 prod upsert + URL 200 |
| 2.4.3 | Weekly digest script → Article `REVIEW` + cron | Средний | ✅ 2026-07-19 cron + первый REVIEW |
| 2.4.4 | ИИ-журналисты: 5 персон (Макс/Анна/Елена/Игорь/Артур) + style guides + `personas.json` | Высокий | ✅ 2026-07-19 канон [ai-journalists/](./ai-journalists/); Макс + референс Perito |
| 2.4.5 | Первый пилотный материал в стиле письма колонки (по теме от пользователя) | Высокий | ✅ 2026-07-19 full Max text + `[buy]` на `fentezi-fest-bylinnyy-bereg` |
| 2.4.6 | Byline / `authorId` в CMS или frontmatter (без деплоя до пилота ок) | Средний | ✅ hero byline `authorName` + frontmatter/API |

---

## F1–F3 — Next migration (справочно, закрыто)

| Блок | Статус |
|------|--------|
| F1 Monorepo shell | ✅ |
| F2 Public SSR (catalog, event, city, venue, landings) | ✅ |
| F3 Cutover staging + prod | ✅ (хвост = **Этап 0**) |

Детали: [phases/phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md), [phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md).

---

## F4 — Admin → Next (done)

**Канон после F4.6:** admin ops в Next; Vite `/legacy` **hard-retired** (не билдится/не раздаётся). Checklist: [phase-f4-retire-legacy.md](./phases/phase-f4-retire-legacy.md).

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| F4.0 | Kickoff: `(admin)` route group `/admin`, shell, stub dashboard, Basic Auth middleware | Критический | ✅ 2026-07-23 |
| F4.1 | Port Dashboard (live `/api/admin/dashboard` + sources + orders metrics) | Высокий | ✅ 2026-07-23 |
| F4.1a | Port Events / Landings / Articles (lists + articles CRUD) | Высокий | ✅ 2026-07-23 |
| F4.1b | Port Sources / sync-health / Settings | Средний | ✅ 2026-07-23 |
| F4.1c | Cutover admin.daibilet.ru → Next; Vite deep CRUD at `/legacy` | Высокий | ✅ 2026-07-23 |
| F4.2 | Sync jobs → apps/worker | Средний | ✅ 2026-07-23 |
| F4.3 | Port Events override/moderation + Landings SEO/matches to Next | Высокий | ✅ 2026-07-23 |
| F4.4 | Orders/Venues/Cities in Next + soft-retire `/legacy` (Vite kept for gaps) | Средний | ✅ 2026-07-23 |
| F4.5 | Remaining rare ops (taxonomy, candidates, ticket-link, ECR/Reviews) | Низкий | ✅ 2026-07-23 |
| F4.6 | Schedule/sales/source + blocks preview + buyers + unarchive/delete; hard-retire `/legacy` | Высокий | ✅ 2026-07-23 |
| F4.6 | Admin article preview (`/admin/articles/[id]/preview`, noindex) | Высокий | ✅ 2026-07-23 |

## F5 — Retire legacy

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| F5.0 | Карта зависимостей dto.js → Prisma ([f5-retire-dto-map.md](./phases/f5-retire-dto-map.md)) | Высокий | ✅ doc 2026-07-30 |
| F5.1 | Public helpers + catalog datetime/subcategories из TS; grouping в dto (bridge) | Высокий | ✅ 2026-07-30 |
| F5.2 | Landing match single source (`landing-rules.ts`); dto без дубля rules | Высокий | ✅ 2026-07-30 |
| F5.3a | Catalog grouping + city destination helpers в TS (`public-catalog-grouping`, `public-destination`) | Высокий | ✅ 2026-07-30 |
| F5.3b | Venue pages + `publicVenueHubRows` → `public-venue-read.js`; next path без dto.js; server.js retire **не** в scope | Средний | ✅ 2026-08-07 |

---

## Codex / Phase G

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| C.1 | Cherry-pick Phase 2 schema + ECR | Критический | ✅ |
| C.2 | Admin EventChangeRequestsPage | Средний | ✅ (flag) |
| C.3 | Phase G finance runtime / ЛК поставщиков (P.3) | Высокий | ⏳ (продуктовый фокус; не ждать F5 целиком) |

---

## Ops backlog (сквозной)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| O.1 | `qa.md` — открытые архитектурные вопросы | Низкий | ⏳ |
| O.2 | Staging DB отдельно от prod | Средний | ⏳ |
| O.3 | Automated browser smoke (Playwright) для 0.2 | Средний | ⏳ |

---

## Журнал обновлений

| Дата | Изменение |
|------|-----------|
| 2026-08-09 | **Finance contour status (owner):** Stage 0 code **live on `.159`**; единственный runtime gate = sandbox pay → CONFIRMED + ticketNumbers; webhook canon URL LOCKED, register/verify cabinet reopen (свёртка «cabinet DONE»); roadmap buyer/operator/supplier/refunds light/live gates в qa; M1.*/FIN.W1/MIG.9.5 sync; **без** finance/MSK deploy |
| 2026-08-09 | **QA locks docs:** editorial/route/finance/publicCode/CI secrets; Catalog Worker 504.5c canon in deploy/ + Redis 504.5d deferred (MSK Redis нет); Buyer refunds Stage 2+ LOCKED out of Stage 0; nginx split example + yookassa e2e checklist; FIN.W1/M1.WH e2e ⏳; **без** MSK/finance/Redis deploy |
| 2026-08-08 | **M1 taxonomy ✅ docs** - owner lock: Supplier ≠ museum-only; Stage 0 = OPEN_DATE (музей/арт); Stage 1 = events/sessions; readiness + M1.* + qa + Diary + Project one-liner; Codex brief updated; docs-only no web deploy |
| 2026-08-07 | **M1.* epic ✅ docs** - [museum-contract-readiness.md](./museum-contract-readiness.md): роли/функции, Stage 0 Codex brief (pay/webhook/reconcile/ticket issuance/supplier LC), Stage 1 schedule + Stage 2 full LK outlines; Tasktracker M1.*; qa Museum-1 questions; docs-only no web deploy |
| 2026-08-07 | **FIN.W1/MIG.9.5 webhook cabinet ✅** - owner: URL = `finance-api…/yookassa/webhook` (events succeeded/waiting_for_capture/canceled; было ошибочно `pay.`); next = e2e sandbox PENDING→SUCCEEDED; no web deploy |
| 2026-08-07 | **FIN.LC3 ✅** - `.159` YooKassa sandbox create-payment + STUB smoke; health 200; VERIFY=1; webhook API register 401 → FIN.W1/MIG.9.5 owner cabinet; wide CTA / `.184` not touched |
| 2026-08-07 | **F5.3b ✅** - `public-venue-read.js`; next city/venue/search без dto.js; server.js retire out of scope; dual-edit landing-rules docs cleared |
| 2026-08-07 | **MIG.9.7 ✅** - owner: Intelligent Hoopoe `.16` «труп»; refs убраны из активных docs/scripts; MSK-only; Teplohod allowlist = `.184`; wipe VM в Timeweb = owner |
| 2026-08-02 | INC.504.22 live MSK: PR #3 merge `f93b770`, BUILD `3zmDWHpY7rXAJgqu0-pnR`; public SSR via backend HTTP; web:build requires daibilet-api; root still INC.504.15 |
| 2026-08-02 | INC.504.21: SSR hang again (0B TTFB ~07:19 UTC); SIGKILL+start; healthcheck silent - script 644 not executable; chmod 755 + cron `/bin/bash` invoke; warm still OFF |
| 2026-08-01 | INC.504.20: SSR hang again (0B TTFB ~17:19 UTC); SIGKILL+start; cron bare `%` killed healthcheck restart branch; warm OFF; `ssr-healthcheck.sh` + SIGKILL recovery live MSK |
| 2026-08-01 | INC.504.19: SSR hang again (0B TTFB); SIGKILL restart; healthcheck bug fixed (`curl CODE` not `\|\| echo 999`); canon `deploy/cron/daibilet-tasks`; BUILD `gEmtnqRsq_L56ejFTXSav` |
| 2026-08-01 | **SPB `.16` retired from deploy pipeline** - web canon = MSK-only `deploy-prod-next.sh` on `.184`; `.cursorrules`/Project/Diary; MIG.9.7 → owner delete VM in Timeweb; SSH `.16` still OK (`daibilet_staging_key`) |
| 2026-07-31 | Finance sprint Codex lock: webhook finance-api canon; dual-webhook skip-unless-live; verify S2S ETA 1-2d; reconcile manual→timer; STUB admin/dev; ledger MVP no payouts; m2m Bearer; return pay/.../result; wide CTA out; W1-4 plan. Secret `<set>` on `.159` (Cursor); CHECKOUT=0; egress DNS FAIL (FIN.LC4) |
| 2026-07-31 | .159 egress PASS (yookassa 401); CHECKOUT=1; purchase smoke YOOKASSA_PAYMENT_FAILED (keys) |
| 2026-07-31 | SEO.8e web deploy rooftops Moscow URL: landing-routes allowlist (no SPb-only lock) → SPB build → MSK `.next` `mg7oABb2zIKygPpGUlRlV`; smoke `/progulki-po-krysham` + `/moscow` 200 |
| 2026-07-31 | INC.504.1: root cause Timeweb SG **Daring Aquila** (≈ `.184`) - egress self-loop; fix TCP→`.159` + DNS any; owner pending; Diary + spb-finance-host |
| 2026-07-30 | Docs sync: MIG.9.0 DNS+TLS ✅ (`pay`/`supplier`/`finance-api`); канон checkout=`pay`; owner min = MSK→.159 + YooKassa secrets + webhook; MIG.9.5–9.7 остаются ⏳; CF.P2e slug bridge agent-next |
| 2026-07-30 | CF.P1 harden ✅ Codex `114dd391`: public DTO guards (no paymentMode/ids; checkoutPath⇔canSell; PLATFORM) + finance-159-smoke-runbook; `.184` untouched |
| 2026-07-31 | MSK→finance PASS (Fair Snipe); INC.504.1 partially open (github 200); FINANCE_API_BASE_URL HTTPS; CF.P2e venue seeded; city hub admission RSC smoke |
| 2026-07-30 | CF.P1b+P2 ✅ catalog finance client + venue/city admission UI; CTA canSell; env FINANCE_*; P2c `/events` later; slug bridge test museum |
| 2026-07-30 | CF.P0+P1 ✅ deploy `.159` @ `0c1e464`: PurchaseProjection + public admission APIs; STUB smoke `7649542` idempotent; YooKassa off (no creds); next CF.P1b/P2 Cursor |
| 2026-07-30 | CF.0 ✅ lock catalog↔finance projection ([catalog-finance-projection.md](./catalog-finance-projection.md)); CF.P0–P3 backlog; qa checkout/projection/auth |
| 2026-07-30 | MIG.9.3 TLS ✅: LE SAN `supplier`+`pay`+`finance-api`, HTTP→HTTPS, certbot.timer; `checkout`/`finance` без DNS - не выпускаем |
| 2026-07-30 | MIG.9.0–9.2 ✅ Diligent Polydeuces `.159`: SSH `daibilet_spb_finance`, UFW, docker/nginx/node/pnpm, empty finance PG; DNS A pay/supplier/finance-api ✅ (после) |
| 2026-07-30 | MIG.9 🔒 role lock: `.184` catalog · `.159` battle finance · `.16` retire; phases 9.0–9.7 + pay DNS |
| 2026-07-30 | MIG.9 ⏳ план (superseded by role lock): СПб 4ГБ→8ГБ; catalog MSK |
| 2026-07-30 | Prod 504 MSK: restart web+nginx; INC.504.1-4 mitigations ⏳ Medium |
| 2026-07-30 | MIG.8 ✅ СПб public/sync off; PERF.E5 event без catalog; SEO-хвост about/crumbs/variants; F5.0 map |
| 2026-07-25 | SEO.20 listing garbage audit: код ✅ (`pnpm audit:listings` + Telegram helper); cron 04:00 на prod ⏳ owner |
| 2026-07-25 | Owner QA close (blog/F4/SEO): SEO.20 daily garbage audit ⏳ High; SEO.21 monthly tag promote ⏳ Medium; SEO.9b phone 🚫 blocked; SEO.9 launch policy ✅ |
| 2026-07-24 | B.26: `/blog` UX - topics/search/load-more/CTA/date on large |
| 2026-07-23 | B.25: column authors brand blue on listing + article (no «Колонка» badge) |
| 2026-07-23 | B.24: `/blog` magazine\|list view toggle + localStorage/`?view=` (merge badges-off) |
| 2026-07-23 | B.21: blog fonts rollback - Source Serif → Space Grotesk / site default; dropcap off |
| 2026-07-23 | B.20: blog magazine full scope - listing asymmetric + article serif/dropcap/quotes/topic sidebar |
| 2026-07-23 | B.20: `/blog` asymmetric magazine grid (large 2/3 + 2 small; mirror); city hub teasers |
| 2026-07-23 | F4.6: schedule/sales/source + blocks preview + buyers + unarchive/delete; Vite `/legacy` hard-retired |
| 2026-07-23 | F4.5: Next taxonomy + ticket-link + landing candidates + Reviews + ECR; Vite remain for schedule/blocks/buyers; retire not yet |
| 2026-07-31 | SEO.8d/8e: owner lock (top-query landings, no museum-one-off, no бесплатно); widen bus/country/rooftops/walking in `landing-rules.ts`; rooftops URL unlock |
| 2026-07-23 | F4.6: admin preview статей `/admin/articles/[id]/preview` (noindex, Basic Auth, status+publishedAt banner) |
| 2026-07-23 | F4.4: Next Orders/Venues/Cities + soft-retire `/legacy` (Vite remain for taxonomy/candidates/ticket-link); retire not yet |
| 2026-07-23 | F4.3: Next Events override/moderation/SEO + Landings SEO/matches; Vite остаётся для taxonomy/candidates/Orders |
| 2026-07-23 | F4.2: `@daibilet/worker` CLI + cron wrappers → same scripts/*; Admin Sources API unchanged |
| 2026-07-23 | SEO.16–18: TOP-15 для ручного переобхода (owner); sitemap intents без thin; план 30 путеводителей |
| 2026-07-23 | F4.1c: admin.daibilet.ru → Next (middleware host rewrite) + Vite `/legacy` for deep CRUD; nginx patch + deploy |
| 2026-07-23 | F4.1b: Next `/admin/sources` (+ sync trigger, sync-health) и read-only `/admin/settings` |
| 2026-07-23 | F4.1a: Next `/admin/events|landings|articles` lists; articles create/edit/archive; Vite для deep CRUD |
| 2026-07-23 | F4.1: Next `/admin` live dashboard (dashboard/sources/orders) через server fetch + Basic Auth forward |
| 2026-07-23 | F4 kickoff: Next `/admin` shell + Basic Auth middleware; Vite admin остаётся каноном |
| 2026-07-23 | SEO.8b: найдено расхождение `landing-rules.ts` и legacy runtime `dto.js`; синхронизировано правило `country-tours`, prod smoke: 3 экскурсии, без оперы и концертов |
| 2026-07-23 | SEO.8b: `country-tours` перестал матчить любое событие СПб с топонимом пригорода; теперь нужны одновременно экскурсионный и направленческий сигналы |
| 2026-07-19 | 1.3.1a: city hub FAQ — только cityInfo/editorial; prod proof SPB @`9bc8fa7` |
| 2026-07-23 | SEO.8: утверждён и внедрён TOP-15. Weekend URL канонизирован в `na-vyhodnye`; крыши и загородные экскурсии ограничены Санкт-Петербургом; индекс-порог сохранён на 6 |
| 2026-07-19 | P.2n: city hub `#directions` — только chips с count > 0; prod proof rostov-na-donu @`044e441` |
| 2026-07-19 | P.2m: city hub chips — gap-x-4 между date и category группами |
| 2026-07-19 | P.2k: city hub — без подзаголовка счётчика; date+category one-row desktop; без «Стоит внимания» (дубль афиши) |
| 2026-07-19 | P.2j: city hub без «Популярные теги»; единые компактные date/category chips |
| 2026-07-19 | P.2i: editorial hub template experiment (`?hub=editorial`, Source Serif, poster cards); default phase 1 intact |
| 2026-07-19 | P.2f: city hub фаза 1 в `CityPageView` (sticky tabs, афиша выше, FAQ accordion, чипы Сегодня/Выходные) |
| 2026-07-19 | P.2g: wireframe city hub v2 согласован (docs, city-specific); P.2h реализация ⏳ |
| 2026-07-19 | P.2e: wireframe city hub v1 согласован (docs); P.2f реализация ⏳ |
| 2026-07-19 | Продукт: реклама deferred; фокус AI/статьи, city hubs, финконтур; allowlist без хабов не раздувать (P.1–P.5) |
| 2026-07-19 | TC on-demand: `tc:sync --ids` + `--dry-run`, admin `?ids=` (S.1–S.3) |
| 2026-07-19 | URL: flat paths; SEO через city hubs (1.3.7 ⏳, 1.3.8 🚫) |
| 2026-07-19 | Admin: editable Cities (PATCH) + Articles `publishedAt` UI (B.9/B.10) |
| 2026-07-13 | Roadmap перестроен на **Этапы 0–2** с чеклистами browser/admin smoke, tc:sync, SEO gaps |
| 2026-07-11 | F3 cutover prod, Codex cherry-pick |
| 2026-07-10 | F2 SSR complete, staging Next |

## Google Search Console verification
- [x] **Критический** — файл `googleb3313872246ac993.html` в `apps/web/public/`, deploy prod, curl 200 (2026-07-19)

13872246ac993.html` в `apps/web/public/`, deploy prod, curl 200 (2026-07-19)

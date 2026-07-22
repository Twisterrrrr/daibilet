## 2026-07-22 — Prod deploy load + city hub blog @`bb65e4a`

### Наблюдения

- Rebase поверх `7787c30` (FAQ city-only / empty directions): конфликты в `CityPageView` / Tasktracker / Diary.
- `curl -I` (HEAD) на public API даёт 404/`no-store` — ложный сигнал; проверять GET.

### Решения

- Merge: сохранены chip UX P.2k–n + H3 «Что купить сейчас» + тизеры; Tasktracker P.2o + L.1.
- `deploy-prod-next` OK @`bb65e4a`. Proof: GET `/api/public/events?limit=50` → `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`; `?ids=` 200; hub SPB — sticky `#about|#affiche|#sights|#practice|#more` + `/blog/*` teasers.

### Проблемы

- Images webp/`next/image` (п.6 аудита) — ещё не в этом релизе.

---

## 2026-07-22 — Load fixes: catalog cache headers, landing refetch, favorites ids

### Наблюдения

- Prod `/api/public/events` идёт в legacy API (`:4000`), не в Next. TS `public-catalog-handler` отвечал `Cache-Control: no-store` → браузер/nginx не кэшировали каталог.
- `LandingPageView` при наличии SSR `initialPayload` всё равно делал `fetch(..., cache: 'no-store')`.
- `FavoritesPanel` тянул `limit=300 no-store`.
- nginx: `proxy_cache_path` был, но `proxy_cache` в `location /` не применялся; `limit_req` на `daibilet.ru /api/` отсутствовал.

### Решения

- Public handlers → `sendPublicJson` (`public, max-age=60, s-maxage=300, swr=600`).
- Next `/api/public/events` → `getCachedCatalog`.
- Landing: skip client refetch если SSR landing уже есть.
- Favorites: `?ids=` (max 50) без no-store; catalog page sizes 50/100.
- nginx prod: включён `proxy_cache` на `/` + `limit_req` на `daibilet.ru /api/`.

### Проблемы

- Images webp/avif — отдельный трек (п.6 аудита).

---

## 2026-07-22 — City hub × blog phase 1 (editorial teasers)

### Наблюдения

- Хаб был посередине между витриной и справочником: brief/travel/FAQ есть, блог жил отдельно на `/blog`.
- `citySlug` у статей заполнен слабо; API `?citySlug=` не является строгим фильтром — нужен fallback-подбор.

### Решения

- Фаза 1: 5 sticky tabs (`#about` `#affiche` `#sights` `#practice` `#more`); старые якоря `#travel/#faq/#directions/#venues` сохранены внутри родителей.
- SSR: `buildPublicArticlesListDto` + `mergeBlogCards` + `pickCityHubArticles` (лимиты 2/1/2/1/1, без повторов).
- `CityHubArticleTeaser`: cover/title/excerpt, badges, CTA «Смотреть в афише» (scroll `#affiche`) + «Открыть материал».
- Пустые бакеты не рендерятся; не возвращаем «Стоит внимания» (снято ранее).

### Проблемы

- Mini-row событий и точная CMS-привязка citySlug — фазы 2–3.

---

## 2026-07-19 — City hub FAQ: только city-specific, без платформы

### Наблюдения

- На `/cities/sankt-peterburg` accordion FAQ показывал платформенные вопросы: «Какие цены…», «Можно ли выбрать площадку…», «Нужна ли регистрация на Дайбилете…».
- `buildCityFaqItems` генерировал FAQ про Дайбилет; `CityPageView` мержил его с `cityInfo.faq`.

### Решения

- `buildCityFaqItems` = только `cityInfo.faq` (editorial) для indexable городов; без FAQ — пустой массив → `#faq` скрыт.
- JSON-LD `FAQPage` — тот же city FAQ, без platform mix.
- Default + editorial через общий `CityPageView`.

### Проблемы

- Deploy `deploy-prod-next` OK @`9bc8fa7`.
- **Proof** `/cities/sankt-peterburg` + `?hub=editorial`: нет «регистрация на Дайбилете» / «Какие цены…» / «Можно ли выбрать площадку…»; есть city FAQ (Подорожник, разводка мостов, Эрмитаж); `#faq` + JSON-LD FAQPage с 3 city questions.

---

## 2026-07-19 — City hub `#directions`: только chips с count > 0

### Наблюдения

- На Rostov-на-Дону в «Популярные направления» landings с числом ок (Новый год, Стендап…), а «Мероприятия» / «Развлечения» шли без счётчика — выглядели как мёртвые подборки.
- Корень: в `PopularDirections` category-chips хардкодили `count: 0`, хотя facet из hub feed имел реальные счётчики (15 / 1).

### Решения

- `CityPageView` (default + editorial): landings и categories в `#directions` только при `count > 0`; category chips берут реальный count; `hasDirections` — по тому же правилу.
- Не трогали gap date/category chips (параллельный фикс).

### Проблемы

- Commit `044e441` уже был в origin; предыдущий агент завис mid-deploy. Дожали: `deploy-prod-next` OK @`044e441`.
- **Proof** `/cities/rostov-na-donu` + `?hub=editorial`: `#directions` — все chips с count > 0 (Новый год 2, Стендап 2, Детям 2, Концерты 8, Мероприятия 15, Развлечения 1); пустых без числа нет.

---

## 2026-07-19 — City hub: gap между date и category chips

### Наблюдения

- На афише city hub date chips и category chips в одном ряду, но между группами («Выходные» ↔ «Все N») тот же `gap-1.5`, что и внутри группы — визуально слипаются.

### Решения

- В `CityPageView` (default + editorial через общий компонент): у ряда фильтров `gap-x-4 gap-y-1.5` между группами; внутри `DateFilterChips` / `CategoryFilter` оставлен компактный `gap-1.5`.

### Проблемы

- Deploy prod `@9a36f48` OK. Proof: chunk `/cities/[slug]/page-*.js` содержит `gap-x-4 gap-y-1.5`; `/cities/murmansk` + `?hub=editorial` → 200.

---

## 2026-07-19 — Адрес: «Проспект Кольский» → «Кольский проспект»

### Наблюдения

- На хабе Мурманска у площадки «Мега Кружка» (`/venues/mega-kruzhka`) в списке venues выводился сырой `venue.address`: «Проспект Кольский, 158/1» (порядок типа улицы из TC/API).
- `formatStreetAddress` уже чистил город/индекс, но не переставлял «тип + прилагательное».

### Решения

- В `apps/web|public/src/lib/address.ts`: для прилагательных (-ский/-ная/…) «Проспект X» / «Улица X» → «X проспект» / «X улица»; генитивы («проспект Мира», «улица Ленина») не трогаем.
- City hub venues list: `formatStreetAddress(venue.address)` вместо сырого адреса.
- Тесты: `apps/web/src/lib/address.test.ts`.

### Проблемы

- Deploy prod `@8d65740` OK. Proof `/cities/murmansk` + `/venues/mega-kruzhka`: UI «Кольский проспект»; в БД `Venue` address тоже обновлён (`проспект Кольский…` → `Кольский проспект…`).

---

## 2026-07-19 — City hub: без подзаголовка выдачи, chips в одну строку, без «Стоит внимания»

### Наблюдения

- Подзаголовок афиши («N событий в текущей выдаче. Повторяющиеся…») шумел под H2.
- Date chips и category chips шли двумя рядами на desktop.
- Блок «Стоит внимания в {городе}» дублировал те же карточки, что и основная афиша (Мурманск: Света + Мираж дважды).

### Решения

- Убран подзаголовок в `CityCatalogHeader` (default + editorial).
- Date + category chips: общий ряд `flex-wrap` / `md:flex-nowrap` (+ horizontal scroll на desktop при переполнении).
- С хаба снят `RecommendedEvents` / `rankRecommended` — афиша `#affiche` единственный список карточек.

### Проблемы

- Deploy prod `@2808ed5` OK. Proof `/cities/murmansk`: нет «Стоит внимания»; нет «N … в текущей выдаче / Повторяющиеся…»; `md:flex-nowrap` на chips; ровно 2 уникальные карточки (Света + Мираж), без дубля.

---

## 2026-07-19 — City hub: согласованные счётчики чипов (48 vs 635)

### Наблюдения

- На СПб «Все 48» рядом с «Мероприятия 635+»: разные базы.
- `CITY_SSR_SESSION_LIMIT = 48` → `payload.sessions`; `city.categories` считались по всем `matchedSessions` (~850).

### Решения

- Backend: `city.categories` = countBy по той же `sessions` slice, что в payload; hero `stats.events` = full-city.
- Client: чипы из `payload.sessions`; число только у активного; default title «Ближайшие события».
- Popular tags уже сняты (`5aa84d3`) — не возвращаем.

### Проблемы

- До: sessions=48, Мероприятия≈635. После: sum(categories) ≤ sessions.length.

---

## 2026-07-19 — City hub: без popular tags, quieter chips

### Наблюдения

- На афише хаба (СПб) блок «Популярные теги» дублировал вес фильтров; date chips (navy) и category chips (primary blue) выглядели как два тяжёлых ряда pills без единой системы.

### Решения

- Убран `PopularTags` с city hub affiche (default + editorial через общий `CityPageView`).
- Date + category chips: общий `hubFilterChipClass` — `rounded-md`, меньший padding, quiet border, единый active (`slate-800` / `zinc-900`).
- Фильтр по tag с хаба снят (теги остаются на event page / подборках).

### Проблемы

- Deploy prod `@5aa84d3` OK. Proof `/cities/sankt-peterburg`: нет «Популярные теги»; chips `rounded-md border px-2.5`; active `slate-800` (не primary blue). Editorial `?hub=editorial` — тоже без tag cloud.

---

## 2026-07-19 — City hub editorial template (P.2i experiment)

### Наблюдения

- Фаза 1 (`d877813`) — default IA: affiche first + sticky + FAQ accordion.
- Lovable Vite mock (`city-hub-redesign`) — moodboard only: light zinc, serif H1, poster 4:5 cards; не порт стека (TanStack/bun/shadcn/terracotta).

### Решения

- Параллельный template: `hubTemplate: 'editorial' | 'default'`; `CityPageViewEditorial` → `CityPageView hubTemplate="editorial"`.
- Включение: `?hub=editorial` (любой город); `?hub=default` форсирует фазу 1; optional env `CITY_HUB_EDITORIAL_SLUGS` allowlist (не трогает 65 городов по умолчанию).
- Visual: Source Serif 4 H1/H2, zinc-50, compact counters, sticky tabs, affiche poster-cards (`AffichePosterCard`), те же API/`cityInfo` данные.
- Default phase 1 без регрессии.

### Проблемы

- Deploy prod `@6efe0d8` OK. Proof:
  - Default: https://daibilet.ru/cities/sankt-peterburg — dark hero (`border-primary-950`), нет `font-serif` / `bg-zinc-50`.
  - Editorial: https://daibilet.ru/cities/sankt-peterburg?hub=editorial — `font-serif` H1, `bg-zinc-50`, poster `aspect-[4/5]`, тот же `#affiche` IA.

---

## 2026-07-19 — City hub фаза 1 (P.2f) реализована

### Наблюдения

- Wireframe v1 закрыт кодом в `CityPageView`: порядок Hero → sticky tabs → `#affiche` → `#directions` → `#venues` → `#travel` → `#sights` → `#faq` → `#seo`.
- Lovable-репо не портировали — только IA/UX выводы (афиша выше гида, один FAQ accordion, компактные счётчики).

### Решения

- Sticky tabs + IntersectionObserver scrollspy; mobile horizontal chips.
- Чипы **Сегодня / Выходные** через `datetime` TZ helpers (как на event/landing).
- FAQ: editorial `cityInfo.faq` + generated `faqItems` в одном accordion (one-open).
- Alias `#city-schedule` → `#affiche` (и старые `#city-*` якоря); `cityEventsHref` → `#affiche`.
- P.2f ✅; deploy prod после push `feat/next-monorepo`.

### Проблемы

- Deploy prod `@d877813` OK. Proof: `/cities/sankt-peterburg` — порядок `affiche → directions → venues → travel → sights → faq → seo`, sticky nav, чипы Сегодня/Выходные, один FAQ H2.

---

## 2026-07-19 — City SEO title: именительный + дата «сегодня»

### Наблюдения

- Паттерн P.2d «События в … на сегодня» (предложный) хуже старого brand-title «Город: афиша, экскурсии и билеты».
- Нужен сигнал актуальности: «на сегодня, {дата}» (MSK, человекочитаемо).

### Решения

- Title standalone hubs: `{City}: афиша, экскурсии и билеты на сегодня, {19 июля} | Дайбилет` (именительный падеж).
- Хелпер `buildCityHubSeoTitle` (web / public / backend DTO + legacy `dto.js`); `generateMetadata` всегда считает title с живой датой.
- Description без изменений (locative).

### Проблемы

- Deploy prod `@2079e3a` OK. Proof (view-source на сервере): `/cities/sankt-peterburg` → `<title>Санкт-Петербург: афиша, экскурсии и билеты на сегодня, 19 июля | Дайбилет</title>`.

---

## 2026-07-19 — City hub wireframe v2 (фаза 2, city-specific)


### Наблюдения

- Риск фазы 2: один UI на 65 хабов без fingerprint — копипаста направлений и CTA.
- Фаза 1 (v1) закрывает каркас: афиша выше, sticky, FAQ accordion, чипы Сегодня/Выходные.
- Продукт фазы 2: плитки направлений, усиление афиши, sights→афиша только при реальной привязке, venues топ-N без карты. Фаза 3 (погода/мосты, bento, карта, dark СПб) — вне scope.

### Решения

- Зафиксирован IA: [city-hub-wireframe-v2.md](./city-hub-wireframe-v2.md) — принцип city-specific (общий каркас + per-city конфиг).
- Конфиг-идея: `featuredDirections[]`, `highlightSeason`, `hideSections?`, `primaryCta?` (расширение `cityInfo` или соседний `cityHubConfig`; без кода).
- Fingerprint-примеры: СПб, Сочи, Казань, Мурманск, Москва.
- P.2g wireframe ✅; P.2h реализация ⏳. Docs only, без deploy.

### Проблемы

- Нет (ожидает code-task P.2h после/внахлёст с P.2f).

---

## 2026-07-19 — City hub wireframe v1 (фаза 1)

### Наблюдения

- Текущий `/cities/[slug]` (`CityPageView`): hero → travel → sights → guide FAQ → направления/venues/tags → recommended → **афиша `#city-schedule` внизу** → SEO → второй FAQ — гид мешает дойти до покупки.
- Контент 65 хабов готов по brief/travel/faq; sights местами ⚠️; фото-bento и карта не обеспечены данными.
- Пользователь согласовал wireframe фазы 1 **без** кода Lovable.

### Решения

- Зафиксирован IA: [city-hub-wireframe-v1.md](./city-hub-wireframe-v1.md) — sticky tabs, афиша выше гида, FAQ accordion (один блок), компактные счётчики, чипы Сегодня/Выходные, светлая издательская сетка.
- Якоря: `#affiche` (+ alias `#city-schedule`), `#directions`, `#venues`, `#travel`, `#sights`, `#faq`.
- Out of scope фазы 1: погода/мосты, bento sights, карта площадок, dark redesign 65, тёмный акцент СПб.
- Оценка реализации: **M** (~1–2 eng-дня); wireframe = docs only.

### Проблемы

- Нет (ожидает отдельный code-task после wireframe).

---

## 2026-07-19 — City SEO: «на сегодня» в title хабов

### Наблюдения

- Title standalone city hubs: «Мурманск: афиша, экскурсии и билеты | Дайбилет» — без сигнала «сегодня».
- Description уже с locative («в Мурманске») после P.2c; дублировать «на сегодня» в description не нужно.

### Решения

- Default `seoTitle`: `События ${entityLabel} на сегодня | Дайбилет` (DTO + legacy `dto.js`).
- `generateMetadata` / client `applyCityMeta` / social-preview fallbacks согласованы.
- Description без изменений (locative остаётся, без второго «на сегодня»).
- Deploy prod `@48e6147` (включает `d49f463` + Suspense/SiteLayout build-fixes).
- Proof (view-source): `/cities/murmansk` → `<title>События в Мурманске на сегодня | Дайбилет</title>` (locative + «на сегодня»).

### Проблемы

- Первый deploy упёрся в `/locations` useSearchParams и в SiteLayout fallback с children вне provider — починено отдельными коммитами.
- SSH к prod нестабилен (banner timeout); деплой через nohup + poll лога.

---

## 2026-07-19 — Prod: пустые главная и `/events` (stats null.name)

### Наблюдения

- `/api/public/stats` → 500: `Cannot read properties of null (reading 'name')` в `destinationSummaryRowsFast` (`publicDestinationForCity` возвращает `null` для foreign/unroutable городов).
- `getHomePageData` через `Promise.all` — падение stats обнуляло весь home (editors-pick / rails без карточек).
- `/api/public/events` был жив (2371+); каталог без `?city=` на клиенте сбрасывал SSR в скелетоны на время city bootstrap.
- `daibilet-api` / `daibilet-web` active; OOM в dmesg нет; web под memory high после рестартов.

### Решения

- Hotfix prod: `dto.js` — null-safe `destination?.name` в stats/admin/public rows; restart `daibilet-api` + `daibilet-web`, сброс `.next/cache`.
- Worktree: `getHomePageData` → `Promise.allSettled`; SiteLayout Suspense fallback сохраняет `{children}`; CatalogShell не затирает SSR catalog при city bootstrap.
- Proof: stats 200 (`events:2487`); home HTML с `evt_`×30 + «Выбор редакции»; `/events?city=Москва` с карточками.

### Проблемы

- SiteLayout/CatalogShell/`Promise.allSettled` закоммичены в `feat/next-monorepo` — нужен web rebuild на prod при следующем deploy.
- Не деплоить поверх активного favicon-агента без координации.

---

## 2026-07-19 — City hub: events>0 / venues=0 (Мурманск)

### Наблюдения

- `/cities/murmansk`: events=2, venues=0 при живой площадке «Мега Кружка» (`venue_5ea93efb186c38b2a9d379bd`, pageStatus=CANDIDATE).
- События корректно связаны через `Event.venueId`; `/venues/mega-kruzhka` отдаёт events=2.
- `publicVenueHubRows(limit=500)` берёт top-N по SQL count; «Мега Кружка» на ранге **511** → не попадала в hub.
- `publicVenuesForSessionsFromHub` искал только в hubRows по `venueId` → пустой список и stats.venues=0.
- Landings уже считали venues=1 (другой путь) — UI выглядел противоречиво.

### Решения

- `resolvePublicVenuesForSessions`: после hub-match догружает missing `venueId` через `venueRowsByIds`.
- Match hub также по нормализованному `venueSlug`.
- `countDistinctSessionVenues` для `city.venues` / `stats.venues` по всем сессиям города (не cap display-list).
- UI: CTA «Все события» — `gap-2` + `shrink-0` у иконки Ticket.

### Проблемы

- Глобальный hub catalogue по-прежнему top-500; city hubs больше от него не зависят для счётчика площадок событий.

---

## 2026-07-19 — City copy: предложный падеж («в Мурманске»)

### Наблюдения

- UI хабов писал «Что посмотреть в городе Мурманск» / «Все события в городе …» — грамматически неверно.
- `city-declension` покрывал ~40 городов; fallback в `cityInPrepositional` был `в городе ${name}` для имён без -а.

### Решения

- Расширен словарь `CITY_FORMS` (web + public) + эвристика; добавлен `inCityPrepositional`.
- CityPage / city-faq / metadata: `в ${locative}`, без «в городе X».
- `destinationPrepositional` в `dto.js` — тот же принцип.

### Проблемы

- Нет.

---

## 2026-07-19 — City hubs: Саранск brief + Иваново/Мурманск sights

### Наблюдения

- У Саранска были travel/FAQ/sights, но `brief` был пустым — hero падал на fallback.
- Иваново и Мурманск — последние ❌ по sights в gap-матрице среди standalone hubs.

### Решения

- Саранск: заполнен `brief` (текст владельца).
- Иваново / Мурманск: топ-6 `sights[{title,text}]`; опечатка «конструструктивизма» → «конструктивизма».
- Обновлён `docs/city-hub-content-gaps.md` (brief 65/65, sights ❌ = 0).

### Проблемы

- Нет.

---

## 2026-07-19 — City hubs: travel + FAQ wave 3 (43 города)

### Наблюдения

- Закрыты все оставшиеся gaps по `travel`/`faq`: Абакан…Ярославль (43 хаба).
- Опечатки: новгородский «мед-ставеhandling» → «мёд-ставлень»; волгоградский FAQ метротрама «намет/на нем» → «на него прокатиться».

### Решения

- Данные в `CITY_INFO` (web + public parity); рендер/JSON-LD без изменений.
- Матрица `docs/city-hub-content-gaps.md`: travel ✅ **65/65**, FAQ ✅ **65/65**.

### Проблемы

- Нет.

---

## 2026-07-19 — City hubs: sights + travel/FAQ wave 2 + gaps table

### Наблюдения

- Добавлено поле `sights[{title,text}]`; секция «Что посмотреть» на hub (приоритет над legacy `mustSee`).
- Wave 2 travel/FAQ: Курган, Липецк, Кемерово, Чита, Киров, Барнаул, Чебоксары (+ Саранск без изменений).
- Sights: 15 (Смоленск…Хабаровск) + 8 (Курган…Чебоксары) = 22 хаба с топ-6.
- Барнаул: музей «Мир времени»; Мало-Тобольская без дубля «пешеходный».

### Решения

- `docs/city-hub-content-gaps.md` — матрица brief/sights/travel/FAQ по всем 65 standaloneCities.

### Проблемы

- Нет.

---

## 2026-07-19 — City hubs: travel + FAQ wave 2 (Курган…Чебоксары)

### Наблюдения

- Вторая пачка: Курган, Липецк (`lipeck`), Кемерово, Чита, Киров (`kirov-kirovskaya-oblast`), Барнаул, Чебоксары; Саранск уже был в wave 1.
- Рендер/JSON-LD уже на месте с wave 1 — только данные `CITY_INFO`.

### Решения

- +7 городов с `travel`/`faq` (web + public parity); Саранск без изменений (тексты совпали).

### Проблемы

- Нет.

---

## 2026-07-19 — City hubs: travel + FAQ (15 городов)

### Наблюдения

- Владелец дал блоки «Как добраться / лучший сезон» и 3 FAQ на город для 15 хабов.
- В исходнике Смоленска была опечатка «конcustomный» → исправлено на «кустарный вяленый сахар».
- Саранск не имел `CITY_INFO.brief` — добавлен entry только с travel/faq.

### Решения

- Расширен `CityInfoEntry`: optional `travel`, `faq[{q,a}]` в `apps/web` + parity `apps/public`.
- На `/cities/{slug}` после hero: секции «Как добраться и когда ехать» и «Частые вопросы» (простая вёрстка).
- JSON-LD `FAQPage`: редакционный FAQ prepend к билетному через `buildCityEditorialFaqItems`.

### Проблемы

- Нет.

---

## 2026-07-19 — City hubs: ещё 9 brief (Чита…Хабаровск)

### Наблюдения

- Чита в исходнике владельца была дважды («Город привлекает…» / «Чита привлекает…») — оставлен один текст с «Чита привлекает…».
- Prod-slug: `lipeck` (не lipetsk), `kirov-kirovskaya-oblast`, `habarovsk` (не khabarovsk).

### Решения

- +9 `brief` в `CITY_INFO` (web + public): chita, kirov-kirovskaya-oblast, kurgan, lipeck, ivanovo, kemerovo, cheboksary, barnaul, habarovsk.
- Алиасы: `kirov`→`kirov-kirovskaya-oblast`, `lipetsk`→`lipeck`, `khabarovsk`→`habarovsk`.
- Опечатка «Ииндустриальное» → «Индустриальное» (Кемерово).

### Проблемы

- Нет.

---

## 2026-07-19 — City hubs: brief-описания 14 адмцентров

### Наблюдения

- Описания city hub рендерятся из статического `CITY_INFO.brief` (`apps/web` + паритет `apps/public`), не из `City.introText` в БД.
- Hero на `/cities/{slug}` берёт `guide?.brief` через `resolveCityInfo`; SEO-блок — `resolveCityBrief` в `city-faq.ts`.
- Prod-slug ≠ «естественный» транслит: `arhangelsk`, `astrahan`, `yuzhno-sahalinsk`, `blagoveschensk-amurskaya-oblast` (Амурская, не Башкортостан).

### Решения

- Добавлены 14 `brief` в `CITY_INFO` (смысл текстов владельца, тон сайта).
- Алиасы: `arkhangelsk`→`arhangelsk`, `astrakhan`→`astrahan`, `yuzhno-sakhalinsk`→`yuzhno-sahalinsk`, `blagoveshchensk`(+`-amurskaya-oblast`)→`blagoveschensk-amurskaya-oblast`.

### Проблемы

- Нет.

---

## 2026-07-19 — Geo: хвост allowlist + cut зарубежья

### Наблюдения

- После expand адмцентров оставалось **63** города с причиной только `allowlist` (дыры: события не в city и не в region destination).
- В `cityToRegion` ошибочно было `Осака`→`Япония` (non-RF попадало в routing).
- Батуми (2 READY) — зарубежье, не для публичного каталога РФ.

### Решения

- Добавлен `foreignCities` в `city-routing.ru.json` (Батуми, Осака); filter в `mapGroupedPublicSession` + `isAllowedPublicDestination`.
- Хвост 63: **59** → субъект через `cityToRegion`; **Зеленоград/Щербинка→Москва**, **Пушкин→Санкт-Петербург**; **Батуми** cut; без маппинга — **0**.
- `standaloneCities` не трогали (мелкие не добавляли). REGION_HUBS расширен под новые субъекты с уже существующими центрами.
- Docs: `geo-excluded-cities.md`, Tasktracker G.6.
- **Prod:** deploy-prod-next OK. Proof: `foreignCities`=[Батуми,Осака]; destinations city=65 region=36; foreign not in dest; Batumi search items=0; МО/ЛО/Краснодар/Ростов/Башкортостан/Челябинск/Ставрополь/Воронеж — есть.

### Проблемы

- `Республика Дагестан` (Каспийск) без hub-центра в standalone — регион может появиться orphan-карточкой; ок при 1 событии.

---

## 2026-07-19 — Geo-политика: адмцентры + region buckets + Челны

### Наблюдения

- Владелец зафиксировал: Набережные Челны = Татарстан → под карточкой Казани («события области»), не standalone.
- `cityToRegion` — штатная свёртка в субъект, **не** «дыра» allowlist.
- Allowlist: адмцентр + saleable → `standaloneCities` + hub; не-адмцентр → `cityToRegion`; мелкие посёлки (Сортавала, Лебяжье) только в region.
- Баг: `isPublicRegionName` якорил `$/(…|республика)$`, а «Республика Татарстан» начинается с «Республика» → регион отфильтровывался; `\b` в JS с кириллицей ненадёжен.

### Решения

- Regex: `/^республика(?:\s|$)/iu` **или** суффикс `область|край|республика|округ`.
- `city-routing.ru.json`: +29 адмцентров в standalone (итого 65); расширен `cityToRegion` (Тольятти→Самарская, Челны→Татарстан, Сортавала→Карелия, …).
- `REGION_HUBS` расширен (Приморье, Алтай, Самара, Челябинск, Башкортостан, …) для ссылки «+ регион» под карточкой центра.
- Документы: Project / Tasktracker G.* / geo-excluded-cities.md.
- **Prod @`6f0fcf7`:** deploy-prod-next OK. Proof: destinations city=65, Челны не city; `Республика Татарстан` events=12; `/cities/respublika-tatarstan` показывает площадки «Набережные Челны»; Владивосток/Хабаровск/Чебоксары в standalone.

### Проблемы

- Хабы новых городов thin (listing) — ок по политике; контент SEO — отдельно (P.2).
- Точные `City.title` с скобками (`Киров (Кировская область)`, `Благовещенск (Амурская область)`) должны совпадать с БД.
- SWC: ключ `Йошкар-Ола` без кавычек ломал `web:build` → hotfix `6f0fcf7`.

---

## 2026-07-19 — Аудит городов вне public destinations

### Наблюдения

- Prod: 180 городов с READY и/или saleable; публичный каталог — **36** city destinations (+ 4 region).
- Исключено **144** города: см. `docs/geo-excluded-cities.md`.
- Доминирующие причины (на момент аудита): `allowlist` 126, `cityToRegion` 8, `no-saleable` 8, `republic-regex` 1 (Набережные Челны), `other` 1.
- API подтверждает: «Республика Татарстан» / «Республика Хакасия» **нет** в destinations — `isPublicRegionName` с якорем `$` не матчит «Республика …».

### Решения

- Отчёт зафиксирован в `docs/geo-excluded-cities.md`.
- **Сверх аудита (тот же день):** geo-политика применена — см. запись «Geo-политика: адмцентры + region buckets + Челны». `cityToRegion` в сводке больше не трактуется как «дыра».

### Проблемы

- ~~`republic-regex`~~ — исправлено в записи geo-политики ниже по дневнику / выше по времени.

---

## 2026-07-19 — Продуктовая стратегия: не рекламировать «пустышку»

### Наблюдения

- Фиксация владельца: «не хочу пока рекламировать пустышку, сосредоточусь на статьях, хабах, финконтуре».
- Витрина ещё не готова к платным каналам: хабы/контент и базовый финконтур (ЛК поставщиков) — приоритетнее рекламы.
- Массовое расширение allowlist городов без готовых city hubs раздувает каталог без SEO/UX-якоря.

### Решения

- **Реклама / paid acquisition — отложена** до готовности витрины: city hubs + контент (AI/статьи) + базовый finance contour.
- **Фокус сейчас:** AI/статьи, city hubs `/cities/{slug}`, finance contour / ЛК поставщиков.
- **Allowlist городов:** не раздувать массово без хабов; новые города — только с хабом (или осознанным исключением).

### Проблемы

- Нет — продуктовый приоритет; execution в Tasktracker (P.*).

---

## 2026-07-19 — Каталог: уникальные пиктограммы категорий

### Наблюдения

- На `/events` чипы категорий: «Все» = ✨, «Экскурсии» = 🚌, остальные топ-категории падали в fallback 🎫.
- Маппинг в `apps/web/src/lib/catalog-view-mode.ts` покрывал только Экскурсии/Речные/Концерты/Детям; не было «Музеи и арт», «Развлечения», «Мероприятия», «Активный отдых».

### Решения

- Расширен `CATEGORY_EMOJI`: уникальный emoji на каждую топ-категорию; неизвестные → ✨ (не ticket).
- Паритет в legacy `apps/public` CatalogPage.
- Рендер чипов: `CatalogToolbar.client.tsx` → `categoryEmoji(item.name)`.

### Проблемы

- Нет — баг маппинга, не рендера.

---

## 2026-07-19 — CI: pnpm missing before setup-node cache

### Наблюдения

- Job `validate-build-test` падал за ~14–19с на `feat/next-monorepo` и PR #1 (тот же branch, title hero-stats).
- Ошибка: `Unable to locate executable file: pnpm` на шаге `actions/setup-node@v4` с `cache: pnpm`.
- После фикса порядка: `backend:typecheck` — `exactOptionalPropertyTypes` / `noUncheckedIndexedAccess` (включены в e9d72f1, раньше CI не доходил).

### Решения

- В `.github/workflows/ci.yml` поставить `pnpm/action-setup@v4` **до** `setup-node` (cache требует pnpm в PATH).
- Widen optional types (`| undefined`) + guards для indexed access в reviews/auth/catalog/image-url.
- Отдельной ветки hero-stats нет: PR #1 = `feat/next-monorepo`.

### Проблемы

- После typecheck: `web:build` prerender `/` → Prisma `Can't reach database server at 127.0.0.1:5437` (hero stats / `getHomePageData` без catch).
- Fallback: `getHomePageData` → empty payloads при недоступной БД (как SiteLayout).

---

## 2026-07-19 — TC on-demand sync `--ids`

### Наблюдения

- Full `tc:sync` тяжёлый; для точечного добавления/обновления событий нужен путь по списку Ticketscloud ids.
- В proto уже есть `EventsRequest.ids`; upsert pipeline (`importCatalogEvent`) уже готов.

### Решения

- `npm run tc:sync` → `scripts/tc-sync.js`: без флагов = full fetch+import+revalidate; с `--ids=...` = gRPC by ids → normalize → тот же upsert (не insert-only).
- `--dry-run` с `--ids`: только fetch+normalize, без БД.
- Shared `scripts/lib/tc-catalog-fetch.js`; `importCatalogEvents(..., { skipMissingFromCatalog: true })` для ids-режима.
- Admin: `POST /api/v1/tc/sync?ids=a,b&dry-run=1`.
- Prod smoke: dry-run + upsert `6a5a15629c0d02f149eb31b7`, `6a4b7eb321d4fca102f90689` → +2 EventSourceLink (30637→30639).
- **Prod @6cc137d:** `git pull` + `daibilet-api` restart; `npm run tc:sync -- --help` OK.

### Проблемы

- Ids-режим после upsert всё ещё гоняет полный `ProviderLink` resync по source (~6s) — приемлемо; scoped sync можно отложить.
- Не замена nightly/full sync: цены/даты остальных событий не обновляются.

---

## 2026-07-19 — Anti-flash каталога: не показывать SSR «все города»

### Наблюдения

- В `361dc4c` уже были venues/locations + `cityReady`, но на `/events` без `?city=` оставался flash контента: после resolve storage на один кадр показывался SSR-каталог «все города» (toolbar уже с Уфой), затем client fetch.
- Причина: `useState(initialCatalog)` + `loading=false` при наличии SSR payload; `cityBootstrapPending` снимался до завершения fetch с effective city.

### Решения

- `CatalogShell`: SSR catalog доверяем только если URL уже содержит `city`; иначе старт с `catalog=null` / skeleton → fetch с городом из шапки (`effectiveQueryKey`).
- Deep-link с явным `city=` и сброс `persistSelectedCity('all')` без изменений.
- Venues/Locations уже фильтруют client-side по effective city — отдельный SSR-flash не затрагивает.

### Проблемы

- Прямой заход на `/events` без city: краткий skeleton вместо «Все города» (ожидаемо без cookie-SSR).
- **Prod @4c09cdb:** `deploy-prod-next` OK; `/events`, `/venues`, `/locations` 200. (Коммит смешан с CI pnpm-fix — anti-flash в том же SHA.)

---

## 2026-07-19 — UX: город шапки → venues/locations + anti-flash `/events`

### Наблюдения

- После `4772789` город шапки попадал в `/events`, но фильтр на `/venues` и `/locations` оставался локальным `useState('all')` и игнорировал шапку.
- На `/events` был flash: первый кадр «Все города», затем `router.replace` с городом из `localStorage` — потому что inject шёл в `useEffect` после paint, а тулбар читал только URL.

### Решения

- Общий контур `CITY_FILTER_PATHS` (`/events`, `/venues`, `/locations`): inject `city=` из storage, nav-ссылки с городом, смена в шапке обновляет query текущей страницы; сброс → `persistSelectedCity('all')`.
- Anti-flash: `cityReady` + placeholder «Город…» до resolve; `useLayoutEffect` для sync/replace; `CatalogShell` подставляет effective city до появления в URL.
- Venues/Locations: фильтр города через URL `?city=` + storage, как каталог.
- Код venues/locations+cityReady случайно уехал в `361dc4c` (docs tc:sync); дожим anti-flash SSR в отдельном fix-commit.

### Проблемы

- Полный SSR без cookie всё ещё не знает город до hydrate — поэтому pending-placeholder, а не «Все города».
- Deploy: `deploy-prod-next` после commit.

---

## 2026-07-19 — UX: город шапки → фильтр каталога `/events`

### Наблюдения

- Пользователь: в шапке выбран город (напр. Уфа), переход в «События»/`/events` открывал каталог без `city=` — фильтр города приходилось выбирать отдельно.
- Город шапки уже жил в `localStorage` (`daibilet:selected-city`) через `SelectedCityProvider`, а каталог читал только URL `?city=`.
- Смена города в шапке на `/events` уже обновляла query — ломалась именно навигация без явного `city`.

### Решения

- На `/events` без `city=` — `router.replace` с городом из storage (`mergeStoredCityIntoEventsParams`); deep-link с другим `city=` не трогаем и синхронизируем в storage.
- Ссылки «События», hero-chips `/events…`, поиск шапки, избранное — `catalogHrefWithSelectedCity`.
- Сброс города в тулбаре/чипе → `persistSelectedCity('all')`, чтобы auto-inject не вернул город.

### Проблемы

- Короткий double-fetch возможен при прямом заходе на `/events` без city (сначала без фильтра, затем replace) — приемлемо; nav-ссылки сразу с city.
- **Prod @4772789:** `deploy-prod-next` OK, `/events` 200, revalidate tags home/catalog.

---

## 2026-07-19 — Event page: TZ региона события (= виджет)


### Наблюдения

- Карточка Уфа (`…lesha-kotoryi-ustroilsya…`): hero/сеанс показывали **16:00** при `startsAt=2026-08-02T13:00:00.000Z` — это **Europe/Moscow**, не локальное Уфы.
- Каталог/related уже форматировали через `resolveCityTimeZone` → `Asia/Yekaterinburg` → **18:00**; event page (`public-event.dto.ts` `mapSession`) вызывал `formatDate/formatTime` **без** TZ → default `SITE_TIME_ZONE=Europe/Moscow`.
- JSON-LD `startDate` оставался ISO UTC (корректно как абсолютный instant).
- ЛК «Сеанс: Europe/Moscow» (`BuyerOrderCard`) — отдельное правило заказов, не трогали.

### Решения

- Источник TZ: `resolveCityTimeZone(city, destination)` из `city-timezone` (оверрайды городов + регионы), не browser TZ и не forced MSK.
- `mapSession` + `event.timeZone`; hydrate catalog slots и TS mapper тоже с city TZ; TcWidget fallback `toLocale*` уважает `session.timeZone`.
- Unit: `city-timezone-display.test.ts` (Уфа→18:00 YEKT vs 16:00 MSK).

### Проблемы

- In-memory `PUBLIC_EVENT_CACHE_MS` (5 мин) — после deploy API нужен restart (или дождаться TTL).
- Proof: slug выше — `timeLabel=18:00`, `timeZone=Asia/Yekaterinburg`, hero «Ближайший: … 18:00».
- **Proof prod @9f1f744:** API + HTML — `Asia/Yekaterinburg` / `18:00` (было MSK `16:00`); JSON-LD `startDate` остаётся `2026-08-02T13:00:00.000Z`.

---

## 2026-07-19 — URL: flat paths, SEO через city hubs

### Наблюдения

- Обсуждался city-prefix в path (`/{city}/venues/...` и аналоги). Устная формулировка «развивать пабы» в контексте city URL = **хабы** (city hubs), не бары.

### Решения

- **URL остаются flat:** `/events/{slug}`, `/venues/{slug}`, `/cities/{slug}`. City-prefix в path **не** вводим.
- SEO-фокус: развитие городских хабов `/cities/{slug}` + landings; breadcrumbs/JSON-LD с городом; sitemap/canonical (как есть / доращивать).

### Проблемы

- Нет: схема path не меняется → без миграции URL/редиректов.

---

## 2026-07-19 — Event page: дубли чипов в «Теги»

### Наблюдения

- На event page секция «Теги» показывала `Рок, Шоу - программа, Рок, Шоу - программа` (пример: `tc-6969ae12140cc49e8ef266e3-neveroyatnyi-koncert-gruppy-kino`).
- `/api/public/events/{slug}` отдаёт одинаковые labels и в `event.tags`, и в `event.subcategories` (backend `pickCatalogSubcategories` берёт labels из tags, когда subcategory-слоя нет или он совпадает).
- UI `EventTags` делал `[...tags, ...subcategories]` без dedupe → визуальные дубли; React `key={tag}` тоже конфликтовал.

### Решения

- `uniqueEventTagLabels`: unique по `trim` + `toLocaleLowerCase('ru')`, порядок первого вхождения, limit 12.
- `EventTags` мержит оба массива через этот хелпер.
- Unit-тест на кейс Рок / Шоу - программа.

### Проблемы

- Deploy Next (web-only); API менять не требуется — payload корректен, баг на merge в UI.
- **Proof prod @9658b9f:** HTML `/events/tc-6969ae12140cc49e8ef266e3-neveroyatnyi-koncert-gruppy-kino` — в секции «Теги» ровно 2 `span.rounded-full` (Рок, Шоу - программа), без повторов.

---

## 2026-07-19 — Prod crash: cleanDisplayText is not defined

### Наблюдения

- Клиентский `ReferenceError: cleanDisplayText is not defined` в chunk `7198-*.js` на event pages (и SSR digest в journal `daibilet-web`).
- Симптом выглядел как ChunkLoadError/502 на статике при рестартах Next (OOM / mid-deploy), но корневой runtime-баг — отсутствие локального биндинга функции.
- В `event-page-utils.ts` был только `export { cleanDisplayText, … } from './event-description-format'` — re-export **не** создаёт локальное имя; вызовы `cleanDisplayText(...)` внутри того же модуля падали.

### Решения

- Заменён bare re-export на `import { cleanDisplayText, … } from './event-description-format'` + явный `export { … }`.
- Commit + deploy-prod-next; smoke `/events` и event slug после hard refresh.

### Проблемы

- MemoryHigh Next (~1.1G) на 3.8Gi хосте: при деплое/нагрузке возможны краткие 502 на `/_next/static` пока статика проксируется через Node. Отдельно рассмотреть `alias` на `.next/static` в nginx.

---

## 2026-07-19 — ЛК заказов: 404 / время / truncate

### Наблюдения

- Ссылка из заказа на past dated TC slug (`…-14-iyulya-21-30`) давала 404/пустую карточку → «Оставить отзыв» бесполезен (resolve отзывов был только по точному `slug`).
- В строке билета две «голые» даты/времени без подписей; `formatDateTime` без `Europe/Moscow`.
- Блок покупателя: `max-w-[170px] truncate` обрезал «Дата покупки» на desktop.

### Решения

- `buyer-order-event-links.js`: для account/public orders резолв `eventUrl` → meta-sibling / merge с ближайшим будущим сеансом; `eventId` покупки сохраняем для verification.
- Soft-404 в `loadPublicEventDto`: unsaleable slug → одноразовый hop на sibling с future session.
- Reviews: `resolveReviewEvent` по id / `tc-{24hex}-*` / slug; `/reviews/write` работает по `eventId`+`orderRef` даже без публичной карточки (`forceFormOpen`).
- UI: «Сеанс: …» (MSK), «Дата покупки» без truncate, шире колонка buyer.

### Проблемы

- Deploy Next + API после commit.

---

## 2026-07-19 — Event description: маркеры → списки

### Наблюдения

- На event page plain-text description с `✅` / `- ` схлопывался в одну простыню: `cleanDisplayText` заменял `\n` на пробелы внутри blank-line блоков.
- Эталон: `tc-699c7af75b4672904c313d52-seks-v-sssr-intimnye-tainy-stolicy-18` — checkmark-пункты и блок «Организационные детали:».

### Решения

- Модуль `event-description-format.ts`: детект line bullets (`✅`/`•`/`-`/`–`/`—`) и inline после двоеточия; рендер `<p>`/`<h3>`/`<ul><li>` с escape + sanitize.
- Уже готовый HTML не переразбирается — только sanitize.
- `EventDescription` всегда через `formatEventDescriptionHtml`.

### Проблемы

- Bare `export { cleanDisplayText } from '…'` не давал локальный биндинг → `ReferenceError` в ticket helpers (см. запись выше).
- **Proof prod:** slug `seks-v-sssr…` — RSC HTML содержит `<ul>` (7 checkmark + 5 org details), маркеры сняты, абзацы/`<h3>` сохранены.

---

## 2026-07-19 — Расширенные фильтры каталога → popup

### Наблюдения

- `CatalogAdvancedFiltersPanel` раскрывался inline под тулбаром и раздувал `/events`.
- Поиск в шапке уже использует overlay-modal (`HeaderSearch` variant=`overlay`): backdrop, Esc, `role="dialog"`.

### Решения

- Фильтры открываются кнопкой «Фильтры» в `CatalogToolbar` как portal-modal (тот же UX, что поиск).
- Desktop: центрированная модалка `max-w-2xl`; mobile: bottom sheet (`items-end`, `rounded-t-2xl`, safe-area).
- Draft + «Применить» / «Сбросить»; Esc + backdrop; focus trap; badge с числом активных advanced-фильтров.
- Query-params (`from`/`to`/`minPrice`/`maxPrice`/`ageMax`/`landing`) без изменений схемы; счётчик больше не включает `category` (она в чипах категорий).

### Проблемы

- Первый `deploy-prod-next.sh`: Next build упал на `next-font-manifest.json`; retry после `rm -rf apps/web/.next` собрался, но SSH оборвался до `systemctl start daibilet-web` → 502. Дожали вручную: start web + smoke `/events` 200. Prod HEAD `be8ee55`.

---

## 2026-07-19 — Модуль отзывов (ExternalOrder / TC)

### Наблюдения

- В Prisma уже были `Review*` / `ReviewRequest`, runtime API/UI/cron отсутствовали.
- SPBBOATS запрещал отзывы для TC/TEP; у агрегатора основной путь наоборот — через `ExternalOrder`/tickets.
- Каталог уже показывал псевдорейтинг; JSON-LD Event без AggregateRating.

### Решения

- Верификация: email и/или ticket/order ↔ ExternalOrder (done/confirmed) + event match (meta-siblings / mergeGroupKey); deep-link `ReviewRequest.token`.
- Public: `/reviews/write`, блок на event page; displayName «Иван К.», бейдж «Покупка подтверждена».
- Admin: `/reviews` — approve/reject/hide.
- Cron `review-requests` после сессии; SMTP optional (graceful skip).
- UI псевдо 4.5–5.0 до 10; AggregateRating только при ≥10 APPROVED.
- Disputes / ЛК поставщика не трогали.

### Проблемы

- Без `SMTP_*` письма не уходят (ReviewRequest всё равно создаётся).
- Deploy: migrate `20260719150000_review_external_order` + nodemailer при включении SMTP.
- Commit `1c2b156` запушен в `feat/next-monorepo`; SSH deploy с этой среды — `Permission denied (publickey)` к `213.171.7.16`. Нужен ручной `deploy-prod-next.sh` на сервере.

---

## 2026-07-19 — City FAQ + thin noindex (пункт 5)

### Наблюдения

- City page имел hero/catalog, но без FAQ/SEO text и без SSR JSON-LD; `generateMetadata` всегда indexable.
- В каталоге есть thin-города (1–2 события: `abakan`, `orel`, `pskov`) рядом с толстыми (`moskva` ~668, `sankt-peterburg` ~826).
- Пустой FAQPage на thin-странице вреден для SEO.

### Решения

- `hub-indexability.ts`: city thin если `events < 3` (и не strong); venue thin если `events < 1` или `isIndexable === false`.
- Strong cities whitelist (`moskva`/`sankt-peterburg`/крупные хабы) всегда indexable.
- City FAQ + SEO text только для indexable; SSR `FAQPage` + `BreadcrumbList`; metadata `robots: noindex,follow` для thin.
- Sitemap cities/venues фильтрует thin.
- Venue detail тоже `robots` + BreadcrumbList SSR.

### Проблемы

- **Proof prod** (deploy `9af7b45`): `/cities/moskva` — `index, follow` + SSR `FAQPage`/`BreadcrumbList` + UI FAQ; `/cities/abakan` — `noindex, follow`, без FAQPage/FAQ UI; СПб indexable.
- Очередь пунктов 1–5 закрыта.

---

## 2026-07-19 — Sitemap index + chunks / robots (пункт 4)

### Наблюдения

- Prod отдавал один плоский `urlset` на `/sitemap.xml` (static + cities + events≤2000 + venues≤1000) — риск упирания в лимит одной простыни при росте каталога.
- `robots.txt` уже Allow `/` + Sitemap на `/sitemap.xml`; scrapers `liliabots` Disallow; Googlebot/Yandex не блокировались.
- Native Next `generateSitemaps` нестабилен для корневого index → кастомные route handlers.

### Решения

- Удалён монолитный `app/sitemap.ts`.
- Index: `app/sitemap.xml/route.ts` → `sitemapindex` со ссылками на chunks.
- Chunks: `app/sitemaps/[chunk]/route.ts` + `lib/sitemap-data.ts` — `static`, `events`, `cities`, `venues`, `landings`, `blog`.
- Events из public catalog (`hydrateSlots: false`); venues `isIndexable !== false`; blog из `buildPublicArticlesListDto` (уже indexable); landings из canonical category/city paths.
- `robots.ts`: Allow `*` / Googlebot / Yandex; Sitemap → `https://daibilet.ru/sitemap.xml` (index).

### Проблемы

- City FAQ (пункт 5) закрыт отдельной записью выше.
- **Proof prod** (deploy `4282895`): `/robots.txt`, `/sitemap.xml` (sitemapindex), `/sitemaps/{static,events,cities,venues,landings,blog}.xml` — все **200**; events chunk ~2394 URL.

---

## 2026-07-19 — SSR JSON-LD Event + BreadcrumbList

### Наблюдения

- На `/events/[slug]` был `generateMetadata`, но в HTML source не было `application/ld+json` для Event/Breadcrumbs (в отличие от blog/`layout` WebSite+Organization).
- UI-крошки в hero шли как События → Город → Venue → Category — не совпадали с Tasktracker 1.2.1.

### Решения

- Добавлен shared helper `apps/web/src/lib/structured-data.ts`: `buildEventBreadcrumbs`, `buildBreadcrumbListJsonLd`, `buildEventJsonLd`, `buildEventPageJsonLd`.
- Event page RSC рендерит два SSR `<script type="application/ld+json">`: `@type: Event` (+ `Offer` при цене) и `BreadcrumbList` (Главная → События → Город? → Title).
- Hero breadcrumbs синхронизированы с тем же helper (один source of truth; клиентский LD не дублируется).

### Проблемы

- Sitemap (пункт 4 / 2.1.x) закрыт отдельной записью выше.
- City FAQ/BreadcrumbList SSR (1.3.x / 2.2.3) — следующий этап.
- **Proof prod:** `https://daibilet.ru/events/retro-locman-ot-zaryadya-1294` — в HTML source: `Event` (+ `Offer`), `BreadcrumbList`, плюс root `WebSite`/`Organization`. Deploy `d8bf381`.

---

## 2026-07-19 — Регрессионные тесты: Teplohod image + TC fake open-date

### Наблюдения

- Фиксы B.15/B.16 уже в prod, но unit-покрытие было тонким; `public-event-widget-fallback.test.ts` не входил в `test:ts`.
- Gate «синтетический widget-slot» и `pickPrimarySessionPurchase` жили внутри `public-event.dto.ts` без прямого импорта в тестах.

### Решения

- Вынесены чистые хелперы в `public-event-widget-fallback.ts`; dto использует их.
- Расширены `event-image-url.test.ts` (нет twcstorage/X-Amz в результате, encode, non-TEP untouched) и widget-fallback (dated RECURRING/SINGLE, meta-sibling purchase switch).
- `catalog-availability` + mapper: dated TC ≠ «Открытая дата».
- `npm test` / `test:ts` включают оба файла; suite **57 pass**.

### Проблемы

- Пункт 3 (JSON-LD) не начат. Деплой API не нужен (только тесты + extract без смены поведения).

---

## 2026-07-19 — 0.5.8 SQL read-model для admin Events

### Наблюдения

- Hot path: `getCachedAdminGroupedEvents` → `eventRows(db, null, { lean: true })` → `groupAdminEventRows` → filter/slice в JS.
- Cold cache ~25s / OOM риск на 3.8Gi: Node держал полный grouped catalog в RAM.
- Public catalog уже hydrate-only-page, но base cache всё ещё full sessions (отдельный пункт).

### Решения

- Новый модуль `admin-events-sql-read-model.js`: group key в SQL (= `adminEventGroupKey`), LIMIT/OFFSET по группам, фильтры в SQL.
- `buildAdminEventsList`: SQL page → hydrate только sibling ids страницы (`eventRowsByIds`, max 2500) → `groupAdminEventRows` (exact readiness/override/landingHits).
- `buildAdminDashboard`: metrics из SQL aggregates (`launch.source=admin_event_groups_sql`), без full catalog.
- TTL cache ~45s на SQL page variants; invalidate вместе с `invalidateAdminGroupedEventsCache`.
- Startup: полный admin catalog warm **off** по умолчанию (`DAIBILET_ADMIN_STARTUP_WARM=1` для Landings SWR).
- Landings list пока на старом `getCachedAdminGroupedEvents` (следующий шаг).
- Тесты: `admin-events-sql-read-model.test.ts`; bench: `scripts/bench-admin-events-sql.mjs`.
- **Prod bench @86bd059:** cold SQL page **5.5s** / list **6.2s**, warm list **0.35s**; `rowsLoaded=444` vs raw `30839`; heapΔ ~6–7 MB. Было cold ~16–25s + full catalog in RAM.

### Проблемы

- SQL readiness/canPublish — аппроксимация для фильтров/метрик; строки страницы — exact JS.
- `view=landing_match` фильтрует по `LandingMatch`, не по полному `LANDING_RULES` engine.
- Public catalog SQL page + landings match SQL — ещё в backlog (пункт 2+).
- SourceCode enum: нужен `::text` в coalesce с `''` (иначе 22P02).

---

## 2026-07-19 — Главная: пропали обложки Teplohod (signed S3)

### Наблюдения

- На daibilet.ru в «Выбор редакции» / «Куда сходить» серые плейсхолдеры у части карточек.
- Рабочие: `ticketscloud-prod.storage.yandexcloud.net`, локальные `/images/cities`, blog covers.
- Битые: `s3.twcstorage.ru/teplohod-private/...` с `X-Amz-Expires=21600` (~6ч) — после TTL HEAD → 500/fail, `img.onError` → серый фон.
- Live TEP API сейчас отдаёт 186/187 first-image как signed S3; стабильный `api.teplohod.info/v1/image?item=EventN&dirtyAlias=…` по-прежнему 200.
- В БД: ~186 `Event.imageUrl` с twcstorage (после sync).

### Решения

- `stabilizeTeplohodImageUrl`: signed S3 → `https://api.teplohod.info/v1/image?item=Event…&dirtyAlias=…`.
- Применить в `pickFirstUsableEventImageUrl` (TS + legacy `dto.js`) и в `tep-import-fixtures.js` при записи.
- One-shot rewrite в prod DB + restart API + revalidate home.

### Проблемы

- Пока sync не обновлён на сервере, следующий `tep:sync` снова мог бы писать signed URL — поэтому патч import обязателен вместе с serve-time rewrite.

---



### Наблюдения

- Квест «Особо опасен» (`…6a3d444c…`, слот 19.07 04:30–06:30 UTC) уже закончился; в TC widget по этому `eventId` — «Мероприятие прошло.»
- Sibling с будущей датой (`…6a3d446f…`, 26.07) в виджете продаётся нормально (несколько слотов).
- Meta: `6a3d42ebe5b04d07b3b015fa`. В БД десятки RECURRING-слотов, не OPEN_DATE.
- Баг UI: после фильтра прошедших сессий `buildWidgetOnlySessions` синтезировал «Билеты с открытой датой» для **любого** TicketsCloud → открывался протухший `eventId`.

### Решения

- Синтетический widget-slot только для `OPEN_DATE` / `open_date` (и в `public-event.dto.ts`, и в legacy `dto.js`).
- Подтягиваем siblings по `EventSourceLink.metaExternalId`, чтобы past slug показывал будущие сеансы.
- `pickPrimarySessionPurchase` переключает `externalId` / `purchaseUrl` / widgetPayload на ближайший продаваемый слот.
- Тест: `public-event-widget-fallback.test.ts`. Аудит блога: `scripts/audit-blog-event-links.mjs`.

### Добивка blog dead links (тот же день)

- Аудит `scripts/audit-blog-event-links.mjs`: 82 уникальных `/events` из MD; после API-фикса «Особо опасен» OK.
- Прошедшие SINGLE без meta (орган/джаз/стендап/балет/…) → ссылки в 8 статьях обновлены на ближайшие будущие слоты + upsert PUBLISHED.
- Фестивали «Былинный берег» / «Фэнтези Фест»: wide-lifetime («Даты в виджете»), не баг fake open-date.

---

## 2026-07-19 — Blog: отложить первый inline image после hero

### Наблюдения

- На mobile после cover hero сразу шёл body `[image]`: float-секция ставила `<img>` первым в DOM, визуально две картинки подряд.
- Типичный MD: 1 абзац → `[image]` (гиды); колонки уже ниже — не трогаем.

### Решения

- `deferLeadingImageBlock` после `filterDuplicateImageBlocks`: первый image переносится после ≥2 paragraph-блоков (везде, не только mobile).
- Убрана ветка `paragraph + next image` → float: предшествующий текст больше не затягивается под image-first layout.
- Правки в `apps/web` и `apps/public` `BlogArticleContent.tsx`.

### Проблемы

- Нет: cover≠inline по-прежнему через `filterDuplicateImageBlocks`.

---

## 2026-07-19 — Blog: вернуть фото в статьи (cover + distinct inline)

### Наблюдения

- У всех PUBLISHED статей cover и `[image]` в MD/DB были, но в HTML body картинка пропадала: `filterDuplicateImageBlocks` вырезает inline, если `src` совпадает с `coverImageUrl`.
- Эталон: `fentezi-fest-bylinnyy-bereg` уже имел отдельный `-inline.jpg` → на странице 2 img.
- В `apps/web/public/images/` не хватало sync `muzyka-v-osobnyakah-spb.jpg` (эталон в `apps/public/...`).

### Решения

- Сгенерированы атмосферные `{slug}-inline.jpg` (без текста), сохранены в `apps/public/public/images/blog/` (+ локальный sync web).
- Frontmatter: явный `coverImageUrl`; body `[image]` → `-inline.jpg`; `blog:sync-bodies`.
- Commit только blog-артефактов (не трогать параллельный jazz-landing), `deploy-prod-next` + `blog:upsert` ×19.

### Проблемы

- HIDDEN `bylinnyy-bereg-*` по-прежнему без cover-файлов на диске (не в scope PUBLISHED).
- Internal revalidate endpoint вернул 401; страницы всё равно отдают cover+inline после upsert (SSR из Article).

### Добивка (тот же день)

- Prod `@af32532`, `blog:upsert` ×19 PUBLISHED — OK.
- Smoke: 4 статьи HTML с 2× `/images/blog/*` (cover+inline), все img 200.
- API `/api/public/articles`: **19/19** с `coverImageUrl`.

---

## 2026-07-19 — Home SEO: точный шаблон description

### Наблюдения

- Title уже ок: «Дайбилет — экскурсии, музеи и мероприятия в городах России».
- Description на prod был в другом порядке: «Билеты на экскурсии и события: … Афиша музеев…» — нужен фиксированный SERP-текст.

### Решения

- Шаблон: `Афиша событий, экскурсий и мероприятий в городах России. Билеты онлайн: Москва — {n}, Санкт-Петербург — {m}, Казань — {k}, Екатеринбург — {e}` (длинное тире).
- Counts только живые из `getHomeDestinations` (slug-хабы); fallback без хардкод-цифр.
- Title без цифр; layout default + OG/Twitter через те же константы.

### Проблемы

- Counts в SERP с лагом ISR (~300s); после deploy нужен curl title/description на prod.

---

## 2026-07-19 — Home SEO title + city counts in description

### Наблюдения

- Title вкладки/default был скудный: «Дайбилет — экскурсии, музеи и билеты» (~40 симв.), description без географии и объёма каталога.
- На главной уже есть `getHomeDestinations` (ISR/`unstable_cache`) с `events` по городам — можно enrichment без отдельного API.

### Решения

- Default title → «Дайбилет — экскурсии, музеи и мероприятия в городах России»; template `%s | Дайбилет` без изменений.
- Home `generateMetadata`: description/OG/Twitter с counts топ-хабов (Москва, СПб, Казань, Екатеринбург) из destinations; title без counts (читаемость ≤~70).
- Константы/helper в `seo-meta.ts` (`HOME_SEO_TITLE`, `buildHomeSeoDescription`).

### Проблемы

- Counts в SERP обновляются с лагом ISR (~`revalidate` home); при недоступности DB — fallback description без цифр.

---

## 2026-07-19 — Blog soft-links: каталог → лендинги

### Наблюдения

- В `chto-poslushat-jazz` «джазовой афише Москвы» вела на сырой каталог `/events?q=джаз&city=moscow`, а не на лендинг жанра.
- Канон: `concertsLandingHref('moscow','jazz')` → `/kontserty/moscow/?genre=Джаз` (prod 200, landing «Концерты…»).
- Аудит soft-links «афише X / подборке»: ещё 3 статьи ссылались на city catalog при наличии тематического лендинга.

### Решения

- Замены: jazz → `/kontserty/moscow/?genre=Джаз`; стендап СПб → `/stendap-i-yumor/`; Казань речные → `/rechnye-progulki/kazan/`; автобусы МСК → `/avtobusnye-ekskursii/moscow/`.
- `blog:sync-bodies` + prod `blog:upsert` ×4 + `revalidate` paths/tags articles.
- Городские `/cities/{slug}` в `afisha-regionalnye-goroda` оставлены (нет тематического лендинга).

### Проблемы

- Полный `deploy-prod-next.sh` не гоняли: контент статей из `Article` после upsert; static bodies на сервере обновлены SCP для следующего билда.

---

## 2026-07-19 - Teplohod orders: отложено (нет API у партнёра)

### Наблюдения

- Партнёр teplohod.info подтвердил: **функционала выгрузки/API заказов нет**.
- Погоня за `TEP_ORDERS_TOKEN` / IP probe / import **остановлена**. Каталог TEP (IP allowlist, `api.teplohod.info/v1`) без изменений.

### Решения

- Prod crontab: строка `tep-orders-sync` (`*/15`) **удалена**; `tc-orders-sync` (`*/10`) не трогали.
- `scripts/tep-sync-orders.js` + `npm run tep:orders` остаются в репо как **заготовка**, не активный prod-path.
- Docs: статус **отложено / нет API**; формулировки про «нужен TEP_ORDERS_TOKEN как блокер» сняты.

### Проблемы

- Заказы Teplohod в админке появятся только если партнёр добавит API или иной канал. TC orders работают.

---

# Diary — Daibilet

Технический дневник проекта. Формат записи: **Наблюдения**, **Решения**, **Проблемы**.

---

## 2026-07-19 — Teplohod orders sync (каркас + probe)

### Наблюдения

- Каталог TEP (`TEP_API_URL=https://api.teplohod.info/v1`, IP allowlist) отдаёт `events`/`cities`; все угаданные paths `/orders`, `/bookings`, `/sales` и т.п. → **404**.
- На `account.teplohod.info` живой REST: `GET /api/orders` и `/api/widgets`, `/api/profile`, `/api/events` → **401 Unauthorized** (endpoint есть, credentials нет). В `.env` prod нет `TEP_ORDERS_TOKEN` / `TEPLOHOD_API_*`.
- Публичной схемы ответа orders у партнёра нет; email-парсинг по-прежнему отвергнут.

### Решения

- `scripts/tep-sync-orders.js` + `npm run tep:orders`: upsert в `ExternalOrder`/`ExternalTicket` (source `src_teplohod`), идемпотентно; без токена → `status=BLOCKED` (не SUCCESS).
- Default URL: `https://account.teplohod.info/api/orders`; auth `bearer` / `access-token` / `both`.
- Cron `deploy/cron/tep-orders-sync.sh` `*/15` рядом с `tc-orders` `*/10` (orders-only, каталог не трогает).
- API: `POST /api/v1/tep/orders/sync` (+ admin alias).
- Документирован список вопросов партнёру (qa + integrations).

### Проблемы

- Импорт **0 заказов** до выдачи токена/схемы. После токена нужен smoke `--dry-run` и сверка полей маппинга.
- Неизвестно, фильтрует ли account API по `widget_id` / dateFrom — передаём как query aliases.

---

## 2026-07-19 — Admin: editable Cities + article publishedAt

### Наблюдения

- Cities в админке были read-only (`GET /api/admin/cities` + бейдж «только чтение»); публичный каталог городов живёт на Prisma `City` (title/slug/SEO/intro/`isDestination`), без `isActive`/`sortOrder`.
- Статьи: `upsertAdminArticle` уже принимал `publishedAt`, но UI не загружал/не сохранял поле — нельзя было разнести даты блога без SQL.

### Решения

- API: `GET/PATCH /api/admin/cities/:id` — update City; slug unique → 409 `slug_not_unique`; invalidate public caches.
- Admin Cities: sheet-форма (title, slug, SEO, intro, hero, isDestination); регионы в списке не PATCH (только City).
- Admin Articles: datetime-local `publishedAt`, колонка даты в списке; при publish пустая дата → now (UI + backend).
- Docs: Project/Tasktracker/Diary обновлены (B.9/B.10).

### Проблемы

- Смена slug города ломает старые `/cities/{old}` URL — оператору нужна осторожность; 301 не делаем в этом тикете.
- Region rows в destination rollup по-прежнему без отдельного PATCH.

---

## 2026-07-19 — Первая колонка Анны (особняки СПб)

### Наблюдения

- Пользователь прислал longform «Музыка с адресом…»; служебная строка: материал можно публиковать; постоянная рубрика — «Город крупным планом» (вместо прежнего «Между эпохами»).
- Multi-event → только `/events/{slug}`, без `[buy]`.
- Сверка READY (prod): Половцов/Вивальди 2700–5100 ₽; Шрёдер/Бетховен от 2000 ₽; Державин при свечах от 3000 ₽ — цены в тексте совпали, правок не потребовалось.

### Решения

- Канон колонки обновлён в `02-anna.md` + `personas.json`.
- Slug `muzyka-v-osobnyakah-spb`, `authorId=anna`, `publishedAt=2026-07-19`.
- Event-ссылки: Вивальди/Половцов `tc-69d01bfbee2762c27d4c183a-вивальди-времена-года`; Шрёдер `tc-69f1fae720d81aa098c549a2-…-бетховен`; Мясников `tc-6a392512b8ea7c7883162f0b-экскурсия-по-особняку-мясникова`; Державин `tc-6a43b6be712a5d192f1793c5-в-свечах-шедевры-классики-в-усадьбе-державина`.
- Обложка сгенерирована → `apps/public/public/images/blog/muzyka-v-osobnyakah-spb.jpg`.
- Commit → `deploy-prod-next` → `blog:upsert --slug=muzyka-v-osobnyakah-spb`.

### Проблемы

- Параллельный dirty worktree (admin audit / blog part 2) — в коммит колонки Анны не включали чужие правки.

---

## 2026-07-19 — Блог часть 2 (7 редакционных гидов)

### Наблюдения

- Пользователь прислал 7 переработанных evergreen-текстов («часть 2»).
- Все multi-event → только markdown `/events/{slug}`, без `[buy]`.
- `spb-razvod-mostov-kakoi-reis` не трогали; обновлён комбинированный `spb-rooftop-guide`.
- Колонка Макса `fentezi-fest-bylinnyy-bereg` не трогалась.

### Решения

- Опубликованы slug: `kazan-rechnye-progulki`, `moskva-rechnye-progulki-zaryade`, `spb-rooftop-guide`, `spb-stendap-gid`, `moskva-master-klass-emal`, `myuzikly-teatr-novichok-msk-spb`, `spb-planetarium-gid` (`authorId=editorial`).
- Сверка READY: ~40 ссылок на события; цены стендапа/балета/возраста органа поправлены по афише.
- Commit → `deploy-prod-next` → `blog:upsert` ×7.

### Проблемы

- READY на Свияжск/Болгар в афише нет — в тексте остались без ссылок, отсылка к `/city/kazan`.
- У части «три разводных» в БД битые `priceFromRub=10`; для гида взят валидный slug с 1050 ₽.

---

## 2026-07-19 — Закрытие дыр аудита админки

### Наблюдения

- Источник аудита: canvas `admin-audit` + Diary 2026-07-14; P0 (лимит 10k / метрики Dashboard≠Events) уже были закрыты ранее (`eventRows(db, null)` + `getCachedAdminGroupedEvents`).
- Оставались P1: detail без override/source description, nav stubs, localhost:5178 в бандле, canPublish ≠ high readiness.
- Заказы: 17/18 archived — не баг sync; `archiveStaleCancelledOrders` уводит cancelled/expired/… старше 30 дней. Confirmed не трогает.

### Решения

- `GET /api/admin/events/:id` → `event` + `override` (LEFT JOIN); UI Content/SEO/Media гидрирует из detail.
- Lean `eventRows`: `left(e.description, 4000)` вместо `null`.
- `publishGate` учитывает high `readinessIssues` → blockers → `canPublish=false`.
- Nav: убраны mapping/taxonomy/audit stubs; Cities/Buyers — бейдж «только чтение»; Settings без localhost и без «auth отключена».
- CORS: для `/api/admin` и sync/db больше нет `Access-Control-Allow-Origin: *`.
- Тесты: `auth.test.ts`, `publish-gate.test.ts`.

### Проблемы

- Полный SQL read-model для Events (без in-memory group) — по-прежнему perf backlog (0.5.8).
- ECR остаётся скрыт в prod (`VITE_DAIBILET_EVENT_CHANGE_REQUESTS` не включаем).

---

## 2026-07-19 — Blog: только ссылки в multi-event + сверка цен/meta

### Наблюдения

- Уточнение продукта: в обзорах с несколькими событиями — markdown-ссылки на `/events/{slug}`, без `[buy]`. Buy только для single-offer статей.
- В MD часто были **латинские** хвосты slug, в prod READY — **кириллические** (тот же TC id).
- `priceFromRub=10` у части рейсов к Дворцовому/Троицкому — артефакт; реальный min offer **1500** / **1300**.

### Решения

- Убраны все `[buy]` из редакционных multi-event гидов и колонки Макса `fentezi-fest-bylinnyy-bereg` (остались 2 ссылки).
- Цены: Скляр 2500, Орган 2000, Гарри Поттер from 940, мосты 1500, коммуналка 850, Труман 400, Лебединое 2000.
- «Цирк Максимус» Уфа: READY slug нет → текст без цены/ссылки, отсылка к `/cities/ufa`.
- Meta seoDescription обновлены без вранья по ценам; `blog:sync-bodies` + upsert.

### Проблемы

- Цирк Максимус в каталоге не найден — не линкуем.
- После правок нужен deploy Next (static bodies fallback) + `blog:upsert` в Article.

---

## 2026-07-19 — Пакет редакционных статей блога (verbatim)

### Наблюдения

- Пользователь прислал 10 переработанных evergreen-текстов (блок «Дайбилет: переработанные статьи блога»).
- `spb-razvod-mostov-kakoi-reis` ранее был HIDDEN + 301 → rooftop; нужен снова отдельный PUBLISHED slug.
- Колонка Макса `fentezi-fest-bylinnyy-bereg` не трогалась.
- Сверка цен с prod READY (API): большинство совпали; расхождения оставлены в тексте пользователя.

### Решения

- Обновлены `content/blog/*.md` + `blog:sync-bodies` + `blog-posts`/`blog-meta` (`authorId=editorial`).
- Снят 301 с `spb-razvod-mostov-kakoi-reis`; rooftop остаётся отдельной статьёй.
- `[buy]` только на найденные READY slug; мягкие ссылки на `/events/…`, города и `/bridges-night` / `/vecherinki-na-teplohode`.
- Commit → `deploy-prod-next` → `blog:upsert` ×10.

### Проблемы / расхождения цен (текст vs карточка)

| Событие | В тексте | На prod |
|---------|----------|---------|
| Игорь Скляр Jazz Classic Community | от 500 ₽ | minPrice **2500** |
| Орган в Планетарии. Белые ночи | от 600 ₽ | minPrice **2000** |
| Музей Гарри Поттера (детские) | от 1390 ₽ | карточка музея **940** (детский тариф мог отличаться) |
| Дворы/парадные «вход» | от 590 ₽ (скидка) | есть READY за 590; соседние «дворы Петроградской» от **290** |
| Коммуналка в связке «дворы+парадные» | от 990 ₽ | отдельная «Экскурсия по коммунальным» от **850** |
| Ночная прогулка к Дворцовому/Троицкому | от 1100 ₽ | ближайший READY «к Дворцовому и Троицкому» **1500** |
| «Цирк Максимус» (Уфа) | от 1200 ₽ | READY slug **не найден** (текст без buy) |

---

## 2026-07-19 — Канон Макса зафиксирован: «Хей, читатели!»

### Наблюдения

- Параллельный агент фильтров вернул старый канон «Эй, кто на маршруте!» / «Путешествуйте…» и open-air PUBLISHED — пользователь отверг.
- На проде нужен полный текст `fentezi-fest-bylinnyy-bereg` + `[buy]` на два TC-события.

### Решения

- `01-max.md` / `personas.json` / README: канон только «Хей, читатели!» → «Мир лучше видеть своими глазами!»; «Эй…» в списке запрещённых.
- Upsert: fest PUBLISHED (6699 chars, has_hey/buy/mir), open-air HIDDEN.
- Prod HTML verified: has_hey=true, has_ey=false, buy labels/slugs present; open-air 404.

### Проблемы

- Concurrent `next build` на 4GB RAM → ENOENT pages-manifest / OOM; нужен flock + stop web на время билда.

---

## 2026-07-19 — Прод-verify: канон Макса на `fentezi-fest-bylinnyy-bereg`

### Наблюдения

- Жалоба: на проде якобы ещё «Эй, кто на маршруте» (короткий черновик). Curl + DB после upsert показывают полный канон.

### Решения

- Повторный `blog:upsert --slug=fentezi-fest-bylinnyy-bereg` + revalidate paths/tags.
- DB: `has_hey=true`, `has_ey=false`, `has_mir=true`, `has_buy=true`, ~6699 chars.
- `docs/Project.md`: канон Макса приведён к «Хей, читатели!» / «Мир лучше видеть своими глазами!».

### Проблемы

- Нет (smoke curl OK).

---

## 2026-07-19 — Формат «Редакция» + rewrite 4 гидов

### Наблюдения

- Пользователь зафиксировал отдельный формат общих статей (не колонки): без приветствий персон, помощь в выборе, честные оговорки, ясный вывод.
- Четыре текста на замену: крыши+мосты, дети, джаз, места в зале.
- `spb-rooftop-guide` и `spb-razvod-mostov-kakoi-reis` пересекались по теме мостов.

### Решения

- Документ формата: `docs/ai-journalists/00-editorial.md`.
- Обновлены MD + статика для 4 slug; `kuda-poyti-s-detmi` → `authorId=editorial`.
- `spb-razvod-mostov-kakoi-reis` → HIDDEN + 301 в `blog/[slug]/page.tsx` → `/blog/spb-rooftop-guide`.
- Soft-ссылки на READY события + `[buy]` (MVP уже есть): крыша, 5 мостов, моряки, джем, Скляр.
- `publishedAt` не сбрасываем (upsert coalesce).

### Проблемы

- Нет.

---

## 2026-07-19 — Колонка Макса: полный текст + `[buy]` shortcode

### Наблюдения

- Короткий черновик на `fentezi-fest-bylinnyy-bereg` (fe99420) отвергнут: нужен полный канон пользователя («Хей, читатели!» → «Мир лучше видеть своими глазами!»).
- Нужна покупка из статьи без MDX: парсер shortcode как у `[CTA]` / `[image]`.

### Решения

- Перезаписан `content/blog/fentezi-fest-bylinnyy-bereg.md` полным текстом Макса; дубли (`*-volhov`, `bylinnyy-bereg-fentezi-fest`, `open-air-festy-vyhodnoi-ru`) → HIDDEN.
- MVP `[buy slug="…" label="…"]` → `BlogBuyButton.client.tsx` → `LandingPurchaseButton` / fallback `/events/{slug}`.
- Кнопки: `tc-6a08d60c3aa2e7a8469953dc-bylinnyi-bereg-2026`, `tc-6a0a1d4d69c61af2fb0eb202-fentezi-fest-2026`.
- Канон Макса в `01-max.md` / `personas.json`: приветствие «Хей, читатели!», финал «Мир лучше видеть своими глазами!».

### Проблемы

- Нет.

---

## 2026-07-19 — Колонка Макса: rewrite → `fentezi-fest-bylinnyy-bereg`

### Наблюдения

- Пилот `open-air-festy-vyhodnoi-ru` (песок + Автодром) отвергнут как «набор букв»; нужна одна связная история.
- В афише живые события: Былинный Берег 2026 и Фэнтези Фест 2026 — одна площадка у Захарьино (Волхов), соседние даты, одни организаторы.

### Решения

- Новая колонка `fentezi-fest-bylinnyy-bereg` (Макс): 4 абзаца + финал, ~1430 знаков visible; канон «Эй, кто на маршруте!» / «Путешествуйте. Оно того стоит».
- Старый `open-air-festy-vyhodnoi-ru` → `status: HIDDEN` (MD + upsert).
- Новые обложка/inline; byline в `BlogArticleHero` показывает `authorName` (Макс), не тип «Колонка».
- Публикация: commit → push → `deploy-prod-next.sh` → `blog:upsert` обоих slug.

### Проблемы

- Pseudo-city `regions` для Новгородской области в фильтре блога (нет отдельного City slug в карточке).

---

## 2026-07-19 — Блог: фильтры город+автор + канон приветствия Макса

### Наблюдения

- На `/blog` нужны шарируемые фильтры; отдельный «тип статьи» дублирует голос автора (колонка = Макс и т.п.).
- «Касатики, привет» слишком близко к маркеру Птушкина — риск плагиата.

### Решения

- Prisma: `Article.authorId` / `authorName` / `articleType` + миграция с backfill по slug.
- UI: два фильтра — **Город** и **Автор** (имена: Макс, Анна, Елена, Редакция…); query `?city=&author=`.
- Канон Макса: приветствие **«Эй, кто на маршруте!»**; прощание «Путешествуйте. Оно того стоит» оставлено.
- Обновлены `01-max.md`, `personas.json`, статья `open-air-festy-vyhodnoi-ru`, upsert/DTO.

### Проблемы

- Pseudo-города `regions` / `multi` для фильтра (нет строки в `City`) — маппинг в DTO по slug.

---

## 2026-07-19 — Колонка Макса: `open-air-festy-vyhodnoi-ru`

### Наблюдения

- Первый пилот «Изнанка маршрута»: open-air выходного (песчаный фест + Автодром Фест из живой афиши).
- Форма: 4–5 абзацев, ~1200–1800 знаков, обложка + inline, канон приветствия/финала Макса + приёмы Perito (вердикт, изнанка, лайфхак, виджет).

### Решения

- MD `content/blog/open-air-festy-vyhodnoi-ru.md` (`authorId=max`); карточки web+public; `blog:sync-bodies`.
- Перепись под стандарт § «Референс Perito» в `01-max.md` (альтернатива чеклисту, «норм но не норм», изнанка рядом с кайфом, CTA в виджет).
- Картинки в `apps/public/public/images/blog/` (+ sync web).
- Публикация: commit → push → `deploy-prod-next.sh` → `blog:upsert --slug=open-air-festy-vyhodnoi-ru`.

### Проблемы

- UI byline по `authorId` ещё нет — метаданные только в frontmatter.

---

## 2026-07-19 — Референс Perito → колонка Макса (события/экскурсии)

### Наблюдения

- Пользователь дал референс [Perito / Птушкин — Балканы](https://perito.media/posts/ptushkin-balcans): сильные стороны — ритм коротких блоков, честный вердикт, бытовая деталь, фото на секцию, разговорный тон без PR.
- Нужно «близко, но по событиям и экскурсиям», не тревел по странам.

### Решения

- В `docs/ai-journalists/01-max.md` добавлена секция **«Референс Perito»**: адаптация приёмов (очередь, гид, виджет, что взять, изнанка, эмоция 1.5–2 мин).
- System prompt Макса: 4–5 абзацев, 1200–1800 знаков; README + `personas.json` + `content-blog-plan.md` синхронизированы.
- Чужой текст не копируем — только форма и честность угла.

### Проблемы

- Пилот `open-air-festy-vyhodnoi-ru` сразу писался под обновлённый канон (Perito-приёмы + System prompt Макса).

---

## 2026-07-19 — Блог: разнести publishedAt (7–19 июля)

### Наблюдения

- Все 17 PUBLISHED статей на prod имели даты либо июньские evergreen, либо пачку на 18–19 июля (4 новых MD).
- Список на `/blog` сортируется по `Article.publishedAt` из API; static `date` в `blog-posts.ts` — fallback.

### Решения

- Равномерно-естественно разнесены даты **2026-07-07 … 2026-07-19**: evergreen раньше, 4 свежих гида ближе к сегодня.
- Обновлены `apps/web` + `apps/public` `blog-posts.ts`, frontmatter в `content/blog/*.md`, прямой `UPDATE` на prod.
- `blog:upsert` не трогает существующий `publishedAt` (coalesce) — для дат нужен SQL/admin PATCH.

### Проблемы

- После UPDATE нужен revalidate/cache flush публичного `/api/public/articles` (TTL кэша).

---

## 2026-07-19 — Favicon: билет слишком мелко во вкладке

### Наблюдения

- В tab браузера синий билет выглядел крошечным: диагональный силуэт + большое прозрачное поле (~30–40% линейного размера).
- Это именно favicon вкладки, не Google SERP.
- Параллельный деплой на 3.8Gi RAM ломал Next (OOM/SIGTERM) — сайт кратко отдавал 502, затем восстановлен.

### Решения

- Увеличен fill (~90% кадра); временно на prod — горизонтальный classic ticket (Flaticon-style, `#4A7FD4`), чтобы убрать «пугающую» мелкую диагональ.
- PNG: 32 / 48 / 96 / apple 180 / 192 / 512 + `favicon.ico`; `site.webmanifest` с 192+512.
- `layout.tsx` metadata.icons + `manifest: /site.webmanifest`. Проверено live: `/favicon-48x48.png`, `/icon-512x512.png`, `/site.webmanifest` → 200.

### Проблемы

- Кэш favicon в браузере агрессивный — hard refresh / новая вкладка.
- Не гонять два `next build`/`deploy-prod-next` одновременно на prod (OOM).

---

## 2026-07-19 — Favicon: снова 45°, но крупный fill

### Наблюдения

- После замены на горизонтальный Flaticon ticket пользователь ожидает снова поворот ~45°.
- Горизонталь была намеренной реакцией на жалобу «диагональ мелкая/пугающая», не финальным отказом от угла.

### Решения

- Тот же силуэт ticket_1912 / `#4A7FD4`, `rotate(45)` + `scale(0.88)` → AABB ~88–90% кадра, мало padding.
- Перегенерированы 32/48/96, apple 180, 192/512, logo-192, ico, svg (`apps/web/public` + legacy `apps/public/public/favicon.svg`).
- layout/manifest без изменений.

### Проблемы

- Нужен hard refresh / новая вкладка из‑за кэша favicon.

---

## 2026-07-19 — Favicon: зеркальный угол rotate(-45)

### Наблюдения

- После `rotate(45)` пользователь уточнил: нужна **другая сторона** диагонали → `rotate(-45)`.
- Крупный fill (`scale(0.88)`, ~88–90% кадра) оставляем.

### Решения

- SVG: `translate(24 24) rotate(-45) scale(0.88) translate(-24 -24)` в `apps/web/public/favicon.svg` + legacy `apps/public/public/favicon.svg`.
- Перегенерированы PNG 32/48/96, apple 180, 192/512, logo-192 и `favicon.ico`.

### Проблемы

- Hard refresh / новая вкладка обязательны — браузерный кэш favicon не инвалидируется сам.

---

## 2026-07-19 — Favicon: оптическое центрирование после rotate(-45)

### Наблюдения

- Во вкладке Chrome синий билет ощущался **смещённым влево-вверх**.
- AABB после `rotate(-45) scale(0.88)` геометрически по центру (равные pad), масса почти в центре; визуальный сдвиг даёт оптика: полные углы короткой оси смотрят в TL/BR, вырезы — в BL/TR.

### Решения

- Компенсация после pivot: `translate(24 24) translate(1.2 1.2) rotate(-45) scale(0.88) translate(-24 -24)`.
- Обновлены SVG (`apps/web/public` + legacy `apps/public/public`) и перегенерированы 32/48/96, apple 180, 192/512, logo-192, `favicon.ico`.

### Проблемы

- Hard refresh / новая вкладка — кэш favicon в Chrome не сбрасывается сам.

---

## 2026-07-19 — «Выбор редакции»: дедуп combo-family (не убирать секцию)

### Наблюдения

- Пользователь уточнил: секцию «Выбор редакции» **оставить**, но не показывать пачку near-duplicate «Комбо 1/2/5/7» Музей Гарри Поттера.
- У комбо разные `groupKey` (`ticketscloud|комбо N|…`), поэтому старый dedup по groupKey/title не схлопывал siblings.
- Предыдущая правка ошибочно вырезала весь блок — откатили.

### Решения

- Секция `#editors-pick` возвращена в `HomePageContent` / legacy `App.tsx`.
- Добавлен `sessionFamilyKey`: на одной площадке все title вида «Комбо…» → один слот; `merge|` groupKey тоже family.
- `seenFamilies` в shared `HomePickState` для editors-pick / home-now / popular.
- Файлы: `home-showcase-sections.ts`, `home-now-section.ts` (web + public).

### Проблемы

- Долгосрочно лучше проставить `mergeGroupKey=harry-potter-spb` в override (скрипт уже есть) — тогда каталог сам схлопнет siblings.

---

## 2026-07-19 — ИИ-журналисты: канон Макс/Анна/Елена/Игорь/Артур

### Наблюдения

- Пользователь уточнил: нужны **колонки-статьи** и **стиль письма**, не «голос»/подкаст.
- Финальные System prompt заменили вымышленные имена (Родион/Аглая/…) на Макс, Анна, Елена, Игорь, Артур.
- У `Article` / `BlogPost` нет поля author — byline пока через docs/frontmatter.

### Решения

- Переписан `docs/ai-journalists/`: `01-max` … `05-artur`, `personas.json` v2, README без терминологии voice/audio.
- В каждом профиле канонический блок `## System prompt` дословно; структура заметки — 4 абзаца.
- Колонки: «Изнанка маршрута», «Между эпохами», «Спокойный маршрут», «Место силы», «На вкус».
- Пилот: **Анна** или **Елена** — лучший fit с текущей афишей.
- Материал не писать, пока пользователь не даст тему.

### Проблемы

- Fair-use: в гайдах только короткие маркеры/URL; полные чужие тексты не копировать в блог.
- Prisma `authorId` отложен до реальных колоночных публикаций.

---

## 2026-07-19 — ИИ-журналисты блога: персоны и стилевые гайды (черновик имён, superseded)

### Наблюдения

- Нужны несколько устойчивых манер письма колонок, а не единый «нейро-SEO» тон.
- У `Article` / `BlogPost` нет поля author — byline пока только через docs/frontmatter.
- Текущий каталог сильнее завязан на МСК/СПб культуру, реки, семью, театр/выставки.

### Решения

- Первичный черновик с именами Родион/Аглая/Мила/Тихон/Павел — **заменён** каноном Макс/Анна/Елена/Игорь/Артур (см. запись выше).

### Проблемы

- Термин «voice» путал с аудио — убран в пользу «стиль письма / register».

---

## 2026-07-19 — Admin group readiness: NO_FUTURE не блокирует при future-sibling

### Наблюдения

- `groupAdminEventRows` / UI `groupAdminRows` брали `worstReadiness` по siblings: past-only слот с `NO_FUTURE_SESSIONS` красил всю карточку как «Блокер», даже если в группе есть будущий сеанс.
- Representative `startsAt` = earliest → после merge нельзя судить о future только по полю группы.

### Решения

- После группировки: `finalizeGroupedAdminReadiness` — если в группе был future-слот, убрать только `NO_FUTURE_SESSIONS`; прочие high-issues оставляют `blocked`.
- Backend: merge `readinessIssues`/`readinessCodes` + флаг `_groupHasFutureSession`; admin UI — зеркальная логика.
- Unit: `apps/backend/src/admin-group-readiness.test.ts`.

### Проблемы

- Нужен деплой **API** (dto.js / admin grouped cache), иначе prod продолжит отдавать старый `worstReadiness`. Admin static — желателен для клиентского regroup, но source of truth — backend cache.

---

## 2026-07-19 — Prod: 4 статьи + upsert + digest cron

### Наблюдения

- Deploy `feat/next-monorepo` → `/opt/daibilet` (SHA `63b6af3`), Next health OK.
- `npm run blog:upsert`: 4 статьи `PUBLISHED` в `Article`; публичные URL `/blog/...` → 200.
- Первый `blog:weekly-digest`: создан `afisha-nedeli-2026-07-18` status=`REVIEW`, public 404 (ожидаемо).
- Crontab: сохранён `*/10` tc-orders; добавлен `0 7 * * 0` blog-weekly-digest.

### Решения

- Дайджест **не** публиковать автоматом — тонкий черновик (2 события, нужна редактура); публикация вручную в Admin → Блог.
- Temp ops-скрипты на сервере/локально удалить после прогона.

### Проблемы

- Digest SQL сейчас слабо наполняет МСК/СПб (0 capital в первом прогоне) — донастроить фильтр city slug / createdAt в следующем цикле.

---

## 2026-07-19 — 4 статьи блога + weekly digest

### Наблюдения

- Пятый заголовок («Как купить билет на Дайбилете») снят по решению продукта — лишний trust/help.
- Прод читает статьи из `Article`; статика `blog-posts.ts` — карточки + SSR fallback; полный текст раньше в fallback сводился к excerpt.
- Обложки эталонно лежат в `apps/public/public/images/blog/` и копируются в Next public.

### Решения

- Контент 4 статей в `content/blog/*.md`; sync тел → `blog-article-bodies.ts`; upsert → `npm run blog:upsert`.
- Обложки сгенерированы (1536×1024), подключены по slug.
- Weekly digest: `scripts/blog-weekly-digest.js` + `deploy/cron/blog-weekly-digest.sh` (вс 07:00), status=`REVIEW`, без auto-publish.
- Документы: [content-blog-plan.md](./content-blog-plan.md), [deploy/cron/README.md](../deploy/cron/README.md).

### Проблемы

- Без деплоя и `blog:upsert` на prod полные тексты в БД не появятся (SSR fallback уже отдаёт bodies из статики).
- Первый cron-прогон дайджеста нужно поставить вручную на сервере (`crontab`).

---

## 2026-07-19 — Инвентарь статей блога (антидубли)

### Наблюдения

- Два источника контента: статика `apps/web/src/data/blog-posts.ts` и prod `Article`.
- Запрос к БД с prod: из `/opt/daibilet/apps/backend` + `NODE_PATH=…/node_modules` и `.cjs` (package `"type":"module"` ломает `require` в `.js`; `/tmp` + голый `pg` — нет).
- Статика и БД: по **13** статей, одинаковые slug; заголовки в БД чуть длиннее SEO-варианты.
- Уже закрыты: семья, концерты, джаз МСК, реки МСК/Казань, крыши/мосты/дворы/стендап/планетарий СПб, автобус МСК, эмаль, регионы.

### Решения

- Правило «не повторяться» зафиксировано в [content-blog-plan.md](./content-blog-plan.md): инвентарь обоих источников + 5 новых заголовков вне закрытых кластеров.
- Temp `tmp-list-articles` после инвентаря удалён (локально и с prod).

### Проблемы

- При расхождении статика↔БД карточки/SEO могут «плыть» — перед публикацией новых статей сверять оба источника.

---

## 2026-07-19 — Яндекс.Метрика на публичном Next

### Наблюдения

- В `apps/web` не было GTM/GA/Метрики — только JSON-LD и виджеты TC/TEP.
- Privacy/Legal уже упоминают Яндекс.Метрику как возможный инструмент аналитики.
- Admin (`apps/admin`) — отдельное приложение; счётчик нужен только на daibilet.ru.

### Решения

- Клиентский `YandexMetrika` (`next/script` `afterInteractive`) + `<noscript>` pixel в root `layout.tsx`.
- ID: `106786540` (override через `NEXT_PUBLIC_YANDEX_METRIKA_ID`), init: `ssr`, webvisor, clickmap, ecommerce `dataLayer`, accurateTrackBounce, trackLinks.
- Паттерн env как у виджетов; в admin Метрику не ставим.

### Проблемы

- Хиты появятся в кабинете Метрики только после деплоя Next на prod; SPA-переходы App Router при `ssr:true` обычно ок, при сомнениях — проверить «онлайн» после клиентской навигации.

---

## 2026-07-19 — Скрейпер liliabots.ru копирует афишу

### Наблюдения

- В Google выдаче `liliabots.ru` индексирует карточки с брендом «Дайбилет» (title/snippet с ценами и площадками) — зеркало/парсер контента.
- Публичный HTML и `/api/public/*` открыты без сессии (by design MVP); rate limit на API уже есть (60r/m).

### Решения

- `robots.txt`: `User-agent: liliabots|liliabot` → `Disallow: /`.
- Nginx: `map $daibilet_block_scraper` + `403` на `daibilet.ru` / `api.daibilet.ru` (`patch-prod-nginx-scraper-block.py`).
- Параллельно: жалоба в Google на копирование (Remove outdated content / Legal) — UA-блок не удаляет уже проиндексированные страницы зеркала.

### Проблемы

- Скрейпер может ходить с поддельным Chrome UA — тогда нужен Cloudflare Bot Fight / WAF и ужесточение HTML rate limit.

---

## 2026-07-19 — Cron TC orders-only + контент-план блога

### Наблюдения

- Зеркало заказов Ticketscloud на prod не обновлялось с 13.07 — sync только ручной, без cron; каталог (TEP 6ч) заказы не тянет.
- Teplohod orders API в интеграции не описан; email-парсинг отклонён как MVP-путь.
- Блог давно не обновлялся; нужен контент-план и еженедельный дайджест новых событий.

### Решения

- `deploy/cron/tc-orders-sync.sh` + crontab `*/10` только `npm run tc:orders` (`created_at=from,to`, lookback 3 дня, flock). Каталог не трогаем.
- Smoke 2026-07-18: импортирован 1 заказ TC `done` (первая внешняя продажа) + 1 билет.
- Контент-план: [content-blog-plan.md](./content-blog-plan.md) — 5 заголовков + дизайн weekly digest → Article status=`review`.

### Проблемы

- TEP-продажи в админке появятся только после partner orders API.
- Auto-publish дайджеста без редактора — не включать.

---

## 2026-07-18 — Google SERP: favicon + WebSite JSON-LD

### Наблюдения

- В выдаче Google сайт отображался как серый глобус + URL `daibilet.ru` вместо «Дайбилет» и цветной иконки.
- На проде `GET /favicon.ico` → **404**; в HTML не было `link rel="icon"` с PNG.
- SSR JSON-LD `WebSite` + `Organization` уже был в `apps/web/app/layout.tsx`, но `Organization.logo` указывал на несуществующий `/favicon.ico`.
- `robots.txt` иконки не блокирует (`Allow: /`).
- `og:site_name` / title template (`%s | Дайбилет`) уже заданы в root metadata.

### Решения

- Добавлены стабильные PNG: `/favicon-48x48.png`, `/favicon-96x96.png`, `/icon-192x192.png`, `/logo-192x192.png`, `/apple-touch-icon.png` (+ SVG/ICO fallback) в `apps/web/public/`.
- В root `metadata.icons` — `rel="icon"` type `image/png` (48/96/192) и apple-touch.
- JSON-LD `Organization.logo` → `https://daibilet.ru/logo-192x192.png` (192×192); `WebSite.name` = «Дайбилет», SearchAction на `/events?q={search_term_string}`.
- Для появления в SERP нужен деплой Next + переобход Google (дни/недели).

### Проблемы

- Без commit/push стандартный `deploy-prod-next.sh` (git pull) правки не подхватит.

---

## 2026-07-18 — Русификация UI админки

### Наблюдения

- Во всех разделах админки оставались английские бейджи и подписи: `imported`, `need attention`, `backend`, `Save`/`Close`, статусы `published`/`review`/`auto`, SEO-метки `index`/`noindex`, `Override`/`Source`.

### Решения

- Переведены пользовательские строки в страницах Events, Landings, Articles, Venues, Sources, Mapping, Settings, Dashboard, Change Requests и в shell/primitives.
- `StatusBadge` по умолчанию показывает русские статусы вместо сырых `live`/`draft`.

### Проблемы

- Имена провайдеров (Ticketscloud, Teplohod.info) и технические slug/SEO-поля оставлены как бренды/термины.

---

## 2026-07-18 — Full sync TC+TEP

### Наблюдения

- `tc:full-sync` на prod сохранил catalog; `tc-import-catalog` упал на `Event_slug_key` — `slugify(...).slice(0,120)` обрезал `externalId` у длинных title.
- `tep:sync` завершился: 187 events / 18129 sessions / 18577 ProviderLink.

### Решения

- `buildEventSlug(title, externalId)` — suffix id всегда внутри 120 символов; повторный `tc:import` после фикса.

### Проблемы

- —

---


### Наблюдения

- С `md` гамбургер скрывался, а desktop-nav включался, но City/Search — только с `lg` → на планшете шапка переполнялась и выглядела «неадаптивной».

### Решения

- Мобильное меню до `lg`; desktop nav с `lg`, второстепенные ссылки с `xl`.
- На `<lg` в шапке только гамбургер + логотип; поиск / FAQ / вход / избранное — в sheet.
- С `lg` — пиктограммы действий в шапке как раньше.
- Spacer height: 4rem до lg, 4.5rem с lg.

### Проблемы

- —

---


### Наблюдения

- После `860c818` (restore legacy widgets) из `TeplohodWidget.client.tsx` пропал `bootstrapTeplohodWidgets()` / повторный `TI_Tickets.init`.
- На `/events/[slug]` оставался пустой `.teplohod-info-wrapper` без кнопки — script грузился, но init после hydration не вызывался.
- На лендингах lean DTO без `purchaseUrl`/`externalId`; `LandingPurchaseButton` звал `getTeplohodWidgetIds` без парсинга `evt_tep_*`.

### Решения

- Восстановлен bootstrap + wait на `TI_Tickets.init`, retry mount, fallback на `account.teplohod.info`.
- Event buy card передаёт `purchaseUrl` в embed.
- Лендинги: `getTeplohodWidgetIdsFromSession` + `resolveTeplohodCheckoutUrl` (ID из `evt_tep_*`).
- Каталог `/events` по-прежнему без widget markup (`suppressPurchaseAnchors`).

### Проблемы

- —

---


### Наблюдения

- Полный admin catalog cache (~25s cold) при TTL 60s заставлял Events/Dashboard/Landings снова ждать при каждом «протухании».
- После SWR каталога: Events/Dashboard ~10–40 ms, но Landings ~700–800 ms (`matchesRule` × rules × ~3k) и Sources ~2.5 s (тяжёлый SQL).

### Решения

- Stale-while-revalidate каталога: fresh 5 мин, stale до 30 мин + фоновый rebuild; soft-invalidate; warm на startup.
- Landings: memo `adminLandingsBaseCache` по `catalogBuiltAt` + fingerprint saved landings; invalidate на PATCH landing/match.
- Sources: SWR fresh 2 мин / stale 10 мин; invalidate вместе с admin catalog.
- Warm startup: после grouped cache прогреваем Landings list + Sources.

### Проблемы

- Первый cold после hard-expire всё ещё дорогой — редкий кейс.
- Hotfix после `dcada19`: при вставке landings-кэша пропал `let adminGroupedEventsCache` → warm падал с ReferenceError; восстановлено.

---

### Наблюдения

- `eventRows(..., 10000)` обрезал admin Events/Landings; dashboard брал saleable public groups → расхождение 2526 vs 1353.
- Lean `description=null` давал ложный WEAK_DESCRIPTION почти на всём каталоге.
- В cache declaration свойство было `events`, а код читал `.items` (после populate писалось `items` — хрупко).

### Решения

- Admin cache: полный `eventRows(null)`, single-flight promise, ключ `items`.
- Dashboard launch metrics из того же `getCachedAdminGroupedEvents` (`source: admin_event_groups`).
- Lean: `descriptionLength` для readiness; `eventRowsByIds` через `WHERE id = ANY(...)`.
- Landing candidates переиспользуют cache.

### Проблемы

- Первый cold build admin cache на полном каталоге может быть медленным (~секунды); кэш 60с + single-flight.

---

## 2026-07-14 — Полный аудит админки (prod)

### Наблюдения

- В ходе аудита `GET /api/admin/events` и `/landings` отдавали **500** (`syntax error at or near "text"`): в lean `eventRows` SQL template случайно попали JS `//` комментарии после фикса override.
- Admin events cache режет `eventRows(..., 10000)` → `sourceEvents=10000`, `groupedEvents=1353`, тогда как dashboard/public показывают **2526** групп; readiness-метрики списка (needs_attention **1352**) не совпадают с dashboard (**0**).
- Stub-навигация: mapping / taxonomy / audit-log / settings; ECR API есть, UI в бандле выключен.
- Override description в lean после фикса читается (пример `evt_tep_370`); source `e.description` в lean по-прежнему null.

### Решения

- Hotfix `ea27651`: убраны JS-комментарии из SQL; api restart на prod — Events/Landings снова 200.

### Проблемы

- Неполный admin-каталог из-за hard limit 10k — P0 к следующему фиксу.
- Расхождение Dashboard vs Events metrics — P0/P1 для операционной достоверности.

---

## 2026-07-14 — Legacy widgets + description overrides + paragraphs

### Наблюдения

- Собственная iframe-модалка checkout — лишний велосипед; в legacy (`apps/public`) покупка шла через TC `data-tc-event` click и Teplohod embed + `.ti-tickets-event-tickets-buy`.
- Override описания «не сохранялся»: lean `eventRows` обнулял `override.description` / SEO-тексты → ContentTab открывался пустым и PATCH затирал БД `null`.
- Описания «полотенцем»: в Next `splitDescriptionParagraphs` не имел legacy fallback по одиночным `\n` (только blank lines), затем `cleanDisplayText` схлопывал всё в один абзац.

### Решения

- Purchase CTA снова на legacy-виджеты (без CheckoutModal в CTA).
- Lean admin list снова отдаёт override text fields; после PATCH инвалидируем `adminGroupedEventsCache`.
- `splitDescriptionParagraphs` как в legacy (+ soft-wrap join); заголовки разделов → `<h3>` по эвристике.

### Проблемы

- Source `e.description` в lean-списке по-прежнему null (тяжёлое поле) — в ContentTab подпись Source может быть пустой; override при этом читается/пишется корректно.

---

## 2026-07-14 — Checkout via own iframe modal (TC + TEP)

### Наблюдения

- Вендорные tcwidget.js / Teplohod Fancybox нестабильны в Next (synthetic click, style#loader, fallback races).
- Checkout URL обоих провайдеров **можно встраивать в iframe** (нет X-Frame-Options).

### Решения

- `CheckoutModal` + `CheckoutModalButton`: наша модалка с iframe на `ticketscloud.com/v1/widgets/common` и `account.teplohod.info/order/event-order`.
- Event page / landing / catalog purchase CTA переведены на эту модалку — предсказуемый UX без зависимости от vendor DOM.

### Проблемы

- Подход отозван: вернулись к legacy vendor widgets (см. запись выше).

---

## 2026-07-14 — Root cause: TC style#ticketscloud-loader misdetected as spinner

### Наблюдения

- В `tcwidget.js` `#ticketscloud-loader` — это **`<style>` в `<head>`**, а не DOM-спиннер. После первого запуска он остаётся навсегда.
- Next `openTcWidget` считал его «stuck loading», сносил overlay/`dismissTcWidget` и открывал popup — TC-модалка выглядела «не грузится».
- Teplohod отдельно ломали auto-`window.open` на account (уже чинили); оставили Vite-подобный init + без агрессивного dismiss.

### Решения

- Visible = iframe **или** `div#tc-widget-overlay` (не STYLE).
- Больше не удаляем `style#ticketscloud-loader`; не считаем его stuck.
- `openTcWidget`: ensure + `ticketsCloudWidget.init` + click; popup fallback только если shell не появился ~4с.
- Teplohod: `async` script + повторный `init` после paint.

### Проблемы

- —

---

## 2026-07-14 — Teplohod fancybox killed by account fallback

### Наблюдения

- На event 554 (`…-za-1-chas-554`) виджет Teplohod рисует кнопку «Купить билеты» inline; выбор дат/категорий должен открываться в Fancybox-модалке.
- Наш `bindTeplohodBuyFallback` через 2.5s открывал `account.teplohod.info` во вкладке, если Fancybox ещё не детектился — UX «не в модалке» + вторая кнопка fallback.
- `openTeplohodPurchase` мог закрывать пустой Fancybox и тоже уводить во внешний checkout.

### Решения

- Убран auto-`window.open` с клика buy; fallback-ссылка только если кнопка Teplohod так и не смонтировалась (~8с).
- `openTeplohodPurchase` больше не dismiss'ит Fancybox; внешний URL — last resort.
- z-index для `.fancyboxtkt-*`; parse `event_id` из account checkout URL.

### Проблемы

- —

---

## 2026-07-14 — TC widget infinite loader again

### Наблюдения

- После клика «Купить» Ticketscloud рисует `#tc-widget-overlay` + `#ticketscloud-loader` до iframe.
- `isTcWidgetVisible` считал overlay успехом → fallback на `purchaseUrl` не срабатывал, loader крутился бесконечно.
- TEP: `ensureTeplohodWidgetScript` мог resolve до появления `TI_Tickets.init`.

### Решения

- Visible = реальный iframe (не overlay/loader); stuck loading → dismiss + popup fallback.
- Teplohod script wait до `TI_Tickets.init`.

### Проблемы

- iframe может появиться пустым и всё ещё крутиться — если повторится, добавить проверку contentDocument/timeout внутри iframe.

---

## 2026-07-14 — Catalog list description restored

### Наблюдения

- Lean list DTO убрал `description` вместе с widget URL / full slots; на `/events` горизонтальные карточки потеряли excerpt при том, что UI (`formatListDescription`) уже его ждал.
- Основной perf-выигрыш был от виджетов в list HTML и hydrate page-only, не от самого текста описания.

### Решения

- `toPublicCatalogListItem` снова отдаёт `description` как plain-text excerpt (≤420 символов, без HTML).
- `PublicCatalogListItemDto.description` возвращён в контракт; `EventCardHorizontal` типизирован под list DTO.

### Проблемы

- Полный HTML description в list по-прежнему не нужен (раздувает JSON); detail остаётся на event page.

---

## 2026-07-14 — ChunkLoad после redeploy + harden deploy

### Наблюдения

- После `deploy-prod-next.sh` старые вкладки запрашивали chunk hashes предыдущего билда → 404 / `ChunkLoadError` (Application error).
- Актуальный HTML уже ссылался на новые chunks; проблема клиентского кэша сессии, не nginx static proxy.

### Решения

- Prod: `systemctl stop daibilet-web` → `rm -rf apps/web/.next/cache` → start → internal revalidate (home/catalog tags+paths).
- `deploy-prod-next.sh`: очистка `.next/cache` перед start + post-deploy `POST /api/internal/revalidate`; **re-exec после `git pull`**, чтобы хвост скрипта не оставался от старой версии.
- `ChunkLoadRecovery` в root layout: один `location.reload()` на ChunkLoad / dynamic import failure per session.
- Prod: заполнен пустой `DAIBILET_NEXT_REVALIDATE_SECRET` (раньше всегда 401).

### Проблемы

- PowerShell+SSH quoting ломает Bearer/json в one-liner; для ad-hoc лучше remote Python/scp.
- На prod `DAIBILET_NEXT_REVALIDATE_SECRET` в `.env` был **пустым** → post-sync/deploy revalidate всегда 401; сгенерирован и прописан новый секрет, web+api перезапущены.

---

## 2026-07-14 — Docs + commit + prod deploy (admin pagination + catalog perf)

### Наблюдения

- Worktree содержал админскую пагинацию, compact dashboard, catalog lean DTO, SEO redirects и Teplohod checkout fix — без пуша.
- Одноразовые `scripts/inspect-*` / `probe-*` / `scrape-*` не входят в коммит.

### Решения

- Документы: Project/Tasktracker/Diary/current-state обновлены под контракты admin API и catalog perf rules.
- Deploy: `feat/next-monorepo` @ `6175ad5` → prod (`deploy-prod-next.sh`); nginx www→apex 301 применён; Next matcher hotfix (static array).

### Проблемы

- SQL LIMIT read-model (0.5.8) остаётся следующим perf-блоком после warm-cache wins.
- На сервере перед pull был stash `pre-deploy-f59d52c` (локальные hotfix-файлы) — не потерять при необходимости.

---

## 2026-07-14 — Catalog/perf + metrics + SEO redirects

### Наблюдения

- `/api/public/events?limit=50` собирал весь grouped catalog и hydratил upcomingSlots до тысячи карточек, потом slice.
- В HTML `/events` в каждой карточке жили скрытые TC/Teplohod widget-блоки.
- Dashboard launch metrics считал raw Event rows, public `/stats` — saleable groupKey.
- SSR city/landing тащили 160–240 полных сессий (~1.7–2 МБ HTML).
- `www.daibilet.ru` и старые `/river-cruises` не 301.

### Решения

- Catalog API: shared cache без full slot hydrate; hydrate только page slice; lean list DTO без widget URL.
- Catalog cards: `suppressPurchaseAnchors` по умолчанию; horizontal без widget markup.
- Dashboard launch metrics = public catalog groups (`source: public_catalog_groups`); UI предпочитает `launch.groupedEvents`.
- City SSR ≤48 lean items; landing sessions ≤48 lean.
- Middleware/next.config: www→apex + `/river-cruises`→`/rechnye-progulki`; `pageTitle`/`og:url` route-specific.
- Warm/revalidate: stats, events page, SPB/MSK, river/bus landings.

### Проблемы

- Полный SQL LIMIT на группах (без in-memory filter catalog) всё ещё впереди — отдельно materialized PublicCatalogGroup.

---

### Наблюдения

- Codex acceptance: не только client-side slice; API `page/limit/q` → `{ page, pages, limit, total, rows }`.
- Gaps: cities без pager; landings list без page params; landing detail hard-cap `events.slice(0, 160)` без «Далее»; dashboard раньше ещё отдавал пустые `*Rows` массивы (и importJob).
- Events/venues/buyers/orders уже имели envelope + UI pager, но events/venues всё ещё filter-after-full-load (не SQL OFFSET).

### Решения

- Cities: `destinationSummaryRowsFast` + `page/limit/q` + UI Назад/Далее.
- Landings list/detail: page envelope; detail events paginated (`page/limit/q`); reuse `getCachedAdminGroupedEvents`.
- Dashboard contract: только `generatedAt` + `metrics` (compact).
- hydrateAdminData больше не затирает локальные row-fallback через `Object.assign` всего payload.

### Проблемы

- **Performance blocker (отдельный):** `buildAdminEventsList` / landings match всё ещё собирают полный grouped catalog в JS, потом slice. Нужен Prisma/SQL read-model с group+filter+page в БД.

---

## 2026-07-14 — Teplohod widget fallback → «Ошибка!»

### Наблюдения

- На дискотеке `event/1375` клик по виджету открывал fallback `https://teplohod.info/event/1375`, а публичные `/event/{id}` у Teplohod сейчас отдают 404 «Ошибка!».
- Рабочий checkout: `https://account.teplohod.info/order/event-order?widget_id=14208&event_id=…` (тот же URL, что в fancybox `data-src`).
- Fallback срабатывал через ~700 ms, если fancybox ещё не смонтировался.

### Решения

- `buildTeplohodUrl` / purchase URLs → account checkout + `widget_id`.
- Игнор старых `offerDeeplinkUrl` на teplohod.info/event/* для TEP.
- Клиент: `resolveTeplohodCheckoutUrl`, timeout fallback 2.5 s.

### Проблемы

- Публичные карточки на teplohod.info/event/* недоступны — зависимость от account checkout.

---

## 2026-07-13 — Admin lists: pagination / load

### Наблюдения

- Админские списки (orders/buyers/events/landings/venues) грузили почти всё в память: `eventRows(10000)` с полными `description`, у заказов — `jsonb_agg` всех билетов, пагинация была только в JS после полной выборки.
- UI pager на Events/Orders уже был, на Buyers/Venues — нет; Landings тащили полный каталог ради счётчиков правил.

### Решения

- Orders/Buyers: lean SQL (counts + distinct titles без полного jsonb билетов); детали билетов — только в `GET /orders/:id`.
- Events/Landings: `eventRows(..., { lean: true })` без description/SEO blob; кэш grouped events 60с для списка событий.
- Venues/Buyers: page/limit в API + pager в UI.
- Ответ списка заказов не тащит tickets payload — sheet и так подгружает detail.

### Проблемы

- Полная замена на SQL `LIMIT/OFFSET` для events после `groupAdminEventRows` ещё впереди: пока lean + cache, фильтры по-прежнему на сгруппированном наборе.
- Поисковый q по номеру билета в списке заказов слабее (нет ticket ids в lean row) — детали по-прежнему в карточке заказа.

---

## 2026-07-11 — Slice 5: help, blog, legal, my-orders

### Наблюдения

- Slice 5 портирован из Vite `apps/public`: trust pages, FAQ `/help`, блог (static fallback + API), `/my-orders` lookup.
- Codex (`codex/phase2-foundation`, `229ad3b`) продолжает Phase 2 backend: schema, Event Change Requests, docs по spbboats; коммит `5b18225` переводит **`apps/public` на Next + proxy** — конфликтует с Path B (`apps/web`).
- Client-компоненты (`HelpPage`, `MyOrdersPage`) не могут импортировать async `SiteLayout` (тянет `pg` в client bundle).

### Решения

- Slice 5 — только `apps/web`, без merge Codex Next/proxy.
- `SiteLayout`: try/catch при `buildPublicDestinationsDto` — build без локальной БД не падает.
- `HelpPage` / `MyOrdersPage`: обёртка `SiteLayout` на server `page.tsx`, контент — в client view.
- Добавлены `public-articles.dto`, `public-orders.dto`, API routes `/api/public/articles`, `/orders`.
- Header: ссылка «Помощь»; footer: blog, help, legal links.

### Проблемы

- Локальный `pnpm web:build` без Postgres на `:5437` — static pages с пустым footer city block (на prod при build БД доступна).
- Wholesale merge Codex по-прежнему невозможен (~429 files diff).

---

## 2026-07-10 — F3 staging cutover выполнен

### Наблюдения

- Staging сервер был на `integrate/mvp-launch` + Node 20; для F3: Node 22, pnpm, checkout `feat/next-monorepo`.
- `start-web.sh` в systemd пересобирал Next при каждом start — заменён на `start-web-prod.sh`.
- nginx `/api/` → `:4001` (legacy), `/` → Next `:3000`.
- Smoke script падал из-за `pipefail` + pipeline вне `check()` — исправлено.

### Решения

- Deploy: `deploy-staging-next.sh`, `patch-staging-next.py`, `daibilet-web-staging.service`.
- Staging URL: https://staging.daibilet.ru — SSR catalog/landings в HTML.
- Prod cutover — следующий шаг (rollback plan нужен).

### Проблемы

- `/api/health` через nginx = backend (by design); Next health на `:3000` отдельно.
- Widget click — manual smoke.

---

## 2026-07-10 — Codex audit + split стратегия + старт F3

### Наблюдения

- На GitHub **нет** ветки `codex/phase2-finance-next`; Codex работает в **`codex/phase2-foundation`** (`229ad3b`, unrelated history с `feat/next-monorepo`).
- Codex сделал Phase 2 schema (~66 models), Event Change Requests, admin queue — **ценно для cherry-pick**.
- Codex также перевёл **`apps/public` на Next с proxy** на `:4000` (`5b18225`) — **конфликтует** с Path B (`apps/web`, full-stack read).
- Cursor F2 complete: `apps/web`, 36 landing SSG paths, parity script.

### Решения

- **Canonical public Next:** только `apps/web` на `feat/next-monorepo`. Codex Next/proxy **не мержить**.
- **Интеграция Codex:** cherry-pick schema + event change requests + admin contracts **после F3 cutover** ([codex-cherry-pick-plan.md](./codex-cherry-pick-plan.md)).
- Handoff обновлён: [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md).
- F3 артефакты: `deploy-staging-next.sh`, `daibilet-web-staging.service`, `staging-next.conf.snippet`, `launch-staging-smoke-next.sh`.

### Проблемы

- Wholesale merge `codex/phase2-foundation` → guaranteed conflicts (schema, Next app location, lockfile).
- F3 server-side deploy требует ops на staging (213.171.7.16) — локально только scripts/docs.

---

## 2026-07-10 — F2 закрыт: landings ISR, filters, widgets, parity

### Наблюдения

- Legacy landings используют сложную URL-схему: category-first (`/rechnye-progulki/moscow/`) и city-first (`/saint-petersburg/night-bridges/`). Логика портирована из `landing-routes.ts` SPA.
- `buildPublicLandingPage` / `buildPublicLandingPageManaged` уже в `dto.js`; для Next достаточно wrapper `public-landing.dto.ts` по аналогии с venue/city.
- Next build pre-renderит 36 landing paths (9 one-segment + 23 two-segment) с `revalidate=3600`.
- Каталог typed DTO использует `from`/`to` для date range; legacy URL — `dateFrom`/`dateTo`. Маппинг добавлен в `parseCatalogPageQuery`.

### Решения

- Landings: ISR + `generateStaticParams` для top slugs; catch-all `[segment]`/`[segment2]`/`[segment3]` с `notFound()` для не-landing путей.
- Middleware 301: `/landings/*` и misordered `/{city}/{category}` → canonical landing href.
- Widgets: SSR рендерит цену/описание; `PurchaseWidget.client.tsx` — Teplohod → TC → external link.
- Parity: `pnpm backend:next:parity` — расширенный catalog (city/date/sort) + landing slugs + optional HTTP compare (`WEB_BASE_URL` vs `LEGACY_BASE_URL`).
- F3 checklist вынесен в отдельный doc.

### Проблемы

- `pnpm` не в PATH на некоторых Windows-средах — сборка через `npm exec pnpm -- web:build`.
- `/podborki` с `searchParams` остаётся dynamic (ƒ) несмотря на `revalidate` — приемлемо для MVP.
- Полный UI landings (3600 строк SPA) не портирован — упрощённый SSR view + EventCard grid.

---

## 2026-07-10 — F2 core: catalog, event, city, venue SSR

### Наблюдения

- Next bundler ломал `createRequire` в `db.ts` — заменён на прямой `import pg`.
- `@daibilet/backend` в `transpilePackages`, `pg` в `serverExternalPackages`.

### Решения

- Read path через `@daibilet/backend/public-read` без HTTP proxy.
- Catalog default 100, selector 100/200/300 в `@daibilet/contracts/catalog`.

### Проблемы

- Type casts в public-city.dto.ts для совместимости с Next build — временно до F5.

---

## 2026-07-10 — F1: monorepo shell

### Наблюдения

- Path B утверждён: SEO не откладываем, full-stack Next.

### Решения

- pnpm workspaces, apps/web Next 15, packages/contracts + config.

### Проблемы

- Prod остаётся на Vite до F3 cutover.

---

## 2026-07-10 — F3 prod cutover + Post-F3 cherry-pick (slice 1–4)

### Наблюдения

- Prod Next на **:3001** (staging :3000) — один хост, разные порты.
- Snapshot rollback: `/var/backups/daibilet/pre-next-20260710-185139`.
- `next build` OOM на 3.8GB RAM — workaround: остановить staging Next на время build.
- Smoke: SSR через nginx ✅; локальный `:3001` health может флапать при restart systemd.
- Codex cherry-pick: 4 migrations + schema 29→66 models, ECR backend + admin contracts + Vite page.

### Решения

- Prod nginx patched (`patch-prod-next.py`), `daibilet-web` enabled.
- Cherry-pick через `git checkout origin/codex/phase2-foundation -- <paths>` (не wholesale merge).
- Admin UI за `VITE_DAIBILET_EVENT_CHANGE_REQUESTS=1`; API routes wired в `server-entry.ts`.
- Codex Next/proxy (`5b18225`) по-прежнему **skip**.

### Проблемы

- `pnpm db:deploy` на staging/prod ещё не выполнен — нужен backup `5438`/`5437`.
- `backend:test:ts` не включает ECR tests — запускать отдельно `tsx --test src/event-change-request-*.test.ts`.

---

## 2026-07-10 — Next UI polish (slice 1): design system + shell + home

### Наблюдения

- F3 data path готов, но Next выглядел «голым»: 3 nav-ссылки, минимальный footer, простые карточки.
- Vite public содержит полный design system (~290 строк CSS) и Header/Footer с 7 разделами.

### Решения

- Порт `globals.css` + tailwind tokens из `apps/public`.
- Header: fixed blur, mobile sheet, полная nav (events/cities/venues/locations/podborki).
- Footer: 4 колонки (события, города, компания), email.
- Home: gradient hero + поиск, популярные события, city cards, format tiles, trust block.
- EventCard: рейтинг, price pill, hover, category chip.

### Проблемы

- Полный UI parity (landings block renderer, catalog advanced filters, auth/favorites) — следующие slices.
- `/images/cities/*.png` — static assets на nginx, не в repo; fallback emoji + `heroImageUrl` из API.

---

## 2026-07-11 — Next UI polish (slice 3): event page hero + sticky buy

### Наблюдения

- После slice 1–2 event page оставалась на упрощённом `PurchaseWidget`: без hero, без sticky buy card, без списка сеансов.
- Vite `EventPage.tsx` — эталон: full-bleed hero, breadcrumbs, mobile CTA, buy card с категориями/сеансами, TC slot-клики, Teplohod embed.

### Решения

- `EventHero` + `EventBuyCard` в `EventPage.client.tsx`; описание/теги — `EventPageSections.tsx`.
- Утилиты: `event-page-utils.ts` (цены, возраст, HTML описание), `event-purchase.ts` (TC targets, purchasable sessions).
- `TcWidget.client.tsx`: `TcSessionSlot`, hero/default `TcWidgetButton`, session rows.
- `TeplohodWidget.client.tsx`: embed с `#teplohod-widget`, CSS override, hero scroll+click.
- Layout `/events/[slug]`: hero → 2-col (content + sticky `top-20`) → related events.

### Проблемы

- Slice 4 (landings block renderer) и slice 5 (auth/help/legal) — следующие.
- QuickInfo на event page упрощён vs Vite (без event-location resolver) — достаточно для functional parity.

---

## 2026-07-11 — Next UI polish (slice 4): landings content blocks

### Наблюдения

- Backend (`dto.js`) уже отдаёт `blocks` (DB `LandingContentBlock` или `buildDefaultLandingBlocks`).
- Next `LandingPageView` показывал только заголовок + карточки событий — без trust/value/city grid/FAQ.

### Решения

- `LandingContentBlocks` + `LandingFaqSection` — порт типов блоков из Vite.
- Типизация `PublicLandingPageDto.blocks` → `LandingContentBlockDto[]`.
- Секция событий `#variants` для CTA anchor.

### Проблемы

- Полный landing parity (hero sticky, filters, bridges/dinner profiles) — отдельно, не slice 4.
- Slice 5: auth/pages (`/help`, `/blog`, legal).

## 2026-07-19 — Google Search Console verification

### Наблюдения
- Нужен HTML-файл верификации Google по URL `/googleb3313872246ac993.html`, по аналогии с Yandex (`apps/web/public/yandex_*.html`).
- Статика Next отдаётся из `apps/web/public/`; дублирование в `apps/public/public/` для verify-файлов не требуется.

### Решения
- Добавлен `apps/web/public/googleb3313872246ac993.html`; commit + deploy на prod, чтобы URL сразу отвечал 200.

### Проблемы
- Нет.
---

## 2026-07-19 - Prod CPU/RAM mitigation (legacy Docker off + systemd limits + TEP spread)

### Наблюдения

- Host 3.8Gi: swap был почти полный (~2Gi used) при одновременном legacy Docker + staging + prod Next/API.
- Prod трафик: nginx → systemd `daibilet-web:3001` / `daibilet-api:4000`; БД prod = `daibilet-tours-postgres:5437`.
- Legacy compose (frontend/backend/admin/supplier/postgres16/redis) и staging (api:4001, postgres:5438, redis) не обслуживали daibilet.ru / admin.daibilet.ru.
- TEP auto-sync каждые 360 мин + сразу warm/revalidate (~30–45s warm) давали пик вместе с import (~80–120s).

### Решения

- Остановлены (stop + `restart=no`, volumes **не** удалялись): legacy Docker stack + staging postgres/redis; systemd `daibilet-api-staging` / `daibilet-web-staging` stop+disable.
- Оставлен: `daibilet-tours-postgres`, `daibilet-web`, `daibilet-api`.
- systemd MemoryHigh/MemoryMax + `NODE_OPTIONS=--max-old-space-size` (web 896/1400M, api 1024/1536M); drop-ins в `deploy/systemd/*.service.d/memory.conf`.
- TEP: default interval 12h; warm delay 15 min; startup delay 10 min; import через `nice`; env в `deploy/env/prod.env.example`.
- Мониторинг: `deploy/scripts/watch-tep-sync-load.sh`, `deploy/scripts/oom-watch.sh` (+ hourly cron).

### Проблемы

- После stop available RAM вырос, swap упал ~2Gi→~65Mi — нужно подтвердить стабильность под лимитами MemoryMax при следующем sync.
- staging.daibilet.ru временно без API/DB до явного start контейнеров/units.
- Rollback: `docker start` нужных контейнеров; `systemctl enable --now daibilet-*-staging`; убрать drop-ins / вернуть `TEP_AUTO_SYNC_*`.


---

## 2026-07-19 - Admin grouped readiness: future sibling clears NO_FUTURE_SESSIONS

### Наблюдения
- После группировки sibling-событий past-only слот с `NO_FUTURE_SESSIONS` красил всю карточку как blocked, даже если в группе есть future-сеанс.
- Backend (`groupAdminEventRows` / `finalizeGroupedAdminReadiness`) — source of truth; Admin UI зеркалит ту же логику.

### Решения
- `finalizeGroupedAdminReadiness`: при `groupHasFutureSession` снимается только `NO_FUTURE_SESSIONS`; остальные high-issues остаются.
- Зеркало в `apps/admin/src/pages/EventsPage.tsx`; unit-тест `admin-group-readiness.test.ts` в `test:ts`.

### Проблемы
- Prod deploy выполнен: API `daibilet-api` + admin static `/var/www/daibilet/admin` на `bb7fc9c`.
- Health OK; unit-тест admin-group-readiness 4/4 на сервере.

---

## 2026-07-19 - Deploy: grouped readiness fix (API + admin)

### Наблюдения
- Задеплоен `bb7fc9c`: restart `daibilet-api`, Vite build admin → `/var/www/daibilet/admin`.
- Без полного `deploy-prod-next.sh` (Next web не трогали).
- Health `/api/health` OK; `admin-group-readiness.test.ts` 4/4 pass на prod.

### Решения
- Source of truth — backend grouping; admin static обновлён зеркалом UI.

### Проблемы
- Auto-stash на сервере после pull (untracked drop-ins уже в commit) — можно drop; не влияет на readiness.

---

## 2026-07-19 - CPU/RAM audit follow-up (cron +x, TEP isolation, oom-watch)

### Наблюдения
- 	c-orders-sync.sh на prod был без execute bit → crontab */10 писал Permission denied.
- In-process TEP auto-sync + full public warm на каждом рестарте API давали пики CPU/RAM на 3.8Gi.
- Hourly oom-watch не ловил рост swap / приближение к MemoryHigh между часами.

### Решения
- chmod +x на cron/scripts в git (100755) и на prod; flock в tc-orders сохранён.
- Deploy discipline: комментарий в deploy-prod-next.sh + README — один controlled restart sequence.
- TEP: TEP_AUTO_SYNC_ENABLED=0 + cron/systemd 	ep-catalog-sync (nice + MemoryMax); in-process fallback с startup delay 45m + skip-if-fresh 6h.
- DAIBILET_PUBLIC_STARTUP_WARM=0 — полный warm только post-sync delayed.
- oom-watch каждые 5 мин; alerts в oom-watch-alerts.log при swap>350Mi или MemoryCurrent≥90% MemoryHigh.
- PG в Docker не трогали (optional later, documented).

### Prod apply (2026-07-19)
- Commit 9fb19c3 pulled; cron +x; env TEP_AUTO_SYNC_ENABLED=0, startup delay 45m / skip-if-fresh 6h, DAIBILET_PUBLIC_STARTUP_WARM=0.
- Crontab: 	c-orders */10, oom-watch */5, 	ep-catalog-sync 20 */12.
- One restart daibilet-api only. Smoke: API/web health 200; tc-orders ran (no Permission denied); journal: in-process TEP disabled + startup warm skipped.

### Проблемы
- После смены env нужен **один** restart daibilet-api (не пачкой).
- Первые минуты после отключения startup public warm — cold cache до первого трафика / post-sync warm.


## 2026-07-19 — Prod: битый .next mid-deploy + cleanDisplayText

### Наблюдения
- После фикса cleanDisplayText параллельный deploy оставил .next без prerender-manifest.json → daibilet-web crash-loop, сайт 502 / Application error.
- Статика /_next/static через proxy на Node: при down Next → 502 на chunks.

### Решения
- `systemctl stop` → `rm -rf apps/web/.next` → `pnpm web:build` → start; `/events` и event slug 200, journal без `cleanDisplayText`.

### Проблемы
- Нельзя параллелить два `deploy-prod-next` на одном хосте.

---

## 2026-07-22 — Phase 2: Admin Supplier Control Plane

### Наблюдения
- В SPBBOATS полезны инварианты, но не весь тяжелый контур: ticket category отдельно от слота, импортные расписания read-only, checkout идемпотентный, финансы строятся поверх ledger.
- В Daibilet уже есть Prisma foundation: `Supplier`, `SupplierUser`, `CheckoutOrder`, `CheckoutItem`, `Payment`, `RefundRequest`, `Payout`, `SupplierLedgerEntry`, `SupplierReport`, `SupplierDocument`, `Review`.
- Поэтому первый шаг фазы 2 лучше делать не новой миграцией и не включением YooKassa, а управляемым экраном готовности поставщиков.

### Решения
- Добавлен contract layer для `AdminSuppliersListDto` / `AdminSupplierDetailDto`.
- Добавлен Prisma-backed backend read-model:
  - `GET /api/admin/suppliers`
  - `GET /api/admin/suppliers/:id`
- Добавлена admin page `/suppliers`: поиск, фильтр статуса, таблица, detail drawer, readiness, события, заказы, ledger/finance summary, отзывы.
- Readiness блокирует internal checkout, если нет активного поставщика, владельца ЛК, verified legal profile, основного счета, комиссии или YooKassa shop id.

### Проблемы
- Реальные платежи не включены: это сознательно, Phase 1 widget-first не трогаем.
- Общий backend typecheck в текущей ветке падает на существующих строгих ошибках `public-catalog.mapper.test.ts` и `public-city-venues.test.ts`; новый supplier unit test проходит.
- Следующий шаг: supplier LC read-first API/app shell или STUB checkout на одном manual/internal событии.
## 2026-07-22 — Phase 2: Admin Event Schedule API

### Observations

- Phase 2 checkout cannot safely sell an abstract event. It needs either a concrete `EventSession` slot plus ticket category, or an `OPEN_DATE` product.
- SPBBOATS invariant stays: imported TC/Teplohod schedules are source-managed and read-only; manual/Daibilet-managed schedules can be edited through admin.

### Decisions

- Added admin contracts and backend routes for `GET/PATCH /api/admin/events/:id/schedule`.
- Added session operations: create, update, cancel and restore.
- Guardrails cover `SOURCE_MANAGED`, `scheduleLocked`, `SINGLE`, `RECURRING`, `OPEN_DATE`, duplicate start times and capacity below already sold tickets.
- Every schedule mutation writes `EventChangeLog` and invalidates public caches.

### Problems

- Minimal admin Schedule tab is connected; Offers editor and recurrence-rule generator are still next.
- Full backend typecheck still fails on pre-existing strict issues in `public-catalog.mapper.test.ts` and `public-city-venues.test.ts`; new schedule tests pass.

---

## 2026-07-22 — Phase 2: Supplier LC read-first API/app shell

### Decisions

- Added supplier-facing contracts (`SupplierPortal*Dto`) separate from admin supplier DTOs.
- Added protected read-only backend endpoints:
  - `GET /api/supplier/me` / `GET /api/supplier/profile`
  - `GET /api/supplier/dashboard`
  - `GET /api/supplier/events`
  - `GET /api/supplier/orders`
  - `GET /api/supplier/finance`
  - `GET /api/supplier/reviews`
- Supplier identity is currently resolved by `supplierId`, `slug` or `supplier` query param; real supplier auth replaces this later.
- `/api/supplier/*` is protected by the production Basic Auth guard to avoid leaking buyer/order PII before supplier auth exists.
- Added `apps/supplier` Vite/React shell with Dashboard, Events, Orders, Finance, Reviews and Profile.

### Verification

- `@daibilet/contracts typecheck` passed.
- `@daibilet/supplier` typecheck and Vite build passed.
- Targeted backend tests passed for supplier portal, admin supplier readiness and schedule management.
- Full backend typecheck still has the pre-existing strict test errors in `public-catalog.mapper.test.ts` and `public-city-venues.test.ts`.

### Next

- STUB checkout on one manual `DAIBILET_MANAGED` event with explicit ticket offers and concrete session/open-date policy.

---

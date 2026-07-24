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

- Нет (commit + deploy ниже).

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

## 2026-07-24 - Ultrawide: hero strip crop (home + catalog)

### Наблюдения

- На 21:9 / 32:9 `HeroLayout` imageOverlay сжимался в низкую полосу по контенту; `object-cover` по 3:2 кадрам (1536x1024) оставлял ~15-20% высоты - резал лица/края даже после face-safe focus (`37678e6`).
- Каталоги (events/venues/locations/cities/blog) шли с `object-center` без пула focus.
- Более широких ассетов в `/images/hero` нет - только те же 3:2.

### Решения

- `HeroLayout` media: `2xl` min-h `min(70vh,34rem)` + `@media (min-aspect-ratio: 21/9)` min-h `min(70vh, 100vw/2.35)` / max-h 70vh; контент `flex-1 justify-center`. Mobile без изменений.
- `HeroMedia`: нет `objectPosition` → `objectPositionForHeroSrc` (пул slavic/friends) или `HOME_HERO_OBJECT_POSITION_DEFAULT` с 2xl/ultrawide Y ~28-32%.
- Per-frame focus в `home-hero-images` дополнен ultrawide breakpoints.

### Проблемы

- Новые stock не качали; если на 32:9 всё ещё тесно по бокам - следующий шаг art-direction / более широкие кадры.
- **Prod @`d47c300`** (includes `2004e4b`): deploy-prod-next OK после unblock blog promo (`pg` out of client); `/` `/venues` `/events` 200; CSS с `min-aspect-ratio:21/9` / face-safe object-position.

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

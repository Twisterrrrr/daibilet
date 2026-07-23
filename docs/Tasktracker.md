# Tasktracker тАФ Daibilet

**╨Ю╨▒╨╜╨╛╨▓╨╗╨╡╨╜╨╛:** 2026-07-24
**╨Ш╤Б╤В╨╛╤З╨╜╨╕╨║╨╕:** [Project.md](./Project.md), [current-state.md](./current-state.md), [widget-etalon-slugs.md](./widget-etalon-slugs.md), [content-blog-plan.md](./content-blog-plan.md)

**╨Ы╨╡╨│╨╡╨╜╨┤╨░:** тЬЕ done ┬╖ ЁЯФД in progress ┬╖ тП│ todo ┬╖ ЁЯЪл blocked ┬╖ тЪая╕П deferred

---

## Hero UX (2026-07-24)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| H.1 | Shared `HeroLayout` + `HeroMedia` (LCP priority) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| H.2 | Home imageOverlay/rotator + Prisma `HeroBanner` + admin toggle | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `72ea839` prod migrate+deploy |
| H.3 | `/cities` split + RF map hover + top tiles ISR 1h | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| H.3b | `/cities` top tiles + ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╨│╨╛╤А╨╛╨┤╨░┬╗: max-w-5xl + items-stretch (╨║╨░╨║ podborki) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `d1ccd8a` prod |
| H.3c | `/cities`+/`podborki`: H1 ╨╕ row ╨╜╨░ ╨╛╨┤╨╜╨╛╨╣ ╨╛╤Б╨╕ `HeroLayout` max-w-5xl; blog featured = container width | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| H.3d | `/cities` imageOverlay photo hero + search (╨║╨░╨║ venues); tiles/map ╨╜╨╕╨╢╨╡ ╨╜╨░ max-w-5xl | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | ЁЯФД |
| H.4 | `/podborki` featured+trending equal-height, centered `max-w-5xl` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `533d40a` prod @`d1ccd8a` |
| H.5 | `/venues` dark imageOverlay + search | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ MVP |
| H.6 | `/locations` withMap (map points on list) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | ЁЯФД stub: RussiaMap + filters; pin map follow-up |
| H.7 | Video loop asset ╨┤╨╗╤П home | ╨Э╨╕╨╖╨║╨╕╨╣ | тП│ ╨╜╨╡╤В ╨░╤Б╤Б╨╡╤В╨░ - rotator images |
| H.8 | Blog Featured Hero + interactive list H1 + ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗├Ч3 + min price | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `b45995c` prod @`c39d124` |
| H.8b | `/blog` featured+┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗: max-w-5xl composition + square thumbs | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `90f6151` prod @`d1ccd8a` |
| H.8c | `/blog` list hero тЖТ imageOverlay + search/chips ╨▓╨╜╤Г╤В╤А╨╕ (╤Г╤А╨╛╨▓╨╡╨╜╤М venues) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | ЁЯФД |

---

## Catalog perf (2026-07-24)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| P.V1 | `/venues`+`/locations`: lean Prisma `_count` ╨▓╨╝╨╡╤Б╤В╨╛ session hydrate ╨┤╨╗╤П ╨┐╨╗╨╕╤В╨╛╨║ | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `9af3910` (deploy pending SSH) |
| P.V2 | Suspense + pulse skeletons ╨╜╨░ ╤Д╨╕╨╗╤М╤В╤А╨░╤Е (city/type), ╨▒╨╡╨╖ full-page loader | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `9af3910` |
| P.V3 | `Venue @@index([title])` + migrate `20260724030000_venue_title_search_index` | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ `9af3910` (migrate on deploy) |

---

## ╨Ш╨╜╤Ж╨╕╨┤╨╡╨╜╤В╤Л prod (2026-07-19)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| I.1 | ╨Я╤Г╤Б╤В╤Л╨╡ ╨│╨╗╨░╨▓╨╜╨░╤П + `/events`: stats 500 (`destination.name` on null) тЖТ empty home cascade | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ hotfix `dto.js` + restart API/web |
| I.2 | Web follow-up: SiteLayout Suspense fallback + CatalogShell SSR keep (rebuild) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тП│ ╨▓ worktree `daibilet-push` |
| I.3 | Telegram OG: WebpageBot ╨▓╨╕╨┤╨╕╤В, ╤З╨░╤В╤Л ╨╜╨╡╤В; ╨┐╨╗╨╛╤Й╨░╨┤╨║╨╕ ╨▒╨╡╨╖ title/desc | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | ЁЯФД nginxтЖТsocial-preview + venue twitter тЬЕ `1c81cdf`; **╨▒╨╗╨╛╨║╨╡╤А: AAAA ╨▓╤Б╤С ╨╡╤Й╤С ╨▓ DNS** |
| I.4 | Infinite full-page reload (`/blog`+): ChunkLoadRecovery ╨╝╨░╤В╤З╨╕╨╗ hydration #418 ╨┐╨╛ chunk filename | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `85b8cfe` + deploy-prod-next |
| I.5 | Chunk 400 / `cities/%5Bslug%5D`: mid-build overwrite `.next` + static via Node proxy | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `ee8daad` + deploy-prod-next |
| UI.1 | ╨Х╨┤╨╕╨╜╤Л╨╣ ╨╜╨╡╨╣╤В╤А╨░╨╗╤М╨╜╤Л╨╣ strip ╤И╨░╨┐╨╛╨║: `/events`, `/blog`, city hub, `/podborki` (+ intents) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `fc5e309` prod @`db34d03` |

---

## ╨Я╤А╨╛╨┤╤Г╨║╤В╨╛╨▓╤Л╨╣ ╤Д╨╛╨║╤Г╤Б (2026-07-22) тАФ SEO-╨╗╨╕╤Б╤В╨╕╨╜╨│╨╕ ╨┐╤А╨╕╨╛╤А╨╕╤В╨╡╤В╨╜╨╡╨╡ ╨▒╨╗╨╛╨│╨░

**╨б╨┤╨▓╨╕╨│ ╨┐╤А╨╕╨╛╤А╨╕╤В╨╡╤В╨░:** ╨╛╨▒╤Л╤З╨╜╤Л╨╡ ╤Б╤В╨░╤В╤М╨╕ ╨▒╨╗╨╛╨│╨░ ╨▓╤В╨╛╤А╨╕╤З╨╜╤Л; ╤Д╨╛╨║╤Г╤Б ╨╜╨░ **╨з╨Я╨г SEO-╨╗╨╕╤Б╤В╨╕╨╜╨│╨░╤Е** category├Чcity (+ intent `/podborki/...`).

## ╨а╨╡╤И╨╡╨╜╨╕╨╡ ╨▓╨╗╨░╨┤╨╡╨╗╤М╤Ж╨░ (2026-07-23)

- ╨Ъ╤А╤Г╨┐╨╜╤Л╨╣ ╨┐╨╛╤В╨╛╨║ **F4 admin тЖТ Next** - **in progress** (kickoff 2026-07-23).
- ╨в╨╡╨║╤Г╤Й╨╕╨╣ launch-╤Д╨╛╨║╤Г╤Б ╨┐╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╨╛ - ╨║╨░╤З╨╡╤Б╤В╨▓╨╛ landing matching ╨╕ ╨░╨║╤В╤Г╨░╨╗╤М╨╜╨╛╤Б╤В╤М ╤Б╨╛╨▒╤Л╤В╨╕╨╣ ╨▓╨╛ ╨▓╤Б╨╡╤Е ╨┐╨╛╤Б╨░╨┤╨║╨░╤Е.
- Finance contour / ╨Ы╨Ъ ╨┐╨╛╤Б╤В╨░╨▓╤Й╨╕╨║╨╛╨▓ ╨╛╤В╨╗╨╛╨╢╨╡╨╜: ╨┐╤А╨╛╨┤╤Г╨║╤В ╨╡╤Й╤С ╨╜╨╡ ╨│╨╛╤В╨╛╨▓. ╨Ш╨╖╨╝╨╡╨╜╨╡╨╜╨╕╤П Codex finance ╨╜╨╡ ╤В╤А╨╛╨│╨░╨╡╨╝.

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б | Ownership |
|---|--------|-----------|--------|-----------|
| SEO.1 | ╨д╨╛╤А╨╝╤Г╨╗╤Л Title/Description category├Чcity (`seo-listing-meta.ts`) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ | ╨░╨│╨╡╨╜╤В |
| SEO.2 | On-page SEO ╤В╨╡╨║╤Б╤В╤Л TOP seed (~18 ╤И╤В., 1000тАУ1200) ╨┐╨╛╨┤ ╤Б╨╡╤В╨║╨╛╨╣ | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ | ╨░╨│╨╡╨╜╤В (seed); ╨▓╨╗╨░╨┤╨╡╨╗╨╡╤Ж - ╤Г╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╡/╨┐╤А╨░╨▓╨║╨╕ |
| SEO.3 | Thin pages: `noindex,follow` ╨╡╤Б╨╗╨╕ &lt; 6 ╨╛╤Д╤Д╨╡╤А╨╛╨▓; sitemap filter | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ | ╨░╨│╨╡╨╜╤В |
| SEO.4 | MULTI_CITY: standup / family-kids / concerts / active-sport + SPB/MSK/Kazan | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ | ╨░╨│╨╡╨╜╤В |
| SEO.5 | Intent ╨з╨Я╨г `/podborki/{intent}` (+ city) + preset links | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ | ╨░╨│╨╡╨╜╤В |
| SEO.6 | `/contacts` + footer/sitemap trust | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ | ╨░╨│╨╡╨╜╤В |
| SEO.7 | Event trust strip | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ | ╨░╨│╨╡╨╜╤В |
| SEO.8 | TOP-15 launch set: ╨▓╨╛╨┤╨╜╤Л╨╡, ╤Б╤В╨╡╨╜╨┤╨░╨┐, ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕, ╨║╤Г╨╗╤М╤В╤Г╤А╨░, intent; ┬л╨║╤А╤Л╤И╨╕┬╗ ╤В╨╛╨╗╤М╨║╨╛ ╨б╨Я╨▒ | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 | ╨▓╨╗╨░╨┤╨╡╨╗╨╡╤Ж ╤Г╤В╨▓╨╡╤А╨┤╨╕╨╗, ╨░╨│╨╡╨╜╤В ╨▓╨╜╨╡╨┤╤А╨╕╨╗ |
| SEO.8a | Editorial polish ╤В╨╡╨║╤Б╤В╨╛╨▓ TOP-15, ╨▓ ╨┐╨╡╤А╨▓╤Г╤О ╨╛╤З╨╡╤А╨╡╨┤╤М ╨╜╨╛╨▓╤Л╨╡ `walking-tours`, `country-tours`, `exhibitions`, `unusual-theatres`, `excursions`, `rooftops` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | ЁЯФД seed ╨│╨╛╤В╨╛╨▓, ╨╜╤Г╨╢╨╜╨░ ╤А╨╡╨┤╨░╨║╤В╨╛╤А╤Б╨║╨░╤П ╨▓╤Л╤З╨╕╤В╨║╨░ | ╨▓╨╗╨░╨┤╨╡╨╗╨╡╤Ж + ╨░╨│╨╡╨╜╤В |
| SEO.8b | `country-tours`: ╤В╤А╨╡╨▒╨╛╨▓╨░╤В╤М ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╛╨╜╨╜╤Л╨╣ ╨╕ ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╤З╨╡╤Б╨║╨╕╨╣ ╤Б╨╕╨│╨╜╨░╨╗╤Л, ╨╕╤Б╨║╨╗╤О╤З╨╕╤В╤М ╨║╤Г╨╗╤М╤В╤Г╤А╨╜╤Л╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╤П ╨┐╨╛ ╤В╨╛╨┐╨╛╨╜╨╕╨╝╨░╨╝ | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 | runtime `dto.js` ╤Б╨╕╨╜╤Е╤А╨╛╨╜╨╕╨╖╨╕╤А╨╛╨▓╨░╨╜, prod deploy + smoke: 3 ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕, ╨▒╨╡╨╖ ╨╛╨┐╨╡╤А╤Л ╨╕ ╨║╨╛╨╜╤Ж╨╡╤А╤В╨╛╨▓ |
| SEO.8c | ╨Р╤Г╨┤╨╕╤В ╨▓╤Б╨╡╤Е landing rules: ╨╕╤Б╨║╨╗╤О╤З╨╕╤В╤М ╨╝╤Г╤Б╨╛╤А╨╜╤Л╨╡ ╨┐╨╛╨┐╨░╨┤╨░╨╜╨╕╤П, ╤Б╨▓╨╡╤А╨╕╤В╤М ╤Б╤Н╨╝╨┐╨╗╤Л ╨╕ runtime `dto.js` | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | ЁЯФД 2026-07-23 | rules audit ╨▓ ╤А╨░╨▒╨╛╤В╨╡; `rooftops`, `new-year`, `bus-tours` ╤В╤А╨╡╨▒╤Г╤О╤В deploy/smoke |
| SEO.9 | ╨а╨╡╨░╨╗╤М╨╜╤Л╨╡ ╨╛╤В╨╖╤Л╨▓╤Л / ╤В╨╡╨╗╨╡╤Д╨╛╨╜ 8-800 ╨╜╨░ ╨║╨╛╨╜╤В╨░╨║╤В╨░╤Е | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тП│ ╨╜╨╛╨╝╨╡╤А pending; ╨Ш╨Э╨Э/╨Ю╨У╨а╨Э╨Ш╨Я ╤В╨╛╨╗╤М╨║╨╛ `/contacts` (+ `/requisites`), ╨Ю╨У╨а╨Э╨Ш╨Я ╤Б ╨╜╨╛╨▓╨╛╨╣ ╤Б╤В╤А╨╛╨║╨╕; ╨░╨┤╤А╨╡╤Б ╤Б╨║╤А╤Л╤В ╤Б contacts, ╨┐╨╛╨╗╨╜╤Л╨╣ ╨╜╨░ `/requisites`; ╤Д╤Г╤В╨╡╤А ╨▒╨╡╨╖ ╤А╨╡╨║╨▓╨╕╨╖╨╕╤В╨╛╨▓; ╤В╨╡╨╗╨╡╤Д╨╛╨╜ ╨╜╨╡ ╨┐╤Г╨▒╨╗╨╕╨║╤Г╨╡╨╝ | **╨▓╨╗╨░╨┤╨╡╨╗╨╡╤Ж** (╨╜╨╛╨╝╨╡╤А) / ╨░╨│╨╡╨╜╤В (trust UI тЬЕ) |
| SEO.11 | ╨Я╨╛╤А╨╛╨│ ╨╕╨╜╨┤╨╡╨║╤Б╨░ SEO-╨╗╨╕╤Б╤В╨╕╨╜╨│╨╛╨▓ | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `MIN_LISTING_OFFERS_FOR_INDEX = 6` (╨╜╨╡ ╨┐╨╛╨┤╨╜╨╕╨╝╨░╤В╤М: ╨Х╨║╨▒/╨Ъ╨░╨╖╨░╨╜╤М thin) | ╨░╨│╨╡╨╜╤В |
| SEO.12 | ╨Т╨╜╤Г╤В╤А╨╡╨╜╨╜╤П╤П ╨┐╨╡╤А╨╡╨╗╨╕╨╜╨║╨╛╨▓╨║╨░: ╤Д╤Г╤В╨╡╤А ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╤П┬╗, event breadcrumbs тЖТ CHPU, ┬л╨б╨╝╨╛╤В╤А╨╕╤В╨╡ ╤В╨░╨║╨╢╨╡┬╗ ╨╜╨░ ╨╗╨╕╤Б╤В╨╕╨╜╨│╨░╤Е | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 | ╨░╨│╨╡╨╜╤В |
| SEO.13 | SSR JSON-LD: BreadcrumbList (listing+event) + ItemList ╤В╨╛╨╗╤М╨║╨╛ ╨╜╨░ CHPU landings (non-empty) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 | ╨░╨│╨╡╨╜╤В |
| SEO.14 | `/podborki` tag cloud тЖТ CHPU landings/intent ╨▓╨╝╨╡╤Б╤В╨╛ `/events?q=` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 (╤В╨╛╨┐-24: 23 CHPU / 1 fallback) | ╨░╨│╨╡╨╜╤В |
| SEO.15 | ╨Ъ╨░╨╖╨░╨╜╤М/╨Х╨║╨▒: ╨┐╨░╨┤╨╡╨╢╨╕ + meta-╤И╨░╨▒╨╗╨╛╨╜╤Л listing/hub/event + thin cards (6тАУ7) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-23 | ╨░╨│╨╡╨╜╤В |
| SEO.16 | ╨а╤Г╤З╨╜╨╛╨╣ ╨┐╨╡╤А╨╡╨╛╨▒╤Е╨╛╨┤ TOP-15 ╨▓ ╨п╨╜╨┤╨╡╨║╤Б.╨Т╨╡╨▒╨╝╨░╤Б╤В╨╡╤А / GSC | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тП│ ╤Б╨┐╨╕╤Б╨╛╨║ URL ╨│╨╛╤В╨╛╨▓; ╨║╨╗╨╕╨║╨╕ ╤В╨╛╨╗╤М╨║╨╛ ╨▓╨╗╨░╨┤╨╡╨╗╨╡╤Ж | **╨▓╨╗╨░╨┤╨╡╨╗╨╡╤Ж** |
| SEO.17 | Sitemap: intents ╨▒╨╡╨╖ thin (&lt; 6); smoke prod index + landings/static | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 @`0fe5140`+prod | ╨░╨│╨╡╨╜╤В |
| SEO.18 | ╨Я╨╗╨░╨╜ 20-30 ╨┐╤Г╤В╨╡╨▓╨╛╨┤╨╕╤В╨╡╨╗╨╡╨╣ тЖТ CHPU (`docs/seo-guide-articles-plan.md`) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 batch #1 = 10 ╨Ъ╨░╨╖╨░╨╜╤М/╨Х╨║╨▒ | ╨░╨│╨╡╨╜╤В |
| SEO.19 | Batch #1 ╨│╨╡╨╜╨╡╤А╨░╤Ж╨╕╤П/╤А╨░╨╖╨╝╨╡╤Й╨╡╨╜╨╕╨╡ 10 ╨│╨╕╨┤╨╛╨▓ (GPT тЖТ MD тЖТ blog) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тП│ ╨┐╨░╤З╨║╨░ A+╨Ь╨б╨Ъ/╨б╨Я╨▒ owner rewrite тЬЕ; ╤Е╨░╨╛╤Б-╨║╨░╨╗╨╡╨╜╨┤╨░╤А╤М тЬЕ 2026-07-23; B (2-7,9) ╨╢╨┤╤С╤В ╤В╨╡╨║╤Б╤В╤Л | ╨▓╨╗╨░╨┤╨╡╨╗╨╡╤Ж + ╨░╨│╨╡╨╜╤В |
| SEO.19a | Blog mid-article ╨┐╨╗╨░╤И╨║╨░ `[NOTE]` (`BlogArticleNote`) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23; hotfix nested `[link](url)` in text= | ╨░╨│╨╡╨╜╤В |
| SEO.19f | Blog markdown SEO: links/H2/NOTE harden + price accents + tests | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `4f6cdb3` prod | ╨░╨│╨╡╨╜╤В |
| SEO.19b | Batch A: ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╡ cover ╨▓╨╝╨╡╤Б╤В╨╛ city-placeholder (3 jpg) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 | ╨░╨│╨╡╨╜╤В |
| SEO.19b2 | ╨Ь╨б╨Ъ/╨б╨Я╨▒: ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╡ cover ├Ч6 + magazine `/blog` hero | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 | ╨░╨│╨╡╨╜╤В |
| SEO.19b3 | ╨Я╤А╨░╨▓╨╕╨╗╨╛: cover ╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╨╡╨╜ ╨┤╨╛ PUBLISHED; ╨┤╨╛╨│╨╡╨╜╨╡╤А╨░╤Ж╨╕╤П missing (bylinnyy ├Ч2) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-23 | ╨░╨│╨╡╨╜╤В |
| SEO.19c | ╨Я╤Г╨▒╨╗╨╕╨║╨░╤Ж╨╕╤П ╨│╨╕╨┤╨╛╨▓: ╤Е╨░╨╛╤Б-╨│╤А╨░╤Д╨╕╨║ + ╨╝╨╕╨║╤Б ╨│╨╛╤А╨╛╨┤╨╛╨▓; `publishedAt` schedule filter | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23; ╨░╨╜╤В╨╕╤Б╨┐╨░╨╝-╨┐╨╡╤А╨╡╤Б╨▒╨╛╤А ╨▓╨╡╤З╨╡╤А | ╨░╨│╨╡╨╜╤В |
| SEO.19d | Owner anti-AI rewrite 9 ╨│╨╕╨┤╨╛╨▓ + upsert ╨┐╨╛ ╨│╤А╨░╤Д╨╕╨║╤Г | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 | ╨▓╨╗╨░╨┤╨╡╨╗╨╡╤Ж + ╨░╨│╨╡╨╜╤В |
| SEO.19e | ╨Р╨╜╤В╨╕╤Б╨┐╨░╨╝: ╨┐╨╜-╨║╨╛╨╗╨╛╨╜╨║╨╕ + template_type long/top5/events + safety ╨╕╨╜╨┤╨╡╨║╤Б | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 ╨▓╨╡╤З╨╡╤А (╨║╨░╨╗╨╡╨╜╨┤╨░╤А╤М + docs + upsert) | ╨░╨│╨╡╨╜╤В |
| SEO.10 | Editorial polish SEO-╤В╨╡╨║╤Б╤В╨╛╨▓ (╤Г╨▒╤А╨░╤В╤М ╤И╨░╨▒╨╗╨╛╨╜╨╜╤Л╨╣ ╤Е╨▓╨╛╤Б╤В) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тП│ | ╨▓╨╗╨░╨┤╨╡╨╗╨╡╤Ж + ╨░╨│╨╡╨╜╤В |
| P.1 | AI / ╤Б╤В╨░╤В╤М╨╕ ╨▒╨╗╨╛╨│╨░ | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЪая╕П deferred vs SEO.1тАУSEO.7 | тАФ |

---

## ╨Я╤А╨╛╨┤╤Г╨║╤В╨╛╨▓╤Л╨╣ ╤Д╨╛╨║╤Г╤Б (2026-07-19)

╨б╤В╤А╨░╤В╨╡╨│╨╕╤П: ╨╜╨╡ ╤А╨╡╨║╨╗╨░╨╝╨╕╤А╨╛╨▓╨░╤В╤М ┬л╨┐╤Г╤Б╤В╤Л╤И╨║╤Г┬╗ тАФ ╤Б╨╜╨░╤З╨░╨╗╨░ ╨▓╨╕╤В╤А╨╕╨╜╨░ (╤Е╨░╨▒╤Л + ╨║╨╛╨╜╤В╨╡╨╜╤В + ╨▒╨░╨╖╨╛╨▓╤Л╨╣ ╤Д╨╕╨╜╨║╨╛╨╜╤В╤Г╤А).

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| P.1 | **AI / ╤Б╤В╨░╤В╤М╨╕** тАФ ╨║╨╛╨╜╤В╨╡╨╜╤В, ╨Ш╨Ш-╨║╨╛╨╗╨╛╨╜╨║╨╕, blog ops | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | ЁЯФД |
| P.2 | **City hubs** тАФ ╤Г╤Б╨╕╨╗╨╡╨╜╨╕╨╡ `/cities/{slug}` (SEO + ╨║╨╛╨╜╤В╨╡╨╜╤В) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | ЁЯФД |
| P.2a | Brief-╨╛╨┐╨╕╤Б╨░╨╜╨╕╤П 14 ╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А╨╛╨▓ ╨▓ `CITY_INFO` (hero/SEO) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| P.2b | Brief ╨╡╤Й╤С 9 ╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А╨╛╨▓ (╨з╨╕╤В╨░тАж╨е╨░╨▒╨░╤А╨╛╨▓╤Б╨║) ╨▓ `CITY_INFO` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| P.2c | ╨Я╤А╨╡╨┤╨╗╨╛╨╢╨╜╤Л╨╣ ╨┐╨░╨┤╨╡╨╢ ╤Е╨░╨▒╨╛╨▓: ┬л╨▓ ╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║╨╡┬╗, ╨╜╨╡ ┬л╨▓ ╨│╨╛╤А╨╛╨┤╨╡ ╨Ь╤Г╤А╨╝╨░╨╜╤Б╨║┬╗ | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| P.2d | SEO title city hubs: ┬л{City}: ╨░╤Д╨╕╤И╨░тАж ╨╜╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П, {date}┬╗ (╨╕╨╝╨╡╨╜╨╕╤В╨╡╨╗╤М╨╜╤Л╨╣) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `2079e3a` prod proof SPB |
| P.2e | **Wireframe city hub v1** тАФ IA/UX ╤Д╨░╨╖╤Л 1 (sticky tabs, ╨░╤Д╨╕╤И╨░ ╨▓╤Л╤И╨╡, FAQ accordion) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ [city-hub-wireframe-v1.md](./city-hub-wireframe-v1.md) |
| P.2f | ╨а╨╡╨░╨╗╨╕╨╖╨░╤Ж╨╕╤П wireframe v1 ╨▓ `apps/web` (`CityPageView`) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `d877813` prod |
| P.2f1 | City hub chips: ╤Б╤З╤С╤В╤З╨╕╨║╨╕ = ╨▓╤Л╨┤╨░╤З╨░ (╨╜╨╡ full-city); ╨╗╤С╨│╨║╨╕╨╡ ╤З╨╕╨┐╤Л ╨▒╨╡╨╖ ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╤Е ╤В╨╡╨│╨╛╨▓┬╗ | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `721bf10` prod |
| P.2g | **Wireframe city hub v2** тАФ IA ╤Д╨░╨╖╤Л 2 (city-specific ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╤П, ╨║╨╛╨╜╤Д╨╕╨│) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ [city-hub-wireframe-v2.md](./city-hub-wireframe-v2.md) |
| P.2h | ╨а╨╡╨░╨╗╨╕╨╖╨░╤Ж╨╕╤П wireframe v2 ╨▓ `apps/web` (╨┐╨╗╨╕╤В╨║╨╕ ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╨╣, top-N venues, sights CTA) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тП│ ╨┐╨╛╤Б╨╗╨╡ P.2g / ╨▓╨╜╨░╤Е╨╗╤С╤Б╤В ╤Б P.2f |
| P.2i | **Editorial hub template** (Lovable moodboard) тАФ ╨┐╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╤Л╨╣ visual `?hub=editorial` | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ `6efe0d8` prod |
| P.2j | City hub affiche: ╤Г╨▒╤А╨░╤В╤М ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╤В╨╡╨│╨╕┬╗; ╨║╨╛╨╝╨┐╨░╨║╤В╨╜╤Л╨╡ date/category chips | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `5aa84d3` prod |
| P.2k | City hub affiche UX: ╤Б╨║╤А╤Л╤В╤М ╨┐╨╛╨┤╨╖╨░╨│╨╛╨╗╨╛╨▓╨╛╨║ ╤Б╤З╤С╤В╤З╨╕╨║╨░; date+category ╨▓ ╨╛╨┤╨╜╤Г ╤Б╤В╤А╨╛╨║╤Г (desktop); ╤Г╨▒╤А╨░╤В╤М ┬л╨б╤В╨╛╨╕╤В ╨▓╨╜╨╕╨╝╨░╨╜╨╕╤П┬╗ (╨┤╤Г╨▒╨╗╤М ╨░╤Д╨╕╤И╨╕) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `2808ed5` prod proof murmansk |
| P.2l | ╨Р╨┤╤А╨╡╤Б UI: ┬л╨Я╤А╨╛╤Б╨┐╨╡╨║╤В ╨Ъ╨╛╨╗╤М╤Б╨║╨╕╨╣┬╗ тЖТ ┬л╨Ъ╨╛╨╗╤М╤Б╨║╨╕╨╣ ╨┐╤А╨╛╤Б╨┐╨╡╨║╤В┬╗ (╨╜╨╛╤А╨╝╨░╨╗╨╕╨╖╨░╤В╨╛╤А ╨┐╤А╨╕╨╗╨░╨│╨░╤В╨╡╨╗╤М╨╜╤Л╤Е + hub venues) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ `8d65740` prod + DB |
| P.2m | City hub chips: ╨▓╨╕╨╖╤Г╨░╨╗╤М╨╜╤Л╨╣ gap ╨╝╨╡╨╢╨┤╤Г ╨│╤А╤Г╨┐╨┐╨░╨╝╨╕ date ╨╕ category (`gap-x-4`) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ `9a36f48` prod |
| P.2n | City hub `#directions`: ╨╜╨╡ ╤А╨╡╨╜╨┤╨╡╤А╨╕╤В╤М landings/categories ╤Б count=0 (╨▒╨╡╨╖ ╨┐╤Г╤Б╤В╤Л╤Е ┬л╨Ь╨╡╤А╨╛╨┐╤А╨╕╤П╤В╨╕╤П┬╗/┬л╨а╨░╨╖╨▓╨╗╨╡╤З╨╡╨╜╨╕╤П┬╗) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `044e441` prod proof rostov-na-donu |
| P.2o | **City hub ├Ч blog phase 1** тАФ editorial ╤В╨╕╨╖╨╡╤А╤Л (about/affiche/sights/practice/more), sticky 5 tabs | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `bb65e4a`; picker harden `2d6bd7f` |
| P.2p | **City hub ├Ч blog phase 2** тАФ mini-row ╨┤╨╛ 3 ╤Б╨╡╤Б╤Б╨╕╨╣ ╨╜╨░ ╤В╨╕╨╖╨╡╤А╨╡ (keyword match ╨┐╨╛ ╤Г╨╢╨╡ ╨╖╨░╨│╤А╤Г╨╢╨╡╨╜╨╜╤Л╨╝ sessions) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `824bafc` |
| P.2q | **City hub ├Ч blog phase 3** тАФ CMS `Article.citySlug`, ╤Д╨╕╨╗╤М╤В╤А API ╨┐╨╛ ╨│╨╛╤А╨╛╨┤╤Г, picker CMS-first | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-22 |
| L.1 | Catalog API: public Cache-Control + Next `getCachedCatalog`; favorites `?ids=`; landing skip no-store; page sizes 50/100 | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `bb65e4a` prod; nginx proxy_cache+limit_req тЬЕ |
| L.2 | Images: `next/image` + WebP/AVIF (`SafeImage`), remotePatterns TC/TEP/S3, sharp, hot-path cards/heroes | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `9646968` prod proof AVIF `/_next/image` |
| L.3 | TC catalog sync load: nightly timer + flock/nice/ionice; `--ids` ProviderLink filter; RawImport payloadHash skip; light warm | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `efc8459` prod; timer next 03:20 UTC |
| P.3 | **Finance contour / ╨Ы╨Ъ ╨┐╨╛╤Б╤В╨░╨▓╤Й╨╕╨║╨╛╨▓** тАФ ╨▒╨░╨╖╨╛╨▓╤Л╨╣ ╨║╨╛╨╜╤В╤Г╤А | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тП│ |
| P.4 | **╨а╨╡╨║╨╗╨░╨╝╨░ / paid acquisition** тАФ ╨┤╨╛ ╨│╨╛╤В╨╛╨▓╨╜╨╛╤Б╤В╨╕ ╨▓╨╕╤В╤А╨╕╨╜╤Л | тАФ | тЪая╕П deferred |
| P.5 | **Allowlist ╨│╨╛╤А╨╛╨┤╨╛╨▓** тАФ ╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А╤Л ╤Б saleable тЖТ standalone; ╨╛╤Б╤В╨░╨╗╤М╨╜╤Л╨╡ тЖТ cityToRegion (╨╜╨╡ ┬л╨┤╤Л╤А╨░┬╗) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 geo policy |

---

## Geo / destinations (2026-07-19)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| G.1 | Fix `isPublicRegionName` ╨┤╨╗╤П ┬л╨а╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░ тАж┬╗ (╨┐╤А╨╡╤Д╨╕╨║╤Б, ╨▒╨╡╨╖ `\b`) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| G.2 | ╨з╨╡╨╗╨╜╤Л тЖТ ╨а╨╡╤Б╨┐╤Г╨▒╨╗╨╕╨║╨░ ╨в╨░╤В╨░╤А╤Б╤В╨░╨╜ ╨┐╨╛╨┤ ╨║╨░╤А╤В╨╛╤З╨║╨╛╨╣ ╨Ъ╨░╨╖╨░╨╜╨╕ | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| G.3 | Expand standaloneCities ╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А╨░╨╝╨╕ ╤Б saleable | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| G.4 | Expand cityToRegion ╨┤╨╗╤П ╨╜╨╡-╨░╨┤╨╝╤Ж╨╡╨╜╤В╤А╨╛╨▓ (╨в╨╛╨╗╤М╤П╤В╤В╨╕, ╨б╨╛╤А╤В╨░╨▓╨░╨╗╨░, тАж) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| G.5 | Docs + prod deploy geo | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `6f0fcf7` prod |
| G.6 | ╨е╨▓╨╛╤Б╤В allowlist 63 тЖТ cityToRegion; ╨╖╨░╤А╤Г╨▒╨╡╨╢╤М╨╡ (`foreignCities`: ╨С╨░╤В╤Г╨╝╨╕, ╨Ю╤Б╨░╨║╨░) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `a63d612` prod (HEAD `c312095`) |

╨б╨╝. [Project.md](./Project.md) ┬з allowlist, [geo-excluded-cities.md](./geo-excluded-cities.md), Diary 2026-07-19.

---

## CI (2026-07-19)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| CI.1 | `validate-build-test`: pnpm ╨┤╨╛ `setup-node` cache | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `4c09cdb` |
| CI.2 | Backend typecheck: exactOptional / indexed access | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `7cc58ac` |
| CI.3 | `web:build` ╨▒╨╡╨╖ Postgres: empty home fallback | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `0f45004` CI green |

---

## Sync / TC (2026-07-19)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| S.1 | `tc:sync --ids=...` on-demand upsert (+ `--dry-run`) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `6cc137d` prod |
| S.2 | Admin `POST /api/v1/tc/sync?ids=` | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ `6cc137d` |
| S.3 | Docs + prod smoke 2 ids | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ +2 ESL |

---

## Event page / UX (2026-07-19)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| E.1 | Description: ╤Б╨┐╨╕╤Б╨║╨╕ `тЬЕ` / `тАв` / `-` тЖТ `<ul><li>` + sanitize | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 @38e8d12 prod proof seks-v-sssr |
| E.2 | Unit-╤В╨╡╤Б╤В╤Л ╨╛╨▒╨╛╨╕╤Е ╨║╨╡╨╣╤Б╨╛╨▓ (checkmark + ╨╛╤А╨│╨░╨╜╨╕╨╖╨░╤Ж╨╕╨╛╨╜╨╜╤Л╨╡ ╨┤╨╡╤В╨░╨╗╨╕) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| E.3 | Prod: `ReferenceError: cleanDisplayText is not defined` (re-export ╨▒╨╡╨╖ local import ╨▓ `event-page-utils`) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 7cdd4cf + rebuild 38e8d12 |
| E.4 | ╨в╨╡╨│╨╕ ╨╜╨░ event page: dedupe chips (tagsтИкsubcategories) ╨┐╨╛ ╨╜╨╛╤А╨╝╨░╨╗╨╕╨╖╨╛╨▓╨░╨╜╨╜╨╛╨╝╤Г label | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 @9658b9f prod proof kino |
| E.5 | Event page display time = TZ ╤А╨╡╨│╨╕╨╛╨╜╨░ ╤Б╨╛╨▒╤Л╤В╨╕╤П (╨║╨░╨║ ╨▓╨╕╨┤╨╢╨╡╤В), ╨╜╨╡ forced MSK | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-19 @9f1f744 prod proof ╨г╤Д╨░ 18:00 |
| E.6 | Hero CTA ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╨╡╤В ╤В╨╛╨╗╤М╨║╨╛ ╨╝╨╕╨╜╨╕╨╝╨░╨╗╤М╨╜╤Г╤О ╤Ж╨╡╨╜╤Г `╨╛╤В`; buy-card ╤Б╨╛╤Е╤А╨░╨╜╤П╨╡╤В ╨┤╨╕╨░╨┐╨░╨╖╨╛╨╜ ╤В╨╛╤З╨╜╤Л╤Е ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╣ | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 |

---

## ╨С╨╗╨╛╨│ / ╨║╨╛╨╜╤В╨╡╨╜╤В (2026-07-19)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| B.1 | ╨д╨╛╤А╨╝╨░╤В ┬л╨а╨╡╨┤╨░╨║╤Ж╨╕╤П┬╗ (`docs/ai-journalists/00-editorial.md`) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| B.2 | Rewrite 4 ╨│╨╕╨┤╨╛╨▓ + SEO/╤Б╤Б╤Л╨╗╨║╨╕/`[buy]` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| B.3 | Hide `spb-razvod-mostov-kakoi-reis` + 301 тЖТ rooftop | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ тЖТ **╨╛╤В╨╝╨╡╨╜╨╡╨╜╨╛** (╤Б╤В╨░╤В╤М╤П ╤Б╨╜╨╛╨▓╨░ PUBLISHED) |
| B.4 | Commit тЖТ deploy-prod-next тЖТ `blog:upsert` ├Ч4+hide | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| B.5 | ╨Я╨░╨║╨╡╤В 10 ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╛╨╜╨╜╤Л╤Е ╤Б╤В╨░╤В╨╡╨╣ (verbatim + buy + upsert) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| B.6 | ╨Т╨╡╤А╨╜╤Г╤В╤М `spb-razvod-mostov-kakoi-reis` PUBLISHED, ╤Б╨╜╤П╤В╤М 301 | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| B.7 | Multi-event: ╤Г╨▒╤А╨░╤В╤М `[buy]`, ╤В╨╛╨╗╤М╨║╨╛ `/events` ╤Б╤Б╤Л╨╗╨║╨╕; ╤Ж╨╡╨╜╤Л/meta ╨┐╨╛ prod; Cyrillic READY slug | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| B.8 | ╨Я╨╡╤А╨▓╨░╤П ╨║╨╛╨╗╨╛╨╜╨║╨░ ╨Р╨╜╨╜╤Л ┬л╨У╨╛╤А╨╛╨┤ ╨║╤А╤Г╨┐╨╜╤Л╨╝ ╨┐╨╗╨░╨╜╨╛╨╝┬╗: `muzyka-v-osobnyakah-spb` | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| B.9 | Admin: PATCH ╨│╨╛╤А╨╛╨┤╨╛╨▓ (City SEO/slug/title) + UI | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| B.10 | Admin: ╨┤╨░╤В╨░ ╨┐╤Г╨▒╨╗╨╕╨║╨░╤Ж╨╕╨╕ ╤Б╤В╨░╤В╨╡╨╣ (`publishedAt`) ╨▓ UI | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| B.11 | Soft-links ╨▒╨╗╨╛╨│╨░: ╨║╨░╤В╨░╨╗╨╛╨│ тЖТ ╨╗╨╡╨╜╨┤╨╕╨╜╨│╨╕ (jazz/standup/river/bus) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 upsert+revalidate |
| B.12 | ╨Т╨╡╤А╨╜╤Г╤В╤М ╤Д╨╛╤В╨╛ ╨▓ ╤Б╤В╨░╤В╤М╨╕: distinct `-inline.jpg` + coverImageUrl + upsert/deploy | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| B.13 | Home SEO: title ╨▒╨╡╨╖ ╤Ж╨╕╤Д╤А + description ╤И╨░╨▒╨╗╨╛╨╜ ╤Б ╨╢╨╕╨▓╤Л╨╝╨╕ counts ╤Е╨░╨▒╨╛╨▓ | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 @789ee67 |
| B.14 | Blog: defer ╨┐╨╡╤А╨▓╨╛╨│╨╛ `[image]` ╨┐╨╛╤Б╨╗╨╡ 2 ╨░╨▒╨╖╨░╤Ж╨╡╨▓ (╨╜╨╡ ╤Б╤А╨░╨╖╤Г ╨┐╨╛╨┤ hero) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 @8ba0a05 |
| B.15 | TC: past dated slug тЖТ ╨╜╨╡ ┬л╨╛╤В╨║╤А╤Л╤В╨░╤П ╨┤╨░╤В╨░┬╗ / ╨╜╨╡ ┬л╨Ь╨╡╤А╨╛╨┐╤А╨╕╤П╤В╨╕╨╡ ╨┐╤А╨╛╤И╨╗╨╛┬╗; meta-siblings | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ e9d72f1 + blog slug refresh |
| B.16 | Home: Teplohod signed S3 covers expire тЖТ stabilize to api.teplohod.info proxy | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-19 hotfix prod |
| B.17 | ╨а╨╡╨│╤А╨╡╤Б╤Б╨╕╨╛╨╜╨╜╤Л╨╡ unit-╤В╨╡╤Б╤В╤Л B.15+B.16 (image URL + fake open-date / meta purchase) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| B.18 | ╨Ъ╨╛╨╗╨╛╨╜╨║╨░ ╨Р╤А╤В╤Г╤А╨░ ┬л╨Э╨░ ╨▓╨║╤Г╤Б┬╗: `kazan-na-vkus-master-klassy` (╨Ь╨Ъ ╨н╤З╨┐╨╛╤З╨╝╨░╨║╨░ + ╨│╨░╤Б╤В╤А╨╛╤Г╨╢╨╕╨╜) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-22 @93d3a07 + upsert |
| B.19 | ╨Ъ╨╛╨╗╨╛╨╜╨║╨░ ╨Х╨╗╨╡╨╜╤Л: `spb-s-rebenkom-v-dozhd` (╨б╨Я╨▒ ╤Б ╤А╨╡╨▒╤С╨╜╨║╨╛╨╝ ╨▓ ╨┤╨╛╨╢╨┤╤М) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-22 upsert + revalidate |
| B.20 | `/blog` magazine layout: listing asymmetric + article journal (serif/dropcap/quotes/sidebar) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `a4ecab6` |
| B.21 | Blog typography: ╨╛╤В╨║╨░╤В Source Serif тЖТ site `font-display`; ╤Г╨▒╤А╨░╤В╤М dropcap | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `230ebc2` (prod includes via `6656adf`+) |
| B.22 | `/blog` large card: cover 2:1 (╨╜╨╡ flex-fill) + excerpt ~6 ╤Б╤В╤А╨╛╨║ ╨╕╨╖ lead | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `0be544f` (prod via `fc5e309`) |
| B.23 | Blog prose: markdown links/H2 anchors/NOTE/prices + visual accents | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `4f6cdb3` prod | ╨░╨│╨╡╨╜╤В |
| B.24 | `/blog` view toggle: magazine-╤Б╨╡╤В╨║╨░ \| ╤Б╨┐╨╕╤Б╨╛╨║ + localStorage/`?view=` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `0741106` prod via `ed874cb` | ╨░╨│╨╡╨╜╤В |
| B.24b | Blog cards: ╤Г╨▒╤А╨░╤В╤М cover badges (tag/city ╨╜╨░ ╤Д╨╛╤В╨╛) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `b542a45` (+ merge B.24) | ╨░╨│╨╡╨╜╤В |
| B.25 | ╨Р╨▓╤В╨╛╤А╤Л ╨║╨╛╨╗╨╛╨╜╨╛╨║: brand blue (`text-primary-600`), ╨▒╨╡╨╖ ╨▒╨╡╨╣╨┤╨╢╨░ ┬л╨Ъ╨╛╨╗╨╛╨╜╨║╨░┬╗ | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `ed874cb` prod | ╨░╨│╨╡╨╜╤В |
| B.26 | `/blog` UX: ╤В╨╡╨╝╤Л, ╨┐╨╛╨╕╤Б╨║, ┬л╨Я╨╛╨║╨░╨╖╨░╤В╤М ╨╡╤Й╤С┬╗, CTA CHPU, ╨┤╨░╤В╨░ ╨╜╨░ large | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `bd8ec37` prod | ╨░╨│╨╡╨╜╤В |
| B.27 | Blog Hero: `Article.isFeatured`, informational hero + admin toggle, LCP priority | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `72ea839` prod (via d34fd28+) | ╨░╨│╨╡╨╜╤В |
| B.28 | Blog Featured Hero: CTA-╨┐╨╗╨╕╤В╨║╨░ ╤Б promo image ╨┐╨╛╨┤ ┬л╨б╨▓╨╡╨╢╨╡╨╡┬╗ (╤Г╨▒╤А╨░╤В╤М ╨┐╤Г╤Б╤В╨╛╤В╤Г) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `72ea839` prod | ╨░╨│╨╡╨╜╤В |

---

## UX ╨║╨░╤В╨░╨╗╨╛╨│╨░ (2026-07-19)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| U.9 | ╨з╨╕╨┐╤Л ╨║╨░╤В╨╡╨│╨╛╤А╨╕╨╣: ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╨╡ ╨┐╨╕╨║╤В╨╛╨│╤А╨░╨╝╨╝╤Л (╨╜╨╡ fallback ticket) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `95d959d` prod |
| U.1 | ╨а╨░╤Б╤И╨╕╤А╨╡╨╜╨╜╤Л╨╡ ╤Д╨╕╨╗╤М╤В╤А╤Л `/events` тАФ popup ╨║╨░╨║ ╨┐╨╛╨╕╤Б╨║ (desktop modal + mobile bottom sheet) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| U.2 | Draft Apply/Reset, Esc/backdrop, focus trap, badge ╤Б╤З╤С╤В╤З╨╕╨║╨░ | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| U.3 | Commit + deploy Next | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `be8ee55` + prod start web (╨┐╨╛╤Б╨╗╨╡ ╨╛╨▒╤А╤Л╨▓╨░ SSH mid-deploy) |
| U.4 | ╨У╨╛╤А╨╛╨┤ ╨╕╨╖ ╤И╨░╨┐╨║╨╕ тЖТ `city=` ╨║╨░╤В╨░╨╗╨╛╨│╨░ ╨┐╤А╨╕ `/events` ╨▒╨╡╨╖ ╤П╨▓╨╜╨╛╨│╨╛ city; deep-link ╤Б╨╛╤Е╤А╨░╨╜╨╕╤В╤М | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| U.5 | Commit + deploy-prod-next U.4 | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `4772789` prod |
| U.6 | ╨У╨╛╤А╨╛╨┤ ╤И╨░╨┐╨║╨╕ тЖТ ╤Д╨╕╨╗╤М╤В╤А `/venues` ╨╕ `/locations` (URL + storage + nav) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ (╨▓ `361dc4c`) |
| U.7 | Anti-flash ┬л╨Т╤Б╨╡ ╨│╨╛╤А╨╛╨┤╨░┬╗тЖТ╨│╨╛╤А╨╛╨┤ ╨╜╨░ `/events` (╨╕ venues/locations): `cityReady` + layout sync | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| U.8 | Anti-flash: ╨╜╨╡ ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╤В╤М SSR all-cities ╨┤╨╛ inject; commit + deploy-prod-next U.6тАУU.8 | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `4c09cdb` prod |
| U.10 | Catalog cards: eye-line `object-position` (16:9 headshots Pianissimo) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `539f571` prod |

---

## Reviews (2026-07-19)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| R.1 | Prisma: Review тЖФ ExternalOrder + migration | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| R.2 | API create/list + admin moderate | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| R.3 | Admin UI `/reviews` ╨╛╤З╨╡╤А╨╡╨┤╤М | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| R.4 | Public ReviewSection + `/reviews/write` + ╨Ы╨Ъ deep-link | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| R.5 | Cron review-request email (SMTP graceful) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| R.6 | Capability: TC allowed + verification | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| R.7 | Pseudo 4.5тАУ5.0 UI; AggregateRating тЙе10 | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| R.8 | Tests verification + displayed rating | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| R.9 | Commit + deploy API/admin/Next | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | ЁЯФД commit `1c2b156` pushed; deploy SSH ╤Б ╤Н╤В╨╛╨╣ ╨╝╨░╤И╨╕╨╜╤Л тАФ Permission denied (╨╜╤Г╨╢╨╡╨╜ ╨║╨╗╤О╤З ╨╜╨░ prod) |
| R.10 | Disputes / supplier LK | тАФ | ЁЯЪл out of scope |
| R.11 | ╨Ы╨Ъ: past slug 404 тЖТ sibling URL + review by eventId; ╨▓╤А╨╡╨╝╤П ╤Б╨╡╨░╨╜╤Б╨░ ╨┐╨╛╨┤╨┐╨╕╤Б╨░╨╜╨╛; ╨┤╨░╤В╨░ ╨┐╨╛╨║╤Г╨┐╨║╨╕ ╨▒╨╡╨╖ truncate | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 085617c deploy |

---

## ╨н╤В╨░╨┐ 0 тАФ Post-cutover hardening (╨╖╨░╨║╤А╤Л╤В╤М ╨┐╨╡╤А╨▓╤Л╨╝)

**╨ж╨╡╨╗╤М:** prod Next ╤Б╤В╨░╨▒╨╕╨╗╨╡╨╜, ╨┐╨╛╨║╤Г╨┐╨║╨░ ╤З╨╡╤А╨╡╨╖ ╨▓╨╕╨┤╨╢╨╡╤В╤Л ╨┐╤А╨╛╨▓╨╡╤А╨╡╨╜╨░ ╨▓ ╨▒╤А╨░╤Г╨╖╨╡╤А╨╡, admin ╨╛╨┐╨╡╤А╨░╤Ж╨╕╨╛╨╜╨╡╨╜, data debt ╨┐╨╛ TC ╨╛╤Б╨╛╨╖╨╜╨░╨╜.

**Exit criteria:** ╨▓╤Б╨╡ ╨┐╤Г╨╜╨║╤В╤Л ┬лBrowser smoke┬╗ ╨╕ ┬лAdmin smoke┬╗ тЬЕ; ╨┐╨╛ `tc:sync` тАФ тЬЕ run **╨╕╨╗╨╕** тЪая╕П defer ╤Б ╨╖╨░╨┐╨╕╤Б╤М╤О ╨▓ decision-log.

### 0.1 Cutover & infra

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 0.1.1 | Prod nginx тЖТ Next `:3001` | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| 0.1.2 | Rollback script / snapshot | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| 0.1.3 | `launch-prod-smoke-next.sh` (SSR curl) green | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| 0.1.4 | ╨Ь╨╛╨╜╨╕╤В╨╛╤А╨╕╨╜╨│ 24тАУ48╤З post-cutover | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 0.1.5 | Deprecate Vite public (`apps/public`) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тП│ ╨┐╨╛╤Б╨╗╨╡ ╨╖╨░╨║╤А╤Л╤В╨╕╤П 0.2тАУ0.3 |

### 0.2 Browser smoke тАФ 4 ╤Н╤В╨░╨╗╨╛╨╜╨╜╤Л╤Е slug

╨б╨┐╨╕╤Б╨╛╨║: [widget-etalon-slugs.md](./widget-etalon-slugs.md).  
API-╨┐╤А╨╡╤А╨╡╨║╨▓╨╕╨╖╨╕╤В: `npm run check:widgets -- --base https://daibilet.ru`

| # | Slug | TC / TEP | API check | Browser ┬л╨Ъ╤Г╨┐╨╕╤В╤М┬╗ | ╨б╤В╨░╤В╤Г╤Б |
|---|------|----------|-----------|------------------|--------|
| 0.2.1 | `tc-6a266b49465e94f72b4ef8f6-interaktivnaya-vystavka-nyuton-park` | TC | тЬЕ 2026-07-13 | тЬЕ 2026-07-22 | тЬЕ |
| 0.2.2 | `tc-6a3582f0bbd948da83dece6e-kombo-kvest` | TC | тЬЕ 2026-07-13 | тЬЕ 2026-07-22 | тЬЕ |
| 0.2.3 | `progulka-ot-prichala-kitai-gorod-do-prichala-kievskii-826` | TEP | тЬЕ 2026-07-13 | тЬЕ 2026-07-22 | тЬЕ |
| 0.2.4 | `centralnaya-krugovaya-rechnaya-progulka-ot-parka-zaryade-ves-centr-za-chas-683` | TEP | тЬЕ 2026-07-13 | тЬЕ 2026-07-22 | тЬЕ |

**╨з╨╡╨║╨╗╨╕╤Б╤В ╨╜╨░ ╨║╨░╨╢╨┤╤Л╨╣ slug (browser):**

- [x] Hard refresh `/events/{slug}`
- [x] Hero / buy card: ╤Ж╨╡╨╜╨░ ╨╕ CTA ╨▓╨╕╨┤╨╜╤Л
- [x] ╨Ъ╨╗╨╕╨║ ┬л╨Ъ╤Г╨┐╨╕╤В╤М┬╗ тЖТ TC modal **╨╕╨╗╨╕** Teplohod widget
- [x] DevTools console: ╨╜╨╡╤В blocking errors
- [x] (╨╛╨┐╤Ж.) ╤В╨╡╤Б╤В╨╛╨▓╨░╤П ╨┐╨╛╨║╤Г╨┐╨║╨░ тЖТ ExternalOrder ╨▓ admin

╨Ч╨░╨║╤А╤Л╤В╨╛ 2026-07-22: ╤А╤Г╤З╨╜╨╛╨╡ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╡ (prod ╨▓╨╕╨┤╨╢╨╡╤В╤Л ╤А╨░╨▒╨╛╤В╨░╤О╤В; API `check:widgets` ╨▒╤Л╨╗ тЬЕ ╤Б 2026-07-13). ╨в╨╡╤Б╤В╨╛╨▓╨░╤П ╨┐╨╛╨║╤Г╨┐╨║╨░ тЖТ ExternalOrder ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨░ ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛.

### 0.3 Admin smoke (`:4000` + static admin)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 0.3.1 | Login (basic auth / realm) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-22 |
| 0.3.2 | Dashboard metrics ╨╖╨░╨│╤А╤Г╨╢╨░╤О╤В╤Б╤П | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-14 aligned with Events (`admin_event_groups`) |
| 0.3.3 | Sources: TC + Teplohod, last sync | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-22 |
| 0.3.4 | Events: list + detail + override save | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ full catalog + override lean texts; UI ╨╜╨░ ╤А╤Г╤Б╤Б╨║╨╛╨╝; group readiness future-sibling |
| 0.3.5 | Orders: ╤Б╨┐╨╕╤Б╨╛╨║ ╤А╨╡╨░╨╗╤М╨╜╤Л╤Е ╨╖╨░╨║╨░╨╖╨╛╨▓ (╨╜╨╡ mock) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ TC live + cron */10; TEP orders **╨╛╤В╨╗╨╛╨╢╨╡╨╜╨╛** (╨┐╨░╤А╤В╨╜╤С╤А: ╨╜╨╡╤В API, 2026-07-19) |
| 0.3.5a | TEP orders: ╨┐╨╛╨╗╤Г╤З╨╕╤В╤М ╤В╨╛╨║╨╡╨╜ + schema ╤Г ╨в╨╡╨┐╨╗╨╛╤Е╨╛╨┤╨░, smoke import | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тП╕ ╨╛╤В╨╗╨╛╨╢╨╡╨╜╨╛ тАФ ╤Г ╨┐╨░╤А╤В╨╜╤С╤А╨░ ╨╜╨╡╤В API ╨╖╨░╨║╨░╨╖╨╛╨▓; cron tep-orders ╤Б╨╜╤П╤В ╤Б prod |
| 0.3.6 | Event moderation / publish gate | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ group readiness + admin smoke 2026-07-22 |
| 0.3.7 | ╨Ч╨░╤Д╨╕╨║╤Б╨╕╤А╨╛╨▓╨░╤В╤М ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В ╨▓ Diary / smoke log | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-22 |

**Admin smoke ╨╖╨░╨║╤А╤Л╤В 2026-07-22** (╤А╤Г╤З╨╜╨╛╨╡ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╡: login, sources, events, orders, ╨▓╨╕╨┤╨╢╨╡╤ВтЖТExternalOrder). TEP orders ╨╛╤Б╤В╨░╤С╤В╤Б╤П тП╕.

### 0.4 `tc:sync` widgetUrl backfill (prod)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 0.4.1 | ╨Ю╤Ж╨╡╨╜╨╕╤В╤М ╨┤╨╛╨╗╨│: `check:sync-invariants` ╨╜╨░ prod | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тП│ |
| 0.4.2 | **╨Т╨░╤А╨╕╨░╨╜╤В A:** `npm run tc:sync` ╨╜╨░ prod (token, maintenance window) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-13 (~101s, 17082 widgetUrl) |
| 0.4.3 | **╨Т╨░╤А╨╕╨░╨╜╤В B:** defer + [decision-log.md](./decision-log.md) (╨║╤А╨╕╤В╨╡╤А╨╕╨╕: saleable events OK) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-13 (╨┤╨╛ sync) |
| 0.4.4 | Post-sync: `check:widgets` + 0.2 browser smoke ╨┐╨╛╨▓╤В╨╛╤А | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ API 2026-07-13 + browser 2026-07-22 |

### 0.5 Ops / auth fixes (post-cutover)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 0.5.home-editors | ┬л╨Т╤Л╨▒╨╛╤А ╤А╨╡╨┤╨░╨║╤Ж╨╕╨╕┬╗: ╨┤╨╡╨┤╤Г╨┐ combo-family (╨╝╨░╨║╤Б. 1 ┬л╨Ъ╨╛╨╝╨▒╨╛┬╗ ╨╜╨░ venue), ╤Б╨╡╨║╤Ж╨╕╤О ╨╛╤Б╤В╨░╨▓╨╕╤В╤М | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |

### 0.7 Admin grouped readiness (NO_FUTURE_SESSIONS)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 0.7.1 | Backend finalizeGroupedAdminReadiness ╨┐╨╛╤Б╨╗╨╡ group | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 0.7.2 | Admin UI mirror EventsPage | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 0.7.3 | Unit-╤В╨╡╤Б╤В admin-group-readiness + test:ts | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-19 |
| 0.7.4 | Deploy API (+ admin static) prod | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 bb7fc9c |

### 0.8 Admin audit holes (2026-07-19)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 0.8.1 | ╨г╨▒╤А╨░╤В╤М hard limit 10000 admin catalog | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ ╤Г╨╢╨╡ `eventRows(db, null)` |
| 0.8.2 | Dashboard needsAttention тЙб Events | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ `admin_event_groups` |
| 0.8.3 | GET events/:id тЖТ event+override | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 0.8.4 | Lean source description (left 4000) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 0.8.5 | canPublish тЖР high readinessIssues | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 0.8.6 | Nav stubs / read-only badges / no localhost:5178 | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 0.8.7 | Orders archive: ╨┐╤А╨╛╨▓╨╡╤А╨╕╤В╤М ╨┐╤А╨░╨▓╨╕╨╗╨░ (╨╜╨╡ unarchive) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ documented (stale cancelled 30d) |
| 0.8.8 | ECR ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╤Б╨║╤А╤Л╤В ╨▓ prod | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ |
| 0.8.9 | Deploy API + admin static prod | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 `7882d6d` |

### 0.6 CPU/RAM mitigation (prod 3.8Gi)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 0.6.1 | Stop legacy Docker + staging ╨╜╨░ prod (╨▒╨╡╨╖ rm -v) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 0.6.2 | systemd MemoryMax/High + NODE_OPTIONS web/api | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 0.6.3 | TEP sync cadence + warm delay + nice | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 0.6.4 | watch-tep-sync-load + oom-watch cron | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-19; oom-watch */5 + alerts |
| 0.6.5 | ╨Ч╨░╨╝╨╡╤А ╨╜╨░╨│╤А╤Г╨╖╨║╨╕ ╨╜╨░ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╡╨╝ auto-sync ╨╛╨║╨╜╨╡ | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тП│ ╤Б╨║╤А╨╕╨┐╤В ╨│╨╛╤В╨╛╨▓ / at optional |
| 0.6.6 | cron +x (tc-orders Permission denied) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 0.6.7 | TEP out-of-process cron/systemd + DISABLE in-process | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 0.6.8 | Skip startup TEP sync if fresh + delay 45m | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 0.6.9 | ╨г╨▒╤А╨░╤В╤М ╨┤╨▓╨╛╨╣╨╜╨╛╨╣ public warm (startup off) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 0.6.10 | Deploy discipline (╨╛╨┤╨╕╨╜ restart) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-19 docs+script |
| 0.6.11 | PG host migrate / dockerd idle | ╨Э╨╕╨╖╨║╨╕╨╣ | тП│ documented only тАФ ╨╜╨╡ ╨╝╨╕╨│╤А╨╕╤А╨╛╨▓╨░╤В╤М ╨▒╨╡╨╖ ╨╖╨░╨┐╤А╨╛╤Б╨░ |

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 0.5.1 | `USER_JWT_SECRET` prod/staging | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| 0.5.2 | Teplohod widget bootstrap / related cards | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 0.5.3 | EventCard title + ┬л╨Я╨╛╨┤╤А╨╛╨▒╨╜╨╡╨╡┬╗ links | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 0.5.4 | Catalog city filter instant apply | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ |
| 0.5.5 | ╨Ь╤Г╨╗╤М╤В╨╕╤Б╨╛╨▒╤Л╤В╨╕╨╡ `mergeGroupKey` + HP script | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | ЁЯФД ╨║╨╛╨┤ ╨│╨╛╤В╨╛╨▓, deploy тП│ |
| 0.5.6 | Admin lists pagination / lean payloads (orders, buyers, events, venues) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-13 deploy prod |
| 0.5.7 | Admin cities/landings page envelopes + landing detail events pager + compact dashboard | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-14 |
| 0.5.8 | ╨С╤Л╤Б╤В╤А╤Л╨╡ ╨┐╨╡╤А╨╡╨║╨╗╤О╤З╨╡╨╜╨╕╤П ╨░╨┤╨╝╨╕╨╜╨║╨╕: SWR catalog + landings base-cache + sources SWR | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-14 |
| 0.5.8 | Events/landings SQL read-model (no full grouped catalog before slice) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ Events+dashboard SQL 2026-07-19; landings/public тАФ тП│ |
| 0.5.9 | Catalog quick wins: lean DTO, no widgets in list, hydrate page-only, unified metrics, www/SEO redirects, SSR trim, warmup | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-14 |
| 0.5.10 | Teplohod checkout fallback тЖТ account.teplohod.info (╨╜╨╡ teplohod.info/event 404) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-14 |
| 0.5.11 | Post-deploy: clear `.next/cache` + revalidate; ChunkLoadError тЖТ one reload | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-14 |
| 0.5.12 | Teplohod: restore TI_Tickets bootstrap on event page + landing `evt_tep_*` buy | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-18 deploy |
| 0.5.13 | ╨п╨╜╨┤╨╡╨║╤Б.╨Ь╨╡╤В╤А╨╕╨║╨░ ╨╜╨░ `apps/web` (ID 106786540, ╨╜╨╡ admin) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ ╨║╨╛╨┤ 2026-07-19; deploy тП│ |

---

## ╨н╤В╨░╨┐ 1 тАФ Public parity & SEO gaps

**╨ж╨╡╨╗╤М:** Next public тЙИ legacy ╨┐╨╛ UX/SEO ╨╜╨░ event/city; ╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╤Л╨╣ ╨┐╨╛╨╕╤Б╨║ ╨▓ header.

### 1.1 Header & navigation

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 1.1.1 | Port `HeaderSearch` тЖТ `apps/web` SiteHeader | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 1.1.2 | `/api/public/search` parity (debounce, keyboard nav) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 1.1.3 | Mobile: search ╨▓ drawer | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ |
| 1.1.4 | ╨б╤В╤А╨░╨╜╨╕╤Ж╨░ `/about` | ╨Э╨╕╨╖╨║╨╕╨╣ | тП│ |

### 1.2 Event page

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 1.2.1 | Breadcrumbs: ╨У╨╗╨░╨▓╨╜╨░╤П тЖТ ╨б╨╛╨▒╤Л╤В╨╕╤П тЖТ ╨У╨╛╤А╨╛╨┤? тЖТ Title | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 1.2.2 | SSR JSON-LD: `Event` + `Offer` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 1.2.3 | SSR JSON-LD: `BreadcrumbList` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 1.2.4 | `generateMetadata` | тАФ | тЬЕ |
| 1.2.5 | Sticky buy card + TC/TEP widgets | тАФ | тЬЕ |
| 1.2.6 | ╨Ь╤Г╨╗╤М╤В╨╕╤Б╨╛╨▒╤Л╤В╨╕╨╡ ┬л╨Т╨░╤А╨╕╨░╨╜╤В╤Л ╨▒╨╕╨╗╨╡╤В╨╛╨▓┬╗ | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | ЁЯФД |

### 1.3 City page

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 1.3.1 | FAQ block (╤А╨╡╨┤╨░╨║╤Ж╨╕╨╛╨╜╨╜╤Л╨╣ / ╨╕╨╖ payload) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19; **fix:** ╤В╨╛╨╗╤М╨║╨╛ city FAQ @`9bc8fa7` |
| 1.3.1a | City hub FAQ: ╤Г╨▒╤А╨░╤В╤М generated/platform FAQ ╨┐╤А╨╛ ╨Ф╨░╨╣╨▒╨╕╨╗╨╡╤В | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ `9bc8fa7` prod proof SPB |
| 1.3.2 | SEO text block (intro + ╨┐╨╡╤А╨╡╨╗╨╕╨╜╨║╨╛╨▓╨║╨░) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 1.3.3 | SSR JSON-LD: `FAQPage` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 1.3.4 | SSR JSON-LD: `BreadcrumbList` | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-19 |
| 1.3.5 | Hero, categories, venues, events grid | тАФ | тЬЕ |
| 1.3.5a | City hub: venues=0 ╨┐╤А╨╕ events>0 (hub top-500 miss) | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 1.3.6 | `generateMetadata` | тАФ | тЬЕ |
| 1.3.7 | ╨а╨░╨╖╨▓╨╕╨▓╨░╤В╤М city hubs `/cities/{slug}` (╨║╨╛╨╜╤В╨╡╨╜╤В, ╨┐╨╡╤А╨╡╨╗╨╕╨╜╨║╨╛╨▓╨║╨░, landings) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тП│ |
| 1.3.8 | City-prefix ╨▓ path venues/events (`/{city}/venues/...`) | тАФ | ЁЯЪл ╨╛╤В╨║╨╗╨╛╨╜╨╡╨╜╨╛ 2026-07-19 (flat URL) |

### 1.4 ╨Я╤А╨╛╤З╨╕╨╡ public routes

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 1.4.1 | Venues / locations breadcrumbs | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | ЁЯФД ╤З╨░╤Б╤В╨╕╤З╨╜╨╛ |
| 1.4.2 | `/help` FAQ + JSON-LD | тАФ | тЬЕ |
| 1.4.3 | Landings JSON-LD (client) | тАФ | тЬЕ |
| 1.4.4 | ╨д╨╕╨╗╤М╤В╤А cross-transport subcategories ╨▓ ╨║╨░╤А╤В╨╛╤З╨║╨░╤Е | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | ЁЯФД |

---

## ╨н╤В╨░╨┐ 2 тАФ SEO foundation (╤Б╤В╨░╤А╤В ╨┐╨░╤А╨░╨╗╨╗╨╡╨╗╤М╨╜╨╛ ╤Б 1.2тАУ1.3)

**╨ж╨╡╨╗╤М:** indexable routes ╨▓ sitemap; structured data ╨▓ HTML source (╨╜╨╡ ╤В╨╛╨╗╤М╨║╨╛ client).

### 2.1 robots & sitemap

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 2.1.1 | `apps/web/app/robots.ts` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 2.1.2 | `app/sitemap.xml` тАФ index тЖТ chunks | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 2.1.3 | Sitemap chunk: `/events/*` (catalog public) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 2.1.4 | Sitemap chunk: `/cities/*` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 2.1.5 | Sitemap chunk: `/venues/*`, landings, blog | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-19 |
| 2.1.6 | Smoke: `/robots.txt`, `/sitemap.xml` + chunk 200 | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-19 |

### 2.2 SSR JSON-LD (╨┐╨╡╤А╨╡╤Б╨╡╤З╨╡╨╜╨╕╨╡ ╤Б ╨н╤В╨░╨┐ 1)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 2.2.1 | Shared helper `lib/structured-data.ts` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 2.2.2 | Event page LD+JSON ╨▓ RSC (View Source) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 2.2.3 | City page LD+JSON ╨▓ RSC | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 2.2.4 | Venue page LD+JSON | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тП│ |
| 2.2.5 | Google Rich Results / validator smoke | ╨Э╨╕╨╖╨║╨╕╨╣ | тП│ |
| 2.2.6 | Root WebSite/Organization JSON-LD + Google favicon PNG (48/96/192) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 deploy prod |
| 2.2.7 | Favicon fill ~90%: 32/48/96/180/192/512 + site.webmanifest | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ |
| 2.2.8 | Favicon: Flaticon ticket_1912 тЖТ ╨▒╤А╨╡╨╜╨┤ `#4A7FD4`, classic horizontal | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 deploy prod |
| 2.2.9 | Favicon: ╤В╨╛╤В ╨╢╨╡ ╨▒╨╕╨╗╨╡╤В, rotate 45┬░, fill ~88тАУ90% (32/48/96/180/192/512/ico/svg) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 deploy prod fc736e1 |
| 2.2.10 | Favicon: ╨╖╨╡╤А╨║╨░╨╗╨╛ ╤Г╨│╨╗╨░ `rotate(-45)`, ╤В╨╛╤В ╨╢╨╡ ╨║╤А╤Г╨┐╨╜╤Л╨╣ fill (╨▓╤Б╨╡ PNG/ICO/SVG) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 deploy prod 70bc59f |
| 2.2.11 | Favicon: ╨╛╨┐╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ recenter `translate(1.2 1.2)` ╨┐╨╛╤Б╨╗╨╡ rotate(-45) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 `c1ccd48` / prod `@7c59f8d` |

### 2.3 Canonical & indexing policy

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 2.3.1 | www тЖТ non-www (nginx) audit | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тП│ |
| 2.3.2 | `noindex` ╨┤╨╗╤П thin city/venue | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-19 |
| 2.3.3 | staging `noindex` | тАФ | тЬЕ |

### 2.4 Blog / content ops

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| 2.4.0 | ╨Ш╨╜╨▓╨╡╨╜╤В╨░╤А╤М ╤Б╤В╨░╤В╨╡╨╣ (╤Б╤В╨░╤В╨╕╨║╨░ + prod `Article`), ╨╖╨░╨┐╤А╨╡╤В ╨┤╤Г╨▒╨╗╨╡╨╣ | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 |
| 2.4.1 | 5 ╤Г╨╜╨╕╨║╨░╨╗╤М╨╜╤Л╤Е ╨╖╨░╨│╨╛╨╗╨╛╨▓╨║╨╛╨▓ + ╨┐╨╗╨░╨╜ ([content-blog-plan.md](./content-blog-plan.md)) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-19 (╤Б╨▓╨╡╤А╨╡╨╜╨╛ ╤Б ╨╕╨╜╨▓╨╡╨╜╤В╨░╤А╤С╨╝) |
| 2.4.2 | ╨Э╨░╨┐╨╕╤Б╨░╤В╤М/╨╛╨┐╤Г╨▒╨╗╨╕╨║╨╛╨▓╨░╤В╤М 4 ╤Б╤В╨░╤В╤М╨╕ (╨▒╨╡╨╖ ┬л╨║╨░╨║ ╨║╤Г╨┐╨╕╤В╤М┬╗; ╨▒╨╡╨╖ ╨┐╨╡╤А╨╡╤Б╨╡╤З╨╡╨╜╨╕╤П ╤Б 13) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 prod upsert + URL 200 |
| 2.4.3 | Weekly digest script тЖТ Article `REVIEW` + cron | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-19 cron + ╨┐╨╡╤А╨▓╤Л╨╣ REVIEW |
| 2.4.4 | ╨Ш╨Ш-╨╢╤Г╤А╨╜╨░╨╗╨╕╤Б╤В╤Л: 5 ╨┐╨╡╤А╤Б╨╛╨╜ (╨Ь╨░╨║╤Б/╨Р╨╜╨╜╨░/╨Х╨╗╨╡╨╜╨░/╨Ш╨│╨╛╤А╤М/╨Р╤А╤В╤Г╤А) + style guides + `personas.json` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 ╨║╨░╨╜╨╛╨╜ [ai-journalists/](./ai-journalists/); ╨Ь╨░╨║╤Б + ╤А╨╡╤Д╨╡╤А╨╡╨╜╤Б Perito |
| 2.4.5 | ╨Я╨╡╤А╨▓╤Л╨╣ ╨┐╨╕╨╗╨╛╤В╨╜╤Л╨╣ ╨╝╨░╤В╨╡╤А╨╕╨░╨╗ ╨▓ ╤Б╤В╨╕╨╗╨╡ ╨┐╨╕╤Б╤М╨╝╨░ ╨║╨╛╨╗╨╛╨╜╨║╨╕ (╨┐╨╛ ╤В╨╡╨╝╨╡ ╨╛╤В ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤П) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-19 full Max text + `[buy]` ╨╜╨░ `fentezi-fest-bylinnyy-bereg` |
| 2.4.6 | Byline / `authorId` ╨▓ CMS ╨╕╨╗╨╕ frontmatter (╨▒╨╡╨╖ ╨┤╨╡╨┐╨╗╨╛╤П ╨┤╨╛ ╨┐╨╕╨╗╨╛╤В╨░ ╨╛╨║) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ hero byline `authorName` + frontmatter/API |

---

## F1тАУF3 тАФ Next migration (╤Б╨┐╤А╨░╨▓╨╛╤З╨╜╨╛, ╨╖╨░╨║╤А╤Л╤В╨╛)

| ╨С╨╗╨╛╨║ | ╨б╤В╨░╤В╤Г╤Б |
|------|--------|
| F1 Monorepo shell | тЬЕ |
| F2 Public SSR (catalog, event, city, venue, landings) | тЬЕ |
| F3 Cutover staging + prod | тЬЕ (╤Е╨▓╨╛╤Б╤В = **╨н╤В╨░╨┐ 0**) |

╨Ф╨╡╤В╨░╨╗╨╕: [phases/phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md), [phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md).

---

## F4 тАФ Admin тЖТ Next (done)

**╨Ъ╨░╨╜╨╛╨╜ ╨┐╨╛╤Б╨╗╨╡ F4.6:** admin ops ╨▓ Next; Vite `/legacy` **hard-retired** (╨╜╨╡ ╨▒╨╕╨╗╨┤╨╕╤В╤Б╤П/╨╜╨╡ ╤А╨░╨╖╨┤╨░╤С╤В╤Б╤П). Checklist: [phase-f4-retire-legacy.md](./phases/phase-f4-retire-legacy.md).

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| F4.0 | Kickoff: `(admin)` route group `/admin`, shell, stub dashboard, Basic Auth middleware | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ 2026-07-23 |
| F4.1 | Port Dashboard (live `/api/admin/dashboard` + sources + orders metrics) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 |
| F4.1a | Port Events / Landings / Articles (lists + articles CRUD) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 |
| F4.1b | Port Sources / sync-health / Settings | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-23 |
| F4.1c | Cutover admin.daibilet.ru тЖТ Next; Vite deep CRUD at `/legacy` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 |
| F4.2 | Sync jobs тЖТ apps/worker | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-23 |
| F4.3 | Port Events override/moderation + Landings SEO/matches to Next | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 |
| F4.4 | Orders/Venues/Cities in Next + soft-retire `/legacy` (Vite kept for gaps) | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ 2026-07-23 |
| F4.5 | Remaining rare ops (taxonomy, candidates, ticket-link, ECR/Reviews) | ╨Э╨╕╨╖╨║╨╕╨╣ | тЬЕ 2026-07-23 |
| F4.6 | Schedule/sales/source + blocks preview + buyers + unarchive/delete; hard-retire `/legacy` | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 |
| F4.6 | Admin article preview (`/admin/articles/[id]/preview`, noindex) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тЬЕ 2026-07-23 |

## F5 тАФ Retire legacy

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| F5.1 | dto.js read тЖТ pure Prisma | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тП│ |
| F5.2 | Retire server.js / TS flags | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тП│ |

---

## Codex / Phase G

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| C.1 | Cherry-pick Phase 2 schema + ECR | ╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣ | тЬЕ |
| C.2 | Admin EventChangeRequestsPage | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тЬЕ (flag) |
| C.3 | Phase G finance runtime / ╨Ы╨Ъ ╨┐╨╛╤Б╤В╨░╨▓╤Й╨╕╨║╨╛╨▓ (P.3) | ╨Т╤Л╤Б╨╛╨║╨╕╨╣ | тП│ (╨┐╤А╨╛╨┤╤Г╨║╤В╨╛╨▓╤Л╨╣ ╤Д╨╛╨║╤Г╤Б; ╨╜╨╡ ╨╢╨┤╨░╤В╤М F5 ╤Ж╨╡╨╗╨╕╨║╨╛╨╝) |

---

## Ops backlog (╤Б╨║╨▓╨╛╨╖╨╜╨╛╨╣)

| # | ╨Ч╨░╨┤╨░╤З╨░ | ╨Я╤А╨╕╨╛╤А╨╕╤В╨╡╤В | ╨б╤В╨░╤В╤Г╤Б |
|---|--------|-----------|--------|
| O.1 | `qa.md` тАФ ╨╛╤В╨║╤А╤Л╤В╤Л╨╡ ╨░╤А╤Е╨╕╤В╨╡╨║╤В╤Г╤А╨╜╤Л╨╡ ╨▓╨╛╨┐╤А╨╛╤Б╤Л | ╨Э╨╕╨╖╨║╨╕╨╣ | тП│ |
| O.2 | Staging DB ╨╛╤В╨┤╨╡╨╗╤М╨╜╨╛ ╨╛╤В prod | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тП│ |
| O.3 | Automated browser smoke (Playwright) ╨┤╨╗╤П 0.2 | ╨б╤А╨╡╨┤╨╜╨╕╨╣ | тП│ |

---

## ╨Ц╤Г╤А╨╜╨░╨╗ ╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╨╕╨╣

| ╨Ф╨░╤В╨░ | ╨Ш╨╖╨╝╨╡╨╜╨╡╨╜╨╕╨╡ |
|------|-----------|
| 2026-07-24 | B.26: `/blog` UX - topics/search/load-more/CTA/date on large |
| 2026-07-23 | B.25: column authors brand blue on listing + article (no ┬л╨Ъ╨╛╨╗╨╛╨╜╨║╨░┬╗ badge) |
| 2026-07-23 | B.24: `/blog` magazine\|list view toggle + localStorage/`?view=` (merge badges-off) |
| 2026-07-23 | B.21: blog fonts rollback - Source Serif тЖТ Space Grotesk / site default; dropcap off |
| 2026-07-23 | B.20: blog magazine full scope - listing asymmetric + article serif/dropcap/quotes/topic sidebar |
| 2026-07-23 | B.20: `/blog` asymmetric magazine grid (large 2/3 + 2 small; mirror); city hub teasers |
| 2026-07-23 | F4.6: schedule/sales/source + blocks preview + buyers + unarchive/delete; Vite `/legacy` hard-retired |
| 2026-07-23 | F4.5: Next taxonomy + ticket-link + landing candidates + Reviews + ECR; Vite remain for schedule/blocks/buyers; retire not yet |
| 2026-07-23 | F4.6: admin preview ╤Б╤В╨░╤В╨╡╨╣ `/admin/articles/[id]/preview` (noindex, Basic Auth, status+publishedAt banner) |
| 2026-07-23 | F4.4: Next Orders/Venues/Cities + soft-retire `/legacy` (Vite remain for taxonomy/candidates/ticket-link); retire not yet |
| 2026-07-23 | F4.3: Next Events override/moderation/SEO + Landings SEO/matches; Vite ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨┤╨╗╤П taxonomy/candidates/Orders |
| 2026-07-23 | F4.2: `@daibilet/worker` CLI + cron wrappers тЖТ same scripts/*; Admin Sources API unchanged |
| 2026-07-23 | SEO.16тАУ18: TOP-15 ╨┤╨╗╤П ╤А╤Г╤З╨╜╨╛╨│╨╛ ╨┐╨╡╤А╨╡╨╛╨▒╤Е╨╛╨┤╨░ (owner); sitemap intents ╨▒╨╡╨╖ thin; ╨┐╨╗╨░╨╜ 30 ╨┐╤Г╤В╨╡╨▓╨╛╨┤╨╕╤В╨╡╨╗╨╡╨╣ |
| 2026-07-23 | F4.1c: admin.daibilet.ru тЖТ Next (middleware host rewrite) + Vite `/legacy` for deep CRUD; nginx patch + deploy |
| 2026-07-23 | F4.1b: Next `/admin/sources` (+ sync trigger, sync-health) ╨╕ read-only `/admin/settings` |
| 2026-07-23 | F4.1a: Next `/admin/events|landings|articles` lists; articles create/edit/archive; Vite ╨┤╨╗╤П deep CRUD |
| 2026-07-23 | F4.1: Next `/admin` live dashboard (dashboard/sources/orders) ╤З╨╡╤А╨╡╨╖ server fetch + Basic Auth forward |
| 2026-07-23 | F4 kickoff: Next `/admin` shell + Basic Auth middleware; Vite admin ╨╛╤Б╤В╨░╤С╤В╤Б╤П ╨║╨░╨╜╨╛╨╜╨╛╨╝ |
| 2026-07-23 | SEO.8b: ╨╜╨░╨╣╨┤╨╡╨╜╨╛ ╤А╨░╤Б╤Е╨╛╨╢╨┤╨╡╨╜╨╕╨╡ `landing-rules.ts` ╨╕ legacy runtime `dto.js`; ╤Б╨╕╨╜╤Е╤А╨╛╨╜╨╕╨╖╨╕╤А╨╛╨▓╨░╨╜╨╛ ╨┐╤А╨░╨▓╨╕╨╗╨╛ `country-tours`, prod smoke: 3 ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕, ╨▒╨╡╨╖ ╨╛╨┐╨╡╤А╤Л ╨╕ ╨║╨╛╨╜╤Ж╨╡╤А╤В╨╛╨▓ |
| 2026-07-23 | SEO.8b: `country-tours` ╨┐╨╡╤А╨╡╤Б╤В╨░╨╗ ╨╝╨░╤В╤З╨╕╤В╤М ╨╗╤О╨▒╨╛╨╡ ╤Б╨╛╨▒╤Л╤В╨╕╨╡ ╨б╨Я╨▒ ╤Б ╤В╨╛╨┐╨╛╨╜╨╕╨╝╨╛╨╝ ╨┐╤А╨╕╨│╨╛╤А╨╛╨┤╨░; ╤В╨╡╨┐╨╡╤А╤М ╨╜╤Г╨╢╨╜╤Л ╨╛╨┤╨╜╨╛╨▓╤А╨╡╨╝╨╡╨╜╨╜╨╛ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╛╨╜╨╜╤Л╨╣ ╨╕ ╨╜╨░╨┐╤А╨░╨▓╨╗╨╡╨╜╤З╨╡╤Б╨║╨╕╨╣ ╤Б╨╕╨│╨╜╨░╨╗╤Л |
| 2026-07-19 | 1.3.1a: city hub FAQ тАФ ╤В╨╛╨╗╤М╨║╨╛ cityInfo/editorial; prod proof SPB @`9bc8fa7` |
| 2026-07-23 | SEO.8: ╤Г╤В╨▓╨╡╤А╨╢╨┤╤С╨╜ ╨╕ ╨▓╨╜╨╡╨┤╤А╤С╨╜ TOP-15. Weekend URL ╨║╨░╨╜╨╛╨╜╨╕╨╖╨╕╤А╨╛╨▓╨░╨╜ ╨▓ `na-vyhodnye`; ╨║╤А╤Л╤И╨╕ ╨╕ ╨╖╨░╨│╨╛╤А╨╛╨┤╨╜╤Л╨╡ ╤Н╨║╤Б╨║╤Г╤А╤Б╨╕╨╕ ╨╛╨│╤А╨░╨╜╨╕╤З╨╡╨╜╤Л ╨б╨░╨╜╨║╤В-╨Я╨╡╤В╨╡╤А╨▒╤Г╤А╨│╨╛╨╝; ╨╕╨╜╨┤╨╡╨║╤Б-╨┐╨╛╤А╨╛╨│ ╤Б╨╛╤Е╤А╨░╨╜╤С╨╜ ╨╜╨░ 6 |
| 2026-07-19 | P.2n: city hub `#directions` тАФ ╤В╨╛╨╗╤М╨║╨╛ chips ╤Б count > 0; prod proof rostov-na-donu @`044e441` |
| 2026-07-19 | P.2m: city hub chips тАФ gap-x-4 ╨╝╨╡╨╢╨┤╤Г date ╨╕ category ╨│╤А╤Г╨┐╨┐╨░╨╝╨╕ |
| 2026-07-19 | P.2k: city hub тАФ ╨▒╨╡╨╖ ╨┐╨╛╨┤╨╖╨░╨│╨╛╨╗╨╛╨▓╨║╨░ ╤Б╤З╤С╤В╤З╨╕╨║╨░; date+category one-row desktop; ╨▒╨╡╨╖ ┬л╨б╤В╨╛╨╕╤В ╨▓╨╜╨╕╨╝╨░╨╜╨╕╤П┬╗ (╨┤╤Г╨▒╨╗╤М ╨░╤Д╨╕╤И╨╕) |
| 2026-07-19 | P.2j: city hub ╨▒╨╡╨╖ ┬л╨Я╨╛╨┐╤Г╨╗╤П╤А╨╜╤Л╨╡ ╤В╨╡╨│╨╕┬╗; ╨╡╨┤╨╕╨╜╤Л╨╡ ╨║╨╛╨╝╨┐╨░╨║╤В╨╜╤Л╨╡ date/category chips |
| 2026-07-19 | P.2i: editorial hub template experiment (`?hub=editorial`, Source Serif, poster cards); default phase 1 intact |
| 2026-07-19 | P.2f: city hub ╤Д╨░╨╖╨░ 1 ╨▓ `CityPageView` (sticky tabs, ╨░╤Д╨╕╤И╨░ ╨▓╤Л╤И╨╡, FAQ accordion, ╤З╨╕╨┐╤Л ╨б╨╡╨│╨╛╨┤╨╜╤П/╨Т╤Л╤Е╨╛╨┤╨╜╤Л╨╡) |
| 2026-07-19 | P.2g: wireframe city hub v2 ╤Б╨╛╨│╨╗╨░╤Б╨╛╨▓╨░╨╜ (docs, city-specific); P.2h ╤А╨╡╨░╨╗╨╕╨╖╨░╤Ж╨╕╤П тП│ |
| 2026-07-19 | P.2e: wireframe city hub v1 ╤Б╨╛╨│╨╗╨░╤Б╨╛╨▓╨░╨╜ (docs); P.2f ╤А╨╡╨░╨╗╨╕╨╖╨░╤Ж╨╕╤П тП│ |
| 2026-07-19 | ╨Я╤А╨╛╨┤╤Г╨║╤В: ╤А╨╡╨║╨╗╨░╨╝╨░ deferred; ╤Д╨╛╨║╤Г╤Б AI/╤Б╤В╨░╤В╤М╨╕, city hubs, ╤Д╨╕╨╜╨║╨╛╨╜╤В╤Г╤А; allowlist ╨▒╨╡╨╖ ╤Е╨░╨▒╨╛╨▓ ╨╜╨╡ ╤А╨░╨╖╨┤╤Г╨▓╨░╤В╤М (P.1тАУP.5) |
| 2026-07-19 | TC on-demand: `tc:sync --ids` + `--dry-run`, admin `?ids=` (S.1тАУS.3) |
| 2026-07-19 | URL: flat paths; SEO ╤З╨╡╤А╨╡╨╖ city hubs (1.3.7 тП│, 1.3.8 ЁЯЪл) |
| 2026-07-19 | Admin: editable Cities (PATCH) + Articles `publishedAt` UI (B.9/B.10) |
| 2026-07-13 | Roadmap ╨┐╨╡╤А╨╡╤Б╤В╤А╨╛╨╡╨╜ ╨╜╨░ **╨н╤В╨░╨┐╤Л 0тАУ2** ╤Б ╤З╨╡╨║╨╗╨╕╤Б╤В╨░╨╝╨╕ browser/admin smoke, tc:sync, SEO gaps |
| 2026-07-11 | F3 cutover prod, Codex cherry-pick |
| 2026-07-10 | F2 SSR complete, staging Next |

## Google Search Console verification
- [x] **╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕╨╣** тАФ ╤Д╨░╨╣╨╗ `googleb3313872246ac993.html` ╨▓ `apps/web/public/`, deploy prod, curl 200 (2026-07-19)


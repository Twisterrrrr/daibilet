# SEO launch checklist (технический)

**Обновлено:** 2026-07-26  
**Архитектура:** CHPU landings (`landing-rules` / `landing-routes` / `[segment]`), `landing-seo.ts`, `seo-listing-meta.ts`, sitemap chunks.  
**Не делать:** параллельная Prisma Category, Lovable `app/[city]/[category]/page.tsx` как замена посадок.

Легенда: ✅ Done · 🟡 Partial · ⏳ TODO (маркетинг/ops)

| # | Пункт | Статус | Где в коде |
|---|--------|--------|------------|
| 1.1 | `robots.txt` Allow основные страницы | ✅ | `apps/web/app/robots.ts` → `https://daibilet.ru/robots.txt` |
| 1.2 | Disallow `/api/`, `/admin/`, `/account/`, `/login`, `/reviews/write` | ✅ | тот же `robots.ts` (`CRAWL_DISALLOW`) |
| 1.3 | Payment success disallow | ✅ N/A | checkout во внешнем iframe партнёра; покупки под `/account/` |
| 1.4 | Dynamic sitemap: landings + city×category | ✅ | `lib/sitemap-data.ts` → `/sitemap.xml` + `/sitemaps/landings.xml` |
| 1.5 | Sitemap уважает `MIN_LISTING_OFFERS_FOR_INDEX` (=6) / noindex | ✅ | `evaluateListingIndexability` в landings + intents chunks |
| 1.6 | Canonical на landings / city×category (UTM-safe) | ✅ | `buildLandingMetadata` → `alternates.canonical` = `landingCategoryHref(...)` |
| 2.1 | `generateMetadata`: title, description, OG, canonical | ✅ | `server/landing-route-page.tsx` → `buildLandingMetadata` |
| 2.2 | City genitive / prepositional helpers | ✅ | `city-declension.ts` + `seo-listing-meta` (`cityToPrepositional`) |
| 2.3 | Year 2026 в title (если год в шаблоне) | ✅ | `listingSeoYear()` / `buildCategoryCityMetaTitle` |
| 2.4 | Цена в meta только из реального `priceFrom` | ✅ | `landing-seo.formatRealPriceRub` + `appendRealPriceToDescription` (без «от 100») |
| 2.5 | Без fake ★ ratings в metadata | ✅ | рейтинги в meta не пишем |
| 2.6 | OG image = landing/city asset | ✅ | `landing.imageUrl \|\| resolveLandingCardImage(slug)` |
| 3.1 | Ровно один H1 на landing/category | ✅ | hero H1 в `LandingPageView` |
| 3.2 | Карточки событий H2/H3, не H1 | ✅ | `EventCard` → `<h2>`; showcase → `<h3>` |
| 3.3 | Image alt с названием события | ✅ | `EventCard` `alt={session.title}` |
| 4.1 | next/font | ✅ | `lib/fonts.ts` (Inter + Manrope + Source Serif 4) → root layout |
| 4.2 | Длинные списки: slice + «Показать ещё» | ✅ | `LandingEventsGrid` page=48 + кнопка «Показать ещё» |
| 5.1 | Filter chips: overflow-x-auto | ✅ | landing filter rows + `.horizontal-snap-row` / catalog chips |
| 5.2 | Touch target ~44px | ✅ | `.catalog-chip` + landing city/genre/dinner chips `min-h-11` |
| 5.3 | Нет горизонтального скролла страницы | ✅ | `html/body overflow-x: clip` в `globals.css` |
| M.1 | Sitemap в Яндекс.Вебмастер | ⏳ | владелец (SEO.IN2) |
| M.2 | Переобход TOP URL после deploy | ⏳ | владелец (SEO.IN3 / SEO.16) |
| M.3 | IndexNow key + notify | ✅ | см. Tasktracker SEO.IN1 |

## Заметки

- City×category URL: `/rechnye-progulki/moscow`, не отдельный Prisma Category.
- Thin pages: live URL + `noindex,follow`, вне sitemap.
- Не копировать Lovable: сломанный canonical template, fake rating sort, неверный родительный падеж.

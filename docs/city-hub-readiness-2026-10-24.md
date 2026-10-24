# City hub readiness audit — 2026-10-24

## Result

The live public destinations feed contains **70 city destinations** (97 total destinations including 27 regions). Applying the current `evaluateCityIndexability` policy to each city gives **55 technically indexable cities**. The `CITY_HUBS` registry contains 31 entries; **25 of the 55 indexable cities are not currently in that registry**.

This is a shortlist for editorial review, not a recommendation to publish all 25 pages. The indexability rule measures public event count (six or more) or membership in the strong-city allowlist; it does not establish search demand, factual completeness, useful local content, image readiness, or suitability for a dedicated hub.

## Indexable candidates absent from the hub registry

Counts below are the `events` field returned by `/api/public/destinations` during this audit.

| City | Public slug | Events |
|---|---|---:|
| Ульяновск | `ulyanovsk` | 22 |
| Липецк | `lipeck` | 16 |
| Киров (Кировская область) | `kirov-kirovskaya-oblast` | 16 |
| Ижевск | `izhevsk` | 16 |
| Томск | `tomsk` | 13 |
| Иркутск | `irkutsk` | 13 |
| Чебоксары | `cheboksary` | 11 |
| Ставрополь | `stavropol` | 10 |
| Оренбург | `orenburg` | 10 |
| Брянск | `bryansk` | 10 |
| Иваново | `ivanovo` | 10 |
| Владивосток | `vladivostok` | 9 |
| Тамбов | `tambov` | 9 |
| Новокузнецк | `novokuzneck` | 9 |
| Вологда | `vologda` | 8 |
| Кемерово | `kemerovo` | 8 |
| Кострома | `kostroma` | 8 |
| Хабаровск | `habarovsk` | 7 |
| Орёл | `orel` | 7 |
| Великий Новгород | `velikiy-novgorod` | 7 |
| Курск | `kursk` | 7 |
| Курган | `kurgan` | 6 |
| Саранск | `saransk` | 6 |
| Калуга | `kaluga` | 6 |
| Сыктывкар | `syktyvkar` | 6 |

## Method and limitations

- Read-only live request to `https://daibilet.ru/api/public/destinations`.
- City rows were classified with the same `evaluateCityIndexability` logic used by city pages and sitemaps: explicit `isIndexable=false` wins; otherwise strong-city allowlist or at least six public events qualifies.
- Registry membership was checked against `CITY_HUBS` in `apps/web/src/lib/city-hub-registry.ts`.
- Counts can change with catalogue synchronization. Recheck the feed before any rollout.
- The current registry has 31 entries; aliases and canonical route resolution must be considered before creating entries. No new route or content pack was generated in this audit.
- No database rows, indexability flags, public pages, or sitemap entries were changed.

## Recommended next work

1. Review candidates for duplicate/alias city records and stable canonical routes.
2. Check each city’s upcoming offers, venue coverage, categories, hero image, and existing editorial/landing content.
3. Rank cities by actual demand and content readiness; start with a small batch and create useful hub content before enabling indexability.
4. Verify rendered page, canonical, JSON-LD, sitemap inclusion, mobile quality, and crawl response for each released batch.

## Remaining SEO owner decisions

- Homepage `private, no-store` behavior caused by cookie-based personalization.
- Saint Isaac’s Cathedral intentionally remains a thin layer with `isIndexable=false` until its content is expanded (owner confirmed 2026-10-24). Do not change this flag before editorial work.

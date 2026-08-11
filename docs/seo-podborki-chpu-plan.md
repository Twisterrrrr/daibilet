# SEO / Подборки: финальная стратегия пилота + план ЧПУ

**Дата:** 2026-08-11 (финал owner)  
**Статус:** **пилот KGD+SPB locked**; Meta на soft `?city=` + stable index/sitemap; маркерный ЧПУ - **следующий спринт**.  
**Трек:** отдельный от My Day UX. Category listing editorial (`seo-listing-texts`) - соседний трек, **не откатывать**.

Бренд: **Дайбилет**. В копирайте только дефис `-`.

---

## LOCKED финал пилота (owner 2026-08-11)

### Охват

| | Канон |
|--|-------|
| Пилот городов | **только** `kaliningrad` + `saint-petersburg` |
| Москва | если уже в Meta-пилоте - **безвредный leftover** (не расширять) |
| Slug | SEO path через `normalizeKnownCitySlug` (`saint-petersburg`, не `sankt-peterburg`) |

### Группы посадок

| Group | Что | Пилот-решение |
|-------|-----|---------------|
| **A/B** | City-scoped: `bridges-night`, `spb-yards`, `country-tours`, … | **Не ломать.** Soft `?city=` на хабе для них избыточен (карточки и так city-bound). ЧПУ city-хаба подборок - след. спринт. |
| **C** | `/podborki?city=` (каталог-хаб) | Unique Title/Desc/H1 + **self-canonical** `/podborki?city={seoSlug}` (уже в коде). |
| **C MULTI** | `MULTI_CITY_LANDING_SLUGS` × city ЧПУ | Пилот city: **не мигать** noindex из-за порога ≥6. `index,follow` при `events > 0`. Editorial SEO-текст (соседний трек) - согласовано, не откатывать. |
| **D** | `salute-9-may` / `/salut-9-maya` | **НЕ noindex / НЕ 404** вне сезона. HTTP **200** круглый год; каталог может скрывать (`OFF_SEASON_LANDING_SLUGS`); off-season stub OK. |
| **E** | `/podborki/{intent}/{city}` | Canonical **строго на свой ЧПУ** (не на `/podborki/{intent}` без city). Пилот: stable index + sitemap при `events > 0` (и skeleton при 0). |

### noindex / sitemap стабильность

- Порог `MIN_LISTING_OFFERS_FOR_INDEX = 6` остаётся для **не-пилот** страниц.
- Пилот `city ∈ {kaliningrad, saint-petersburg}` × (Group C MULTI + Group E): `stablePilotIndex` → index при `events > 0` (без мигания около порога).
- `salute-9-may`: `hasSeoSkeleton` → index даже при 0 офферах.
- Editorial `hasEditorialSeoText` (category×city) - **сохранить** (index при ≥1).
- Sitemap: пилотные city-variants **не выкидывать** только из-за порога 6 если `events > 0`; KGD добавлен в listing sitemap cities рядом с priority list; national salute всегда в landings sitemap.

### Meta soft `?city=` (Group C)

| URL | Поведение |
|-----|-----------|
| `/podborki` / `?city=all` / non-meta city | Хаб meta + canonical `/podborki` |
| `/podborki?city=kaliningrad` (и алиасы→canon) | Unique Title/Desc/H1; canonical **self** |
| `/podborki?city=saint-petersburg` | то же |
| `/podborki?city=moscow` | leftover Meta (harmless); **не** в active SEO pilot (index/sitemap) |

Код: `apps/web/src/lib/podborki-city-seo.ts` (`PODBORKI_SEO_PILOT_CITY_SLUGS` vs `PODBORKI_CITY_META_PILOT_SLUGS`).

---

## Фазы

| Phase | Статус |
|-------|--------|
| 0 Audit | ✅ |
| Meta soft `?city=` (Group C) | ✅ |
| Stable index/sitemap пилот + salute (D/E/C MULTI) | ✅ этот проход |
| 1 Маркерный ЧПУ `/podborki/c/{city}` + 301 | ⏳ следующий спринт |
| 2 Card blurbs | ⏳ |
| 3 Blog banners | ⏳ после URL lock маркера |

---

## Что НЕ трогать

- Group A/B URL/перелинковка; My Day; finance.
- Не откатывать editorial index bypass на category landings.
- Не расширять пилот на Москву/остальные города без owner.
- Не вводить второй slug-канон.

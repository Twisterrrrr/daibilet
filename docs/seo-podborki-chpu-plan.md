# SEO / Подборки: финальная стратегия пилота + план ЧПУ

**Дата:** 2026-08-11 (финал owner); Phase 1 marker CHPU - 2026-09-03  
**Статус:** **пилот KGD+SPB + PILOT-2 NN/Perm**; Meta + **маркерный ЧПУ** `/podborki/c/{city}` + 301 с soft `?city=`.  
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
| **A/B** | City-scoped: `bridges-night`, `spb-yards`, `country-tours`, … | **Не ломать.** Soft `?city=` на хабе для них избыточен (карточки и так city-bound). |
| **C** | `/podborki/c/{city}` (каталог-хаб, маркерный ЧПУ) | Unique Title/Desc/H1 + **self-canonical** `/podborki/c/{seoSlug}`. Soft `/podborki?city=` → **301** на маркер для meta-pilot. |
| **C MULTI** | `MULTI_CITY_LANDING_SLUGS` × city ЧПУ | Пилот city: **не мигать** noindex из-за порога ≥6. `index,follow` при `events > 0`. Editorial SEO-текст (соседний трек) - согласовано, не откатывать. |
| **D** | `salute-9-may` / `/salut-9-maya` | **НЕ noindex / НЕ 404** вне сезона. HTTP **200** круглый год; каталог может скрывать (`OFF_SEASON_LANDING_SLUGS`); off-season stub OK. |
| **E** | `/podborki/{intent}/{city}` | Canonical **строго на свой ЧПУ** (не на `/podborki/{intent}` без city). Пилот: stable index + sitemap при `events > 0` (и skeleton при 0). |

### noindex / sitemap стабильность

- Порог `MIN_LISTING_OFFERS_FOR_INDEX = 6` остаётся для **не-пилот** страниц.
- Пилот `city ∈ {kaliningrad, saint-petersburg}` × (Group C MULTI + Group E): `stablePilotIndex` → index при `events > 0` (без мигания около порога).
- `salute-9-may`: `hasSeoSkeleton` → index даже при 0 офферах.
- Editorial `hasEditorialSeoText` (category×city) - **сохранить** (index при ≥1).
- Sitemap: пилотные city-variants **не выкидывать** только из-за порога 6 если `events > 0`; KGD добавлен в listing sitemap cities рядом с priority list; national salute всегда в landings sitemap; Group C marker `/podborki/c/{seoPilot}` в static sitemap.

### Meta city hub (Group C) - Phase 1 marker

| URL | Поведение |
|-----|-----------|
| `/podborki` / `?city=all` | Хаб meta + **index,follow** + canonical `/podborki` |
| `/podborki/c/kaliningrad` | Unique Title/Desc/H1; **self-canonical** `/podborki/c/kaliningrad`; index,follow (SEO pilot) |
| `/podborki/c/saint-petersburg` | то же |
| `/podborki/c/nizhny-novgorod` / `/podborki/c/perm` | PILOT-2: тот же контур (index + self-canonical + 301 с soft) |
| `/podborki?city=kaliningrad` (и алиасы→canon) | **301** → `/podborki/c/kaliningrad` |
| `/podborki?city=saint-petersburg` | **301** → `/podborki/c/saint-petersburg` |
| `/podborki/c/moscow` | leftover Meta (harmless); **не** в active SEO pilot (noindex; не в SEO sitemap list) |
| `/podborki?city=moscow` | **301** → `/podborki/c/moscow` |
| `/podborki?city=kazan` (и прочие non-pilot) | hub copy; **noindex,follow**; canonical `/podborki` (soft query без 301) |

**Smoke checklist:** self-canonical на маркер `/podborki/c/{seoSlug}`; soft query пилота даёт 301 Location на маркер.

Код: `apps/web/src/lib/podborki-city-seo.ts` + `apps/web/app/podborki/c/[city]/page.tsx` + middleware 301 + `apps/web/src/lib/seo/get-landing-seo.ts` (`SeoOverride` → template → fallback).

### Stage-1 SeoOverride (owner HTML)

Пары в prod DB (без фейков): `kaliningrad/standup`, `kaliningrad/excursions`, `saint-petersburg/bridges-night`, `saint-petersburg/spb-yards`, `saint-petersburg/river-cruises`. Рендер `customText` внизу landing через `LandingSeoBottom`. Upsert: `apps/web/scripts/upsert-seo-override-stage1.mjs`.

---

## Фазы

| Phase | Статус |
|-------|--------|
| 0 Audit | ✅ |
| Meta soft `?city=` (Group C) | ✅ (superseded: soft → 301 на маркер) |
| Stable index/sitemap пилот + salute (D/E/C MULTI) | ✅ |
| 1 Маркерный ЧПУ `/podborki/c/{city}` + 301 | ✅ 2026-09-03 |
| 2 Card blurbs | ⏳ |
| 3 Blog banners | ⏳ после URL lock маркера |

---

## Что НЕ трогать

- Group A/B URL/перелинковка; My Day; finance.
- Не откатывать editorial index bypass на category landings.
- Не расширять пилот на Москву/остальные города без owner (исключение - пилот-2 ниже, только по gate).
- Не вводить второй slug-канон.
- **Не** расширять пилот на Москву без owner; PILOT-2 slug'и (`nizhny-novgorod`, `perm`) - только через `PODBORKI_SEO_PILOT_CITY_SLUGS` (маркерная машина уже подхватит CHPU + 301 + sitemap).

---

## Пилот-2 (owner 2026-09-03: старт)

| | Канон |
|--|-------|
| ID | `SEO.PODBORKI-PILOT-2` |
| Города | `nizhny-novgorod` + `perm` |
| Scope | тот же контур пилот-1: Group C meta/self-canonical/index + Group E intents; шаблоны уже есть |
| SeoOverride | **только 1–2** кастомных ключа на город (не Stage-1 пачкой из 5) |
| Код | ✅ slug'и в `PODBORKI_SEO_PILOT_CITY_SLUGS`; маркер `/podborki/c/{city}` + 301 + sitemap |

**Критерий старта:** owner подтвердил индекс podborki KGD/SPB (2026-09-03). См. также `docs/qa.md` (секция пилот-2).

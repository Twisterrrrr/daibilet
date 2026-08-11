# SEO / Подборки: city meta + план ЧПУ

**Дата:** 2026-08-11 (обновлено после ответов owner)  
**Статус:** **Phase Meta (пилот) в коде** - уникальные Title/Description/H1 + self-canonical на soft `?city=`. Маркерный ЧПУ - **следующий спринт**.  
**Трек:** отдельный от My Day UX и от SEO category×city listing texts (`seo-listing-texts`). Не смешивать PR.

---

## LOCKED решения owner (2026-08-11)

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Slug | Хочет транслит, **но** path должен совпадать с уже живыми слагами. **Факт runtime:** destinations DB = `moskva` / `sankt-peterburg` / `kaliningrad`; SEO path landings + city hub (после 308) = `moscow` / `saint-petersburg` / `kaliningrad`. **Для Meta/Canonical пилота** = SEO path-канон через `normalizeKnownCitySlug` (алиасы `moskva`/`sankt-peterburg` резолвятся в него). Второй публичный канон **не** вводим; транслит-алиас+301 только если/когда появится маркерный ЧПУ. |
| 2 | Роут vs intents | Маркер `/podborki/c/{city}` или `gorod-` - **не в этом проходе**. Intents не трогаем. |
| 3 | Охват | Пилот: **kaliningrad, saint-petersburg, moscow**. |
| 4 | vs `/cities` | Подборки = **идейный хаб** (готовые идеи/коллекции); city hub = афиша/куда сходить. Бренд **Дайбилет**. |
| 5 | Порядок | **Сначала Meta на soft `?city=`**, не ЧПУ+301. Canonical для пилота = **`/podborki?city={seoSlug}` (self)**, не `/podborki`. |

### Fork: Meta сейчас vs маркерный сегмент

**Архитектурный канон (не переспрашивать):** сейчас **только Meta/Canonical** на `?city=` (пилот). Маркерный ЧПУ `/podborki/c/{city}` - **следующий спринт после** успеха пилота (индексация без склейки с хабом `/podborki`). Альтернатива перелинковки на intent ЧПУ - тактика позже, ок.

---

## 1. Как устроено сейчас (после пилота Meta)

| URL | Поведение |
|-----|-----------|
| `/podborki` / `?city=all` / non-pilot city | Хаб meta + canonical `/podborki`; H1 «Готовые планы…» |
| `/podborki?city=kaliningrad` (и алиасы→canon) | Уникальные Title/Desc/H1; canonical **self** `/podborki?city=kaliningrad` |
| `/podborki?city=sankt-peterburg` | Meta как SPB; canonical **`?city=saint-petersburg`** (SEO path) |
| `/podborki/{intent}[/{city}]` | Без изменений |

Код: `apps/web/src/lib/podborki-city-seo.ts` + `app/podborki/(catalog)/page.tsx` (читает `searchParams`).

**Trade-off:** await `searchParams` → route dynamic (раньше ISR ради CDN; пилот SEO важнее склейки).

---

## 2. Inventory перелинковки (Phase 0, без массовых правок)

См. предыдущую ревизию: CityPageView + interstitials на `?city=`; header/footer на хаб; intents ЧПУ отдельно. **Массовая перелинковка не делалась.**

---

## 3. Риски (актуально)

- Коллизия `/podborki/[intent]` vs city path - отложена до маркерного сегмента.
- Dual slug (DB translit vs SEO path) - документирован; meta нормализует к SEO path.
- Каннибализация с `/cities/{slug}` - снята формулами «Подборки / идейный хаб» vs «Афиша».

---

## 4. Фазы

| Phase | Статус |
|-------|--------|
| 0 Audit | ✅ |
| **Meta soft `?city=` (пилот 3 города)** | ✅ код (этот проход) |
| 1 Маркерный ЧПУ `/podborki/c/{city}` + 301 | ⏳ следующий спринт после индексации пилота |
| 2 Card blurbs | ⏳ |
| 3 Blog banners | ⏳ после URL lock маркера |

---

## 5. Что НЕ трогать

- Intents, mass rewrites, My Day, `seo-listing-texts`, finance.
- Не вводить второй slug-канон и не делать ЧПУ в этом проходе.

# Region Hub IA v1 — `/cities/{slug}` при `type=region`

**Статус:** согласовано (спека + Sprint 1–2 в работе)  
**Дата:** 2026-08-11  
**Стек:** Next `apps/web` + `buildPublicCityDto`  
**Роут:** flat `/cities/{slug}` (без `/regions/…`)  
**Связь:** [city-hub-wireframe-v1.md](./city-hub-wireframe-v1.md), geo `data/geo/city-routing.ru.json`, центры `data/geo/region-hubs.ru.json`

---

## 1. Цель

Region hub — **агрегатор субъекта РФ**, не копия city hub адмцентра.

| | City hub | Region hub |
|--|--|--|
| Интент | афиша в городе | куда съездить / события по области |
| Афиша | сессии города | только региональные сессии (**без** центра) |
| Fingerprint | направления / sights | блок «Города региона» + мост в центр |

---

## 2. DTO (`type=region`)

Дополнения к `PublicCityPageDto`:

```ts
centerCity?: { slug: string; name: string; eventCount: number } | null;
childCities?: Array<{ slug: string; name: string; eventCount: number }>;
regionInfo?: {
  brief?: string;
  topPlaces?: Array<{ name: string; desc: string }>;
  faq?: Array<{ q: string; a: string }>;
} | null;
```

- `childCities` — reverse `cityToRegion` + города из региональных сессий; `eventCount=0` в payload остаются, в UI скрыты (или «Показать все»).
- `centerCity` — из `region-hubs.ru.json` + count standalone-хаба центра.
- Афиша `sessions` уже = bucket региона (центр в другой destination).

---

## 3. UI (сверху вниз)

1. **Hero** — H1 региона (без «Афиша» первым), brief (`regionInfo` или системный).
2. **Мост в центр** — CTA на `/cities/{centerSlug}` + count.
3. **Города региона** — плитки с count &gt; 0 → якорь/фильтр афиши.
4. **Афиша субъекта** — лента региональных сессий.
5. **Контент тира A** — `topPlaces` + FAQ (Sprint 3).

Пустые city-секции (`travel` / `sights` из `CITY_INFO`) для region **не** рендерить.

---

## 4. Тиры

| Тир | Критерий | Index | Контент |
|-----|----------|-------|---------|
| **A** | ≥10 (**live**) | index | полный `regionInfo` / topPlaces; AI-флаг если пусто |
| **B** | 3–9 (**live**) | index | города + brief + 1 FAQ; strip на центре **off** |
| **C** | &lt;3 (**live**) | **noindex, nofollow** + вне sitemap | stub + мост; strip на центре **on** |

Динамика без ручных правок: [region-live-tier.md](./region-live-tier.md). Поле `tier` в JSON — только editorial hint.

Правило robots: live tier C → noindex (без учёта центра).

---

## 5. SEO

**Region (внедрять):**  
- Title: `{Регион}: куда съездить и что посмотреть, загородный отдых`  
- H1: `Мероприятия и загородный отдых в {Регионе}`  
- Description: события/площадки/города для загородного отдыха и weekend-поездок  

**City:** шаблон P.2d (`{City}: афиша… на сегодня, {date}`) **не ломаем** в этом релизе; альтернатива из спеки — отдельное продуктовое решение.

---

## 6. Спринты

| Sprint | Scope | Статус |
|--------|-------|--------|
| 1 | type=region branch, `centerCity`/`childCities`, скрытие пустых city-секций | ✅ |
| 2 | UI: мост + города региона + афиша | ✅ |
| 3 | region SEO meta, noindex C, strip на центре, AI `regionInfo` A | ✅ SEO+noindex+strip; LLM script ⏳ |

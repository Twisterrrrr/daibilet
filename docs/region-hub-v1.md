# Region Hub IA v1 - `/cities/{slug}` при `type=region`

**Статус:** Sprint 1-3 + Tier A UX v1 (Подмосковье пилот)  
**Дата:** 2026-08-11  
**Стек:** Next `apps/web` + `buildPublicCityDto`  
**Роут:** flat `/cities/{slug}` (без `/regions/…`)  
**Связь:** [city-hub-wireframe-v1.md](./city-hub-wireframe-v1.md), [region-live-tier.md](./region-live-tier.md), geo `data/geo/city-routing.ru.json`, центры `data/geo/region-hubs.ru.json`, пояса `data/geo/region-city-belts.ru.json`

---

## 1. Цель

Region hub - **агрегатор субъекта РФ**, не копия city hub адмцентра. Две оси выбора пользователя: **«далеко ли ехать?»** и **«что там будет?»**.

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
regionTier?: 'A' | 'B' | 'C' | null;
```

- `childCities` - reverse `cityToRegion` + города из региональных сессий; `eventCount=0` в payload остаются, в UI скрыты (или «Показать все»).
- `centerCity` - из `region-hubs.ru.json` + count standalone-хаба центра.
- Афиша `sessions` уже = bucket региона (центр в другой destination).
- Пояса удаленности (Подмосковье): web join из `region-city-belts.ru.json` по slug/name - без API churn.

---

## 3. UI (сверху вниз)

1. **Hero** - H1 региона, brief (`regionInfo` или системный); без дубля seo-строки.
2. **Мост в центр** - CTA на `/cities/{centerSlug}` + count.
3. **Города региона** (`bg-slate-50`) - горизонтальный avatar-rail (превью: city asset → session cover → pin; count + logistics) → фильтр афиши; OSM-карта точек **развёрнута по умолчанию**.
4. **Куда съездить** (Tier A, `bg-white`) - `topPlaces` плитки **photo-first** (editorial `imageUrl` → обложка города → постер события).
5. **Афиша** (`bg-slate-50`) - sticky бар: date rail (неделя) + пояса (если JSON) + жанры; lean `RegionEventCard`; схлопывание серий одной площадки (`RegionVenueSeriesCard`).
6. **FAQ** (`bg-white`).

Пустые city-секции (`travel` / `sights` из `CITY_INFO`) для region **не** рендерить.

### Tier A UX notes

- **Не** shared `EventCard`: region-only photo-first card, один CTA «Билет», один genre bubble, logistics chip (`МЦД · ~N км`).
- **Серии:** ≥3 события на venue **или** ≥40% видимой ленты → карусель дат + «Показать все».
- **Пояса v1:** `near` / `mid` / `far` от МКАД (пилот `moskovskaya-oblast`). Шоссе-коридоры - v2.
- **Карта v1:** ориентация + клик = city filter; без cluster SDK; open by default.

---

## 4. Тиры

| Тир | Критерий | Index | Контент |
|-----|----------|-------|---------|
| **A** | ≥10 (**live**) | index | полный `regionInfo` / topPlaces; AI-флаг если пусто; Tier A UX выше |
| **B** | 3–9 (**live**) | index | города + brief + 1 FAQ; strip на центре **off**; тот же UI каркас без belts если нет JSON |
| **C** | &lt;3 (**live**) | **noindex, nofollow** + вне sitemap | stub + мост; strip на центре **on** |

Динамика без ручных правок: [region-live-tier.md](./region-live-tier.md). Поле `tier` в JSON - только editorial hint.

Правило robots: live tier C → noindex (без учёта центра).

---

## 5. SEO

**Region:**  
- Title: `{Регион}: куда съездить и что посмотреть, загородный отдых`  
- H1: `Мероприятия и загородный отдых в {Регионе}`  
- Description: события/площадки/города для загородного отдыха и weekend-поездок  

**City:** шаблон P.2d (`{City}: афиша… на сегодня, {date}`) **не ломаем** в этом релизе.

---

## 6. Спринты

| Sprint | Scope | Статус |
|--------|-------|--------|
| 1 | type=region branch, `centerCity`/`childCities`, скрытие пустых city-секций | ✅ |
| 2 | UI: мост + города региона + афиша | ✅ |
| 3 | region SEO meta, noindex C, strip на центре, AI `regionInfo` A | ✅ SEO+noindex+strip; LLM script ⏳ |
| 4 | Tier A UX: lean cards, city rail, date/belt/genre sticky, series collapse, belts+map (MSK oblast) | ✅ code |

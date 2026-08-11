# Region Info AI pipeline (Tier A / B)

**Статус:** seed Tier A (6) + Tier B key (6) вручную (2026-08-11)  
**Связь:** [region-hub-v1.md](./region-hub-v1.md), `data/geo/region-info.ru.json`, `apps/backend/src/region-hub.ts`

---

## Цель

Генерировать `regionInfo` так, чтобы:

1. **Не конкурировать с адмцентром** — в тексте нет достопримечательностей и афиши центра.
2. **Опираться на каталог** — города/venues с `eventCount > 0` в региональном bucket.
3. **Связывать UX (Tier A)** — `topPlaces.cityNames` фильтруют афишу региона.
4. **Чистый SEO** — region title/H1/description; FAQPage (+ ItemList Place для A); без city-шаблона P.2d.

---

## Контракты по тирам

### Tier A (полный гид)

```ts
type RegionInfoA = {
  brief: string; // 150–220 знаков
  topPlaces: Array<{ name: string; desc: string; cityNames: string[] }>; // 2–4
  faq: Array<{ q: string; a: string }>; // 2–3
};
```

Seed: МО, ЛО, Татарстан, Краснодарский край, Самарская, ХМАО.

### Tier B (короткий ландшафт)

```ts
type RegionInfoB = {
  brief: string; // 1–2 предложения, LSI без перегруза
  faq: Array<{ q: string; a: string }>; // ровно 1 главный региональный FAQ
  // topPlaces — нет: фронт опирается на childCities + мост в центр
};
```

Seed key-B: Нижегородская, Воронежская, Башкортостан, Ростовская, Тульская, Ярославская.

**Профит B:** уникальный текстовый сигнал для роботов + честный UX (плитка городов + bridge), без фейкового «гида».

---

## Context gathering (до LLM)

Бэкенд собирает **жёсткий** контекст (без центра):

| Поле | Источник |
|------|----------|
| `regionName`, `regionSlug` | destination |
| `excludeCenter` | `region-hubs.ru.json` → `centerCity` |
| `cities[]` | childCities с `eventCount > 0` + top venues per city |
| `venues[]` | venues из региональных sessions, rank by session count |
| `genres[]` | top categories из sessions |

Код: `buildRegionInfoPromptContext()` в `apps/backend/src/region-info-context.ts`.

---

## Промпт

**Tier A:** полный гид + topPlaces + 2–3 FAQ.  
**Tier B:** только `brief` (1–2 предложения) + **один** FAQ; без topPlaces.

> Напиши гид по [{region}] **только** для загородного отдыха.  
> **Запрещено** описывать [{center}].  
> Только города/площадки из контекста.  
> Tier A → `{ brief, topPlaces, faq }`; Tier B → `{ brief, faq: [один вопрос] }`.

---

## Пост-валидация

1. Нет имени центра в brief/faq/desc.
2. Tier A: `cityNames` ∈ childCities с events > 0.
3. Tier B: нет `topPlaces` (или игнор на runtime); faq length = 1.
4. Review → `region-info.ru.json` → runtime.

---

## Runtime / UI

| Тир | Hero brief | Places | FAQ | Fingerprint UI |
|-----|------------|--------|-----|----------------|
| A | regionInfo | topPlaces → filter | 2–3 | + childCities + bridge |
| B | regionInfo | скрыт | 1 | **childCities + bridge** (главный вес) |
| C | system brief | — | — | noindex; strip на центре |

---

## Очередь

| # | Задача | Статус |
|---|--------|--------|
| 1 | Seed Tier A (6) | ✅ |
| 2 | Seed Tier B key (6) | ✅ |
| 3 | Context builder + prompt doc | ✅ |
| 4 | Script `region:info:draft` (LLM dry-run) | ⏳ |
| 5 | Остальные Tier B (программный brief или LLM) | ⏳ |
| 6 | Strip на хабе центра для тира C | ✅ |

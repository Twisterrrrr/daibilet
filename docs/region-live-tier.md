# Region live tier — автоматические переходы

**Статус:** канон (2026-08-11)  
**Связь:** [region-hub-v1.md](./region-hub-v1.md), `resolveRegionLiveTier` в `@daibilet/contracts/common`

---

## Триггер

На каждом rebuild/cache `buildPublicCityDto` считается:

```
childEventTotal = sum(childCities.eventCount)  // без адмцентра
liveTier = resolveRegionLiveTier(childEventTotal)
```

| liveTier | События | robots | sitemap | Region UI | Strip на центре |
|----------|---------|--------|---------|-----------|-----------------|
| **C** | &lt;3 | noindex,nofollow | нет | заглушка + мост в центр; города скрыты | **да** (если ≥1) |
| **B** | 3–9 | index,follow | да | города + brief + 1 FAQ | **нет** |
| **A** | ≥10 | index,follow | да | полный regionInfo / topPlaces | **нет** |

Константы: `REGION_TIER_B_MIN_EVENTS=3`, `REGION_TIER_A_MIN_EVENTS=10`.

Поле `tier` в `region-hubs.ru.json` — **только editorial hint**, не управляет SEO/UI.

---

## Рост C → B → A

1. SEO: robots/sitemap переключаются с порога 3.
2. Strip на центре **выключается** при ≥3 (нет дубля с Region Hub).
3. Region Hub включает «Города региона».
4. При ≥10: `regionInfoNeedsGeneration=true`, если нет `topPlaces` → очередь AI/редактора.

## Падение A/B → C

1. noindex + выкидывание из sitemap.
2. Города/topPlaces/FAQ скрыты; акцент на мост в центр.
3. Редкие 1–2 события остаются на стрипе центра.

---

## Код

- `resolveRegionLiveTier` — contracts  
- `buildRegionHubEnrichment` → `liveTier`, `shapeRegionInfoForTier`  
- `buildCityRegionNearby` → return null если tier ≠ C  
- `RegionPageView` / `evaluateRegionIndexability` / sitemap — по live tier

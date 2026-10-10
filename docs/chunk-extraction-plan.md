# Chunk Extraction Plan — оптимизация клиентского бандла

## Проблема
Клиентские компоненты (`'use client'`) статически импортируют тяжёлые data-модули:
- `cityInfo-data.ts` (6153 строк + 18K hub-импортов) → через `DayRoutePanel.client.tsx`, `CityPageView.client.tsx`
- `city-place-images-data.ts` (4235 строк) → через `DestinationRegionGuide.client.tsx`
- `day-route.ts` (2393 строки) → через `DayRoutePanel.client.tsx`

Итого: ~26K строк данных в клиентском бандле.

## Решение — Phase 1: Props drilling (безопасно, без API changes)

### Шаг 1: DayRoutePanel — передать mustSee/suburbs/presets как props
1. `my-day/page.tsx` (server) → вызвать `resolveCityInfo(slug)` → передать `{ mustSee, significantSuburbs, dayRoutePresets }` как props
2. `DayRoutePanel.client.tsx` → принять props, убрать `import { resolveCityInfo }`
3. `CityDayPresetBlock.client.tsx` → уже импортирует только типы ✅

### Шаг 2: CityPageView — передать city info как props
1. `cities/[slug]/page.tsx` (server) → передать `CityInfoEntry` как prop
2. `CityPageView.client.tsx` → принять prop, убрать `import { resolveCityInfo }`

### Шаг 3: DestinationRegionGuide — передать image URLs как props
1. `RegionPageView.client.tsx` → передать pre-computed image URLs
2. `DestinationRegionGuide.client.tsx` → убрать `import { lookupEditorialPlaceImage }`

## Решение — Phase 2: Dynamic hub imports (больший выигрыш, больше работы)

1. `cityInfo-data.ts` → заменить статические hub-импорты на dynamic import map
2. `resolveCityInfo(slug)` → async, загружает только нужный hub
3. `useCityInfo(slug)` hook → для клиентских компонентов
4. Post-processing (hydrateDestinationRegistry, mergeMonumentMustSee) → lazy per-city

## Ожидаемый эффект
- Phase 1: -26K строк из клиентского бандла (~500KB before gzip)
- Phase 2: Additional -18K строк из серверного бандла (каждая страница города грузит только свой hub)

## Статус
- [ ] Phase 1 — не начата
- [ ] Phase 2 — не начата

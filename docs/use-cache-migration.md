# unstable_cache → 'use cache' миграция

## Статус: ЗАБЛОКИРОВАНО — требует cacheComponents: true

`'use cache'` directive в Next.js 16 требует включения `cacheComponents: true` в next.config.ts.
Это **фундаментальное изменение модели кэширования**:
- Все dynamic code по дефолту выполняется на request time (не build time)
- Partial Pre-Rendering (PPR) становится основной моделью
- Требует тщательного тестирования всех маршрутов

## Решение: оставить unstable_cache как есть

`unstable_cache` продолжает работать в Next.js 16 без изменений.
Миграция на `'use cache'` — отдельный проект после стабилизации на N16.

## Файлы использующие unstable_cache (8 файлов, 20 вызовов)
- cached-home-data.ts (6)
- cached-public-surfaces.ts (4)
- cached-blog-data.ts (3)
- cached-city-data.ts (2)
- cached-event-data.ts (2)
- cached-catalog-data.ts (1)
- cached-venue-data.ts (1)
- hero-banners.ts (1)

## Когда мигрировать
1. Включить `cacheComponents: true` в next.config.ts
2. Протестировать все маршруты с новой моделью
3. Мигрировать файлы по фазам (Phase 1: чистый fetch, Phase 2: с Prisma)

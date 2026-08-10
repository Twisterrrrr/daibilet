# Выгрузка сидов: Эрмитаж + Гараж

Материал для ревью с Codex: extract из SPBBOATS + сравнение с Daibilet.
Путь: `docs/research/venue-seeds-hermitage-garage/` (не `tmp-*`, чтобы не попасть под gitignore).

## Что нашли

Оба venue найдены в SPBBOATS `packages/backend/prisma/seed-venues.ts`:

| Venue | SPBBOATS slug | Daibilet slug | Полнота сида |
|-------|---------------|---------------|--------------|
| Государственный Эрмитаж | `ermitazh` | `ermitazh` | Полный: highlights, faq, features, hours |
| Музей «Гараж» | `garazh` | `moscow-muzey-garazh` | Slim: без highlights/faq; images в links на `muzej-garazh` |

Дополнительно: демо `garage-moscow-demo` в `seed-scenarios.ts` (не продакшен).

## Файлы

| Файл | Что это |
|------|---------|
| `ermitazh.venue-seed.json` | Нормализованный seed Эрмитажа |
| `garazh.venue-seed.json` | Нормализованный seed Гаража + alias-slug'и |
| `sources/ermitazh.seed-venues.ts-fragment.ts` | Сырой фрагмент из seed-venues.ts |
| `sources/garazh.seed-venues.ts-fragment.ts` | Сырой фрагмент из seed-venues.ts |
| `sources/seed-venue-links.hermitage-garage.json` | Keywords, Unsplash images, OPEN_DATE offer Эрмитажа |
| `sources/garage-moscow-demo.scenario.json` | Демо-сценарий программы Гаража |
| `sources/daibilet-related.json` | Что уже есть у нас (ensure, cityInfo, must-see) |
| `block-layout/spbboats-venue-pdp-blocks.md` | Верстка блоков SPBBOATS VenuePageView |
| `block-layout/daibilet-venue-pdp-blocks.md` | Верстка блоков Daibilet InstitutionVenueLayout |
| `COMPARISON-spbboats-vs-daibilet.md` | Сравнение + выводы |

## Оригинальные пути

- `F:/coding/SPBBOATS/packages/backend/prisma/seed-venues.ts`
- `F:/coding/SPBBOATS/packages/backend/prisma/seed-venue-links.ts`
- `F:/coding/SPBBOATS/packages/backend/prisma/seed-scenarios.ts`
- `F:/coding/SPBBOATS/packages/frontend/src/components/venue/VenuePageView.tsx`
- `F:/coding/SPBBOATS/packages/frontend/src/lib/venues/buildVenueTemplateSections.ts`
- Daibilet: `scripts/ensure-spb-hermitage-erarta-venues.js`, `apps/web/src/components/InstitutionVenueLayout.client.tsx`, `scripts/data/must-see-editorial.json`

## Для Codex

Начать с `COMPARISON-spbboats-vs-daibilet.md`, затем `ermitazh.venue-seed.json` / `garazh.venue-seed.json` и `block-layout/`.

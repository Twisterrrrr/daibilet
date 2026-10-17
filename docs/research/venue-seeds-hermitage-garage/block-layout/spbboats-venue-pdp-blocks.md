# SPBBOATS: структура блоков venue PDP

Источник вёрстки: `F:/coding/SPBBOATS/packages/frontend/src/components/venue/VenuePageView.tsx`  
Сборка секций из данных: `.../frontend/src/lib/venues/buildVenueTemplateSections.ts`  
Типы секций: `packages/shared` → `VenuePublicTemplateSections`  
Опционально JSON: `Venue.venueTemplateData` (Prisma) + legacy-колонки `highlights` / `faq` / `features` / `openingHours`

## Порядок секций на странице

| # | Блок | Cond | Данные |
|---|------|------|--------|
| 0 | Hero (full-bleed) | всегда | title/shortTitle, imageUrl, introLead, priceFrom, openNow, metro, breadcrumb |
| 1 | Mobile sticky CTA | mobile | primary offer / #tickets |
| 2 | TicketsBlock | offers | EventOffer[] (REDIRECT / purchase) |
| 3 | Reviews | reviews API | rating + externalRating |
| 4 | «О месте» | highlights/features/description | highlights[], features chips, description HTML |
| 4b | Gallery | galleryUrls | горизонтальный snap-scroll |
| 5 | «Как посетить» | hours/address/rules | openingHours map, address, phone, website, visitingRules |
| 5b | Коллекции / экспозиция / accessibility / amenities | template sections | venueTemplateData → sections |
| 6 | Программа площадки | program API | current / upcoming exhibitions |
| 7 | FAQ | faq[] | JSON-LD FAQPage |
| 8 | Related articles / related venues | если есть | |
| — | Sidebar (desktop) | always | карта/часы/контакты/CTA |

## Модель контента (два слоя)

1. **Legacy seed-поля Venue** (то, что реально заполнено у Эрмитажа в `seed-venues.ts`):
   - `description`, `shortDescription`
   - `openingHours` (Json mon..sun)
   - `highlights` (string[])
   - `faq` ({q,a}[])
   - `features` (string[] коды: no_queue, audio_guide, …)
   - phone, website, metro, district, priceFrom

2. **Typed template** (`venue.template.sections` / `venueTemplateData`):
   - `intro` { title, lead, longDescription, highlights }
   - `gallery` { images }
   - `visitInfo` { openingHours, visitingRules }
   - `collections` / `permanentExposition`
   - `accessibility` { audioGuide, interactive, notes }
   - `amenities` { items, text }
   - `faq` { items }
   - `eventsCopy` { title, intro }

`buildVenueTemplateSections` мержит template → fallback на legacy-колонки.

## Что у Эрмитажа vs Гаража в сиде

- **Эрмитаж (`ermitazh`)**: полный legacy-набор (highlights + faq + features + hours). Template JSON не сидится.
- **Гараж (`garazh`)**: только базовые поля + features + hours. **Нет** highlights/faq → на PDP блоки «буллеты» и FAQ будут пустыми (кроме UI-скелета).
- Демо `garage-moscow-demo`: богаче по **программе событий**, но это тестовый контент, не продакшен-карточка Гаража.

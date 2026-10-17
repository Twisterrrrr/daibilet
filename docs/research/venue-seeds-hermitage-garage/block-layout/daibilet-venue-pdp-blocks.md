# Daibilet: структура блоков venue PDP (institution)

Источник: `apps/web/src/components/InstitutionVenueLayout.client.tsx`  
Роутер: `apps/web/src/components/VenuePageView.client.tsx` → institution | location  
Логистика: `VenueLogisticsBlock`  
Афиша: `VenueProgramBlock` + `lib/venue-program`  
Модель: `packages/db/prisma` `Venue` (без highlights/faq/features JSON)

## Порядок секций (institution = музеи/арт, в т.ч. ermitazh / moscow-muzey-garazh)

| # | Блок | Cond | Данные |
|---|------|------|--------|
| 0 | Breadcrumbs | всегда | pagePayload |
| 1 | Hero | всегда | heroImageUrl (editorial override), seoH1/title, shortDescription, stats, share, AddToDayRoute |
| 2 | Anchor nav | если есть афиша | #venue-program, #about, #faq |
| 3 | VenueAdmissionBlock | finance products | AdmissionProduct[] |
| 4 | «Ближайшие события» | sessions | первые 4 слота |
| 5 | STOP / nearby экскурсии | stopEvents \| nearbyEvents | связи с каталогом экскурсий |
| 6 | Афиша и билеты (children / VenueProgramBlock) | sessions | date chips + groups |
| 7 | «О месте» | description/shortDescription | текст (без highlights chips) |
| 8 | FAQ | всегда (хардкод) | 3 общих вопроса, **не per-venue** |
| 9 | Похожие площадки | relatedVenues | до 4 |
| 10 | Sidebar logistics + map | address/metro/wayToFind/parking | VenueLogisticsBlock + OSM |
| — | Mobile sticky | mobile | CTA |

## Поля Venue в Daibilet (релевантные контенту)

- title, description, shortDescription, heroImageUrl
- address, lat/lng, metroStation
- **wayToFind**, **parkingInfo**, **hookFact** (наши editorial-поля; в SPBBOATS seed-venues их нет)
- kind, pageStatus, SEO (seoH1/Title/Description, canonicalPath)
- Нет: highlights[], faq[], features[], openingHours Json, venueTemplateData, phone, website как колонки Venue

Часы для части slug (в т.ч. `moscow-muzey-garazh`) — **хардкод** в `venue-opening-hours.ts`, не в БД.

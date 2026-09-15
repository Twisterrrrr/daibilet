# Сравнение SPBBOATS vs Daibilet (venue PDP)

## Ось: контент блоков

| | SPBBOATS | Daibilet |
|--|----------|----------|
| Highlights / «что внутри» | Да, per-venue string[] | Нет (только prose description) |
| FAQ | Per-venue JSON + JSON-LD | Хардкод 3 общих вопроса |
| Features chips | Коды (no_queue, audio_guide…) | Нет |
| Opening hours | Json mon–sun в Venue | Частично hardcoded map по slug; на institution FAQ прямо говорит «проверьте сайт» |
| Template JSON | venueTemplateData + merge | Нет typed PDP template |
| hookFact / wayToFind | Нет в seed-venues | Да (must-see / logistics) |
| Gallery | galleryUrls на Venue | Обычно один heroImageUrl |

## Ось: верстка / UX

| | SPBBOATS | Daibilet |
|--|----------|----------|
| Фокус PDP | Карточка места + билеты/офферы | Афиша сессий + day-route + STOP-экскурсии |
| Tickets | TicketsBlock по Venue offers | Sessions/Admission + TC widget |
| Program | Exhibition program groups | VenueProgramBlock по sessions + date rail |
| Related | articles + venues | relatedVenues + stop/nearby events |
| Sticky CTA | Да | Да (MobileStickyActionBar) |
| Schema.org | Museum + FAQPage | SEO meta / applyVenueSeo (слабее FAQ JSON-LD) |

## Ось: данные / seed

| | SPBBOATS | Daibilet |
|--|----------|----------|
| Эрмитаж | Полный seed `ermitazh` + images + OPEN_DATE offer | ensure-скрипт + must-see editorial + cover на диске |
| Гараж | seed `garazh` (slim) + images на `muzej-garazh` + demo `garage-moscow-demo` | cityInfo must-see `moscow-muzey-garazh`, cover, hours hardcode |
| Slug-канон | Рассинхрон garazh / muzej-garazh | moscow-muzey-garazh (стабильнее для MSK) |

## Практические выводы (что перенять)

1. **Per-venue highlights + FAQ из сида Эрмитажа** — самый дешёвый выигрыш для `/venues/ermitazh` (и потом Гараж): у нас FAQ сейчас generic.
2. **features chips** (без очереди / аудиогид / доступность) — визуальный слой без новой CMS; можно маппить в InstitutionVenueLayout.
3. **openingHours как данные Venue**, не hardcode map — иначе FAQ «актуальны ли часы» честно признаёт дыру.
4. **Не тащить целиком SPBBOATS template JSON** без нужды: наша сила — афиша, STOP-связи, «Мой день», wayToFind/hookFact. Брать контентные поля, не ломать session-first UX.

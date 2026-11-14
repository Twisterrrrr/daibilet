# Event subtype proposal

## Scope and separation

The existing broad catalog category (`Мероприятия`, `Развлечения`, `Экскурсии`, `Музеи и арт`, `Активный отдых`) stays intact. `event_kind` (`SINGLE`, `RECURRING`, `OPEN_DATE`) describes the schedule/product format and is also unchanged. A controlled `event_subtype` is an additional discovery facet for the product itself.

Initial controlled values proposed from the live catalog:

| Value | Display label |
|---|---|
| `CONCERT` | Концерт |
| `STANDUP` | Стендап и комедия |
| `THEATRE` | Театр и спектакль |
| `CINEMA` | Кино |
| `CIRCUS` | Цирк |
| `SHOW` | Шоу |
| `FESTIVAL` | Фестиваль |
| `EXHIBITION` | Выставка |
| `MASTERCLASS` | Мастер-класс |
| `SPORT` | Спорт |
| `PARTY` | Вечеринка |
| `CHILDREN_FAMILY` | Детям и всей семье |
| `MUSEUM_VISIT` | Музей и выставочное пространство |
| `EXCURSION` | Экскурсия и прогулка |
| `WATER_TRIP` | Речная прогулка и теплоход |
| `BUS_EXCURSION` | Автобусная экскурсия |
| `QUEST` | Квест |

These are controlled product subtypes, not free-form tags. A single primary subtype is proposed for the first pass. When evidence supports two equally plausible product types, the row is sent for review instead of silently assigning both.

## Classification rules

- Generate proposals from title, existing category/subcategory, and source data; preserve the original category unchanged.
- Keep `event_subtype` separate from source/integration type, supplier, city, venue, schedule kind, and ticket offer.
- Specific evidence in the event title takes precedence over broad category labels.
- Do not classify from venue alone: a museum venue does not make every event a museum visit.
- Do not infer a subtype from artist name alone unless source category or title supports it.
- Mark competing signals, broad-category-only fallbacks, and missing signals `REVIEW`.
- This offline proposal does not mutate production. Review accepted examples before adding the field to DTOs, admin filters, or public catalog navigation.

## Reproducible proposal output

Run `scripts/classify-event-subtypes.py` against `eventpage-full-eventid-matrix-2026-11-04.csv.gz`. The output includes only `READY` Events with future sellable sessions, and carries both the existing category and the proposed subtype. It is a review artifact, not a production migration.

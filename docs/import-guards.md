# Import guards — защита полей Event при sync

Используется в `tc-import-catalog.js` и `tep-import-fixtures.js`.

## Source-owned (обновляются import)

- `title`, `description`, `kind`, `sourceStatus`, `ageLimit`, `imageUrl`
- `priceFromRub`, `ticketsVacant`, `primaryCityId`, `venueId`, `categoryId`
- sessions, offers, tags, ProviderLink

### Нормализация `title` при import

- `scripts/lib/event-title-normalize.js` — `normalizeImportEventTitle()`
- Применяется в `tc-full-sync.js`, `tc-import-catalog.js`, `tep-import-fixtures.js`
- Правило: пробелы сжимаются, **первая буква заглавная** (`ru-RU`)
- Публичный каталог и страница события дополнительно используют `formatPublicEventTitle()` в backend

## Protected (не затираются при update)

| Поле | Условие сохранения |
|------|-------------------|
| `slug` | всегда сохраняется существующий |
| `status` | если `HIDDEN` или есть `EventOverride` с title/description/imageUrl/editorStatus |

## Не затрагивается import

- `EventOverride` (вся таблица)
- `LandingMatch`, ручные привязки лендингов
- `Venue.pageStatus = PUBLISHED` (уже guard в venue upsert)

## Проверка

```bash
npm run check:sync-invariants
```

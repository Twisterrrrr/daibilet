# Import guards — защита полей Event при sync

Используется в `tc-import-catalog.js` и `tep-import-fixtures.js`.

## Source-owned (обновляются import)

- `title`, `description`, `kind`, `sourceStatus`, `ageLimit`, `imageUrl`
- `priceFromRub`, `ticketsVacant`, `primaryCityId`, `venueId`
- sessions, offers, ProviderLink
- `categoryId`, `primarySubcategoryId`, `EventSubcategory`, `EventTag` - пока у события нет локального переопределения классификации

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
| Таксономия | если `EventOverride.taxonomyManaged = true`, сохраняются категория, основная и дополнительные подкатегории и теги; остальные поля источника продолжают синхронизироваться |

## Не затрагивается import

- `EventOverride` (контент и SEO; флаг `taxonomyManaged` включает защиту локальной классификации)
- `LandingMatch`, ручные привязки лендингов
- `Venue.pageStatus = PUBLISHED` (уже guard в venue upsert)

## Проверка

```bash
npm run check:sync-invariants
```

## Таксономия: дискотеки и вечеринки

События с «дискотека», «вечеринка», DJ и т.п. в названии/описании/тегах классифицируются как **Развлечения** (`cat_entertainment`), а не Экскурсии — даже если это теплоход.

- `scripts/lib/event-taxonomy.js` — общая эвристика
- `tep-import-fixtures.js`, `tc-import-catalog.js` — при import
- `scripts/reclassify-disco-events.js` — разовая переклассификация уже импортированных событий

## Локальная классификация импортированных событий

PATCH `/api/admin/events/:id/taxonomy` устанавливает `EventOverride.taxonomyManaged = true`
после записи категории, подкатегорий и тегов. Флаг нужен потому, что публичная выдача
читает классификацию из стандартных таблиц `Event`, `EventSubcategory` и `EventTag`;
отдельная таблица-проекция не требуется. Импортёры Ticketscloud и Teplohod продолжают
обновлять остальные данные события, но пропускают поля таксономии. Схемная миграция:
`20261027120000_event_taxonomy_override`.


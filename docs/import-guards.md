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

## Origin-маркер описания (контракт, 2026-10-20)

Правило поведения (кто что перезаписывает) описано в `AGENTS.md`, блок «Импорт событий и
описания». Здесь - только технический контракт маркера, который это правило защищает.

Авторство описания хранится в колонке `EventOverride.descriptionOrigin`
(`AUTO | EDITORIAL | AI`), а **не в тексте**. Текстовый маркер стал бы частью SEO-строки,
его пришлось бы сохранять в composer'е и в markdown-рендере, и он рано или поздно попал бы
в публичный HTML. Поэтому AUTO не кодируется в тексте вообще.

Зарезервированный текстовый маркер существует только для внутренних артефактов пайплайна
(снапшоты ревизий, payload очереди, выгрузки):

```
<!-- daibilet:origin=AUTO -->      (строка целиком)
[[origin:AI]]                      (инлайн)
```

Канонический модуль: `apps/backend/src/description-origin.ts`
(`stripDescriptionOriginMarkers`, `readDescriptionOriginMarker`, `hasDescriptionOriginMarker`).
Срез вызывается в `cleanImportedDescription` - то есть на **всех** публичных путях: каталог,
страница события, venue read model, заголовки билетов. Legacy entrypoints `dto.js` и
`public-venue-read.js` держат ту же регулярку инлайном, потому что грузятся plain node и не
могут импортировать TS-модуль.

Покрыто тестами:
- `apps/backend/src/description-origin.test.ts` - контракт, срез, idempotency, drift-guard
  по обеим legacy-копиям и поведенческая проверка на реальном `dto.js`;
- `apps/backend/src/public-catalog.mapper.test.ts` - публичный DTO не отдаёт маркер
  (проверка через реальный `mapGroupedPublicSession`).

### Единый источник паттерна (цель)

Паттерн сейчас живёт в трёх местах: канонический TS-модуль и две инлайновые копии в legacy
`.js`. Пока копии не сведены, расхождение ловит drift-guard из `description-origin.test.ts`.
Цель - вынести паттерн в общий `.mjs`, который грузится и plain node, и TS, и убрать
инлайновые копии. До этого любая правка формата маркера обязана пройти по всем трём файлам.

## Проверка

```bash
npm run check:sync-invariants
```

## Таксономия: дискотеки и вечеринки

События с «дискотека», «вечеринка», DJ и т.п. в названии/описании/тегах классифицируются как **Развлечения** (`cat_entertainment`), а не Экскурсии — даже если это теплоход.

- `scripts/lib/event-taxonomy.js` — общая эвристика
- `tep-import-fixtures.js`, `tc-import-catalog.js` — при import
- `scripts/reclassify-disco-events.js` — разовая переклассификация уже импортированных событий


# Типы событий, публичная страница и стабильные URL

**Дата:** 2026-10-27  
**Статус:** контракт и план безопасного перехода; production-данные не менялись.

## Зачем это нужно

Production-каталог уже группирует повторяющиеся импортированные записи, а карта событий содержит те же 4 360 адресов, что и публичный API-каталог при проверке 2026-10-27. Но запись сеанса, публичная страница и идентификатор товара поставщика пока не являются разными сущностями. Когда импортированный сеанс исчезает или проходит, отдельный URL может стать 404. При этом дочерние записи одной группы могут оставаться доступными по собственным self-canonical адресам.

Проверенные URL цирковых событий в Мелеузе и Гудермесе, а также концерт Эдуарда Хуснутдинова в Ульяновске на момент проверки возвращают 404 и из web, и из `GET /api/public/events/:slug`. Три независимых примера подтверждают повторяемость сбоя жизненного цикла публичной страницы, но не являются основанием объединять похожие названия без источникового ID или ручного подтверждения.

### Production API snapshot, 2026-10-27

Read-only просмотрено 4 360 элементов `/api/public/events` постранично. 825 строк каталога содержат более одного объединённого события. У 4 010 из 4 360 публичных slug в конце есть длинный hex ID поставщика. API ограничивает `groupEventIds` до 12 ID, поэтому их сумма не считается полным числом записей серии. Три проблемных URL отдельно проверены напрямую: web и detail API возвращают 404.

`EventKind` в API: `SINGLE` - 3 714, `RECURRING` - 637, `OPEN_DATE` - 9. Это поле описывает исходную запись; его нельзя использовать как идентификатор публичной страницы: в каталоге повторяются группы, состоящие из многих source records и sessions. Срез подтверждает необходимость независимых типов, стабильной page identity и URL aliases.

### Mobile PDP images

Read-only sample of current production catalog images (2026-10-27): three `cdn.teplohod.info` originals returned `1,499,766`, `1,526,004`, and `1,572,682` bytes. A separate Ticketscloud image sample included a `12,610,099`-byte PNG. `SafeImage` currently bypasses the Next optimizer for `teplohod.info` and several other hosts; `cdn.teplohod.info` is not currently an optimizer allowlist entry. Production `/_next/image` for that TEP URL returns 400. This is expected under the current bypass policy, which was added after server egress/timeouts; do not remove the bypass without an origin-connectivity check.

Measured locally with Sharp on the 1,499,766-byte TEP source: `640w WebP q78 = 65,392 bytes`, `1280w WebP q78 = 202,562 bytes`. The planned remedy is a background/import-time image asset pipeline that keeps the provider URL as provenance, writes immutable local responsive derivatives keyed to stable page identity + source checksum, and renders the mobile/desktop `srcset` from the PDP. The original can remain the fallback and for social previews. No mass image files were generated or deployed in this iteration.

### Backfill dry-run on local Docker snapshot

Read-only SQL `scripts/event-page-backfill-dry-run.sql` was run against `daibilet-tours-postgres` (`daibilet`, 8,762 Event rows). It found 8,575 Ticketscloud source records → 567 proposed city/venue-scoped identities (145 groups with multiple records, maximum 830; 8 groups have title variants), and 186 Teplohod records → 186 source-record identities. Exact TEP title+city+venue repeats produce 3 review candidates (6 records), not automatic merges. This is a local snapshot, not a production backfill or a reviewed merge map. Production mapping must run read-only against the current production catalog/DB and report every source group, slug collision, old URL and candidate PDP before any write.

## Текущее устройство

- `EventKind` — **форма расписания**: `SINGLE`, `RECURRING`, `OPEN_DATE`.
- `Category`, `Subcategory`, `EventTag` — **смысловая классификация и поиск**: например, концерт, мастер-класс, цирк.
- `managementMode`, `EventSourceLink`, `purchaseFlow` — **владелец данных, источник и канал продажи**.
- `PublishStatus`, `EventOverride.isIndexable`, `canonicalPath` — **модерация и SEO-настройки**; отдельного устойчивого жизненного цикла публичной страницы нет.
- `EventSession` — расписание, привязанное к импортированной записи.
- Каталог строит `groupKey` и `groupEventIds` из источника, названия, города и площадки; `EventOverride.mergeGroupKey` задаёт ручную группу. Это read-model группировки, а не сохранённый идентификатор публичной страницы.
- Детальная страница отдельно собирает связи через `metaExternalId` и `mergeGroupKey`. Состав группы и представитель URL поэтому могут отличаться от каталожной группировки.

Legacy SPBBOATS содержит полезные отдельные идеи: `EventGroup` как групповая сущность, `tcMetaEventId` как ключ серии источника, `DateMode` как режим расписания и `canonicalOfId` для дубля. Переносить монолитную legacy-модель целиком не нужно; эти разделения подтверждают, что серия, слот, источник и дубль имеют разную семантику.

## Каноническая модель

Не расширять `EventKind` значениями `CONCERT`, `CIRCUS`, `WORKSHOP` и т.п. Это разные оси.

| Ось | Значение | Текущая опора |
| --- | --- | --- |
| Смысловой тип | Экскурсия, музей, мероприятие, активность, развлечение | `Category` |
| Подтип и формат | Концерт, мастер-класс, цирк, выставка, прогулка и др. | `Subcategory`, `EventTag` |
| Расписание | Разовое, повторяющееся, открытая дата | `EventKind` |
| Управление и продажа | Импорт, кабинет поставщика, API; внешний виджет или checkout | `managementMode`, `EventSourceLink`, `purchaseFlow` |
| Публичная идентичность | Стабильная страница события, серии или локального тура | Нужна отдельная persisted-связь |
| Слот | Конкретная дата и время; может иметь собственный ID поставщика | `EventSession` и provider links |

Публичная страница относится к событию или к осмысленной локальной серии, а не к каждой записи поставщика. Серия, гастроль в конкретном городе и отдельная дата могут быть разными уровнями. Город входит в идентичность страницы, если он меняет пользовательский смысл и поисковый спрос.

## Правила группировки и URL

1. Надёжный ID группы поставщика (`metaExternalId` или эквивалент адаптера) может автоматически связывать записи с серией в рамках города и площадки.
2. Без ID серии сочетание нормализованного названия, смыслового подтипа, города и площадки только формирует кандидата. Автосвязь допустима после проверки точности на production-срезе; конфликты и неоднозначность идут в очередь.
3. Публичный slug принадлежит стабильной странице и не содержит ID отдельного слота. Внутренний ID и внешний ID остаются у исходной записи/слота.
4. Старые slug должны сохраняться как aliases. При подтверждённой связи старый адрес получает постоянный redirect на страницу серии. Не перенаправлять на похожее по названию, но неэквивалентное событие.
5. Прошедшее событие может показывать постоянную PDP без покупки. Отсутствие сеансов или редакционная очередь сами по себе не снимают PDP с индекса: это решает явный SEO-флаг страницы. Не превращать прошедшую дату в 404 автоматически.
6. Sitemap содержит публичные страницы, а не provider rows/слоты. Каталог может показывать только активные предложения, не удаляя страницу-идентичность.
7. Удаление, отмена, архивирование и отсутствие будущих слотов — разные состояния. Они не должны сводиться к одному `HIDDEN` без сохранения причины и SEO-поведения.

## Первый schema slice

В ветке добавлена аддитивная Prisma-модель без backfill и без обращения к production DB:

- `EventPage` хранит стабильные slug, title, тип страницы `EVENT / SERIES`, локальность, SEO-поля, `CANDIDATE / PUBLISHED / ARCHIVED` и индексируемость отдельно от исходных событий.
- `editorialStatus` независимо отмечает `NEEDS_EDITORIAL / IN_REVIEW / READY`; `editorialIssues` хранит конкретные пробелы карточки для очереди редакции. Это не выключает существующее предложение/покупку и не снимает страницу с индекса само по себе. Индексацией управляет `EventPage.isIndexable`.
- `EventPageMember` связывает исходную запись с одной публичной страницей и хранит метод сопоставления (`SOURCE_GROUP_ID`, `REVIEWED_MATCH`, `MANUAL`). Одна запись не может одновременно состоять в двух страницах.
- `EventPageSlugAlias` хранит только явно добавленные старые URL и причину связи.

`EventSeries` хранит общую редакционную основу гастрольного проекта. Несколько локальных `EventPage` могут ссылаться на неё, сохраняя отдельные город, площадку, URL, расписание и покупку. Быстрые ссылки городов используют обычный Next.js soft navigation с prefetch: без полной загрузки документа.

Миграции `20261027120000_event_page_identity` и `20261027130000_event_series_shared_content` создают новые таблицы и индексы. Они не меняют существующие canonical/slug. В backend подключён resolver для явно заведённой опубликованной или архивной страницы и её alias: он подхватывает связанные записи, держит страницу-архив без продажи и выставляет стабильный canonical. Если новой таблицы пока нет, resolver использует прежний путь.

Импорт Ticketscloud и Teplohod создаёт индексируемую `EventPage` в статусе `CANDIDATE` с `editorialStatus=NEEDS_EDITORIAL` и сохраняет прежний импортный slug как alias. До появления штатного редактора редакционный статус не блокирует пользовательский доступ или индексацию: публичный каталог уже включает импортные `REVIEW`, а PDP разрешает `REVIEW`, `READY` и `PUBLISHED`. Новые URL закреплены за PDP; отдельные сеансы остаются внутренними данными выбора даты. В `editorialIssues` фиксируются `DESCRIPTION_REVIEW`, `SEO_REVIEW`, `PRACTICAL_INFO_REVIEW` и фактические пропуски изображения/города/категории. Надёжный Ticketscloud meta ID связывает записи только в рамках одной пары город/площадка; Teplohod и записи без group ID остаются отдельными кандидатами. Повторный sync не перезаписывает slug, редакционный статус или ручную связь. Очередь редакции и импорт новых событий, создаваемых вручную/API, пока не подключены.

Для candidate страницы стабильный PDP slug сразу становится canonical и индексируемым URL. Прежние импортные slug остаются рабочими aliases и отдают ту же PDP с новым canonical; это сначала 200, не permanent redirect. После проверки соответствий их можно переводить на 308 партиями. Каталог может временно продолжать ссылаться на старые aliases, пока не подключён к page identity.

Удалить исходный `Event`, пока на него ссылается `EventPageMember`, нельзя: FK использует `RESTRICT`. Потеря сеансов или отмена источника не удаляет PDP/aliases; для намеренного удаления редактор должен сначала принять явное решение по странице.

Пока alias отдаёт страницу с canonical (HTTP 200), не постоянный redirect. Постоянные redirects требуют проверенной карты старый URL → PDP и будут включены отдельно после проверки её покрытия и совместимости с ISR. Sitemap использует индексируемые persisted PDP и временно сохраняет старые URL только для ещё не сопоставленных каталоговых записей; после backfill соответствующие source/slot URL из sitemap исчезнут. Миграции не применялись и backfill отсутствует.

## Остальная модель и переход

Существующие `EventKind`, категории и источниковые записи остаются совместимыми. На первом runtime этапе страница может использовать `EventOverride` для подробного контента; стабильные заголовок и SEO-поля принадлежат `EventPage`. Старые slug не переписываются.

## Порядок реализации

1. Снять read-only production-срез: повторы по source meta ID, title/city/venue, hidden/expired записи, старые slug и уже заданные canonical. Сформировать dry-run групп без записи в БД.
2. Проверить выборку на ложные объединения отдельно для Ticketscloud, Teplohod и cross-city туров. Не применять эвристику до отчёта.
3. Добавить persisted public-page identity, shared series content и alias-модель совместимой миграцией; старые slug не менять. **Схема и resolver готовы; миграции не применялись.**
4. Candidate PDP с `NEEDS_EDITORIAL` создаются при импорте Ticketscloud/Teplohod. Supplier API и ручное создание, а также видимая очередь редакции, требуют отдельных hooks/UI.
5. Перевести sitemap на устойчивые индексируемые PDP; пока нет полного backfill, оставлять unmapped legacy URL как переходный fallback. Постепенно перевести внутренние ссылки каталога на PDP.
6. Подготовить карту redirects и backfill уже имеющихся групп dry-run отчётом. Для непроверенных адресов оставить текущую страницу/ответ, не угадывать цель.
7. Включить permanent redirects проверенными партиями и наблюдать HTTP-коды, canonical, 404 и индексируемые URL.

## Критерии готовности

- Повторный импорт не меняет публичный slug страницы.
- Завершившийся слот не удаляет страницу серии и не вызывает 404 по старой ссылке.
- Старый URL redirect ведёт только на эквивалентную серию/локальную страницу.
- Не связанные между собой города и разные форматы не склеиваются.
- Слоты и supplier IDs не становятся отдельными sitemap URL автоматически.
- Каталог, детали, canonical и sitemap используют один и тот же persisted group/page identity.
- Миграция не выполнялась на production и не меняет существующие URL до отдельной проверки redirect map.

## Основания

- `packages/db/prisma/schema.prisma`: `EventKind`, `Event`, `EventOverride`, `EventSourceLink`, `EventSession`.
- `apps/backend/src/public-catalog.dto.ts`: группировка каталога и выбор представителя.
- `apps/backend/src/public-event.dto.ts`: детализация, поиск meta-группы и canonical.
- `apps/web/src/lib/sitemap-data.ts`: sitemap строится из публичного каталога.
- `docs/event-not-found-ssr-regression-2026-10-21.md`: истёкший/удалённый slug сейчас намеренно ведёт на 404; регрессия 404→500 уже фиксировалась отдельно.
- Legacy `D:\coding\SPBBOATS\packages\backend\prisma\schema.prisma`: `EventGroup`, `tcMetaEventId`, `DateMode`, `canonicalOfId`.

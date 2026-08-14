# Ticketscloud: первая загрузка каталога

## Что настроено

Локально добавлен gRPC-клиент для `tc-simple` на Node.js.

Используемые файлы:

- proto: `vendor/ticketscloud-proto/`;
- быстрый sample событий: `scripts/tc-sample-events.js`;
- sample событий со справочниками: `scripts/tc-sample-catalog.js`;
- результат: `data/samples/ticketscloud-catalog.sample.json`.

Переменная окружения:

```env
TICKETSCLOUD_API_TOKEN=
```

Опционально:

```env
TICKETSCLOUD_GRPC_ENDPOINT=simple.ticketscloud.com:443
TICKETSCLOUD_SAMPLE_LIMIT=20
```

## Команды

Загрузить первые 10 событий:

```bash
npm run tc:events -- 10
```

Загрузить первые 20 событий и справочники категорий, площадок, городов и тегов:

```bash
npm run tc:catalog -- 20
```

Посчитать все события, доступные через `Events`:

```bash
npm run tc:count
```

## Что отдает Events

Метод:

```text
v2.Simple.Events(EventsRequest) returns (stream Event)
```

В текущем sample запрашиваем:

```json
{
  "status": "PUBLIC"
}
```

Основные поля события:

- `id` - внешний ID события;
- `meta` - ID группы мероприятий, если событие входит в повторяющуюся группу;
- `name` - название;
- `description` - HTML-описание;
- `status` - `PUBLIC` или `STAND_BY`;
- `org` - ID организатора;
- `venue` - ID площадки;
- `lifetime.start` и `lifetime.finish` - начало и конец;
- `category` - ID категории;
- `tags` - ID жанров/тегов;
- `age_rating` - возрастной рейтинг;
- `media` - обложки;
- `open_date` - открытая дата;
- `sets` - билетные категории;
- `tickets_amount` и `tickets_amount_vacant` - общий объем и остаток.

Цены в `sets.rules.simple.price` приходят в минимальных единицах валюты. В нормализованном sample они преобразуются в рубли без копеек. Например, `91000` в сыром payload становится `910` в `priceFrom` и `ticketSets[].prices`.

## Первый sample

Запрос на 20 событий вернул:

- событий: 20;
- категорий: 3;
- площадок: 7;
- городов: 4;
- тегов: 16.

Категории:

- `Концерты`: 4;
- `Театры`: 4;
- `Экскурсии`: 12.

Города:

- `Санкт-Петербург`: 12;
- `Москва`: 6;
- `Челябинск`: 1;
- `Ейск`: 1.

Типы событий:

- `single`: 8;
- `recurring`: 12;
- `open_date`: 0 в первом sample.

## Полный счетчик

На момент последней проверки `Events` без фильтра вернул:

- всего событий: 9 269;
- `PUBLIC`: 5 492;
- `STAND_BY`: 3 777;
- `single`: 304;
- `recurring`: 8 965;
- уникальных категорий: 10;
- уникальных площадок: 175;
- уникальных `meta`-групп: 141.

Для публичного каталога на старте берем `PUBLIC`, то есть 5 492 события. `STAND_BY` можно импортировать как скрытые/черновики или использовать для диагностики.

## Full sync PUBLIC

Команда:

```bash
npm run tc:full-sync
```

## Import в БД (фаза B)

После full sync JSON импортируется в PostgreSQL:

```bash
npm run tc:import    # только upsert из catalog.public.json
npm run tc:sync      # full-sync + import + revalidate (nightly / maintenance)
npm run tc:sync:help
```

### On-demand по ids (не замена full sync)

Fetch `EventsRequest.ids` → normalize → тот же upsert `importCatalogEvent`:

```bash
npm run tc:sync -- --ids=id1,id2,id3
npm run tc:sync -- --ids id1,id2 --dry-run   # fetch+normalize, без записи в БД
```

Admin API (один вызов):

```text
POST /api/v1/tc/sync
POST /api/v1/tc/sync?ids=id1,id2&dry-run=1
POST /api/admin/sources/ticketscloud/sync
```

Цепочка full: gRPC fetch → `data/ticketscloud/catalog.public.json` → `tc-import-catalog.js` → `ProviderLink` sync → invalidate public cache.  
Цепочка ids: gRPC by ids → upsert (без `missingFromCatalog`) → revalidate (CLI) / cache invalidate (API).

Требуется `DATABASE_URL` и `TICKETSCLOUD_WIDGET_TOKEN` (для `EventOffer.widgetUrl`).

Stats: `SourceSyncRun` — `eventsBefore`, `eventsAfter`, `missingFromCatalog`, `providerLinks`. Подробнее: [phases/phase-b-import-sync.md](./phases/phase-b-import-sync.md).

---

Последний full sync `PUBLIC` сохранил:

- каталог: `data/ticketscloud/catalog.public.json`;
- summary: `data/ticketscloud/summary.public.json`.
- группировку городов: `data/ticketscloud/city-routing.public.json`.

Результат:

- событий: 5 487;
- категорий: 10;
- площадок/локаций: 165;
- городов: 50;
- тегов: 134;
- meta-групп: 134.

Расхождение с полным счетчиком возможно из-за живого каталога TC: события появляются, скрываются или меняют статус между запусками.

Городские посадочные не строятся по правилу `2+ события`. Используется ручной routing:

- отдельные страницы для крупных городов и значимых центров;
- малые города и спутники уходят под регион/область;
- карточки направлений показывают количество событий и площадок;
- пример: `Москва` и ниже `Московская область`, куда входят `Раменское`, `Коломна`, `Московский`.

## Наблюдения для маппинга

- `Концерты` маппятся в нашу категорию `мероприятия`, подкатегория `концерты`.
- `Театры` маппятся в нашу категорию `мероприятия`, подкатегория `театр`.
- `Экскурсии` маппятся в нашу категорию `экскурсии`; подкатегорию нужно уточнять по тегам, названию, описанию и площадке.
- `tags` у TC полезны для нашей основной подкатегории, дополнительных подкатегорий и тегов.
- `venue.city` позволяет собрать города из импорта и применить правило 2+ событий.
- Наличие `meta` удобно использовать как признак повторяющегося события.

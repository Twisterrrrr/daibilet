# Интеграции с билетными системами

## 1. Общий принцип

Агрегатор не становится платежной системой и не берет на себя выпуск билетов.

Интеграции нужны для трех задач:

- импортировать каталог событий, площадок, городов, категорий, дат и доступности;
- открыть покупку через виджет или внешний интерфейс билетной системы;
- получить и сохранить факт покупки и текущий статус заказа/билета.

## 2. Ticketscloud

### Документация

- GitHub: https://github.com/ticketscloud/docs
- ReadTheDocs: https://ticketscloud.readthedocs.io/ru/latest/

### Каналы API

У Ticketscloud есть два контура, которые нам важны:

- gRPC `tc-simple` для получения каталожных данных;
- REST API v2 для заказов, возвратов и операций над заказами.

Каталог событий в документации REST не является основным источником. Для списка мероприятий документация отправляет к gRPC-сервису `tc-simple`.

### Доступы и авторизация

REST API:

- production base URL: `https://ticketscloud.com`;
- stage base URL: `https://stage.freetc.net`;
- заголовок авторизации: `Authorization: key <API_KEY>`;
- только HTTPS.

gRPC `tc-simple`:

- production endpoint: `simple.ticketscloud.com:443`;
- stage endpoint: `simple.stage.freetc.net:443`;
- TLS-соединение;
- metadata `authorization: <API_KEY>`;
- metadata `preferred-language: ru` для русскоязычных данных, где это поддерживается.

Рекомендуемые переменные окружения:

```env
TICKETSCLOUD_API_KEY=
TICKETSCLOUD_REST_BASE_URL=https://ticketscloud.com
TICKETSCLOUD_GRPC_ENDPOINT=simple.ticketscloud.com:443
TICKETSCLOUD_PREFERRED_LANGUAGE=ru
```

### Импорт каталога

Минимальный набор gRPC-методов:

- `Events` - мероприятия;
- `MetaEvents` - группы повторяющихся мероприятий;
- `Categories` - категории;
- `Tags` - теги/жанры;
- `Venues` - площадки;
- `Cities` - города.

Опционально:

- `Seats` - если понадобится детальная доступность мест;
- `Maps` - если понадобится схема зала;
- `Artists` - если будем показывать артистов как отдельные сущности.

### Маппинг Events

Базовое соответствие:

| Ticketscloud | Наша модель |
| --- | --- |
| `Event.id` | `Event.external_id` |
| `Event.name` | `Event.title` |
| `Event.description` | `Event.description` |
| `Event.status` | `Event.source_status` + расчетный `Event.status` |
| `Event.venue` | `Venue.external_id` |
| `Event.lifetime.start` | `EventSession.starts_at` |
| `Event.lifetime.finish` | `EventSession.ends_at` |
| `Event.category` | `Category.external_mappings.ticketscloud` + основная подкатегория |
| `Event.tags` | дополнительные подкатегории или теги |
| `Event.age_rating` | `Event.age_limit` |
| `Event.media.cover` | `Event.image_url` |
| `Event.sets[].price` | `EventSession.price_from` |
| `Event.tickets_amount_vacant` | `EventSession.availability_status` |

Для одиночного мероприятия можно создавать одно событие и один сеанс. Для повторяющихся мероприятий нужно проверить, как в нашем наборе данных используются `MetaEvents`, и решить, создавать ли:

- одно событие с несколькими сеансами;
- отдельные события для каждого `Event`.

Для MVP лучше нормализовать повторяющиеся мероприятия в одно событие с несколькими `EventSession`, если данные позволяют надежно связать их через `meta`.

### Статусы Ticketscloud

Статусы событий:

- `PUBLIC` - продажи активны;
- `STAND_BY` - продажи остановлены.

Предлагаемый маппинг:

| Ticketscloud | Наш статус события |
| --- | --- |
| `PUBLIC` | `published`, если город и категория распознаны |
| `STAND_BY` | `hidden` или `draft` |

Статусы заказов без платежей:

- `executed` - заказ создан, через 10 минут переходит в `expired`;
- `done` - заказ оплачен;
- `cancelled` - заказ отменен;
- `expired` - заказ просрочен, билеты вернулись в продажу.

Предлагаемый маппинг:

| Ticketscloud | Наш статус заказа |
| --- | --- |
| `executed` | `pending` |
| `done` | `paid` |
| `cancelled` | `cancelled` |
| `expired` | `expired` |

В нашей модели стоит добавить `expired`, потому что для Ticketscloud это отдельное значимое состояние.

### Синхронизация заказов

REST endpoint:

- `GET /v2/resources/orders`.

Полезные фильтры:

- `created_at`;
- `status`;
- `events`;
- `page`;
- `page_size`.

Для MVP покупка идет через виджет Ticketscloud или внешний интерфейс Ticketscloud. Через себя не проводим checkout, чеки и платежный контур.

Статусы заказов получаем через API. Базовый вариант - polling:

1. Хранить `last_orders_sync_at` по источнику.
2. Запрашивать заказы с `created_at` от последней успешной синхронизации с небольшим overlap, например 10 минут.
3. Обрабатывать пагинацию до конца.
4. Делать upsert по `source + external_order_id`.
5. Сохранять `source_payload`.

Если Ticketscloud предоставит webhook/callback в рамках договора, polling остается fallback-механизмом.

Данные покупателя сохраняем в минимальном объеме для ускорения обработки обращений и сверки заказов.

### Что не делаем в MVP

Не используем в MVP:

- `POST /v2/resources/orders`;
- `PATCH /v2/resources/orders/:id`;
- endpoints возвратов;
- промокоды;
- отправку билетов покупателю на email.

Эти операции нужны только если агрегатор сам начинает проводить заказ через API. Сейчас целевая модель проще: пользователь покупает на стороне Ticketscloud, мы сохраняем факт, данные покупателя и статус.

## 3. Teplohod.info

### Документация

Документация передана Google Doc и сохранена локально:

- исходный Google Doc: https://docs.google.com/document/d/1Se9g1w9iiDNwXZ_VoDQlc-UNg_5IY-Qkmf_dMSNLLfc/edit
- локальная копия: `docs/vendor/TEPLOHOD.INFO описание API.docx`

Changelog документа:

- 16.04.2024: в `GET /events` добавлен параметр `compact`, отключающий поле `eventTimes` для ускорения работы;
- 28.04.2024: в `GET /events` добавлен параметр `cityId`;
- 23.04.2025: в `eventTickets` добавлено поле `is_attached`.

### Доступы и авторизация

Base URL:

- `https://api.teplohod.info/v1`

Доступ к API Teplohod.info для полного каталога — по **белому IP** сервера (allowlist на стороне Teplohod). **Токен/API key для импорта не нужен.**

Опционально может использоваться `User-Agent`, если это указано в договорённости с Teplohod.

Исключение: `GET /events?compact` (без расписания) доступен без ограничений по IP.

Для локальной разработки:

- прямые запросы с локальной машины могут не проходить, если локальный IP не в allowlist;
- для разработки парсера используйте fixture-ответы или `npm run tep:fixture-bridge` + `TEP_API_URL=http://127.0.0.1:8787/v1`;
- боевой импорт и auto-sync — только с сервера `213.171.7.16` (или другого IP из allowlist);
- в админке при 403 показывать: `source_unreachable_or_ip_not_allowed`.

Рекомендуемые переменные окружения:

```env
TEP_API_URL=https://api.teplohod.info/v1
TEP_USER_AGENT=Daibilet/1.0
TEP_WIDGET_ID=14208
TEP_WIDGET_BASE_URL=https://teplohod.info
```

Локально (без allowlist):

```env
TEP_API_URL=http://127.0.0.1:8787/v1
```

Переменные `TEPLOHOD_API_KEY` / `TEPLOHOD_PARTNER_ID` в нашем импорте **не используются** — только если Teplohod добавит отдельные методы с ключом.

### Методы каталога

#### `GET /events`

Получает список публичных событий, к которым разрешен доступ через API. Метод возвращает прогулки и их расписание.

Endpoint:

- `GET https://api.teplohod.info/v1/events`

Формат:

- JSON.

Параметры:

| Параметр | Тип | Назначение |
| --- | --- | --- |
| `per-page` | `int` | Количество событий на странице. По умолчанию отдаются все события. |
| `page` | `int` | Страница/смещение по формуле `page * per-page`. |
| `expand` | `string` | Дополнительные поля события. Поддерживается `eventSections`. |
| `compact` | empty flag | Отключает поле `eventTimes` для ускорения ответа. |
| `dateFrom` | `YYYY-MM-DD` | Фильтр по событиям, имеющим сеансы от указанной даты. |
| `dateTo` | `YYYY-MM-DD` | Фильтр по событиям, имеющим сеансы до указанной даты. |
| `cityId` | `int`, `string`, `array` | Один город, список через запятую или массив `cityId[]=1&cityId[]=2`. |

Примеры:

- `GET /v1/events?compact`;
- `GET /v1/events?dateFrom=2026-06-01&dateTo=2026-06-30`;
- `GET /v1/events?cityId=1,2`;
- `GET /v1/events?expand=eventSections`.

#### `GET /events/{id}`

Получает конкретное событие по ID.

Endpoint:

- `GET https://api.teplohod.info/v1/events/{id}`

Параметры:

| Параметр | Тип | Назначение |
| --- | --- | --- |
| `expand` | `string` | Дополнительные поля события. Поддерживается `eventSections`. |
| `compact` | empty flag | Отключает поле `eventTimes`. |

Ответ на момент документации аналогичен объекту события из `GET /events`.

### Поля события

| Teplohod.info | Наша модель |
| --- | --- |
| `events[n].id` | `Event.external_id` |
| `events[n].title` | `Event.title` |
| `events[n].category` | `Category.external_mappings.teplohod` |
| `events[n].duration` | `Event.duration_minutes` |
| `events[n].openDate` | признак открытой даты, см. ниже |
| `events[n].openDate.date_from` | начало периода открытой даты |
| `events[n].openDate.date_to` | конец периода открытой даты |
| `events[n].openDate.description` | описание условий открытой даты |
| `events[n].place` | `Event.place` или уточнение площадки |
| `events[n].description` | `Event.description` |
| `events[n].schedule_description` | `Event.schedule_description` |
| `events[n].images[]` | `Event.image_url` и медиагалерея |
| `events[n].eventTimes[]` | `EventSession[]` |
| `events[n].eventSections[]` | дополнительные HTML-секции описания |
| `events[n].eventFeatures[]` | характеристики события |
| `events[n].eventPlaces[]` | `Venue[]` / причалы |
| `events[n].eventTickets[]` | типы билетов и цены |
| `events[n].hasSeats` | признак индивидуальной рассадки |

Категории из документации:

- `Речные прогулки`;
- `Пешеходные экскурсии`;
- `Смотровые площадки`.

### Поля расписания

`eventTimes` недоступен для прогулок с открытой датой и может быть отключен через `compact`.

| Teplohod.info | Наша модель |
| --- | --- |
| `eventTimes[n].id` | `EventSession.external_id` |
| `eventTimes[n].datetime` | `EventSession.starts_at` |
| `eventTimes[n].available_tickets` | доступность/остаток билетов |

Формат даты-времени:

- пример из документации: `2018-06-08T00:40:00+0300`;
- при сохранении конвертировать в UTC;
- при показе пользователю отображать в часовом поясе города/маршрута.

### Открытая дата

Если `openDate` не `false`, событие не имеет обычного расписания.

Для MVP варианты обработки:

- создать событие без конкретных `EventSession`;
- показывать пользователю описание открытой даты из `openDate.description`;
- период действия хранить отдельно или в `source_payload`;
- покупку вести на внешнюю сторону Teplohod.info.

### Причалы и места проведения

`eventPlaces` содержит:

| Teplohod.info | Наша модель |
| --- | --- |
| `id` | `Venue.external_id` |
| `name` | `Venue.name` |
| `lat` | `Venue.latitude` |
| `lng` | `Venue.longitude` |
| `description` | `Venue.description` |
| `address` | `Venue.address` |

Если у события несколько `eventPlaces`, в MVP можно:

- выбрать основной причал как `venue_id`;
- остальные сохранить в связующей таблице `event_venues` или в `source_payload`;
- уточнить модель после просмотра реальных ответов API.

### Билеты и цены

`eventTickets` содержит:

| Teplohod.info | Наша модель |
| --- | --- |
| `id` | внешний ID типа билета |
| `title` | название типа билета |
| `price` | цена |
| `strike_price` | цена без скидки |
| `is_attached` | признак несамостоятельного билета |

`is_attached=true` означает, что билет можно приобрести только вместе с самостоятельным вариантом билета. Для каталога важно:

- рассчитывать `price_from` только по самостоятельным билетам, если есть такие данные;
- хранить `is_attached` в `source_payload` или будущей сущности `TicketType`;
- не строить собственную логику корзины в MVP.

### Недостающие части контракта

В предоставленном документе описаны только методы каталога:

- `GET /events`;
- `GET /events/{id}`.

**Prod probe 2026-07-19 (IP allowlist сервера):**

| URL | HTTP |
| --- | --- |
| `GET https://api.teplohod.info/v1/events` | 200 |
| `GET https://api.teplohod.info/v1/orders` (и aliases bookings/sales/…) | **404** |
| `GET https://account.teplohod.info/api/orders` | **401** (endpoint существует) |
| `GET https://account.teplohod.info/api/widgets` / `profile` / `events` | **401** |

**2026-07-19 — отложено:** партнёр подтвердил, что **API/выгрузки заказов нет**.
Не запрашивать `TEP_ORDERS_TOKEN`. Cron `tep-orders-sync` на prod отключён.
Скрипт `npm run tep:orders` остаётся в репо как заготовка, не активный prod-path.
См. `docs/qa.md` (закрыто) и Diary 2026-07-19.

### Предварительный маппинг

Для Teplohod.info закладываем тот же адаптерный интерфейс, что и для Ticketscloud:

```text
fetchCities()
fetchCategories() // категории можно выводить из поля category, если отдельного endpoint нет
fetchVenues()
fetchEvents(updatedSince?)
fetchEventSessions(eventExternalId)
fetchOrders(updatedSince?) // DEFERRED: у партнёра нет orders API (2026-07-19)
```

Адаптер должен возвращать нормализованные DTO, не завязанные на оригинальные поля источника. Оригинальный ответ сохраняем в `source_payload`.

## 4. Единый интерфейс адаптера источника

Каждый источник реализует общий контракт:

```text
SourceAdapter
  code
  fetchCatalog(cursor?)
  fetchOrders(cursor?)
  normalizeEvent(raw)
  normalizeSession(raw)
  normalizeVenue(raw)
  normalizeOrder(raw)
```

Импорт не должен зависеть от конкретного API источника. Он работает с нормализованными DTO:

```text
NormalizedEvent
NormalizedEventSession
NormalizedVenue
NormalizedOrder
```

Это позволит подключить второй источник без переписывания ядра импорта.

## 6. Маппинг категорий и подкатегорий

Внутренняя таксономия строится по схеме:

- основная категория;
- основная подкатегория, жестко привязанная к основной категории;
- 1-2 дополнительные подкатегории;
- теги.

Основные категории:

- экскурсии;
- музеи и арт;
- мероприятия;
- активный отдых;
- развлечения.

Маппинг источника должен возвращать минимум:

```text
category
primary_subcategory
additional_subcategories?
tags?
```

Для Teplohod.info предварительный маппинг:

| Внешняя категория | Наша категория | Основная подкатегория |
| --- | --- | --- |
| `Речные прогулки` | экскурсии | водные |
| `Пешеходные экскурсии` | экскурсии | пешеходные |
| `Смотровые площадки` | развлечения | смотровые площадки |

Теги и дополнительные подкатегории можно назначать по названию, описанию, билетам и признакам события. Например:

- `eventTickets.title` содержит ужин -> тег `с ужином`;
- название/описание содержит музыка или концерт -> тег `с музыкой`;
- `openDate` не `false` -> тип события `open_date` и тег `открытая дата`;
- наличие `eventTimes` с несколькими датами -> тип события `recurring`;
- один сеанс -> тип события `single`.

## 5. Следующие технические решения

- Добавить в модель `ExternalSourceConfig` или хранить настройки источников в env.
- Добавить `source_status` для событий и заказов, чтобы не терять оригинальный статус.
- Добавить статус заказа `expired`.
- Сделать fixture-каталог для Teplohod.info.
- Подготовить прототип Ticketscloud gRPC-клиента.
- Подготовить polling заказов Ticketscloud через REST.

# Daibilet MVP Mentor Review

Этот документ фиксирует независимую проверку MVP перед первыми продажами.
Роль ментора: архитектор-тимлид. Он не пишет код вместо основного исполнителя, а ищет риски запуска, слабые места UX, ошибки в данных и места, где код может выглядеть рабочим, но ломать продажный сценарий.

Архитекторская часть роли:

- проверяет модель данных, границы контуров и SEO-структуру;
- следит, чтобы public, admin и backend говорили на одном языке;
- не дает временным решениям стать архитектурным долгом без явной пометки.

Тимлидская часть роли:

- проверяет готовность блока к использованию оператором или покупателем;
- обращает внимание на шум, перегруз интерфейса и ручные действия;
- формулирует короткий итог по каждому завершенному блоку: принято, принято с риском или нужно доработать.

## Правила работы

- Перед каждым крупным релизным шагом ментор проверяет конкретный контур: public, admin, backend, orders, suppliers или SEO.
- Вывод ментора должен быть коротким: что правильно, что рискованно, что делать дальше.
- Критика должна быть привязана к файлам, API-маршрутам или пользовательскому сценарию.
- В MVP приоритет выше у покупки, заказов, корректной группировки событий, SEO-посадочных и скорости каталога.
- После каждого завершенного блока основной исполнитель добавляет короткий менторский комментарий: что сделано, где риск и какой следующий контрольный шаг.

## Комментарии по блокам

### Landing matching, 2026-06-19

Статус: принято с риском.

Что стало лучше: `LANDING_RULES` и `matchesRule` в `apps/backend/src/dto.js` стали строже. Появились `keywordScope`, исключающие слова, обязательные группы ключей и проверка города через `city`/`destination`. Это снижает риск, что речные прогулки, автобусные экскурсии и ужины на теплоходе будут перемешиваться только из-за одного общего слова.

Главный риск: часть источников дает широкие теги вроде "Речные прогулки" или "С обедом/ужином", поэтому коммерчески спорные события все еще могут попадать в посадочные автоматически.

Следующий контрольный шаг: сделать snapshot-проверку ключевых лендингов (`river-walks`, `bridges-night`, `moscow-dinner-boat`, `bus-sightseeing`) с 10-20 первыми событиями, причиной попадания и ручным allow/deny для спорных карточек.

### Landing manual curation, 2026-06-19

Статус: принято с замечанием.

Что сделано: для админки лендингов добавлен поиск кандидатов по каталогу и ручные действия над списком событий. `PINNED` закрепляет карточку в лендинге, `EXCLUDED` скрывает ее, `REVIEW` возвращает событие к автоматическому правилу. Действие передается на `groupEventIds`, чтобы повторяющиеся слоты Ticketscloud менялись как одна карточка. Detail-список лендинга также сгруппирован по карточкам, а не по слотам.

Главный риск: ручная модерация должна быть хорошо видна оператору, иначе он может не понять разницу между авто-попаданием, закреплением и скрытием.

Следующий контрольный шаг: открыть `/landings`, найти событие вне текущей выборки, закрепить его, скрыть авто-попадание и проверить public-лендинг.

### Windows PowerShell UTF-8, 2026-06-19

Статус: принято с замечанием.

Что сделано: добавлена проектная UTF-8-обертка `scripts/ps-utf8.cmd`, которая запускает PowerShell с `ExecutionPolicy Bypass` для конкретной команды и подгружает `scripts/use-utf8.ps1`. В bootstrap выставлены `InputEncoding`, `OutputEncoding`, `$OutputEncoding` и default `Get-Content:Encoding = utf8`.

Главный риск: это решает кодировку для команд, запущенных через обертку, но не меняет глобальный профиль Windows PowerShell без явного разрешения владельца машины. Интерактивный режим обертки открывается через `-NoExit` в том же PowerShell-процессе, без вложенной shell.

Следующий контрольный шаг: использовать `scripts\ps-utf8.cmd` для PowerShell-команд Codex и отдельно решить, нужно ли прописывать этот bootstrap в пользовательский профиль.

### Landing snapshot QA, 2026-06-19

Статус: принято с замечанием.

Что сделано: добавлены `matchReasons` и `matchBlockers` в admin DTO лендингов, в админке причины попадания выводятся прямо в таблице событий лендинга. Добавлен `npm run landing:snapshot`, который генерирует `docs/landing-snapshot.md` по ключевым посадочным с количеством слотов, авто/ручным статусом, вердиктом `review/allow/deny` и причиной попадания.

Главный риск: snapshot уже показывает спорные автоматические попадания, особенно там, где причина приходит из широкого тега (`tag`), а не из названия события (`title`).

Следующий контрольный шаг: пройти `docs/landing-snapshot.md` по 15-20 карточек на ключевой лендинг и руками скрыть ложные попадания в `/landings`, после чего повторить snapshot.

### Public performance snapshot, 2026-06-19

Статус: принято после саморевью. Внешний mentor-agent не запустился из-за лимита использования, нужно повторить проверку позже.

Что сделано: добавлен `npm run public:perf` и документ `docs/public-performance-snapshot.md`; `/api/public/events` получил короткий response cache с ограничением размера; `buildPublicStats` больше не строит весь каталог ради количества городов/регионов, а использует легкий SQL summary по тем же правилам группировки событий.

Результат замера: статистика hero на текущей локальной БД считается примерно за 150 ms cold вместо ~2 секунд. Каталог cold остается около 2 секунд, но повторные запросы после cache hit занимают 1-2 ms.

Главный риск: cold catalog все еще собирает общий массив карточек в памяти. Для MVP это приемлемо, но при росте каталога фильтры нужно переносить глубже в SQL, чтобы не считать весь каталог для каждого нового набора параметров.

Следующий контрольный шаг: после очередного sync TC/Teplohod запускать `npm run public:perf`; если cold catalog уйдет выше 3000 ms, делать SQL-фильтрацию каталога и отдельный индексированный endpoint для facet counts.

### Catalog filter URLs, 2026-06-19

Статус: принято после саморевью. Внешний mentor-agent нужно повторить позже из-за лимита subagent'ов.

Что сделано: каталог `/events` теперь читает из URL все основные фильтры (`q`, `city`, `category`, `landing`, `date`, `maxPrice`, `sort`, `view`) и синхронизирует адресную строку при изменениях. Активные фильтры стали кликабельными chips: каждый можно снять отдельно, не сбрасывая всю выдачу.

Почему это важно: оператор, SEO-специалист и тестировщик могут передавать точные ссылки на выдачу, а покупателю проще быстро уточнять каталог без ощущения “закрытой формы”.

Следующий контрольный шаг: добавить pagination/`offset` и серверную выдачу страницами, чтобы каталог не ограничивался первыми 180 карточками.

### Catalog pagination, 2026-06-19

Статус: принято после саморевью.

Что сделано: public-каталог перешел на порции по 60 карточек, использует backend `offset`, догружает следующие события кнопкой "Показать еще" и больше не режет карточки/таблицу скрытыми client-side лимитами.

Проверка: `apps/public` прошел typecheck и production build; backend DTO проверен прямым запросом `limit=3&offset=0/3`, страницы не пересекаются и возвращают одинаковый `total`.

Следующий контрольный шаг: если после smoke тестировщик подтвердит удобство, можно добавить номер страницы/offset в URL только для сценариев QA, но для обычного покупателя оставить текущую мягкую догрузку.

### Landing matching tightening, 2026-06-19

Статус: принято после snapshot-проверки.

Что сделано: добавлена проверка обязательных keyword-групп именно в заголовке события. Для `moscow-dinner-boat` еда теперь должна быть явно в названии (`ужин`, `обед`, `ланч`, `бранч`, `завтрак`, `фуршет`, `банкет`, `ресторан`), а не только в широком теге источника. Для `bus-sightseeing` обзорность/экскурсионность также должна читаться из названия, поэтому фестивальные автобусные туры больше не попадают в лендинг.

Результат snapshot: `moscow-dinner-boat` стал 17 карточек вместо 30, `bus-sightseeing` стал 3 карточки вместо 5. Ключевые ложные попадания ушли, а релевантные карточки остались.

Главный риск: `river-walks` и `bridges-night` все еще зависят от тегов поставщика, потому что часть названий у TC слишком общая. Следующий слой качества здесь лучше делать через manual curation в `/landings`, а не дальнейшим ужесточением автоматики.

Следующий контрольный шаг: открыть `/landings`, пройти первые 15 карточек `river-walks` и `bridges-night`, скрыть спорные руками и снова запустить `npm run landing:snapshot`.

### Public navigation audit, 2026-06-19

Статус: принято после сборки.

Что сделано: категории в шапке и подвале теперь ведут сразу в `/events` с нужным фильтром, а не просто на общий якорь главной. Из launch-навигации убраны пустые/ранние ссылки на партнерский блок и блог. Информационные страницы `/privacy`, `/legal`, `/offer`, `/blog` больше не показывают внутреннюю надпись про MVP-заглушку.

Проверка: `apps/public` прошел typecheck и production build; поиск по public-коду не находит `#partner`, `Стать партнером`, `MVP-заглушка` и `Черновик раздела` в пользовательской навигации.

Главный риск: тексты `/privacy` и `/legal` функциональны для MVP, но перед публичным запуском их все равно нужно отдать на юридическую вычитку.

Следующий контрольный шаг: пройти руками маршруты `главная -> каталог -> карточка -> покупка`, `главная -> города -> страница города -> карточка`, `подвал -> privacy/legal` в браузере.

### Public performance mentor follow-up, 2026-06-19

Статус: принято с одним открытым warning.

Что сделано: добавлен backend route `POST /api/v1/tc/sync` и алиас `/api/admin/sources/ticketscloud/sync`, который запускает существующий `tc-full-sync.js`, после завершения сбрасывает public caches и прогревает главную. Cache key для `/api/public/events` теперь строится из канонически отсортированных query params, поэтому одинаковые фильтры в разном порядке попадают в один cache entry.

Также `npm run public:perf` расширен HTTP-замерами `/api/public/stats`, `/api/public/home`, `/api/public/events` с бюджетами. Snapshot теперь работает как контрольная панель: stats cold < 300 ms, catalog warm < 100 ms, home cold желательно < 1000 ms.

Результат HTTP snapshot: stats cold 270 ms — ok, catalog warm 9 ms — ok, home cold 2209 ms — warn.

Главный риск: `/api/public/home` cold все еще строит полноценный public catalog, чтобы отдать главную. За счет startup/sync warm-up покупатель обычно должен видеть warm path, но технический долг остается.

Следующий контрольный шаг: выделить отдельный home DTO, который не строит весь каталог: быстрые stats, легкий список направлений, 60-120 ближайших сгруппированных карточек и отдельные landing counts.

## Текущая оценка

Оценка состояния MVP: 7/10.

Сильные стороны:

- Проект легче legacy и уже разделен на backend, public, admin и db.
- Ticketscloud и Teplohod заведены как источники.
- Повторяющиеся события Ticketscloud начали группироваться в одну карточку со слотами.
- Public имеет каталог, страницы события, города, площадки, лендинги и "Мои заказы".
- Admin имеет события, источники, площадки, лендинги, покупателей и заказы.
- Заказы отделены от финансового контура: мы храним факт покупки, статус и билет, оплату оставляем источнику.

## Красные флаги перед продажами

1. TC purchase URL по слотам.
   Исправлено: ближайшие сеансы на странице события теперь получают внешний event id конкретного слота, а не представительской карточки.

2. Public и Admin по городам/областям.
   Исправлено для public и admin events: малые города могут показываться как область, исходный город остается уточнением.

3. Orders MVP.
   Частично готово: есть короткий номер заказа, русские статусы, ручное добавление билета, поиск и "Мои заказы". Правило "требует внимания" уточнено: отсутствие билета считается проблемой только когда билет уже ожидается по статусу.

4. Landing matching.
   Требует следующего прохода: правила лендингов пока могут ловить лишние события, особенно для речных прогулок, автобусных экскурсий и ужинов на теплоходе.

5. Teplohod widget.
   Требует ручного smoke: открыть реальную карточку события Teplohod и пройти до окна покупки.

## Следующий чек-лист

1. Уточнить правила лендингов:
   - `river-walks`
   - `bus-sightseeing`
   - `moscow-dinner-boat`
   - сезонные посадочные вроде `salute-9-may`

2. Проверить пользовательский маршрут:
   - главная
   - каталог
   - фильтры
   - карточка события
   - покупка TC
   - покупка Teplohod
   - "Мои заказы"

3. Проверить операторский маршрут:
   - источники
   - события
   - карточка события
   - расписание
   - продажи
   - заказы
   - ручное добавление билета

4. Ускорить public DTO и серверные фильтры каталога, если полная выдача снова уходит в 10+ секунд.

5. Убрать prototype/fallback-слои там, где они начнут маскировать реальные API-ошибки.

## Проверять за основным Codex

- `apps/backend/src/dto.js`: группировка событий, public DTO, admin DTO, orders DTO.
- `apps/public/src/components/EventPage.tsx`: выбор билета и ближайшие сеансы.
- `apps/public/src/components/CatalogPage.tsx`: фильтры и группировка карточек.
- `apps/admin/src/pages/EventsPage.tsx`: группировка, статус публикации, контент/media/SEO override.
- `apps/admin/src/pages/ExternalOrdersPage.tsx`: лаконичность операционной таблицы и ручная работа с билетами.

### Source Health + readiness codes, 2026-06-19

#### Комментарий ментора после реакции Codex, 2026-06-19

Вердикт: направление правильное, блок можно принимать как рабочую основу, но не как полностью закрытый production-контур. Codex верно двинулся в сторону Source Health и backend-readiness кодов, однако несколько деталей могут исказить картину для оператора.

Findings:

- `buildAdminSources` сейчас смешивает здоровье каталожного sync и sync заказов. На Ticketscloud это уже видно по `lastSync.mode = "Ticketscloud orders REST polling"` в разделе источников, хотя оператору там важен именно импорт каталога. Нужно разделить `catalogSync` и `ordersSync` или фильтровать `SourceSyncRun` по типу запуска.
- Sources UI все еще стартует с fallback payload. При ошибке backend теперь показывается честный error state, но во время первичной загрузки возможен короткий flash моковых источников. Лучше инициализировать пустой payload/skeleton и не показывать fallback как реальные данные.
- Живой backend нужно перезапустить после правок: текущий `/api/admin/sources` в запущенном процессе отдавал старый DTO без `healthStatus` и `openIssues`. Без restart UI может выглядеть так, будто изменения не работают.
- В `EventsPage` клиентская группировка объединяет `reasons`, но не объединяет `readinessIssues`/`readinessCodes`. Так как UI уже предпочитает новые readiness-поля, сгруппированная строка может потерять часть проблем из отдельных слотов.
- Часть операторского UI осталась на английском: `Sync TC`, `Sync Teplohod`, `stale`, `enabled`. Для админки MVP лучше держать единый русский язык.

Recommendations:

1. Развести в Source DTO последние успешные запуски каталога и заказов, чтобы Sources показывал здоровье импорта событий, а не poll заказов.
2. Убрать стартовый fallback из SourcesPage и заменить его skeleton/empty state до ответа API.
3. Перезапустить backend и повторно проверить `/api/admin/sources` уже через live HTTP, не только прямым DTO-вызовом.
4. Домерджить `readinessIssues` и `readinessCodes` в клиентской группировке событий.
5. После этого переходить к ticket categories/prices read-model: это следующий важный блок для карточки события и продаж.

#### Launch-mode follow-up, 2026-06-19

Статус: принято как срочная правка перед продажами.

Что исправлено: public DTO теперь считает каталог, stats и destination summary только по будущим сеансам (`startsAt >= now()`). До правки `/api/public/events` мог начинаться с прошедших дат 30 мая 2026, хотя текущая дата уже 19 июня 2026. После правки live `/api/public/stats?refresh=1` показывает 387 продаваемых карточек вместо 496, а первые карточки каталога начинаются с ближайших слотов 19-20 июня 2026.

Дополнительно: страница события теперь запрашивает ближайшие пять будущих сеансов внутри группы, Sources DTO фильтрует health по каталожным sync-запускам и больше не принимает `Ticketscloud orders REST polling` за свежесть каталога. Sources UI убран со стартового fallback payload, рабочие элементы русифицированы, а клиентская группировка событий сохраняет `readinessCodes` и `readinessIssues`.

Проверка: `node --check apps/backend/src/dto.js`, `npm.cmd --prefix apps/admin run typecheck`, `npm.cmd --prefix apps/admin run build`, `npm.cmd --prefix apps/public run build`, live HTTP `/api/admin/sources`, `/api/public/stats?refresh=1`, `/api/public/events?limit=3&refresh=1`, `/api/public/events/{slug}`.

Главный риск: Sources честно показывает TC catalog stale с 31 мая и Teplohod stale + `TEP_BRIDGE_NOT_CONFIGURED`. Для запуска продаж нужно прогнать свежий TC catalog sync и поднять Teplohod bridge через `TEP_API_URL`, иначе данные продаваемые, но операционно не свежие.

Статус: принято после локальной DTO-проверки и сборки admin.

Что сделано: `buildAdminSources` теперь отдает не только последний sync, а операционное здоровье источника: `lastSuccessAt`, `isStale`, `staleHours`, `consecutiveErrors`, `runningRuns`, `healthStatus` и `openIssues`. Sources UI показывает отдельные кнопки `Sync TC` и `Sync Teplohod`, grouped/raw counts, свежесть sync и явные проблемы вроде `STALE_SYNC_24H` или `TEP_BRIDGE_NOT_CONFIGURED`. Если backend недоступен, Sources больше не маскирует это fallback-таблицей, а показывает честный экран ошибки с повтором.

Readiness событий переведен на backend-коды: `NO_FUTURE_SESSIONS`, `MISSING_PURCHASE_ENTRY`, `MISSING_PRICE`, `PRICE_TOO_LOW`, `MISSING_CATEGORY`, `MISSING_SUBCATEGORY`, `MISSING_VENUE`, `WEAK_DESCRIPTION`, `MISSING_IMAGE`. Старое поле `reasons` сохранено как человекочитаемый слой для таблицы, но фронт теперь может опираться на `readinessCodes` и `readinessIssues`.

Проверка: `node --check apps/backend/src/dto.js`, `node --check apps/backend/src/server.js`, `npm.cmd --prefix apps/admin run typecheck`, `npm.cmd --prefix apps/admin run build`. Прямой DTO-запрос показал 2 источника, 530 grouped events, TC stale, Teplohod stale + bridge issue. Выборка событий вернула ожидаемые коды, включая `NO_FUTURE_SESSIONS` и `PRICE_TOO_LOW`.

Главный риск: сейчас системная дата 2026-06-19, а часть TC-событий в базе заканчивается 2026-05-30, поэтому readiness массово подсветит отсутствие будущих сеансов. Это правильно для запуска, но перед продажами нужно прогнать свежий TC sync и поднять Teplohod bridge через `TEP_API_URL`.

Следующий контрольный шаг: нормализовать ticket categories/prices как отдельный read-model, чтобы страница события показывала реальные категории билетов, а не только агрегированную `priceFrom`.

#### Launch-mode follow-up, 2026-06-20

Статус: принято как продажный hotfix.

Что сделано: прогнан свежий `tc:full-sync` через живой gRPC Ticketscloud, получено 6506 PUBLIC-записей, 162 площадки, 49 городов и 6363 оффера. SQL seed пересобран и применен к Postgres. Source Health после рестарта backend показывает `TICKETSCLOUD` в статусе `ok`, `lastSuccessAt = 2026-06-20T04:22:49.972Z`, без открытых проблем.

Отдельно закрыт критичный риск каталога: grouped public card теперь строит `purchaseUrl` для каждого слота по его собственному `externalId`, а не по representative event. Проверка live API: в одной карточке `Обзорная экскурсия + Петропавловская крепость` первые четыре слота имеют разные TC `event` params: `69c3e2d8d85d086f7562122a`, `69c3e2dad85d086f75621237`, `69c3e2dbd85d086f75621244`, `69c3e2dcd85d086f75621251`.

Проверка: `node --check apps/backend/src/dto.js`, `node --check scripts/tc-full-sync.js`, `node --check scripts/db-build-tc-seed-sql.js`, live HTTP `/api/admin/sources`, `/api/public/stats?refresh=1`, `/api/public/events?limit=1&refresh=1`.

Остаточный риск: `TEPLOHOD` честно остается красным: `STALE_SYNC_24H` + `TEP_BRIDGE_NOT_CONFIGURED`. Для локального запуска нужен fixture bridge и `TEP_API_URL`, для боевого запуска логичнее российский сервер с белым IP, как и планируется.

#### Teplohod local bridge follow-up, 2026-06-20

Статус: принято как локальный запусковый контур до переезда на российский сервер.

Что сделано: поднят `tep:fixture-bridge` на `http://127.0.0.1:8787/v1`, в локальный `.env` добавлен `TEP_API_URL=http://127.0.0.1:8787/v1`, backend перезапущен и прогнан `POST /api/v1/tep/sync`. Импорт прошел в режиме `api`: 186 source events, 18 cities, 14401 sessions, 697 offers, 1938 tags, 186 venues.

Проверка: `GET /api/admin/sources` показывает `TEPLOHOD` в статусе `ok`, без `STALE_SYNC_24H` и без `TEP_BRIDGE_NOT_CONFIGURED`. В public catalog Teplohod участвует в выдаче, пример карточки: `Кремлевская обзорная речная прогулка по центру Москвы от причала «Новоспасский мост»`, provider `TEPLOHOD`, purchase URL `https://teplohod.info/event/1112`.

Дополнительная проверка карточки события: `/api/public/events/kremlevskaya-obzornaya-rechnaya-progulka-po-centru-moskvy-ot-prichala-novospasskii-most-1112` отдает `widgetPayload` с `tepEventId = 1112`, ближайшие сеансы `purchaseReady = true`, а `ticketPrices` содержит реальные категории билетов Teplohod с ценами 350, 490, 590, 790, 1290 рублей.

Остаточный риск: это все еще локальный fixture bridge, а не прямой белый IP Teplohod. Для первой боевой продажи нужно повторить тот же sync на российском сервере, где `TEP_API_URL` будет указывать на реальный доступный API/bridge.

#### QA/deploy checklist, 2026-06-20

Статус: подготовлен общий лист допуска к первым продажам: `docs/launch-qa-and-deploy.md`.

Менторская оценка: документ правильно удерживает фокус на launch-critical вещах: источники, покупка через виджеты, public smoke, admin smoke, API smoke, минимальная защита админки, домены, env и Git/CI/CD. Новые продуктовые фичи до прохождения этого списка не добавлять, кроме исправления блокеров.
#### Deploy hardening, 2026-06-20

Статус: принято как обязательная подготовка перед выкладкой на Timeweb.

Что сделано: public/admin сборки отвязаны от абсолютных путей `D:\coding\SPBBOATS`, root npm scripts переведены с Windows-only `npm.cmd` на кроссплатформенный `npm`, добавлены локальные lock-файлы для `apps/public` и `apps/admin`. Backend получил Basic Auth для `/api/admin/*`, `/api/v1/tc/*`, `/api/v1/tep/*` и `/api/db/*`; public API остается открытым.

Проверка: `node --check apps/backend/src/server.js`, `npm run public:build`, `npm run admin:build`. Дополнительно поднят backend на порту `4011` с `DAIBILET_REQUIRE_ADMIN_AUTH=1`, `ADMIN_EMAIL=admin@daibilet.ru`, `ADMIN_PASSWORD=admin123`: `/api/admin/sources` без auth вернул `401`, с auth вернул `200`, `/api/public/stats` вернул `200`.

Документы: добавлены `docs/deploy-timeweb.md`, `deploy/systemd/daibilet-api.service`, `deploy/nginx/daibilet.conf.example`, обновлен `.env.example`.

Остаточный риск: Teplohod production sync нужно проверять уже с сервера `213.171.7.16`, потому что именно этот IP whitelist.

#### Backend TypeScript foundation, 2026-06-24

Статус: принято как безопасная инженерная ветка, не влияющая на launch `main`.

Что сделано: создана ветка `backend-ts-foundation`, добавлены TypeScript-инфраструктура backend, DTO-типы, zod-схемы, typed `env/auth/http/db` модули и параллельный `server-entry.ts`. Старый `server.js` теперь экспортирует `handleRequest` и `startServer`, но при прямом запуске продолжает работать как раньше.

Проверка: `npm run backend:typecheck`, `node --check apps/backend/src/server.js`, smoke `PORT=4022 npm --prefix apps/backend run dev:ts` + `/api/health = 200`, smoke legacy `PORT=4023 node apps/backend/src/server.js` + `/api/health = 200`.

Менторская оценка: направление верное. Codex не переписал весь backend одним рывком, а сделал мост: можно сравнивать TS entrypoint и legacy entrypoint, не ломая деплой. Это правильная техника для монолита с большим `dto.js`.

Остаточный риск: новые TS-модули пока почти не участвуют в реальном route handling, поэтому польза в основном инфраструктурная. Следующий обязательный шаг - подключить typed validation/route context к новым или безопасным маршрутам и только затем резать `dto.js` на доменные модули.

Follow-up: добавлены `routing.ts` и `validation.ts` как bridge для следующего server split. Это не меняет runtime, но задает правильную форму будущих маршрутов: `RouteContext` + zod-валидация query/body + единый `validation_error`.

#### Backend validated entrypoint, 2026-06-24

Статус: принято как первый runtime-шаг TS-ветки.

Что сделано: `server-entry.ts` теперь запускает legacy `handleRequest` через `createValidatedHandler`, который проверяет query-параметры безопасных GET-маршрутов до передачи в старый обработчик. Production `server.js` не переключен: прямой `node apps/backend/src/server.js` продолжает использовать legacy handler без новой обертки.

Проверка: `npm run backend:typecheck`, `node --check apps/backend/src/server.js`, TS smoke `/api/health = 200`, invalid catalog query `limit=9999 -> 400 validation_error`, legacy smoke `/api/health = 200`.

Менторская оценка: шаг правильный, потому что TypeScript начал работать в реальном входе запроса, но с контролируемым blast radius. Важно, что схема была сверена с фактическим public/admin UI: public sort принимает `time|price|popular`, admin orders принимает `provider/view/page`, а не только старые поля.

Остаточный риск: POST/PATCH body validation пока намеренно не включена, чтобы не съесть request stream до legacy handler. Следующий контрольный шаг - переносить по одному write route в TS-обработчик целиком, начиная с наименее рискованных admin payload: landing match или event override.

#### First TS write route, 2026-06-24

Статус: принято как аккуратный перенос одного admin write-сценария.

Что сделано: `PATCH /api/admin/landings/:slug/matches/:eventId` вынесен в typed route handler `admin-landings-handler.ts`. Body валидируется zod-схемой, включая `groupEventIds/eventIds`, поэтому ручное закрепление/скрытие продолжает работать на сгруппированной карточке, а не на одном слоте. TS entrypoint теперь сам проверяет Basic Auth перед typed route handlers и после успешной записи вызывает public cache invalidation.

Проверка: `npm run backend:typecheck`, `node --check apps/backend/src/server.js`, TS smoke с включенной auth: health `200`, PATCH без auth `401`, PATCH с плохим body `400 validation_error`, malformed JSON body `400 validation_error`, bad public query `400 validation_error`, legacy health `200`.

Менторская оценка: шаг можно принимать. Самый важный риск был не в SQL, а в обходе auth и потере `groupEventIds`; оба закрыты до коммита. Хорошо, что доменная функция `updateAdminLandingMatch` пока оставлена legacy: это держит размер изменения маленьким.

Следующий контрольный шаг: переносить следующий write-route с похожей формой, лучше `PATCH /api/admin/events/:id/override`, потому что там уже есть zod-схема и это напрямую влияет на SEO/контент карточек.

#### Event override TS route, 2026-06-24

Статус: принято как полезный SEO/admin-срез.

Что сделано: `PATCH /api/admin/events/:id/override` вынесен в typed route handler `admin-events-handler.ts`. Payload валидируется до legacy DTO, пустые строки становятся `null`, а `editorStatus` ограничен допустимыми publish-статусами. После успешной записи route сбрасывает public cache, чтобы карточка события и SEO-данные не зависали в старом состоянии.

Проверка: `npm run backend:typecheck`, `node --check apps/backend/src/server.js`, schema smoke для очистки пустой строки, TS smoke с auth: health `200`, override без auth `401`, плохой `editorStatus` `400 validation_error`, malformed JSON `400 validation_error`, legacy health `200`.

Менторская оценка: шаг принят. Codex не полез в SQL/DTO, но уже закрыл самый частый класс ошибок для контентных правок: мусорный payload, случайный статус и некорректная очистка поля. Это именно тот уровень строгости, который нужен до разрезания `dto.js`.

Следующий контрольный шаг: либо перенести `PATCH /api/admin/events/:id/moderation` рядом с override, либо начать выделять `admin-events.dto.ts`, если хотим двигаться к декомпозиции `dto.js`.

#### Live DB smoke + event moderation TS route, 2026-06-25

Статус: принято как закрытие первого реального TS write-контура.

Что сделано: после включения локальной БД проверены реальные записи через TS entrypoint: event override и landing match успешно записали данные в Postgres и были откатаны к исходному состоянию. Затем `PATCH /api/admin/events/:id/moderation` добавлен в `admin-events-handler.ts` рядом с override и также прошел write/rollback smoke.

Проверка: БД доступна, объем каталога 8761 событий. Override smoke записал `seoTitle`, landing match smoke записал `manualStatus=PINNED`, moderation smoke записал `editorStatus=PUBLISHED`; все три проверки восстановили исходные записи. Auth/validation также проверены: no auth `401`, плохой статус `400 validation_error`.

Менторская оценка: блок принят. Теперь TS entrypoint покрывает не только чтение query и искусственные ошибки, а реальные admin write-сценарии с БД, auth и cache invalidation. Важно, что smoke не оставил тестовых данных.

Следующий контрольный шаг: начинать декомпозицию `dto.js` с `admin-events.dto.ts` или `readiness.ts`, потому что route shell уже достаточно подготовлен.

#### Order ticket TS route, 2026-06-25

Статус: принято как launch-critical операционный срез.

Что сделано: `POST /api/admin/orders/:id/tickets` вынесен в typed route handler `admin-orders-handler.ts`. Схема payload расширена под фактический UI (`externalTicketId`, `eventId`, `sessionId`, `status`), а typed error handling начал уважать `statusCode` доменных ошибок legacy DTO.

Проверка: на живой БД тестовый билет был создан в заказе `extord_tc_698b97b8114fe9ea0d071479` с `origin=manual`, после чего строка `ExternalTicket` удалена, а `ExternalOrder.updatedAt` восстановлен. Также проверены no auth `401`, отсутствие номера `400 ticket_number_required`, несуществующий заказ `404 order_not_found`.

Менторская оценка: блок принят. Это важнее ранней декомпозиции `dto.js`, потому что напрямую закрывает ручную операционную работу с заказами перед первыми продажами. Хорошо, что error handling стал точнее: оператор и фронт больше не получат `500` там, где проблема пользовательская.

Следующий контрольный шаг: после этого уже можно возвращаться к декомпозиции `dto.js`, начиная с `orders.dto.ts` или `admin-events.dto.ts`; route shell для самых важных write-сценариев готов.

#### Legacy schema audit before DTO split, 2026-06-25

Статус: принято как архитектурная развилка перед Prisma/DTO-переходом.

Что сделано: просмотрены SPBBOATS legacy Prisma schema, catalog foundation fragment и ключевые документы по events/sessions, ingestion, checkout, landings и Admin V4 imported sales. Вывод зафиксирован в [`legacy-schema-audit.md`](legacy-schema-audit.md): копировать большой legacy-монолит нельзя, но нужно перенести его доменные инварианты.

Менторская оценка: правильный следующий шаг - не просто типизировать текущий `dto.js`, а убрать причину сложности. Для этого модель должна закрепить `Event -> Session -> Offer -> ProviderLink`: карточка события, слоты времени, билетные категории/цены и внешние идентификаторы не должны жить в одном объекте или в эвристике UI.

Следующий контрольный шаг: сделать маленький Prisma bridge и additive source identity для session/offer, затем уже резать `dto.js` на `sources`, `admin-events`, `orders`, `landings`, `public-catalog`, `public-pages`, `readiness`.

#### Prisma bridge, 2026-06-25

Статус: принято как безопасная DB-опора перед переносом DTO.

Что сделано: в `packages/db` добавлен runtime client singleton поверх Prisma 7 + `@prisma/adapter-pg`, `db:typecheck` и `db:smoke`. Root scripts также получили `db:typecheck` и `db:smoke`, чтобы проверка запускалась одной командой из монорепы.

Проверка: `npm --prefix packages/db run db:typecheck` прошел. `npm --prefix packages/db run db:smoke` на живой БД вернул 8761 событий, 22976 сеансов, 9111 офферов, 248 площадок, 59 городов, 5 лендингов, 13 внешних заказов и 0 билетов.

Менторская оценка: шаг маленький, но правильный. Теперь можно переносить read-models на Prisma постепенно, не включая большой рефакторинг `dto.js` и не меняя API shape.

Следующий контрольный шаг: additive source identity для `Session`/`Offer` (`ProviderLink` как предпочтительный вариант), затем `public-catalog.dto.ts` или `admin-events.dto.ts`.

#### ProviderLink source identity, 2026-06-25

Статус: принято как правильный доменный слой перед упрощением DTO.

Что сделано: добавлена модель `ProviderLink` с `ProviderEntityKind = EVENT | SESSION | OFFER | VENUE`, FK на соответствующую сущность и unique key `(sourceId, entityKind, externalId, externalParentId)`. Старый `EventSourceLink` оставлен для совместимости. Добавлена backfill-миграция из текущих MVP-таблиц.

Проверка: `migrate deploy` применил backfill и корректировку Teplohod offer identity, `migrate status` показывает 9 миграций и актуальную схему. `ProviderLink` содержит 40901 строк: 8761 EVENT, 22976 SESSION, 9111 OFFER, 53 VENUE. Количество OFFER links точно совпадает с активными офферами: TC 8414, Teplohod 697; битых targets нет. `npm run db:validate`, `npm run db:typecheck`, `npm run db:smoke` прошли. Отдельно все 9 миграций успешно развернуты в чистую временную БД, target constraint проверен, smoke-БД удалена.

Менторская оценка: это тот слой, которого не хватало между raw import и DTO. Теперь TC/Teplohod ids можно резолвить на нужном уровне, а не угадывать по `EventSourceLink` и JSON payload. Следующий риск - не начать сразу переписывать весь импорт; правильнее сначала подключить read path/DTO к `ProviderLink`, затем уже материализатор TC.

Следующий контрольный шаг: небольшой read-helper/repository для provider identity и первый DTO-slice, где уйдет ручной join/эвристика source id.

#### First Prisma public catalog DTO, 2026-06-30

Статус: принято как opt-in read path, production default не переключен.

Что сделано: добавлены typed `provider-links.repository.ts`, `public-catalog.dto.ts` и route handler для `GET /api/public/events`. Prisma SQL выбирает EVENT identity через `ProviderLink` с compatibility fallback на `EventSourceLink`; фильтры, facets, сортировка, pagination и cache вынесены в TypeScript. Включение только через `DAIBILET_TS_PUBLIC_CATALOG=1` в TS entrypoint.

Проверка: backend typecheck прошел. `backend:catalog:parity` сравнил legacy и Prisma DTO для time, price/maxPrice, category и search: total, первые ids и facets совпали. HTTP parity дал одинаковые 324 карточки и первые ids; cold Prisma path около 2.0-2.2 s, warm 4-7 ms. Provider identity helper вернул реальный Teplohod OFFER `ticket.id=3850`, parent event `370`. Cache smoke подтвердил listener: warm catalog 6 ms, после `GET /api/public/home?refresh=1` следующий catalog снова cold около 2.0 s.

Менторская оценка: граница выбрана правильно - Prisma взял read-model, а API shape не изменился. Важное исправление: zod schema теперь принимает фактический UI-параметр `maxPrice`. Cache invalidation объединен через listener в `server.js`: sync и ручные правки сбрасывают оба read path. Флаг остается выключенным по умолчанию для контролируемого rollout, а не из-за stale-data риска.

Следующий контрольный шаг: включить Prisma catalog по умолчанию в TS entrypoint после короткого soak, затем вынести legacy mapper/landing rules в typed modules.

#### ProviderLink SESSION and typed catalog mapping, 2026-06-30

Статус: принято как второй Prisma catalog slice.

Что сделано: временные слоты каталога теперь строятся из `EventSession` и резолвят provider identity через `ProviderLink SESSION`. Ticketscloud использует session external id, Teplohod - parent event id. Правила лендингов и mapper публичной карточки вынесены в отдельные TypeScript-модули; новый catalog path больше не зависит от mapper/rules монолитного `dto.js`.

Проверка: backend typecheck, 4 unit tests, DB smoke и catalog parity прошли. На живой БД 941 из 941 слотов первых 200 карточек получили `ProviderLink SESSION`; totals, ids и facets совпали с legacy для time, price/maxPrice, category и search.

Менторская оценка: граница стала заметно чище - SQL отвечает за read-model и provider identity, mapper за API shape, landing rules за классификацию. Legacy-копии в `dto.js` допустимы только как временный compatibility layer; удалять их нужно вместе с переключением production runtime, а не отдельным рискованным коммитом.

Следующий контрольный шаг: вынести public event detail на Prisma и использовать те же session identities для расписания и widget payload, затем провести soak и включить TS public catalog по умолчанию.

#### Cursor MVP integration, 2026-07-01

Статус: принято после ручного объединения и regression smoke.

Что сделано: ветка Cursor `feat/lovable-landings` объединена с TypeScript foundation. Взяты public refresh, Lovable landing templates, города/поиск, buyer account, виджеты TC/Teplohod и исправления Teplohod import. Конфликтующие `dto.js`/`server.js` объединены без потери typed route shell и `ProviderLink` read path.

Дополнительные исправления: TS-каталог получил open-date события и новые landing rules; hero/catalog согласованы на 447 карточках; служебные теги удалены из популярных тем; JWT заменён на HMAC, CORS исправлен для credentialed auth; устранена browser timeout typing ошибка в HeaderSearch.

Проверка: backend typecheck, 6 unit tests, catalog parity, DB validate/typecheck/smoke, public/admin production builds и browser smoke прошли. Landing audit проходит 11 из 11 контрольных Teplohod cases, включая open-date автобусные события. Buyer flow register -> refresh -> me -> logout -> login проверен на локальной БД, тестовые пользователи удалены. Остаточный performance-риск: public bundle около 594 kB minified и требует route-level code splitting после launch-critical backend slices.

Менторская оценка: изменения Cursor учтены без отката архитектуры. Следующий приоритет остаётся прежним: Prisma public event detail и единый session/widget resolver, затем включение TS catalog по умолчанию.

#### Prisma public event detail, 2026-07-01

Статус: принято как третий Prisma read slice, production default пока не переключен.

Что сделано: `public-event.dto.ts` собирает страницу события из Prisma-моделей `Event -> EventSession -> EventOffer -> ProviderLink`. Общий `provider-purchase.ts` закрепляет разные provider contracts: Ticketscloud покупается по identity конкретного сеанса, Teplohod открывает виджет по parent event identity. DTO отдает не больше пяти ближайших сеансов, нормализованные билетные категории, очищенное от HTML описание, SEO override, связанные события и лендинги. Route включается независимо через `DAIBILET_TS_PUBLIC_EVENT=1`.

Проверка: backend typecheck и 7 unit tests прошли. Event parity совпал с legacy для Ticketscloud, Teplohod с расписанием и Teplohod с открытой датой. Catalog parity прошел на 445 карточках; 916 из 916 слотов имеют session identity. Landing audit прошел 11 из 11, DB smoke подтвердил 8761 событие, 22976 сеансов, 9111 offers и 40901 provider links.

Менторская оценка: блок принят. Сильная сторона решения в том, что event page и catalog используют один resolver provider identity, поэтому переход на Prisma не расходится с реальным widget flow. Отдельная коррекция московского wall time закрыла скрытый сдвиг расписания на три часа. Границы городов, площадок, подборок и лендингов зафиксированы отдельно и не раздувают DTO события.

Следующий контрольный шаг: провести HTTP smoke с обоими TS-флагами, затем после короткого soak включить Prisma catalog/event path по умолчанию. После этого переносить `public-pages` по одной сущности: сначала города, затем площадки; collections и landings держать раздельными.

#### Prisma public city read-model, 2026-07-01

Статус: принято как отдельный city/destination slice, без смешивания с каталогом площадок.

Что сделано: `public-city.dto.ts` перенес каталог направлений и страницу города на Prisma-compatible typed path. Региональная маршрутизация сохраняется из сгруппированного каталога, поэтому небольшие города продолжают попадать в область, а Москва и Санкт-Петербург остаются самостоятельными. Площадки городской страницы читаются Prisma-запросом, но их будущий общий каталог остается отдельным read-model. Custom SEO города получает приоритет над fallback-текстом.

Проверка: typecheck и 7 unit tests прошли. Полный destination catalog из 26 строк совпал с legacy. Москва совпала на 154 событиях и 24 площадках, Московская область на 2 событиях и 1 площадке. Catalog/event parity и landing audit 11 из 11 сохранились. HTTP smoke подтвердил canonical alias и раздельные city/region pages.

Менторская оценка: архитектурная граница выдержана правильно. City page использует каталог как источник состава карточек, но не превращает город, регион и площадку в одну универсальную сущность. Главный нерешенный риск виден и измерен: cold destinations около 5 секунд из-за зависимости от полного catalog build. Это допустимо под выключенным feature flag, но не для production default.

Следующий контрольный шаг: перенести venue catalog/detail отдельным Prisma DTO. После этого сделать один performance-проход по catalog/city/venue startup warmup и только затем переключать public read paths по умолчанию.

#### Prisma public venue read-model, 2026-07-01

Статус: принято как отдельный venue slice с явной границей между локацией и опубликованной страницей.

Что сделано: `public-venue.dto.ts` переносит detail на Prisma и добавляет backend-каталог `/api/public/venues`. Счетчик каталога основан на сгруппированных карточках, а не на сырых слотах. `pageStatus` сохраняется как операционный сигнал; `HIDDEN` закрыт. Для пустых SEO-полей добавлены fallback H1, title, description и canonical. Общий контракт вынесен в `types/public.ts`.

Проверка: 189 уникальных площадок сопоставлены с catalog event counts. Detail parity прошел для `CANDIDATE` и `NONE`, включая sessions, related venues и stats. Typecheck, 7 unit tests, city/catalog parity и HTTP smoke прошли. На площадке с 27 карточками все session ids уникальны; detail 33 ms, warm cache 7 ms после прогрева каталога.

Менторская оценка: блок принят. Хорошо, что backend уже различает состояние страницы и факт существования локации, но не вводит преждевременную жесткую фильтрацию: сейчас в БД нет ни одной `PUBLISHED` площадки. Перед SEO-запуском нужен короткий moderation pass, иначе кандидаты останутся индексируемыми по legacy-поведению.

Следующий контрольный шаг: performance pass для единого Prisma catalog warmup и подключение React-каталога `/venues`. После этого можно включать TS catalog, event, city и venue flags как единый production read stack.


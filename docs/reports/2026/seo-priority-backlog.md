# Приоритетный SEO-backlog DAIBILET - аудит 28.11.2026

Задачи подготовлены по read-only аудиту. Они не разрешают менять production: публикация, robots, canonical, redirects, внутренние ссылки, sitemap и тексты остаются неизменными до отдельного согласования.

## P0 - проверить перед изменением индексируемости

### P0.1. Перепроверить 8 EventPage с редакционным Index и без продаваемого предложения

- **Количество:** 8 активных rewrite EventPage. Production DB на 28.11 11:29 UTC показывает `READY + isIndexable=true`, но не находит активный offer и будущую активную session по принятому query-критерию.
- **Польза:** исключить индексируемые карточки без доступного предложения или выявить ошибочный ноль из-за незавершённой ночной синхронизации.
- **Риск:** переключение во время неполной синхронизации закроет страницу, у которой есть актуальный слот; сохранение Index при устойчивом отсутствии оффера может вести на пустую страницу.
- **Трудоёмкость:** 0,5-1 день на сверку после синхронизации и ручное решение по каждой карточке. Автоматически не менять флаг.

| EventPage slug | URL | Сейчас |
|---|---|---|
| `a-p-shadrin-1942-2018-vospominaniya-o-kryme-i-sevastopole-moskva` | https://daibilet.ru/events/a-p-shadrin-1942-2018-vospominaniya-o-kryme-i-sevastopole-moskva | sitemap, HTTP 200, index, self-canonical |
| `art-festival-pereryv-krasnoyarsk` | https://daibilet.ru/events/art-festival-pereryv-krasnoyarsk | sitemap, HTTP 200, index, self-canonical |
| `ekskursiya-na-dvuhetazhnom-avtobuse-g-kazan` | https://daibilet.ru/events/ekskursiya-na-dvuhetazhnom-avtobuse-g-kazan | sitemap, HTTP 200, index, self-canonical |
| `ekskursiya-na-dvuhetazhnom-avtobuse-po-sisteme-hop-on-hop-off-g-moskva` | https://daibilet.ru/events/ekskursiya-na-dvuhetazhnom-avtobuse-po-sisteme-hop-on-hop-off-g-moskva | sitemap, HTTP 200, index, self-canonical |
| `ekskursiya-na-dvuhetazhnom-avtobuse-po-sisteme-hop-on-hop-off-g-nizhnii-novgorod-nizhniy-novgorod` | https://daibilet.ru/events/ekskursiya-na-dvuhetazhnom-avtobuse-po-sisteme-hop-on-hop-off-g-nizhnii-novgorod-nizhniy-novgorod | sitemap, HTTP 200, index, self-canonical |
| `ekskursiya-na-dvuhetazhnom-avtobuse-po-sisteme-hop-on-hop-off-g-sankt-peterburg` | https://daibilet.ru/events/ekskursiya-na-dvuhetazhnom-avtobuse-po-sisteme-hop-on-hop-off-g-sankt-peterburg | sitemap, HTTP 200, index, self-canonical |
| `ekskursiya-na-dvuhetazhnom-avtobuse-po-sisteme-hop-on-hop-off-g-yaroslavl` | https://daibilet.ru/events/ekskursiya-na-dvuhetazhnom-avtobuse-po-sisteme-hop-on-hop-off-g-yaroslavl | sitemap, HTTP 200, index, self-canonical |
| `spektakl-master-i-margarita-g-angarsk` | https://daibilet.ru/events/spektakl-master-i-margarita-g-angarsk | sitemap, HTTP 200, index, self-canonical |

### P0.2. Сверить robots и sitemap для 4 адресов с `noindex`

- **Количество:** 4 URL: `cirk-na-ldu-6af9b46a5f36456fa16ef02d`, `ekskursiya-v-osobnyak-staheeva-6ab23455478304458fc24264`, `stendap-devochki-na-opyte-6ad0d814918bfce6a050ce4f`, `kulinarnyi-master-klass-gruzinskaya-klassika-6ad5e13aeaa632460dd7a6d7`.
- **Польза:** устранить sitemap/robots mismatch после подтверждения ожидаемого статуса каждой страницы.
- **Риск:** снятие noindex может открыть неподходящую страницу; удаление из sitemap без проверки офферов может скрыть актуальную карточку.
- **Трудоёмкость:** 2-4 часа после следующей синхронизации.

В обходе все четыре URL отвечали 200, self-canonical и `noindex`; API snapshot 10:25 UTC показывал `purchaseReady=true`. Повторить проверку слотов. Если предложения нет - оставить noindex и в отдельном релизе согласовать удаление из sitemap. Если предложение есть - сначала проверить качество страницы и intended policy. Не менять robots автоматически.

## P1 - sitemap, grouping и внутренние ссылки

### P1.1. Разобрать 515 доступных старых canonical вне sitemap из группы 551

- **Количество:** 515 старых URL имеют 200, `index,follow`, self-canonical и отсутствуют в финальном sitemap. Ещё 24 URL из исходной группы теперь присутствуют в sitemap. Вся техклассификация 551 строк: 515 indexable вне sitemap, 24 indexable в sitemap, 11 noindex, 1 canonical conflict.
- **Польза:** повысить обнаруживаемость актуальных canonical URL без смены адреса.
- **Риск:** часть EventPage может отражать неполную синхронизацию или потерю предложения; один URL имеет конфликт canonical/group identity.
- **Трудоёмкость:** 1-2 дня на dry-run: сопоставить текущий offer, sync freshness, внутренние ссылки и sitemap; затем вынести точный список на отдельное утверждение. Не мигрировать canonical.

### P1.2. Разобрать 4 подтверждённых конфликта Event ID внутри одной публичной группы

- **Количество:** 4 пары, 8 URL. Старый Event ID входит в `groupEventIds` нового public group, но оба URL отвечают 200, `index,follow`, self-canonical.
- **Польза:** оставить одну стабильную URL-идентичность на публичную Event-группу, не индексировать параллельные страницы для сгруппированных слотов.
- **Риск:** неверно объединить разные мероприятия, если опираться только на название или сменившийся Ticketscloud ID.
- **Трудоёмкость:** 1-2 дня на ручную проверку provider identity и выбор владельца URL. Redirect/canonical/sitemap/internal links проектировать отдельно.

| Event group | Старый URL | Новый URL |
|---|---|---|
| Музей Гарри Поттера | https://daibilet.ru/events/kombo-1-6afb75013caa6c5900c3bd78 | https://daibilet.ru/events/kombo-1-6afb75013caa6c5900c3bd80 |
| Роспись мишки Bearbricks | https://daibilet.ru/events/rospis-mishki-bearbricks-v-tehnike-flyuid-art-s-vidom-na-isakii-6af47644a32847d886a6f29c | https://daibilet.ru/events/rospis-mishki-bearbricks-v-tehnike-flyuid-art-s-vidom-na-isakii-6a9f353b01974d6d259dce0a |
| С чужого плеча | https://daibilet.ru/events/s-chuzhogo-plecha-6ad529722e166e60d72b58f9 | https://daibilet.ru/events/s-chuzhogo-plecha-6ad529c111e0e6e6239dc56d |
| Суши Гурмэ | https://daibilet.ru/events/sushi-gurme-6ac69c486f55261bdb3e9b85 | https://daibilet.ru/events/sushi-gurme-6ac69c4a6f55261bdb3e9b9c |

### P1.3. Проверить sitemap churn после ночной синхронизации

- **Количество:** между двумя fresh-cache снимками за 50 минут сменилось 14 URL на добавление и 15 на удаление. 14 новых адресов прошли 200/index/self-canonical; 14 из удалённых всё ещё отвечали 200/index/self-canonical при HTML-проверке. 10 оставшихся изменений не подтверждены как одна Event-группа.
- **Польза:** заметить появление новых canonical и исчезновение старых до потери внутренних/поисковых сигналов.
- **Риск:** принять штатное обновление слотов за потерю события или, наоборот, автоматически слить отдельные события по схожему названию.
- **Трудоёмкость:** 1-2 дня на read-only post-sync diff с устойчивой Event group identity и состоянием `UNKNOWN` при неполной синхронизации.

### P1.4. Закончить граф внутренних ссылок

- **Количество:** 2 433 URL не получили входящей ссылки из отсканированных event страниц и 551 кандидата. Это неполный сигнал; главная, city hubs, landing pages и venue pages не вошли в ссылочную выборку. `venues.xml` вернул 503.
- **Польза:** выделить настоящие orphan pages и полезные источники ссылок.
- **Риск:** массовые ссылки без ручной релевантности создадут SEO-шум и размоют хабы.
- **Трудоёмкость:** 1 день на crawl главной, `/events`, городских хабов, landing и venue PDP; затем shortlist и ручное решение.

### P1.5. Проверять sitemap после sync без полного crawl при открытии админки

- **Количество:** 4 168 уникальных URL в последнем sitemap событий; 4 `noindex` URL в карте.
- **Польза:** ловить sitemap/robots/canonical конфликт и URL churn с датой последней успешной проверки.
- **Риск:** превратить временно неполную ночную синхронизацию или `UNKNOWN` в noindex/удаление.
- **Трудоёмкость:** 1-2 дня на сохранённый периодический HTML-аудит, кэш, bounded retries, diff и отдельный статус UNKNOWN. Админка должна читать snapshot.

## P2 - поисковые данные и контент

### P2.1. Загрузить свежие экспорты GSC и Яндекс Вебмастера

- **Количество:** весь каталог; фактическое число indexed URL, impressions/clicks сейчас `NOT_CHECKED`.
- **Польза:** ранжировать улучшения по показам, позиции, кликам, текущему предложению и HTML-дефектам.
- **Риск:** смешать свойства/периоды или посчитать строки запросов как URL.
- **Трудоёмкость:** около 0,5 дня на экспорт и нормализацию. Шаблоны: [Google](./seo-google-search-console-import-template.csv), [Яндекс](./seo-yandex-webmaster-import-template.csv).

### P2.2. Ревью повторяющихся метаданных после разбора группировки

- **Количество:** в 4 155 полноценно разобранных HTML URL есть 832 title в 193 повторяющихся группах и 859 meta description в 196 группах.
- **Польза:** отличить шаблонный мета-текст от реальных дубликатов после сведения слотов.
- **Риск:** создавать разные тексты для сессий, которые по правилам каталога являются одной Event-группой.
- **Трудоёмкость:** 1-2 дня на shortlist после появления поисковой статистики. Длина описания отдельно quality score не является.

### P2.3. Сохранять историю активаций рерайта отдельным событием

- **Количество:** будущие активации и повторные редакции; достоверной истории для 7/30 дней нет.
- **Польза:** отличать первую активацию от повторной версии.
- **Риск:** подменить событие активации датой `EventPage.updatedAt` или датой создания revision.
- **Трудоёмкость:** 1-2 дня на additive event log, idempotency и lifecycle contract. В первой версии дашборда счётчики 7/30 дней не показывать.

## P3 - возможная URL-миграция

### P3.1. Не запускать миграцию до утверждения URL ownership

- **Количество:** карта 3 189 однозначных отношений из аудита 27.11, группа 551 старого canonical и 4 подтверждённых конфликта группировки.
- **Польза:** только если stable EventPage адрес устойчиво представляет ту же публичную Event-группу и сохраняет поисковые сигналы.
- **Риск:** закрыть старый URL без точной цели, перенаправить разные слоты на неверную страницу или потерять ссылочную историю.
- **Трудоёмкость:** 3-5 дней на ownership, redirects map, backlinks, sitemap preview и rollback; реализация оценивается отдельно.

Перед любым переходом подтвердить обе стороны по HTTP/robots/canonical, group identity, offer и sync freshness, входящим ссылкам и поведению после следующей синхронизации. Никаких автоматических redirects или смен canonical.
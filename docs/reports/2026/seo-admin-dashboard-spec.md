# Спецификация SEO-счётчиков и мониторинга рерайтов в админке

**Статус:** спецификация принята. Production v1 отложена до завершения владельцем текущих рерайтов и проверки их индексируемости, а также до завершения/review четырёх остальных артефактов основного SEO-аудита. После выполнения этих условий можно переходить к реализации и production rollout по согласованному релизному процессу.
**Дата:** 27.11.2026
**Основание:** аудит EventPage/canonical от 27.11.2026 и исходное ТЗ полного SEO-аудита.
**Ограничение:** этот документ не разрешает изменение SEO-поведения или production. Перед разработкой обновить live-аудит и сверить фактические backend-контракты.

## 1. Цель и принципы

Админка показывает два разных слоя:

1. **Редакционный статус EventPage** — статус публикации страницы и наличие активного рерайта в данных EventPage.
2. **Техническое SEO-состояние публичных URL** — результат последнего успешного HTML-аудита уникальных нормализованных canonical URL.

Нельзя считать EventPage равной одному индексируемому URL. Несколько Event и EventPage могут вести на один canonical; одна EventPage может иметь исторические маршруты; слот `EventSession` не является отдельной карточкой публичного каталога. Если у черновой EventPage canonical указывает на старый публичный URL, этот URL учитывается отдельно и не теряется в счётчиках.

`index,follow` означает только разрешение обхода. Sitemap presence и HTTP 200 также не доказывают наличие URL в поисковой выдаче. Отсутствие подтверждённой проверки возвращается как `NOT_CHECKED`/`UNKNOWN`, но никогда не как ноль и не как автоматический `noindex`.

## 2. Единицы учёта и нормализация

### 2.1. EventPage

Для редакционных карточек единица — уникальный `EventPage.id`. EventPage остаётся в одной из четырёх редакционных групп независимо от того, какой URL сейчас canonical.

### 2.2. Публичный URL

Для SEO-здоровья единица — **уникальный нормализованный публичный URL**. Предлагаемая функция `normalizePublicUrl`:

- только HTTPS и production host `daibilet.ru` (www/apex приводятся к одному apex согласно middleware);
- только публичные пути разрешённых семейств;
- удалить fragment, query и стандартный порт;
- декодировать и повторно безопасно кодировать path-сегменты, привести percent-encoding к одной форме;
- схлопнуть повторный `/`, нормализовать завершающий slash по действующей route policy;
- не удалять содержательные slug-суффиксы и не сводить кириллический и латинский slug без подтверждённого redirect/canonical;
- canonical, указывающий за пределы домена или в недопустимое семейство, получает конфликт/UNKNOWN, а не молча включается в локальный подсчёт.

Сначала получить наблюдаемые URL из sitemap и периодического route crawl. Затем разрешить каждый URL, применить HTML canonical и сгруппировать наблюдения по нормализованному canonical. `canonicalUrl` группы — ключ уникального URL; входные source URL, EventPage ID, Event ID и ссылки хранятся как связи, а не как дополнительные строки счётчика.

Не складывать raw `EventPage.isIndexable` и `Event.isIndexable` как SEO-URL: публичное решение вычисляет route policy, публикацию, доступность и canonical. Финальная метрика технической индексируемости берётся из последнего успешного HTML-аудита canonical URL.

## 3. Редакционные счётчики EventPage

Редакционные карточки определяются по статусу публикации EventPage. Технический robots текущего canonical не меняет редакционную группу.

### 3.1. Формулы

```text
isRewrite(page) = page.content.activeEditorialText.status == "ACTIVE_EDITORIAL_REWRITE"
isPublished(page) = page.status == "READY" AND page.publishedAt IS NOT NULL
editorialIndex = isPublished(page) AND page.isIndexable == true
editorialNoindex = NOT editorialIndex
```

Группы, взаимно исключающие и исчерпывающие все EventPage:

| Группа | Предикат | Единица |
|---|---|---|
| С рерайтом + Index | `isRewrite && editorialIndex` | EventPage ID |
| С рерайтом + Noindex | `isRewrite && !editorialIndex` | EventPage ID |
| Без рерайта + Index | `!isRewrite && editorialIndex` | EventPage ID |
| Без рерайта + Noindex | `!isRewrite && !editorialIndex` | EventPage ID |

Здесь **Index/Noindex — редакционный/публикационный флаг EventPage** (`READY + publishedAt + isIndexable`), а не заявка о live robots. UI должен подписать показатель «Статус EventPage» и рядом вывести отдельное техническое здоровье canonical. Два Index не должны выглядеть одним и тем же статусом без пояснения.

Проверки-инварианты:

```text
totalEventPages = count(distinct EventPage.id)
sum(fourGroups) = totalEventPages
rewritten = groupRewriteIndex + groupRewriteNoindex
editorialCoveragePct = rewritten / totalEventPages * 100
```

Нулевой знаменатель даёт `null`/`NOT_AVAILABLE`, не `NaN` и не 0%.

### 3.2. Состав каталога и production-срез

- **Всего EventPage:** `count(distinct EventPage.id)` по полной таблице, включая черновики и страницы без связи с Event.
- **Всего с активным рерайтом:** уникальные EventPage с маркером `ACTIVE_EDITORIAL_REWRITE`.
- **Покрытие каталога рерайтом:** страницы с активным маркером / все EventPage × 100.
- **Редакционные группы:** четыре mutually exclusive группы из §3.1; их сумма равна общему количеству EventPage.

Production-реестр активных рерайтов на `2026-11-27T08:45:43Z` содержит **2 003 уникальные EventPage**. Из них 1 803 имеют редакционный статус `READY + publishedAt + isIndexable` (Index), 200 опубликованы, но `isIndexable=false` (Noindex). Реестр содержит 19 645 строк связей EventPage–Event, поэтому подсчёт должен дедуплицировать по `eventPageId`, а не считать строки или Event. Это датированный срез, не константы API; см. [production-реестр](../../../data/ticketscloud/editorial/all-active-eventpage-rewrites-production-2026-11-27.json). Отдельный live smoke 30 страниц после публикации батча 30 завершён в `2026-11-27T08:50:58Z`: 30/30 HTTP 200, `index, follow`, self-canonical; backend/Next ISR/nginx кэш сброшен, переобход поставлен в очередь. Сводка и проверенные URL: [production smoke](../../../data/ticketscloud/editorial/eventpage-editorial-batch-30-production-smoke-2026-11-27.json). Проверка robots не означает, что URL уже включены в выдачу.

### 3.3. История работы с рерайтом (не счётчик v1)

В первую версию дашборда **не включать показатели новых активаций за 7 и 30 дней**. Их нельзя достоверно получить из текущих `EventPageRevision.createdAt`, `EventPage.updatedAt` или `publishedAt`; показывать нулевые значения также нельзя. После утверждения основного SEO-аудита и отдельного старта реализации начать записывать неизменяемые события editorial lifecycle.

Предлагаемая запись `EventPageEditorialEvent`:

```text
id, eventPageId, eventType, editorialVersion, revisionId?, occurredAt,
activationKind?, previousEditorialVersion?, actorId?, source?, idempotencyKey
```

Минимальные `eventType`:

- `EDITORIAL_REWRITE_ACTIVATED` — переход от отсутствующего/неактивного rewrite к активному;
- `EDITORIAL_REWRITE_VERSION_UPDATED` — новая редакционная версия заменяет активную, страница уже была обработана;
- `EDITORIAL_REWRITE_DEACTIVATED` — текущий rewrite снят/заменён неактивным текстом.

Для `EDITORIAL_REWRITE_ACTIVATED` поле `activationKind` различает `FIRST_ACTIVATION` (для этого EventPage активный rewrite впервые) и `REACTIVATION` (страница уже активировалась ранее, затем rewrite был снят и включён снова). Изменение текста при непрерывно активном маркере записывается как `EDITORIAL_REWRITE_VERSION_UPDATED`, а не как новая первая обработка. Каждое событие содержит идентификатор/версию текста, время изменения, источник и идемпотентный ключ; `revisionId` связывает запись с `EventPageRevision`, когда версия представлена этой моделью. Если текущий apply path не создаёт revision, событие всё равно обязано сохранить устойчивый editorial version key и snapshot/hash по согласованному формату.

Метрика «впервые обработанные EventPage» считает distinct `eventPageId` с `EDITORIAL_REWRITE_ACTIVATED + FIRST_ACTIVATION`; повторная редакция учитывается отдельно как число `VERSION_UPDATED`, повторное включение — как `REACTIVATION`. Историю можно начать только с даты внедрения: для старых активаций backfill допустим лишь при явном архивном timestamp, подтверждённом источником. Иначе прошлый период обозначается `HISTORY_UNAVAILABLE`. При накоплении достаточной истории владелец отдельно решит, нужны ли темпы за 7/30 дней.
### 3.3. Динамические фильтры и списки

Счётчики загружаются серверной выборкой из БД и кликабельны. Клик ведёт на список EventPage с сохранёнными query-параметрами:

- `editorialGroup=rewritten-index|rewritten-noindex|plain-index|plain-noindex|all`;
- `cityId` (фильтр по городу связанного Event; без связи — отдельный bucket «город не указан»);
- `offerState=available|none|unknown`;
- `publicationStatus=draft|ready-unpublished|published|all`.

В одну EventPage могут быть связаны события разных городов и с разной доступностью. Для фильтра города UI/API должен требовать `cityId` конкретного связанного Event либо явно задавать правило «есть хотя бы один связанный Event в городе». Для актуальности предложения — **есть хотя бы один** связанный Event с валидным доступным offer/session, а не все связанные Event. Несвязанные EventPage показывать отдельно; UNKNOWN не приравнивать к отсутствию предложения.

Число рядом с каждым фильтром вычисляется по пересечению всех активных фильтров из того же backend query, чтобы кликнутый список и badge совпадали. Пагинация cursor-based или bounded offset; не грузить полный каталог в браузер.

`dataAsOf` — время DB-агрегации. Рядом отображать `sourceSyncAsOf` и состояние последней синхронизации, если доступно. Счётчик не должен скрывать неполные данные текущего запуска: при незавершённой/ошибочной синхронизации показывать `STALE`/`PARTIAL` и время последней успешной синхронизации.

## 4. Блок «SEO-здоровье каталога»

Источник — сохранённый результат периодического HTML-аудита, а не пересчёт HTML при открытии админки. Аудит проверяет действующие публичные маршруты и sitemap на ограниченной скорости; URL нельзя считать проиндексированным только из-за robots/sitemap.

| Метрика | Определение и формула | Единица / источник |
|---|---|---|
| Уникальные индексируемые canonical URL | `count(distinct normalized canonicalUrl)` для URL со свежим успешным HTML-проверочным статусом, HTTP 200 (или явно разрешённый конечный ответ), без `noindex` в meta и `X-Robots-Tag`, canonical self после нормализации, без route conflict | canonical URL; audit snapshot + canonical groups |
| Indexable canonical отсутствует в sitemap | Уникальные canonical URL из первой строки, которых нет в последнем успешно прочитанном/распарсенном sitemap inventory | canonical URL; аудит sitemap сопоставлен с canonical group |
| `noindex` в sitemap | Уникальные sitemap loc, для которых последний успешный HTML ответ содержит noindex либо конечный robots header запрещает индексирование | нормализованный URL, не число sitemap loc до dedupe |
| Canonical conflict | Уникальные проверенные source URL с разными canonical target при одинаковом подтверждённом entity/group identity, canonical loop, невалидном target, либо взаимоисключающем HTML/header | URL конфликтной группы; audit findings |
| Дубли/ошибки группировки | Отдельные findings по подтверждённым identity/group collisions; не считать повторные `Event`/`EventSession` дубликатами URL без проверки публичного group key и canonical | finding/group key, плюс список связанных URL; audit findings |
| Публичные URL без актуального предложения | Уникальные canonical URL, связанные с route/API entity, где все относящиеся к этому предложению sessions/offers просрочены/отменены/исчерпаны и sync health свежий/успешный | canonical URL, live DB + sync snapshot; если sync старый/идёт — `UNKNOWN`, не `NO_OFFER` |
| Индексируемые URL без входящих внутренних ссылок | Уникальные подтверждённые indexable canonical, для которых crawler не нашёл ни одного внутреннего HTML href из включённого crawl scope | canonical URL; HTML crawl graph + canonical map |
| URL с неизвестным/устаревшим статусом | Уникальные URL, у которых нет успешной проверки, возраст последней проверки больше TTL, crawl завершился частично либо robots/canonical не удалось извлечь | normalized source/canonical key где известен; audit metadata |

### 4.1. Уникализация и пары URL

Хранить наблюдаемые source routes отдельно от canonical сущностей. Sitemap membership относится к source URL, а не автоматически ко всем алиасам группы. Если два sitemap loc canonicalize на один target — это две наблюдаемые URL, но одна canonical-сущность; отдельный duplicate finding может отметить лишние loc. При подсчёте уникальных индексируемых страниц canonical group учитывается один раз. Таблица drill-down показывает все observed source URLs, старый Event URL и stable EventPage URL, их robots и role.

По аудиту от 27.11: из 3 190 EventPage stable URLs все были noindex и отсутствовали в sitemap; 3 189 имели отдельный старый canonical, допускающий индексацию; 2 639 старых canonical были в sitemap и 551 не были. Это не даёт права считать 551 `noindex`, не доказывает их live HTTP/robots всем набором и не устанавливает поисковую индексацию. Конфликтная EventPage с двумя public groupKey остаётся отдельным finding, а не автоматически двумя событиями или двумя новыми страницами.

### 4.2. Актуальность snapshot и sync window

Каждый audit run сохраняет `startedAt`, `completedAt`, `status`, `scope`, `totalDiscovered`, `checked`, `failed`, `sitemapFetchedAt`, `crawlerVersion`, `sourceSnapshotAt`/sync watermarks. Счётчики показывают `lastSuccessfulAuditAt` и coverage `checked/total`.

Рекомендуемый initial TTL: sitemap и HTTP robots/canonical — 24 часа; internal-link graph — 7 суток; предложения — брать из live DB и отдельно сообщать возраст последнего успешного supplier sync. Это конфигурация, которую нужно подтвердить по длительности ночных синхронизаций и rate limits. Запуск нового полного crawl не должен блокировать API дашборда. Начинать crawl после завершения всех ожидаемых sync jobs плюс стабилизационный интервал; при sync RUNNING/FAILED snapshot помечать `PARTIAL`/`STALE`, не публиковать новые отрицательные классификации.

Для проблемного/обновлённого URL возможен ручной ограниченный recheck по URL, с rate limit и очередью. UI-кнопка не инициирует массовый обход.

## 5. Поисковые системы

На текущую дату интеграция/доступ к кабинетам в рамках аудита не подтверждены. Значения для обеих систем должны быть nullable и иметь явный статус:

```ts
type SearchMetrics = {
  status: 'AVAILABLE' | 'NOT_CHECKED' | 'STALE' | 'ERROR';
  provider: 'YANDEX_WEBMASTER' | 'GOOGLE_SEARCH_CONSOLE';
  checkedAt: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  indexedPages: number | null;
  excludedPages: number | null;
  impressions28d: number | null;
  clicks28d: number | null;
  previousImpressions28d: number | null;
  previousClicks28d: number | null;
  deltaImpressionsPct: number | null;
  deltaClicksPct: number | null;
};
```

Если нет валидного свежего импорта/API результата: `status=NOT_CHECKED`, все числа `null`, UI пишет «Не проверено». Ноль разрешён только как фактический ноль в полном успешном выгрузе соответствующего периода. Динамика: `(current - previous) / previous * 100`; при `previous=0` вернуть `null` и отдельное состояние `NO_BASELINE`, не бесконечность.

Будущая интеграция — отдельный ingestion job для Google Search Console и Яндекс Вебмастера, сохраняющий provider/date range/property/query/page dimensions, импортированные агрегаты и статусы. Не вызывать поисковые API на каждый просмотр админки. Оператор `site:` и crawlability не являются заменой.

## 6. Предлагаемая архитектура и источники

### 6.1. Live DB агрегаты

Read-only backend query по `EventPage`, с JSON marker `content.activeEditorialText.status`, status/publication fields, связями `EventPageEvent` → Event, City, EventSession, EventOffer и состоянием `SourceSyncRun`. Возвращать агрегаты и paginated drill-down; не загружать весь Event/Page текст. Индексы добавлять только после EXPLAIN на реальном query; существующие `EventPage(status,isIndexable)`, `EventPage(updatedAt)`, `EventPageEvent(eventPageId,role)`, `EventSession(eventId,isActive,startsAt)`, `EventOffer(eventId,active,priceRub)` уже покрывают часть выборок.

Для proposal eligibility переиспользовать действующий runtime/business policy для будущих сессий и open-date предложения, а не заводить новую упрощённую проверку в админке. Если policy не возвращает достоверный ответ или sync stale — статус `UNKNOWN`.

### 6.2. Сохранённый технический аудит

Минимальные таблицы/модели при реализации:

```text
SeoAuditRun
  id, scope, status(RUNNING|SUCCESS|PARTIAL|FAILED), startedAt, completedAt,
  sitemapFetchedAt, sourceSyncWatermark, crawlerVersion, discoveredCount,
  checkedCount, failedCount, errorSummary

SeoUrlObservation
  id, auditRunId, normalizedUrl UNIQUE PER RUN, sourceUrl, canonicalUrl NULL,
  httpStatus NULL, finalUrl NULL, robotsMeta NULL, xRobotsTag NULL,
  inSitemap BOOLEAN/UNKNOWN, lastInternalLinkAt NULL,
  offerState(AVAILABLE|NONE|UNKNOWN), checkedAt NULL, errorCode NULL

SeoUrlEntityLink
  auditRunId, normalizedCanonicalUrl, entityType, entityId, relation(PRIMARY|LEGACY|ALIAS)

SeoAuditFinding
  auditRunId, findingType, normalizedUrl NULL, groupKey NULL, severity, details JSON
```

Объём и хранение результатов определить после первого полного crawl. Не дублировать полное содержимое HTML. Один `SeoAuditRun` фиксирует атомарный снимок; UI читает только последний `SUCCESS`/допустимый `PARTIAL`, не смешивая строки разных запусков. Для URL с `UNKNOWN` сохранять причину и прошлое известное состояние отдельно.

### 6.3. Что требует schema change

- **Для editorial history после отдельного согласования:** append-only lifecycle events, описанные в §3.3; они не требуются для первичной реализации счётчиков и не включают автоматическое отображение 7/30-day counts.
- **Нужно, если нужен исторический/периодический SEO dashboard:** таблицы audit run/URL/finding либо эквивалентное durable storage. Текущие sitemap и runtime не хранят историю состояния.
- **Нужно для интеграции поисковиков:** provider import run + агрегированные page/day metrics, credentials только через безопасную конфигурацию runtime, не в БД-таблицах и не в репозитории.
- **Не нужно:** поле `seoStatus` на EventPage для технической crawl-истины. Оно будет смешивать редакционный флаг и динамические robots/canonical. Не добавлять такое поле для реализации этой спецификации.
- **Не менять сейчас:** `EventPage.isIndexable`, публикацию, route policy, canonical и Prisma schema.

## 7. API-контракты (предложение)

Все endpoints под текущей admin auth/basic-auth и версионированием API, без выдачи raw provider secrets.

### 7.1. Сводка

```http
GET /api/admin/seo/dashboard?cityId=...&offerState=...&publicationStatus=...
```

```json
{
  "dataAsOf": "2026-11-27T08:00:00.000Z",
  "sourceSync": { "status": "SUCCESS", "lastSuccessfulAt": "...", "isStale": false },
  "editorial": {
    "totalEventPages": 0,
    "rewrittenTotal": 0,
    "coveragePercent": 0,
    "groups": {
      "rewrittenIndex": 0,
      "rewrittenNoindex": 0,
      "plainIndex": 0,
      "plainNoindex": 0
    }
  },
  "technicalSeo": {
    "status": "NOT_CHECKED",
    "lastSuccessfulAuditAt": null,
    "coverage": { "checked": 0, "discovered": 0 },
    "uniqueIndexableCanonicals": null,
    "indexableMissingFromSitemap": null,
    "noindexInSitemap": null,
    "canonicalConflicts": null,
    "groupingFindings": null,
    "publicUrlsWithoutCurrentOffer": null,
    "orphanIndexableCanonicals": null,
    "unknownOrStaleUrls": null
  },
  "search": {
    "yandex": { "status": "NOT_CHECKED", "indexedPages": null },
    "google": { "status": "NOT_CHECKED", "indexedPages": null }
  }
}
```

Поля в примере показывают форму ответа, а нулевые placeholders не являются рабочими значениями. Production API вычисляет редакционные числа из live БД, а технические метрики берёт из последнего сохранённого audit run; при отсутствии проверенного результата возвращает `null` вместе с `NOT_CHECKED`/`STALE`.

В API v1 не возвращать счётчики 7/30 дней активации рерайта. Историю сначала начать записывать отдельной задачей; после накопления достаточного периода владелец решит, добавлять ли такие метрики в API/UI.

### 7.2. Drill-down EventPage

```http
GET /api/admin/seo/event-pages?editorialGroup=plain-noindex&cityId=...&offerState=available&publicationStatus=draft&cursor=...&limit=50
```

Ответ: `items[]` с `eventPageId`, title/slug, publication status, rewrite marker boolean, editorial index boolean, связанный city/offer filter summary, normalized current candidate URL, canonical URL и **происхождение/дата** canonical evidence (audit snapshot либо `NOT_CHECKED`); `nextCursor`, `total` для действующих фильтров и `dataAsOf`. Technical fields не выводить как свежие, если audit stale. При выборе редакционной группы строки остаются EventPage-единицами; для каждой показывать текущую публичную canonical сущность и её URL-level состояние, включая случаи, когда stable EventPage `noindex`, а старый canonical `indexable`.

### 7.3. Drill-down canonical groups/findings

```http
GET /api/admin/seo/urls?finding=NOINDEX_IN_SITEMAP&cityId=...&cursor=...&limit=50
GET /api/admin/seo/audits/latest
GET /api/admin/seo/audits/{auditRunId}/findings?type=CANONICAL_CONFLICT&cursor=...
```

Этот список — **URL-level**, одна строка на уникальный normalized canonical, а не список EventPage. URL row: `normalizedCanonicalUrl`, sitemap membership, HTTP status/effective robots/self-canonical для canonical target, last checked, freshness, finding codes. Раскрываемые `entities[]` показывают все связанные EventPage и Event; для каждой пары вывести stable EventPage URL и её собственные publication/robots/canonical, роль `CURRENT|LEGACY|ALIAS`, связь с общим canonical и собственный HTTP/sitemap status, если он наблюдался. Так клик по URL-счётчику показывает старый индексируемый canonical и noindex EventPage рядом, а клик по редакционной карточке ведёт к списку EventPage с этой же диагностикой. Для поисковых систем — только imported provider metrics с property/date range.

### 7.4. API инварианты

- SQL `COUNT(DISTINCT normalizedCanonicalUrl)` после canonical resolution для URL metrics.
- Список использует те же predicate builders, что и badges.
- `UNKNOWN`, `NOT_CHECKED`, `STALE`, `PARTIAL`, `ERROR` — явные enum values; nullable numeric metrics не превращать в нули.
- Все временные поля ISO-8601 UTC; UI локализует время.
- Предел страницы, timeout, auth и audit event logging соответствуют текущим admin API convention.

## 8. Структура интерфейса

Новая вкладка/страница «SEO-мониторинг» рядом со списком EventPage после двух gates: (1) владелец завершил текущую работу по рерайтам и проверке их индексируемости; (2) четыре остальных артефакта основного SEO-аудита завершены и reviewed:

1. **Обновление данных:** «Редакционные данные на …», состояние и время последней успешной синхронизации; «Технический аудит на …», покрытие и status последнего run.
2. **EventPage — редакция:** карточки Total, с активным рерайтом и покрытие. В первой версии нет счётчиков активаций за 7/30 дней. Ниже четыре кликабельные группы. Клик открывает соответствующий отфильтрованный EventPage list; в каждой строке видны EventPage и текущая связанная canonical URL сущность с раздельными состояниями. Группы суммируются в Total.
3. **SEO-здоровье URL:** unique indexable canonical, missing from sitemap, noindex-in-sitemap, canonical conflicts, grouping findings, no-current-offer, orphan, unknown/stale. Каждая карточка открывает URL inventory, отфильтрованный тем же predicate и auditRunId. На строку — один unique canonical; раскрытие показывает связанные EventPage/Event и собственные состояния старого/stable URL.
4. **Поисковые системы:** две отдельные панели Google и Яндекс со статусом, диапазоном 28 дней, indexed/excluded/impressions/clicks и сравнением; `NOT_CHECKED` виден явно.
5. **Фильтры:** город, offer state (`AVAILABLE|NONE|UNKNOWN`), publication status, editorial group, audit freshness. Query state сохраняется при переходе и возврате из детали.

Цвет и подписи различают `Index EventPage` и `HTTP indexable canonical`; не называть оба показателя просто «Index». Для migration case показать старый URL как текущую каноническую сущность и stable slug как неопубликованный/неиндексируемый кандидат, а не как потерянную SEO-страницу.

## 9. Периодичность и кэш

| Данные | Обновление | Кэш/UI |
|---|---|---|
| EventPage publication/rewrite marker/group membership | Live SQL при открытии summary; краткий cache 1–5 минут или revalidate после admin mutations | `dataAsOf`; exact filtered counts; не читать из browser cache дольше 5 минут |
| Session/offer state | Live DB read model либо bounded aggregate с cache 1–5 минут; source sync watermark отдельно | При sync в процессе/ошибке пометка stale/unknown; не менять SEO-статус |
| Sitemap + HTML robots/canonical/HTTP | Периодический crawler, ежедневно после завершения ночных sync jobs; limited concurrency; partial retry очередью | Дашборд читает последний завершённый snapshot; не запускает crawl сам |
| Internal link graph | Вместе с crawler, полный crawl ежедневно/еженедельно после оценки стоимости; инкрементальный по изменённым маршрутам опционально | Показать `lastSuccessfulAuditAt` и scope/coverage |
| Yandex/GSC | Отдельный import job после подтверждения доступа/API limits, ежедневно или еженедельно согласно API | Кэшированный сохранённый provider period; при отсутствии credentials — `NOT_CHECKED` |

Первые технические TTL предложены, но требуют нагрузочного пилота. Audit run атомарно становится «последним» только после успешного завершения; частичный run доступен для диагностики, но не должен перезаписывать последнюю полную успешную сводку.

## 10. Оценка трудоёмкости

Оценка для разработчика, без срока ожидания API-доступов; диапазоны уточнить после первого read-only spike:

| Этап | Объём | Оценка |
|---|---|---:|
| 0. Read-only spike: EventPage query, rewrite marker, URL normalization, offer policy, объем/EXPLAIN | подтвердить определения и не блокировать DB | 2–3 дн. |
| 1. Редакционные агрегаты + фильтруемый EventPage list API/UI | 4 группы, total/coverage, фильтры, timestamp | 3–5 дн. |
| 2. История editorial lifecycle | append-only events, idempotency, различение первой активации, обновления версии и повторной активации | 2–4 дн.; не входит в счётчики v1 и не backfill-ится без источника |
| 3. SEO audit persistence + scheduler/crawler + canonical grouping + links | rate-limited crawler, sitemap parser, partial runs, findings, retries | 5–9 дн. |
| 4. SEO API/read-model + dashboard/drill-down | URL unique counts, stale/unknown semantics, UI | 4–6 дн. |
| 5. Search-provider ingestion, если доступ/подключение одобрены | Яндекс + GSC отдельно, mapping/quotas/backfill | 3–6 дн. |
| 6. Проверка на staging, нагрузка, ночное sync окно, security/ops | без SEO policy changes | 2–4 дн. |

Итого без поисковых интеграций ориентировочно **18–31 человеко-день**; с двумя источниками поисковой статистики **21–37**. Параллельная работа над crawler и UI возможна после согласования DTO/схемы. Это не план production deployment.

## 11. План внедрения без влияния на SEO

1. Дождаться завершения владельцем текущей работы по рерайтам и проверки их индексируемости. Зафиксировать результат и актуальный production-срез.
2. Завершить четыре остальных артефакта полного SEO-аудита: инвентаризацию публичных URL/canonical, аудит 551 URL вне sitemap, фактическую индексацию Яндекса/Google либо явный `NOT_CHECKED`, приоритетный backlog. Связать результаты одной датой/snapshot и пройти review.
3. После review согласовать public route families, canonical normalization, правило актуального предложения, внутренние ссылки и freshness thresholds по фактическим данным аудита.
4. Отдельно утвердить реализацию v1: четыре редакционные группы, total/coverage, уникальные indexable canonical, sitemap/canonical findings из сохранённого аудита и дата последней успешной проверки.
5. Определить оба уровня drill-down: редакционная группа ведёт к списку EventPage; SEO URL-card ведёт к URL inventory с одной строкой на уникальный canonical. Раскрытие URL показывает старый адрес и stable EventPage URL с отдельными robots/canonical/publication состояниями.
6. В рамках отдельно согласованной реализации начать сохранять editorial lifecycle events. Счётчики 7/30 дней в v1 не входят.
7. Запустить плановые audit runs после завершения ночной синхронизации; сначала shadow mode, сверить coverage, ошибки и UNKNOWN/STALE/partial состояния при ограниченной concurrency.
8. После накопления истории отдельно решить, нужны ли в админке показатели FIRST_ACTIVATION, VERSION_UPDATED и REACTIVATION.
9. Подключать поисковые API только после отдельного подтверждения credentials, scope, лимитов и хранения; до этого показывать `NOT_CHECKED`.
10. Пройти staging и read-only production smoke дашборда. После выполнения обоих gates применять v1 к production через обычный релизный процесс. Изменение текущей indexability policy, публикации, canonical, redirect или sitemap оформлять отдельным решением и выпуском.
## 12. Ограничения и критерии готовности спецификации

- Редакционные метрики EventPage и технические canonical URL разделены.
- Для каждой метрики указана единица, predicate, источник, дата свежести и поведение UNKNOWN.
- URL дедуплицируются по canonical после нормализации; Event/EventSession не считаются самостоятельными страницами.
- Старые canonical URLs учитываются отдельно от EventPage; EventPage noindex не отображается как потерянная SEO-страница, если старый URL остаётся индексируемым.
- Фактическая поисковая индексация отделена от разрешения robots и sitemap; без данных кабинета показано `NOT_CHECKED`.
- Активация rewrite не выводится из `updatedAt`/`publishedAt`; при отсутствии истории сроковые счётчики имеют недоступный статус.
- Технические проверки выполняются периодически, чтение дашборда не вызывает полный crawl.
- Спецификация подготовлена без изменений admin UI, backend API, Prisma schema, SEO flags или production.

## Приложение: место в наборе артефактов SEO-аудита

Обновлённое исходное ТЗ требует **пять артефактов**: четыре результата полного audit run (`seo-existing-urls-audit.csv`, `seo-missing-sitemap-audit.csv`, `seo-indexation-report.md`, `seo-priority-backlog.md`) и этот пятый артефакт — спецификацию SEO-счётчиков админки с разделением редакционной статистики EventPage и индексируемости уникальных публичных URL. Четыре остальных артефакта должны быть связаны с единым timestamp/snapshot и остаются результатами полного технического SEO-аудита.

Критерий завершения общего аудита, пункт 8: «Подготовлена спецификация SEO-счётчиков админки с разделением редакционной статистики EventPage и индексируемости уникальных публичных URL.»

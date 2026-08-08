# qa.md — открытые вопросы

## 2026-08-08 - Catalog Worker + Redis transport — LOCKED scope (Redis deferred)

**LOCKED owner (sync 2026-08-09):**

| Слой | Статус |
|------|--------|
| **Disk worker INC.504.5c** | **сейчас** = systemd + shared disk v2. Канон **уже в репо** (не «с нуля»): `deploy/systemd/daibilet-catalog-dto-rebuild.service` + `.timer`, `deploy/cron/rebuild-public-catalog-dto.sh`. Live MSK: timer **active**, unit files under `/opt/daibilet/deploy/systemd/` (oneshot service idle между тиками - норма). |
| **Redis INC.504.5d** | **deferred** до стабилизации disk-worker. **Не** деплоить Redis сейчас. |

**Приоритет транспорта:** Redis (target) > Shared Disk (**live**) > Streaming (**rejected**).

**Future Redis canon sketch (later):**
1. Worker → gzip JSON в Redis: keys `catalog:sessions`, `catalog:indexes` + `catalog:updated_at`.
2. Main API: read Redis → in-memory Soft-SWR.
3. Алерты (см. thresholds ниже).

**Alerts (proposed thresholds until measured - 2026-08-09):**
- **P1 freshness:** disk mtime / `catalog:updated_at` older than **20–30 min** → critical (SLA до калибровки).
- **P2 worker crash:** systemd unit/timer failed / consecutive oneshot non-zero exit.
- **P3 empty/tiny artifact:** near-zero bytes **или** sessions count **<<** last-good (proposed: **&lt;50%** of last-good / near-empty).

**Read-only MSK check 2026-08-09:** Redis **нет** (`redis-cli` absent; no redis/valkey systemd units; no docker redis/valkey). Перед INC.504.5d: **новый isolated Redis** (reuse невозможен) - открытый ops-вопрос (кто ставит / sizing), не product fork.

## 2026-08-08 - Buyer LK / refunds / Stage 2+ — LOCKED out of Stage 0

**LOCKED owner 2026-08-09:**
- Auto refunds / self-serve refund UI - **out of scope Stage 0**.
- Stage 0 buyer support = **только mailto** `hello@daibilet.ru` (manual ops).
- Stage **2+** product note (**не implement сейчас**): когда появится модель единого ваучера - partial refund by **slot**, slot replace + surcharge; нужны voucher↔slot lifecycle, money/refund/surcharge, ops audit.

См. [museum-contract-readiness.md](./museum-contract-readiness.md) § Stage 2 outline / Out of scope Stage 0.

## 2026-08-08 - Supplier taxonomy / commercial modes (LOCKED draft, owner)

Контекст: [museum-contract-readiness.md](./museum-contract-readiness.md).

**LOCKED draft (owner 2026-08-08):**
1. **Supplier ≠ только музей** - площадка/организатор разных типов (музеи, арт-пространства, театры, фестивали и др.).
2. Два коммерческих режима:
   - **Линейная / открытая дата** (`OPEN_DATE` / open-date / admission) - вход без фиксированного сеанса; в первую очередь музеи и арт. = **Stage 0**.
   - **События / сеансы** (`EVENTS` / scheduled-events) - разовые или recurring (regular/irregular) в периоде; категории+цены per session/event. = **Stage 1**.
3. Stage 0 формулировка: «первый договор с open-date поставщиком (музей/арт)», не «только музей forever». Scope Stage 0 **не** расширять в event scheduling.

Открыто: какой именно первый open-date контрагент (музей vs арт) - см. § ниже п.6.

## 2026-08-07 - Museum-1 / Stage 0 first open-date contract (открыто, owner)

Контекст: [museum-contract-readiness.md](./museum-contract-readiness.md). Stage 0 = Path A open-date / linear admissions до первого договора (музей или арт; не events).

1. **54-ФЗ / fiscal:** на Stage 0 чек от Daibilet в режиме SINGLE_MERCHANT - OK, или нужна другая схема до live money?
2. **Формат `ticketNumber`:** генерирует Daibilet (наш id) или площадка задаёт/импортирует внешний код до сканера?
3. **Scanner day-1:** достаточно печатного номера + кода заказа для ручного контроля на входе, или scan API обязателен до подписания?
4. **Email production:** канон SMTP на MSK web (`SMTP_*`) или письма с finance `.159`?
5. **Support phone на билете:** единый номер Дайбилет vs телефон конкретного поставщика в supplier DTO?
6. **Первый open-date договор:** музей или арт-пространство? какой venue/город/slug для seed template (controlled, не wide CTA)?
7. **Возвраты до Stage 2:** ✅ **LOCKED** - только ops manual + Stage 0 buyer mailto; Self-refund / voucher→slot - **не** Stage 0 (см. § Buyer LK / refunds выше).

Связанные gaps (не новые product forks): order≠ticket issuance; webhook e2e; reconcile; supportPhone в public DTO; purchases-by-email - см. ниже и readiness Stage 0 checklist.

## 2026-08-07 - Order code ≠ ticket number (LOCKED draft)

**LOCKED draft (owner 2026-08-07):** `CheckoutOrder.publicCode` = **код заказа** (buyer support / payment). **Номер билета** музея / площадки - отдельная сущность; сегодня отдельного id нет, UI временно показывает тот же `publicCode` с подписью, что до issuance они совпадают / номер «будет выдан при подключении сканера музея».

**Не** считать collapse к одному числу product end-state. Issuance path A/B (кто выдаёт ticket id, когда пишем в order/ticket row) - follow-up, не блокер текущего UX.

## 2026-08-07 - Buyer ticket fields / finance enrichment gaps

Catalog ticket card soft-fail показывает поля из create response + cache + product/venue enrich. Для reopen без localStorage / полного public order DTO нужны на finance:

| Field | Create STUB today | Public order lookup | Notes |
|-------|-------------------|---------------------|-------|
| buyer.name | ✅ | ? soft | |
| venueTitle | ✅ subject | ? | |
| venueAddress | ❌ | ❌ | catalog venue enrich interim |
| validTo / validityMode | product ✅; order ❌ | ❌ | open-date ticket needs order snapshot |
| item(s) title+qty | ✅ single `item` | ? | multi-line `items[]` later |
| supplierSupportPhone | ❌ public supplier | ❌ | hide until present |
| session startsAt | null open-date | ? | |

## 2026-08-07 - Must-see hub volume (LOCKED)

**LOCKED owner 2026-08-07** (см. [Project.md](./Project.md) § Must-see count tiers):

| Слой | Target |
|------|--------|
| Moscow + SPB hubs | ~**200** точек в хабе (must-see / places layer) |
| Other cities (top-8 start) | ~**50** на старте, потом посмотрим; **не** capitals-wide |

**Факт сейчас:** SPB ~184 (near); Moscow ~58 (gap ~142 к 200); other top-8 - floor/large mixed (старый ориентир 12-18 снят).

**Не путать:** sync / `CANDIDATE` Venue count **≠** hub count. Хаб = curated `mustSee` (+ suburbs / nested places по канону), не дамп кандидатов из синка.

Открыто только execution: список/batch для MSK grow и top-8 →50; seed/apply prod - по запросу.

## 2026-08-06 - CI deploy secrets — ЗАКРЫТО (✅ 2026-08-09)

**LOCKED owner 2026-08-09:** GitHub repo secrets для workflow `Deploy MSK web` **уже настроены** (`MSK_SSH_HOST`, `MSK_SSH_USER`, `MSK_SSH_KEY`; опц. widget tokens). Значения secrets в git/chat **не** дублировать.

«Выкатывай» = Actions → Deploy MSK web → Run workflow.

## 2026-08-05 - Deploy cadence (закрыто)

Owner: основная работа локально / preview; агенты **commit + push** после итерации; **MSK web deploy** - пачкой раз в сутки или по явному запросу («выкатывай»). Исключения сразу: live 500, критичный хаб-редирект, security, launch-blocker без локальной проверки. Seed/apply prod DB - по запросу или в batch. Зафиксировано в `.cursorrules` + [Project.md](./Project.md).

## 2026-08-05 - Editorial places → catalog — ЗАКРЫТО (LOCKED 2026-08-09)

Контекст: `cityInfo.mustSee`, nested POI пригородов, stops пресетов и упоминания в статьях раньше могли оставаться inline без системного `Venue` (широкий СПб: только ранний seed имел public entity).

**LOCKED owner 2026-08-09** (контракт подтверждён; pointer: [Project.md](./Project.md) § City hub / editorial seed):

1. **Единый identity/seed-flow:** каждая публикуемая самостоятельная точка в открытом catalog обязана иметь валидную пару **`catalogSlug` + `family/kind`**. Создание/обновление `Venue` - **только** через единый **idempotent seed**. Если точка в статье / пресете (stops) / mustSee - редакторский интерфейс сначала сидит Venue, получает UUID/ID, потом линкует. Публикация «сырого» инлайна без системного Venue **запрещена** (цель: исключить inline-точки).

2. **Минимальный набор до Publish:** до `published` редакция обязана заполнить:
   - Canonical Name (локализованное официальное название);
   - Coordinates (lat/lng) - строго обязательны для стандартных точек (исключения - п.3);
   - Address (текст и/или геокодер; для природных - описание локации);
   - `family/kind` (иконка + фильтры);
   - lifecycle точки: **Active** / **Temporarily Closed** / **Permanently Closed**.

3. **`CANDIDATE` без координат:** на черновике/парсинге - можно. Публикация на прод в таком виде **ограничена**. Если сущность всё же выводится: **авто-off** CTA «В маршрут» и любых навигационных действий (без координат трек невозможен).

4. **Nested POI пригородов (гибрид; СПб: Петергоф, Пушкин, Кронштадт…):**
   - мини-destination верхнего уровня → полноценная Venue (`Region`/`District` или Park Complex);
   - nested POI (mustSee / статьи / пресеты) → самостоятельный Venue;
   - связь: **`parent_venue_id`** к родителю;
   - мелкие объекты без ценности для маршрутов → только текст в родительской карточке.

**Открыто по теме:** только execution (enforcement в admin/seed UX, backfill legacy inline, schema `parent_venue_id` / lifecycle labels если ещё нет в Prisma) - не product fork.

## 2026-08-02 - My-day: QR билетов в поездке

Блок «Ваши билеты в этой поездке» показывает отмеченные `ticketBought` стопы + deep-link. **QR-коды и тайминги из реальных заказов Дайбилет** требуют auth + orders API на public web - пока `qrAvailable=false` (shell). Когда готов endpoint - hydrate QR сюда.

## 2026-08-02 - Location vs Venue / антидубли (канон зафиксирован)

Канон: [catalog-location-venue-canon.md](./catalog-location-venue-canon.md). Краткий pointer: [Project.md](./Project.md) § Location vs Venue.

**Закрыто owner:** локация = парки/набережные/памятники/улицы; venue = афиша + institution. **Музеи и арт-галереи всегда Площадки** (даже только-инфо, без договора) - блок хаба. Одна точка = одна карточка; локация→venue = upgrade / hide+301, не twin PUBLISHED.

**LOCKED 2026-08-07 (owner OK, option A):** URL-семейство от **kind/role**, не от наличия билетов. Музей/театр/зал без афиши → всё равно `/venues`, buy-chrome скрыт до offers/sessions. Достопримечательности / парки / причалы / гастро-как-day-point → `/locations`. **Не** переносить «пока нет билетов» временно в `/locations`. Commerce влияет только на UI chrome. Три оси: `kind`→URL, `offers`→chrome, `pageStatus`→модерация. Nav **V1** (пункт `/locations` в primary). Единый `/places` - deferred. Rename лейбла → «Места и точки сбора» = follow-up (UX.LOC3), не блокер IA.

## 2026-08-01 - UX: Locations + mobile catalog — ЗАКРЫТО (часть; LOCKED 2026-08-07)

Контекст: [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md). Задачи UX.LOC* в Tasktracker.

1. **Лейбл `/locations`:** ✅ target **«Места и точки сбора»** (follow-up UX.LOC3; сейчас «Локации» ok до rename).
2. **Nav:** ✅ **V1** - оставить в primary nav (не demote в footer / только city hub). UX.LOC8 / PH2.LOC1 decision locked.
3. **Default city:** ⏳ «Все города» ok vs first-visit city gate - ещё открыто (не блокер family).
4. **Гео suggest (IP/GPS):** ⏳ confirm vs silent - ещё открыто.
5. **Список `/locations`:** ✅ SEO-контентные без афиши **да** (VK.8); family ≠ ticket gate. Institution без tickets остаётся `/venues`.
6. **Единый `/places`:** ✅ **рано / deferred** (UX.LOC9 / PH2.PLC1).

## 2026-07-31 - Location↔Excursion linking — ЗАКРЫТО (LOCKED 2026-08-09)

**LOCKED owner 2026-08-09** (см. канон ниже + [Project.md](./Project.md) § Location↔Excursion):

1. **NEARBY_HUB / START:** отдельный сложный контент-флоу **не нужен**. MVP-расширение:
   - модель: явный линк `Event.venueId` (или `RouteItem.venueId`);
   - **START:** первой точке пресета (`index: 0`) автоматически логическая роль START; отдельный контентный флаг не нужен;
   - **NEARBY_HUB:** не хардкод в админке; динамический расчёт client/backend: geo «Рядом» (координаты Venue) + `Event.venueId`. Если `family: transport` (вокзал, причал, метро) и в радиусе доступности от старта/финиша - подтягивается динамически.

2. **Гео-пороги:** default **300м** для плотного центра. Нужен **city-specific** radius в конфиге города (`cityInfo` словарь радиусов). Default: 300м. Мегаполисы / распределённые: **СПб 400м**, пригороды СПб **600м** (парки/набережные/Пушкин/Петергоф: хаб/парковка часто 500–700м).

3. **Счётчик на карточке:** два отдельных счётчика на превью **нельзя** (UI overload). Агрегат: один «индекс активности» или вкладки внутри карточки. Превью: суммарно, с акцентом на тип (парк-дестинация: «Включает X событий и входит в Y маршрутов»). Если только одно число: **`stopEventCount`** (маршрутная включённость ценнее для каталога).

4. **Заполнение STOP для топ-экскурсий (гибрид):**
   - seed script: авто geo-match (остановка экскурсии ↔ Venue в радиусе **100м**) при миграции/новом городе;
   - admin form: редакторы валидируют; для **новых** экскурсий связь строго вручную (плотные POI → ложные матчи);
   - external import: поля `venueId` в API/файле партнёра; если передан - валидация ID, **без** авто-матчинга.

**Открыто по теме:** только execution (`cityInfo` radii dict, copy агрегата, LE.7 контент STOP) - не product fork.

## 2026-07-31 - Venue kinds: park / monument + park admission (открыто)

1. **Типы локаций `PARK` / `MONUMENT`:** ✅ добавлены в Prisma `VenueKind` + public slugs `park` / `monument` (каталог `/locations`, admin, infer). Секция city hub: предпочтение **«Важные места»** (не «Важные локации») - UX copy отдельно, не блокер kinds.
2. **Платный вход в парк (admission):** ⏳ **осознанно НЕ в MVP catalog mix.** Пример: Монрепо (Выборг) - вход опционально платный. Не добавлять park admission в catalog/finance/projection, пока нет отдельного product decision. Future: admission product kind / supplier LC для park entry - после museum admission стабилизации.

## 2026-07-31 - Location↔Excursion linking (канон; sync LOCKED 2026-08-09)

1. **MVP источник правды:** явные `EventVenueRouteItem` (`role=STOP`, таблица `event_venue_route_items`) в admin. SEO-программа и витрина «включают это место» - только из pivot.
2. **`Event.venueId`:** только точка старта / primary venue. Не заливать stops в `venueId`. Логический **START** пресета = `index: 0` (без отдельного контент-флага). **NEARBY_HUB** - динамика geo + transport family, не admin hardcode.
3. **Гео-fallback:** UI-лейбл **«Рядом»**, не «включают»; только если явных STOP нет. Радиус: default **300м**; city-specific в `cityInfo` (СПб **400м**, пригороды СПб **600м**). Схема БД не меняется.
4. **Пермь must-see:** slug-таблица в Project.md; seed `scripts/seed-perm-must-see-venues.js`; migrate PARK/MONUMENT + `EventVenueRouteItem` на catalog DB перед записью.
5. **Контент stops (гибрид):** seed geo-match ≤**100м** на миграции/новом городе → admin validate; **новые** экскурсии - только вручную; partner import с `venueId` - validate ID, без auto-match.

## 2026-07-30 - Catalog ↔ finance projection / checkout domain — LOCKED hosts + Path A/B (open: fan-in / e2e)

Контекст: граница **locked** в [catalog-finance-projection.md](./catalog-finance-projection.md). Hosts: [spb-finance-host.md](./spb-finance-host.md).  
Draft nginx split (репо only, **не** apply на `.159`): [pay.daibilet.ru.split.conf.example](../deploy/nginx/pay.daibilet.ru.split.conf.example).  
E2e checklist: [yookassa-e2e-sandbox.md](./checklists/yookassa-e2e-sandbox.md).

### Checkout domain & DNS — LOCKED (целевая карта)

Сетевой контур catalog ↔ finance **полностью разделён**. Alias `checkout.daibilet.ru` / partners / cabinet **не** создаются.

| Hostname | Назначение | Status/IP | Примечание |
|----------|------------|-----------|------------|
| `pay.daibilet.ru` | Buyer Checkout UI + Supplier LC | A → `.159` (TLS+nginx finance) | Алиас `checkout.daibilet.ru` **не** создаётся |
| `finance-api.daibilet.ru` | API (Projection, Webhooks) | A → `.159` (DNS+TLS) | Проксирование путей на `pay` не требуется |
| `supplier.daibilet.ru` | ЛК Партнёров | A → `.159` (DNS+TLS) | Алиасы partners/cabinet не нужны |

1. **Checkout hostname:** **`pay.daibilet.ru`** - канон ✅ (см. таблицу).
2. **`finance-api.daibilet.ru`:** ✅ отдельно для API/projection/webhooks.
3. **`supplier.daibilet.ru`:** ✅ DNS + TLS вместе с `pay` / `finance-api`.
4. **YooKassa webhook URL:** ✅ **LOCKED 2026-07-31 (Codex) / cabinet 2026-08-07.**
   - Canon: `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook`
   - Events: `payment.succeeded`, `payment.waiting_for_capture`, `payment.canceled`
   - Ошибочный endpoint на `pay.daibilet.ru` **упразднён**
   - Dual-webhook 3-7d: **SKIP** (живого трафика на старом не было)
4b. **Buyer checkout URL tracks — LOCKED 2026-08-07:** два параллельных трека; **force-merge запрещён**.
   - **Path A (Catalog / Cursor):** entry `daibilet.ru/checkout/admissions/{slug}` → result `https://daibilet.ru/checkout/result?order={publicCode}` → purchases `daibilet.ru/account/purchases`
   - **`publicCode` (LOCKED Path A):** маскированный токен, **не** incremental DB id. Format example: `KSD-8492-NX7` (crypto-safe random at checkout session create). Result URL всегда `https://daibilet.ru/checkout/result?order={publicCode}` (не internal UUID, не ticketNumber).
   - **JSON status shape (Path A lookup):**
     ```json
     {
       "order": {
         "publicCode": "KSD-8492-NX7",
         "status": "PAID",
         "amount": { "value": "1500.00", "currency": "RUB" },
         "items": []
       }
     }
     ```
   - **Path B (future calc):** scaffold `daibilet.ru/checkout/calc` - **запрещено** для музейных CTA
   - **Codex thin Buyer UI:** на `pay.daibilet.ru` (`.159`); Supplier LC на том же хосте **изолирован** (см. draft nginx split)
   - YooKassa **return URL** динамически → активная buyer surface (Path A catalog **или** `pay.daibilet.ru`); **webhook всегда** → `finance-api.daibilet.ru`
4c. **Buyer checkout — два пути продукта LOCKED 2026-08-07 (owner):**
   1. **Path A / простой музей:** только `create-payment` → redirect YooKassa (`confirmationUrl`). **Без** complex checkout UI.
   2. **Path B / complex calc:** можно строить **на будущее** (корзина / multi-offer / custom calc). **Не** подключать к simple museum flow.
   Thin entry + result + account остаются на Path A. STUB = soft-fallback/admin-dev; webhook на `finance-api` без изменений.
5. **Webhook registration (2026-08-07):** API register → 401 auth type - обход: **ручная** регистрация в ЛК ЮKassa. **Статус:** FIN.LC3 ✅ · MIG.9.5 / FIN.W1 cabinet ✅ · e2e sandbox PENDING→SUCCEEDED ⏳ (см. checklist).

### Owner minimum (обновлено 2026-08-07)

- Timeweb allow **MSK `.184` → finance `.159`** ✅ (Fair Snipe)
- YooKassa secrets на `.159`: `SHOP_ID` + `SECRET=<set>` ✅ (never chat/git). Flags: `DAIBILET_YOOKASSA_CHECKOUT=1`, `DAIBILET_STUB_CHECKOUT=1`, `DAIBILET_YOOKASSA_VERIFY_WEBHOOK=1`
- Egress `.159` outbound 443+DNS ✅ (sandbox create-payment OK)
- FIN.LC3 ✅ confirmationUrl / STUB smoke
- SSH для Codex: ключ `daibilet_spb_finance` / pubkey в `authorized_keys`
- Webhook cabinet ✅ canon finance-api (см. п.5); dual-webhook SKIP
- **Open:** e2e sandbox pay verify PENDING→SUCCEEDED после webhook delivery ([checklist](./checklists/yookassa-e2e-sandbox.md))

`.16` (Intelligent Hoopoe) **труп** (MIG.9.7 ✅ 2026-08-07): снят из docs/scripts inventory. Wipe VM в Timeweb = owner, если ещё биллится. Apex DNS / web build = MSK `.184` only. Teplohod allowlist = `.184`, не `.16`.

### PurchaseProjection / dual order sources

6. **Checkout domain model:** после split DB - `CheckoutOrder` только на finance; `ExternalOrder` остаётся на catalog. Как buyer/admin видят оба контура: (A) finance агрегирует External через catalog read API, (B) catalog агрегирует Checkout через finance API, (C) отдельный BFF? Рекомендация архитектора: **(B)** для buyer UI на catalog + admin proxy; supplier LC читает finance напрямую. **MVP 2026-08-07 (Cursor):** catalog account мержит widget ExternalOrder + soft finance/internal cache; полный fan-in ждёт Codex public/m2m purchases-by-email.
7. **PurchaseProjection identity:** ✅ **LOCKED (Codex).** MVP = `publicCode` + buyer email/phone. `siteUserId` bridge до первой внутренней продажи не обязателен (buyer account v2).
8. **ExternalOrder на finance?** ✅ **LOCKED.** External остаётся catalog-only; projection - read fan-in, не dual-write / не mirror copy.

### Projection sync & auth

9. **Sync frequency:** catalog читает finance admission/supplier projection: on-request (SSR fetch + short cache), cron materialize в catalog read-tables, или edge cache? Для MVP рекомендовать **SSR/ISR fetch + short TTL (≤5–15 мин)** без writes в catalog DB.
10. **Service auth catalog→finance:** ✅ **LOCKED 2026-07-31 (Codex).** Рекомендация: **m2m Bearer** token (не IP-only). ETA 0.5-1d когда owner даст token в env. IP allowlist - дополнение, не единственный контроль.
11. **Public vs internal projection routes:** одни и те же DTO за CDN, или `/api/public/projection/*` без PII и `/api/internal/projection/*` с service auth для admin?

### Product display

12. **Порог city hub:** сколько published AdmissionProduct / venues нужно, чтобы показывать блок museums/admission на `/cities/[slug]` (например ≥3)?
13. **Карточка в `/events`:** отдельная вкладка/фильтр «Входные билеты» vs mixed feed с `cardType=ADMISSION` - что предпочтительнее для SEO?

## 2026-07-25 - Env isolation / robots / admin auth (owner audit) — ЗАКРЫТО

1. **`NEXT_PUBLIC_` secrets?** ✅ Нет accidental expose. Разрешено только: `NEXT_PUBLIC_TC_WIDGET_TOKEN` (client widget embed, ≠ `TICKETSCLOUD_API_TOKEN`), `NEXT_PUBLIC_TEP_WIDGET_ID`, `NEXT_PUBLIC_YANDEX_METRIKA_ID`, `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_ADMIN_URL` / `NEXT_PUBLIC_VITE_ADMIN_URL`. DB / Telegram / admin passwords / partner API tokens - **без** `NEXT_PUBLIC_`.
2. **robots `/admin`?** ✅ Дополнено `Disallow: /admin/` в `apps/web/app/robots.ts`. UI уже: middleware Basic Auth + layout `noindex`. Host `admin.daibilet.ru` - тот же Next + auth до HTML.
3. **CV.9b write auth?** ✅ PATCH только `/api/admin/venues/[id]` + Basic Auth (как UI). Public venues API - read-only GET.

## 2026-07-25 - Conversion surfaces (owner) — ЗАКРЫТО

1. **Home video:** **photo rotator KEEP** до продакшн-съёмки. Stock muted loops **отклонены** (фейковый/дешёвый вид). Предпочтительны реальные фото МСК/СПб в WebP/AVIF. Статус: **HC.10 / CV.6 / H.7** - video hero остаётся **deferred**.
2. **Social proof «проданные билеты»:** цифра **только** после реального TC order-aggregate. Hardcoded fake counts **запрещены**. До появления данных - только честные каталожные counts (города/события/площадки, CV.3). Future: Order paid count, когда агрегат стабилен (**CV.11** deferred).
3. **Скидки в каталоге:** сортировку «по акциям» **не строить**, пока в DTO/sync нет `discount` / `strikePrice`. **CV.5** - backlog до sync architecture sprint.
4. **Venue logistics:** CMS admin-поле **«как найти»** (метро + human landmark text), заполняет админ вручную. Geocode-шаблон из адреса **отклонён**. Venues << events - manual ок (**CV.9**; owner label «Спринт CV.5» ≠ Tasktracker **CV.5** discounts). Спека: [venue-logistics-spec.md](./venue-logistics-spec.md).
5. **Blog auto-embeds:** **только** ручной `[buy slug=…]` или admin custom field (CV.4). Автоподбор по тегам статьи **отклонён** (высокий misfire убивает native conversion) - **CV.8** 🚫.

## 2026-07-25 - Venue logistics CV.9 — ЗАКРЫТО

1. **Yandex Maps в event-modal:** iframe `yandex.ru/map-widget/v1` **без** JS API key; маркер `pt={lng},{lat}`. Без coords - кнопка «Открыть адрес на Яндекс.Картах» (external `text=`), без iframe text-search (captcha). `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` не нужен.
2. **Venue pages:** оставляем **OsmMapEmbed** (OSM) на MVP. Выравнивание обоих на Yandex - **deferred backlog**.
3. **Admin address:** только новые logistics-поля editable; `address` остаётся **sync-only** (readonly display).
4. **Event DTO:** slim logistics fields встроены в event page SSR payload (0ms modal). Fetch при клике **не** делаем.

## 2026-07-25 - Catalog interstitial analytics — ЗАКРЫТО (owner confirm 2026-08-07)

1. **GTM / Metrika goals:** ✅ **ЗАКРЫТО (2026-08-07).** Frontend push корректен (`dataLayer` + `ym('reachGoal', …)`). Owner: цели в Метрике (`catalog_interstitial_click`, `product_card_click`, `select_tickets`, опц. `purchase_success`) **сделаны ранее**; пустые отчёты = **нет трафика**, не открытый TODO кабинета.
   - Id целей case-sensitive; GTM Custom Event (если используется) - тем же именем.
   - **Purchase meaning:** оплата в виджете провайдера; код `purchase_success` **не шлёт** без widget callback / thank-you (engineering follow-up).
   - **Webvisor (CV.2f):** процесс маркетолога (10-15 мин/день) - отдельно от создания целей.
   - Закрыты в Tasktracker: **CV.2b–CV.2e**; sitemap/переобход: **SEO.IN2–IN3 / SEO.T5 / SEO.LC6 / SEO.16**.

## 2026-07-23 - Антиспам блога / индекс (owner) — ЗАКРЫТО (lock 2026-07-25)

1. **Guide indexing tempo:** ✅ **ЗАКРЫТО.** KEEP хаос-график, пока YM/GSC index **80–90%**. Owner мониторит **еженедельно**. Триггер throttle: массовая «малоценная» / excluded → **1 гид/день** + переработка шаблонов с большим числом commercial DTO-блоков. Кабинеты трогает только владелец.
2. **Пн-колонки:** ✅ **ЗАКРЫТО.** KEEP **1/неделю**. HIDDEN-бэклог **не** жечь быстрее (риск AI-spam).
3. **Template mix:** ✅ **ЗАКРЫТО.** Rewrite существующих **9 longreads не делаем**. Pack B = **новый угол** для top5/events: purchase intent, цены, карты - не вода и не перепись уже вышедших.

## 2026-07-23 - F4 и качество landing matching — ЗАКРЫТО (lock 2026-07-25)

Контекст: **F4.6 выполнен** (2026-07-23) - Next admin live на `admin.daibilet.ru`, Vite `/legacy` hard-retired. Pre-cutover ответы ниже сохранены как lasting rules / история.

1. **Отдельный `admin.` vhost Next до полного port UI:** ✅ **ЗАКРЫТО / superseded (F4.6).** Решение 2026-07-23: early vhost **не нужен**; Vite был каноном до cutover; Next shell (F4.1) - только при критической массе UI. Сейчас канон - Next admin only. Finance / ЛК поставщиков отложены (P.3).
2. **F4.1 env:** ✅ **ЗАКРЫТО.** Явный `DAIBILET_ADMIN_API_URL=http://127.0.0.1:4000` в systemd/docker unit admin - **не** shared env `daibilet-web`. См. [phase-f4-admin-cutover.md](./phases/phase-f4-admin-cutover.md).
3. **Rules single-source codegen:** ✅ **ЗАКРЫТО (F5.2).** SoT = `landing-rules.ts`; dto.js импортирует rules/matchers. Codegen не нужен. Dual-edit снят.
4. **Scheduled listing garbage audit:** ✅ **ЗАКРЫТО = ДА.** Код: `pnpm audit:listings` (SEO.20) - saleable public events, stop-words + Telegram. Cron `0 4 * * *` на prod - **⏳ owner** (нужны `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`). Soft: `скидк*` нет; CAPS только shout-title (≥70% upper); HTML-теги только в title. `LandingMatch` PINNED/EXCLUDED не заменяет пересчёт automatic rows.

## 2026-07-23 - SEO-листинги, решения владельца — ЗАКРЫТО (lock 2026-07-25)

1. **Стартовое ядро:** ✅ **ЗАКРЫТО.** Editorial focus - **TOP-15 URL**; остальное seed MVP. Structure/review as-is - **без URL/mapping changes** (сохраняем индексацию).
2. **Крыши:** ✅ **ЗАКРЫТО (2026-07-25).** National `/progulki-po-krysham` → смотровые / выход на крышу (ближайший релевантный scope). Почему: пустые «крыши СПб» на national были бы thin content. City-URL `/progulki-po-krysham/saint-petersburg` = СПб-only. Москва в sitemap city-path не добавляется.
3. **Телефон:** ✅ **ЗАКРЫТО (политика launch).** Launch **без телефона**; футер - **только email**; реквизиты **не** на `/contacts` (Jul 24) - на `/requisites`. Временный щит: верификация **Яндекс.Вебмастер / Бизнес** по **ИНН/ОГРНИП**. Когда **8-800** одобрен → ASAP header+footer (**SEO.9b** 🚫 blocked на номер). Launch не блокирует.
4. **Порог индекса:** ✅ **ЗАКРЫТО.** `MIN_LISTING_OFFERS_FOR_INDEX = 6` KEEP (Екб/Казань). Soft-цель content ops = **10**; порог **не поднимать** сейчас.
5. **SEO-тексты / карточки:** ✅ **ЗАКРЫТО.** Карточки каталога лёгкие; SEO-вес на **CHPU listings**. Editorial polish TOP-15 без смены URL (**SEO.8a** / **SEO.10**).
6. **Теги `/podborki`:** ✅ **ЗАКРЫТО = ДА (monthly, не ad-hoc).** Авто-analyzer раз в месяц: теги с **>6–8 live events** + Wordstat >0 → admin one-click promote (query-fallback → CHPU + meta + sitemap). Задача: **SEO.21** (Medium ⏳, monthly sprint).

---

## 2026-07-19 — Teplohod orders API — ЗАКРЫТО / отложено

**Ответ партнёра:** у teplohod.info **нет** функционала API/выгрузки заказов для агента.

- Не запрашивать `TEP_ORDERS_TOKEN`; не считать отсутствие токена launch-blocker.
- Cron `tep-orders-sync` на prod **отключён** (2026-07-19).
- Скрипт `tep:orders` в репо — заготовка на случай появления API позже.
- Активный orders-path: только **Ticketscloud** (`tc:orders` + cron `*/10`).


## 2026-07-19 — после аудита админки

Часть контекста устарела после F4.6 (Next admin live); вопросы ниже ещё актуальны как tech debt / ops.

1. **Admin landings / public catalog SQL:** Events list уже на SQL group page (0.5.8). Когда переводим landings match и `GET /api/public/events` с in-memory full catalog на SQL/materialized groups? (см. Project.md perf debt; F5 соседствует)
2. **Роли / ACL:** Basic Auth + один `ADMIN_EMAIL` достаточно после F4, или нужен второй операторский аккаунт раньше Phase G?
3. **ECR:** включать `VITE_DAIBILET_EVENT_CHANGE_REQUESTS` / Next ECR UI после первого реального change-request, или держать до Phase 2 supplier flow?
4. **Архив заказов:** оставляем auto-archive cancelled ≥30d, или нужен отдельный sync «живых» confirmed из TC/TEP чтобы active-список не выглядел пустым?
5. **Lean description 4000:** хватает для ContentTab Source, или редакторам нужен полный текст только из `:id` (уже есть)?
6. **landing_match filter:** SQL quick-filter сейчас смотрит `LandingMatch` rows (не полный rule-engine). Нужен ли parity с `LANDING_RULES` hits в фильтре? (пересекается с SEO.20 audit)

## Ранее

См. историю в `f:\coding\DAIBILET\docs\qa.md` (архитектурные вопросы Next vs Vite, 11.07.2026).

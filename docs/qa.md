# qa.md — открытые вопросы

## 2026-08-05 - Deploy cadence (закрыто)

Owner: основная работа локально / preview; агенты **commit + push** после итерации; **MSK web deploy** - пачкой раз в сутки или по явному запросу («выкатывай»). Исключения сразу: live 500, критичный хаб-редирект, security, launch-blocker без локальной проверки. Seed/apply prod DB - по запросу или в batch. Зафиксировано в `.cursorrules` + [Project.md](./Project.md).

## 2026-08-05 - Editorial places → catalog (открыто)

`cityInfo.mustSee`, nested POI пригородов, stops пресетов и упоминания в статьях сейчас не имеют единого обязательного identity/seed-flow с `Venue`. Для широкого СПб это привело к тому, что только первоначально засеянные точки имеют public entity, а новые editorial-точки остаются inline.

Нужно подтвердить контентный контракт:

1. Обязателен ли для каждой публикуемой самостоятельной точки `catalogSlug` + `family/kind`, а запись `Venue` создаётся/обновляется единым idempotent seed?
2. Какой минимальный набор редакция подтверждает до publish: адрес, координаты, canonical name, тип сущности и статус точки? Разрешён ли `CANDIDATE` без координат, но без CTA «В маршрут»?
3. Нужны ли nested POI пригородов как самостоятельные `Venue`, или только мини-destination верхнего уровня получает карточку?

## 2026-08-02 - My-day: QR билетов в поездке

Блок «Ваши билеты в этой поездке» показывает отмеченные `ticketBought` стопы + deep-link. **QR-коды и тайминги из реальных заказов Дайбилет** требуют auth + orders API на public web - пока `qrAvailable=false` (shell). Когда готов endpoint - hydrate QR сюда.

## 2026-08-02 - Location vs Venue / антидубли (канон зафиксирован)

Канон: [catalog-location-venue-canon.md](./catalog-location-venue-canon.md). Краткий pointer: [Project.md](./Project.md) § Location vs Venue.

**Закрыто owner:** локация = парки/набережные/памятники/улицы; venue = афиша + institution. **Музеи и арт-галереи всегда Площадки** (даже только-инфо, без договора) - блок хаба. Одна точка = одна карточка; локация→venue = upgrade / hide+301, не twin PUBLISHED.

Остаётся открытым (см. UX ниже): единый `/places`, лейбл «Локации», IA demote `/locations` - это UX/nav, не смена антидубль-канона.

## 2026-08-01 - UX: Locations + mobile catalog (открыто)

Контекст: [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md). Задачи UX.LOC* в Tasktracker.

1. **Лейбл `/locations`:** «Точки сбора» / «Места встречи» / оставить «Локации»?
2. **Nav:** оставить пункт (с новым label), убрать в secondary/footer, или только из city hub?
3. **Default city:** «Все города» ok, или first-visit city gate (Kassir-like)?
4. **Гео suggest (IP/GPS):** нужен ли с явным confirm (не silent auto-switch)?
5. **Список `/locations`:** только места с событиями, или SEO-контентные без афиши тоже (VK.8)?
6. **Единый `/places`:** интересен в ближайший квартал или рано?

## 2026-07-31 - Location↔Excursion linking (открыто)

1. **NEARBY_HUB / START:** enum `RouteItemRole` есть; MVP пишет только `STOP`. Нужен ли отдельный контент-флоу для хабов рядом / explicit START, или достаточно geo «Рядом» + `Event.venueId`?
2. **Порог geo:** 300м - ок для центра Перми/СПб? Нужен ли city-specific radius?
3. **Счётчик на карточке:** `stopEventCount` vs sessions/`events` - показывать ли оба, если у парка есть и STOP, и собственные сессии?
4. **Контент:** кто заполняет STOP-связи для топ-экскурсий (admin form vs seed script vs import)?

## 2026-07-31 - Venue kinds: park / monument + park admission (открыто)

1. **Типы локаций `PARK` / `MONUMENT`:** ✅ добавлены в Prisma `VenueKind` + public slugs `park` / `monument` (каталог `/locations`, admin, infer). Секция city hub: предпочтение **«Важные места»** (не «Важные локации») - UX copy отдельно, не блокер kinds.
2. **Платный вход в парк (admission):** ⏳ **осознанно НЕ в MVP catalog mix.** Пример: Монрепо (Выборг) - вход опционально платный. Не добавлять park admission в catalog/finance/projection, пока нет отдельного product decision. Future: admission product kind / supplier LC для park entry - после museum admission стабилизации.

## 2026-07-31 - Location↔Excursion linking (канон)

1. **MVP источник правды:** явные `EventVenueRouteItem` (`role=STOP`, таблица `event_venue_route_items`) в admin. SEO-программа и витрина «включают это место» - только из pivot.
2. **`Event.venueId`:** только точка старта / primary venue. Не заливать stops в `venueId`.
3. **Гео-fallback (~300 м):** только если явных STOP нет; UI-лейбл **«Рядом»**, не «включают». Схема БД не меняется.
4. **Пермь must-see:** slug-таблица в Project.md; seed `scripts/seed-perm-must-see-venues.js`; migrate PARK/MONUMENT + `EventVenueRouteItem` на catalog DB перед записью.
5. **Контент stops:** кто заполняет STOP на популярных речных/пеших турах МСК/СПб/Пермь - editorial backlog.

## 2026-07-30 - Catalog ↔ finance projection / checkout domain (открыто)

Контекст: граница **locked** в [catalog-finance-projection.md](./catalog-finance-projection.md). Hosts: [spb-finance-host.md](./spb-finance-host.md).

### Checkout domain & DNS

1. **Checkout hostname:** **`pay.daibilet.ru`** - канон ✅ (A → `.159`, TLS+nginx на finance). Alias **`checkout.daibilet.ru`** не обязателен / не создан.
2. **`finance-api.daibilet.ru`:** ✅ отдельный hostname для API/projection/webhooks (DNS+TLS). Path на `pay` не обязателен.
3. **`supplier.daibilet.ru`:** ✅ DNS + TLS (вместе с `pay` / `finance-api`). Alias partners/cabinet не нужен.
4. **YooKassa webhook URL:** ✅ **LOCKED 2026-07-31 (Codex).** Canon: `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook`. `pay.daibilet.ru` = user checkout/return only. Dual-webhook 3-7d **только** если были живые платежи/вебхуки на старом endpoint; иначе skip. Register в ЮKassa - после egress + sandbox smoke.

### Owner minimum (обновлено 2026-07-31)

- Timeweb allow **MSK `.184` → finance `.159`** ✅ (Fair Snipe)
- YooKassa secrets на `.159`: `SHOP_ID` + `SECRET_KEY=<set>` ✅ (Cursor; never chat/git). **`DAIBILET_YOOKASSA_CHECKOUT=1`** (egress PASS 2026-07-31)
- **Blocker:** Diligent Polydeuces **outbound 443 + DNS** с `.159` (сейчас DNS timeout → YooKassa/GitHub FAIL)
- SSH для Codex: ключ `daibilet_spb_finance` / pubkey в `authorized_keys`
- Webhook register в кабинете ЮKassa - после egress green

`.16` (Intelligent Hoopoe) **retired from deploy/build pipeline (2026-08-01)**. Owner: optional backup → удалить VM в Timeweb. Apex DNS уже на `.184`. Web deploy = MSK-only.

### PurchaseProjection / dual order sources

5. **Checkout domain model:** после split DB - `CheckoutOrder` только на finance; `ExternalOrder` остаётся на catalog. Как buyer/admin видят оба контура: (A) finance агрегирует External через catalog read API, (B) catalog агрегирует Checkout через finance API, (C) отдельный BFF? Рекомендация архитектора: **(B)** для buyer UI на catalog + admin proxy; supplier LC читает finance напрямую.
6. **PurchaseProjection identity:** ✅ **LOCKED (Codex).** MVP = `publicCode` + buyer email/phone. `siteUserId` bridge до первой внутренней продажи не обязателен (buyer account v2).
7. **ExternalOrder на finance?** ✅ **LOCKED.** External остаётся catalog-only; projection - read fan-in, не dual-write / не mirror copy.

### Projection sync & auth

8. **Sync frequency:** catalog читает finance admission/supplier projection: on-request (SSR fetch + short cache), cron materialize в catalog read-tables, или edge cache? Для MVP рекомендовать **SSR/ISR fetch + short TTL (≤5–15 мин)** без writes в catalog DB.
9. **Service auth catalog→finance:** ✅ **LOCKED 2026-07-31 (Codex).** Рекомендация: **m2m Bearer** token (не IP-only). ETA 0.5-1d когда owner даст token в env. IP allowlist - дополнение, не единственный контроль.
10. **Public vs internal projection routes:** одни и те же DTO за CDN, или `/api/public/projection/*` без PII и `/api/internal/projection/*` с service auth для admin?

### Product display

11. **Порог city hub:** сколько published AdmissionProduct / venues нужно, чтобы показывать блок museums/admission на `/cities/[slug]` (например ≥3)?
12. **Карточка в `/events`:** отдельная вкладка/фильтр «Входные билеты» vs mixed feed с `cardType=ADMISSION` - что предпочтительнее для SEO?

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

## 2026-07-25 - Catalog interstitial analytics — ЗАКРЫТО (расширено 2026-07-26)

1. **GTM / Metrika goals:** frontend raw push **корректен и готов** (`dataLayer` + `ym('reachGoal', …)` при `NEXT_PUBLIC_YANDEX_METRIKA_ID`). **Решение owner:** в кабинетах нужна настройка цели/триггера - без неё события не попадут в отчёты конверсий.
   - **Яндекс.Метрика:** Цели → JavaScript-событие → id ровно (case-sensitive):
     - `catalog_interstitial_click` (CV.2b)
     - `product_card_click` (CV.2c) - клик карточки события
     - `select_tickets` (CV.2d) - клик Купить / открытие виджета
     - `purchase_success` (CV.2e) - создать заранее; **код пока НЕ шлёт** (нет widget success / thank-you)
   - **GTM:** Custom Event trigger с тем же именем + Tag. Без trigger `dataLayer` push отбрасывается.
   - **Purchase meaning:** оплата в виджете провайдера (Ticketscloud / Teplohod), не «редирект в виджет». Клиентский fake purchase запрещён.
   - **Webvisor (CV.2f):** первый месяц - ежедневно 10-15 мин просмотр сессий воронки card→виджет (процесс маркетолога).
   - Задачи: **CV.2b–CV.2f** в Tasktracker.

## 2026-07-23 - Антиспам блога / индекс (owner) — ЗАКРЫТО (lock 2026-07-25)

1. **Guide indexing tempo:** ✅ **ЗАКРЫТО.** KEEP хаос-график, пока YM/GSC index **80–90%**. Owner мониторит **еженедельно**. Триггер throttle: массовая «малоценная» / excluded → **1 гид/день** + переработка шаблонов с большим числом commercial DTO-блоков. Кабинеты трогает только владелец.
2. **Пн-колонки:** ✅ **ЗАКРЫТО.** KEEP **1/неделю**. HIDDEN-бэклог **не** жечь быстрее (риск AI-spam).
3. **Template mix:** ✅ **ЗАКРЫТО.** Rewrite существующих **9 longreads не делаем**. Pack B = **новый угол** для top5/events: purchase intent, цены, карты - не вода и не перепись уже вышедших.

## 2026-07-23 - F4 и качество landing matching — ЗАКРЫТО (lock 2026-07-25)

Контекст: **F4.6 выполнен** (2026-07-23) - Next admin live на `admin.daibilet.ru`, Vite `/legacy` hard-retired. Pre-cutover ответы ниже сохранены как lasting rules / история.

1. **Отдельный `admin.` vhost Next до полного port UI:** ✅ **ЗАКРЫТО / superseded (F4.6).** Решение 2026-07-23: early vhost **не нужен**; Vite был каноном до cutover; Next shell (F4.1) - только при критической массе UI. Сейчас канон - Next admin only. Finance / ЛК поставщиков отложены (P.3).
2. **F4.1 env:** ✅ **ЗАКРЫТО.** Явный `DAIBILET_ADMIN_API_URL=http://127.0.0.1:4000` в systemd/docker unit admin - **не** shared env `daibilet-web`. См. [phase-f4-admin-cutover.md](./phases/phase-f4-admin-cutover.md).
3. **Rules single-source codegen:** ✅ **ЗАКРЫТО.** **Не** до F5. Регламент: ручной dual-update `dto.js` + `landing-rules.ts`.
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

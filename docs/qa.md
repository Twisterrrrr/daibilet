# qa.md — открытые вопросы

**Как читать (2026-08-09):** фокус для owner и агентов - две секции ниже.
- **Открыто (техника)** - что реально ждёт кода / smoke / infra; здесь приоритет ответов и следующих шагов.
- **Отложено (продукт)** - продуктовые развилки **не удалены**, помечены `DEFERRED`; не блокируют текущий tech-трек, вернуться можно позже.
- Ниже - **LOCKED / закрыто / история** (канон, чтобы не расползались решения).

Finance PR-ветка `codex/stage0-admission-ticket-core` может держать урезанный pointer на этот файл; **канон полного qa** = `feat/next-monorepo` → `docs/qa.md`.

---

## Открыто (техника)

### 1. Stage 0 issuance + buyer DTO + Path A YooKassa (smoke `.159`)

**Что открыто:** live/sandbox прогон на finance `.159`, не «дописать код с нуля». Issuance `ticketNumbers` (`TKT-{publicCode}-NN`, ≠ `publicCode`, только после successful webhook/reconcile), enrichment public order DTO (buyer, venue title/address/coords, validity, items, totals, paidAt/confirmedAt, ticketNumbers, supplierSupportPhone), Path A `return_url` → `https://daibilet.ru/checkout/result?order={publicCode}`, no-store lookup order-by-`publicCode` + purchases-by-email, public `/api/checkout/yookassa` для `VENUE_ADMISSION` + admission product/offer ids - **в PR / code done** на ветке `codex/stage0-admission-ticket-core` (base `codex/phase2-finance-supplier`).

**Статус кода:** готово + тесты на PR-ветке; catalog/finance contract частично пересекается с buyer enrichment из PR #5 / Stage 0 pack. **Блокер:** явный go owner на деплой/smoke `.159` («выкатывай на finance»). Без этого нельзя честно закрыть issuance/DTO в qa.

**Следующий техшаг:** по go owner - deploy finance artifact → checklist create-payment sandbox → `confirmationUrl` → webhook/reconcile → `CONFIRMED` + непустые `ticketNumbers` → reopen buyer card по `publicCode` без localStorage. Не трогать secrets / не force-push. Wide CTA и Path B calc **не** входят в этот шаг.

### 2. YooKassa e2e sandbox (PENDING → SUCCEEDED)

**Что открыто:** полный e2e по [yookassa-e2e-sandbox.md](./checklists/yookassa-e2e-sandbox.md) после webhook delivery. Кабинет webhook URL уже LOCKED на `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook`; create-payment sandbox и флаги на `.159` в целом готовы (см. Owner minimum в истории ниже).

**Статус кода / ops:** FIN.LC3 / cabinet webhook ✅; e2e pay verify ещё ⏳. **Блокер:** тот же smoke-контур `.159` + успешная доставка webhook в sandbox (не product fork).

**Следующий техшаг:** прогнать checklist до `payment.succeeded` / order `CONFIRMED`; зафиксировать результат в Diary/Tasktracker; при fail - логи webhook verify + reconcile, без смены canon URL.

### 3. PurchaseProjection fan-in + purchases-by-email (m2m)

**Что открыто:** buyer/admin должны видеть оба контура заказов после split DB: `CheckoutOrder` на finance, `ExternalOrder` на catalog. Канон MVP: catalog account мержит widget ExternalOrder + soft finance/internal cache; **полный fan-in** ждёт стабильный public/m2m `purchases-by-email` с finance. Identity projection LOCKED: `publicCode` + buyer email/phone (`siteUserId` bridge не обязателен до первых внутренних продаж).

**Статус кода:** Stage 0 PR закрывает no-store endpoints на finance стороне (orders/purchases paths); catalog fan-in и стабильный m2m consume - ещё не «зелёный e2e». **Блокер:** m2m token в env catalog→finance (см. п.4) + smoke `.159`.

**Следующий техшаг:** после smoke - проверить purchases-by-email с service auth; на catalog довести merge в account/purchases без dual-write External на finance.

### 4. Projection routes + sync policy + m2m token в env

**Что открыто (tech policy, не product):**
- **Sync:** catalog читает finance admission/supplier projection - для MVP рекомендовать SSR/ISR fetch + short TTL (≤5–15 мин), без materialize-writes в catalog DB, пока нет измеренной нагрузки.
- **Routes:** нужны ли раздельные `/api/public/projection/*` (без PII, CDN-ok) и `/api/internal/projection/*` (service auth, admin)?
- **Auth:** m2m Bearer LOCKED (не IP-only); ETA ~0.5–1d когда owner положит token в env. IP allowlist - дополнение.

**Статус кода:** hosts/DNS/TLS для `pay` / `finance-api` / `supplier` LOCKED; nginx split example в репо, **не** apply на `.159` без go. **Блокер:** owner выдаёт m2m token в env; решение public vs internal routes можно принять на код-ревью без product workshop.

**Следующий техшаг:** положить token в env (catalog + finance) → один internal projection smoke → зафиксировать TTL/cache в коде и docs; public/internal split - маленький PR после первого consumer.

### 5. My-day QR: auth + orders API hydrate

**Что открыто:** блок «Ваши билеты в этой поездке» сейчас shell: `ticketBought` stops + deep-link, `qrAvailable=false`. Реальные QR/тайминги из заказов Дайбилет требуют auth session на public web + orders/purchases API hydrate.

**Статус кода:** UI-слот есть; hydrate не подключён. Зависит от стабильных buyer order endpoints (п.1–3), не от нового product UX.

**Следующий техшаг:** после purchases/order lookup smoke - проводка auth-gated fetch → заполнение QR payload для стопов поездки; без этого не обещать «живые QR» в my-day.

### 6. Redis INC.504.5d - isolated instance (sizing / install)

**Что открыто:** перед Redis-transport нужен **новый isolated** Redis/Valkey (reuse на MSK невозможен). Read-only check 2026-08-09: Redis на MSK нет. Disk worker INC.504.5c = live канон (systemd timer + shared disk).

**Статус:** **deploy Redis сейчас запрещён** (LOCKED deferred до стабилизации disk-worker). Вопрос sizing/кто ставит **остаётся** как infra tech. Алерты freshness/crash/empty artifact - proposed thresholds в истории ниже.

**Следующий техшаг:** не деплоить; когда disk-worker стабилен - owner/infra: isolated instance + sizing → затем worker→Redis keys sketch (`catalog:sessions`, `catalog:indexes`, `catalog:updated_at`). До этого - мониторить disk mtime / worker timer health.

### 7. Editorial → Venue: schema `parent_venue_id`, seed enforcement, backfill

**Контракт product LOCKED 2026-08-09** (единый idempotent seed, запрет сырого inline без Venue, nested POI → `parent_venue_id`). **Открыто только execution.**

**Статус кода:** канон в Project.md / museum readiness; enforcement в admin/seed UX, Prisma `parent_venue_id` / lifecycle labels (если ещё нет), backfill legacy inline - не закрыты как «done в prod».

**Следующий техшаг:** проверить schema vs канон → seed guard (нет Publish без catalogSlug+family/kind+coords policy) → batch backfill legacy inline → nested parent links для пригородов СПб. Seed/apply prod DB - только по запросу owner.

### 8. Location ↔ Excursion: `cityInfo` radii + STOP seed scripts

**Канон LOCKED:** pivot `EventVenueRouteItem` role=STOP; geo «Рядом» default 300м; city-specific (СПб 400м, пригороды 600м); seed geo-match ≤100м на миграции/новом городе; новые экскурсии - ручная связь.

**Статус кода:** модель/канон есть; **wiring** словаря радиусов в `cityInfo`, доведение STOP seed scripts / LE.7 контент, copy агрегата на карточке - execution gap.

**Следующий техшаг:** добавить radii dict в city config → подключить в nearby calc → прогнать seed geo-match на целевом городе (dry-run) → admin validate top routes. Не плодить второй product flow NEARBY_HUB.

### 9. Must-see hub - execution grow (не product target)

Product targets (~200 MSK/SPB, ~50 other top-8) **LOCKED**. **Открыто:** batch/list для MSK grow (~58 → ~200), top-8 → ~50, seed tooling. Не путать sync/`CANDIDATE` count с hub curated count.

**Следующий техшаг:** curated lists + seed scripts; apply prod - по запросу. Volume targets как «какой KPI правильный» - в deferred product не пересматриваем без owner.

### 10. Admin tech debt (после аудита 2026-07-19)

Ещё актуально как tech/ops (F4.6 Next admin live не снял эти вопросы):

1. **SQL landings / public events:** Events list уже SQL group page (0.5.8). Когда переводим landings match и `GET /api/public/events` с in-memory full catalog на SQL/materialized groups?
2. **ACL:** Basic Auth + один `ADMIN_EMAIL` достаточно, или второй операторский аккаунт раньше Phase G?
3. **ECR:** включать UI/`VITE_DAIBILET_EVENT_CHANGE_REQUESTS` после первого реального change-request или держать до Phase 2 supplier?
4. **Архив заказов TC:** auto-archive cancelled ≥30d vs отдельный sync «живых» confirmed, чтобы active-список не выглядел пустым.
5. **Lean description 4000:** хватает ContentTab Source, или редакторам нужен полный текст только из `:id` (уже есть path)?
6. **`landing_match` filter parity:** SQL quick-filter смотрит `LandingMatch` rows, не полный `LANDING_RULES` engine - нужен ли parity?

**Следующий техшаг:** не блокирует Stage 0 smoke; брать пачкой в admin/perf sprint. Предлагаемый порядок: (1)/(6) perf+SEO → (4) ops truth → (2)/(3)/(5) по боли редакции.

### 11. Ops hygiene

- **`pnpm audit:listings` cron:** код ✅; prod cron `0 4 * * *` ждёт owner secrets `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`.
- **Wipe Intelligent Hoopoe `.16`:** труп снят из inventory; если VM ещё биллится в Timeweb - wipe = owner action (не агент).
- **Catalog disk-worker health:** live MSK timer active; следить P1 freshness (mtime 20–30 min) / P2 unit fail / P3 empty artifact - до Redis.

---

## Отложено (продукт) — DEFERRED

Не удалять. Не требовать ответа для текущего tech-трека Stage 0 / catalog execution. Когда вернёмся - снять `DEFERRED` и перенести в фокус.

### D1. Museum-1 / Stage 0 first open-date contract — DEFERRED

Продуктовые развилки до/вокруг первого договора (музей или арт). Контекст: [museum-contract-readiness.md](./museum-contract-readiness.md).

- **54-ФЗ / fiscal:** Stage 0 чек от Daibilet в SINGLE_MERCHANT - OK до live money, или другая схема?
- **Ownership внешнего scanner code:** Daibilet выдаёт `ticketNumber` vs площадка импортирует свой код до сканера? (тех-path `TKT-*` в PR - отдельно; это про договор/сканер day-1.)
- **Scanner day-1:** печатный номер + код заказа для ручного контроля vs scan API обязателен до подписания?
- **Email production:** SMTP на MSK web vs письма с finance `.159`?
- **Support phone на билете (product copy):** единый номер Дайбилет vs телефон поставщика в supplier DTO? (поле в DTO - tech; **политика что показывать** - product, здесь.)
- **Первый open-date контрагент:** музей vs арт; какой venue/город/slug для controlled seed (не wide CTA)?

Возвраты Stage 0 уже LOCKED (только mailto + manual ops) - не reopen без Stage 2+.

### D2. Admission UX thresholds / events filter tabs — DEFERRED

- Порог city hub: сколько published AdmissionProduct / venues, чтобы показывать блок museums/admission на `/cities/[slug]` (например ≥3)?
- Карточка в `/events`: отдельная вкладка «Входные билеты» vs mixed feed с `cardType=ADMISSION`?

### D3. Locations UX: «Все города» vs gate; geo confirm vs silent — DEFERRED

Из UX.LOC brief (остальное по locations IA LOCKED):

- Default city: «Все города» ok vs first-visit city gate.
- Гео suggest (IP/GPS): confirm UI vs silent apply.

### D4. Park admission product — DEFERRED

Платный вход в парк (пример: Монрепо) **осознанно не в MVP** catalog/finance/projection. Future admission kind / supplier LC - после стабилизации museum admission. Не смешивать с `PARK`/`MONUMENT` kinds (kinds уже в schema).

### D5. Must-see volume как product revisit — DEFERRED

Targets LOCKED (~200 / ~50). Пересмотр KPI / «достаточно ли» - только по явному запросу owner. Execution grow - в § Открыто (техника) п.9.

### D6. Wide CTA / Path B calc — DEFERRED / out of Stage 0

Wide catalog CTA без явного запроса owner - запрещено. Path B `checkout/calc` - future scaffold, **не** подключать к simple museum Path A. Не путать с Stage 0 smoke.

### D7. Buyer LK / auto-refunds / Stage 2+ voucher — DEFERRED

Auto refunds / self-serve refund UI out of Stage 0. Stage 2+ note: единый ваучер, partial refund by slot, replace + surcharge - не implement сейчас.

---

## LOCKED / закрыто / история (контекст)

## 2026-08-08 - Catalog Worker + Redis transport — LOCKED scope (Redis deferred)

**LOCKED owner (sync 2026-08-09):**

| Слой | Статус |
|------|--------|
| **Disk worker INC.504.5c** | **сейчас** = systemd + shared disk v2. Канон **уже в репо** (не «с нуля»): `deploy/systemd/daibilet-catalog-dto-rebuild.service` + `.timer`, `deploy/cron/rebuild-public-catalog-dto.sh`. Live MSK: timer **active**, unit files under `/opt/daibilet/deploy/systemd/` (oneshot service idle между тиками - норма). |
| **Redis INC.504.5d** | **deferred** до стабилизации disk-worker. **Не** деплоить Redis сейчас. Открытый infra-вопрос sizing/install - см. § Открыто (техника) п.6. |

**Приоритет транспорта:** Redis (target) > Shared Disk (**live**) > Streaming (**rejected**).

**Future Redis canon sketch (later):**
1. Worker → gzip JSON в Redis: keys `catalog:sessions`, `catalog:indexes` + `catalog:updated_at`.
2. Main API: read Redis → in-memory Soft-SWR.
3. Алерты (см. thresholds ниже).

**Alerts (proposed thresholds until measured - 2026-08-09):**
- **P1 freshness:** disk mtime / `catalog:updated_at` older than **20–30 min** → critical (SLA до калибровки).
- **P2 worker crash:** systemd unit/timer failed / consecutive oneshot non-zero exit.
- **P3 empty/tiny artifact:** near-zero bytes **или** sessions count **<<** last-good (proposed: **<50%** of last-good / near-empty).

**Read-only MSK check 2026-08-09:** Redis **нет** (`redis-cli` absent; no redis/valkey systemd units; no docker redis/valkey). Перед INC.504.5d: **новый isolated Redis** (reuse невозможен).

## 2026-08-08 - Buyer LK / refunds / Stage 2+ — LOCKED out of Stage 0

**LOCKED owner 2026-08-09:**
- Auto refunds / self-serve refund UI - **out of scope Stage 0** (см. DEFERRED D7).
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

Открытый выбор первого контрагента - **DEFERRED D1**.

## 2026-08-07 - Museum-1 / Stage 0 first open-date contract

**Статус 2026-08-09:** продуктовые пункты перенесены в **DEFERRED D1**. Tech issuance/DTO/smoke - в § Открыто (техника) п.1–2. Не считать отсутствие ответов по 54-ФЗ / scanner day-1 блокером текущего PR-smoke.

## 2026-08-07 - Order code ≠ ticket number (LOCKED draft)

**LOCKED draft (owner 2026-08-07):** `CheckoutOrder.publicCode` = **код заказа** (buyer support / payment). **Номер билета** музея / площадки - отдельная сущность; UI временно мог показывать тот же `publicCode` с подписью до issuance.

**Не** считать collapse к одному числу product end-state. Issuance path в Stage 0 PR (`ticketNumbers`) - tech follow-up/smoke, см. § Открыто п.1. Внешний scanner code ownership - DEFERRED D1.

## 2026-08-07 - Buyer ticket fields / finance enrichment gaps

Историческая таблица gaps; **целевой статус** - закрытие кодом в Stage 0 PR + smoke `.159` (§ Открыто п.1). До smoke не помечать «prod done».

| Field | Create STUB historically | Public order lookup target |
|-------|--------------------------|----------------------------|
| buyer.name | ✅ | enrich in PR |
| venueTitle | ✅ subject | enrich in PR |
| venueAddress | catalog interim | enrich in PR |
| validTo / validityMode | product ✅; order snapshot needed | enrich in PR |
| item(s) title+qty | ✅ single `item` | multi-line later ok |
| supplierSupportPhone | hide until present | DTO field tech; display policy = DEFERRED D1 |
| session startsAt | null open-date | n/a Stage 0 |

## 2026-08-07 - Must-see hub volume (LOCKED)

**LOCKED owner 2026-08-07** (см. [Project.md](./Project.md) § Must-see count tiers):

| Слой | Target |
|------|--------|
| Moscow + SPB hubs | ~**200** точек в хабе (must-see / places layer) |
| Other cities (top-8 start) | ~**50** на старте, потом посмотрим; **не** capitals-wide |

**Факт (на момент lock):** SPB ~184 (near); Moscow ~58 (gap ~142 к 200); other top-8 - floor/large mixed (старый ориентир 12-18 снят).

**Не путать:** sync / `CANDIDATE` Venue count **≠** hub count. Execution - § Открыто п.9; revisit KPI - DEFERRED D5.

## 2026-08-06 - CI deploy secrets — ЗАКРЫТО (✅ 2026-08-09)

**LOCKED owner 2026-08-09:** GitHub repo secrets для workflow `Deploy MSK web` **уже настроены** (`MSK_SSH_HOST`, `MSK_SSH_USER`, `MSK_SSH_KEY`; опц. widget tokens). Значения secrets в git/chat **не** дублировать.

«Выкатывай» = Actions → Deploy MSK web → Run workflow.

## 2026-08-05 - Deploy cadence (закрыто)

Owner: основная работа локально / preview; агенты **commit + push** после итерации; **MSK web deploy** - пачкой раз в сутки или по явному запросу («выкатывай»). Исключения сразу: live 500, критичный хаб-редирект, security, launch-blocker без локальной проверки. Seed/apply prod DB - по запросу или в batch. Зафиксировано в `.cursorrules` + [Project.md](./Project.md).

## 2026-08-05 - Editorial places → catalog — ЗАКРЫТО (LOCKED 2026-08-09)

Контекст: `cityInfo.mustSee`, nested POI пригородов, stops пресетов и упоминания в статьях раньше могли оставаться inline без системного `Venue`.

**LOCKED owner 2026-08-09** (pointer: [Project.md](./Project.md) § City hub / editorial seed):

1. **Единый identity/seed-flow:** каждая публикуемая самостоятельная точка в открытом catalog обязана иметь валидную пару **`catalogSlug` + `family/kind`**. Создание/обновление `Venue` - **только** через единый **idempotent seed**. Если точка в статье / пресете (stops) / mustSee - редакторский интерфейс сначала сидит Venue, получает UUID/ID, потом линкует. Публикация «сырого» инлайна без системного Venue **запрещена**.

2. **Минимальный набор до Publish:** Canonical Name; Coordinates (lat/lng) для стандартных точек; Address; `family/kind`; lifecycle **Active** / **Temporarily Closed** / **Permanently Closed**.

3. **`CANDIDATE` без координат:** на черновике можно; на проде навигационные CTA auto-off без coords.

4. **Nested POI пригородов:** мини-destination → Venue; nested POI → Venue + **`parent_venue_id`**; мелочь без маршрутной ценности → текст в родителе.

**Execution** - § Открыто (техника) п.7.

## 2026-08-02 - My-day: QR билетов в поездке

Shell UI есть; hydrate - § Открыто (техника) п.5.

## 2026-08-02 - Location vs Venue / антидубли (канон зафиксирован)

Канон: [catalog-location-venue-canon.md](./catalog-location-venue-canon.md). Краткий pointer: [Project.md](./Project.md) § Location vs Venue.

**Закрыто owner:** локация = парки/набережные/памятники/улицы; venue = афиша + institution. **Музеи и арт-галереи всегда Площадки**. Одна точка = одна карточка; локация→venue = upgrade / hide+301, не twin PUBLISHED.

**LOCKED 2026-08-07 (owner OK, option A):** URL-семейство от **kind/role**, не от наличия билетов. Музей/театр/зал без афиши → `/venues`, buy-chrome скрыт до offers/sessions. Достопримечательности / парки / причалы / гастро-как-day-point → `/locations`. Commerce влияет только на UI chrome. Nav **V1** (пункт `/locations` в primary). Единый `/places` - deferred. Rename лейбла → «Места и точки сбора» = follow-up (UX.LOC3), не блокер IA.

## 2026-08-01 - UX: Locations + mobile catalog — часть LOCKED; open → DEFERRED

Контекст: [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md).

1. **Лейбл `/locations`:** ✅ target **«Места и точки сбора»** (follow-up UX.LOC3; сейчас «Локации» ok до rename).
2. **Nav:** ✅ **V1** - оставить в primary nav.
3. **Default city / гео suggest:** **DEFERRED D3**.
4. **Список `/locations`:** ✅ SEO-контентные без афиши **да** (VK.8).
5. **Единый `/places`:** ✅ **рано / deferred** (UX.LOC9 / PH2.PLC1).

## 2026-07-31 - Location↔Excursion linking — ЗАКРЫТО (LOCKED 2026-08-09)

Канон в [Project.md](./Project.md) § Location↔Excursion. Кратко:

1. **NEARBY_HUB / START:** отдельный сложный контент-флоу не нужен; START = `index: 0`; NEARBY_HUB = geo + transport family.
2. **Гео-пороги:** default **300м**; СПб **400м**; пригороды СПб **600м** - в `cityInfo`.
3. **Счётчик на карточке:** один агрегат; если одно число - `stopEventCount`.
4. **STOP гибрид:** seed geo-match ≤100м на миграции/новом городе; новые экскурсии вручную; partner import с `venueId` - validate, без auto-match.

**Execution** - § Открыто (техника) п.8.

## 2026-07-31 - Venue kinds: park / monument + park admission

1. **Типы `PARK` / `MONUMENT`:** ✅ в Prisma + public slugs. Секция hub copy «Важные места» - UX отдельно.
2. **Платный вход в парк:** **DEFERRED D4** - не в MVP catalog mix.

## 2026-07-30 - Catalog ↔ finance projection / checkout domain — LOCKED hosts + Path A/B

Контекст: [catalog-finance-projection.md](./catalog-finance-projection.md), [spb-finance-host.md](./spb-finance-host.md).  
Draft nginx split (репо only): [pay.daibilet.ru.split.conf.example](../deploy/nginx/pay.daibilet.ru.split.conf.example).  
E2e checklist: [yookassa-e2e-sandbox.md](./checklists/yookassa-e2e-sandbox.md).

### Checkout domain & DNS — LOCKED

| Hostname | Назначение | Status/IP | Примечание |
|----------|------------|-----------|------------|
| `pay.daibilet.ru` | Buyer Checkout UI + Supplier LC | A → `.159` | Alias `checkout.daibilet.ru` **не** создаётся |
| `finance-api.daibilet.ru` | API (Projection, Webhooks) | A → `.159` | |
| `supplier.daibilet.ru` | ЛК Партнёров | A → `.159` | |

- YooKassa webhook: `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook` (events: succeeded / waiting_for_capture / canceled). Dual-webhook SKIP.
- **Path A:** `daibilet.ru/checkout/admissions/{slug}` → result `?order={publicCode}` → `daibilet.ru/account/purchases`. `publicCode` = masked token, не DB id.
- **Path B calc:** DEFERRED D6 / forbidden for museum CTA.
- Webhook registration API → 401: обход ручной кабинет; e2e sandbox - § Открыто п.2.

### Owner minimum (снимок)

- Timeweb allow **MSK `.184` → finance `.159`** ✅
- YooKassa secrets на `.159` ✅ (never chat/git). Flags checkout/stub/verify как на хосте.
- Egress `.159` outbound 443+DNS ✅
- FIN.LC3 ✅; webhook cabinet ✅
- **Open tech:** e2e + Stage 0 smoke - § Открыто п.1–2
- `.16` wipe если биллится - § Открыто п.11

### PurchaseProjection / dual order sources / sync / auth

Identity + ExternalOrder-on-catalog LOCKED. Fan-in, routes, m2m token, sync TTL - § Открыто п.3–4. Product display thresholds/tabs - DEFERRED D2.

## 2026-07-25 - Env isolation / robots / admin auth — ЗАКРЫТО

`NEXT_PUBLIC_` только widget/metrika/site URL. robots `Disallow: /admin/`. CV.9b write только admin PATCH + Basic Auth.

## 2026-07-25 - Conversion surfaces — ЗАКРЫТО

Photo rotator KEEP; fake sold counts запрещены; discounts backlog до DTO; venue logistics manual CMS; blog embeds только ручной `[buy]`.

## 2026-07-25 - Venue logistics CV.9 — ЗАКРЫТО

Yandex iframe в event-modal без JS key; venue pages OsmMapEmbed MVP; address sync-only readonly; slim logistics в SSR payload.

## 2026-07-25 - Catalog interstitial analytics — ЗАКРЫТО (2026-08-07)

Goals в Метрике сделаны; пустые отчёты = нет трафика. `purchase_success` не слать без widget callback.

## 2026-07-23 - Антиспам блога / индекс — ЗАКРЫТО

KEEP хаос-график; колонки 1/нед; Pack B = новый угол, не rewrite 9 longreads.

## 2026-07-23 - F4 / landing matching — ЗАКРЫТО (lock 2026-07-25)

F4.6 Next admin live. Rules SoT = `landing-rules.ts`. `pnpm audit:listings` код ✅; Telegram secrets cron - § Открыто п.11.

## 2026-07-23 - SEO-листинги — ЗАКРЫТО

TOP-15 editorial focus; крыши national→смотровые; launch без телефона (email only); `MIN_LISTING_OFFERS_FOR_INDEX = 6`; `/podborki` monthly promote.

---

## 2026-07-19 — Teplohod orders API — ЗАКРЫТО / отложено

**Ответ партнёра:** у teplohod.info **нет** функционала API/выгрузки заказов для агента.

- Не запрашивать `TEP_ORDERS_TOKEN`; не считать отсутствие токена launch-blocker.
- Cron `tep-orders-sync` на prod **отключён** (2026-07-19).
- Скрипт `tep:orders` в репо — заготовка на случай появления API позже.
- Активный orders-path: только **Ticketscloud** (`tc:orders` + cron `*/10`).

## 2026-07-19 — после аудита админки

Актуальный список tech debt вынесен в § Открыто (техника) п.10. Здесь не дублируем one-liners.

## Ранее

См. историю в `f:\coding\DAIBILET\docs\qa.md` (архитектурные вопросы Next vs Vite, 11.07.2026).

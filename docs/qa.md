# qa.md — открытые вопросы

**Как читать (2026-08-09):** фокус для owner и агентов - две секции ниже.
- **Открыто (техника)** - что реально ждёт кода / smoke / infra; здесь приоритет ответов и следующих шагов.
- **Отложено (продукт)** - продуктовые развилки **не удалены**, помечены `DEFERRED`; не блокируют текущий tech-трек, вернуться можно позже.
- Ниже - **LOCKED / закрыто / история** (канон, чтобы не расползались решения).

Finance PR-ветка `codex/stage0-admission-ticket-core` может держать урезанный pointer на этот файл; **канон полного qa** = `feat/next-monorepo` → `docs/qa.md`.

---

## 2026-08-14 - City hub: погода, теги, события региона (пилот Пермь)

**Сделано в коде (пилот Пермь):** микровиджет погоды Open-Meteo + identity-теги + editorial JSON «События региона». Live deploy не в этом ship.

### Исследование фестивалей Перми (не Белые ночи)

Белые ночи - Петербург, не Пермь. «Живая Пермь» - архивный формат ~2007-2012, в календаре 2026 не найден. Rock-Line фактически завершился к 2017.

Крупные якоря 2026 (источники в `apps/web/src/data/city-regional-events.ts`):

| Событие | Даты 2026 | Где | Источник |
|---|---|---|---|
| Флаэртиана | 25 сен - 1 окт | синематека «Кристалл» | [permcinema.ru](https://www.permcinema.ru/festival-projects/flaertiana/) |
| Дягилевский фестиваль | 11-20 июня | Пермь + Хохловка | [diaghilevfest.ru](https://diaghilevfest.ru/media/mediatec/8650/) |
| KAMWA | 1-2 августа | Полазна | [kamwa.ru](https://www.kamwa.ru/) |
| Небесная ярмарка | 4-11 июля | Кунгур (не центр Перми) | [59.ru](https://59.ru/text/culture/2026/06/04/76459457/) |
| Ночь музеев | 16 мая | музеи края | [sobaka.ru](https://www.sobaka.ru/prm/entertainment/art/214708) |

В каталоге Дайбилет (repo seeds) отдельных festival-событий с этими именами нет. Блок хаба **не** вторая афиша: upcoming после пригородов (на tourist-хабах - после афиши), прошедшие в `<details>`.

### Как подтягивать автоматически (рекомендация)

1. **Сейчас:** editorial JSON на город (`CITY_REGIONAL_EVENTS`) - честно, без притворного live API.
2. **Дальше, без скрейпа:** Wikidata SPARQL по recurring festival Q-id (скелет имени/месяца) + официальные страницы как `sourceUrl`.
3. **Билетный слой:** TimePad public events по городу (есть API) - только как supplement, с ручным allowlist организаторов.
4. **Не брать:** Yandex Afisha (нет публичного API / ToS), HTML-скрейп visitperm.ru, KudaGo public API (Перми обычно нет в city list).
5. **Когда каталог вырастет:** матч title+даты с `Event` Дайбилет и подмена внешней ссылки на `/events/{slug}`.

Официальный туристический контур края: visitperm / «Пермь Великая» (календарь CMS, стабильного API нет).

### Вопросы owner

1. Прошедшие якоря сезона (Дягилев, KAMWA) - **LOCKED 2026-08-14:** не в основной сетке. Upcoming/now сверху, прошедшие в подвале «Прошедшие фестивали сезона».
2. TimePad allowlist - ок как следующий ingest, или держим только editorial + Wikidata?
3. Пак тегов Москвы/СПб - когда, и кто составляет hashtag-лист?

---

## 2026-08-13 - My Day trips per city (Variant A) - DEFERRED after B

**Контекст:** Variant B (один `daibilet:dayRoute`, confirm clear при смене города / foreign add) ship в этой итерации.

1. **Когда стартовать A?** После стабилизации B на live (нет регрессий шапки / empty / модалок).
2. **Storage shape:** `dayRoute: { [citySlug]: stops[] }` vs parallel keys `daibilet:dayRoute:{slug}`?
3. **Badge / UI:** один счётчик активного города шапки или multi-badge?
4. **Share URL /my-day?city=:** восстанавливает только bucket этого города?

**Статус:** `MYDAY.TRIPS-PER-CITY` в Tasktracker - Запланировано. **Не билдить A сейчас.**

---

## 2026-08-11 - Region Hub IA

1. **City SEO title:** спека предлагала «Афиша {Города} на {Год}…»; сейчас канон P.2d. Меняем city title в том же релизе или оставляем P.2d?
2. **ХМАО / Карелия:** у ХМАО в `region-hubs` центр Ханты-Мансийск (есть ли saleable standalone?). Карелия → Петрозаводск - в allowlist?
3. **childCities с eventCount=0:** всегда в JSON для роботов + UI «Показать все», или zero-only в отдельном поле?
4. **Тир C:** 301/302 на центр vs мягкий noindex + strip? Спека = noindex + strip на центре (текущая реализация).
5. **FAQ count Tier A:** в seed по 2 Q; архитектурная цель 3 - добить третьим логистическим FAQ или ок 2?
6. **LLM provider** для `region:info:draft`: OpenAI / YandexGPT / внутренний blog pipeline?

---

## 2026-08-11 - Подборки `/podborki` city (LOCKED owner - финал пилота)

План: [seo-podborki-chpu-plan.md](./seo-podborki-chpu-plan.md). Трек отдельно от My Day routes. Category `seo-listing-texts` editorial index - **не откатывать**.

**LOCKED ответы (финал):**
1. **Slug:** SEO path-канон (`saint-petersburg` / `kaliningrad` via `normalizeKnownCitySlug`). DB translit - алиасы входа.
2. **Роут:** маркер `/podborki/c/{city}` **не сейчас**; intents не ломаем.
3. **Охват пилота:** **только** `kaliningrad` + `saint-petersburg`. Москва в Meta - harmless leftover, не расширять.
4. **vs `/cities`:** подборки = идейный хаб; city = афиша. Бренд Дайбилет.
5. **Порядок:** Meta на soft `?city=` + self-canonical; ЧПУ+301 - следующий спринт.
6. **Groups:** A/B не ломать (soft `?city=` избыточен); C hub unique meta; C MULTI + E - stable index (не мигать ≥6); D `salute-9-may` - 200 + index круглый год (не 404/noindex); E canonical строго self ЧПУ.
7. **Sitemap:** пилотные city-variants не выкидывать из-за порога 6 при events>0.

**Ещё открыто (не блокер):**
- Blog banners / card blurbs после маркера ЧПУ.
- Финальная вычитка Title/H1 copy после SERP smoke.

### Пилот-2 (owner 2026-08-12: «ок. ставим в план» - код НЕ сейчас)

**План:** `SEO.PODBORKI-PILOT-2` - после пилота-1 добавить в allowlist `nizhny-novgorod` + `perm` (тот же контур: meta/self-canonical/index + intents; кастом `SeoOverride` только 1–2 ключа на город).

**Критерий старта (gate):**
1. В Вебмастере/поиске у пилот-1 (КГД+СПб) нет склейки `/podborki?city=` с `/cities/{slug}`.
2. Статус в поиске у пилот-1 приемлемый (страницы в индексе, без массового вылета / мигания).
3. Окно наблюдения ~1–2 недели после live Stage-1; только потом трогать `PODBORKI_SEO_PILOT_CITY_SLUGS`.

---

## 2026-08-11 - Category×city SEO-текст vs noindex — ЗАКРЫТО

**Owner решение:** снять `noindex` из-за low offer count, если есть editorial SEO-каркас в `seo-listing-texts` для пары `(landingSlug, citySlug)`. Обоснование: страница - информационный хаб; 3–5 событий в афише нормально; непрерывная индексация важнее порога 6.

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Thin + editorial → index? | **Да.** `evaluateListingIndexability({ hasEditorialSeoText })` → `index,follow` при ≥1 оффере даже если &lt;6. |
| 2 | Нулевой день (0 сеансов)? | **Пока noindex** (`zero_offers`), **кроме** SEO-skeleton (`hasSeoSkeleton`, напр. salute-9-may) и пилот intent×city. |
| 3 | Масштаб текстов? | Ручные owner-пакеты сейчас; AI-draft позже отдельным треком. |
| 4 | Пилот KGD/SPB × MULTI/intent? | **stablePilotIndex:** index при events>0 без мигания порога 6 (финал 2026-08-11). |

Без editorial / без пилота / без skeleton порог `MIN_LISTING_OFFERS_FOR_INDEX = 6` и `noindex,follow` сохраняются.

---

## 2026-08-11 - My Day → ЧПУ `/routes/{city}/{slug}` (дизайн, не билдить)

**Gap обновлён 2026-08-14:** viral MVP уже на `/m/{city}-{titleSlug}-{code}` (посадочная + counters + blog `[route]` + UGC scaffold status/ratings/author). **Единый пасс** (auth/moderation/abuse/canonical `/routes/…`) - **всё ещё deferred**, не этот ship.

**MVP scope (черновик `/routes`):** «Сохранить и поделиться» → публичная страница `/routes/{city}/{slug}` с авто-H1, списком стопов, CTA на билеты/афишу; черновик `noindex` до publish.

**Вопросы owner (открыты для полного пасса):**
1. **Кто публикует?** только авторизованный / staff moderation queue / любой аноним с rate-limit?
2. **Индексация:** draft всегда `noindex`; published - сразу index или ручной «в индекс»? *(сейчас viral MVP: default PUBLISHED + index)*
3. **Slug:** авто из title (`peterburg-muzei-vecher`) + collision suffix, или только opaque id + отдельный title? *(сейчас: city + titleSlug + trailing opaque code на `/m`)*
4. **Canonical:** `/routes/...` канон, а `/my-day?items=` и `/d/{code}` - `noindex` + rel=canonical на route?
5. **UGC spam / мусор:** обязательный min stops, запрет empty, captcha, TTL unpublished, abuse report?
6. **Контент-права:** пользовательский title/notes - хранить as-is или sanitize + запрет ссылок?
7. **Коммерция:** CTA только на события/venues из каталога Дайбилет, или внешние URL тоже?
8. **Приоритет vs blog/category SEO:** делать после стабилизации my-day Lovable, или отдельный SEO-трек?

---

## Открыто (техника)

### 1. Stage 0 closeout - e2e/smoke на live `.159` (единственный runtime gate)

**Где мы сейчас (owner 2026-08-09):** Stage 0 **по коду закрыт** и **уже live on finance `.159`**: внутренний admission checkout, Path A `return_url` → `/checkout/result?order=...`, public order lookup, выдача `TKT-{publicCode}-NN`, buyer/supplier/admin projection. PR/code done → **live on `.159`** (не «ждёт деплой»).

**Что ещё открыто (runtime only):** один шаг closeout - **доплатить sandbox order** → webhook/reconcile → order `CONFIRMED` + непустые `ticketNumbers` + public lookup по `publicCode`. Checklist: [yookassa-e2e-sandbox.md](./checklists/yookassa-e2e-sandbox.md).

**Блокер:** ручная sandbox-оплата / доставка confirm (агент **не** трогает `.159` / secrets). Wide CTA и Path B calc **не** входят в closeout.

**Следующий техшаг:** завершить sandbox payment на уже задеплоенном коде → подтвердить `CONFIRMED` + ticketNumbers + reopen buyer card без localStorage → закрыть Stage 0 closeout в Tasktracker/Diary.

### 2. YooKassa webhook canon - register / verify (owner gate)

**Canon URL (LOCKED):** `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook`. **`pay.daibilet.ru`** - только return/user surface, **не** webhook endpoint.

**Свёртка статуса:** ранее в docs фигурировало «ручная регистрация cabinet DONE» (FIN.W1 / MIG.9.5). **Owner wording 2026-08-09:** webhook ещё нужно **зарегистрировать** (или явно verify/confirm в кабинете ЮKassa). Текущий gate = owner register/verify, не смена canon URL.

**Следующий техшаг:** owner регистрирует/подтверждает webhook на `finance-api…/webhook` (events: succeeded / waiting_for_capture / canceled) → e2e delivery в связке с п.1; при fail - логи verify + reconcile, без перевода webhook на `pay.`.

### 3. PurchaseProjection fan-in + purchases-by-email (m2m)

**Что открыто:** buyer/admin должны видеть оба контура заказов после split DB: `CheckoutOrder` на finance, `ExternalOrder` на catalog. Канон MVP: catalog account мержит widget ExternalOrder + soft finance/internal cache; **полный fan-in** ждёт стабильный public/m2m `purchases-by-email` с finance. Identity projection LOCKED: `publicCode` + buyer email/phone (`siteUserId` bridge не обязателен до первых внутренних продаж).

**Статус кода:** Stage 0 code **live on `.159`** закрывает no-store endpoints на finance стороне (orders/purchases paths); catalog fan-in и стабильный m2m consume - ещё не «зелёный e2e». **Блокер:** m2m token в env catalog→finance (см. п.4) + Stage 0 closeout (§ п.1).

**Следующий техшаг:** после closeout - проверить purchases-by-email с service auth; на catalog довести merge в account/purchases без dual-write External на finance.

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

## Roadmap финконтура (план, не open-QA dump)

Порядок после Stage 0 code-live. Это **план этапов**, не список «всё ещё открытый QA». Текущие runtime-гейты - только § Открыто п.1–2.

1. **Stage 0 closeout:** доплатить sandbox order → `CONFIRMED` → public order lookup + `ticketNumbers`.
2. **Webhook canon:** зарегистрировать `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook`; `pay.daibilet.ru` только return/user URL (см. § Открыто п.2).
3. **Buyer contour:** связать public `/checkout/result?order=...` с finance projection; показать билет / номер / статус / поддержку.
4. **Operator contour:** admin orders search по `publicCode`, email, ticket number; audit trail; ручной retry webhook/reconcile.
5. **Supplier LK MVP:** supplier-scoped orders, admissions, ticket numbers, buyer contact по правилам, support entry.
6. **Refunds light:** заявка, operator decision, supplier visibility read-only. **Не** путать со Stage 2+ voucher (DEFERRED D7) - это light track.
7. **Finance live gates:** 54-ФЗ/чеки, live YooKassa creds, webhook verification, оферта/возвраты/ПДн → **только потом** широкий buyer CTA.

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

Auto refunds / self-serve refund UI out of Stage 0. **Refunds light** (заявка + operator decision + supplier read-only) - отдельный план в § Roadmap финконтура п.6, не этот блок. Stage 2+ note: единый ваучер, partial refund by slot, replace + surcharge - не implement сейчас.

---

## LOCKED / закрыто / история (контекст)

## 2026-08-09 - Day routes / presets: timing note в head (LOCKED)

**LOCKED owner (гид feedback 2026-08-09):** отдельные сценарии day routes / presets нужно привязывать ко **времени** или давать рекомендацию **когда быть на первой точке** - особенно для **пригородов**, иначе не успеть.

| Слой | Правило |
|------|---------|
| **Продукт (UI)** | Краткое примечание в **head** выбранного маршрута (под заголовком chips panel в `CityDayPresetBlock`). Поле `timingNote` (опциональная короткая строка). Нет данных → блок не рендерить (не пустая строка). |
| **Контент** | Подробности - в companion-статье (`blogSlug`); в продукте не раздувать UI. |
| **Приоритет заполнения** | Пригороды и длинные day-trip сценарии (Петергоф, Царское Село / Пушкин, Кронштадт и аналоги). Городские короткие маршруты - по необходимости. |
| **Типографика** | В UI-текстах дефис `-`, не длинное тире. |

**Примеры СПб (seed):** `spb-petergof`, `spb-tsarskoe-selo`.

## 2026-08-09 - transitTip между точками day-trip (LOCKED)

**LOCKED owner (гид 2026-08-09):** в таймлайн «Что посмотреть» / suburb places имеет смысл вставлять короткие советы по транспорту между точками.

| Слой | Правило |
|------|---------|
| **Schema** | Опционально `transitTip?: string` на stop/place (`CityMustSeeItem` / `CitySuburbPlace`) - совет **к этой точке** от предыдущей (или от станции для первой). |
| **UI** | В `DayTripCanonCard` - серая строка над пунктом (`data-day-trip-transit-tip`). Scenarios light panel не обязаны показывать tips. |
| **Copy** | Коротко: «7-10 мин пешком», «такси 15 км», «паром ~30 мин». Дефис `-` в UI. |

## 2026-08-09 - Suburb nested POI count by density (LOCKED)

**LOCKED owner (2026-08-09):** пригороды СПб не обязаны укладываться в ровно 5 nested точек.

| Правило | Деталь |
|---------|--------|
| **Не жёсткие 5** | Объём `significantSuburbs[].places` = по насыщенности пригорода, не единый cap (правило для top cities suburbs, не только СПб). |
| **Плотные** | Дворец + парк + несколько must-see якорей → **7–9** (Петергоф, Царское / Пушкин, Выборг, Павловск, Ораниенбаум, Кронштадт…). |
| **Компактные** | Короткие day-trip / россыпь точек → **4–6** (Стрельна, Шлиссельбург, Курортный район, Сосновый Бор…). |
| **Пресеты / timing** | Companion `dayRoutePresets` синхронизировать с расширенным списком; при удлинении дня обновить `timingNote`. |
| **Код** | Hard-limit в UI на 5 нет; лимит маршрута my-day остаётся общим (15). |

---

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

**Статус 2026-08-09:** продуктовые пункты перенесены в **DEFERRED D1**. Tech issuance/DTO **code live on `.159`**; runtime closeout/e2e - в § Открыто (техника) п.1–2 + Roadmap. Не считать отсутствие ответов по 54-ФЗ / scanner day-1 блокером текущего sandbox closeout.

## 2026-08-07 - Order code ≠ ticket number (LOCKED draft)

**LOCKED draft (owner 2026-08-07):** `CheckoutOrder.publicCode` = **код заказа** (buyer support / payment). **Номер билета** музея / площадки - отдельная сущность; UI временно мог показывать тот же `publicCode` с подписью до issuance.

**Не** считать collapse к одному числу product end-state. Issuance path Stage 0 (`ticketNumbers`) - **code live on `.159`**; runtime confirm после sandbox pay - § Открыто п.1. Внешний scanner code ownership - DEFERRED D1.

## 2026-08-07 - Buyer ticket fields / finance enrichment gaps

Историческая таблица gaps; **код enrichment / issuance live on `.159`** (2026-08-09). До зелёного sandbox closeout (`CONFIRMED` + ticketNumbers в public lookup) не помечать Stage 0 «prod done» - см. § Открыто п.1.

| Field | Create STUB historically | Public order lookup |
|-------|--------------------------|---------------------|
| buyer.name | ✅ | ✅ code live; ⏳ e2e |
| venueTitle | ✅ subject | ✅ code live; ⏳ e2e |
| venueAddress | catalog interim | ✅ code live; ⏳ e2e |
| validTo / validityMode | product ✅; order snapshot | ✅ code live; ⏳ e2e |
| item(s) title+qty | ✅ single `item` | ✅ code live; multi-line later ok |
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

**LOCKED 2026-08-07 (owner OK, option A):** URL-семейство от **kind/role**, не от наличия билетов. Музей/театр/зал без афиши → `/venues`, buy-chrome скрыт до offers/sessions. Достопримечательности / парки / причалы / гастро-как-day-point → `/locations`. Commerce влияет только на UI chrome.

**LOCKED 2026-08-13 (owner):** «Места» = зонтик в IA, не замена entity URL.
1. Primary nav: **Города • События • Места • Подборки • Блог**.
2. `/places` - смешанная лента площадок и локаций; канон карточек остаётся `/venues/[slug]` и `/locations/[slug]` (не ломать ссылки).
3. Поиск в разделе **один** (`/places?q=`): музей и набережная в одном списке с тегом семейства.
4. `UX.LOC3` («Места и точки сбора») - superseded коротким лейблом «Места».
5. Потенциальные площадки (музей / театр / цирк / зал / филармония / ДК) **сразу в `/venues`** при create/seed. Нет билетов ≠ `/locations`.
   **Дворец с билетом на вход** (Юсуповский и аналоги) → тоже `/venues` (`MUSEUM_ART_SPACE`). Фасад/ансамбль без входного продукта → `/locations` (`ATTRACTION`).
6. **Кластер** (Новая Голландия, Севкабель Порт) = одна родительская **локация**, не площадка. Дети через `parentId` (v1 один уровень). События острова на родителе (или точном ребёнке); PDP агрегирует афишу. «Мой день» добавляет родителя, не взрывает детей. Канон: [place-cluster-canon.md](./place-cluster-canon.md). Schema/PDP = `CAT.PLACE-CLUSTER`, не сейчас.

**LOCKED 2026-08-13 (owner, visual Places + old listing slugs):**
1. Chrome `/places` как каталог площадок: eyebrow `N площадок • N локаций • N городов`; H1 `Музеи, театры, локации, достопримечательности {City_Род}`; строка поиска (город + сорт «По событиям»), **ниже** теги kind одной синей кнопкой (`Все места`, Музеи, Театр…); scope (все / площадки / локации / с событиями) - текстовые ссылки в одной строке с «Собрать день», без второй синей кнопки.
2. **Листинги** `/venues` и `/locations` (без slug) → **301** на `/places?family=institution` и `/places?family=location`. Query `city` / `q` / `type` / `page` сохраняется.
3. **Entity** `/venues/[slug]` и `/locations/[slug]` **не** редиректятся и остаются каноном карточек, блога, Мой день, inbound.
4. **Meta (owner 2026-08-14):** canonical хаба всегда чистый pathname `https://daibilet.ru/places` (strip `city`/`family`/`category`/`q`/`type`/`sort`/`page`). Не канонизировать на `/`. `?city=` не в sitemap - не invent indexable facets. Title/description city-aware для сниппета; robots index,follow + canon хаба (как `/events?city=`).
5. Sitemap listing = `/places` (не `/venues` и не `/locations` index). PDP URL в sitemap как раньше.

## 2026-08-13 - Place cluster (LOCKED, код later)

1. **Прятать детей из `/locations` выдачи?** Нет в v1 - свои SEO-карточки + блок «Что внутри» у родителя.
2. **Внуки (Бутылка → рестораны)?** Нет в v1. `parentId` = кластер (как в прозе owner).
3. **Следующие зонтики** (Бертгольд, Этажи, Зарядье): тот же паттерн после пилота НГ+Севкабель.

## 2026-08-01 - UX: Locations + mobile catalog — часть LOCKED; open → DEFERRED

Контекст: [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md).

1. **Лейбл `/locations`:** ✅ каталог H1 может оставаться «Локации»; primary = «Места» → `/places`.
2. **Nav:** ✅ **V1.1** - umbrella Места; порядок Города → События → Места.
3. **Default city / гео suggest:** **DEFERRED D3**.
4. **Список `/locations`:** ✅ SEO-контентные без афиши **да** (VK.8).
5. **Единый `/places` mixed grid без запроса:** ✅ 2026-08-13 (owner: два каталога на хабе смотрелись странно).

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

- YooKassa webhook canon: `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook` (events: succeeded / waiting_for_capture / canceled). Dual-webhook SKIP. **`pay.` = return/user only.**
- **Path A:** `daibilet.ru/checkout/admissions/{slug}` → result `?order={publicCode}` → `daibilet.ru/account/purchases`. `publicCode` = masked token, не DB id.
- **Path B calc:** DEFERRED D6 / forbidden for museum CTA.
- Webhook registration API → 401 historically; **owner 2026-08-09:** register/verify в кабинете ещё gate - § Открыто п.2 (свёртка «cabinet DONE»).

### Owner minimum (снимок 2026-08-09)

- Timeweb allow **MSK `.184` → finance `.159`** ✅
- YooKassa secrets на `.159` ✅ (never chat/git). Flags checkout/stub/verify как на хосте.
- Egress `.159` outbound 443+DNS ✅
- FIN.LC3 ✅ create-payment; **Stage 0 code live on `.159`** ✅
- Webhook: canon URL LOCKED; **register/verify cabinet = open** (owner wording) - § Открыто п.2
- **Open runtime:** Stage 0 closeout e2e (sandbox pay → CONFIRMED + ticketNumbers) - § Открыто п.1; дальше Roadmap финконтура
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

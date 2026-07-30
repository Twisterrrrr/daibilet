# Catalog ↔ Finance projection (canonical lock)

**Locked:** 2026-07-30  
**Hosts:** catalog `.184` (MSK) · finance `.159` (SPB) - см. [spb-finance-host.md](./spb-finance-host.md)  
**Product blueprint:** [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md)  
**Branches:** catalog docs / consumer на `feat/next-monorepo`; finance runtime Codex на `.159` (`codex/phase2-finance-supplier`); admission foundation Cursor на `cursor/phase-g-admission-checkout`.

Этот документ - **канон границы** между каталогом и финконтуром. **CF.P0+P1 на finance `.159` закрыты** (`0c1e464`); **CF.P1b+P2 catalog client/UI** - на `feat/next-monorepo` (deploy MSK + slug bridge для test museum).

---

## 1. Boundary (жёстко)

| Правило | Смысл |
|---------|--------|
| TC / Teplohod остаются на catalog/prod `.184` | Import, sync, widget secrets, ExternalOrder mirror - только catalog |
| Finance **не** импортирует TC/TEP и **не** участвует в catalog sync | Нет `TICKETSCLOUD_*` / `TEP_*` на `.159` |
| Catalog **не** ходит в finance DB напрямую | Только HTTPS API / read projection |
| Finance владеет INTERNAL_SALES / DAIBILET_MANAGED | Suppliers, AdmissionProduct, internal events, checkout, CheckoutOrder, buyer account internal path, supplier LC |
| Запись finance → catalog DB **запрещена** без явного projection/sync contract | Никаких ad-hoc upsert в catalog Postgres с finance |

**Оплата:**

- Импортные provider-события → виджет TC/TEP (как сейчас). **Не** YooKassa.
- AdmissionProduct / DAIBILET_MANAGED PLATFORM → Daibilet checkout на finance (`checkout.daibilet.ru`).

---

## 2. Ownership matrix (Cursor vs Codex)

| Contour | Owner | Branch / host |
|---------|-------|---------------|
| Catalog public/admin SSR, TC/TEP widgets, ExternalOrder sync | **Cursor** | `feat/next-monorepo` → `.184` |
| Finance API, STUB/YooKassa checkout, supplier LC, AdmissionProduct write/read on finance DB | **Codex** | `codex/phase2-finance-supplier` → `.159` |
| Cherry-pick / merge finance contracts into monorepo without breaking Next public | **Cursor** (integration) | `cursor/phase-g-admission-checkout` → merge в `feat/next-monorepo` после smoke |
| DNS stub TLS checkout/supplier | **Owner** Timeweb | A → `.159` |
| PurchaseProjection (unified read-model) | **Codex** (finance) + thin catalog proxy later | P0 blocker |

---

## 3. What catalog may read (projection contract)

Catalog UI потребляет **только** публичные/read DTO. Поля `paymentMode`, internal ids checkout, source/provider ids **не** для пользователя.

### 3.1 Supplier (public)

| Field | Notes |
|-------|--------|
| `supplierId` | internal id OK for joins; не показывать покупателю |
| `slug`, `title` | public |
| `status` | только ACTIVE в витрине |
| `integrationMode` | `INTERNAL_SALES` и т.п. - для policy, не copy |
| `defaultCatalogMode` | WIDGET_ONLY / INTERNAL_CHECKOUT / HYBRID |
| `paymentMode` | **internal only**, не user-facing |

### 3.2 Venue (enriched)

| Field | Notes |
|-------|--------|
| `venueId`, `slug`, `title` | |
| `citySlug`, `cityTitle` | |
| `kind` | `MUSEUM_ART_SPACE`, `THEATRE`, … |
| public visibility / SEO / content | живут на catalog; finance не перетирает без contract |
| admission availability summary | count published / `canSell` / `priceFromRub` min |

Venue page может иметь admission **независимо** от афиши событий.

### 3.3 AdmissionProduct (public card)

| Field | Notes |
|-------|--------|
| `id`, `slug`, titles | |
| venue / city / supplier refs | public titles+slugs |
| `type` | `MUSEUM_ENTRY` / … |
| status | только `PUBLISHED` в витрине |
| `purchaseFlow` | must be `PLATFORM` для CTA |
| `managementMode` | `DAIBILET_MANAGED` для managed path |
| validity | `OPEN_DATE` / date range (FIXED_WINDOW и т.п.) |
| `priceFromRub`, offers | display «от N ₽» только при валидной цене |
| `ticketsVacant` / availability | |
| `listingHealth` | admin/ops; public - только soft signals если нужно |
| `readiness.canSell` | **gate CTA** |

### 3.4 Checkout entry

- CTA «Купить» / «Оформить» **только** если `canSell === true`.
- AdmissionProduct → deep-link / redirect на **Daibilet checkout** (finance), **не** TC widget.
- Импортные events → provider widget (без изменений).

Пользователю **не** показывать: `External`/`sourceId`/`providerId`/`CheckoutOrder.id` (только `publicCode` / human labels).

---

## 4. Where to display (catalog UX)

| Surface | Rule |
|---------|------|
| Venue page | Блок **«Входные билеты»**, если есть published AdmissionProduct |
| City hub | Museums / art / admission venues, когда достаточно published products |
| Events catalog `/events` | **Не** смешивать admission как обычный event slot. Отдельный card type: «Входной билет», «Открытая дата», «от N ₽» |
| Theatre / gallery / museum **events** | Отдельная афиша (programme), не admission |
| Venue | Admission может жить без events |

---

## 5. Explicit don'ts

1. TC/TEP secrets на finance host.
2. Прямые writes finance → catalog DB без sync/projection contract.
3. User-facing technical ids (External*, sourceId, providerId, CheckoutOrder id).
4. AdmissionProduct как slotted Event в `/events` feed.
5. YooKassa для импортных provider events.
6. Wide real internal sales до **PurchaseProjection** (см. §6).

---

## 6. Mandatory backend gap: PurchaseProjection

**Факт сегодня:**

| Consumer | Reads today | Writes |
|----------|-------------|--------|
| Admin orders | `ExternalOrder` only | TC mirror / manual tickets |
| Internal checkout | `CheckoutOrder` (+ items, payment) | STUB / YooKassa on finance / phase-g |
| Buyer «Мои покупки» | `ExternalOrder` by email only | - |
| Supplier LC orders | `CheckoutItem` (internal) only | - |

**Need:** единый read-model `PurchaseProjection`:

| Audience | Sees |
|----------|------|
| Admin | External + Checkout (все покупки) |
| Buyer «Мои покупки» | свои External + Checkout без technical jargon |
| Supplier LC | свои `CheckoutItem` (+ later linked external if product says so) |

**PurchaseProjection на finance есть** (STUB smoke OK). **Wide real internal sales / catalog CTA всё ещё запрещены** до CF.P1b+P2 и отдельного YooKassa sandbox gate.

---

## 7. Gap analysis vs current code (2026-07-30)

### 7.1 Exists on `cursor/phase-g-admission-checkout` (и частично Codex `.159`)

| Piece | Status |
|-------|--------|
| Prisma `AdmissionProduct` / `AdmissionOffer` | ✅ schema + migrations (phase-g; **нет** на чистом `feat/next-monorepo` HEAD) |
| `Supplier.integrationMode` incl. `INTERNAL_SALES` | ✅ phase-g |
| Readiness `canSell` + listing health | ✅ phase-g |
| Admin `GET /api/admin/admission-products`, venue nested | ✅ |
| Supplier `GET /api/supplier/admissions`, orders via CheckoutItem | ✅ |
| STUB checkout admission path | ✅ |
| YooKassa sandbox path | ⏳ code on phase-g; **off** on `.159` |
| Finance host API `:4100` + nginx HTTP | ✅ Codex on `.159` |
| Seed `test-museum` / `test-museum-ticket` | ✅ script |

### 7.2 Catalog consumer gap (после finance P0+P1)

| Piece | Status |
|-------|--------|
| Public finance read APIs: supplier / venue admission summary / AdmissionProduct list+detail | ✅ на `.159` @ `0c1e464` (`/api/public/admission*` + `/api/public/finance/...`) |
| Catalog HTTP client → finance projection (auth, base URL, cache) | ✅ **CF.P1b** `apps/web/src/server/finance-projection-client.ts` (3s timeout, fail-soft) |
| Projection sync frequency / cache invalidation contract | ❌ (открыто в qa; MVP = SSR fetch `cache: no-store`) |
| Venue page «Входные билеты» на prod catalog | ✅ **CF.P2** `VenueAdmissionBlock` (slug join) |
| City hub museums/admission section gated by published count | ✅ **CF.P2b** `CityAdmissionBlock` (`CITY_ADMISSION_MIN_PUBLISHED`, default 1) |
| Separate admission card type in `/events` | ⏳ **CF.P2c** (card component есть: `AdmissionProductCard`; не в `/events` feed) |
| CTA → `checkout.daibilet.ru` only when `canSell` | ✅ **CF.P2d** `resolveAdmissionCheckoutUrl` + gate |

### 7.3 PurchaseProjection (P0) - finance DB

| Piece | Status |
|-------|--------|
| Unified DTO ExternalOrder + CheckoutOrder (finance host) | ✅ `purchase-projection.ts` @ `00aa9dcf` |
| Admin orders include CheckoutOrder | ✅ `sourceKind=internal`, `sourceCode=MANUAL` |
| Buyer account includes CheckoutOrder | ✅ `GET /api/account/purchases` |
| Supplier LC CheckoutItem projection | ✅ `loadSupplierCheckoutPurchaseRows` |
| Cross-DB link External (catalog `.184`) ↔ Checkout (finance `.159`) | ❌ separate DBs; catalog fan-in later |

### 7.4 Deploy / smoke on `.159` (2026-07-30, Cursor)

| Check | Result |
|-------|--------|
| Git | `codex/phase2-finance-supplier` @ `0c1e464` (ff `d2477ae`→`0c1e464`) |
| Health | `GET /api/health` → 200 |
| Public list/detail/venue/supplier | 200; seed `phase-g-test-museum-entry`; `canSell=true`; `checkoutPath` set; **no** `paymentMode` |
| STUB admission | `POST /api/checkout/stub` → 201 `publicCode=7649542`; idempotent retry same code |
| PurchaseProjection | admin+buyer+supplier rows see STUB order |
| YooKassa | **off** (`DAIBILET_YOOKASSA_CHECKOUT=0`); `YOOKASSA_SHOP_ID` / `SECRET_KEY` **missing** |
| MSK `.184` | не трогали |

---

## 8. Prioritized backlog

| Pri | ID | Task | Owner | Status |
|-----|-----|------|-------|--------|
| **P0** | CF.P0 | **PurchaseProjection** on finance | Codex | ✅ deployed `.159` |
| **P0** | CF.P0b | Gate: no wide CTA on `.184` until catalog client+UI ready | both | 🔒 still gated |
| **P1** | CF.P1 | Finance **public read** projection endpoints | Codex | ✅ deployed `.159` |
| **P1** | CF.P1b | Catalog read client + env (`FINANCE_API_BASE_URL`, service auth) | Cursor | ✅ code + deploy env hook |
| **P1** | CF.P1c | m2m token on `.159` + catalog | owner + Cursor | ⏳ optional token code ready; env unset |
| **P2** | CF.P2 | Venue page admission block (test museum) | Cursor | ✅ code (needs catalog venue slug `phase-g-test-museum`) |
| **P2** | CF.P2b | City hub museums/admission when published | Cursor | ✅ code (citySlug join, e.g. `moskva`) |
| **P2** | CF.P2c | Events catalog separate admission card type | Cursor | ⏳ card ready; `/events` feed later |
| **P2** | CF.P2d | CTA → Daibilet checkout; TC/TEP widgets untouched | Cursor | ✅ canSell gate |
| **P3** | CF.P3 | TLS + DNS stub; YooKassa sandbox; keep STUB | Codex + owner | ⏳ credentials missing |

---

## 9. Acceptance (catalog UI - Cursor P2)

1. Venue page: admission block for test museum via finance projection.
2. City hub: museums/admission when published products exist.
3. Admission CTA → Daibilet checkout (not TC widget); only if `canSell`.
4. STUB/YooKassa internal order visible in admin + supplier LC (via PurchaseProjection) - **STUB verified on finance**.
5. TC/TEP widgets unbroken on imported events.

---

## 10. Next implement step (ownership)

1. **Cursor (после P2 code):** deploy catalog web на MSK с `FINANCE_API_BASE_URL` (+ `FINANCE_API_HOST` если IP); slug bridge catalog venue ↔ finance `phase-g-test-museum`; CF.P2c `/events` feed optional; widgets regression; не писать в finance DB.
2. **YooKassa (не сейчас):** нужны `YOOKASSA_SHOP_ID` + `YOOKASSA_SECRET_KEY` (sandbox), DNS/TLS webhook URL на finance, reconcile job; **не** ставить `DAIBILET_YOOKASSA_CHECKOUT=1` пока STUB smoke и credentials не готовы. STUB оставить `=1`.
3. **Owner:** DNS A stub `checkout`/`supplier` → `.159`, затем TLS; optional set `DAIBILET_FINANCE_PROJECTION_TOKEN` on finance + catalog.

---

## 11. YooKassa readiness checklist (sandbox only)

| Step | Need | Status on `.159` |
|------|------|------------------|
| Keep STUB | `DAIBILET_STUB_CHECKOUT=1` | ✅ |
| Flag off until ready | `DAIBILET_YOOKASSA_CHECKOUT=0` | ✅ |
| Shop credentials | `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` | ❌ missing |
| API / return URL | `YOOKASSA_API_URL`, `YOOKASSA_RETURN_BASE_URL` | return set; API URL missing |
| Webhook verify | `DAIBILET_YOOKASSA_VERIFY_WEBHOOK=1` + public HTTPS webhook | ❌ no TLS/DNS yet |
| Webhook host | register → finance (`checkout`/`finance` `.159`), **not** catalog `.184` | ⏳ |
| Reconcile | scheduled `backend:checkout:yookassa:reconcile -- --apply` | ⏳ |
| Smoke | one `VENUE_ADMISSION` sandbox payment + PurchaseProjection visible | ⏳ after credentials |

**Do not** enable wide YooKassa or catalog CTA until checklist + P1b/P2 path ready.

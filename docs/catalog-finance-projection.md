# Catalog ↔ Finance projection (canonical lock)

**Locked:** 2026-07-30  
**Hosts:** catalog `.184` (MSK) · finance `.159` (SPB) — см. [spb-finance-host.md](./spb-finance-host.md)  
**Product blueprint:** [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md)  
**Finance smoke:** [finance-159-smoke-runbook.md](./finance-159-smoke-runbook.md)
**Branches:** catalog docs / consumer на `feat/next-monorepo`; finance runtime Codex на `.159` (`codex/phase2-finance-supplier`); admission foundation Cursor на `cursor/phase-g-admission-checkout`.

Этот документ - **канон границы** между каталогом и финконтуром. UI/checkout на catalog **не** реализовывать шире docs, пока не закрыты P0–P1 ниже.

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

**Until PurchaseProjection exists: no wide real internal sales** (только sandbox/STUB smoke на finance, без раскатки CTA на prod catalog).

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

### 7.2 Missing for catalog consumer (P1)

| Piece | Status |
|-------|--------|
| Public finance read APIs: supplier / venue admission summary / AdmissionProduct list+detail | ❌ нет `/api/public/admission*` |
| Catalog HTTP client → finance projection (auth, base URL, cache) | ❌ |
| Projection sync frequency / cache invalidation contract | ❌ (открыто в qa) |
| Venue page «Входные билеты» на prod catalog | ❌ UI not on feat HEAD |
| City hub museums/admission section gated by published count | ❌ |
| Separate admission card type in `/events` | ❌ |
| CTA → `checkout.daibilet.ru` only when `canSell` | ❌ |

### 7.3 PurchaseProjection (P0)

| Piece | Status |
|-------|--------|
| Unified DTO ExternalOrder + CheckoutOrder | ❌ (blueprint Phase 2.4 only) |
| Admin orders include CheckoutOrder | ❌ ExternalOrdersPage only |
| Buyer account includes CheckoutOrder | ❌ `buildAccountPurchases` = ExternalOrder email filter |
| Supplier LC already CheckoutItem | ✅ partial (не unified projection) |
| Cross-DB link External (catalog) ↔ Checkout (finance) | ❌ separate DBs after host split |

### 7.4 Status update from finance branch (2026-07-30)

| Piece | Status |
|-------|--------|
| CF.P0 PurchaseProjection | ✅ `GET /api/admin/orders`, `GET /api/account/purchases`, supplier orders/dashboard read internal checkout purchases |
| CF.P1 public admission list/detail | ✅ `GET /api/public/admission-products`, `GET /api/public/admission-products/:slug` |
| CF.P1 public venue admission summary | ✅ `GET /api/public/venues/:slug/admission-products` |
| CF.P1 public supplier projection | ✅ `GET /api/public/suppliers/:slug` |
| CF.P1 finance-prefix aliases | ✅ `/api/public/finance/admission-products*`, `/api/public/finance/venues/:slug/admission-products`, `/api/public/finance/suppliers/:slug` |
| CF.P1 m2m auth | ✅ optional `DAIBILET_FINANCE_PROJECTION_TOKEN` / `FINANCE_PROJECTION_TOKEN`; dev remains open when token is empty |
| CF.P1b catalog client/UI | ⏳ Cursor after contract freeze |

---

## 8. Prioritized backlog

| Pri | ID | Task | Owner |
|-----|-----|------|-------|
| **P0** | CF.P0 | **PurchaseProjection** contract + APIs (admin all, buyer purchases, supplier CheckoutItems) | Codex finance |
| **P0** | CF.P0b | Gate: no wide internal sales CTA on `.184` until P0 smoke | both |
| **P1** | CF.P1 | Finance **public read** projection endpoints (supplier/venue/admission) | Codex |
| **P1** | CF.P1b | Catalog read client + env (`FINANCE_API_BASE_URL`, service auth) | Cursor |
| **P1** | CF.P1c | Auth between catalog↔finance (m2m) - решить в qa | owner + Codex |
| **P2** | CF.P2 | Venue page admission block (test museum) | Cursor |
| **P2** | CF.P2b | City hub museums/admission when published | Cursor |
| **P2** | CF.P2c | Events catalog separate admission card type | Cursor |
| **P2** | CF.P2d | CTA → Daibilet checkout; TC/TEP widgets untouched | Cursor |
| **P3** | CF.P3 | TLS + DNS stub; YooKassa on; admin+supplier see STUB order | Codex + owner |

---

## 9. Acceptance (when implementing - not now)

1. Venue page: admission block for test museum.
2. City hub: museums/admission when published products exist.
3. Admission CTA → Daibilet checkout (not TC widget).
4. STUB/YooKassa internal order visible in admin + supplier LC (via PurchaseProjection).
5. TC/TEP widgets unbroken on imported events.

---

## 10. Next implement step (ownership)

1. **Codex (сейчас):** спроектировать и реализовать `PurchaseProjection` на finance DB / API; публичные read endpoints §3; не трогать TC secrets; не писать в catalog DB.
2. **Cursor (после P0 contract freeze):** catalog client + venue/city UI по projection; merge phase-g без поломки Next public handlers; widgets regression smoke.
3. **Owner:** DNS A stub `checkout`/`supplier` → `.159`, затем TLS.

Docs-only lock на этой ветке **не** включает полный UI/checkout.

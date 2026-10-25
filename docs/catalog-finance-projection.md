# Catalog ↔ Finance projection (canonical lock)

**Locked:** 2026-07-30 · sprint decisions Codex **2026-07-31** (§12)  
**Hosts:** catalog `.184` (MSK) · finance `.159` (SPB) - см. [spb-finance-host.md](./spb-finance-host.md)  
**Product blueprint:** [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md)  
**Branches:** catalog docs / consumer на `feat/next-monorepo`; finance runtime Codex на `.159` (`codex/phase2-finance-supplier`); admission foundation Cursor на `cursor/phase-g-admission-checkout`.

Этот документ - **канон границы** между каталогом и финконтуром. **CF.P0+P1 на finance `.159` закрыты** (`0c1e464` + contract harden `114dd391`); **CF.P1b+P2 catalog client/UI** - на `feat/next-monorepo` (deploy MSK). **MSK→finance сеть PASS** (Fair Snipe, 2026-07-31). CF.P2e venue seed на MSK PG done; Next venue HTML после web rebuild. Smoke ops: finance branch `docs/finance-159-smoke-runbook.md` (ссылается сюда).

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
- AdmissionProduct / DAIBILET_MANAGED PLATFORM → Daibilet checkout.
  - **Path A - simple admissions / museums (NOW):** thin email → finance create-payment → **redirect YooKassa `confirmationUrl`**. No multi-step calc. Catalog: `daibilet.ru/checkout/admissions/{slug}` → result `…/checkout/result?order={publicCode}` (+ ticket `…/checkout/ticket/{publicCode}`) → account `…/account/purchases`. **Buyer ticket card / print / best-effort mail = catalog closed 2026-08-07 without Codex.** Finance must set YooKassa `return_url` to `https://daibilet.ru/checkout/result?order={publicCode}` (not supplier SPA).
  - **Path B - complex calc (FUTURE, optional):** internal pricing UI when product needs qty/packages/promo - scaffold `daibilet.ru/checkout/calc`. Simple museum flow must **not** go through Path B.
  - **Codex parallel experiment:** thin buyer routes on `pay.daibilet.ru` (`.159`) - не force-merge с catalog track.
  - Alias `checkout.daibilet.ru` не обязателен.

---

## 2. Ownership matrix (Cursor vs Codex)

| Contour | Owner | Branch / host |
|---------|-------|---------------|
| Catalog public/admin SSR, TC/TEP widgets, ExternalOrder sync | **Cursor** | `feat/next-monorepo` → `.184` |
| Finance API, STUB/YooKassa checkout, supplier LC, AdmissionProduct write/read on finance DB | **Codex** | `codex/phase2-finance-supplier` → `.159` |
| Cherry-pick / merge finance contracts into monorepo without breaking Next public | **Cursor** (integration) | `cursor/phase-g-admission-checkout` → merge в `feat/next-monorepo` после smoke |
| DNS stub TLS `pay`/`supplier`/`finance-api` | **Owner** Timeweb | ✅ A → `.159` + LE SAN (2026-07-30); `checkout`/`finance.` не нужны |
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
| CTA → `pay.daibilet.ru` only when `canSell` | ✅ **CF.P2d** `resolveAdmissionCheckoutUrl` + gate (`FINANCE_CHECKOUT_BASE_URL` → pay) |

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
| Git | `codex/phase2-finance-supplier` @ `114dd391` (runtime API still `0c1e464`+; harden = contract tests) |
| Health | `GET /api/health` → 200 |
| Public list/detail/venue/supplier | 200; seed `phase-g-test-museum-entry`; `canSell=true`; `checkoutPath` set; **no** `paymentMode` |
| Contract guards (`114dd391`) | public DTO без `paymentMode` / provider·source ids / checkout·internal order ids; `checkoutPath` только при `canSell===true`; admission `purchaseFlow=PLATFORM` |
| STUB admission | `POST /api/checkout/stub` → 201 `publicCode=7649542`; idempotent retry same code |
| PurchaseProjection | admin+buyer+supplier rows see STUB order |
| YooKassa | **off** (`DAIBILET_YOOKASSA_CHECKOUT=0`); `SHOP_ID=1424801`; `SECRET_KEY=<set>` (2026-07-31); egress DNS FAIL → smoke deferred |
| MSK `.184` | CF.P1b+P2 code deployed; `FINANCE_API_BASE_URL=https://finance-api.daibilet.ru`; MSK→`.159` **PASS** (Fair Snipe); CF.P2e venue `phase-g-test-museum` seeded (`ven_phase_g_test_museum_catalog`); city hub RSC admission non-empty; Next `/venues/...` HTML ждёт web rebuild (admission-only dto gate) |

---

## 8. Prioritized backlog

| Pri | ID | Task | Owner | Status |
|-----|-----|------|-------|--------|
| **P0** | CF.P0 | **PurchaseProjection** on finance | Codex | ✅ deployed `.159` |
| **P0** | CF.P0b | Gate: no wide CTA on `.184` until catalog client+UI ready | both | 🔒 still gated |
| **P1** | CF.P1 | Finance **public read** projection endpoints | Codex | ✅ deployed `.159` + contract tests `114dd391` |
| **P1** | CF.P1b | Catalog read client + env (`FINANCE_API_BASE_URL`, service auth) | Cursor | ✅ code + deploy env hook |
| **P1** | CF.P1c | m2m Bearer catalog↔finance (Codex lock) | owner + Cursor | ⏳ recommended; env unset; ETA 0.5-1d |
| **P2** | CF.P2 | Venue page admission block (test museum) | Cursor | ✅ code; CF.P2e venue seeded; Next HTML after rebuild |
| **P2** | CF.P2b | City hub museums/admission when published | Cursor | ✅ code (citySlug join, e.g. `moskva`); live RSC smoke 2026-07-31 |
| **P2** | CF.P2c | Events catalog separate admission card type | Cursor | ⏳ card ready; `/events` feed later |
| **P2** | CF.P2d | CTA → Daibilet checkout (`pay`); TC/TEP widgets untouched | Cursor | ✅ canSell gate |
| **P3** | CF.P3 | DNS/TLS ✅; YooKassa secrets `<set>` + webhook canon; keep STUB | Codex + owner | 🔄 creds ✅; CHECKOUT=0; egress ❌; webhook register ⏳ |

---

## 9. Acceptance (catalog UI - Cursor P2)

1. Venue page: admission block for test museum via finance projection.
2. City hub: museums/admission when published products exist.
3. Admission CTA → Daibilet checkout (not TC widget); only if `canSell`.
4. STUB/YooKassa internal order visible in admin + supplier LC (via PurchaseProjection) - **STUB verified on finance**.
5. TC/TEP widgets unbroken on imported events.

---

## 10. Next implement step (ownership)

1. **Owner (blocker):** Timeweb SG **Diligent Polydeuces** (`.159`) - исходящий TCP **443 + DNS**. Сейчас DNS к `127.0.0.53` timeout → `api.yookassa.ru` / GitHub egress **FAIL**. Без этого Week 1 не стартует.
2. **Owner:** SSH для Codex - ключ `daibilet_spb_finance` (есть у Cursor) или добавить Codex pubkey в `authorized_keys` на `.159`.
3. **Cursor:** web rebuild MSK dto admission-only; wide CTA **out**. TC/TEP не трогать.
4. **Codex (после egress green):** Week 1 order - sandbox create-payment + webhook/reconcile runbook; `DAIBILET_YOOKASSA_CHECKOUT=1` только после egress OK (Cursor/owner flip). STUB остаётся admin/dev.

---

## 11. YooKassa readiness checklist (sandbox only)

| Step | Need | Status on `.159` |
|------|------|------------------|
| Keep STUB | `DAIBILET_STUB_CHECKOUT=1` | ✅ (dual-run; leave admin/dev) |
| Flag off until egress | `DAIBILET_YOOKASSA_CHECKOUT=0` | ✅ **kept 0** - egress FAIL 2026-07-31 |
| Shop credentials | `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` | ✅ `SHOP_ID=1424801`; `SECRET_KEY=<set>` (Cursor merge 2026-07-31; never in chat/git) |
| Return base (interim) | `YOOKASSA_RETURN_BASE_URL` | ✅ `https://supplier.daibilet.ru` (interim) |
| Return / thank-you (catalog Cursor) | `daibilet.ru/checkout/result?order=publicCode` | ✅ MVP 2026-08-07 |
| Return / thank-you (Codex pay experiment) | `pay.daibilet.ru/checkout/result?order=publicCode` | 🔄 parallel |
| Webhook verify flag | `DAIBILET_YOOKASSA_VERIFY_WEBHOOK` | ✅ `=0` until verify ready (ETA 1-2d after egress) |
| Webhook canon URL | `https://finance-api.daibilet.ru/api/checkout/yookassa/webhook` | 🔒 locked; register in ЮKassa after smoke |
| Dual-webhook old endpoint | 3-7d only if prior live payments | 🔒 skip if no prior internal live payments |
| Reconcile | manual-first → timer; sandbox grace 0-5 min | ⏳ after egress |
| Smoke | one sandbox create-payment + PP visible | 🚫 blocked egress |
| Wide catalog CTA | out until separate gate | 🔒 |

**Do not** enable wide YooKassa or catalog CTA until checklist + egress + sandbox smoke.

---

## 12. Finance sprint lock (Codex answers 2026-07-31)

| Topic | Decision |
|-------|----------|
| Boundaries | `.184` Cursor catalog · `.159` Codex finance · TC/TEP secrets off finance · no catalog→finance DB · Admission ≠ Event slot · wide CTA out |
| Webhook URL | **`https://finance-api.daibilet.ru/api/checkout/yookassa/webhook`**; `pay` = user checkout/return surface |
| Dual-webhook | 3-7d only if prior live payments/webhooks; else **skip** |
| Verify (`VERIFY_WEBHOOK=1`) | S2S fetch payment by `object.id`; IP/signature later; ETA **1-2d** after egress/key; idempotency + safe fetch |
| Reconcile | manual-first then systemd timer; sandbox grace **0-5**; prod 30-60 |
| Dual-run | STUB + YooKassa; STUB stay **admin/dev** (not full off after 3-5 pays) |
| Admin approve legal/bank | DoD: approve/reject + comment + verifiedAt/by + immutable snapshot; ETA **2-3d** |
| Ledger MVP | sale / commission / refund adjustment; **real payouts out** |
| m2m | **Bearer** recommended (not IP-only); ETA 0.5-1d when token from owner |
| Return URL | Catalog MVP: `daibilet.ru/checkout/result?order=publicCode`; Codex parallel: `pay.daibilet.ru/checkout/result?order=publicCode` |
| PP identity | MVP = `publicCode` + buyer email/phone; ExternalOrder catalog-only |
| SSH | Cursor has `daibilet_spb_finance`; Codex needs same key / owner adds Codex pubkey |
| Secret | installed on `.159` by Cursor from owner local env; verify only `<set>`; **never in chat** |
| Week plan (D0 = egress+key) | **W1** YooKassa+webhook/reconcile 4-5d · **W2** supplier LC + admin legal + reaper 4-5d · **W3** controlled catalog path + ledger + m2m 4-5d · **W4** harden/timer/docs/smoke 3-5d |

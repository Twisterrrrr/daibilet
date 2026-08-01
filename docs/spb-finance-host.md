# СПб / finance host — canonical roles (lock 2026-07-30)

**Обновлено:** 2026-08-01  
**План миграции:** [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md)  
**Phase G product:** [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md)

**MSK Timeweb SG:** панель **Fair Snipe** (2026-07-31) - egress TCP `80`/`443` → finance `.159` ✅ (раньше self-loop был у **Daring Aquila** ≈ Friendly Pheasant `.184`). DNS `:53` any рекомендуется. Step 1 network MSK→finance **closed**.

**Web deploy (2026-08-01):** build **только** на MSK `.184` (`deploy-prod-next.sh`). SPB `.16` **не** builder - owner удаляет VM в Timeweb (MIG.9.7).

## Role matrix (canonical)

| Server | IP | Role now | Target role |
|--------|-----|----------|-------------|
| Friendly Pheasant (МСК) | `201.24.125.184` | catalog / prod + **web build** | **battle catalog:** public, admin, import, SEO, TC/Teplohod catalog |
| Diligent Polydeuces (СПб 8 ГБ) | `85.193.80.159` | finance API + TLS vhosts | **battle finance:** primary finance, supplier LK, buyer checkout (`pay`) |
| ~~Intelligent Hoopoe (СПб 4 ГБ)~~ | ~~`213.171.7.16`~~ | leftover post-MIG.8 | **retired from pipeline** → delete VM in Timeweb |

**Коротко:** `.184` = battle catalog + build · `.159` = battle finance · `.16` = demolish (owner).

SSH: MSK `daibilet_msk80_key` / `daibilet-msk` · `.16` `daibilet_staging_key` (пока VM жив) · `.159` `daibilet_spb_finance` (alias `daibilet-spb8` / `spb8` / `daibilet-finance`). Codex также имеет свой SSH-ключ на `.159` (активный деплой - **не** перебивать параллельным SSH без координации).

### Состояние `.159` (2026-07-30, Cursor deploy P0+P1)

| Компонент | Статус |
|-----------|--------|
| SSH / UFW | OK; allow 22/80/443; deny public 5432/5437 |
| docker / nginx / certbot / Node22 / pnpm 11.7 | installed |
| Paths | `/opt/daibilet-finance`, `/opt/daibilet-staging`, `/opt/daibilet`, `/root/backups` |
| Git app | `/opt/daibilet-finance/app` · ветка `codex/phase2-finance-supplier` @ `0c1e464` runtime (+ tip `114dd391` contract tests; redeploy optional) |
| Finance PG | `daibilet-finance-postgres` · `127.0.0.1:5437` · migrations + seed smoke OK |
| Finance API | systemd `daibilet-finance-api` · `127.0.0.1:4100` · health 200 |
| Public projection | ✅ `/api/public/admission-products*` / venues / suppliers (+ `/finance/` aliases) |
| PurchaseProjection | ✅ admin/buyer/supplier read STUB checkout orders |
| nginx HTTP | `supplier` / `pay` / `finance-api` → supplier dist + `/api` → `:4100` |
| TLS | ✅ Let's Encrypt SAN: `supplier` + `pay` + `finance-api` (cert `supplier.daibilet.ru`); HTTP→HTTPS |
| Checkout / YooKassa | STUB **on** · YooKassa **off** (shop id/secret missing) |
| MSK catalog `.184` | CF.P1b+P2 live; `FINANCE_API_BASE_URL=https://finance-api.daibilet.ru`; MSK→finance **PASS** (Fair Snipe); CF.P2e venue seeded |
| DNS stub | ✅ `pay` / `supplier` / `finance-api` → `.159`; `checkout` / `finance` не созданы (не обязательны) |

---

## Contour split (API only)

| Contour | Host | Owns |
|---------|------|------|
| Catalog | `.184` | events, venues, SSR/ISR, admin catalog, TC/TEP **import** + widgets + ExternalOrder mirror, SEO |
| Finance | `.159` | INTERNAL_SALES / DAIBILET_MANAGED: suppliers, AdmissionProduct, checkout, CheckoutOrder, supplier LC, YooKassa webhooks, finance API |
| Bridge | HTTPS API / read projection | catalog UI читает public projection; checkout CTA → finance; **без** shared money/catalog DB mess |

**Канон projection (lock 2026-07-30):** [catalog-finance-projection.md](./catalog-finance-projection.md)

### Hard rules (catalog ↔ finance)

1. Finance **не** импортирует TC/TEP и **не** участвует в catalog sync; **нет** TC/TEP secrets на `.159`.
2. Catalog **не** пишет и **не** читает finance Postgres напрямую - только API/read projection.
3. Finance **не** пишет в catalog DB без явного projection/sync contract.
4. AdmissionProduct CTA → Daibilet checkout; импортные events → provider widget (не YooKassa).
5. Wide internal sales **запрещены**, пока нет `PurchaseProjection` (admin + buyer + supplier LC).

### Target finance DNS (locked 2026-07-30)

| Hostname | Role | DNS+TLS |
|----------|------|---------|
| **`pay.daibilet.ru`** | buyer checkout (**канон**) | ✅ A → `.159` · LE SAN |
| `checkout.daibilet.ru` | optional alias | ❌ не создан (не обязателен) |
| `supplier.daibilet.ru` | ЛК поставщиков | ✅ |
| `finance-api.daibilet.ru` | API / projection / webhooks Host | ✅ |
| `finance.daibilet.ru` | legacy/опциональный vhost | ❌ не создан (не обязателен) |

Apex `daibilet.ru` / `www` / `api` / `admin` каталога остаются на `.184` (не на `.16`).

---

## Состояние `213.171.7.16` (retired from pipeline 2026-08-01)

SSH probe: `daibilet_staging_key` → OK. Public web/api/timers уже off (MIG.8). **Не** использовать как builder. Удаление VM - только owner в панели Timeweb.

### Что можно безопасно снести вместе с VM

| Компонент | Примечание |
|-----------|------------|
| `/opt/daibilet`, `/opt/daibilet-staging`, `/opt/daibilet-spbboats-backup-*` | leftover app code |
| Postgres Docker `daibilet-tours-postgres` `:5437` | **не** live catalog (truth = MSK); не money DB |
| nginx `daibilet.conf` + старые LE certs на этом хосте | apex DNS уже на `.184` |
| `/root/backups/*` на диске `.16` | перед wipe - optional scp off-box |
| SSH host keys / `daibilet_staging_key` доступ | после delete VM ключ бесполезен для `.16` |
| failed `daibilet-*-rebuild.service` units | мусор |

### Что должно остаться (НЕ на `.16`)

| Компонент | Где |
|-----------|-----|
| Live catalog web/api/PG/nginx/TLS | MSK `.184` |
| Finance API / pay / supplier / YooKassa | `.159` |
| Apex DNS `daibilet.ru` / `www` / `api` / `admin` | → `.184` |
| Finance DNS `pay` / `supplier` / `finance-api` | → `.159` |
| TC/TEP sync cron + secrets | MSK `.184` (убедиться Teplohod allowlist = `.184`) |

### Исторический inventory (MIG.8)

| Компонент | Статус |
|-----------|--------|
| Postgres Docker `:5437` (`daibilet-tours-postgres`) | running leftover (не live) |
| nginx + TLS certs | reserve |
| `/opt/daibilet`, `/opt/daibilet-staging` | код на диске |
| Staging units `daibilet-*-staging` | disabled |
| `daibilet-web` / `daibilet-api` / TC timer / crontab sync | stop+disable (MIG.8) |
| Snapshots `/root/backups/daibilet-pg-mig8-*` | на диске `.16` |

Не коммитить dump/`.env` в git.

---

## Правила (lock)

1. **Не** трогать `.184` как battle catalog - только perf/DTO/SSR/DNS AAAA hygiene (AAAA уже снят owner).
2. **Не** включать TC/TEP catalog sync на СПб finance - source of truth каталога = МСК.
3. Finance PG на `.159` - **отдельный** volume/DB; не restore catalog dump как money DB.
4. Catalog ↔ finance **только API / projection**; internal orders/purchases/suppliers живут на finance; ExternalOrder mirror остаётся на catalog до явного bridge.
5. YooKassa: только internal/PLATFORM path; webhook → новый finance API; старый держать до smoke; затем отключить. **Не** для TC/TEP widgets.
6. **`.16` retired from pipeline (2026-08-01):** optional off-box backup → **удалить VM Intelligent Hoopoe в панели Timeweb**. Не держать как builder.
7. Public DNS apex остаётся на `201.24.125.184`.
8. Ownership: Cursor = catalog/widgets; Codex = finance/admission/checkout на `.159`. См. [catalog-finance-projection.md](./catalog-finance-projection.md).
9. Web deploy = **MSK-only** (`deploy-prod-next.sh` на `.184`).

См. [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md), [migration-spb-to-msk.md](./migration-spb-to-msk.md).

# СПб / finance host — canonical roles (lock 2026-07-30)

**Обновлено:** 2026-07-31  
**План миграции:** [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md)  
**Phase G product:** [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md)

**MSK Timeweb SG:** панель **Fair Snipe** (2026-07-31) - egress TCP `80`/`443` → finance `.159` ✅ (раньше self-loop был у **Daring Aquila** ≈ Friendly Pheasant `.184`). DNS `:53` any рекомендуется. Step 1 network MSK→finance **closed**.

## Role matrix (canonical)

| Server | IP | Role now | Target role |
|--------|-----|----------|-------------|
| Friendly Pheasant (МСК) | `201.24.125.184` | catalog / prod | **battle catalog:** public, admin, import, SEO, TC/Teplohod catalog |
| Intelligent Hoopoe (СПб 4 ГБ) | `213.171.7.16` | post-MIG.8 leftover | **temporary** staging/build/config reserve + migration source → **retire** |
| Diligent Polydeuces (СПб 8 ГБ) | `85.193.80.159` | Phase 3: finance API + TLS vhosts (Codex) | **battle finance:** primary finance, supplier LK, buyer checkout (`pay`) |

**Коротко:** `.184` = battle catalog · `.159` = battle finance · `.16` = scaffolding then demolish.

SSH: MSK `daibilet_msk80_key` / `daibilet-msk` · `.16` `daibilet_staging_key` · `.159` `daibilet_spb_finance` (alias `daibilet-spb8` / `spb8` / `daibilet-finance`). Codex также имеет свой SSH-ключ на `.159` (активный деплой - **не** перебивать параллельным SSH без координации).

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

## Состояние `213.171.7.16` (после MIG.8, до retire)

### Что оставлено

| Компонент | Статус |
|-----------|--------|
| Postgres Docker `:5437` (`daibilet-tours-postgres`) | running (leftover catalog volume - **не** live money) |
| nginx + TLS certs | running (reserve / migration source) |
| `/opt/daibilet`, `/opt/daibilet-staging` | код на диске |
| Staging units `daibilet-*-staging` | disabled |

### Что снято (MIG.8)

| Компонент | Действие |
|-----------|----------|
| `daibilet-web` / `daibilet-api` | stop + disable |
| `daibilet-tc-catalog-sync.timer` | stop + disable |
| crontab: tc-orders, tep-catalog, blog digest, reviews, oom-watch | `# MIG.8 disabled` |
| Backup crontab | `/root/backups/crontab-before-mig8-20260730.txt` |

### Snapshots (2026-07-30)

| Файл | Назначение |
|------|------------|
| `/root/backups/daibilet-pg-mig8-20260730.dump` (+ `.sha256`) | `pg_dump -Fc` |
| `/root/backups/daibilet-pg-volume-mig8-20260730.tgz` (+ `.sha256`) | tar Docker volume |

Не коммитить dump/`.env` в git.

---

## Правила (lock)

1. **Не** трогать `.184` как battle catalog - только perf/DTO/SSR/DNS AAAA hygiene (AAAA уже снят owner).
2. **Не** включать TC/TEP catalog sync на СПб finance - source of truth каталога = МСК.
3. Finance PG на `.159` - **отдельный** volume/DB; не restore catalog dump как money DB.
4. Catalog ↔ finance **только API / projection**; internal orders/purchases/suppliers живут на finance; ExternalOrder mirror остаётся на catalog до явного bridge.
5. YooKassa: только internal/PLATFORM path; webhook → новый finance API; старый держать до smoke; затем отключить. **Не** для TC/TEP widgets.
6. После smoke на `.159`: backup `.16` и удаление VM (retention 7–14 дней).
7. Public DNS apex остаётся на `201.24.125.184`.
8. Ownership: Cursor = catalog/widgets; Codex = finance/admission/checkout на `.159`. См. [catalog-finance-projection.md](./catalog-finance-projection.md).

См. [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md), [migration-spb-to-msk.md](./migration-spb-to-msk.md).

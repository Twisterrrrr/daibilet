# СПб / finance host — canonical roles (lock 2026-07-30)

**Обновлено:** 2026-07-30  
**План миграции:** [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md)  
**Phase G product:** [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md)

## Role matrix (canonical)

| Server | IP | Role now | Target role |
|--------|-----|----------|-------------|
| Friendly Pheasant (МСК) | `201.24.125.184` | catalog / prod | **battle catalog:** public, admin, import, SEO, TC/Teplohod catalog |
| Intelligent Hoopoe (СПб 4 ГБ) | `213.171.7.16` | post-MIG.8 leftover | **temporary** staging/build/config reserve + migration source → **retire** |
| Diligent Polydeuces (СПб 8 ГБ) | `85.193.80.159` | empty / provisioning | **battle finance:** primary finance, supplier LK, buyer checkout |

**Коротко:** `.184` = battle catalog · `.159` = battle finance · `.16` = scaffolding then demolish.

SSH: MSK `daibilet_msk80_key` / `daibilet-msk` · `.16` `daibilet_staging_key` · `.159` TBD Phase 0.

---

## Contour split (API only)

| Contour | Host | Owns |
|---------|------|------|
| Catalog | `.184` | events, venues, SSR/ISR, admin catalog, TC/TEP **import**, SEO |
| Finance | `.159` | checkout, orders/purchases, suppliers, YooKassa webhooks, finance API |
| Bridge | HTTPS API | catalog UI → checkout на finance; **без** shared money/catalog DB mess |

### Target finance DNS (stub → cutover)

| Hostname | Role |
|----------|------|
| **`checkout.daibilet.ru`** | buyer checkout (**primary suggestion**) |
| `pay.daibilet.ru` | optional alias (открытый вопрос в [qa.md](./qa.md)) |
| `supplier.daibilet.ru` | ЛК поставщиков |
| `finance-api.daibilet.ru` | optional dedicated API |

Apex `daibilet.ru` / `www` / `api` / `admin` каталога остаются на `.184`.

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
4. Catalog ↔ finance **только API**; orders/purchases/suppliers живут на finance.
5. YooKassa: webhook → новый finance API; старый держать до smoke; затем отключить.
6. После smoke на `.159`: backup `.16` и удаление VM (retention 7–14 дней).
7. Public DNS apex остаётся на `201.24.125.184`.

См. [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md), [migration-spb-to-msk.md](./migration-spb-to-msk.md).

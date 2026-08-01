# Миграция СПб: finance primary на 8 ГБ (MIG.9)

**Дата плана:** 2026-07-30  
**Lock ролей:** 2026-07-30 (owner confirmed)  
**Ветка docs:** `feat/next-monorepo`  
**Связанные:** [spb-finance-host.md](./spb-finance-host.md) · [migration-spb-to-msk.md](./migration-spb-to-msk.md) · [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md)

## Canonical role matrix

| Server (Timeweb) | IP | Role now | Target role |
|------------------|-----|----------|-------------|
| **Friendly Pheasant** | `201.24.125.184` | catalog / prod + web build | **battle catalog:** public, admin, import, SEO, TC/Teplohod catalog |
| **Diligent Polydeuces** | `85.193.80.159` | finance API + TLS | **battle finance:** primary finance / supplier / buyer checkout |
| ~~**Intelligent Hoopoe**~~ | ~~`213.171.7.16`~~ | post-MIG.8 leftover | **retired from pipeline 2026-08-01** → owner deletes VM |

**Коротко:** `.184` = battle catalog + build · `.159` = battle finance · `.16` = demolish (owner Timeweb).

| SSH key (факт) | Host |
|----------------|------|
| `daibilet_msk80_key` / `daibilet-msk` | `201.24.125.184` |
| `daibilet_staging_key` | `213.171.7.16` (пока VM жив) |
| `daibilet_spb_finance` (`daibilet-finance-159`) | `85.193.80.159` |

---

## 1. Goal / non-goals

### Goal

1. Поднять **`85.193.80.159` как primary finance/supplier/checkout** (не «слепо перенести все роли 4 ГБ»).
2. Держать **`201.24.125.184` как battle catalog** - только perf / DTO / SSR / DNS hygiene (AAAA уже снят owner).
3. ~~Использовать `213.171.7.16` временно как staging/build~~ → **done/superseded 2026-08-01:** `.16` retired from pipeline; delete VM in Timeweb.
4. Связь **catalog ↔ finance только через API** (без shared mess / shared money DB).
5. YooKassa webhook → новый finance API; старый webhook держать до подтверждения, затем отключить.

### Non-goals (явно)

- **Не** трогать `201.24.125.184` как prod catalog (не cutover catalog на СПб).
- **Не** переносить public catalog / apex `daibilet.ru` / `www` / `api.daibilet.ru` / `admin.daibilet.ru` на `.159`.
- **Не** включать TC/TEP **catalog** sync / catalog orders cron на finance host (source of truth каталога = МСК).
- **Не** деплоить finance runtime на МСК catalog host.
- **Не** смешивать finance PG с catalog dump MSK / leftover `daibilet-tours-postgres` как live money DB.
- **Не** «просто заменить 4 ГБ на 8 ГБ один-в-один» без разделения: finance = primary на `.159`; staging/build на `.159` только пока удобно как scaffolding, не как оправдание держать `.16` forever.

### Architecture split (API-only)

| Contour | Host | Owns |
|---------|------|------|
| **Catalog** | `.184` | events, venues, public SSR/ISR, admin catalog, TC/Teplohod **import/sync**, SEO |
| **Finance** | `.159` | buyer checkout, orders/purchases, suppliers LK, YooKassa webhooks, finance API |
| Bridge | HTTPS API | catalog показывает события → checkout уходит на finance host; нет shared DB volume |

Целевые DNS на finance (stub до cutover):

| Hostname | Назначение | Примечание |
|----------|------------|------------|
| **`checkout.daibilet.ru`** | buyer checkout (primary suggestion) | рекомендовать как канон |
| `pay.daibilet.ru` | optional alias | см. [qa.md](./qa.md) |
| `supplier.daibilet.ru` | ЛК поставщиков | |
| `finance-api.daibilet.ru` | optional dedicated API hostname | maybe |

---

## 2. Inventory: что живёт на `213.171.7.16` сегодня (после MIG.8)

Источник: [spb-finance-host.md](./spb-finance-host.md) + снимок MIG.8 в Diary 2026-07-30.

### Services / systemd

| Компонент | Статус на 4 ГБ |
|-----------|----------------|
| `daibilet-web` / `daibilet-api` (public) | **stop + disable** (MIG.8) |
| `daibilet-tc-catalog-sync.timer` | **stop + disable** |
| `daibilet-*-staging` | **disabled** (не поднимать без запроса; код/юниты на диске) |
| `nginx` | **running** (reserve / migration source) |
| `docker` | **running** |

### Docker / Postgres

| Компонент | Детали |
|-----------|--------|
| Контейнер | `daibilet-tours-postgres` (`postgres:17-alpine`) |
| Port | host `:5437` |
| Volume | `daibilet_daibilet-postgres-data` |
| Назначение сейчас | leftover catalog snapshot; **не** live money DB |
| Snapshots MIG.8 | `/root/backups/daibilet-pg-mig8-20260730.dump` (+ sha256), volume `.tgz` |

### Paths / code

| Путь | Назначение |
|------|------------|
| `/opt/daibilet` | код + build workspace (часто `feat/next-monorepo`) |
| `/opt/daibilet-staging` | staging tree |
| `/var/www/daibilet/*` | static/admin staging/prod leftovers |
| `/root/backups/` | PG dumps, crontab backup |

### Crontab / secrets

- Prod catalog jobs закомментированы `# MIG.8 disabled`.
- На `.159`: **не** раскомментировать catalog/orders sync.
- Secrets: `/opt/daibilet/.env`, staging `.env`, certs - не в git; finance secrets - отдельный `.env`.

### Build role (временный)

- Пока MSK egress к GitHub/fonts мёртв: `pnpm web:build` на СПб → scp `.next` на МСК.
- После cutover finance: build может жить на `.159` как temporary scaffolding или уйти в CI - не держать `.16` ради build.

---

## 3. Ordered phases (MIG.9)

### Phase 0 - Access на `.159` (первый физический шаг)

- [x] Timeweb/UFW на `85.193.80.159`: TCP **22**, **80**, **443** (UFW active 2026-07-30; panel firewall - confirm owner).
- [x] SSH: `daibilet_spb_finance` в `authorized_keys` (comment `daibilet-finance-159`).
- [x] Alias:

```text
Host daibilet-spb8 spb8 daibilet-finance
    HostName 85.193.80.159
    User root
    IdentityFile ~/.ssh/daibilet_spb_finance
    IdentitiesOnly yes
```

- [x] Smoke: hostname `spb-3-vm-ukly`, Ubuntu 24.04, ~7.8 Gi RAM, `/` 77G.
- [ ] **DNS stub (ещё без cutover traffic):** A-записи `checkout` / `supplier` / optional `finance-api` → `85.193.80.159` (Timeweb panel; API token недоступен агенту).
- [x] **Не** менять apex / catalog DNS на `.184`.

### Phase 1 - Base stack на `.159`

- [x] docker / nginx / certbot / git / rsync / Node 22 + corepack `pnpm@11.7.0`.
- [x] `vm.swappiness=10`; каталоги `/opt/daibilet-finance`, `/opt/daibilet-staging`, `/opt/daibilet`, `/root/backups`.

### Phase 2 - Postgres finance (primary)

- [x] **Fresh** Docker volume `daibilet-finance-pg-data` + DB `daibilet_finance` (не catalog dump); container `daibilet-finance-postgres`, bind `127.0.0.1:5437`.
- [x] Migrations + seed smoke (Codex, inspection 2026-07-30).
- [ ] Optional staging PG отдельно (`:5438`).
- [x] Leftover catalog volume на `.16` - только forensic / migration source (не трогали).

### Phase 3 - Finance app + domains (partial - Codex active)

- [x] Deploy finance runtime: `/opt/daibilet-finance/app` · `codex/phase2-finance-supplier` @ `d2477ae`.
- [x] systemd `daibilet-finance-api` на `127.0.0.1:4100`.
- [x] nginx **HTTP** vhosts: `supplier.daibilet.ru` / `checkout.daibilet.ru` / `finance.daibilet.ru` → supplier dist + `/api` → `:4100`.
- [x] STUB checkout **on**; YooKassa **off**.
- [ ] TLS (certbot) - **после** DNS stub A от owner.
- [ ] Catalog `.184` → checkout links / API base URL на finance host (env), без shared DB.
- [ ] **Не** SSH-менять `.159` параллельно с Codex; **не** трогать MSK.

### Phase 4 - Staging/build scaffolding (temporary on `.159`)

- [ ] При необходимости перенести staging/build с `.16` на `.159` (reserve), **не** как justification держать dual finance forever.
- [ ] Build → scp to MSK `201.24.125.184` пока нужен offline deploy.

### Phase 5 - YooKassa + DNS cutover finance

- [ ] Webhook YooKassa → **новый** finance API на `.159`.
- [ ] Старый webhook (если был на `.16` / elsewhere) **оставить** до smoke confirmed.
- [ ] После smoke: отключить старый webhook.
- [ ] DNS finance hostnames → `85.193.80.159` (не apex catalog).

### Phase 6 - Smoke

- [ ] Checkout HTTPS + health finance API.
- [ ] Supplier login smoke (когда UI готов).
- [ ] Test payment / webhook delivery на новый endpoint.
- [ ] Catalog `.184`: events/venues OK; buy CTA → finance host.
- [ ] На `.159` **нет** active TC/TEP **catalog** sync timers.
- [ ] Apex `daibilet.ru` всё ещё `201.24.125.184`.

### Phase 7 - Retire `.16`

- [ ] Final backup с `213.171.7.16` (PG dump / volume / configs) → off-box или `/root/backups` на `.159`.
- [ ] Stop services on `.16`; Timeweb snapshot retention **7–14 дней**.
- [ ] Delete / power-off VM после retention (owner).
- [ ] Docs: canonical SPB finance = `85.193.80.159`; `.16` только historical.

---

## 4. Rollback plan

| Ситуация | Действие |
|----------|----------|
| Phase 0–1 fail | Чинить `.159`; `.16` и `.184` не трогать |
| Finance smoke fail | DNS finance hostname вернуть / оставить stub; webhook оставить на старом endpoint |
| YooKassa dual period | Оба webhook до confirmed; затем только `.159` |
| Build fail на `.159` | Временно build на `.16` или MSK/CI |
| Случайно сменили apex | Немедленно A → `201.24.125.184` |
| Нужен откат retire | Не delete disk `.16` в день cutover |

Правило: **catalog/prod всегда на МСК**; **finance battle всегда целится на `.159`**.

---

## 5. Master checklist

- [x] Phase 0 SSH + firewall (DNS stub ⏳ owner)
- [x] Phase 1 base stack
- [x] Phase 2 finance PG fresh + migrations/seed smoke
- [~] Phase 3 finance app + HTTP vhosts (TLS ⏳ after DNS)
- [ ] Phase 4 optional staging/build move
- [ ] Phase 5 YooKassa new webhook + keep old until confirmed
- [ ] Phase 6 smoke
- [ ] Phase 7 backup + retire `.16`
- [x] Docs lock: `spb-finance-host.md` + MIG.9 tracker (TLS/DNS cutover ещё open)

---

## 6. Docs / scripts hygiene

**`deploy/scripts`:** хардкода IP нет (on-host). Обновлять IP в runbooks после cutover.

Grep hitlist после retire: `spb-finance-host.md`, `current-state.md`, `deploy-staging.md`, phases, `integrations.md` (Teplohod allowlist - только если sync снова со СПб; обычно нет).

---

## 7. Рекомендация одной строкой

**`.184` = battle catalog · `.159` = battle finance (checkout/supplier) · `.16` = temporary scaffolding → delete after smoke.**

## 8. Следующий физический шаг

```bash
# DNS stub в Timeweb (owner) - БЛОКЕР TLS:
# A checkout.daibilet.ru → 85.193.80.159
# A supplier.daibilet.ru → 85.193.80.159
# A finance.daibilet.ru → 85.193.80.159   # уже в nginx HTTP
# optional A finance-api.daibilet.ru → 85.193.80.159
# НЕ трогать apex/www/api/admin → .184

# Codex активен на .159 - не параллельный SSH-деплой без координации.
# После DNS: certbot TLS → затем Phase 5 YooKassa (сейчас off; STUB checkout on).
```

Phase 0–2 ✅; Phase 3 partial (API `:4100` + HTTP nginx, no TLS) - Codex @ `d2477ae`. YooKassa live / payment secrets - не выдумывать.

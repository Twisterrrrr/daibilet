# Миграция СПб: 4 ГБ → 8 ГБ (finance / staging / build)

**Дата плана:** 2026-07-30  
**Ветка docs:** `feat/next-monorepo`  
**Связанные:** [spb-finance-host.md](./spb-finance-host.md) · [migration-spb-to-msk.md](./migration-spb-to-msk.md) · [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md)

| Роль | Хост Timeweb | IP | RAM | SSH key (факт) |
|------|--------------|-----|-----|----------------|
| **Источник (старый СПб)** | Intelligent Hoopoe | `213.171.7.16` | ~3.8 Gi | `daibilet_staging_key` |
| **Цель (новый СПб)** | Diligent Polydeuces | `85.193.80.159` | ~8 Gi | TBD (Phase 0) |
| **Catalog / prod (НЕ трогать)** | Friendly Pheasant МСК | `201.24.125.184` | ~7.8 Gi | `daibilet_msk80_key` / `daibilet-msk` |

---

## 1. Goal / non-goals

### Goal

Перенести **только роли старого СПб после MIG.8** на новый 8 ГБ VPS, затем вывести 4 ГБ из эксплуатации:

1. **Finance host** - отдельный Postgres (и позже Phase G / ЛК поставщиков), не catalog MSK.
2. **Staging** - Next + API (`/opt/daibilet-staging`, units `daibilet-*-staging`).
3. **Build host** - `pnpm web:build` → tarball/scp `.next` на МСК (когда MSK egress к GitHub/fonts недоступен).
4. nginx + TLS для **staging / admin-finance hostnames only**.
5. Retire `213.171.7.16` после smoke + snapshot retention.

### Non-goals (явно)

- **Не** переносить public catalog / `daibilet.ru` / `www` / `api.daibilet.ru` / `admin.daibilet.ru` на новый СПб.
- **Не** включать TC/TEP catalog sync / orders cron на СПб (source of truth = МСК; MIG.8 остаётся в силе).
- **Не** деплоить finance runtime на МСК catalog host.
- **Не** смешивать finance PG volume с catalog dump MSK / со старым `daibilet-tours-postgres` как live money DB без изоляции.
- **Не** трогать DNS apex `daibilet.ru` / `www` (остаются на `201.24.125.184`).
- Optional later (отдельный тикет): sync-worker на новом СПб → запись в MSK PG, **только если** MSK egress остаётся сломан.

---

## 2. Inventory: что живёт на `213.171.7.16` сегодня (после MIG.8)

Источник истины: [spb-finance-host.md](./spb-finance-host.md) + снимок MIG.8 в Diary 2026-07-30.

### Services / systemd

| Компонент | Статус на 4 ГБ |
|-----------|----------------|
| `daibilet-web` / `daibilet-api` (public) | **stop + disable** (MIG.8) |
| `daibilet-tc-catalog-sync.timer` | **stop + disable** |
| `daibilet-*-staging` | **disabled** (не поднимать без запроса; код/юниты на диске) |
| `nginx` | **running** (будущий staging/finance vhost) |
| `docker` | **running** |

### Docker / Postgres

| Компонент | Детали |
|-----------|--------|
| Контейнер | `daibilet-tours-postgres` (`postgres:17-alpine`) |
| Port | host `:5437` |
| Volume | `daibilet_daibilet-postgres-data` |
| Назначение сейчас | leftover catalog snapshot host; **не** live money DB |
| Snapshots MIG.8 | `/root/backups/daibilet-pg-mig8-20260730.dump` (+ sha256), volume `.tgz` |

### Paths / code

| Путь | Назначение |
|------|------------|
| `/opt/daibilet` | код + build workspace (часто `feat/next-monorepo`) |
| `/opt/daibilet-staging` | staging tree |
| `/var/www/daibilet/*` | static/admin staging/prod leftovers |
| `/root/backups/` | PG dumps, crontab backup |

### nginx / TLS

- nginx active; Let's Encrypt certs historically for `daibilet.ru` / staging hostnames на этом IP.
- После MIG.8 public DNS уже на МСК - certs на 4 ГБ нужны только для staging/finance vhosts при cutover DNS.

### Crontab

- Prod jobs (tc-orders, tep-catalog, blog digest, reviews, oom-watch) закомментированы `# MIG.8 disabled`.
- Backup: `/root/backups/crontab-before-mig8-20260730.txt`.
- На 8 ГБ: **не** раскомментировать catalog/orders sync.

### SSH / keys

- Client: `%USERPROFILE%\.ssh\daibilet_staging_key` → `root@213.171.7.16`.
- На сервере: `/root/.ssh/authorized_keys` (скопировать публичный ключ на 8 ГБ в Phase 0).
- Deploy-скрипты в repo **не хардкодят IP** - выполняются **на** хосте; IP сидит в docs / локальном SSH config / ручных `ssh root@…`.

### Build role (факт ops)

- `pnpm web:build` на СПб → scp `.next` + sources на МСК `201.24.125.184` (offline deploy при мёртвом MSK egress).
- Heap: на 3.8 Gi historically 2560Mi; на 8 Gi можно 5120Mi как на МСК.

### Secrets (не в git)

- `/opt/daibilet/.env`, `/opt/daibilet-staging/.env`
- certbot/letsencrypt private keys
- Любые finance secrets (когда появятся) - отдельный `.env`, не catalog.

---

## 3. Ordered phases

### Phase 0 - Access

- [ ] Timeweb: убедиться, что `85.193.80.159` (Diligent Polydeuces) в нужном регионе СПб, firewall/panel: TCP **22**, **80**, **443** inbound.
- [ ] SSH: добавить `daibilet_staging_key` (или новый `daibilet_spb8_key`) в `authorized_keys` на 8 ГБ.
- [ ] Локальный SSH alias, например:

```text
Host daibilet-spb8 spb8
    HostName 85.193.80.159
    User root
    IdentityFile ~/.ssh/daibilet_staging_key
    IdentitiesOnly yes
```

- [ ] Smoke: `ssh daibilet-spb8 'uname -a; free -h; df -h /'`.
- [ ] Hostname: зафиксировать guest hostname (Timeweb) в этом файле и в `current-state.md` после cutover.
- [ ] **Не** менять DNS prod.

### Phase 1 - Base stack

- [ ] Ubuntu packages: `docker.io` / compose plugin, `nginx`, `certbot`, `git`, `curl`, `rsync`, `build-essential`.
- [ ] Node via **corepack** + `pnpm@11.7.0` (как в deploy-скриптах).
- [ ] `vm.swappiness=10` (как в `deploy-prod-next.sh`).
- [ ] UFW optional: allow 22/80/443 only; не блокировать SSH до проверки.
- [ ] Каталоги: `/opt/daibilet`, `/opt/daibilet-staging`, `/root/backups`, `/var/www/daibilet`.

### Phase 2 - Postgres finance

**Правило:** finance DB **отдельный** volume/DB name. Catalog leftover dump - не live money.

Вариант A (предпочтительно для finance greenfield):

- [ ] Поднять Docker Postgres `:5437` (или отдельный порт, напр. `:5439`) с **новым** volume `daibilet-finance-pg-data`.
- [ ] Создать DB `daibilet_finance` (имя зафиксировать в `.env.example` finance).
- [ ] Пустой schema / migrate Phase G когда код готов - **не** restore catalog dump как finance.

Вариант B (если на 4 ГБ уже есть отдельные finance данные):

- [ ] `pg_dump -Fc` только finance DB со старого хоста → scp → `pg_restore` на 8 ГБ.
- [ ] Проверить, что dump **не** содержит catalog MSK secrets reuse без ротации.

Staging DB (опционально в этой же фазе или Phase 3):

- [ ] Отдельный контейнер/порт (`deploy/docker-compose.staging-db.yml` → `:5438` / `daibilet_staging`) - не шарить с finance.

Leftover catalog volume на 4 ГБ:

- [ ] Не поднимать как source of truth; при необходимости держать dump только для forensic / rollback N дней.

### Phase 3 - Staging Next / API

- [ ] `git clone` / rsync `/opt/daibilet-staging` с 4 ГБ или fresh clone `feat/next-monorepo`.
- [ ] Скопировать staging `.env` (поправить `DATABASE_URL` на local staging PG).
- [ ] Установить systemd: `deploy/systemd/daibilet-api-staging.service`, `daibilet-web-staging.service`.
- [ ] nginx vhost для `staging.daibilet.ru` (и при необходимости staging-admin) → proxy Next/API staging ports.
- [ ] `BRANCH=feat/next-monorepo ./deploy/scripts/deploy-staging-next.sh` (или `deploy-staging.sh`).
- [ ] Локальный smoke: `curl -fsS http://127.0.0.1:<web>/api/health` до DNS cutover (`--resolve` / hosts).

### Phase 4 - Build host + deploy docs/scripts IP hygiene

- [ ] `/opt/daibilet` на 8 ГБ: same branch SHA, `pnpm install`, проверка `pnpm web:build` с heap 5120Mi.
- [ ] Проверить scp/rsync path до МСК: `root@201.24.125.184:/opt/daibilet` (ключ с 8 ГБ на MSK authorized_keys).
- [ ] Обновить **локальный** SSH config / runbooks: build host = `85.193.80.159`.
- [ ] Обновить docs с хардкодом `213.171.7.16` (список ниже) - после cutover.
- [ ] Deploy scripts в `deploy/scripts/*.sh` IP не содержат - менять не обязательно; при появлении wrapper'ов с IP - сразу на `85.193.80.159`.

### Phase 5 - DNS (только staging / finance hostnames)

Переключать **только** записи, которые сейчас (или будут) указывать на старый СПб:

- [ ] `staging.daibilet.ru` (и www-staging, если есть) → `85.193.80.159`
- [ ] Любой будущий `finance.*` / `admin-finance.*` / supplier LK hostname → `85.193.80.159`
- [ ] TLS: `certbot` на 8 ГБ для этих имён после DNS (или DNS-01 заранее)
- [ ] **Не** трогать: `daibilet.ru`, `www`, `api.daibilet.ru`, `admin.daibilet.ru` (= МСК)

### Phase 6 - Cutover smoke

- [ ] Staging HTTPS 200 + `/api/health` + Basic Auth admin staging
- [ ] Finance PG: connect from app / `psql` (если уже есть schema)
- [ ] Build: `pnpm web:build` на 8 ГБ → scp tarball на МСК → `systemctl restart daibilet-web` на МСК → public smoke `https://daibilet.ru/`
- [ ] Убедиться: на 8 ГБ **нет** active `daibilet-tc-catalog-sync.timer` / catalog crontab
- [ ] Убедиться: public DNS A `daibilet.ru` всё ещё `201.24.125.184`

### Phase 7 - Disable 4 ГБ, snapshot retention

- [ ] Stop docker PG / nginx на `213.171.7.16` (или оставить read-only snapshot host)
- [ ] Финальный `pg_dump` + volume tar + sha256 → скачать off-box или держать на 8 ГБ `/root/backups/`
- [ ] Timeweb: snapshot/backup диска 4 ГБ, **хранить N = 7–14 дней**
- [ ] Отключить автопродление / power-off VM после N дней (owner decision)
- [ ] Обновить `docs/spb-finance-host.md`, `docs/current-state.md`: canonical SPB = `85.193.80.159`
- [ ] Grep по репо: не должно остаться «живых» runbook-ссылок на `213.171.7.16` как на active host (архивные даты в Diary OK)

---

## 4. Rollback plan

| Ситуация | Действие |
|----------|----------|
| Phase 0–1 fail | Чинить 8 ГБ; 4 ГБ не трогать |
| Staging на 8 ГБ сломан после DNS | A-запись staging вернуть на `213.171.7.16`; поднять staging units на 4 ГБ |
| Finance PG corrupt на 8 ГБ | Restore из dump; DNS finance hostname на 4 ГБ если там ещё живой volume |
| Build на 8 ГБ OOM/fail | Временно build снова на 4 ГБ или на MSK (если egress OK) / CI |
| Случайно сменили apex DNS | Немедленно A `daibilet.ru`/`www` → `201.24.125.184`; не использовать 8 ГБ как catalog |
| Нужен полный откат миграции ролей | Оставить 4 ГБ powered on до конца retention; не delete disk в день cutover |

Правило: **catalog/prod всегда откатывается на МСК**, не на СПб.

---

## 5. Master checklist (кратко)

- [ ] Phase 0 access SSH/firewall
- [ ] Phase 1 docker/node/nginx/certbot
- [ ] Phase 2 finance PG (fresh или dump) + optional staging PG
- [ ] Phase 3 staging Next/API + nginx
- [ ] Phase 4 build host + scp to MSK
- [ ] Phase 5 DNS staging/finance only
- [ ] Phase 6 smoke
- [ ] Phase 7 retire 4 ГБ + retention N days
- [ ] Docs: `spb-finance-host.md` + `current-state.md` + IP grep

---

## 6. Скрипты и docs с `213.171.7.16` (обновить после cutover)

### `deploy/scripts` (код)

**Хардкода IP нет.** Скрипты рассчитаны на запуск на сервере (`APP_DIR=/opt/...`). Обновлять IP не требуется, пока не появятся remote-SSH wrappers.

Имеет смысл держать на 8 ГБ те же entrypoints:

- `deploy/scripts/deploy-staging-next.sh`
- `deploy/scripts/deploy-staging.sh`
- `deploy/scripts/deploy-prod-next.sh` (на МСК; build может идти на СПб 8 ГБ отдельно)
- `deploy/scripts/restore-staging-db.sh`
- `deploy/systemd/daibilet-*-staging.service`

### Docs / runbooks (grep hitlist)

| Файл | Заметка |
|------|---------|
| `docs/spb-finance-host.md` | canonical host → `85.193.80.159` после Phase 7 |
| `docs/current-state.md` | строка «СПб (не public)» |
| `docs/migration-spb-to-msk.md` | исторический снимок; добавить footnote «SPB roles → 8GB» |
| `docs/deploy-timeweb.md` | устаревший prod IP; пометить archive / MSK |
| `docs/deploy-staging.md` | `ssh root@…` |
| `docs/phases/phase-f3-cutover-checklist.md` | ssh example |
| `docs/phases/phase-d-deploy-parity.md` | ssh example |
| `docs/integrations.md` | Teplohod allowlist IP → новый СПб **или** MSK (prod sync) |
| `docs/mentor-review.md` | whitelist note |
| `docs/geo-excluded-cities.md` | audit date context |
| `docs/checkpoint-2026-07-10-mvp-launch.md` | historical |

Teplohod/TicketsCloud **allowlist**: prod sync сейчас с МСК - новый СПб IP добавлять в whitelist партнёра только если с него снова пойдут боевые sync (обычно не нужно после MIG.8).

---

## 7. Рекомендация одной строкой

**Новый 8 ГБ = замена ролей старого СПб (finance + staging + build); catalog/prod остаётся на МСК `201.24.125.184`.**

## 8. Следующий физический шаг

```bash
ssh root@85.193.80.159
# или после Phase 0 alias:
ssh daibilet-spb8
```

Проверить: ключ принят, `free -h` ~8 Gi, открыты 22/80/443 в панели Timeweb.

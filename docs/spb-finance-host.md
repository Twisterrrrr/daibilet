# СПб host — finance + staging (после MIG.8)

**Обновлено:** 2026-07-30  
**Host (текущий 4 ГБ):** `213.171.7.16` Intelligent Hoopoe (`daibilet_staging_key`)  
**Цель (8 ГБ, план):** `85.193.80.159` Diligent Polydeuces - см. [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md)  
**Роль:** не public prod. Каталог / TC / TEP sync / orders - **только МСК**.

---

## Что оставлено

| Компонент | Статус |
|-----------|--------|
| Postgres Docker `:5437` (`daibilet-tours-postgres`) | running (volume `daibilet_daibilet-postgres-data`) |
| nginx + TLS certs | running (будущий staging/finance vhost) |
| `/opt/daibilet`, `/opt/daibilet-staging` | код на диске |
| Staging units `daibilet-*-staging` | disabled (не поднимать без запроса) |

## Что снято (MIG.8)

| Компонент | Действие |
|-----------|----------|
| `daibilet-web` / `daibilet-api` | stop + disable |
| `daibilet-tc-catalog-sync.timer` | stop + disable |
| crontab: tc-orders, tep-catalog, blog digest, reviews, oom-watch | закомментированы `# MIG.8 disabled` |
| Backup crontab | `/root/backups/crontab-before-mig8-20260730.txt` |

## Snapshots (2026-07-30)

| Файл | Назначение |
|------|------------|
| `/root/backups/daibilet-pg-mig8-20260730.dump` (+ `.sha256`) | `pg_dump -Fc` |
| `/root/backups/daibilet-pg-volume-mig8-20260730.tgz` (+ `.sha256`) | tar Docker volume |

Не коммитить dump/`.env` в git.

## Правила

1. **Не** включать TC/TEP catalog sync на СПб — source of truth каталога = МСК.
2. Платежный / finance PG — **отдельный** volume/DB, не catalog MSK и не этот dump как live money DB без изоляции.
3. Public DNS (`daibilet.ru`) остаётся на МСК `201.24.125.184`.
4. IPv6 AAAA на МСК — только после открытия TCP 80/443 в панели Timeweb.

См. [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md), [migration-spb-to-msk.md](./migration-spb-to-msk.md), Phase G: [phase-2-finance-supplier-blueprint.md](./phase-2-finance-supplier-blueprint.md).


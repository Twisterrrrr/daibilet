# Postgres backup and restore runbook

Date: 2026-08-30

## Scope

MSK catalog production host `201.24.125.184` only.
**Never** restore a dump into prod `daibilet-tours-postgres` / `:5437`.
Restore drills use isolated staging Postgres on `127.0.0.1:5438`.

## Scripts (repo)

| Script | Purpose |
|--------|---------|
| [deploy/cron/postgres-backup.sh](../deploy/cron/postgres-backup.sh) | Daily `pg_dump` (custom format), verify, retention |
| [deploy/scripts/postgres-restore-drill.sh](../deploy/scripts/postgres-restore-drill.sh) | Restore latest dump → staging + count parity |
| [deploy/scripts/install-postgres-backup-cron.sh](../deploy/scripts/install-postgres-backup-cron.sh) | One-time install `/etc/cron.d/daibilet-postgres-backup` |
| [deploy/scripts/restore-staging-db.sh](../deploy/scripts/restore-staging-db.sh) | Full prod→staging when `/opt/daibilet-staging` exists |

## Production state

- Postgres: Docker `daibilet-tours-postgres`, port `5437`, DB/user `daibilet`.
- Backups dir: `/var/backups/daibilet/postgres/`.
- Staging drill DB: Docker `daibilet-staging-postgres`, port `5438`, DB `daibilet_staging`.
- Staging password: `/opt/daibilet/var/secrets/staging-postgres.password` (auto-created on first drill).

## One-time install (MSK, root)

```bash
cd /opt/daibilet
git pull origin feat/next-monorepo
sudo bash deploy/scripts/install-postgres-backup-cron.sh
```

## Manual backup now

```bash
sudo APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/postgres-backup.sh
readlink -f /var/backups/daibilet/postgres/LATEST.dump
find /var/backups/daibilet/postgres -maxdepth 1 -type f -name 'daibilet-*.dump' -printf '%TY-%Tm-%Td %TH:%TM %s %p\n' | sort
```

Expected dump size: tens to low hundreds of MB (DB ~2.3G on disk includes indexes/WAL overhead; logical dump is smaller).

Retention defaults: **7 daily** + **4 weekly** markers (symlinks).

## Restore drill (safe)

Does **not** stop prod API. Creates/uses staging container only.

```bash
cd /opt/daibilet
sudo CONFIRM=restore-drill deploy/scripts/postgres-restore-drill.sh
awk '/DRILL OK/ { line = $0 } END { print line }' /var/log/daibilet/postgres-restore-drill.log
```

Success line: `DRILL OK` and matching `events,venues,orders` vs prod.

Optional explicit dump:

```bash
sudo CONFIRM=restore-drill DUMP=/var/backups/daibilet/postgres/daibilet-20260830T120000Z.dump \
  deploy/scripts/postgres-restore-drill.sh
```

## Cron

File: `/etc/cron.d/daibilet-postgres-backup` — daily **04:35 UTC**.
Log: `/var/log/daibilet/postgres-backup.log`.

## Smoke after drill

```bash
docker exec daibilet-staging-postgres psql -U daibilet -d daibilet_staging -c \
  'SELECT (SELECT count(*)::int FROM "Event") AS events,
          (SELECT count(*)::int FROM "Venue") AS venues,
          (SELECT count(*)::int FROM "ExternalOrder") AS orders;'
```

Prod health (unchanged):

```bash
curl -fsS http://127.0.0.1:4000/api/health
curl -fsS http://127.0.0.1:4000/api/public/stats
```

## RPO / RTO (target)

| Metric | Target | Current after install |
|--------|--------|------------------------|
| RPO | ≤ 24h | Daily 04:35 UTC dump |
| RTO | ≤ 2h staging smoke | Drill script ~5–15 min |
| Retention | 7d + 4w | Script defaults |

Off-host copy (Timeweb Object Storage / second VM) — follow-up, not blocking drill.

## Timeweb VM snapshots

Optional layer: whole-disk autobackup in Timeweb panel (billed per **80 GB disk**, not used %).
Complements but does not replace logical `pg_dump` (granular restore, staging parity).

## Checklist closeout

After first successful backup + drill on MSK, update:

- [production-readiness-checklist.md](./production-readiness-checklist.md) §7
- [Tasktracker.md](./Tasktracker.md) `PROD.POSTGRES-BACKUP`

Record in Diary: dump filename, size, drill timestamp, prod/staging counts.

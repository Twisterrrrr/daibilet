# Postgres backup and restore runbook

Date: 2026-08-29

## Scope

This runbook covers the MSK catalog production host `201.24.125.184` only.
Do not run destructive restore commands on production. Restore drills must target
staging or a disposable database/container.

## Current production state

- App directory: `/opt/daibilet`.
- Postgres runs in Docker container `daibilet-tours-postgres`.
- Image: `postgres:17-alpine`.
- Host port: `5437`.
- Database/user from compose: `daibilet` / `daibilet`.
- Docker volume: `daibilet_daibilet-postgres-data` mounted to `/var/lib/postgresql/data`.
- Existing app backup artifact found: `/var/backups/daibilet/next-backup-20260730-162111.tgz`.
- No active `pg_dump` cron was found in `/etc/cron.d/` or root crontab during the 2026-08-29 audit.
- `/opt/daibilet-staging` is currently absent, so staging restore parity is not active.

## Current risk

Until a regular DB dump or verified external snapshot policy exists, DB-level RPO
is not guaranteed from inside the server. If Timeweb VM/disk snapshots are enabled,
their schedule and retention should be treated as the temporary RPO/RTO contract
only after owner verification in the Timeweb panel.

Recommended launch minimum:

- RPO: 24 hours or better.
- RTO: 2 hours to restore staging and validate API/public smoke.
- Retention: 7 daily dumps plus 4 weekly dumps.
- At least one off-host copy: S3-compatible storage, Timeweb Object Storage, or another locked server.

## Manual backup command

Run as root on `201.24.125.184`:

```bash
mkdir -p /var/backups/daibilet/postgres
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
docker exec daibilet-tours-postgres pg_dump \
  -U daibilet \
  -d daibilet \
  --format=custom \
  --no-owner \
  --no-acl \
  > "/var/backups/daibilet/postgres/daibilet-${stamp}.dump"
pg_restore --list "/var/backups/daibilet/postgres/daibilet-${stamp}.dump" >/dev/null
ls -lh "/var/backups/daibilet/postgres/daibilet-${stamp}.dump"
```

## Suggested cron

Create `/etc/cron.d/daibilet-postgres-backup` after owner approval:

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

35 4 * * * root /opt/daibilet/deploy/cron/postgres-backup.sh >> /var/log/daibilet/postgres-backup.log 2>&1
```

The script should:

- create a custom-format `pg_dump`;
- verify it with `pg_restore --list`;
- keep daily/weekly retention;
- optionally upload the dump off-host;
- never print `DATABASE_URL` or secrets.

## Restore drill outline

Do not restore into production.

Preferred target:

1. Prepare `/opt/daibilet-staging`.
2. Start a separate staging Postgres container, for example `daibilet-staging-postgres` on port `5438`.
3. Restore a recent production dump into the staging database.
4. Run Prisma migrations against staging.
5. Smoke counts and public/admin API against staging.

Existing helper:

```bash
/opt/daibilet/deploy/scripts/restore-staging-db.sh
```

Important: this helper drops and recreates the staging database. Run it only when
the owner explicitly approves a restore drill and the staging target is confirmed.

## Smoke after restore

Minimum checks:

```bash
docker exec daibilet-staging-postgres psql -U daibilet -d daibilet_staging -c \
  'select (select count(*)::int from "Event") as events, (select count(*)::int from "Venue") as venues, (select count(*)::int from "ExternalOrder") as orders;'

curl -fsS http://127.0.0.1:4000/api/health
curl -fsS http://127.0.0.1:4000/api/public/stats
```

## Open follow-ups

- Confirm Timeweb snapshot schedule and retention for `201.24.125.184`.
- Add a real `deploy/cron/postgres-backup.sh`.
- Add an off-host copy target.
- Recreate staging catalog host or document that staging parity is intentionally off.

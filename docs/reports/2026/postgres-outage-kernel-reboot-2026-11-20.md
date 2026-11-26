# Production incident: kernel auto-reboot left Postgres down for 16h

**Date:** 2026-11-20 15:51 UTC
**Environment:** MSK production - `daibilet-web`/`daibilet-api` (systemd), Docker `daibilet-tours-postgres:5437`
**Status:** recovered; hardened with a restart policy and a liveness alert.

## Impact

Crawler monitoring reported bot 5xx across `/events`, `/venues`, `/locations`,
`/cities`, `/places` and `/sitemaps/venues.xml` from ~16:44 UTC on 20.11 through
the 21.11 morning. The web app was not the root cause: the postgres container was
down, so every `/api/public/*` call returned HTTP 500 and the web DTO caches
propagated 500s. The monitor reported `referenceErrors: 0` throughout - no JS
ReferenceError - and the deploy `Verify` step for run #982 also went red on the
same venue-500 symptom.

## Root cause

1. Ubuntu unattended-upgrades installed a kernel update (`6.8.0-136-generi` to
   `6.8.0-149-generi`) and rebooted the host. `last -x reboot` shows the new
   kernel booted at 16:08; the old kernel ran since 29.07.
2. systemd stopped `docker.service` + `containerd.service`; dockerd's graceful
   shutdown sent SIGTERM to the postgres container - "received fast shutdown
   request", `exit=0`, `oom=false` (clean stop, not OOM, not a crash).
3. The postgres service in `docker-compose.yml` had no `restart:` policy, so when
   docker came back at 16:08 the container stayed `Exited (0)`.
4. `daibilet-web`/`daibilet-api` are systemd services (`Restart=always`), came
   back automatically, and kept failing with `connect ECONNREFUSED 127.0.0.1:5437`.

Not the 17.11 shm incident (ShmSize stayed 512 MiB) and not a cron/timer job - no
scheduled job issues `docker stop` on postgres.

## Recovery

- `docker compose up -d postgres` (data volume `daibilet-postgres-data` intact).
- Smoke: `health 200`, `home 200`, `venue money-honey 200`, `events 200`,
  `city moskva 200`, `venues.xml 200`; `city volzhskiy 404` = legit miss, not 500.
- Migrations clean: `site_user` and `destination_pdp_documents` each have a
  finished row; the `finished_at IS NULL` rows are the rolled-back 17.11 attempts.

## Prevention

- `784916c29`: `docker-compose.yml` postgres `restart: unless-stopped` (the
  container was running at reboot, so this self-heals that failure mode).
- `postgres-health-watch` cron (every 5 min) + Telegram alert for fast detection
  of any future down state.

## Follow-up

- Review unattended-upgrades auto-reboot:
  `grep -iE 'Automatic-Reboot' /etc/apt/apt.conf.d/50unattended-upgrades`.
- The prod checkout was left in detached HEAD after the manual cherry-pick; the
  next `Deploy MSK web` checkout on the merged SHA aligns it.
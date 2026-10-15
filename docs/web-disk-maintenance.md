# Web disk maintenance (MSK)

Production has a 77 GiB root filesystem. Runtime Next cache can grow by several GiB under `apps/web/.next/server/route-cache` and `apps/web/.next/cache`. The old deploy scripts also copied these caches into `.next.prev`, doubling the pressure. Historical `.next.bak*` trees from manual releases are separate from the single current rollback `.next.prev`.

`deploy/scripts/maintain-web-disk.sh` checks the two runtime cache directories daily. When their combined disk usage exceeds 4096 MiB, it takes the same deploy lock used by the web swap, stops `daibilet-web`, moves the cache directories aside, restarts web, verifies `/api/health`, then removes the retired directories. A cache miss rebuilds data; the maintenance does not change DB or static assets. The restart briefly interrupts web service. The script skips a running deploy. It also removes `.next.bak*` directories older than 30 days beyond the two most recent valid builds. It never deletes `.next` or `.next.prev`.

Both artifact deploy paths strip regenerable cache from `.next.prev` after the new web passes health. The on-host fallback build now copies only the rollback build files with `rsync` exclusions, avoiding a multi-GiB copy before building.

Install on MSK after the changes are present in the production checkout:

```bash
sudo cp deploy/systemd/daibilet-web-disk-maintenance.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now daibilet-web-disk-maintenance.timer
sudo bash deploy/scripts/maintain-web-disk.sh       # dry run
sudo systemctl start daibilet-web-disk-maintenance.service
sudo systemctl status daibilet-web-disk-maintenance.service --no-pager
df -h /
```

Observe with `journalctl -u daibilet-web-disk-maintenance.service`. Override `CACHE_LIMIT_MIB`, `BACKUP_DAYS`, or `KEEP_BACKUPS` in the service environment if capacity changes. Before changing thresholds, inspect `du -sh apps/web/.next/{cache,server/route-cache}`. Do not delete the active build or current rollback in an ad hoc cleanup.

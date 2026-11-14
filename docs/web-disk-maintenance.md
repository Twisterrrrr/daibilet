# Web cache and disk maintenance (MSK)

The production web app writes three regenerable caches under `apps/web/.next`:

- `server/route-cache`: rendered HTML, RSC payloads and segment files for ISR pages. Event detail routes make this the largest cache.
- `cache/fetch-cache`: cached `fetch()` results.
- `cache/images`: generated AVIF/WebP variants.

The previous daily job stopped `daibilet-web` and deleted both route and fetch caches after they crossed 4 GiB. This caused a brief 502 window and made all dynamic routes cold. The replacement job never stops or restarts Next. Every 15 minutes it prunes least recently used entries above per-cache budgets: 5 GiB for route cache, 1 GiB for fetch cache and 1 GiB for optimized images. Event detail pages are evicted before hub pages; the home, `/events`, `/blog`, `/places`, `/podborki`, and main city hub entries are protected. Evicted entries are regenerated on demand.

Route entries are removed as complete units: HTML, metadata, RSC payload and segment directory. Fetch values are independent files; image variants are grouped by Next's per-image cache directory. The cleaner ignores symlinks, has dry-run mode, and runs with low I/O priority. `.next` and `.next.prev` are never removed.

The cleaner also retains only the two newest valid `.next.bak*` builds beyond 30 days. The active build and `.next.prev` remain available for rollback.

## Verify and install

```bash
bash deploy/scripts/test-maintain-web-disk.sh
sudo bash deploy/scripts/maintain-web-disk.sh       # dry run
sudo systemctl daemon-reload
sudo systemctl enable --now daibilet-web-disk-maintenance.timer
sudo systemctl start daibilet-web-disk-maintenance.service
sudo systemctl status daibilet-web-disk-maintenance.service --no-pager
sudo journalctl -u daibilet-web-disk-maintenance.service -n 30 --no-pager
df -h /
```

The timer unit is `OnBootSec=5m` plus `OnUnitActiveSec=15m`. Override `ROUTE_CACHE_LIMIT_MIB`, `FETCH_CACHE_LIMIT_MIB`, `IMAGE_CACHE_LIMIT_MIB`, `BACKUP_DAYS`, or `KEEP_BACKUPS` in the service environment if capacity changes. The Python pruning tool supports `--apply`; omitting it prints the proposed eviction without deleting files.

Staging uses a separate maintenance unit with its own `APP_DIR`; install and inspect that unit independently. Do not point a staging cleaner at the production `.next` directory.

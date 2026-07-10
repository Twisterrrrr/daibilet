# F3 prod rollback — Vite static

**Snapshot before cutover:**

```bash
bash deploy/scripts/snapshot-prod-rollback.sh
```

Creates `/var/backups/daibilet/pre-next-YYYYMMDD-HHMMSS/`:
- `daibilet.conf` — nginx до Next
- `public-static.tgz` — `/var/www/daibilet/public`
- `daibilet.env.snapshot` — копия `.env`

Pointer: `/var/backups/daibilet/LATEST_PRE_NEXT_ROLLBACK`

---

## Rollback (< 2 min)

```bash
BACKUP_DIR=$(cat /var/backups/daibilet/LATEST_PRE_NEXT_ROLLBACK)
bash deploy/scripts/rollback-prod-vite.sh
systemctl restart daibilet-api
```

Public снова отдаётся из Vite static; Next (`daibilet-web`) остановлен.

---

## Ports (same host as staging)

| Service | Port |
|---------|------|
| staging Next | 3000 |
| **prod Next** | **3001** |
| prod API | 4000 |
| staging API | 4001 |

---

## Re-cutover

```bash
systemctl start daibilet-web
python3 deploy/nginx/patch-prod-next.py
nginx -t && systemctl reload nginx
```

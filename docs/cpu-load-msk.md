# MSK CPU load: 2026-10-15

The production host has 4 vCPU, 8 GiB RAM and a 77 GiB root filesystem. Timeweb's daily CPU chart showed frequent peaks. The chart does not retain per-process attribution, so the findings below identify recurring sources from server logs rather than assigning every individual peak.

## Findings

- `/var/log/nginx/access.log` held 100,121 requests from 00:00 to about 20:36 UTC. 64,332 declared the `GPTBot` User-Agent and 3,136 requested `/_next/image`. User-Agent text can be spoofed; this is a classification of requests, not verified crawler identity.
- At 09:14–09:16 UTC, the log recorded 230–234 `GPTBot` requests per minute. The busiest minute overall reached 371 requests. Event pages and image optimization produced separate bursts.
- `daibilet-catalog-dto-rebuild.timer` runs every eight minutes. Recent runs processed about 4,300 sessions, lasted roughly 1–2 minutes and consumed 33–48 CPU-seconds each. This is a predictable background contributor to the chart.
- The nightly Ticketscloud catalog sync starts at 03:20 UTC and ran about seven minutes on 2026-10-15. It can explain a longer overnight burst.
- Production Next was using about 2.1 GiB shortly before the cache reset. Staging Next was under 0.2 GiB and had consumed only about 41 CPU-seconds over ten hours. Staging was not the main source of the repeated daytime peaks in this observation.
- At diagnosis, load average was below 1, 3.5 GiB RAM was available, and no OOM event was found in the examined kernel journal. A short SSH/HTTPS timeout occurred earlier, but there is insufficient evidence to assign it to CPU saturation.

## Disk and service action

`deploy/scripts/maintain-web-disk.sh --apply` reset the production runtime Next cache after it reached 7,738 MiB, checked web health, and reduced root usage from about 46 GiB to 39 GiB. The production 4,096 MiB and staging 2,048 MiB daily maintenance timers were installed and enabled. Production and authenticated staging `/places` both returned HTTP 200 afterward. These timers prevent disk growth; cache regeneration can itself create transient CPU work, so observe the next run.

## Follow-up options

1. Correlate the new per-minute `pidstat` samples with nginx request counts during future peaks. The Timeweb aggregate chart alone cannot quantify each source's share.
2. The declared `GPTBot` crawler now has one shared nginx bucket at 1 request/second, burst 30, HTTP 429 above the burst. Other User-Agents keep their existing behavior, including Google/Yandex. The key is shared across source IPs because the crawler was distributed. This is a load-control rule, not a proof of bot identity. Recheck nginx 429 counts and Timeweb CPU after a full day.
3. Evaluate a longer catalog DTO rebuild interval only after confirming acceptable catalog freshness. The current eight-minute interval is a product freshness choice.

## Quick diagnosis

```bash
date -Is; uptime; free -h; vmstat 1 3
ps -eo pid,ppid,comm,%cpu,%mem,args --sort=-%cpu | head -20
sudo systemd-cgtop -b -n 1 | head -25
sudo journalctl -u daibilet-catalog-dto-rebuild.service --since '1 hour ago' --no-pager
sudo tail -100 /var/log/daibilet/catalog-dto-rebuild.log
sudo tail -100 /var/log/nginx/access.log
sudo journalctl -k --since '1 hour ago' --no-pager | grep -Ei 'oom|kill|memory|hung'
```

When sampling for Cline, use UTC from `date -Is` to align systemd, nginx and Timeweb timestamps. Do not treat User-Agent strings as verified bot identities. Preserve production host `201.24.125.184`; the finance server is outside this runbook.

## Stabilization change, 2026-10-15

`deploy/nginx/patch-prod-crawler-rate.py` patched `/etc/nginx/sites-enabled/daibilet.conf` after backing it up to `/etc/nginx/daibilet.conf.pre-crawler-rate`. `nginx -t` passed and nginx was reloaded. A controlled 50-request burst to `/robots.txt` produced 31 HTTP 200 and 19 HTTP 429 for `GPTBot`; human and `Googlebot` probes returned HTTP 200. The rule is scoped to the public Next `location /`, which includes event pages and `/_next/image`. Roll back by restoring the backup, testing nginx, and reloading it. The existing public API limit stays intact.

`daibilet-cpu-sample.timer` writes a one-second `pidstat` sample to the journal every minute. It records UTC, load, available RAM, free swap and processes using at least 3% of one CPU. Read with `journalctl -u daibilet-cpu-sample.service --since '1 hour ago'`. It has no database or application side effects. Use the samples for future peak attribution; each point is a one-second observation and can miss a short burst.

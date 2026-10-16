# SSR hang and crawler 502, 16 October 2026

The crawler alert created on 15 October at 15:06 UTC counted three Googlebot HTTP 502 responses from 14 October at 18:45:27–29 UTC. nginx recorded upstream connection resets/refusals on `127.0.0.1:3001`. The SSR healthcheck had timed out twice on `/robots.txt` and sent SIGKILL to `daibilet-web` at 18:45:27 UTC. Next restarted at 18:45:32 and was ready at 18:45:33. The three affected event URLs later returned HTTP 200. The alert reported zero JavaScript reference errors.

This was not limited to Googlebot: other requests received 502 during the same restart. Another SSR hang occurred on 16 October at 03:45:27 UTC, with 11 nginx 502 responses. The daily disk-maintenance timer ran afterward and did not cause that restart. The minute CPU sampler showed Next using about one CPU immediately before the hang, while host MemAvailable was about 4 GiB. The checked kernel journal did not show OOM. These observations do not identify the code path that blocked Next's event loop.

In the ten minutes before the second hang, Next repeatedly fetched remote event images of 2–16 MiB which exceed its 2 MiB data-cache item limit. AhrefsBot requested 11 `/_next/image` URLs in the minute before the hang. This is avoidable CPU and image-decoding work, but the temporal correlation does not prove it caused the hang. `deploy/nginx/patch-prod-image-crawlers.py` returns HTTP 429 for `/_next/image` requests by bulk crawlers (AhrefsBot, SemrushBot, GPTBot, Bytespider, Amazonbot, CCBot). Googlebot, YandexBot and ordinary visitors are unaffected. The patch is idempotent and is applied by the production deploy script. Rollback is removal of the map and guard from the nginx site followed by `nginx -t && systemctl reload nginx`.

`deploy/cron/ssr-healthcheck.sh` now records cgroup memory, swap, memory events and the Next process's CPU/RSS before its existing recovery. Production Next starts with Node diagnostic reports enabled for SIGUSR2; the healthcheck sends that signal only after verifying that the target Next process has `--report-on-signal`. Reports exclude environment variables and network details and go to `/var/log/daibilet/node-reports` (root-only). Reports older than 14 days are removed. The recovery SIGKILL remains because a hung Next process did not complete a normal stop in earlier incidents.

To inspect a future hang:

```bash
sudo journalctl -t daibilet-ssr-health --since '1 day ago' --no-pager
sudo journalctl -u daibilet-web.service --since '1 day ago' --no-pager
sudo ls -lh /var/log/daibilet/node-reports
sudo journalctl -u daibilet-cpu-sample.service --since '1 day ago' --no-pager | grep process_cpu
```

Do not publish a diagnostic report verbatim; inspect the JavaScript stack and heap/resource summary first. A report captures only the process state at the signal and may not explain an earlier blocking operation. Keep the report and nginx time window together when investigating. If no report appears, the healthcheck logs whether the flag was missing or the process had already exited.

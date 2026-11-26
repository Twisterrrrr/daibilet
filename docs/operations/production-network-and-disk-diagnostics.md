# Production network and disk diagnostics

**Host:** MSK `201.24.125.184` (`daibilet.ru`)
**Last checked:** 2026-11-09

Use this runbook to separate a site incident from a VPN route problem and to
identify safe disk cleanup candidates. Do not disable the whole VPN when Codex
requires it for connectivity; prefer a narrowly scoped host route.

## 1. Check the effective Windows route first

DNS resolving to `201.24.125.184` does not prove which interface carries the
connection. Check the route Windows actually selects:

```powershell
Find-NetRoute -RemoteIPAddress 201.24.125.184 |
  Format-List IPAddress,InterfaceAlias,DestinationPrefix,NextHop,RouteMetric
```

If `InterfaceAlias` is `ZoogVPN TUN`, the host is still reached through the
VPN. A direct exception should select the physical Wi-Fi/Ethernet interface
and the single-host prefix `201.24.125.184/32`.

Example for one observed Wi-Fi configuration (gateway and interface index are
machine-specific):

```powershell
# Run elevated; temporary until reboot.
route add 201.24.125.184 mask 255.255.255.255 192.168.0.1 metric 1 if 15
Find-NetRoute -RemoteIPAddress 201.24.125.184

# Remove the temporary exception if needed.
route delete 201.24.125.184
```

Use the current physical gateway and interface index from
`Get-NetIPConfiguration`; do not copy the example values blindly. Do not
bypass a whole subnet or the default route. Make a host route persistent only
after the temporary route is verified.

Then test both transport ports and SSH:

```powershell
Test-NetConnection 201.24.125.184 -Port 22 -InformationLevel Detailed
Test-NetConnection 201.24.125.184 -Port 443 -InformationLevel Detailed
ssh -vvv -o BatchMode=yes -o ConnectTimeout=10 daibilet-msk
```

`TcpTestSucceeded: True` confirms only TCP connection establishment. If SSH
stops at `Local version string` / `banner exchange`, inspect the packet path
before blaming the key: authentication has not started yet.

## 2. Correlate packet captures with the exact client attempt

VPN exit addresses may be shared. Capture while making one SSH attempt, and
match the client identification string (for example,
`OpenSSH_for_Windows_9.5`) and source port. Do not attribute a simultaneous
`libssh` connection to the Windows OpenSSH client without matching it.

On the server:

```bash
sudo timeout 20 tcpdump -ni eth0 -s 256 -nn -A 'tcp port 22'
```

Run one SSH attempt during that capture. Confirm whether the server sends its
`SSH-2.0-...` banner and whether the client acknowledges it. A capture with no
SYN is not evidence about a new attempt.

## 3. Separate application health from external reachability

On the server, inspect services and test Next, Nginx, and API independently:

```bash
systemctl --no-pager --full status nginx daibilet-web daibilet-api
curl -sS -o /dev/null -w 'web %{http_code}\n' http://127.0.0.1:3001/
curl -sS -o /dev/null -w 'events %{http_code}\n' http://127.0.0.1:3001/events
curl -ksS --resolve daibilet.ru:443:127.0.0.1 -o /dev/null \
  -w 'local nginx %{http_code}\n' https://daibilet.ru/
journalctl -u nginx -u daibilet-web -u daibilet-api \
  -S '-10 min' --no-pager | tail -n 80
```

If local checks return `200` but the client fails, compare the effective route
and test external HTTPS from the client. This points to DNS/routing/firewall
or VPN egress, not automatically to an application outage.

## 4. Disk audit and safe cleanup boundaries

Start with filesystem truth, then inspect large directories. `du` shows logical
directory usage and can count hard-linked copies differently from physical
free space; compare before/after with `df`.

```bash
df -hT /
lsblk -f
sudo du -xhd1 /opt /var /home /root 2>/dev/null | sort -h | tail -n 35
sudo docker system df
sudo docker ps -a --size
sudo journalctl --disk-usage
sudo lsof -nP +L1 | head -n 30
sudo -u deploy git -C /opt/daibilet count-objects -vH
sudo -u deploy bash -lc 'cd /opt/daibilet && pnpm store path'
```

Cleanup rules:

- Never run `docker system prune --volumes`; the PostgreSQL volumes are active.
- Preserve the active `/opt/daibilet/apps/web/.next`, `.next.prev`, source
  images, database backups, and the remaining rollback release.
- Next route/fetch/image caches are regenerable, but reducing them increases
  cache misses and can add SSR/image work. Use
  `deploy/scripts/maintain-web-disk.sh --apply`; verify its route budget first.
  Its script default is 5 GiB, so a one-off 2 GiB run can later grow again
  unless the systemd service override/timer budget is changed.
- `pnpm store prune` removes unused package-store cache; first verify the active
  store path and that no install/deploy is running. Keep installed
  `node_modules` intact.
- Do not run `git gc --prune=now` or delete Git packs to chase disk usage. Inspect
  `count-objects` first; large packed history is not necessarily garbage.
- Vacuuming archived journals is safe for services but permanently discards
  older logs; check `journalctl --disk-usage` and retain the needed incident
  window.
- A release directory with no running process reference can still share hard
  links with other copies. A successful `rm` does not guarantee space was freed;
  verify `df` and `lsof +L1`.

## 5. Snapshot from 2026-11-09

After route-cache pruning, removal of old build copies, and journal vacuum:

| Item | Observed |
|---|---:|
| Root filesystem | 57 GiB used / 77 GiB (75%) |
| Active Next route cache | 2.7 GiB (regrows under the timer's 5 GiB default) |
| Next fetch cache | 1.1 GiB |
| Next image cache | 928 MiB |
| Main pnpm store | 1.3 GiB (`/opt/daibilet/.pnpm-store/v11`) |
| Release pnpm store | 871 MiB |
| Git pack | 6.8 GiB, no reported garbage |
| Docker volumes | 6.457 GiB, both volumes active |
| Archived journal | 482 MiB after vacuum freed 1.1 GiB |
| APT cache | 113 MiB |

The delete of `/opt/daibilet-releases/80acd17f9` did not reduce `df`; treat
that as a hard-link/shared-block warning, not an indication that deleting more
release data will reclaim the reported `du` size.

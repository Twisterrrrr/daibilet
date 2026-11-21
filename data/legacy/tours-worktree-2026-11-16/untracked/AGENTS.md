# Project agent rules

## Production access and disk operations

- If SSH or the public site appears unavailable, check the client route to the production IP first (`Find-NetRoute` on Windows), then test TCP and the SSH banner. A TCP connection alone does not confirm SSH works.
- Separate client network failures from server/application failures: inspect systemd services and localhost HTTP responses on the server before diagnosing an outage.
- Before deleting production files, inspect filesystem usage (`df -hT`), directory sizes, active services/processes, symlinks, Docker volume ownership, and deployment markers. Prefer the detailed [production diagnostics runbook](docs/production-network-and-disk-diagnostics.md).
- Treat databases, Docker volumes, Git history, source images, current builds, and backups as persistent data unless a verified migration or retention policy says otherwise. Never remove them as routine cache cleanup.
- For cache cleanup, identify the process/timer and configured limit that recreates the data. Use the project's maintenance command; verify the actual space change with `df` and run HTTP smoke checks afterward.
- Keep the root filesystem at or below 70% usage as an operational target. Diagnose recurring growth instead of relying on one-time deletion.

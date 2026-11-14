# Keep local MCP Postgres (@modelcontextprotocol/server-postgres) pointed at
# ~/.cursor/mcp.json -> 127.0.0.1:5433 reachable to MSK Docker Postgres :5437.
#
# Prerequisites (once):
# - Host daibilet-msk in ~/.ssh/config with: LocalForward 5433 127.0.0.1:5437
# - mcpServers.postgres args URL: postgresql://USER:PASS@127.0.0.1:5433/daibilet
#   (same USER/PASS/DB as /opt/daibilet/.env DATABASE_URL on daibilet-msk; do not commit)
#
# Usage:
#   pwsh scripts/mcp-postgres-tunnel.ps1
# Leave the window open, or run with -Background.

param(
  [switch]$Background,
  [switch]$Status
)

$ErrorActionPreference = 'Stop'
$localPort = 5433

function Test-LocalListen([int]$Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

if ($Status) {
  Write-Output ("5433_listen=" + (Test-LocalListen $localPort))
  exit 0
}

if (Test-LocalListen $localPort) {
  Write-Output "Tunnel already listening on 127.0.0.1:$localPort"
  exit 0
}

$sshArgs = @(
  '-o', 'BatchMode=yes',
  '-o', 'ExitOnForwardFailure=yes',
  '-o', 'ServerAliveInterval=30',
  '-N',
  'daibilet-msk'
)

if ($Background) {
  Start-Process -FilePath ssh -ArgumentList $sshArgs -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 2
  if (-not (Test-LocalListen $localPort)) {
    throw "SSH tunnel failed to bind 127.0.0.1:$localPort"
  }
  Write-Output "Started background SSH tunnel on 127.0.0.1:$localPort"
  exit 0
}

Write-Output "Starting foreground SSH tunnel (LocalForward 5433 -> MSK 5437). Ctrl+C to stop."
& ssh @sshArgs

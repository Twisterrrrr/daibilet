# MSK staging for Next web and API

The previous staging runbook targets an obsolete Vite build. The current staging uses a separate Git worktree at `/opt/daibilet-staging`, its own `.env`, API on `127.0.0.1:4001`, Next web on `127.0.0.1:3000`, and the existing `daibilet_staging` PostgreSQL volume on `127.0.0.1:5438`. Nginx serves `staging.daibilet.ru` over HTTPS with basic authentication and `noindex` headers. The production database and payment tokens are not connected.

Bootstrap on MSK as `deploy` (except commands prefixed with sudo):

```bash
sudo install -d -o deploy -g deploy /opt/daibilet-staging
git -C /opt/daibilet fetch origin feat/next-monorepo
git -C /opt/daibilet worktree add --detach /opt/daibilet-staging origin/feat/next-monorepo
sudo bash /opt/daibilet-staging/deploy/scripts/prepare-staging-env.sh
sudo bash /opt/daibilet-staging/deploy/scripts/prepare-staging-access.sh
cd /opt/daibilet-staging
CI=true pnpm install --frozen-lockfile
set -a; . ./.env; set +a
case "$DATABASE_URL" in *"@127.0.0.1:5438/daibilet_staging") ;; *) echo 'Wrong staging DB' >&2; exit 2;; esac
pnpm db:generate
pnpm db:deploy
sudo cp deploy/systemd/daibilet-{api,web}-staging.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now daibilet-api-staging.service
NODE_OPTIONS=--max-old-space-size=3072 EVENT_SSG_TOP_N=0 pnpm web:build
sudo systemctl enable --now daibilet-web-staging.service
```

The staging Nginx server must contain `auth_basic` and `auth_basic_user_file /etc/nginx/.htpasswd-daibilet-staging` as in `deploy/nginx/staging-next.conf.snippet`. Install it with `sudo python3 deploy/nginx/enable-staging-auth.py`; that script tests nginx and restores the original config on failure. The staging login is stored only in `/opt/daibilet-staging/.staging-access` (mode 600), not in Git or logs. Do not copy production `.env`; the helper creates blank ticket widgets, API tokens, mail and sync integration, and uses only the existing staging database password. Staging can show old content until its data is refreshed safely; do not call it data parity without a checked snapshot process.

Check localhost API/web health, then verify unauthenticated `https://staging.daibilet.ru/` returns 401 and authenticated access returns 200. Before production deployments, stop staging builds if memory pressure is high; the MSK server has 8 GiB RAM. The staging worktree must not be used as the production deploy checkout.

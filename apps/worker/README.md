# `@daibilet/worker` (F4.2)

Тонкий CLI для out-of-process sync. Логика TC/TEP остаётся в корневых `scripts/*`.

## Jobs

| Job | Pipeline | Prod |
|-----|----------|------|
| `tc-catalog` | `tc-sync.js` | nightly systemd / cron |
| `tep-catalog` | `tep-import-fixtures.js` + `revalidate-next-home.mjs` | 12h timer / cron |
| `tc-orders` | `tc-sync-orders.js` | cron `*/10` |
| `tep-orders` | stub | **не включать** (нет API у партнёра) |
| `health` | JSON ok + list | smoke |

## Run

```bash
pnpm worker -- health
pnpm worker -- tc-catalog
pnpm worker -- tc-orders -- --from=2026-07-20 --to=2026-07-24
node apps/worker/bin/run.mjs tep-catalog
```

Cron wrappers (`deploy/cron/*-sync.sh`) вызывают этот CLI. Systemd oneshot без изменений: `ExecStart=…/deploy/cron/…sh`.

## Admin Sources

Кнопки Sync TC / Sync Teplohod в Next admin → `POST` legacy API → `spawn(scripts/…)`.
Тот же pipeline, что и worker jobs. Finance не затрагивается.

## Не делать

- Long-running daemon с in-process scheduler (дублирует timers, риск OOM).
- Переписывать gRPC/import в TypeScript в этом инкременте.

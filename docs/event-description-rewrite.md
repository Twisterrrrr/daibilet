# TC description rewrite

Separate branch: `codex/event-description-rewrite`. No venue/family changes.

`EventDescriptionRewrite` holds an immutable first-source snapshot and a separate rewrite. Migration seeds existing TC events; TC import queues new IDs as `pending`. Changed source goes to `review` without changing the original snapshot. Worker does not overwrite Event.description or EventOverride: `ready` means a validated candidate, not editorial approval/publication. Mechanical checks cannot prove factual equivalence; editor review is still useful.

Prompt and six synthetic style references: `scripts/lib/event-rewrite-prompt.mjs` (version persisted with result). Supply approved editorial references there if available.

Deployment order: database migration → importer/worker code → configuration → dry run → hourly cron. Do not deploy the updated importer before its migration.

Required environment: DATABASE_URL, DEEPSEEK_API_KEY, DEEPSEEK_MODEL, DEEPSEEK_INPUT_USD_PER_MILLION, DEEPSEEK_CACHE_HIT_USD_PER_MILLION, DEEPSEEK_OUTPUT_USD_PER_MILLION. Set current USD rates explicitly; no stale hardcoded prices. API contract: https://api-docs.deepseek.com/api/create-chat-completion/ . Pricing: https://api-docs.deepseek.com/quick_start/pricing/ .

Preview: `node --env-file=.env scripts/rewrite-events.mjs --ids=ids.json` (optional JSON array of IDs).
Process: same command with `--apply --batch-size=15 --max-events=150`.
Install schedule as root: `bash deploy/scripts/install-event-rewrite.sh` (hourly :17).

Session advisory lock prevents overlapping workers; up to four API attempts with exponential backoff/jitter and Retry-After for 429/5xx/network failures. 4xx auth/configuration failures are not retried. `failed` rows require explicit operator reset to pending after diagnosis; successful rows are not selected again. A crash before the DB save can cause the API call to be billed twice; JSONL usage entries retain the earlier request's usage. Missing usage is null, never a false zero cost.

Logs: `/var/log/daibilet/rewrite-events.jsonl` includes ID, model, tokens, estimated cost, status, length and errors, without descriptions or credentials. Rotate this log with the deployment's logrotate policy.

Tests: `node --test scripts/event-rewrite.test.mjs`.

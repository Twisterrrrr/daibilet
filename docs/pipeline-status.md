# Deploy MSK web

Deploy now requires a full 40-character `sha` and `expected_ref`. CI checks
branch ancestry before build, checks out that SHA, and records DEPLOY_SHA and
BUILD_ID in the run name/logs/summary (GitHub's own head_sha still identifies
the workflow revision). The build runs once in CI. The uploaded server script
checks artifact SHA and BUILD_ID before switching the checkout or .next.
Public home must return HTTP 200; home failure restores the previous build
and checkout when a previous build exists. A missing optional literal HTML
marker fails verification without automatic rollback.

Step 4 (Cursor): done — workflow step `Verify deploy` calls
`bash .deploy-control/infra/deploy-verify.sh "$DEPLOY_SHA" "$DEPLOY_MARKER"` with
`DEPLOY_MARKER` from `inputs.marker` via step env (no shell interpolation of the
input), plus `MSK_SSH_HOST` / `MSK_SSH_USER` / `MSK_SSH_KEY_FILE`. Skipped when
`inputs.skip_swap` is true. `BUILD_ID` from the job env enables exact build
comparison.

Use full SHA `13916c0f1ac4ce16a6c9fd0523a5734397140802` for the referenced
Wave 1 revision. Short examples are intentionally rejected. Forty zeroes
are valid hex syntax but rejected as a nonexistent commit.

## Local validation (2026-09-25)

- Bash syntax and YAML parse: passed.
- Actual repository ancestry: full 57d899ae… rejected; full 13916c0f… accepted.
- Short SHA rejected before server access; all-zero SHA is nonexistent.
- Mock server with real tar/move operations: wrong BUILD_ID and artifact SHA
  fail without changing the checkout, live build, or services; successful swap
  passes; HTTP 500 restores old build and checkout; missing marker fails while
  retaining the new build, as requested.
- Mock SSH/HTTP verification: matching SHA/build/literal marker passes;
  wrong HEAD, wrong BUILD_ID, HTTP 500 and missing marker fail.
- Production workflow dispatch and live Wave 1 acceptance were not run.
  Step 4 still needs integration by Cursor before the full end-to-end check.

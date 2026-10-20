/**
 * Shared post-sync hook runner (owner rule 2026-10-20: new imported events get a
 * canonical description right after catalog sync). Never throws and never breaks
 * the sync - failures are warnings.
 */
const { spawnSync } = require("child_process");
const path = require("path");

function runPostSyncDescriptions(rootDir, extraArgs = []) {
  if (process.env.POST_SYNC_DESCRIPTIONS === "0") return { skipped: true };
  const tsxCli = path.join(rootDir, "apps", "web", "node_modules", "tsx", "dist", "cli.mjs");
  const script = path.join(rootDir, "scripts", "post-sync-event-descriptions.js");
  const startedAt = Date.now();
  try {
    const result = spawnSync(process.execPath, [tsxCli, script, "--apply", ...extraArgs], {
      cwd: rootDir,
      env: process.env,
      encoding: "utf8",
      windowsHide: true,
      timeout: Number(process.env.POST_SYNC_DESCRIPTIONS_TIMEOUT_MS || 10 * 60 * 1000),
    });
    const stderr = String(result.stderr || "").trim();
    if (result.error || result.status !== 0) {
      console.warn(
        `[post-sync] descriptions step failed (${result.error ? result.error.message : `exit ${result.status}`}): ${stderr.slice(0, 400)}`,
      );
      return { ok: false };
    }
    // Brace-free summary: callers (tep-import-fixtures) print a trailing JSON
    // stats block that runTeplohodSync parses with /\{[\s\S]*\}\s*$/.
    let counters = "";
    try {
      const jsonLine = String(result.stdout || "")
        .trim()
        .split(/\r?\n/)
        .filter((line) => line.trim().startsWith("{"))
        .pop();
      const parsed = jsonLine ? JSON.parse(jsonLine) : null;
      if (parsed) {
        counters = ` composed=${parsed.composed || 0} repaired=${parsed.repaired || 0} refreshed=${parsed.refreshedAuto || 0} unchanged=${parsed.unchanged || 0} queuedA=${(parsed.enqueued && parsed.enqueued.A) || 0} queuedB=${(parsed.enqueued && parsed.enqueued.B) || 0} errors=${parsed.errors || 0}`;
      }
    } catch {
      counters = "";
    }
    console.log(`[post-sync] descriptions done in ${Date.now() - startedAt}ms:${counters}`);
    return { ok: true };
  } catch (error) {
    console.warn("[post-sync] descriptions step crashed:", error && error.message ? error.message : error);
    return { ok: false };
  }
}

module.exports = { runPostSyncDescriptions };

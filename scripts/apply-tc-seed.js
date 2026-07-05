const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

async function main() {
  const sqlPath = path.join(rootDir, "data", "db", "ticketscloud-seed.sql");
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Missing seed file: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet",
    max: 1,
  });

  try {
    console.log(`[apply-tc-seed] applying ${Math.round(sql.length / 1024 / 1024)} MB SQL...`);
    await pool.query(sql);
    console.log("[apply-tc-seed] done");
  } finally {
    await pool.end();
  }
}

function loadRootEnv(baseDir) {
  for (const name of [".env", "apps/backend/.env"]) {
    const filePath = path.join(baseDir, name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error("[apply-tc-seed] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

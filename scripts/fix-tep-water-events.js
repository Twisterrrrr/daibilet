const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet",
  max: 1,
});

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "fix-tep-water-events.sql"), "utf8");
  const result = await pool.query(sql);
  const rows = result.at(-1)?.rows || [];
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
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
  console.error(error);
  process.exit(1);
});

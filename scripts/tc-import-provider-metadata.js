const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const catalogPath = path.join(rootDir, "data", "ticketscloud", "catalog.public.json");
const metadataPath = path.join(rootDir, "data", "ticketscloud", "provider-metadata.private.json");
const { assertProviderMetadataSnapshot, importProviderMetadata } = require("./tc-import-catalog");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  if (!fs.existsSync(catalogPath) || !fs.existsSync(metadataPath)) {
    throw new Error("Ticketscloud catalog/private metadata snapshots are missing; run npm run tc:full-sync first");
  }
  const catalogSnapshot = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const metadataSnapshot = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  const catalog = catalogSnapshot.events || [];
  const providerMetadata = metadataSnapshot.events || [];
  assertProviderMetadataSnapshot(
    catalog,
    providerMetadata,
    catalogSnapshot.snapshotId,
    metadataSnapshot.snapshotId,
  );
  const result = await importProviderMetadata(providerMetadata);
  console.log(JSON.stringify(result, null, 2));
}

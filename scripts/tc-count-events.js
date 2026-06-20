const path = require("path");
const fs = require("fs");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
require("dotenv").config();

const rootDir = path.resolve(__dirname, "..");
const protoDir = path.join(rootDir, "vendor", "ticketscloud-proto");
const protoPath = path.join(protoDir, "service.proto");
const outDir = path.join(rootDir, "data", "samples");
const outPath = path.join(outDir, "ticketscloud-events-count.sample.json");

const endpoint = process.env.TICKETSCLOUD_GRPC_ENDPOINT || "simple.ticketscloud.com:443";
const token = process.env.TICKETSCLOUD_API_TOKEN || process.env.TICKETSCLOUD_API_KEY || process.env.TC_API_TOKEN;
const timeoutMs = Number(process.env.TICKETSCLOUD_COUNT_TIMEOUT_MS || 180000);

if (!token) {
  console.error("Missing Ticketscloud token: set TICKETSCLOUD_API_TOKEN, TICKETSCLOUD_API_KEY, or TC_API_TOKEN");
  process.exit(1);
}

const packageDefinition = protoLoader.loadSync(protoPath, {
  includeDirs: [protoDir],
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const loaded = grpc.loadPackageDefinition(packageDefinition);
const client = new loaded.v2.Simple(endpoint, grpc.credentials.createSsl());

const metadata = new grpc.Metadata();
metadata.add("authorization", token);
metadata.add("preferred-language", "ru");

const counters = {
  total: 0,
  byStatus: {},
  byType: {},
  categoryIds: new Set(),
  venueIds: new Set(),
  metaIds: new Set(),
};

const startedAt = Date.now();
const stream = client.Events({}, metadata);
let finished = false;

const deadline = setTimeout(() => {
  if (finished) return;
  finished = true;
  stream.cancel();
  console.error(`Timed out after ${counters.total} events`);
  printSummary(true);
  process.exitCode = 1;
}, timeoutMs);

stream.on("data", (event) => {
  counters.total += 1;
  increment(counters.byStatus, event.status || "UNKNOWN");
  increment(counters.byType, event.openDate ? "open_date" : event.meta ? "recurring" : "single");
  if (event.category) counters.categoryIds.add(event.category);
  if (event.venue) counters.venueIds.add(event.venue);
  if (event.meta) counters.metaIds.add(event.meta);

  if (counters.total % 1000 === 0) {
    console.log(`Counted ${counters.total} events...`);
  }
});

stream.on("error", (error) => {
  if (finished) return;
  finished = true;
  clearTimeout(deadline);
  console.error(`gRPC error ${error.code}: ${error.message}`);
  printSummary(true);
  process.exitCode = 1;
});

stream.on("end", () => {
  if (finished) return;
  finished = true;
  clearTimeout(deadline);
  printSummary(false);
});

function increment(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function printSummary(partial) {
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  const summary = {
    endpoint,
    requestedAt: new Date().toISOString(),
    partial,
    elapsedSec: Number(elapsedSec),
    total: counters.total,
    byStatus: counters.byStatus,
    byType: counters.byType,
    uniqueCategories: counters.categoryIds.size,
    uniqueVenues: counters.venueIds.size,
    uniqueMetaEvents: counters.metaIds.size,
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Saved count summary to ${outPath}`);
}

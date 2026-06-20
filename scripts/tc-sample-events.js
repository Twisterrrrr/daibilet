const fs = require("fs");
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
require("dotenv").config();

const rootDir = path.resolve(__dirname, "..");
const protoDir = path.join(rootDir, "vendor", "ticketscloud-proto");
const protoPath = path.join(protoDir, "service.proto");
const outDir = path.join(rootDir, "data", "samples");
const outPath = path.join(outDir, "ticketscloud-events.sample.json");

const endpoint = process.env.TICKETSCLOUD_GRPC_ENDPOINT || "simple.ticketscloud.com:443";
const token = process.env.TICKETSCLOUD_API_TOKEN || process.env.TICKETSCLOUD_API_KEY || process.env.TC_API_TOKEN;
const limit = Number(process.argv[2] || process.env.TICKETSCLOUD_SAMPLE_LIMIT || 10);

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

const request = {
  status: "PUBLIC",
};

const events = [];
const stream = client.Events(request, metadata);
let sampleWritten = false;

const deadline = setTimeout(() => {
  stream.cancel();
  console.error(`Timed out after collecting ${events.length} events`);
  process.exitCode = 1;
}, 45000);

stream.on("data", (event) => {
  events.push(event);
  console.log(
    [
      `${events.length}.`,
      event.id,
      event.name || "(no name)",
      `status=${event.status}`,
      `venue=${event.venue || "-"}`,
      `category=${event.category || "-"}`,
      `vacant=${event.ticketsAmountVacant ?? "-"}`,
    ].join(" ")
  );

  if (events.length >= limit) {
    stream.cancel();
  }
});

stream.on("error", (error) => {
  clearTimeout(deadline);
  if (error.code === grpc.status.CANCELLED && events.length >= limit) {
    writeSample();
    return;
  }
  console.error(`gRPC error ${error.code}: ${error.message}`);
  process.exitCode = 1;
});

stream.on("end", () => {
  clearTimeout(deadline);
  writeSample();
});

function writeSample() {
  if (sampleWritten) return;
  sampleWritten = true;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        endpoint,
        requestedAt: new Date().toISOString(),
        request,
        count: events.length,
        events,
      },
      null,
      2
    )
  );
  console.log(`Saved ${events.length} events to ${outPath}`);
}

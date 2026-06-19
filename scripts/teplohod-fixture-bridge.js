const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const port = Number(process.env.TEP_BRIDGE_PORT || 8787);
const fixturesDir = path.resolve(process.env.TEP_FIXTURES_DIR || path.join(rootDir, "data", "teplohod", "fixtures"));

const routes = new Map([
  ["/v1/cities", "cities.json"],
  ["/v1/events", "events-compact.json"],
  ["/v1/events?compact", "events-compact.json"],
]);

http
  .createServer((request, response) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
      if (url.pathname.match(/^\/v1\/events\/\d+$/)) {
        const eventId = url.pathname.split("/").pop();
        const events = readJson("events-compact.json");
        const event = events.find((item) => String(item.id) === String(eventId));
        if (!event) return sendJson(response, 404, { error: "not_found" });
        return sendJson(response, 200, event);
      }

      const routeKey = url.pathname + (url.search === "?compact" ? "?compact" : "");
      const fileName = routes.get(routeKey);
      if (!fileName) return sendJson(response, 404, { error: "not_found", path: url.pathname });

      return sendJson(response, 200, readJson(fileName));
    } catch (error) {
      return sendJson(response, 500, { error: "internal_error", message: error instanceof Error ? error.message : String(error) });
    }
  })
  .listen(port, () => {
    console.log(`Teplohod fixture bridge: http://127.0.0.1:${port}/v1`);
  });

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, fileName), "utf8"));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "access-control-allow-origin": "*",
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

/**
 * Teplohod orders sync STUB (mirror of scripts/tc-sync-orders.js).
 *
 * Status 2026-07-19: DEFERRED — partner teplohod.info confirmed there is NO orders API/export.
 * Do not treat missing TEP_ORDERS_TOKEN as a launch blocker. Do not enable prod cron.
 * Script kept for a possible future API; without credentials exits 0 with status=BLOCKED.
 *
 * Historical probe notes:
 * - Catalog https://api.teplohod.info/v1 — IP allowlist, no /orders (404).
 * - account.teplohod.info/api/orders — exists but 401; not a supported agent orders feed.
 *
 * Env (only if partner ever ships an API):
 *   TEP_ORDERS_API_URL, TEP_ORDERS_TOKEN, TEP_ORDERS_AUTH, TEP_USER_AGENT, DATABASE_URL
 *
 * CLI: --dry-run | --probe | --from= | --to= | --page= | --require-ready
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

const SOURCE_ID = "src_teplohod";
const SOURCE_CODE = "TEPLOHOD";
const DEFAULT_ORDERS_URL = "https://account.teplohod.info/api/orders";
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;
const STALE_CANCELLED_ARCHIVE_DAYS = 30;

const PARTNER_ASK = [
  "Partner stated no orders API (2026-07-19). Revisit only if they ship one.",
  "Auth scheme: Bearer token, access-token query, Basic, or other header name.",
  "Issue agent/partner API token scoped to our widget_id / sales channel.",
  "Response schema: order id, status, created/paid dates, buyer email/phone, tickets[], event/time ids.",
  "Filter params for incremental sync (dateFrom/dateTo, updatedSince, page/per-page).",
  "Whether webhooks are available as alternative to polling.",
  "Whether api.teplohod.info/v1 will ever expose orders under IP allowlist (catalog-only today).",
];

const connectionString = process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet";
const pool = new Pool({ connectionString, max: 3 });

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const ordersUrl = String(process.env.TEP_ORDERS_API_URL || DEFAULT_ORDERS_URL).replace(/\/+$/, "");
  const token = firstString(
    process.env.TEP_ORDERS_TOKEN,
    process.env.TEPLOHOD_API_TOKEN,
    process.env.TEP_API_TOKEN,
    process.env.TEPLOHOD_API_KEY,
  );
  const authMode = String(process.env.TEP_ORDERS_AUTH || "both").toLowerCase();

  if (options.probe) {
    const probe = await probeEndpoint(ordersUrl, token, authMode);
    console.log(JSON.stringify({ status: "PROBE", ordersUrl, hasToken: Boolean(token), ...probe, askPartner: PARTNER_ASK }, null, 2));
    await pool.end();
    return;
  }

  if (!token) {
    const blocked = {
      status: "BLOCKED",
      source: SOURCE_CODE,
      reason:
        "Teplohod orders sync deferred: partner has no orders API (2026-07-19). Stub only; not a prod path.",
      ordersUrl,
      askPartner: PARTNER_ASK,
      hint: "Do not enable prod cron. Revisit only if partner ships an orders API.",
    };
    console.log(JSON.stringify(blocked, null, 2));
    await pool.end();
    if (options.requireReady) process.exitCode = 2;
    return;
  }

  const syncId = `sync_tep_orders_${Date.now()}`;
  const startedAt = new Date();
  const client = await pool.connect();

  try {
    await ensureSource(client);
    if (!options.dryRun) {
      await client.query(
        `
          insert into "SourceSyncRun" (id, "sourceId", status, mode, "startedAt", stats)
          values ($1, $2, 'RUNNING', $3, $4, $5::jsonb)
        `,
        [
          syncId,
          SOURCE_ID,
          "Teplohod orders REST polling",
          startedAt.toISOString(),
          JSON.stringify({ request: publicRequestSummary(options, ordersUrl) }),
        ],
      );
    }
  } finally {
    client.release();
  }

  try {
    const payload = await fetchAllOrders(ordersUrl, token, authMode, options);
    if (options.dryRun) {
      const preview = {
        status: "DRY_RUN",
        source: SOURCE_CODE,
        fetchedOrders: payload.orders.length,
        sample: payload.orders.slice(0, 3).map(summarizeOrder),
        request: publicRequestSummary(options, ordersUrl),
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
      };
      console.log(JSON.stringify(preview, null, 2));
      return;
    }

    const stats = await persistOrders(payload.orders, syncId, startedAt, options, ordersUrl);
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    if (!options.dryRun) await markSyncFailed(syncId, error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function probeEndpoint(ordersUrl, token, authMode) {
  const attempts = [];
  attempts.push(await requestOnce(ordersUrl, null, "none"));
  if (token) {
    if (authMode === "bearer" || authMode === "both") {
      attempts.push(await requestOnce(ordersUrl, token, "bearer"));
    }
    if (authMode === "access-token" || authMode === "both") {
      attempts.push(await requestOnce(ordersUrl, token, "access-token"));
    }
  }
  return { attempts };
}

async function fetchAllOrders(ordersUrl, token, authMode, options) {
  const pageSize = clampNumber(options.pageSize || process.env.TEP_ORDERS_PAGE_SIZE, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
  const maxPages = clampNumber(options.maxPages || process.env.TEP_ORDERS_MAX_PAGES, 1, 1000, 50);
  const orders = [];
  let authUsed = authMode === "access-token" ? "access-token" : "bearer";

  for (let page = 1; page <= maxPages; page += 1) {
    const url = buildOrdersUrl(ordersUrl, { ...options, page, pageSize });
    let response;
    let body;
    let text;

    if (authMode === "both" && page === 1) {
      // Prefer Bearer; fall back to Yii-style access-token query on first 401.
      ({ response, body, text, authUsed } = await fetchWithAuthFallback(url, token));
    } else {
      ({ response, body, text } = await requestJson(url, token, authUsed));
    }

    if (!response.ok) {
      throw new Error(
        `Teplohod orders sync failed: HTTP ${response.status} via ${authUsed} ${safeApiError(body) || text.slice(0, 200)}`,
      );
    }

    const pageOrders = extractOrdersArray(body);
    orders.push(...pageOrders);

    if (!pageOrders.length) break;
    if (pageOrders.length < pageSize) break;
    if (!supportsPaging(body) && page === 1 && pageOrders.length) {
      // Single-shot payload — stop after first page.
      break;
    }
  }

  return { orders, authUsed };
}

async function fetchWithAuthFallback(url, token) {
  let attempt = await requestJson(url, token, "bearer");
  if (attempt.response.status !== 401) {
    return { ...attempt, authUsed: "bearer" };
  }
  attempt = await requestJson(url, token, "access-token");
  return { ...attempt, authUsed: "access-token" };
}

async function requestOnce(url, token, mode) {
  try {
    const { response, text } = await requestJson(url, token, mode);
    return {
      mode,
      httpStatus: response.status,
      bodyPreview: text.slice(0, 180).replace(/\s+/g, " "),
    };
  } catch (error) {
    return { mode, error: error instanceof Error ? error.message : String(error) };
  }
}

async function requestJson(url, token, mode) {
  const target = new URL(String(url));
  const headers = {
    accept: "application/json",
    "user-agent": process.env.TEP_USER_AGENT || process.env.TEPLOHOD_USER_AGENT || "Daibilet/1.0 tep-orders",
  };

  if (token && mode === "bearer") {
    headers.authorization = `Bearer ${token}`;
  }
  if (token && mode === "access-token") {
    target.searchParams.set("access-token", token);
  }

  const response = await fetch(target, { headers });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { response, body, text };
}

function buildOrdersUrl(baseUrl, options) {
  const url = new URL(baseUrl);
  if (options.from) url.searchParams.set("dateFrom", options.from);
  if (options.to) url.searchParams.set("dateTo", options.to);
  // Also pass common aliases — partner may accept one of them.
  if (options.from) url.searchParams.set("from", options.from);
  if (options.to) url.searchParams.set("to", options.to);
  if (options.page) url.searchParams.set("page", String(options.page));
  if (options.pageSize) {
    url.searchParams.set("per-page", String(options.pageSize));
    url.searchParams.set("pageSize", String(options.pageSize));
  }
  const widgetId = process.env.TEP_WIDGET_ID;
  if (widgetId) url.searchParams.set("widget_id", String(widgetId));
  return url;
}

function extractOrdersArray(body) {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.orders)) return body.orders;
  if (Array.isArray(body.results)) return body.results;
  if (body.data && Array.isArray(body.data.items)) return body.data.items;
  if (body.data && Array.isArray(body.data.orders)) return body.data.orders;
  return [];
}

function supportsPaging(body) {
  if (!body || typeof body !== "object") return false;
  return Boolean(
    body.pagination ||
      body._meta ||
      body.meta ||
      body.pageCount != null ||
      body.totalCount != null ||
      body.total != null,
  );
}

async function persistOrders(orders, syncId, startedAt, options, ordersUrl) {
  const client = await pool.connect();
  const stats = {
    status: "SUCCESS",
    source: SOURCE_CODE,
    fetchedOrders: orders.length,
    importedOrders: 0,
    importedTickets: 0,
    linkedTickets: 0,
    withoutTickets: 0,
    withoutEventLink: 0,
    statuses: {},
    request: publicRequestSummary(options, ordersUrl),
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
  };

  try {
    await client.query("BEGIN");
    for (const order of orders) {
      const externalOrderId = firstString(order.id, order.order_id, order.orderId, order.code, order.number, order.uuid);
      if (!externalOrderId) continue;

      const status = String(firstString(order.status, order.state, order.order_status, "unknown"));
      stats.statuses[status] = (stats.statuses[status] || 0) + 1;

      const sourceEventId = firstString(
        order.event_id,
        order.eventId,
        order.event,
        order.event?.id,
        order.excursion_id,
        order.excursionId,
      );
      const linked = await resolveEventAndSession(client, sourceEventId, order);
      if (!linked.eventId) stats.withoutEventLink += 1;

      const snapshot = buildBuyerSnapshot(order, sourceEventId);
      const orderDbId = await upsertExternalOrder(client, {
        externalOrderId,
        status,
        purchasedAt: parseFlexibleDate(
          firstString(order.paid_at, order.paidAt, order.done_at, order.doneAt, order.created_at, order.createdAt, order.datetime),
        ),
        buyerSnapshot: snapshot,
        buyerEmailNormalized: normalizeEmail(snapshot.buyer?.email),
        buyerPhoneNormalized: normalizePhone(snapshot.buyer?.phone),
        publicCode: preferredProviderOrderNumber(order),
        archivedAt: shouldAutoArchiveOrder(order, status) ? new Date().toISOString() : null,
      });

      await upsertRawOrder(client, externalOrderId, order);
      await client.query('delete from "ExternalTicket" where "externalOrderId" = $1 and coalesce(origin, $2) = $2', [
        orderDbId,
        "source",
      ]);

      const tickets = extractTickets(order);
      if (!tickets.length) stats.withoutTickets += 1;

      for (const [index, ticket] of tickets.entries()) {
        const externalTicketId = String(
          firstString(ticket.id, ticket.ticket_id, ticket.ticketId, ticket.number, ticket.code, `${externalOrderId}_${index + 1}`),
        );
        await client.query(
          `
            insert into "ExternalTicket" (id, "externalOrderId", "externalTicketId", status, "eventId", "sessionId", origin)
            values ($1, $2, $3, $4, $5, $6, $7)
            on conflict (id) do update set
              "externalOrderId" = excluded."externalOrderId",
              "externalTicketId" = excluded."externalTicketId",
              status = excluded.status,
              "eventId" = excluded."eventId",
              "sessionId" = excluded."sessionId",
              origin = excluded.origin
          `,
          [
            stableId("extticket_tep", externalTicketId),
            orderDbId,
            externalTicketId,
            String(firstString(ticket.status, order.status, "unknown")),
            linked.eventId,
            linked.sessionId,
            "source",
          ],
        );
        stats.importedTickets += 1;
        if (linked.eventId) stats.linkedTickets += 1;
      }

      stats.importedOrders += 1;
    }

    stats.finishedAt = new Date().toISOString();
    await client.query(
      `
        update "SourceSyncRun"
        set status = 'SUCCESS', "finishedAt" = $2, stats = $3::jsonb
        where id = $1
      `,
      [syncId, stats.finishedAt, JSON.stringify(stats)],
    );
    await client.query("COMMIT");
    return stats;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function extractTickets(order) {
  if (Array.isArray(order.tickets)) return order.tickets;
  if (Array.isArray(order.items)) return order.items;
  if (Array.isArray(order.orderTickets)) return order.orderTickets;
  if (Array.isArray(order.order_tickets)) return order.order_tickets;
  if (Array.isArray(order.places)) return order.places;
  return [];
}

function summarizeOrder(order) {
  return {
    id: firstString(order.id, order.order_id, order.code, order.number),
    status: firstString(order.status, order.state),
    keys: order && typeof order === "object" ? Object.keys(order).slice(0, 30) : [],
  };
}

async function ensureSource(client) {
  await client.query(
    `
      insert into "Source" (id, code, name, enabled, "createdAt", "updatedAt")
      values ($1, 'TEPLOHOD', 'Teplohod.info', true, now(), now())
      on conflict (code) do update set
        name = excluded.name,
        enabled = excluded.enabled,
        "updatedAt" = excluded."updatedAt"
    `,
    [SOURCE_ID],
  );
}

async function upsertExternalOrder(client, order) {
  let publicCode = order.publicCode || null;
  if (publicCode) {
    const conflict = await client.query(
      'select 1 from "ExternalOrder" where "publicCode" = $1 and not ("sourceId" = $2 and "externalOrderId" = $3) limit 1',
      [publicCode, SOURCE_ID, order.externalOrderId],
    );
    if (conflict.rows.length) publicCode = null;
  }
  if (!publicCode) {
    publicCode = await allocatePublicOrderCode(client, SOURCE_ID, order.externalOrderId);
  }
  const result = await client.query(
    `
      insert into "ExternalOrder" (id, "sourceId", "externalOrderId", "publicCode", status, "buyerSnapshot", "buyerEmailNormalized", "buyerPhoneNormalized", "purchasedAt", "archivedAt", "updatedAt")
      values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, now())
      on conflict ("sourceId", "externalOrderId") do update set
        "publicCode" = coalesce(excluded."publicCode", "ExternalOrder"."publicCode"),
        status = excluded.status,
        "buyerSnapshot" = excluded."buyerSnapshot",
        "buyerEmailNormalized" = coalesce(excluded."buyerEmailNormalized", "ExternalOrder"."buyerEmailNormalized"),
        "buyerPhoneNormalized" = coalesce(excluded."buyerPhoneNormalized", "ExternalOrder"."buyerPhoneNormalized"),
        "purchasedAt" = excluded."purchasedAt",
        "archivedAt" = coalesce("ExternalOrder"."archivedAt", excluded."archivedAt"),
        "updatedAt" = excluded."updatedAt"
      returning id
    `,
    [
      stableId("extord_tep", order.externalOrderId),
      SOURCE_ID,
      order.externalOrderId,
      publicCode,
      order.status,
      JSON.stringify(order.buyerSnapshot),
      order.buyerEmailNormalized || null,
      order.buyerPhoneNormalized || null,
      order.purchasedAt,
      order.archivedAt || null,
    ],
  );
  return result.rows[0].id;
}

function preferredProviderOrderNumber(order) {
  const candidates = [order.number, order.code, order.order_number, order.orderNumber];
  for (const value of candidates) {
    if (value == null || value === "") continue;
    const text = String(value).trim().replace(/^#/, "");
    if (!text) continue;
    if (/^[a-f0-9]{16,}$/i.test(text)) continue;
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text)) continue;
    if (/^\d{4,}$/.test(text) || /^[A-Z0-9][-A-Z0-9]{3,}$/i.test(text)) return text;
  }
  return null;
}

function isArchivableStatus(status) {
  const value = String(status || "").toLowerCase();
  return ["cancel", "return", "refund", "reject", "expired", "deleted", "annul"].some((token) => value.includes(token));
}

function shouldAutoArchiveOrder(order, status) {
  if (!isArchivableStatus(status)) return false;
  const raw = firstString(order.paid_at, order.done_at, order.created_at, order.createdAt, order.updated_at);
  if (!raw) return false;
  const when = parseFlexibleDate(raw);
  if (!when) return false;
  const ageMs = Date.now() - new Date(when).getTime();
  return ageMs >= STALE_CANCELLED_ARCHIVE_DAYS * 24 * 60 * 60 * 1000;
}

async function upsertRawOrder(client, externalOrderId, order) {
  const payloadText = JSON.stringify({ order });
  await client.query(
    `
      insert into "RawImportRecord" (id, "sourceId", "entityType", "externalId", payload, "payloadHash", "importedAt")
      values ($1, $2, 'order', $3, $4::jsonb, $5, now())
      on conflict ("sourceId", "entityType", "externalId") do update set
        payload = excluded.payload,
        "payloadHash" = excluded."payloadHash",
        "importedAt" = excluded."importedAt"
      where "RawImportRecord"."payloadHash" is distinct from excluded."payloadHash"
    `,
    [stableId("raw_tep_order", externalOrderId), SOURCE_ID, externalOrderId, payloadText, sha256(payloadText)],
  );
}

async function resolveEventAndSession(client, sourceEventId, order) {
  const externalId = String(sourceEventId || "").trim();
  if (!externalId) return { eventId: null, sessionId: null };

  const eventResult = await client.query(
    `
      select "eventId"
      from "EventSourceLink"
      where "sourceId" = $1 and "externalId" = $2
      limit 1
    `,
    [SOURCE_ID, externalId],
  );
  const eventId = eventResult.rows[0]?.eventId || null;
  if (!eventId) return { eventId: null, sessionId: null };

  const sessionExternalId = firstString(
    order.event_time_id,
    order.eventTimeId,
    order.time_id,
    order.timeId,
    order.session_id,
    order.sessionId,
    order.eventTime?.id,
  );
  if (!sessionExternalId) return { eventId, sessionId: null };

  const sessionResult = await client.query(
    `
      select id
      from "EventSession"
      where "eventId" = $1 and "externalId" = $2
      limit 1
    `,
    [eventId, String(sessionExternalId)],
  );
  return { eventId, sessionId: sessionResult.rows[0]?.id || null };
}

function buildBuyerSnapshot(order, sourceEventId) {
  const customer = firstObject(order.customer, order.buyer, order.client, order.user, order.contact);
  const buyer = {
    name: firstString(
      customer?.name,
      customer?.full_name,
      customer?.fullName,
      customer?.fio,
      order.customer_name,
      order.buyer_name,
      order.name,
    ),
    email: firstString(customer?.email, order.email, order.customer_email, order.buyer_email),
    phone: firstString(customer?.phone, customer?.phone_number, customer?.mobile, order.phone, order.customer_phone, order.buyer_phone),
    notes: firstString(order.code, order.number != null ? `#${order.number}` : null),
  };

  if (!buyer.email) buyer.email = extractEmailFromPayload(order);
  if (!buyer.phone) buyer.phone = extractPhoneFromPayload(order);
  if (!buyer.name) buyer.name = extractNameFromPayload(order);
  buyer.phone = normalizePhoneDisplay(buyer.phone);

  return {
    buyer,
    code: order.code || null,
    number: order.number || null,
    sourceEventId: sourceEventId || null,
    createdAt: order.created_at || order.createdAt || null,
    paidAt: order.paid_at || order.paidAt || null,
    sourcePayload: order,
  };
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

function normalizeEmail(value) {
  if (!value) return null;
  const text = String(value).trim().toLowerCase();
  if (!text || !text.includes("@")) return null;
  const match = text.match(EMAIL_RE);
  return match ? match[0].toLowerCase() : null;
}

function normalizePhone(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (looksLikeDateTime(text)) return null;
  const digits = text.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  return digits;
}

function normalizePhoneDisplay(value) {
  if (!value || looksLikeDateTime(value)) return null;
  return normalizePhone(value) ? String(value).trim() : null;
}

function looksLikeDateTime(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/.test(text);
}

function extractEmailFromPayload(value, depth = 0) {
  if (depth > 8 || value == null) return null;
  if (typeof value === "string") {
    const match = value.match(EMAIL_RE);
    return match ? match[0].toLowerCase() : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractEmailFromPayload(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const key of ["email", "customer_email", "buyer_email", "mail"]) {
      const direct = normalizeEmail(value[key]);
      if (direct) return direct;
    }
    for (const nested of Object.values(value)) {
      const found = extractEmailFromPayload(nested, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function extractPhoneFromPayload(value, depth = 0) {
  if (depth > 8 || value == null) return null;
  if (typeof value === "string") return normalizePhoneDisplay(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractPhoneFromPayload(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const key of ["phone", "phone_number", "mobile", "tel"]) {
      const direct = normalizePhoneDisplay(value[key]);
      if (direct) return direct;
    }
    for (const key of ["customer", "buyer", "client", "contact"]) {
      if (value[key]) {
        const found = extractPhoneFromPayload(value[key], depth + 1);
        if (found) return found;
      }
    }
  }
  return null;
}

function extractNameFromPayload(value, depth = 0) {
  if (depth > 6 || value == null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (text.length < 2 || text.includes("@") || looksLikeDateTime(text) || /^\d+$/.test(text)) return null;
    if (/[a-zа-яё]/i.test(text) && text.split(/\s+/).length <= 6) return text;
    return null;
  }
  if (Array.isArray(value)) return null;
  if (typeof value === "object") {
    for (const key of ["name", "full_name", "fullName", "fio"]) {
      const direct = extractNameFromPayload(value[key], depth + 1);
      if (direct) return direct;
    }
    for (const key of ["customer", "buyer", "client"]) {
      if (value[key]) {
        const found = extractNameFromPayload(value[key], depth + 1);
        if (found) return found;
      }
    }
  }
  return null;
}

function parseFlexibleDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text) ? `${text.replace(" ", "T")}+03:00` : text;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function stableId(prefix, raw) {
  const cleaned = String(raw || "")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 72);
  return `${prefix}_${cleaned || sha256(String(raw)).slice(0, 16)}`;
}

async function allocatePublicOrderCode(client, sourceId, externalOrderId) {
  const existing = await client.query(
    'select "publicCode" from "ExternalOrder" where "sourceId" = $1 and "externalOrderId" = $2 limit 1',
    [sourceId, externalOrderId],
  );
  if (existing.rows[0]?.publicCode) return existing.rows[0].publicCode;

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const code = publicOrderCode(sourceId, externalOrderId, attempt);
    const conflict = await client.query(
      'select 1 from "ExternalOrder" where "publicCode" = $1 and not ("sourceId" = $2 and "externalOrderId" = $3) limit 1',
      [code, sourceId, externalOrderId],
    );
    if (!conflict.rows.length) return code;
  }

  throw new Error(`Cannot allocate public order code for ${sourceId}:${externalOrderId}`);
}

function publicOrderCode(sourceId, externalOrderId, attempt = 0) {
  const salt = attempt ? `:${attempt}` : "";
  const hex = sha256(`${sourceId}:${externalOrderId}${salt}`).slice(0, 12);
  const number = (Number.parseInt(hex, 16) % 9000000) + 1000000;
  return String(number).padStart(7, "0");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function publicRequestSummary(options, ordersUrl) {
  return {
    ordersUrl,
    from: options.from || process.env.TEP_ORDERS_FROM || null,
    to: options.to || process.env.TEP_ORDERS_TO || null,
    pageSize: options.pageSize || process.env.TEP_ORDERS_PAGE_SIZE || DEFAULT_PAGE_SIZE,
    dryRun: Boolean(options.dryRun),
  };
}

function parseArgs(args) {
  const options = {};
  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [key, value = "true"] = arg.slice(2).split("=");
    if (key === "from") options.from = value;
    if (key === "to") options.to = value;
    if (key === "page") options.page = value;
    if (key === "page-size") options.pageSize = value;
    if (key === "max-pages") options.maxPages = value;
    if (key === "dry-run") options.dryRun = true;
    if (key === "probe") options.probe = true;
    if (key === "require-ready") options.requireReady = true;
  }
  return options;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function firstString(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function firstObject(...values) {
  return values.find((value) => value && typeof value === "object" && !Array.isArray(value)) || null;
}

function safeApiError(body) {
  if (!body || typeof body !== "object") return "";
  return body.message || body.error || body.name || JSON.stringify(body).slice(0, 300);
}

async function markSyncFailed(syncId, error) {
  await pool.query(
    `
      update "SourceSyncRun"
      set status = 'FAILED', "finishedAt" = $2, error = $3
      where id = $1
    `,
    [syncId, new Date().toISOString(), error instanceof Error ? error.stack || error.message : String(error)],
  );
}

function loadRootEnv(projectRoot) {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

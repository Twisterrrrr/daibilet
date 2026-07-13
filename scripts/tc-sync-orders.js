const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

const SOURCE_ID = "src_ticketscloud";
const SOURCE_CODE = "TICKETSCLOUD";
const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGE_SIZE = 200;

const connectionString = process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet";
const pool = new Pool({ connectionString, max: 3 });

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = process.env.TICKETSCLOUD_API_TOKEN || process.env.TICKETSCLOUD_API_KEY || process.env.TC_API_TOKEN;
  if (!token) {
    throw new Error("Missing Ticketscloud token: set TICKETSCLOUD_API_TOKEN, TICKETSCLOUD_API_KEY, or TC_API_TOKEN");
  }

  const syncId = `sync_tc_orders_${Date.now()}`;
  const startedAt = new Date();
  const client = await pool.connect();

  try {
    await ensureSource(client);
    await client.query(
      `
        insert into "SourceSyncRun" (id, "sourceId", status, mode, "startedAt", stats)
        values ($1, $2, 'RUNNING', $3, $4, $5::jsonb)
      `,
      [
        syncId,
        SOURCE_ID,
        "Ticketscloud orders REST polling",
        startedAt.toISOString(),
        JSON.stringify({ request: publicRequestSummary(options) }),
      ],
    );
  } finally {
    client.release();
  }

  try {
    const payload = await fetchAllOrders(token, options);
    const stats = await persistOrders(payload.orders, payload.refs, syncId, startedAt, options);
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    await markSyncFailed(syncId, error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function fetchAllOrders(token, options) {
  const pageSize = clampNumber(options.pageSize || process.env.TC_ORDERS_PAGE_SIZE, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
  const maxPages = clampNumber(options.maxPages || process.env.TC_ORDERS_MAX_PAGES, 1, 10000, 1000);
  const orders = [];
  const refs = {};
  let total = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const url = buildOrdersUrl({ ...options, page, pageSize });
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `key ${token}`,
      },
    });

    const text = await response.text();
    const body = parseJsonResponse(text, url);
    if (!response.ok) {
      throw new Error(`Ticketscloud orders sync failed: HTTP ${response.status} ${safeApiError(body)}`);
    }

    const data = Array.isArray(body.data) ? body.data : [];
    orders.push(...data);
    mergeRefs(refs, body.refs);

    const pagination = body.pagination || {};
    total = Number(pagination.total ?? body.total_count ?? total ?? data.length);
    const currentPage = Number(pagination.page || page);
    const currentPageSize = Number(pagination.page_size || pageSize);
    const loaded = currentPage * currentPageSize;

    if (!data.length || (Number.isFinite(total) && loaded >= total)) break;
  }

  return { orders, refs, total };
}

async function persistOrders(orders, refs, syncId, startedAt, options) {
  const client = await pool.connect();
  const stats = {
    source: SOURCE_CODE,
    fetchedOrders: orders.length,
    importedOrders: 0,
    importedTickets: 0,
    linkedTickets: 0,
    withoutTickets: 0,
    withoutEventLink: 0,
    statuses: {},
    request: publicRequestSummary(options),
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
  };

  try {
    await client.query("BEGIN");
    for (const order of orders) {
      const externalOrderId = String(order.id || order.code || order.number || "").trim();
      if (!externalOrderId) continue;

      const status = String(order.status || "unknown");
      stats.statuses[status] = (stats.statuses[status] || 0) + 1;

      const linked = await resolveEventAndSession(client, order.event);
      if (!linked.eventId) stats.withoutEventLink += 1;

      const snapshot = buildBuyerSnapshot(order, refs);
      const orderDbId = await upsertExternalOrder(client, {
        externalOrderId,
        status,
        purchasedAt: parseTcDate(order.done_at || order.created_at),
        buyerSnapshot: snapshot,
        buyerEmailNormalized: normalizeEmail(snapshot.buyer?.email),
        buyerPhoneNormalized: normalizePhone(snapshot.buyer?.phone),
        publicCode: preferredProviderOrderNumber(order),
      });

      await upsertRawOrder(client, externalOrderId, order, refs);
      await client.query('delete from "ExternalTicket" where "externalOrderId" = $1 and coalesce(origin, $2) = $2', [orderDbId, "source"]);

      const tickets = Array.isArray(order.tickets) ? order.tickets : [];
      if (!tickets.length) stats.withoutTickets += 1;

      for (const [index, ticket] of tickets.entries()) {
        const externalTicketId = String(ticket.id || ticket.number || `${externalOrderId}_${index + 1}`);
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
            stableId("extticket_tc", externalTicketId),
            orderDbId,
            externalTicketId,
            String(ticket.status || order.status || "unknown"),
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

    await client.query(
      `
        update "SourceSyncRun"
        set status = 'SUCCESS', "finishedAt" = $2, stats = $3::jsonb
        where id = $1
      `,
      [syncId, new Date().toISOString(), JSON.stringify(stats)],
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

async function ensureSource(client) {
  await client.query(
    `
      insert into "Source" (id, code, name, enabled, "createdAt", "updatedAt")
      values ($1, 'TICKETSCLOUD', 'Ticketscloud', true, now(), now())
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
      insert into "ExternalOrder" (id, "sourceId", "externalOrderId", "publicCode", status, "buyerSnapshot", "buyerEmailNormalized", "buyerPhoneNormalized", "purchasedAt", "updatedAt")
      values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, now())
      on conflict ("sourceId", "externalOrderId") do update set
        "publicCode" = coalesce(excluded."publicCode", "ExternalOrder"."publicCode"),
        status = excluded.status,
        "buyerSnapshot" = excluded."buyerSnapshot",
        "buyerEmailNormalized" = coalesce(excluded."buyerEmailNormalized", "ExternalOrder"."buyerEmailNormalized"),
        "buyerPhoneNormalized" = coalesce(excluded."buyerPhoneNormalized", "ExternalOrder"."buyerPhoneNormalized"),
        "purchasedAt" = excluded."purchasedAt",
        "updatedAt" = excluded."updatedAt"
      returning id
    `,
    [
      stableId("extord_tc", order.externalOrderId),
      SOURCE_ID,
      order.externalOrderId,
      publicCode,
      order.status,
      JSON.stringify(order.buyerSnapshot),
      order.buyerEmailNormalized || null,
      order.buyerPhoneNormalized || null,
      order.purchasedAt,
    ],
  );
  return result.rows[0].id;
}

/** Prefer human-readable Ticketscloud order number over our hashed code. */
function preferredProviderOrderNumber(order) {
  const candidates = [order.number, order.code];
  for (const value of candidates) {
    if (value == null || value === "") continue;
    const text = String(value).trim().replace(/^#/, "");
    if (!text) continue;
    // Skip UUID/hex ids — those stay as externalOrderId, not as customer-facing №.
    if (/^[a-f0-9]{16,}$/i.test(text)) continue;
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text)) continue;
    if (/^\d{4,}$/.test(text) || /^[A-Z0-9][-A-Z0-9]{3,}$/i.test(text)) return text;
  }
  return null;
}

async function upsertRawOrder(client, externalOrderId, order, refs) {
  const payload = { order, refs: refsForOrder(order, refs) };
  const payloadText = JSON.stringify(payload);
  await client.query(
    `
      insert into "RawImportRecord" (id, "sourceId", "entityType", "externalId", payload, "payloadHash", "importedAt")
      values ($1, $2, 'order', $3, $4::jsonb, $5, now())
      on conflict ("sourceId", "entityType", "externalId") do update set
        payload = excluded.payload,
        "payloadHash" = excluded."payloadHash",
        "importedAt" = excluded."importedAt"
    `,
    [stableId("raw_tc_order", externalOrderId), SOURCE_ID, externalOrderId, payloadText, sha256(payloadText)],
  );
}

async function resolveEventAndSession(client, sourceEventId) {
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

  const sessionResult = await client.query(
    `
      select id
      from "EventSession"
      where "eventId" = $1 and "externalId" = $2
      order by "startsAt" asc nulls last
      limit 1
    `,
    [eventId, externalId],
  );

  return { eventId, sessionId: sessionResult.rows[0]?.id || null };
}

function buildOrdersUrl({ page, pageSize, status, events, from, to, onlyWithCustomer }) {
  const base = String(process.env.TICKETSCLOUD_REST_BASE_URL || process.env.TC_API_URL || "https://ticketscloud.com").replace(/\/+$/, "");
  const url = new URL(base.endsWith("/v2") ? `${base}/resources/orders` : `${base}/v2/resources/orders`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));

  const statusValue = status || process.env.TC_ORDERS_STATUS;
  if (statusValue) url.searchParams.set("status", String(statusValue));

  const eventsValue = events || process.env.TC_ORDERS_EVENTS;
  if (eventsValue) url.searchParams.set("events", String(eventsValue));

  const fromValue = from || process.env.TC_ORDERS_FROM;
  const toValue = to || process.env.TC_ORDERS_TO;
  if (fromValue || toValue) url.searchParams.set("created_at", `${fromValue || ""},${toValue || ""}`);

  const onlyWithCustomerValue = onlyWithCustomer ?? process.env.TC_ORDERS_ONLY_WITH_CUSTOMER;
  if (onlyWithCustomerValue != null) url.searchParams.set("only_with_customer", String(onlyWithCustomerValue));

  return url;
}

function buildBuyerSnapshot(order, refs) {
  const customer = firstObject(order.customer, order.buyer, order.user, order.visitor, order.owner);
  const customFields = normalizeCustomFields(order.custom_fields);
  const vendorData = firstObject(order.vendor_data);
  const payment = Array.isArray(order.payments) ? order.payments[0] : firstObject(order.payments);
  const eventRef = refs?.events?.[order.event] || null;
  const partnerRef = refs?.partners?.[order.vendor] || refs?.partners?.[order.org] || null;
  const buyer = {
    name: firstString(customer?.name, customer?.full_name, customFields.name, customFields.fio, vendorData?.name),
    email: firstString(
      customer?.email,
      customFields.email,
      customFields.mail,
      customFields.e_mail,
      vendorData?.email,
      payment?.email,
      payment?.customer_email,
    ),
    phone: firstString(
      customer?.phone,
      customer?.phone_number,
      customFields.phone,
      customFields.tel,
      customFields.mobile,
      vendorData?.phone,
      payment?.phone,
    ),
    notes: firstString(order.code, order.number != null ? `#${order.number}` : null),
  };

  if (!buyer.email) buyer.email = extractEmailFromPayload(order);
  if (!buyer.phone) buyer.phone = extractPhoneFromPayload(order);

  return {
    buyer,
    code: order.code || null,
    number: order.number || null,
    sourceEventId: order.event || null,
    sourceEventTitle: eventTitle(eventRef),
    partnerName: partnerRef?.name || null,
    createdAt: order.created_at || null,
    doneAt: order.done_at || null,
    expiredAfter: order.expired_after || null,
    origin: order.origin || null,
    org: order.org || null,
    vendor: order.vendor || null,
    values: order.values || null,
    payments: order.payments || null,
    paymentStatus: payment?.status || null,
    customFields: order.custom_fields || null,
    vendorData: order.vendor_data || null,
    sourcePayload: order,
  };
}

function refsForOrder(order, refs) {
  if (!refs || typeof refs !== "object") return null;
  return {
    events: order.event && refs.events ? { [order.event]: refs.events[order.event] } : undefined,
    partners: pickRefs(refs.partners, [order.org, order.vendor]),
    categories: refs.categories || undefined,
    venues: refs.venues || undefined,
  };
}

function pickRefs(source, ids) {
  if (!source || typeof source !== "object") return undefined;
  const result = {};
  for (const id of ids.filter(Boolean)) {
    if (source[id]) result[id] = source[id];
  }
  return Object.keys(result).length ? result : undefined;
}

function normalizeCustomFields(value) {
  if (!value) return {};
  if (Array.isArray(value)) {
    return value.reduce((acc, item) => {
      const key = String(item?.key || item?.name || item?.title || "").trim().toLowerCase();
      if (key) acc[key] = item?.value ?? item?.text ?? null;
      return acc;
    }, {});
  }
  if (typeof value === "object") return value;
  return {};
}

function firstObject(...values) {
  return values.find((value) => value && typeof value === "object" && !Array.isArray(value)) || null;
}

function firstString(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
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
  if (/^[a-f0-9]{16,}$/i.test(text.replace(/\s/g, ""))) return null;
  const digits = text.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  return digits;
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
    for (const key of ["email", "customer_email", "buyer_email", "mail", "e-mail", "e_mail"]) {
      const direct = normalizeEmail(value[key]);
      if (direct) return direct;
    }
    for (const [key, nested] of Object.entries(value)) {
      if (/email|mail/i.test(key)) {
        const direct = normalizeEmail(nested);
        if (direct) return direct;
      }
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
  if (typeof value === "string") {
    const normalized = normalizePhone(value);
    if (normalized) return value.trim();
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractPhoneFromPayload(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const key of ["phone", "phone_number", "mobile", "tel", "telephone"]) {
      const direct = firstString(value[key]);
      if (direct && normalizePhone(direct)) return direct;
    }
    for (const nested of Object.values(value)) {
      const found = extractPhoneFromPayload(nested, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function eventTitle(eventRef) {
  if (!eventRef) return null;
  if (typeof eventRef.title === "string") return eventRef.title;
  return eventRef.title?.text || eventRef.name || null;
}

function mergeRefs(target, source) {
  if (!source || typeof source !== "object") return;
  for (const [key, value] of Object.entries(source)) {
    if (!value || typeof value !== "object") continue;
    target[key] ||= {};
    Object.assign(target[key], value);
  }
}

function parseJsonResponse(text, url) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Ticketscloud returned non-JSON response from ${url.origin}${url.pathname}`);
  }
}

function safeApiError(body) {
  if (!body || typeof body !== "object") return "";
  return body.message || body.error || JSON.stringify(body).slice(0, 300);
}

function parseTcDate(value) {
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

function publicRequestSummary(options) {
  return {
    status: options.status || process.env.TC_ORDERS_STATUS || null,
    events: options.events || process.env.TC_ORDERS_EVENTS || null,
    from: options.from || process.env.TC_ORDERS_FROM || null,
    to: options.to || process.env.TC_ORDERS_TO || null,
    onlyWithCustomer: options.onlyWithCustomer ?? process.env.TC_ORDERS_ONLY_WITH_CUSTOMER ?? null,
    pageSize: options.pageSize || process.env.TC_ORDERS_PAGE_SIZE || DEFAULT_PAGE_SIZE,
  };
}

function parseArgs(args) {
  const options = {};
  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [key, value = "true"] = arg.slice(2).split("=");
    if (key === "from") options.from = value;
    if (key === "to") options.to = value;
    if (key === "status") options.status = value;
    if (key === "events") options.events = value;
    if (key === "page-size") options.pageSize = value;
    if (key === "max-pages") options.maxPages = value;
    if (key === "only-with-customer") options.onlyWithCustomer = value;
  }
  return options;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
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
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

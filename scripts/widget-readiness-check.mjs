#!/usr/bin/env node
/**
 * Проверка готовности виджетов: API event detail → обязательные поля для TC / Teplohod.
 *
 * Usage:
 *   node scripts/widget-readiness-check.mjs
 *   node scripts/widget-readiness-check.mjs --base https://staging.daibilet.ru
 *   node scripts/widget-readiness-check.mjs --discover 20
 */

const DEFAULT_BASE = process.env.DAIBILET_API_URL || process.env.VITE_DAIBILET_API_URL || "https://daibilet.ru";
const FETCH_TIMEOUT_MS = Number(process.env.WIDGET_CHECK_TIMEOUT_MS || 10_000);
const FETCH_RETRIES = Number(process.env.WIDGET_CHECK_RETRIES || 2);

const ETALON_SLUGS = [
  {
    slug: "tc-6a266b49465e94f72b4ef8f6-interaktivnaya-vystavka-nyuton-park",
    provider: "TICKETSCLOUD",
    note: "TC recurring, много слотов",
  },
  {
    slug: "tc-6a3582f0bbd948da83dece6e-kombo-kvest",
    provider: "TICKETSCLOUD",
    note: "TC, Санкт-Петербург",
  },
  {
    slug: "marshrut-zolotoi-ostrov-ot-prichala-tretyakovskii-298",
    provider: "TEPLOHOD",
    note: "TEP, сеансы",
  },
  {
    slug: "centralnaya-krugovaya-rechnaya-progulka-ot-parka-zaryade-ves-centr-za-chas-683",
    provider: "TEPLOHOD",
    note: "TEP, Москва",
  },
];

function parseArgs(argv) {
  const options = { base: DEFAULT_BASE, discover: 0, slugs: [...ETALON_SLUGS] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base") {
      options.base = argv[index + 1] || options.base;
      index += 1;
    } else if (arg === "--discover") {
      options.discover = Number(argv[index + 1] || 10);
      index += 1;
    } else if (arg === "--slug") {
      options.slugs.push({ slug: argv[index + 1], provider: null, note: "cli" });
      index += 1;
    }
  }
  return options;
}

function extractTcEventIdFromUrl(url) {
  if (!url) return null;
  const match = String(url).match(/[?&]event=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (response.status >= 500 && attempt < FETCH_RETRIES) {
        await sleep(300 * 2 ** attempt);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= FETCH_RETRIES) break;
      await sleep(300 * 2 ** attempt);
    }
  }
  throw lastError;
}

function checkTcEvent(event, sessions) {
  const issues = [];
  const payload = event.widgetPayload || {};
  const tcEventId = payload.tcEventId || event.externalId;
  if (!tcEventId) issues.push("missing tcEventId");
  if (String(event.widgetProvider || "").toUpperCase() !== "TICKETSCLOUD") {
    issues.push(`widgetProvider=${event.widgetProvider}`);
  }
  const purchaseUrl = event.purchaseUrl || sessions[0]?.purchaseUrl;
  if (!purchaseUrl) issues.push("missing purchaseUrl");
  else if (!extractTcEventIdFromUrl(purchaseUrl)) issues.push("purchaseUrl without event=");
  else if (!/token=/.test(purchaseUrl)) issues.push("purchaseUrl without token=");
  if (event.purchaseReady === false) issues.push("purchaseReady=false");
  const purchasable = sessions.filter((s) => s.purchaseReady !== false && s.purchaseUrl);
  if (!purchasable.length && event.purchaseReady !== true) issues.push("no purchasable sessions");
  return issues;
}

function checkTepEvent(event, sessions) {
  const issues = [];
  const payload = event.widgetPayload || {};
  const tepEventId = payload.tepEventId || event.externalId;
  if (!tepEventId || !/^\d+$/.test(String(tepEventId))) issues.push(`invalid tepEventId=${tepEventId}`);
  if (!payload.tepWidgetId) issues.push("missing tepWidgetId");
  if (String(event.widgetProvider || "").toUpperCase() !== "TEPLOHOD") {
    issues.push(`widgetProvider=${event.widgetProvider}`);
  }
  const purchaseUrl = event.purchaseUrl || sessions[0]?.purchaseUrl;
  if (!purchaseUrl) issues.push("missing purchaseUrl");
  else if (!/account\.teplohod\.info\/order\/event-order|teplohod\.info\/event\/\d+/i.test(purchaseUrl)) {
    issues.push("purchaseUrl not teplohod checkout");
  }
  if (event.purchaseReady === false) issues.push("purchaseReady=false");
  return issues;
}

async function fetchEvent(base, slug) {
  const url = `${base.replace(/\/+$/, "")}/api/public/events/${encodeURIComponent(slug)}`;
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} for ${slug}`);
    error.status = response.status;
    throw error;
  }
  const payload = await response.json();
  return {
    event: payload.event || payload,
    sessions: payload.sessions || [],
  };
}

function inferProvider(item) {
  const values = [
    item?.widgetProvider,
    item?.purchaseProvider,
    item?.offerSourceCode,
    item?.provider,
    item?.source,
    item?.sourceCode,
    item?.id,
    item?.slug,
  ]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());

  if (values.some((value) => value.includes("TEP"))) return "TEPLOHOD";
  if (values.some((value) => value.includes("TICKETSCLOUD") || value.startsWith("TC-"))) {
    return "TICKETSCLOUD";
  }
  return null;
}

async function discoverSlugs(base, limit) {
  const url = `${base.replace(/\/+$/, "")}/api/public/events?limit=${limit}`;
  const response = await fetchWithRetry(url);
  if (!response.ok) throw new Error(`catalog HTTP ${response.status}`);
  const payload = await response.json();
  return (payload.items || []).map((item) => ({
    slug: item.slug,
    provider: inferProvider(item),
    note: "discovered",
  }));
}

async function discoverProviderSlug(base, provider, seen) {
  const normalizedProvider = String(provider || "").toUpperCase();
  if (!normalizedProvider) return null;
  const discovered = await discoverSlugs(base, 200);
  return discovered.find(
    (item) =>
      item.slug &&
      !seen.has(item.slug) &&
      String(item.provider || "").toUpperCase() === normalizedProvider,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets =
    options.discover > 0
      ? [...options.slugs, ...(await discoverSlugs(options.base, options.discover))]
      : options.slugs;

  const seen = new Set();
  const rows = [];
  let failed = 0;

  for (const target of targets) {
    if (!target.slug || seen.has(target.slug)) continue;
    seen.add(target.slug);

    try {
      let activeTarget = target;
      let event;
      let sessions;
      try {
        const fetched = await fetchEvent(options.base, activeTarget.slug);
        event = fetched.event;
        sessions = fetched.sessions;
      } catch (error) {
        if (error?.status !== 404 || !target.provider) throw error;
        const replacement = await discoverProviderSlug(options.base, target.provider, seen);
        if (!replacement) throw error;
        activeTarget = {
          ...replacement,
          provider: target.provider,
          note: `${target.note || "etalon"} fallback for stale slug ${target.slug}`,
        };
        seen.add(activeTarget.slug);
        const fetched = await fetchEvent(options.base, activeTarget.slug);
        event = fetched.event;
        sessions = fetched.sessions;
      }
      const provider =
        activeTarget.provider ||
        String(event.widgetProvider || event.widgetPayload?.provider || "").toUpperCase();
      const issues =
        provider.includes("TEP") || provider === "TEPLOHOD"
          ? checkTepEvent(event, sessions)
          : checkTcEvent(event, sessions);
      const ok = issues.length === 0;
      if (!ok) failed += 1;
      rows.push({
        slug: activeTarget.slug,
        provider: provider || "?",
        ok,
        issues,
        note: activeTarget.note || "",
        tcEventId: event.widgetPayload?.tcEventId,
        tepEventId: event.widgetPayload?.tepEventId,
        purchaseReady: event.purchaseReady,
        sessions: sessions.length,
      });
    } catch (error) {
      failed += 1;
      rows.push({
        slug: target.slug,
        provider: target.provider || "?",
        ok: false,
        issues: [error instanceof Error ? error.message : String(error)],
        note: target.note || "",
      });
    }
  }

  console.log(JSON.stringify({ base: options.base, checked: rows.length, failed, rows }, null, 2));
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const fs = require('fs');
const { createRequire } = require('module');
const requireFromDb = createRequire('/opt/daibilet/packages/db/package.json');
const { Pool } = requireFromDb('pg');
for (const l of fs.readFileSync('/opt/daibilet/.env', 'utf8').split('\n')) {
  const m = l.match(/^DATABASE_URL=(.*)/);
  if (m) process.env.DATABASE_URL = m[1].replace(/^['"]|['"]$/g, '');
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BLOCKED_STATUSES = new Set(['paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden']);

function isSessionPurchaseBlocked(session) {
  const statuses = [session.sourceStatus, session.eventSourceStatus].map((v) => String(v || '').toLowerCase());
  if (statuses.some((s) => BLOCKED_STATUSES.has(s))) return true;
  if (session.purchaseReady === false) return true;
  if (session.vacant === 0) return true;
  if (!session.purchaseUrl && session.purchaseReady !== true) return true;
  return false;
}

function extractTcEventId(session) {
  const purchaseUrl = String(session.purchaseUrl || '');
  const fromTcQuery = purchaseUrl.match(/[?&]event=([^&]+)/)?.[1];
  if (fromTcQuery) return decodeURIComponent(fromTcQuery);
  const fromTepPath = purchaseUrl.match(/teplohod\.info\/event\/(\d+)/i)?.[1];
  if (fromTepPath) return fromTepPath;
  const fromTepId = String(session.eventId || session.id || '').match(/^evt_tep_(\d+)$/i)?.[1];
  if (fromTepId) return fromTepId;
  const raw = String(session.eventId || session.id || '').trim();
  const match = raw.match(/^(?:evt_|sess_)?([a-f0-9]+)$/i);
  return match ? match[1] : raw || null;
}

function isTcPurchaseUrl(url) {
  return /ticketscloud\.(org|com)/i.test(String(url || ''));
}

function getTeplohodId(session) {
  const purchaseUrl = session.widgetUrl || session.purchaseUrl || '';
  const provider = String(session.purchaseProvider || session.offerSourceCode || '').toUpperCase();
  if (!(provider.includes('TEPLOHOD') || provider.includes('TEP') || purchaseUrl.includes('teplohod.info'))) return null;
  const fromId = String(session.id || '').match(/^evt_tep_(\d+)$/i)?.[1];
  const fromUrl = purchaseUrl.match(/teplohod\.info\/event\/(\d+)/i)?.[1];
  return fromId || fromUrl || null;
}

function resolveTcWidgetToken(url) {
  const m = String(url || '').match(/[?&]token=([^&]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

function canBuy(session) {
  if (isSessionPurchaseBlocked(session)) return { ok: false, reason: 'blocked' };
  const purchaseUrl = session.purchaseUrl || session.widgetUrl || session.deeplinkUrl || null;
  const provider = String(session.purchaseProvider || '').toUpperCase();
  const isTc = provider.includes('TICKETSCLOUD') || provider === 'TC' || isTcPurchaseUrl(purchaseUrl);
  const tcEventId = extractTcEventId(session);
  const widgetToken = resolveTcWidgetToken(purchaseUrl);
  if (isTc && tcEventId && widgetToken) return { ok: true, mode: 'tc_widget' };
  const tep = getTeplohodId(session);
  if (tep) return { ok: true, mode: 'teplohod' };
  if (purchaseUrl) return { ok: true, mode: 'link' };
  return { ok: false, reason: 'no_purchase_path' };
}

function expandSlots(session) {
  const variants = [session];
  for (const slot of session.upcomingSlots || []) {
    variants.push({
      ...session,
      id: slot.eventId || session.id,
      eventId: slot.eventId || session.eventId,
      purchaseUrl: slot.purchaseUrl || session.purchaseUrl,
      purchaseReady: slot.purchaseReady ?? session.purchaseReady,
      vacant: slot.vacant ?? session.vacant,
      sourceStatus: slot.sourceStatus ?? session.sourceStatus,
    });
  }
  return variants;
}

(async () => {
  const dto = await import('/opt/daibilet/apps/backend/src/dto.js');
  const db = { query: (...args) => pool.query(...args) };
  const catalog = await dto.buildPublicVenuesCatalog(db, new URLSearchParams({ family: 'location', limit: '500' }));
  const summary = {
    venues: catalog.venues.length,
    venuesWithIssues: 0,
    totalSessions: 0,
    blockedSessions: 0,
    noPurchasePath: 0,
    emptyPages: 0,
    samples: [],
  };

  for (const item of catalog.venues) {
    const page = await dto.buildPublicVenuePage(db, item.slug);
    const sessions = page?.sessions || [];
    if (!sessions.length) {
      summary.emptyPages += 1;
      if (summary.samples.length < 8) {
        summary.samples.push({ venue: item.slug, name: item.name, issue: 'no_sessions_on_page', catalogEvents: item.events });
      }
      continue;
    }

    let venueBad = 0;
    for (const session of sessions) {
      summary.totalSessions += 1;
      const variants = expandSlots(session);
      const results = variants.map((v) => canBuy(v));
      const anyOk = results.some((r) => r.ok);
      if (!anyOk) {
        venueBad += 1;
        const rep = variants[0];
        const buy = results[0];
        if (buy.reason === 'blocked') summary.blockedSessions += 1;
        else summary.noPurchasePath += 1;
        if (summary.samples.length < 25) {
          summary.samples.push({
            venue: item.slug,
            venueName: item.name,
            session: rep.slug || rep.id,
            title: rep.title,
            provider: rep.purchaseProvider,
            offerSourceCode: rep.offerSourceCode,
            purchaseReady: rep.purchaseReady,
            purchaseUrl: rep.purchaseUrl,
            reason: buy.reason,
            sourceStatus: rep.sourceStatus,
            vacant: rep.vacant,
          });
        }
      }
    }
    if (venueBad) summary.venuesWithIssues += 1;
  }

  console.log(JSON.stringify(summary, null, 2));
  await pool.end();
})();

const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(data.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

const BLOCKED = new Set(['paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden']);

function isBlocked(session) {
  const statuses = [session.sourceStatus, session.eventSourceStatus].map((v) => String(v || '').toLowerCase());
  if (statuses.some((s) => BLOCKED.has(s))) return true;
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

function getTeplohodId(session) {
  const purchaseUrl = session.widgetUrl || session.purchaseUrl || '';
  const provider = String(session.purchaseProvider || session.offerSourceCode || '').toUpperCase();
  if (!(provider.includes('TEPLOHOD') || provider.includes('TEP') || purchaseUrl.includes('teplohod.info'))) return null;
  return String(session.id || '').match(/^evt_tep_(\d+)$/i)?.[1] || purchaseUrl.match(/teplohod\.info\/event\/(\d+)/i)?.[1] || null;
}

function widgetToken(url) {
  const m = String(url || '').match(/[?&]token=([^&]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

function canSessionBuy(session) {
  const variants = [session, ...(session.upcomingSlots || []).map((slot) => ({
    ...session,
    id: slot.eventId || session.id,
    eventId: slot.eventId || session.eventId,
    purchaseUrl: slot.purchaseUrl || session.purchaseUrl,
    purchaseReady: slot.purchaseReady ?? session.purchaseReady,
    vacant: slot.vacant ?? session.vacant,
    sourceStatus: slot.sourceStatus ?? session.sourceStatus,
  }))];

  for (const v of variants) {
    const purchaseUrl = v.purchaseUrl || v.widgetUrl || v.deeplinkUrl || null;
    const provider = String(v.purchaseProvider || '').toUpperCase();
    const isTc = provider.includes('TICKETSCLOUD') || provider === 'TC' || /ticketscloud\.(org|com)/i.test(purchaseUrl || '');
    const tcEventId = extractTcEventId(v);
    const token = widgetToken(purchaseUrl);
    if (isTc && tcEventId && token && !isBlocked(v)) return { ok: true, mode: 'tc' };
    const tep = getTeplohodId(v);
    if (tep && !isBlocked(v)) return { ok: true, mode: 'teplohod' };
    // teplohod: allow widget even when vacant=0 if purchase ready
    if (tep && v.purchaseReady !== false && purchaseUrl) return { ok: true, mode: 'teplohod_soldout_slot' };
    if (purchaseUrl && !isBlocked(v)) return { ok: true, mode: 'link' };
  }
  return { ok: false };
}

function groupKey(session) {
  return session.groupKey || [session.title, session.category, session.venue].join('|');
}

(async () => {
  const catalog = await get('https://daibilet.ru/api/public/venues?family=location&limit=500');
  const summary = {
    venues: catalog.venues.length,
    venuesWithBuyIssues: 0,
    groupsTotal: 0,
    groupsNoBuy: 0,
    sessionsTotal: 0,
    sessionsNoBuy: 0,
    catalogVsPageGap: 0,
    samples: [],
  };

  for (const item of catalog.venues) {
    const page = await get(`https://daibilet.ru/api/public/venues/${item.slug}`);
    if (!page?.venue) continue;
    const sessions = page.sessions || [];
    if (item.events > sessions.length) summary.catalogVsPageGap += 1;

    const groups = new Map();
    for (const s of sessions) {
      const key = groupKey(s);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }

    let venueIssue = false;
    for (const [, groupSessions] of groups) {
      summary.groupsTotal += 1;
      summary.sessionsTotal += groupSessions.length;
      const rep = groupSessions[0];
      const buy = canSessionBuy(rep);
      if (!buy.ok) {
        summary.groupsNoBuy += 1;
        venueIssue = true;
        if (summary.samples.length < 30) {
          summary.samples.push({
            venue: item.slug,
            name: item.name,
            title: rep.title,
            provider: rep.purchaseProvider,
            purchaseReady: rep.purchaseReady,
            vacant: rep.vacant,
            purchaseUrl: rep.purchaseUrl ? 'yes' : 'no',
            slots: rep.upcomingSlots?.length || 0,
          });
        }
      }
      for (const s of groupSessions) {
        if (!canSessionBuy(s).ok) summary.sessionsNoBuy += 1;
      }
    }
    if (venueIssue) summary.venuesWithBuyIssues += 1;
  }

  console.log(JSON.stringify(summary, null, 2));
})();

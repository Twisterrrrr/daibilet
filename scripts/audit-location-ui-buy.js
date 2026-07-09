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

function isSessionPurchaseBlocked(session) {
  const statuses = [session.sourceStatus, session.eventSourceStatus].map((v) => String(v || '').toLowerCase());
  if (statuses.some((s) => BLOCKED.has(s))) return true;
  if (session.purchaseReady === false) return true;
  if (session.vacant === 0) return true;
  if (!session.purchaseUrl && session.purchaseReady !== true) return true;
  return false;
}

function expandSlots(session) {
  const out = [session];
  for (const slot of session.upcomingSlots || []) {
    out.push({
      ...session,
      id: slot.eventId || session.id,
      eventId: slot.eventId || session.eventId,
      purchaseUrl: slot.purchaseUrl || session.purchaseUrl,
      widgetUrl: slot.purchaseUrl || session.widgetUrl,
      purchaseReady: slot.purchaseReady ?? session.purchaseReady,
      vacant: slot.vacant ?? session.vacant,
      sourceStatus: slot.sourceStatus ?? session.sourceStatus,
    });
  }
  return out;
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

function widgetToken(url) {
  const m = String(url || '').match(/[?&]token=([^&]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

function getTeplohodId(session) {
  const purchaseUrl = session.widgetUrl || session.purchaseUrl || '';
  const provider = String(session.purchaseProvider || session.offerSourceCode || '').toUpperCase();
  if (!(provider.includes('TEPLOHOD') || provider.includes('TEP') || purchaseUrl.includes('teplohod.info'))) return null;
  const fromId = String(session.id || '').match(/^evt_tep_(\d+)$/i)?.[1];
  const fromUrl = purchaseUrl.match(/teplohod\.info\/event\/(\d+)/i)?.[1];
  return fromId || fromUrl || null;
}

function buildTcPurchaseTargets(groupSessions) {
  const targets = [];
  const seen = new Set();
  const expanded = groupSessions.flatMap(expandSlots);
  for (const session of expanded) {
    if (isSessionPurchaseBlocked(session)) continue;
    const tcEventId = extractTcEventId(session);
    if (!tcEventId || seen.has(tcEventId)) continue;
    seen.add(tcEventId);
    targets.push({ tcEventId, purchaseUrl: session.purchaseUrl });
  }
  return targets;
}

function sessionBuyWouldShowUnavailable(session, groupSessions) {
  const variants = expandSlots(session);
  const representative = variants[0];
  const purchaseUrl = representative.purchaseUrl || session.purchaseUrl || session.widgetUrl || session.deeplinkUrl || null;
  const targets = buildTcPurchaseTargets(groupSessions);
  const primaryTarget = targets[0] || null;
  const tcEventId = primaryTarget?.tcEventId || extractTcEventId(representative);
  const provider = String(session.purchaseProvider || representative.purchaseProvider || '').toUpperCase();
  const isTc = provider.includes('TICKETSCLOUD') || provider === 'TC' || isTcPurchaseUrl(purchaseUrl);
  const token = widgetToken(primaryTarget?.purchaseUrl || purchaseUrl);
  if (isTc && tcEventId && token) return false;
  const tep = getTeplohodId({ ...representative, purchaseProvider: session.purchaseProvider, offerSourceCode: session.offerSourceCode });
  if (tep) return false;
  return !purchaseUrl;
}

function groupKey(session) {
  return session.groupKey || [session.title, session.category, session.venue].join('|');
}

(async () => {
  const catalog = await get('https://daibilet.ru/api/public/venues?family=location&limit=500');
  const summary = { venues: catalog.venues.length, uiUnavailable: 0, vacantZeroTep: 0, samples: [] };

  for (const item of catalog.venues) {
    const page = await get(`https://daibilet.ru/api/public/venues/${item.slug}`);
    const sessions = page.sessions || [];
    const groups = new Map();
    for (const s of sessions) {
      const key = groupKey(s);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }
    for (const [, groupSessions] of groups) {
      const rep = groupSessions[0];
      if (sessionBuyWouldShowUnavailable(rep, groupSessions)) {
        summary.uiUnavailable += 1;
        if (summary.samples.length < 20) {
          summary.samples.push({
            venue: item.slug,
            title: rep.title,
            provider: rep.purchaseProvider,
            purchaseReady: rep.purchaseReady,
            vacant: rep.vacant,
            hasUrl: Boolean(rep.purchaseUrl),
          });
        }
      }
      if (String(rep.purchaseProvider || '').includes('TEPLOHOD') && rep.vacant === 0) summary.vacantZeroTep += 1;
    }
  }
  console.log(JSON.stringify(summary, null, 2));
})();

/**
 * Audit /events/{slug} links from content/blog/*.md against prod public API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = path.join(root, 'content', 'blog');
const baseUrl = process.env.AUDIT_BASE_URL || 'https://daibilet.ru';

function collectSlugs() {
  const files = fs.readdirSync(blogDir).filter((name) => name.endsWith('.md'));
  const bySlug = new Map();
  for (const file of files) {
    const text = fs.readFileSync(path.join(blogDir, file), 'utf8');
    for (const match of text.matchAll(/\]\(\/events\/([^)#?\s]+)\)/g)) {
      const slug = decodeURIComponent(match[1]);
      if (!bySlug.has(slug)) bySlug.set(slug, []);
      bySlug.get(slug).push(file);
    }
  }
  return bySlug;
}

async function checkSlug(slug) {
  const url = `${baseUrl}/api/public/events/${encodeURIComponent(slug)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 404) {
    return { slug, status: '404', detail: 'not found' };
  }
  if (!res.ok) {
    return { slug, status: `http_${res.status}`, detail: await res.text().then((t) => t.slice(0, 120)) };
  }
  const data = await res.json();
  const event = data.event || {};
  const sessions = data.sessions || [];
  const first = sessions[0] || null;
  const startsAt = first?.startsAt || null;
  const flexible = !startsAt || first?.sourceStatus === 'widget' || first?.sourceStatus === 'open_date'
    || String(event.eventType || '').toLowerCase() === 'open_date';
  const tcId = event.widgetPayload?.tcEventId || event.externalId || null;
  const price = event.priceFrom ?? data.stats?.priceFrom ?? null;
  const purchaseReady = event.purchaseReady === true;
  let widgetHint = null;
  if (tcId && purchaseReady) {
    // Only flag obvious synthetic past fallback: widget session with no startsAt on non-open-date.
    if (flexible && String(event.eventType || '').toLowerCase() !== 'open_date' && !startsAt) {
      widgetHint = 'synthetic_flexible_on_dated_event';
    }
  }
  return {
    slug,
    status: 'ok',
    title: event.title,
    eventType: event.eventType,
    priceFrom: price,
    purchaseReady,
    sessions: sessions.length,
    startsAt,
    dateLabel: first?.dateLabel || null,
    externalId: tcId,
    flexible,
    widgetHint,
  };
}

const bySlug = collectSlugs();
const slugs = [...bySlug.keys()].sort();
console.log(`blog event links: ${slugs.length} unique from ${bySlug.size ? 'content/blog' : '?'}`);

const results = [];
for (const slug of slugs) {
  try {
    const row = await checkSlug(slug);
    row.articles = bySlug.get(slug);
    results.push(row);
    const mark = row.status === 'ok' ? (row.widgetHint || 'ok') : row.status;
    console.log(`${mark}\t${slug}`);
  } catch (error) {
    results.push({ slug, status: 'error', detail: String(error?.message || error), articles: bySlug.get(slug) });
    console.log(`error\t${slug}\t${error?.message || error}`);
  }
}

const problems = results.filter((row) =>
  row.status !== 'ok' || row.widgetHint || row.purchaseReady === false || !(row.priceFrom >= 100) || row.sessions === 0,
);

const out = path.join(root, '_blog-events-audit.json');
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, total: results.length, problems, results }, null, 2));
console.log(`\nproblems: ${problems.length}`);
console.log(`wrote ${out}`);

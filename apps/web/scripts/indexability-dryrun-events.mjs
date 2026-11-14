// Dry run, events side.
//
// There is no event-side indexability rule at all today: events.xml carries every
// catalog row. The owner's criterion is written in venue terms (editorial pack,
// mustSee), so this measures what the event population actually looks like,
// to show which arms could mean anything here.
const API = 'https://daibilet.ru/api/public/events';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const items = [];
let offset = 0;
let total = 0;
while (offset < 3400) {
  const res = await fetch(`${API}?limit=200&offset=${offset}`);
  if (!res.ok) {
    console.log(`  offset ${offset} -> HTTP ${res.status}, stopping`);
    break;
  }
  const data = await res.json();
  const list = data.items || [];
  total = data.total ?? total;
  if (!list.length) break;
  items.push(...list);
  process.stdout.write(`\r  ${items.length}/${total}   `);
  offset += 200;
  await sleep(400);
}
console.log('\ndone');

const sitemap = await (await fetch('https://daibilet.ru/sitemaps/events.xml')).text();
const inSitemap = new Set(
  [...sitemap.matchAll(/<loc>https:\/\/daibilet\.ru\/events\/([^<]+)<\/loc>/g)].map((m) => decodeURIComponent(m[1])),
);

console.log(`\nevents fetched : ${items.length}`);
console.log(`api total      : ${total}`);
console.log(`in events.xml  : ${inSitemap.size}`);

const dlen = (e) => String(e.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
const buckets = { '0': 0, '1-99': 0, '100-299': 0, '300-499': 0, '500+': 0 };
for (const e of items) {
  const n = dlen(e);
  if (n === 0) buckets['0'] += 1;
  else if (n < 100) buckets['1-99'] += 1;
  else if (n < 300) buckets['100-299'] += 1;
  else if (n < 500) buckets['300-499'] += 1;
  else buckets['500+'] += 1;
}
console.log('\n=== description length (the "descriptionLength > 500" arm) ===');
for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padStart(8)} chars: ${v}`);

const arm500 = items.filter((e) => dlen(e) > 500);
console.log(`\n  events that would satisfy descriptionLength > 500: ${arm500.length}`);

const noDesc = items.filter((e) => dlen(e) === 0);
console.log(`  events with no description at all: ${noDesc.length} (${Math.round((noDesc.length / items.length) * 100)}%)`);

const flags = ['purchaseReady', 'sourceStatus', 'kind', 'groupedEventsCount'];
console.log('\n=== fields the criterion does not have for events ===');
for (const f of flags) {
  const present = items.filter((e) => e[f] !== undefined).length;
  console.log(`  ${f}: present on ${present}/${items.length}`);
}

const byCity = {};
for (const e of items) byCity[e.city || '<none>'] = (byCity[e.city || '<none>'] || 0) + 1;
console.log('\n=== top 10 cities in the event population ===');
for (const [c, n] of Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  ${String(n).padStart(5)}  ${c}`);
}
console.log(`\n  distinct cities: ${Object.keys(byCity).length}`);

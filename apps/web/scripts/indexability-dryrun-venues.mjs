// Dry run: how many venue URLs would the proposed indexability criterion change?
//
// Proposed by owner:
//   isIndexable = (events >= 1)
//              OR (hasEditorialPack AND descriptionLength > 500)
//              OR (mustSee == true)
//
// Current rule (hub-indexability.ts) is: isIndexable === false -> noindex,
// events <= 0 -> noindex. So today the universe is driven by event count alone.
//
// The public API paginates venues; 429s aggressively, so this is sequential
// with a delay. Only read-only calls.
const API = 'https://daibilet.ru/api/public/venues';
const DELAY_MS = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = [];
let page = 1;
let total = 0;
while (page <= 25) {
  const res = await fetch(`${API}?limit=200&page=${page}`);
  if (!res.ok) {
    console.log(`  page ${page} -> HTTP ${res.status}, stopping`);
    break;
  }
  const data = await res.json();
  const list = data.venues || [];
  total = data.total ?? total;
  if (!list.length) break;
  rows.push(...list);
  process.stdout.write(`\r  fetched ${rows.length}/${total}   `);
  page += 1;
  await sleep(DELAY_MS);
}
console.log('\ndone');

const summary = {
  fetched: rows.length,
  apiTotal: total,
};
console.log(JSON.stringify(summary, null, 2));

// What the API exposes vs what the criterion needs.
const sample = rows[0] || {};
console.log('\n=== fields available on a venue row ===');
console.log(Object.keys(sample).sort().join(', '));
console.log('\n=== fields the criterion needs but the API may not carry ===');
for (const f of ['hasEditorialPack', 'mustSee', 'editorialPack', 'mustSeeCount']) {
  console.log(`  ${f}: ${f in sample ? 'present' : 'ABSENT'}`);
}

// Current rule, applied exactly as hub-indexability.ts does.
const currentlyIndexed = rows.filter((v) => v.isIndexable !== false && Number(v.events) > 0);
const currentlyExcluded = rows.filter((v) => !(v.isIndexable !== false && Number(v.events) > 0));

console.log('\n=== current rule (isIndexable && events > 0) ===');
console.log(`  pass: ${currentlyIndexed.length}`);
console.log(`  excluded: ${currentlyExcluded.length}`);

const byReason = {};
for (const v of currentlyExcluded) {
  const r = v.isIndexable === false ? 'explicit_noindex' : 'zero_events';
  byReason[r] = (byReason[r] || 0) + 1;
}
console.log('  reasons:', JSON.stringify(byReason));

const byType = {};
for (const v of currentlyExcluded) {
  byType[v.type || '<none>'] = (byType[v.type || '<none>'] || 0) + 1;
}
console.log('  excluded by type:');
for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`    ${String(n).padStart(5)}  ${t}`);
}

// The two new arms, as far as the API can answer them.
const descLen = (v) => String(v.description || v.shortDescription || '').trim().length;
const arm1 = currentlyExcluded.filter((v) => descLen(v) > 500);
console.log('\n=== new arm: descriptionLength > 500 among currently excluded ===');
console.log(`  would be added by the description arm alone: ${arm1.length}`);
const buckets = {};
for (const v of arm1) {
  const k = Math.floor(descLen(v) / 250) * 250;
  buckets[k] = (buckets[k] || 0) + 1;
}
console.log('  length distribution:', JSON.stringify(buckets));

console.log('\n=== new arm: mustSee / hasEditorialPack ===');
console.log('  CANNOT be computed from the public API - not exposed.');

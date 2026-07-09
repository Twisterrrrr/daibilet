const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function extractEmbedded(text) {
  const paren = String(text).match(/\(\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)/u);
  if (paren) return { lat: +paren[1], lng: +paren[2], source: 'paren' };
  const dashed = String(text).match(/(?:^|[-_/])(\d{1,2})-(\d{4,7})-(\d{1,3})-(\d{4,7})(?:[-_/]|$)/u);
  if (dashed) return { lat: +`${dashed[1]}.${dashed[2]}`, lng: +`${dashed[3]}.${dashed[4]}`, source: 'slug' };
  return null;
}

(async () => {
  const catalog = await get('https://daibilet.ru/api/public/venues?family=location&limit=500');
  const piers = (catalog.venues || []).filter((v) => v.type === 'pier');
  const issues = [];

  for (const item of piers) {
    const page = await get(`https://daibilet.ru/api/public/venues/${item.slug}`);
    const v = page?.venue;
    if (!v?.latitude) continue;
    const embedded = extractEmbedded(`${item.slug} ${v.name} ${v.address || ''}`);
    if (!embedded) {
      issues.push({ slug: item.slug, name: v.name, lat: v.latitude, lng: v.longitude, issue: 'no_embedded' });
      continue;
    }
    const dist = Math.hypot((v.latitude - embedded.lat) * 111000, (v.longitude - embedded.lng) * 65000);
    if (dist > 80) {
      issues.push({
        slug: item.slug,
        name: v.name,
        api: { lat: v.latitude, lng: v.longitude },
        embedded,
        distM: Math.round(dist),
      });
    }
  }

  console.log(JSON.stringify({ total: piers.length, mismatches: issues.length, issues: issues.slice(0, 30) }, null, 2));
})();

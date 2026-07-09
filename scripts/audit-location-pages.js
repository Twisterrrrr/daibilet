const fs = require('fs');
const { createRequire } = require('module');
const requireFromDb = createRequire('/opt/daibilet/packages/db/package.json');
const { Pool } = requireFromDb('pg');
for (const l of fs.readFileSync('/opt/daibilet/.env', 'utf8').split('\n')) {
  const m = l.match(/^DATABASE_URL=(.*)/);
  if (m) process.env.DATABASE_URL = m[1].replace(/^['"]|['"]$/g, '');
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function issuesForPage(page) {
  const issues = [];
  if (!page) return ['page_null'];
  const v = page.venue || {};
  if (!String(v.city || '').trim() || v.city === 'Не указан') issues.push('no_city');
  if (!String(v.address || '').trim()) issues.push('no_address');
  if (!String(v.description || v.shortDescription || '').trim()) issues.push('no_description');
  if (!Number.isFinite(Number(v.latitude)) || !Number.isFinite(Number(v.longitude))) issues.push('no_coords');
  if (!page.sessions?.length) issues.push('no_sessions');
  return issues;
}

(async () => {
  const dto = await import('/opt/daibilet/apps/backend/src/dto.js');
  const db = { query: (...args) => pool.query(...args) };
  const catalog = await dto.buildPublicVenuesCatalog(db, new URLSearchParams({ family: 'location', limit: '500' }));
  const summary = { total: catalog.venues.length, ok: 0, failed: 0, issueCounts: {}, samples: {} };

  for (const item of catalog.venues) {
    const page = await dto.buildPublicVenuePage(db, item.slug);
    const issues = issuesForPage(page);
    if (!issues.length) {
      summary.ok += 1;
      continue;
    }
    summary.failed += 1;
    for (const issue of issues) {
      summary.issueCounts[issue] = (summary.issueCounts[issue] || 0) + 1;
      if (!summary.samples[issue]) summary.samples[issue] = [];
      if (summary.samples[issue].length < 4) {
        summary.samples[issue].push({ slug: item.slug, name: item.name, issues });
      }
    }
  }
  console.log(JSON.stringify(summary, null, 2));
  await pool.end();
})();

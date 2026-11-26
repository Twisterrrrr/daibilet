import fs from 'node:fs';
import path from 'node:path';

const result = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/ticketscloud/editorial/newyear-eventpage-remaining-production-result-2026-11-26.json'), 'utf8'));
const queue = [...result.pages];
const rows = [];
const workers = Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const page = queue.shift();
    try {
      const response = await fetch(`https://daibilet.ru/events/${page.slug}`, { redirect: 'follow', signal: AbortSignal.timeout(25000) });
      const html = await response.text();
      const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/iu)?.[1]
        || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical/iu)?.[1] || null;
      const robots = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)/iu)?.[1]
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']robots/iu)?.[1] || null;
      rows.push({ slug: page.slug, status: response.status, finalUrl: response.url, canonical, robots,
        selfCanonical: canonical === `https://daibilet.ru/events/${page.slug}`, hasBody: html.includes('О событии') || html.includes('Практическая информация') });
    } catch (error) { rows.push({ slug: page.slug, error: String(error?.message || error) }); }
  }
});
await Promise.all(workers);
rows.sort((a,b)=>a.slug.localeCompare(b.slug,'ru'));
const output = { checkedAt: new Date().toISOString(), total: rows.length, ok200: rows.filter((row)=>row.status===200).length,
  non200: rows.filter((row)=>row.status!==200).map(({slug,status,error})=>({slug,status,error})), canonicalMismatch: rows.filter((row)=>row.status===200&&!row.selfCanonical).map(({slug,canonical})=>({slug,canonical})),
  noindex: rows.filter((row)=>row.status===200&&/noindex/iu.test(row.robots||'' )).map(({slug,robots})=>({slug,robots})), rows };
const outputPath = path.join(process.cwd(), 'data/ticketscloud/editorial/newyear-eventpage-remaining-smoke-2026-11-26.json');
fs.writeFileSync(outputPath, `${JSON.stringify(output,null,2)}\n`);
process.stdout.write(JSON.stringify({checkedAt:output.checkedAt,total:output.total,ok200:output.ok200,non200:output.non200,canonicalMismatch:output.canonicalMismatch.length,noindex:output.noindex.length,outputPath},null,2));

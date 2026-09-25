import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wl = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'audit-city-suburbs-visual-output.json'), 'utf8'),
).regenerateWorklist;
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const header = 'slug,url,hubCity,routeName,poiName,action,duplicateHash';
const rows = wl.map((r) =>
  [r.slug, r.url, r.hubCity, r.routeName, r.poiName, r.action, r.duplicateHash].map(esc).join(','),
);
const out = path.join(__dirname, 'regenerate-suburb-duplicates-worklist.csv');
fs.writeFileSync(out, `${header}\n${rows.join('\n')}\n`);
console.log(JSON.stringify({ rows: wl.length, wrote: out }));

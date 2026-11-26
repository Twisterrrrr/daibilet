import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const auditPath = path.join(root, 'scripts/audit-newyear-eventpage-remaining-production-2026-11-25.mjs');
const source = (await import('node:fs')).readFileSync(auditPath, 'utf8')
  .replaceAll('newyear-eventpage-remaining-live-audit-2026-11-25.json', 'newyear-eventpage-remaining-live-audit-2026-11-26.json')
  .replace("(event.sessions || []).filter(active).length", "(event.sessions || []).filter((session) => session.isActive !== false && session.cancelledAt == null && session.archivedAt == null && new Date(session.startsAt) >= new Date(identity.rows[0].checkedAt) && !['widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale'].includes(String(session.sourceStatus || '').toLowerCase())).length");
const runner = path.join(root, 'scripts/.tmp-newyear-audit-2026-11-26.mjs');
(await import('node:fs')).writeFileSync(runner, source);
await import(pathToFileURL(runner).href);
(await import('node:fs')).unlinkSync(runner);

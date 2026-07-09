/**
 * Проверяет доступность TC-событий в widget API и скрывает «мёртвые» карточки.
 * Запуск на prod после full-sync: node scripts/tc-prune-stale-widget-events.js
 */
const path = require('path');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const WIDGET_TOKEN = String(process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN || '').trim();
const TOKEN = WIDGET_TOKEN.startsWith('r:') ? WIDGET_TOKEN.slice(2) : WIDGET_TOKEN;

const HIDE_ERRORS = new Set([
  'event_not_found',
  'event_finished',
  'event_canceled',
  'event_cancelled',
]);

const BLOCK_PURCHASE_ERRORS = new Set(['event_not_public']);

async function widgetErrorCore(externalId) {
  if (!TOKEN || !externalId) return 'missing_token';

  const response = await fetch('https://ticketscloud.com/v1/services/widget', {
    method: 'POST',
    headers: {
      Authorization: `token ${TOKEN}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ event: externalId }),
  });

  const text = await response.text();
  if (response.ok) return null;
  return text.match(/"error_core":"([^"]+)"/)?.[1] || 'unknown_error';
}

async function main() {
  if (!TOKEN) throw new Error('TICKETSCLOUD_WIDGET_TOKEN is not configured');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const dryRun = process.argv.includes('--dry-run');
  const venueFilter = process.argv.find((arg) => arg.startsWith('--venue='))?.split('=')[1] || '';

  try {
    const params = [];
    let venueSql = '';
    if (venueFilter) {
      params.push(`%${venueFilter}%`);
      venueSql = `and v.title ilike $${params.length}`;
    }

    const result = await pool.query(
      `
        select e.id, e.title, e.status, e."sourceStatus", esl."externalId", v.title as venue
        from "Event" e
        join "EventSourceLink" esl on esl."eventId" = e.id
        join "Source" s on s.id = esl."sourceId" and s.code = 'TICKETSCLOUD'
        left join "Venue" v on v.id = e."venueId"
        where e.status in ('READY', 'PUBLISHED', 'REVIEW')
          and esl."externalId" is not null
          ${venueSql}
        order by e."updatedAt" desc
      `,
      params,
    );

    const hideIds = [];
    const blockPurchaseIds = [];
    let checked = 0;

    for (const row of result.rows) {
      checked += 1;
      const errorCore = await widgetErrorCore(row.externalId);
      if (!errorCore) continue;

      if (HIDE_ERRORS.has(errorCore)) {
        hideIds.push(row.id);
        console.log(`[hide:${errorCore}]`, row.externalId, row.title);
        continue;
      }

      if (BLOCK_PURCHASE_ERRORS.has(errorCore)) {
        blockPurchaseIds.push(row.id);
        console.log(`[block:${errorCore}]`, row.externalId, row.title);
      }
    }

    console.log(`checked=${checked}, hide=${hideIds.length}, blockPurchase=${blockPurchaseIds.length}, dryRun=${dryRun}`);

    if (!dryRun && hideIds.length) {
      await pool.query(`update "Event" set status = 'HIDDEN', "updatedAt" = now() where id = any($1::text[])`, [hideIds]);
    }

    if (!dryRun && blockPurchaseIds.length) {
      await pool.query(
        `update "Event" set "sourceStatus" = 'widget_blocked', "updatedAt" = now() where id = any($1::text[])`,
        [blockPurchaseIds],
      );
    }
  } finally {
    await pool.end();
  }
}

function loadRootEnv(root) {
  const envPath = path.join(root, '.env');
  try {
    const text = require('fs').readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional local .env
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

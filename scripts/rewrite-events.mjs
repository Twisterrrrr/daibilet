#!/usr/bin/env node
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { requestRewrite, usageCost } from './lib/event-rewrite.mjs';
import { promptVersion } from './lib/event-rewrite-prompt.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
if (args.includes('--help')) {
  console.log('node --env-file=.env scripts/rewrite-events.mjs [--apply] [--ids=ids.json] [--batch-size=15] [--max-events=150]\nDefault: read-only pending preview. IDs file: JSON string array. Apply requires migration, API key, model and USD-per-million rates.');
  process.exit(0);
}
const apply = args.includes('--apply');
const batch = Number(option('batch-size', 15)), max = Number(option('max-events', 150));
if (!Number.isInteger(batch) || batch < 10 || batch > 20 || !Number.isInteger(max) || max < 1 || max > 10000) throw new Error('Invalid batch-size (10–20) or max-events (1–10000)');
const idsPath = option('ids', null);
const ids = idsPath ? JSON.parse(readFileSync(idsPath, 'utf8')) : null;
if (ids && (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string'))) throw new Error('IDs must be a nonempty JSON string array');
const config = { key: process.env.DEEPSEEK_API_KEY, model: process.env.DEEPSEEK_MODEL,
  rates: { input: Number(process.env.DEEPSEEK_INPUT_USD_PER_MILLION), hit: Number(process.env.DEEPSEEK_CACHE_HIT_USD_PER_MILLION), output: Number(process.env.DEEPSEEK_OUTPUT_USD_PER_MILLION) } };
if (apply && (!config.key || !config.model || Object.values(config.rates).some(n => !Number.isFinite(n) || n < 0))) throw new Error('Configure DeepSeek key, model, and all three current pricing rates');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const require = createRequire(new URL('../packages/db/package.json', import.meta.url));
const { Client } = require('pg');
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  // Session advisory lock covers the entire run, including network waits; released on crash.
  const lock = await db.query('SELECT pg_try_advisory_lock(72409124) AS locked');
  if (!lock.rows[0].locked) { console.log('Rewrite worker already running'); }
  else {
    const { rows } = await db.query(`SELECT r.*, e.title, e.description AS "currentDescription"
      FROM "EventDescriptionRewrite" r JOIN "Event" e ON e.id = r."eventId"
      WHERE r.status = 'pending' AND ($1::text[] IS NULL OR r."eventId" = ANY($1))
      ORDER BY r."createdAt", r."eventId" LIMIT $2`, [ids, max]);
    if (!apply) console.log(JSON.stringify({ pending: rows.length, ids: rows.map(r => r.eventId), dryRun: true }));
    else for (let offset = 0; offset < rows.length; offset += batch) {
      console.log(JSON.stringify({ batch: offset / batch + 1, size: Math.min(batch, rows.length - offset) }));
      // Sequential API requests inside bounded batches avoid provider burst limits.
      for (const event of rows.slice(offset, offset + batch)) {
        let result;
        try {
          if ((event.currentDescription || '') !== event.originalDescription) result = { status: 'review', text: null, reasons: ['source_changed'] };
          else if (!event.originalDescription.trim() || event.originalDescription.length > 24000) result = { status: 'review', text: null, reasons: ['source_length'] };
          else result = await requestRewrite(event, config);
        } catch (error) { result = { status: 'failed', text: null, reasons: [], error: error.message }; }
        const cost = usageCost(result.usage, config.rates);
        // An import during the API request may have changed status/source: never promote that stale result.
        const saved = await db.query(`UPDATE "EventDescriptionRewrite" r SET
          "rewrittenDescription"=$2, status=CASE WHEN coalesce(e.description,'')=r."originalDescription" THEN $3 ELSE 'review' END,
          "reviewReasons"=CASE WHEN coalesce(e.description,'')=r."originalDescription" THEN $4::jsonb ELSE '["source_changed"]'::jsonb END,
          usage=$5::jsonb, "costUsd"=$6, error=$7, model=$8, "promptVersion"=$9, attempts=r.attempts+1, "updatedAt"=now()
          FROM "Event" e WHERE r."eventId"=$1 AND e.id=r."eventId" AND r.status='pending' RETURNING r.status`,
          [event.eventId, result.text, result.status, JSON.stringify(result.reasons), JSON.stringify(result.usage || null), cost, result.error || null, config.model, promptVersion]);
        console.log(JSON.stringify({ eventId: event.eventId, status: saved.rows[0]?.status || 'skipped_concurrent_change', usage: result.usage || null, costUsd: cost, length: result.text?.length || 0, error: result.error || null }));
      }
    }
  }
} finally { await db.end(); }

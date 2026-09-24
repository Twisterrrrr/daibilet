// Transactional scratch-schema integration test; ALWAYS rolls back. No catalog writes.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { enqueueDescriptionRewrite } from './lib/event-rewrite-queue.js';
const require = createRequire(new URL('../packages/db/package.json', import.meta.url));
const { Client } = require('pg');
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query('BEGIN');
  await db.query(`CREATE SCHEMA rewrite_smoke_${process.pid}`);
  await db.query(`SET LOCAL search_path TO rewrite_smoke_${process.pid}`);
  await db.query(`CREATE TABLE "Event" (id text primary key, description text);
    CREATE TABLE "Source" (id text, code text);
    CREATE TABLE "EventSourceLink" ("eventId" text, "sourceId" text);
    INSERT INTO "Event" VALUES ('test', 'original');
    INSERT INTO "Source" VALUES ('tc', 'TICKETSCLOUD');
    INSERT INTO "EventSourceLink" VALUES ('test', 'tc');`);
  await db.query(readFileSync(new URL('../packages/db/prisma/migrations/20260924010000_event_description_rewrite/migration.sql', import.meta.url), 'utf8'));
  const read = async () => (await db.query('SELECT * FROM "EventDescriptionRewrite"')).rows[0];
  assert.equal((await read()).status, 'pending');
  await db.query(`UPDATE "EventDescriptionRewrite" SET status='ready', "rewrittenDescription"='new copy'`);
  await enqueueDescriptionRewrite(db, 'test', 'original');
  assert.equal((await read()).status, 'ready');
  await enqueueDescriptionRewrite(db, 'test', 'changed upstream');
  assert.equal((await read()).status, 'review');
  assert.equal((await read()).originalDescription, 'original');
  assert.equal((await read()).rewrittenDescription, 'new copy');
  await db.query('SAVEPOINT immutable');
  await assert.rejects(db.query(`UPDATE "EventDescriptionRewrite" SET "originalDescription"='overwrite'`), /immutable/);
  await db.query('ROLLBACK TO SAVEPOINT immutable');
  console.log('PASS: migration, TC backfill, idempotent import, changed-source review, immutable original');
} finally { await db.query('ROLLBACK'); await db.end(); }

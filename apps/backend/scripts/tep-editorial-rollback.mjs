#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const includeSeo = args.has('--include-seo');
const eventId = process.env.TEP_EVENT_ID || null;

async function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(repoRoot, '.env');
  const source = await fs.readFile(envPath, 'utf8').catch(() => '');
  const line = source.split(/\r?\n/).find((item) => item.trim().startsWith('DATABASE_URL='));
  const value = line?.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
  if (value) process.env.DATABASE_URL = value;
}

await loadDatabaseUrl();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(2);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

const query = `
  SELECT
    e.id AS event_id,
    e.title,
    e.description AS source_description,
    e."seoDescription" AS source_seo_description,
    o.id AS override_id,
    o.description AS override_description,
    o."shortDescription" AS override_short_description,
    o."seoDescription" AS override_seo_description,
    l."externalId" AS external_id,
    l."sourceUrl" AS source_url,
    l."rawRecordId" AS raw_record_id,
    rr."payloadHash" AS raw_payload_hash,
    rr.payload->>'description' AS raw_source_description
  FROM "Event" e
  JOIN "EventSourceLink" l ON l."eventId" = e.id
  JOIN "Source" s ON s.id = l."sourceId"
  LEFT JOIN "EventOverride" o ON o."eventId" = e.id
  LEFT JOIN "RawImportRecord" rr ON rr.id = l."rawRecordId"
  WHERE s.code = 'TEPLOHOD'
    AND ($1::text IS NULL OR e.id = $1 OR l."externalId" = $1)
  ORDER BY e.title, e.id
`;

const hasTextToRollback = (row) => Boolean(
  row.override_description
  || row.override_short_description
  || (includeSeo && row.override_seo_description)
  || (row.raw_source_description !== null && row.source_description !== row.raw_source_description),
);

const compact = (value) => typeof value === 'string' ? value.trim().slice(0, 180) : value;

try {
  await client.connect();
  const { rows } = await client.query(query, [eventId]);
  const candidates = rows.filter(hasTextToRollback);

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    source: 'TEPLOHOD',
    totalEvents: rows.length,
    candidates: candidates.length,
    includeSeo,
    events: candidates.map((row) => ({
      eventId: row.event_id,
      externalId: row.external_id,
      title: row.title,
      sourceDescriptionPreview: compact(row.source_description),
      rawSourceDescriptionPreview: compact(row.raw_source_description),
      baseDescriptionMismatch: row.raw_source_description !== null
        && row.source_description !== row.raw_source_description,
      overrideDescriptionLength: row.override_description?.length || 0,
      overrideShortDescriptionLength: row.override_short_description?.length || 0,
      overrideSeoDescriptionLength: row.override_seo_description?.length || 0,
      rawRecordId: row.raw_record_id,
      rawPayloadHash: row.raw_payload_hash,
      sourceUrl: row.source_url,
    })),
  }, null, 2));

  if (!apply || candidates.length === 0) {
    process.exitCode = 0;
  } else {
    const backupDir = process.env.TEP_EDITORIAL_BACKUP_DIR
      || path.resolve(process.cwd(), 'data', 'backups', 'tep-editorial');
    await fs.mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(':', '-');
    const backupPath = path.join(backupDir, `tep-editorial-${stamp}.json`);
    await fs.writeFile(backupPath, JSON.stringify({
      createdAt: new Date().toISOString(),
      source: 'TEPLOHOD',
      includeSeo,
      rows: candidates,
    }, null, 2));

    const fields = [
      'description = NULL',
      '"shortDescription" = NULL',
      ...(includeSeo ? ['"seoDescription" = NULL'] : []),
      '"updatedAt" = NOW()',
    ];
    const ids = candidates.map((row) => row.event_id);
    const sourceRows = candidates.filter((row) => row.raw_source_description !== null);
    const overrideRows = candidates.filter((row) => row.override_description
      || row.override_short_description
      || (includeSeo && row.override_seo_description));

    await client.query('BEGIN');
    if (sourceRows.length > 0) {
      await client.query(
        `UPDATE "Event" AS e
         SET description = source.description, "updatedAt" = NOW()
         FROM unnest($1::text[], $2::text[]) AS source(event_id, description)
         WHERE e.id = source.event_id`,
        [
          sourceRows.map((row) => row.event_id),
          sourceRows.map((row) => row.raw_source_description),
        ],
      );
    }
    if (overrideRows.length > 0) {
      await client.query(
        `UPDATE "EventOverride" SET ${fields.join(', ')} WHERE "eventId" = ANY($1::text[])`,
        [overrideRows.map((row) => row.event_id)],
      );
    }
    const changeDiff = JSON.stringify({
      fieldsCleared: [
        ...(sourceRows.length > 0 ? ['Event.description'] : []),
        ...(overrideRows.length > 0 ? ['description', 'shortDescription'] : []),
        ...(overrideRows.length > 0 && includeSeo ? ['seoDescription'] : []),
      ],
      reason: 'Restore TEP editorial overrides to importer originals',
    });
    const changeMeta = JSON.stringify({
      source: 'TEPLOHOD',
      backupPath,
      eventCount: ids.length,
    });
    const logIds = ids.map(() => `log_${crypto.randomUUID()}`);
    await client.query(
      `INSERT INTO "EventChangeLog" ("id", "eventId", "actorType", action, diff, "metaJson", "createdAt")
       SELECT unnest($1::text[]), unnest($2::text[]), 'SYSTEM', 'UPDATED', $3::jsonb, $4::jsonb, NOW()`,
      [logIds, ids, changeDiff, changeMeta],
    );
    await client.query('COMMIT');
    console.error(`Rollback applied for ${ids.length} event(s). Backup: ${backupPath}`);
  }
} catch (error) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // There may be no open transaction.
  }
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

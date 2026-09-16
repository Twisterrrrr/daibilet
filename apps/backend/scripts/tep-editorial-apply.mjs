#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const defaultBatchPath = path.resolve(repoRoot, 'data/teplohod/editorial/tep-rewrites-2026-09-11.mjs');
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const validateOnly = args.has('--validate-only');
const allowStale = args.has('--allow-stale');
const batchArg = process.argv.slice(2).find((arg) => arg.startsWith('--file='));
const batchPath = batchArg ? path.resolve(process.cwd(), batchArg.slice('--file='.length)) : defaultBatchPath;

const sha256 = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');

function cleanPublicDescription(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function validateBatch(batch) {
  const errors = [];
  const eventIds = new Set();
  const externalIds = new Set();

  if (!batch || typeof batch !== 'object') errors.push('Batch export is missing.');
  if (!batch?.batchId) errors.push('batchId is required.');
  if (batch?.source !== 'TEPLOHOD') errors.push('source must be TEPLOHOD.');
  if (!Array.isArray(batch?.events) || batch.events.length === 0) errors.push('events must be a non-empty array.');

  for (const [index, event] of (batch?.events || []).entries()) {
    const label = event?.eventId || `events[${index}]`;
    for (const field of ['eventId', 'externalId', 'slug', 'title', 'description', 'shortDescription', 'seoDescription']) {
      if (typeof event?.[field] !== 'string' || !event[field].trim()) errors.push(`${label}: ${field} is required.`);
    }
    if (eventIds.has(event.eventId)) errors.push(`${label}: duplicate eventId.`);
    if (externalIds.has(event.externalId)) errors.push(`${label}: duplicate externalId.`);
    eventIds.add(event.eventId);
    externalIds.add(event.externalId);

    if (!/^[a-f0-9]{64}$/.test(event.expectedCurrentDescriptionSha256 || '')) {
      errors.push(`${label}: expectedCurrentDescriptionSha256 must be a SHA-256 hash.`);
    }
    if (!event.identity?.seriesKey || !event.identity?.editionKey || !event.identity?.policy) {
      errors.push(`${label}: complete identity metadata is required.`);
    }
    if (event.shortDescription?.length > 240) errors.push(`${label}: shortDescription exceeds 240 characters.`);
    if (event.seoDescription?.length > 180) errors.push(`${label}: seoDescription exceeds 180 characters.`);
    if (!event.description?.includes('## Особенности')) errors.push(`${label}: Особенности section is required.`);
    if ((event.description?.match(/^-[ \t]+\S/gm) || []).length < 3) errors.push(`${label}: at least three list items are required.`);
    if (/<[a-z][\s\S]*>/i.test(event.description || '')) errors.push(`${label}: description must use safe text blocks, not HTML.`);
  }

  return errors;
}

async function loadBatch() {
  const moduleUrl = `${pathToFileURL(batchPath).href}?v=${Date.now()}`;
  const imported = await import(moduleUrl);
  return imported.tepEditorialBatch || imported.default;
}

async function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(repoRoot, '.env');
  const source = await fs.readFile(envPath, 'utf8').catch(() => '');
  const line = source.split(/\r?\n/).find((item) => item.trim().startsWith('DATABASE_URL='));
  const value = line?.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
  if (value) process.env.DATABASE_URL = value;
}

async function main() {
  const batch = await loadBatch();
  const validationErrors = validateBatch(batch);
  const staticSummary = {
    batchId: batch?.batchId,
    source: batch?.source,
    eventCount: batch?.events?.length || 0,
    policies: Object.groupBy(batch?.events || [], (event) => event.identity.policy),
    validationErrors,
  };

  if (validationErrors.length > 0) {
    console.error(JSON.stringify(staticSummary, null, 2));
    process.exitCode = 1;
    return;
  }
  if (validateOnly) {
    console.log(JSON.stringify({ ...staticSummary, policies: Object.fromEntries(Object.entries(staticSummary.policies).map(([key, rows]) => [key, rows.length])) }, null, 2));
    return;
  }
  await loadDatabaseUrl();
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required unless --validate-only is used.');
    process.exitCode = 2;
    return;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  let transactionOpen = false;
  try {
    await client.connect();
    const eventIds = batch.events.map((event) => event.eventId);
    const { rows } = await client.query(
      `SELECT
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
         rr."payloadHash" AS raw_payload_hash
       FROM "Event" e
       JOIN "EventSourceLink" l ON l."eventId" = e.id
       JOIN "Source" s ON s.id = l."sourceId"
       LEFT JOIN "EventOverride" o ON o."eventId" = e.id
       LEFT JOIN "RawImportRecord" rr ON rr.id = l."rawRecordId"
       WHERE s.code = 'TEPLOHOD' AND e.id = ANY($1::text[])
       ORDER BY e.id`,
      [eventIds],
    );

    const rowsById = new Map(rows.map((row) => [row.event_id, row]));
    const audit = batch.events.map((event) => {
      const row = rowsById.get(event.eventId);
      const currentDescription = row?.override_description?.trim()
        ? row.override_description
        : row?.source_description || '';
      const currentDescriptionSha256 = sha256(cleanPublicDescription(currentDescription));
      return {
        eventId: event.eventId,
        externalId: event.externalId,
        title: event.title,
        found: Boolean(row),
        sourceMatches: row?.external_id === event.externalId,
        currentDescriptionSha256,
        expectedCurrentDescriptionSha256: event.expectedCurrentDescriptionSha256,
        stale: Boolean(row) && currentDescriptionSha256 !== event.expectedCurrentDescriptionSha256,
        hasOverride: Boolean(row?.override_id),
        newDescriptionLength: event.description.length,
        identity: event.identity,
      };
    });
    const missing = audit.filter((item) => !item.found || !item.sourceMatches);
    const stale = audit.filter((item) => item.stale);
    const summary = {
      mode: apply ? 'apply' : 'dry-run',
      batchId: batch.batchId,
      eventCount: batch.events.length,
      found: audit.length - missing.length,
      missingOrWrongSource: missing.length,
      stale: stale.length,
      allowStale,
      events: audit,
    };
    console.log(JSON.stringify(summary, null, 2));

    if (missing.length > 0) throw new Error(`Refusing batch: ${missing.length} event(s) are missing or have a mismatched TEP externalId.`);
    if (stale.length > 0 && !allowStale) throw new Error(`Refusing batch: ${stale.length} current description(s) changed after the audit. Review them or pass --allow-stale explicitly.`);
    if (!apply) return;

    const backupDir = process.env.TEP_EDITORIAL_BACKUP_DIR
      || path.resolve(repoRoot, 'data', 'backups', 'tep-editorial');
    await fs.mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(':', '-');
    const backupPath = path.join(backupDir, `${batch.batchId}-${stamp}.json`);
    await fs.writeFile(backupPath, JSON.stringify({
      createdAt: new Date().toISOString(),
      batchId: batch.batchId,
      source: batch.source,
      rows,
    }, null, 2));

    await client.query('BEGIN');
    transactionOpen = true;
    for (const event of batch.events) {
      const row = rowsById.get(event.eventId);
      await client.query(
        `INSERT INTO "EventOverride" (
           id, "eventId", description, "shortDescription", "seoDescription", "createdAt", "updatedAt"
         ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT ("eventId") DO UPDATE SET
           description = EXCLUDED.description,
           "shortDescription" = EXCLUDED."shortDescription",
           "seoDescription" = EXCLUDED."seoDescription",
           "updatedAt" = NOW()`,
        [`ovr_${crypto.randomUUID()}`, event.eventId, event.description, event.shortDescription, event.seoDescription],
      );
      await client.query(
        `INSERT INTO "EventChangeLog" (
           id, "eventId", "actorType", action, diff, "metaJson", "createdAt"
         ) VALUES ($1, $2, 'SYSTEM', 'UPDATED', $3::jsonb, $4::jsonb, NOW())`,
        [
          `log_${crypto.randomUUID()}`,
          event.eventId,
          JSON.stringify({
            fields: ['description', 'shortDescription', 'seoDescription'],
            previousDescriptionSha256: sha256(cleanPublicDescription(row.override_description?.trim() ? row.override_description : row.source_description || '')),
            nextDescriptionSha256: sha256(cleanPublicDescription(event.description)),
          }),
          JSON.stringify({
            source: batch.source,
            externalId: event.externalId,
            batchId: batch.batchId,
            canonVersion: batch.canonVersion,
            promptVersion: batch.promptVersion,
            rawPayloadHash: row.raw_payload_hash,
            identity: event.identity,
            quality: event.quality,
            backupPath,
          }),
        ],
      );
    }
    await client.query('COMMIT');
    transactionOpen = false;
    console.error(`Applied ${batch.events.length} editorial overrides. Backup: ${backupPath}`);
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

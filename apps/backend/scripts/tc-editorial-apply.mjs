#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const defaultBatchPath = path.resolve(
  repoRoot,
  'data/ticketscloud/editorial/tc-rewrites-2026-09-15-iteration-1.mjs',
);

export function cleanPublicDescription(value) {
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

export const sha256 = (value) =>
  crypto.createHash('sha256').update(cleanPublicDescription(value)).digest('hex');

export function validateEditorialDescription(description) {
  const text = String(description || '').replace(/\r\n?/g, '\n').trim();
  const lines = text.split('\n');
  const headings = [];
  let firstHeadingIndex = -1;
  let featureHeadingIndex = -1;
  for (const [index, line] of lines.entries()) {
    const match = line.trim().match(/^##\s+(.+?)\s*$/u);
    if (!match) continue;
    const heading = match[1].replace(/:$/u, '').trim();
    headings.push(heading);
    if (firstHeadingIndex < 0) firstHeadingIndex = index;
    if (/^особенности$/iu.test(heading)) featureHeadingIndex = index;
  }
  const featureItems = [];
  if (featureHeadingIndex >= 0) {
    for (let index = featureHeadingIndex + 1; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (/^##\s+/u.test(line)) break;
      if (/^[-*]\s+\S/u.test(line)) featureItems.push(line);
    }
  }
  const intro = firstHeadingIndex > 0 ? lines.slice(0, firstHeadingIndex).join('\n').trim() : '';
  const errors = [];
  if (intro.length < 40) errors.push('a substantive intro before headings is required');
  if (headings.length < 2) errors.push('at least two ## sections are required');
  if (headings.some((heading) => /^о событии$/iu.test(heading))) errors.push('## О событии duplicates the UI');
  if (featureHeadingIndex < 0) errors.push('## Особенности is required');
  else if (featureItems.length < 2) errors.push('## Особенности needs at least two factual list items');
  if (/<[a-z][\s\S]*>/i.test(text)) errors.push('HTML is not allowed');
  return { valid: errors.length === 0, errors, headings, featureItems: featureItems.length };
}

export function validateBatch(batch) {
  const errors = [];
  const seriesIds = new Set();
  if (!batch?.batchId) errors.push('batchId is required');
  if (batch?.source !== 'TICKETSCLOUD') errors.push('source must be TICKETSCLOUD');
  if (!Array.isArray(batch?.series) || batch.series.length === 0) errors.push('series must be a non-empty array');

  for (const [index, item] of (batch?.series || []).entries()) {
    const label = item?.metaExternalId || `series[${index}]`;
    for (const field of [
      'metaExternalId',
      'representativeEventId',
      'title',
      'sourceDescription',
      'expectedSourceDescriptionSha256',
      'description',
      'shortDescription',
      'seoDescription',
    ]) {
      if (typeof item?.[field] !== 'string' || !item[field].trim()) errors.push(`${label}: ${field} is required`);
    }
    if (seriesIds.has(item.metaExternalId)) errors.push(`${label}: duplicate metaExternalId`);
    seriesIds.add(item.metaExternalId);
    if (sha256(item.sourceDescription) !== item.expectedSourceDescriptionSha256) {
      errors.push(`${label}: source description hash does not match the batch payload`);
    }
    if (item.shortDescription?.length > 240) errors.push(`${label}: shortDescription exceeds 240 characters`);
    if (item.seoDescription?.length > 180) errors.push(`${label}: seoDescription exceeds 180 characters`);
    const structure = validateEditorialDescription(item.description);
    for (const error of structure.errors) errors.push(`${label}: ${error}`);
    if (item.quality?.status !== 'APPROVED') errors.push(`${label}: quality.status must be APPROVED`);
    if (!Array.isArray(item.facts) || item.facts.length < 2) errors.push(`${label}: at least two verified facts are required`);
  }
  return errors;
}

async function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const source = await fs.readFile(path.resolve(repoRoot, '.env'), 'utf8').catch(() => '');
  const line = source.split(/\r?\n/).find((item) => item.trim().startsWith('DATABASE_URL='));
  const value = line?.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
  if (value) process.env.DATABASE_URL = value;
}

async function loadBatch(batchPath) {
  const imported = await import(`${pathToFileURL(batchPath).href}?v=${Date.now()}`);
  return imported.tcEditorialBatch || imported.default;
}

export async function run(options = {}) {
  const batchPath = options.batchPath || defaultBatchPath;
  const batch = await loadBatch(batchPath);
  const validationErrors = validateBatch(batch);
  if (validationErrors.length) throw new Error(`Invalid batch:\n${validationErrors.join('\n')}`);
  if (options.validateOnly) {
    return { mode: 'validate-only', batchId: batch.batchId, series: batch.series.length };
  }

  await loadDatabaseUrl();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let transactionOpen = false;
  try {
    const audit = [];
    const backupRows = [];
    for (const item of batch.series) {
      const result = await client.query(
        `
          select e.id, e.slug, e.title, e.description as "sourceDescription",
                 override.id as "overrideId", override.description as "overrideDescription",
                 override."shortDescription", override."seoDescription"
          from "EventSourceLink" link
          join "Source" source on source.id = link."sourceId" and source.code::text = 'TICKETSCLOUD'
          join "Event" e on e.id = link."eventId"
          left join "EventOverride" override on override."eventId" = e.id
          where link."metaExternalId" = $1
            and e.title = $2
            and e.description = $3
          order by e.id
        `,
        [item.metaExternalId, item.title, item.sourceDescription],
      );
      const representativeFound = result.rows.some((row) => row.id === item.representativeEventId);
      const conflictingOverrides = result.rows.filter(
        (row) => row.overrideDescription?.trim() && row.overrideDescription.trim() !== item.description.trim(),
      );
      audit.push({
        metaExternalId: item.metaExternalId,
        title: item.title,
        targetRows: result.rows.length,
        representativeFound,
        conflictingOverrides: conflictingOverrides.length,
      });
      if (!representativeFound || result.rows.length === 0) {
        throw new Error(`Refusing ${item.metaExternalId}: representative/source edition is stale or missing`);
      }
      if (conflictingOverrides.length && !options.allowOverwrite) {
        throw new Error(`Refusing ${item.metaExternalId}: ${conflictingOverrides.length} conflicting override(s)`);
      }
      backupRows.push(...result.rows.map((row) => ({ metaExternalId: item.metaExternalId, ...row })));
    }

    const summary = {
      mode: options.apply ? 'apply' : 'dry-run',
      batchId: batch.batchId,
      series: batch.series.length,
      targetRows: audit.reduce((sum, item) => sum + item.targetRows, 0),
      audit,
    };
    if (!options.apply) return summary;

    const backupDir = process.env.TC_EDITORIAL_BACKUP_DIR || path.resolve(repoRoot, 'data/backups/tc-editorial');
    await fs.mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(':', '-');
    const backupPath = path.join(backupDir, `${batch.batchId}-${stamp}.json`);
    await fs.writeFile(
      backupPath,
      JSON.stringify({ createdAt: new Date().toISOString(), batchId: batch.batchId, rows: backupRows }, null, 2),
    );

    const runId = `${batch.batchId}:${Date.now()}`;
    await client.query('BEGIN');
    transactionOpen = true;
    for (const item of batch.series) {
      await client.query(
        `
          insert into "EventOverride" (
            id, "eventId", description, "shortDescription", "seoDescription", "createdAt", "updatedAt"
          )
          select
            'ovr_tc_' || md5(e.id), e.id, $4, $5, $6, now(), now()
          from "EventSourceLink" link
          join "Source" source on source.id = link."sourceId" and source.code::text = 'TICKETSCLOUD'
          join "Event" e on e.id = link."eventId"
          where link."metaExternalId" = $1
            and e.title = $2
            and e.description = $3
          on conflict ("eventId") do update set
            description = excluded.description,
            "shortDescription" = excluded."shortDescription",
            "seoDescription" = excluded."seoDescription",
            "updatedAt" = now()
        `,
        [item.metaExternalId, item.title, item.sourceDescription, item.description, item.shortDescription, item.seoDescription],
      );
      await client.query(
        `
          insert into "EventChangeLog" (id, "eventId", "actorType", action, diff, "metaJson", "createdAt")
          select
            'log_tc_' || md5($7 || e.id),
            e.id,
            'SYSTEM',
            'UPDATED',
            jsonb_build_object(
              'fields', jsonb_build_array('description', 'shortDescription', 'seoDescription'),
              'sourceDescriptionSha256', $8,
              'nextDescriptionSha256', $9
            ),
            jsonb_build_object(
              'source', 'TICKETSCLOUD',
              'metaExternalId', $1,
              'batchId', $10,
              'canonVersion', $11,
              'promptVersion', $12,
              'facts', $13::jsonb,
              'quality', $14::jsonb,
              'backupPath', $15
            ),
            now()
          from "EventSourceLink" link
          join "Source" source on source.id = link."sourceId" and source.code::text = 'TICKETSCLOUD'
          join "Event" e on e.id = link."eventId"
          where link."metaExternalId" = $1
            and e.title = $2
            and e.description = $3
        `,
        [
          item.metaExternalId,
          item.title,
          item.sourceDescription,
          item.description,
          item.shortDescription,
          item.seoDescription,
          runId,
          item.expectedSourceDescriptionSha256,
          sha256(item.description),
          batch.batchId,
          batch.canonVersion,
          batch.promptVersion,
          JSON.stringify(item.facts),
          JSON.stringify(item.quality),
          backupPath,
        ],
      );
    }
    await client.query('COMMIT');
    transactionOpen = false;
    return { ...summary, backupPath };
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

const args = new Set(process.argv.slice(2));
const batchArg = process.argv.slice(2).find((arg) => arg.startsWith('--file='));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run({
    apply: args.has('--apply'),
    validateOnly: args.has('--validate-only'),
    allowOverwrite: args.has('--allow-overwrite'),
    batchPath: batchArg ? path.resolve(process.cwd(), batchArg.slice('--file='.length)) : defaultBatchPath,
  })
    .then((summary) => console.log(JSON.stringify(summary, null, 2)))
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : error);
      process.exitCode = 1;
    });
}

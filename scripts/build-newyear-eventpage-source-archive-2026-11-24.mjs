import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'data/ticketscloud/editorial');
const selection = JSON.parse(fs.readFileSync(path.join(dir, 'newyear-eventpage-selection-150-2026-11-24.json'), 'utf8'));
const live = JSON.parse(fs.readFileSync(path.join(dir, 'newyear-eventpage-selection-150-live-descriptions-2026-11-24.json'), 'utf8'));
const candidateSnapshot = JSON.parse(fs.readFileSync(path.join(dir, 'newyear-candidates-production-2026-11-24.json'), 'utf8'));
const candidateSourceByEventId = new Map(candidateSnapshot.candidates.map((event) => [event.eventId, event.description]));
const selected = selection.batches.flat();
const byPageId = new Map(live.pages.map((page) => [page.eventPageId, page]));

if (selected.length !== 150 || byPageId.size !== 150) throw new Error('Expected exactly 150 selected and audited EventPages.');

const pages = selected.map((item) => {
  const page = byPageId.get(item.eventPageId);
  if (!page || page.slug !== item.slug || page.status !== 'DRAFT' || page.isIndexable !== false || page.publishedAt) {
    throw new Error(`Live identity/status mismatch at ${item.batch}#${item.sequence}: ${item.slug}`);
  }
  const primary = page.events.find((event) => event.eventId === item.eventId);
  if (!primary || !item.description) throw new Error(`Missing selected source text for ${item.batch}#${item.sequence}: ${item.eventId}`);
  if (!page.events.some((event) => event.activeFutureSessions > 0 && event.activeOffers > 0)) {
    throw new Error(`No active future sale for ${item.batch}#${item.sequence}: ${item.slug}`);
  }
  return {
    batch: item.batch,
    sequence: item.sequence,
    selectionReason: item.selectionReason,
    selectedPrimaryEventId: item.eventId,
    sourceChars: item.sourceChars,
    page: {
      id: page.eventPageId,
      slug: page.slug,
      title: item.pageTitle,
      city: item.city,
      status: page.status,
      isIndexable: page.isIndexable,
      publishedAt: page.publishedAt,
      tourGroupId: page.tourGroupId,
      rewriteStatus: page.rewriteStatus,
    },
    linkedEvents: page.events.map((event) => ({
      ...event,
      sourceDescription: event.eventId === item.eventId ? item.description : (event.description ?? candidateSourceByEventId.get(event.eventId) ?? null),
      sourceDescriptionProvenance: event.eventId === item.eventId ? 'selection-snapshot' : (event.description ? 'current-production' : candidateSourceByEventId.has(event.eventId) ? 'candidate-snapshot' : 'missing'),
      originalDescriptionChars: (event.eventId === item.eventId ? item.description : (event.description ?? candidateSourceByEventId.get(event.eventId) ?? ''))
        .replace(/<[^>]*>/g, '').length,
    })),
  };
});

const linkedEventIds = pages.flatMap((page) => page.linkedEvents.map((event) => event.eventId));
if (new Set(linkedEventIds).size !== linkedEventIds.length) throw new Error('Duplicate Event ID appears under multiple selected EventPages.');

const output = {
  generatedAt: new Date().toISOString(),
  database: live.database,
  checkedAt: live.checkedAt,
  selectionFile: path.basename(path.join(dir, 'newyear-eventpage-selection-150-2026-11-24.json')),
  livePageCount: pages.length,
  linkedEventCount: linkedEventIds.length,
  archiveNote: 'Authoritative read-only production snapshot for this final selection. Keeps every selected EventPage link and exact source Event.description before editorial rewrite.',
  pages,
};

const outputPath = path.join(dir, 'newyear-eventpage-source-archive-final-2026-11-24.json');
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(JSON.stringify({ output: path.basename(outputPath), pages: pages.length, linkedEvents: linkedEventIds.length,
  withSourceDescriptions: pages.reduce((sum, page) => sum + page.linkedEvents.filter((event) => Boolean(event.sourceDescription)).length, 0) }, null, 2));

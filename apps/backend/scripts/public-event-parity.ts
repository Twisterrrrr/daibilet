import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPublicEventPage } from '../src/dto.js';
import { createDb } from '../src/db.js';
import { getPublicCatalogSessions } from '../src/public-catalog.dto.js';
import { buildPublicEventDto, clearPublicEventDtoCache } from '../src/public-event.dto.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../../..');
const db = createDb(projectRoot);
const catalog = await getPublicCatalogSessions(true);

const samples = [
  catalog.find((item) => String(item.offerSourceCode).includes('TICKETSCLOUD') && item.startsAt),
  catalog.find((item) => String(item.offerSourceCode).includes('TEPLOHOD') && item.startsAt),
  catalog.find((item) => item.kind === 'OPEN_DATE'),
].filter((item, index, rows) => item && rows.findIndex((candidate) => candidate?.id === item.id) === index);

assert.ok(samples.length >= 2, 'catalog must provide provider parity samples');

for (const sample of samples) {
  if (!sample) continue;
  const locator = sample.slug || sample.id;
  clearPublicEventDtoCache();
  const [legacy, typed] = await Promise.all([
    buildPublicEventPage(db, locator),
    buildPublicEventDto(locator, true),
  ]);

  assert.ok(legacy, `${locator}: legacy event`);
  assert.ok(typed, `${locator}: typed event`);
  assert.deepEqual(eventCore(typed.event), eventCore(legacy.event), `${locator}: event core`);
  assert.deepEqual(
    typed.sessions.map(sessionCore),
    legacy.sessions.map(sessionCore),
    `${locator}: sessions`,
  );
  assert.deepEqual(
    typed.offers.map(offerCore),
    legacy.offers.map(offerCore),
    `${locator}: offers`,
  );
  assert.deepEqual(
    typed.ticketPrices?.map(ticketCore),
    legacy.ticketPrices?.map(ticketCore),
    `${locator}: ticket prices`,
  );
  assert.deepEqual(typed.landings.map((item) => item.slug), legacy.landings.map((item: { slug: string }) => item.slug), `${locator}: landings`);
  assert.deepEqual(typed.stats, legacy.stats, `${locator}: stats`);
  console.log(`${sample.offerSourceCode || sample.kind}: ${locator}, event parity ok`);
}

process.exit(0);

function eventCore(event: any) {
  return {
    id: event.id,
    slug: event.slug,
    sourceCode: event.sourceCode,
    externalId: event.externalId,
    title: event.title,
    description: event.description,
    category: event.category,
    city: event.city,
    citySlug: event.citySlug,
    venue: event.venue,
    priceFrom: event.priceFrom,
    eventType: event.eventType,
    landingSlugs: event.landingSlugs,
    groupEventIds: event.groupEventIds,
    sessionCount: event.sessionCount,
    purchaseReady: event.purchaseReady,
    purchaseProvider: event.purchaseProvider,
  };
}

function sessionCore(session: any) {
  return {
    id: session.id,
    eventId: session.eventId,
    startsAt: session.startsAt,
    dateLabel: session.dateLabel,
    timeLabel: session.timeLabel,
    sourceStatus: session.sourceStatus,
    priceFrom: session.priceFrom,
    vacant: session.vacant,
    purchaseReady: session.purchaseReady,
  };
}

function offerCore(offer: any) {
  return {
    id: offer.id,
    sourceCode: offer.sourceCode,
    title: offer.title,
    priceRub: offer.priceRub,
    active: offer.active,
  };
}

function ticketCore(ticket: any) {
  return {
    title: ticket.title,
    priceRub: ticket.priceRub,
    source: ticket.source,
    kind: ticket.kind,
    sortOrder: ticket.sortOrder ?? null,
  };
}

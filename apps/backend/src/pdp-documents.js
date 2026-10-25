import { randomUUID } from 'node:crypto';

// Editorial content is independent of the public page template. Dates, prices and
// availability stay in EventSession/EventOffer and are never copied into this document.
export const PDP_VARIANTS = {
  museum: ['about', 'visit_facts', 'gallery', 'ticket_guide', 'exhibitions', 'collection', 'routes', 'audio_guide', 'accessibility', 'location', 'faq'],
  theater: ['about', 'visit_facts', 'gallery', 'ticket_guide', 'halls', 'repertoire_guide', 'seating', 'accessibility', 'location', 'faq'],
  concert_hall: ['about', 'visit_facts', 'gallery', 'ticket_guide', 'halls', 'acoustics', 'subscriptions', 'seating', 'accessibility', 'location', 'faq'],
  club: ['about', 'visit_facts', 'gallery', 'ticket_guide', 'atmosphere', 'entry_rules', 'spaces', 'accessibility', 'location', 'faq'],
  pier: ['about', 'visit_facts', 'gallery', 'ticket_guide', 'boarding', 'routes', 'fleet', 'weather_policy', 'accessibility', 'location', 'faq'],
  landmark: ['about', 'visit_facts', 'gallery', 'history', 'highlights', 'visit_route', 'accessibility', 'location', 'faq'],
  nature: ['about', 'visit_facts', 'gallery', 'trails', 'seasonality', 'safety', 'accessibility', 'location', 'faq'],
  urban_area: ['about', 'visit_facts', 'gallery', 'highlights', 'walking_routes', 'spaces', 'accessibility', 'location', 'faq'],
  food: ['about', 'visit_facts', 'gallery', 'chef', 'menu', 'dining_events', 'atmosphere', 'reasons_to_visit', 'spaces', 'booking', 'accessibility', 'location', 'faq'],
  attraction: ['about', 'visit_facts', 'gallery', 'ticket_guide', 'zones', 'shows', 'feeding_schedule', 'visit_routes', 'entry_rules', 'accessibility', 'location', 'faq'],
  transport: ['about', 'visit_facts', 'gallery', 'ticket_guide', 'boarding', 'routes', 'stations', 'destination', 'schedule_notes', 'weather_policy', 'alternatives', 'accessibility', 'location', 'faq'],
  park: ['about', 'visit_facts', 'gallery', 'ticket_guide', 'map', 'walking_routes', 'highlights', 'seasonality', 'tours', 'rentals', 'food_spots', 'entry_rules', 'accessibility', 'location', 'faq'],
  space: ['about', 'visit_facts', 'gallery', 'activities', 'map', 'places_inside', 'walking_routes', 'history', 'tours', 'accessibility', 'location', 'faq'],
  religion: ['about', 'visit_facts', 'gallery', 'history', 'highlights', 'entry_rules', 'ticket_guide', 'accessibility', 'location', 'faq'],
  sport: ['about', 'visit_facts', 'gallery', 'upcoming_events', 'spaces', 'equipment', 'entry_rules', 'ticket_guide', 'accessibility', 'location', 'faq'],
  venue: ['about', 'visit_facts', 'gallery', 'spaces', 'entry_rules', 'services', 'accessibility', 'location', 'faq'],
  event: ['about', 'highlights', 'program', 'participants', 'ticket_notes', 'entry_rules', 'accessibility', 'location', 'faq'],
};

const EVENT_VARIANTS = new Set(['event']);
const STATUS = new Set(['DRAFT', 'REVIEW', 'READY']);
const CONVERSION_MODES = new Set(['none', 'admission', 'events', 'departures', 'reservation', 'tours', 'hybrid']);
const CTA_ACTIONS = new Set(['none', 'buy_ticket', 'view_events', 'view_departures', 'book_table', 'view_tours']);
const MAX_DOCUMENT_BYTES = 200_000;

export function emptyPdpContent(variant) {
  return { summary: '', conversion: { mode: 'none', primaryAction: 'none', label: '', targetEventId: '', externalUrl: '' }, gallery: [], facts: [], sections: PDP_VARIANTS[variant].map((kind) => ({
    id: kind,
    kind,
    title: '',
    body: '',
    items: [],
  })), sources: [] };
}

function text(value, limit = 10000) {
  if (typeof value !== 'string' || value.length > limit) throw new Error(`PDP text must be a string of at most ${limit} characters`);
  return value.trim();
}

function optionalText(value, limit = 10000) {
  return value == null ? '' : text(value, limit);
}

function list(value, limit, label) {
  if (!Array.isArray(value) || value.length > limit) throw new Error(`Invalid PDP ${label}`);
  return value;
}

export function normalizePdpDocument(entity, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('PDP document must be an object');
  const variant = text(payload.variant, 40);
  if (!(variant in PDP_VARIANTS) || (entity === 'events') !== EVENT_VARIANTS.has(variant)) throw new Error('Invalid PDP variant for entity');
  const status = text(payload.status || 'DRAFT', 10).toUpperCase();
  if (!STATUS.has(status)) throw new Error('Invalid PDP status');
  const source = payload.content;
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('PDP content must be an object');
  const allowedSections = new Set(PDP_VARIANTS[variant]);
  const ids = new Set();
  const conversion = source.conversion || {};
  const mode = optionalText(conversion.mode || 'none', 30);
  const primaryAction = optionalText(conversion.primaryAction || 'none', 30);
  if (!CONVERSION_MODES.has(mode) || !CTA_ACTIONS.has(primaryAction)) throw new Error('Invalid PDP conversion action');
  if ((mode === 'none') !== (primaryAction === 'none')) throw new Error('PDP conversion mode and action disagree');
  const externalUrl = optionalText(conversion.externalUrl, 2000);
  if (externalUrl && !/^https?:\/\//i.test(externalUrl)) throw new Error('PDP external booking URL must use HTTP or HTTPS');
  const content = {
    summary: optionalText(source.summary, 2000),
    conversion: {
      mode, primaryAction, label: optionalText(conversion.label, 80),
      targetEventId: optionalText(conversion.targetEventId, 120), externalUrl,
    },
    gallery: list(source.gallery || [], 30, 'gallery').map((item) => ({
      url: text(item?.url, 2000), alt: optionalText(item?.alt, 300), caption: optionalText(item?.caption, 500), credit: optionalText(item?.credit, 300),
    })),
    facts: list(source.facts || [], 40, 'facts').map((item) => ({
      label: text(item?.label, 120), value: text(item?.value, 500), sourceUrl: optionalText(item?.sourceUrl, 2000), verifiedAt: optionalText(item?.verifiedAt, 40),
    })),
    sections: list(source.sections || [], 50, 'sections').map((section) => {
      const kind = text(section?.kind, 60);
      const id = text(section?.id, 100);
      if (!allowedSections.has(kind) || ids.has(id)) throw new Error(`Invalid or duplicate PDP section: ${kind}/${id}`);
      ids.add(id);
      return {
        id, kind, title: optionalText(section?.title, 200), body: optionalText(section?.body, 20000),
        items: list(section?.items || [], 100, 'section items').map((item) => ({
          title: text(item?.title, 300), description: optionalText(item?.description, 5000), imageUrl: optionalText(item?.imageUrl, 2000),
          linkUrl: optionalText(item?.linkUrl, 2000), meta: optionalText(item?.meta, 500), sourceUrl: optionalText(item?.sourceUrl, 2000),
          details: list(item?.details || [], 20, 'item details').map((detail) => ({ label: text(detail?.label, 120), value: text(detail?.value, 500) })),
        })),
      };
    }),
    sources: list(source.sources || [], 100, 'sources').map((item) => ({
      title: text(item?.title, 300), url: text(item?.url, 2000), checkedAt: optionalText(item?.checkedAt, 40),
    })),
  };
  if (Buffer.byteLength(JSON.stringify(content), 'utf8') > MAX_DOCUMENT_BYTES) throw new Error('PDP document is too large');
  return { variant, status, content };
}

export async function readPdpDocument(db, entity, id) {
  const column = entity === 'venues' ? 'venueId' : entity === 'events' ? 'eventId' : null;
  if (!column) throw new Error('Invalid PDP entity');
  const result = await db.query(`SELECT id, variant, status, content, version, "updatedAt" FROM "PdpDocument" WHERE "${column}" = $1`, [id]);
  return result.rows[0] || null;
}

export async function readReadyPdpDocument(db, entity, id) {
  const column = entity === 'venues' ? 'venueId' : entity === 'events' ? 'eventId' : null;
  if (!column) throw new Error('Invalid PDP entity');
  try {
    const result = await db.query(
      `SELECT variant, content FROM "PdpDocument" WHERE "${column}" = $1 AND status = 'READY'`,
      [id],
    );
    return result.rows[0] || null;
  } catch (error) {
    // Keep public pages available on deployments where the additive PDP
    // migration has not been applied yet; they simply omit editorial content.
    if (error?.code === '42P01' || error?.cause?.code === '42P01') return null;
    throw error;
  }
}

export async function savePdpDocument(db, entity, id, payload) {
  const column = entity === 'venues' ? 'venueId' : entity === 'events' ? 'eventId' : null;
  if (!column) throw new Error('Invalid PDP entity');
  const normalized = normalizePdpDocument(entity, payload);
  const owner = await db.query(`SELECT id FROM "${entity === 'venues' ? 'Venue' : 'Event'}" WHERE id = $1`, [id]);
  if (!owner.rows.length) return null;
  const result = await db.query(`
    INSERT INTO "PdpDocument" (id, "${column}", variant, status, content, "updatedAt")
    VALUES ($1, $2, $3, $4, $5::jsonb, now())
    ON CONFLICT ("${column}") DO UPDATE SET variant = excluded.variant, status = excluded.status,
      content = excluded.content, version = "PdpDocument".version + 1, "updatedAt" = now()
    RETURNING id, variant, status, content, version, "updatedAt"
  `, [randomUUID(), id, normalized.variant, normalized.status, JSON.stringify(normalized.content)]);
  return result.rows[0];
}

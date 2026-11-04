import { randomUUID } from 'node:crypto';

import { isPlaceType, suggestedPlacePdpVariant } from '@daibilet/contracts/place-pdp';
import { emptyPdpContent, normalizePdpDocument, readPdpDocument } from './pdp-documents.js';

const EDIT_ROLES = new Set(['OWNER', 'ADMIN', 'OPERATOR']);
const PLACE_SUBTYPE = /^[a-z0-9_-]{1,64}$/u;
const MAX_REQUEST_BYTES = 180_000;

export async function buildSupplierPlaceWorkspace(db, siteUserId) {
  const [venues, cities, requests, suppliers] = await Promise.all([
    db.query(`
      SELECT sv."supplierId", supplier.title AS "supplierTitle", su.role AS "supplierRole",
        venue.id AS "venueId", venue.title, venue.slug, venue."placeType", venue."placeSubtype",
        venue.kind, venue.address, venue."shortDescription", venue."description", venue."metroStation",
        venue."wayToFind", venue."parkingInfo", city.title AS city,
        page.variant AS "pdpVariant", page.content AS "pdpContent"
      FROM "SupplierUser" su
      JOIN "Supplier" supplier ON supplier.id = su."supplierId"
      JOIN "SupplierVenue" sv ON sv."supplierId" = su."supplierId" AND sv."isActive" = true
      JOIN "Venue" venue ON venue.id = sv."venueId"
      LEFT JOIN "City" city ON city.id = venue."cityId"
      LEFT JOIN "PdpDocument" page ON page."venueId" = venue.id AND page.status = 'READY'
      WHERE su."siteUserId" = $1 AND su."isActive" = true
      ORDER BY supplier.title, venue.title
    `, [siteUserId]),
    db.query(`SELECT id, slug, title FROM "City" ORDER BY title`),
    db.query(`
      SELECT request.id, request."supplierId", supplier.title AS "supplierTitle",
        request."venueId", venue.title AS "venueTitle", request.type, request.status,
        request.title, request."adminComment", request."submittedAt", request."createdAt"
      FROM "SupplierPlaceRequest" request
      JOIN "SupplierUser" su ON su."supplierId" = request."supplierId"
        AND su."siteUserId" = $1 AND su."isActive" = true
      JOIN "Supplier" supplier ON supplier.id = request."supplierId"
      LEFT JOIN "Venue" venue ON venue.id = request."venueId"
      ORDER BY request."submittedAt" DESC
      LIMIT 100
    `, [siteUserId]),
    db.query(`
      SELECT supplier.id, supplier.title, su.role
      FROM "SupplierUser" su JOIN "Supplier" supplier ON supplier.id = su."supplierId"
      WHERE su."siteUserId" = $1 AND su."isActive" = true
      ORDER BY supplier.title
    `, [siteUserId]),
  ]);

  return {
    venues: venues.rows.map((row) => ({
      ...row,
      editable: EDIT_ROLES.has(String(row.supplierRole || '').toUpperCase()),
      suggestedVariant: row.pdpVariant || suggestedPlacePdpVariant(row.placeType, row.placeSubtype),
      pdpContent: row.pdpContent || null,
    })),
    cities: cities.rows.map((row) => ({ id: row.id, slug: row.slug, title: row.title })),
    suppliers: suppliers.rows.map((row) => ({ id: row.id, title: row.title, role: row.role, canSubmit: EDIT_ROLES.has(String(row.role).toUpperCase()) })),
    requests: requests.rows,
  };
}

export async function submitSupplierPlaceRequest(db, siteUserId, input = {}) {
  const type = normalizeText(input.type, 10).toUpperCase();
  if (type !== 'CREATE' && type !== 'UPDATE') throw new Error('Invalid place request type');
  const supplierId = normalizeText(input.supplierId, 80);
  if (!supplierId) throw new Error('Supplier is required');

  const membership = await db.query(`
    SELECT role FROM "SupplierUser"
    WHERE "supplierId" = $1 AND "siteUserId" = $2 AND "isActive" = true
    LIMIT 1
  `, [supplierId, siteUserId]);
  const role = String(membership.rows[0]?.role || '').toUpperCase();
  if (!membership.rows[0]) throw new Error('Supplier access denied');
  if (!EDIT_ROLES.has(role)) throw new Error('Supplier role cannot submit place requests');

  let venueId = null;
  let title = '';
  let payload;
  let sourceSnapshot = null;

  if (type === 'CREATE') {
    const candidate = normalizePlaceCandidate(input.candidate || {});
    const city = await db.query(`SELECT id, title FROM "City" WHERE id = $1 LIMIT 1`, [candidate.cityId]);
    if (!city.rows[0]) throw new Error('Unknown city');
    title = `Новое место: ${candidate.title}`;
    payload = { candidate: { ...candidate, cityTitle: city.rows[0].title } };
  } else {
    venueId = normalizeText(input.venueId, 80);
    if (!venueId) throw new Error('Venue is required');
    const linked = await db.query(`
      SELECT venue.id, venue.title, venue."placeType", venue."placeSubtype", venue."shortDescription",
        venue."description", venue."metroStation", venue."wayToFind", venue."parkingInfo"
      FROM "SupplierVenue" link
      JOIN "Venue" venue ON venue.id = link."venueId"
      WHERE link."supplierId" = $1 AND link."venueId" = $2 AND link."isActive" = true
      LIMIT 1
    `, [supplierId, venueId]);
    const venue = linked.rows[0];
    if (!venue) throw new Error('Venue access denied');
    const currentPdp = await readPdpDocument(db, 'venues', venueId);
    const variant = currentPdp?.variant || suggestedPlacePdpVariant(venue.placeType, venue.placeSubtype);
    const proposedContent = normalizeSupplierPdp(input.pdpContent, currentPdp, variant);
    const fields = normalizeVenueProposal(input.fields || {});
    if (!Object.keys(fields).length && !proposedContent) throw new Error('No proposed changes');
    title = `Предложение по месту: ${venue.title}`;
    payload = { fields, pdpDocument: proposedContent };
    sourceSnapshot = {
      venue: {
        title: venue.title,
        placeType: venue.placeType,
        placeSubtype: venue.placeSubtype,
        shortDescription: venue.shortDescription,
        description: venue.description,
        metroStation: venue.metroStation,
        wayToFind: venue.wayToFind,
        parkingInfo: venue.parkingInfo,
      },
      pdpDocument: currentPdp ? { variant: currentPdp.variant, status: currentPdp.status, content: currentPdp.content } : null,
    };
  }

  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_REQUEST_BYTES) throw new Error('Place request is too large');
  const id = randomUUID();
  await db.query(`
    INSERT INTO "SupplierPlaceRequest" (
      id, "supplierId", "venueId", "createdBySiteUserId", type, status, title, payload, "sourceSnapshot"
    ) VALUES ($1, $2, $3, $4, $5::"SupplierPlaceRequestType", 'SUBMITTED', $6, $7::jsonb, $8::jsonb)
  `, [id, supplierId, venueId, siteUserId, type, title, JSON.stringify(payload), sourceSnapshot ? JSON.stringify(sourceSnapshot) : null]);
  return { id, type, status: 'SUBMITTED', title, submittedAt: new Date().toISOString() };
}

export async function buildAdminSupplierPlaceRequests(db, status = '') {
  const values = [];
  const where = status ? `WHERE request.status = $1::"SupplierPlaceRequestStatus"` : '';
  if (status) values.push(status);
  const result = await db.query(`
    SELECT request.id, request."supplierId", supplier.title AS "supplierTitle",
      request."venueId", venue.title AS "venueTitle", request.type, request.status,
      request.title, request.payload, request."sourceSnapshot", request."adminComment",
      request."submittedAt", request."reviewedAt", request."appliedAt"
    FROM "SupplierPlaceRequest" request
    JOIN "Supplier" supplier ON supplier.id = request."supplierId"
    LEFT JOIN "Venue" venue ON venue.id = request."venueId"
    ${where}
    ORDER BY request."submittedAt" DESC
    LIMIT 200
  `, values);
  return result.rows;
}

export async function getAdminSupplierPlaceRequest(db, id) {
  const result = await db.query(`
    SELECT request.*, supplier.title AS "supplierTitle", venue.title AS "venueTitle", venue.slug AS "venueSlug"
    FROM "SupplierPlaceRequest" request
    JOIN "Supplier" supplier ON supplier.id = request."supplierId"
    LEFT JOIN "Venue" venue ON venue.id = request."venueId"
    WHERE request.id = $1 LIMIT 1
  `, [id]);
  return result.rows[0] || null;
}

export async function reviewSupplierPlaceRequest(db, id, input = {}) {
  const action = normalizeText(input.action, 32).toUpperCase();
  const comment = normalizeText(input.comment, 2000) || null;
  const statusByAction = { NEEDS_INFO: 'NEEDS_INFO', REJECT: 'REJECTED', APPROVE: 'APPROVED' };
  const status = statusByAction[action];
  if (!status) throw new Error('Invalid place request action');
  const current = await getAdminSupplierPlaceRequest(db, id);
  if (!current) return null;
  if (!['SUBMITTED', 'NEEDS_INFO'].includes(current.status)) throw new Error('Place request is no longer reviewable');
  const result = await db.query(`
    UPDATE "SupplierPlaceRequest"
    SET status = $2::"SupplierPlaceRequestStatus", "adminComment" = $3,
        "reviewedAt" = now(), "updatedAt" = now()
    WHERE id = $1 AND status IN ('SUBMITTED', 'NEEDS_INFO')
    RETURNING id, status, "adminComment", "reviewedAt"
  `, [id, status, comment]);
  return result.rows[0] || null;
}

function normalizeSupplierPdp(input, currentDocument, variant) {
  if (input == null) return null;
  const base = currentDocument?.content || emptyPdpContent(variant);
  const proposed = {
    ...base,
    ...input,
    conversion: base.conversion,
    sections: Array.isArray(input.sections) ? input.sections : base.sections,
    gallery: Array.isArray(input.gallery) ? input.gallery : base.gallery,
    facts: Array.isArray(input.facts) ? input.facts : base.facts,
    sources: Array.isArray(input.sources) ? input.sources : base.sources,
  };
  return normalizePdpDocument('venues', { variant, status: 'DRAFT', content: proposed });
}

function normalizePlaceCandidate(input) {
  const title = normalizeText(input.title, 200);
  const cityId = normalizeText(input.cityId, 80);
  const address = normalizeText(input.address, 500);
  const placeType = normalizeText(input.placeType, 40).toUpperCase();
  const placeSubtype = normalizeText(input.placeSubtype, 64).toLowerCase() || null;
  const description = normalizeText(input.description, 8000) || null;
  const websiteUrl = normalizeHttpUrl(input.websiteUrl, 1000);
  const sourceUrl = normalizeHttpUrl(input.sourceUrl, 1000);
  const imageUrl = normalizeHttpUrl(input.imageUrl, 1000);
  const imageRights = normalizeText(input.imageRights, 500) || null;
  if (!title || !cityId || !address || !isPlaceType(placeType) || placeType === 'OTHER') throw new Error('Required place candidate fields are missing');
  if (placeSubtype && !PLACE_SUBTYPE.test(placeSubtype)) throw new Error('Invalid placeSubtype');
  if (input.latitude != null && input.latitude !== '' && (!Number.isFinite(Number(input.latitude)) || Number(input.latitude) < -90 || Number(input.latitude) > 90)) throw new Error('Invalid latitude');
  if (input.longitude != null && input.longitude !== '' && (!Number.isFinite(Number(input.longitude)) || Number(input.longitude) < -180 || Number(input.longitude) > 180)) throw new Error('Invalid longitude');
  if (imageUrl && (!imageRights || !sourceUrl)) throw new Error('Image source and rights are required');
  return {
    title, cityId, address, placeType, placeSubtype, description, websiteUrl, sourceUrl,
    imageUrl, imageRights,
    latitude: input.latitude == null || input.latitude === '' ? null : Number(input.latitude),
    longitude: input.longitude == null || input.longitude === '' ? null : Number(input.longitude),
  };
}

function normalizeVenueProposal(input) {
  const output = {};
  for (const key of ['shortDescription', 'description', 'metroStation', 'wayToFind', 'parkingInfo']) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    output[key] = normalizeText(input[key], key === 'description' || key === 'wayToFind' || key === 'parkingInfo' ? 8000 : 1000) || null;
  }
  return output;
}

function normalizeText(value, limit) {
  const text = String(value ?? '').trim();
  if (text.length > limit) throw new Error(`Text exceeds ${limit} characters`);
  return text;
}

function normalizeHttpUrl(value, limit) {
  const text = normalizeText(value, limit);
  if (!text) return null;
  let parsed;
  try { parsed = new URL(text); } catch { throw new Error('Invalid URL'); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('URL must use HTTP or HTTPS');
  return parsed.toString();
}

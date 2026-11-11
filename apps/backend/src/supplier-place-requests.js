import { randomUUID } from 'node:crypto';

import { isPlaceType, suggestedPlacePdpVariant } from '@daibilet/contracts/place-pdp';
import { emptyPdpContent, normalizePdpDocument, readPdpDocument, savePdpDocument } from './pdp-documents.js';
import { createAdminVenue } from './dto.js';

const EDIT_ROLES = new Set(['OWNER', 'ADMIN', 'OPERATOR']);
const SUBMITTABLE_SUPPLIER_STATUSES = new Set(['DRAFT', 'REVIEW', 'ACTIVE']);
const PLACE_SUBTYPE = /^[a-z0-9_-]{1,64}$/u;
const MAX_REQUEST_BYTES = 180_000;

export async function buildSupplierPlaceWorkspace(db, siteUserId) {
  const [venues, cities, requests, suppliers] = await Promise.all([
    db.query(`
      SELECT sv."supplierId", supplier.title AS "supplierTitle", supplier.status AS "supplierStatus", su.role AS "supplierRole",
        venue.id AS "venueId", venue.title, venue.slug, venue."placeType", venue."placeSubtype",
        venue.kind, venue.address, venue."shortDescription", venue."description", venue."metroStation",
        venue."wayToFind", venue."parkingInfo", city.title AS city,
        page.variant AS "pdpVariant", page.status AS "pdpStatus", page.content AS "pdpContent"
      FROM "SupplierUser" su
      JOIN "Supplier" supplier ON supplier.id = su."supplierId"
      JOIN "SupplierVenue" sv ON sv."supplierId" = su."supplierId" AND sv."isActive" = true
      JOIN "Venue" venue ON venue.id = sv."venueId"
      LEFT JOIN "City" city ON city.id = venue."cityId"
      LEFT JOIN "PdpDocument" page ON page."venueId" = venue.id
      WHERE su."siteUserId" = $1 AND su."isActive" = true
      ORDER BY supplier.title, venue.title
    `, [siteUserId]),
    db.query(`SELECT id, slug, title FROM "City" ORDER BY title`),
    db.query(`
      SELECT request.id, request."supplierId", supplier.title AS "supplierTitle",
        request."venueId", venue.title AS "venueTitle", request.type, request.status,
        request.title, request."adminComment", request."submittedAt", request."createdAt",
        EXISTS (SELECT 1 FROM "AdminAuditLog" rollback_log
          WHERE rollback_log.action = 'SUPPLIER_PLACE_REQUEST_ROLLED_BACK'
            AND rollback_log.detail->>'requestId' = request.id) AS "rolledBack"
      FROM "SupplierPlaceRequest" request
      JOIN "SupplierUser" su ON su."supplierId" = request."supplierId"
        AND su."siteUserId" = $1 AND su."isActive" = true
      JOIN "Supplier" supplier ON supplier.id = request."supplierId"
      LEFT JOIN "Venue" venue ON venue.id = request."venueId"
      ORDER BY request."submittedAt" DESC
      LIMIT 100
    `, [siteUserId]),
    db.query(`
      SELECT supplier.id, supplier.title, supplier.status, su.role
      FROM "SupplierUser" su JOIN "Supplier" supplier ON supplier.id = su."supplierId"
      WHERE su."siteUserId" = $1 AND su."isActive" = true
      ORDER BY supplier.title
    `, [siteUserId]),
  ]);

  return {
    venues: venues.rows.map((row) => ({
      ...row,
      editable: SUBMITTABLE_SUPPLIER_STATUSES.has(String(row.supplierStatus || '').toUpperCase())
        && EDIT_ROLES.has(String(row.supplierRole || '').toUpperCase()),
      suggestedVariant: row.pdpVariant || suggestedPlacePdpVariant(row.placeType, row.placeSubtype),
      pdpStatus: row.pdpStatus || null,
      pdpContent: row.pdpContent || null,
    })),
    cities: cities.rows.map((row) => ({ id: row.id, slug: row.slug, title: row.title })),
    suppliers: suppliers.rows.map((row) => ({
      id: row.id,
      title: row.title,
      role: row.role,
      status: row.status,
      canSubmit: SUBMITTABLE_SUPPLIER_STATUSES.has(String(row.status || '').toUpperCase())
        && EDIT_ROLES.has(String(row.role).toUpperCase()),
    })),
    requests: requests.rows,
  };
}

export async function submitSupplierPlaceRequest(db, siteUserId, input = {}) {
  const type = normalizeText(input.type, 10).toUpperCase();
  if (type !== 'CREATE' && type !== 'UPDATE') throw new Error('Invalid place request type');
  const supplierId = normalizeText(input.supplierId, 80);
  if (!supplierId) throw new Error('Supplier is required');

  const membership = await db.query(`
    SELECT membership.role, supplier.status AS "supplierStatus"
    FROM "SupplierUser" membership
    JOIN "Supplier" supplier ON supplier.id = membership."supplierId"
    WHERE membership."supplierId" = $1 AND membership."siteUserId" = $2 AND membership."isActive" = true
    LIMIT 1
  `, [supplierId, siteUserId]);
  const role = String(membership.rows[0]?.role || '').toUpperCase();
  if (!membership.rows[0]) throw new Error('Supplier access denied');
  if (!SUBMITTABLE_SUPPLIER_STATUSES.has(String(membership.rows[0].supplierStatus || '').toUpperCase())) {
    throw new Error('Supplier account is paused or archived and cannot submit place requests');
  }
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
        venue."description", venue."metroStation", venue."wayToFind", venue."parkingInfo",
        venue.address, venue.latitude, venue.longitude, venue."websiteUrl", venue.phone, venue."openingHours",
        venue."descriptionOverridden"
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
        address: venue.address,
        latitude: venue.latitude,
        longitude: venue.longitude,
        placeType: venue.placeType,
        placeSubtype: venue.placeSubtype,
        websiteUrl: venue.websiteUrl,
        phone: venue.phone,
        openingHours: venue.openingHours,
        shortDescription: venue.shortDescription,
        description: venue.description,
        descriptionOverridden: venue.descriptionOverridden,
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
      request."submittedAt", request."reviewedAt", request."appliedAt",
      EXISTS (SELECT 1 FROM "AdminAuditLog" rollback_log
        WHERE rollback_log.action = 'SUPPLIER_PLACE_REQUEST_ROLLED_BACK'
          AND rollback_log.detail->>'requestId' = request.id) AS "rolledBack"
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

/** Apply an approved supplier proposal as an editor-reviewed PDP revision. */
export async function applySupplierPlaceRequest(db, id, input = {}) {
  const comment = normalizeText(input.comment, 2000) || null;
  return db.transaction(async (tx) => {
    const locked = await tx.query(`SELECT * FROM "SupplierPlaceRequest" WHERE id = $1 FOR UPDATE`, [id]);
    const request = locked.rows[0];
    if (!request) return null;
    if (request.status !== 'APPROVED') throw new Error('Only approved place requests can be applied');
    const payload = parseJson(request.payload) || {};

    if (request.type === 'CREATE') {
      const candidate = normalizePlaceCandidate(payload.candidate || {});
      const created = await createAdminVenue(tx, {
        title: candidate.title,
        cityId: candidate.cityId,
        address: candidate.address,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        placeType: candidate.placeType,
        placeSubtype: candidate.placeSubtype,
        description: candidate.description,
        websiteUrl: candidate.websiteUrl,
        phone: candidate.phone,
        openingHours: candidate.openingHours,
        heroImageUrl: candidate.imageUrl,
      });
      await tx.query(`
        INSERT INTO "SupplierVenue" (id, "supplierId", "venueId", "isPrimary", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, false, true, now(), now())
        ON CONFLICT ("supplierId", "venueId") DO UPDATE
          SET "isActive" = true, "updatedAt" = now()
      `, [randomUUID(), request.supplierId, created.id]);
      await tx.query(`
        INSERT INTO "AdminAuditLog" (id, action, "targetType", "targetId", outcome, detail, "createdAt")
        VALUES ($1, 'SUPPLIER_VENUE_LINKED', 'SUPPLIER', $2, 'SUCCESS', $3::jsonb, now())
      `, [randomUUID(), request.supplierId, JSON.stringify({ venueId: created.id, source: 'PLACE_REQUEST_CREATE', requestId: id })]);
      const createdVenue = await tx.query(`SELECT "updatedAt" FROM "Venue" WHERE id = $1`, [created.id]);
      const appliedAt = new Date();
      const update = await tx.query(`
        UPDATE "SupplierPlaceRequest"
        SET status = 'APPLIED', "venueId" = $2, "adminComment" = COALESCE($3, "adminComment"),
            "reviewedAt" = COALESCE("reviewedAt", now()), "appliedAt" = $4, "updatedAt" = now()
        WHERE id = $1 AND status = 'APPROVED'
        RETURNING id, status, "appliedAt"
      `, [id, created.id, comment, appliedAt]);
      await tx.query(`
        INSERT INTO "AdminAuditLog" (id, action, "targetType", "targetId", outcome, detail, "createdAt")
        VALUES ($1, 'SUPPLIER_PLACE_CANDIDATE_CREATED', 'Venue', $2, 'SUCCESS', $3::jsonb, now())
      `, [randomUUID(), created.id, JSON.stringify({ requestId: id, supplierId: request.supplierId, candidate,
        after: { updatedAt: createdVenue.rows[0]?.updatedAt ? new Date(createdVenue.rows[0].updatedAt).toISOString() : null,
          pageStatus: created.pageStatus, isIndexable: created.isIndexable } })]);
      return { ...update.rows[0], venueId: created.id, venueSlug: created.slug, pageStatus: created.pageStatus, isIndexable: created.isIndexable };
    }
    if (request.type !== 'UPDATE' || !request.venueId) throw new Error('Unsupported place request type');

    const venueResult = await tx.query(`
      SELECT title, "placeType", "placeSubtype", "shortDescription", description,
        address, latitude, longitude, "websiteUrl", phone, "openingHours",
        "metroStation", "wayToFind", "parkingInfo", "descriptionOverridden"
      FROM "Venue" WHERE id = $1 FOR UPDATE
    `, [request.venueId]);
    const venue = venueResult.rows[0];
    if (!venue) throw new Error('Venue no longer exists');

    const sourceSnapshot = parseJson(request.sourceSnapshot) || {};
    const sourceVenue = sourceSnapshot.venue || {};
    const currentVenue = {
      title: venue.title,
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
      placeType: venue.placeType,
      placeSubtype: venue.placeSubtype,
      websiteUrl: venue.websiteUrl,
      phone: venue.phone,
      openingHours: venue.openingHours,
      shortDescription: venue.shortDescription,
      description: venue.description,
      descriptionOverridden: venue.descriptionOverridden,
      metroStation: venue.metroStation,
      wayToFind: venue.wayToFind,
      parkingInfo: venue.parkingInfo,
    };
    const snapshotKeys = Object.keys(sourceVenue);
    const comparableVenue = Object.fromEntries(snapshotKeys.map((key) => [key, currentVenue[key]]));
    if (!sameJson(sourceVenue, comparableVenue)) throw new Error('Place changed since this proposal was submitted; refresh the proposal before applying');

    await tx.query(`SELECT id FROM "PdpDocument" WHERE "venueId" = $1 FOR UPDATE`, [request.venueId]);
    const currentPdp = await readPdpDocument(tx, 'venues', request.venueId);
    if (!sameJson(sourceSnapshot.pdpDocument || null, currentPdp ? {
      variant: currentPdp.variant, status: currentPdp.status, content: currentPdp.content,
    } : null)) throw new Error('PDP changed since this proposal was submitted; refresh the proposal before applying');

    const fields = normalizeVenueProposal(payload.fields || {});
    if (Object.keys(fields).length) {
      const assignments = Object.keys(fields).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
      const descriptionOverride = Object.prototype.hasOwnProperty.call(fields, 'description') ? ', "descriptionOverridden" = true' : '';
      await tx.query(`UPDATE "Venue" SET ${assignments}${descriptionOverride}, "updatedAt" = now() WHERE id = $1`, [request.venueId, ...Object.values(fields)]);
    }

    let savedPdp = null;
    if (payload.pdpDocument) {
      const status = currentPdp?.status || 'DRAFT';
      savedPdp = await savePdpDocument(tx, 'venues', request.venueId, {
        variant: payload.pdpDocument.variant,
        status,
        content: payload.pdpDocument.content,
      });
    }

    const afterVenueResult = await tx.query(`SELECT * FROM "Venue" WHERE id = $1`, [request.venueId]);
    const afterVenue = afterVenueResult.rows[0];
    const after = {
      venueFields: Object.fromEntries(Object.keys(fields).map((key) => [key, afterVenue[key]])),
      ...(Object.prototype.hasOwnProperty.call(fields, 'description') ? { descriptionOverridden: afterVenue.descriptionOverridden } : {}),
      pdpDocument: savedPdp ? { variant: savedPdp.variant, status: savedPdp.status, content: savedPdp.content, version: savedPdp.version } : null,
    };

    const appliedAt = new Date();
    const update = await tx.query(`
      UPDATE "SupplierPlaceRequest"
      SET status = 'APPLIED', "adminComment" = COALESCE($2, "adminComment"),
          "reviewedAt" = COALESCE("reviewedAt", now()), "appliedAt" = $3, "updatedAt" = now()
      WHERE id = $1 AND status = 'APPROVED'
      RETURNING id, status, "appliedAt"
    `, [id, comment, appliedAt]);
    await tx.query(`
      INSERT INTO "AdminAuditLog" (id, action, "targetType", "targetId", outcome, detail, "createdAt")
      VALUES ($1, 'SUPPLIER_PLACE_REQUEST_APPLIED', 'Venue', $2, 'SUCCESS', $3::jsonb, now())
    `, [randomUUID(), request.venueId, JSON.stringify({ requestId: id, supplierId: request.supplierId,
      fields, pdpVersion: savedPdp?.version ?? currentPdp?.version ?? null,
      previous: sourceSnapshot, proposed: payload, after })]);

    return { ...update.rows[0], venueId: request.venueId, pdpVersion: savedPdp?.version ?? currentPdp?.version ?? null };
  });
}

/** Roll back only the fields still matching the applied revision; preserve later edits. */
export async function rollbackSupplierPlaceRequest(db, id, input = {}) {
  const comment = normalizeText(input.comment, 2000) || null;
  return db.transaction(async (tx) => {
    const locked = await tx.query(`SELECT * FROM "SupplierPlaceRequest" WHERE id = $1 FOR UPDATE`, [id]);
    const request = locked.rows[0];
    if (!request) return null;
    if (request.status !== 'APPLIED') throw new Error('Only applied place requests can be rolled back');

    const priorRollback = await tx.query(`SELECT id FROM "AdminAuditLog"
      WHERE action = 'SUPPLIER_PLACE_REQUEST_ROLLED_BACK' AND detail->>'requestId' = $1 LIMIT 1`, [id]);
    if (priorRollback.rows[0]) throw new Error('Place request has already been rolled back');

    const action = request.type === 'CREATE' ? 'SUPPLIER_PLACE_CANDIDATE_CREATED' : 'SUPPLIER_PLACE_REQUEST_APPLIED';
    const auditResult = await tx.query(`SELECT detail FROM "AdminAuditLog"
      WHERE action = $1 AND "targetId" = $2 AND detail->>'requestId' = $3
      ORDER BY "createdAt" DESC LIMIT 1 FOR UPDATE`, [action, request.venueId, id]);
    const audit = parseJson(auditResult.rows[0]?.detail);
    if (!audit || !request.venueId) throw new Error('Applied revision audit record is missing');

    const venueResult = await tx.query(`SELECT * FROM "Venue" WHERE id = $1 FOR UPDATE`, [request.venueId]);
    const venue = venueResult.rows[0];
    if (!venue) throw new Error('Venue no longer exists');

    if (request.type === 'CREATE') {
      if (!audit.after?.updatedAt || new Date(audit.after.updatedAt).getTime() !== new Date(venue.updatedAt).getTime()
        || venue.pageStatus !== 'CANDIDATE' || venue.isIndexable !== false) {
        throw new Error('Candidate changed after creation; rollback stopped to preserve later edits');
      }
      await tx.query(`UPDATE "Venue" SET "pageStatus" = 'HIDDEN', "isIndexable" = false, "updatedAt" = now() WHERE id = $1`, [request.venueId]);
    } else {
      const after = audit.after || {};
      const fieldKeys = Object.keys(after.venueFields || {});
      for (const key of fieldKeys) {
        if (!sameJson(venue[key], after.venueFields[key])) throw new Error(`Place field ${key} changed after apply; rollback stopped`);
      }
      if (Object.prototype.hasOwnProperty.call(after, 'descriptionOverridden')
        && venue.descriptionOverridden !== after.descriptionOverridden) {
        throw new Error('Description ownership changed after apply; rollback stopped');
      }

      const previous = audit.previous || {};
      const sourceVenue = previous.venue || {};
      if (fieldKeys.length) {
        const assignments = fieldKeys.map((key, index) => `"${key}" = $${index + 2}`).join(', ');
        const values = fieldKeys.map((key) => sourceVenue[key]);
        const overrideSql = fieldKeys.includes('description') ? `, "descriptionOverridden" = $${fieldKeys.length + 2}` : '';
        if (fieldKeys.includes('description')) values.push(sourceVenue.descriptionOverridden ?? false);
        await tx.query(`UPDATE "Venue" SET ${assignments}${overrideSql}, "updatedAt" = now() WHERE id = $1`, [request.venueId, ...values]);
      }

      if (after.pdpDocument) {
        await tx.query(`SELECT id FROM "PdpDocument" WHERE "venueId" = $1 FOR UPDATE`, [request.venueId]);
        const currentPdp = await readPdpDocument(tx, 'venues', request.venueId);
        if (!currentPdp || currentPdp.version !== after.pdpDocument.version
          || !sameJson(currentPdp.content, after.pdpDocument.content)) {
          throw new Error('PDP changed after apply; rollback stopped');
        }
        if (previous.pdpDocument) {
          await savePdpDocument(tx, 'venues', request.venueId, {
            variant: previous.pdpDocument.variant,
            status: previous.pdpDocument.status,
            content: previous.pdpDocument.content,
          });
        } else {
          await tx.query(`DELETE FROM "PdpDocument" WHERE "venueId" = $1`, [request.venueId]);
        }
      }
    }

    await tx.query(`INSERT INTO "AdminAuditLog" (id, action, "targetType", "targetId", outcome, detail, "createdAt")
      VALUES ($1, 'SUPPLIER_PLACE_REQUEST_ROLLED_BACK', 'Venue', $2, 'SUCCESS', $3::jsonb, now())`,
    [randomUUID(), request.venueId, JSON.stringify({ requestId: id, supplierId: request.supplierId, comment, type: request.type })]);
    return { id, status: request.status, venueId: request.venueId, rolledBack: true };
  });
}

function parseJson(value) {
  if (typeof value === 'string') { try { return JSON.parse(value); } catch { return null; } }
  return value;
}

function sameJson(left, right) {
  return stableJson(left) === stableJson(right);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeSupplierPdp(input, currentDocument, variant) {
  if (input == null) return null;
  const base = currentDocument?.content || emptyPdpContent(variant);
  const baseSections = Array.isArray(base.sections) ? base.sections : [];
  const sectionById = new Map(baseSections.map((section) => [String(section.id || section.kind), section]));
  const editedIds = new Set();
  const editedSections = new Map((Array.isArray(input.sections) ? input.sections : []).map((edited) => {
    const id = normalizeText(edited?.id || edited?.kind, 100);
    const original = sectionById.get(id);
    if (!original || editedIds.has(id)) throw new Error(`Unknown or duplicate PDP section: ${id}`);
    editedIds.add(id);
    return [id, edited];
  }));
  const sections = baseSections.map((section) => {
    const edited = editedSections.get(String(section.id || section.kind));
    return edited ? { ...section, title: edited.title, body: edited.body } : section;
  });
  const proposed = {
    ...base,
    summary: input.summary,
    conversion: base.conversion,
    sections,
    gallery: base.gallery,
    facts: base.facts,
    sources: base.sources,
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
  const phone = normalizeText(input.phone, 100) || null;
  const openingHours = normalizeText(input.openingHours, 2000) || null;
  const websiteUrl = normalizeHttpUrl(input.websiteUrl, 1000);
  const sourceUrl = normalizeHttpUrl(input.sourceUrl, 1000);
  const imageUrl = normalizeHttpUrl(input.imageUrl, 1000);
  const imageRights = normalizeText(input.imageRights, 500) || null;
  if (!title || !cityId || !address || !isPlaceType(placeType)) throw new Error('Required place candidate fields are missing');
  if (placeSubtype && !PLACE_SUBTYPE.test(placeSubtype)) throw new Error('Invalid placeSubtype');
  if (input.latitude != null && input.latitude !== '' && (!Number.isFinite(Number(input.latitude)) || Number(input.latitude) < -90 || Number(input.latitude) > 90)) throw new Error('Invalid latitude');
  if (input.longitude != null && input.longitude !== '' && (!Number.isFinite(Number(input.longitude)) || Number(input.longitude) < -180 || Number(input.longitude) > 180)) throw new Error('Invalid longitude');
  if (imageUrl && (!imageRights || !sourceUrl)) throw new Error('Image source and rights are required');
  return {
    title, cityId, address, placeType, placeSubtype, description, websiteUrl, phone, openingHours, sourceUrl,
    imageUrl, imageRights,
    latitude: input.latitude == null || input.latitude === '' ? null : Number(input.latitude),
    longitude: input.longitude == null || input.longitude === '' ? null : Number(input.longitude),
  };
}

function normalizeVenueProposal(input) {
  const output = {};
  for (const key of ['title', 'address', 'websiteUrl', 'phone', 'openingHours', 'shortDescription', 'description', 'metroStation', 'wayToFind', 'parkingInfo']) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    if (key === 'websiteUrl') {
      output[key] = normalizeHttpUrl(input[key], 1000);
      continue;
    }
    const limit = key === 'description' || key === 'wayToFind' ? 8000 : key === 'openingHours' ? 2000 : key === 'address' ? 500 : key === 'title' ? 200 : 1000;
    output[key] = normalizeText(input[key], limit) || null;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'placeType')) {
    const placeType = normalizeText(input.placeType, 40).toUpperCase();
    if (!isPlaceType(placeType)) throw new Error('Invalid proposed placeType');
    output.placeType = placeType;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'placeSubtype')) {
    const placeSubtype = normalizeText(input.placeSubtype, 64).toLowerCase() || null;
    if (placeSubtype && !PLACE_SUBTYPE.test(placeSubtype)) throw new Error('Invalid placeSubtype');
    output.placeSubtype = placeSubtype;
  }
  for (const key of ['latitude', 'longitude']) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    const value = input[key];
    if (value == null || value === '') { output[key] = null; continue; }
    const number = Number(value);
    const valid = Number.isFinite(number) && (key === 'latitude' ? number >= -90 && number <= 90 : number >= -180 && number <= 180);
    if (!valid) throw new Error(`Invalid ${key}`);
    output[key] = number;
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

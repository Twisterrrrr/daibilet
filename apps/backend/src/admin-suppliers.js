import { randomUUID } from 'node:crypto';

const ROLES = new Set(['OWNER', 'ADMIN', 'OPERATOR', 'ACCOUNTANT', 'VIEWER']);
const STATUSES = new Set(['DRAFT', 'REVIEW', 'ACTIVE', 'PAUSED', 'ARCHIVED']);
const id = (prefix) => `${prefix}_${randomUUID().replaceAll('-', '')}`;

function requiredText(value, name, limit = 160) {
  const text = String(value || '').trim();
  if (!text || text.length > limit) throw new Error(`${name} is required`);
  return text;
}

function normalizeEmail(value) {
  const email = requiredText(value, 'Email', 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) throw new Error('Invalid email');
  return email;
}

function normalizeSlug(value) {
  const slug = requiredText(value, 'Slug', 80).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/u.test(slug)) throw new Error('Invalid supplier slug');
  return slug;
}

export async function listAdminSuppliers(db, search = '') {
  const term = String(search || '').trim().slice(0, 120);
  const result = await db.query(`
    SELECT supplier.id, supplier.slug, supplier.title, supplier.status, supplier.email,
      supplier.phone, supplier."websiteUrl" AS "websiteUrl", supplier."createdAt" AS "createdAt",
      COALESCE(users.items, '[]'::jsonb) AS users,
      COALESCE(venues.items, '[]'::jsonb) AS venues
    FROM "Supplier" supplier
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'siteUserId', siteUser.id, 'email', siteUser.email, 'name', siteUser.name,
        'role', membership.role, 'isActive', membership."isActive"
      ) ORDER BY siteUser.email) AS items
      FROM "SupplierUser" membership JOIN "SiteUser" siteUser ON siteUser.id = membership."siteUserId"
      WHERE membership."supplierId" = supplier.id
    ) users ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'venueId', venue.id, 'title', venue.title, 'publicSlug', venue."publicSlug",
        'isActive', link."isActive"
      ) ORDER BY venue.title) AS items
      FROM "SupplierVenue" link JOIN "Venue" venue ON venue.id = link."venueId"
      WHERE link."supplierId" = supplier.id
    ) venues ON true
    WHERE $1 = '' OR supplier.title ILIKE '%' || $1 || '%'
      OR supplier.slug ILIKE '%' || $1 || '%' OR coalesce(supplier.email, '') ILIKE '%' || $1 || '%'
      OR EXISTS (
        SELECT 1 FROM "SupplierUser" m JOIN "SiteUser" u ON u.id = m."siteUserId"
        WHERE m."supplierId" = supplier.id AND u.email ILIKE '%' || $1 || '%'
      )
    ORDER BY supplier.title, supplier.id
    LIMIT 200
  `, [term]);
  return result.rows;
}

export async function createAdminSupplier(db, input = {}) {
  const title = requiredText(input.title, 'Title', 240);
  const slug = normalizeSlug(input.slug);
  const email = input.email ? normalizeEmail(input.email) : null;
  const phone = input.phone ? requiredText(input.phone, 'Phone', 80) : null;
  const websiteUrl = input.websiteUrl ? requiredText(input.websiteUrl, 'Website URL', 2000) : null;
  if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) throw new Error('Website URL must use HTTP or HTTPS');
  const supplierId = id('sup');

  return db.transaction(async (tx) => {
    const inserted = await tx.query(`
      INSERT INTO "Supplier" (id, slug, title, email, phone, "websiteUrl", status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT'::"SupplierStatus", now(), now())
      RETURNING id, slug, title, email, phone, "websiteUrl", status, "createdAt"
    `, [supplierId, slug, title, email, phone, websiteUrl]);
    await tx.query(`
      INSERT INTO "AdminAuditLog" (id, action, "targetType", "targetId", outcome, detail, "createdAt")
      VALUES ($1, 'SUPPLIER_CREATED', 'SUPPLIER', $2, 'SUCCESS', $3::jsonb, now())
    `, [id('audit'), supplierId, JSON.stringify({ slug, title, status: 'DRAFT' })]);
    return inserted.rows[0];
  });
}

export async function addAdminSupplierUser(db, supplierIdInput, input = {}) {
  const supplierId = requiredText(supplierIdInput, 'Supplier ID', 100);
  const email = normalizeEmail(input.email);
  const role = String(input.role || 'OWNER').trim().toUpperCase();
  if (!ROLES.has(role)) throw new Error('Invalid supplier role');

  return db.transaction(async (tx) => {
    const supplier = await tx.query('SELECT id FROM "Supplier" WHERE id = $1 FOR UPDATE', [supplierId]);
    if (!supplier.rows[0]) return null;
    const user = await tx.query('SELECT id, email FROM "SiteUser" WHERE email = $1 AND "isActive" = true LIMIT 1', [email]);
    if (!user.rows[0]) throw new Error('Active site user not found for email');
    const result = await tx.query(`
      INSERT INTO "SupplierUser" (id, "supplierId", "siteUserId", role, "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4::"SupplierRole", true, now(), now())
      ON CONFLICT ("supplierId", "siteUserId") DO UPDATE
        SET role = excluded.role, "isActive" = true, "updatedAt" = now()
      RETURNING id, "supplierId", "siteUserId", role, "isActive"
    `, [id('supuser'), supplierId, user.rows[0].id, role]);
    await tx.query(`
      INSERT INTO "AdminAuditLog" (id, action, "targetType", "targetId", outcome, detail, "createdAt")
      VALUES ($1, 'SUPPLIER_USER_ASSIGNED', 'SUPPLIER', $2, 'SUCCESS', $3::jsonb, now())
    `, [id('audit'), supplierId, JSON.stringify({ siteUserId: user.rows[0].id, email, role })]);
    return { ...result.rows[0], email: user.rows[0].email };
  });
}

export async function setAdminSupplierUser(db, supplierIdInput, siteUserIdInput, input = {}) {
  const supplierId = requiredText(supplierIdInput, 'Supplier ID', 100);
  const siteUserId = requiredText(siteUserIdInput, 'Site user ID', 100);
  const updates = [];
  const values = [supplierId, siteUserId];
  if (input.role != null) {
    const role = String(input.role).trim().toUpperCase();
    if (!ROLES.has(role)) throw new Error('Invalid supplier role');
    values.push(role);
    updates.push(`role = $${values.length}::"SupplierRole"`);
  }
  if (input.isActive != null) {
    if (typeof input.isActive !== 'boolean') throw new Error('isActive must be boolean');
    values.push(input.isActive);
    updates.push(`"isActive" = $${values.length}`);
  }
  if (!updates.length) throw new Error('No supplier membership changes provided');
  updates.push('"updatedAt" = now()');

  return db.transaction(async (tx) => {
    const result = await tx.query(`
      UPDATE "SupplierUser" SET ${updates.join(', ')}
      WHERE "supplierId" = $1 AND "siteUserId" = $2
      RETURNING "supplierId", "siteUserId", role, "isActive"
    `, values);
    if (!result.rows[0]) return null;
    await tx.query(`
      INSERT INTO "AdminAuditLog" (id, action, "targetType", "targetId", outcome, detail, "createdAt")
      VALUES ($1, 'SUPPLIER_USER_UPDATED', 'SUPPLIER', $2, 'SUCCESS', $3::jsonb, now())
    `, [id('audit'), supplierId, JSON.stringify({ siteUserId, role: input.role, isActive: input.isActive })]);
    return result.rows[0];
  });
}

export async function addAdminSupplierVenue(db, supplierIdInput, input = {}) {
  const supplierId = requiredText(supplierIdInput, 'Supplier ID', 100);
  const venueId = requiredText(input.venueId, 'Venue ID', 120);
  return db.transaction(async (tx) => {
    const supplier = await tx.query('SELECT id FROM "Supplier" WHERE id = $1 FOR UPDATE', [supplierId]);
    if (!supplier.rows[0]) return null;
    const venue = await tx.query('SELECT id, title FROM "Venue" WHERE id = $1 LIMIT 1', [venueId]);
    if (!venue.rows[0]) throw new Error('Venue not found');
    const result = await tx.query(`
      INSERT INTO "SupplierVenue" (id, "supplierId", "venueId", "isPrimary", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, true, now(), now())
      ON CONFLICT ("supplierId", "venueId") DO UPDATE
        SET "isPrimary" = excluded."isPrimary", "isActive" = true, "updatedAt" = now()
      RETURNING id, "supplierId", "venueId", "isPrimary", "isActive"
    `, [id('supvenue'), supplierId, venueId, input.isPrimary === true]);
    await tx.query(`
      INSERT INTO "AdminAuditLog" (id, action, "targetType", "targetId", outcome, detail, "createdAt")
      VALUES ($1, 'SUPPLIER_VENUE_LINKED', 'SUPPLIER', $2, 'SUCCESS', $3::jsonb, now())
    `, [id('audit'), supplierId, JSON.stringify({ venueId, venueTitle: venue.rows[0].title, isPrimary: input.isPrimary === true })]);
    return result.rows[0];
  });
}

export async function setAdminSupplierVenue(db, supplierIdInput, venueIdInput, isActive) {
  const supplierId = requiredText(supplierIdInput, 'Supplier ID', 100);
  const venueId = requiredText(venueIdInput, 'Venue ID', 120);
  if (typeof isActive !== 'boolean') throw new Error('isActive must be boolean');
  return db.transaction(async (tx) => {
    const result = await tx.query(`
      UPDATE "SupplierVenue" SET "isActive" = $3, "updatedAt" = now()
      WHERE "supplierId" = $1 AND "venueId" = $2
      RETURNING id, "supplierId", "venueId", "isActive"
    `, [supplierId, venueId, isActive]);
    if (!result.rows[0]) return null;
    await tx.query(`
      INSERT INTO "AdminAuditLog" (id, action, "targetType", "targetId", outcome, detail, "createdAt")
      VALUES ($1, 'SUPPLIER_VENUE_UPDATED', 'SUPPLIER', $2, 'SUCCESS', $3::jsonb, now())
    `, [id('audit'), supplierId, JSON.stringify({ venueId, isActive })]);
    return result.rows[0];
  });
}

export async function setAdminSupplierStatus(db, supplierIdInput, statusInput) {
  const supplierId = requiredText(supplierIdInput, 'Supplier ID', 100);
  const status = String(statusInput || '').trim().toUpperCase();
  if (!STATUSES.has(status)) throw new Error('Invalid supplier status');
  return db.transaction(async (tx) => {
    const result = await tx.query(`
      UPDATE "Supplier" SET status = $2::"SupplierStatus", "updatedAt" = now()
      WHERE id = $1 RETURNING id, slug, title, status
    `, [supplierId, status]);
    if (!result.rows[0]) return null;
    await tx.query(`
      INSERT INTO "AdminAuditLog" (id, action, "targetType", "targetId", outcome, detail, "createdAt")
      VALUES ($1, 'SUPPLIER_STATUS_UPDATED', 'SUPPLIER', $2, 'SUCCESS', $3::jsonb, now())
    `, [id('audit'), supplierId, JSON.stringify({ status })]);
    return result.rows[0];
  });
}

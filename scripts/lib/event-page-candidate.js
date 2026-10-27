const crypto = require("node:crypto");

/**
 * Persist a reviewable public-page identity for an imported event.
 * Page membership is keyed by source identity; provider syncs never overwrite
 * editorial fields or a page's slug once the candidate has been created.
 */
async function ensureImportedEventPageCandidate(client, input) {
  const sourceCode = String(input.sourceCode || "").trim().toUpperCase();
  const eventId = String(input.eventId || "").trim();
  const externalId = String(input.externalId || "").trim();
  if (!sourceCode || !eventId || !externalId) return null;

  const metaExternalId = String(input.metaExternalId || "").trim();
  const cityId = input.cityId ? String(input.cityId) : null;
  const venueId = input.venueId ? String(input.venueId) : null;
  // A provider meta ID groups only records in the same local city/place.
  const identity = metaExternalId
    ? `${sourceCode}|meta|${metaExternalId}|${cityId || ""}|${venueId || ""}`
    : `${sourceCode}|event|${externalId}`;
  const digest = crypto.createHash("sha256").update(identity).digest("hex");
  const pageId = `event_page_${digest.slice(0, 24)}`;
  const seriesId = metaExternalId ? `event_series_${digest.slice(0, 24)}` : null;
  const title = String(input.title || "Событие").trim() || "Событие";
  const pageType = metaExternalId || String(input.kind).toUpperCase() === "RECURRING" ? "SERIES" : "EVENT";
  const baseSlug = String(input.slugBase || "event").trim().replace(/^-+|-+$/g, "") || "event";
  const editorialIssues = ["DESCRIPTION_REVIEW", "SEO_REVIEW", "PRACTICAL_INFO_REVIEW"];
  if (!String(input.imageUrl || "").trim()) editorialIssues.push("IMAGE_MISSING");
  if (!cityId) editorialIssues.push("CITY_MISSING");
  if (!input.categoryId) editorialIssues.push("CATEGORY_MISSING");

  if (seriesId) {
    await client.query(
      `
        insert into "event_series" (id, title, "createdAt", "updatedAt")
        values ($1, $2, now(), now())
        on conflict (id) do nothing
      `,
      [seriesId, title],
    );
  }

  let persistedPage = null;
  for (const slug of [baseSlug, `${baseSlug}-${digest.slice(0, 6)}`, `${baseSlug}-${digest.slice(0, 12)}`]) {
    try {
      const collision = await client.query(
        `
          select 1 from "event_pages" where slug = $1 and id <> $2
          union all
          select 1 from "event_page_slug_aliases" where slug = $1 and "pageId" <> $2
          union all
          select 1 from "Event" where slug = $1 and id <> $3
          limit 1
        `,
        [slug, pageId, eventId],
      );
      if (collision.rows.length) continue;
      const inserted = await client.query(
        `
          insert into "event_pages" (
            id, slug, title, "pageType", status, "editorialStatus", "isIndexable",
            "editorialIssues", "cityId", "venueId", "seriesId", "createdAt", "updatedAt"
          )
          values ($1, $2, $3, $4::"EventPageType", 'CANDIDATE', 'NEEDS_EDITORIAL', true, $5::jsonb, $6, $7, $8, now(), now())
          on conflict do nothing
          returning id, slug
        `,
        [pageId, slug, title, pageType, JSON.stringify(editorialIssues), cityId, venueId, seriesId],
      );
      if (inserted.rows[0]) {
        persistedPage = inserted.rows[0];
        break;
      }
      const existing = await client.query(
        `select id, slug from "event_pages" where id = $1`,
        [pageId],
      );
      if (existing.rows[0]) {
        persistedPage = existing.rows[0];
        break;
      }
    } catch (error) {
      if (error?.code !== "23505") throw error;
    }
  }
  if (!persistedPage) throw new Error(`Unable to reserve event page slug for ${sourceCode}:${externalId}`);

  await client.query(
    `
      insert into "event_page_members" (id, "pageId", "eventId", "matchMethod", "createdAt")
      values ($1, $2, $3, $4::"EventPageMatchMethod", now())
      on conflict ("eventId") do nothing
    `,
    [
      `event_page_member_${crypto.createHash("sha256").update(eventId).digest("hex").slice(0, 24)}`,
      persistedPage.id,
      eventId,
      metaExternalId ? "SOURCE_GROUP_ID" : "SOURCE_RECORD",
    ],
  );

  const membership = await client.query(
    `
      select page.id, page.slug
      from "event_page_members" member
      join "event_pages" page on page.id = member."pageId"
      where member."eventId" = $1
      limit 1
    `,
    [eventId],
  );
  const targetPage = membership.rows[0] || persistedPage;
  if (targetPage.id !== persistedPage.id) {
    await client.query(
      `
        delete from "event_pages" page
        where page.id = $1
          and page.status = 'CANDIDATE'
          and not exists (select 1 from "event_page_members" where "pageId" = page.id)
          and not exists (select 1 from "event_page_slug_aliases" where "pageId" = page.id)
      `,
      [persistedPage.id],
    );
    if (seriesId) {
      await client.query(
        `delete from "event_series" series where series.id = $1 and not exists (select 1 from "event_pages" where "seriesId" = series.id)`,
        [seriesId],
      );
    }
  }

  const sourceRow = await client.query(`select slug from "Event" where id = $1`, [eventId]);
  const sourceSlugs = [...new Set([
    String(sourceRow.rows[0]?.slug || "").trim(),
    String(input.sourceSlug || "").trim(),
  ].filter(Boolean))];
  for (const sourceSlug of sourceSlugs) {
    const canonicalCollision = await client.query(
      `select id from "event_pages" where slug = $1 and id <> $2 limit 1`,
      [sourceSlug, targetPage.id],
    );
    if (canonicalCollision.rows.length) continue;
    await client.query(
      `
        insert into "event_page_slug_aliases" (id, "pageId", slug, reason, "createdAt")
        values ($1, $2, $3, 'Imported URL retained until editorial publication', now())
        on conflict (slug) do nothing
      `,
      [
        `event_page_alias_${crypto.createHash("sha256").update(sourceSlug).digest("hex").slice(0, 24)}`,
        targetPage.id,
        sourceSlug,
      ],
    );
  }

  return targetPage;
}

module.exports = { ensureImportedEventPageCandidate };

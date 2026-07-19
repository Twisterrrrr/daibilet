/**
 * Resolve a buyer-facing public event URL for historical / past dated tickets.
 * Prefer a meta-sibling (or self) with the nearest future session; otherwise keep the stored slug.
 */

function publicEventSlug(value) {
  const letters = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((character) => letters[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * @param {import('pg').Pool | { query: Function }} db
 * @param {string[]} eventIds
 * @returns {Promise<Map<string, { eventId: string, slug: string, eventUrl: string | null }>>}
 */
export async function resolveBuyerFacingEventLinks(db, eventIds) {
  const uniqueIds = [...new Set((eventIds || []).filter(Boolean))];
  const result = new Map();
  if (!uniqueIds.length) return result;

  const rows = await db.query(
    `
      with seed as (
        select unnest($1::text[]) as "eventId"
      ),
      group_members as (
        select distinct seed."eventId" as seed_id, sibling."eventId" as member_id
        from seed
        join "EventSourceLink" requested on requested."eventId" = seed."eventId"
        join "EventSourceLink" sibling
          on sibling."metaExternalId" = requested."metaExternalId"
        where requested."metaExternalId" is not null
          and nullif(trim(requested."metaExternalId"), '') is not null
        union
        select seed."eventId", seed."eventId" from seed
        union
        select distinct seed."eventId" as seed_id, peer."eventId" as member_id
        from seed
        join "EventOverride" requested on requested."eventId" = seed."eventId"
        join "EventOverride" peer on peer."mergeGroupKey" = requested."mergeGroupKey"
        where requested."mergeGroupKey" is not null
          and nullif(trim(requested."mergeGroupKey"), '') is not null
      ),
      ranked as (
        select
          group_members.seed_id,
          event.id as "eventId",
          event.slug,
          session."startsAt",
          row_number() over (
            partition by group_members.seed_id
            order by
              case when session."startsAt" is not null then 0 else 1 end,
              session."startsAt" asc nulls last,
              case when event.id = group_members.seed_id then 0 else 1 end,
              event.id
          ) as rn
        from group_members
        join "Event" event on event.id = group_members.member_id
        left join lateral (
          select s."startsAt"
          from "EventSession" s
          where s."eventId" = event.id
            and (
              s."startsAt" >= now()
              or (s."endsAt" is not null and s."endsAt" >= now())
            )
          order by s."startsAt" asc nulls last
          limit 1
        ) session on true
        where event.status not in ('HIDDEN', 'DRAFT')
      )
      select seed_id, "eventId", slug, "startsAt"
      from ranked
      where rn = 1
    `,
    [uniqueIds],
  );

  for (const row of rows.rows || []) {
    const slug = publicEventSlug(row.slug) || row.slug;
    result.set(row.seed_id, {
      eventId: row.seed_id,
      publicEventId: row.eventId,
      slug,
      eventUrl: slug ? `/events/${slug}` : null,
      hasFutureSession: Boolean(row.startsAt),
    });
  }

  // Fallback: seed events not in group query (no links) — keep their own slug.
  const missing = uniqueIds.filter((id) => !result.has(id));
  if (missing.length) {
    const own = await db.query(
      `
        select id, slug
        from "Event"
        where id = any($1::text[])
          and status not in ('HIDDEN', 'DRAFT')
      `,
      [missing],
    );
    for (const row of own.rows || []) {
      const slug = publicEventSlug(row.slug) || row.slug;
      result.set(row.id, {
        eventId: row.id,
        publicEventId: row.id,
        slug,
        eventUrl: slug ? `/events/${slug}` : null,
        hasFutureSession: false,
      });
    }
  }

  return result;
}

/**
 * @template {{ eventId?: string | null, eventUrl?: string | null, eventSlug?: string | null, tickets?: Array<any> }} T
 * @param {import('pg').Pool | { query: Function }} db
 * @param {T[]} orders
 * @returns {Promise<T[]>}
 */
export async function enrichBuyerOrdersWithEventLinks(db, orders) {
  const eventIds = [];
  for (const order of orders || []) {
    if (order.eventId) eventIds.push(order.eventId);
    for (const ticket of order.tickets || []) {
      if (ticket.eventId) eventIds.push(ticket.eventId);
    }
  }
  const links = await resolveBuyerFacingEventLinks(db, eventIds);
  if (!links.size) return orders;

  return (orders || []).map((order) => {
    const primaryTicket = (order.tickets || []).find((ticket) => ticket.eventId) || (order.tickets || [])[0] || null;
    const seedId = primaryTicket?.eventId || order.eventId || null;
    const primaryLink = seedId ? links.get(seedId) : null;

    const tickets = (order.tickets || []).map((ticket) => {
      const link = ticket.eventId ? links.get(ticket.eventId) : null;
      if (!link?.eventUrl) return ticket;
      return {
        ...ticket,
        // Keep purchased eventId for review verification; only refresh public URL.
        eventUrl: link.eventUrl,
      };
    });

    return {
      ...order,
      eventId: order.eventId || primaryTicket?.eventId || null,
      eventUrl: primaryLink?.eventUrl || order.eventUrl || null,
      tickets,
    };
  });
}

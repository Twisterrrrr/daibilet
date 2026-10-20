// One read model for account identities and guest purchases. This endpoint has
// no personal RBAC yet, so contact fields are always masked on the server.
import { randomUUID } from 'node:crypto';
function maskEmail(value) {
  const [local, domain] = String(value || '').split('@');
  if (!local || !domain) return null;
  return `${local[0]}***@${domain}`;
}

function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `***${digits.slice(-2)}` : null;
}

function maskName(value) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  return words.length ? words.map((word) => `${word[0]}.`).join(' ') : null;
}

export function mapAdminBuyerRow(row) {
  const account = Boolean(row.accountId);
  const email = maskEmail(row.email);
  const phone = maskPhone(row.phone);
  const name = maskName(row.name);
  const orders = Number(row.orders || 0);
  const canceledOrders = Number(row.canceledOrders || 0);
  const needsAttention = Number(row.needsAttention || 0);
  return {
    // This is a row key, not an identity API. Never echo the email-bearing SQL key.
    id: randomUUID(),
    kind: account ? 'account' : 'guest',
    emailVerified: account ? Boolean(row.emailVerified) : null,
    displayName: name || email || phone || `Покупатель ${row.lastOrderNumber || ''}`.trim(),
    name, email, phone, notes: null,
    lookup: row.lastOrderNumber || null,
    orders,
    internalOrders: Number(row.internalOrders || 0),
    externalOrders: Number(row.externalOrders || 0),
    tickets: Number(row.tickets || 0),
    activeOrders: orders - canceledOrders,
    canceledOrders,
    needsAttention,
    amountRub: null,
    lastOrderAt: row.lastOrderAt || null,
    lastOrderNumber: row.lastOrderNumber || null,
    lastOrderStatusLabel: row.lastOrderStatus || null,
    providers: [row.internalOrders > 0 ? 'Дайбилет' : null, row.externalOrders > 0 ? 'Внешний источник' : null].filter(Boolean),
    eventTitles: [],
    orderNumbers: row.lastOrderNumber ? [row.lastOrderNumber] : [],
    hasContact: Boolean(row.email || row.phone),
    statusTone: needsAttention ? 'error' : orders - canceledOrders > 0 ? 'live' : 'draft',
    statusLabel: needsAttention ? 'требует внимания' : orders ? 'есть заказы' : 'нет заказов',
  };
}

export async function buildUnifiedAdminBuyers(db, searchParams = new URLSearchParams()) {
  const q = String(searchParams.get('q') || '').trim().slice(0, 120);
  const archive = searchParams.get('view') === 'archive';
  const page = Math.min(100000, Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1));
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '80', 10) || 80));
  const sql = `
    with orders as (
      select e.id, 'external'::text as channel, e."siteUserId", e."publicCode", e."externalOrderId",
        e.status::text as status, coalesce(e."purchasedAt", e."updatedAt") as order_at,
        lower(trim(coalesce(e."buyerEmailNormalized", e."buyerSnapshot"->'buyer'->>'email', e."buyerSnapshot"->>'email', ''))) as email,
        coalesce(e."buyerPhoneNormalized", e."buyerSnapshot"->'buyer'->>'phone', e."buyerSnapshot"->>'phone') as phone,
        coalesce(e."buyerSnapshot"->'buyer'->>'name', e."buyerSnapshot"->>'name') as name,
        (select count(*)::int from "ExternalTicket" t where t."externalOrderId" = e.id) as tickets
      from "ExternalOrder" e
      where e."archivedAt" is ${archive ? 'not null' : 'null'}
        and not exists (select 1 from "CheckoutOrder" c where c."externalOrderId" = e.id)
      union all
      select c.id, 'internal', c."siteUserId", c."publicCode", null,
        c.status::text, coalesce(c."paidAt", c."createdAt"), lower(trim(coalesce(c."buyerEmail", ''))),
        c."buyerPhone", c."buyerName",
        (select coalesce(sum(i.quantity), 0)::int from "CheckoutItem" i where i."checkoutOrderId" = c.id)
      from "CheckoutOrder" c where $1::boolean = false
    ), attributed as (
      select o.*, coalesce(d.id, v.id) as account_id,
        coalesce(d."emailVerifiedAt", v."emailVerifiedAt") is not null as email_verified,
        coalesce(d.name, v.name, o.name) as person_name,
        coalesce(d.email, v.email, nullif(o.email, '')) as person_email,
        coalesce(d.phone, v.phone, o.phone) as person_phone,
        case when coalesce(d.id, v.id) is not null then 'a:' || coalesce(d.id, v.id)
          when o.email <> '' then 'g:' || o.email
          else 'o:' || o.channel || ':' || o.id end as identity_key
      from orders o
      left join "SiteUser" d on d.id = o."siteUserId"
      left join "SiteUser" v on d.id is null and v."emailVerifiedAt" is not null and v.email = o.email
    ), people as (
      select 'a:' || u.id as identity_key, u.id as account_id,
        u."emailVerifiedAt" is not null as email_verified, u.name as person_name,
        u.email as person_email, u.phone as person_phone,
        null::text as id, null::text as channel, null::text as "publicCode", null::text as "externalOrderId",
        null::text as status, null::timestamp as order_at, 0::int as tickets
      from "SiteUser" u where $1::boolean = false and u."isActive" = true
      union all
      select identity_key, account_id, email_verified, person_name, person_email, person_phone,
        id, channel, "publicCode", "externalOrderId", status, order_at, tickets from attributed
    ), grouped as (
      select identity_key as "identityKey", max(account_id) as "accountId",
        bool_or(email_verified) as "emailVerified",
        max(person_name) as name, max(person_email) as email, max(person_phone) as phone,
        count(id)::int as orders,
        count(id) filter (where channel = 'internal')::int as "internalOrders",
        count(id) filter (where channel = 'external')::int as "externalOrders",
        coalesce(sum(tickets), 0)::int as tickets,
        count(id) filter (where status in ('CANCELED', 'CANCELLED', 'REFUNDED', 'DELETED'))::int as "canceledOrders",
        count(id) filter (where status ilike '%fail%' or status ilike '%error%')::int as "needsAttention",
        max(order_at) as "lastOrderAt",
        (array_agg(coalesce("publicCode", "externalOrderId") order by order_at desc nulls last))[1] as "lastOrderNumber",
        (array_agg(status order by order_at desc nulls last))[1] as "lastOrderStatus",
        bool_or($2::text <> '' and (
          position(lower($2) in lower(coalesce(person_name, ''))) > 0
          or position(lower($2) in lower(coalesce(person_email, ''))) > 0
          or position(lower($2) in lower(coalesce(person_phone, ''))) > 0
          or position(lower($2) in lower(coalesce("publicCode", ''))) > 0
          or position(lower($2) in lower(coalesce("externalOrderId", ''))) > 0
        )) as matches
      from people group by identity_key
    ), filtered as (select * from grouped where $2::text = '' or matches)
    select *, count(*) over()::int as "totalRows", sum(orders) over()::int as "allOrders",
      sum(tickets) over()::int as "allTickets", sum("needsAttention") over()::int as "allAttention",
      count(*) filter (where email is not null or phone is not null) over()::int as "withContacts"
    from filtered order by "lastOrderAt" desc nulls last, "identityKey" asc
    limit $3 offset $4
  `;
  const result = await db.query(sql, [archive, q, limit, (page - 1) * limit]);
  const rows = result.rows.map(mapAdminBuyerRow);
  const first = result.rows[0] || {};
  const total = Number(first.totalRows || 0);
  return {
    generatedAt: new Date().toISOString(), view: archive ? 'archive' : 'active',
    page, pages: Math.max(1, Math.ceil(total / limit)), limit, total, rows,
    piiLevel: 'masked',
    metrics: { buyers: total, withContacts: Number(first.withContacts || 0), orders: Number(first.allOrders || 0),
      tickets: Number(first.allTickets || 0), needsAttention: Number(first.allAttention || 0), archiveAfterDays: 30 },
  };
}

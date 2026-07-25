/**
 * SEO.20 - scan saleable public catalog events for garbage in title/description.
 * Filters approximate public catalog saleable set (not every Event row).
 */
import { prisma } from '@daibilet/db';
import { raw, sql } from '@daibilet/db/sql';
import { ACTIVE_SESSION_SQL, MIN_DISPLAY_PRICE_RUB } from './catalog-availability.js';
import {
  findListingGarbageHits,
  type ListingGarbageHit,
} from './listing-garbage-config.js';
import { escapeTelegramHtml, sendTelegramMessage } from './telegram.js';

const BLOCKED_SOURCE_STATUSES = [
  'widget_blocked',
  'paused',
  'suspended',
  'stopped',
  'cancelled',
  'canceled',
  'draft',
  'hidden',
] as const;

export interface ListingAuditEventRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
}

export interface ListingAuditFinding {
  id: string;
  slug: string;
  title: string;
  url: string;
  hits: ListingGarbageHit[];
}

export interface ListingAuditResult {
  scanned: number;
  findings: ListingAuditFinding[];
  telegram: { ok: boolean; skipped?: boolean; reason?: string } | null;
}

export interface RunListingGarbageAuditOptions {
  publicBaseUrl?: string;
  dryRun?: boolean;
  /** Cap Telegram list (default 10) */
  telegramCap?: number;
  /** Inject rows (tests) */
  events?: ListingAuditEventRow[];
  sendTelegram?: typeof sendTelegramMessage;
}

function resolvePublicBaseUrl(explicit?: string): string {
  const rawUrl =
    explicit ||
    process.env.PUBLIC_BASE ||
    process.env.PUBLIC_BASE_URL ||
    process.env.DAIBILET_PUBLIC_BASE ||
    'https://daibilet.ru';
  return String(rawUrl).replace(/\/+$/, '');
}

/**
 * Slim select of active saleable public events.
 * Mirrors public-catalog saleable gates: status, schedule, purchaseReady, price, sourceStatus.
 * Title/description prefer EventOverride when set (what editors / public see).
 */
export async function fetchSaleablePublicListingRows(): Promise<ListingAuditEventRow[]> {
  const blocked = BLOCKED_SOURCE_STATUSES.map((s) => `'${s}'`).join(', ');
  const rows = await prisma.$queryRaw<ListingAuditEventRow[]>(sql`
    with event_base as (
      select
        event.id,
        event.slug,
        coalesce(nullif(trim(override.title), ''), event.title) as title,
        coalesce(nullif(trim(override.description), ''), event.description) as description,
        event.kind,
        event."sourceStatus",
        event."priceFromRub",
        (
          select min(session."startsAt")
          from "EventSession" session
          where session."eventId" = event.id
            and session."isActive" is not false
            and ${raw(ACTIVE_SESSION_SQL)}
        ) as "startsAt",
        (
          select count(*)::int
          from "EventSession" session
          where session."eventId" = event.id
            and session."isActive" is not false
            and ${raw(ACTIVE_SESSION_SQL)}
        ) as "slotCount",
        (
          select min(offer."priceRub")
          from "EventOffer" offer
          where offer."eventId" = event.id
            and offer.active = true
            and offer."priceRub" >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "offerPriceRub",
        (
          select min(session."priceFromRub")
          from "EventSession" session
          where session."eventId" = event.id
            and session."isActive" is not false
            and ${raw(ACTIVE_SESSION_SQL)}
            and session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "sessionPriceFromRub",
        exists (
          select 1
          from "EventOffer" offer
          where offer."eventId" = event.id
            and offer.active = true
            and (
              offer."widgetUrl" is not null
              or offer."deeplinkUrl" is not null
              or offer."sourceCode"::text in ('TICKETSCLOUD', 'TEPLOHOD')
            )
        ) as "hasPurchaseEntry"
      from "Event" event
      left join "EventOverride" override on override."eventId" = event.id
      where event.status not in ('HIDDEN', 'DRAFT')
    ),
    priced as (
      select
        *,
        (
          select min(price)
          from (values ("priceFromRub"), ("sessionPriceFromRub"), ("offerPriceRub")) as prices(price)
          where price is not null and price >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "priceFrom",
        (
          "hasPurchaseEntry"
          and (
            coalesce("slotCount", 0) > 0
            or kind = 'OPEN_DATE'
            or lower(coalesce("sourceStatus", '')) = 'open_date'
            or lower(coalesce("sourceStatus", '')) = 'widget'
          )
        ) as "purchaseReady"
      from event_base
    )
    select id, slug, title, description
    from priced
    where "priceFrom" >= ${MIN_DISPLAY_PRICE_RUB}
      and "purchaseReady" = true
      and lower(coalesce("sourceStatus", '')) not in (${raw(blocked)})
      and (
        "startsAt" is not null
        or kind = 'OPEN_DATE'
        or lower(coalesce("sourceStatus", '')) in ('open_date', 'widget')
      )
    order by title asc
  `);

  return rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug || ''),
    title: String(row.title || ''),
    description: row.description == null ? null : String(row.description),
  }));
}

export function scanListingRows(
  events: ListingAuditEventRow[],
  publicBaseUrl: string,
): ListingAuditFinding[] {
  const base = publicBaseUrl.replace(/\/+$/, '');
  const findings: ListingAuditFinding[] = [];

  for (const event of events) {
    const textToCheck = `${event.title || ''}\n${event.description || ''}`;
    const hits = findListingGarbageHits(textToCheck);
    if (hits.length === 0) continue;
    findings.push({
      id: event.id,
      slug: event.slug,
      title: event.title,
      url: `${base}/events/${encodeURIComponent(event.slug || event.id)}`,
      hits,
    });
  }

  return findings;
}

export function formatListingAuditTelegramMessage(
  findings: ListingAuditFinding[],
  cap = 10,
): string {
  const total = findings.length;
  const lines = [
    `<b>Мусор в публичной выдаче (${total} шт.)</b>`,
    '',
  ];

  for (const item of findings.slice(0, Math.max(0, cap))) {
    const reasons = [...new Set(item.hits.map((h) => h.reason))].join(', ');
    const title = escapeTelegramHtml(item.title || item.slug || item.id);
    const url = escapeTelegramHtml(item.url);
    lines.push(
      `• <code>${escapeTelegramHtml(item.id)}</code> — <a href="${url}">${title}</a>`,
    );
    lines.push(`  <i>${escapeTelegramHtml(reasons)}</i>`);
  }

  if (total > cap) {
    lines.push('');
    lines.push(`…и ещё ${total - cap} событий.`);
  }

  return lines.join('\n');
}

export async function runListingGarbageAudit(
  options: RunListingGarbageAuditOptions = {},
): Promise<ListingAuditResult> {
  const publicBaseUrl = resolvePublicBaseUrl(options.publicBaseUrl);
  const telegramCap = options.telegramCap ?? 10;
  const send = options.sendTelegram || sendTelegramMessage;

  const events = options.events || (await fetchSaleablePublicListingRows());
  const findings = scanListingRows(events, publicBaseUrl);

  let telegram: ListingAuditResult['telegram'] = null;
  if (findings.length > 0 && !options.dryRun) {
    const text = formatListingAuditTelegramMessage(findings, telegramCap);
    telegram = await send({
      text,
      parseMode: 'HTML',
      disableWebPagePreview: true,
    });
  } else if (findings.length > 0 && options.dryRun) {
    telegram = { ok: false, skipped: true, reason: 'dry_run' };
  }

  return {
    scanned: events.length,
    findings,
    telegram,
  };
}

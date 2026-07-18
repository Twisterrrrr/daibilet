#!/usr/bin/env node
/**
 * Еженедельный дайджест новых мероприятий → Article status=REVIEW (без auto-publish).
 *
 * Usage:
 *   node scripts/blog-weekly-digest.js
 *   node scripts/blog-weekly-digest.js --days=7 --dry-run
 *
 * Cron: вс 07:00 — см. deploy/cron/blog-weekly-digest.sh и deploy/cron/README.md
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createDb } from '../apps/backend/src/db.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIN_PRICE = 100;
const DEFAULT_DAYS = 7;
const TOP_MSK_SPB = 15;
const TOP_REGIONS = 2;

function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const days = Math.max(1, Number(argValue('days', DEFAULT_DAYS)) || DEFAULT_DAYS);
const dryRun = hasFlag('dry-run');

const db = createDb(rootDir);

function formatRuDate(d) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(d);
}

function formatRuRange(from, to) {
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  if (sameMonth) {
    return `${from.getDate()}–${formatRuDate(to)}`;
  }
  return `${formatRuDate(from)} – ${formatRuDate(to)}`;
}

function money(value) {
  if (!Number.isFinite(value)) return null;
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

async function fetchCandidates() {
  const { rows } = await db.query(
    `
      with ranked as (
        select
          e.id,
          e.title,
          e.slug,
          e."priceFromRub",
          e."createdAt",
          c.title as city,
          c.slug as "citySlug",
          coalesce(
            (
              select min(s."startsAt")
              from "EventSession" s
              where s."eventId" = e.id
                and s."isActive" is not false
                and s."startsAt" >= now() - interval '15 minutes'
            ),
            e."openDateValidTo"
          ) as "nextStartsAt",
          (
            exists (
              select 1
              from "EventOffer" o
              where o."eventId" = e.id
                and o.active is not false
                and (
                  nullif(trim(o."widgetUrl"), '') is not null
                  or nullif(trim(o."deeplinkUrl"), '') is not null
                )
            )
            or exists (
              select 1
              from "EventSourceLink" esl
              join "Source" src on src.id = esl."sourceId"
              where esl."eventId" = e.id
                and upper(coalesce(src.code::text, '')) in ('TEPLOHOD', 'TEP')
            )
          ) as "purchaseReady",
          case
            when c.slug in ('moscow', 'saint-petersburg') then 'capital'
            else 'region'
          end as bucket
        from "Event" e
        left join "City" c on c.id = e."primaryCityId"
        where e.status::text in ('READY', 'PUBLISHED')
          and e."createdAt" >= now() - ($1::text || ' days')::interval
          and coalesce(e."priceFromRub", 0) >= $2
      )
      select *
      from ranked
      where "nextStartsAt" is not null
        and "purchaseReady" = true
      order by
        case when bucket = 'capital' then 0 else 1 end,
        "createdAt" desc,
        "priceFromRub" asc nulls last
    `,
    [String(days), MIN_PRICE],
  );
  return rows;
}

function pickEvents(rows) {
  const capitals = [];
  const regions = [];
  const seenTitles = new Set();

  for (const row of rows) {
    const key = String(row.title || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    if (!key || seenTitles.has(key)) continue;
    seenTitles.add(key);
    if (row.bucket === 'capital') {
      if (capitals.length < TOP_MSK_SPB) capitals.push(row);
    } else if (regions.length < TOP_REGIONS) {
      regions.push(row);
    }
    if (capitals.length >= TOP_MSK_SPB && regions.length >= TOP_REGIONS) break;
  }
  return { capitals, regions };
}

function buildContent({ capitals, regions, rangeLabel }) {
  const lines = [];
  lines.push(
    `Авточерновик дайджеста за неделю (**${rangeLabel}**). Редактор: проверьте формулировки, ссылки и цены перед публикацией.`,
  );
  lines.push('');
  lines.push('Ниже — события, которые появились в каталоге Дайбилет за последние дни и уже доступны к покупке.');
  lines.push('');

  if (capitals.length) {
    lines.push('## Москва и Санкт-Петербург');
    lines.push('');
    for (const event of capitals) {
      const price = money(Number(event.priceFromRub));
      const city = event.city ? ` — ${event.city}` : '';
      const pricePart = price ? `, от **${price}**` : '';
      lines.push(`- [${event.title}](/events/${event.slug})${city}${pricePart}`);
    }
    lines.push('');
  }

  if (regions.length) {
    lines.push('## Регионы');
    lines.push('');
    for (const event of regions) {
      const price = money(Number(event.priceFromRub));
      const city = event.city ? ` — ${event.city}` : '';
      const pricePart = price ? `, от **${price}**` : '';
      lines.push(`- [${event.title}](/events/${event.slug})${city}${pricePart}`);
    }
    lines.push('');
  }

  if (!capitals.length && !regions.length) {
    lines.push('_За выбранный период подходящих новых событий не найдено._');
    lines.push('');
  }

  lines.push(
    `[CTA title="Смотреть всю афишу" text="Актуальные даты и цены — в каталоге Дайбилет." button="Каталог событий" href="/events" secondaryButton="Города" secondaryHref="/cities"]`,
  );
  lines.push('');
  lines.push('### Итог');
  lines.push('');
  lines.push('Дайджест собран автоматически из каталога. После редактуры смените статус на PUBLISHED и включите индексацию.');

  return lines.join('\n');
}

const now = new Date();
const weekStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const slugDate = now.toISOString().slice(0, 10);
const slug = `afisha-nedeli-${slugDate}`;
const rangeLabel = formatRuRange(weekStart, now);

const rows = await fetchCandidates();
const picked = pickEvents(rows);
const total = picked.capitals.length + picked.regions.length;
const title = `Афиша недели: ${total} новых событий (${rangeLabel})`;
const excerpt = `Подборка новых мероприятий за ${days} дн.: Москва, Петербург и регионы — с ценами и ссылками на билеты.`;
const content = buildContent({ ...picked, rangeLabel });

console.log(`candidates=${rows.length} picked=${total} slug=${slug}`);

if (dryRun) {
  console.log('--- draft preview ---');
  console.log(title);
  console.log(excerpt);
  console.log(content.slice(0, 1200));
  process.exit(0);
}

const existing = await db.query(`select id, status from "Article" where slug = $1 limit 1`, [slug]);
if (existing.rows[0]) {
  console.log(`skip: article already exists slug=${slug} status=${existing.rows[0].status}`);
  process.exit(0);
}

const id = randomUUID().replace(/-/g, '').slice(0, 24);
await db.query(
  `
    insert into "Article" (
      id, slug, status, title, excerpt, content, "coverImageUrl", "cityId",
      "seoH1", "seoTitle", "seoDescription", "canonicalPath", "isIndexable",
      "publishedAt", "createdAt", "updatedAt"
    ) values (
      $1, $2, 'REVIEW'::"ArticleStatus", $3, $4, $5, $6, null,
      $3, $7, $4, $8, false,
      null, now(), now()
    )
  `,
  [
    id,
    slug,
    title,
    excerpt,
    content,
    '/images/blog/afisha-regionalnye-goroda.jpg',
    `${title} | Дайбилет`,
    `/blog/${slug}`,
  ],
);

console.log(`created Article REVIEW id=${id} slug=${slug}`);
process.exit(0);

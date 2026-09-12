#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
  max: 1,
});

const ELIGIBLE_CTE = `
  with eligible as (
    select
      e.id,
      e.title,
      e.slug,
      coalesce(src.code, 'UNKNOWN') as source_code,
      nullif(btrim(e.description), '') as source_description,
      nullif(btrim(o.description), '') as override_description,
      coalesce(nullif(btrim(o.description), ''), nullif(btrim(e.description), ''), '') as effective_description
    from "Event" e
    left join "EventOverride" o on o."eventId" = e.id
    left join lateral (
      select s.code::text as code
      from "EventSourceLink" link
      join "Source" s on s.id = link."sourceId"
      where link."eventId" = e.id
      order by case s.code::text when 'TEPLOHOD' then 1 when 'TICKETSCLOUD' then 2 else 3 end
      limit 1
    ) src on true
    where coalesce(o."editorStatus", e.status)::text not in ('HIDDEN', 'DRAFT')
      and coalesce(o."isIndexable", e."isIndexable", true)
      and exists (
        select 1
        from "EventOffer" offer
        where offer."eventId" = e.id
          and offer.active is not false
          and (nullif(offer."widgetUrl", '') is not null or nullif(offer."deeplinkUrl", '') is not null)
      )
      and (
        (
          e.kind::text = 'OPEN_DATE'
          and (e."openDateValidTo" is null or e."openDateValidTo" >= current_date)
        )
        or exists (
          select 1
          from "EventSession" session
          where session."eventId" = e.id
            and session."isActive" is not false
            and session."cancelledAt" is null
            and (
              session."startsAt" >= now() - interval '2 hours'
              or session."endsAt" >= now()
            )
        )
      )
  ), cleaned as (
    select
      *,
      btrim(regexp_replace(regexp_replace(effective_description, '<[^>]*>', ' ', 'g'), '\\s+', ' ', 'g')) as plain_description
    from eligible
  ), fingerprinted as (
    select
      *,
      case
        when plain_description = '' then null
        else md5(regexp_replace(lower(plain_description), '[^[:alnum:]]+', '', 'g'))
      end as description_fingerprint
    from cleaned
  ), scored as (
    select
      *,
      case
        when description_fingerprint is null then 0
        else count(*) over (partition by description_fingerprint)
      end as duplicate_count,
      char_length(plain_description) as description_length
    from fingerprinted
  )
`;

async function main() {
  const client = await pool.connect();
  try {
    const metrics = await client.query(`${ELIGIBLE_CTE}
      select
        source_code,
        count(*)::int as eligible,
        count(*) filter (where override_description is not null)::int as reviewed_override,
        count(*) filter (where override_description is null and description_length = 0)::int as missing_description,
        count(*) filter (where override_description is null and description_length between 1 and 319)::int as short_description,
        count(*) filter (where override_description is null and duplicate_count > 1)::int as internal_duplicate,
        count(*) filter (
          where override_description is null
            and (description_length < 320 or duplicate_count > 1)
        )::int as priority_rewrite,
        count(*) filter (
          where override_description is null
            and description_length >= 320
            and duplicate_count <= 1
        )::int as defer_no_rewrite
      from scored
      group by source_code
      order by eligible desc, source_code
    `);

    const sample = await client.query(`${ELIGIBLE_CTE}
      select
        id,
        slug,
        title,
        source_code as source,
        description_length as "descriptionLength",
        duplicate_count as "duplicateCount",
        case
          when description_length = 0 then 'missing'
          when description_length < 160 then 'very_short'
          when duplicate_count > 1 then 'internal_duplicate'
          else 'short'
        end as reason
      from scored
      where override_description is null
        and (description_length < 320 or duplicate_count > 1)
      order by
        (description_length = 0) desc,
        duplicate_count desc,
        description_length asc,
        title
      limit 20
    `);

    const totals = metrics.rows.reduce(
      (acc, row) => {
        for (const key of [
          'eligible',
          'reviewed_override',
          'missing_description',
          'short_description',
          'internal_duplicate',
          'priority_rewrite',
          'defer_no_rewrite',
        ]) {
          acc[key] += Number(row[key] || 0);
        }
        return acc;
      },
      {
        eligible: 0,
        reviewed_override: 0,
        missing_description: 0,
        short_description: 0,
        internal_duplicate: 0,
        priority_rewrite: 0,
        defer_no_rewrite: 0,
      },
    );

    console.log(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          criteria: {
            saleable: true,
            indexable: true,
            currentOrUpcoming: true,
            shortDescriptionChars: 320,
          },
          totals,
          bySource: metrics.rows,
          prioritySample: sample.rows,
        },
        null,
        2,
      ),
    );
  } finally {
    client.release();
    await pool.end();
  }
}

function loadRootEnv(projectRoot) {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

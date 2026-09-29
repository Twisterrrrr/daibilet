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

const sampleLimit = parseSampleLimit(process.argv.slice(2));

const ELIGIBLE_CTE = `
  with eligible_rows as (
    select
      e.id,
      e.title,
      e.slug,
      coalesce(src.code, 'UNKNOWN') as source_code,
      src.external_id,
      src.meta_external_id,
      nullif(btrim(e.description), '') as source_description,
      nullif(btrim(o.description), '') as override_description,
      coalesce(nullif(btrim(o.description), ''), nullif(btrim(e.description), ''), '') as effective_description
    from "Event" e
    left join "EventOverride" o on o."eventId" = e.id
    left join lateral (
      select
        s.code::text as code,
        link."externalId" as external_id,
        link."metaExternalId" as meta_external_id
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
  ), keyed_rows as (
    select
      *,
      case
        when source_code = 'TICKETSCLOUD' and meta_external_id is not null
          then source_code || ':' || meta_external_id
        when external_id is not null
          then source_code || ':' || external_id
        else source_code || ':' || id
      end as series_key,
      btrim(regexp_replace(regexp_replace(coalesce(source_description, ''), '<[^>]*>', ' ', 'g'), '\\s+', ' ', 'g')) as plain_source_description,
      btrim(regexp_replace(regexp_replace(effective_description, '<[^>]*>', ' ', 'g'), '\\s+', ' ', 'g')) as plain_effective_description
    from eligible_rows
  ), edition_rows as (
    select
      *,
      series_key || ':' || md5(lower(title) || E'\\n' || plain_source_description) as edition_key
    from keyed_rows
  ), ranked_editions as (
    select
      *,
      row_number() over (
        partition by edition_key
        order by (override_description is not null) desc, id
      ) as edition_rank,
      count(*) over (partition by edition_key)::int as edition_row_count,
      bool_or(override_description is not null) over (partition by edition_key) as edition_has_override
    from edition_rows
  ), editions as (
    select
      id,
      slug,
      title,
      source_code,
      external_id,
      meta_external_id,
      series_key,
      edition_key,
      edition_row_count,
      edition_has_override as reviewed_override,
      source_description,
      override_description,
      plain_effective_description as plain_description,
      case
        when plain_effective_description = '' then null
        else md5(regexp_replace(lower(plain_effective_description), '[^[:alnum:]]+', '', 'g'))
      end as description_fingerprint,
      char_length(plain_effective_description) as description_length
    from ranked_editions
    where edition_rank = 1
  ), scored as (
    select
      *,
      case
        when description_fingerprint is null then 0
        else count(*) over (partition by source_code, description_fingerprint)
      end as duplicate_count
    from editions
  )
`;

async function main() {
  const client = await pool.connect();
  try {
    const metrics = await client.query(`${ELIGIBLE_CTE}
      select
        source_code,
        count(distinct series_key)::int as eligible_programs,
        count(*)::int as eligible_editions,
        sum(edition_row_count)::int as eligible_rows,
        count(distinct series_key) filter (where reviewed_override)::int as reviewed_programs,
        count(*) filter (where reviewed_override)::int as reviewed_editions,
        count(*) filter (where not reviewed_override and description_length = 0)::int as missing_description,
        count(*) filter (where not reviewed_override and description_length between 1 and 319)::int as short_description,
        count(*) filter (where not reviewed_override and duplicate_count > 1)::int as internal_duplicate,
        count(*) filter (
          where not reviewed_override
            and description_length < 320
        )::int as direct_content_gap,
        count(*) filter (
          where not reviewed_override
            and description_length >= 320
            and duplicate_count > 1
        )::int as duplicate_only_review,
        count(*) filter (
          where not reviewed_override
            and (description_length < 320 or duplicate_count > 1)
        )::int as needs_editorial_action,
        count(*) filter (
          where not reviewed_override
            and description_length > 0
            and (description_length < 320 or duplicate_count > 1)
        )::int as ai_rewrite_candidates,
        count(*) filter (
          where not reviewed_override
            and description_length = 0
        )::int as manual_enrichment_required,
        count(*) filter (
          where not reviewed_override
            and description_length >= 320
            and duplicate_count <= 1
        )::int as defer_no_rewrite
      from scored
      group by source_code
      order by eligible_programs desc, source_code
    `);

    const duplicateSummary = await client.query(`${ELIGIBLE_CTE}, duplicate_clusters as (
      select
        source_code,
        description_fingerprint,
        max(description_length)::int as description_length,
        count(*)::int as member_editions,
        count(distinct series_key)::int as member_programs,
        count(*) filter (where not reviewed_override)::int as untreated_editions,
        (array_agg(distinct title order by title))[1:4] as sample_titles
      from scored
      where description_fingerprint is not null
      group by source_code, description_fingerprint
      having count(*) > 1
        and count(*) filter (where not reviewed_override) > 0
    )
      select
        source_code,
        count(*)::int as cluster_count,
        sum(member_programs)::int as duplicated_programs,
        sum(member_editions)::int as duplicated_editions,
        sum(untreated_editions)::int as untreated_editions,
        max(member_editions)::int as largest_cluster
      from duplicate_clusters
      group by source_code
      order by duplicated_editions desc, source_code
    `);

    const largestDuplicateClusters = await client.query(`${ELIGIBLE_CTE}, duplicate_clusters as (
      select
        source_code,
        max(description_length)::int as "descriptionLength",
        count(*)::int as "memberEditions",
        count(distinct series_key)::int as "memberPrograms",
        count(*) filter (where not reviewed_override)::int as "untreatedEditions",
        (array_agg(distinct title order by title))[1:4] as "sampleTitles"
      from scored
      where description_fingerprint is not null
      group by source_code, description_fingerprint
      having count(*) > 1
        and count(*) filter (where not reviewed_override) > 0
    )
      select
        source_code as source,
        "descriptionLength",
        "memberEditions",
        "memberPrograms",
        "untreatedEditions",
        "sampleTitles"
      from duplicate_clusters
      order by "memberEditions" desc, source_code
      limit 15
    `);

    const sample = await client.query(`${ELIGIBLE_CTE}, prioritized as (
      select
        id,
        slug,
        title,
        source_code,
        external_id,
        meta_external_id,
        series_key,
        edition_row_count,
        description_length,
        duplicate_count,
        source_description,
        case
          when description_length < 160 then 'very_short'
          when duplicate_count > 1 then 'internal_duplicate'
          else 'short'
        end as reason
      from scored
      where not reviewed_override
        and description_length > 0
        and (description_length < 320 or duplicate_count > 1)
      order by
        duplicate_count desc,
        edition_row_count desc,
        description_length asc,
        title
      limit $1
    )
      select
        prioritized.id as "representativeEventId",
        prioritized.slug,
        prioritized.title,
        prioritized.source_code as source,
        prioritized.external_id as "externalId",
        prioritized.meta_external_id as "metaExternalId",
        prioritized.series_key as "seriesKey",
        prioritized.edition_row_count as "eventRows",
        prioritized.description_length as "descriptionLength",
        prioritized.duplicate_count as "duplicateCount",
        prioritized.source_description as "sourceDescription",
        prioritized.reason,
        city.title as city,
        venue.title as venue,
        venue.address as "venueAddress",
        event."ageLimit",
        category.title as category,
        durations.minutes as "scheduledDurationMinutes"
      from prioritized
      join "Event" event on event.id = prioritized.id
      left join "City" city on city.id = event."primaryCityId"
      left join "Venue" venue on venue.id = event."venueId"
      left join "Category" category on category.id = event."categoryId"
      left join lateral (
        select coalesce(
          array_agg(distinct greatest(5, round(extract(epoch from (session."endsAt" - session."startsAt")) / 300.0) * 5) order by greatest(5, round(extract(epoch from (session."endsAt" - session."startsAt")) / 300.0) * 5)),
          '{}'::numeric[]
        ) as minutes
        from "EventSession" session
        where session."eventId" = prioritized.id
          and session."isActive" is not false
          and session."cancelledAt" is null
          and session."startsAt" is not null
          and session."endsAt" > session."startsAt"
      ) durations on true
      order by
        prioritized.duplicate_count desc,
        prioritized.edition_row_count desc,
        prioritized.description_length asc,
        prioritized.title
    `, [sampleLimit]);

    const missingSample = await client.query(`${ELIGIBLE_CTE}
      select
        id as "representativeEventId",
        slug,
        title,
        source_code as source,
        external_id as "externalId",
        meta_external_id as "metaExternalId",
        series_key as "seriesKey",
        edition_row_count as "eventRows"
      from scored
      where not reviewed_override
        and description_length = 0
      order by edition_row_count desc, title
      limit 20
    `);

    const metricKeys = [
      'eligible_programs',
      'eligible_editions',
      'eligible_rows',
      'reviewed_programs',
      'reviewed_editions',
      'missing_description',
      'short_description',
      'internal_duplicate',
      'direct_content_gap',
      'duplicate_only_review',
      'needs_editorial_action',
      'ai_rewrite_candidates',
      'manual_enrichment_required',
      'defer_no_rewrite',
    ];
    const totals = Object.fromEntries(metricKeys.map((key) => [key, 0]));
    for (const row of metrics.rows) {
      for (const key of metricKeys) totals[key] += Number(row[key] || 0);
    }

    console.log(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          criteria: {
            saleable: true,
            indexable: true,
            currentOrUpcoming: true,
            shortDescriptionChars: 320,
            queueUnit: 'source edition of a unique program',
            ticketscloudProgramKey: 'metaExternalId (fallback: externalId)',
            sampleLimit,
          },
          totals,
          bySource: metrics.rows,
          duplicateSummary: duplicateSummary.rows,
          largestDuplicateClusters: largestDuplicateClusters.rows,
          prioritySample: sample.rows,
          missingDescriptionSample: missingSample.rows,
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

function parseSampleLimit(args) {
  const inline = args.find((arg) => arg.startsWith('--limit='));
  const separateIndex = args.indexOf('--limit');
  const raw = inline ? inline.slice('--limit='.length) : separateIndex >= 0 ? args[separateIndex + 1] : '100';
  const parsed = Number.parseInt(String(raw || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500) {
    throw new Error('--limit must be an integer between 1 and 500');
  }
  return parsed;
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

import { createRequire } from 'node:module';
import {
  resolveContextInstitutionFromTitle,
  shouldResolveInstitutionFromTitle,
} from '../apps/backend/src/event-venue-context.js';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

async function main() {
  const { rows: institutions } = await pool.query(`
    select id, title, slug, kind, "cityId"
    from "Venue"
    where kind in ('MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'ATTRACTION')
      and coalesce("pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
  `);
  const institutionsByCity = new Map();
  for (const row of institutions) {
    const list = institutionsByCity.get(row.cityId) || [];
    list.push(row);
    institutionsByCity.set(row.cityId, list);
  }

  const { rows: events } = await pool.query(`
    select
      e.id,
      e.title,
      e."primaryCityId" as city_id,
      c.title as city,
      v.id as venue_id,
      v.title as venue,
      v.kind as venue_kind
    from "Event" e
    join "Venue" v on v.id = e."venueId"
    left join "City" c on c.id = e."primaryCityId"
    where (
      v.kind = 'MEETING_POINT'
      or v.title ~* '(ул\\.|улиц|пр\\.|просп|наб\\.|пер\\.|д\\.|метро|у выхода)'
    )
  `);

  const samples = [];
  let withContext = 0;
  let withCatalogMatch = 0;
  const byInstitution = new Map();

  for (const event of events) {
    if (!shouldResolveInstitutionFromTitle({ venueKind: event.venue_kind, venue: event.venue })) continue;

    const context = resolveContextInstitutionFromTitle(event.title);
    if (!context) continue;
    withContext += 1;

    const cityInstitutions = institutionsByCity.get(event.city_id) || [];
    const matched = context.searchPattern
      ? cityInstitutions.find(
          (venue) => context.searchPattern.test(venue.title) && !/сектор|причал|метро|памятник/i.test(venue.title),
        )
      : null;
    if (matched) withCatalogMatch += 1;

    byInstitution.set(context.displayName, (byInstitution.get(context.displayName) || 0) + 1);

    if (samples.length < 25) {
      samples.push({
        title: event.title,
        venue: event.venue,
        institution: context.displayName,
        matchedVenue: matched?.title || null,
        city: event.city,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        meetingPointOrAddressEvents: events.length,
        withInstitutionInTitle: withContext,
        withCatalogVenueMatch: withCatalogMatch,
        withoutCatalogVenue: withContext - withCatalogMatch,
        topInstitutions: [...byInstitution.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([name, count]) => ({ name, count })),
        samples,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => pool.end());

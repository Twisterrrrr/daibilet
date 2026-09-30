/** Keep an existing provider city identity when the feed changes its display name. */
async function resolveTicketscloudCityId(client, { cityId, citySlug, cityName }) {
  if (!cityId || !cityName) return cityId;

  const existing = await client.query('select id from "City" where id = $1 limit 1', [cityId]);
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const inserted = await client.query(
    `insert into "City" (id, slug, title, "sourceTitle", "isDestination")
     values ($1, $2, $3, $3, true)
     on conflict (slug) do update set
       title = excluded.title,
       "sourceTitle" = coalesce("City"."sourceTitle", excluded."sourceTitle"),
       "isDestination" = true
     returning id`,
    [cityId, citySlug, cityName],
  );
  return inserted.rows[0]?.id || cityId;
}

module.exports = { resolveTicketscloudCityId };

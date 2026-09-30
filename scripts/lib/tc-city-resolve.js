/** Keep an existing provider city identity when the feed changes its display name. */
async function resolveTicketscloudCityId(client, { cityId, citySlug, cityName }, cache) {
  if (!cityId || !cityName) return cityId;
  if (cache?.has(cityId)) return cache.get(cityId);

  const existing = await client.query('select id from "City" where id = $1 limit 1', [cityId]);
  if (existing.rows[0]?.id) {
    cache?.set(cityId, existing.rows[0].id);
    return existing.rows[0].id;
  }

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
  const resolved = inserted.rows[0]?.id || cityId;
  cache?.set(cityId, resolved);
  return resolved;
}

module.exports = { resolveTicketscloudCityId };

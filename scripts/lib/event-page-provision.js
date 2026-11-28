/** Provision one draft EventPage shell per eligible current Event after catalog import. */
async function ensureEventPageShells(client, eventIds) {
  const ids = [...new Set((eventIds || []).map((value) => String(value || '').trim()).filter(Boolean))];
  if (!ids.length) return { available: true, checked: 0, created: 0, existing: 0, skipped: 0 };

  const migration = await client.query(`
    select to_regclass('public."EventPage"') as page_table,
      to_regclass('public."EventPageEvent"') as link_table,
      to_regclass('public."EventPageRoute"') as route_table
  `);
  const schemaReady = Boolean(migration.rows[0]?.page_table && migration.rows[0]?.link_table && migration.rows[0]?.route_table);
  if (!schemaReady) return { available: false, checked: 0, created: 0, existing: 0, skipped: ids.length };

  const { ensureDraftEventPageForEvent } = await import('../../apps/backend/src/event-pages.js');
  const stats = { available: true, checked: ids.length, created: 0, existing: 0, skipped: 0 };
  for (const eventId of ids) {
    // Provider imports already upsert and lock every Event row in their outer
    // transaction. Avoid one transaction-level advisory lock per ID: a full
    // catalog can exceed PostgreSQL's shared lock table before commit.
    const result = await ensureDraftEventPageForEvent(client, eventId, { skipEventAdvisoryLock: true });
    if (!result) stats.skipped += 1;
    else if (result.created) stats.created += 1;
    else stats.existing += 1;
  }
  return stats;
}

module.exports = { ensureEventPageShells };

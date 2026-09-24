async function enqueueDescriptionRewrite(client, eventId, description) {
  return client.query(`
    INSERT INTO "EventDescriptionRewrite" ("eventId", "originalDescription") VALUES ($1, $2)
    ON CONFLICT ("eventId") DO UPDATE SET
      status = 'review', "reviewReasons" = '["source_changed"]'::jsonb, "updatedAt" = now()
    WHERE "EventDescriptionRewrite"."originalDescription" IS DISTINCT FROM EXCLUDED."originalDescription"
  `, [eventId, description || '']);
}
module.exports = { enqueueDescriptionRewrite };

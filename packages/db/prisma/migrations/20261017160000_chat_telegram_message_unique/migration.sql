-- Preserve the earliest Telegram mapping for each id. Duplicate mappings
-- cannot be resolved safely by the webhook, so detach later duplicates.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "telegramMessageId"
    ORDER BY "createdAt", "id"
  ) AS rn
  FROM "chat_messages"
  WHERE "telegramMessageId" IS NOT NULL
)
UPDATE "chat_messages" AS message
SET "telegramMessageId" = NULL
FROM ranked
WHERE message."id" = ranked."id" AND ranked.rn > 1;

DROP INDEX IF EXISTS "chat_messages_telegramMessageId_idx";
CREATE UNIQUE INDEX "chat_messages_telegramMessageId_key"
  ON "chat_messages"("telegramMessageId");

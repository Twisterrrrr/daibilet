ALTER TABLE "ExternalOrder"
ADD COLUMN IF NOT EXISTS "publicCode" TEXT;

WITH generated AS (
  SELECT
    id,
    lpad((((('x' || substr(md5("sourceId" || ':' || "externalOrderId"), 1, 12))::bit(48)::bigint % 9000000) + 1000000)::text), 7, '0') AS candidate
  FROM "ExternalOrder"
),
dedup AS (
  SELECT
    id,
    CASE
      WHEN count(*) OVER (PARTITION BY candidate) > 1
        THEN lpad((((('x' || substr(md5(id), 1, 12))::bit(48)::bigint % 9000000) + 1000000)::text), 7, '0')
      ELSE candidate
    END AS code
  FROM generated
)
UPDATE "ExternalOrder" ext_order
SET "publicCode" = dedup.code
FROM dedup
WHERE ext_order.id = dedup.id
  AND ext_order."publicCode" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ExternalOrder_publicCode_key" ON "ExternalOrder" ("publicCode");

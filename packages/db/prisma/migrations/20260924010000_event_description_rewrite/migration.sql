CREATE TABLE "EventDescriptionRewrite" (
  "eventId" TEXT PRIMARY KEY REFERENCES "Event"(id) ON DELETE CASCADE,
  "originalDescription" TEXT NOT NULL,
  "rewrittenDescription" TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','review','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  "promptVersion" TEXT,
  usage JSONB,
  "costUsd" DECIMAL(14,8),
  "reviewReasons" JSONB,
  error TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EventDescriptionRewrite_status_createdAt_idx" ON "EventDescriptionRewrite"(status, "createdAt");
INSERT INTO "EventDescriptionRewrite" ("eventId", "originalDescription")
SELECT e.id, coalesce(e.description, '') FROM "Event" e
WHERE EXISTS (SELECT 1 FROM "EventSourceLink" l JOIN "Source" s ON s.id=l."sourceId"
  WHERE l."eventId"=e.id AND s.code::text='TICKETSCLOUD');
-- The worker and future code cannot accidentally overwrite the source snapshot.
CREATE FUNCTION preserve_event_description_original() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."originalDescription" IS DISTINCT FROM OLD."originalDescription" THEN
    RAISE EXCEPTION 'originalDescription is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER preserve_event_description_original BEFORE UPDATE ON "EventDescriptionRewrite"
FOR EACH ROW EXECUTE FUNCTION preserve_event_description_original();

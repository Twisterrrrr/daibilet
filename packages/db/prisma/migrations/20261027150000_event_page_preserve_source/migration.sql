ALTER TABLE "event_page_members"
  DROP CONSTRAINT "event_page_members_eventId_fkey";
ALTER TABLE "event_page_members"
  ADD CONSTRAINT "event_page_members_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

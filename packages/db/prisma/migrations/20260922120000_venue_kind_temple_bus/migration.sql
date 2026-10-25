-- AlterEnum: explicit TEMPLE / BUS kinds (was public-chip heuristic on ATTRACTION / MEETING_POINT).
-- Family stays location for both - no URL family change (step 4 is separate).
ALTER TYPE "VenueKind" ADD VALUE 'TEMPLE';
ALTER TYPE "VenueKind" ADD VALUE 'BUS';

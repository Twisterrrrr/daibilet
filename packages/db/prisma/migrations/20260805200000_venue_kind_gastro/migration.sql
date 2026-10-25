-- AlterEnum: location gastro kind (cafe/restaurant/bar on /locations).
-- Institution event venues stay CLUB_BAR_RESTAURANT → /venues.
ALTER TYPE "VenueKind" ADD VALUE 'GASTRO';

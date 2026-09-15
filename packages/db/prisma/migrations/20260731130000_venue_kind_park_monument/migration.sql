-- AlterEnum: location kinds for parks and monuments (city hub «Важные места»).
-- Park admission / paid entry is intentionally out of MVP catalog mix (see docs/qa.md).
ALTER TYPE "VenueKind" ADD VALUE 'PARK';
ALTER TYPE "VenueKind" ADD VALUE 'MONUMENT';

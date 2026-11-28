import { prisma, disconnectPrisma } from '@daibilet/db';
import { suggestPlaceTaxonomyCandidate } from '../src/place-taxonomy-candidates.js';

try {
  const venues = await prisma.venue.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      kind: true,
      placeType: true,
      placeSubtype: true,
      pageStatus: true,
      isIndexable: true,
    },
    orderBy: { title: 'asc' },
  });
  const candidates = venues.flatMap((venue) => {
    const suggestion = suggestPlaceTaxonomyCandidate({
      title: venue.title,
      placeType: venue.placeType,
      placeSubtype: venue.placeSubtype,
    });
    return suggestion ? [{ ...venue, suggestion }] : [];
  });
  process.stdout.write(`${JSON.stringify({ mode: 'read-only-dry-run', totalVenues: venues.length, candidateCount: candidates.length, candidates }, null, 2)}\n`);
} finally {
  await disconnectPrisma();
}

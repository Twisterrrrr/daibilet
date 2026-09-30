import { readFileSync } from 'node:fs';
import { prisma, disconnectPrisma } from '@daibilet/db';

// Input is the reviewed dry-run's STAND_BY event IDs, one per line.
const [idsPath, mode] = process.argv.slice(2);
if (!idsPath || !['--dry-run', '--apply'].includes(mode || '')) {
  throw new Error('Usage: tsx mark-expired-single-nonindexable.ts <ids-file> <--dry-run|--apply>');
}

const expected = readFileSync(idsPath, 'utf8').split(/\r?\n/).map((id) => id.trim()).filter(Boolean).sort();
if (expected.length !== 226 || new Set(expected).size !== expected.length) {
  throw new Error(`Expected 226 distinct reviewed IDs, got ${expected.length}`);
}

const cutoff = new Date();
const where = {
  kind: 'SINGLE' as const,
  status: 'READY' as const,
  sourceStatus: 'STAND_BY',
  isIndexable: true,
  sessions: {
    some: { startsAt: { lt: cutoff } },
    none: { OR: [{ startsAt: { gte: cutoff } }, { startsAt: null }] },
  },
};

try {
  await prisma.$transaction(async (tx) => {
    const current = (await tx.event.findMany({ where, select: { id: true } })).map((row) => row.id).sort();
    if (current.length !== expected.length || current.some((id, index) => id !== expected[index])) {
      throw new Error(`Dry-run mismatch: expected ${expected.length} IDs, current ${current.length}; no writes made`);
    }
    if (mode === '--dry-run') {
      console.log(JSON.stringify({ mode: 'dry-run', count: current.length, cutoff: cutoff.toISOString() }));
      return;
    }
    const result = await tx.event.updateMany({ where: { ...where, id: { in: expected } }, data: { isIndexable: false } });
    if (result.count !== expected.length) throw new Error(`Updated ${result.count}, expected ${expected.length}`);
    console.log(JSON.stringify({ mode: 'apply', updated: result.count, cutoff: cutoff.toISOString() }));
  }, { isolationLevel: 'Serializable', timeout: 30_000 });
} finally {
  await disconnectPrisma();
}

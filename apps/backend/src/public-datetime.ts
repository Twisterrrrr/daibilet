const MOSCOW_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

// Prisma interprets PostgreSQL timestamp-without-time-zone as UTC. Imports store
// Moscow wall time, so convert the preserved clock components to the real UTC instant.
export function prismaWallTimeToUtc(value: Date): Date {
  return new Date(value.getTime() - MOSCOW_UTC_OFFSET_MS);
}

export function prismaWallTimeToIso(value?: Date | null): string | null {
  return value ? prismaWallTimeToUtc(value).toISOString() : null;
}

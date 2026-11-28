export type EventRedirectKind = 'slot' | 'legacy_slug' | 'tc_code' | 'cyrillic' | 'past_slot';

export type EventRedirectEntry = {
  sourcePath: string;
  eventId: string;
  kind: EventRedirectKind;
  status: 301 | 410;
  targetPath: string | null;
};

export type EventRedirectMap = {
  version: number;
  generatedAt: string | null;
  entries: EventRedirectEntry[];
};

const READABLE_EVENT_PATH = /^\/events\/[^/]+$/;
const OPAQUE_TOKEN = /[a-f0-9]{20,}/i;
const DATE_IN_SLUG = /\d{4}-\d{2}-\d{2}|\d{1,2}-\d{1,2}-\d{4}/;

/**
 * The canonical URL of an event group is a stable, human-readable slug:
 * no ticketscloud/teplohod code, no session date, no machine id. Slots and code
 * slugs are aliases that resolve to this one URL (noindex today, 301 at cutover).
 */
function isReadableCanonical(path: string): boolean {
  if (!READABLE_EVENT_PATH.test(path)) return false;
  const slug = path.slice('/events/'.length);
  return !OPAQUE_TOKEN.test(slug) && !DATE_IN_SLUG.test(slug);
}

/**
 * Pure validator for the committed `data/redirects/event-pdp-redirects.json`.
 * Returns a list of human-readable problems; empty list means valid. Used by the
 * CI test to lock the URL map and, later, by the proxy loader at runtime.
 */
export function validateEventRedirectMap(map: unknown): string[] {
  const errors: string[] = [];
  if (!map || typeof map !== 'object') return ['map must be an object'];
  const version = (map as { version?: unknown }).version;
  const rawEntries = (map as { entries?: unknown }).entries;
  if (version !== 1) errors.push(`unsupported version: ${String(version)}`);
  if (!Array.isArray(rawEntries)) {
    errors.push('entries must be an array');
    return errors;
  }

  const seenSources = new Set<string>();
  const redirectSources = new Set<string>();
  const links301: Array<{ sourcePath: string; targetPath: string }> = [];

  for (const [i, raw] of rawEntries.entries()) {
    const prefix = `entries[${i}]`;
    const e = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const sourcePath = typeof e.sourcePath === 'string' ? e.sourcePath : '';
    const eventId = typeof e.eventId === 'string' ? e.eventId : '';
    const kind = typeof e.kind === 'string' ? e.kind : '';
    const is301 = e.status === 301;
    const is410 = e.status === 410;
    const targetPath = typeof e.targetPath === 'string' ? e.targetPath : null;

    if (!sourcePath.startsWith('/events/')) errors.push(`${prefix}: sourcePath must start with /events/`);
    if (!eventId) errors.push(`${prefix}: eventId required`);
    if (!['slot', 'legacy_slug', 'tc_code', 'cyrillic', 'past_slot'].includes(kind)) errors.push(`${prefix}: invalid kind`);
    if (!is301 && !is410) {
      errors.push(`${prefix}: status must be 301 or 410`);
    } else if (is301) {
      if (!targetPath || !isReadableCanonical(targetPath)) {
        errors.push(`${prefix}: 301 targetPath must be a readable /events/ slug (no code/date)`);
      } else if (targetPath === sourcePath) {
        errors.push(`${prefix}: source and target must differ`);
      } else {
        redirectSources.add(sourcePath);
        links301.push({ sourcePath, targetPath });
      }
    } else if (targetPath !== null) {
      errors.push(`${prefix}: 410 must not set targetPath`);
    }

    if (seenSources.has(sourcePath)) errors.push(`${prefix}: duplicate sourcePath ${sourcePath}`);
    seenSources.add(sourcePath);
  }

  for (const { sourcePath, targetPath } of links301) {
    if (redirectSources.has(targetPath)) errors.push(`redirect chain: ${sourcePath} -> ${targetPath}`);
  }
  return errors;
}

export function resolveEventRedirect(entries: EventRedirectEntry[], pathname: string): EventRedirectEntry | null {
  return entries.find((entry) => entry.sourcePath === pathname) ?? null;
}

/** O(1) lookup index for the runtime proxy (the map can hold thousands of entries). */
export function buildEventRedirectIndex(entries: EventRedirectEntry[]): Map<string, EventRedirectEntry> {
  const index = new Map<string, EventRedirectEntry>();
  for (const entry of entries) {
    if (!index.has(entry.sourcePath)) index.set(entry.sourcePath, entry);
  }
  return index;
}
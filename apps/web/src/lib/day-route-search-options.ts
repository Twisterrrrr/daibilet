export type DayRouteSearchOptionLike = {
  id: string;
  label: string;
  hint?: string | null;
  imageUrl?: string | null;
  disabled?: boolean;
  disabledReason?: string | null;
};

const DAY_ROUTE_SEARCH_DROPDOWN_LIMIT = 40;

/**
 * Cap dropdown rows without burying events: loc/ven/event: prefixes round-robin.
 * Untyped ids (legacy single-family selects) keep simple first-N slice.
 */
export function takeDayRouteSearchOptions<T extends DayRouteSearchOptionLike>(
  options: T[],
  limit = DAY_ROUTE_SEARCH_DROPDOWN_LIMIT,
): T[] {
  if (options.length <= limit) return options;
  const loc: T[] = [];
  const ven: T[] = [];
  const event: T[] = [];
  const other: T[] = [];
  for (const option of options) {
    if (option.id.startsWith('loc:')) loc.push(option);
    else if (option.id.startsWith('ven:')) ven.push(option);
    else if (option.id.startsWith('event:')) event.push(option);
    else other.push(option);
  }
  const typed = [loc, ven, event].filter((group) => group.length > 0);
  if (typed.length === 0) return options.slice(0, limit);

  const out: T[] = [];
  let row = 0;
  while (out.length < limit) {
    let added = false;
    for (const group of typed) {
      if (row < group.length && out.length < limit) {
        out.push(group[row]!);
        added = true;
      }
    }
    if (!added) break;
    row += 1;
  }
  for (const option of other) {
    if (out.length >= limit) break;
    out.push(option);
  }
  return out;
}

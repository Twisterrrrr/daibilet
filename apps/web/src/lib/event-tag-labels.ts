/** Unique chip labels by trim + case-insensitive key; first occurrence wins. */
export function uniqueEventTagLabels(labels: Iterable<unknown>, limit = 12): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of labels) {
    const label = String(raw ?? '').trim();
    if (!label) continue;
    const key = label.toLocaleLowerCase('ru');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
    if (result.length >= limit) break;
  }
  return result;
}

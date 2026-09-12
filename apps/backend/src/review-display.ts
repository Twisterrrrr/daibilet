/** Display helpers for public review surfaces (no full FIO / ticket leak). */

export function formatReviewDisplayName(fullName: string): string {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'Гость';
  const first = parts[0] ?? 'Гость';
  if (parts.length === 1) return first;
  const last = parts[parts.length - 1];
  if (!last) return first;
  const lastInitial = last.charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

/** Mask ticket/order refs for any accidental public exposure. */
export function maskPurchaseRef(ref: string | null | undefined): string | null {
  const value = String(ref || '').trim();
  if (!value) return null;
  if (value.length <= 4) return `••${value}`;
  return `•••${value.slice(-4)}`;
}

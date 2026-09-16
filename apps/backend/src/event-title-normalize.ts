/**
 * Event title normalization for public catalog display.
 * Import scripts use the CJS mirror in scripts/lib/event-title-normalize.js — keep in sync.
 */

function normalizeWhitespace(value: string | null | undefined): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function capitalizeFirstLetter(value: string | null | undefined): string {
  const text = normalizeWhitespace(value);
  if (!text) return text;

  const index = text.search(/\p{L}/u);
  if (index < 0) return text;

  return text.slice(0, index) + text.charAt(index).toLocaleUpperCase('ru-RU') + text.slice(index + 1);
}

export function formatPublicEventTitle(value: string | null | undefined): string {
  return capitalizeFirstLetter(value);
}

export function normalizeImportEventTitle(value: string | null | undefined): string {
  return capitalizeFirstLetter(value);
}

export { normalizeWhitespace, capitalizeFirstLetter };

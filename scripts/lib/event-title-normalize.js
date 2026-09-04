/**
 * Event title normalization for import and public catalog display.
 * Backend mirror: apps/backend/src/event-title-normalize.ts — keep in sync.
 */

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function capitalizeFirstLetter(value) {
  const text = normalizeWhitespace(value);
  if (!text) return text;

  const index = text.search(/\p{L}/u);
  if (index < 0) return text;

  return (
    text.slice(0, index) +
    text.charAt(index).toLocaleUpperCase('ru-RU') +
    text.slice(index + 1)
  );
}

/** Public catalog / event page display title. */
function formatPublicEventTitle(value) {
  return capitalizeFirstLetter(value);
}

/** Source title before Event upsert on import sync. */
function normalizeImportEventTitle(value) {
  return capitalizeFirstLetter(value);
}

module.exports = {
  normalizeWhitespace,
  capitalizeFirstLetter,
  formatPublicEventTitle,
  normalizeImportEventTitle,
};

const DISCO_PARTY_RE =
  /(?:^|[\s"'«(])дискотек|вечеринк|ди[\s-]?джей|\bdj\b|disco[\s-]?party|party[\s-]?boat|ля[\s-]?музон/i;

const DISCO_PARTY_TAG_RE = /дискотек|вечеринк|dj|ди-джей/i;

function normalizeHaystack(parts) {
  return parts
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value || '').replace(/<[^>]+>/g, ' '))
    .join(' ')
    .toLowerCase();
}

function isDiscoOrPartyEvent(input = {}) {
  const haystack = normalizeHaystack([
    input.title,
    input.name,
    input.place,
    input.description,
    input.category,
    ...(input.tags || []).map((tag) => (typeof tag === 'string' ? tag : tag?.name || tag?.title)),
    ...(input.features || []).map((feature) => feature?.title),
  ]);
  return DISCO_PARTY_RE.test(haystack);
}

function isDiscoOrPartyTag(title) {
  return DISCO_PARTY_TAG_RE.test(String(title || '').toLowerCase());
}

const ENTERTAINMENT_DISCO_TAXONOMY = {
  categoryId: 'cat_entertainment',
  subcategoryId: 'sub_entertainment_fun',
};

module.exports = {
  DISCO_PARTY_RE,
  DISCO_PARTY_TAG_RE,
  ENTERTAINMENT_DISCO_TAXONOMY,
  isDiscoOrPartyEvent,
  isDiscoOrPartyTag,
};

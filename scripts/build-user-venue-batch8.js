const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'data/venue-content-user-batch8-source.txt');
const prodPath = path.join(__dirname, 'data/venues-without-description-prod.json');
const outPath = path.join(__dirname, 'data/venue-content-user-batch8.json');

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/["«»]/g, '')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortFromDescription(text, max = 220) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const last = slice.lastIndexOf('. ');
  return (last > max * 0.55 ? slice.slice(0, last + 1) : `${slice.trim()}…`).trim();
}

function parseSource(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|');
      if (parts.length < 3) throw new Error(`Bad line: ${line}`);
      const [title, city, ...rest] = parts;
      return { title: title.trim(), city: city.trim(), description: rest.join('|').trim() };
    });
}

function scoreMatch(entry, venue) {
  const entryTitle = normalizeKey(entry.title);
  const venueTitle = normalizeKey(venue.name || venue.title);
  const entryCity = normalizeKey(entry.city);
  const venueCity = normalizeKey(venue.city);

  if (entryCity && venueCity && entryCity !== venueCity) {
    if (!(entryCity === 'москва' && venueCity.includes('московск'))) return -1;
  }

  if (entryTitle === venueTitle) return 100;
  if (venueTitle.includes(entryTitle) || entryTitle.includes(venueTitle)) return 80;
  const entryTokens = entryTitle.split(' ').filter((t) => t.length >= 4);
  const overlap = entryTokens.filter((t) => venueTitle.includes(t)).length;
  return overlap >= 2 ? 50 + overlap : -1;
}

function main() {
  const entries = parseSource(fs.readFileSync(sourcePath, 'utf8'));
  const prod = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
  const venues = prod.items;

  const matched = [];
  const unmatched = [];

  for (const entry of entries) {
    let best = null;
    let bestScore = -1;
    for (const venue of venues) {
      const score = scoreMatch(entry, venue);
      if (score > bestScore) {
        bestScore = score;
        best = venue;
      }
    }
    if (!best || bestScore < 50) {
      unmatched.push(entry);
      continue;
    }
    matched.push({
      id: best.id,
      title: best.name,
      city: entry.city,
      address: best.address || undefined,
      description: entry.description,
      shortDescription: shortFromDescription(entry.description),
      match: [entry.title],
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'user-batch8-venues-without-description',
    venues: matched,
  };

  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Matched: ${matched.length}/${entries.length}`);
  if (unmatched.length) {
    console.log('Unmatched:');
    for (const item of unmatched) console.log(`  - ${item.title} (${item.city})`);
  }
}

main();

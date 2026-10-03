#!/usr/bin/env node
/**
 * Inject curated lat/lng into significantSuburbs nested places in cityInfo.
 *
 *   node scripts/apply-suburb-nested-coords.js --dry-run
 *   node scripts/apply-suburb-nested-coords.js --apply
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dryRun = !process.argv.includes('--apply');
const pack = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'scripts/data/suburb-nested-coords.json'), 'utf8'),
);

const TARGETS = [
  'apps/web/src/lib/cityInfo.ts',
  'apps/public/src/lib/cityInfo.ts',
];

function parseTopLevelObjects(text) {
  const out = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push({ start, end: i + 1, text: text.slice(start, i + 1) });
        start = -1;
      }
    }
  }
  return out;
}

function extractName(objText) {
  const m = objText.match(/name:\s*'((?:\\'|[^'])*)'/);
  return m ? m[1] : null;
}

function findCityBlock(src, cityKey) {
  const markers = [`\n  '${cityKey}': {`, `\n  ${cityKey}: {`, `\n  "${cityKey}": {`];
  let cityIdx = -1;
  for (const marker of markers) {
    cityIdx = src.indexOf(marker);
    if (cityIdx >= 0) break;
  }
  if (cityIdx < 0) return null;
  const subIdx = src.indexOf('significantSuburbs:', cityIdx);
  if (subIdx < 0) return null;
  const endKeys = ['dayRoutePresets:', '\n    travel:', '\n    faq:'];
  let end = src.length;
  for (const k of endKeys) {
    const i = src.indexOf(k, subIdx + 1);
    if (i > 0 && i < end) end = i;
  }
  return { cityIdx, subIdx, end };
}

function injectCoords(objText, lat, lng) {
  if (/latitude\s*:/.test(objText)) {
    return {
      text: objText
        .replace(/latitude:\s*-?\d+(?:\.\d+)?/, `latitude: ${lat}`)
        .replace(/longitude:\s*-?\d+(?:\.\d+)?/, `longitude: ${lng}`),
      changed: true,
      mode: 'replace',
    };
  }
  // Insert before closing brace: `, latitude: X, longitude: Y`
  const trimmed = objText.replace(/\s*\}$/, '');
  const needsComma = !/,\s*$/.test(trimmed);
  const next = `${trimmed}${needsComma ? ',' : ''} latitude: ${lat}, longitude: ${lng} }`;
  return { text: next, changed: true, mode: 'insert' };
}

function applyToFile(relPath) {
  const abs = path.join(rootDir, relPath);
  let src = fs.readFileSync(abs, 'utf8');
  const byCity = new Map();
  for (const row of pack.places) {
    if (!byCity.has(row.city)) byCity.set(row.city, []);
    byCity.get(row.city).push(row);
  }

  let patched = 0;
  let missing = [];
  const edits = []; // {start,end,text} in original coords - apply from end

  for (const [cityKey, rows] of byCity) {
    const block = findCityBlock(src, cityKey);
    if (!block) {
      missing.push(...rows.map((r) => `${cityKey}: city block missing for ${r.name}`));
      continue;
    }
    const suburbsSlice = src.slice(block.subIdx, block.end);
    const arrStart = suburbsSlice.indexOf('[');
    const arrEnd = suburbsSlice.lastIndexOf(']');
    const arrBody = suburbsSlice.slice(arrStart + 1, arrEnd);
    const suburbs = parseTopLevelObjects(arrBody);
    const absArrBodyStart = block.subIdx + arrStart + 1;

    for (const row of rows) {
      let hit = null;
      for (const suburb of suburbs) {
        const suburbName = extractName(suburb.text);
        if (suburbName !== row.suburb) continue;
        const placesIdx = suburb.text.indexOf('places:');
        if (placesIdx < 0) continue;
        const after = suburb.text.slice(placesIdx);
        const lb = after.indexOf('[');
        let d = 0;
        let rb = -1;
        for (let i = lb; i < after.length; i++) {
          if (after[i] === '[') d++;
          else if (after[i] === ']') {
            d--;
            if (d === 0) {
              rb = i;
              break;
            }
          }
        }
        if (rb < 0) continue;
        const placesBody = after.slice(lb + 1, rb);
        const places = parseTopLevelObjects(placesBody);
        const placeAbsBase = absArrBodyStart + suburb.start + placesIdx + lb + 1;
        for (const place of places) {
          if (extractName(place.text) !== row.name) continue;
          hit = {
            absStart: placeAbsBase + place.start,
            absEnd: placeAbsBase + place.end,
            text: place.text,
          };
          break;
        }
        if (hit) break;
      }
      // Fallback: match by name only inside city suburbs
      if (!hit) {
        for (const suburb of suburbs) {
          const placesIdx = suburb.text.indexOf('places:');
          if (placesIdx < 0) continue;
          const after = suburb.text.slice(placesIdx);
          const lb = after.indexOf('[');
          let d = 0;
          let rb = -1;
          for (let i = lb; i < after.length; i++) {
            if (after[i] === '[') d++;
            else if (after[i] === ']') {
              d--;
              if (d === 0) {
                rb = i;
                break;
              }
            }
          }
          if (rb < 0) continue;
          const placesBody = after.slice(lb + 1, rb);
          const places = parseTopLevelObjects(placesBody);
          const placeAbsBase = absArrBodyStart + suburb.start + placesIdx + lb + 1;
          for (const place of places) {
            if (extractName(place.text) !== row.name) continue;
            hit = {
              absStart: placeAbsBase + place.start,
              absEnd: placeAbsBase + place.end,
              text: place.text,
            };
            break;
          }
          if (hit) break;
        }
      }
      if (!hit) {
        missing.push(`${cityKey} / ${row.suburb} / ${row.name}`);
        continue;
      }
      const next = injectCoords(hit.text, row.latitude, row.longitude);
      if (next.text !== hit.text) {
        edits.push({ start: hit.absStart, end: hit.absEnd, text: next.text });
        patched += 1;
      }
    }
  }

  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }

  if (!dryRun && edits.length) {
    fs.writeFileSync(abs, out);
  }

  return { file: relPath, patched, missing, editCount: edits.length };
}

const results = TARGETS.map(applyToFile);
console.log(JSON.stringify({ dryRun, results }, null, 2));
const miss = results.flatMap((r) => r.missing);
if (miss.length) {
  console.error('Missing:', miss.join('\n'));
  process.exitCode = 1;
}

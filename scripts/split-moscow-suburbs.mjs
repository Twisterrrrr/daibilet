/**
 * Split Moscow suburb inline objects into named exports for destination registry.
 */
import fs from 'node:fs';

const CARD_NAMES = [
  'SERGIEV_POSAD_SUBURB_CARD',
  'ISTRA_SUBURB_CARD',
  'KOLOMNA_SUBURB_CARD',
  'ZVENIGOROD_SUBURB_CARD',
  'ARHANGELSKOE_SUBURB_CARD',
  'ABRAMTSEVO_SUBURB_CARD',
  'BORODINO_SUBURB_CARD',
  'MELIHOVO_SUBURB_CARD',
];

function splitTopLevelArrayItems(source) {
  const items = [];
  let pos = 0;
  while (pos < source.length) {
    while (pos < source.length && /[\s,]/.test(source[pos])) pos++;
    if (pos >= source.length) break;

    const ch = source[pos];
    if (ch === '{') {
      let depth = 0;
      const start = pos;
      for (; pos < source.length; pos++) {
        const c = source[pos];
        if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) {
            pos++;
            items.push(source.slice(start, pos).trim());
            break;
          }
        }
      }
      continue;
    }

    const start = pos;
    while (pos < source.length && source[pos] !== ',') pos++;
    items.push(source.slice(start, pos).trim());
  }
  return items;
}

const raw = fs.readFileSync('apps/web/src/lib/moscow-suburbs.ts', 'utf8');
const marker = 'export const MOSCOW_SUBURBS_RAW';
const arrayStart = raw.indexOf(marker);
if (arrayStart < 0) throw new Error('MOSCOW_SUBURBS_RAW not found');
const open = raw.indexOf('= [', arrayStart);
if (open < 0) throw new Error('Array open not found');
const bracketOpen = open + 2;
const close = raw.lastIndexOf('\n];');
if (close <= bracketOpen) throw new Error('Array bounds not found');
const inner = raw.slice(bracketOpen + 1, close);
const items = splitTopLevelArrayItems(inner);

if (items.length !== CARD_NAMES.length) {
  console.error('Expected', CARD_NAMES.length, 'items, got', items.length);
  items.forEach((item, idx) => console.error(idx, item.slice(0, 60)));
  process.exit(1);
}

const header = `/** Moscow hub suburb cards (Golden Ring belt + estates). Hyphen-only copy. */
import type { CitySuburbItem } from './cityInfo.ts';

`;

const named = CARD_NAMES.map((constName, idx) => {
  return `export const ${constName}: CitySuburbItem = ${items[idx]};`;
});

const arrayExport = `
export const MOSCOW_SUBURBS: CitySuburbItem[] = [
  SERGIEV_POSAD_SUBURB_CARD,
  ISTRA_SUBURB_CARD,
  KOLOMNA_SUBURB_CARD,
  ZVENIGOROD_SUBURB_CARD,
  ARHANGELSKOE_SUBURB_CARD,
  ABRAMTSEVO_SUBURB_CARD,
  BORODINO_SUBURB_CARD,
  MELIHOVO_SUBURB_CARD,
];
`;

fs.writeFileSync('apps/web/src/lib/moscow-suburbs.ts', header + named.join('\n\n') + arrayExport);
console.log('OK', CARD_NAMES.length, 'cards + array');

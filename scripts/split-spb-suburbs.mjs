/**
 * Split SPB suburb inline objects into named exports for destination registry.
 */
import fs from 'node:fs';

const CARD_NAMES = [
  'PETERHOF_SUBURB_CARD',
  'PUSHKIN_SUBURB_CARD',
  'KRONSTADT_SUBURB_CARD',
  'GATCHINA_SUBURB_CARD',
  'PAVLOVSK_SUBURB_CARD',
  'ORANIENBAUM_SUBURB_CARD',
  'STRELNA_SUBURB_CARD',
  null, // vyborg slot
  'KURORT_COAST_SUBURB_CARD',
  'SHLISSELBURG_SUBURB_CARD',
  'SOSNOVY_BOR_SUBURB_CARD',
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

const raw = fs.readFileSync('apps/web/src/lib/saint-petersburg-suburbs.ts', 'utf8');
const marker = 'export const SAINT_PETERSBURG_SUBURBS';
const arrayStart = raw.indexOf(marker);
if (arrayStart < 0) throw new Error('SAINT_PETERSBURG_SUBURBS not found');
const open = raw.indexOf('= [', arrayStart);
if (open < 0) throw new Error('Array open not found');
const bracketOpen = open + 2;
const close = raw.lastIndexOf('\n];');
if (close <= bracketOpen) throw new Error('Array bounds not found');
const inner = raw.slice(bracketOpen + 1, close);
const items = splitTopLevelArrayItems(inner);

if (items.length !== 11) {
  console.error('Expected 11 items, got', items.length);
  items.forEach((item, idx) => console.error(idx, item.slice(0, 60)));
  process.exit(1);
}

const header = `/** SPB hub suburb cards (palace belt + coast). Hyphen-only copy. */
import type { CitySuburbItem } from './cityInfo.ts';

`;

const named = CARD_NAMES.map((constName, idx) => {
  const body = items[idx];
  if (!constName) {
    if (!body.includes('VYBORG')) throw new Error(`Item ${idx} should be VYBORG, got ${body.slice(0, 40)}`);
    return null;
  }
  return `export const ${constName}: CitySuburbItem = ${body};`;
}).filter(Boolean);

const builder = `
export function buildSaintPetersburgSuburbs(vyborgCard: CitySuburbItem): CitySuburbItem[] {
  return [
    PETERHOF_SUBURB_CARD,
    PUSHKIN_SUBURB_CARD,
    KRONSTADT_SUBURB_CARD,
    GATCHINA_SUBURB_CARD,
    PAVLOVSK_SUBURB_CARD,
    ORANIENBAUM_SUBURB_CARD,
    STRELNA_SUBURB_CARD,
    vyborgCard,
    KURORT_COAST_SUBURB_CARD,
    SHLISSELBURG_SUBURB_CARD,
    SOSNOVY_BOR_SUBURB_CARD,
  ];
}
`;

fs.writeFileSync('apps/web/src/lib/saint-petersburg-suburbs.ts', header + named.join('\n\n') + builder);
console.log('OK', named.length, 'cards + builder');

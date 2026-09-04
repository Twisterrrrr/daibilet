const fs = require('fs');
const path = require('path');

const importSnippet = `} from './krasnoyarsk-hub';
import {
  NOVOSIBIRSK_DAY_ROUTE_PRESETS,
  NOVOSIBIRSK_FAQ,
  NOVOSIBIRSK_MUST_SEE,
  NOVOSIBIRSK_SUBURBS,
  NOVOSIBIRSK_TRAVEL,
} from './novosibirsk-hub';`;

const block = `
  novosibirsk: {
    brief:
      'Неофициальная столица Сибири, стремительно выросшая посреди тайги до размеров третьего по величине мегаполиса страны. Город передовой науки, масштабной конструктивистской архитектуры и бьющей через край энергии.',
    hookFact:
      'А вы знали, что местный Новосибирский театр оперы и балета - самый большой театральный комплекс в России? Под его гигантским куполом мог бы полностью поместиться московский Большой театр вместе со всей прилегающей площадью.',
    mustSee: NOVOSIBIRSK_MUST_SEE as CityMustSeeItem[],
    significantSuburbs: NOVOSIBIRSK_SUBURBS as CitySuburbItem[],
    dayRoutePresets: NOVOSIBIRSK_DAY_ROUTE_PRESETS as CityDayRoutePreset[],
    travel: NOVOSIBIRSK_TRAVEL,
    faq: NOVOSIBIRSK_FAQ,
  },
  krasnoyarsk:`;

const re = /\n  novosibirsk: \{[\s\S]*?\n  \},\n  krasnoyarsk:/;

for (const rel of ['apps/web/src/lib/cityInfo.ts', 'apps/public/src/lib/cityInfo.ts']) {
  const file = path.join(process.cwd(), rel);
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes("from './novosibirsk-hub'")) {
    if (!s.includes("} from './krasnoyarsk-hub';")) {
      throw new Error('krasnoyarsk import missing in ' + rel);
    }
    s = s.replace("} from './krasnoyarsk-hub';", importSnippet);
  }
  if (!re.test(s)) throw new Error('novosibirsk block not found in ' + rel);
  s = s.replace(re, block);
  fs.writeFileSync(file, s);
  console.log('patched', rel);
}

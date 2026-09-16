import assert from 'node:assert/strict';
import test from 'node:test';

import { CITY_INFO, type CityMustSeeItem, type CitySuburbPlace } from './cityInfo.ts';
import { dayRouteStopPriceChipLabel } from './day-route-stop-types.ts';

/** Same pills as mustSeeFilterStopTypeTag - kept local so the audit does not load venue-meta. */
const STOP_TYPE_BY_FILTER: Record<string, string> = {
  main: 'Главное',
  gastro: 'Еда',
  museum: 'Музей',
  science: 'Семейное',
  literature: 'Литература',
  views: 'Смотровая',
  street: 'Прогулка',
  park: 'Парк',
  temple: 'Храм',
  creative: 'Арт-объект',
  secret: 'Необычное',
  houses: 'Архитектура',
  mansions: 'Особняк',
};

/** Places where «Вход свободный» would be a tourist trap. */
const MUST_NOT_CLAIM_FREE_RE =
  /ботаническ|оранжерей|зоопарк|океанариум|планетари|колоннад|лахта|смотров|петергоф|павловск|царск|кусков|царицын|гатчин|ораниенбаум|меншиков|фаберже|эрмитаж|исааки|кунсткамер|юсупов|канатно|телебашн|останкин|бункер|ледокол|аквапарк|дельфин|\bцирк|некропол|макет|крепост|замок|дворец|особняк|музей|галере|театр|усадьб|павильон|аврора|крейсер|лицей|аттракцион|диво-остров|дендрар|аптекарск|собор|храм|кирха|церковь|монастыр|лавр|дацан|чесменск|екатерининск|александрия|нижний парк|верхний сад|елагин/i;

type AuditRow = {
  city: string;
  source: string;
  name: string;
  tag: string | null;
  chip: string;
};

function chipForPlace(place: { name: string; mustSeeFilter?: string | null }): {
  tag: string | null;
  chip: string;
} {
  const tag = place.mustSeeFilter ? STOP_TYPE_BY_FILTER[place.mustSeeFilter] || null : null;
  const chip = dayRouteStopPriceChipLabel({ id: place.name, title: place.name }, tag);
  return { tag, chip };
}

function collectEditorialStops(): AuditRow[] {
  const rows: AuditRow[] = [];
  for (const [city, info] of Object.entries(CITY_INFO)) {
    for (const place of info.mustSee || []) {
      const { tag, chip } = chipForPlace(place);
      rows.push({ city, source: 'mustSee', name: place.name, tag, chip });
    }
    for (const preset of info.dayRoutePresets || []) {
      for (const stop of preset.stops || []) {
        const { tag, chip } = chipForPlace(stop);
        rows.push({
          city,
          source: `preset:${preset.id}`,
          name: stop.name,
          tag,
          chip,
        });
      }
    }
    for (const suburb of info.significantSuburbs || []) {
      const suburbPlace: CityMustSeeItem = suburb;
      const { tag, chip } = chipForPlace(suburbPlace);
      rows.push({ city, source: `suburb:${suburb.name}`, name: suburb.name, tag, chip });
      for (const nested of (suburb.places || []) as CitySuburbPlace[]) {
        const { tag: nestedTag, chip: nestedChip } = chipForPlace(nested);
        rows.push({
          city,
          source: `suburb:${suburb.name}/place`,
          name: nested.name,
          tag: nestedTag,
          chip: nestedChip,
        });
      }
    }
  }
  return rows;
}

test('editorial must-see, presets and suburbs never claim free entry for paid-looking places', () => {
  const rows = collectEditorialStops();
  assert.ok(rows.length > 100, `expected a full editorial sweep, got ${rows.length}`);
  const lies = rows.filter(
    (row) => row.chip === 'Вход свободный' && MUST_NOT_CLAIM_FREE_RE.test(row.name),
  );
  assert.deepEqual(
    lies,
    [],
    lies.map((row) => `${row.city} ${row.source}: ${row.name} [${row.tag}]`).join('\n'),
  );
});

test('park/temple tags alone do not invent free entry', () => {
  assert.equal(dayRouteStopPriceChipLabel({ id: 'p', title: 'Летний сад' }, 'Парк'), '');
  assert.equal(dayRouteStopPriceChipLabel({ id: 't', title: 'Смольный собор' }, 'Храм'), '');
});

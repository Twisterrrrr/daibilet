import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const webCityInfo = readFileSync(join(dir, 'cityInfo.ts'), 'utf8');
const publicCityInfo = readFileSync(
  join(dir, '../../../public/src/lib/cityInfo.ts'),
  'utf8',
);
const editorial = readFileSync(join(dir, 'city-place-coords.ts'), 'utf8');

const SPOTS = [
  {
    slug: 'ermitazh',
    lat: '59.939864',
    lng: '30.314566',
    cityNeedle:
      "venueSlug: 'ermitazh', address: 'Дворцовая наб., 34', latitude: 59.939864, longitude: 30.314566",
  },
  {
    slug: 'saint-petersburg-petropavlovskaya-krepost',
    lat: '59.950239',
    lng: '30.316472',
    cityNeedle:
      "locationSlug: 'saint-petersburg-petropavlovskaya-krepost', address: 'Территория Петропавловская Крепость, 3', latitude: 59.950239, longitude: 30.316472",
  },
  {
    slug: 'saint-petersburg-mednyy-vsadnik',
    lat: '59.936384',
    lng: '30.302194',
    cityNeedle:
      "locationSlug: 'saint-petersburg-mednyy-vsadnik', address: 'Сенатская площадь', latitude: 59.936384, longitude: 30.302194",
  },
];

test('SPB owner editor coords: Hermitage, Peter-Paul, Bronze Horseman', () => {
  for (const spot of SPOTS) {
    assert.ok(webCityInfo.includes(spot.cityNeedle), `web cityInfo missing ${spot.slug}`);
    assert.ok(publicCityInfo.includes(spot.cityNeedle), `public cityInfo missing ${spot.slug}`);
    const editorialNeedle = `'${spot.slug}': { latitude: ${spot.lat}, longitude: ${spot.lng} }`;
    assert.ok(editorial.includes(editorialNeedle), `editorial missing ${spot.slug}`);
  }

  assert.match(
    webCityInfo,
    /name: 'Открытые дворы-колодцы \(экскурсии по дворам\)'[\s\S]{0,220}?locationSlug: 'saint-petersburg-otkrytye-dvory-kolodtsy-ekskursii-po-dvoram'\s*\}/,
  );
  assert.match(
    webCityInfo,
    /name: 'Булочная Ф\. Вольчека'[\s\S]{0,280}?locationSlug: 'saint-petersburg-bulochnaya-f-volcheka'\s*\}/,
  );
});

const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:4000${path}`, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

const BUS_RE =
  /автобус|автобусн|hop[\s-]?on|hop[\s-]?off|city[\s-]?sightseeing|city[\s-]?tour|сити[\s-]?тур|двухэтажн|садись[\s-]?руляй/i;

(async () => {
  const catalog = [];
  for (let offset = 0; offset < 600; offset += 120) {
    const j = await get(`/api/public/events?limit=120&offset=${offset}&refresh=1`);
    const items = j.sessions || j.items || [];
    if (!items.length) break;
    catalog.push(...items);
  }

  const busCatalog = catalog.filter((s) => BUS_RE.test([s.title, s.category, ...(s.tags || []), ...(s.subcategories || []), s.venue].join(' ')));
  const landing = await get('/api/public/events?landing=bus-tours&limit=200&refresh=1');
  const landingItems = landing.sessions || landing.items || [];
  const venues = await get('/api/public/venues?limit=500&refresh=1');
  const venueItems = venues.venues || venues.items || [];
  const busVenues = venueItems.filter((v) => v.type === 'bus' || v.kind === 'bus');

  const landingIds = new Set(landingItems.map((s) => s.groupKey || s.id));
  const notOnLanding = busCatalog.filter((s) => !landingIds.has(s.groupKey || s.id));

  console.log('=== Сводка автобусных экскурсий ===');
  console.log(`Каталог (все сессии): ${catalog.length}`);
  console.log(`Bus-like в каталоге: ${busCatalog.length} уник. продуктов`);
  console.log(`Лендинг /bus-tours: ${landingItems.length}`);
  console.log(`Страницы /locations тип bus: ${busVenues.length}`);
  console.log('\nНа лендинге:');
  for (const s of landingItems) console.log(`  • ${s.city} | ${(s.title || '').slice(0, 72)}`);
  console.log('\nВ каталоге, но НЕ на лендинге:');
  for (const s of notOnLanding) console.log(`  • ${s.city} | ${(s.title || '').slice(0, 72)}`);
  console.log('\nBus-локации:');
  for (const v of busVenues) console.log(`  • ${v.events || 0} ev | ${v.city} | ${(v.name || v.title || '').slice(0, 65)}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

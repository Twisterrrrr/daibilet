const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:4000${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

const busRe = /автобус|hop[\s-]?on|city[\s-]?tour|сити[\s-]?тур|yutong|двухэтаж/i;

(async () => {
  const all = await get('/api/public/events?limit=500&refresh=1');
  const landing = await get('/api/public/events?landing=bus-tours&limit=200&refresh=1');
  const venues = await get('/api/public/venues?limit=500&refresh=1');
  const items = all.items || all.sessions || [];
  const bus = items.filter((s) => busRe.test([s.title, s.category, s.venue, ...(s.tags || [])].join(' ')));
  const landingItems = landing.items || landing.sessions || [];
  const busLocs = (venues.venues || []).filter((v) => v.type === 'bus');

  console.log('Catalog total:', all.total, '| fetched:', items.length);
  console.log('Bus-like in catalog:', bus.length);
  console.log('Unique bus products:', new Set(bus.map((s) => s.title)).size);
  console.log('\nProducts:');
  for (const title of [...new Set(bus.map((s) => s.title))].sort()) {
    const sample = bus.find((s) => s.title === title);
    console.log(` - ${sample.city} | ${title.slice(0, 95)}`);
  }

  console.log('\nVenues used by bus tours:');
  for (const venue of [...new Set(bus.map((s) => s.venue).filter(Boolean))].sort()) {
    console.log(` - ${venue}`);
  }

  console.log('\nLanding bus-tours:', landingItems.length);
  console.log('Bus location pages (/locations):', busLocs.length);

  const landingIds = new Set(landingItems.map((s) => s.id));
  const missing = bus.filter((s) => !landingIds.has(s.id));
  if (missing.length) {
    console.log('\nIn catalog but not on landing:');
    for (const s of missing) console.log(` - ${s.city} | ${s.title.slice(0, 80)}`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

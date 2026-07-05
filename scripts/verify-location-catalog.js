const http = require('http');

function fetchJson(path) {
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

(async () => {
  const catalog = await fetchJson('/api/public/venues?limit=500&refresh=1');
  const locations = (catalog.venues || []).filter((v) => v.template === 'location');
  const zero = locations.filter((v) => !v.events);
  const buses = locations.filter((v) => v.type === 'bus');
  const piers = locations.filter((v) => v.type === 'pier');

  console.log('Locations total:', locations.length);
  console.log('With zero events:', zero.length);
  console.log('Bus type:', buses.length);
  console.log('Pier type:', piers.length);
  console.log('Type stats:', catalog.stats?.types || {});

  if (buses.length) {
    console.log('\nSample bus locations:');
    for (const row of buses.slice(0, 8)) {
      console.log(`  ${row.events} ev | ${row.name}`);
    }
  }

  if (zero.length) {
    console.log('\nZero-event locations still visible:');
    for (const row of zero.slice(0, 5)) console.log(`  ${row.name}`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

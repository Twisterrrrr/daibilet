const http = require('http');

const slugs = [
  'гбук-рт-государственныи-большои-концертныи-зал-имени-салиха-саидашева-63cb89057ad8e1bcd59fe024',
  'ресторан-максимилианс-5cb872663ef8f5000bc634bd',
  'театр-лицедеи-5f8e0e0e0e0e0e0e0e0e0e0e',
];

function fetch(slug) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:4000/api/public/venues/${encodeURIComponent(slug)}?refresh=1`, (res) => {
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
  const checks = [
    ['гбук-рт-государственныи-большои-концертныи-зал-имени-салиха-саидашева-63cb89057ad8e1bcd59fe024', 'Казань', 'Свободы'],
    ['ресторан-максимилианс-5cb872663ef8f5000bc634bd', 'Екатеринбург', 'Куйбышева'],
    ['ресторан-максимилианс-629310d2b0a8b47d0a47e0e7', 'Казань', 'Спартаковская'],
  ];

  for (const [slug, expectCity, expectAddr] of checks) {
    const data = await fetch(slug);
    const ok = (data.city || '').includes(expectCity) && (data.address || '').includes(expectAddr);
    console.log(`${ok ? 'OK' : 'FAIL'} ${data.name || slug}`);
    console.log(`  city=${data.city} address=${data.address}`);
    console.log(`  short=${(data.shortDescription || '').slice(0, 80)}`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

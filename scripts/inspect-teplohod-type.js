const http = require('http');

http.get('http://127.0.0.1:4000/api/public/venues?limit=500&q=Teplohod&refresh=1', (res) => {
  let body = '';
  res.on('data', (c) => { body += c; });
  res.on('end', () => {
    const data = JSON.parse(body);
    for (const v of data.venues || []) {
      console.log(JSON.stringify({ type: v.type, events: v.events, name: v.name, address: v.address }, null, 2));
    }
  });
});

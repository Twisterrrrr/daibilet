import fs from 'fs';

const seedPath = 'docs/drafts/moscow-must-see-seed-draft.json';
const unionPath = 'docs/drafts/moscow-must-see-union.json';
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const union = JSON.parse(fs.readFileSync(unionPath, 'utf8'));

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fix(doc, label) {
  const hubIdx = doc.hub_only.findIndex((x) => /булгак/i.test(x.name));
  const insIdx = doc.inserts.findIndex((x) => /булгак/i.test(x.name));
  if (hubIdx < 0 || insIdx < 0) {
    console.log(label, 'skip: hub', hubIdx, 'ins', insIdx);
    return;
  }
  const hub = doc.hub_only[hubIdx];
  const ins = doc.inserts[insIdx];
  const dumpLat = ins.latitude ?? ins.lat;
  const dumpLon = ins.longitude ?? ins.lon;
  const hubLat = hub.latitude ?? hub.lat;
  const hubLon = hub.longitude ?? hub.lon;
  const dumpOffsetM = Math.round(haversine(dumpLat, dumpLon, hubLat, hubLon));

  const expand = {
    role: 'expand',
    name: ins.name,
    hubName: hub.name,
    latitude: hubLat,
    longitude: hubLon,
    distM: 0,
    dumpOffsetM,
    dumpLat,
    dumpLon,
    address: hub.address || null,
    geocoded: true,
    note: 'same complex as hub Bulgakov museum; insert->expand, hub_only removed',
    type: ins.type || 'museum',
    mustSeeFilter: ins.mustSeeFilter || 'museum',
    locationSlug: ins.locationSlug,
    desc: ins.desc,
    descStatus: ins.descStatus,
    photoStatus: ins.photoStatus,
  };
  Object.keys(expand).forEach((k) => expand[k] === undefined && delete expand[k]);

  doc.inserts.splice(insIdx, 1);
  doc.hub_only.splice(hubIdx, 1);
  doc.expands.push(expand);

  if (Array.isArray(doc.items)) {
    doc.items = doc.items.filter(
      (x) => !/булгак/i.test(x.name) && !/булгак/i.test(x.hubName || ''),
    );
    doc.items.push({ ...expand, role: 'expand' });
  }

  doc.expandCount = doc.expands.length;
  doc.insertCount = doc.inserts.length;
  doc.hubOnlyCount = doc.hub_only.length;
  doc.unionCount = doc.expandCount + doc.insertCount + doc.hubOnlyCount;
  doc.generatedAt = new Date().toISOString();
  console.log(label, '-> expand', expand.name, 'hub', expand.hubName, 'dumpOffsetM', dumpOffsetM);
  console.log(label, 'counts', doc.expandCount, doc.insertCount, doc.hubOnlyCount, 'sum', doc.unionCount);
}

fix(seed, 'seed');
fix(union, 'union');

fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
fs.writeFileSync(unionPath, JSON.stringify(union, null, 2) + '\n');
console.log('written');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'tc-import-catalog.js'), 'utf8');
const venueUpsert = source.match(/insert into "Venue" \(([\s\S]*?)returning id/i)?.[0];

test('Ticketscloud inserts new venues as noindex and preserves existing editorial indexability', () => {
  assert.ok(venueUpsert, 'Venue upsert SQL must remain detectable');
  assert.match(venueUpsert, /"isIndexable"[\s\S]*?values[\s\S]*?false/i);
  const conflictUpdate = venueUpsert.split(/on conflict \(id\) do update set/i)[1];
  assert.ok(conflictUpdate, 'Venue upsert must keep its conflict update');
  assert.doesNotMatch(conflictUpdate, /"isIndexable"\s*=/i);
  assert.match(conflictUpdate, /"pageStatus"\s*=\s*case/i);
});

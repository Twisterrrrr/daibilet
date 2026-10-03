import assert from 'node:assert/strict';
import test from 'node:test';

import { takeDayRouteSearchOptions } from './day-route-search-options.ts';

type Opt = { id: string; label: string };

function opt(id: string, label: string): Opt {
  return { id, label };
}

test('takeDayRouteSearchOptions round-robins loc/ven/event so events are not buried', () => {
  const options: Opt[] = [];
  for (let i = 0; i < 30; i++) options.push(opt(`loc:${i}`, `Loc ${i}`));
  for (let i = 0; i < 30; i++) options.push(opt(`ven:${i}`, `Ven ${i}`));
  for (let i = 0; i < 30; i++) options.push(opt(`event:${i}`, `Event ${i}`));

  const taken = takeDayRouteSearchOptions(options, 40);
  assert.equal(taken.length, 40);
  const events = taken.filter((o) => o.id.startsWith('event:'));
  const locs = taken.filter((o) => o.id.startsWith('loc:'));
  const vens = taken.filter((o) => o.id.startsWith('ven:'));
  assert.ok(events.length >= 10, `expected events in top 40, got ${events.length}`);
  assert.ok(locs.length >= 10);
  assert.ok(vens.length >= 10);
});

test('takeDayRouteSearchOptions falls back to slice for untyped ids', () => {
  const options = Array.from({ length: 50 }, (_, i) => opt(`plain-${i}`, `P ${i}`));
  const taken = takeDayRouteSearchOptions(options, 40);
  assert.equal(taken.length, 40);
  assert.equal(taken[0]?.id, 'plain-0');
  assert.equal(taken[39]?.id, 'plain-39');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { disconnectPrisma } from '@daibilet/db';
import { buildAdminSourcesDto } from './admin-sources.dto.js';

test('builds source counts and independent sync families from PostgreSQL', async () => {
  try {
    const payload = await buildAdminSourcesDto(new Date('2026-07-02T12:00:00.000Z'));

    assert.ok(payload.sources.length > 0);
    assert.equal(
      payload.metrics.events,
      payload.sources.reduce((sum, source) => sum + source.counts.groupedEvents, 0),
    );
    assert.equal(
      payload.metrics.sessions,
      payload.sources.reduce((sum, source) => sum + source.counts.sessions, 0),
    );

    for (const source of payload.sources) {
      assert.ok(source.counts.sourceEvents >= source.counts.groupedEvents);
      if (source.catalogSync) assert.doesNotMatch(source.catalogSync.mode, /orders?|polling/i);
      if (source.ordersSync) assert.match(source.ordersSync.mode, /orders?|polling/i);
    }
  } finally {
    await disconnectPrisma();
  }
});

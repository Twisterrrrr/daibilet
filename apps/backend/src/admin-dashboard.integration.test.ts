import assert from 'node:assert/strict';
import test from 'node:test';
import { disconnectPrisma } from '@daibilet/db';
import { buildAdminDashboardDto } from './admin-dashboard.dto.js';
import { createDb, disconnectDb } from './db.js';
import { buildAdminDashboard } from './dto.js';

test('keeps typed dashboard grouping and launch blockers aligned with legacy', async () => {
  try {
    const [typed, legacy] = await Promise.all([
      buildAdminDashboardDto(),
      buildAdminDashboard(createDb(process.cwd().replace(/[\\/]apps[\\/]backend$/, ''))),
    ]);

    assert.equal(typed.metrics.events, legacy.metrics.events);
    assert.equal(typed.metrics.venues, legacy.metrics.venues);
    assert.equal(typed.metrics.landingRules, legacy.metrics.landingRules);
    assert.equal(typed.metrics.destinations, legacy.metrics.destinations);
    assert.equal(typed.metrics.launch.groupedEvents, legacy.metrics.launch.groupedEvents);
    assert.equal(typed.metrics.launch.priceBlocked, legacy.metrics.launch.priceBlocked);
    assert.equal(typed.metrics.launch.purchaseBlocked, legacy.metrics.launch.purchaseBlocked);
    assert.equal(typed.metrics.launch.noImage, legacy.metrics.launch.noImage);
    assert.equal(typed.metrics.launch.landingMatched, legacy.metrics.launch.landingMatched);

    // Typed readiness rejects past-only groups; legacy only checked that a date existed.
    assert.ok(typed.metrics.launch.readyForSales <= legacy.metrics.launch.readyForSales);
    assert.ok(Math.abs(typed.metrics.readyEvents - legacy.metrics.readyEvents) <= 5);
  } finally {
    await Promise.all([disconnectPrisma(), disconnectDb()]);
  }
});

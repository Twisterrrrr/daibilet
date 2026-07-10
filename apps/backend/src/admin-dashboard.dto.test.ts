import assert from 'node:assert/strict';
import test from 'node:test';
import { mapDashboardGroups, type DashboardGroupRow } from './admin-dashboard.dto.js';

test('marks a complete group ready for sales and SEO', () => {
  const metrics = mapDashboardGroups([group({
    title: 'Речная прогулка по Неве',
    category: 'Экскурсии',
    city: 'Санкт-Петербург',
    tags: ['Речные прогулки'],
    subcategories: ['Водные экскурсии'],
    anyExplicitPurchase: true,
    allExplicitPurchase: true,
  })], {
    ticketscloudWidgetConfigured: false,
    teplohodWidgetConfigured: false,
  });

  assert.equal(metrics.readyForSeo, 1);
  assert.equal(metrics.blockedEvents, 0);
  assert.equal(metrics.launch.readyForSales, 1);
  assert.equal(metrics.launch.landingMatched, 1);
});

test('does not accept provider identity without the matching widget configuration', () => {
  const candidate = group({
    anyExplicitPurchase: false,
    allExplicitPurchase: false,
    anyPurchaseIdentity: true,
    allPurchasePotential: true,
  });

  const withoutWidget = mapDashboardGroups([candidate], {
    ticketscloudWidgetConfigured: false,
    teplohodWidgetConfigured: false,
  });
  const withWidget = mapDashboardGroups([candidate], {
    ticketscloudWidgetConfigured: true,
    teplohodWidgetConfigured: false,
  });

  assert.equal(withoutWidget.launch.purchaseBlocked, 1);
  assert.equal(withoutWidget.launch.readyForSales, 0);
  assert.equal(withWidget.launch.purchaseBlocked, 0);
  assert.equal(withWidget.launch.readyForSales, 1);
});

test('keeps high readiness blockers separate from card-level image metric', () => {
  const metrics = mapDashboardGroups([group({
    allFuture: false,
    allVenue: false,
    anyImage: false,
    allImage: false,
  })], {
    ticketscloudWidgetConfigured: true,
    teplohodWidgetConfigured: true,
  });

  assert.equal(metrics.blockedEvents, 1);
  assert.equal(metrics.readyForSeo, 0);
  assert.equal(metrics.launch.noImage, 1);
  assert.equal(metrics.launch.needsAttention, 1);
});

function group(overrides: Partial<DashboardGroupRow> = {}): DashboardGroupRow {
  return {
    groupKey: 'ticketscloud|event|moscow|venue',
    sourceCode: 'TICKETSCLOUD',
    title: 'Событие',
    city: 'Москва',
    venue: 'Площадка',
    category: 'Мероприятия',
    priceFromRub: 500,
    nextStartsAt: new Date('2026-07-03T12:00:00.000Z'),
    anyFuture: true,
    allFuture: true,
    anyOffers: true,
    allOffers: true,
    anyExplicitPurchase: false,
    allExplicitPurchase: false,
    anyPurchaseIdentity: true,
    allPurchasePotential: true,
    allPrice: true,
    allCategory: true,
    allSubcategory: true,
    allVenue: true,
    allDescription: true,
    anyImage: true,
    allImage: true,
    allStatusReady: true,
    tags: [],
    subcategories: [],
    ...overrides,
  };
}

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeCapabilities,
  resolveSupplierIntegrationCapabilities,
} from './supplier-integration-capabilities.js';

test('keeps unknown supplier integration capabilities disabled by default', () => {
  const descriptor = resolveSupplierIntegrationCapabilities('unknown_partner');

  assert.equal(descriptor.providerCode, 'UNKNOWN_PARTNER');
  assert.equal(descriptor.providerClass, 'CUSTOM_PARTNER');
  assert.equal(Object.values(descriptor.capabilities).every((value) => value === false), true);
});

test('exposes imported ticketing system as read and widget capable only', () => {
  const descriptor = resolveSupplierIntegrationCapabilities('TICKETSCLOUD');

  assert.equal(descriptor.providerClass, 'IMPORTED_TICKETING_SYSTEM');
  assert.equal(descriptor.capabilities.eventsRead, true);
  assert.equal(descriptor.capabilities.sessionsRead, true);
  assert.equal(descriptor.capabilities.widgetPurchase, true);
  assert.equal(descriptor.capabilities.eventsWrite, false);
  assert.equal(descriptor.capabilities.internalCheckout, false);
});

test('ignores unknown override keys while merging capabilities', () => {
  const capabilities = mergeCapabilities({
    eventsRead: true,
    internalCheckout: true,
    missingCapability: true,
  } as never);

  assert.equal(capabilities.eventsRead, true);
  assert.equal(capabilities.internalCheckout, true);
  assert.equal((capabilities as Record<string, unknown>).missingCapability, undefined);
});

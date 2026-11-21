import assert from 'node:assert/strict';
import test from 'node:test';

/** Mirrors isTransportVehicleVenueName in dto.js (fleet junk detector). */
function isTransportVehicleVenueName(name) {
  const text = String(name || '').trim();
  if (!text) return false;
  if (/^yutong\b|^маз\b|^паз\b|^hyundai\b|^mercedes\b|^volvo\b|^man\b|^ikarus\b/i.test(text)) return true;
  if (/^[a-zа-яё][a-zа-яё-]{0,20}\s?\d{3,5}$/i.test(text) && text.length <= 28) return true;
  return false;
}

test('fleet junk regex rejects multi-word venue titles with a year', () => {
  assert.equal(isTransportVehicleVenueName('Модная среда 1823'), false);
  assert.equal(isTransportVehicleVenueName('Yutong 1234'), true);
  assert.equal(isTransportVehicleVenueName('маз1234'), true);
});

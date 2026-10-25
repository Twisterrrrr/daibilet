import assert from 'node:assert/strict';
import test from 'node:test';

import {
  admissionOffersToPayload,
  createAdmissionOfferFormValue,
} from './admission-offers.ts';

test('admissionOffersToPayload normalizes ticket categories', () => {
  const payload = admissionOffersToPayload([
    {
      key: 'adult',
      title: '  Взрослый  ',
      priceRub: '900',
      oldPriceRub: '1100',
      capacityTotal: '40',
      active: true,
    },
    {
      key: 'child',
      title: '',
      priceRub: '',
      oldPriceRub: '',
      capacityTotal: '',
      active: false,
    },
  ]);

  assert.deepEqual(payload, [
    {
      title: 'Взрослый',
      priceRub: 900,
      oldPriceRub: 1100,
      capacityTotal: 40,
      groupSize: 1,
      active: true,
    },
    {
      title: 'Билет',
      priceRub: 0,
      oldPriceRub: null,
      capacityTotal: null,
      groupSize: 1,
      active: false,
    },
  ]);
});

test('createAdmissionOfferFormValue creates independent rows', () => {
  const first = createAdmissionOfferFormValue();
  const second = createAdmissionOfferFormValue({ title: 'Льготный', priceRub: '300' });

  assert.notEqual(first.key, second.key);
  assert.equal(first.title, 'Взрослый');
  assert.equal(second.title, 'Льготный');
  assert.equal(second.priceRub, '300');
});

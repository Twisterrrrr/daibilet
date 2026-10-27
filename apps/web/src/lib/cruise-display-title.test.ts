import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatShipSecondaryLabel,
  resolveCruiseDisplayTitle,
} from './cruise-display-title.ts';

describe('resolveCruiseDisplayTitle', () => {
  it('keeps excursion title primary when ship is in tags', () => {
    const result = resolveCruiseDisplayTitle({
      title: 'Обед/Ужин на борту панорамного теплохода с видом на центр Москвы',
      tags: ['Теплоход: Ривер Палас (River Palace)', 'Ужин'],
    });
    assert.equal(result.shipName, 'Ривер Палас (River Palace)');
    assert.match(result.excursionTitle, /Обед|Ужин|видом/);
    assert.ok(!/Ривер Палас/i.test(result.excursionTitle));
  });

  it('extracts named ship from title and demotes it', () => {
    const result = resolveCruiseDisplayTitle({
      title:
        'Вечерняя прогулка на теплоходе «Муз-экспресс» с ужином и ди-джеем на борту',
      tags: [],
    });
    assert.equal(result.shipName, 'Муз-экспресс');
    assert.match(result.excursionTitle, /Вечерняя прогулка/i);
    assert.ok(!/Муз-экспресс/i.test(result.excursionTitle));
  });

  it('formats secondary ship label', () => {
    assert.equal(formatShipSecondaryLabel('Легенда'), 'Теплоход: Легенда');
    assert.equal(formatShipSecondaryLabel('Теплоход: Легенда'), 'Теплоход: Легенда');
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isAdminCenterVenueBreadcrumbCity,
  isMajorVenueBreadcrumbCity,
  resolveVenueBreadcrumbRegion,
} from './cityRegionHub.ts';

describe('venue breadcrumb region', () => {
  it('skips region for Moscow and Spb', () => {
    assert.equal(isMajorVenueBreadcrumbCity({ city: 'Москва', citySlug: 'moscow' }), true);
    assert.equal(isMajorVenueBreadcrumbCity({ city: 'Санкт-Петербург', citySlug: 'sankt-peterburg' }), true);
    assert.equal(
      resolveVenueBreadcrumbRegion({
        city: 'Москва',
        citySlug: 'moscow',
        regionSlug: 'moskovskaya-oblast',
        regionTitle: 'Московская область',
      }),
      null,
    );
  });

  it('skips region for admin centers including Tula', () => {
    assert.equal(
      isAdminCenterVenueBreadcrumbCity({
        city: 'Тула',
        citySlug: 'tula',
        regionSlug: 'tulskaya-oblast',
        regionTitle: 'Тульская область',
      }),
      true,
    );
    assert.equal(
      resolveVenueBreadcrumbRegion({
        city: 'Тула',
        citySlug: 'tula',
        regionSlug: 'tulskaya-oblast',
        regionTitle: 'Тульская область',
      }),
      null,
    );
    assert.equal(
      resolveVenueBreadcrumbRegion({
        city: 'Казань',
        citySlug: 'kazan',
        regionSlug: 'respublika-tatarstan',
        regionTitle: 'Республика Татарстан',
      }),
      null,
    );
  });

  it('uses API region for non-admin small towns', () => {
    assert.deepEqual(
      resolveVenueBreadcrumbRegion({
        city: 'Алексин',
        citySlug: 'aleksin',
        regionSlug: 'tulskaya-oblast',
        regionTitle: 'Тульская область',
      }),
      { slug: 'tulskaya-oblast', name: 'Тульская область' },
    );
  });

  it('falls back to null without API region (no hub-center auto-insert)', () => {
    assert.equal(resolveVenueBreadcrumbRegion({ city: 'Алексин', citySlug: 'aleksin' }), null);
    assert.equal(isAdminCenterVenueBreadcrumbCity({ city: 'Алексин', citySlug: 'aleksin' }), false);
  });
});

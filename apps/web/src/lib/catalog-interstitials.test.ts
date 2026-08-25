import { describe, expect, it } from 'vitest';

import { catalogInterstitialInterval } from '@/lib/catalog-interstitials';

describe('catalogInterstitialInterval', () => {
  it('inserts after full rows (2 rows × columns)', () => {
    expect(catalogInterstitialInterval(4)).toBe(8);
    expect(catalogInterstitialInterval(6)).toBe(12);
    expect(catalogInterstitialInterval(3)).toBe(6);
  });

  it('never returns less than one row', () => {
    expect(catalogInterstitialInterval(0)).toBe(2);
    expect(catalogInterstitialInterval(-1)).toBe(2);
  });
});

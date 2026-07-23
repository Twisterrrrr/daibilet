import { describe, expect, it } from 'vitest';

import {
  resolveEventCardObjectPosition,
  resolveEventHeroObjectPosition,
} from './event-image-focus';

describe('event-image-focus', () => {
  it('keeps hero default at eye-line 18%', () => {
    expect(resolveEventHeroObjectPosition({ slug: 'unknown-event' })).toBe('center 18%');
  });

  it('uses card default 20% for typical catalog headshots', () => {
    expect(
      resolveEventCardObjectPosition({
        slug: 'tc-69b7b031b8d8225732539dfc-letnii-festival-pianissimo-solnyi-koncert-lev-chefanov-v-bolshom-petergofskom-dvorce',
      }),
    ).toBe('center 20%');
  });

  it('shares dense-headshot override between hero and card', () => {
    const key = 'tc-6a4cdfa9269f8c2690ba9ebb-aleksei-saprykin-chtenie';
    expect(resolveEventHeroObjectPosition({ slug: key })).toBe('center 50%');
    expect(resolveEventCardObjectPosition({ slug: key })).toBe('center 50%');
  });

  it('resolves nurminsky override via externalId', () => {
    expect(resolveEventCardObjectPosition({ externalId: '6a319c0e3e6da873bc2af400' })).toBe('center 16%');
  });
});

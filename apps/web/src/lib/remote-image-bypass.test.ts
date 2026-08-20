import { describe, expect, it } from 'vitest';

import { isLocalStaticImageUrl, shouldBypassNextImageOptimizer } from './remote-image-bypass';

describe('shouldBypassNextImageOptimizer', () => {
  it('bypasses local /images/* static assets', () => {
    expect(shouldBypassNextImageOptimizer('/images/events/foo.jpg')).toBe(true);
    expect(isLocalStaticImageUrl('/images/cities/moscow.png')).toBe(true);
  });

  it('bypasses teplohod API image proxy', () => {
    expect(
      shouldBypassNextImageOptimizer(
        'https://api.teplohod.info/v1/image?item=Event123&dirtyAlias=abc.jpg',
      ),
    ).toBe(true);
  });

  it('allows ticketscloud / yandexcloud through Next image optimizer', () => {
    expect(
      shouldBypassNextImageOptimizer(
        'https://ticketscloud-prod.storage.yandexcloud.net/production/image/abc.jpg',
      ),
    ).toBe(false);
  });

  it('still bypasses ticketscloud on googleapis (egress risk)', () => {
    expect(
      shouldBypassNextImageOptimizer(
        'https://ticketscloud-prod.storage.googleapis.com/production/image/abc.jpg',
      ),
    ).toBe(true);
  });

  it('bypasses teplohod S3 signed URLs', () => {
    expect(
      shouldBypassNextImageOptimizer(
        'https://s3.twcstorage.ru/teplohod-private/images/cache/Events/Event1/file.jpg',
      ),
    ).toBe(true);
  });

  it('bypasses amazonaws S3 URLs', () => {
    expect(
      shouldBypassNextImageOptimizer(
        'https://bucket.s3.eu-central-1.amazonaws.com/path/to/image.jpg',
      ),
    ).toBe(true);
  });

  it('keeps daibilet own-domain images on optimizer path', () => {
    expect(shouldBypassNextImageOptimizer('https://daibilet.ru/some/other/path.jpg')).toBe(false);
  });

  it('keeps relative non-static paths on optimizer path', () => {
    expect(shouldBypassNextImageOptimizer('/other/asset.jpg')).toBe(false);
  });
});

import { canonicalLandingSlug } from '@/lib/landing-slugs';

/** Тематические обложки подборок (API не отдаёт imageUrl для landings). */
const LANDING_CARD_IMAGES: Record<string, string> = {
  'river-cruises':
    'https://ticketscloud-prod.storage.yandexcloud.net:443/production/image/2026-03/69b7e5c19a1428eabc14c9e4.jpg',
  'river-party':
    'https://ticketscloud-prod.storage.yandexcloud.net:443/production/image/2026-05/69f9c4d13ec8a317b7bcd5aa.jpg',
  'bridges-night':
    'https://ticketscloud-prod.storage.yandexcloud.net:443/production/image/2025-08/68a8435015031702932ddca9.jpg',
  'new-year':
    'https://ticketscloud-prod.storage.yandexcloud.net:443/production/image/2026-04/69d3d36b50687795b255f77b.jpg',
  'moscow-dinner-boat':
    'https://ticketscloud-prod.storage.yandexcloud.net:443/production/image/2026-03/69bbd8ee3afe92121b0f4b0f.jpg',
  'salute-9-may':
    'https://ticketscloud-prod.storage.yandexcloud.net:443/production/image/2025-09/68d6a1a076e49d4f33205998.jpg',
  'bus-tours':
    'https://ticketscloud-prod.storage.yandexcloud.net:443/production/image/2026-05/6a0cc877778fd44b4b35ef2a.jpg',
  standup:
    'https://ticketscloud-prod.storage.yandexcloud.net:443/production/image/2026-04/69f08dacb3094f76b597bc01.png',
  planetarium:
    'https://ticketscloud-prod.storage.yandexcloud.net:443/production/image/2024-12/676435bd7c4266f2ef8b3ba3.jpg',
  'spb-yards':
    'https://ticketscloud-prod.storage.yandexcloud.net:443/production/image/2026-05/6a183c268598238416b1123a.jpg',
};

export function resolveLandingCardImage(slug: string, imageUrl?: string | null, heroImageUrl?: string | null): string | null {
  const fromApi = String(heroImageUrl || imageUrl || '').trim();
  if (fromApi) return fromApi;

  const canonical = canonicalLandingSlug(slug);
  return LANDING_CARD_IMAGES[canonical] || null;
}

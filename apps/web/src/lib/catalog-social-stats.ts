import type { PublicDestinationDto } from '@daibilet/contracts/public';

/**
 * Global social-proof counts for home trust strip + SiteFooter.
 * Same formula everywhere: destinations with events>0 (cities + region hubs).
 * Do not mix with `/api/public/events`.total or `/api/public/stats`.events —
 * those are different canons (catalog list vs saleable session groups).
 */
export function catalogSocialStats(destinations: PublicDestinationDto[] = []) {
  const live = destinations.filter((item) => (item.events || 0) > 0);
  return {
    places: live.length,
    events: live.reduce((sum, item) => sum + (item.events || 0), 0),
    venues: live.reduce((sum, item) => sum + (item.venues || 0), 0),
  };
}

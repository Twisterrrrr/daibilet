# Codex handoff — Location↔Excursion + city hero (2026-07-31)

## Что накодили (Cursor)

- **City hero HERO3c** golden-ratio (без зеркал) — LIVE MSK **BUILD_ID=`cUv55TBxYLmFcxlC_1Eev`**
- **EventVenueRouteItem** / **RouteItemRole** (`STOP` | `START` | `NEARBY_HUB`), table `event_venue_route_items`, **Venue.hookFact**
- **Event.venueId** = только старт (не трогали)
- **Admin:** venue-links form на event; hookFact на venue
- **Public:** `stopEvents`, `nearbyEvents` (haversine 300m «Рядом»), `venueStops` на event page
- **LocationCard** / **LocationVenueLayout** park-like UI
- **PARK** / **MONUMENT** kinds
- City «Главные места» `href` / `venueSlug` / `locationSlug`
- Perm 6 must-see seed script (`scripts/seed-perm-must-see-venues.js`)

## Canon

- MVP = explicit **STOP** only for SEO «включают»
- Geo = fallback «Рядом» only (не merge со STOP)
- Checkout: **pay.daibilet.ru**; webhooks: **finance-api**
- Don't parallel catalog deploys

## Что нужно от Codex / owner

- `migrate deploy` on catalog if not done (`20260731140000_event_venue_route_items_hook_fact`, park/monument kind migrate)
- Seed perm script
- Editorial: fill STOP links on real tours
- SSH `daibilet_spb_finance` for Codex if still blocked

## Не делать

- Park admission (Монрепо) в MVP
- Force-push; don't leak keys

# Lovable brief: UX refresh for /events and /places (same backend)

**Product:** Daibilet (дайбилет) - tickets + city guides for Russian cities.
**Goal:** Visual/UX refresh of listing pages only. **Do not redesign IA, routes, or data model.**

## Hard constraints (non-negotiable)

1. **Same catalog, same URLs**
   - Keep `/events`, `/places`, `/venues/{slug}`, `/locations/{slug}`, filters as query params (`?city=`, `?family=`, `?category=`, dates, tags).
   - No new sitemap facets, no new primary nav items, no renaming families.

2. **Backend stays as-is**
   - Cards still consume existing public DTOs (title, imageUrl, price/from, city, dates, venue).
   - Buy buttons must keep **two checkout paths**: TicketsCloud (native widget) and Teplohod/TEP (iframe embed). Do not collapse into one generic "Купить" that assumes a single provider.
   - Empty states, pagination/cursor, and "no offers" behavior stay product-owned; propose UI only.

3. **Listing photos**
   - Covers are already served with sidecar preference (`-card.jpg` / `-thumb.jpg` → original). Design for **card aspect ratios** (~4:3 or 3:2), not full-bleed hero crops.
   - Do **not** invent a new media CDN or require new image fields.

4. **Sitewide minimalism (LOCKED)**
   - One filter row on mobile (horizontal swipe rail), not stacked selects + chip stacks.
   - No system junk: no "Найдено N", no "стр. 1 из 10", no instructional fluff.
   - Clean covers: price / seats / dates **under** the image, not 4-5 colored pills on the photo.
   - One thin monochrome line-icon pack; no emoji chrome.

5. **Scope**
   - In: `/events` list + card, `/places` list + card, shared filter rail, empty/loading skeletons.
   - Out: city hubs `/cities/{slug}`, blog, checkout modals internals, admin, finance, My Day planner rewrite.

## What to deliver

- High-fidelity layouts (desktop + mobile) for events grid and places grid.
- Component notes: EventCard, Place/LocationCard, FilterRail, optional sticky filter bar.
- Interaction notes only (hover, focus, filter chip active) - no new API contracts.
- Optional: Auto.ru-inspired density (compact cards, strong photo, clear price) **without** car-marketplace chrome (no "VIN", no dealer blocks).

## Copy language

- Russian UI. Prefer hyphen `-`, never em/en dash in user-facing copy.

## Acceptance

- Looks like a refreshed skin on the **current** Daibilet catalog.
- Engineer can implement in existing Next React components without changing backend routes or DTOs.

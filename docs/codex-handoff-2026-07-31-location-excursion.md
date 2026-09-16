# Codex handoff — Location↔Excursion + city hero (2026-07-31)

**Cursor verify:** `HEAD=3269e663` · `feat/next-monorepo` **= origin** (pushed).
**MSK live web BUILD:** `rfbOzJz7w-ZJXYy22hhbX` (cityInfo mustSee slugs @`d87256d2`; handoff docs @`3269e663`). Prev HERO3e: `wJR6Y559Vh3KmnXskIdsC` (@`1a75ad81`).

### Delta post-handoff (после push + cityInfo deploy)
- `d87256d2`: cityInfo mustSee slug-патч web+public (~246) закоммичен; seed `seed-cityinfo-must-see-venues.js` в git.
- MSK: bulk seed ~246 must-see; smoke `/cities/moscow#sights` - title-links на venue/location.
- Caveat (Diary): Moscow must-see entity привязаны к latin `moskva`, не к кирилл. `москва` (дубль City title=Москва).

## Что накодили (Cursor) - в локальном git / частично на MSK

- **EventVenueRouteItem** / **RouteItemRole** (`STOP` | `START` | `NEARBY_HUB`), table `event_venue_route_items`, **Venue.hookFact**
- Миграции: `20260731130000_venue_kind_park_monument`, `20260731140000_event_venue_route_items_hook_fact`
- **Event.venueId** = только старт (не трогали)
- Admin: venue-links form; venue `hookFact`
- Public: `stopEvents` (STOP), `nearbyEvents` (geo 300m «Рядом», **не merge**), `venueStops` на event page
- Hub-gate: content places без events в `/venues`|/locations`
- Seed: `scripts/seed-perm-must-see-venues.js` + `scripts/seed-cityinfo-must-see-venues.js` (aliases кириллица)
- City «Главные места» slug fields; bulk must-see в MSK DB (~246)
- City hero **HERO3e** (aspect photo, `right-[20%]` gutter, navy→black) - LIVE `wJR6Y559Vh3KmnXskIdsC`

## Canon

- MVP SEO «включают» = только explicit **STOP**
- Geo = только fallback блок «Рядом»
- Checkout **pay.daibilet.ru**; webhooks **finance-api**
- Не параллелить catalog deploys; не force-push; не трогать finance `.159` / YooKassa / TC-TEP secrets
- AdmissionProduct ≠ Event slot; wide CTA не включать

## Verify checklist (для Codex после push)

```bash
git rev-parse HEAD
git grep -n "event_venue_route_items\|RouteItemRole\|hookFact\|NEARBY_HUB"
ls packages/db/prisma/migrations | grep 20260731140000
ls scripts | grep seed-perm-must-see-venues

pnpm install --frozen-lockfile
pnpm db:validate && pnpm db:deploy && pnpm db:generate   # если ещё не на этой DB
node scripts/seed-perm-must-see-venues.js                # idempotent
# optional full hubs:
# node scripts/seed-cityinfo-must-see-venues.js --apply
```

Smoke:

- City «Главные места» → venueSlug/locationSlug
- Event page: `venueStops` (пусто ок, пока editorial STOP не заполнены)
- `stopEvents` и `nearbyEvents` раздельно (пример live: ermitazh stop=0 nearby>0)
- `Event.venueId` только старт
- TC/TEP widgets не ломать

## Блокер для Codex прямо сейчас

1. ~~Push / dirty cityInfo~~ - снято (`3269e663` на origin; live BUILD `rfbOzJz7w…`).
2. Editorial: STOP-связи на живых экскурсиях почти пустые (`event_venue_route_items` / API `stopEvents=0` на spot-check).

## Не делать

- Park admission (Монрепо) в MVP
- Force-push; leak keys
- Finance `.159` / YooKassa / supplier LC / wide CTA

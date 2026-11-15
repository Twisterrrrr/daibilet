# PDP preview checkpoint — 2026-11-15

## Scope

This checkpoint records the isolated staging preview work for the Places/Events/City PDP closeout. It does not claim that the 10-step plan is complete. No production release or shared-staging checkout change was made.

## Places canonical correction

- The staging record for the Vrubel Museum corpus had a `canonicalPath` pointing to `/venues/vrubelevskiy-korpus-vrubel-omsk`, while the page's real stable slug was `/venues/omsk-muzey-izobrazitelnyh-iskusstv-vrubelya`.
- The isolated staging database record was corrected earlier; a rollback JSON is stored on the staging host at `/opt/daibilet-staging/var/backups/venue-vrubel-canonical-before-20261115.json`.
- Added a permanent alias from the old path to the stable path in both web and backend alias registries. Commit: `5a0f42e83` (`fix(places): redirect stale Vrubel venue slug`). Pushed to `origin/codex/city-pdp-editorial`.
- The change was applied only to the isolated preview release. Old URL returns HTTP 308 to the stable URL; stable URL returns HTTP 200, self-canonical, `index, follow`. The alias-aware backend API and canonical API paths both return HTTP 200.

## EventPage SEO smoke

- `/events/krim-plin-moskva` and `/events/ekskursiya-na-lenfilm` return HTTP 200 with self-canonical and `noindex, follow` in the isolated preview.
- The former is the sales example; the latter is the information-only example. Purchase was not initiated and purchase references were not inspected or logged.
- `/cities/moskva` resolves to the existing published city route `/cities/moscow`, which returns HTTP 200 and remains `index, follow`. It is not the unpublished editorial draft.
- The authenticated city admin page returns HTTP 200 and includes the destination editor tabs. The existing Moscow editorial document loads as `DRAFT`, version 2, `isIndexable=false`, readiness complete, with 4 sources, 3 must-see places, and 1 route. Hero/gallery remain empty pending a verified media source.
- The legacy city-record form no longer repeats the intro, hero, or SEO controls already owned by the PDP editor. Those legacy values are submitted as hidden fields so saving basic city identity cannot erase the old source values. Commit: `1bfc249f3` (`fix(admin): keep city PDP fields in one editor`), pushed and built in the isolated preview.

## Checks

- Web CI: 357/357 passed.
- Backend test suite: 184/184 passed.
- Web and backend typecheck passed; `git diff --check` passed.
- Isolated preview web build completed successfully after both code changes (251 static pages); preview web/API services are active on ports 3013/4012.
- Venue sitemap previously requested one `limit=10000` API response, but the public venue API caps each dump at 2,000 rows; the response also reported `total=3823` and `hasMore=true`. The sitemap silently missed all later pages. Added bounded pagination (`sort=asc`, 2,000 per request) in commit `47c7dc3f0` (`fix(sitemap): paginate venue catalog results`), with tests for page continuation and the 10,000-row ceiling.
- The isolated preview then returned `/sitemaps/venues.xml` with HTTP 200 in 18.15 seconds. It included 1,717 unique indexable URLs and a known stable-slug record on the second API page. Two API pages returned 3,823 unique venue IDs (2,000 + 1,823). The route still verifies 1,490 `/locations/` URLs individually in groups of eight; monitor/optimize this if cold shared-staging runs approach the gateway timeout.
- Server root filesystem after build: 66% used.

## Remaining acceptance gaps

- The pagination bug is fixed and the full venue sitemap was verified on isolated preview. The shared staging timeout was not re-tested; the staging checkout is still not a safe deployment target. The 18-second preview duration leaves an optimization opportunity in per-location detail verification.
- Visual editing/save/reopen of Place and City PDPs, gallery/source workflow, and the remaining public sitemap/SEO matrix remain to be accepted.
- Shared staging is still not the target for a release because its checkout and catalog state were previously found dirty/stale. Production was not touched.
- Overall plan remains in progress; this checkpoint closes no full plan item by itself.

## Admin publish safety follow-up

- The destination PDP editor now tracks unsaved changes across content, media, and SEO fields. It disables publishing while edits are unsaved and disables hiding until the draft is saved, so a click cannot silently publish or hide the older server snapshot while appearing to include newer form values.
- Saving still follows the backend rule that edits to a READY/PUBLISHED page return it to editorial review. The UI explains this before save. The explicit `isIndexable` checkbox remains a publish-time choice and is sent only with the publish request.
- Verified on this iteration: web typecheck passed, full web CI 359/359, and `git diff --check` passed. Production build and isolated preview deployment are pending for this follow-up.

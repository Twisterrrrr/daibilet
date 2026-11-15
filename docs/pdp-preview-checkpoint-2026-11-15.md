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
- Server root filesystem after build: 66% used.

## Remaining acceptance gaps

- The prior `/sitemaps/venues.xml` timeout remains unresolved. The known heavy route was not re-requested; inspect API/query performance before retrying.
- Visual editing/save/reopen of Place and City PDPs, gallery/source workflow, and the full public sitemap/SEO matrix remain to be accepted.
- Shared staging is still not the target for a release because its checkout and catalog state were previously found dirty/stale. Production was not touched.
- Overall plan remains in progress; this checkpoint closes no full plan item by itself.

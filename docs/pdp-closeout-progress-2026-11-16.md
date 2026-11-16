# PDP Places / Cities / Events — progress checkpoint

Date: 2026-11-16. This records code-level checks in the isolated `codex/city-pdp-editorial` worktree. It is not staging or production acceptance.

## Ten-step status

| # | Work | Status | Remaining acceptance |
|---|---|---|---|
| 1 | Places templates and SEO | Partial | Visual review of venue/location, editor create-save-reopen, gallery/source workflow, candidate noindex, canonical and sitemap in a reachable staging preview. Venue sitemap pagination was previously fixed and smoke-checked in preview. |
| 2 | City/region model and API map | Done | The API handoff maps owner records, admin endpoints, content blocks, workflow, media/source fields, Vyborg rule and public-read boundary. |
| 3 | City/region editor | Partial | Tabs, draft/revision actions and unsaved-edit publish guard exist. Krasnodar was created and reopened through the admin flow in the prior preview session. Still needs browser-based visual acceptance and same-version editor preview. |
| 4 | City/region publication and SEO | Partial | Backend policy/tests default new publication to noindex and keep the published snapshot while drafts change. Still needs a full public SSR check of robots, canonical, sitemap, JSON-LD, links and cache refresh for a published page. |
| 5 | Real city PDP from scratch | Partial | Krasnodar draft exists as v1, DRAFT/noindex, with sourced content; it persisted on reopen and did not leak into the public API/page. It is not yet an editorially accepted public example; hero/gallery are empty pending rights-verified media. |
| 6 | EventPage source audit | Done as an audit | Create/edit/revisions/publish and known limitations are documented. This is not full DB integration acceptance. |
| 7 | Event ID ↔ EventPage safety | Partial | Explicit links, move/split, batch limit and chunked inserts are implemented. Need staging compatibility/fallback acceptance for source sibling expansion via `metaExternalId`; do not remove it before that check. |
| 8 | Event lifecycle | Open | Verify single/repeating/open-date, ended/no-offer, tours, multiple providers/venues, historical address, no slot-index pages, and provider/session/offer references. |
| 9 | Sales and information-only EventPages | Partial | Public SEO smoke was previously recorded for both examples. Admin end-to-end, schedule/price/CTA, old URL fallback and purchase reference preservation are not all accepted. |
| 10 | Combined staging acceptance | Blocked | Current client cannot complete SSH banner exchange or HTTPS TLS handshake to the host; no fresh staging checks were possible in this iteration. Do not infer service health from these client-side failures. |

Fully closed by the plan's definitions: **2/10** (#2 and #6 audit). Several other steps have implementation and partial evidence, but remain open until their specified user-facing or staging acceptance is done.

## Checks performed in this iteration

- Web typecheck: passed (`tsc --noEmit`).
- Web CI unit tests: **359 passed, 0 failed** (59 test files).
- Targeted backend tests for destination PDP handlers/policy and EventPage links/batching: **17 passed, 0 failed**.
- No database, staging, production, or URL data was changed.

## URL architecture review — proposal only

Do not implement the proposed URL migration in this acceptance branch yet. The repository currently has generic Next routes `app/[segment]/page.tsx`, `app/[segment]/[segment2]/page.tsx`, and `app/[segment]/[segment2]/[segment3]/page.tsx` for editorial event landings. Therefore:

- `/{city}` and `/{city}/{type}` cannot simply be added as independent dynamic pages; dispatch must be coordinated with the existing landing routes and their static parameter registry.
- Existing paths such as `/rechnye-progulki/moscow` use the same two-segment namespace. Resolve by explicit registries: known system/static routes first, then a recognized city plus a whitelisted place-type slug, then existing editorial landing; never infer a city from an arbitrary unknown segment.
- The canonical proposal conflicts internally between `/places/{type}` and `/{city}/places/{type}` versus `/{city}/{type}`. Choose one city/type shape before implementation.
- The proposal's `/venues/{slug}` for every place conflicts with the current separate `/venues/{slug}` and `/locations/{slug}` family policy. Treat any family consolidation as its own migration decision.
- Map the 12 public URL type slugs to existing `placeType`/subtype values through a maintained dictionary; do not assume the URL words are database enum values.
- Use a single count threshold. If 3+ unique place IDs qualify, the proposed indexable threshold is coherent; 0 stays absent, 1–2 can be `noindex,follow`. Prefer a self-canonical for a distinct thin filtered result; point canonical to the parent only if the page is genuinely duplicate/consolidated.
- Before changing city roots, inventory existing city aliases, landing paths, static/system slugs, link helpers, breadcrumbs and stored canonicals; then define 301s and sitemap cutover.

This section is an implementation review, not an approved route decision. Existing public URL behavior remains unchanged.

# Tasktracker

## City Hub Blog Integration

Status: Phase 1 implemented locally as an alternative variant for Cursor to compare.

Done:

- Added lightweight `PublicArticle` contract and city page `articles` payload.
- Added published/indexable article fetch for city hubs.
- Added article type inference for `gid`, `obzor`, and `column`.
- Added city-aware article picker with fallback for weak `citySlug` data.
- Reworked city hub tabs to five editorial sections.
- Inserted article rails into About, Affiche, Sights, Practice, and More.
- Added article teaser card with badges, excerpt accordion, local affiche CTA, and blog link.
- Added mini event row from already loaded city sessions, no extra API request.
- Preserved legacy section anchors inside the new section structure.
- Verified `@daibilet/public` typecheck locally.
- `@daibilet/public` build compiles and reaches static page generation, then fails on local Windows Next trace collection for `_not-found/page.js.nft.json`; this needs a separate build-environment check.

Next:

- Port the same structure into `apps/web` on `feat/next-monorepo`.
- Run visual QA on `/cities/moscow` and `/cities/saint-petersburg`.
- Verify page weight stays below the city hub teaser budget.
- Add admin/CMS manual article-to-city binding later, after launch.

Out of scope for this phase:

- Full article content on city hub.
- Blog CMS changes.
- Weather, maps, bento galleries, or other heavy city page features.

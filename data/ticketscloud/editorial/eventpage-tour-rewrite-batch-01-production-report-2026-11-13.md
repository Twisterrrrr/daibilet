# Production report — touring rewrite batch 01

**Applied:** 13 November 2026

- 30 shared touring programs; 291 distinct EventPage/Event ID pairs.
- All 291 pages are READY, published, indexable, and have self-canonical URLs.
- 276 drafts were first published; 15 pages were already published and received the new shared rewrite.
- All EventPage/Event ID links, slugs, and route rows were preserved. Provider descriptions and legacy overrides were left unchanged; original source text and previous EventPage content are retained in the archive and revision history.
- Copy preflight passed for all pages: at least two substantive paragraphs, main text no shorter than the provider source or previous active EventPage text, practical information last, unique SEO descriptions.
- Local dates and times use each city’s timezone. Venue, address, age, price, future sessions, and active offers were rechecked against production before apply.
- 30 TourGroups are linked to 263 unambiguous city representatives; the existing «Света» group was reused. Twenty-eight additional pages are repeated slots in cities already represented in their group. The current TourGroup API rejects a second page in the same city, so those 28 pages remain unassigned.
- Public cache invalidated; 582 paths revalidated (291 EventPage URLs and 291 legacy slot URLs). IndexNow accepted all 291 EventPage URLs.
- HTTP checks over the production IP returned 200 for a newly published page and an already-indexable page. Both report index, follow, self-canonical, the new H1, and rendered practical information. Both URLs appear in /sitemaps/events.xml.

## Artifacts

- Page-level review: eventpage-tour-rewrite-batch-01-review-2026-11-13.md
- Shared copy by tour: eventpage-tour-rewrite-batch-01-master-copy-2026-11-13.md
- Source and previous-page archive: eventpage-tour-rewrite-batch-01-source-archive-2026-11-13.json
- Production before-snapshot: eventpage-tour-rewrite-batch-01-before-2026-11-13.json
- Production results: eventpage-tour-rewrite-batch-01-production-result-2026-11-13.json
- Cache and revalidation results: eventpage-tour-rewrite-batch-01-revalidation-2026-11-13.json
- Post-publication audit: eventpage-tour-rewrite-batch-01-audit-2026-11-13.csv

Production changes were limited to EventPage editorial content, SEO description, publication and indexability state, and TourGroup assignments.

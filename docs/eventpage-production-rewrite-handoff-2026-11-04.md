# EventPage production rewrite handoff — 2026-11-04

## What is ready

- Production already contained **5,029 private EventPages** from the 2026-11-04 snapshot.
- Added **3 product EventPages** for 302 verified, currently saleable Ticketscloud Event IDs: Petrovskiy (178), Vassa Zheleznova (2), and New Year Petersburg (122).
- The rewrite queue now contains **5,032 page targets** and an EventPage-level URL plus admin editor route for each.
- Cross-checking the same snapshot’s strict current-saleability rule (`READY` plus at least one future sellable session) assigns **all 32,827** saleable IDs to these pages. The 9 additional IDs counted in the broader assignment ledger are already linked but have no future sellable session; they are not counted as currently saleable.
- **569** verified recurring product groups resolve to existing EventPages; the slot rows remain attached to their shared product page. The matrix contains the related active Event IDs and counts.

## Rewrite agent scope

Use [`eventpage-rewrite-work-queue-2026-11-04.csv`](./eventpage-rewrite-work-queue-2026-11-04.csv). It has `eventpage_id`, stable public URL, `/admin/events/{representative_event_id}` editor path, representative ID, the Event IDs directly attached to the page, active saleable Event IDs, and verified recurring product groups.

The rewrite agent should edit the EventPage editorial content only. Preserve supplier/source text as an archived, non-published source object and mark the rewrite as the active editorial text. Do not create another page, change EventPage/EventID mappings, publish, set indexability, alter canonical/sitemap, or add redirects. For the three newly created pages, the queue marks `created_needs_rewrite`; other records are existing drafts and need review before editing.

All imported Ticketscloud/TEP sales remain external-provider checkout; this work does not use Daibilet’s finance contour.

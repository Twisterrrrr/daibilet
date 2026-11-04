# EventPage catalog status — 2026-11-04

## Production inventory and decisions

The production snapshot contains **139,081 Event records**. These are event products/records, not the previously reported 139,081 sessions. The complete [EventID assignment matrix](./eventpage-eventid-assignment-matrix-2026-11-04.csv.gz) has one row per record, including inactive and historical events.

There are **32,831 currently saleable READY Event IDs** in the snapshot. Every one has a deterministic next step:

| Schedule kind | Saleable Event IDs | Current decision |
|---|---:|---|
| `SINGLE` | 4,397 | All already linked to a private EventPage |
| `RECURRING` | 28,425 | 619 already linked; 26,382 attach to a product page; 1,122 on the approved multi-pier page; 302 need three new product drafts |
| `OPEN_DATE` | 9 | All already linked to a private EventPage |
| **Total** | **32,831** | |

| Assignment | Saleable Event IDs | Meaning |
|---|---:|---|
| `ALREADY_LINKED` | 5,025 | Direct link to an existing private EventPage draft |
| `ATTACH_TO_EXISTING_PAGE` | 26,382 | Match to a product page by Ticketscloud parent + city + normalized title + provider identity |
| `OWNER_APPROVED_ATTACH_MULTI_PIER` | 1,122 | Owner-approved North Venice page; each slot keeps its own pier/venue |
| `CREATE_RECURRING_PRODUCT_PAGE` | 302 | Three distinct recurring products need a private representative page |
| **Total saleable READY** | **32,831** | All assigned; no live saleable Event ID remains in review |

The 302 IDs belong to these three new product pages: “Петровский Петербург — золотое кольцо от Петроградской стороны в мини-группе” (178), “Васса Железнова” (2), and “Новогодняя сказка: вечерний Петербург” (122). These pages must remain private drafts until editorial text is supplied.

The assignment matrix currently counts **5,030 direct links overall**; five are not currently saleable, which is why the active assignment table counts 5,025. The [all-status product-group matrix](./eventpage-parent-siblings-all-statuses-2026-11-04.csv) has 1,685 groups: 568 candidate groups for existing pages, three new products, one owner-approved multi-pier group, and 1,113 review groups. The review groups do not contain unassigned saleable records; the two currently saleable “Не стоит вызывать его” occurrences already have separate pages, per owner decision.

The [recurring write-candidate file](./eventpage-recurring-write-candidates-2026-11-04.csv) is a validation/work queue, not a command to insert every dated Event ID into `EventPageEvent`. It records 463 existing-page product groups (26,382 IDs), the one approved multi-pier group (1,122 IDs), and three new-page products (302 IDs). Runtime resolution maps sibling slots only when the product identity is unambiguous.

## Provider identity and grouping rules

For Ticketscloud groups, matching a `metaExternalId` alone is insufficient. A product group is keyed by provider parent, city, normalized product title, and verified provider identity. Runtime resolution requires one target EventPage and consistent organizer/seller identifiers; missing or conflicting identity, multiple linked pages, or a different title leaves the old slot URL as fallback. Internal reports use opaque identifiers only and do not expose seller legal details.

The provider audit found 15 multi-venue groups with complete, consistent organizer/seller identity. This supports same-provider grouping for those candidates; it does not merge different products or cities. The user-approved North Venice case is the explicit exception where all piers belong on one local page. Confirmed cross-city tours remain separate local pages connected by `tourGroupId`.

The two “Не стоит вызывать его” occurrences stay separate. “Васса Железнова” is one product group as approved. Distinct programs under one Ticketscloud parent stay separate because product title participates in the identity key.

## Event subtypes

Broad event category and schedule kind (`SINGLE`, `RECURRING`, `OPEN_DATE`) are unchanged. The proposed subtype list covers the 32,831 saleable READY Event IDs and is offline only: **12,855 HIGH**, **6,646 MEDIUM**, **13,330 REVIEW**. No subtype database field, navigation, or production catalog behavior has been changed.

The controlled vocabulary and classification rules are in [`event-subtype-taxonomy.md`](./event-subtype-taxonomy.md); the row-level proposals are in [`event-subtype-proposals-2026-11-04.csv`](./event-subtype-proposals-2026-11-04.csv).

## Production state

- Production has 5,029 private EventPages and 5,030 direct EventPageEvent links. Existing page drafts remain `DRAFT`, non-indexable, unpublished, and without canonical paths.
- Thirteen representative drafts were created earlier after a production backup at `/var/backups/daibilet/postgres/daibilet-20261104T001339Z.dump` (135 MB). No production public URL, canonical, sitemap, redirect, or article body was changed in that write.
- The three additional products above are not yet provisioned as EventPage drafts.
- Old slot URLs remain the fallback until staging confirms the page route and catalog/search behavior.

## Runtime work in this iteration

The code now resolves a slot to a stable EventPage by product identity rather than only a direct EventPageEvent row or a Ticketscloud parent. Catalog, search, and article-link resolution share the same resolver. An EventPage route also expands to matching current slots, checks for page conflicts and provider identity, and returns each session’s venue name/address so multi-pier and multi-venue products can display the actual departure/venue per session.

Automated checks cover stable URL resolution, slot expansion, conflicting target pages, search links, article-link fallback, and venue fields in EventPage sessions. The staging-only resolver smoke passes against temporary fixture tables and rolls back. The available staging snapshot has no public-saleable EventPage fixture, so it cannot validate the complete real API → web route → catalog/search chain; an HTTP probe against its existing draft pages returns the expected miss for this stale/non-saleable data. Refresh or seed a current sanitized staging catalog before calling that check green.

## Explicitly not changed

- No page was published; canonical, sitemap, redirects, or legacy fallback routing were not switched.
- No article body or rewrite was changed. Rewrites remain the owner/other agent’s work.
- No source description was copied into an editorial EventPage as a rewrite.
- Imported events remain outside Daibilet’s finance contour.
- No expired event was restored as saleable.

## Remaining before EventPage work is closed

1. Refresh or seed isolated staging with a sanitized, currently saleable EventPage fixture; verify representative pages from each provider/product pattern, catalog/search URLs, past slot URL fallback, multi-venue displays, and page response/SEO metadata.
2. Provision the three missing representative EventPage drafts, verify exact EventID mapping, and keep them non-indexable.
3. Reconcile legacy and historical URLs (78 current unmatched URLs and 1,305 Search Console/Webmaster historical URLs) with the full EventID/EventPage map. Preserve fallback for unresolved addresses.
4. After staging is green, deploy the runtime code and draft assignments. Do not change production canonical/sitemap or issue redirects as part of this step.
5. Owner/other agent supplies rewrites to EventPages. Then review and separately cut over indexing, sitemap, canonicals, and redirects with rollback coverage.

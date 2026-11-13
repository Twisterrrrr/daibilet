# Editorial source audit — 2026-11-04

Read-only reconciliation of editorial sources against production. No database writes or publications were performed in this audit.

## Mapping

- Crosswalk: **235 rows / 224 unique Event IDs**.
- **111 unique Event IDs map to 100 EventPages** using direct anchors plus active saleable slot links. This reproduces the reported mapping. The 120 matching crosswalk rows include repeated IDs across batches/sections.
- Direct production DB read confirmed all **100/100 target pages exist** and are drafts/non-indexable/unpublished. A fresh production read on 2026-11-05 found 35 pages from the 51-ID batch already have non-empty sections; do not rely on the older “empty section” snapshot for these records.
- All **111/111 Event records exist** in production. **97** have direct `EventPageEvent` relations; 14 IDs are only included in the queue through active-slot/product matching. Their runtime resolution still needs verification before making claims that each slot is publicly routed to that page.
- The saved staging verification file still shows zero actual staging links for these rows; it is older evidence and not the live production verification above.
- Production has **5,027 EventPages**, while the current generated queue has 5,032 rows. The 100 rewrite targets were individually confirmed, but the five-page global delta should be reconciled separately.

## Rewrite file findings

- `D:\coding\tours\batch-30-empty-description-rewrites-2026-10-27.md` has 51 Event IDs. The document says no DB write was performed, but production now contains **exactly matching normalized rewrite text in EventOverride for all 51 IDs**, all updated at `2026-10-27T11:34:34.239Z`. This is content-hash verified, not a title-based inference.
- **35** of those 51 IDs map to **35 existing target EventPages** and are directly linked. A fresh production read on 2026-11-05 confirmed all 35 EventPage section bodies exactly match their corresponding `EventOverride.description`. They are already populated `DRAFT` pages and the queue correctly marks them `already_filled_skip`; no transfer or overwrite is needed. **16 IDs** do not enter the current active rewrite queue, so they should not trigger new pages or revival.
- For the 35 linked Event IDs, original `Event.description` is nonempty for only **2**; 33 currently have no original description text in that field. Each link/revision has a `sourceSnapshot` key for `description`; retain nonempty original snapshots if a later editorial rewrite replaces the current copy.
- Therefore this 27 Oct rewrite batch must **not** be re-applied to EventOverride or copied over the current EventPage body. These copies are already present in EventPage; assess them as existing editorial content and preserve source snapshots before any future revision.
- `D:\coding\tours\batch-30-empty-descriptions-2026-10-27.md` has 52 IDs, says texts were not written, and is flagged as an outdated selection in the crosswalk. 43 IDs map to 32 current pages. Keep for history; do not bulk apply.
- `D:\coding\tours\batch-next-empty-description-2026-10-27.md` has one prepared rewrite for `МЕГАМОЗГ — Пенза`. Its target page exists and is empty; current EventOverride and imported description are empty. It is a first-write candidate after freshness/factual review.
- The referenced TEP source batch is absent locally. For its 7 mapped IDs, production has both current EventOverride and original Event descriptions; compare before moving anything.
- The referenced Ticketscloud source batch is absent locally. For its 2 mapped IDs, production has both current EventOverride and original Event descriptions; retrieve the batch and check per-record state.
- 23 Cline text rows map to current pages, but the archived original is not in the referenced file. Preserve the current source before any transfer. 9 other matched rows are from an outdated selection and should not be applied.

## Separate New Year Petersburg page

- Production EventPage `21f794dd-fa74-48f9-923b-2bc3a67eae5b` at `/events/novogodnyaya-skazka-vechernii-peterburg-sankt-peterburg` contains the prepared rewrite. Read-only production verification found it remains `DRAFT`, unpublished, `isIndexable=false`, with the expected structured sections and Practical Information.
- Its 122 source Event IDs and original descriptions are retained in the separate archive and source snapshots. Do not overwrite this page; the queue marks it `already_rewritten_skip`.

## 2026-11-05 editorial readiness

- Read-only production audit found 44 pages with non-empty sections. The queue marks 43 as `already_filled_skip`; the New Year page is separately marked `already_rewritten_skip`.
- The New Year, Vassa, and Petrovskiy rewrites are present in production drafts. Vassa and Petrovskiy were saved as revision 3 on 2026-11-05; their links and routes are unchanged and both remain DRAFT/noindex. The New Year page remains an already-filled draft.
- On 2026-11-05, the camp “Ёлки-палки, Новый год!” plus all fourteen pages from the Cline no-description batch were saved to existing EventPages. The fourteen are Saliva, “Перемотка”, Nayk Borzov, “Интонация”, “Сон у Красной горы”, “Мираж”, “Сова”, “В объятиях дождя”, Хуан Орландис Бэнд, NEVERLOVE, ANNA ASTI, “Дискотека Новогодний огонёк”, “Чайковский при свечах”, and “Симфония любви”. Each remains DRAFT/noindex; the existing EventID links and routes were preserved. Source archives and payloads are under `data/ticketscloud/editorial/`.
- The latest queue count after those transfers: 24 `rewrite_applied_production_draft_2026-11-05`, 43 `already_filled_skip`, 1 `already_rewritten_skip`, and 4,964 existing drafts still requiring review/rewrite. The Cline no-description batch has no remaining entries; seven existing city pages from the Codex handoff for the Islam Itlyashev tour were also rewritten with one city-specific paragraph each. The large main queue remains to be processed from existing EventPages only.
- The 35 exact-copy mappings from the 27 Oct batch are included within the 43 already-filled pages above. The transfer-candidate CSV was refreshed against production on 2026-11-05; its earlier “not performed / empty page” labels were stale.
- The 23 mapped entries from `batch-cline-30.md` are shorter than their recorded originals and still need expansion before transfer. The older 52-ID batch has outdated selection state; only use its entries after a fresh per-record audit. Wine tour “Авторские вина Анапы” remains paused due conflicting city/date/price. Do not transfer unresolved or outdated texts.

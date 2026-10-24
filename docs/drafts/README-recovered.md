# Recovered drafts (2026-09-29)

Files copied out of a working copy exported from the other machine
(`daibilet-push`, a git worktree whose `.git` pointed at a path that does not
exist here, so the history was unreachable and only the files survived). They
existed nowhere else - not on GitHub, not in any branch - so they are committed
here before anything else.

## `pdp-wave1-baseline-urls.md`

The draft `docs/pipeline-status.md` was waiting on. It lists the 12 canonical
Wave 1 PDP URLs (museum / theater / pier / park) and the measurement recipe:
Metrika segment by URL, views plus CTA clicks.

**The Metrika numbers are still not filled in.** That is the remaining part of
the Wave 1 blocker. The URL list itself was re-checked on 2026-09-29 and all 12
return 200 with no redirect.

## `teplohod-rewrites-batch-3.json`, `teplohod-rewrites-batch-4.json`

24 rewritten Teplohod event descriptions: batch 3 is 9 Moscow + 3 Saint
Petersburg, batch 4 is 8 Saint Petersburg + 3 Moscow + 1 Kazan. Each entry
carries `city`, `slug`, `title`, `id`, `originalDescription` and
`rewrittenDescription`.

**These are NOT the repo's canonical rewrite format.** The tracked batches under
`data/teplohod/editorial/` use `tcEditorialBatch` with a `series` array,
`metaExternalId`, `representativeEventId` and `expectedSourceDescriptionSha256`.
The schema here is older and has no checksum anchor, so it cannot be applied
blind. Converting it to the canonical shape is separate work and needs a decision
on where `metaExternalId` should come from.

## `broken-venues-*`

The 2026-09-25 investigation into broken venue pages: canonicalPath duplicates,
Novodevichy twins, and the raw SQL behind the counts.

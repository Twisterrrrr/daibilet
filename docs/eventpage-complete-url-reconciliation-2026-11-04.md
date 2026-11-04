# EventPage URL reconciliation — 2026-11-04

## Scope and result

This joins the 27 October event-sitemap snapshot (4,349 sitemap URLs plus 3 owner-supplied historical URLs), the available Search Console inventory (1,521 rows), the production EventID matrix (139,081 records, snapshot dated 4 November), and the additional URL supplied during this audit. Duplicate URL strings were merged into one row. The resulting [combined URL ledger](./eventpage-complete-url-reconciliation-2026-11-04.csv) contains **5,658 unique URLs**.

| Identity result | URL count |
|---|---:|
| Exact EventID match in the current matrix | 5,576 |
| TEP numeric URL suffix mapped exactly to `evt_tep_<id>` | 76 |
| Unique partial ID candidate, requires manual confirmation | 1 |
| No reliable EventID match | 5 |

All **4,349 URLs from the 27 October sitemap snapshot** map to an EventID in the 4 November matrix. The 78 rows that the October export left unmatched are all resolved: 76 by decoding the numeric tail to `evt_tep_<id>`, and 2 by exact matches in the independent Search Console crosswalk. This does not establish the contents of today's live sitemap.

The Search Console inventory has **1,515 exact EventID matches** (1,514 unique IDs; one ID is represented by two URL forms). **346 URL rows** have a current or candidate EventPage key; **1,169** exact-ID rows have no page target in the matrix yet. These remain tied to the current EventID record and retain URL fallback; this is not approval to publish, canonicalize, or redirect.

The additional URL `cirk-shapito-skif-v-g-magnitogorsk-6ac0ffc2f893a2b5505e2659` resolves exactly to `evt_6ac0ffc2f893a2b5505e2659`, but that record is `SINGLE/HIDDEN`, has no future sellable sessions or active offers, and has no EventPage. It is therefore an expired/historical URL candidate, not one of the 302 current saleable IDs; it remains on fallback pending the archive policy.

## Items still requiring a decision

One URL has only a truncated seven-character event ID suffix. It uniquely prefix-matches `evt_69ce3e34421bbb2be1192d3e` in the snapshot, currently `HIDDEN`. Treat this as a review candidate, not a confirmed mapping:

- https://daibilet.ru/events/hibla-gerzmava-bolshoi-letnii-koncert-programma-dzhaz-v-soprovozhdenii-bolshogo-dzhazovogo-orkestra-petra-vostokova-69ce3e3

Five historical URLs have no reliable ID or exact slug match in the available matrix. Keep them in fallback and do not invent a redirect target:

- https://daibilet.ru/events/flagman-ni-kogda-ne-spit-vechernyaya-progulka-s-disco-po-moskva-reke-na-dizainerskom-teplohode-flagman-ot-prichala-kievskii
- https://daibilet.ru/events/hibla-gerzmava-bolshoi-letnii-koncert-programma-klassika-v-soprovozhdenii-simfonicheskogo-orkestra-akademiya-russkoi-muzyki
- https://daibilet.ru/events/muzykalnyi-dzhazovyi-vecher-na-dvuhpalubnom-teplohode-magiya-muzyki-i-vod-peterburga-2-chasovoi-kruiz-s-zhivoi-muzykoi-i-vid
- https://daibilet.ru/events/na-kinostudiyu-lenfilm
- https://daibilet.ru/events/progulka-s-uzhinom-muzykalnoi-programmoi-s-francuzskim-akkordionam-i-diskotekoi-na-teplohode-arturs-vechernyaya-moskva-v-og

## Staging and 302 EventIDs

The production matrix identifies three new recurring product groups (178 + 2 + 122 = **302 EventIDs**) for three private drafts: “Петровский Петербург — золотое кольцо от Петроградской стороны в мини-группе”, “Васса Железнова”, and “Новогодняя сказка: вечерний Петербург”. All three drafts now exist on staging and are validated as unpublished, non-indexable candidates. The first group resolves the 178 reviewed saleable IDs plus 334 same-identity non-saleable siblings; those extras have no active sessions. The other two groups resolve exactly 2 and 122 IDs. The resolver was exercised directly against the refreshed staging DB; the deployed staging web/API bundle remains on older release `28181825f`, so an HTTP smoke of the new UI/API bundle is still required. No production EventPage relation or SEO field was changed.

## Limits and safety

The available Search Console exports do not contain URL-level rows for every aggregated 404, and a complete Yandex Webmaster URL export is not present locally. Therefore this report is exhaustive for the supplied current sitemap, the 1,521-row GSC inventory, and the three owner-supplied URLs; it cannot claim coverage of unseen 404s from the search-engine dashboards.

All URLs keep `KEEP_FALLBACK_NO_SEO_CHANGE` in the ledger. No canonical, sitemap, redirect, production DB, or article content was changed. Historical URLs without a verified EventPage remain unresolved by design.

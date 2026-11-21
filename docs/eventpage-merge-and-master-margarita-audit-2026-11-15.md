# EventPage merge and production identity audit - 2026-11-15

## Reptile Zoo: safe consolidation plan

Read-only production check found 118 EventPages for «Зоотеатр Рептилий» in three cities. There are 97 events with future sessions: Saint Petersburg 41, Novosibirsk 42, Mirny 14. Each city uses one venue; all pages currently have no `mergeGroupKey`.

Use one target per city and preserve all old EventPage rows, texts, revisions and URL paths:

| City | Target EventPage ID | Target slug | Pages with upcoming events |
|---|---|---|---:|
| Санкт-Петербург | `4ce50abf-fcc0-4772-bb3f-7aae5b3fb44c` | `zooteatr-reptilii-v-g-sankt-peterburg-trk-grand-kanon-sankt-peterburg-26` | 41 |
| Новосибирск | `020df6db-af00-47cf-b5b1-44ce0337df03` | `zooteatr-reptilii-v-g-novosibirsk` | 42 |
| Мирный | `222c1b9b-5367-474d-b358-18108003be50` | `zooteatr-reptilii-v-g-mirnyi-mirnyy-respublika-saha` | 14 |

The Saint Petersburg target is already READY and indexable. A second old indexed page (`26400982-1d36-4c87-b9a7-cdd76c70228b`) and two edited drafts (`3bfbec21-313a-4f85-9fa0-a33cb2cdca38`, `55d9ca1c-8793-4628-8653-0317d309de08`) must remain as archival EventPage records. Their routes should resolve to the chosen target and canonicalize to it; their content and revision history must not be deleted. The 21 pages without future sessions are not included in the active event count; retain their old routes and records during consolidation too.

The local backend change adds a restricted transactional merge endpoint for this exact title family and merge key. It checks all linked events belong to one known city and venue, rejects duplicate Event links and incompatible merge-group assignments, moves links, appends revisions, and retains former paths as historical aliases. The sitemap omits empty source shells. No production rows were changed.

## «Мастер и Маргарита»: current group is over-merged

The production rewrite plan dated 2026-11-13 grouped 36 EventPages into one tour group solely from the normalized title `спектакль мастер и маргарита г` (35 cities, plus an additional Yakutsk page). This identity rule is too broad. The production report says the pages were published and indexable, so wrong “other cities” links can currently be visible to customers.

### Confirmed production split

| Candidate production | Exact EventPage IDs | Evidence |
|---|---|---|
| Валерий Белякович / гастрольный состав с Ольгой Кабо | Чита `c940678d-fc97-4b6c-9e06-bf50c0b9902a`; Усолье-Сибирское `bc4da688-c233-4c9d-8c70-79c31c8b28c2`; Иркутск `1e7b39a4-63f0-4786-9cc2-304f333217a8`; Ангарск `accccb8d-816b-4a0d-a420-1d9fb4ec4452`; Якутск, 16:00 `cc07413a-6156-4b48-883f-32bcb133c72d` | [Afisha performance and cast](https://www.afisha.ru/performance/master-i-margarita-1004525/) lists director Valery Belyakovich, Olga Kabo and the Nov-Feb city itinerary. [Kabo's MTS Live schedule](https://live.mts.ru/persons/olga_kabo) independently confirms Chita and Angarsk. The 16:00 Yakutsk listing is on the same itinerary. |
| Театр «Огни Москвы» / Анатолий Добрынин | Якутск, 19:00 `4a1e2b92-4621-42a6-8425-677cea253186`; Оренбург `dae59aa4-94ff-4387-ad3a-8120482272d8` | [Yakutsk 19:00 listing](https://appmost.ru/city-yakutsk/afisha/activity/46748) names director A. Dobrynin; [Orenburg listing](https://orb.okkassa.ru/catalog/spektakli/spektakl-master-i-margarita-g-orenburg) names the same director and a different cast. Keep these out of the Belyakovich group. Whether these two are the same traveling company still needs a producer/cast cross-check before linking them together. |
| Не подтверждено: Казань, 16 февраля | `80928775-6733-45a7-bea9-aeb2bb12cd6b` | Conflicting listings: [Yandex Afisha](https://afisha.yandex.ru/kazan/theatre_show/master-i-margarita-ogni-moskvy) says Olga Kabo / Anatoly Dobrynin; [Afisha](https://www.afisha.ru/performance/master-i-margarita-1004525/?priorityDates=2027-02-01--2027-02-28) lists the same date, venue and city under Valery Belyakovich. Do not assign this page to either group until the actual supplier listing is checked. |

Other formats (ballet, city quest, salon/monospectacle) remain separate pages and must not receive the touring drama's description or TourGroup.

### Confirmed Loginov/Begma examples

The following records have evidence of the Loginov/Begma staging: Воронеж `689927cd-0c61-4082-b27d-cf66d0988583`, Белгород `597d707c-3cf0-4c75-adf3-cf1512f540d9`, Вологда `c5c1c3f5-fa2e-4f10-9837-c5188cb9a790`, Майкоп `647aee3a-07f2-457a-911e-d8869bde486d`, Екатеринбург `5438fa1f-88a7-4456-ac61-5206a07e6c2b`, Тула `35dcfb21-d997-42c8-b6b1-23b8d2636418`. Examples: [Voronezh official hall](https://koncertzal.ru/afisha/spektakl-master-i-margarita/), [Yandex Afisha for Ekaterinburg](https://afisha.yandex.ru/yekaterinburg/theatre_show/master-i-margarita-viktor-loginov), and [Yandex Afisha artist itinerary](https://afisha.yandex.ru/artist/viktor-loginov?city=novocherkassk).

Chelyabinsk (`91bb7a87-8007-4b44-bd1b-73ef6ca323cb`) is not confirmed as the same staging: Ticketland lists director Dmitry Rachkovsky. Keep it separate until the performance company and cast are checked. For the remaining pages in the 36-page batch, title and shared provider copy are not sufficient evidence; do not leave them in a public tour group by default.

## Next safe data operation

1. Remove the title-only 36-page TourGroup assignment before exposing cross-links again.
2. Assign only the confirmed groups after checking active slots, exact local listings, and one page per city. Keep ambiguous pages ungrouped.
3. Prepare production-specific copy for each confirmed production; do not reuse the single generic rewrite across the different casts.
4. Consolidate the Zoo pages through the new backend service only after the alias-supporting code is deployed. Preserve all old URL paths and content revisions.

The current local branch has no production data changes, commit, push or deployment. Backend and web typechecks pass; tests were not run.

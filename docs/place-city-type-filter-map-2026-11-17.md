# Place catalog routes and exact filters

**Status:** Type taxonomy and route/filter map approved. Subtype-aware API
filtering is implemented in the current slice. City/global type landing routes
remain a separate implementation and SEO rollout.

City pages use `/{city}/{type}` and national pages use `/places/{type}`. These
catalog facets do not change the stable `/venues/{slug}` or
`/locations/{slug}` PDP URL. For each route, pass the listed `type` and
`subtype` query values to `/api/public/venues`; when both are present they are
an OR set (modern reviewed subtype OR legacy type fallback). Within a type
match, a non-empty editorial `placeType` overrides the legacy supplier kind.
Subtype matches require an explicit `placeSubtype` assignment.

| Route slug | UI label | `type` fallback values | `subtype` values | Notes |
| --- | --- | --- | --- | --- |
| `museums` | Музеи и галереи | `museum,art_space,museum_art_space` | `museum,gallery` | Museums and galleries may overlap with `art-spaces`. |
| `theatres` | Театры | `theatre,theater` | `theatre` | Concert halls are a separate facet. |
| `concert-halls` | Концертные залы и филармонии | `concert_hall` | `concert_hall,philharmonic` | Includes reviewed `THEATRE` and `VENUE` records. |
| `parks` | Парки и сады | `nature,park` | `park,garden` | Other nature records remain in their parent catalog until separately named. |
| `landmarks` | Достопримечательности | `architecture,monument,attraction` | `palace,estate,fortress,architectural_ensemble,monument,memorial,sculpture,square,observation_deck` | Editorial classification is required; a venue is not inferred by title alone. |
| `temples` | Храмы и монастыри | `religion,temple` | `church,chapel,cathedral,monastery,mosque,synagogue` | Explicit `RELIGION` / reviewed legacy records. |
| `art-spaces` | Арт-пространства и лофты | `art_space,museum_art_space` | `gallery,exhibition_hall` | Can overlap with `museums`. |
| `bar-restaurants` | Бары и рестораны | `gastro,bar,club_bar_restaurant` | `restaurant,cafe,bar` | The mixed legacy kind is a temporary broad fallback here. |
| `clubs` | Клубы | — | `club` | Requires explicit `placeType=VENUE`; old mixed kind is not enough. |
| `venues` | Банкетные и событийные площадки | `venue,meeting_point` | `stadium,arena` | Existing public kind fallback; no inferred subtype. |
| `entertainment` | Развлечения и семейный отдых | `entertainment,sport_activity_space` | `amusement_park,zoo,water_park,quest,observation_deck,circus,cinema,planetarium,aquarium` | Classification is editorial. |
| `walks` | Набережные и места для прогулок | `urban,outdoor_location` | `square,street,embankment,district` | Curated walk/outdoor records only. |
| `transport` | Причалы и точки отправления | `transport,pier,pier_water` | `pier,river_terminal,sea_terminal,marina,railway_station,airport,bus_station` | Boarding points require reviewed place records. |

## Club and bar/restaurant separation

`CLUB_BAR_RESTAURANT` is still a provider-era mixed value. For now, rows with
only this legacy value remain discoverable in `bar-restaurants` so that bars
and restaurants are not lost. They are not counted as clubs unless an editor
sets `placeType=VENUE` and `placeSubtype=club`. When the editor sets an
explicit place type, it wins over the old kind: a reviewed club therefore
leaves `bar-restaurants` and appears only in `clubs`.

No existing supplier rows are mass-reclassified by this change. The admin
already offers the `VENUE / club` subtype; review and classification can be
done per place. Category page counts and city indexability must use the exact
filtered API total, not the sum of parent type counters where facets overlap.

## Indexing and routing

Use the existing canon for both city and national type pages:

- 0 public, non-hidden places: 404, no category link, no sitemap entry.
- 1–2 places: 200, `noindex, follow`, canonical to the parent catalog.
- 3+ places: eligible for index/self-canonical and sitemap only when the city
  hub and real public PDP targets are published.

The city type route must resolve only for an approved city slug and one of the
registered route slugs above. Existing authored two-segment landings continue
to win for all non-registered second segments. Route implementation must read
this map, filter through the API, and calculate SEO eligibility from the
filtered result before it is enabled or added to sitemap.

# Snapshot: city content readiness (r6)

Sourced from the production DB on 2026-10-02. Regenerate with
`scripts/city-content-readiness.sql` (read-only).

Data: `city-content-readiness.csv` - 272 cities, 1638 live venues.

## Venues: the full picture

| | count |
|---|---|
| Venue rows total | 4304 |
| Ever had an event | 2433 |
| Has a future session ("live") | 1638 |
| Never had an event | 1871 |
| OUTDOOR_LOCATION | 242 |
| MEETING_POINT | 342 |

**The 1871 venues with no events are not junk.** A venue with a description,
an address and a photo is a long-tail SEO asset even with nothing scheduled.
They are 43% of the table and they were excluded from this snapshot by design -
see below.

## Readiness by city

Only venues with a future session are counted here.

```
TIER1       3 cities
TIER2       3 cities
TIER3      23 cities
NOT_READY 243 cities
```

Content coverage is the real constraint, not venue count:

| city | live venues | with text | pct |
|---|---|---|---|
| moskva | 351 | 37 | 11% |
| санкт-петербург | 245 | 38 | 16% |
| екатеринбург | 40 | 5 | 13% |

Address and photo coverage is near 100%. **Text is missing on roughly 89% of
venues.** That is what produces thin pages, not the number of URLs.

## Delta, last 24h

```
venues  created 22      updated 1635
events  created 282     updated 39708
sessions starting within 7 days: 8039
```

The updated counts reflect the nightly import, not human edits.

## Two cities named Moscow

```
city_524901 / moskva   351 live venues   core
city_tep_1  / москва    31 live venues   teplohod
```

One duplicate pair among 343 cities. Not a cleanup project.

**It is not a safe merge, though.** 204 venues hang off `city_tep_1` and 200 of
them have events; 15 share a name with a `moskva` venue. But those 15 are
entangled with duplicates *inside* moskva as well - "Live Stars" appears three
times, "Новодевичий Монастырь" carries two different canonical paths in moskva
alone. Merging the cities without untangling those first would silently drop
venues.

## Correction to earlier work

`canonicalPath` duplicates: **3 in the database**, not the 78 reported by the
r4 audit. The r4 CSV grouped sitemap paths, which is a different set. Do not
plan a migration on the 78 figure.
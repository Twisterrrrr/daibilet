# Broken venues — 19 rows with non-null `canonicalPath` (2026-09-25)

Source: MSK `Venue` WHERE id ∈ broken-190 AND `"canonicalPath" IS NOT NULL`.  
`public_slug` = list/sitemap latin slug; `db_slug` = DB slug.

| # | public_slug | kind | pageStatus | canonicalPath | notes |
|---|-------------|------|------------|---------------|-------|
| 1 | avtodrom-nizhegorodskoe-kolco | SPORT_ACTIVITY_SPACE | NONE | `/locations/avtodrom-nizhegorodskoe-kolco-5c94e42ac4927c000bdb8c34` | Group B |
| 2 | base | CONCERT_HALL | NONE | `/venues/base-63985a2fcae029a4d9184fee` | Group B; live **308** |
| 3 | centr-kultury | THEATER | CANDIDATE | `/venues/centr-kultury-5a7d54e0519f7b001ddd04e3` | Group A |
| 4 | centr-kultury-i-dosuga-rfyac-vniief | CONCERT_HALL | NONE | `/venues/centr-kultury-i-dosuga-rfyac-vniief-66d6dd0b821a3dc717040cef` | Group B |
| 5 | commode | CONCERT_HALL | NONE | `/venues/commode-64a1f92d943c5597458b518e` | Group B |
| 6 | cska-arena | SPORT_ACTIVITY_SPACE | NONE | `/locations/cska-arena-579f5b7e9cb5387ea1d87f5a` | Group B |
| 7 | dex | CLUB_BAR_RESTAURANT | NONE | `/locations/dex-6863e4f5f21530c9c9a44182` | Group B; **wrong family** (institution kind → `/locations`) |
| 8 | fort-krasnaya-gorka | MEETING_POINT | NONE | `/locations/fort-krasnaya-gorka-69faeb284799dc4a5c56bf0d` | Group B |
| 9 | g-chernogolovka | MUSEUM_ART_SPACE | CANDIDATE | `/venues/g-chernogolovka-6a0c6419ad6bf0ef3288c265` | Group A |
| 10 | gosudarstvennyi-ermitazh | CONCERT_HALL | CANDIDATE | `/venues/gosudarstvennyi-ermitazh-5c9b99e362f03f000c48bd3d` | twin/alias → live **308** на `ermitazh` |
| 11 | rossiiskaya-nacionalnaya-biblioteka | CONCERT_HALL | CANDIDATE | `/venues/rossiiskaya-nacionalnaya-biblioteka-5a688e66519f7b001ebe8661` | Group A; kind suspiciously CONCERT_HALL |
| 12 | sindikat | CONCERT_HALL | NONE | `/venues/sindikat-69941f5b6a63098a4494f695` | Group B |
| 13 | vechernyaya-moskva | THEATER | CANDIDATE | `/venues/vechernyaya-moskva-63fdf3efb5e5efc7f84eec4f` | Group A |
| 14 | zheleznodorozhnaya-stanciya-lebyazhe | MEETING_POINT | NONE | `/locations/zheleznodorozhnaya-stanciya-lebyazhe-69fad5a4d23c3fa2f9ffebb7` | Group B |
| 15 | banketnyi-zal-arbat-hall-1049 | PIER | CANDIDATE | `/locations/banketnyi-zal-arbat-hall-1049` | cyrillic DB slug; latin path; **kind noise** (PIER vs банкет-зал) |
| 16 | banketnyi-zal-arbat-holl-1050 | PIER | CANDIDATE | `/locations/banketnyi-zal-arbat-holl-1050` | same |
| 17 | dom-muzei-gogolya | MUSEUM_ART_SPACE | PUBLISHED | `/venues/дом-музеи-гоголя-5693cd…` | **cyrillic path**; PUBLISHED still 404 |
| 18 | moskvoreckaya-ul-parkovka-…-661 | PIER | CANDIDATE | `/locations/moskvoreckaya-ul-parkovka-…-661` | cyrillic DB slug; latin path |
| 19 | novodevichii-monastyr | MUSEUM_ART_SPACE | PUBLISHED | `/venues/новодевичии-монастырь-62931a…` | **cyrillic path**; twin vs TEMPLE canon |

## Patterns

| Pattern | n | Нужен отдельный проход? |
|---------|---|-------------------------|
| Latin slug + latin path, family matches kind | ~12 | Нет — после Group A/B станут 200 или уйдут из sitemap |
| **Wrong family** (`CLUB_BAR_RESTAURANT` → `/locations`) | 1 (`dex`) | Да, path-fix + 301 (класс path-fixes); не в Day-1 |
| **Cyrillic path** in DB | 2 (Gogol, Novodevichy museum) | Да — `venueCanonicalPath` / public slug; sitemap уже latin, stored path мусор |
| Cyrillic DB slug + latin path | 3 (банкет/парковка) | Ортогонально 404; slug-drift backlog |
| Twin / alias (`gosudarstvennyi-ermitazh`) | 1+ | Group C |

**Вывод:** отдельный массовый «кириллица/wrong-family» проход **не блокер** для Group A/B. Нужны точечно: 2 cyrillic paths, `dex` wrong-family, twins (Новодевичий + Эрмитаж-alias). Не смешивать с `isVenuePublic` wiring.

## Probe Event.status (READY vs HIDDEN)

| public slug | READY | HIDDEN | REVIEW | total |
|-------------|-------|--------|--------|-------|
| restoran-nezagorami | 11 | 2 | 11 | 24 |
| a2 | 1 | 0 | 1 | 2 |
| dom-muzei-gogolya | 1 | 2 | 0 | 3 |
| yarche | 2 | 1 | 0 | 3 |
| novodevichii-monastyr | 1 | 0 | 0 | 1 |

Все 5 имеют **READY≥1** + sessions в DB, но detail API 404 → **не** фильтр Event.status. Корневой soft-miss / hub gate в `buildPublicVenuePage`.

# Аудит живых 404 в sitemap - 2026-10-01

Прогон: все 210 URL, отдававшие 404 на 2026-09-30. Проверены на актуальном проде, `venues.xml` = 1524 URL.

## Итог

| Класс | Количество |
|---|---|
| Всего проверено | 210 |
| Всё ещё отдают 404 | 210 |
| **Остались в карте - это Fix B** | **127** |
| Убраны из карты Fix A | 83 |

Живых 404 в карте по чанкам: venues 124, events 3.

> Fix A отработал по своим дефектам: снял stale и HIDDEN, 503 не сработал ложно.
> Оставшиеся - не его класс. Это content gate в detail.

## Список для Fix B

| # | URL |
|---|---|
| 1 | https://daibilet.ru/locations/arena-mytischi |
| 2 | https://daibilet.ru/locations/konkobezhnyi-centr-kolomna |
| 3 | https://daibilet.ru/venues/astrahanskii-dvorec-kultury-arkadiya |
| 4 | https://daibilet.ru/venues/bar-modniki |
| 5 | https://daibilet.ru/venues/barton |
| 6 | https://daibilet.ru/venues/centr-kultury-i-dosuga-rfyac-vniief |
| 7 | https://daibilet.ru/venues/cirk-shapito-feniks |
| 8 | https://daibilet.ru/venues/ckr |
| 9 | https://daibilet.ru/venues/dk-miet |
| 10 | https://daibilet.ru/venues/dvorec-kultury-im-kurchatova |
| 11 | https://daibilet.ru/venues/kamernyi-teatr |
| 12 | https://daibilet.ru/venues/klub-ceppelin-n-5 |
| 13 | https://daibilet.ru/venues/klub-vagabond-mc |
| 14 | https://daibilet.ru/venues/mau-dvorec-kultury-vidnoe |
| 15 | https://daibilet.ru/venues/moet-lounge-and-night-club |
| 16 | https://daibilet.ru/venues/nacionalnyi-dramaticheskii-teatr |
| 17 | https://daibilet.ru/venues/park-prityazhenie |
| 18 | https://daibilet.ru/venues/restoran-kobzar |
| 19 | https://daibilet.ru/venues/restoran-wine-dine |
| 20 | https://daibilet.ru/venues/shato-terra |
| 21 | https://daibilet.ru/venues/veranda |
| 22 | https://daibilet.ru/venues/zelenyi-teatr |
| 23 | https://daibilet.ru/venues/zolotoi-bastion |
| 24 | https://daibilet.ru/events/progulka-s-uzhinom-muzykalnoi-programmoi-s-francuzskim-akkordionam-i-diskotekoi-na-teplohode-arturs-vechernyaya-moskva-v-og |
| 25 | https://daibilet.ru/events/vechernyaya-moskva-muzykalnyi-kruiz-s-zhivoi-muzykoi-uzhinom-i-bez-s-vidom-na-kreml-i-paryaschii-most-v-parke-zaryade-na-lyuks |
| 26 | https://daibilet.ru/locations/avtodrom-nizhegorodskoe-kolco |
| 27 | https://daibilet.ru/locations/zheleznodorozhnaya-stanciya-lebyazhe |
| 28 | https://daibilet.ru/venues/a2 |
| 29 | https://daibilet.ru/venues/biker-s-bar-the-underground |
| 30 | https://daibilet.ru/venues/chaihana-haribu |
| 31 | https://daibilet.ru/venues/commode |
| 32 | https://daibilet.ru/venues/grifel-plyus |
| 33 | https://daibilet.ru/venues/imperatorskii-morskoi-yaht-klub-sankt-peterburga |
| 34 | https://daibilet.ru/venues/kdc-saturn |
| 35 | https://daibilet.ru/venues/klub-amsterdam |
| 36 | https://daibilet.ru/venues/klub-stone |
| 37 | https://daibilet.ru/venues/koncertnyi-zal-yurgpu-npi |
| 38 | https://daibilet.ru/venues/mauk-gorodskoi-dvorec-kultury |
| 39 | https://daibilet.ru/venues/nacionalnyi-teatr-zolotoe-kolco |
| 40 | https://daibilet.ru/venues/nochnoi-klub-rai |
| 41 | https://daibilet.ru/venues/oktyabrskii-muzykalnyi-kolledzh |
| 42 | https://daibilet.ru/venues/starodubskii-centralnyi-dom-kultury |
| 43 | https://daibilet.ru/venues/teplohod-rivera |
| 44 | https://daibilet.ru/locations/banketnyi-zal-arbat-hall-1049 |
| 45 | https://daibilet.ru/locations/sortavala-ploschad-chkalova |
| 46 | https://daibilet.ru/venues/bar-restoran-doski |
| 47 | https://daibilet.ru/venues/bkz-kosmos |
| 48 | https://daibilet.ru/venues/ckdis |
| 49 | https://daibilet.ru/venues/dk-lk |
| 50 | https://daibilet.ru/venues/gosudarstvennaya-filarmoniya-respubliki-adygeya |
| 51 | https://daibilet.ru/venues/kaduiskii-centr-kulturnogo-razvitiya |
| 52 | https://daibilet.ru/venues/kdc-zimnii-teatr |
| 53 | https://daibilet.ru/venues/kirovskii-gorodskoi-dvorec-kultury |
| 54 | https://daibilet.ru/venues/koncertnyi-zal-sary-sadykovoi |
| 55 | https://daibilet.ru/venues/lockdown |
| 56 | https://daibilet.ru/venues/mauk-kulturno-dosugovyi-centr |
| 57 | https://daibilet.ru/venues/muzei-bogemnoi-zhizni-peterburga |
| 58 | https://daibilet.ru/venues/osobnyak-d-a-milyutina |
| 59 | https://daibilet.ru/venues/prostranstvo-c |
| 60 | https://daibilet.ru/venues/rdk-oktyabr |
| 61 | https://daibilet.ru/venues/resto-bar-assa |
| 62 | https://daibilet.ru/venues/restoran-nekrasov |
| 63 | https://daibilet.ru/venues/restoran-pasternak |
| 64 | https://daibilet.ru/venues/studio-57 |
| 65 | https://daibilet.ru/venues/vokzal-vladimir |
| 66 | https://daibilet.ru/locations/banketnyi-zal-arbat-holl-1050 |
| 67 | https://daibilet.ru/locations/fort-krasnaya-gorka |
| 68 | https://daibilet.ru/locations/stadion-rodina |
| 69 | https://daibilet.ru/locations/yarche |
| 70 | https://daibilet.ru/venues/burgernaya-grot |
| 71 | https://daibilet.ru/venues/dacha-v-peredelkino |
| 72 | https://daibilet.ru/venues/dk-istok |
| 73 | https://daibilet.ru/venues/dk-lyubercy |
| 74 | https://daibilet.ru/venues/dk-vpered |
| 75 | https://daibilet.ru/venues/encore |
| 76 | https://daibilet.ru/venues/gdk-shahter |
| 77 | https://daibilet.ru/venues/klub-artel |
| 78 | https://daibilet.ru/venues/klub-cokol |
| 79 | https://daibilet.ru/venues/muzei-v-temnote-sensorium |
| 80 | https://daibilet.ru/venues/podval-brodyachei-sobaki |
| 81 | https://daibilet.ru/venues/restoran-nezagorami |
| 82 | https://daibilet.ru/venues/schelkovskii-centralnyi-dvorec-kultury |
| 83 | https://daibilet.ru/venues/teatr-maska |
| 84 | https://daibilet.ru/venues/tverskaya-17-pod-arkoi-bolshoi-gnezdnikovskii-pereulok |
| 85 | https://daibilet.ru/venues/vibe |
| 86 | https://daibilet.ru/venues/volgogradskaya-filarmoniya |
| 87 | https://daibilet.ru/events/moskva-zlatoglavaya-krugovaya-rechnaya-progulka-po-moskve-reke-ot-kievskoi-do-kremlya-i-obratno-na-teplohode-avgustina-aleksi |
| 88 | https://daibilet.ru/venues/babaevskii-centr-kulturnogo-razvitiya |
| 89 | https://daibilet.ru/venues/centr-kultury |
| 90 | https://daibilet.ru/venues/dk-metallurg |
| 91 | https://daibilet.ru/venues/dk-ntmk |
| 92 | https://daibilet.ru/venues/dom-kultury-luch |
| 93 | https://daibilet.ru/venues/dom-muzei-gogolya |
| 94 | https://daibilet.ru/venues/dvorec-kultury-imeni-gagarina |
| 95 | https://daibilet.ru/venues/grand-hall |
| 96 | https://daibilet.ru/venues/irish-pub-molly |
| 97 | https://daibilet.ru/venues/raionnyi-dom-kultury-rdk |
| 98 | https://daibilet.ru/venues/serdce |
| 99 | https://daibilet.ru/venues/shahtinskii-dramaticheskii-teatr |
| 100 | https://daibilet.ru/venues/traktir-pivovarnya-balagan |
| 101 | https://daibilet.ru/venues/zavod |
| 102 | https://daibilet.ru/locations/cska-arena |
| 103 | https://daibilet.ru/locations/neskolko-ploschadok |
| 104 | https://daibilet.ru/venues/art-holl |
| 105 | https://daibilet.ru/venues/bar-restoran-pervyi-metallist |
| 106 | https://daibilet.ru/venues/centr-razvitiya-kultury |
| 107 | https://daibilet.ru/venues/dk-im-kalinina |
| 108 | https://daibilet.ru/venues/dk-kolomna |
| 109 | https://daibilet.ru/venues/dk-metallurgov |
| 110 | https://daibilet.ru/venues/dom-oficerov-ussuriiskogo-garnizona |
| 111 | https://daibilet.ru/venues/dvorec-kultury-imeni-v-n-leonova |
| 112 | https://daibilet.ru/venues/eiskii-gorodskoi-centr-narodnoi-kultury |
| 113 | https://daibilet.ru/venues/kaif-provenance |
| 114 | https://daibilet.ru/venues/kc-fortuna |
| 115 | https://daibilet.ru/venues/koncert-bar-inlife |
| 116 | https://daibilet.ru/venues/kongress-holl-stolica |
| 117 | https://daibilet.ru/venues/ktc-druzhba |
| 118 | https://daibilet.ru/venues/mau-dvorec-kultury-umr |
| 119 | https://daibilet.ru/venues/muzei-faberzhe |
| 120 | https://daibilet.ru/venues/okovoice-event-hall |
| 121 | https://daibilet.ru/venues/pravoberezhnyi-gorodskoi-dvorec-kultury |
| 122 | https://daibilet.ru/venues/probar |
| 123 | https://daibilet.ru/venues/red-hookan-bar |
| 124 | https://daibilet.ru/venues/resto-bar-panorama |
| 125 | https://daibilet.ru/venues/rk-forrest |
| 126 | https://daibilet.ru/venues/territoriya-open-air-club |
| 127 | https://daibilet.ru/venues/zooteatr-koshek-v-trk-globus |

## Причина

Площадок из списка нет как скрытых: `pageStatus` не `HIDDEN`, `events > 0`,
`isIndexable` проходит. `CANDIDATE` в detail разрешён -
`public-venue-read.js:505` отсекает только `NONE` и `HIDDEN`.

Блок выполняется только при `if (!sessions.length)`. Настоящий гейт:

- `hasAddressProfile` - нужен **и** `address`, **и** (`description` | `shortDescription`)
- `isContentPlaceHubEligible` - ветка content-place (must-see)

Отдельная задача: классифицировать каждый URL по колонкам `address`,
`description`, `shortDescription`, `hookFact`, `kind` одним запросом к списку
площадок, без вызова detail per URL.

/**
 * Editorial opening-hours overlay for open-date (museum/gallery) tickets.
 *
 * Catalog Venue has no openingHours column yet (wayToFind / parkingInfo / hookFact only).
 * Until finance/CMS ships a real field, keep a curated slug→hours map for major venues.
 * Do not invent hours for unknown live venues.
 */

export type VenueOpeningHoursSource = 'editorial' | 'order';

export type VenueOpeningHoursInfo = {
  /** One or more readable Russian lines, hyphen only. */
  lines: string[];
  source: VenueOpeningHoursSource;
};

/** Compact multi-line display for ticket card / print. */
export function formatVenueOpeningHoursLines(info: VenueOpeningHoursInfo | null | undefined): string | null {
  if (!info?.lines?.length) return null;
  const cleaned = info.lines.map((line) => String(line || '').trim()).filter(Boolean);
  return cleaned.length ? cleaned.join('\n') : null;
}

/**
 * Known major open-date venues (seed / must-see). Hours from published schedules;
 * holiday caveat stays on the ticket UI.
 */
const EDITORIAL_OPENING_HOURS_BY_SLUG: Record<string, string[]> = {
  "государственныи-геологическии-музеи-им-вернадского-58d0097cd352860017f35db4": [
    "Вт-Пт: 11:00-19:00",
    "Сб, Вс: 12:00-19:00",
    "Пн - выходной",
  ],
  "государственныи-музеи-а-с-пушкина-5bf694763dc0e5000bc16feb": [
    "Вт, Ср, Пт, Сб, Вс: 10:00-18:00",
    "Чт: 13:00-21:00",
    "Пн - выходной",
  ],
  "дом-музеи-гоголя-5693cd139cb53836a4dbec2c": [
    "Вт, Ср, Пт: 12:00-19:00",
    "Чт: 14:00-21:00",
    "Сб, Вс: 12:00-18:00",
    "Пн - выходной",
  ],
  "картинная-галерея-паршин-6991ec6651cf628fef564fdb": [
    "Пн-Вс: 11:00-20:00",
  ],
  "музеи-им-н-островского-5d61087e6be9adfb0dd8425b": [
    "Вт-Вс: 09:00-20:00",
    "Пн - выходной",
  ],
  "музеи-квартира-актеров-самоиловых-629a730956297debbec65aa0": [
    "Ср: 13:00-21:00",
    "Чт-Вс: 11:00-19:00",
    "Пн-Вт - выходной",
  ],
  "новодевичии-монастырь-62931a512b3d98181e4f888c": [
    "Ежедневно: 09:30-17:30",
  ],
  "покровскии-собор-638f165cb2496ab2eb6eb37a": [
    "Пн-Ср, Вс: 10:00-18:00",
    "Чт-Сб: 10:00-19:00",
    "1-я среда месяца - выходной",
  ],
  "abakan-natsional-nyy-muzey-respubliki-hakasiya": [
    "Вт: 11:00-18:00",
    "Ср, Пт-Вс: 10:00-18:00",
    "Чт: 10:00-19:00",
    "Пн - выходной",
  ],
  "arhangelsk-muzey-derevyannogo-zodchestva-malye-korely": [
    "1 июн - 6 сен: ежедневно 10:00-20:00",
    "7 сен - 31 мая: ежедневно 10:00-18:00",
  ],
  "astrahan-dom-muzey-borisa-kustodieva": [
    "Вт-Ср, Пт-Вс: 10:00-18:00",
    "Чт: 13:00-21:00",
    "Пн - выходной",
  ],
  "barnaul-gosudarstvennyy-hudozhestvennyy-muzey-altayskogo-kraya-ghmak": [
    "Вт-Вс: 10:00-18:00",
    "Чт: 11:00-19:00",
    "Пн - выходной",
  ],
  "belgorod-muzey-diorama-kurskaya-bitva-belgorodskoe-napravlenie": [
    "Вт-Вс: 10:00-21:00",
    "Пн - выходной",
  ],
  "blagoveschensk-amurskaya-oblast-amurskiy-oblastnoy-kraevedcheskiy-muzey-im-g-s-novikova-daurskogo": [
    "Вт-Вс: 10:00-19:00",
    "Пн - выходной",
  ],
  "cheboksary-chuvashskiy-natsionalnyy-muzey": [
    "Вт-Ср, Пт-Вс: 10:00-18:00",
    "Чт: 12:00-20:00",
    "Пн - выходной",
  ],
  "cheboksary-nauchno-tehnicheskiy-muzey-istorii-traktora": [
    "Пн-Пт: 08:00-18:00",
    "Сб-Вс: 09:00-17:00",
  ],
  "chelyabinsk-gosudarstvennyy-istoricheskiy-muzey-yuzhnogo-urala": [
    "Вт-Вс: 10:00-20:00",
    "Пн - выходной",
  ],
  "chita-muzey-dekabristov-mihaylo-arhangelskaya-tserkov": [
    "Вт-Вс: 10:00-18:00",
    "Пн - выходной",
  ],
  "ekaterinburg-el-tsin-tsentr": [
    "Вт-Вс: 10:00-21:00",
    "Пн - выходной",
  ],
  "erarta": [
    "Ежедневно: 10:00-22:00",
  ],
  // Official Main Museum Complex (hermitagemuseum.org / visitus): Mon closed;
  // Wed/Thu/Sun 11-18; Tue/Fri/Sat 11-20. Session-based entry - holiday caveat in UI.
  // SPBBOATS seed used 10:30 starts - superseded by official visitus schedule (2026-08).
  "ermitazh": [
    "Ср, Чт, Вс: 11:00-18:00",
    "Вт, Пт, Сб: 11:00-20:00",
    "Пн - выходной",
  ],
  "galereya-ili-glazunova-6225a53df0a5daf0e7ce8b21": [
    "Вт, Ср, Пт, Сб, Вс: 11:00-19:00",
    "Чт: 11:00-21:00",
    "Пн - выходной",
  ],
  "gmii-im-pushkina-672f34b6ebf4808956f1474a": [
    "Вт, Ср, Сб, Вс: 11:00-20:00",
    "Чт, Пт: 11:00-21:00",
    "Пн - выходной",
  ],
  "habarovsk-amurskiy-most-muzey-istorii-amurskogo-mosta": [
    "Вт-Вс: 10:00-17:00",
    "Пн - выходной",
  ],
  "habarovsk-habarovskiy-kraevoy-muzey-imeni-n-i-grodekova": [
    "Вт-Вс: 10:00-18:00",
    "Пн - выходной",
  ],
  "irkutsk-muzey-dekabristy": [
    "Вт-Вс: 10:00-18:00",
    "Пн - выходной",
  ],
  "irkutsk-usadba-sukacheva": [
    "Вт-Вс: 11:00-19:00",
    "Пн - выходной",
  ],
  "ivanovo-muzey-ivanovskogo-sittsa": [
    "Вт-Вс: 10:00-18:00",
    "Пн - выходной",
  ],
  "ivanovo-muzey-promyshlennosti-i-iskusstva-muzey-d-g-burylina": [
    "Вт-Вс: 10:00-18:00",
    "Пн - выходной",
  ],
  "izhevsk-muzey-strelkovogo-oruzhiya-imeni-m-t-kalashnikova": [
    "Вт-Ср, Пт-Вс: 11:00-19:00",
    "Чт: 11:00-21:00",
    "Пн - выходной",
  ],
  "kaliningrad-art-prostranstvo-vorota": [
    "Ежедневно: 09:00-21:00",
  ],
  "kaliningrad-fort-5": [
    "Ежедневно: 10:00-19:00",
  ],
  "kaliningrad-istoriko-hudozhestvennyy-muzey": [
    "Ежедневно: 10:00-18:00",
    "Чт-Пт: 10:00-20:00",
  ],
  "kaliningrad-muzey-bunker": [
    "Ежедневно: 10:00-19:00",
  ],
  "kaliningrad-muzey-izobrazitelnyh-iskusstv": [
    "Ежедневно: 10:00-19:00",
    "Чт-Пт: 10:00-21:00",
  ],
  "kaliningrad-muzey-kvartira-altes-haus": [
    "Пн-Сб: 10:00-19:00",
    "Вс - выходной",
  ],
  "kaliningrad-muzey-mirovogo-okeana": [
    "Вт-Вс: 10:00-19:00",
    "Пн - выходной",
  ],
  "kaliningrad-muzey-vodokanal": [
    "Пн-Сб: 10:00-17:00",
    "Вс - выходной",
  ],
  "kaliningrad-muzey-yantarya": [
    "Май-сен: ежедневно 10:00-19:00",
    "Окт-апр: Вт-Вс 10:00-18:00",
    "Окт-апр: Пн - выходной",
  ],
  "kaliningrad-smotrovaya-yantarnogo-kombinata": [
    "Ежедневно: 09:00-20:00",
  ],
  "kaliningrad-yantarnyy-kombinat": [
    "Ежедневно: 09:00-20:00",
  ],
  "kaluga-dom-muzey-k-e-tsiolkovskogo": [
    "Вт-Пт: 10:00-18:00",
    "Сб-Вс: 10:00-19:00",
    "Пн - выходной",
  ],
  "kaluga-gosudarstvennyy-muzey-istorii-kosmonavtiki-im-k-e-tsiolkovskogo": [
    "Вт-Пт: 10:00-18:00",
    "Сб-Вс: 10:00-19:00",
    "Пн - выходной",
  ],
  "kemerovo-kemerovskiy-oblastnoy-kraevedcheskiy-muzey": [
    "Вт-Вс: 10:00-19:00",
    "Пн - выходной",
  ],
  "kemerovo-muzey-zapovednik-krasnaya-gorka": [
    "Ежедневно: 10:00-21:00",
  ],
  "kemerovo-muzey-zapovednik-tomskaya-pisanitsa": [
    "Лето будни: 10:00-18:00",
    "Лето выходные: 10:00-19:00",
    "Зима Ср-Вс: 10:00-18:00",
    "Зима Пн-Вт - выходной",
  ],
  "kirov-kirovskaya-oblast-vyatskiy-paleontologicheskiy-muzey": [
    "Пн-Сб: 10:00-18:00",
    "Вс: 10:00-17:00",
  ],
  "kostroma-muzey-syra": [
    "Ежедневно: 10:00-18:00",
  ],
  "krasnoyarsk-muzey-usad-ba-v-i-surikova": [
    "Вт-Ср, Пт-Вс: 10:00-18:00",
    "Чт: 12:00-20:00",
    "Пн - выходной",
  ],
  "krasnoyarsk-parohod-muzey-svyatitel-nikolay": [
    "Окт-апр, Вт-Вс: 10:00-18:00",
    "Май-сен, Вт-Вс: 10:00-20:00",
    "Пн - выходной",
  ],
  "kurgan-kurganskiy-aviatsionnyy-muzey": [
    "Ср-Вс: 10:00-16:00",
    "Пн-Вт - выходной",
  ],
  "kurgan-muzey-istorii-goroda-kurgana-usadba-kuptsa-berezina": [
    "Вт-Чт, Сб: 10:00-18:00",
    "Пт: 10:00-19:00",
    "Вс, Пн - выходной",
  ],
  "kursk-kurskiy-gosudarstvennyy-oblastnoy-kraevedcheskiy-muzey": [
    "Пн-Чт, Сб-Вс: 10:30-17:30",
    "Пт - выходной",
  ],
  "kursk-muzey-usadba-a-a-feta": [
    "Вт-Вс: 10:00-17:00",
    "Пн - выходной",
  ],
  "lipeck-muzey-narodnogo-i-dekorativno-prikladnogo-iskusstva": [
    "Вт-Вс: 11:00-19:00",
    "Пн - выходной",
  ],
  "memorialnyi-muzei-a-n-skryabina-bolshoi-zal-633e7d3b1156365c15b6da1a": [
    "Ср, Пт, Сб, Вс: 12:00-20:00",
    "Чт: 13:00-21:00",
    "Пн, Вт - выходной",
  ],
  "moscow-evreyskiy-muzey": [
    "Вс-Чт: 12:00-22:00",
    "Пт: 10:00-15:00",
    "Сб - выходной",
  ],
  "moscow-muzey-bulgakova": [
    "Вт-Ср, Пт-Вс: 12:00-19:00",
    "Чт: 14:00-21:00",
    "Пн - выходной",
  ],
  "moscow-muzey-garazh": [
    "Ежедневно: 11:00-22:00",
  ],
  "moscow-muzey-kosmonavtiki": [
    "Вт-Сб: 10:00-21:00",
    "Вс: 10:00-19:00",
    "Пн - выходной",
  ],
  "moscow-muzey-moskvy": [
    "Вт-Вс: 11:00-21:00",
    "Пн - выходной",
  ],
  "moscow-muzey-russkogo-impressionizma": [
    "Пн-Вт, Пт-Вс: 11:00-20:00",
    "Ср-Чт: 12:00-21:00",
  ],
  "moscow-novaya-tretyakovka": [
    "Вт-Вс: 10:00-21:00",
    "Пн - выходной",
  ],
  "moscow-politehnicheskiy-muzey": [
    "Вт-Чт, Сб-Вс: по расписанию экскурсий",
    "Пн, Пт - выходной",
  ],
  "moscow-tret-yakovskaya-galereya": [
    "Вт, Ср, Вс: 10:00-18:00",
    "Чт, Пт, Сб: 10:00-21:00",
    "Пн - выходной",
  ],
  "moskovskiy-zoopark-3013563d956d": [
    "Ежедневно: 07:30-21:00",
  ],
  "murmansk-murmanskiy-oblastnoy-kraevedcheskiy-muzey": [
    "Вт-Вс: 11:00-20:00",
    "Пн - выходной",
  ],
  "muzei-benua-na-vasilevskom-5bc4567597a630000ce38d64": [
    "Ежедневно: 09:00-22:00",
  ],
  "muzei-karla-bully-688a364c4653f82b8cdd3734": [
    "Ежедневно: 11:00-20:00",
  ],
  "muzei-sovremennogo-iskusstva-permm-5e4423fcaadb42a1889abee3": [
    "Вт-Вс: 12:00-21:00",
    "Пн - выходной",
  ],
  "muzei-usadba-g-r-derzhavina-5a04a866515e3500198b0d76": [
    "Пн, Ср, Пт, Сб, Вс: 10:30-18:00",
    "Чт: 12:00-20:00",
    "Вт - выходной",
  ],
  "muzeinyi-centr-ploschad-mira-5b59418f515e35001ebf3c42": [
    "Вт, Ср, Пт, Сб, Вс: 11:00-19:00",
    "Чт: 13:00-21:00",
    "Пн - выходной",
  ],
  "muzeinyi-kompleks-verhnyaya-pyshma-69ce61cbda2cf85a00abb80d": [
    "Вт-Вс: 10:00-19:00",
    "Пн - выходной",
  ],
  "muzej-hohlovka": [
    "Май-окт: ежедневно 10:00-18:00",
    "Ноя-апр: Вт-Вс 10:00-18:00",
    "Зима: Пн - выходной",
  ],
  "nizhny-novgorod-arsenal-gtsisi": [
    "Вт-Вс: 12:00-20:00",
    "Пн - выходной",
  ],
  "nizhny-novgorod-muzey-istorii-gaz": [
    "Пн-Вс: 09:00-19:00",
    "Последняя пятница месяца - выходной",
  ],
  "nizhny-novgorod-russkiy-muzey-fotografii": [
    "Вт-Вс: 11:00-19:00",
    "Пн - выходной",
  ],
  "nizhny-novgorod-tehnicheskiy-muzey": [
    "Вт-Вс: 11:00-18:00",
    "Пн - выходной",
  ],
  "novaya-tretyakovskaya-galereya-ff57ae659039": [
    "Вт-Вс: 10:00-21:00",
    "Пн - выходной",
  ],
  "novosibirsk-muzey-mirovoy-pogrebal-noy-kul-tury": [
    "Вт-Вс: 11:00-19:00",
    "Пн - выходной",
  ],
  "novosibirsk-novosibirskiy-hudozhestvennyy-muzey": [
    "Вт-Вс: 11:00-19:00",
    "Пн - выходной",
  ],
  "orel-muzey-i-s-turgeneva": [
    "Вт-Ср: 09:00-18:00",
    "Чт: 09:00-20:00",
    "Пт-Вс: 09:00-18:00",
    "Пн - выходной",
  ],
  "orenburg-muzey-kosmonavtiki": [
    "Пн-Пт: 09:00-17:00",
    "Сб-Вс - выходной",
  ],
  "penza-muzey-odnoy-kartiny-im-g-v-myasnikova": [
    "Вт-Ср, Пт-Вс: 10:00-18:00",
    "Пн, Чт - выходной",
  ],
  "penza-muzey-zapovednik-tarhany": [
    "Май-авг: Ср-Вс 10:00-18:00",
    "Сен-апр: Ср-Вс 09:00-17:00",
    "Вт - выходной",
  ],
  "perm-maris-art": [
    "Пн-Пт: 12:00-18:00",
    "Сб: 12:00-16:00",
    "Вс - выходной",
  ],
  "perm-muzey-diorama-vyshka": [
    "Ср-Вс: 10:00-18:00",
    "Пн-Вт - выходной",
  ],
  "perm-muzey-motovilihinskih-zavodov": [
    "Ср-Пт: 09:00-18:00",
    "Сб-Вс: 10:00-19:00",
    "Пн-Вт - выходной",
  ],
  "perm-muzey-permskikh-drevnostey": [
    "Вт-Вс: 10:00-19:00",
    "Пн - выходной",
  ],
  "permskaya-galereya": [
    "Вт-Пт: 12:00-21:00",
    "Сб-Вс: 10:00-21:00",
    "Пн - выходной",
  ],
  "petrovskii-putevoi-dvorec-5cd1bf3d079a40000c1e0639": [
    "Только по экскурсии (запись заранее)",
    "Пн и последняя пятница месяца - выходной",
  ],
  "planetarii-1-5b30cfdd519f7b001a12d8be": [
    "Ежедневно: 10:00-22:00",
  ],
  "russkiy-muzey-c5b60f6c6057": [
    "Пн: 10:00-20:00",
    "Ср, Пт-Вс: 10:00-18:00",
    "Чт: 13:00-21:00",
    "Вт - выходной",
  ],
  "ryazan-muzey-istorii-ryazanskogo-ledentsa": [
    "Ежедневно: 10:00-18:00",
  ],
  "ryazan-muzey-usad-ba-akademika-i-p-pavlova": [
    "Вт-Пт: 09:00-18:00",
    "Сб-Вс: 10:00-18:00",
    "Пн - выходной",
  ],
  "ryazan-muzey-zapovednik-s-a-esenina-v-konstantinovo": [
    "Пн-Пт: 10:00-18:00",
    "Сб-Вс: 10:00-20:00",
  ],
  "saint-petersburg-artilleriyskiy-muzey": [
    "Ср-Вс: 11:00-18:00",
    "Пн-Вт - выходной",
  ],
  "saint-petersburg-buddiyskiy-datsan-gunzechoyney": [
    "Пн-Вт, Чт-Вс: 10:00-19:00",
    "Ср - выходной",
  ],
  "saint-petersburg-glavnyy-shtab-ermitazh": [
    "Ср, Чт, Вс: 11:00-18:00",
    "Вт, Пт, Сб: 11:00-20:00",
    "Пн - выходной",
  ],
  "saint-petersburg-kunstkamera": [
    "Вт-Вс: 10:00-18:00",
    "Пн - выходной",
  ],
  "saint-petersburg-literaturno-memorialnyy-muzey-dostoevskogo": [
    "Вт, Чт-Вс: 11:00-18:00",
    "Ср: 13:00-20:00",
    "Пн - выходной",
  ],
  "saint-petersburg-muzey-anny-ahmatovoy-v-fontannom-dome": [
    "Вт, Чт-Вс: 10:30-18:30",
    "Ср: 12:00-20:00",
    "Пн - выходной",
  ],
  "saint-petersburg-muzey-faberzhe": [
    "Ежедневно: 10:00-20:45",
  ],
  "saint-petersburg-muzey-oborony-i-blokady-leningrada": [
    "Пн, Ср-Вс: 10:00-18:00",
    "Вт - выходной",
  ],
  "saint-petersburg-muzey-politicheskoy-istorii-osobnyak-kshesinskoy": [
    "Вт, Чт-Вс: 10:00-18:00",
    "Ср: 10:00-20:00",
    "Пн - выходной",
  ],
  "saint-petersburg-muzey-sovetskih-igrovyh-avtomatov": [
    "Ежедневно: 11:00-21:00",
  ],
  "saint-petersburg-muzey-voenno-morskoy-slavy": [
    "Вт-Вс: 10:00-19:00",
    "Пн - выходной",
  ],
  "saint-petersburg-muzey-zheleznyh-dorog-rossii": [
    "Чт-Пн: 10:00-18:00",
    "Ср: 12:30-20:30",
    "Вт - выходной",
  ],
  "saint-petersburg-russkiy-muzey": [
    "Пн: 10:00-20:00",
    "Ср, Пт-Вс: 10:00-18:00",
    "Чт: 13:00-21:00",
    "Вт - выходной",
  ],
  "saint-petersburg-tsentralnyy-voenno-morskoy-muzey": [
    "Пн, Ср-Вс: 10:00-18:00",
    "Вт - выходной",
  ],
  "saint-petersburg-zoologicheskiy-muzey-ran": [
    "Пн, Ср-Вс: 11:00-19:00",
    "Вт - выходной",
  ],
  "samara-muzey-samara-kosmicheskaya": [
    "Вт-Ср, Пт-Вс: 10:00-18:00",
    "Чт: 12:00-20:00",
    "Пн - выходной",
  ],
  "saransk-muzey-izobrazitelnyh-iskusstv-im-s-d-erzi": [
    "Вт-Ср, Пт-Вс: 09:00-18:00",
    "Чт: 11:00-20:00",
    "Пн - выходной",
  ],
  "saransk-muzey-mordovskoy-narodnoy-kultury": [
    "Вт-Ср, Пт-Вс: 09:00-18:00",
    "Чт: 11:00-20:00",
    "Пн - выходной",
  ],
  "saratov-saratovskiy-hudozhestvennyy-muzey-imeni-a-n-radischeva": [
    "Вт-Ср, Сб-Вс: 10:00-18:00",
    "Чт-Пт: 12:00-20:00",
    "Пн - выходной",
  ],
  "sevastopol-muzey-chernomorskogo-flota": [
    "Ср-Вс: 10:00-18:00",
    "Пн-Вт - выходной",
  ],
  "sevastopol-muzey-zapovednik-hersones-tavricheskiy": [
    "Пн-Вс: 09:00-18:00",
  ],
  "stavropol-tatarskoe-gorodische": [
    "Ср-Вс: 10:00-18:00",
    "Пн-Вт - выходной",
  ],
  "syktyvkar-natsionalnaya-galereya-respubliki-komi": [
    "Вт-Ср, Пт-Вс: 10:00-18:00",
    "Чт: 10:00-20:00",
    "Пн - выходной",
  ],
  "tambov-muzey-usadba-aseevyh": [
    "Вт-Ср, Пт-Вс: 10:00-18:00",
    "Чт: 13:00-21:00",
    "Пн - выходной",
  ],
  "tambov-tambovskiy-oblastnoy-kraevedcheskiy-muzey": [
    "Вт-Вс: 10:00-18:00",
    "Пн - выходной",
  ],
  "tomsk-muzey-istorii-tomska": [
    "Вт-Вс: 10:00-19:00",
    "Пн - выходной",
  ],
  "tomsk-muzey-slavyanskoy-mifologii": [
    "Пн-Вс: 10:00-19:00",
  ],
  "tula-muzey-oruzhiya-shlem": [
    "Пн-Ср, Вс: 10:00-18:00",
    "Чт-Сб: 10:00-20:00",
  ],
  "tula-muzey-usad-ba-l-n-tolstogo-yasnaya-polyana": [
    "Вт-Пт: 09:00-20:00",
    "Сб-Вс: 10:00-21:00",
    "Пн - выходной",
  ],
  "tula-tvorcheskiy-industrial-nyy-klaster-oktava": [
    "Пн-Вс: 12:00-21:00",
  ],
  "ulan-ude-etnograficheskiy-muzey": [
    "Ср-Пт: 10:00-18:30",
    "Сб-Вс: 10:00-19:00",
    "Пн-Вт - выходной",
  ],
  "ulyanovsk-golovnoy-muzey-istorii-grazhdanskoy-aviatsii": [
    "Вт-Пт: 10:00-17:00",
    "Сб-Вс: 10:00-16:00",
    "Пн - выходной",
  ],
  "ulyanovsk-muzey-zapovednik-rodina-v-i-lenina": [
    "Вт-Вс: 10:00-18:00",
    "Пн - выходной",
  ],
  "veliky-novgorod-muzey-derevyannogo-zodchestva-vitoslavlitsy": [
    "Май-авг: ежедневно 10:00-20:00",
    "Апр, сен: ежедневно 10:00-18:00",
    "Окт-мар: ежедневно 10:00-17:00",
  ],
  "volgograd-muzey-panorama-stalingradskaya-bitva": [
    "Вт-Пт, Вс: 10:00-18:00",
    "Сб: 10:00-20:00",
    "Пн - выходной",
  ],
  "vologda-muzey-kruzheva": [
    "Ср-Вс: 10:00-17:30",
    "Пн-Вт - выходной",
  ],
  "vologda-muzey-mir-zabytyh-veschey": [
    "Ср-Вс: 10:00-17:30",
    "Пн-Вт - выходной",
  ],
  "voronezh-korabl-muzey-goto-predestinatsiya": [
    "Ср: 11:00-18:00",
    "Чт: 12:00-20:00",
    "Пт-Вс: 10:00-18:00",
    "Пн-Вт - выходной",
  ],
  "yaroslavl-yaroslavskiy-hudozhestvennyy-muzey": [
    "Вт-Чт, Вс: 10:00-20:00",
    "Пт-Сб: 11:00-21:00",
    "Пн - выходной",
  ],
  "yuzhno-sahalinsk-muzeyno-memorialnyy-kompleks-pobeda": [
    "Вт-Чт, Вс: 11:00-18:00",
    "Пт: 11:00-20:00",
    "Сб: 11:00-19:00",
    "Пн - выходной",
  ],
  "yuzhno-sahalinsk-sahalinskiy-oblastnoy-kraevedcheskiy-muzey": [
    "Вт-Вс: 10:00-18:00",
    "Пн - выходной",
  ],
};

function normalizeVenueSlug(slug: string | null | undefined): string {
  return String(slug || '')
    .trim()
    .toLowerCase();
}

/** Resolve hours for a venue slug from the editorial overlay (null if unknown). */
export function resolveVenueOpeningHours(
  venueSlug: string | null | undefined,
): VenueOpeningHoursInfo | null {
  const key = normalizeVenueSlug(venueSlug);
  if (!key) return null;
  const lines = EDITORIAL_OPENING_HOURS_BY_SLUG[key];
  if (!lines?.length) return null;
  return { lines: [...lines], source: 'editorial' };
}

/** Prefer order-provided hours text; else editorial map by slug. */
export function resolveTicketOpeningHours(input: {
  venueSlug?: string | null;
  venueOpeningHours?: string | null;
}): string | null {
  const fromOrder = String(input.venueOpeningHours || '').trim();
  if (fromOrder) return fromOrder;
  return formatVenueOpeningHoursLines(resolveVenueOpeningHours(input.venueSlug));
}

/** Open-date warning when concrete hours are shown. */
export const OPEN_DATE_HOURS_HOLIDAY_NOTE =
  'В праздники график может отличаться - сверяйте с официальным сайтом площадки.';

/** Open-date warning when hours are unknown. */
export const OPEN_DATE_HOURS_UNKNOWN_NOTE =
  'Уточняйте график работы в планируемый день посещения. Режим и правила посещения - на официальном сайте площадки, особенно в праздники.';

/** Session / dated ticket arrival warning. */
export const SESSION_ARRIVE_EARLY_NOTE =
  'Рекомендуем приходить за 15-20 минут до указанного времени. При опоздании билеты могут быть аннулированы.';

/** @internal test helper */
export function __editorialOpeningHoursCountForTests(): number {
  return Object.keys(EDITORIAL_OPENING_HOURS_BY_SLUG).length;
}

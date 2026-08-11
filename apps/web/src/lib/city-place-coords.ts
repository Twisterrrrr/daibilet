/**
 * Editorial lat/lng for city must-see when hub venues omit the place
 * (0-event content places or city page session-only venue list).
 */

export type EditorialPlaceCoords = {
  latitude: number;
  longitude: number;
};

/** Nizhny Novgorod: classic 6 + owner pack 30 must-see + 10 gastro. */
const NIZHNY_NOVGOROD_COORDS: Record<string, EditorialPlaceCoords> = {
  'nizhny-novgorod-nizhegorodskiy-kreml': { latitude: 56.328318, longitude: 44.002824 },
  'nizhny-novgorod-chkalovskaya-lestnitsa': { latitude: 56.330889, longitude: 44.009278 },
  'nizhny-novgorod-bol-shaya-pokrovskaya-ulitsa': { latitude: 56.321684, longitude: 43.996155 },
  'nizhny-novgorod-nizhegorodskaya-kanatnaya-doroga': { latitude: 56.324209, longitude: 44.038758 },
  'nizhny-novgorod-strelka-rek-volgi-i-oki': { latitude: 56.333889, longitude: 43.990833 },
  'nizhny-novgorod-naberezhnaya-fedorovskogo': { latitude: 56.326887, longitude: 43.980644 },
  'nizhny-novgorod-nizhegorodskaya-yarmarka': { latitude: 56.3275, longitude: 43.962222 },
  'nizhny-novgorod-usadba-rukavishnikovyh': { latitude: 56.329864, longitude: 44.017772 },
  'nizhny-novgorod-gosudarstvennyy-bank': { latitude: 56.322301, longitude: 44.002875 },
  'nizhny-novgorod-ploschad-minina-i-pozharskogo': { latitude: 56.326759, longitude: 44.00624 },
  'nizhny-novgorod-palaty-stroganovyh': { latitude: 56.327521, longitude: 43.985906 },
  'nizhny-novgorod-romodanovskiy-vokzal': { latitude: 56.32174, longitude: 43.97825 },
  'nizhny-novgorod-ploschad-lyadova': { latitude: 56.312953, longitude: 43.987786 },
  'nizhny-novgorod-domik-petra-i': { latitude: 56.326269, longitude: 43.999658 },
  'nizhny-novgorod-nizhne-volzhskaya-naberezhnaya': { latitude: 56.330441, longitude: 43.996112 },
  'nizhny-novgorod-verhne-volzhskaya-naberezhnaya': { latitude: 56.329971, longitude: 44.013589 },
  'nizhny-novgorod-rozhdestvenskaya-ulitsa': { latitude: 56.328328, longitude: 43.990471 },
  'nizhny-novgorod-park-shveytsariya': { latitude: 56.279883, longitude: 43.978183 },
  'nizhny-novgorod-sormovskiy-park': { latitude: 56.347717, longitude: 43.896656 },
  'nizhny-novgorod-pochainskiy-bulvar': { latitude: 56.326305, longitude: 43.997233 },
  'nizhny-novgorod-aleksandrovskiy-sad': { latitude: 56.330556, longitude: 44.022222 },
  'nizhny-novgorod-pakgauzy-na-strelke': { latitude: 56.333967, longitude: 43.972304 },
  'nizhny-novgorod-schelokovskiy-hutor': { latitude: 56.280145, longitude: 44.032644 },
  'nizhny-novgorod-sobor-aleksandra-nevskogo': { latitude: 56.333019, longitude: 43.975412 },
  'nizhny-novgorod-stroganovskaya-tserkov': { latitude: 56.327539, longitude: 43.984247 },
  'nizhny-novgorod-pecherskiy-monastyr': { latitude: 56.322964, longitude: 44.050419 },
  'nizhny-novgorod-blagoveschenskiy-monastyr': { latitude: 56.323561, longitude: 43.97495 },
  'nizhny-novgorod-mihailo-arhangelskiy-sobor': { latitude: 56.328461, longitude: 44.002241 },
  'nizhny-novgorod-staroyarmarochnyy-sobor': { latitude: 56.333333, longitude: 43.961944 },
  'nizhny-novgorod-arsenal-gtsisi': { latitude: 56.328325, longitude: 44.004128 },
  'nizhny-novgorod-muzey-istorii-gaz': { latitude: 56.251919, longitude: 43.890692 },
  'nizhny-novgorod-domik-kashirina': { latitude: 56.326317, longitude: 43.993742 },
  'nizhny-novgorod-tehnicheskiy-muzey': { latitude: 56.319522, longitude: 43.997238 },
  'nizhny-novgorod-russkiy-muzey-fotografii': { latitude: 56.323531, longitude: 44.004128 },
  'nizhny-novgorod-pamyatnik-zhyulyu-vernu': { latitude: 56.325333, longitude: 43.980417 },
  'nizhny-novgorod-kater-geroy': { latitude: 56.331289, longitude: 44.009389 },
  'nizhny-novgorod-seledka-i-kofe': { latitude: 56.327572, longitude: 43.987747 },
  'nizhny-novgorod-bezuhov-cafe': { latitude: 56.329241, longitude: 43.992224 },
  'nizhny-novgorod-lepi-testo': { latitude: 56.321045, longitude: 44.001243 },
  'nizhny-novgorod-yale-restaurant': { latitude: 56.326884, longitude: 43.984534 },
  'nizhny-novgorod-red-wall-restaurant': { latitude: 56.330312, longitude: 43.99845 },
  'nizhny-novgorod-pyatkin-traktir': { latitude: 56.329432, longitude: 43.990112 },
  'nizhny-novgorod-mitrich-restaurant': { latitude: 56.324541, longitude: 44.020114 },
  'nizhny-novgorod-mednye-truby-bar': { latitude: 56.326102, longitude: 43.983115 },
  'nizhny-novgorod-yula-pizza': { latitude: 56.322998, longitude: 44.004512 },
  'nizhny-novgorod-fonoteca-bar': { latitude: 56.319874, longitude: 43.996841 },
};

const SAINT_PETERSBURG_COORDS: Record<string, EditorialPlaceCoords> = {
  'saint-petersburg-sobornaya-mechet': { latitude: 59.9552, longitude: 30.3239 },
  // Berthold → New Holland walk (Kryukov Nikolo, not Kronstadt).
  'saint-petersburg-bertgold-tsentr': { latitude: 59.9258, longitude: 30.3164 },
  'saint-petersburg-naberezhnaya-kanala-griboedova': { latitude: 59.935111, longitude: 30.326814 },
  'saint-petersburg-lvinyy-most': { latitude: 59.926944, longitude: 30.301111 },
  'saint-petersburg-nikolo-bogoyavlenskiy-morskoy-sobor': { latitude: 59.9225, longitude: 30.3005 },
  'saint-petersburg-semimoste': { latitude: 59.9275, longitude: 30.2958 },
  'saint-petersburg-kolomna': { latitude: 59.9252, longitude: 30.2935 },
  'saint-petersburg-kryukov-kanal': { latitude: 59.9268, longitude: 30.2952 },
  'saint-petersburg-tsentralnyy-voenno-morskoy-muzey': { latitude: 59.929811, longitude: 30.294124 },
  'saint-petersburg-poceluev-most': { latitude: 59.928889, longitude: 30.295833 },
  'saint-petersburg-yusupovskiy-dvorets': { latitude: 59.929532, longitude: 30.303912 },
  'saint-petersburg-novaya-gollandiya': { latitude: 59.929112, longitude: 30.289214 },
  'saint-petersburg-spikizi-bar-el-copitas': { latitude: 59.927114, longitude: 30.347112 },
};

/** Perm fallback coords (cityInfo items also carry lat/lng for my-day). */
const PERM_COORDS: Record<string, EditorialPlaceCoords> = {
  'naberezhnaya-kamy': { latitude: 58.0211, longitude: 56.2464 },
  'perm-schaste-ne-za-gorami': { latitude: 58.0224, longitude: 56.252 },
  'permskaya-esplanada': { latitude: 58.0105, longitude: 56.2285 },
  'perm-sobornaya-ploschad': { latitude: 58.0163, longitude: 56.2378 },
  'perm-starokirpichnyy-pereulok': { latitude: 58.0139, longitude: 56.2427 },
  'perm-park-gorkogo': { latitude: 58.0051, longitude: 56.2524 },
  'perm-rayskiy-sad': { latitude: 58.0315, longitude: 56.3129 },
  'permskaya-galereya': { latitude: 58.0175, longitude: 56.2541 },
  'perm-muzey-permskikh-drevnostey': { latitude: 58.0125, longitude: 56.2494 },
  'perm-dom-meshkova': { latitude: 58.0191, longitude: 56.2443 },
  'perm-permm': { latitude: 58.0104, longitude: 56.2166 },
  'perm-teatr-opery-i-baleta': { latitude: 58.0161, longitude: 56.2479 },
  'teatr-teatr': { latitude: 58.0091, longitude: 56.2185 },
  'perm-muzey-motovilihinskih-zavodov': { latitude: 58.0339, longitude: 56.3155 },
  'perm-muzey-diorama-vyshka': { latitude: 58.0345, longitude: 56.3216 },
  'perm-cgk': { latitude: 58.0108, longitude: 56.2494 },
  'perm-maris-art': { latitude: 58.0305, longitude: 56.3023 },
  'perm-galereya-2517': { latitude: 58.0138, longitude: 56.2497 },
  'perm-park-nauki-nyuton': { latitude: 57.9995, longitude: 56.2625 },
  'perm-zavod-shpagina': { latitude: 58.0202, longitude: 56.2554 },
  'permsky-solenye-ushi': { latitude: 58.0108, longitude: 56.2415 },
  'perm-permskiy-medved': { latitude: 58.0116, longitude: 56.2393 },
  'perm-dom-gribushina': { latitude: 58.0177, longitude: 56.2514 },
  'perm-bashnya-smerti': { latitude: 57.9944, longitude: 56.2573 },
  'perm-sobor-petra-i-pavla': { latitude: 58.0185, longitude: 56.2559 },
  'perm-voznesenskaya-tserkov': { latitude: 58.0069, longitude: 56.2291 },
  'perm-park-kamney-permskie-vorota': { latitude: 58.0035, longitude: 56.1916 },
  'perm-chomga': { latitude: 58.0055, longitude: 56.2519 },
  'perm-permskie-posikunchiki': { latitude: 58.0135, longitude: 56.2412 },
  'perm-nolan-wine-kitchen': { latitude: 58.0121, longitude: 56.2341 },
  'perm-belka': { latitude: 58.0108, longitude: 56.2505 },
  'perm-partizan': { latitude: 58.0169, longitude: 56.2345 },
  'perm-demidovskaya-pivovarnya': { latitude: 58.0133, longitude: 56.2435 },
  'perm-cup-by-cup': { latitude: 58.0094, longitude: 56.2526 },
  'perm-gastroport': { latitude: 58.0183, longitude: 56.2163 },
  'muzej-hohlovka': { latitude: 58.26186, longitude: 56.26314 },
  'perm-kungur': { latitude: 57.4333, longitude: 56.95 },
  'perm-kungurskaya-ledyanaya-peshchera': { latitude: 57.4409, longitude: 57.006 },
  'perm-belaya-gora': { latitude: 57.39202, longitude: 56.229 },
  'perm-belogorskiy-monastyr': { latitude: 57.39202, longitude: 56.229 },
  'perm-gubakha-usva': { latitude: 58.723, longitude: 57.633 },
  'perm-usvinskie-stolby': { latitude: 58.7175, longitude: 57.6152 },
  'perm-kamennyy-gorod': { latitude: 58.72359, longitude: 57.63404 },
};

const EDITORIAL_COORDS_BY_SLUG: Record<string, EditorialPlaceCoords> = {
  ...NIZHNY_NOVGOROD_COORDS,
  ...SAINT_PETERSBURG_COORDS,
  ...PERM_COORDS,
};

export function lookupEditorialPlaceCoords(
  slug: string | null | undefined,
): EditorialPlaceCoords | null {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return null;
  return EDITORIAL_COORDS_BY_SLUG[key] || null;
}

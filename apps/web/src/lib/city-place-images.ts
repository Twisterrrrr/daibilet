/**
 * Editorial hero covers for /my-day Hot Picks, location/venue catalog cards & PDP
 * when hub omits heroImageUrl or only has a dark /venues/generated stub.
 * Same files feed Top-100 blog inlines (copied under /images/blog/spb-top-100-p*.jpg);
 * catalog/my-day use /images/venues/{city}/*.jpg and object-cover for aspect.
 * Nizhny pack: /images/venues/nizhny-novgorod/*.jpg
 * SPB pack: /images/venues/saint-petersburg/*.jpg (Top-100 + Главные)
 */

const NIZHNY_NOVGOROD_IMAGES: Record<string, string> = {
  "nizhny-novgorod-nizhegorodskaya-yarmarka": "/images/venues/nizhny-novgorod/nizhegorodskaya-yarmarka.jpg",
  "nizhny-novgorod-usadba-rukavishnikovyh": "/images/venues/nizhny-novgorod/usadba-rukavishnikovyh.jpg",
  "nizhny-novgorod-gosudarstvennyy-bank": "/images/venues/nizhny-novgorod/gosbank-nnov.jpg",
  "nizhny-novgorod-ploschad-minina-i-pozharskogo": "/images/venues/nizhny-novgorod/ploshchad-minina.jpg",
  "nizhny-novgorod-palaty-stroganovyh": "/images/venues/nizhny-novgorod/palaty-stroganovyh.jpg",
  "nizhny-novgorod-romodanovskiy-vokzal": "/images/venues/nizhny-novgorod/romodanovskiy-vokzal.jpg",
  "nizhny-novgorod-ploschad-lyadova": "/images/venues/nizhny-novgorod/ploshchad-lyadova.jpg",
  "nizhny-novgorod-domik-petra-i": "/images/venues/nizhny-novgorod/domik-petra.jpg",
  "nizhny-novgorod-nizhne-volzhskaya-naberezhnaya": "/images/venues/nizhny-novgorod/nizhne-volzhskaya-naberezhnaya.jpg",
  "nizhny-novgorod-verhne-volzhskaya-naberezhnaya": "/images/venues/nizhny-novgorod/verhne-volzhskaya-naberezhnaya.jpg",
  "nizhny-novgorod-rozhdestvenskaya-ulitsa": "/images/venues/nizhny-novgorod/rozhdestvenskaya-street.jpg",
  "nizhny-novgorod-park-shveytsariya": "/images/venues/nizhny-novgorod/park-shvejtsariya.jpg",
  "nizhny-novgorod-sormovskiy-park": "/images/venues/nizhny-novgorod/sormovskiy-park.jpg",
  "nizhny-novgorod-pochainskiy-bulvar": "/images/venues/nizhny-novgorod/pochainskiy-bulvar.jpg",
  "nizhny-novgorod-aleksandrovskiy-sad": "/images/venues/nizhny-novgorod/aleksandrovskiy-sad.jpg",
  "nizhny-novgorod-pakgauzy-na-strelke": "/images/venues/nizhny-novgorod/pakgauzy-strelka.jpg",
  "nizhny-novgorod-schelokovskiy-hutor": "/images/venues/nizhny-novgorod/shchelokovskiy-hutor.jpg",
  "nizhny-novgorod-sobor-aleksandra-nevskogo": "/images/venues/nizhny-novgorod/sobor-aleksandra-nevskogo.jpg",
  "nizhny-novgorod-stroganovskaya-tserkov": "/images/venues/nizhny-novgorod/stroganovskaya-church.jpg",
  "nizhny-novgorod-pecherskiy-monastyr": "/images/venues/nizhny-novgorod/pecherskiy-monastyr.jpg",
  "nizhny-novgorod-blagoveschenskiy-monastyr": "/images/venues/nizhny-novgorod/blagoveshchenskiy-monastyr.jpg",
  "nizhny-novgorod-mihailo-arhangelskiy-sobor": "/images/venues/nizhny-novgorod/mihailo-arhangelskiy-sobor.jpg",
  "nizhny-novgorod-staroyarmarochnyy-sobor": "/images/venues/nizhny-novgorod/staroyarmarochniy-sobor.jpg",
  "nizhny-novgorod-arsenal-gtsisi": "/images/venues/nizhny-novgorod/arsenal-museum.jpg",
  "nizhny-novgorod-muzey-istorii-gaz": "/images/venues/nizhny-novgorod/gaz-museum.jpg",
  "nizhny-novgorod-domik-kashirina": "/images/venues/nizhny-novgorod/domik-kashirina.jpg",
  "nizhny-novgorod-tehnicheskiy-muzey": "/images/venues/nizhny-novgorod/technical-museum.jpg",
  "nizhny-novgorod-russkiy-muzey-fotografii": "/images/venues/nizhny-novgorod/photo-museum.jpg",
  "nizhny-novgorod-pamyatnik-zhyulyu-vernu": "/images/venues/nizhny-novgorod/jules-verne-monument.jpg",
  "nizhny-novgorod-kater-geroy": "/images/venues/nizhny-novgorod/kater-geroy.jpg",
  "nizhny-novgorod-seledka-i-kofe": "/images/venues/nizhny-novgorod/seledka-i-kofe.jpg",
  "nizhny-novgorod-bezuhov-cafe": "/images/venues/nizhny-novgorod/bezuhov-cafe.jpg",
  "nizhny-novgorod-lepi-testo": "/images/venues/nizhny-novgorod/lepi-testo.jpg",
  "nizhny-novgorod-yale-restaurant": "/images/venues/nizhny-novgorod/yale-restaurant.jpg",
  "nizhny-novgorod-red-wall-restaurant": "/images/venues/nizhny-novgorod/red-wall-restaurant.jpg",
  "nizhny-novgorod-pyatkin-traktir": "/images/venues/nizhny-novgorod/pyatkin-traktir.jpg",
  "nizhny-novgorod-mitrich-restaurant": "/images/venues/nizhny-novgorod/mitrich-restaurant.jpg",
  "nizhny-novgorod-mednye-truby-bar": "/images/venues/nizhny-novgorod/mednye-truby-bar.jpg",
  "nizhny-novgorod-yula-pizza": "/images/venues/nizhny-novgorod/yula-pizza.jpg",
  "nizhny-novgorod-fonoteca-bar": "/images/venues/nizhny-novgorod/fonoteca-bar.jpg",
  "nizhny-novgorod-nizhegorodskiy-kreml": "/images/venues/nizhny-novgorod/nizhegorodskiy-kreml.jpg",
  "nizhny-novgorod-chkalovskaya-lestnitsa": "/images/venues/nizhny-novgorod/chkalovskaya-lestnitsa.jpg",
  "nizhny-novgorod-bol-shaya-pokrovskaya-ulitsa": "/images/venues/nizhny-novgorod/bolshaya-pokrovskaya.jpg",
  "nizhny-novgorod-nizhegorodskaya-kanatnaya-doroga": "/images/venues/nizhny-novgorod/kanatnaya-doroga.jpg",
  "nizhny-novgorod-strelka-rek-volgi-i-oki": "/images/venues/nizhny-novgorod/strelka-volga-oka.jpg",
  "nizhny-novgorod-naberezhnaya-fedorovskogo": "/images/venues/nizhny-novgorod/naberezhnaya-fedorovskogo.jpg",
};

const SAINT_PETERSBURG_IMAGES: Record<string, string> = {
  ermitazh: '/images/venues/saint-petersburg/ermitazh.jpg',
  'saint-petersburg-petropavlovskaya-krepost':
    '/images/venues/saint-petersburg/petropavlovskaya-krepost.jpg',
  'saint-petersburg-dvortsovaya-ploschad':
    '/images/venues/saint-petersburg/dvortsovaya-ploschad.jpg',
  'saint-petersburg-isaakievskiy-sobor':
    '/images/venues/saint-petersburg/isaakievskiy-sobor.jpg',
  'saint-petersburg-spas-na-krovi': '/images/venues/saint-petersburg/spas-na-krovi.jpg',
  'saint-petersburg-kazanskiy-sobor': '/images/venues/saint-petersburg/kazanskiy-sobor.jpg',
  'saint-petersburg-nevskiy-prospekt': '/images/venues/saint-petersburg/nevskiy-prospekt.jpg',
  'saint-petersburg-admiralteystvo': '/images/venues/saint-petersburg/admiralteystvo.jpg',
  'saint-petersburg-mednyy-vsadnik': '/images/venues/saint-petersburg/mednyy-vsadnik.jpg',
  'saint-petersburg-strelka-vasilevskogo-ostrova':
    '/images/venues/saint-petersburg/strelka-vasilevskogo-ostrova.jpg',
  'saint-petersburg-mihaylovskiy-zamok':
    '/images/venues/saint-petersburg/mihaylovskiy-zamok.jpg',
  'saint-petersburg-anichkov-most': '/images/venues/saint-petersburg/anichkov-most.jpg',
  // Editorial must-see covers only (not mass Top-100 AI place stills).
  'saint-petersburg-sobornaya-mechet':
    '/images/venues/saint-petersburg/sobornaya-mechet.jpg',
};

const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {
  ...NIZHNY_NOVGOROD_IMAGES,
  ...SAINT_PETERSBURG_IMAGES,
};

export function lookupEditorialPlaceImage(
  slug: string | null | undefined,
): string | null {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return null;
  return EDITORIAL_IMAGES_BY_SLUG[key] || null;
}

/** True for dark auto stubs that should lose to editorial covers. */
export function isGeneratedVenueStub(url: string | null | undefined): boolean {
  const value = String(url || '')
    .trim()
    .toLowerCase();
  if (!value) return true;
  return value.includes('/venues/generated/') || value.includes('venue-auto-stub');
}

/**
 * Prefer curated editorial cover for catalog cards / PDP / my-day.
 * Hub photo wins only when no editorial map entry and hub is a real image.
 */
export function resolveVenueHeroImage(
  slug: string | null | undefined,
  hubImageUrl?: string | null,
): string | null {
  const editorial = lookupEditorialPlaceImage(slug);
  if (editorial) return editorial;
  const hub = String(hubImageUrl || '').trim() || null;
  if (!hub || isGeneratedVenueStub(hub)) return null;
  return hub;
}

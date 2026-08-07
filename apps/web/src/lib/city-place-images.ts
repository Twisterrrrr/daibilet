/**
 * Editorial hero covers for /my-day Hot Picks, location/venue catalog cards & PDP
 * when hub omits heroImageUrl or only has a dark /venues/generated stub.
 * SPB: Главные 1-12 + мечеть + Top-100 linked place stills under /images/venues/saint-petersburg/.
 * KGD: mustSee + day-route + suburb stops under /images/venues/kaliningrad/.
 * MSK: Phase C mustSee under /images/venues/moscow/ (12 GenerateImage main + sharp pack).
 * Blog Top-100/Beyond series is DRAFT (admin-only); assets still feed catalog/my-day.
 */

const MOSCOW_IMAGES: Record<string, string> = {
  'moscow-krasnaya-ploschad-i-kreml':
    '/images/venues/moscow/krasnaya-ploschad-kreml.jpg',
  'moscow-sobor-vasiliya-blazhennogo':
    '/images/venues/moscow/sobor-vasiliya-blazhennogo.jpg',
  'moscow-bol-shoy-teatr': '/images/venues/moscow/bolshoy-teatr.jpg',
  'moscow-tret-yakovskaya-galereya':
    '/images/venues/moscow/tretyakovskaya-galereya.jpg',
  'moscow-park-zaryad-e': '/images/venues/moscow/park-zaryade.jpg',
  'moscow-vdnh': '/images/venues/moscow/vdnh.jpg',
  'moscow-moskva-siti': '/images/venues/moscow/moskva-siti.jpg',
  'moscow-vorobevy-gory': '/images/venues/moscow/vorobevy-gory.jpg',
  'moscow-hram-hrista-spasitelya':
    '/images/venues/moscow/hram-hrista-spasitelya.jpg',
  'moscow-novodevichiy-monastyr':
    '/images/venues/moscow/novodevichiy-monastyr.jpg',
  'moscow-ostankinskaya-telebashnya':
    '/images/venues/moscow/ostankinskaya-telebashnya.jpg',
  'moscow-gum': '/images/venues/moscow/gum.jpg',
  'moscow-gmii-imeni-pushkina': '/images/venues/moscow/gmii-pushkina.jpg',
  'moscow-novaya-tretyakovka': '/images/venues/moscow/novaya-tretyakovka.jpg',
  'moscow-muzey-garazh': '/images/venues/moscow/muzey-garazh.jpg',
  'moscow-muzey-kosmonavtiki': '/images/venues/moscow/muzey-kosmonavtiki.jpg',
  'moscow-politehnicheskiy-muzey':
    '/images/venues/moscow/politehnicheskiy-muzey.jpg',
  'moscow-evreyskiy-muzey': '/images/venues/moscow/evreyskiy-muzey.jpg',
  'moscow-muzey-moskvy': '/images/venues/moscow/muzey-moskvy.jpg',
  'moscow-bunker-42': '/images/venues/moscow/bunker-42.jpg',
  'moscow-muzey-bulgakova': '/images/venues/moscow/muzey-bulgakova.jpg',
  'moscow-muzey-russkogo-impressionizma':
    '/images/venues/moscow/muzey-russkogo-impressionizma.jpg',
  'moscow-paryaschiy-most-zaryadya':
    '/images/venues/moscow/paryaschiy-most-zaryadya.jpg',
  'moscow-smotrovaya-vorobevyh-gor':
    '/images/venues/moscow/smotrovaya-vorobevyh-gor.jpg',
  'moscow-patriarshiy-most': '/images/venues/moscow/patriarshiy-most.jpg',
  'moscow-krymskaya-naberezhnaya':
    '/images/venues/moscow/krymskaya-naberezhnaya.jpg',
  'moscow-kremlevskaya-naberezhnaya':
    '/images/venues/moscow/kremlevskaya-naberezhnaya.jpg',
  'moscow-smotrovaya-moskva-siti':
    '/images/venues/moscow/smotrovaya-moskva-siti.jpg',
  'moscow-kotelnicheskaya-naberezhnaya':
    '/images/venues/moscow/kotelnicheskaya-naberezhnaya.jpg',
  'moscow-smotrovaya-ostankino':
    '/images/venues/moscow/smotrovaya-ostankino.jpg',
  'moscow-staryy-arbat': '/images/venues/moscow/staryy-arbat.jpg',
  'moscow-nikolskaya-ulitsa': '/images/venues/moscow/nikolskaya-ulitsa.jpg',
  'moscow-patriarshie-prudy': '/images/venues/moscow/patriarshie-prudy.jpg',
  'moscow-kuznetskiy-most': '/images/venues/moscow/kuznetskiy-most.jpg',
  'moscow-kamergerskiy-pereulok':
    '/images/venues/moscow/kamergerskiy-pereulok.jpg',
  'moscow-pyatnitskaya-ulitsa':
    '/images/venues/moscow/pyatnitskaya-ulitsa.jpg',
  'moscow-park-gorkogo': '/images/venues/moscow/park-gorkogo.jpg',
  'moscow-muzeon': '/images/venues/moscow/muzeon.jpg',
  'moscow-kolomenskoe': '/images/venues/moscow/kolomenskoe.jpg',
  'moscow-tsaritsyno': '/images/venues/moscow/tsaritsyno.jpg',
  'moscow-kuskovo': '/images/venues/moscow/kuskovo.jpg',
  'moscow-izmaylovskiy-park': '/images/venues/moscow/izmaylovskiy-park.jpg',
  'moscow-sokolniki': '/images/venues/moscow/sokolniki.jpg',
  'moscow-aptekarskiy-ogorod':
    '/images/venues/moscow/aptekarskiy-ogorod.jpg',
  'moscow-kazanskiy-sobor-krasnaya':
    '/images/venues/moscow/kazanskiy-sobor-krasnaya.jpg',
  'moscow-pokrovskiy-monastyr':
    '/images/venues/moscow/pokrovskiy-monastyr.jpg',
  'moscow-donskoy-monastyr': '/images/venues/moscow/donskoy-monastyr.jpg',
  'moscow-bogoyavlenskiy-sobor-elohovo':
    '/images/venues/moscow/bogoyavlenskiy-sobor-elohovo.jpg',
  'moscow-hram-vozneseniya-kolomenskoe':
    '/images/venues/moscow/hram-vozneseniya-kolomenskoe.jpg',
  'moscow-marfo-mariinskaya-obitel':
    '/images/venues/moscow/marfo-mariinskaya-obitel.jpg',
  'moscow-zoopark': '/images/venues/moscow/zoopark.jpg',
  'moscow-moskvarium': '/images/venues/moscow/moskvarium.jpg',
  'moscow-planetariy': '/images/venues/moscow/planetariy.jpg',
  'moscow-eksperimentanium': '/images/venues/moscow/eksperimentanium.jpg',
  'moscow-vinzavod': '/images/venues/moscow/vinzavod.jpg',
  'moscow-artplay': '/images/venues/moscow/artplay.jpg',
  'moscow-flakon': '/images/venues/moscow/flakon.jpg',
  'moscow-danilovskiy-rynok': '/images/venues/moscow/danilovskiy-rynok.jpg',
};

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
  'saint-petersburg-sobornaya-mechet':
    '/images/venues/saint-petersburg/sobornaya-mechet.jpg',
  // Top-100 linked places (blog series hidden; covers still for catalog / my-day)
  'saint-petersburg-russkiy-muzey': '/images/venues/saint-petersburg/russkiy-muzey.jpg',
  'saint-petersburg-glavnyy-shtab-ermitazh':
    '/images/venues/saint-petersburg/glavnyy-shtab-ermitazh.jpg',
  'saint-petersburg-muzey-faberzhe': '/images/venues/saint-petersburg/muzey-faberzhe.jpg',
  'saint-petersburg-kunstkamera': '/images/venues/saint-petersburg/kunstkamera.jpg',
  'saint-petersburg-tsentralnyy-voenno-morskoy-muzey':
    '/images/venues/saint-petersburg/tsentralnyy-voenno-morskoy-muzey.jpg',
  erarta: '/images/venues/saint-petersburg/erarta.jpg',
  'saint-petersburg-muzey-anny-ahmatovoy-v-fontannom-dome':
    '/images/venues/saint-petersburg/muzey-anny-ahmatovoy.jpg',
  'saint-petersburg-muzey-politicheskoy-istorii-osobnyak-kshesinskoy':
    '/images/venues/saint-petersburg/muzey-politicheskoy-istorii.jpg',
  'saint-petersburg-dohodnyy-dom-baka':
    '/images/venues/saint-petersburg/dohodnyy-dom-baka.jpg',
  'saint-petersburg-tolstovskiy-dom': '/images/venues/saint-petersburg/tolstovskiy-dom.jpg',
  'saint-petersburg-rotonda-na-gorohovoy':
    '/images/venues/saint-petersburg/rotonda-na-gorohovoy.jpg',
  'saint-petersburg-mozaichnyy-dvorik':
    '/images/venues/saint-petersburg/mozaichnyy-dvorik.jpg',
  'saint-petersburg-dohodnyy-dom-muruzi':
    '/images/venues/saint-petersburg/dohodnyy-dom-muruzi.jpg',
  'saint-petersburg-novaya-gollandiya':
    '/images/venues/saint-petersburg/novaya-gollandiya.jpg',
  'saint-petersburg-bertgold-tsentr':
    '/images/venues/saint-petersburg/bertgold-tsentr.jpg',
  'saint-petersburg-loft-proekt-etazhi':
    '/images/venues/saint-petersburg/loft-proekt-etazhi.jpg',
  'saint-petersburg-ulitsa-rubinshteyna':
    '/images/venues/saint-petersburg/ulitsa-rubinshteyna.jpg',
  'saint-petersburg-pyshechnaya-na-bolshoy-konyushennoy':
    '/images/venues/saint-petersburg/pyshechnaya-na-bolshoy-konyushennoy.jpg',
  'saint-petersburg-spikizi-bar-el-copitas':
    '/images/venues/saint-petersburg/spikizi-bar-el-copitas.jpg',
};

const KALININGRAD_IMAGES: Record<string, string> = {
  'kaliningrad-kafedral-nyy-sobor':
    '/images/venues/kaliningrad/kafedral-nyy-sobor.jpg',
  'kaliningrad-muzey-mirovogo-okeana':
    '/images/venues/kaliningrad/muzey-mirovogo-okeana.jpg',
  'kaliningrad-muzey-yantarya': '/images/venues/kaliningrad/muzey-yantarya.jpg',
  'kaliningrad-muzey-izobrazitelnyh-iskusstv':
    '/images/venues/kaliningrad/muzey-izobrazitelnyh-iskusstv.jpg',
  'kaliningrad-muzey-bunker': '/images/venues/kaliningrad/muzey-bunker.jpg',
  'kaliningrad-fort-5': '/images/venues/kaliningrad/fort-5.jpg',
  'kaliningrad-istoriko-hudozhestvennyy-muzey':
    '/images/venues/kaliningrad/istoriko-hudozhestvennyy-muzey.jpg',
  'kaliningrad-art-prostranstvo-vorota':
    '/images/venues/kaliningrad/art-prostranstvo-vorota.jpg',
  'kaliningrad-muzey-kvartira-altes-haus':
    '/images/venues/kaliningrad/muzey-kvartira-altes-haus.jpg',
  'kaliningrad-muzey-vodokanal':
    '/images/venues/kaliningrad/muzey-vodokanal.jpg',
  'kaliningrad-rybnaya-derevnya':
    '/images/venues/kaliningrad/rybnaya-derevnya.jpg',
  'kaliningrad-rayon-vill-amalienau':
    '/images/venues/kaliningrad/rayon-vill-amalienau.jpg',
  'kaliningrad-rayon-maraunenhof':
    '/images/venues/kaliningrad/rayon-maraunenhof.jpg',
  'kaliningrad-korolevskie-vorota':
    '/images/venues/kaliningrad/korolevskie-vorota.jpg',
  'kaliningrad-brandenburgskie-vorota':
    '/images/venues/kaliningrad/brandenburgskie-vorota.jpg',
  'kaliningrad-fridlandskie-vorota':
    '/images/venues/kaliningrad/fridlandskie-vorota.jpg',
  'kaliningrad-rosgartenskie-vorota':
    '/images/venues/kaliningrad/rosgartenskie-vorota.jpg',
  'kaliningrad-dom-sovetov': '/images/venues/kaliningrad/dom-sovetov.jpg',
  'kaliningrad-ostrov-kanta': '/images/venues/kaliningrad/ostrov-kanta.jpg',
  'kaliningrad-verhnee-ozero': '/images/venues/kaliningrad/verhnee-ozero.jpg',
  'kaliningrad-nizhnee-ozero': '/images/venues/kaliningrad/nizhnee-ozero.jpg',
  'kaliningrad-tsentralnyy-park':
    '/images/venues/kaliningrad/tsentralnyy-park.jpg',
  'kaliningrad-zoopark': '/images/venues/kaliningrad/zoopark.jpg',
  'kaliningrad-pamyatnik-boruschiesya-zubry':
    '/images/venues/kaliningrad/pamyatnik-boruschiesya-zubry.jpg',
  'kaliningrad-pamyatnik-immanuilu-kantu':
    '/images/venues/kaliningrad/pamyatnik-immanuilu-kantu.jpg',
  'kaliningrad-krestovozdvizhenskiy-sobor':
    '/images/venues/kaliningrad/krestovozdvizhenskiy-sobor.jpg',
  'kaliningrad-hram-hrista-spasitelya':
    '/images/venues/kaliningrad/hram-hrista-spasitelya.jpg',
  'kaliningrad-kirkha-svyatogo-semeystva':
    '/images/venues/kaliningrad/kirkha-svyatogo-semeystva.jpg',
  'kaliningrad-yuditten-kirkha':
    '/images/venues/kaliningrad/yuditten-kirkha.jpg',
  'kaliningrad-shtayndamm-99': '/images/venues/kaliningrad/shtayndamm-99.jpg',
  'kaliningrad-gastrobar-sol': '/images/venues/kaliningrad/gastrobar-sol.jpg',
  'kaliningrad-zotler-bier': '/images/venues/kaliningrad/zotler-bier.jpg',
  'kaliningrad-redyuit': '/images/venues/kaliningrad/redyuit.jpg',
  'kaliningrad-kenigsbergskiy-martsipan':
    '/images/venues/kaliningrad/kenigsbergskiy-martsipan.jpg',
  'kaliningrad-kurshskaya-kosa':
    '/images/venues/kaliningrad/kurshskaya-kosa.jpg',
  'kaliningrad-dyuna-efa': '/images/venues/kaliningrad/dyuna-efa.jpg',
  'kaliningrad-tantsuyuschiy-les':
    '/images/venues/kaliningrad/tantsuyuschiy-les.jpg',
  'kaliningrad-muzey-koshek-murarium':
    '/images/venues/kaliningrad/muzey-koshek-murarium.jpg',
  'kaliningrad-vodonapornaya-bashnya-raushena':
    '/images/venues/kaliningrad/vodonapornaya-bashnya-raushena.jpg',
  'kaliningrad-shvedskaya-krepost-pillau':
    '/images/venues/kaliningrad/shvedskaya-krepost-pillau.jpg',
  'kaliningrad-yantarnyy-kombinat':
    '/images/venues/kaliningrad/yantarnyy-kombinat.jpg',
  'kaliningrad-smotrovaya-yantarnogo-kombinata':
    '/images/venues/kaliningrad/smotrovaya-yantarnogo-kombinata.jpg',
};

/** Perm hero covers for hub / my-day / catalog (legacy + new pack slugs). */
const PERM_IMAGES: Record<string, string> = {
  'naberezhnaya-kamy': '/images/venues/perm/naberezhnaya-kamy.jpg',
  'perm-schaste-ne-za-gorami': '/images/venues/perm/schaste-ne-za-gorami.jpg',
  'permskaya-esplanada': '/images/venues/perm/permskaya-esplanada.jpg',
  'perm-sobornaya-ploschad': '/images/venues/perm/sobornaya-ploschad.jpg',
  'perm-starokirpichnyy-pereulok':
    '/images/venues/perm/starokirpichnyy-pereulok.jpg',
  'perm-park-gorkogo': '/images/venues/perm/park-gorkogo.jpg',
  'perm-rayskiy-sad': '/images/venues/perm/rayskiy-sad.jpg',
  'permskaya-galereya': '/images/venues/perm/permskaya-galereya.jpg',
  'perm-muzey-permskikh-drevnostey':
    '/images/venues/perm/muzey-permskikh-drevnostey.jpg',
  'perm-dom-meshkova': '/images/venues/perm/dom-meshkova.jpg',
  'perm-permm': '/images/venues/perm/permm.jpg',
  'perm-teatr-opery-i-baleta': '/images/venues/perm/teatr-opery-i-baleta.jpg',
  'teatr-teatr': '/images/venues/perm/teatr-teatr.jpg',
  'perm-muzey-motovilihinskih-zavodov':
    '/images/venues/perm/muzey-motovilihinskih-zavodov.jpg',
  'perm-muzey-diorama-vyshka': '/images/venues/perm/muzey-diorama-vyshka.jpg',
  'perm-cgk': '/images/venues/perm/cgk.jpg',
  'perm-maris-art': '/images/venues/perm/maris-art.jpg',
  'perm-galereya-2517': '/images/venues/perm/galereya-2517.jpg',
  'perm-park-nauki-nyuton': '/images/venues/perm/park-nauki-nyuton.jpg',
  'perm-zavod-shpagina': '/images/venues/perm/zavod-shpagina.jpg',
  'permsky-solenye-ushi': '/images/venues/perm/permsky-solenye-ushi.jpg',
  'perm-permskiy-medved': '/images/venues/perm/permskiy-medved.jpg',
  'perm-dom-gribushina': '/images/venues/perm/dom-gribushina.jpg',
  'perm-bashnya-smerti': '/images/venues/perm/bashnya-smerti.jpg',
  'perm-sobor-petra-i-pavla': '/images/venues/perm/sobor-petra-i-pavla.jpg',
  'perm-voznesenskaya-tserkov':
    '/images/venues/perm/voznesenskaya-tserkov.jpg',
  'perm-park-kamney-permskie-vorota':
    '/images/venues/perm/park-kamney-permskie-vorota.jpg',
  'perm-chomga': '/images/venues/perm/chomga.jpg',
  'perm-permskie-posikunchiki':
    '/images/venues/perm/permskie-posikunchiki.jpg',
  'perm-nolan-wine-kitchen': '/images/venues/perm/nolan-wine-kitchen.jpg',
  'perm-belka': '/images/venues/perm/belka.jpg',
  'perm-partizan': '/images/venues/perm/partizan.jpg',
  'perm-demidovskaya-pivovarnya':
    '/images/venues/perm/demidovskaya-pivovarnya.jpg',
  'perm-cup-by-cup': '/images/venues/perm/cup-by-cup.jpg',
  'perm-gastroport': '/images/venues/perm/gastroport.jpg',
  'muzej-hohlovka': '/images/venues/perm/muzej-hohlovka.jpg',
  'perm-kungur': '/images/venues/perm/kungur.jpg',
  'perm-kungurskaya-ledyanaya-peshchera':
    '/images/venues/perm/kungurskaya-ledyanaya-peshchera.jpg',
  'perm-belaya-gora': '/images/venues/perm/belaya-gora.jpg',
  'perm-belogorskiy-monastyr': '/images/venues/perm/belogorskiy-monastyr.jpg',
  'perm-gubakha-usva': '/images/venues/perm/gubakha-usva.jpg',
  'perm-kamennyy-gorod': '/images/venues/perm/kamennyy-gorod.jpg',
  'perm-usvinskie-stolby': '/images/venues/perm/usvinskie-stolby.jpg',
};

const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {
  ...NIZHNY_NOVGOROD_IMAGES,
  ...SAINT_PETERSBURG_IMAGES,
  ...KALININGRAD_IMAGES,
  ...PERM_IMAGES,
  ...MOSCOW_IMAGES,
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

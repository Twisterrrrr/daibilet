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
  'saint-petersburg-vasileostrovskiy-rynok':
    '/images/venues/saint-petersburg/vasileostrovskiy-rynok.jpg',
  'saint-petersburg-moskovskiy-rynok':
    '/images/venues/saint-petersburg/moskovskiy-rynok.jpg',
  // Outdoor / monument / embankment covers (GenerateImage 2026-08-08)
  'saint-petersburg-bankovskiy-most':
    '/images/venues/saint-petersburg/bankovskiy-most.jpg',
  'saint-petersburg-angliyskaya-naberezhnaya':
    '/images/venues/saint-petersburg/angliyskaya-naberezhnaya.jpg',
  'saint-petersburg-dvortsovaya-naberezhnaya':
    '/images/venues/saint-petersburg/dvortsovaya-naberezhnaya.jpg',
  'saint-petersburg-dvortsovyy-most':
    '/images/venues/saint-petersburg/dvortsovyy-most.jpg',
  'saint-petersburg-malaya-sadovaya-ulitsa':
    '/images/venues/saint-petersburg/malaya-sadovaya-ulitsa.jpg',
  'saint-petersburg-naberezhnaya-kanala-griboedova':
    '/images/venues/saint-petersburg/naberezhnaya-kanala-griboedova.jpg',
  'saint-petersburg-naberezhnaya-reki-moyki':
    '/images/venues/saint-petersburg/naberezhnaya-reki-moyki.jpg',
  'saint-petersburg-naberezhnaya-fontanki':
    '/images/venues/saint-petersburg/naberezhnaya-fontanki.jpg',
  'saint-petersburg-kamennoostrovskiy-prospekt':
    '/images/venues/saint-petersburg/kamennoostrovskiy-prospekt.jpg',
  'saint-petersburg-kamennyy-ostrov':
    '/images/venues/saint-petersburg/kamennyy-ostrov.jpg',
  'saint-petersburg-linii-vasilevskogo-ostrova':
    '/images/venues/saint-petersburg/linii-vasilevskogo-ostrova.jpg',
  'saint-petersburg-divo-ostrov':
    '/images/venues/saint-petersburg/divo-ostrov.jpg',
  'saint-petersburg-ekaterininskiy-dvorets':
    '/images/venues/saint-petersburg/ekaterininskiy-dvorets.jpg',
  'bolshoi-petergofskii-dvorec': '/images/venues/saint-petersburg/petergof.jpg',
  'bolshoi-petergofskii-dvorec-68c6ae79d5b98d58ded70411':
    '/images/venues/saint-petersburg/petergof.jpg',
  'saint-petersburg-bolshoy-dvorets-petergofa':
    '/images/venues/saint-petersburg/petergof.jpg',
  'saint-petersburg-kolonnada-isaakiya':
    '/images/venues/saint-petersburg/kolonnada-isaakiya.jpg',
  'saint-petersburg-aleksandro-nevskaya-lavra':
    '/images/venues/saint-petersburg/aleksandro-nevskaya-lavra.jpg',
  'saint-petersburg-vitebskiy-vokzal':
    '/images/venues/saint-petersburg/vitebskiy-vokzal.jpg',
  'saint-petersburg-grand-maket-rossiya':
    '/images/venues/saint-petersburg/grand-maket-rossiya.jpg',
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
  'perm-muzey-retro-garazh': '/images/venues/perm/muzey-retro-garazh.jpg',
  'perm-muzey-motovilihinskih-zavodov':
    '/images/venues/perm/muzey-motovilihinskih-zavodov.jpg',
  'perm-muzey-kukol': '/images/venues/perm/muzey-kukol.jpg',
  'perm-muzey-istorii-svyazi': '/images/venues/perm/muzey-istorii-svyazi.jpg',
  'perm-muzey-istorii-pgniu': '/images/venues/perm/muzey-istorii-pgniu.jpg',
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

const EXTRA_AI_LOCATION_IMAGES: Record<string, string> = {
  'volgograd-mamaev-kurgan': '/images/venues/volgograd/mamaev-kurgan.jpg',
  'vladimir-zolotye-vorota': '/images/venues/vladimir/zolotye-vorota.jpg',
  'kazan-mechet-kul-sharif': '/images/venues/kazan/mechet-kul-sharif.jpg',
};



const LOCATION_PACK_IMAGES: Record<string, string> = {
  'irkutsk-130-y-kvartal': '/images/venues/irkutsk/130-y-kvartal.jpg',
  'saratov-avtodorozhnyy-most-saratov-engel-s': '/images/venues/saratov/avtodorozhnyy-most-saratov-engel-s.jpg',
  'voronezh-admiralteyskaya-ploschad': '/images/venues/voronezh/admiralteyskaya-ploschad.jpg',
  'stavropol-aleksandrovskaya-ploschad': '/images/venues/stavropol/aleksandrovskaya-ploschad.jpg',
  'krasnodar-aleksandrovskaya-triumfal-naya-arka': '/images/venues/krasnodar/aleksandrovskaya-triumfal-naya-arka.jpg',
  'chelyabinsk-aloe-pole': '/images/venues/chelyabinsk/aloe-pole.jpg',
  'saint-petersburg-annenkirhe-tserkov-svyatoy-anny': '/images/venues/saint-petersburg/annenkirhe-tserkov-svyatoy-anny.jpg',
  'ufa-art-kvadrat': '/images/venues/ufa/art-kvadrat.jpg',
  'syktyvkar-art-obekt-komi-pasy': '/images/venues/syktyvkar/art-obekt-komi-pasy.jpg',
  'arhangelsk-arhangelskiy-gostinyy-dvor': '/images/venues/arhangelsk/arhangelskiy-gostinyy-dvor.jpg',
  'abakan-arheologicheskiy-kompleks-sunduki': '/images/venues/abakan/arheologicheskiy-kompleks-sunduki.jpg',
  'yoshkar-ola-arhitekturnyy-kompleks-12-apostolov': '/images/venues/yoshkar-ola/arhitekturnyy-kompleks-12-apostolov.jpg',
  'astrahan-astrahanskiy-kreml': '/images/venues/astrahan/astrahanskiy-kreml.jpg',
  'murmansk-atomnyy-ledokol-lenin': '/images/venues/murmansk/atomnyy-ledokol-lenin.jpg',
  'sevastopol-balaklavskaya-buhta': '/images/venues/sevastopol/balaklavskaya-buhta.jpg',
  'barnaul-barnaul-skiy-serebroplavil-nyy-zavod-spichka': '/images/venues/barnaul/barnaul-skiy-serebroplavil-nyy-zavod-spichka.jpg',
  'yoshkar-ola-blagoveschenskaya-bashnya': '/images/venues/yoshkar-ola/blagoveschenskaya-bashnya.jpg',
  'blagoveschensk-amurskaya-oblast-blagoveschenskoe-kladbische-dinozavrov': '/images/venues/blagoveschensk-amurskaya-oblast/blagoveschenskoe-kladbische-dinozavrov.jpg',
  'orel-bogoyavlenskiy-sobor': '/images/venues/orel/bogoyavlenskiy-sobor.jpg',
  'saint-petersburg-bolshaya-morskaya': '/images/venues/saint-petersburg/bolshaya-morskaya.jpg',
  'nizhny-novgorod-bol-shaya-pokrovskaya-ulitsa': '/images/venues/nizhny-novgorod/bol-shaya-pokrovskaya-ulitsa.jpg',
  'rostov-na-donu-bol-shaya-sadovaya-ulitsa': '/images/venues/rostov-na-donu/bol-shaya-sadovaya-ulitsa.jpg',
  'abakan-salbykskiy-kurgan': '/images/venues/abakan/salbykskiy-kurgan.jpg',
  'cheboksary-bulvar-kuptsa-efremova': '/images/venues/cheboksary/bulvar-kuptsa-efremova.jpg',
  'ulyanovsk-bul-var-novyy-venets': '/images/venues/ulyanovsk/bul-var-novyy-venets.jpg',
  'samara-bunker-stalina': '/images/venues/samara/bunker-stalina.jpg',
  'cheboksary-vvedenskiy-kafedralnyy-sobor': '/images/venues/cheboksary/vvedenskiy-kafedralnyy-sobor.jpg',
  'saint-petersburg-vladimirskiy-sobor': '/images/venues/saint-petersburg/vladimirskiy-sobor.jpg',
  'vladimir-vodonapornaya-bashnya': '/images/venues/vladimir/vodonapornaya-bashnya.jpg',
  'volgograd-volgogradskiy-metrotram': '/images/venues/volgograd/volgogradskiy-metrotram.jpg',
  'yaroslavl-volzhskaya-naberezhnaya': '/images/venues/yaroslavl/volzhskaya-naberezhnaya.jpg',
  'vologda-vologodskiy-kreml-arhiereyskiy-dvor': '/images/venues/vologda/vologodskiy-kreml-arhiereyskiy-dvor.jpg',
  'tomsk-voskresenskaya-gora': '/images/venues/tomsk/voskresenskaya-gora.jpg',
  'saint-petersburg-vyborgskiy-zamok': '/images/venues/saint-petersburg/vyborgskiy-zamok.jpg',
  'vladimir-georgievskaya-ulitsa': '/images/venues/vladimir/georgievskaya-ulitsa.jpg',
  'ulan-ude-golova-lenina': '/images/venues/ulan-ude/golova-lenina.jpg',
  'sortavala-gora-paasonvuori-paaso': '/images/venues/sortavala/gora-paasonvuori-paaso.jpg',
  'yuzhno-sahalinsk-gornolyzhnyy-kompleks-gornyy-vozduh': '/images/venues/yuzhno-sahalinsk/gornolyzhnyy-kompleks-gornyy-vozduh.jpg',
  'ekaterinburg-gorodok-chekistov': '/images/venues/ekaterinburg/gorodok-chekistov.jpg',
  'ufa-gostinyy-dvor': '/images/venues/ufa/gostinyy-dvor.jpg',
  'saint-petersburg-gostinyy-dvor-passazh': '/images/venues/saint-petersburg/gostinyy-dvor-passazh.jpg',
  'habarovsk-grado-habarovskiy-sobor-uspeniya-bozhiey-materi': '/images/venues/habarovsk/grado-habarovskiy-sobor-uspeniya-bozhiey-materi.jpg',
  'pskov-gremyachaya-bashnya': '/images/venues/pskov/gremyachaya-bashnya.jpg',
  'smolensk-gromovaya-bashnya': '/images/venues/smolensk/gromovaya-bashnya.jpg',
  'yuzhno-sahalinsk-gryazevoy-vulkan-yuzhno-sahalinskiy': '/images/venues/yuzhno-sahalinsk/gryazevoy-vulkan-yuzhno-sahalinskiy.jpg',
  'saint-petersburg-dvorets-beloselskih-belozerskih': '/images/venues/saint-petersburg/dvorets-beloselskih-belozerskih.jpg',
  'saint-petersburg-dvorets-velikogo-knyazya-vladimira-aleksandrovicha-dom': '/images/venues/saint-petersburg/dvorets-velikogo-knyazya-vladimira-aleksandrovicha-dom.jpg',
  'chita-dvorets-shumovyh': '/images/venues/chita/dvorets-shumovyh.jpg',
  'sochi-dendrariy': '/images/venues/sochi/dendrariy.jpg',
  'voronezh-divnogor-e': '/images/venues/voronezh/divnogor-e.jpg',
  'vladimir-dmitrievskiy-sobor': '/images/venues/vladimir/dmitrievskiy-sobor.jpg',
  'pskov-dovmontov-gorod': '/images/venues/pskov/dovmontov-gorod.jpg',
  'volgograd-dom-pavlova': '/images/venues/volgograd/dom-pavlova.jpg',
  'saint-petersburg-dom-s-sovami': '/images/venues/saint-petersburg/dom-s-sovami.jpg',
  'ivanovo-dom-korabl': '/images/venues/ivanovo/dom-korabl.jpg',
  'ivanovo-dom-podkova': '/images/venues/ivanovo/dom-podkova.jpg',
  'saint-petersburg-dohodnyy-dom-badaeva': '/images/venues/saint-petersburg/dohodnyy-dom-badaeva.jpg',
  'saint-petersburg-dohodnyy-dom-bernshteyna': '/images/venues/saint-petersburg/dohodnyy-dom-bernshteyna.jpg',
  'saint-petersburg-dohodnyy-dom-bubyrya': '/images/venues/saint-petersburg/dohodnyy-dom-bubyrya.jpg',
  'saint-petersburg-dohodnyy-dom-vege': '/images/venues/saint-petersburg/dohodnyy-dom-vege.jpg',
  'saint-petersburg-dohodnyy-dom-gertsoga-leyhtenbergskogo': '/images/venues/saint-petersburg/dohodnyy-dom-gertsoga-leyhtenbergskogo.jpg',
  'saint-petersburg-dohodnyy-dom-grabbe': '/images/venues/saint-petersburg/dohodnyy-dom-grabbe.jpg',
  'saint-petersburg-dohodnyy-dom-dernova-dom-s-bashney': '/images/venues/saint-petersburg/dohodnyy-dom-dernova-dom-s-bashney.jpg',
  'saint-petersburg-dohodnyy-dom-eliseevyh-na-fontanke': '/images/venues/saint-petersburg/dohodnyy-dom-eliseevyh-na-fontanke.jpg',
  'saint-petersburg-dohodnyy-dom-ioffa-pyat-uglov': '/images/venues/saint-petersburg/dohodnyy-dom-ioffa-pyat-uglov.jpg',
  'saint-petersburg-dohodnyy-dom-kirillovyh': '/images/venues/saint-petersburg/dohodnyy-dom-kirillovyh.jpg',
  'saint-petersburg-dohodnyy-dom-kleynmihel': '/images/venues/saint-petersburg/dohodnyy-dom-kleynmihel.jpg',
  'saint-petersburg-dohodnyy-dom-kolobovyh': '/images/venues/saint-petersburg/dohodnyy-dom-kolobovyh.jpg',
  'saint-petersburg-dohodnyy-dom-lyalevicha': '/images/venues/saint-petersburg/dohodnyy-dom-lyalevicha.jpg',
  'saint-petersburg-dohodnyy-dom-meltsera': '/images/venues/saint-petersburg/dohodnyy-dom-meltsera.jpg',
  'saint-petersburg-dohodnyy-dom-nikonova': '/images/venues/saint-petersburg/dohodnyy-dom-nikonova.jpg',
  'saint-petersburg-dohodnyy-dom-polezhaeva': '/images/venues/saint-petersburg/dohodnyy-dom-polezhaeva.jpg',
  'saint-petersburg-dohodnyy-dom-ratkova-rozhnova-na-pestelya': '/images/venues/saint-petersburg/dohodnyy-dom-ratkova-rozhnova-na-pestelya.jpg',
  'saint-petersburg-dohodnyy-dom-rozenshteyna-dom-s-bashnyami': '/images/venues/saint-petersburg/dohodnyy-dom-rozenshteyna-dom-s-bashnyami.jpg',
  'saint-petersburg-dohodnyy-dom-smirnova': '/images/venues/saint-petersburg/dohodnyy-dom-smirnova.jpg',
  'saint-petersburg-dohodnyy-dom-stanovogo': '/images/venues/saint-petersburg/dohodnyy-dom-stanovogo.jpg',
  'saint-petersburg-dohodnyy-dom-stepnova': '/images/venues/saint-petersburg/dohodnyy-dom-stepnova.jpg',
  'saint-petersburg-dohodnyy-dom-tanskogo': '/images/venues/saint-petersburg/dohodnyy-dom-tanskogo.jpg',
  'saint-petersburg-dohodnyy-dom-hrenova': '/images/venues/saint-petersburg/dohodnyy-dom-hrenova.jpg',
  'saint-petersburg-dohodnyy-dom-shreybera': '/images/venues/saint-petersburg/dohodnyy-dom-shreybera.jpg',
  'saint-petersburg-egipetskiy-dom-dom-zaharova': '/images/venues/saint-petersburg/egipetskiy-dom-dom-zaharova.jpg',
  'saint-petersburg-elaginoostrovskiy-dvorets': '/images/venues/saint-petersburg/elaginoostrovskiy-dvorets.jpg',
  'samara-zhigulevskiy-pivovarennyy-zavod': '/images/venues/samara/zhigulevskiy-pivovarennyy-zavod.jpg',
  'kursk-znamenskiy-kafedralnyy-sobor': '/images/venues/kursk/znamenskiy-kafedralnyy-sobor.jpg',
  'tyumen-znamenskiy-kafedral-nyy-sobor': '/images/venues/tyumen/znamenskiy-kafedral-nyy-sobor.jpg',
  'chita-ivano-arahleyskie-ozera': '/images/venues/chita/ivano-arahleyskie-ozera.jpg',
  'ulan-ude-ivolginskiy-datsan': '/images/venues/ulan-ude/ivolginskiy-datsan.jpg',
  'izhevsk-izhevskiy-prud-i-naberezhnaya-zodchego-dudina': '/images/venues/izhevsk/izhevskiy-prud-i-naberezhnaya-zodchego-dudina.jpg',
  'pskov-izborskaya-krepost': '/images/venues/pskov/izborskaya-krepost.jpg',
  'ulyanovsk-imperatorskiy-most': '/images/venues/ulyanovsk/imperatorskiy-most.jpg',
  'tver-imperatorskiy-putevoy-dvorets': '/images/venues/tver/imperatorskiy-putevoy-dvorets.jpg',
  'omsk-irtyshskaya-naberezhnaya': '/images/venues/omsk/irtyshskaya-naberezhnaya.jpg',
  'smolensk-istoriko-arhitekturnyy-kompleks-teremok-flenovo': '/images/venues/smolensk/istoriko-arhitekturnyy-kompleks-teremok-flenovo.jpg',
  'kursk-istoriko-kulturnyy-kompleks-korennaya-pustyn': '/images/venues/kursk/istoriko-kulturnyy-kompleks-korennaya-pustyn.jpg',
  'tula-kazanskaya-naberezhnaya': '/images/venues/tula/kazanskaya-naberezhnaya.jpg',
  'irkutsk-kazanskaya-tserkov': '/images/venues/irkutsk/kazanskaya-tserkov.jpg',
  'kazan-kazanskiy-kreml': '/images/venues/kazan/kazanskiy-kreml.jpg',
  'tambov-kazanskiy-muzhskoy-monastyr': '/images/venues/tambov/kazanskiy-muzhskoy-monastyr.jpg',
  'kaluga-kaluzhskie-gostinye-ryady': '/images/venues/kaluga/kaluzhskie-gostinye-ryady.jpg',
  'kaluga-kamennyy-most': '/images/venues/kaluga/kamennyy-most.jpg',
  'simferopol-karaimskaya-kenassa': '/images/venues/simferopol/karaimskaya-kenassa.jpg',
  'krasnoyarsk-karaul-naya-gora-i-chasovnya-paraskevy-pyatnitsy': '/images/venues/krasnoyarsk/karaul-naya-gora-i-chasovnya-paraskevy-pyatnitsy.jpg',
  'samara-katolicheskiy-kostel-presvyatogo-serdtsa-iisusa': '/images/venues/samara/katolicheskiy-kostel-presvyatogo-serdtsa-iisusa.jpg',
  'blagoveschensk-amurskaya-oblast-kafedral-nyy-sobor-blagovescheniya-presvyatoy-bogoroditsy': '/images/venues/blagoveschensk-amurskaya-oblast/kafedral-nyy-sobor-blagovescheniya-presvyatoy-bogoroditsy.jpg',
  'chita-kafedralnyy-sobor-kazanskoy-ikony-bozhiey-materi': '/images/venues/chita/kafedralnyy-sobor-kazanskoy-ikony-bozhiey-materi.jpg',
  'yuzhno-sahalinsk-kafedralnyy-sobor-rozhdestva-hristova': '/images/venues/yuzhno-sahalinsk/kafedralnyy-sobor-rozhdestva-hristova.jpg',
  'saransk-kafedralnyy-sobor-svyatogo-pravednogo-voina-feodora-ushakova': '/images/venues/saransk/kafedralnyy-sobor-svyatogo-pravednogo-voina-feodora-ushakova.jpg',
  'chelyabinsk-kirovka-chelyabinskiy-arbat': '/images/venues/chelyabinsk/kirovka-chelyabinskiy-arbat.jpg',
  'vologda-kolokol-nya-sofiyskogo-sobora': '/images/venues/vologda/kolokol-nya-sofiyskogo-sobora.jpg',
  'saint-petersburg-kolomna': '/images/venues/saint-petersburg/kolomna.jpg',
  'stavropol-komsomol-skiy-prud': '/images/venues/stavropol/komsomol-skiy-prud.jpg',
  'kostroma-kostromskie-torgovye-ryady': '/images/venues/kostroma/kostromskie-torgovye-ryady.jpg',
  'kazan-kremlevskaya-naberezhnaya': '/images/venues/kazan/kremlevskaya-naberezhnaya.jpg',
  'stavropol-krepostnaya-gora': '/images/venues/stavropol/krepostnaya-gora.jpg',
  'orenburg-muzeynyy-kompleks-natsional-naya-derevnya': '/images/venues/orenburg/muzeynyy-kompleks-natsional-naya-derevnya.jpg',
  'orenburg-kul-turnyy-kompleks-karavan-saray': '/images/venues/orenburg/kul-turnyy-kompleks-karavan-saray.jpg',
  'astrahan-kupecheskoe-podvor-e-i-naberezhnaya-volgi': '/images/venues/astrahan/kupecheskoe-podvor-e-i-naberezhnaya-volgi.jpg',
  'bryansk-kurgan-bessmertiya': '/images/venues/bryansk/kurgan-bessmertiya.jpg',
  'kurgan-kurganskiy-oblastnoy-kulturno-vystavochnyy-tsentr-kvts': '/images/venues/kurgan/kurganskiy-oblastnoy-kulturno-vystavochnyy-tsentr-kvts.jpg',
  'sochi-kurort-roza-hutor': '/images/venues/sochi/kurort-roza-hutor.jpg',
  'ulyanovsk-leninskiy-memorial': '/images/venues/ulyanovsk/leninskiy-memorial.jpg',
  'omsk-lyubinskiy-prospekt-ulitsa-lenina': '/images/venues/omsk/lyubinskiy-prospekt-ulitsa-lenina.jpg',
  'sevastopol-malahov-kurgan-i-sapun-gora': '/images/venues/sevastopol/malahov-kurgan-i-sapun-gora.jpg',
  'barnaul-malo-tobol-skaya-ulitsa-barnaul-skiy-arbat': '/images/venues/barnaul/malo-tobol-skaya-ulitsa-barnaul-skiy-arbat.jpg',
  'saint-petersburg-mariinskiy-dvorets': '/images/venues/saint-petersburg/mariinskiy-dvorets.jpg',
  'saint-petersburg-marsovo-pole': '/images/venues/saint-petersburg/marsovo-pole.jpg',
  'belgorod-marfo-mariinskiy-monastyr': '/images/venues/belgorod/marfo-mariinskiy-monastyr.jpg',
  'vladivostok-mayak-na-tokarevskoy-koshke': '/images/venues/vladivostok/mayak-na-tokarevskoy-koshke.jpg',
  'volgograd-mel-nitsa-gergardta': '/images/venues/volgograd/mel-nitsa-gergardta.jpg',
  'murmansk-memorial-zaschitnikam-sovetskogo-zapolyarya-v-gody-velikoy-otechestvenno': '/images/venues/murmansk/memorial-zaschitnikam-sovetskogo-zapolyarya-v-gody-velikoy-otechestvenno.jpg',
  'kursk-memorialnyy-kompleks-kurskaya-duga': '/images/venues/kursk/memorialnyy-kompleks-kurskaya-duga.jpg',
  'murmansk-memorialnyy-kompleks-moryakam-pogibshim-v-mirnoe-vremya': '/images/venues/murmansk/memorialnyy-kompleks-moryakam-pogibshim-v-mirnoe-vremya.jpg',
  'bryansk-memorial-nyy-kompleks-partizanskaya-polyana': '/images/venues/bryansk/memorial-nyy-kompleks-partizanskaya-polyana.jpg',
  'ufa-mechet-medrese-lyalya-tyul-pan': '/images/venues/ufa/mechet-medrese-lyalya-tyul-pan.jpg',
  'izhevsk-mihaylovskaya-kolonna': '/images/venues/izhevsk/mihaylovskaya-kolonna.jpg',
  'novosibirsk-mihaylovskaya-naberezhnaya': '/images/venues/novosibirsk/mihaylovskaya-naberezhnaya.jpg',
  'cheboksary-monument-mat-pokrovitelnitsa': '/images/venues/cheboksary/monument-mat-pokrovitelnitsa.jpg',
  'kemerovo-monument-pamyat-shahteram-kuzbassa-ernsta-neizvestnogo': '/images/venues/kemerovo/monument-pamyat-shahteram-kuzbassa-ernsta-neizvestnogo.jpg',
  'ufa-monument-druzhby': '/images/venues/ufa/monument-druzhby.jpg',
  'tver-morozovskiy-gorodok-dvor-proletarki': '/images/venues/tver/morozovskiy-gorodok-dvor-proletarki.jpg',
  'sochi-morskoy-vokzal-sochi': '/images/venues/sochi/morskoy-vokzal-sochi.jpg',
  'saint-petersburg-morskoy-nikolskiy-sobor': '/images/venues/saint-petersburg/morskoy-nikolskiy-sobor.jpg',
  'tyumen-most-vlyublennyh': '/images/venues/tyumen/most-vlyublennyh.jpg',
  'krasnodar-most-potseluev': '/images/venues/krasnodar/most-potseluev.jpg',
  'murmansk-most-cherez-kolskiy-zaliv': '/images/venues/murmansk/most-cherez-kolskiy-zaliv.jpg',
  'simferopol-mramornaya-i-krasnaya-peschery': '/images/venues/simferopol/mramornaya-i-krasnaya-peschery.jpg',
  'saint-petersburg-mramornyy-dvorets': '/images/venues/saint-petersburg/mramornyy-dvorets.jpg',
  'sevastopol-mys-fiolent': '/images/venues/sevastopol/mys-fiolent.jpg',
  'habarovsk-naberezhnaya-admirala-nevelskogo-i-habarovskiy-utes': '/images/venues/habarovsk/naberezhnaya-admirala-nevelskogo-i-habarovskiy-utes.jpg',
  'yoshkar-ola-naberezhnaya-bryugge': '/images/venues/yoshkar-ola/naberezhnaya-bryugge.jpg',
  'kirov-kirovskaya-oblast-naberezhnaya-grina': '/images/venues/kirov-kirovskaya-oblast/naberezhnaya-grina.jpg',
  'saratov-naberezhnaya-kosmonavtov': '/images/venues/saratov/naberezhnaya-kosmonavtov.jpg',
  'blagoveschensk-amurskaya-oblast-naberezhnaya-reki-amur': '/images/venues/blagoveschensk-amurskaya-oblast/naberezhnaya-reki-amur.jpg',
  'rostov-na-donu-naberezhnaya-reki-don-beregovaya-ulitsa': '/images/venues/rostov-na-donu/naberezhnaya-reki-don-beregovaya-ulitsa.jpg',
  'chelyabinsk-naberezhnaya-reki-miass': '/images/venues/chelyabinsk/naberezhnaya-reki-miass.jpg',
  'kemerovo-naberezhnaya-reki-tomi': '/images/venues/kemerovo/naberezhnaya-reki-tomi.jpg',
  'tambov-naberezhnaya-reki-tsny': '/images/venues/tambov/naberezhnaya-reki-tsny.jpg',
  'arhangelsk-naberezhnaya-severnoy-dviny': '/images/venues/arhangelsk/naberezhnaya-severnoy-dviny.jpg',
  'ulan-ude-naberezhnaya-selengi': '/images/venues/ulan-ude/naberezhnaya-selengi.jpg',
  'tver-naberezhnaya-stepana-razina': '/images/venues/tver/naberezhnaya-stepana-razina.jpg',
  'vladivostok-naberezhnaya-tsesarevicha': '/images/venues/vladivostok/naberezhnaya-tsesarevicha.jpg',
  'sortavala-ladozhskie-shhery': '/images/venues/sortavala/ladozhskie-shhery.jpg',
  'nizhny-novgorod-nizhegorodskaya-kanatnaya-doroga': '/images/venues/nizhny-novgorod/nizhegorodskaya-kanatnaya-doroga.jpg',
  'irkutsk-naberezhnaya-angary': '/images/venues/irkutsk/naberezhnaya-angary.jpg',
  'saint-petersburg-nikolaevskiy-dvorets-dvorets-truda': '/images/venues/saint-petersburg/nikolaevskiy-dvorets-dvorets-truda.jpg',
  'saint-petersburg-nikolo-bogoyavlenskiy-morskoy-sobor': '/images/venues/saint-petersburg/nikolo-bogoyavlenskiy-morskoy-sobor.jpg',
  'veliky-novgorod-novgorodskiy-detinets-kreml': '/images/venues/veliky-novgorod/novgorodskiy-detinets-kreml.jpg',
  'saint-petersburg-novo-mihaylovskiy-dvorets': '/images/venues/saint-petersburg/novo-mihaylovskiy-dvorets.jpg',
  'arhangelsk-novodvinskaya-krepost': '/images/venues/arhangelsk/novodvinskaya-krepost.jpg',
  'saint-petersburg-obschestvennoe-prostranstvo-dvor-gostinki': '/images/venues/saint-petersburg/obschestvennoe-prostranstvo-dvor-gostinki.jpg',
  'saint-petersburg-okeanarium': '/images/venues/saint-petersburg/okeanarium.jpg',
  'omsk-omskaya-krepost': '/images/venues/omsk/omskaya-krepost.jpg',
  'orenburg-orenburgskaya-detskaya-zheleznaya-doroga': '/images/venues/orenburg/orenburgskaya-detskaya-zheleznaya-doroga.jpg',
  'orenburg-orenburgskaya-naberezhnaya-i-stantsiya-komsomol-skaya': '/images/venues/orenburg/orenburgskaya-naberezhnaya-i-stantsiya-komsomol-skaya.jpg',
  'saint-petersburg-osobnyak-brusnitsynyh': '/images/venues/saint-petersburg/osobnyak-brusnitsynyh.jpg',
  'saint-petersburg-osobnyak-ziva': '/images/venues/saint-petersburg/osobnyak-ziva.jpg',
  'saint-petersburg-osobnyak-kelha': '/images/venues/saint-petersburg/osobnyak-kelha.jpg',
  'saint-petersburg-osobnyak-kochubeya-dom-s-mavrami': '/images/venues/saint-petersburg/osobnyak-kochubeya-dom-s-mavrami.jpg',
  'saint-petersburg-osobnyak-novinskih': '/images/venues/saint-petersburg/osobnyak-novinskih.jpg',
  'saint-petersburg-osobnyak-polovtsova-dom-arhitektora': '/images/venues/saint-petersburg/osobnyak-polovtsova-dom-arhitektora.jpg',
  'saint-petersburg-osobnyak-rumyantseva': '/images/venues/saint-petersburg/osobnyak-rumyantseva.jpg',
  'saint-petersburg-osobnyak-trubetskih-naryshkinyh': '/images/venues/saint-petersburg/osobnyak-trubetskih-naryshkinyh.jpg',
  'saint-petersburg-osobnyak-forostovskogo': '/images/venues/saint-petersburg/osobnyak-forostovskogo.jpg',
  'saint-petersburg-osobnyak-forsha-dacha-gausvald': '/images/venues/saint-petersburg/osobnyak-forsha-dacha-gausvald.jpg',
  'saint-petersburg-osobnyak-chaeva': '/images/venues/saint-petersburg/osobnyak-chaeva.jpg',
  'sortavala-ostrov-valaam': '/images/venues/sortavala/ostrov-valaam.jpg',
  'vladivostok-ostrov-russkiy': '/images/venues/vladivostok/ostrov-russkiy.jpg',
  'kazan-ostrov-grad-sviyazhsk': '/images/venues/kazan/ostrov-grad-sviyazhsk.jpg',
  'saint-petersburg-otkrytye-dvory-kolodtsy-ekskursii-po-dvoram': '/images/venues/saint-petersburg/otkrytye-dvory-kolodtsy-ekskursii-po-dvoram.jpg',
  'pavlovskiy-dvorec-145de6e04a72': '/images/venues/saint-petersburg/pavlovskiy-dvorec-145de6e04a72.jpg',
  'smolensk-pamyatnik-blagodarnaya-rossiya-geroyam-1812-goda-pamyatnik-s-orlami': '/images/venues/smolensk/pamyatnik-blagodarnaya-rossiya-geroyam-1812-goda-pamyatnik-s-orlami.jpg',
  'ryazan-pamyatnik-griby-s-glazami': '/images/venues/ryazan/pamyatnik-griby-s-glazami.jpg',
  'murmansk-pamyatnik-zhduschaya': '/images/venues/murmansk/pamyatnik-zhduschaya.jpg',
  'omsk-pamyatnik-slesar-stepanych': '/images/venues/omsk/pamyatnik-slesar-stepanych.jpg',
  'belgorod-pamyatnik-smotritel-dorog-pamyatnik-chestnomu-avtoinspektoru-grechihinu': '/images/venues/belgorod/pamyatnik-smotritel-dorog-pamyatnik-chestnomu-avtoinspektoru-grechihinu.jpg',
  'veliky-novgorod-pamyatnik-tysyacheletie-rossii': '/images/venues/veliky-novgorod/pamyatnik-tysyacheletie-rossii.jpg',
  'tomsk-pamyatnik-a-p-chehovu': '/images/venues/tomsk/pamyatnik-a-p-chehovu.jpg',
  'tver-pamyatnik-afanasiyu-nikitinu': '/images/venues/tver/pamyatnik-afanasiyu-nikitinu.jpg',
  'voronezh-pamyatnik-belomu-bimu': '/images/venues/voronezh/pamyatnik-belomu-bimu.jpg',
  'ulyanovsk-pamyatnik-bukve-e': '/images/venues/ulyanovsk/pamyatnik-bukve-e.jpg',
  'vologda-pamyatnik-bukve-o': '/images/venues/vologda/pamyatnik-bukve-o.jpg',
  'krasnodar-pamyatnik-ekaterine-ii': '/images/venues/krasnodar/pamyatnik-ekaterine-ii.jpg',
  'sevastopol-pamyatnik-zatoplennym-korablyam-i-grafskaya-pristan': '/images/venues/sevastopol/pamyatnik-zatoplennym-korablyam-i-grafskaya-pristan.jpg',
  'orel-pamyatnik-ivanu-groznomu': '/images/venues/orel/pamyatnik-ivanu-groznomu.jpg',
  'izhevsk-pamyatnik-izhiku': '/images/venues/izhevsk/pamyatnik-izhiku.jpg',
  'belgorod-pamyatnik-knyazyu-vladimiru-krestitelyu-rusi': '/images/venues/belgorod/pamyatnik-knyazyu-vladimiru-krestitelyu-rusi.jpg',
  'syktyvkar-pamyatnik-kupecheskomu-sunduku': '/images/venues/syktyvkar/pamyatnik-kupecheskomu-sunduku.jpg',
  'tver-pamyatnik-mihailu-krugu': '/images/venues/tver/pamyatnik-mihailu-krugu.jpg',
  'blagoveschensk-amurskaya-oblast-pamyatnik-n-n-murav-evu-amurskomu': '/images/venues/blagoveschensk-amurskaya-oblast/pamyatnik-n-n-murav-evu-amurskomu.jpg',
  'penza-pamyatnik-pervoposelentsu': '/images/venues/penza/pamyatnik-pervoposelentsu.jpg',
  'arhangelsk-pamyatnik-petru-i': '/images/venues/arhangelsk/pamyatnik-petru-i.jpg',
  'lipeck-pamyatnik-petru-i-na-ploschadi-petra-velikogo': '/images/venues/lipeck/pamyatnik-petru-i-na-ploschadi-petra-velikogo.jpg',
  'ufa-pamyatnik-salavatu-yulaevu': '/images/venues/ufa/pamyatnik-salavatu-yulaevu.jpg',
  'tambov-pamyatnik-tambovskomu-muzhiku': '/images/venues/tambov/pamyatnik-tambovskomu-muzhiku.jpg',
  'saint-petersburg-paradnaya-romashka-dom-eliseeva': '/images/venues/saint-petersburg/paradnaya-romashka-dom-eliseeva.jpg',
  'rostov-na-donu-paramonovskie-sklady': '/images/venues/rostov-na-donu/paramonovskie-sklady.jpg',
  'kurgan-tsentr-vosstanovitel-naya-travmatologiya-i-ortopediya-imeni-akade': '/images/venues/kurgan/tsentr-vosstanovitel-naya-travmatologiya-i-ortopediya-imeni-akade.jpg',
  'kirov-kirovskaya-oblast-zapovednik-skazok-interaktivnyy-park-rezidentsiya-kikimory-vyatskoy': '/images/venues/kirov-kirovskaya-oblast/zapovednik-skazok-interaktivnyy-park-rezidentsiya-kikimory-vyatskoy.jpg',
  'abakan-botanicheskiy-sad-so-ran': '/images/venues/abakan/botanicheskiy-sad-so-ran.jpg',
  'novosibirsk-akademgorodok': '/images/venues/novosibirsk/akademgorodok.jpg',
  'saint-petersburg-aleksandrovskiy-park': '/images/venues/saint-petersburg/aleksandrovskiy-park.jpg',
  'kirov-kirovskaya-oblast-aleksandrovskiy-sad': '/images/venues/kirov-kirovskaya-oblast/aleksandrovskiy-sad.jpg',
  'saint-petersburg-andersengrad-sosnovyy-bor': '/images/venues/saint-petersburg/andersengrad-sosnovyy-bor.jpg',
  'simferopol-arheologicheskiy-zapovednik-skifskiy-neapol': '/images/venues/simferopol/arheologicheskiy-zapovednik-skifskiy-neapol.jpg',
  'astrahan-astrahanskiy-biosfernyy-zapovednik': '/images/venues/astrahan/astrahanskiy-biosfernyy-zapovednik.jpg',
  'saint-petersburg-botanicheskiy-sad-petra-velikogo': '/images/venues/saint-petersburg/botanicheskiy-sad-petra-velikogo.jpg',
  'simferopol-gagarinskiy-park': '/images/venues/simferopol/gagarinskiy-park.jpg',
  'sortavala-gornyy-park-ruskeala': '/images/venues/sortavala/gornyy-park-ruskeala.jpg',
  'habarovsk-gorodskie-prudy-i-park-dinamo': '/images/venues/habarovsk/gorodskie-prudy-i-park-dinamo.jpg',
  'krasnodar-gorodskoy-sad-park-gor-kogo': '/images/venues/krasnodar/gorodskoy-sad-park-gor-kogo.jpg',
  'izhevsk-zoopark-udmurtii': '/images/venues/izhevsk/zoopark-udmurtii.jpg',
  'yaroslavl-gubernatorskiy-sad': '/images/venues/yaroslavl/gubernatorskiy-sad.jpg',
  'sortavala-istoricheskiy-park-bastion': '/images/venues/sortavala/istoricheskiy-park-bastion.jpg',
  'kunstkamera-7781ff68ac5a': '/images/venues/saint-petersburg/kunstkamera-7781ff68ac5a.jpg',
  'tomsk-lagernyy-sad': '/images/venues/tomsk/lagernyy-sad.jpg',
  'orel-park-dvoryanskoe-gnezdo': '/images/venues/orel/park-dvoryanskoe-gnezdo.jpg',
  'saint-petersburg-leningradskiy-zoopark': '/images/venues/saint-petersburg/leningradskiy-zoopark.jpg',
  'saint-petersburg-letniy-sad': '/images/venues/saint-petersburg/letniy-sad.jpg',
  'smolensk-lopatinskiy-sad': '/images/venues/smolensk/lopatinskiy-sad.jpg',
  'saint-petersburg-mihaylovskiy-sad': '/images/venues/saint-petersburg/mihaylovskiy-sad.jpg',
  'saint-petersburg-naberezhnaya-parka-300-letiya': '/images/venues/saint-petersburg/naberezhnaya-parka-300-letiya.jpg',
  'nizhny-novgorod-naberezhnaya-fedorovskogo': '/images/venues/nizhny-novgorod/naberezhnaya-fedorovskogo.jpg',
  'barnaul-nagornyy-park-i-bukvy-barnaul': '/images/venues/barnaul/nagornyy-park-i-bukvy-barnaul.jpg',
  'krasnoyarsk-natsional-nyy-park-krasnoyarskie-stolby': '/images/venues/krasnoyarsk/natsional-nyy-park-krasnoyarskie-stolby.jpg',
  'nizhny-novgorod-nizhegorodskiy-kreml': '/images/venues/nizhny-novgorod/nizhegorodskiy-kreml.jpg',
  'lipeck-nizhniy-park-i-lipetskiy-byuvet': '/images/venues/lipeck/nizhniy-park-i-lipetskiy-byuvet.jpg',
  'saint-petersburg-nizhniy-park-petergofa': '/images/venues/saint-petersburg/nizhniy-park-petergofa.jpg',
  'novosibirsk-novosibirskiy-zoopark-imeni-r-a-shilo': '/images/venues/novosibirsk/novosibirskiy-zoopark-imeni-r-a-shilo.jpg',
  'sochi-olimpiyskiy-park': '/images/venues/sochi/olimpiyskiy-park.jpg',
  'smolensk-pamyatnik-blagodarnaya-rossiya-geroyam-1812-goda-pamyatnik-s-or': '/images/venues/smolensk/pamyatnik-blagodarnaya-rossiya-geroyam-1812-goda-pamyatnik-s-or.jpg',
  'voronezh-park-alye-parusa': '/images/venues/voronezh/park-alye-parusa.jpg',
  'sochi-park-riv-era': '/images/venues/sochi/park-riv-era.jpg',
  'sortavala-park-vakkosalmi-i-gora-kuhavuori': '/images/venues/sortavala/park-vakkosalmi-i-gora-kuhavuori.jpg',
  'krasnodar-park-galitskogo-park-krasnodar': '/images/venues/krasnodar/park-galitskogo-park-krasnodar.jpg',
  'rostov-na-donu-park-revolyutsii': '/images/venues/rostov-na-donu/park-revolyutsii.jpg',
  'chelyabinsk-park-kul-tury-i-otdyha-im-yu-a-gagarina': '/images/venues/chelyabinsk/park-kul-tury-i-otdyha-im-yu-a-gagarina.jpg',
  'saratov-park-pobedy-na-sokolovoy-gore': '/images/venues/saratov/park-pobedy-na-sokolovoy-gore.jpg',
  'bryansk-park-muzey-imeni-a-k-tolstogo': '/images/venues/bryansk/park-muzey-imeni-a-k-tolstogo.jpg',
  'vladimir-patriarshie-sady': '/images/venues/vladimir/patriarshie-sady.jpg',
  'saint-petersburg-petergof': '/images/venues/saint-petersburg/petergof.jpg',
  'saint-petersburg-petrovskaya-akvatoriya': '/images/venues/saint-petersburg/petrovskaya-akvatoriya.jpg',
  'abakan-petroglify-na-skale-kazankovka': '/images/venues/abakan/petroglify-na-skale-kazankovka.jpg',
  'saint-petersburg-petrogradskaya-naberezhnaya': '/images/venues/saint-petersburg/petrogradskaya-naberezhnaya.jpg',
  'saint-petersburg-peshehodnaya-malaya-konyushennaya': '/images/venues/saint-petersburg/peshehodnaya-malaya-konyushennaya.jpg',
  'tyumen-peshehodnaya-ulitsa-dzerzhinskogo': '/images/venues/tyumen/peshehodnaya-ulitsa-dzerzhinskogo.jpg',
  'penza-penzenskaya-peshehodnaya-ulitsa-moskovskaya': '/images/venues/penza/penzenskaya-peshehodnaya-ulitsa-moskovskaya.jpg',
  'simferopol-ulitsy-pushkina-i-karla-marksa': '/images/venues/simferopol/ulitsy-pushkina-i-karla-marksa.jpg',
  'orenburg-peshehodnyy-most-evropa-aziya': '/images/venues/orenburg/peshehodnyy-most-evropa-aziya.jpg',
  'krasnoyarsk-peshehodnyy-most-na-ostrov-tatyshev': '/images/venues/krasnoyarsk/peshehodnyy-most-na-ostrov-tatyshev.jpg',
  'planetarii-1': '/images/venues/saint-petersburg/planetarii-1.jpg',
  'ekaterinburg-plotinka-istoricheskiy-skver': '/images/venues/ekaterinburg/plotinka-istoricheskiy-skver.jpg',
  'habarovsk-ploschad-imeni-lenina': '/images/venues/habarovsk/ploschad-imeni-lenina.jpg',
  'bryansk-ploschad-partizan': '/images/venues/bryansk/ploschad-partizan.jpg',
  'samara-ploschad-slavy': '/images/venues/samara/ploschad-slavy.jpg',
  'ulan-ude-ploschad-sovetov': '/images/venues/ulan-ude/ploschad-sovetov.jpg',
  'saransk-ploschad-tysyacheletiya-i-fontan-zvezda-mordovii': '/images/venues/saransk/ploschad-tysyacheletiya-i-fontan-zvezda-mordovii.jpg',
  'kurgan-pozharnaya-kalancha': '/images/venues/kurgan/pozharnaya-kalancha.jpg',
  'syktyvkar-pozharnaya-kalancha': '/images/venues/syktyvkar/pozharnaya-kalancha.jpg',
  'kostroma-pozharnaya-kalancha-na-susaninskoy-ploschadi': '/images/venues/kostroma/pozharnaya-kalancha-na-susaninskoy-ploschadi.jpg',
  'bryansk-pokrovskiy-sobor': '/images/venues/bryansk/pokrovskiy-sobor.jpg',
  'irkutsk-listvyanka': '/images/venues/irkutsk/listvyanka.jpg',
  'vladivostok-okeanarium': '/images/venues/vladivostok/okeanarium.jpg',
  'saint-petersburg-primorskiy-park-pobedy-krestovskiy-ostrov': '/images/venues/saint-petersburg/primorskiy-park-pobedy-krestovskiy-ostrov.jpg',
  'saint-petersburg-primorskiy-prospekt-park-300-letiya': '/images/venues/saint-petersburg/primorskiy-prospekt-park-300-letiya.jpg',
  'saint-petersburg-prioratskiy-dvorets': '/images/venues/saint-petersburg/prioratskiy-dvorets.jpg',
  'lipeck-prirodnyy-park-chudes-kudykina-gora': '/images/venues/lipeck/prirodnyy-park-chudes-kudykina-gora.jpg',
  'voronezh-prospekt-revolyutsii': '/images/venues/voronezh/prospekt-revolyutsii.jpg',
  'saratov-prospekt-stolypina': '/images/venues/saratov/prospekt-stolypina.jpg',
  'arhangelsk-prospekt-chumbarova-luchinskogo': '/images/venues/arhangelsk/prospekt-chumbarova-luchinskogo.jpg',
  'pskov-pskovskiy-krom-kreml': '/images/venues/pskov/pskovskiy-krom-kreml.jpg',
  'saint-petersburg-pushkinskaya-10': '/images/venues/saint-petersburg/pushkinskaya-10.jpg',
  'tomsk-rossiysko-nemetskiy-dom-dom-kuptsa-golovanova': '/images/venues/tomsk/rossiysko-nemetskiy-dom-dom-kuptsa-golovanova.jpg',
  'kemerovo-rudnichnyy-sosnovyy-bor': '/images/venues/kemerovo/rudnichnyy-sosnovyy-bor.jpg',
  'vladivostok-russkiy-most': '/images/venues/vladivostok/russkiy-most.jpg',
  'veliky-novgorod-ryurikovo-gorodische': '/images/venues/veliky-novgorod/ryurikovo-gorodische.jpg',
  'ryazan-ryazanskiy-kreml': '/images/venues/ryazan/ryazanskiy-kreml.jpg',
  'samara-samarskaya-naberezhnaya': '/images/venues/samara/samarskaya-naberezhnaya.jpg',
  'yuzhno-sahalinsk-sahalinskiy-zoobotanicheskiy-park': '/images/venues/yuzhno-sahalinsk/sahalinskiy-zoobotanicheskiy-park.jpg',
  'abakan-sayano-shushenskaya-ges': '/images/venues/abakan/sayano-shushenskaya-ges.jpg',
  'bryansk-svenskiy-svyato-uspenskiy-monastyr': '/images/venues/bryansk/svenskiy-svyato-uspenskiy-monastyr.jpg',
  'penza-svetozvukovoy-fontan': '/images/venues/penza/svetozvukovoy-fontan.jpg',
  'izhevsk-svyato-mihaylovskiy-sobor': '/images/venues/izhevsk/svyato-mihaylovskiy-sobor.jpg',
  'syktyvkar-svyato-stefanovskiy-kafedralnyy-sobor': '/images/venues/syktyvkar/svyato-stefanovskiy-kafedralnyy-sobor.jpg',
  'kostroma-svyato-troitskiy-ipatevskiy-monastyr': '/images/venues/kostroma/svyato-troitskiy-ipatevskiy-monastyr.jpg',
  'kurgan-svyato-troitskiy-sobor': '/images/venues/kurgan/svyato-troitskiy-sobor.jpg',
  'smolensk-svyato-uspenskiy-kafedralnyy-sobor': '/images/venues/smolensk/svyato-uspenskiy-kafedralnyy-sobor.jpg',
  'pskov-pskovo-pecherskiy-monastyr': '/images/venues/pskov/pskovo-pecherskiy-monastyr.jpg',
  'kirov-kirovskaya-oblast-svyato-uspenskiy-trifonov-muzhskoy-monastyr': '/images/venues/kirov-kirovskaya-oblast/svyato-uspenskiy-trifonov-muzhskoy-monastyr.jpg',
  'saint-petersburg-sevkabel-port': '/images/venues/saint-petersburg/sevkabel-port.jpg',
  'kursk-sergievo-kazanskiy-sobor': '/images/venues/kursk/sergievo-kazanskiy-sobor.jpg',
  'saint-petersburg-sidreriya-sidr-i-nensi': '/images/venues/saint-petersburg/sidreriya-sidr-i-nensi.jpg',
  'simferopol-simferopol-skoe-vodohranilische': '/images/venues/simferopol/simferopol-skoe-vodohranilische.jpg',
  'saint-petersburg-skalnyy-park-monrepo': '/images/venues/saint-petersburg/skalnyy-park-monrepo.jpg',
  'tyumen-skver-sibirskih-koshek': '/images/venues/tyumen/skver-sibirskih-koshek.jpg',
  'yoshkar-ola-skul-pturnaya-kompozitsiya-yoshkin-kot': '/images/venues/yoshkar-ola/skul-pturnaya-kompozitsiya-yoshkin-kot.jpg',
  'orel-sliyanie-rek-oki-i-orlika': '/images/venues/orel/sliyanie-rek-oki-i-orlika.jpg',
  'smolensk-smolenskaya-krepostnaya-stena': '/images/venues/smolensk/smolenskaya-krepostnaya-stena.jpg',
  'saint-petersburg-smolenskoe-lyuteranskoe-kladbische': '/images/venues/saint-petersburg/smolenskoe-lyuteranskoe-kladbische.jpg',
  'saint-petersburg-smolnyy-sobor': '/images/venues/saint-petersburg/smolnyy-sobor.jpg',
  'saint-petersburg-smotrovaya-lahta-tsentra': '/images/venues/saint-petersburg/smotrovaya-lahta-tsentra.jpg',
  'ekaterinburg-smotrovaya-ploschadka-bts-vysotskiy': '/images/venues/ekaterinburg/smotrovaya-ploschadka-bts-vysotskiy.jpg',
  'belgorod-sobornaya-ploschad': '/images/venues/belgorod/sobornaya-ploschad.jpg',
  'lipeck-sobornaya-ploschad-i-hristorozhdestvenskiy-kafedralnyy-sobor': '/images/venues/lipeck/sobornaya-ploschad-i-hristorozhdestvenskiy-kafedralnyy-sobor.jpg',
  'veliky-novgorod-sofiyskiy-sobor': '/images/venues/veliky-novgorod/sofiyskiy-sobor.jpg',
  'tambov-spaso-preobrazhenskiy-kafedralnyy-sobor': '/images/venues/tambov/spaso-preobrazhenskiy-kafedralnyy-sobor.jpg',
  'stavropol-stavropol-skiy-botanicheskiy-sad': '/images/venues/stavropol/stavropol-skiy-botanicheskiy-sad.jpg',
  'saransk-stadion-mordoviya-arena': '/images/venues/saransk/stadion-mordoviya-arena.jpg',
  'tver-starovolzhskiy-most': '/images/venues/tver/starovolzhskiy-most.jpg',
  'yaroslavl-strelka-rek-volgi-i-kotorosli': '/images/venues/yaroslavl/strelka-rek-volgi-i-kotorosli.jpg',
  'nizhny-novgorod-strelka-rek-volgi-i-oki': '/images/venues/nizhny-novgorod/strelka-rek-volgi-i-oki.jpg',
  'saint-petersburg-stroganovskiy-dvorets': '/images/venues/saint-petersburg/stroganovskiy-dvorets.jpg',
  'kostroma-susaninskaya-ploschad-skovorodka': '/images/venues/kostroma/susaninskaya-ploschad-skovorodka.jpg',
  'chelyabinsk-sfera-lyubvi': '/images/venues/chelyabinsk/sfera-lyubvi.jpg',
  'saint-petersburg-tavricheskiy-sad': '/images/venues/saint-petersburg/tavricheskiy-sad.jpg',
  'kostroma-terem-snegurochki': '/images/venues/kostroma/terem-snegurochki.jpg',
  'tyumen-termal-nye-istochniki': '/images/venues/tyumen/termal-nye-istochniki.jpg',
  'sochi-tiso-samshitovaya-roscha': '/images/venues/sochi/tiso-samshitovaya-roscha.jpg',
  'chita-titovskaya-sopka': '/images/venues/chita/titovskaya-sopka.jpg',
  'stavropol-tiflisskie-vorota': '/images/venues/stavropol/tiflisskie-vorota.jpg',
  'saint-petersburg-trete-mesto': '/images/venues/saint-petersburg/trete-mesto.jpg',
  'blagoveschensk-amurskaya-oblast-triumfal-naya-arka': '/images/venues/blagoveschensk-amurskaya-oblast/triumfal-naya-arka.jpg',
  'saint-petersburg-troitskiy-most': '/images/venues/saint-petersburg/troitskiy-most.jpg',
  'tula-tul-skiy-kreml': '/images/venues/tula/tul-skiy-kreml.jpg',
  'kazan-ulitsa-baumana': '/images/venues/kazan/ulitsa-baumana.jpg',
  'ekaterinburg-ulitsa-vaynera': '/images/venues/ekaterinburg/ulitsa-vaynera.jpg',
  'saint-petersburg-ulitsa-zodchego-rossi': '/images/venues/saint-petersburg/ulitsa-zodchego-rossi.jpg',
  'krasnodar-ulitsa-krasnaya': '/images/venues/krasnodar/ulitsa-krasnaya.jpg',
  'syktyvkar-ulitsa-kuratova-i-kupecheskie-doma': '/images/venues/syktyvkar/ulitsa-kuratova-i-kupecheskie-doma.jpg',
  'orel-ulitsa-lenina': '/images/venues/orel/ulitsa-lenina.jpg',
  'ulan-ude-ulitsa-lenina': '/images/venues/ulan-ude/ulitsa-lenina.jpg',
  'ryazan-ulitsa-pochtovaya': '/images/venues/ryazan/ulitsa-pochtovaya.jpg',
  'kirov-kirovskaya-oblast-ulitsa-spasskaya-vyatskiy-arbat': '/images/venues/kirov-kirovskaya-oblast/ulitsa-spasskaya-vyatskiy-arbat.jpg',
  'omsk-ulitsa-chokana-valihanova': '/images/venues/omsk/ulitsa-chokana-valihanova.jpg',
  'saint-petersburg-universitetskaya-naberezhnaya': '/images/venues/saint-petersburg/universitetskaya-naberezhnaya.jpg',
  'saint-petersburg-usadba-demidovyh': '/images/venues/saint-petersburg/usadba-demidovyh.jpg',
  'saint-petersburg-usadba-e-r-dashkovoy-kiryanovo': '/images/venues/saint-petersburg/usadba-e-r-dashkovoy-kiryanovo.jpg',
  'omsk-uspenskiy-kafedral-nyy-sobor': '/images/venues/omsk/uspenskiy-kafedral-nyy-sobor.jpg',
  'vladimir-uspenskiy-sobor': '/images/venues/vladimir/uspenskiy-sobor.jpg',
  'ufa-fontan-sem-devushek': '/images/venues/ufa/fontan-sem-devushek.jpg',
  'vladivostok-funikulyor': '/images/venues/vladivostok/funikulyor.jpg',
  'saratov-hram-utoli-moya-pechali': '/images/venues/saratov/hram-utoli-moya-pechali.jpg',
  'kazan-hram-vseh-religiy': '/images/venues/kazan/hram-vseh-religiy.jpg',
  'ekaterinburg-hram-na-krovi': '/images/venues/ekaterinburg/hram-na-krovi.jpg',
  'pskov-hramy-pskovskoy-arhitekturnoy-shkoly': '/images/venues/pskov/hramy-pskovskoy-arhitekturnoy-shkoly.jpg',
  'yoshkar-ola-tsarevokokshayskiy-kreml': '/images/venues/yoshkar-ola/tsarevokokshayskiy-kreml.jpg',
  'saint-petersburg-tsarskoselskiy-litsey': '/images/venues/saint-petersburg/tsarskoselskiy-litsey.jpg',
  'kurgan-tsentr-vosstanovitelnaya-travmatologiya-i-ortopediya-imeni-akademika-g-a': '/images/venues/kurgan/tsentr-vosstanovitelnaya-travmatologiya-i-ortopediya-imeni-akademika-g-a.jpg',
  'vologda-tsentr-narodnyh-promyslov-reznoy-palisad': '/images/venues/vologda/tsentr-narodnyh-promyslov-reznoy-palisad.jpg',
  'krasnoyarsk-tsentral-naya-naberezhnaya-eniseya': '/images/venues/krasnoyarsk/tsentral-naya-naberezhnaya-eniseya.jpg',
  'volgograd-tsentral-naya-naberezhnaya-imeni-62-y-armii': '/images/venues/volgograd/tsentral-naya-naberezhnaya-imeni-62-y-armii.jpg',
  'penza-park-imeni-v-g-belinskogo': '/images/venues/penza/park-imeni-v-g-belinskogo.jpg',
  'belgorod-tsentral-nyy-park-kul-tury-i-otdyha-imeni-v-i-lenina': '/images/venues/belgorod/tsentral-nyy-park-kul-tury-i-otdyha-imeni-v-i-lenina.jpg',
  'yaroslavl-tserkov-il-i-proroka': '/images/venues/yaroslavl/tserkov-il-i-proroka.jpg',
  'saint-petersburg-tsirk-chinizelli': '/images/venues/saint-petersburg/tsirk-chinizelli.jpg',
  'saint-petersburg-tspkio-im-kirova-elagin-ostrov': '/images/venues/saint-petersburg/tspkio-im-kirova-elagin-ostrov.jpg',
  'cheboksary-cheboksarskiy-zaliv-i-krasnaya-ploschad': '/images/venues/cheboksary/cheboksarskiy-zaliv-i-krasnaya-ploschad.jpg',
  'saint-petersburg-chesmenskaya-tserkov': '/images/venues/saint-petersburg/chesmenskaya-tserkov.jpg',
  'tyumen-chetyrehurovnevaya-naberezhnaya': '/images/venues/tyumen/chetyrehurovnevaya-naberezhnaya.jpg',
  'saint-petersburg-chizhik-pyzhik': '/images/venues/saint-petersburg/chizhik-pyzhik.jpg',
  'chita-chitinskiy-datsan-damba-breybuling': '/images/venues/chita/chitinskiy-datsan-damba-breybuling.jpg',
  'nizhny-novgorod-chkalovskaya-lestnitsa': '/images/venues/nizhny-novgorod/chkalovskaya-lestnitsa.jpg',
  'saint-petersburg-sheremetevskiy-dvorets-fontannyy-dom': '/images/venues/saint-petersburg/sheremetevskiy-dvorets-fontannyy-dom.jpg',
  'ivanovo-schudrovskaya-palatka': '/images/venues/ivanovo/schudrovskaya-palatka.jpg',
  'saransk-etnograficheskiy-kompleks-mordovskoe-podvore': '/images/venues/saransk/etnograficheskiy-kompleks-mordovskoe-podvore.jpg',
  'saint-petersburg-yusupovskiy-dvorets': '/images/venues/saint-petersburg/yusupovskiy-dvorets.jpg',
  'saint-petersburg-yusupovskiy-sad': '/images/venues/saint-petersburg/yusupovskiy-sad.jpg',
  'veliky-novgorod-yaroslavovo-dvorische': '/images/venues/veliky-novgorod/yaroslavovo-dvorische.jpg',
  'yaroslavl-yaroslavskiy-kreml-spaso-preobrazhenskiy-monastyr': '/images/venues/yaroslavl/yaroslavskiy-kreml-spaso-preobrazhenskiy-monastyr.jpg',
};

// GASTRO_PACK_IMAGES_START
const GASTRO_PACK_IMAGES: Record<string, string> = {
  'astrahan-rybnyy-rynok-selenskie-isady': '/images/venues/astrahan/rybnyy-rynok-selenskie-isady.jpg',
  'rostov-na-donu-tsentral-nyy-rynok-staryy-bazar': '/images/venues/rostov-na-donu/tsentral-nyy-rynok-staryy-bazar.jpg',
  'saint-petersburg-art-kafe-brodyachaya-sobaka': '/images/venues/saint-petersburg/art-kafe-brodyachaya-sobaka.jpg',
  'saint-petersburg-bar-dead-poets': '/images/venues/saint-petersburg/bar-dead-poets.jpg',
  'saint-petersburg-bar-imbibe': '/images/venues/saint-petersburg/bar-imbibe.jpg',
  'saint-petersburg-bar-mishka': '/images/venues/saint-petersburg/bar-mishka.jpg',
  'saint-petersburg-bar-orthodox': '/images/venues/saint-petersburg/bar-orthodox.jpg',
  'saint-petersburg-bar-balans-belogo': '/images/venues/saint-petersburg/bar-balans-belogo.jpg',
  'saint-petersburg-bar-zhan-zhak': '/images/venues/saint-petersburg/bar-zhan-zhak.jpg',
  'saint-petersburg-bar-zaliv': '/images/venues/saint-petersburg/bar-zaliv.jpg',
  'saint-petersburg-bar-kollektiv': '/images/venues/saint-petersburg/bar-kollektiv.jpg',
  'saint-petersburg-bar-hroniki': '/images/venues/saint-petersburg/bar-hroniki.jpg',
  'saint-petersburg-bulochnaya-f-volcheka': '/images/venues/saint-petersburg/bulochnaya-f-volcheka.jpg',
  'saint-petersburg-vegetarianskoe-kafe-rada-k': '/images/venues/saint-petersburg/vegetarianskoe-kafe-rada-k.jpg',
  'saint-petersburg-gastrobar-harvest': '/images/venues/saint-petersburg/gastrobar-harvest.jpg',
  'saint-petersburg-grand-otel-evropa-lobbi-bar': '/images/venues/saint-petersburg/grand-otel-evropa-lobbi-bar.jpg',
  'saint-petersburg-kafe-zoom': '/images/venues/saint-petersburg/kafe-zoom.jpg',
  'saint-petersburg-kafe-rubinshteyn': '/images/venues/saint-petersburg/kafe-rubinshteyn.jpg',
  'saint-petersburg-kokteylnyy-bar-xander': '/images/venues/saint-petersburg/kokteylnyy-bar-xander.jpg',
  'saint-petersburg-konditerskaya-sever-metropol': '/images/venues/saint-petersburg/konditerskaya-sever-metropol.jpg',
  'saint-petersburg-konditerskaya-troyka': '/images/venues/saint-petersburg/konditerskaya-troyka.jpg',
  'saint-petersburg-kofeynya-tchk': '/images/venues/saint-petersburg/kofeynya-tchk.jpg',
  'saint-petersburg-literaturnoe-kafe-volf-i-beranzhe': '/images/venues/saint-petersburg/literaturnoe-kafe-volf-i-beranzhe.jpg',
  'saint-petersburg-pivnoy-bar-dikkens': '/images/venues/saint-petersburg/pivnoy-bar-dikkens.jpg',
  'saint-petersburg-restoran-animals': '/images/venues/saint-petersburg/restoran-animals.jpg',
  'saint-petersburg-restoran-birch': '/images/venues/saint-petersburg/restoran-birch.jpg',
  'saint-petersburg-restoran-il-lago-dei-cigni': '/images/venues/saint-petersburg/restoran-il-lago-dei-cigni.jpg',
  'saint-petersburg-restoran-percorso': '/images/venues/saint-petersburg/restoran-percorso.jpg',
  'saint-petersburg-restoran-blok': '/images/venues/saint-petersburg/restoran-blok.jpg',
  'saint-petersburg-restoran-kokoko': '/images/venues/saint-petersburg/restoran-kokoko.jpg',
  'saint-petersburg-restoran-koryushka': '/images/venues/saint-petersburg/restoran-koryushka.jpg',
  'saint-petersburg-restoran-mama-tuta': '/images/venues/saint-petersburg/restoran-mama-tuta.jpg',
  'saint-petersburg-restoran-mansarda': '/images/venues/saint-petersburg/restoran-mansarda.jpg',
  'saint-petersburg-restoran-metropol': '/images/venues/saint-petersburg/restoran-metropol.jpg',
  'saint-petersburg-restoran-palkin': '/images/venues/saint-petersburg/restoran-palkin.jpg',
  'saint-petersburg-restoran-sintez': '/images/venues/saint-petersburg/restoran-sintez.jpg',
  'saint-petersburg-restoran-stroganov-steyk-haus': '/images/venues/saint-petersburg/restoran-stroganov-steyk-haus.jpg',
  'saint-petersburg-restoran-teplo': '/images/venues/saint-petersburg/restoran-teplo.jpg',
  'saint-petersburg-ryumochnaya-mayak': '/images/venues/saint-petersburg/ryumochnaya-mayak.jpg',
  'saint-petersburg-fudmoll-vokzal-1853': '/images/venues/saint-petersburg/fudmoll-vokzal-1853.jpg',
  'saint-petersburg-cheburechnaya-salhino': '/images/venues/saint-petersburg/cheburechnaya-salhino.jpg',
};
// GASTRO_PACK_IMAGES_END

const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {
  ...NIZHNY_NOVGOROD_IMAGES,
  ...SAINT_PETERSBURG_IMAGES,
  ...KALININGRAD_IMAGES,
  ...PERM_IMAGES,
  ...MOSCOW_IMAGES,
  ...EXTRA_AI_LOCATION_IMAGES,
  ...LOCATION_PACK_IMAGES,
  ...GASTRO_PACK_IMAGES,
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

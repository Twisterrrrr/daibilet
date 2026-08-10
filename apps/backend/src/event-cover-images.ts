/**
 * Editorial event covers (LOCATION_PACK-style).
 * Prefer these over supplier CDN posters with baked-in text/badges/clones.
 * Keys: event id and/or slug (lowercase).
 */
export const EVENT_PACK_IMAGES: Record<string, string> = {
  // --- Moscow: graphic / branded covers ---
  evt_tep_539: '/images/events/generated/evt-cover-leto-moskva-kievsky.jpg',
  'rechnaya-progulka-leto-v-moskve-ot-kievskogo-vokzala-do-parka-zaryade-539':
    '/images/events/generated/evt-cover-leto-moskva-kievsky.jpg',
  evt_tep_538: '/images/events/generated/evt-cover-leto-moskva-zaryade.jpg',
  'rechnaya-progulka-leto-v-moskve-ot-parka-zaryade-do-kievskogo-vokzala-538':
    '/images/events/generated/evt-cover-leto-moskva-zaryade.jpg',
  evt_tep_661: '/images/events/generated/evt-cover-moscow-bus-tour.jpg',
  'obzornaya-ekskursiya-po-moskve-na-avtobuse-ot-krasnoi-ploschadi-661':
    '/images/events/generated/evt-cover-moscow-bus-tour.jpg',
  evt_tep_370: '/images/events/generated/evt-cover-vyshe-tolko-lyubov.jpg',
  evt_6a46d111e23715ce3c4b151b: '/images/events/generated/evt-cover-vyshe-tolko-lyubov.jpg',

  // --- SPB: Harry Potter combo flyers ---
  evt_6a568c97fb086e947106c189: '/images/events/generated/evt-cover-hp-kombo-1.jpg',
  'kombo-1-6a568c97fb086e947106c189': '/images/events/generated/evt-cover-hp-kombo-1.jpg',
  evt_6a72a0ec1aff445150808cdb: '/images/events/generated/evt-cover-hp-kombo-2.jpg',
  'kombo-2-6a72a0ec1aff445150808cdb': '/images/events/generated/evt-cover-hp-kombo-2.jpg',
  evt_6a568d8db9f60b479106d0b4: '/images/events/generated/evt-cover-hp-kombo-3.jpg',
  'kombo-3-6a568d8db9f60b479106d0b4': '/images/events/generated/evt-cover-hp-kombo-3.jpg',
  evt_6a568dd6ecc71195c506d49f: '/images/events/generated/evt-cover-hp-kombo-5.jpg',
  'kombo-5-6a568dd6ecc71195c506d49f': '/images/events/generated/evt-cover-hp-kombo-5.jpg',
  evt_6a5692695c8b86c8fa06c17e: '/images/events/generated/evt-cover-hp-kombo-6.jpg',
  'kombo-6-6a5692695c8b86c8fa06c17e': '/images/events/generated/evt-cover-hp-kombo-6.jpg',
  evt_6a5692c05cd6034a4f35716c: '/images/events/generated/evt-cover-hp-kombo-7.jpg',
  'kombo-7-6a5692c05cd6034a4f35716c': '/images/events/generated/evt-cover-hp-kombo-7.jpg',
  evt_6a50eed7cc09d42c31bd959a: '/images/events/generated/evt-cover-hp-museum.jpg',

  // --- SPB: matryoshka logo clones ---
  evt_6a327c2df99238e6ffeb9a49: '/images/events/generated/evt-cover-matreshka-workshop.jpg',
  'tc-6a327c2df99238e6ffeb9a49-master-klass-po-rospisi-matreshki':
    '/images/events/generated/evt-cover-matreshka-workshop.jpg',
  evt_6a327b962c29f8ee7deb9a7d: '/images/events/generated/evt-cover-matreshka-museum.jpg',
  'tc-6a327b962c29f8ee7deb9a7d-bilet-v-muzei-matreshki':
    '/images/events/generated/evt-cover-matreshka-museum.jpg',

  // --- SPB: music lotto / bingo flyers ---
  evt_6a6751feb41436c4e43bcab7: '/images/events/generated/evt-cover-music-loto-1.jpg',
  'veseloe-muzykalnoe-loto-6a6751feb41436c4e43bcab7':
    '/images/events/generated/evt-cover-music-loto-1.jpg',
  evt_69e969ceaaa9d3f69567d633: '/images/events/generated/evt-cover-music-loto-2.jpg',
  evt_6a71fc0be4853fd24a213a91: '/images/events/generated/evt-cover-music-loto-3.jpg',
  evt_6a6766091ac6bb40693bc9cc: '/images/events/generated/evt-cover-music-bingo-1.jpg',
  'muzykalnoe-bingo-s-komikom-6a6766091ac6bb40693bc9cc':
    '/images/events/generated/evt-cover-music-bingo-1.jpg',
  evt_69e96bef1b9eea9de767cfe2: '/images/events/generated/evt-cover-music-bingo-2.jpg',
  evt_6a301670d9137ad000a123fc: '/images/events/generated/evt-cover-music-bingo-2.jpg',

  // --- SPB / MSK: other marketing posters ---
  evt_6a3e48bdc1b55f386ca62aa0: '/images/events/generated/evt-cover-standup-chistye.jpg',
  evt_6a5037097eae050ebc63ce43: '/images/events/generated/evt-cover-igrovecher.jpg',
  evt_6a4e0dcb288ec98394c62748: '/images/events/generated/evt-cover-jazz-cabaret-roof.jpg',
  evt_6a062b530236edc0859f9f77: '/images/events/generated/evt-cover-artvibes-lemons.jpg',
  evt_6a0616fa2b8fea292faf8fdc: '/images/events/generated/evt-cover-artvibes-lemons.jpg',
  evt_6a060d6f8e5df5a62b45ab43: '/images/events/generated/evt-cover-artvibes-lemons.jpg',
  evt_6a2fda5d0cc1db94d6a1237b: '/images/events/generated/evt-cover-mansion-concert.jpg',
  evt_6a3a7f967b10d6d1f3bd5ba8: '/images/events/generated/evt-cover-immersive-mansion.jpg',
  evt_6a3e838ef3832135ce46e52a: '/images/events/generated/evt-cover-fat-standup-1.jpg',
  evt_6a4110a9ecdeca1d1c46e4f2: '/images/events/generated/evt-cover-fat-standup-1.jpg',
  evt_69ecc07b79c15cb2276fd6e4: '/images/events/generated/evt-cover-pro-standup-1.jpg',
  evt_6a3e8c9fa44ae8eb5f46e765: '/images/events/generated/evt-cover-pro-standup-1.jpg',
  evt_69eaac4560435d3f0f492a56: '/images/events/generated/evt-cover-pro-standup-1.jpg',
  evt_6a1cd9d28c31e0910aad1210: '/images/events/generated/evt-cover-pro-standup-1.jpg',
  evt_tep_1456: '/images/events/generated/evt-cover-disco-boat.jpg',
  evt_tep_1473: '/images/events/generated/evt-cover-disco-boat.jpg',
  evt_6a5fd63c42ce827d9552681b: '/images/events/generated/evt-cover-disco-boat.jpg',
  evt_6a646fb8c053fa6a833bcad6: '/images/events/generated/evt-cover-disco-boat.jpg',
  evt_tep_707: '/images/events/generated/evt-cover-spb-bridges-night.jpg',
  'nochnaya-ekskursiya-pod-razvedennymi-mostami-707':
    '/images/events/generated/evt-cover-spb-bridges-night.jpg',

  // --- EKB: shared terrace flyer + open-mic / standup clones ---
  evt_6a67cb78641542b686719744: '/images/events/generated/evt-cover-ekb-terrace-1.jpg',
  'muzykalnaya-terrasa-esh-poi-lyubi-v-le-burg-1905-6a67cb78641542b686719744':
    '/images/events/generated/evt-cover-ekb-terrace-1.jpg',
  evt_6a7180cac490ffc827aba501: '/images/events/generated/evt-cover-ekb-terrace-2.jpg',
  'muzykalnaya-terrasa-belaya-vecherinka-ili-belyi-lotos-v-le-burg-1905-6a7180cac490ffc827aba501':
    '/images/events/generated/evt-cover-ekb-terrace-2.jpg',
  evt_6a71824eef319f7564820050: '/images/events/generated/evt-cover-ekb-terrace-3.jpg',
  'muzykalnaya-terrasa-i-will-always-love-you-v-le-burg-1905-6a71824eef319f7564820050':
    '/images/events/generated/evt-cover-ekb-terrace-3.jpg',
  evt_6a61e8e5c6c02d70ca3d5777: '/images/events/generated/evt-cover-ekb-openmic-1.jpg',
  evt_6a74517aebce8ac9cdbc20b6: '/images/events/generated/evt-cover-ekb-openmic-2.jpg',
  evt_6a61e63f1d3d7cc403235cc8: '/images/events/generated/evt-cover-ekb-bolno-1.jpg',
  evt_6a7451152c318c6eb3a12759: '/images/events/generated/evt-cover-ekb-bolno-2.jpg',

  // --- Kazan: tiny graphic stubs ---
  evt_6a26b332a49aa45bd55b1266: '/images/events/generated/evt-cover-kazan-kaleidoscope-1.jpg',
  evt_6a26b88263540bf6b05b1252: '/images/events/generated/evt-cover-kazan-kaleidoscope-2.jpg',

  // --- Moscow center cruises: supplier flyers with baked-in «РЕЧНАЯ ПРОГУЛКА…» text ---
  evt_tep_186: '/images/events/generated/evt-cover-leto-moskva-kievsky.jpg',
  'rechnaya-progulka-po-centru-moskvy-ot-prichala-kievskii-do-parka-zaryade-186':
    '/images/events/generated/evt-cover-leto-moskva-kievsky.jpg',
  evt_tep_187: '/images/events/generated/evt-cover-leto-moskva-zaryade.jpg',
  'rechnaya-progulka-po-centru-moskvy-ot-parka-zaryade-do-prichala-kievskii-vokzal-187':
    '/images/events/generated/evt-cover-leto-moskva-zaryade.jpg',
  evt_tep_1222: '/images/events/generated/evt-cover-moscow-center-loop.jpg',
  'rechnaya-progulka-po-centru-moskvy-ot-parka-zaryade-krugovaya-1222':
    '/images/events/generated/evt-cover-moscow-center-loop.jpg',

  // --- Exact content dupes: leave one sibling on original photo, rest get distinct covers ---
  evt_tep_1112: '/images/events/generated/evt-cover-river-express-a.jpg',
  evt_tep_1111: '/images/events/generated/evt-cover-river-express-b.jpg',
  evt_tep_1108: '/images/events/generated/evt-cover-river-express-c.jpg',
  evt_tep_1294: '/images/events/generated/evt-cover-retro-locman-a.jpg',
  evt_tep_1217: '/images/events/generated/evt-cover-retro-locman-b.jpg',
  evt_tep_827: '/images/events/generated/evt-cover-kitay-gorod-cruise.jpg',
  evt_tep_256: '/images/events/generated/evt-cover-moscow-center-loop.jpg',
  evt_tep_1383: '/images/events/generated/evt-cover-zaryade-m88.jpg',
  evt_6a42770b65a592a5d04b0ea9: '/images/events/generated/evt-cover-spb-evening-canal.jpg',
  'tc-6a42770b65a592a5d04b0ea9-vechernyaya-simfoniya-peterburga-na-avtobuse':
    '/images/events/generated/evt-cover-spb-evening-canal.jpg',
};

export function lookupEditorialEventImage(
  idOrSlug: string | null | undefined,
): string | null {
  const key = String(idOrSlug || '')
    .trim()
    .toLowerCase();
  if (!key) return null;
  return EVENT_PACK_IMAGES[key] || null;
}

/**
 * Prefer curated cover; otherwise keep hub URL when present.
 */
export function resolveEditorialEventImage(
  id: string | null | undefined,
  slug: string | null | undefined,
  hubImageUrl?: string | null,
): string | null {
  return (
    lookupEditorialEventImage(id) ||
    lookupEditorialEventImage(slug) ||
    (String(hubImageUrl || '').trim() || null)
  );
}

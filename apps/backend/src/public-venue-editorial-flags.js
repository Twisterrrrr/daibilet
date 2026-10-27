import data from './public-venue-editorial-flags.json' with { type: 'json' };

const editorialPacks = new Set(data.editorialPackSlugs);
const mustSeeByCity = new Map(
  Object.entries(data.mustSeeByCity).map(([city, slugs]) => [city, new Set(slugs)]),
);

/** Flags are a compact snapshot of web editorial sources, without loading the web app in API runtime. */
export function publicVenueEditorialFlags(slug, citySlug, cityName) {
  const venueSlug = String(slug || '').trim().toLowerCase();
  const cityCandidates = [citySlug, cityName].map(normalizeCitySlug).filter(Boolean);
  const cityKey = cityCandidates
    .map((candidate) => data.cityAliases[candidate] || candidate)
    .find((candidate) => mustSeeByCity.has(candidate));
  return {
    hasEditorialPack: editorialPacks.has(venueSlug),
    mustSee: Boolean(cityKey && mustSeeByCity.get(cityKey)?.has(venueSlug)),
  };
}

function normalizeCitySlug(value) {
  const letters = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(value || '').trim().toLowerCase().split('')
    .map((char) => letters[char] ?? char).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

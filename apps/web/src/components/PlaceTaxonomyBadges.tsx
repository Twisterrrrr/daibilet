import type { PublicVenueDto } from '@daibilet/contracts/public';

const kindLabels: Record<string, string> = {
  architecture: 'Архитектура', monument: 'Памятник', museum: 'Музей', religion: 'Религиозное место',
  nature: 'Природа', urban: 'Городское место', theatre: 'Театр', entertainment: 'Развлечения',
  food: 'Еда', venue: 'Площадка', transport: 'Транспорт',
};
const subtypeLabels: Record<string, string> = {
  pier: 'Причал', river_terminal: 'Речной вокзал', sea_terminal: 'Морской вокзал',
  railway_station: 'Железнодорожный вокзал', bus_station: 'Автовокзал',
  metro_station: 'Станция метро', cable_car_station: 'Станция канатной дороги',
  airport: 'Аэропорт', marina: 'Марина', waterfall: 'Водопад', cave: 'Пещера',
  mountain: 'Гора', lake: 'Озеро', river: 'Река', beach: 'Пляж', forest: 'Лес',
  hot_spring: 'Термальный источник', island: 'Остров', cape: 'Мыс', reserve: 'Заповедник', park: 'Парк',
};

export function PlaceTaxonomyBadges({ venue }: { venue: PublicVenueDto }) {
  const kind = venue.placeType && kindLabels[venue.placeType];
  const subtype = venue.placeSubtype && subtypeLabels[venue.placeSubtype];
  if (!kind && !subtype && !venue.isMainPlace && !venue.hubTags?.includes('gastro')) return null;
  const badges = [kind, subtype, venue.isMainPlace ? 'Главные места' : null,
    venue.hubTags?.includes('gastro') ? 'Гастро' : null].filter(Boolean);
  return <div className="mt-3 flex flex-wrap gap-2" aria-label="Классификация места">
    {badges.map((badge) => <span key={badge} className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white">{badge}</span>)}
  </div>;
}

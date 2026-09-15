/**
 * Owner-simplified visit duration table for must-see chips / day-route dwell.
 * Always derived from category heuristics (editorial `visitMinutes` ignored).
 */

export type VisitMinutesValue = number | string;

type VisitRulesInput = {
  name?: string | null;
  desc?: string | null;
  venueSlug?: string | null;
  locationSlug?: string | null;
  href?: string | null;
  mustSeeFilter?: string | null;
  visitMinutes?: number | string | null;
};

function hay(place: VisitRulesInput): string {
  return `${place.name || ''} ${place.desc || ''} ${place.venueSlug || ''} ${place.locationSlug || ''} ${place.href || ''}`
    .toLowerCase()
    .replace(/ё/g, 'е');
}

/** Cable cars / ropeways. */
function isCableCar(place: VisitRulesInput): boolean {
  return /канатн|канатка|cable.?car|ropeway|gondola/.test(hay(place));
}

/** Theaters / concert halls (no dedicated mustSeeFilter). */
function isTheater(place: VisitRulesInput): boolean {
  return /театр|филармон|консерватор|opera|оперн|балет|circus|цирк|концертн/.test(hay(place));
}

/**
 * Owner table (2026-08-15):
 * monuments 15; open/street/yard/square/facade 20; promenades 1h;
 * museums 1-2h; gastro 1h; theaters 2h; temples 30; parks 1-2h; cable cars 30.
 *
 * Explicit non-`main` mustSeeFilter wins; `main`/missing → text heuristics
 * (so «Главное» museums/temples still get museum/temple minutes).
 */
export function visitMinutesFromMustSeeRules(place: VisitRulesInput): VisitMinutesValue {
  if (isCableCar(place)) return 30;
  if (isTheater(place)) return 120;

  const filter = place.mustSeeFilter && place.mustSeeFilter !== 'main' ? place.mustSeeFilter : null;

  switch (filter) {
    case 'monument':
      return 15;
    case 'street':
    case 'houses':
    case 'mansions':
    case 'secret':
    case 'creative':
      return 20;
    case 'views':
      return 60;
    case 'museum':
    case 'science':
    case 'literature':
      return '1-2 ч';
    case 'gastro':
      return 60;
    case 'temple':
      return 30;
    case 'park':
      return '1-2 ч';
    default: {
      const h = hay(place);
      if (/памятник|monument|скульптур|монумент/.test(h)) return 15;
      if (/набережн|променад|бульвар|смотров/.test(h)) return 60;
      if (/музей|галере|выставк|эрмитаж|кунсткамер|фаберже/.test(h)) return '1-2 ч';
      if (/парк|сад\b|сквер/.test(h)) return '1-2 ч';
      if (/храм|собор|церков|мечет|монастыр|часовн|кирх/.test(h)) return 30;
      if (/ресторан|кафе|бар\b|пельник|гастро/.test(h)) return 60;
      if (/улиц|проспект|переулок|площад|двор\b|фасад|особняк|усадьб/.test(h)) return 20;
      // Open landmarks / squares / facades
      return 20;
    }
  }
}

/** Chip + day-route dwell: always owner rules table. */
export function resolveMustSeeVisitMinutes(place: VisitRulesInput): VisitMinutesValue {
  return visitMinutesFromMustSeeRules(place);
}

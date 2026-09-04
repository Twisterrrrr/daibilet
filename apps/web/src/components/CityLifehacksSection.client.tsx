'use client';

import {
  Bus,
  CableCar,
  ExternalLink,
  Footprints,
  Landmark,
  Plane,
  Route,
  Ship,
  UtensilsCrossed,
} from 'lucide-react';

import { CityHubSectionHeading } from '@/components/CityHubSectionHeading';
import { HubCarouselChrome } from '@/components/HubCarouselChrome.client';
import { useHubCardRail } from '@/hooks/useHubCardRail';
import {
  focusFromLifehackCta,
  resolveCityLifehacks,
  type CityLifehackIcon,
  type CityLifehackItem,
} from '@/lib/city-hub-lifehacks';
import { poCityDative } from '@/lib/city-declension';
import type { CityPlaceFocus } from '@/lib/city-hub-local-flavor';

type Props = {
  citySlug: string;
  cityName?: string;
  editorial?: boolean;
  /** Extra top margin when nested under must-see. */
  className?: string;
  onPlaceFocus: (focus: CityPlaceFocus) => void;
  onAffiche: () => void;
};

const ICONS: Record<CityLifehackIcon, typeof Footprints> = {
  walk: Footprints,
  transit: Bus,
  fly: Plane,
  food: UtensilsCrossed,
  loop: Route,
  museum: Landmark,
  ship: Ship,
  cable: CableCar,
};

const CARD_WIDTH =
  'flex w-[min(100%,19.5rem)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-300 hover:-translate-y-1';
const LIFEHACK_ICON = 'bg-sky-100/80 text-sky-800';
const LIFEHACK_HOVER_SHADOW =
  'hover:shadow-[0_10px_28px_-10px_hsl(221_83%_53%_/_0.28)]';

function LifehackBody({ item, editorial }: { item: CityLifehackItem; editorial: boolean }) {
  return (
    <p className={`text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
      {item.body.map((part, index) =>
        part.strong ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>,
      )}
    </p>
  );
}

function externalRel() {
  return { target: '_blank' as const, rel: 'noopener noreferrer' };
}

function CtaControl({
  item,
  primary,
  editorial,
  onPlaceFocus,
  onAffiche,
}: {
  item: CityLifehackItem;
  primary: boolean;
  editorial: boolean;
  onPlaceFocus: (focus: CityPlaceFocus) => void;
  onAffiche: () => void;
}) {
  const cta = item.cta;
  const filled = primary && (cta.kind === 'affiche' || cta.kind === 'places' || !cta.extra?.length);
  const filledClass = editorial
    ? 'bg-zinc-900 text-white hover:bg-zinc-800'
    : 'bg-slate-900 text-white hover:bg-slate-800';
  const outlineClass = editorial
    ? 'border border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400'
    : 'border border-slate-200 bg-white text-slate-800 hover:border-slate-400';
  const linkClass = editorial
    ? 'text-zinc-900 underline-offset-4 hover:underline'
    : 'text-primary-700 hover:text-primary-800';
  const chipClass = `inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
    filled ? filledClass : outlineClass
  }`;

  if (cta.kind === 'affiche') {
    return (
      <button type="button" className={chipClass} onClick={onAffiche}>
        {cta.label}
      </button>
    );
  }

  if (cta.kind === 'places') {
    return (
      <button
        type="button"
        className={chipClass}
        onClick={() => {
          const focus = focusFromLifehackCta(item, cta);
          if (focus) onPlaceFocus(focus);
        }}
      >
        {cta.label}
      </button>
    );
  }

  if (cta.extra?.length) {
    const links = [{ label: cta.label, href: cta.href || '' }, ...cta.extra].filter((link) => link.href);
    return (
      <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
        {links.map((link) => (
          <a key={link.href} href={link.href} className={linkClass} {...externalRel()}>
            {link.label}
          </a>
        ))}
      </div>
    );
  }

  if (!cta.href) return null;
  return (
    <a href={cta.href} className={chipClass} {...externalRel()}>
      {cta.label}
      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
    </a>
  );
}

export function CityLifehacksSection({
  citySlug,
  cityName,
  editorial = false,
  className = '',
  onPlaceFocus,
  onAffiche,
}: Props) {
  const pack = resolveCityLifehacks(citySlug);
  const items = pack?.items ?? [];
  const { scrollerRef, canPrev, canNext, onPrev, onNext } = useHubCardRail(
    '[data-lifehack-card]',
    `${citySlug}:${items.length}`,
  );

  if (!pack) return null;

  const heading = cityName
    ? `Лайфхаки ${poCityDative(cityName)}: как сберечь бюджет`
    : 'Лайфхаки: как сберечь бюджет';
  const cardShell = editorial
    ? `${CARD_WIDTH} shadow-sm ${LIFEHACK_HOVER_SHADOW}`
    : `${CARD_WIDTH} shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] ${LIFEHACK_HOVER_SHADOW}`;

  return (
    <section
      id="lifehacks"
      className={`scroll-mt-[calc(var(--site-header-height)+3.25rem)] ${className}`.trim()}
      data-city-lifehacks
    >
      <CityHubSectionHeading
        title={heading}
        description="Практичные советы, чтобы не потерять день и бюджет"
        editorial={editorial}
      />

      <HubCarouselChrome
        className="mt-5"
        scrollerRef={scrollerRef}
        trackClassName="flex items-stretch snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0"
        aria-label={heading}
        showArrows={items.length > 1}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={onPrev}
        onNext={onNext}
        prevLabel="Предыдущий лайфхак"
        nextLabel="Следующий лайфхак"
      >
        {items.map((item, cardIndex) => {
          const Icon = ICONS[item.icon] || Footprints;
          return (
            <article key={item.id} data-lifehack-card={item.id} className={cardShell}>
              <div className="flex h-full flex-1 flex-col">
                <div className="flex items-center gap-3 bg-sky-50 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${LIFEHACK_ICON}`}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <h3
                    className={`min-w-0 flex-1 text-base font-bold leading-snug ${
                      editorial ? 'text-zinc-950' : 'text-slate-950'
                    }`}
                  >
                    {item.title}
                  </h3>
                </div>
                <div className="flex min-w-0 flex-1 flex-col bg-white px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                  <div className="min-w-0 flex-1">
                    <LifehackBody item={item} editorial={editorial} />
                  </div>
                  <div className="mt-auto flex min-h-9 items-end pt-4">
                    <CtaControl
                      item={item}
                      primary={cardIndex === 0}
                      editorial={editorial}
                      onPlaceFocus={onPlaceFocus}
                      onAffiche={onAffiche}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </HubCarouselChrome>
    </section>
  );
}

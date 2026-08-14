'use client';

import {
  Bus,
  CableCar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Footprints,
  Landmark,
  Plane,
  Route,
  Ship,
  UtensilsCrossed,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  'w-[min(100%,19.5rem)] shrink-0 snap-start overflow-hidden rounded-2xl border bg-white';

function LifehackBody({ item, editorial }: { item: CityLifehackItem; editorial: boolean }) {
  return (
    <p className={`mt-2 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
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
  const chipClass = `mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
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
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const syncIndex = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>('[data-lifehack-card]');
    const card = cards[0];
    if (!card) return;
    const step = card.getBoundingClientRect().width + 16;
    if (step < 1) return;
    setIndex(Math.max(0, Math.min(items.length - 1, Math.round(el.scrollLeft / step))));
  }, [items.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    setIndex(0);
    el.addEventListener('scroll', syncIndex, { passive: true });
    return () => el.removeEventListener('scroll', syncIndex);
  }, [syncIndex]);

  const scrollTo = (next: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>('[data-lifehack-card]');
    const card = cards[Math.max(0, Math.min(items.length - 1, next))];
    card?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  if (!pack) return null;

  const heading = cityName
    ? `Лайфхаки ${poCityDative(cityName)}: как сберечь бюджет`
    : 'Лайфхаки: как сберечь бюджет';
  const cardShell = editorial
    ? `${CARD_WIDTH} border-zinc-200 shadow-sm`
    : `${CARD_WIDTH} border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]`;
  const arrowClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50';

  return (
    <section
      id="lifehacks"
      className={`scroll-mt-[calc(var(--site-header-height)+3.25rem)] ${className}`.trim()}
      data-city-lifehacks
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          className={
            editorial
              ? 'font-serif text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl'
              : 'text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]'
          }
        >
          {heading}
        </h2>
        {items.length > 1 ? (
          <div className="flex shrink-0 gap-2 pt-0.5">
            <button
              type="button"
              aria-label="Предыдущий лайфхак"
              onClick={() => scrollTo(index - 1)}
              className={arrowClass}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Следующий лайфхак"
              onClick={() => scrollTo(index + 1)}
              className={arrowClass}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      <div
        ref={scrollerRef}
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0"
        aria-label={heading}
      >
        {items.map((item, cardIndex) => {
          const Icon = ICONS[item.icon] || Footprints;
          return (
            <article key={item.id} data-lifehack-card={item.id} className={cardShell}>
              <div className="flex h-full flex-col p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      editorial ? 'bg-zinc-100 text-zinc-800' : 'bg-slate-100 text-slate-800'
                    }`}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`text-base font-bold leading-snug ${
                        editorial ? 'text-zinc-950' : 'text-slate-950'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <LifehackBody item={item} editorial={editorial} />
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
      </div>
    </section>
  );
}

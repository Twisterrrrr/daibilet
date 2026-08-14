'use client';

import { Bus, ExternalLink, Footprints, Plane, Route, UtensilsCrossed } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  focusFromLifehackCta,
  resolveCityLifehacks,
  type CityLifehackIcon,
  type CityLifehackItem,
  type CityLifehackTabId,
} from '@/lib/city-hub-lifehacks';
import type { CityPlaceFocus } from '@/lib/city-hub-local-flavor';

type Props = {
  citySlug: string;
  editorial?: boolean;
  onPlaceFocus: (focus: CityPlaceFocus) => void;
  onAffiche: () => void;
};

const ICONS: Record<CityLifehackIcon, typeof Footprints> = {
  walk: Footprints,
  transit: Bus,
  fly: Plane,
  food: UtensilsCrossed,
  loop: Route,
};

function LifehackBody({ item, editorial }: { item: CityLifehackItem; editorial: boolean }) {
  return (
    <p className={`mt-1.5 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
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
  const chipClass = `mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
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
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
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
  editorial = false,
  onPlaceFocus,
  onAffiche,
}: Props) {
  const pack = resolveCityLifehacks(citySlug);
  const [tab, setTab] = useState<CityLifehackTabId>(pack?.tabs[0]?.id || 'walk');

  const activeItems = useMemo(() => {
    if (!pack) return [];
    const current = pack.tabs.some((item) => item.id === tab) ? tab : pack.tabs[0]?.id;
    return pack.items.filter((item) => item.tabId === current);
  }, [pack, tab]);

  if (!pack) return null;

  return (
    <div id="lifehacks" className="mt-6" data-city-lifehacks>
      <div
        className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [scrollbar-width:thin]"
        data-city-lifehacks-tabs
      >
        <div
          className="flex w-max flex-nowrap items-center gap-2"
          role="tablist"
          aria-label="Лайфхаки"
        >
          {pack.tabs.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? editorial
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-slate-900 bg-slate-900 text-white'
                    : editorial
                      ? 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div
        className={`mt-4 grid gap-3 ${activeItems.length > 1 ? 'sm:grid-cols-2' : ''}`}
        role="tabpanel"
      >
        {activeItems.map((item, index) => {
          const Icon = ICONS[item.icon] || Footprints;
          return (
            <article
              key={item.id}
              className={`rounded-2xl bg-white p-4 ring-1 ${
                editorial ? 'ring-zinc-200' : 'ring-slate-200/80'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    editorial ? 'bg-zinc-100 text-zinc-800' : 'bg-slate-100 text-slate-800'
                  }`}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className={`text-base font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
                    {item.title}
                  </h3>
                  <LifehackBody item={item} editorial={editorial} />
                  <CtaControl
                    item={item}
                    primary={index === 0}
                    editorial={editorial}
                    onPlaceFocus={onPlaceFocus}
                    onAffiche={onAffiche}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

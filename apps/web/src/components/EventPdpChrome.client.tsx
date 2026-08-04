'use client';

import * as React from 'react';
import { ChevronDown, MapPin, Star } from 'lucide-react';

import { MobileStickyActionBar } from '@/components/MobileStickyActionBar';
import { OsmMapEmbed } from '@/components/OsmMapEmbed';
import { buildYandexMapsExternalUrl } from '@/components/YandexMapEmbed';
import { scrollToBuyCard } from '@/lib/event-page-utils';

/** Mobile sticky: primary «Выбрать билеты» + от X ₽. Hidden lg+. */
export function EventStickyBuyBar({
  priceLabel,
  disabled = false,
}: {
  priceLabel: string;
  disabled?: boolean;
}) {
  const trimmed = priceLabel.trim();
  return (
    <MobileStickyActionBar>
      <div className="min-w-0 shrink-0">
        {trimmed ? (
          <>
            <p className="text-[10px] font-medium uppercase tracking-wider text-graphite-muted">от</p>
            <p className="text-lg font-extrabold leading-tight text-graphite">{trimmed.replace(/^от\s+/i, '')}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-graphite-muted">Цена в виджете</p>
        )}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={scrollToBuyCard}
        className="btn-primary inline-flex min-h-[48px] flex-1 items-center justify-center px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[52px]"
      >
        Выбрать билеты
      </button>
    </MobileStickyActionBar>
  );
}

export function EventExpandableMap({
  lat,
  lng,
  title,
  address,
}: {
  lat: number;
  lng: number;
  title: string;
  address?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const mapsUrl = buildYandexMapsExternalUrl({
    latitude: lat,
    longitude: lng,
    address: address || title,
  });

  return (
    <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-surface-muted"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-start gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" strokeWidth={1.75} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-graphite">Карта</span>
            {address ? (
              <span className="mt-0.5 block text-xs leading-relaxed text-graphite-muted">{address}</span>
            ) : (
              <span className="mt-0.5 block text-xs text-graphite-muted">Нажмите, чтобы открыть</span>
            )}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-graphite-muted transition ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
        />
      </button>
      {open ? (
        <div className="border-t border-slate-100">
          <OsmMapEmbed lat={lat} lng={lng} title={`Карта: ${title}`} className="h-56 w-full sm:h-72" />
          {mapsUrl ? (
            <div className="flex justify-end border-t border-slate-100 px-3 py-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-primary-700 hover:text-primary-800"
              >
                Открыть в Яндекс.Картах
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type AccordionPanel = {
  id: string;
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
};

/** Scan-friendly sections: only panels with real content. */
export function EventContentAccordion({ panels }: { panels: AccordionPanel[] }) {
  const visible = panels.filter((panel) => panel.content != null);
  const [openId, setOpenId] = React.useState<string | null>(
    () => visible.find((panel) => panel.defaultOpen)?.id ?? visible[0]?.id ?? null,
  );

  if (!visible.length) return null;

  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
      {visible.map((panel) => {
        const open = openId === panel.id;
        return (
          <div key={panel.id} id={panel.id === 'reviews' ? undefined : panel.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : panel.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
              aria-expanded={open}
            >
              <span className="text-base font-semibold text-graphite">{panel.title}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-graphite-muted transition ${open ? 'rotate-180' : ''}`}
                strokeWidth={1.75}
              />
            </button>
            {open ? <div className="px-4 pb-5 sm:px-5">{panel.content}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export function EventRatingBadge({
  ratingValue,
  reviewCount,
}: {
  ratingValue: number;
  reviewCount: number;
}) {
  if (!(ratingValue > 0) || !(reviewCount > 0)) return null;
  return (
    <a
      href="#reviews"
      className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
    >
      <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
      {ratingValue.toFixed(1)}
      <span className="font-normal text-white/75">({reviewCount})</span>
    </a>
  );
}

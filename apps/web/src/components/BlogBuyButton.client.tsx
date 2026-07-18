'use client';

import * as React from 'react';
import Link from 'next/link';

import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';
import { canOpenCatalogPurchase } from '@/lib/event-card-meta';
import type { PublicEventPageDto, PublicSessionDto } from '@daibilet/contracts/public';

export type ParsedBuyBlock = {
  slug: string;
  label: string;
};

const BUY_REGEX = /^\[buy\s+([^\]]+)\]$/i;

export function parseBuyBlock(block: string): ParsedBuyBlock | null {
  const trimmed = block.trim();
  const match = trimmed.match(BUY_REGEX);
  if (!match) return null;

  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRegex.exec(match[1])) !== null) {
    attrs[attrMatch[1]] = attrMatch[2];
  }

  const slug = String(attrs.slug || '').trim();
  if (!slug) return null;

  return {
    slug,
    label: String(attrs.label || 'Купить билет').trim() || 'Купить билет',
  };
}

function eventToSession(payload: PublicEventPageDto): PublicSessionDto | null {
  const event = payload.event;
  if (!event?.id) return null;

  const firstSession = payload.sessions?.[0];
  const purchaseUrl =
    event.purchaseUrl ||
    event.widgetUrl ||
    event.deeplinkUrl ||
    firstSession?.purchaseUrl ||
    firstSession?.widgetUrl ||
    null;

  return {
    id: event.id,
    slug: event.slug,
    sourceSlug: event.sourceSlug,
    title: event.title,
    city: event.city || '',
    cityId: event.cityId,
    citySlug: event.citySlug,
    sourceCitySlug: event.sourceCitySlug,
    destination: event.destination || event.city || '',
    destinationType: (event.destinationType as PublicSessionDto['destinationType']) || 'city',
    venue: event.venue || '',
    venueId: event.venueId,
    venueSlug: event.venueSlug,
    venueKind: event.venueKind || '',
    category: event.category || '',
    subcategories: event.subcategories,
    tags: event.tags || [],
    imageUrl: event.imageUrl,
    priceFrom: event.priceFrom ?? payload.stats?.priceFrom ?? null,
    vacant: event.vacant ?? payload.stats?.vacant ?? null,
    purchaseUrl,
    widgetUrl: event.widgetUrl || purchaseUrl,
    deeplinkUrl: event.deeplinkUrl || null,
    purchaseProvider: event.purchaseProvider || firstSession?.purchaseProvider || null,
    offerSourceCode: event.sourceCode || null,
    purchaseReady: event.purchaseReady ?? firstSession?.purchaseReady,
    widgetProvider: event.widgetProvider,
    widgetPayload: event.widgetPayload,
    upcomingSlots: (payload.sessions || []).map((slot) => ({
      startsAt: slot.startsAt,
      dateLabel: slot.dateLabel,
      timeLabel: slot.timeLabel,
      purchaseUrl: slot.purchaseUrl || purchaseUrl,
      vacant: slot.vacant,
    })),
    startsAt: firstSession?.startsAt || '',
    dateLabel: firstSession?.dateLabel || '',
    timeLabel: firstSession?.timeLabel || '',
    timeBucket: firstSession?.timeBucket || 'day',
  } as unknown as PublicSessionDto;
}

const BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700';

const FALLBACK_CLASS =
  'inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/40 hover:text-primary-700';

export function BlogBuyButton({ slug, label }: ParsedBuyBlock) {
  const href = `/events/${encodeURIComponent(slug)}`;
  const [session, setSession] = React.useState<PublicSessionDto | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'fallback'>('loading');

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch(`/api/public/events/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          if (!cancelled) setStatus('fallback');
          return;
        }
        const payload = (await res.json()) as PublicEventPageDto;
        const mapped = eventToSession(payload);
        if (!mapped || !canOpenCatalogPurchase(mapped)) {
          if (!cancelled) setStatus('fallback');
          return;
        }
        if (!cancelled) {
          setSession(mapped);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('fallback');
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug]);

  return (
    <aside className="my-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {status === 'ready' && session ? (
        <LandingPurchaseButton session={session} label={label} className={BUTTON_CLASS} />
      ) : (
        <Link href={href} className={status === 'loading' ? BUTTON_CLASS : FALLBACK_CLASS}>
          {status === 'loading' ? label : `${label} →`}
        </Link>
      )}
      <Link
        href={href}
        className="text-sm font-medium text-primary-700 underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60"
      >
        Карточка события
      </Link>
      <p className="w-full text-xs text-slate-500">Покупка на сайте партнёра</p>
    </aside>
  );
}

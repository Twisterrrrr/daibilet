'use client';

import Image from 'next/image';
import Link from 'next/link';

import {
  blogAfishaGuideTitle,
} from '@/components/BlogAfishaPromo.client';
import { formatPriceFrom } from '@/lib/format';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import type { BlogFeedPromoKind, BlogFeedPromoLayout } from '@/lib/blog-feed-promo';

const FALLBACK_IMAGE = '/images/blog/blog-hero-promo.jpg';
const FEED_IMAGE_SIZES = '(max-width: 768px) 40vw, 280px';
const OVERLAY_IMAGE_SIZES = '(max-width: 1024px) 100vw, 720px';

type BlogFeedPromoProps = {
  promo: BlogSidebarPromoDto;
  kind: BlogFeedPromoKind;
  layout: BlogFeedPromoLayout;
};

type ResolvedCopy = {
  eyebrow: string;
  cityTag: string;
  title: string;
  excerpt: string;
  href: string;
  cta: string;
  foot: string[];
  imageUrl: string;
};

function resolveCopy(promo: BlogSidebarPromoDto, kind: BlogFeedPromoKind): ResolvedCopy {
  const imageUrl = promo.imageUrl || FALLBACK_IMAGE;
  const price = formatPriceFrom(promo.priceFrom);
  const chip = promo.chips?.[0];
  const eventTitle = String(promo.upcomingTitles?.[0] || '').trim();

  if (kind === 'landing' && chip) {
    return {
      eyebrow: 'Подборка',
      cityTag: promo.cityName,
      title: `${chip.label} в ${promo.cityName}`,
      excerpt: price
        ? `${price} · готовый список без бесконечного скролла.`
        : `Готовый список в ${promo.cityName} без бесконечного скролла.`,
      href: chip.href,
      cta: 'Открыть подборку →',
      foot: [price, promo.weekendCount > 0 ? `${promo.weekendCount} на выходных` : null].filter(
        Boolean,
      ) as string[],
      imageUrl,
    };
  }

  if (kind === 'event' && eventTitle) {
    return {
      eyebrow: 'Событие',
      cityTag: promo.cityName,
      title: eventTitle,
      excerpt: price
        ? `${price} · живая дата в афише ${promo.cityName}.`
        : `Живая дата в афише ${promo.cityName}.`,
      href: promo.href,
      cta: 'К билетам →',
      foot: [price, 'афиша'].filter(Boolean) as string[],
      imageUrl,
    };
  }

  const titles = (promo.upcomingTitles || []).slice(0, 2).filter(Boolean);
  return {
    eyebrow: 'Афиша',
    cityTag: promo.cityName,
    title: blogAfishaGuideTitle(promo.cityName),
    excerpt: titles.length
      ? `${titles.join(' · ')}${promo.weekendCount > 0 ? ` · ещё даты на выходные` : ''}.`
      : price
        ? `${price} · концерты и прогулки без очереди в чатах.`
        : `Живые даты в ${promo.cityName} без очереди в чатах.`,
    href: promo.href,
    cta: 'Смотреть афишу →',
    foot: [
      price,
      promo.weekendCount > 0 ? `${promo.weekendCount} на выходных` : null,
      promo.eventsCount > 0 && !promo.weekendCount ? `${promo.eventsCount} событий` : null,
    ].filter(Boolean) as string[],
    imageUrl,
  };
}

function Tag({ label, tone }: { label: string; tone: 'blue' | 'green' | 'rose' | 'amber' }) {
  const cls =
    tone === 'blue'
      ? 'bg-sky-600 text-white'
      : tone === 'rose'
        ? 'bg-rose-500 text-white'
        : tone === 'amber'
          ? 'bg-amber-100 text-amber-900'
          : 'bg-emerald-100 text-emerald-900';
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

function StripCard({
  copy,
  kind,
  dense,
}: {
  copy: ResolvedCopy;
  kind: BlogFeedPromoKind;
  dense?: boolean;
}) {
  const tone = kind === 'event' ? 'rose' : kind === 'landing' ? 'amber' : 'blue';
  return (
    <Link
      href={copy.href}
      className="group grid min-h-[9.5rem] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md md:grid-cols-[minmax(7.5rem,34%)_1fr]"
      aria-label={copy.title}
    >
      <div className="relative min-h-[8.5rem] bg-slate-900 md:min-h-full">
        <Image
          src={copy.imageUrl}
          alt=""
          fill
          sizes={FEED_IMAGE_SIZES}
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          <Tag label={copy.eyebrow} tone={tone} />
          <Tag label={copy.cityTag} tone="green" />
        </div>
        <h3 className="font-display text-base font-bold leading-snug text-slate-900 sm:text-[1.05rem]">
          {copy.title}
        </h3>
        <p className="text-sm leading-relaxed text-slate-500">{copy.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span className="font-semibold text-sky-600">{copy.cta}</span>
          {dense
            ? copy.foot.map((item) => (
                <span key={item}>{item}</span>
              ))
            : null}
        </div>
      </div>
    </Link>
  );
}

function OverlayCard({ copy, kind }: { copy: ResolvedCopy; kind: BlogFeedPromoKind }) {
  return (
    <Link
      href={copy.href}
      className="group relative flex min-h-[10.5rem] overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm"
      aria-label={copy.title}
    >
      <Image
        src={copy.imageUrl}
        alt=""
        fill
        sizes={OVERLAY_IMAGE_SIZES}
        className="object-cover transition duration-500 group-hover:scale-105"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-slate-950/20"
        aria-hidden
      />
      <div className="relative flex max-w-xl flex-col justify-center gap-2.5 p-5 sm:p-6">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
            {copy.eyebrow}
          </span>
          <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
            {kind === 'event' && copy.foot[0] ? copy.foot[0] : copy.cityTag}
          </span>
        </div>
        <h3 className="font-display text-xl font-bold leading-snug sm:text-[1.35rem]">{copy.title}</h3>
        <p className="text-sm text-white/85">{copy.excerpt}</p>
        <span className="mt-1 inline-flex w-fit rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition group-hover:bg-slate-100">
          {copy.cta}
        </span>
      </div>
    </Link>
  );
}

function SplitCard({ copy }: { copy: ResolvedCopy }) {
  return (
    <Link
      href={copy.href}
      className="group grid min-h-[11rem] overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm md:grid-cols-[1.15fr_0.85fr]"
      aria-label={copy.title}
    >
      <div className="flex flex-col justify-center gap-2.5 bg-gradient-to-br from-slate-900 to-slate-800 p-5 sm:p-6">
        <span className="w-fit rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold">
          {copy.eyebrow}
        </span>
        <h3 className="font-display text-lg font-bold leading-snug sm:text-xl">{copy.title}</h3>
        <p className="text-sm leading-relaxed text-white/75">{copy.excerpt}</p>
        <span className="mt-1 inline-flex w-fit rounded-xl border border-white/35 bg-white/10 px-4 py-2.5 text-sm font-semibold transition group-hover:bg-white/20">
          {copy.cta}
        </span>
      </div>
      <div className="relative min-h-[9rem] md:min-h-full">
        <Image
          src={copy.imageUrl}
          alt=""
          fill
          sizes={FEED_IMAGE_SIZES}
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
    </Link>
  );
}

export function BlogFeedPromo({ promo, kind, layout }: BlogFeedPromoProps) {
  const copy = resolveCopy(promo, kind);

  if (layout === 'overlay') return <OverlayCard copy={copy} kind={kind} />;
  if (layout === 'split') return <SplitCard copy={copy} />;
  if (layout === 'strip-dense') return <StripCard copy={copy} kind={kind} dense />;
  return <StripCard copy={copy} kind={kind} />;
}

import Link from 'next/link';
import { CheckCircle2, ChevronDown, HelpCircle } from 'lucide-react';

import type { LandingContentBlockDto } from '@daibilet/contracts/landing';
import type { PublicLandingDto } from '@daibilet/contracts/public';
import { formatNumber } from '@/lib/format';
import { defaultLandingFaqItems, landingBlockItems, sortLandingBlocks } from '@/lib/landing-blocks';

type LandingStats = {
  events: number;
  sessions: number;
  priceFrom?: number | null;
};

export function LandingContentBlocks({
  blocks,
  landing,
  stats,
}: {
  blocks?: LandingContentBlockDto[] | null;
  landing: PublicLandingDto;
  stats: LandingStats;
}) {
  const sorted = sortLandingBlocks(blocks ?? []).filter((block) => block.type !== 'FAQ');
  if (!sorted.length) return null;

  return (
    <div className="mt-12 border-t border-slate-100 pt-10">
      <div className="grid gap-5">
        {sorted.map((block) => (
          <LandingContentBlock
            key={block.id || `${block.type}:${block.sortOrder}`}
            block={block}
            landing={landing}
            stats={stats}
          />
        ))}
      </div>
    </div>
  );
}

function LandingContentBlock({
  block,
  landing,
  stats,
}: {
  block: LandingContentBlockDto;
  landing: PublicLandingDto;
  stats: LandingStats;
}) {
  if (block.type === 'TRUST_BADGES') return <TrustBadgesBlock block={block} />;
  if (block.type === 'VALUE_PROPS' || block.type === 'HIGHLIGHTS' || block.type === 'INFO_ICONS') {
    return <ValuePropsBlock block={block} />;
  }
  if (block.type === 'CITY_GRID') return <CityGridBlock block={block} />;
  if (block.type === 'CTA_BANNER') return <CtaBlock block={block} landing={landing} stats={stats} />;
  if (block.type === 'STORY' || block.type === 'SEO_TEXT' || block.type === 'RAW_RICH_TEXT') {
    return <StoryBlock block={block} />;
  }
  return <StoryBlock block={block} />;
}

function TrustBadgesBlock({ block }: { block: LandingContentBlockDto }) {
  const items = landingBlockItems(block);
  if (!items.length) return null;

  return (
    <section className="grid gap-3 md:grid-cols-3">
      {items.slice(0, 3).map((item, index) => (
        <div key={`${item.title}:${index}`} className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <CheckCircle2 className="h-4 w-4 text-primary-600" />
            {item.title}
          </div>
          {item.text ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p> : null}
        </div>
      ))}
    </section>
  );
}

function ValuePropsBlock({ block }: { block: LandingContentBlockDto }) {
  const items = landingBlockItems(block);
  return (
    <section className="grid gap-4 rounded-xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <BlockHeader block={block} />
      {items.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {items.slice(0, 6).map((item, index) => (
            <div key={`${item.title}:${index}`} className="rounded-lg bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-950">{item.title}</div>
              {item.text ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CityGridBlock({ block }: { block: LandingContentBlockDto }) {
  const items = landingBlockItems(block);
  if (!items.length) return null;

  return (
    <section className="grid gap-4 rounded-xl bg-slate-950 p-5 text-white shadow-[0_10px_28px_rgba(15,23,42,0.12)]">
      <BlockHeader block={block} tone="dark" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <Link
            key={`${item.title}:${index}`}
            href={`/events?city=${encodeURIComponent(item.title)}`}
            className="rounded-lg bg-white/10 p-4 transition hover:bg-white/15"
          >
            <div className="font-semibold">{item.title}</div>
            <div className="mt-1 text-sm text-white/65">{formatNumber(item.count)} событий</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StoryBlock({ block }: { block: LandingContentBlockDto }) {
  if (!block.title && !block.subtitle && !block.body) return null;

  return (
    <section className="grid gap-3 py-2 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        {block.eyebrow ? <div className="text-xs font-bold uppercase text-primary-700">{block.eyebrow}</div> : null}
        {block.title ? <h2 className="mt-1 text-2xl font-bold text-slate-950">{block.title}</h2> : null}
      </div>
      <div>
        {block.subtitle ? <p className="text-base font-medium leading-7 text-slate-700">{block.subtitle}</p> : null}
        {block.body ? <p className="mt-2 text-sm leading-7 text-slate-600">{block.body}</p> : null}
      </div>
    </section>
  );
}

function CtaBlock({
  block,
  landing,
  stats,
}: {
  block: LandingContentBlockDto;
  landing: PublicLandingDto;
  stats: LandingStats;
}) {
  return (
    <section className="rounded-xl bg-primary-600 p-5 text-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase text-white/70">{block.eyebrow || 'К покупке'}</div>
          <h2 className="mt-1 text-2xl font-bold">{block.title || landing.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
            {block.body ||
              `Доступно ${formatNumber(stats.events)} вариантов. Выберите дату и цену в списке событий ниже.`}
          </p>
        </div>
        <a
          href="#variants"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-primary-600 hover:bg-primary-50"
        >
          Выбрать билет
        </a>
      </div>
    </section>
  );
}

function BlockHeader({
  block,
  fallbackTitle,
  tone = 'light',
}: {
  block: LandingContentBlockDto;
  fallbackTitle?: string;
  tone?: 'light' | 'dark';
}) {
  const muted = tone === 'dark' ? 'text-white/65' : 'text-slate-500';

  return (
    <div>
      {block.eyebrow ? (
        <div className={`text-xs font-bold uppercase ${tone === 'dark' ? 'text-white/60' : 'text-primary-700'}`}>
          {block.eyebrow}
        </div>
      ) : null}
      {block.title || fallbackTitle ? (
        <h2 className={`text-2xl font-bold ${tone === 'dark' ? 'text-white' : 'text-slate-950'}`}>
          {block.title || fallbackTitle}
        </h2>
      ) : null}
      {block.subtitle ? <p className={`mt-2 max-w-3xl text-sm leading-6 ${muted}`}>{block.subtitle}</p> : null}
    </div>
  );
}

export function LandingFaqSection({
  blocks,
  landingTitle,
}: {
  blocks?: LandingContentBlockDto[] | null;
  landingTitle: string;
}) {
  const faqBlock = (blocks ?? []).find((block) => block.type === 'FAQ' && block.isEnabled !== false);
  const items = faqBlock
    ? landingBlockItems(faqBlock).map((item) => ({
        question: item.question || item.title,
        answer: item.answer || item.text,
      }))
    : defaultLandingFaqItems(landingTitle);

  if (!items.length) return null;

  return (
    <section id="faq" className="mt-12 border-t border-slate-100 py-12">
      <h2 className="mb-2 text-center text-2xl font-bold text-slate-900 md:text-3xl">Частые вопросы</h2>
      <p className="mb-10 text-center text-slate-600">
        Ответы на популярные вопросы о {landingTitle.toLowerCase()}
      </p>
      <div className="mx-auto max-w-3xl space-y-2">
        {items.map((item, index) => (
          <details
            key={`${item.question}:${index}`}
            className="group rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
          >
            <summary className="flex cursor-pointer list-none select-none items-center justify-between p-4">
              <span className="flex items-center gap-2 pr-4 text-sm font-medium text-slate-900">
                <HelpCircle className="h-4 w-4 shrink-0 text-primary-600" />
                {item.question}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            {item.answer ? (
              <div className="px-4 pb-4 text-sm leading-relaxed text-slate-600">{item.answer}</div>
            ) : null}
          </details>
        ))}
      </div>
    </section>
  );
}

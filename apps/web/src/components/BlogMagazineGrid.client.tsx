'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { BlogPostCard } from '@/components/BlogPostCard.client';
import type { BlogCardDto } from '@/lib/blog-utils';

type MagazineRow =
  | { kind: 'lead'; post: BlogCardDto }
  | { kind: 'quote'; post: BlogCardDto }
  | { kind: 'trio'; large: BlogCardDto; small: [BlogCardDto, BlogCardDto] }
  | { kind: 'pair'; lead: BlogCardDto; side: BlogCardDto }
  | { kind: 'strip'; posts: [BlogCardDto, BlogCardDto, BlogCardDto] }
  | { kind: 'banner'; post: BlogCardDto }
  | { kind: 'single'; post: BlogCardDto };

/**
 * Index-driven visual anchors (not a flat .map of identical cards):
 * - index 0 → full-bleed lead
 * - every 5th (4, 9, 14…) → quote / no-image accent
 * - remaining → trio / strip / banner rhythm
 */
function buildMagazineRows(posts: BlogCardDto[]): MagazineRow[] {
  const valid = posts.filter((post) => Boolean(post?.slug && post?.title));
  if (!valid.length) return [];

  const rows: MagazineRow[] = [];
  let i = 0;
  let pack = 0;

  rows.push({ kind: 'lead', post: valid[0]! });
  i = 1;

  while (i < valid.length) {
    const post = valid[i]!;

    // Visual anchor: every 5th article in the original feed index (0-based: 4, 9…).
    if (i % 5 === 4) {
      rows.push({ kind: 'quote', post });
      i += 1;
      continue;
    }

    const left = valid.length - i;
    // Keep large cards left-aligned. Mirrored packs (`col-start-2`) leave an empty
    // left gutter beside a tall lead when the side column is short or missing.
    const phase = pack % 3;

    if (phase === 1 && left >= 1 && i % 5 !== 4) {
      rows.push({ kind: 'banner', post });
      i += 1;
      pack += 1;
      continue;
    }

    if (phase === 2 && left >= 3) {
      const a = valid[i]!;
      const b = valid[i + 1]!;
      const c = valid[i + 2]!;
      // Avoid swallowing a quote-index post into a strip.
      if (i % 5 === 4 || (i + 1) % 5 === 4 || (i + 2) % 5 === 4) {
        if (i % 5 === 4) {
          rows.push({ kind: 'quote', post: a });
          i += 1;
          continue;
        }
        rows.push({ kind: 'single', post: a });
        i += 1;
        pack += 1;
        continue;
      }
      rows.push({ kind: 'strip', posts: [a, b, c] });
      i += 3;
      pack += 1;
      continue;
    }

    if (left >= 3) {
      const a = valid[i]!;
      const b = valid[i + 1]!;
      const c = valid[i + 2]!;
      if (i % 5 === 4 || (i + 1) % 5 === 4 || (i + 2) % 5 === 4) {
        if (i % 5 === 4) {
          rows.push({ kind: 'quote', post: a });
          i += 1;
          continue;
        }
        rows.push({ kind: 'banner', post: a });
        i += 1;
        pack += 1;
        continue;
      }
      rows.push({
        kind: 'trio',
        large: a,
        small: [b, c],
      });
      i += 3;
      pack += 1;
      continue;
    }

    if (left === 2) {
      rows.push({
        kind: 'pair',
        lead: valid[i]!,
        side: valid[i + 1]!,
      });
      i += 2;
      pack += 1;
      continue;
    }

    rows.push({ kind: 'single', post });
    i += 1;
    pack += 1;
  }

  return rows;
}

function TrioRow({
  large,
  small,
}: {
  large: BlogCardDto;
  small: [BlogCardDto, BlogCardDto];
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:grid-rows-2 lg:gap-x-6 lg:gap-y-5">
      <div className="lg:col-span-2 lg:row-span-2">
        <BlogPostCard post={large} variant="large" />
      </div>
      <div>
        <BlogPostCard post={small[0]} variant="small" />
      </div>
      <div>
        <BlogPostCard post={small[1]} variant="small" />
      </div>
    </div>
  );
}

function PairRow({
  lead,
  side,
}: {
  lead: BlogCardDto;
  side: BlogCardDto;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-6">
      <div>
        <BlogPostCard post={lead} variant="large" />
      </div>
      <div>
        <BlogPostCard post={side} variant="small" />
      </div>
    </div>
  );
}

function StripRow({ posts }: { posts: [BlogCardDto, BlogCardDto, BlogCardDto] }) {
  return (
    <div className="catalog-card-grid">
      {posts.map((post) => (
        <BlogPostCard key={post.slug} post={post} variant="small" />
      ))}
    </div>
  );
}

function EditorialBreak({ quote }: { quote: string }) {
  return (
    <aside
      aria-label="Редакционная врезка"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-sky-600 to-cyan-700 px-6 py-8 text-white shadow-md transition-all duration-300 hover:shadow-lg sm:px-10 sm:py-10"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 font-serif text-[7rem] leading-none text-white/15 sm:text-[9rem]"
      >
        "
      </span>
      <p className="relative font-serif text-lg font-medium leading-snug tracking-tight sm:text-xl md:text-2xl md:leading-[1.35]">
        {quote}
      </p>
      <p className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
        Редакция Дайбилет
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
      </p>
    </aside>
  );
}

export function BlogMagazineGrid({
  posts,
  /** Inserted after the first magazine block (first 1-3 cards). */
  afterFirstBlock,
  /** Short editorial quote shown after the first block when no afterFirstBlock. */
  editorialQuote,
}: {
  posts: BlogCardDto[];
  afterFirstBlock?: ReactNode;
  editorialQuote?: string | null;
}) {
  const rows = buildMagazineRows(posts);
  const quote = String(editorialQuote || '').trim();
  const breakNode = afterFirstBlock || (quote ? <EditorialBreak quote={quote} /> : null);

  return (
    <div className="flex flex-col gap-12 sm:gap-14 lg:gap-16">
      {rows.map((row, index) => {
        const rowKey =
          row.kind === 'trio'
            ? `trio-${row.large.slug}-${index}`
            : row.kind === 'pair'
              ? `pair-${row.lead.slug}-${index}`
              : row.kind === 'strip'
                ? `strip-${row.posts[0].slug}-${index}`
                : `${row.kind}-${row.post.slug}-${index}`;

        const rowNode =
          row.kind === 'lead' ? (
            <BlogPostCard post={row.post} variant="lead" />
          ) : row.kind === 'quote' ? (
            <BlogPostCard post={row.post} variant="quote" />
          ) : row.kind === 'trio' ? (
            <TrioRow large={row.large} small={row.small} />
          ) : row.kind === 'pair' ? (
            <PairRow lead={row.lead} side={row.side} />
          ) : row.kind === 'strip' ? (
            <StripRow posts={row.posts} />
          ) : row.kind === 'banner' ? (
            <BlogPostCard post={row.post} variant="banner" />
          ) : (
            <div className="max-w-3xl">
              <BlogPostCard post={row.post} variant="large" />
            </div>
          );

        if (index === 0 && breakNode) {
          return (
            <div key={rowKey} className="flex flex-col gap-12 sm:gap-14 lg:gap-16">
              {rowNode}
              {breakNode}
            </div>
          );
        }

        return <div key={rowKey}>{rowNode}</div>;
      })}
    </div>
  );
}

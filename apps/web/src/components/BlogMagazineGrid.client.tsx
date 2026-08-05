'use client';

import type { ReactNode } from 'react';

import { BlogPostCard } from '@/components/BlogPostCard.client';
import type { BlogCardDto } from '@/lib/blog-utils';

type MagazineRow =
  | { kind: 'trio'; mirror: boolean; large: BlogCardDto; small: [BlogCardDto, BlogCardDto] }
  | { kind: 'pair'; lead: BlogCardDto; side: BlogCardDto; mirror: boolean }
  | { kind: 'strip'; posts: [BlogCardDto, BlogCardDto, BlogCardDto] }
  | { kind: 'banner'; post: BlogCardDto }
  | { kind: 'single'; post: BlogCardDto };

function buildMagazineRows(posts: BlogCardDto[]): MagazineRow[] {
  const rows: MagazineRow[] = [];
  let i = 0;
  let cycle = 0;

  while (i < posts.length) {
    const left = posts.length - i;
    const phase = cycle % 3;
    const mirror = Math.floor(cycle / 3) % 2 === 1;

    if (phase === 1 && left >= 1) {
      rows.push({ kind: 'banner', post: posts[i]! });
      i += 1;
      cycle += 1;
      continue;
    }

    if (phase === 2 && left >= 3) {
      rows.push({
        kind: 'strip',
        posts: [posts[i]!, posts[i + 1]!, posts[i + 2]!],
      });
      i += 3;
      cycle += 1;
      continue;
    }

    if (left >= 3) {
      rows.push({
        kind: 'trio',
        mirror,
        large: posts[i]!,
        small: [posts[i + 1]!, posts[i + 2]!],
      });
      i += 3;
      cycle += 1;
      continue;
    }

    if (left === 2) {
      rows.push({
        kind: 'pair',
        lead: posts[i]!,
        side: posts[i + 1]!,
        mirror,
      });
      i += 2;
      cycle += 1;
      continue;
    }

    rows.push({ kind: left === 1 && cycle > 0 ? 'banner' : 'single', post: posts[i]! });
    i += 1;
    cycle += 1;
  }

  return rows;
}

function TrioRow({
  large,
  small,
  mirror,
}: {
  large: BlogCardDto;
  small: [BlogCardDto, BlogCardDto];
  mirror: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:grid-rows-2 lg:gap-x-6 lg:gap-y-5">
      <div
        className={
          mirror
            ? 'lg:col-span-2 lg:col-start-2 lg:row-span-2 lg:row-start-1'
            : 'lg:col-span-2 lg:row-span-2'
        }
      >
        <BlogPostCard post={large} variant="large" />
      </div>
      <div className={mirror ? 'lg:col-start-1 lg:row-start-1' : undefined}>
        <BlogPostCard post={small[0]} variant="small" />
      </div>
      <div className={mirror ? 'lg:col-start-1 lg:row-start-2' : undefined}>
        <BlogPostCard post={small[1]} variant="small" />
      </div>
    </div>
  );
}

function PairRow({
  lead,
  side,
  mirror,
}: {
  lead: BlogCardDto;
  side: BlogCardDto;
  mirror: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
      <div className={mirror ? 'lg:col-span-2 lg:col-start-2' : 'lg:col-span-2'}>
        <BlogPostCard post={lead} variant="large" />
      </div>
      <div className={mirror ? 'lg:col-start-1 lg:row-start-1' : undefined}>
        <BlogPostCard post={side} variant="small" />
      </div>
    </div>
  );
}

function StripRow({ posts }: { posts: [BlogCardDto, BlogCardDto, BlogCardDto] }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {posts.map((post) => (
        <BlogPostCard key={post.slug} post={post} variant="strip" />
      ))}
    </div>
  );
}

function EditorialBreak({ quote }: { quote: string }) {
  return (
    <aside
      aria-label="Редакционная врезка"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-sky-600 to-cyan-700 px-6 py-8 text-white shadow-md sm:px-10 sm:py-10"
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
      <p className="relative mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
        Редакция Дайбилет
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
          row.kind === 'trio' ? (
            <TrioRow large={row.large} small={row.small} mirror={row.mirror} />
          ) : row.kind === 'pair' ? (
            <PairRow lead={row.lead} side={row.side} mirror={row.mirror} />
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

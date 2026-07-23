'use client';

import { BlogPostCard } from '@/components/BlogPostCard.client';
import type { BlogCardDto } from '@/lib/blog-utils';

type MagazineRow =
  | { kind: 'trio'; mirror: boolean; large: BlogCardDto; small: [BlogCardDto, BlogCardDto] }
  | { kind: 'pair'; lead: BlogCardDto; side: BlogCardDto; mirror: boolean }
  | { kind: 'single'; post: BlogCardDto };

function buildMagazineRows(posts: BlogCardDto[]): MagazineRow[] {
  const rows: MagazineRow[] = [];
  let i = 0;
  let block = 0;

  while (i < posts.length) {
    const left = posts.length - i;
    const mirror = block % 2 === 1;

    if (left >= 3) {
      rows.push({
        kind: 'trio',
        mirror,
        large: posts[i]!,
        small: [posts[i + 1]!, posts[i + 2]!],
      });
      i += 3;
      block += 1;
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
      block += 1;
      continue;
    }

    rows.push({ kind: 'single', post: posts[i]! });
    i += 1;
    block += 1;
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

export function BlogMagazineGrid({ posts }: { posts: BlogCardDto[] }) {
  const rows = buildMagazineRows(posts);

  return (
    <div className="flex flex-col gap-12 sm:gap-14 lg:gap-16">
      {rows.map((row, index) => {
        if (row.kind === 'trio') {
          return (
            <TrioRow
              key={`trio-${row.large.slug}-${index}`}
              large={row.large}
              small={row.small}
              mirror={row.mirror}
            />
          );
        }
        if (row.kind === 'pair') {
          return (
            <PairRow
              key={`pair-${row.lead.slug}-${index}`}
              lead={row.lead}
              side={row.side}
              mirror={row.mirror}
            />
          );
        }
        return (
          <div key={`single-${row.post.slug}-${index}`} className="max-w-3xl">
            <BlogPostCard post={row.post} variant="large" />
          </div>
        );
      })}
    </div>
  );
}

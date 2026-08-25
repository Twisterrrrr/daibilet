'use client';

import type { ReactNode } from 'react';

import { BlogPostCard } from '@/components/BlogPostCard.client';
import type { BlogCardDto } from '@/lib/blog-utils';

type BentoBlock = {
  horizontals: [BlogCardDto, BlogCardDto];
  vertical: BlogCardDto;
  mirror: boolean;
};

export type BlogFeedPromoSlot = {
  /** Insert after this 0-based bento block index. */
  afterBlockIndex: number;
  node: ReactNode;
};

/**
 * Magazine bento blocks:
 *   [ horizontal ] [          ]
 *   [ horizontal ] [ vertical ]   ← tall spans both rows
 * then mirrored.
 *
 * Full-bleed `banner` lead is optional: skip when FeaturedHero already owns
 * that surface. Sparse promo slots (city / podborka / event) can sit between
 * blocks without crowding the feed.
 */
export function BlogMagazineGrid({
  posts,
  afterFirstBlock,
  editorialQuote = null,
  leadBanner = false,
  feedPromoSlots = [],
}: {
  posts: BlogCardDto[];
  afterFirstBlock?: ReactNode;
  editorialQuote?: string | null;
  /** One full-width banner at the top of the feed. Default off under FeaturedHero. */
  leadBanner?: boolean;
  /** Sparse promo inserts between bento blocks (max 1–2). */
  feedPromoSlots?: BlogFeedPromoSlot[];
}) {
  const valid = posts.filter((post) => Boolean(post?.slug && post?.title));
  if (!valid.length) return null;

  const lead = leadBanner ? valid[0] : null;
  const rest = leadBanner ? valid.slice(1) : valid;
  const blocks: BentoBlock[] = [];
  const leftovers: BlogCardDto[] = [];

  for (let i = 0; i < rest.length; ) {
    if (i + 2 < rest.length) {
      const mirror = blocks.length % 2 === 1;
      blocks.push({
        horizontals: [rest[i]!, rest[i + 1]!],
        vertical: rest[i + 2]!,
        mirror,
      });
      i += 3;
    } else {
      leftovers.push(rest[i]!);
      i += 1;
    }
  }

  const quote =
    typeof editorialQuote === 'string' && editorialQuote.trim()
      ? editorialQuote.trim()
      : null;

  const promoByBlock = new Map<number, ReactNode>();
  for (const slot of feedPromoSlots) {
    if (slot.afterBlockIndex < 0 || !slot.node) continue;
    if (!promoByBlock.has(slot.afterBlockIndex)) {
      promoByBlock.set(slot.afterBlockIndex, slot.node);
    }
  }

  const firstPromo = promoByBlock.get(0);
  const breakNode =
    firstPromo ??
    afterFirstBlock ??
    (quote ? (
      <blockquote className="blog-bento__quote">
        <p>{quote}</p>
      </blockquote>
    ) : null);

  return (
    <div className="blog-bento" data-blog-bento="2h-1v">
      {lead ? (
        <div className="blog-bento__lead">
          <BlogPostCard post={lead} variant="banner" />
        </div>
      ) : null}

      {blocks.map((block, blockIndex) => {
        const promo =
          blockIndex === 0
            ? null
            : promoByBlock.get(blockIndex);
        return (
          <div key={`${block.horizontals[0].slug}-${block.vertical.slug}-wrap`}>
            <div
              className={`blog-bento-block${block.mirror ? ' blog-bento-block--mirror' : ''}`}
            >
              <div className="blog-bento-block__h1">
                <BlogPostCard post={block.horizontals[0]} variant="strip" />
              </div>
              <div className="blog-bento-block__v">
                <BlogPostCard post={block.vertical} variant="small" />
              </div>
              <div className="blog-bento-block__h2">
                <BlogPostCard post={block.horizontals[1]} variant="strip" />
              </div>
            </div>
            {blockIndex === 0 && breakNode ? (
              <div className="blog-bento__break">{breakNode}</div>
            ) : null}
            {promo ? <div className="blog-bento__promo">{promo}</div> : null}
          </div>
        );
      })}

      {leftovers.length ? (
        <div className="blog-bento__leftovers">
          {leftovers.map((post) => (
            <div key={post.slug} className="blog-bento__leftover">
              <BlogPostCard post={post} variant="strip" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

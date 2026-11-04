'use client';

import type { ReactNode } from 'react';

import { BlogPostCard } from '@/components/BlogPostCard.client';
import type { BlogCardDto } from '@/lib/blog-utils';

type BentoBlock = {
  horizontals: [BlogCardDto, BlogCardDto];
  vertical: { kind: 'post'; post: BlogCardDto } | { kind: 'promo'; node: ReactNode };
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
 * that surface. Sparse promo slots (city / podborka / event) replace the tall
 * tile in an additional block, so commercial content keeps the editorial rhythm.
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
  /** Sparse promo tiles mixed into bento blocks (max 1–2). */
  feedPromoSlots?: BlogFeedPromoSlot[];
}) {
  const valid = posts.filter((post) => Boolean(post?.slug && post?.title));
  if (!valid.length) return null;

  const lead = leadBanner ? valid[0] : null;
  const rest = leadBanner ? valid.slice(1) : valid;
  const blocks: BentoBlock[] = [];
  const leftovers: BlogCardDto[] = [];
  const promoByBlock = new Map<number, ReactNode>();
  for (const slot of feedPromoSlots) {
    if (slot.afterBlockIndex < 0 || !slot.node) continue;
    if (!promoByBlock.has(slot.afterBlockIndex)) {
      promoByBlock.set(slot.afterBlockIndex, slot.node);
    }
  }

  for (let i = 0, articleBlockIndex = 0; i < rest.length; ) {
    if (i + 2 < rest.length) {
      const mirror = blocks.length % 2 === 1;
      blocks.push({
        horizontals: [rest[i]!, rest[i + 1]!],
        vertical: { kind: 'post', post: rest[i + 2]! },
        mirror,
      });
      i += 3;
      const promo = promoByBlock.get(articleBlockIndex);
      if (promo && i + 1 < rest.length) {
        blocks.push({
          horizontals: [rest[i]!, rest[i + 1]!],
          vertical: { kind: 'promo', node: promo },
          mirror: blocks.length % 2 === 1,
        });
        i += 2;
      }
      articleBlockIndex += 1;
    } else {
      leftovers.push(rest[i]!);
      i += 1;
    }
  }

  const quote =
    typeof editorialQuote === 'string' && editorialQuote.trim()
      ? editorialQuote.trim()
      : null;

  const breakNode =
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
        const verticalKey =
          block.vertical.kind === 'post' ? block.vertical.post.slug : `promo-${blockIndex}`;
        return (
          <div key={`${block.horizontals[0].slug}-${verticalKey}-wrap`}>
            <div
              className={`blog-bento-block${block.mirror ? ' blog-bento-block--mirror' : ''}`}
            >
              <div className="blog-bento-block__h1">
                <BlogPostCard post={block.horizontals[0]} variant="strip" />
              </div>
              <div className="blog-bento-block__v">
                {block.vertical.kind === 'post' ? (
                  <BlogPostCard post={block.vertical.post} variant="small" />
                ) : (
                  block.vertical.node
                )}
              </div>
              <div className="blog-bento-block__h2">
                <BlogPostCard post={block.horizontals[1]} variant="strip" />
              </div>
            </div>
            {blockIndex === 0 && breakNode ? (
              <div className="blog-bento__break">{breakNode}</div>
            ) : null}
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

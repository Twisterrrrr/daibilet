'use client';

import type { ReactNode } from 'react';

import { BlogPostCard } from '@/components/BlogPostCard.client';
import type { BlogCardDto } from '@/lib/blog-utils';

function isUfaPost(post: BlogCardDto): boolean {
  const slugs = [post.citySlug, ...(post.citySlugs || [])]
    .map((s) => String(s || '').trim().toLowerCase())
    .filter(Boolean);
  if (slugs.includes('ufa') || slugs.includes('уфа')) return true;
  return /уф[аыуе]/i.test(String(post.city || ''));
}

type BentoBlock = {
  horizontals: [BlogCardDto, BlogCardDto];
  vertical: BlogCardDto;
  mirror: boolean;
};

/**
 * Magazine bento blocks:
 *   [ horizontal ] [          ]
 *   [ horizontal ] [ vertical ]   ← tall spans both rows
 * then mirrored, and so on.
 * Ufa in the vertical slot → text-filled quote card.
 */
export function BlogMagazineGrid({
  posts,
  afterFirstBlock,
  editorialQuote: _editorialQuote,
}: {
  posts: BlogCardDto[];
  afterFirstBlock?: ReactNode;
  editorialQuote?: string | null;
}) {
  const valid = posts.filter((post) => Boolean(post?.slug && post?.title));
  if (!valid.length) return null;

  const [lead, ...rest] = valid;
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

  return (
    <div className="blog-bento" data-blog-bento="2h-1v">
      {lead ? (
        <div className="blog-bento__lead">
          <BlogPostCard post={lead} variant="banner" />
        </div>
      ) : null}

      {afterFirstBlock ? <div className="blog-bento__break">{afterFirstBlock}</div> : null}

      {blocks.map((block) => {
        const tallVariant = isUfaPost(block.vertical) ? 'quote' : 'small';
        return (
          <div
            key={`${block.horizontals[0].slug}-${block.vertical.slug}`}
            className={`blog-bento-block${block.mirror ? ' blog-bento-block--mirror' : ''}`}
          >
            <div className="blog-bento-block__h1">
              <BlogPostCard post={block.horizontals[0]} variant="strip" />
            </div>
            <div className="blog-bento-block__v">
              <BlogPostCard post={block.vertical} variant={tallVariant} />
            </div>
            <div className="blog-bento-block__h2">
              <BlogPostCard post={block.horizontals[1]} variant="strip" />
            </div>
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

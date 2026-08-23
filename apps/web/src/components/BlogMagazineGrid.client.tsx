'use client';

import type { ReactNode } from 'react';

import { BlogPostCard } from '@/components/BlogPostCard.client';
import type { BlogCardDto } from '@/lib/blog-utils';

/**
 * Ultrawide-friendly bento feed: first card is a full-bleed editorial banner
 * (span 2×2). Avoid lead flex-row — it collapses into a tall strip + empty text void.
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

  const [featured, ...rest] = valid;

  return (
    <div className="blog-bento">
      {featured ? (
        <div className="blog-bento__featured">
          <BlogPostCard post={featured} variant="banner" />
        </div>
      ) : null}

      {afterFirstBlock ? <div className="blog-bento__break md:col-span-2 xl:col-span-3">{afterFirstBlock}</div> : null}

      {rest.map((post, index) => {
        const accent = index % 5 === 3;
        return (
          <div key={post.slug} className={accent ? 'blog-bento__accent' : undefined}>
            <BlogPostCard post={post} variant={accent ? 'quote' : 'small'} />
          </div>
        );
      })}
    </div>
  );
}

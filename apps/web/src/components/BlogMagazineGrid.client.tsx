'use client';

import type { ReactNode } from 'react';

import { BlogPostCard } from '@/components/BlogPostCard.client';
import type { BlogCardDto } from '@/lib/blog-utils';

/**
 * Content feed (filters/sidebars aside): 3 columns on xl+.
 * Article is either 1-col or 2-col wide → a row fits exactly two cards (2+1).
 * First post can lead full-width; then pairs alternate wide-left / wide-right.
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
  const pairs: Array<{ wide: BlogCardDto; narrow: BlogCardDto; wideOnRight: boolean }> = [];
  const tail: BlogCardDto[] = [];

  for (let i = 0; i < rest.length; ) {
    if (i + 1 < rest.length) {
      const wideOnRight = pairs.length % 2 === 1;
      const a = rest[i]!;
      const b = rest[i + 1]!;
      pairs.push(
        wideOnRight
          ? { wide: b, narrow: a, wideOnRight: true }
          : { wide: a, narrow: b, wideOnRight: false },
      );
      i += 2;
    } else {
      tail.push(rest[i]!);
      i += 1;
    }
  }

  return (
    <div className="blog-bento" data-blog-bento="2-1">
      {lead ? (
        <div className="blog-bento__span-3">
          <BlogPostCard post={lead} variant="lead" />
        </div>
      ) : null}

      {afterFirstBlock ? <div className="blog-bento__span-3 blog-bento__break">{afterFirstBlock}</div> : null}

      {pairs.map(({ wide, narrow, wideOnRight }) => (
        <div
          key={`${wide.slug}-${narrow.slug}`}
          className={`blog-bento-pair${wideOnRight ? ' blog-bento-pair--rtl' : ''}`}
        >
          <div className="blog-bento__span-2">
            <BlogPostCard post={wide} variant="strip" />
          </div>
          <div className="blog-bento__span-1">
            <BlogPostCard post={narrow} variant="small" />
          </div>
        </div>
      ))}

      {tail.map((post) => (
        <div key={post.slug} className="blog-bento__span-2">
          <BlogPostCard post={post} variant="strip" />
        </div>
      ))}
    </div>
  );
}

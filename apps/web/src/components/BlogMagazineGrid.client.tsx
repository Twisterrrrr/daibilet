'use client';

import type { ReactNode } from 'react';

import { BlogPostCard } from '@/components/BlogPostCard.client';
import type { BlogCardDto } from '@/lib/blog-utils';

/**
 * Flat 3-col bento (puzzle):
 * lead full width → [wide|tall] → [tall|wide] → …
 * Same CSS grid row = equal height; photo fills extra space, no white holes.
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
  const tiles: Array<
    | { kind: 'wide'; post: BlogCardDto; mirror: boolean }
    | { kind: 'tall'; post: BlogCardDto; mirror: boolean }
  > = [];

  for (let i = 0; i < rest.length; ) {
    if (i + 1 < rest.length) {
      const mirror = Math.floor(i / 2) % 2 === 1;
      const a = rest[i]!;
      const b = rest[i + 1]!;
      if (mirror) {
        // [tall | wide]
        tiles.push({ kind: 'tall', post: a, mirror: true });
        tiles.push({ kind: 'wide', post: b, mirror: true });
      } else {
        // [wide | tall]
        tiles.push({ kind: 'wide', post: a, mirror: false });
        tiles.push({ kind: 'tall', post: b, mirror: false });
      }
      i += 2;
    } else {
      tiles.push({ kind: 'wide', post: rest[i]!, mirror: false });
      i += 1;
    }
  }

  return (
    <div className="blog-bento" data-blog-bento="2-1">
      {lead ? (
        <div className="blog-bento__lead">
          <BlogPostCard post={lead} variant="banner" />
        </div>
      ) : null}

      {afterFirstBlock ? <div className="blog-bento__break">{afterFirstBlock}</div> : null}

      {tiles.map((tile) => (
        <div
          key={`${tile.kind}-${tile.post.slug}`}
          className={
            tile.kind === 'wide'
              ? tile.mirror
                ? 'blog-bento__wide blog-bento__wide--end'
                : 'blog-bento__wide'
              : 'blog-bento__tall'
          }
        >
          <BlogPostCard post={tile.post} variant={tile.kind === 'wide' ? 'strip' : 'small'} />
        </div>
      ))}
    </div>
  );
}

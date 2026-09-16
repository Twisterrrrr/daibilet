import type { ReactNode } from 'react';

import { BlogMagazineGrid } from '@/components/BlogMagazineGrid.client';
import type { BlogCardDto } from '@/lib/blog-utils';

export function BlogListingSsrFallback({
  posts,
  featuredSlot,
  editorialQuote,
  sidebarSlot,
}: {
  posts: BlogCardDto[];
  featuredSlot?: ReactNode;
  editorialQuote?: string | null;
  sidebarSlot?: ReactNode;
}) {
  return (
    <div className="blog-layout" data-ssr-blog-list>
      <div className="blog-layout__main min-w-0">
        {featuredSlot}
        <div className={featuredSlot ? 'mt-2 sm:mt-4' : undefined}>
          <BlogMagazineGrid
            posts={posts.slice(0, 12)}
            editorialQuote={editorialQuote}
            leadBanner={false}
          />
        </div>
      </div>
      {sidebarSlot ? <div className="blog-layout__aside">{sidebarSlot}</div> : null}
    </div>
  );
}

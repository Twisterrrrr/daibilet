import Link from 'next/link';
import type { ReactNode } from 'react';

import { BlogMagazineGrid } from '@/components/BlogMagazineGrid.client';
import type { BlogCardDto } from '@/lib/blog-utils';

export function BlogListingSsrFallback({
  posts,
  allPosts,
  featuredSlot,
  editorialQuote,
  sidebarSlot,
}: {
  posts: BlogCardDto[];
  allPosts: BlogCardDto[];
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
          <nav className="mt-8" aria-label="Все статьи блога">
            <h2 className="text-lg font-semibold text-slate-900">Все статьи</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {allPosts.map((post) => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="text-sm text-primary-700 hover:underline">
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      {sidebarSlot ? <div className="blog-layout__aside">{sidebarSlot}</div> : null}
    </div>
  );
}

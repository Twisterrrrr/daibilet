import Link from 'next/link';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import type { BlogCardDto } from '@/lib/blog-utils';

export type BlogSidebarLink = {
  href: string;
  label: string;
  hint?: string;
};

export function BlogRelatedSidebar({
  posts,
  topicLinks = [],
  className = '',
}: {
  posts: BlogCardDto[];
  topicLinks?: BlogSidebarLink[];
  className?: string;
}) {
  if (!posts.length && !topicLinks.length) return null;

  return (
    <aside className={className}>
      {topicLinks.length ? (
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            По теме
          </p>
          <ul className="mt-3 space-y-2">
            {topicLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group block border-b border-slate-200/80 pb-2 transition hover:border-slate-400"
                >
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-primary-700">
                    {link.label}
                  </span>
                  {link.hint ? (
                    <span className="mt-0.5 block text-xs text-slate-500">{link.hint}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {posts.length ? (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Читайте также
          </p>
          <ul className="mt-3 space-y-4">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group flex gap-3">
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden bg-slate-100">
                    <SafeImage
                      src={post.coverImageUrl}
                      alt=""
                      fill
                      sizes={IMAGE_SIZES.blogThumb}
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      fallback={<div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-300" />}
                    />
                  </div>
                  <div className="min-w-0">
                    {post.tag || post.city ? (
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        {[post.tag, post.city].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                    <h3 className="mt-0.5 line-clamp-3 font-display text-sm font-bold leading-snug text-slate-900 group-hover:text-primary-700">
                      {post.title}
                    </h3>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/blog"
            className="mt-5 inline-flex text-sm font-semibold text-primary-600 transition hover:text-primary-700"
          >
            Все статьи →
          </Link>
        </>
      ) : null}
    </aside>
  );
}

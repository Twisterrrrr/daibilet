import Link from 'next/link';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import type { BlogCardDto } from '@/lib/blog-utils';

export function BlogRelatedSidebar({
  posts,
  className = '',
}: {
  posts: BlogCardDto[];
  className?: string;
}) {
  if (!posts.length) return null;

  return (
    <aside className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Читайте также</p>
      <ul className="mt-3 space-y-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <SafeImage
                  src={post.coverImageUrl}
                  alt=""
                  fill
                  sizes={IMAGE_SIZES.blogCard}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  fallback={<div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-300" />}
                />
              </div>
              <div className="p-3">
                {post.tag || post.city ? (
                  <p className="text-[11px] font-medium text-slate-500">
                    {[post.tag, post.city].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                <h3 className="mt-1 line-clamp-3 text-sm font-semibold leading-snug text-slate-900 group-hover:text-primary-700">
                  {post.title}
                </h3>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/blog"
        className="mt-4 inline-flex text-sm font-semibold text-primary-600 transition hover:text-primary-700"
      >
        Все статьи →
      </Link>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';
import { useState } from 'react';

import { BLOG_POSTS } from '@/data/blog-posts';
import type { BlogCardDto } from '@/lib/blog-utils';
import { formatBlogPublishedAt } from '@/lib/blog-utils';
import { resolveBlogCityHref } from '@/lib/blog-article-city';

export function BlogPostCard({ post }: { post: BlogCardDto }) {
  const [imageFailed, setImageFailed] = useState(false);
  const staticPost = BLOG_POSTS.find((item) => item.slug === post.slug);
  const dateLabel = formatBlogPublishedAt(post.publishedAt, staticPost?.date || '');
  const tag = post.tag || staticPost?.tag || 'Гид';
  const cityLink = resolveBlogCityHref(post.city, post.citySlug);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-200">
        {!imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 text-4xl">
            📰
          </div>
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-3">
          <span className="inline-flex rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-slate-900 shadow-sm">
            {tag}
          </span>
          {post.city && cityLink ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur">
              <MapPin className="h-3 w-3" aria-hidden />
              {post.city}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-bold leading-snug text-slate-900 group-hover:text-primary-700">{post.title}</h2>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
        <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
          {dateLabel ? <span>{dateLabel}</span> : null}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readMin} мин
          </span>
        </div>
      </div>
    </Link>
  );
}

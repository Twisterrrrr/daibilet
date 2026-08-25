import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { BlogAfishaPromo } from '@/components/BlogAfishaPromo.client';
import {
  authorLabel,
  blogCityBadgeClassName,
  blogSurfaceMeta,
  blogSurfaceMetaLine,
  blogTagBadgeClassName,
} from '@/lib/blog-meta';
import { resolveBlogListingCta } from '@/lib/blog-listing-links';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import {
  clipBlogFeaturedLead,
  resolveBlogCardDateLabel,
  type BlogCardDto,
} from '@/lib/blog-utils';

/** LCP hero: full width of container-page; ~2/3 + aside on desktop. */
const FEATURED_IMAGE_SIZES = '(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 66vw';
const HOT_THUMB_SIZES = '(max-width: 768px) 112px, 80px';

type BlogFeaturedHeroProps = {
  featured: BlogCardDto;
  hotPosts: BlogCardDto[];
  /** slug → min price (city hub or related CHPU). Kept for callers; not shown in fresh previews. */
  hotMinPrices?: Record<string, number>;
  afishaPromos?: Record<string, BlogSidebarPromoDto>;
  afishaFallbackCityName?: string | null;
  afishaFallbackCitySlug?: string | null;
  /** Magazine layout: hot list + promo move to page sidebar on lg+. */
  hideAsideOnDesktop?: boolean;
};

function freshMetaLine(post: BlogCardDto): string | null {
  const meta = blogSurfaceMetaLine({
    tag: post.tag,
    articleType: post.articleType,
    city: post.city,
    citySlug: post.citySlug,
    citySlugs: post.citySlugs,
  });
  const read = post.readMin ? `${post.readMin} мин` : null;
  const parts = [meta, read].filter(Boolean);
  return parts.length ? parts.join(' · ').toUpperCase() : null;
}

export function BlogFeaturedHero({
  featured,
  hotPosts,
  afishaPromos = {},
  afishaFallbackCityName,
  afishaFallbackCitySlug,
  hideAsideOnDesktop = false,
}: BlogFeaturedHeroProps) {
  const articleHref = `/blog/${featured.slug}`;
  const lead = clipBlogFeaturedLead(featured.slug, featured.excerpt, 3);
  const dateLabel = resolveBlogCardDateLabel(featured);
  const { typeLabel: tag, cityLabel } = blogSurfaceMeta({
    tag: featured.tag,
    articleType: featured.articleType,
    city: featured.city,
    citySlug: featured.citySlug,
    citySlugs: featured.citySlugs,
  });
  const scheduleCta = resolveBlogListingCta({
    slug: featured.slug,
    title: featured.title,
    tag: featured.tag,
    city: featured.city,
    citySlug: featured.citySlug,
  });

  // When hot/promo live in page sidebar, featured must be a single full-width card —
  // keeping the old 1fr|2fr grid leaves an empty column and squashes the hero.
  const sectionClass = hideAsideOnDesktop
    ? 'mb-8 w-full'
    : 'mb-8 grid w-full items-stretch gap-4 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,2fr)] lg:gap-5';
  const articleClass = hideAsideOnDesktop
    ? 'group relative flex min-h-[22rem] overflow-hidden rounded-2xl bg-slate-900 shadow-md md:min-h-[24rem] lg:min-h-[28rem]'
    : 'group order-1 relative flex min-h-[24rem] overflow-hidden rounded-2xl bg-slate-900 shadow-md md:min-h-[22rem] lg:order-2 lg:min-h-full';
  const imageSizes = hideAsideOnDesktop
    ? '(max-width: 1024px) 100vw, 80vw'
    : FEATURED_IMAGE_SIZES;

  return (
    <section aria-label="Главная статья блога" className={sectionClass}>
      <article className={articleClass}>
        <Link
          href={articleHref}
          aria-label={featured.title}
          className="absolute inset-0 block"
        >
          <Image
            src={featured.coverImageUrl}
            alt=""
            fill
            priority
            sizes={imageSizes}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/15"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-transparent to-transparent"
          />
        </Link>

        <div className="relative z-10 mt-auto w-full p-4 sm:p-5 md:p-6 lg:p-7">
          <div className="max-w-3xl rounded-2xl border border-white/20 bg-slate-950/45 p-5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/35 sm:p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/80 md:text-xs">
                Материал недели
              </span>
              {tag ? (
                <span
                  className={`inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 backdrop-blur-sm md:text-[11px] ${blogTagBadgeClassName(tag)}`}
                >
                  {tag}
                </span>
              ) : null}
              {cityLabel ? (
                <span
                  className={`inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 backdrop-blur-sm md:text-[11px] ${blogCityBadgeClassName(featured.citySlug)}`}
                >
                  {cityLabel}
                </span>
              ) : null}
            </div>

            <h2 className="mt-3 font-serif text-[1.75rem] font-semibold leading-[1.12] tracking-tight text-white md:text-3xl lg:text-4xl">
              <Link href={articleHref} className="hover:text-white/90">
                {featured.title}
              </Link>
            </h2>

            {lead ? (
              <p className="mt-3 max-w-2xl break-words text-base leading-relaxed text-white/80 md:text-base md:leading-[1.5]">
                {lead}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/65 md:text-sm">
              {featured.authorName || featured.authorId ? (
                <span className="font-medium text-white/85">
                  {featured.authorName || authorLabel(featured.authorId)}
                </span>
              ) : null}
              {dateLabel ? <time dateTime={featured.publishedAt || undefined}>{dateLabel}</time> : null}
              {featured.readMin ? <span>{featured.readMin} мин</span> : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={articleHref}
                className="group/cta inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition-all duration-300 hover:bg-primary-500 md:px-4 md:py-2.5 md:text-sm"
              >
                Читать
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden />
              </Link>
              {scheduleCta ? (
                <Link
                  href={scheduleCta.href}
                  className="inline-flex items-center justify-center rounded-xl border border-white/35 bg-white/10 px-5 py-3 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:translate-x-0.5 hover:bg-white/20 md:px-4 md:py-2.5 md:text-sm"
                >
                  {scheduleCta.label}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </article>

      {hotPosts.length ? (
        <aside
          aria-label="Свежие материалы"
          className={`order-2 flex h-full flex-col gap-4 lg:order-1${hideAsideOnDesktop ? ' lg:hidden' : ''}`}
        >
          <div className="shrink-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Свежее
            </p>
            <ul className="divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {hotPosts.map((post) => {
                const href = `/blog/${post.slug}`;
                const meta = freshMetaLine(post);

                return (
                  <li key={post.slug}>
                    <div className="flex items-center gap-4 px-4 py-4 transition hover:bg-primary-50/40 md:gap-3 md:px-4 md:py-3">
                      <Link
                        href={href}
                        className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-sky-100 to-primary-100 md:size-20 md:rounded-lg"
                        aria-hidden
                        tabIndex={-1}
                      >
                        <Image
                          src={post.coverImageUrl}
                          alt=""
                          fill
                          sizes={HOT_THUMB_SIZES}
                          className="object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        {meta ? (
                          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 md:mb-1.5 md:text-[10px]">
                            {meta}
                          </p>
                        ) : null}
                        <Link
                          href={href}
                          className="break-words font-display text-base font-bold leading-snug text-slate-900 hover:text-primary-700 md:text-sm"
                        >
                          {post.title}
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <BlogAfishaPromo
            promos={afishaPromos}
            fallbackCityName={afishaFallbackCityName}
            fallbackCitySlug={afishaFallbackCitySlug}
          />
        </aside>
      ) : null}
    </section>
  );
}

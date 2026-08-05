import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Ticket } from 'lucide-react';

import { BlogAfishaPromo } from '@/components/BlogAfishaPromo.client';
import { resolveBlogCityEventsHref, resolveBlogCityHref } from '@/lib/blog-article-city';
import {
  authorLabel,
  blogCityBadgeClassName,
  blogTagBadgeClassName,
  cityFilterLabel,
  normalizeBlogTagLabel,
} from '@/lib/blog-meta';
import { resolveBlogListingCta } from '@/lib/blog-listing-links';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import { cityToPrepositional } from '@/lib/city-declension';
import { formatNumber } from '@/lib/format';
import {
  expandLargeListingCopy,
  resolveBlogCardDateLabel,
  type BlogCardDto,
} from '@/lib/blog-utils';

/** LCP hero: full width of container-page; ~2/3 + aside on desktop. */
const FEATURED_IMAGE_SIZES = '(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 66vw';
const HOT_THUMB_SIZES = '(max-width: 768px) 112px, 80px';

type BlogFeaturedHeroProps = {
  featured: BlogCardDto;
  hotPosts: BlogCardDto[];
  /** slug → min price (city hub or related CHPU). */
  hotMinPrices?: Record<string, number>;
  afishaPromos?: Record<string, BlogSidebarPromoDto>;
  afishaFallbackCityName?: string | null;
  afishaFallbackCitySlug?: string | null;
};

function resolveTicketsLine(post: BlogCardDto, minPrice?: number) {
  if (typeof minPrice !== 'number' || !Number.isFinite(minPrice) || minPrice < 100) {
    return null;
  }
  const cityLabel = cityFilterLabel(post.citySlug, post.city);
  if (!cityLabel || cityLabel === 'Регионы' || cityLabel === 'Несколько городов' || cityLabel === 'Без города') {
    return null;
  }
  const href =
    resolveBlogCityEventsHref(post.city, post.citySlug) ||
    resolveBlogCityHref(post.city, post.citySlug);
  if (!href) return null;

  return {
    href,
    label: `Билеты в ${cityToPrepositional(cityLabel)} от ${formatNumber(minPrice)} ₽`,
  };
}

export function BlogFeaturedHero({
  featured,
  hotPosts,
  hotMinPrices = {},
  afishaPromos = {},
  afishaFallbackCityName,
  afishaFallbackCitySlug,
}: BlogFeaturedHeroProps) {
  const articleHref = `/blog/${featured.slug}`;
  const largeCopy = expandLargeListingCopy(featured.slug, featured.excerpt, 280);
  const lead = largeCopy.primary || String(featured.excerpt || '').trim();
  const dateLabel = resolveBlogCardDateLabel(featured);
  const tag = normalizeBlogTagLabel(featured.tag, featured.articleType);
  const scheduleCta = resolveBlogListingCta({
    slug: featured.slug,
    title: featured.title,
    tag: featured.tag,
    city: featured.city,
    citySlug: featured.citySlug,
  });

  return (
    <section
      aria-label="Главная статья блога"
      className="mb-8 grid w-full items-stretch gap-4 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,2fr)] lg:gap-5"
    >
      <article className="group order-1 relative flex min-h-[24rem] overflow-hidden rounded-2xl bg-slate-900 shadow-md md:min-h-[22rem] lg:order-2 lg:min-h-full">
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
            sizes={FEATURED_IMAGE_SIZES}
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

        <div className="relative z-10 mt-auto flex w-full flex-col gap-4 p-7 md:gap-4 md:p-7 lg:p-8">
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
          </div>

          <h2 className="font-serif text-[1.75rem] font-semibold leading-[1.12] tracking-tight text-white md:text-3xl lg:text-4xl">
            <Link href={articleHref} className="hover:text-white/90">
              {featured.title}
            </Link>
          </h2>

          {lead ? (
            <p className="max-w-2xl line-clamp-3 text-base leading-relaxed text-white/80 md:line-clamp-2 md:text-base md:leading-[1.5]">
              {lead}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/65 md:text-sm">
            {featured.authorName || featured.authorId ? (
              <span className="font-medium text-white/85">
                {featured.authorName || authorLabel(featured.authorId)}
              </span>
            ) : null}
            {dateLabel ? <time dateTime={featured.publishedAt || undefined}>{dateLabel}</time> : null}
            {featured.readMin ? <span>{featured.readMin} мин</span> : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
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
      </article>

      {hotPosts.length ? (
        <aside
          aria-label="Свежие материалы"
          className="order-2 flex h-full flex-col gap-4 lg:order-1"
        >
          <div className="shrink-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Свежее
            </p>
            <ul className="divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {hotPosts.map((post) => {
                const href = `/blog/${post.slug}`;
                const cityLabel = cityFilterLabel(post.citySlug, post.city);
                const showCity =
                  Boolean(post.citySlug || post.city) && cityLabel !== 'Без города';
                const tickets = resolveTicketsLine(post, hotMinPrices[post.slug]);

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
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 md:gap-1">
                        {showCity ? (
                          <span
                            className={`inline-flex w-fit max-w-full truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 md:text-[10px] ${blogCityBadgeClassName(post.citySlug)}`}
                          >
                            {cityLabel === 'Санкт-Петербург' ? 'Питер' : cityLabel}
                          </span>
                        ) : null}
                        <Link
                          href={href}
                          className="line-clamp-2 font-display text-base font-bold leading-snug text-slate-900 hover:text-primary-700 md:text-sm"
                        >
                          {post.title}
                        </Link>
                        {tickets ? (
                          <Link
                            href={tickets.href}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800 md:text-[11px]"
                          >
                            <Ticket className="h-3.5 w-3.5 shrink-0 md:h-3 md:w-3" aria-hidden />
                            <span className="line-clamp-1">{tickets.label}</span>
                          </Link>
                        ) : null}
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

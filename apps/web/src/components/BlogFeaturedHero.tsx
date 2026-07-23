import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Ticket } from 'lucide-react';

import { resolveBlogCityEventsHref, resolveBlogCityHref } from '@/lib/blog-article-city';
import {
  authorLabel,
  blogAuthorNameClassName,
  blogCityBadgeClassName,
  cityFilterLabel,
} from '@/lib/blog-meta';
import { resolveBlogListingCta } from '@/lib/blog-listing-links';
import { cityToPrepositional } from '@/lib/city-declension';
import { formatNumber } from '@/lib/format';
import {
  expandListingExcerpt,
  resolveBlogCardDateLabel,
  type BlogCardDto,
} from '@/lib/blog-utils';

/** LCP hero: full width of container-page; ~2/3 + aside on desktop. */
const FEATURED_IMAGE_SIZES = '(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 42vw';
const SIDEBAR_PROMO_IMAGE = '/images/blog/blog-hero-promo.jpg';
const SIDEBAR_PROMO_SIZES = '(max-width: 1024px) 100vw, 22vw';
const HOT_THUMB_SIZES = '80px';

type BlogFeaturedHeroProps = {
  featured: BlogCardDto;
  hotPosts: BlogCardDto[];
  /** slug → min price (city hub or related CHPU). */
  hotMinPrices?: Record<string, number>;
};

function resolveSidebarPromo(featured: BlogCardDto): { href: string; label: string; kicker: string } {
  const cityLabel = cityFilterLabel(featured.citySlug, featured.city);
  const eventsHref = resolveBlogCityEventsHref(featured.city, featured.citySlug);
  const hubHref = resolveBlogCityHref(featured.city, featured.citySlug);

  if (eventsHref && cityLabel && cityLabel !== 'Регионы' && cityLabel !== 'Несколько городов') {
    return {
      href: eventsHref,
      label: `Афиша: ${cityLabel}`,
      kicker: 'События города',
    };
  }

  if (hubHref && cityLabel && cityLabel !== 'Регионы' && cityLabel !== 'Несколько городов') {
    return {
      href: hubHref,
      label: `Афиша: ${cityLabel}`,
      kicker: 'Город',
    };
  }

  return {
    href: '/podborki',
    label: 'Смотреть все гайды',
    kicker: 'Подборки',
  };
}

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
}: BlogFeaturedHeroProps) {
  const articleHref = `/blog/${featured.slug}`;
  const lead = expandListingExcerpt(featured.slug, featured.excerpt, 280);
  const dateLabel = resolveBlogCardDateLabel(featured);
  const scheduleCta = resolveBlogListingCta({
    slug: featured.slug,
    title: featured.title,
    tag: featured.tag,
    city: featured.city,
    citySlug: featured.citySlug,
  });
  const sidebarPromo = resolveSidebarPromo(featured);

  return (
    <section
      aria-label="Главная статья блога"
      className="mb-8 grid w-full items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] lg:gap-5"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Link
          href={articleHref}
          aria-label={featured.title}
          className="relative block aspect-[16/9] overflow-hidden bg-slate-200 sm:aspect-[2/1]"
        >
          <Image
            src={featured.coverImageUrl}
            alt=""
            fill
            priority
            sizes={FEATURED_IMAGE_SIZES}
            className="object-cover"
          />
        </Link>
        <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
          {featured.tag ? (
            <span className="text-xs font-semibold uppercase tracking-wide text-primary-600">
              {featured.tag}
            </span>
          ) : null}
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            <Link href={articleHref} className="hover:text-primary-700">
              {featured.title}
            </Link>
          </h2>
          {lead ? <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{lead}</p> : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 sm:text-sm">
            {featured.authorName || featured.authorId ? (
              <span className={blogAuthorNameClassName(featured.articleType)}>
                {featured.authorName || authorLabel(featured.authorId)}
              </span>
            ) : null}
            {dateLabel ? <time dateTime={featured.publishedAt || undefined}>{dateLabel}</time> : null}
          </div>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Link
              href={articleHref}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Читать
            </Link>
            {scheduleCta ? (
              <Link
                href={scheduleCta.href}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:bg-primary-50/60 hover:text-primary-800"
              >
                {scheduleCta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </article>

      {hotPosts.length ? (
        <aside aria-label="Свежие материалы" className="flex h-full flex-col gap-4">
          <div className="shrink-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Свежее
            </p>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {hotPosts.map((post) => {
                const href = `/blog/${post.slug}`;
                const cityLabel = cityFilterLabel(post.citySlug, post.city);
                const showCity =
                  Boolean(post.citySlug || post.city) && cityLabel !== 'Без города';
                const tickets = resolveTicketsLine(post, hotMinPrices[post.slug]);

                return (
                  <li key={post.slug}>
                    <div className="flex items-center gap-3 px-3 py-3 transition hover:bg-slate-50 sm:px-4">
                      <Link
                        href={href}
                        className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-slate-200"
                        aria-hidden
                        tabIndex={-1}
                      >
                        <Image
                          src={post.coverImageUrl}
                          alt=""
                          fill
                          sizes={HOT_THUMB_SIZES}
                          className="object-cover"
                        />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                        {showCity ? (
                          <span
                            className={`inline-flex w-fit max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${blogCityBadgeClassName(post.citySlug)}`}
                          >
                            {cityLabel === 'Санкт-Петербург' ? 'Питер' : cityLabel}
                          </span>
                        ) : null}
                        <Link
                          href={href}
                          className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 hover:text-primary-700"
                        >
                          {post.title}
                        </Link>
                        {tickets ? (
                          <Link
                            href={tickets.href}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-700 hover:text-primary-800"
                          >
                            <Ticket className="h-3 w-3 shrink-0" aria-hidden />
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

          <Link
            href={sidebarPromo.href}
            className="group relative mt-auto flex min-h-[9.5rem] flex-1 overflow-hidden rounded-2xl bg-slate-900 text-white"
          >
            <Image
              src={SIDEBAR_PROMO_IMAGE}
              alt=""
              fill
              sizes={SIDEBAR_PROMO_SIZES}
              className="object-cover opacity-80 transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            <div className="relative mt-auto flex w-full items-end justify-between gap-3 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
                  {sidebarPromo.kicker}
                </p>
                <p className="mt-1 font-display text-lg font-bold leading-snug sm:text-xl">
                  {sidebarPromo.label}
                </p>
              </div>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-white/25">
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </Link>
        </aside>
      ) : null}
    </section>
  );
}

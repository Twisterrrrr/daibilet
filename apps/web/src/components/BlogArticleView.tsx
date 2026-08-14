import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { BlogArticleHero } from '@/components/BlogArticleHero';
import { BlogArticleContent } from '@/components/BlogArticleContent';
import { parseCtaBlock } from '@/components/BlogArticleCta';
import { BlogReadingProgress } from '@/components/BlogReadingProgress.client';
import { BlogRelatedSidebar, type BlogSidebarLink } from '@/components/BlogRelatedSidebar';
import { SiteLayout } from '@/components/SiteLayout';
import { BLOG_POSTS } from '@/data/blog-posts';
import {
  resolveBlogCityEventsHref,
  resolveBlogCityHref,
} from '@/lib/blog-article-city';
import {
  COLUMN_BADGE_LABEL,
  columnAuthorSignature,
  isBroadBlogCitySlug,
  isColumnArticle,
  normalizeBlogTagLabel,
  stripColumnBodyChrome,
} from '@/lib/blog-meta';
import type { BlogArticleDto, BlogCardDto } from '@/lib/blog-utils';
import { estimateReadMin, formatBlogPublishedAt } from '@/lib/blog-utils';

function buildTopicLinks(article: BlogArticleDto): BlogSidebarLink[] {
  const links: BlogSidebarLink[] = [];
  const cityHref = resolveBlogCityHref(article.city, article.citySlug);
  const eventsHref = resolveBlogCityEventsHref(article.city, article.citySlug);

  if (cityHref && article.city) {
    links.push({
      href: cityHref,
      label: `Афиша ${article.city}`,
      hint: 'Городской хаб и подборки',
    });
  }
  if (eventsHref && article.city) {
    links.push({
      href: eventsHref,
      label: 'События на выходные',
      hint: `Ближайшие даты в ${article.city}`,
    });
  }
  if (article.citySlug && !isBroadBlogCitySlug(article.citySlug)) {
    links.push({
      href: `/blog?city=${encodeURIComponent(article.citySlug)}`,
      label: 'Ещё материалы по городу',
      hint: 'Фильтр блога',
    });
  }
  links.push({
    href: '/podborki',
    label: 'Подборки Дайбилет',
    hint: 'Готовые списки событий',
  });

  const content = String(article.content || '');
  for (const line of content.split('\n')) {
    const cta = parseCtaBlock(line.trim());
    if (cta?.href) {
      links.unshift({
        href: cta.href,
        label: cta.button || cta.title,
        hint: cta.title,
      });
      break;
    }
  }

  // Deduplicate by href
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

function resolveArticleTag(article: BlogArticleDto): string | null {
  const staticPost = BLOG_POSTS.find((post) => post.slug === article.slug);
  if (isColumnArticle(article.articleType) || staticPost?.tag === 'Колонка' || staticPost?.tag === COLUMN_BADGE_LABEL) {
    return COLUMN_BADGE_LABEL;
  }
  if (staticPost?.tag) return normalizeBlogTagLabel(staticPost.tag, article.articleType);
  if (article.articleType === 'obzor') return 'Обзор';
  if (article.articleType === 'digest') return 'Дайджест';
  if (article.city) return 'Город';
  return 'Гид';
}

export function BlogArticleView({
  article,
  related = [],
}: {
  article: BlogArticleDto;
  related?: BlogCardDto[];
}) {
  const readMin = estimateReadMin(article.content);
  const publishedLabel = formatBlogPublishedAt(
    article.publishedAt,
    BLOG_POSTS.find((post) => post.slug === article.slug)?.date || '',
  );
  const cityLink = resolveBlogCityHref(article.city, article.citySlug);
  const eventsLink = resolveBlogCityEventsHref(article.city, article.citySlug);
  const topicLinks = buildTopicLinks(article);
  const tag = resolveArticleTag(article);
  const isColumn = isColumnArticle(article.articleType) || tag === COLUMN_BADGE_LABEL;
  const authorSign = isColumn ? columnAuthorSignature(article.authorName) : null;
  const bodyContent = isColumn
    ? stripColumnBodyChrome(article.content || article.excerpt || '')
    : article.content || article.excerpt || '';
  const breadcrumbs = [
    { label: 'Главная', href: '/' },
    { label: 'Блог', href: '/blog' },
  ];

  return (
    <SiteLayout>
      <div className="bg-slate-50 text-slate-900">
        <BlogReadingProgress />
        <BlogArticleHero
          breadcrumbs={breadcrumbs}
          title={article.title}
          coverImageUrl={article.coverImageUrl}
          publishedLabel={publishedLabel}
          readMin={readMin}
          city={article.city}
          cityHref={cityLink}
          tag={tag}
          authorName={article.authorName}
          articleType={article.articleType}
        />

        {/* div, not nested <main>: SiteLayout already wraps children in <main> */}
        <div className="container-page relative z-10 py-10 sm:py-14">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_16.5rem] lg:items-start lg:gap-12 xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-14">
            <article className="min-w-0 bg-white px-5 py-8 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:px-9 sm:py-11 md:px-12 md:py-12">
              <BlogArticleContent
                content={bodyContent}
                coverImageUrl={article.coverImageUrl}
              />
              {authorSign ? (
                <p className="mt-10 border-t border-slate-200/80 pt-6 text-sm italic leading-relaxed text-slate-600">
                  {authorSign}
                </p>
              ) : null}
            </article>

            <BlogRelatedSidebar
              posts={related}
              topicLinks={topicLinks}
              className="mt-12 lg:sticky lg:top-24 lg:mt-0"
            />
          </div>

          {(cityLink || eventsLink || related.length > 0) && (
            <section className="mt-14 border-t border-slate-300/70 pt-10">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950">
                Дальше по теме
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Афиша и материалы рядом с этим лонгридом - без виджетов внутри текста.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {eventsLink ? (
                  <Link
                    href={eventsLink}
                    className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Топ на выходные
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
                {cityLink && article.city ? (
                  <Link
                    href={cityLink}
                    className="inline-flex items-center gap-2 border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
                  >
                    Хаб {article.city}
                  </Link>
                ) : null}
                <Link
                  href="/podborki"
                  className="inline-flex items-center gap-2 border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
                >
                  Подборки
                </Link>
              </div>

              {related.length ? (
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {related.slice(0, 3).map((post) => (
                    <li key={`strip-${post.slug}`}>
                      <Link href={`/blog/${post.slug}`} className="group block">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {[
                            normalizeBlogTagLabel(post.tag, post.articleType) === COLUMN_BADGE_LABEL
                              ? COLUMN_BADGE_LABEL
                              : normalizeBlogTagLabel(post.tag, post.articleType),
                            post.city,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'Блог'}
                        </p>
                        <h3 className="mt-1 font-display text-base font-bold leading-snug text-slate-900 group-hover:text-primary-700">
                          {post.title}
                        </h3>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          )}

          <footer className="mt-10 flex flex-col gap-4 border-t border-slate-300/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 transition hover:text-primary-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Все статьи блога
            </Link>
            {cityLink && article.city ? (
              <Link href={cityLink} className="text-sm text-slate-500 transition hover:text-slate-800">
                Афиша {article.city} →
              </Link>
            ) : null}
          </footer>
        </div>
      </div>
    </SiteLayout>
  );
}

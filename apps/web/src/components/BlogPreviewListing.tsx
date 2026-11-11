import Link from 'next/link';

import {
  BLOG_LISTING_IMAGE_QUALITY,
  BlogCardSafeImage,
  IMAGE_SIZES,
} from '@/components/SafeImage.client';
import { fontUnbounded } from '@/lib/fonts';
import { resolveBlogCardDateLabel, type BlogCardDto } from '@/lib/blog-utils';

function tagLabel(tag: string | null | undefined): string {
  return String(tag || '').trim();
}

/** Превью листинга блога в новом дизайне. Не production - нет фильтров и пагинации. */
export function BlogPreviewListing({ posts }: { posts: BlogCardDto[] }) {
  const [featured, ...rest] = posts;

  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-accent-soft/70 via-white to-white">
        <div className="container-page max-w-5xl py-14 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Журнал</p>
          <h1 className={`${fontUnbounded.className} mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl`}>
            Блог Дайбилет
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-7 text-ink-muted">
            Гиды по городам, маршруты и авторские колонки о событиях и культуре.
          </p>
        </div>
      </section>

      <div className="container-page max-w-5xl py-10 sm:py-14">
        {featured ? (
          <Link
            href={`/blog/${featured.slug}`}
            className="group grid overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:shadow-card-hover lg:grid-cols-2"
          >
            <div className="relative aspect-[16/10] bg-surface-alt lg:aspect-auto lg:min-h-[22rem]">
              <BlogCardSafeImage
                slug={featured.slug}
                coverImageUrl={featured.coverImageUrl}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                quality={BLOG_LISTING_IMAGE_QUALITY}
                priority
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col justify-center gap-3 p-6 sm:p-10">
              {tagLabel(featured.tag) ? (
                <span className="w-fit rounded-full bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                  {tagLabel(featured.tag)}
                </span>
              ) : null}
              <h2
                className={`${fontUnbounded.className} text-2xl font-bold leading-tight tracking-tight text-ink group-hover:text-accent`}
              >
                {featured.title}
              </h2>
              {featured.excerpt ? (
                <p className="line-clamp-3 text-[15px] leading-6 text-ink-muted">{featured.excerpt}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted-2">
                <time dateTime={featured.publishedAt || undefined}>{resolveBlogCardDateLabel(featured)}</time>
                <span>{featured.readMin} мин чтения</span>
              </div>
            </div>
          </Link>
        ) : null}

        {rest.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-alt">
                  <BlogCardSafeImage
                    slug={post.slug}
                    coverImageUrl={post.coverImageUrl}
                    alt=""
                    fill
                    sizes={IMAGE_SIZES.blogCard}
                    quality={BLOG_LISTING_IMAGE_QUALITY}
                    loading="lazy"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  {tagLabel(post.tag) ? (
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                      {tagLabel(post.tag)}
                    </span>
                  ) : null}
                  <h3 className="text-base font-bold leading-snug tracking-tight text-ink group-hover:text-accent">
                    {post.title}
                  </h3>
                  {post.excerpt ? (
                    <p className="line-clamp-2 text-sm leading-relaxed text-ink-muted">{post.excerpt}</p>
                  ) : null}
                  <div className="mt-auto flex items-center gap-x-3 pt-2 text-xs text-ink-muted-2">
                    <time dateTime={post.publishedAt || undefined}>{resolveBlogCardDateLabel(post)}</time>
                    <span>{post.readMin} мин</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
import { BookOpen } from 'lucide-react';

import { PageBreadcrumbBar, type BreadcrumbItem } from '@/components/PageBreadcrumbs';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';

const BLOG_LIST_HERO_IMAGE = '/images/blog/blog-list-hero.jpg';

type BlogListHeroProps = {
  breadcrumbs: BreadcrumbItem[];
  title?: string;
  description?: string;
};

export function BlogListHero({
  breadcrumbs,
  title = 'Гайды, обзоры и советы',
  description = 'Как выбирать события, где сидеть, куда идти с детьми и что послушать в этом сезоне.',
}: BlogListHeroProps) {
  return (
    <>
      <PageBreadcrumbBar items={breadcrumbs} />
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        <div className="relative flex min-h-[min(78vw,26rem)] w-full flex-col justify-end sm:min-h-[22rem] lg:min-h-[28rem]">
          <SafeImage
            src={BLOG_LIST_HERO_IMAGE}
            alt=""
            fill
            priority
            sizes={IMAGE_SIZES.homeHero}
            className="object-cover object-[center_35%] motion-safe:animate-[blog-hero-ken_1.1s_ease-out_both]"
            fallback={<div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-amber-900/40 to-slate-950" />}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/70 to-slate-950/35 sm:via-slate-950/55 sm:to-slate-950/25"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/90 to-transparent"
          />

          <div className="container-page relative py-12 sm:py-14 lg:py-16">
            <div className="max-w-3xl motion-safe:animate-[blog-hero-rise_0.85s_ease-out_0.12s_both]">
              <p className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-amber-200/90 sm:text-xs">
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                Блог Дайбилет
              </p>
              <h1 className="font-serif mt-3 text-[2.15rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
                {title}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/88 sm:text-lg sm:leading-[1.55]">
                {description}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

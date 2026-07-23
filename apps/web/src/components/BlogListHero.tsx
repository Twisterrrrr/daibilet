import { PageBreadcrumbBar, type BreadcrumbItem } from '@/components/PageBreadcrumbs';

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
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container-page py-8 sm:py-10">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{description}</p>
          ) : null}
        </div>
      </section>
    </>
  );
}

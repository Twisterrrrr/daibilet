import { SectionPageHero, type BreadcrumbItem } from '@/components/PageBreadcrumbs';

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
  return <SectionPageHero breadcrumbs={breadcrumbs} title={title} description={description} />;
}

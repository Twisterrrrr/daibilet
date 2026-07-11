import type { Metadata } from 'next';

import { BlogListView } from '@/components/BlogListView';
import '@/lib/env';
import { mergeBlogCards } from '@/lib/blog-utils';
import { buildPublicArticlesListDto } from '@daibilet/backend/public-read';

export const metadata: Metadata = {
  title: 'Блог — гайды и советы о событиях | Дайбилет',
  description:
    'Гайды по концертам, театру и городским прогулкам. Как выбрать билет, куда пойти с детьми, что смотреть на этой неделе.',
};

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  let posts = mergeBlogCards(null);
  try {
    const payload = await buildPublicArticlesListDto();
    posts = mergeBlogCards(payload?.articles);
  } catch {
    // fallback to static posts
  }

  return <BlogListView posts={posts} />;
}

import type { Metadata } from 'next';

import { NextPublicRoute } from '@/NextPublicRoute';
import { resolvePublicMetadata, resolveStructuredData } from '@/server/public-seo';

type RouteParams = {
  path?: string[];
};
type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = {
  params?: Promise<RouteParams>;
  searchParams?: Promise<SearchParams>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const path = await resolvePath(params);
  return resolvePublicMetadata(path);
}

export default async function PublicPage({ params, searchParams }: PageProps) {
  const [path, search] = await Promise.all([resolvePath(params), resolveSearch(searchParams)]);
  const structuredData = await resolveStructuredData(path);
  return (
    <>
      {structuredData.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
      <NextPublicRoute path={path} search={search} />
    </>
  );
}

async function resolvePath(params?: PageProps['params']): Promise<string> {
  const resolved = await params;
  const segments = resolved?.path || [];
  if (!segments.length) return '/';
  return `/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

async function resolveSearch(searchParams?: PageProps['searchParams']): Promise<string> {
  const resolved = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolved || {})) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (typeof value === 'string') {
      params.set(key, value);
    }
  }

  return params.toString();
}

type BlogSeoInput = {
  title: string;
  description: string;
  canonicalPath: string;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  breadcrumbs?: Array<{ name: string; path: string }>;
};

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function setMetaTag(name: string, content: string) {
  const attr = name.startsWith('og:') || name.startsWith('twitter:') ? 'property' : 'name';
  let element = document.querySelector(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function setJsonLd(id: string, payload: Record<string, unknown>) {
  let element = document.getElementById(id) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(payload);
}

/** Client-side SEO для /blog/:slug — title, meta, OG, canonical, JSON-LD. */
export function applyBlogArticleSeo(input: BlogSeoInput): void {
  const canonical = absoluteUrl(input.canonicalPath);
  const image = input.coverImageUrl ? absoluteUrl(input.coverImageUrl) : undefined;

  document.title = input.title.includes('Дайбилет') ? input.title : `${input.title} | Блог Дайбилет`;
  setMetaTag('description', input.description);
  setMetaTag('robots', 'index,follow');
  setLinkTag('canonical', canonical);

  setMetaTag('og:type', 'article');
  setMetaTag('og:title', input.title);
  setMetaTag('og:description', input.description);
  setMetaTag('og:url', canonical);
  if (image) setMetaTag('og:image', image);

  setMetaTag('twitter:card', image ? 'summary_large_image' : 'summary');
  setMetaTag('twitter:title', input.title);
  setMetaTag('twitter:description', input.description);
  if (image) setMetaTag('twitter:image', image);

  if (input.breadcrumbs?.length) {
    setJsonLd('daibilet-blog-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: input.breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
    });
  }

  setJsonLd('daibilet-blog-article', {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    url: canonical,
    mainEntityOfPage: canonical,
    image: image ? [image] : undefined,
    datePublished: input.publishedAt || undefined,
    dateModified: input.updatedAt || input.publishedAt || undefined,
    author: {
      '@type': 'Organization',
      name: 'Дайбилет',
      url: absoluteUrl('/'),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Дайбилет',
      url: absoluteUrl('/'),
    },
  });
}

export function cleanupBlogArticleSeo(): void {
  for (const id of ['daibilet-blog-breadcrumb', 'daibilet-blog-article']) {
    document.getElementById(id)?.remove();
  }
}

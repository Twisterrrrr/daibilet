import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminArticleRow = {
  id: string;
  slug: string;
  status: string;
  title: string;
  excerpt: string;
  coverImageUrl?: string | null;
  city?: string | null;
  citySlug?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  isFeatured?: boolean;
};

export type AdminArticleDetail = AdminArticleRow & {
  content: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
  isIndexable: boolean;
  isFeatured: boolean;
};

export type AdminArticlesListData = {
  rows: AdminArticleRow[];
  errors: string[];
};

function normalizeArticleRow(raw: unknown): AdminArticleRow {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: String(row.id || ''),
    slug: String(row.slug || ''),
    status: String(row.status || 'draft'),
    title: String(row.title || 'Без названия'),
    excerpt: String(row.excerpt || ''),
    coverImageUrl: row.coverImageUrl != null ? String(row.coverImageUrl) : null,
    city: row.city != null ? String(row.city) : null,
    citySlug: row.citySlug != null ? String(row.citySlug) : null,
    authorId: row.authorId != null ? String(row.authorId) : null,
    authorName: row.authorName != null ? String(row.authorName) : null,
    publishedAt: row.publishedAt != null ? String(row.publishedAt) : null,
    updatedAt: row.updatedAt != null ? String(row.updatedAt) : null,
    isFeatured: Boolean(row.isFeatured),
  };
}

function normalizeArticleDetail(raw: unknown): AdminArticleDetail {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const base = normalizeArticleRow(raw);
  return {
    ...base,
    content: String(row.content || ''),
    seoTitle: row.seoTitle != null ? String(row.seoTitle) : null,
    seoDescription: row.seoDescription != null ? String(row.seoDescription) : null,
    canonicalPath: row.canonicalPath != null ? String(row.canonicalPath) : null,
    isIndexable: Boolean(row.isIndexable),
    isFeatured: Boolean(row.isFeatured),
  };
}

export async function loadAdminArticlesList(): Promise<AdminArticlesListData> {
  const errors: string[] = [];
  try {
    const response = await adminApiFetch('/api/admin/articles');
    if (!response.ok) {
      errors.push(`articles HTTP ${response.status}`);
      return { rows: [], errors };
    }
    const payload = (await response.json()) as { rows?: unknown[] };
    return {
      rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeArticleRow) : [],
      errors,
    };
  } catch (error) {
    errors.push(`articles: ${error instanceof Error ? error.message : 'network error'}`);
    return { rows: [], errors };
  }
}

export async function loadAdminArticleDetail(
  id: string,
): Promise<{ article: AdminArticleDetail | null; errors: string[] }> {
  const errors: string[] = [];
  try {
    const response = await adminApiFetch(`/api/admin/articles/${encodeURIComponent(id)}`);
    if (!response.ok) {
      errors.push(`article HTTP ${response.status}`);
      return { article: null, errors };
    }
    const payload = await response.json();
    return { article: normalizeArticleDetail(payload), errors };
  } catch (error) {
    errors.push(`article: ${error instanceof Error ? error.message : 'network error'}`);
    return { article: null, errors };
  }
}

export const ARTICLE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Черновик' },
  { value: 'review', label: 'На проверке' },
  { value: 'published', label: 'Опубликовано' },
  { value: 'hidden', label: 'Архив' },
] as const;

export const ARTICLE_AUTHOR_OPTIONS = [
  { value: 'editorial', label: 'Редакция' },
  { value: 'max', label: 'Макс' },
  { value: 'anna', label: 'Анна' },
  { value: 'elena', label: 'Елена' },
  { value: 'igor', label: 'Игорь' },
  { value: 'artur', label: 'Артур' },
] as const;

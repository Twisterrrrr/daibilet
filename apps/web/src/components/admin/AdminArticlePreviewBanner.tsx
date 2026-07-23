import Link from 'next/link';

import { formatAdminDateTime } from '@/lib/admin-ui';

export function buildArticlePreviewStatusLabel(
  status: string,
  publishedAt?: string | null,
): string {
  const normalized = String(status || 'draft').toLowerCase();
  const at = publishedAt ? new Date(publishedAt) : null;
  const isFuture = Boolean(at && !Number.isNaN(at.getTime()) && at.getTime() > Date.now());

  if (normalized === 'hidden') return 'Архив';
  if (isFuture) return `Запланировано на ${formatAdminDateTime(publishedAt)}`;
  if (normalized === 'published') return 'Опубликовано';
  if (normalized === 'review') return 'На проверке';
  return 'Черновик';
}

type Props = {
  articleId: string;
  status: string;
  publishedAt?: string | null;
  slug: string;
};

export function AdminArticlePreviewBanner({ articleId, status, publishedAt, slug }: Props) {
  const label = buildArticlePreviewStatusLabel(status, publishedAt);

  return (
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 text-amber-950 shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
        <div className="min-w-0">
          <p className="font-semibold">Превью админа - {label}</p>
          <p className="text-xs text-amber-800">
            noindex · только Basic Auth · /blog/{slug} на витрине не показывается, пока статус не
            PUBLISHED
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/articles/${encodeURIComponent(articleId)}`}
            className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100"
          >
            К редактированию
          </Link>
          <Link
            href="/admin/articles"
            className="rounded-md border border-amber-300 bg-amber-100/60 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            К списку
          </Link>
        </div>
      </div>
    </div>
  );
}

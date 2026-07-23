import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  archiveAdminArticleAction,
  saveAdminArticleAction,
} from '@/server/admin-article-actions';
import {
  ARTICLE_AUTHOR_OPTIONS,
  ARTICLE_STATUS_OPTIONS,
  type AdminArticleDetail,
} from '@/server/admin-articles-data';
import { viteAdminHref } from '@/lib/admin-ui';

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Props = {
  mode: 'create' | 'edit';
  article?: AdminArticleDetail | null;
  notice?: string | null;
};

export function AdminArticleEditor({ mode, article, notice }: Props) {
  const isNew = mode === 'create';
  const id = isNew ? 'new' : article?.id || '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/articles" className="hover:underline">
          Блог
        </Link>
        <span>/</span>
        <span className="text-slate-700">{isNew ? 'Новая статья' : article?.slug || id}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isNew ? 'Новая статья' : article?.title || 'Редактирование'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">Базовый CRUD через legacy `/api/admin/articles`.</p>
        </div>
        {!isNew ? (
          <a
            href={viteAdminHref('/articles')}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Vite articles
          </a>
        ) : null}
      </header>

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <form action={saveAdminArticleAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="id" value={id} />

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Заголовок">
            <input
              name="title"
              required
              defaultValue={article?.title || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Slug">
            <input
              name="slug"
              required
              defaultValue={article?.slug || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Статус">
            <select
              name="status"
              defaultValue={article?.status || 'draft'}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {ARTICLE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Автор">
            <select
              name="authorId"
              defaultValue={article?.authorId || 'editorial'}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {ARTICLE_AUTHOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="City slug">
            <input
              name="citySlug"
              defaultValue={article?.citySlug || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Published at">
            <input
              type="datetime-local"
              name="publishedAt"
              defaultValue={toDatetimeLocalValue(article?.publishedAt)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Cover image URL">
            <input
              name="coverImageUrl"
              defaultValue={article?.coverImageUrl || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Canonical path">
            <input
              name="canonicalPath"
              defaultValue={article?.canonicalPath || (article?.slug ? `/blog/${article.slug}` : '')}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Field label="Excerpt">
          <textarea
            name="excerpt"
            rows={3}
            defaultValue={article?.excerpt || ''}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Content">
          <textarea
            name="content"
            rows={14}
            defaultValue={article?.content || ''}
            className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
          />
        </Field>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="SEO title">
            <input
              name="seoTitle"
              defaultValue={article?.seoTitle || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="SEO description">
            <input
              name="seoDescription"
              defaultValue={article?.seoDescription || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="isIndexable"
            defaultChecked={Boolean(article?.isIndexable)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Indexable
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Сохранить
          </button>
          <Link
            href="/admin/articles"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            К списку
          </Link>
        </div>
      </form>

      {!isNew ? (
        <form action={archiveAdminArticleAction} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="title" value={article?.title || ''} />
          <input type="hidden" name="slug" value={article?.slug || ''} />
          <input type="hidden" name="excerpt" value={article?.excerpt || ''} />
          <input type="hidden" name="content" value={article?.content || ''} />
          <input type="hidden" name="coverImageUrl" value={article?.coverImageUrl || ''} />
          <input type="hidden" name="citySlug" value={article?.citySlug || ''} />
          <input type="hidden" name="authorId" value={article?.authorId || 'editorial'} />
          <input type="hidden" name="seoTitle" value={article?.seoTitle || ''} />
          <input type="hidden" name="seoDescription" value={article?.seoDescription || ''} />
          <input type="hidden" name="canonicalPath" value={article?.canonicalPath || ''} />
          <input type="hidden" name="publishedAt" value={toDatetimeLocalValue(article?.publishedAt)} />
          {article?.isIndexable ? <input type="hidden" name="isIndexable" value="true" /> : null}
          <p className="text-sm text-slate-600">
            Архив снимает статью с витрины без hard-delete. Для удаления используйте Vite admin.
          </p>
          <button
            type="submit"
            className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            В архив
          </button>
        </form>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

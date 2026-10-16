import Link from 'next/link';
import type { ReactNode } from 'react';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { PUBLIC_SITE_BASE } from '@/lib/admin-ui';
import { saveAdminCityAction } from '@/server/admin-city-actions';
import { loadAdminCityDetail } from '@/server/admin-cities-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCityDetailPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const rawSearch = await searchParams;
  // `back` comes from the cities list and keeps the operator's filter context.
  const back = first(rawSearch.back) || '';
  const backHref = back.startsWith('/admin/cities') ? back : '/admin/cities';
  const detail = await loadAdminCityDetail(id);
  let notice = first(rawSearch.saved) === '1' ? 'Город сохранён.' : null;
  if (first(rawSearch.error) === 'slug_not_unique') {
    notice = 'Slug уже занят другим городом - выберите другой.';
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href={backHref} className="hover:underline">
          ← Города
        </Link>
        <span>/</span>
        <span className="text-slate-700">{detail.title}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{detail.title}</h2>
          <p className="mt-1 text-sm text-slate-600">Карточка города: название, slug, SEO и intro.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${
                detail.isDestination
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {detail.isDestination ? 'Хаб направления' : 'Обычный город'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {detail.slug ? (
            <a
              href={`${PUBLIC_SITE_BASE.replace(/\/$/, '')}/cities/${encodeURIComponent(detail.slug)}`}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              target="_blank"
              rel="noreferrer"
            >
              Открыть на сайте
            </a>
          ) : null}
        </div>
      </header>

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <AdminApiErrorBanner errors={detail.errors} />

      {detail.found ? (
        <form action={saveAdminCityAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <input type="hidden" name="id" value={detail.id} />
          <input type="hidden" name="back" value={backHref} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Название">
              <input
                name="title"
                required
                defaultValue={detail.title}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Slug">
              <input
                name="slug"
                required
                defaultValue={detail.slug}
                className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
              />
            </Field>
            <Field label="Название в источнике">
              <input
                name="sourceTitle"
                defaultValue={detail.sourceTitle || ''}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Заголовок интро">
              <input
                name="introTitle"
                defaultValue={detail.introTitle || ''}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="SEO H1">
              <input
                name="seoH1"
                defaultValue={detail.seoH1 || ''}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="SEO title">
              <input
                name="seoTitle"
                defaultValue={detail.seoTitle || ''}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Обложка (URL)">
              <input
                name="heroImageUrl"
                defaultValue={detail.heroImageUrl || ''}
                className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
              />
            </Field>
            <Field label="canonicalPath">
              <input
                name="canonicalPath"
                defaultValue={detail.canonicalPath || ''}
                className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
              />
            </Field>
          </div>
          <Field label="Текст интро">
            <textarea
              name="introText"
              rows={4}
              defaultValue={detail.introText || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="SEO description">
            <textarea
              name="seoDescription"
              rows={3}
              defaultValue={detail.seoDescription || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isDestination"
              defaultChecked={detail.isDestination}
              className="h-4 w-4 rounded border-slate-300"
            />
            Хаб направления (destination)
          </label>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Сохранить
          </button>
        </form>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

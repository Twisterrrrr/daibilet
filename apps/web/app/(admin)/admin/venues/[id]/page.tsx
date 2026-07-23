import Link from 'next/link';
import type { ReactNode } from 'react';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { formatAdminNumber, PUBLIC_SITE_BASE, viteAdminHref } from '@/lib/admin-ui';
import { saveAdminVenueAction } from '@/server/admin-venue-actions';
import { loadAdminVenueDetail } from '@/server/admin-venues-data';

export const dynamic = 'force-dynamic';

const KIND_OPTIONS = [
  'VENUE',
  'MUSEUM_ART_SPACE',
  'THEATER',
  'CONCERT_HALL',
  'CLUB_BAR_RESTAURANT',
  'PIER',
  'MEETING_POINT',
  'OUTDOOR_LOCATION',
  'SPORT_ACTIVITY_SPACE',
  'ATTRACTION',
  'ONLINE',
  'OTHER',
];

const PAGE_STATUS_OPTIONS = [
  { value: 'NONE', label: 'Только локация' },
  { value: 'CANDIDATE', label: 'Кандидат' },
  { value: 'PUBLISHED', label: 'Опубликована' },
  { value: 'HIDDEN', label: 'Скрыта' },
];

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminVenueDetailPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const rawSearch = await searchParams;
  const detail = await loadAdminVenueDetail(id);
  const notice = first(rawSearch.saved) === '1' ? 'Площадка сохранена.' : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/venues" className="hover:underline">
          Площадки
        </Link>
        <span>/</span>
        <span className="text-slate-700">{detail.title}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{detail.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {detail.city}
            {detail.address ? ` · ${detail.address}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={viteAdminHref('/venues')}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Vite
          </a>
          {detail.slug ? (
            <a
              href={`${PUBLIC_SITE_BASE.replace(/\/$/, '')}/venues/${encodeURIComponent(detail.slug)}`}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              target="_blank"
              rel="noreferrer"
            >
              Public
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
        <form action={saveAdminVenueAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <input type="hidden" name="id" value={detail.id} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Title">
              <input
                name="title"
                required
                defaultValue={detail.title}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Kind">
              <select
                name="kind"
                defaultValue={detail.kind}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {KIND_OPTIONS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Page status">
              <select
                name="pageStatus"
                defaultValue={detail.pageStatus}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {PAGE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hero image URL">
              <input
                name="heroImageUrl"
                defaultValue={detail.heroImageUrl || ''}
                className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
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
            <Field label="canonicalPath">
              <input
                name="canonicalPath"
                defaultValue={detail.canonicalPath || ''}
                className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
              />
            </Field>
          </div>
          <Field label="Short description">
            <textarea
              name="shortDescription"
              rows={2}
              defaultValue={detail.shortDescription || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              rows={5}
              defaultValue={detail.description || ''}
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
              name="isIndexable"
              defaultChecked={detail.isIndexable}
              className="h-4 w-4 rounded border-slate-300"
            />
            Индексировать
          </label>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Сохранить
          </button>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
          События на площадке (сэмпл)
        </div>
        <ul className="divide-y divide-slate-100 text-sm">
          {detail.events.length === 0 ? (
            <li className="px-4 py-6 text-center text-slate-500">Нет связанных событий.</li>
          ) : (
            detail.events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <Link href={`/admin/events/${encodeURIComponent(event.id)}`} className="text-sky-700 hover:underline">
                  {event.title}
                </Link>
                <span className="text-xs text-slate-500">
                  {event.status}
                  {event.priceFrom != null ? ` · от ${formatAdminNumber(event.priceFrom)} ₽` : ''}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
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

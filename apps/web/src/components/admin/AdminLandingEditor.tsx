import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  saveAdminLandingMatchAction,
  saveAdminLandingSeoAction,
} from '@/server/admin-landing-actions';
import type { AdminLandingDetailData } from '@/server/admin-landings-data';
import { formatAdminNumber, PUBLIC_SITE_BASE, viteAdminHref } from '@/lib/admin-ui';

type Props = {
  detail: AdminLandingDetailData;
  candidates?: {
    query: string;
    rows: Array<{
      id: string;
      title: string;
      city: string;
      venue: string;
      readiness: string;
      manualStatus: string | null;
      isAutoMatch: boolean;
      groupEventIds: string[];
    }>;
    errors: string[];
  };
  notice?: string | null;
};

function matchLabel(status: string | null | undefined) {
  if (status === 'PINNED') return 'закреплено';
  if (status === 'EXCLUDED') return 'скрыто';
  if (status === 'REVIEW') return 'авто';
  return 'авто';
}

export function AdminLandingEditor({ detail, candidates, notice }: Props) {
  const statusValue =
    detail.status.toUpperCase() === 'PUBLISHED'
      ? 'PUBLISHED'
      : detail.status.toUpperCase() === 'HIDDEN'
        ? 'HIDDEN'
        : 'REVIEW';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/landings" className="hover:underline">
          Лендинги
        </Link>
        <span>/</span>
        <span className="text-slate-700">{detail.slug}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{detail.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            SEO + pin/exclude + candidates search. Content blocks - в Vite.
          </p>
          {detail.subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{detail.subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={viteAdminHref('/landings')}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Vite (blocks+)
          </a>
          <a
            href={`${PUBLIC_SITE_BASE.replace(/\/$/, '')}/${encodeURIComponent(detail.slug)}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            target="_blank"
            rel="noreferrer"
          >
            Public
          </a>
        </div>
      </header>

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="В выдаче" value={detail.eventsTotal} />
        <Metric label="Авто" value={detail.metrics.autoEvents} />
        <Metric label="Закреплено" value={detail.metrics.pinnedEvents} />
        <Metric label="Скрыто" value={detail.metrics.excludedEvents} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Поиск кандидатов</h3>
        <p className="mt-1 text-xs text-slate-500">
          Найди событие и закрепи / исключи без Vite.
        </p>
        <form className="mt-3 flex flex-wrap gap-2" method="get">
          <input
            name="cq"
            defaultValue={candidates?.query || ''}
            placeholder="Название / город / venue..."
            className="min-w-[220px] flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Найти
          </button>
        </form>
        {candidates?.errors.length ? (
          <p className="mt-2 text-xs text-amber-800">{candidates.errors.join(' · ')}</p>
        ) : null}
        {candidates?.query ? (
          <div className="mt-3">
            <MatchTable
              slug={detail.slug}
              title={`Кандидаты: «${candidates.query}»`}
              events={candidates.rows}
            />
          </div>
        ) : null}
      </section>

      <form
        action={saveAdminLandingSeoAction}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="slug" value={detail.slug} />
        <h3 className="text-sm font-semibold text-slate-900">SEO / контент лендинга</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title">
            <input
              name="title"
              required
              defaultValue={detail.title}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Статус">
            <select
              name="status"
              defaultValue={statusValue}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="REVIEW">REVIEW</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="HIDDEN">HIDDEN</option>
            </select>
          </Field>
          <Field label="Subtitle">
            <input
              name="subtitle"
              defaultValue={detail.subtitle || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="SEO H1">
            <input
              name="seoH1"
              defaultValue={detail.seoH1}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="SEO title">
            <input
              name="seoTitle"
              defaultValue={detail.seoTitle}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="canonicalUrl">
            <input
              name="canonicalUrl"
              defaultValue={detail.canonicalUrl}
              className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            name="description"
            rows={3}
            defaultValue={detail.description || ''}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="SEO description">
          <textarea
            name="seoDescription"
            rows={3}
            defaultValue={detail.seoDescription}
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
          Сохранить SEO
        </button>
      </form>

      <MatchTable
        slug={detail.slug}
        title={`События в выдаче (стр. 1, до ${detail.sampleEvents.length})`}
        events={detail.sampleEvents}
      />

      {detail.excludedSample.length ? (
        <MatchTable
          slug={detail.slug}
          title={`Скрытые (сэмпл ${detail.excludedSample.length})`}
          events={detail.excludedSample.map((event) => ({
            ...event,
            readiness: '—',
            priceFrom: null,
            isAutoMatch: false,
          }))}
        />
      ) : null}
    </div>
  );
}

function MatchTable({
  slug,
  title,
  events,
}: {
  slug: string;
  title: string;
  events: Array<{
    id: string;
    title: string;
    city: string;
    venue: string;
    readiness?: string;
    priceFrom?: number | null;
    manualStatus: string | null;
    isAutoMatch?: boolean;
    groupEventIds: string[];
  }>;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Событие</th>
              <th className="px-3 py-2 font-medium">Город</th>
              <th className="px-3 py-2 font-medium">Статус</th>
              <th className="px-3 py-2 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  Нет событий.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{event.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {event.venue}
                      {event.priceFrom != null ? ` · от ${formatAdminNumber(event.priceFrom)} ₽` : ''}
                    </div>
                    <Link
                      href={`/admin/events/${encodeURIComponent(event.id)}`}
                      className="mt-1 inline-block text-xs text-sky-700 hover:underline"
                    >
                      Override в Next
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{event.city}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {event.isAutoMatch ? 'авто · ' : ''}
                    {matchLabel(event.manualStatus)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(['PINNED', 'EXCLUDED', 'REVIEW'] as const).map((status) => (
                        <form key={status} action={saveAdminLandingMatchAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="eventId" value={event.id} />
                          <input
                            type="hidden"
                            name="groupEventIds"
                            value={(event.groupEventIds.length ? event.groupEventIds : [event.id]).join(',')}
                          />
                          <input type="hidden" name="status" value={status} />
                          <button
                            type="submit"
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                          >
                            {status === 'PINNED' ? 'Pin' : status === 'EXCLUDED' ? 'Hide' : 'Auto'}
                          </button>
                        </form>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-lg font-semibold tabular-nums text-slate-900">{formatAdminNumber(value)}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

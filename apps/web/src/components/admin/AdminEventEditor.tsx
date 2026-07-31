import Link from 'next/link';
import type { ReactNode } from 'react';

import { AdminEventTaxonomyForm } from '@/components/admin/AdminEventTaxonomyForm';
import { AdminEventVenueLinksForm } from '@/components/admin/AdminEventVenueLinksForm';
import { AdminEventOpsPanels } from '@/components/admin/AdminEventOpsPanels';
import {
  saveAdminEventModerationAction,
  saveAdminEventOverrideAction,
} from '@/server/admin-event-actions';
import type { AdminEventDetailData, AdminTaxonomyData } from '@/server/admin-events-data';
import { formatAdminNumber, PUBLIC_SITE_BASE } from '@/lib/admin-ui';

const MODERATION_STATUSES = [
  { status: 'DRAFT', label: 'Черновик' },
  { status: 'REVIEW', label: 'На проверке' },
  { status: 'READY', label: 'Готово' },
  { status: 'PUBLISHED', label: 'Опубликовать' },
  { status: 'HIDDEN', label: 'Скрыть' },
] as const;

type Props = {
  detail: AdminEventDetailData;
  taxonomy: AdminTaxonomyData;
  notice?: string | null;
};

export function AdminEventEditor({ detail, taxonomy, notice }: Props) {
  const override = detail.override;
  const currentStatus = (override.editorStatus || 'REVIEW').toUpperCase();
  const canPublish = detail.canPublish !== false && detail.publishBlockers.length === 0;
  const displayTitle = override.title || detail.sourceTitle;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/events" className="hover:underline">
          События
        </Link>
        <span>/</span>
        <span className="truncate text-slate-700">{detail.id}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{displayTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Override, taxonomy, moderation, расписание, продажи и source - в Next.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {detail.slug ? (
            <a
              href={`${PUBLIC_SITE_BASE.replace(/\/$/, '')}/events/${encodeURIComponent(detail.slug)}`}
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

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Слотов" value={detail.summary.slots} />
        <Metric label="Офферов" value={detail.summary.offers} />
        <Metric
          label="Цена от"
          value={detail.summary.priceFrom}
          suffix={detail.summary.priceFrom == null ? undefined : '₽'}
        />
        <Metric label="Заказов" value={detail.summary.orders} />
      </div>

      <AdminEventOpsPanels detail={detail} />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Модерация</h3>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
            сейчас: {currentStatus}
          </span>
        </div>
        {detail.publishBlockers.length ? (
          <p className="mb-3 text-xs text-amber-800">
            Блокеры публикации: {detail.publishBlockers.slice(0, 4).join(' · ')}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {MODERATION_STATUSES.map((item) => {
            const disabled = item.status === 'PUBLISHED' && !canPublish;
            return (
              <form key={item.status} action={saveAdminEventModerationAction}>
                <input type="hidden" name="id" value={detail.id} />
                <input type="hidden" name="editorStatus" value={item.status} />
                <button
                  type="submit"
                  disabled={disabled}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    currentStatus === item.status
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : disabled
                        ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title={disabled ? 'Публикация заблокирована readiness/blockers' : undefined}
                >
                  {item.label}
                </button>
              </form>
            );
          })}
        </div>
      </section>

      <AdminEventTaxonomyForm
        eventId={detail.id}
        classification={detail.classification}
        taxonomy={taxonomy}
      />

      <AdminEventVenueLinksForm eventId={detail.id} venueLinks={detail.venueLinks} />

      <form
        action={saveAdminEventOverrideAction}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="id" value={detail.id} />
        <input type="hidden" name="section" value="content" />
        <h3 className="text-sm font-semibold text-slate-900">Контент (override)</h3>
        <p className="text-xs text-slate-500">
          Пустое поле = сброс к источнику. Source title: {detail.sourceTitle}
        </p>
        <Field label="Заголовок">
          <input
            name="title"
            defaultValue={override.title || ''}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder={detail.sourceTitle}
          />
        </Field>
        <Field label="Короткое описание">
          <textarea
            name="shortDescription"
            rows={2}
            defaultValue={override.shortDescription || ''}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Описание">
          <textarea
            name="description"
            rows={8}
            defaultValue={override.description || ''}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder={detail.sourceDescription || ''}
          />
        </Field>
        <Field label="mergeGroupKey (опционально)">
          <input
            name="mergeGroupKey"
            defaultValue={override.mergeGroupKey || ''}
            className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
          />
        </Field>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Сохранить контент
        </button>
      </form>

      <form
        action={saveAdminEventOverrideAction}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="id" value={detail.id} />
        <input type="hidden" name="section" value="seo" />
        <h3 className="text-sm font-semibold text-slate-900">SEO (override)</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="SEO H1">
            <input
              name="seoH1"
              defaultValue={override.seoH1 || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="SEO title">
            <input
              name="seoTitle"
              defaultValue={override.seoTitle || ''}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <Field label="SEO description">
          <textarea
            name="seoDescription"
            rows={3}
            defaultValue={override.seoDescription || ''}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="canonicalPath">
          <input
            name="canonicalPath"
            defaultValue={override.canonicalPath || ''}
            className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="isIndexable"
            defaultChecked={override.isIndexable === true}
            className="h-4 w-4 rounded border-slate-300"
          />
          Индексировать (isIndexable)
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Сохранить SEO
        </button>
      </form>

      <form
        action={saveAdminEventOverrideAction}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="id" value={detail.id} />
        <input type="hidden" name="section" value="media" />
        <h3 className="text-sm font-semibold text-slate-900">Медиа</h3>
        <Field label="imageUrl override">
          <input
            name="imageUrl"
            defaultValue={override.imageUrl || ''}
            className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
            placeholder={detail.sourceImageUrl || ''}
          />
        </Field>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Сохранить медиа
        </button>
      </form>
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

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-lg font-semibold tabular-nums text-slate-900">
        {value == null ? '—' : `${formatAdminNumber(value)}${suffix ? ` ${suffix}` : ''}`}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { AdminPdpEditor } from '@/components/admin/AdminVenuePdpEditor.client';
import { AdminField, adminInputClass } from '@/components/admin/AdminUi';
import { createAdminEventPageAction, saveAdminEventPageAction } from '@/server/admin-event-page-actions';
import type { AdminEventPage, AdminEventPageEditorData } from '@/server/admin-event-pages-data';
import type { AdminPdpDocument, AdminPdpEditorData } from '@/server/admin-pdp-data';

function asEditorDocument(page: AdminEventPage | null, seed: AdminPdpDocument | null): AdminPdpDocument {
  const status = page?.status ?? 'DRAFT';
  return {
    variant: 'event',
    status,
    content: page?.content ?? seed?.content ?? {
      summary: '',
      conversion: { mode: 'none', primaryAction: 'none', label: '', targetEventId: '', externalUrl: '' },
      gallery: [], facts: [],
      sections: [
        { id: 'about', kind: 'about', title: 'О событии', body: '', items: [] },
        { id: 'highlights', kind: 'highlights', title: 'Главное', body: '', items: [] },
        { id: 'program', kind: 'program', title: 'Программа', body: '', items: [] },
        { id: 'participants', kind: 'participants', title: 'Участники', body: '', items: [] },
        { id: 'ticket_notes', kind: 'ticket_notes', title: 'Условия билета', body: '', items: [] },
        { id: 'entry_rules', kind: 'entry_rules', title: 'Правила посещения', body: '', items: [] },
        { id: 'accessibility', kind: 'accessibility', title: 'Доступность', body: '', items: [] },
        { id: 'location', kind: 'location', title: 'Место проведения', body: '', items: [] },
        { id: 'faq', kind: 'faq', title: 'Частые вопросы', body: '', items: [] },
      ],
      sources: [],
    },
  };
}

export function AdminEventPageEditor({ eventId, eventSlug, eventTitle, pageData, pdpData }: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  pageData: AdminEventPageEditorData;
  pdpData: AdminPdpEditorData;
}) {
  const [page, setPage] = useState<AdminEventPage | null>(pageData.page);
  const [title, setTitle] = useState(pageData.page?.title ?? eventTitle);
  const [slug, setSlug] = useState(pageData.page?.slug ?? eventSlug);
  const [seoH1, setSeoH1] = useState(pageData.page?.seoH1 ?? '');
  const [seoTitle, setSeoTitle] = useState(pageData.page?.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(pageData.page?.seoDescription ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const initialDocument = asEditorDocument(page, pdpData.document);
  const documentForEditor: AdminPdpDocument = {
    ...initialDocument,
    id: page?.id,
    version: page?.revisions[0]?.version,
  };

  async function createPage() {
    setBusy(true);
    setError('');
    try {
      const created = await createAdminEventPageAction({
        eventId,
        slug,
        title,
        content: initialDocument.content,
      });
      setPage(created);
      setSlug(created.slug);
      setTitle(created.title);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось создать страницу события.');
    } finally {
      setBusy(false);
    }
  }

  async function saveDocument(document: AdminPdpDocument): Promise<AdminPdpDocument> {
    if (!page) throw new Error('Сначала создай черновик страницы события.');
    const saved = await saveAdminEventPageAction(page.id, {
      slug,
      title,
      content: document.content,
      seoH1,
      seoTitle,
      seoDescription,
      status: document.status,
      changeNote: 'Обновлены подробности страницы события',
    });
    setPage(saved);
    return {
      ...document,
      id: saved.id,
      version: saved.revisions[0]?.version,
      status: saved.status,
      content: saved.content,
    };
  }

  return <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold">Подробности события</h3>
        <p className="mt-1 max-w-3xl text-xs text-slate-600">
          Это редакционный черновик стабильной страницы. Он не меняет адрес сайта, canonical или sitemap.
          Расписание, цены и билеты продолжают поступать из связанных событий и слотов.
        </p>
      </div>
      <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
        {page ? `${page.status} · noindex` : 'страница ещё не заведена'}
      </span>
    </header>

    {pageData.error ? <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{pageData.error}</div> : null}
    {error ? <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</div> : null}

    {!page ? <div className="rounded-md border border-dashed border-slate-300 p-4">
      <p className="text-sm font-medium">Создать редакционную страницу для этого события</p>
      <p className="mt-1 text-xs text-slate-600">Существующий текст PDP будет скопирован в черновик, если он уже есть. Исходное описание и текущая публичная страница останутся нетронутыми.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <AdminField label="Название страницы"><input className={adminInputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></AdminField>
        <AdminField label="Внутренний slug страницы"><input className={adminInputClass} value={slug} onChange={(event) => setSlug(event.target.value)} /></AdminField>
      </div>
      <button
        type="button"
        className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy || Boolean(pageData.error)}
        onClick={createPage}
      >
        {busy ? 'Создаю черновик…' : 'Создать черновик'}
      </button>
    </div> : <>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField label="Название страницы"><input className={adminInputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></AdminField>
        <AdminField label="Внутренний slug"><input className={adminInputClass} value={slug} onChange={(event) => setSlug(event.target.value)} /></AdminField>
        <AdminField label="SEO H1"><input className={adminInputClass} value={seoH1} onChange={(event) => setSeoH1(event.target.value)} /></AdminField>
        <AdminField label="SEO title"><input className={adminInputClass} value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} /></AdminField>
        <div className="sm:col-span-2"><AdminField label="SEO description"><textarea className={`${adminInputClass} min-h-20`} value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} /></AdminField></div>
      </div>
      <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
        <strong>Связанные события:</strong> {page.events.map((item) => `${item.eventTitle}${item.cityTitle ? ` · ${item.cityTitle}` : ''}`).join(' / ')}
        <span className="ml-2 text-slate-500">· версия {page.revisions[0]?.version ?? 1}</span>
      </div>
      <AdminPdpEditor
        entity="events"
        entityId={eventId}
        entitySlug={eventSlug}
        variants={pdpData.variants}
        initialDocument={documentForEditor}
        initialVariant="event"
        initialError={pdpData.error}
        saveDocument={saveDocument}
        heading="Текст, практическая информация и предпросмотр"
        saveButtonLabel="Сохранить подробности"
      />
    </>}
  </section>;
}

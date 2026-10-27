'use client';

import { useState } from 'react';
import { AdminPdpEditor } from '@/components/admin/AdminVenuePdpEditor.client';
import { AdminField, adminInputClass } from '@/components/admin/AdminUi';
import { createAdminEventPageAction, publishAdminEventPageAction, saveAdminEventPageAction } from '@/server/admin-event-page-actions';
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

function proposeEventPageSlug(eventSlug: string, eventId: string): string {
  let slug = String(eventSlug || '').trim();
  const tcId = String(eventId || '').match(/^evt_([a-f\d]{24})$/i)?.[1];
  const tepId = String(eventId || '').match(/^evt_tep_(\d{2,6})$/i)?.[1];

  if (tcId) {
    slug = slug.replace(new RegExp(`^tc-${tcId}-`, 'i'), '').replace(new RegExp(`-${tcId}$`, 'i'), '');
  }
  if (tepId && slug.endsWith(`-${tepId}`)) slug = slug.slice(0, -(tepId.length + 1));

  return slug || String(eventSlug || '').trim();
}

export function AdminEventPageEditor({ eventId, eventSlug, eventTitle, sourceDescription, currentOverrideDescription, pageData, pdpData }: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  sourceDescription: string | null;
  currentOverrideDescription: string | null;
  pageData: AdminEventPageEditorData;
  pdpData: AdminPdpEditorData;
}) {
  const [page, setPage] = useState<AdminEventPage | null>(pageData.page);
  const [title, setTitle] = useState(pageData.page?.title ?? eventTitle);
  const [slug, setSlug] = useState(pageData.page?.slug ?? proposeEventPageSlug(eventSlug, eventId));
  const [seoH1, setSeoH1] = useState(pageData.page?.seoH1 ?? '');
  const [seoTitle, setSeoTitle] = useState(pageData.page?.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(pageData.page?.seoDescription ?? '');
  const [slugNotice, setSlugNotice] = useState('');
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
      setSlugNotice(created.slug === slug ? '' : `Кандидат slug уже занят. Создан отдельный черновик «${created.slug}»; события не объединялись. Проверь связь перед дальнейшей работой.`);
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

  async function publishPage() {
    if (!page || !window.confirm('Опубликовать редакционный текст на текущем URL события? Адрес, canonical и sitemap не изменятся.')) return;
    setBusy(true);
    setError('');
    try {
      const published = await publishAdminEventPageAction(page.id);
      setPage(published);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось опубликовать EventPage.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold">Подробности события</h3>
        <p className="mt-1 max-w-3xl text-xs text-slate-600">
          Ниже отдельно показаны исходник, текущий текст карточки и редакционный рерайт EventPage.
          Рерайт сохраняется в черновике EventPage; адрес сайта, canonical и sitemap не меняются.
          Расписание, цены и билеты продолжают поступать из связанных событий и слотов.
        </p>
      </div>
      <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
        {page ? page.publishedAt ? 'текст опубликован · URL без изменений' : page.status === 'READY' ? 'готово к публикации' : page.status : 'страница ещё не заведена'}
      </span>
    </header>

    {pageData.error ? <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{pageData.error}</div> : null}
    {error ? <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</div> : null}
    {slugNotice ? <div role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{slugNotice}</div> : null}

    <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Оригинальный текст источника</h4>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700">не используется в EventPage</span>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Хранится как исходные данные и не копируется в рерайт автоматически. Текущая публичная карточка может использовать его как fallback, пока EventPage не подключена.
        </p>
        <div className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
          {sourceDescription?.trim() || 'У источника нет описания.'}
        </div>
    </section>

    {currentOverrideDescription?.trim() ? <details className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
      <summary className="cursor-pointer text-sm font-medium text-amber-950">Старая правка карточки Event · переходная справка</summary>
      <p className="mt-2 text-xs text-amber-900">
        Это legacy override, который старая публичная карточка может показывать до подключения EventPage. Он не является вторым редактором: новый текст ведётся только ниже в EventPage.
      </p>
      <div className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded border border-amber-200 bg-white p-3 text-sm text-slate-700">
        {currentOverrideDescription}
      </div>
    </details> : null}

    {!page ? <div className="rounded-md border border-dashed border-slate-300 p-4">
      <p className="text-sm font-medium">Создать редакционную страницу для этого события</p>
      <p className="mt-1 text-xs text-slate-600">Существующий текст PDP будет скопирован в черновик, если он уже есть. Исходное описание и текущая публичная страница останутся нетронутыми.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <AdminField label="Название страницы"><input className={adminInputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></AdminField>
        <AdminField label="Кандидат slug EventPage"><input className={adminInputClass} value={slug} onChange={(event) => setSlug(event.target.value)} /></AdminField>
      </div>
      <p className="mt-2 text-xs text-slate-600">Код источника убирается, только если совпадает с ID Event. Это пока внутренний slug: публичный URL, canonical и sitemap не меняются. Если кандидат занят, система выдаст следующий суффикс, например -2; записи останутся раздельными для проверки.</p>
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
        <AdminField label="Кандидат slug EventPage"><input className={adminInputClass} value={slug} onChange={(event) => setSlug(event.target.value)} /></AdminField>
        <AdminField label="SEO H1"><input className={adminInputClass} value={seoH1} onChange={(event) => setSeoH1(event.target.value)} /></AdminField>
        <AdminField label="SEO title"><input className={adminInputClass} value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} /></AdminField>
        <div className="sm:col-span-2"><AdminField label="SEO description"><textarea className={`${adminInputClass} min-h-20`} value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} /></AdminField></div>
      </div>
      <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
        <strong>Связанные события:</strong> {page.events.map((item) => `${item.eventTitle}${item.cityTitle ? ` · ${item.cityTitle}` : ''}`).join(' / ')}
        <span className="ml-2 text-slate-500">· версия {page.revisions[0]?.version ?? 1}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 p-3">
        <p className="min-w-0 flex-1 text-xs text-slate-600">
          {page.publishedAt
            ? 'Текст виден на текущей странице события. Черновые изменения появятся после сохранения; URL, canonical и sitemap остаются прежними.'
            : 'Публикация меняет только текст на существующем URL. Она не создаёт новый адрес и не меняет canonical или sitemap.'}
        </p>
        {!page.publishedAt ? <button type="button" disabled={busy || page.status !== 'READY'} onClick={publishPage} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Публикую…' : 'Опубликовать текст'}</button> : null}
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
        heading="Рерайт EventPage, контекстные блоки и предпросмотр"
        saveButtonLabel="Сохранить подробности"
      />
    </>}
  </section>;
}

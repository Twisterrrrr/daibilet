'use client';

import { useState } from 'react';
import { AdminPdpEditor } from '@/components/admin/AdminVenuePdpEditor.client';
import { AdminField, adminInputClass } from '@/components/admin/AdminUi';
import {
  attachEventToAdminEventPageAction,
  createAdminEventPageAction,
  publishAdminEventPageAction,
  saveAdminEventPageAction,
  searchAdminEventPageEventCandidatesAction,
  moveEventToAdminEventPageAction,
  splitEventFromAdminEventPageAction,
  type AdminEventPageEventCandidate,
} from '@/server/admin-event-page-actions';
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
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventCandidates, setEventCandidates] = useState<AdminEventPageEventCandidate[]>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [linkingEventId, setLinkingEventId] = useState('');

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
      setSlugNotice(created.slug === slug ? '' : `Для черновика выделен безопасный slug «${created.slug}». Город добавляется автоматически; при совпадении в этом городе используется суффикс -2, -3 и далее. События не объединялись.`);
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

  async function searchEventCandidates() {
    setSearchingCandidates(true);
    setError('');
    try {
      setEventCandidates(await searchAdminEventPageEventCandidatesAction(eventSearchQuery));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось найти события-кандидаты.');
    } finally {
      setSearchingCandidates(false);
    }
  }

  async function attachEvent(candidate: AdminEventPageEventCandidate) {
    if (!page || (candidate.linkedPageId && !candidate.linkedPageCanMove) || page.events.some((item) => item.eventId === candidate.id)) return;
    const summary = `${candidate.title}${candidate.cityTitle ? ` · ${candidate.cityTitle}` : ''}`;
    const action = candidate.linkedPageId
      ? `Перенести слот «${summary}» из EventPage «${candidate.linkedPageTitle || candidate.linkedPageSlug}» в эту страницу? Операция будет записана в историю и её можно будет отменить переносом обратно.`
      : `Добавить «${summary}» к этой EventPage? Расписание и билеты будут показываться на общей странице; тексты событий автоматически не объединяются.`;
    if (!window.confirm(action)) return;
    setLinkingEventId(candidate.id);
    setError('');
    try {
      const updated = candidate.linkedPageId
        ? (await moveEventToAdminEventPageAction(page.id, candidate.id)).target
        : await attachEventToAdminEventPageAction(page.id, [...page.events.map((item) => item.eventId), candidate.id]);
      setPage(updated);
      setEventCandidates((current) => current.map((item) => item.id === candidate.id
          ? { ...item, linkedPageId: updated.id, linkedPageSlug: updated.slug, linkedPageTitle: updated.title, linkedPageCanMove: false }
        : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось связать событие с EventPage.');
    } finally {
      setLinkingEventId('');
    }
  }

  async function splitEvent(eventIdToSplit: string) {
    if (!page || page.events.length < 2) return;
    const item = page.events.find((candidate) => candidate.eventId === eventIdToSplit);
    if (!item) return;
    if (!window.confirm(`Отделить «${item.eventTitle}» в отдельную EventPage? Будет создан приватный черновик без публикации; исходная страница и её slug сохранятся.`)) return;
    setLinkingEventId(eventIdToSplit);
    setError('');
    try {
      const result = await splitEventFromAdminEventPageAction(page.id, eventIdToSplit);
      setPage(eventIdToSplit === eventId ? result.separated : result.source);
      setEventCandidates([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось отделить событие.');
    } finally {
      setLinkingEventId('');
    }
  }

  async function undoLastMove() {
    const movement = page?.revisions[0]?.sourceSnapshot?.membershipMove;
    if (!page || !movement?.eventId || !movement.fromPageId) return;
    if (!window.confirm(`Вернуть событие «${movement.eventId}» в EventPage «${movement.fromPageSlug || movement.fromPageId}»?`)) return;
    setLinkingEventId(movement.eventId);
    setError('');
    try {
      const result = await moveEventToAdminEventPageAction(movement.fromPageId, movement.eventId);
      setPage(result.target);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось отменить перенос.');
    } finally {
      setLinkingEventId('');
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
        <AdminField label="Кандидат slug EventPage"><input className={adminInputClass} value={slug} onChange={(event) => setSlug(event.target.value)} /><small>Для одиночного события город добавится при создании; коллизия в том же городе получит -2, -3 и далее.</small></AdminField>
      </div>
      <p className="mt-2 text-xs text-slate-600">Код источника убирается, только если совпадает с ID Event. К одиночному событию добавится город; при совпадении в том же городе — -2, -3 и далее. Это внутренний slug: публичный URL, canonical и sitemap не меняются.</p>
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
        <AdminField label="Кандидат slug EventPage"><input className={adminInputClass} value={slug} onChange={(event) => setSlug(event.target.value)} /><small>Slug черновика включает город, если это одиночное событие; одинаковые названия в одном городе получают -2, -3 и далее.</small></AdminField>
        <AdminField label="SEO H1"><input className={adminInputClass} value={seoH1} onChange={(event) => setSeoH1(event.target.value)} /></AdminField>
        <AdminField label="SEO title"><input className={adminInputClass} value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} /></AdminField>
        <div className="sm:col-span-2"><AdminField label="SEO description"><textarea className={`${adminInputClass} min-h-20`} value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} /></AdminField></div>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>Связанные события и основания для объединения</strong>
          <span className="text-slate-500">версия {page.revisions[0]?.version ?? 1}</span>
        </div>
        <div className="mt-2 space-y-2">
          {page.events.map((item) => <div key={item.eventId} className="rounded border border-slate-200 bg-white p-2">
            <p className="font-medium">{item.eventTitle}{item.cityTitle ? ` · ${item.cityTitle}` : ''}</p>
            <dl className="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              <div><dt className="inline text-slate-500">Поставщик/организатор: </dt><dd className="inline">{item.supplierTitle || 'не указан в каталоге'}</dd></div>
              <div><dt className="inline text-slate-500">Площадка: </dt><dd className="inline">{item.venueTitle || 'не указана'}{item.venueAddress ? ` · ${item.venueAddress}` : ''}</dd></div>
              <div className="sm:col-span-2"><dt className="inline text-slate-500">Источник данных: </dt><dd className="inline">{item.sources?.length
                ? item.sources.map((source) => `${source.name} (${source.code}, ID ${source.externalId})`).join(' · ')
                : 'не указан в каталоге'}</dd></div>
            </dl>
            {page.events.length > 1 ? <button
              type="button"
              disabled={Boolean(linkingEventId)}
              onClick={() => void splitEvent(item.eventId)}
              className="mt-2 rounded border border-amber-300 px-2.5 py-1.5 font-medium text-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {linkingEventId === item.eventId ? 'Отделяю…' : 'Отделить в новую EventPage'}
            </button> : null}
          </div>)}
        </div>
        <p className="mt-2 text-slate-500">Поставщик, адрес и источник помогают редактору проверить связь. Сами по себе они не объединяют события.</p>
      </div>
      {page.reviewCandidates?.length ? <section className="rounded-md border border-amber-300 bg-amber-50/60 p-3">
        <h4 className="text-sm font-semibold text-amber-950">Проверить неоднозначные совпадения</h4>
        <p className="mt-1 text-xs text-amber-900">
          Совпадает явный Ticketscloud meta ID и город, но записи уже относятся к разным EventPage. Автоматически не объединяли.
        </p>
        <ul className="mt-3 space-y-2">
          {page.reviewCandidates.map((candidate) => <li key={`${candidate.pageId}:${candidate.eventId}`} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-amber-200 bg-white p-3 text-xs">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{candidate.eventTitle}{candidate.cityTitle ? ` · ${candidate.cityTitle}` : ''}</p>
              <p className="mt-1 text-slate-700">Источник: {candidate.sourceName} · meta ID {candidate.metaExternalId} · слот ID {candidate.externalId}</p>
              <p className="mt-1 text-slate-700">Поставщик: {candidate.supplierTitle || 'не указан'} · Площадка: {candidate.venueTitle || 'не указана'}{candidate.venueAddress ? ` · ${candidate.venueAddress}` : ''}</p>
              <p className="mt-1 text-slate-500">Сейчас в EventPage «{candidate.pageTitle}» · /events/{candidate.pageSlug}</p>
            </div>
            <button type="button" disabled={!candidate.canMove || Boolean(linkingEventId)} onClick={() => void attachEvent({
              id: candidate.eventId,
              title: candidate.eventTitle,
              slug: candidate.eventSlug,
              kind: 'single',
              status: 'REVIEW',
              cityTitle: candidate.cityTitle,
              venueTitle: candidate.venueTitle,
              venueAddress: candidate.venueAddress,
              supplierTitle: candidate.supplierTitle,
              sources: [{ code: candidate.sourceCode, name: candidate.sourceName, externalId: candidate.externalId, metaExternalId: candidate.metaExternalId, sourceUrl: null }],
              linkedPageId: candidate.pageId,
              linkedPageSlug: candidate.pageSlug,
              linkedPageTitle: candidate.pageTitle,
              linkedPageStatus: 'DRAFT',
              linkedPageCanMoveFromDraftShell: candidate.canMove,
              linkedPageCanMove: candidate.canMove,
            })} className="shrink-0 rounded-md bg-amber-800 px-3 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
              {candidate.canMove ? 'Перенести сюда' : 'Сначала разделите исходную страницу'}
            </button>
          </li>)}
        </ul>
      </section> : null}
      {page.revisions[0]?.sourceSnapshot?.membershipMove ? <div className="flex flex-wrap items-center gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950">
        <span>Последний перенос слота: {page.revisions[0].sourceSnapshot.membershipMove.eventId} из «{page.revisions[0].sourceSnapshot.membershipMove.fromPageSlug || page.revisions[0].sourceSnapshot.membershipMove.fromPageId}».</span>
        <button type="button" disabled={Boolean(linkingEventId)} onClick={() => void undoLastMove()} className="rounded-md border border-blue-300 bg-white px-3 py-2 font-semibold disabled:opacity-50">Откатить перенос</button>
      </div> : null}
      <section className="rounded-md border border-slate-200 p-3">
        <h4 className="text-sm font-semibold">Добавить запись расписания к этой странице</h4>
        <p className="mt-1 text-xs text-slate-600">
          Используйте для нового Event ID того же события, например при возвращении сезонной программы. Сверьте город, поставщика, площадку и источник. Событие, уже привязанное к другой EventPage, нельзя добавить отсюда.
        </p>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void searchEventCandidates(); }}>
          <input
            className={`${adminInputClass} min-w-[16rem] flex-1`}
            value={eventSearchQuery}
            onChange={(event) => setEventSearchQuery(event.target.value)}
            placeholder="Название, город, площадка или ID источника"
            aria-label="Поиск события для привязки к EventPage"
            minLength={2}
          />
          <button type="submit" disabled={searchingCandidates || Boolean(linkingEventId) || eventSearchQuery.trim().length < 2} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50">
            {searchingCandidates ? 'Ищу…' : 'Найти'}
          </button>
        </form>
        {eventCandidates.length ? <ul className="mt-3 space-y-2">
          {eventCandidates.map((candidate) => {
            const alreadyLinkedHere = page.events.some((item) => item.eventId === candidate.id);
            const canReassignDraftShell = Boolean(candidate.linkedPageCanMove && candidate.linkedPageId !== page.id);
            const linkedElsewhere = Boolean(candidate.linkedPageId && candidate.linkedPageId !== page.id && !canReassignDraftShell);
            return <li key={candidate.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-slate-200 p-3 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{candidate.title}{candidate.cityTitle ? ` · ${candidate.cityTitle}` : ''}</p>
                <p className="mt-1 text-slate-700">Поставщик: {candidate.supplierTitle || 'не указан'} · Площадка: {candidate.venueTitle || 'не указана'}{candidate.venueAddress ? ` · ${candidate.venueAddress}` : ''}</p>
                <p className="mt-1 text-slate-500">Источник: {candidate.sources?.length ? candidate.sources.map((source) => `${source.name} · ${source.externalId}`).join('; ') : 'не указан'} · ID события: {candidate.id}</p>
                {linkedElsewhere ? <p className="mt-1 text-amber-800">Уже связано с «{candidate.linkedPageTitle || candidate.linkedPageSlug}».</p> : null}
                {canReassignDraftShell ? <p className="mt-1 text-amber-800">Сейчас связано с «{candidate.linkedPageTitle || candidate.linkedPageSlug}»; слот можно перенести с сохранением истории.</p> : null}
              </div>
              <button
                type="button"
                disabled={busy || Boolean(linkingEventId) || alreadyLinkedHere || linkedElsewhere}
                onClick={() => void attachEvent(candidate)}
                className="shrink-0 rounded-md bg-slate-900 px-3 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {alreadyLinkedHere ? 'Уже связано' : linkedElsewhere ? 'Связано с другой страницей' : linkingEventId === candidate.id ? 'Связываю…' : canReassignDraftShell ? 'Перенести сюда' : 'Добавить к EventPage'}
              </button>
            </li>;
          })}
        </ul> : null}
        {eventSearchQuery.trim().length >= 2 && !searchingCandidates && eventCandidates.length === 0 ? <p className="mt-3 text-xs text-slate-500">События по этому запросу не найдены.</p> : null}
      </section>
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

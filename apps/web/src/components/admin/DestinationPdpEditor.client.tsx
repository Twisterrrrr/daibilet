'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import type { DestinationPdpContent, DestinationPdpStatus } from '@daibilet/contracts/city-pdp';
import { DestinationPdpContent as DestinationPdpPublicContent } from '@/components/DestinationPdpContent.client';
import { SafeImage } from '@/components/SafeImage.client';
import {
  publishAdminDestinationPdpAction,
  saveAdminDestinationPdpAction,
  transitionAdminDestinationPdpAction,
  type DestinationEditorDocument,
  type DestinationOwnerType,
} from '@/server/admin-destination-pdp-actions';

type Owner = { type: 'CITY' | 'REGION'; id: string; slug: string; title: string; legacyDraft: Record<string, string | null> };
type Props = {
  ownerType: DestinationOwnerType;
  owner: Owner;
  initialDocument: DestinationEditorDocument | null;
  initialReadiness: { ready: boolean; issues: string[] };
};

const EMPTY_CONTENT: DestinationPdpContent = {
  introTitle: '', introText: '', regionBrief: '', mustSee: [], sights: [], significantSuburbs: [],
  regionTopPlaces: [], routes: [], travelText: '', faq: [], gallery: [], sources: [],
};
const TABS = [
  ['overview', 'Обзор'], ['places', 'Главное'], ['routes', 'Маршруты и пригороды'],
  ['faq', 'FAQ'], ['media', 'Медиа'], ['preview', 'Предпросмотр'], ['seo', 'SEO и публикация'],
] as const;
type Tab = (typeof TABS)[number][0];

export function DestinationPdpEditor({ ownerType, owner, initialDocument, initialReadiness }: Props) {
  const [document, setDocument] = useState(initialDocument);
  const [content, setContent] = useState<DestinationPdpContent>(() => ({
    ...EMPTY_CONTENT,
    ...(!initialDocument ? {
      introTitle: owner.legacyDraft.introTitle || '',
      introText: owner.legacyDraft.introText || '',
    } : {}),
    ...(initialDocument?.content || {}),
  }));
  const [summary, setSummary] = useState(initialDocument?.summary || '');
  const [heroImageUrl, setHeroImageUrl] = useState(initialDocument?.heroImageUrl || (!initialDocument ? owner.legacyDraft.heroImageUrl || '' : ''));
  const [seoH1, setSeoH1] = useState(initialDocument?.seoH1 || (!initialDocument ? owner.legacyDraft.seoH1 || '' : ''));
  const [seoTitle, setSeoTitle] = useState(initialDocument?.seoTitle || (!initialDocument ? owner.legacyDraft.seoTitle || '' : ''));
  const [seoDescription, setSeoDescription] = useState(initialDocument?.seoDescription || (!initialDocument ? owner.legacyDraft.seoDescription || '' : ''));
  const [canonicalPath, setCanonicalPath] = useState(initialDocument?.canonicalPath || (!initialDocument ? owner.legacyDraft.canonicalPath || `/cities/${owner.slug}` : `/cities/${owner.slug}`));
  const [isIndexable, setIsIndexable] = useState(initialDocument?.isIndexable || false);
  const [tab, setTab] = useState<Tab>('overview');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const changeRevision = useRef(0);

  const status = document?.status || 'DRAFT';
  const readiness = useMemo(() => {
    const missing: string[] = [];
    if (!content.introTitle?.trim()) missing.push('Заголовок вводного блока');
    if (!content.introText?.trim()) missing.push('Описание направления');
    if (!(content.sources?.length)) missing.push('Хотя бы один проверенный источник');
    if (!((content.mustSee?.length || 0) + (content.sights?.length || 0) + (content.regionTopPlaces?.length || 0) + (content.routes?.length || 0))) missing.push('Главное место или маршрут');
    return { ready: !missing.length, missing };
  }, [content]);

  function update<K extends keyof DestinationPdpContent>(key: K, value: DestinationPdpContent[K]) {
    changeRevision.current += 1;
    setHasUnsavedChanges(true);
    setContent((current) => ({ ...current, [key]: value }));
  }

  function updateField<T>(setter: (value: T) => void, value: T) {
    changeRevision.current += 1;
    setHasUnsavedChanges(true);
    setter(value);
  }

  function run(action: () => Promise<unknown>, success: string) {
    setError(''); setNotice('');
    startTransition(async () => {
      try { await action(); setNotice(success); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось выполнить действие'); }
    });
  }

  async function persistDraft() {
      const savingRevision = changeRevision.current;
      const result = await saveAdminDestinationPdpAction(ownerType, owner.id, {
        summary: summary.trim() || null, heroImageUrl: heroImageUrl.trim() || null,
        seoH1: seoH1.trim() || null, seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null, canonicalPath: canonicalPath.trim() || null,
        content, changeNote: 'Редактирование PDP направления в админке',
      }) as { document?: DestinationEditorDocument };
      if (result.document) setDocument(result.document);
      if (changeRevision.current === savingRevision) setHasUnsavedChanges(false);
      return result;
  }

  function save() {
    run(async () => { await persistDraft(); }, 'Черновик сохранён; опубликованная версия не менялась.');
  }

  function setStatus(next: Exclude<DestinationPdpStatus, 'PUBLISHED'>) {
    run(async () => {
      if (next === 'REVIEW' || next === 'READY') await persistDraft();
      const result = await transitionAdminDestinationPdpAction(ownerType, owner.id, next) as { document?: DestinationEditorDocument };
      if (result.document) setDocument(result.document);
    }, `Статус изменён: ${next}.`);
  }

  function publish() {
    run(async () => {
      const result = await publishAdminDestinationPdpAction(ownerType, owner.id, isIndexable) as { document?: DestinationEditorDocument };
      if (result.document) setDocument(result.document);
    }, isIndexable ? 'Опубликовано и разрешено к индексации.' : 'Опубликовано без индексации.');
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="destination-pdp-editor">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">PDP направления</h3>
          <p className="mt-1 text-sm text-slate-600">Редакционный контент хранится отдельным черновиком. Афиша, счётчики и доступность продаж остаются живыми данными.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <a href={`/cities/${encodeURIComponent(owner.slug)}`} target="_blank" rel="noreferrer" className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Открыть публичную страницу</a>
        </div>
      </header>

      {document === null ? <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">Редактор создаст черновик только после первого сохранения. Страница останется noindex, пока редактор явно не включит индексацию при публикации.</p> : null}
      {initialReadiness.issues?.length ? <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">До публикации заполните обязательные поля и источники.</p> : null}
      {notice ? <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p> : null}
      {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
      {hasUnsavedChanges ? <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">Есть несохранённые изменения. Сохранение обновит черновик и вернёт PDP на редакторскую проверку.</p> : null}

      <nav aria-label="Разделы редактора PDP" className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`border-b-2 px-3 py-2 text-sm ${tab === key ? 'border-blue-600 font-semibold text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>{label}</button>)}
      </nav>

      {tab === 'overview' ? <div className="grid gap-3 md:grid-cols-2">
        <Field label="Заголовок вступления"><input value={content.introTitle || ''} onChange={(e) => update('introTitle', e.target.value)} className={inputClass} /></Field>
        <Field label="Hero image URL"><input value={heroImageUrl} onChange={(e) => updateField(setHeroImageUrl, e.target.value)} placeholder="/images/cities/..." className={inputClass} /></Field>
        <Field label="Короткое описание / лид"><textarea rows={3} value={summary} onChange={(e) => updateField(setSummary, e.target.value)} className={inputClass} /></Field>
        <Field label="Вводный текст PDP"><textarea rows={6} value={content.introText || ''} onChange={(e) => update('introText', e.target.value)} className={inputClass} /></Field>
        {ownerType === 'regions' ? <Field label="Кратко о регионе"><textarea rows={5} value={content.regionBrief || ''} onChange={(e) => update('regionBrief', e.target.value)} className={inputClass} /></Field> : null}
      </div> : null}

      {tab === 'places' ? <div className="grid gap-4 xl:grid-cols-2">
        <ItemsListEditor kind="place" label="Что посмотреть / Must-see" value={content.mustSee || []} onChange={(v) => update('mustSee', v as DestinationPdpContent['mustSee'])} />
        <ItemsListEditor kind="place" label="Достопримечательности" value={content.sights || []} onChange={(v) => update('sights', v as DestinationPdpContent['sights'])} />
        {ownerType === 'regions' ? <ItemsListEditor kind="place" label="Главные места региона" value={content.regionTopPlaces || []} onChange={(v) => update('regionTopPlaces', v as DestinationPdpContent['regionTopPlaces'])} /> : null}
      </div> : null}

      {tab === 'routes' ? <div className="grid gap-4 xl:grid-cols-2">
        <ItemsListEditor kind="route" label="Маршруты" value={content.routes || []} onChange={(v) => update('routes', v as DestinationPdpContent['routes'])} />
        <ItemsListEditor kind="suburb" label="Значимые пригороды" value={content.significantSuburbs || []} onChange={(v) => update('significantSuburbs', v as DestinationPdpContent['significantSuburbs'])} hint="Город/посёлок, описание, транспортный вектор и время в пути. Выборг остаётся пригородом Ленинградской области, пока его собственная страница-хаб не оформлена и не принята." />
        <Field label="Практическая информация и транспорт"><textarea rows={8} value={content.travelText || ''} onChange={(e) => update('travelText', e.target.value)} className={inputClass} placeholder="Как добраться, сезонность, транспорт внутри региона..." /></Field>
      </div> : null}

      {tab === 'faq' ? <ItemsListEditor kind="faq" label="Вопросы и ответы" value={content.faq || []} onChange={(v) => update('faq', v as DestinationPdpContent['faq'])} /> : null}

      {tab === 'media' ? <div className="grid gap-4 xl:grid-cols-2">
        <ItemsListEditor kind="media" label="Галерея PDP" value={content.gallery || []} onChange={(v) => update('gallery', v as DestinationPdpContent['gallery'])} />
        <ItemsListEditor kind="source" label="Источники фактов" value={content.sources || []} onChange={(v) => update('sources', v as DestinationPdpContent['sources'])} />
      </div> : null}

      {tab === 'preview' ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-3"><h4 className="font-semibold text-slate-900">Предпросмотр содержимого PDP</h4><p className="mt-1 text-xs text-slate-500">Показывает текущий черновик. Он не публикуется и не меняет публичную страницу.</p></div>
        {heroImageUrl ? <div className="relative h-48 bg-slate-200"><SafeImage src={heroImageUrl} alt="" fill sizes="100vw" className="object-cover" /></div> : null}
        <DestinationPdpPublicContent cityName={owner.title} region={ownerType === 'regions'} pdp={{ version: document?.version || 0, summary: summary || null, heroImageUrl: heroImageUrl || null, seoH1: seoH1 || null, seoTitle: seoTitle || null, seoDescription: seoDescription || null, canonicalPath: canonicalPath || null, isIndexable: false, publishedAt: null, content }} />
      </div> : null}

      {tab === 'seo' ? <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="SEO H1"><input value={seoH1} onChange={(e) => updateField(setSeoH1, e.target.value)} className={inputClass} /></Field>
          <Field label="SEO title"><input value={seoTitle} onChange={(e) => updateField(setSeoTitle, e.target.value)} className={inputClass} /></Field>
          <Field label="Canonical path"><input value={canonicalPath} onChange={(e) => updateField(setCanonicalPath, e.target.value)} className={`${inputClass} font-mono`} /></Field>
          <Field label="SEO description"><textarea rows={3} value={seoDescription} onChange={(e) => updateField(setSeoDescription, e.target.value)} className={inputClass} /></Field>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <h4 className="font-semibold text-slate-900">Готовность и публикация</h4>
          {readiness.ready ? <p className="mt-2 text-sm text-emerald-800">Обязательные требования выполнены.</p> : <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">{readiness.missing.map((item) => <li key={item}>{item}</li>)}</ul>}
          <p className="mt-2 text-xs text-slate-500">Версия {document?.version || 0}{document?.publishedAt ? ` · опубликована ${document.publishedAt.slice(0, 10)}` : ''} · последняя правка {document?.updatedAt ? document.updatedAt.slice(0, 16).replace('T', ' ') : 'ещё не сохраняли'}</p>
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={isIndexable} onChange={(e) => setIsIndexable(e.target.checked)} className="mt-1" /><span>Разрешить индексацию после публикации (иначе опубликованная PDP останется noindex)</span></label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={isPending} onClick={save} className={secondaryButton}>Сохранить черновик</button>
            {status === 'DRAFT' || status === 'HIDDEN' ? <button type="button" disabled={isPending} onClick={() => setStatus('REVIEW')} className={secondaryButton}>На редакторскую проверку</button> : null}
            {status === 'REVIEW' ? <button type="button" disabled={isPending || !readiness.ready} onClick={() => setStatus('READY')} className={secondaryButton}>Подтвердить готовность</button> : null}
            {status === 'READY' ? <button type="button" disabled={isPending || hasUnsavedChanges || !readiness.ready} onClick={publish} className={primaryButton}>Опубликовать</button> : null}
            {status !== 'HIDDEN' && document ? <button type="button" disabled={isPending || hasUnsavedChanges} onClick={() => setStatus('HIDDEN')} className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Скрыть PDP</button> : null}
          </div>
        </div>
        {document?.revisions?.length ? <div><h4 className="mb-2 text-sm font-semibold">История изменений</h4><ol className="space-y-1 text-xs text-slate-600">{document.revisions.slice(0, 5).map((revision) => <li key={revision.id}>v{revision.version} · {new Date(revision.createdAt).toLocaleString('ru-RU')} · {revision.changeNote || 'изменение статуса/публикация'}</li>)}</ol></div> : null}
      </div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="text-xs text-slate-500">Статус: <strong>{statusLabel(status)}</strong>{document?.isIndexable ? ' · index, follow' : ' · noindex'}</div>
        {tab !== 'seo' ? <button type="button" disabled={isPending} onClick={save} className={primaryButton}>{isPending ? 'Сохраняю…' : 'Сохранить черновик'}</button> : null}
      </div>
      <p className="text-xs text-slate-500">Устаревшие поля города сохранены отдельно{Object.values(owner.legacyDraft || {}).some(Boolean) ? ' и доступны как источник для переноса текста.' : '.'}</p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-medium text-slate-600">{label}</span>{children}</label>;
}

type EditorKind = 'place' | 'suburb' | 'route' | 'faq' | 'media' | 'source';
const EDITOR_FIELDS: Record<EditorKind, Array<{ key: string; label: string; multiline?: boolean; lines?: number }>> = {
  place: [
    { key: 'name', label: 'Название' }, { key: 'description', label: 'Описание', multiline: true, lines: 3 },
    { key: 'cityName', label: 'Город' }, { key: 'address', label: 'Адрес' }, { key: 'href', label: 'Ссылка на PDP' },
    { key: 'imageUrl', label: 'URL изображения' }, { key: 'imageAlt', label: 'Alt изображения' }, { key: 'sourceUrl', label: 'Источник' },
  ],
  suburb: [
    { key: 'name', label: 'Название' }, { key: 'description', label: 'Описание', multiline: true, lines: 3 },
    { key: 'cityName', label: 'Регион / область' }, { key: 'address', label: 'Адрес / точка' },
    { key: 'travelVector', label: 'Как добраться' }, { key: 'travelTime', label: 'Время в пути' },
    { key: 'href', label: 'Ссылка на готовую PDP города' }, { key: 'imageUrl', label: 'URL изображения' },
    { key: 'imageAlt', label: 'Alt изображения' }, { key: 'sourceUrl', label: 'Источник' },
  ],
  route: [
    { key: 'title', label: 'Название маршрута' }, { key: 'description', label: 'Описание', multiline: true, lines: 3 },
    { key: 'duration', label: 'Продолжительность' }, { key: 'distance', label: 'Расстояние' },
    { key: 'stops', label: 'Остановки (каждая с новой строки)', multiline: true, lines: 3 },
    { key: 'imageUrl', label: 'URL изображения' }, { key: 'sourceUrl', label: 'Источник' },
  ],
  faq: [
    { key: 'question', label: 'Вопрос' }, { key: 'answer', label: 'Ответ', multiline: true, lines: 4 },
    { key: 'sourceUrl', label: 'Источник ответа' },
  ],
  media: [
    { key: 'url', label: 'URL фотографии' }, { key: 'alt', label: 'Alt-текст' },
    { key: 'caption', label: 'Подпись' }, { key: 'credit', label: 'Автор / правообладатель' }, { key: 'sourceUrl', label: 'Источник / страница лицензии' },
  ],
  source: [
    { key: 'title', label: 'Название источника' }, { key: 'url', label: 'URL источника' }, { key: 'checkedAt', label: 'Дата проверки (YYYY-MM-DD)' },
  ],
};

function ItemsListEditor({ kind, label, value, onChange, hint }: { kind: EditorKind; label: string; value: unknown[]; onChange: (value: unknown[]) => void; hint?: string }) {
  const fields = EDITOR_FIELDS[kind];
  function update(index: number, key: string, raw: string) {
    const next = value.map((item, i) => i === index ? { ...((item || {}) as Record<string, unknown>), [key]: key === 'stops' ? raw.split('\n').map((part) => part.trim()).filter(Boolean) : raw } : item);
    onChange(next);
  }
  function add() {
    const initial: Record<string, unknown> = {};
    for (const field of fields) initial[field.key] = field.key === 'stops' ? [] : '';
    onChange([...value, initial]);
  }
  return <section className="space-y-3 rounded-lg border border-slate-200 p-3">
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold text-slate-900">{label} <span className="font-normal text-slate-400">({value.length})</span></h4><button type="button" onClick={add} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">+ Добавить</button></div>
    {hint ? <p className="text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    {value.length ? <div className="space-y-3">{value.map((item, index) => <div key={index} className="rounded-md bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-600">Запись {index + 1}</span><button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} className="text-xs text-red-700 hover:underline">Удалить</button></div>
      <div className="grid gap-2 sm:grid-cols-2">{fields.map((field) => {
        const record = (item || {}) as Record<string, unknown>;
        const current = field.key === 'stops' ? Array.isArray(record.stops) ? record.stops.join('\n') : '' : String(record[field.key] ?? '');
        return <Field key={field.key} label={field.label}>{field.multiline ? <textarea rows={field.lines || 2} value={current} onChange={(e) => update(index, field.key, e.target.value)} className={inputClass} /> : <input value={current} onChange={(e) => update(index, field.key, e.target.value)} className={inputClass} />}</Field>;
      })}</div>
    </div>)}</div> : <p className="rounded-md bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">Пока нет записей. Добавьте первую.</p>}
  </section>;
}

function StatusBadge({ status }: { status: DestinationPdpStatus }) {
  const tones: Record<DestinationPdpStatus, string> = { DRAFT: 'bg-slate-100 text-slate-700', REVIEW: 'bg-amber-100 text-amber-800', READY: 'bg-blue-100 text-blue-800', PUBLISHED: 'bg-emerald-100 text-emerald-800', HIDDEN: 'bg-red-100 text-red-800' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[status]}`}>{statusLabel(status)}</span>;
}

function statusLabel(status: DestinationPdpStatus) {
  return ({ DRAFT: 'Черновик', REVIEW: 'На проверке', READY: 'Готова', PUBLISHED: 'Опубликована', HIDDEN: 'Скрыта' } as const)[status];
}

const inputClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400';
const primaryButton = 'rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

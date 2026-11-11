'use client';

import * as React from 'react';
import Link from 'next/link';
import { PlaceClassificationFields } from '@/components/admin/PlaceClassificationFields.client';
import { PDP_SECTION_EDITOR_SCHEMA, pdpSectionRequirement, pdpSubtypeContentHint } from '@daibilet/contracts/place-pdp';
import { useUserAuth } from '@/hooks/useUserAuth';

type Workspace = {
  venues: Array<Record<string, unknown> & { supplierId: string; supplierTitle: string; editable: boolean; suggestedVariant: string; pdpStatus: string | null }>;
  cities: Array<{ id: string; title: string }>;
  suppliers: Array<{ id: string; title: string; role: string; canSubmit: boolean }>;
  requests: Array<Record<string, unknown>>;
};


export function SupplierPlacesWorkbench() {
  const { token, isLoggedIn, isLoading } = useUserAuth();
  const [workspace, setWorkspace] = React.useState<Workspace | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [venueId, setVenueId] = React.useState('');
  const [supplierId, setSupplierId] = React.useState('');
  const [type, setType] = React.useState<'CREATE' | 'UPDATE'>('CREATE');
  const [candidate, setCandidate] = React.useState({ title: '', cityId: '', address: '', placeType: 'MUSEUM', placeSubtype: '', description: '', websiteUrl: '', phone: '', openingHours: '', sourceUrl: '', imageUrl: '', imageRights: '', latitude: '', longitude: '' });
  const [fields, setFields] = React.useState({ title: '', address: '', latitude: '', longitude: '', placeType: '', placeSubtype: '', websiteUrl: '', phone: '', openingHours: '', shortDescription: '', description: '', metroStation: '', wayToFind: '', parkingInfo: '' });
  const [pdpContent, setPdpContent] = React.useState<{ summary: string; sections: Array<{ id: string; kind: string; title: string; body: string }> } | null>(null);

  const load = React.useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/supplier/places', { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setWorkspace(payload);
      const firstSupplier = payload.suppliers?.[0]?.id || '';
      setSupplierId((current) => current || firstSupplier);
      setVenueId((current) => current || payload.venues?.[0]?.venueId || '');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось загрузить данные'); }
    finally { setLoading(false); }
  }, [token]);

  React.useEffect(() => { if (token) void load(); else if (!isLoading) setLoading(false); }, [token, isLoading, load]);

  React.useEffect(() => {
    const selected = workspace?.venues.find((row) => row.venueId === venueId);
    const content = selected?.pdpContent as { summary?: string; sections?: Array<{ id?: string; kind?: string; title?: string; body?: string }> } | null | undefined;
    setPdpContent(content ? {
      summary: String(content.summary || ''),
      sections: Array.isArray(content.sections) ? content.sections.map((section) => ({ id: String(section.id || section.kind || ''), kind: String(section.kind || ''), title: String(section.title || ''), body: String(section.body || '') })) : [],
    } : null);
  }, [workspace, venueId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (!token || !supplierId) { setError('Нет активной связи кабинета с поставщиком. Обратитесь к оператору Daibilet.'); return; }
    const selected = workspace?.venues.find((row) => row.venueId === venueId);
    const originalContent = selected?.pdpContent as { summary?: string; sections?: Array<{ id?: string; kind?: string; title?: string; body?: string }> } | null | undefined;
    const originalProjection = originalContent ? {
      summary: String(originalContent.summary || ''),
      sections: Array.isArray(originalContent.sections) ? originalContent.sections.map((section) => ({ id: String(section.id || section.kind || ''), kind: String(section.kind || ''), title: String(section.title || ''), body: String(section.body || '') })) : [],
    } : null;
    const pdpChanged = pdpContent && JSON.stringify(pdpContent) !== JSON.stringify(originalProjection);
    const body = type === 'CREATE'
      ? { type, supplierId, candidate: { ...candidate, latitude: candidate.latitude || null, longitude: candidate.longitude || null } }
      : { type, supplierId, venueId, fields: Object.fromEntries(Object.entries(fields).filter(([, value]) => value.trim())), ...(pdpChanged ? { pdpContent } : {}) };
    try {
      const response = await fetch('/api/supplier/place-requests', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setMessage(`Заявка ${payload.id} отправлена редакции. Публичная страница не менялась.`);
      setCandidate({ title: '', cityId: '', address: '', placeType: 'MUSEUM', placeSubtype: '', description: '', websiteUrl: '', phone: '', openingHours: '', sourceUrl: '', imageUrl: '', imageRights: '', latitude: '', longitude: '' });
      setFields({ title: '', address: '', latitude: '', longitude: '', placeType: '', placeSubtype: '', websiteUrl: '', phone: '', openingHours: '', shortDescription: '', description: '', metroStation: '', wayToFind: '', parkingInfo: '' });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось отправить заявку'); }
  }

  if (isLoading || loading) return <div className="mx-auto max-w-5xl p-6 text-sm text-slate-600">Загружаем места поставщика…</div>;
  if (!isLoggedIn) return <section className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-semibold">Места поставщика</h1><p className="mt-3 text-slate-600">Войдите в личный кабинет по приглашению, чтобы просматривать связанные места и отправлять предложения.</p><Link className="mt-4 inline-block text-blue-700 underline" href="/login?returnUrl=%2Fsupplier%2Fplaces">Войти</Link></section>;
  if (!workspace) return <div className="mx-auto max-w-5xl p-6 text-red-700">{error || 'Не удалось загрузить кабинет.'}</div>;

  const linked = workspace.venues.filter((row) => row.editable && row.supplierId === supplierId);
  const selectedLinked = linked.find((place) => place.venueId === venueId);
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
    <header><h1 className="text-2xl font-semibold text-slate-950">Места и страницы</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Здесь можно предложить новое место или изменение связанного места. Публикация, тип страницы и SEO остаются за редакцией Daibilet.</p></header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
    {!workspace.suppliers.length && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Для этого аккаунта пока не назначена компания-поставщик. Доступ выдаётся оператором по приглашению.</div>}
    <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-lg font-semibold">Связанные места</h2>
      {workspace.venues.length ? <ul className="mt-3 divide-y divide-slate-100">{workspace.venues.map((place) => <li key={`${place.supplierId}-${place.venueId}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span><strong>{String(place.title || 'Место')}</strong><span className="ml-2 text-slate-500">{String(place.city || 'Город не указан')} · PDP: {String(place.suggestedVariant)} · {pdpStatusLabel(place.pdpStatus)}</span></span><span className="text-slate-500">{place.editable ? 'Можно предложить изменение' : 'Просмотр'}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-600">Связанных мест пока нет. Новое место можно предложить ниже.</p>}
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-lg font-semibold">Мои заявки</h2>{workspace.requests.length ? <ul className="mt-3 divide-y divide-slate-100">{workspace.requests.map((request) => <li key={String(request.id)} className="py-3 text-sm"><strong>{String(request.title)}</strong><span className="ml-2 rounded bg-slate-100 px-2 py-1">{request.rolledBack ? 'Откат редакции' : String(request.status)}</span>{request.adminComment ? <p className="mt-1 text-slate-600">Комментарий редакции: {String(request.adminComment)}</p> : null}</li>)}</ul> : <p className="mt-3 text-sm text-slate-600">Заявок пока нет.</p>}</section>
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Предложить изменение или новое место</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Тип заявки"><select className={control} value={type} onChange={(event) => setType(event.target.value as 'CREATE' | 'UPDATE')}><option value="CREATE">Новое место</option><option value="UPDATE" disabled={!linked.length}>Изменение связанного места</option></select></Field>
        <Field label="Компания"><select className={control} value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setVenueId(''); }}>{workspace.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.title} · {supplier.role}</option>)}</select></Field>
        {type === 'UPDATE' && <Field label="Место"><select className={control} value={venueId} onChange={(event) => setVenueId(event.target.value)}>{linked.map((place) => <option key={String(place.venueId)} value={String(place.venueId)}>{String(place.title)}</option>)}</select></Field>}
      </div>
      {type === 'CREATE' ? <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Название" required value={candidate.title} onChange={(title) => setCandidate({ ...candidate, title })}/>
        <Field label="Город"><select required className={control} value={candidate.cityId} onChange={(event) => setCandidate({ ...candidate, cityId: event.target.value })}><option value="">Выберите существующий город</option>{workspace.cities.map((city) => <option key={city.id} value={city.id}>{city.title}</option>)}</select></Field>
        <TextField label="Адрес" required value={candidate.address} onChange={(address) => setCandidate({ ...candidate, address })}/>
        <PlaceClassificationFields typeLabel="Предлагаемый тип" typePlaceholder="Выберите тип" subtypeLabel="Предлагаемый подтип" placeType={candidate.placeType} placeSubtype={candidate.placeSubtype} onChange={(value) => setCandidate({ ...candidate, ...value })} />
        <TextField label="Телефон" value={candidate.phone} onChange={(phone) => setCandidate({ ...candidate, phone })}/>
        <TextField label="Часы работы" value={candidate.openingHours} onChange={(openingHours) => setCandidate({ ...candidate, openingHours })}/>
        <TextField label="Сайт / источник фактов" value={candidate.sourceUrl} onChange={(sourceUrl) => setCandidate({ ...candidate, sourceUrl })}/>
        <TextField label="Ссылка на сайт места" value={candidate.websiteUrl} onChange={(websiteUrl) => setCandidate({ ...candidate, websiteUrl })}/>
        <TextField label="Ссылка на изображение" value={candidate.imageUrl} onChange={(imageUrl) => setCandidate({ ...candidate, imageUrl })}/>
        <TextField label="Источник и права на изображение" value={candidate.imageRights} onChange={(imageRights) => setCandidate({ ...candidate, imageRights })}/>
        <TextField label="Широта" value={candidate.latitude} onChange={(latitude) => setCandidate({ ...candidate, latitude })}/>
        <TextField label="Долгота" value={candidate.longitude} onChange={(longitude) => setCandidate({ ...candidate, longitude })}/>
        <TextField label="Краткое описание" multiline value={candidate.description} onChange={(description) => setCandidate({ ...candidate, description })}/>
      </div> : <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Предлагаемое название" value={fields.title} onChange={(title) => setFields({ ...fields, title })}/>
        <TextField label="Предлагаемый адрес" value={fields.address} onChange={(address) => setFields({ ...fields, address })}/>
        <PlaceClassificationFields typeLabel="Предлагаемый тип" typePlaceholder="Не менять тип" subtypeLabel="Предлагаемый подтип" placeType={fields.placeType} placeSubtype={fields.placeSubtype} suggestionPlaceType={String(selectedLinked?.placeType || '')} onChange={(value) => setFields({ ...fields, ...value })} />
        <TextField label="Широта" value={fields.latitude} onChange={(latitude) => setFields({ ...fields, latitude })}/>
        <TextField label="Долгота" value={fields.longitude} onChange={(longitude) => setFields({ ...fields, longitude })}/>
        {(['websiteUrl', 'phone', 'openingHours', 'shortDescription', 'description', 'metroStation', 'wayToFind', 'parkingInfo'] as const).map((key) => <TextField key={key} label={{ websiteUrl: 'Сайт', phone: 'Телефон', openingHours: 'Часы работы', shortDescription: 'Краткое описание', description: 'Описание', metroStation: 'Метро', wayToFind: 'Как найти', parkingInfo: 'Парковка' }[key]} multiline={key === 'description' || key === 'wayToFind' || key === 'openingHours'} value={fields[key]} onChange={(value) => setFields({ ...fields, [key]: value })}/>)}
        {pdpContent && <div className="space-y-3 rounded-lg border border-slate-200 p-3 sm:col-span-2"><div><h3 className="text-sm font-medium text-slate-900">Предложить правки текста PDP</h3><p className="mt-1 text-xs text-slate-500">Профиль: {String(selectedLinked?.suggestedVariant)}. Статус страницы: {pdpStatusLabel(selectedLinked?.pdpStatus)}. Поля соответствуют разделам шаблона. Предложение проверит редакция; страница не публикуется автоматически.</p></div>
          <TextField label="Краткое описание страницы" multiline value={pdpContent.summary} onChange={(summary) => setPdpContent({ ...pdpContent, summary })}/>
          {pdpContent.sections.map((section, index) => {
            const profile = String(selectedLinked?.suggestedVariant || '');
            const requirement = pdpSectionRequirement(profile, section.kind);
            const subtypeHint = pdpSubtypeContentHint(String(selectedLinked?.placeType || ''), String(selectedLinked?.placeSubtype || ''), section.kind);
            return <div key={section.id || index} className="grid gap-2 rounded-md border border-slate-100 p-3 sm:grid-cols-[minmax(150px,0.4fr)_1fr]">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 sm:col-span-2">{section.title || PDP_SECTION_EDITOR_SCHEMA[section.kind]?.bodyLabel || section.kind}{requirement ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">{requirement === 'core' ? 'Основной блок' : 'По ситуации'}</span> : null}</div>
              <TextField label={`Заголовок · ${PDP_SECTION_EDITOR_SCHEMA[section.kind]?.bodyLabel || section.kind}`} value={section.title} onChange={(title) => setPdpContent({ ...pdpContent, sections: pdpContent.sections.map((item, itemIndex) => itemIndex === index ? { ...item, title } : item) })}/>
              <TextField label={PDP_SECTION_EDITOR_SCHEMA[section.kind]?.bodyLabel || 'Текст раздела'} multiline value={section.body} onChange={(body) => setPdpContent({ ...pdpContent, sections: pdpContent.sections.map((item, itemIndex) => itemIndex === index ? { ...item, body } : item) })}/>
              {PDP_SECTION_EDITOR_SCHEMA[section.kind]?.bodyHint ? <p className="text-xs text-slate-500 sm:col-span-2">{PDP_SECTION_EDITOR_SCHEMA[section.kind].bodyHint}</p> : null}
              {requirement === 'conditional' ? <p className="text-xs text-slate-500 sm:col-span-2">Заполняйте блок только при наличии подтверждённых сведений; редактор может оставить его пустым.</p> : null}
              {subtypeHint ? <p className="rounded bg-violet-50 p-2 text-xs text-violet-900 sm:col-span-2">Подтип «{String(selectedLinked?.placeSubtype)}»: {subtypeHint}</p> : null}
            </div>;
          })}
        </div>}
      </div>}
      <p className="text-xs text-slate-500">Отправка создаёт заявку на проверку. Она не изменяет опубликованную PDP, публичный URL или индексируемость.</p>
      <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={!supplierId || !workspace.suppliers.find((supplier) => supplier.id === supplierId)?.canSubmit}>Отправить редакции</button>
    </form>
  </main>;
}

const control = 'mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm';
function pdpStatusLabel(status: unknown) {
  if (status === 'READY') return 'опубликована';
  if (status === 'REVIEW') return 'на проверке';
  if (status === 'DRAFT') return 'черновик';
  return 'страница ещё не создана';
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs text-slate-600">{label}{children}</label>; }
function TextField({ label, value, onChange, multiline = false, required = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; required?: boolean }) { return <label className="block text-xs text-slate-600">{label}{multiline ? <textarea required={required} className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}/> : <input required={required} className={control} value={value} onChange={(event) => onChange(event.target.value)}/>}</label>; }

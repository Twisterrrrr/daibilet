'use client';

import * as React from 'react';
import type { AdminPdpDocument } from '@/server/admin-pdp-data';
import { saveAdminPdpAction } from '@/server/admin-pdp-actions';
import type { PublicPdpDocumentDto } from '@daibilet/contracts/public';
import { VenuePdpContent } from '@/components/VenuePdpContent.client';

type GalleryImage = { url: string; alt: string; caption: string; credit: string };
type Fact = { label: string; value: string; sourceUrl: string; verifiedAt: string };
type SectionItem = { title: string; description: string; imageUrl: string; linkUrl: string; meta: string; sourceUrl: string; details: Array<{ label: string; value: string }> };
type Section = { id: string; kind: string; title: string; body: string; items: SectionItem[] };
type Source = { title: string; url: string; checkedAt: string };
type Conversion = { mode: string; primaryAction: string; label: string; targetEventId: string; externalUrl: string };
type Content = { summary: string; conversion: Conversion; gallery: GalleryImage[]; facts: Fact[]; sections: Section[]; sources: Source[] };
type Document = AdminPdpDocument;

function Button({ children, variant: _variant, size: _size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) {
  return <button {...props} className={`rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}`}>{children}</button>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground ${props.className || ''}`} />;
}

const labels: Record<string, string> = {
  museum: 'Музей', theater: 'Театр', concert_hall: 'Концертный зал', club: 'Клуб', pier: 'Причал',
  landmark: 'Достопримечательность', nature: 'Природное место', urban_area: 'Городское пространство',
  food: 'Ресторан / гастро', attraction: 'Аттракцион', transport: 'Транспортный объект', park: 'Парк', space: 'Городское пространство с точками внутри', religion: 'Храм / религиозное место', sport: 'Спортивная площадка', venue: 'Другая площадка', event: 'Событие',
  about: 'О месте / событии', visit_facts: 'Важные факты', gallery: 'Галерея', exhibitions: 'Выставки', collection: 'Постоянная экспозиция',
  routes: 'Маршруты', audio_guide: 'Аудиогид', accessibility: 'Доступность', location: 'Как добраться', faq: 'Частые вопросы',
  halls: 'Залы', repertoire_guide: 'Репертуар', seating: 'Места и схема зала', acoustics: 'Акустика', subscriptions: 'Абонементы',
  atmosphere: 'Атмосфера', entry_rules: 'Правила входа', spaces: 'Пространства', boarding: 'Посадка', fleet: 'Флот',
  weather_policy: 'Погодные условия', history: 'История', highlights: 'Главное', visit_route: 'Маршрут осмотра',
  trails: 'Тропы', seasonality: 'Сезонность', safety: 'Безопасность', walking_routes: 'Прогулки', menu: 'Меню',
  booking: 'Бронирование', zones: 'Зоны', visit_routes: 'Маршруты посещения', schedule_notes: 'Особенности расписания',
  chef: 'Шеф-повар', dining_events: 'Гастроужины', reasons_to_visit: 'За что сюда идут',
  program: 'Программа', participants: 'Участники', ticket_notes: 'Условия билета', ticket_guide: 'Билеты и посещение', equipment: 'Оборудование',
  custom: 'Дополнительный блок',
  shows: 'Шоу', feeding_schedule: 'Показательные кормления', stations: 'Станции', destination: 'На месте назначения', alternatives: 'Другие способы добраться',
  map: 'Карта территории', tours: 'Экскурсии', rentals: 'Прокат', food_spots: 'Где поесть', activities: 'Что можно сделать', places_inside: 'Точки внутри',
  upcoming_events: 'Ближайшие матчи и события', services: 'Услуги и события',
};

const conversionModes = [
  ['none', 'Без продажи'], ['admission', 'Входной билет'], ['events', 'Афиша событий'], ['departures', 'Отправления'],
  ['reservation', 'Бронирование'], ['tours', 'Экскурсии'], ['hybrid', 'Несколько сценариев'],
];
const actionOptions = [
  ['none', 'Нет CTA'], ['buy_ticket', 'Купить билет'], ['view_events', 'Смотреть события'],
  ['view_departures', 'Смотреть отправления'], ['book_table', 'Забронировать стол'], ['view_tours', 'Смотреть экскурсии'],
];
const defaultActionByMode: Record<string, string> = {
  none: 'none', admission: 'buy_ticket', events: 'view_events', departures: 'view_departures',
  reservation: 'book_table', tours: 'view_tours', hybrid: 'buy_ticket',
};

const emptyImage = (): GalleryImage => ({ url: '', alt: '', caption: '', credit: '' });
const emptyFact = (): Fact => ({ label: '', value: '', sourceUrl: '', verifiedAt: '' });
const emptyItem = (): SectionItem => ({ title: '', description: '', imageUrl: '', linkUrl: '', meta: '', sourceUrl: '', details: [] });
const emptySource = (): Source => ({ title: '', url: '', checkedAt: '' });
const emptySection = (kind: string): Section => ({ id: kind, kind, title: labels[kind] || kind, body: '', items: [] });
const emptyDocument = (variant: string, kinds: string[]): Document => ({
  variant, status: 'DRAFT', content: { summary: '', conversion: { mode: 'none', primaryAction: 'none', label: '', targetEventId: '', externalUrl: '' }, gallery: [], facts: [], sections: kinds.map(emptySection), sources: [] },
});

function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return <label className="block text-xs text-muted-foreground">{label}
    {multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
      : <Input className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} />}
  </label>;
}

export function AdminPdpEditor({ entity, entityId, entitySlug, variants, initialDocument, initialVariant, initialError, saveDocument, heading = 'Редакционный PDP', saveButtonLabel = 'Сохранить PDP' }: {
  entity: 'venues' | 'events';
  entityId: string;
  entitySlug: string;
  variants: Record<string, string[]>;
  initialDocument: AdminPdpDocument | null;
  initialVariant: string;
  initialError: string | null;
  saveDocument?: (document: AdminPdpDocument) => Promise<AdminPdpDocument>;
  heading?: string;
  saveButtonLabel?: string;
}) {
  const [document, setDocument] = React.useState<Document | null>(() => initialDocument || emptyDocument(initialVariant, variants[initialVariant] || []));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(initialError || '');
  const [message, setMessage] = React.useState('');
  const [jsonOpen, setJsonOpen] = React.useState(false);
  const [jsonDraft, setJsonDraft] = React.useState('');
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewDevice, setPreviewDevice] = React.useState<'desktop' | 'mobile'>('desktop');

  function changeContent(next: Content) { setDocument((current) => current ? { ...current, content: next } : current); setMessage(''); }
  function addCustomSection() {
    const section: Section = { id: `custom-${crypto.randomUUID()}`, kind: 'custom', title: 'Новый раздел', body: '', items: [] };
    const firstNonDescription = content.sections.findIndex((item) => item.kind !== 'about');
    const lastCustom = content.sections.reduce((last, item, index) => item.kind === 'custom' ? index : last, -1);
    const insertionIndex = lastCustom >= 0 ? lastCustom + 1 : firstNonDescription >= 0 ? firstNonDescription : content.sections.length;
    const sections = [...content.sections];
    sections.splice(insertionIndex, 0, section);
    changeContent({ ...content, sections });
  }
  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (index === 0 || target < 1 || target >= content.sections.length) return;
    const sections = [...content.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    changeContent({ ...content, sections });
  }
  function changeVariant(variant: string) {
    setDocument((current) => current ? { ...current, variant, content: {
      ...current.content,
      sections: (variants[variant] || []).map((kind) => current.content.sections.find((section) => section.kind === kind) || emptySection(kind)),
    } } : current);
    setMessage('');
  }
  function openJson() {
    if (!document) return;
    setJsonDraft(JSON.stringify({ variant: document.variant, status: document.status, content: document.content }, null, 2));
    setJsonOpen(true);
    setError('');
  }
  function applyJson() {
    try {
      const parsed = JSON.parse(jsonDraft) as Document;
      if (!parsed || typeof parsed !== 'object' || !parsed.content || !Array.isArray(parsed.content.sections) || !Array.isArray(parsed.content.gallery) || !Array.isArray(parsed.content.facts) || !Array.isArray(parsed.content.sources)
        || !parsed.content.sections.every((section) => section && Array.isArray(section.items) && section.items.every((item) => item && Array.isArray(item.details)))) {
        throw new Error('Нужен полный документ с content.sections, gallery, facts и sources');
      }
      if (!variants[parsed.variant] || (entity === 'events') !== (parsed.variant === 'event')) throw new Error('Неверный сценарий PDP');
      parsed.content.conversion ||= { mode: 'none', primaryAction: 'none', label: '', targetEventId: '', externalUrl: '' };
      setDocument(parsed);
      setJsonOpen(false);
      setMessage(`JSON загружен в редактор. Нажми «${saveButtonLabel}», чтобы записать его в базу.`);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }
  async function save() {
    if (!document) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const saved = saveDocument
        ? await saveDocument(document)
        : await saveAdminPdpAction(entity, entityId, entitySlug, document);
      setDocument(saved);
      setMessage(saveDocument
        ? 'Черновик EventPage сохранён. Публичные URL и индексация не изменены.'
        : saved.status === 'READY'
          ? 'Текст PDP опубликован. Сценарий CTA сохранён как настройка, но покупка и бронирование ещё не подключены.'
          : 'Редакционный контент сохранён; публичная страница его пока не показывает.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSaving(false); }
  }

  if (initialError) {
    return <section className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <h3 className="font-semibold">Редакционный PDP недоступен</h3>
      <p className="mt-1">{initialError}</p>
      <p className="mt-1 text-xs">Форма отключена, чтобы пустые данные не перезаписали существующий контент.</p>
    </section>;
  }
  if (!document) return <div className="mt-4 text-sm text-destructive">{error || 'PDP недоступен'}</div>;
  const content = document.content;
  return <div className="mt-5 space-y-5 rounded-lg border border-border p-4">
    <div><h3 className="text-base font-semibold">{heading}</h3><p className="mt-1 text-xs text-muted-foreground">Текст и практические сведения редактируются отдельно. Цены, сеансы и наличие билетов берутся из каталожных данных.</p></div>
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={() => jsonOpen ? setJsonOpen(false) : openJson()}>{jsonOpen ? 'Закрыть JSON' : 'Импорт / экспорт JSON'}</Button>
      {jsonOpen ? <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Скопируй документ для Cline или вставь подготовленный JSON. Применение заполняет форму; сохранение в базу — отдельной кнопкой внизу.</p>
        <textarea aria-label="JSON документа PDP" value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} className="min-h-72 w-full rounded-md border border-input bg-background p-3 font-mono text-xs text-foreground" />
        <Button type="button" variant="outline" size="sm" onClick={applyJson}>Применить JSON к форме</Button>
      </div> : null}
    </div>
    <section className="rounded-md border border-indigo-200 bg-indigo-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h4 className="text-sm font-semibold">Предпросмотр публичной страницы</h4><p className="mt-1 text-xs text-muted-foreground">Используется тот же компонент, что и на сайте. Черновик виден здесь, но публично показывается только после статуса «Готово».</p></div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPreviewDevice('desktop')} aria-pressed={previewDevice === 'desktop'}>Компьютер</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPreviewDevice('mobile')} aria-pressed={previewDevice === 'mobile'}>Телефон</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen((open) => !open)}>{previewOpen ? 'Скрыть' : 'Открыть'}</Button>
        </div>
      </div>
      {previewOpen ? <div className={`mx-auto mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white ${previewDevice === 'mobile' ? 'max-w-[390px]' : 'max-w-5xl'}`}>
        <div className="border-b bg-slate-50 px-3 py-2 text-xs text-slate-600">Предпросмотр: {previewDevice === 'mobile' ? 'мобильный экран' : 'широкий экран'} · состояние {document.status === 'READY' ? (saveDocument ? 'готово к проверке, публично не включено' : 'опубликовано') : 'черновик'}</div>
        <div className="max-h-[70vh] overflow-y-auto px-4 sm:px-6">
          <VenuePdpContent document={{ variant: document.variant, content: content as PublicPdpDocumentDto['content'] }} />
          {entity === 'events' && saveDocument ? <section className="mt-8 max-w-4xl border-t border-dashed border-slate-300 pt-5" data-pdp-section="practical-info-preview">
            <h2 className="font-display text-xl font-bold text-slate-900">Практическая информация</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Системный блок после редакционных разделов. При публичном подключении будет собираться из актуальных данных площадки, расписания и билетов. Даты и цены здесь вручную не дублируются.</p>
          </section> : null}
        </div>
      </div> : null}
    </section>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-muted-foreground">Сценарий PDP
        <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={document.variant} onChange={(event) => changeVariant(event.target.value)}>
          {Object.keys(variants).filter((variant) => entity === 'events' ? variant === 'event' : variant !== 'event').map((variant) => <option key={variant} value={variant}>{labels[variant] || variant}</option>)}
        </select>
      </label>
      <label className="text-xs text-muted-foreground">Статус контента
        <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={document.status} onChange={(event) => setDocument({ ...document, status: event.target.value as Document['status'] })}>
          <option value="DRAFT">Черновик</option><option value="REVIEW">На проверке</option><option value="READY">Готово</option>
        </select>
      </label>
    </div>
    <Field label="Краткая редакционная подводка" value={content.summary} onChange={(summary) => changeContent({ ...content, summary })} multiline />
    <section className="space-y-3 rounded-md border p-3"><h4 className="text-sm font-semibold">Покупка и бронирование</h4>
      <p className="text-xs text-muted-foreground">Здесь хранится намерение для будущего CTA. Кнопки покупки и бронирования пока не подключены; цены и наличие должны поступать только из активного предложения.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Сценарий
          <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={content.conversion?.mode || 'none'} onChange={(event) => changeContent({ ...content, conversion: { ...content.conversion, mode: event.target.value, primaryAction: defaultActionByMode[event.target.value] } })}>
            {conversionModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Главное действие
          <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={content.conversion?.primaryAction || 'none'} onChange={(event) => changeContent({ ...content, conversion: { ...content.conversion, primaryAction: event.target.value, mode: event.target.value === 'none' ? 'none' : !content.conversion?.mode || content.conversion.mode === 'none' ? 'hybrid' : content.conversion.mode } })}>
            {actionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Подпись CTA (необязательно)" value={content.conversion?.label || ''} onChange={(label) => changeContent({ ...content, conversion: { ...content.conversion, label } })} />
        <Field label="ID связанного события (если действие ведёт к нему)" value={content.conversion?.targetEventId || ''} onChange={(targetEventId) => changeContent({ ...content, conversion: { ...content.conversion, targetEventId } })} />
        <Field label="Внешняя ссылка бронирования (только если нужна)" value={content.conversion?.externalUrl || ''} onChange={(externalUrl) => changeContent({ ...content, conversion: { ...content.conversion, externalUrl } })} />
      </div>
    </section>
    <section className="space-y-3"><h4 className="text-sm font-semibold">Факты</h4>
      {content.facts.map((fact, index) => <div key={index} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
        <Field label="Название" value={fact.label} onChange={(label) => changeContent({ ...content, facts: content.facts.map((item, i) => i === index ? { ...item, label } : item) })} />
        <Field label="Значение" value={fact.value} onChange={(value) => changeContent({ ...content, facts: content.facts.map((item, i) => i === index ? { ...item, value } : item) })} />
        <Field label="Источник URL" value={fact.sourceUrl} onChange={(sourceUrl) => changeContent({ ...content, facts: content.facts.map((item, i) => i === index ? { ...item, sourceUrl } : item) })} />
        <Field label="Проверено (ГГГГ-ММ-ДД)" value={fact.verifiedAt} onChange={(verifiedAt) => changeContent({ ...content, facts: content.facts.map((item, i) => i === index ? { ...item, verifiedAt } : item) })} />
        <Button type="button" variant="outline" size="sm" onClick={() => changeContent({ ...content, facts: content.facts.filter((_, i) => i !== index) })}>Удалить факт</Button>
      </div>)}
      <Button type="button" variant="outline" size="sm" onClick={() => changeContent({ ...content, facts: [...content.facts, emptyFact()] })}>Добавить факт</Button>
    </section>
    <section className="space-y-3"><h4 className="text-sm font-semibold">Галерея</h4>
      {content.gallery.map((image, index) => <div key={index} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
        {(['url', 'alt', 'caption', 'credit'] as const).map((key) => <Field key={key} label={key} value={image[key]} onChange={(value) => changeContent({ ...content, gallery: content.gallery.map((item, i) => i === index ? { ...item, [key]: value } : item) })} />)}
        <Button type="button" variant="outline" size="sm" onClick={() => changeContent({ ...content, gallery: content.gallery.filter((_, i) => i !== index) })}>Удалить фото</Button>
      </div>)}
      <Button type="button" variant="outline" size="sm" onClick={() => changeContent({ ...content, gallery: [...content.gallery, emptyImage()] })}>Добавить фото</Button>
    </section>
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Разделы сценария</h4>
          {entity === 'events' && saveDocument ? <p className="mt-1 text-xs text-muted-foreground">Контекстные блоки идут после описания и перед системной практической информацией.</p> : null}
        </div>
        {entity === 'events' && saveDocument ? <Button type="button" variant="outline" size="sm" onClick={addCustomSection}>Добавить контекстный блок</Button> : null}
      </div>
      {content.sections.map((section, index) => <details key={section.id} className="rounded-md border p-3" open={Boolean(section.body || section.items.length)}>
        <summary className="cursor-pointer text-sm font-medium">{section.kind === 'custom' ? section.title || labels.custom : labels[section.kind] || section.kind} {section.body || section.items.length ? '●' : ''}</summary>
        <div className="mt-3 space-y-3">
          {section.kind === 'custom' ? <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={index <= 1} onClick={() => moveSection(index, -1)}>Выше</Button>
            <Button type="button" variant="outline" size="sm" disabled={index === content.sections.length - 1} onClick={() => moveSection(index, 1)}>Ниже</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => changeContent({ ...content, sections: content.sections.filter((_, i) => i !== index) })}>Удалить блок</Button>
          </div> : null}
          <Field label={section.kind === 'custom' ? 'Заголовок H3' : 'Заголовок'} value={section.title} onChange={(title) => changeContent({ ...content, sections: content.sections.map((item, i) => i === index ? { ...item, title } : item) })} />
          <Field label={section.kind === 'custom' ? 'Текст блока' : 'Текст'} value={section.body} onChange={(body) => changeContent({ ...content, sections: content.sections.map((item, i) => i === index ? { ...item, body } : item) })} multiline />
          {section.items.map((item, itemIndex) => <div key={itemIndex} className="grid gap-2 rounded-md bg-secondary/40 p-3 sm:grid-cols-2">
            {(['title', 'description', 'imageUrl', 'linkUrl', 'meta', 'sourceUrl'] as const).map((key) => <Field key={key} label={key} value={item[key]} multiline={key === 'description'} onChange={(value) => changeContent({ ...content, sections: content.sections.map((entry, i) => i === index ? { ...entry, items: entry.items.map((card, j) => j === itemIndex ? { ...card, [key]: value } : card) } : entry) })} />)}
            {item.details.map((detail, detailIndex) => <div key={detailIndex} className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
              <Field label="Параметр" value={detail.label} onChange={(label) => changeContent({ ...content, sections: content.sections.map((entry, i) => i === index ? { ...entry, items: entry.items.map((card, j) => j === itemIndex ? { ...card, details: card.details.map((pair, k) => k === detailIndex ? { ...pair, label } : pair) } : card) } : entry) })} />
              <Field label="Значение" value={detail.value} onChange={(value) => changeContent({ ...content, sections: content.sections.map((entry, i) => i === index ? { ...entry, items: entry.items.map((card, j) => j === itemIndex ? { ...card, details: card.details.map((pair, k) => k === detailIndex ? { ...pair, value } : pair) } : card) } : entry) })} />
              <Button type="button" variant="outline" size="sm" onClick={() => changeContent({ ...content, sections: content.sections.map((entry, i) => i === index ? { ...entry, items: entry.items.map((card, j) => j === itemIndex ? { ...card, details: card.details.filter((_, k) => k !== detailIndex) } : card) } : entry) })}>Удалить параметр</Button>
            </div>)}
            <Button type="button" variant="outline" size="sm" onClick={() => changeContent({ ...content, sections: content.sections.map((entry, i) => i === index ? { ...entry, items: entry.items.map((card, j) => j === itemIndex ? { ...card, details: [...card.details, { label: '', value: '' }] } : card) } : entry) })}>Добавить параметр</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => changeContent({ ...content, sections: content.sections.map((entry, i) => i === index ? { ...entry, items: entry.items.filter((_, j) => j !== itemIndex) } : entry) })}>Удалить элемент</Button>
          </div>)}
          <Button type="button" variant="outline" size="sm" onClick={() => changeContent({ ...content, sections: content.sections.map((entry, i) => i === index ? { ...entry, items: [...entry.items, emptyItem()] } : entry) })}>Добавить элемент</Button>
        </div>
      </details>)}
    </section>
    <section className="space-y-3"><h4 className="text-sm font-semibold">Источники</h4>
      {content.sources.map((source, index) => <div key={index} className="grid gap-2 rounded-md border p-3 sm:grid-cols-3">
        {(['title', 'url', 'checkedAt'] as const).map((key) => <Field key={key} label={key} value={source[key]} onChange={(value) => changeContent({ ...content, sources: content.sources.map((item, i) => i === index ? { ...item, [key]: value } : item) })} />)}
        <Button type="button" variant="outline" size="sm" onClick={() => changeContent({ ...content, sources: content.sources.filter((_, i) => i !== index) })}>Удалить источник</Button>
      </div>)}
      <Button type="button" variant="outline" size="sm" onClick={() => changeContent({ ...content, sources: [...content.sources, emptySource()] })}>Добавить источник</Button>
    </section>
    {error ? <div className="text-sm text-destructive">{error}</div> : null}
    {message ? <div className="text-sm text-success">{message}</div> : null}
    <div className="flex items-center justify-between gap-3 border-t pt-3"><span className="text-xs text-muted-foreground">Версия {document.version || 0}</span><Button type="button" onClick={save} disabled={saving}>{saving ? 'Сохраняю…' : saveButtonLabel}</Button></div>
  </div>;
}

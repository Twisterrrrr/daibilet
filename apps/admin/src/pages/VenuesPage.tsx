import * as React from 'react';
import { Building2, Globe2, Image, Loader2, MapPin, Save, Search, Ticket } from 'lucide-react';

import { DataTableShell, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { adminData, formatDateTime, formatMoney, formatNumber } from '@/data';
import type { AdminVenueDetail, AdminVenueRow } from '@/types';

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';

type VenuesListResponse = {
  generatedAt: string;
  total: number;
  rows: AdminVenueRow[];
  metrics: {
    venues: number;
    candidates: number;
    published: number;
    withEvents: number;
  };
};

type VenueDraft = {
  title: string;
  shortDescription: string;
  description: string;
  heroImageUrl: string;
  seoH1: string;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  isIndexable: boolean;
  kind: string;
  pageStatus: string;
};

const kindOptions = [
  { value: 'VENUE', label: 'Площадка' },
  { value: 'MUSEUM_ART_SPACE', label: 'Музей / арт-пространство' },
  { value: 'THEATER', label: 'Театр' },
  { value: 'CONCERT_HALL', label: 'Концертный зал' },
  { value: 'CLUB_BAR_RESTAURANT', label: 'Клуб / ресторан' },
  { value: 'PIER', label: 'Причал' },
  { value: 'MEETING_POINT', label: 'Точка встречи' },
  { value: 'OUTDOOR_LOCATION', label: 'Открытая локация' },
  { value: 'SPORT_ACTIVITY_SPACE', label: 'Спорт / активность' },
  { value: 'ATTRACTION', label: 'Аттракцион' },
  { value: 'ONLINE', label: 'Онлайн' },
  { value: 'OTHER', label: 'Другое' },
];

const pageStatusOptions = [
  { value: 'NONE', label: 'Только локация' },
  { value: 'CANDIDATE', label: 'Кандидат' },
  { value: 'PUBLISHED', label: 'Страница опубликована' },
  { value: 'HIDDEN', label: 'Скрыть страницу' },
];

function buildLocalResponse(query = ''): VenuesListResponse {
  const q = query.trim().toLowerCase();
  const rows = adminData.venueRows.filter((venue) => {
    if (!q) return true;
    return [venue.name, venue.city, venue.address, venue.proposedKind, venue.pageStatus].filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  return {
    generatedAt: adminData.generatedAt,
    total: rows.length,
    rows: rows.slice(0, 120),
    metrics: {
      venues: adminData.metrics.venues,
      candidates: rows.filter((venue) => venue.pageStatus === 'candidate').length,
      published: rows.filter((venue) => venue.pageStatus === 'published').length,
      withEvents: rows.filter((venue) => venue.events > 0).length,
    },
  };
}

function normalizeStatus(status?: string | null) {
  return String(status || 'NONE').toUpperCase();
}

function statusBadge(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (normalized === 'PUBLISHED' || status === 'published') return <StatusBadge status="live" label="published" />;
  if (normalized === 'CANDIDATE' || status === 'candidate') return <StatusBadge status="incomplete" label="candidate" />;
  if (normalized === 'HIDDEN' || status === 'hidden') return <StatusBadge status="error" label="hidden" />;
  return <StatusBadge status="draft" label="location" />;
}

function kindLabel(kind?: string | null) {
  const normalized = String(kind || '').toUpperCase();
  return kindOptions.find((item) => item.value === normalized)?.label || String(kind || 'OTHER').toLowerCase();
}

function emptyDraft(venue?: AdminVenueDetail | null): VenueDraft {
  return {
    title: venue?.title || '',
    shortDescription: venue?.shortDescription || '',
    description: venue?.description || '',
    heroImageUrl: venue?.heroImageUrl || '',
    seoH1: venue?.seoH1 || '',
    seoTitle: venue?.seoTitle || '',
    seoDescription: venue?.seoDescription || '',
    canonicalPath: venue?.canonicalPath || '',
    isIndexable: venue?.isIndexable ?? true,
    kind: normalizeStatus(venue?.kind || 'OTHER'),
    pageStatus: normalizeStatus(venue?.pageStatus),
  };
}

function detailToRow(detail: AdminVenueDetail, previous?: AdminVenueRow): AdminVenueRow {
  return {
    ...(previous || {}),
    id: detail.id,
    name: detail.title,
    title: detail.title,
    slug: detail.slug,
    city: detail.city || previous?.city || 'Не указан',
    address: detail.address,
    latitude: detail.latitude,
    longitude: detail.longitude,
    description: detail.description,
    shortDescription: detail.shortDescription,
    heroImageUrl: detail.heroImageUrl,
    seoH1: detail.seoH1,
    seoTitle: detail.seoTitle,
    seoDescription: detail.seoDescription,
    canonicalPath: detail.canonicalPath,
    isIndexable: detail.isIndexable,
    kind: detail.kind,
    proposedKind: String(detail.kind || 'OTHER').toLowerCase(),
    pageStatus: String(detail.pageStatus || 'NONE').toLowerCase(),
    reason: detail.pageStatus === 'CANDIDATE' ? 'кандидат на public-страницу' : 'локация каталога',
    events: detail.events.length,
  };
}

export function VenuesPage() {
  const [query, setQuery] = React.useState('');
  const [familyFilter, setFamilyFilter] = React.useState<'all' | 'institution' | 'location'>('all');
  const [payload, setPayload] = React.useState<VenuesListResponse>(() => buildLocalResponse());
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = React.useState<AdminVenueRow | null>(null);
  const [venueDetail, setVenueDetail] = React.useState<AdminVenueDetail | null>(null);
  const [draft, setDraft] = React.useState<VenueDraft>(() => emptyDraft());
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: '160' });
    if (query.trim()) params.set('q', query.trim());
    if (familyFilter !== 'all') params.set('family', familyFilter);
    setIsLoading(true);

    fetch(`${API_BASE_URL}/api/admin/venues?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as VenuesListResponse;
      })
      .then((data) => {
        setPayload(data);
        setLoadError(null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPayload(buildLocalResponse(query));
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [query, familyFilter]);

  React.useEffect(() => {
    setDraft(emptyDraft(venueDetail));
  }, [venueDetail]);

  async function openVenue(venue: AdminVenueRow) {
    setSelectedVenue(venue);
    setVenueDetail(null);
    setSaveError(null);
    setIsDetailLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/venues/${encodeURIComponent(venue.id)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const detail = (await response.json()) as AdminVenueDetail | null;
      if (!detail) throw new Error('Площадка не найдена');
      setVenueDetail(detail);
      setSelectedVenue(detailToRow(detail, venue));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function saveVenue() {
    if (!venueDetail) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/venues/${encodeURIComponent(venueDetail.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const detail = (await response.json()) as AdminVenueDetail | null;
      if (!detail) throw new Error('Площадка не найдена');
      const nextRow = detailToRow(detail, selectedVenue || undefined);
      setVenueDetail(detail);
      setSelectedVenue(nextRow);
      setPayload((current) => ({
        ...current,
        rows: current.rows.map((row) => (row.id === nextRow.id ? nextRow : row)),
      }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Площадки" description="Карточки мест, причалов и точек встречи: типизация, SEO-страницы и привязанные события." />

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <MetricCard label="всего площадок" value={payload.metrics.venues || payload.total} />
        <MetricCard label="с событиями" value={payload.metrics.withEvents} />
        <MetricCard label="кандидаты" value={payload.metrics.candidates} />
        <MetricCard label="опубликованы" value={payload.metrics.published} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по площадке, городу, адресу или типу" className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            ['all', 'Все'],
            ['institution', 'Площадки'],
            ['location', 'Локации'],
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={familyFilter === value ? 'default' : 'outline'}
              onClick={() => setFamilyFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loadError ? <span>fallback: {loadError}</span> : <span>{formatNumber(payload.total)} найдено</span>}
        </div>
      </div>

      <DataTableShell columns={['Площадка', 'Город / адрес', 'Тип', 'События', 'Страница', 'Комментарий', '']}>
        {payload.rows.map((venue) => (
          <tr key={venue.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
            <td className="min-w-[280px] px-4 py-3 align-top">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium">{venue.name}</div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">{venue.id}</div>
                </div>
              </div>
            </td>
            <td className="min-w-[220px] px-4 py-3 align-top">
              <div className="text-sm">{venue.city}</div>
              <div className="mt-1 text-xs text-muted-foreground">{venue.address || '-'}</div>
            </td>
            <td className="px-4 py-3 align-top">
              <Badge variant="outline">{kindLabel(venue.kind || venue.proposedKind)}</Badge>
            </td>
            <td className="px-4 py-3 align-top text-sm">{formatNumber(venue.events)}</td>
            <td className="px-4 py-3 align-top">{statusBadge(venue.pageStatus)}</td>
            <td className="max-w-[360px] px-4 py-3 align-top text-xs text-muted-foreground">{venue.shortDescription || venue.reason || '-'}</td>
            <td className="px-4 py-3 align-top">
              <Button variant="outline" size="sm" onClick={() => openVenue(venue)}>
                Открыть
              </Button>
            </td>
          </tr>
        ))}
      </DataTableShell>

      <div className="hidden">
        {payload.rows.map((venue) => (
          <button key={venue.id} type="button" className="text-left" onClick={() => openVenue(venue)}>
            <Card className="h-full border-border p-4 transition hover:border-primary/40 hover:bg-secondary/20">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">{venue.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {venue.city}
                      {venue.address ? ` · ${venue.address}` : ''}
                    </p>
                  </div>
                </div>
                {statusBadge(venue.pageStatus)}
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Badge variant="outline">{kindLabel(venue.kind || venue.proposedKind)}</Badge>
                <Badge variant="outline">{formatNumber(venue.events)} событий</Badge>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{venue.shortDescription || venue.reason}</p>
            </Card>
          </button>
        ))}
      </div>

      <VenueSheet
        venue={selectedVenue}
        detail={venueDetail}
        draft={draft}
        isDetailLoading={isDetailLoading}
        isSaving={isSaving}
        saveError={saveError}
        onDraftChange={setDraft}
        onSave={saveVenue}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVenue(null);
            setVenueDetail(null);
            setSaveError(null);
          }
        }}
      />
    </div>
  );
}

function MetricCard(props: { label: string; value: number }) {
  return (
    <Card className="border-border p-4">
      <div className="text-2xl font-semibold">{formatNumber(props.value)}</div>
      <div className="text-xs text-muted-foreground">{props.label}</div>
    </Card>
  );
}

function VenueSheet(props: {
  venue: AdminVenueRow | null;
  detail: AdminVenueDetail | null;
  draft: VenueDraft;
  isDetailLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  onDraftChange: React.Dispatch<React.SetStateAction<VenueDraft>>;
  onSave: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { venue, detail, draft, isDetailLoading, isSaving, saveError, onDraftChange, onSave, onOpenChange } = props;
  const imageUrl = draft.heroImageUrl || detail?.heroImageUrl;

  return (
    <Sheet open={Boolean(venue)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[min(960px,96vw)] flex-col overflow-y-auto sm:max-w-[960px]">
        {venue ? (
          <div className="pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{venue.city}</Badge>
              {statusBadge(detail?.pageStatus || venue.pageStatus)}
              <Badge variant="outline">{kindLabel(detail?.kind || venue.kind || venue.proposedKind)}</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold leading-snug">{detail?.title || venue.name}</h2>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="font-mono">{venue.id}</span>
              {detail?.slug ? <span>{detail.slug}</span> : null}
              {isDetailLoading ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  загрузка
                </span>
              ) : null}
            </div>

            {detail ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
                <div className="space-y-4">
                  <section className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Тип и публикация</h3>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <Field label="Название">
                        <Input value={draft.title} onChange={(event) => onDraftChange((current) => ({ ...current, title: event.target.value }))} />
                      </Field>
                      <Field label="Тип площадки">
                        <select value={draft.kind} onChange={(event) => onDraftChange((current) => ({ ...current, kind: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                          {kindOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Статус страницы">
                        <select value={draft.pageStatus} onChange={(event) => onDraftChange((current) => ({ ...current, pageStatus: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                          {pageStatusOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Адрес">
                        <Input value={detail.address || ''} readOnly />
                      </Field>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{detail.city}</Badge>
                      <Badge variant="outline">{detail.latitude && detail.longitude ? `${detail.latitude}, ${detail.longitude}` : 'координаты не указаны'}</Badge>
                    </div>
                  </section>

                  <section className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Контент и SEO</h3>
                    </div>
                    <div className="mt-4 space-y-3">
                      <EditableField label="Короткое описание" value={draft.shortDescription} onChange={(shortDescription) => onDraftChange((current) => ({ ...current, shortDescription }))} multiline />
                      <EditableField label="Описание" value={draft.description} onChange={(description) => onDraftChange((current) => ({ ...current, description }))} multiline />
                      <div className="grid gap-3 md:grid-cols-2">
                        <EditableField label="seoH1" value={draft.seoH1} onChange={(seoH1) => onDraftChange((current) => ({ ...current, seoH1 }))} />
                        <EditableField label="canonicalPath" value={draft.canonicalPath} onChange={(canonicalPath) => onDraftChange((current) => ({ ...current, canonicalPath }))} />
                      </div>
                      <EditableField label="seoTitle" value={draft.seoTitle} onChange={(seoTitle) => onDraftChange((current) => ({ ...current, seoTitle }))} />
                      <EditableField label="seoDescription" value={draft.seoDescription} onChange={(seoDescription) => onDraftChange((current) => ({ ...current, seoDescription }))} multiline />
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={draft.isIndexable} onChange={(event) => onDraftChange((current) => ({ ...current, isIndexable: event.target.checked }))} />
                        indexable
                      </label>
                    </div>
                  </section>

                  <section className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">События площадки</h3>
                    </div>
                    <div className="mt-3 divide-y divide-border">
                      {detail.events.map((event) => (
                        <div key={event.id} className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_130px_90px]">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{event.title}</div>
                            <div className="mt-1 font-mono text-xs text-muted-foreground">{event.id}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatDateTime(event.startsAt)}</div>
                          <div className="text-xs text-muted-foreground">{formatMoney(event.priceFrom)}</div>
                        </div>
                      ))}
                      {!detail.events.length ? <div className="py-6 text-sm text-muted-foreground">Событий пока нет.</div> : null}
                    </div>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Hero</h3>
                    </div>
                    <div className="mt-4 aspect-[4/3] overflow-hidden rounded-lg border border-border bg-secondary">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">изображение не задано</div>
                      )}
                    </div>
                    <EditableField label="heroImageUrl" value={draft.heroImageUrl} onChange={(heroImageUrl) => onDraftChange((current) => ({ ...current, heroImageUrl }))} />
                  </section>

                  <section className="rounded-lg border border-border p-4">
                    <h3 className="text-sm font-semibold">Public-ready чек</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className={draft.title ? 'border-success/30 bg-success/10 text-success' : ''}>
                        title
                      </Badge>
                      <Badge variant="outline" className={draft.shortDescription ? 'border-success/30 bg-success/10 text-success' : ''}>
                        short
                      </Badge>
                      <Badge variant="outline" className={draft.seoTitle ? 'border-success/30 bg-success/10 text-success' : ''}>
                        seoTitle
                      </Badge>
                      <Badge variant="outline" className={draft.canonicalPath ? 'border-success/30 bg-success/10 text-success' : ''}>
                        canonical
                      </Badge>
                      <Badge variant="outline" className={draft.heroImageUrl ? 'border-success/30 bg-success/10 text-success' : ''}>
                        hero
                      </Badge>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-border p-6 text-sm text-muted-foreground">{isDetailLoading ? 'Загружаю карточку площадки...' : saveError || 'Карточка недоступна.'}</div>
            )}

            {detail ? (
              <div className="sticky bottom-0 mt-5 flex items-center justify-between gap-3 border-t border-border bg-background/95 py-3 backdrop-blur">
                <div className="text-xs text-muted-foreground">{saveError ? <span className="text-warning-foreground">Ошибка сохранения: {saveError}</span> : 'Поля сохраняются напрямую в карточку площадки.'}</div>
                <Button size="sm" onClick={onSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Сохранить площадку
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{props.label}</span>
      <div className="mt-1">{props.children}</div>
    </label>
  );
}

function EditableField(props: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return (
    <Field label={props.label}>
      {props.multiline ? (
        <textarea value={props.value} onChange={(event) => props.onChange(event.target.value)} className="min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm" />
      ) : (
        <Input value={props.value} onChange={(event) => props.onChange(event.target.value)} />
      )}
    </Field>
  );
}

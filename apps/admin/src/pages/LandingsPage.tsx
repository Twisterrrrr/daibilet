import * as React from 'react';
import { ADMIN_API_BASE } from '@/lib/admin-api';
import { CalendarDays, EyeOff, LayoutTemplate, Loader2, MapPin, Pin, RotateCcw, Save, Search } from 'lucide-react';

import { DataTableShell, InfoNote, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminData, formatDateTime, formatMoney, formatNumber } from '@/data';
import type { AdminLandingDetail, AdminLandingEvent, AdminLandingRow } from '@/types';

const API_BASE_URL = ADMIN_API_BASE;

type LandingsResponse = {
  generatedAt: string;
  total: number;
  rows: AdminLandingRow[];
  metrics: {
    ready: number;
    seed: number;
    empty: number;
    matchedEvents: number;
  };
};

type LandingCandidatesResponse = {
  generatedAt: string;
  slug: string;
  query: string;
  total: number;
  rows: AdminLandingEvent[];
};

function localResponse(): LandingsResponse {
  return {
    generatedAt: adminData.generatedAt,
    total: adminData.landingRows.length,
    rows: adminData.landingRows,
    metrics: {
      ready: adminData.landingRows.filter((row) => row.status === 'ready').length,
      seed: adminData.landingRows.filter((row) => row.status === 'seed').length,
      empty: adminData.landingRows.filter((row) => row.status === 'empty').length,
      matchedEvents: adminData.eventRows.filter((event) => event.landingHits.length > 0).length,
    },
  };
}

export function LandingsPage() {
  const [payload, setPayload] = React.useState<LandingsResponse>(() => localResponse());
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<AdminLandingDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);

  const loadLandings = React.useCallback(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetch(`${API_BASE_URL}/api/admin/landings`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as LandingsResponse;
      })
      .then((data) => {
        setPayload(data);
        setLoadError(null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPayload(localResponse());
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  React.useEffect(() => loadLandings(), [loadLandings]);

  React.useEffect(() => {
    if (!selectedSlug) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    setIsDetailLoading(true);
    fetch(`${API_BASE_URL}/api/admin/landings/${encodeURIComponent(selectedSlug)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as AdminLandingDetail;
      })
      .then(setDetail)
      .catch(() => {
        if (!controller.signal.aborted) setDetail(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsDetailLoading(false);
      });

    return () => controller.abort();
  }, [selectedSlug]);

  const rows = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return payload.rows.filter((landing) => {
      if (status !== 'all' && landing.status !== status) return false;
      if (!normalized) return true;
      return [
        landing.title,
        landing.subtitle,
        landing.slug,
        landing.city,
        landing.venue,
        ...(landing.chips || []),
        ...(landing.keywords || []),
        ...(landing.requiredTags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [payload.rows, query, status]);

  return (
    <div>
      <PageHeader
        title="Лендинги"
        description="SEO-выборки каталога: правила matching, покрытие событиями и быстрый контроль попадания карточек."
        meta={
          <>
            <Badge variant="outline">{formatNumber(payload.total)} rules</Badge>
            <Badge variant="outline">{formatNumber(payload.metrics.ready)} ready</Badge>
            {isLoading ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                backend
              </Badge>
            ) : null}
          </>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <MetricCard value={payload.metrics.ready} label="Готовые" />
        <MetricCard value={payload.metrics.seed} label="Seed" />
        <MetricCard value={payload.metrics.empty} label="Пустые" />
        <MetricCard value={payload.metrics.matchedEvents} label="Событий в выборках" />
      </div>

      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-border bg-card p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск лендинга, тега, ключевого слова..." className="h-9 pl-8" />
        </div>
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Все статусы</option>
          <option value="ready">Ready</option>
          <option value="seed">Seed</option>
          <option value="empty">Empty</option>
        </select>
      </div>

      {loadError ? (
        <div className="mb-4">
          <InfoNote>Backend fallback: {loadError}</InfoNote>
        </div>
      ) : null}

      <div className="grid gap-4">
        {selectedSlug ? (
          <LandingDetailEditor
            detail={detail}
            isLoading={isDetailLoading}
            onClose={() => setSelectedSlug(null)}
            onChanged={() => {
              loadLandings();
              if (selectedSlug) {
                fetch(`${API_BASE_URL}/api/admin/landings/${encodeURIComponent(selectedSlug)}`, { cache: 'no-store' })
                  .then((response) => response.json() as Promise<AdminLandingDetail>)
                  .then(setDetail)
                  .catch(() => undefined);
              }
            }}
          />
        ) : null}
        <DataTableShell columns={['Лендинг', 'Статус', 'Покрытие', 'Правила', 'SEO', '']}>
          {rows.map((landing) => (
            <tr key={landing.slug} className="border-b border-border last:border-0 hover:bg-secondary/40">
              <td className="min-w-[280px] px-4 py-3 align-top">
                <div className="font-medium">{landing.title}</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{landing.slug}</div>
                {landing.subtitle ? <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{landing.subtitle}</div> : null}
              </td>
              <td className="px-4 py-3 align-top">
                <StatusBadge status={landing.status === 'ready' ? 'live' : landing.status === 'seed' ? 'incomplete' : 'error'} label={landing.status} />
              </td>
              <td className="px-4 py-3 align-top text-sm">
                <div>{formatNumber(landing.events)} событий</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatNumber(landing.venues)} мест · {formatNumber(landing.cities ?? 0)} городов
                </div>
              </td>
              <td className="max-w-[360px] px-4 py-3 align-top">
                <div className="flex flex-wrap gap-1">
                  {(landing.chips || []).slice(0, 4).map((chip) => (
                    <Badge key={chip} variant="outline" className="text-[11px]">
                      {chip}
                    </Badge>
                  ))}
                  {(landing.keywords || []).slice(0, 3).map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="text-[11px]">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                <div>{landing.seo?.isIndexable ? 'index' : 'noindex'}</div>
                <div className="mt-1">{landing.seo?.canonicalUrl || `/landings/${landing.slug}`}</div>
              </td>
              <td className="px-4 py-3 align-top">
                <button type="button" onClick={() => setSelectedSlug(landing.slug)} className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-semibold hover:bg-secondary">
                  Открыть
                </button>
              </td>
            </tr>
          ))}
        </DataTableShell>
      </div>
    </div>
  );
}

function MetricCard(props: { value: number; label: string }) {
  return (
    <Card className="border-border p-4">
      <div className="text-2xl font-semibold">{formatNumber(props.value)}</div>
      <div className="text-xs text-muted-foreground">{props.label}</div>
    </Card>
  );
}

function LandingRuleCard({ landing, onChanged, onOpen }: { landing: AdminLandingRow; onChanged: () => void; onOpen: () => void }) {
  const [form, setForm] = React.useState({
    title: landing.title || '',
    subtitle: landing.subtitle || '',
    description: landing.description || '',
    seoH1: landing.seo?.h1 || '',
    seoTitle: landing.seo?.title || '',
    seoDescription: landing.seo?.description || '',
    canonicalUrl: landing.seo?.canonicalUrl || `/landings/${landing.slug}`,
    status: landing.status?.toUpperCase() === 'PUBLISHED' ? 'PUBLISHED' : 'REVIEW',
    isIndexable: Boolean(landing.seo?.isIndexable),
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm({
      title: landing.title || '',
      subtitle: landing.subtitle || '',
      description: landing.description || '',
      seoH1: landing.seo?.h1 || '',
      seoTitle: landing.seo?.title || '',
      seoDescription: landing.seo?.description || '',
      canonicalUrl: landing.seo?.canonicalUrl || `/landings/${landing.slug}`,
      status: landing.status?.toUpperCase() === 'PUBLISHED' ? 'PUBLISHED' : 'REVIEW',
      isIndexable: Boolean(landing.seo?.isIndexable),
    });
  }, [landing]);

  const setField = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  const saveLanding = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/admin/landings/${encodeURIComponent(landing.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const updateMatch = async (eventId: string, manualStatus: 'PINNED' | 'EXCLUDED' | 'REVIEW') => {
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/admin/landings/${encodeURIComponent(landing.slug)}/matches/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: manualStatus }),
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <LayoutTemplate className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">{landing.title}</h2>
              <StatusBadge status={landing.status === 'ready' ? 'live' : landing.status === 'seed' ? 'incomplete' : 'error'} label={landing.status} />
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{landing.slug}</p>
            {landing.subtitle ? <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{landing.subtitle}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge variant="outline">{formatNumber(landing.events)} событий</Badge>
          <Badge variant="outline">{formatNumber(landing.venues)} мест</Badge>
          <Badge variant="outline">{formatNumber(landing.cities)} городов</Badge>
          <Badge variant="outline">{formatMoney(landing.priceFrom)}</Badge>
        </div>
      </div>

      <div className="mb-4">
        <button type="button" onClick={onOpen} className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-semibold hover:bg-secondary">
          Open full editor
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(landing.chips || []).map((chip) => (
          <Badge key={chip} variant="secondary">
            {chip}
          </Badge>
        ))}
        {landing.city ? <Badge variant="outline">city: {landing.city}</Badge> : null}
        {landing.venue ? <Badge variant="outline">venue: {landing.venue}</Badge> : null}
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <RuleBox title="Ключевые слова" items={landing.keywords || []} empty="нет keywords" />
        <RuleBox title="Обязательные теги" items={landing.requiredTags || []} empty="нет tags" />
        <RuleBox title="Исключения" items={landing.excludedTags || []} empty="нет excludeTags" />
      </div>

      <div className="mb-4 rounded-lg border border-border bg-secondary/20 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground">SEO / content override</div>
            <div className="text-xs text-muted-foreground">Landing + SeoMeta for the public page.</div>
          </div>
          <button type="button" onClick={saveLanding} disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Input value={form.title} onChange={(event) => setField('title', event.target.value)} placeholder="Title" className="h-9" />
          <Input value={form.subtitle} onChange={(event) => setField('subtitle', event.target.value)} placeholder="Subtitle" className="h-9" />
          <Input value={form.seoH1} onChange={(event) => setField('seoH1', event.target.value)} placeholder="SEO H1" className="h-9" />
          <Input value={form.seoTitle} onChange={(event) => setField('seoTitle', event.target.value)} placeholder="SEO title" className="h-9" />
          <Input value={form.seoDescription} onChange={(event) => setField('seoDescription', event.target.value)} placeholder="SEO description" className="h-9 lg:col-span-2" />
          <Input value={form.canonicalUrl} onChange={(event) => setField('canonicalUrl', event.target.value)} placeholder="Canonical URL" className="h-9" />
          <div className="flex min-h-9 items-center gap-3 rounded-md border border-input bg-background px-3 text-xs">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.isIndexable} onChange={(event) => setField('isIndexable', event.target.checked)} />
              indexable
            </label>
            <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="ml-auto h-7 rounded border border-input bg-background px-2">
              <option value="REVIEW">Review</option>
              <option value="PUBLISHED">Published</option>
              <option value="HIDDEN">Hidden</option>
            </select>
          </div>
        </div>
      </div>

      <DataTableShell columns={['Событие', 'Город / место', 'Сеанс', 'Цена', 'Готовность']}>
        {(landing.sampleEvents || []).map((event) => (
          <tr key={event.id} className="border-b border-border last:border-0">
            <td className="min-w-[260px] px-4 py-3 align-top">
              <div className="font-medium">{event.title}</div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">{event.id}</div>
            </td>
            <td className="px-4 py-3 align-top">
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {event.city}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{event.venue}</div>
            </td>
            <td className="px-4 py-3 align-top">
              <div className="flex items-center gap-1 text-sm">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDateTime(event.startsAt)}
              </div>
            </td>
            <td className="px-4 py-3 align-top text-sm font-medium">{formatMoney(event.priceFrom)}</td>
            <td className="px-4 py-3 align-top">
              <StatusBadge status={event.readiness === 'ready' ? 'live' : event.readiness === 'blocked' ? 'error' : 'incomplete'} label={event.readiness} />
              <div className="mt-2 flex flex-wrap gap-1">
                <button type="button" onClick={() => updateMatch(event.id, 'PINNED')} className="inline-flex h-7 items-center gap-1 rounded border border-border px-2 text-[11px] hover:bg-secondary">
                  <Pin className="h-3 w-3" />
                  pin
                </button>
                <button type="button" onClick={() => updateMatch(event.id, 'EXCLUDED')} className="inline-flex h-7 items-center gap-1 rounded border border-border px-2 text-[11px] hover:bg-secondary">
                  <EyeOff className="h-3 w-3" />
                  exclude
                </button>
                <button type="button" onClick={() => updateMatch(event.id, 'REVIEW')} className="inline-flex h-7 items-center gap-1 rounded border border-border px-2 text-[11px] hover:bg-secondary">
                  <RotateCcw className="h-3 w-3" />
                  review
                </button>
              </div>
            </td>
          </tr>
        ))}
        {(landing.sampleEvents || []).length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
              В выборку пока ничего не попало
            </td>
          </tr>
        ) : null}
      </DataTableShell>
    </Card>
  );
}

function LandingDetailEditor({
  detail,
  isLoading,
  onClose,
  onChanged,
}: {
  detail: AdminLandingDetail | null;
  isLoading: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [query, setQuery] = React.useState('');
  const [candidateQuery, setCandidateQuery] = React.useState('');
  const [candidateRows, setCandidateRows] = React.useState<AdminLandingEvent[]>([]);
  const [isCandidateLoading, setIsCandidateLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setQuery('');
    setCandidateQuery('');
    setCandidateRows([]);
  }, [detail?.slug]);

  const updateMatch = async (event: AdminLandingEvent, manualStatus: 'PINNED' | 'EXCLUDED' | 'REVIEW') => {
    if (!detail) return;
    setIsSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/admin/landings/${encodeURIComponent(detail.slug)}/matches/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: manualStatus, groupEventIds: event.groupEventIds || [event.id] }),
      });
      onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const searchCandidates = React.useCallback(async () => {
    if (!detail) return;
    const normalized = candidateQuery.trim();
    if (normalized.length < 2) {
      setCandidateRows([]);
      return;
    }
    setIsCandidateLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/landings/${encodeURIComponent(detail.slug)}/candidates?q=${encodeURIComponent(normalized)}&limit=12`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as LandingCandidatesResponse;
      setCandidateRows(data.rows || []);
    } finally {
      setIsCandidateLoading(false);
    }
  }, [candidateQuery, detail]);

  const normalized = query.trim().toLowerCase();
  const visibleEvents = (detail?.events || []).filter((event) => {
    if (!normalized) return true;
    return [event.title, event.city, event.venue, event.category, ...(event.tags || [])].filter(Boolean).join(' ').toLowerCase().includes(normalized);
  });

  return (
    <Card className="border-primary/30 p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Full landing editor</div>
          <h2 className="mt-1 text-lg font-semibold">{detail?.landing.title || detail?.rule.title || 'Loading...'}</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{detail?.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLoading ? <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> loading</Badge> : null}
          {isSaving ? <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> saving</Badge> : null}
          <button type="button" onClick={onClose} className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-semibold hover:bg-secondary">
            Close
          </button>
        </div>
      </div>

      {detail ? (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-5">
            <MetricCard value={detail.metrics.effectiveEvents} label="Effective" />
            <MetricCard value={detail.metrics.autoEvents} label="Auto match" />
            <MetricCard value={detail.metrics.pinnedEvents} label="Pinned" />
            <MetricCard value={detail.metrics.excludedEvents} label="Excluded" />
            <MetricCard value={detail.metrics.reviewEvents} label="Review" />
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_280px]">
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Rule</div>
              <div className="flex flex-wrap gap-1.5">
                {(detail.rule.keywords || []).map((item) => <Badge key={`kw:${item}`} variant="outline">kw: {item}</Badge>)}
                {(detail.rule.requiredAnyKeywords || []).map((item) => <Badge key={`reqkw:${item}`} variant="secondary">обяз.: {item}</Badge>)}
                {(detail.rule.requiredKeywordGroups || []).map((group, index) => (
                  <Badge key={`group:${index}:${group.join('|')}`} variant="secondary">
                    группа: {group.join(' / ')}
                  </Badge>
                ))}
                {(detail.rule.requiredTags || []).map((item) => <Badge key={`tag:${item}`} variant="secondary">tag: {item}</Badge>)}
                {(detail.rule.excludedTags || []).map((item) => <Badge key={`ex:${item}`} variant="outline">exclude: {item}</Badge>)}
                {(detail.rule.excludedKeywords || []).map((item) => <Badge key={`exkw:${item}`} variant="outline">искл.: {item}</Badge>)}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Public SEO</div>
              <div className="line-clamp-2 text-xs">{detail.seo.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{detail.seo.robots}</div>
            </div>
          </div>

          <LandingBlocksPreview blocks={detail.blocks || []} />

          <section className="mb-4 rounded-lg border border-border bg-card p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Добавить событие в лендинг</div>
                <div className="mt-1 text-xs text-muted-foreground">Поиск идет по всему каталогу. Закрепление применяется ко всем слотам одной карточки.</div>
              </div>
              {isCandidateLoading ? (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  поиск
                </Badge>
              ) : null}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Input
                value={candidateQuery}
                onChange={(event) => setCandidateQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void searchCandidates();
                }}
                placeholder="Название, город, площадка, тег..."
                className="h-9 min-w-[260px] flex-1"
              />
              <button
                type="button"
                onClick={() => void searchCandidates()}
                disabled={isCandidateLoading || candidateQuery.trim().length < 2}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                {isCandidateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Найти
              </button>
            </div>
            {candidateRows.length ? (
              <LandingEventsEditorTable title="Найденные события" events={candidateRows} onUpdate={updateMatch} />
            ) : (
              <InfoNote>Введите минимум два символа и найдите событие, которое нужно закрепить в посадочной.</InfoNote>
            )}
          </section>

          <div className="mb-4">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск внутри текущего списка лендинга..." className="h-9" />
          </div>

          <LandingEventsEditorTable title="События в лендинге" events={visibleEvents} onUpdate={updateMatch} />

          {detail.excludedEvents.length ? (
            <div className="mt-4">
              <LandingEventsEditorTable title="Скрытые события" events={detail.excludedEvents} onUpdate={updateMatch} />
            </div>
          ) : null}
        </>
      ) : (
        <InfoNote>Выберите лендинг или дождитесь загрузки detail endpoint.</InfoNote>
      )}
    </Card>
  );
}

function LandingBlocksPreview({ blocks }: { blocks: NonNullable<AdminLandingDetail['blocks']> }) {
  const sorted = [...blocks].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return (
    <section className="mb-4 rounded-lg border border-border bg-card p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Content blocks</div>
          <div className="mt-1 text-xs text-muted-foreground">Public composition: hero context, value blocks, city grid, FAQ and SEO text.</div>
        </div>
        <Badge variant="outline">{formatNumber(sorted.length)} blocks</Badge>
      </div>
      {sorted.length ? (
        <DataTableShell columns={['#', 'Type', 'Title', 'Variant', 'Enabled']}>
          {sorted.map((block, index) => (
            <tr key={block.id || `${block.type}:${index}`} className="border-b border-border last:border-0 hover:bg-secondary/40">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{block.sortOrder ?? index}</td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="font-mono text-[11px]">{block.type}</Badge>
              </td>
              <td className="min-w-[260px] px-4 py-3">
                <div className="text-sm font-medium">{block.title || '—'}</div>
                {block.subtitle ? <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{block.subtitle}</div> : null}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{block.variant || '—'}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{block.isEnabled === false ? 'off' : 'on'}</td>
            </tr>
          ))}
        </DataTableShell>
      ) : (
        <InfoNote>No saved blocks yet. Backend will render fallback blocks from the landing rule.</InfoNote>
      )}
    </section>
  );
}

function LandingEventsEditorTable({
  title,
  events,
  onUpdate,
}: {
  title: string;
  events: AdminLandingEvent[];
  onUpdate: (event: AdminLandingEvent, status: 'PINNED' | 'EXCLUDED' | 'REVIEW') => void;
}) {
  return (
    <section>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <DataTableShell columns={['Событие', 'Город / площадка', 'Дата', 'Цена', 'Включение']}>
        {events.map((event) => (
          <tr key={`${title}:${event.id}`} className="border-b border-border last:border-0">
            <td className="min-w-[280px] px-4 py-3 align-top">
              <div className="font-medium">{event.title}</div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                {event.groupEventIds?.length && event.groupEventIds.length > 1 ? `${event.groupEventIds.length} слотов` : event.id}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(event.tags || []).slice(0, 3).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
              </div>
              {event.matchReasons?.length ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {event.matchReasons.slice(0, 4).map((reason) => (
                    <Badge key={reason} variant="secondary" className="text-[10px]">
                      {reason}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {event.matchBlockers?.length ? (
                <div className="mt-1 text-[11px] text-destructive">
                  {event.matchBlockers.slice(0, 2).join(' · ')}
                </div>
              ) : null}
            </td>
            <td className="px-4 py-3 align-top">
              <div className="text-sm">{event.city}</div>
              <div className="mt-1 text-xs text-muted-foreground">{event.venue}</div>
            </td>
            <td className="px-4 py-3 align-top text-sm">{formatDateTime(event.startsAt)}</td>
            <td className="px-4 py-3 align-top text-sm font-medium">{formatMoney(event.priceFrom)}</td>
            <td className="px-4 py-3 align-top">
              <div className="flex flex-wrap gap-1">
                {event.isAutoMatch ? <Badge variant="outline">auto</Badge> : null}
                {event.manualStatus ? <Badge variant="secondary">{manualMatchLabel(event.manualStatus)}</Badge> : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <button type="button" onClick={() => onUpdate(event, 'PINNED')} className="inline-flex h-7 items-center gap-1 rounded border border-border px-2 text-[11px] hover:bg-secondary">
                  <Pin className="h-3 w-3" />
                  Закрепить
                </button>
                <button type="button" onClick={() => onUpdate(event, 'EXCLUDED')} className="inline-flex h-7 items-center gap-1 rounded border border-border px-2 text-[11px] hover:bg-secondary">
                  <EyeOff className="h-3 w-3" />
                  Скрыть
                </button>
                <button type="button" onClick={() => onUpdate(event, 'REVIEW')} className="inline-flex h-7 items-center gap-1 rounded border border-border px-2 text-[11px] hover:bg-secondary">
                  <RotateCcw className="h-3 w-3" />
                  Авто
                </button>
              </div>
            </td>
          </tr>
        ))}
        {!events.length ? (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">В этом списке пока нет событий</td>
          </tr>
        ) : null}
      </DataTableShell>
    </section>
  );
}

function manualMatchLabel(status: AdminLandingEvent['manualStatus']) {
  if (status === 'PINNED') return 'закреплено';
  if (status === 'EXCLUDED') return 'скрыто';
  if (status === 'REVIEW') return 'авто';
  return '';
}

function RuleBox(props: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">{props.title}</div>
      <div className="flex flex-wrap gap-1.5">
        {props.items.length ? (
          props.items.map((item) => (
            <Badge key={item} variant="outline" className="bg-background">
              {item}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">{props.empty}</span>
        )}
      </div>
    </div>
  );
}

import { asNumber } from '@/lib/admin-ui';
import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminEcrActions = {
  canApprove: boolean;
  canReject: boolean;
  canApply: boolean;
};

export type AdminEcrRow = {
  id: string;
  eventId: string | null;
  type: string;
  status: string;
  title: string | null;
  summary: string | null;
  adminComment: string | null;
  payloadKeys: string[];
  submittedAt: string | null;
  createdAt: string;
  eventTitle: string | null;
  eventSlug: string | null;
  supplierName: string | null;
  actions: AdminEcrActions;
};

export type AdminEcrListData = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  facets: {
    statuses: Record<string, number>;
    types: Record<string, number>;
  };
  items: AdminEcrRow[];
  errors: string[];
};

export type AdminEcrDetailData = AdminEcrRow & {
  found: boolean;
  diffItems: Array<{
    path: string;
    label: string;
    changeType: string;
    currentValue: string;
    proposedValue: string;
  }>;
  warnings: string[];
  errors: string[];
};

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeActions(raw: unknown): AdminEcrActions {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    canApprove: Boolean(row.canApprove),
    canReject: Boolean(row.canReject),
    canApply: Boolean(row.canApply),
  };
}

function normalizeRow(raw: unknown): AdminEcrRow {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const event = (row.event && typeof row.event === 'object' ? row.event : {}) as Record<
    string,
    unknown
  >;
  const supplier = (row.supplier && typeof row.supplier === 'object' ? row.supplier : {}) as Record<
    string,
    unknown
  >;
  return {
    id: String(row.id || ''),
    eventId: row.eventId != null ? String(row.eventId) : event.id != null ? String(event.id) : null,
    type: String(row.type || '—'),
    status: String(row.status || '—'),
    title: row.title != null ? String(row.title) : null,
    summary: row.summary != null ? String(row.summary) : null,
    adminComment: row.adminComment != null ? String(row.adminComment) : null,
    payloadKeys: Array.isArray(row.payloadKeys) ? row.payloadKeys.map((item) => String(item)) : [],
    submittedAt: row.submittedAt != null ? String(row.submittedAt) : null,
    createdAt: String(row.createdAt || ''),
    eventTitle: event.title != null ? String(event.title) : null,
    eventSlug: event.slug != null ? String(event.slug) : null,
    supplierName: supplier.name != null ? String(supplier.name) : null,
    actions: normalizeActions(row.actions),
  };
}

export async function loadAdminEcrList(searchParams: {
  status?: string;
  type?: string;
  q?: string;
  offset?: string;
}): Promise<AdminEcrListData> {
  const errors: string[] = [];
  const params = new URLSearchParams();
  params.set('limit', '50');
  const offset = Math.max(0, asNumber(searchParams.offset, 0));
  if (offset > 0) params.set('offset', String(offset));
  if (searchParams.status && searchParams.status !== 'all') {
    params.set('status', searchParams.status);
  }
  if (searchParams.type && searchParams.type !== 'all') {
    params.set('type', searchParams.type);
  }
  if (searchParams.q?.trim()) params.set('q', searchParams.q.trim());

  try {
    const response = await adminApiFetch(`/api/admin/event-change-requests?${params.toString()}`);
    if (!response.ok) {
      errors.push(`ECR list HTTP ${response.status}`);
      return emptyList(errors);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const facetsRaw = (payload.facets && typeof payload.facets === 'object'
      ? payload.facets
      : {}) as Record<string, unknown>;
    const statuses =
      facetsRaw.statuses && typeof facetsRaw.statuses === 'object'
        ? (facetsRaw.statuses as Record<string, number>)
        : {};
    const types =
      facetsRaw.types && typeof facetsRaw.types === 'object'
        ? (facetsRaw.types as Record<string, number>)
        : {};

    return {
      total: asNumber(payload.total),
      limit: asNumber(payload.limit, 50),
      offset: asNumber(payload.offset, 0),
      hasMore: Boolean(payload.hasMore),
      facets: { statuses, types },
      items: Array.isArray(payload.items) ? payload.items.map(normalizeRow) : [],
      errors,
    };
  } catch (error) {
    errors.push(`ECR list: ${error instanceof Error ? error.message : 'network error'}`);
    return emptyList(errors);
  }
}

export async function loadAdminEcrDetail(requestId: string): Promise<AdminEcrDetailData> {
  const errors: string[] = [];
  const id = requestId.trim();
  if (!id) {
    return {
      ...emptyRow(),
      found: false,
      diffItems: [],
      warnings: [],
      errors: ['missing request id'],
    };
  }

  try {
    const response = await adminApiFetch(
      `/api/admin/event-change-requests/${encodeURIComponent(id)}`,
    );
    if (!response.ok) {
      errors.push(`ECR detail HTTP ${response.status}`);
      return {
        ...emptyRow(),
        id,
        found: false,
        diffItems: [],
        warnings: [],
        errors,
      };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const row = normalizeRow(payload);
    const diff = (payload.diff && typeof payload.diff === 'object'
      ? payload.diff
      : {}) as Record<string, unknown>;
    const diffItems = Array.isArray(diff.items)
      ? diff.items.map((item) => {
          const entry = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
          return {
            path: String(entry.path || ''),
            label: String(entry.label || entry.path || ''),
            changeType: String(entry.changeType || ''),
            currentValue: formatValue(entry.currentValue),
            proposedValue: formatValue(entry.proposedValue),
          };
        })
      : [];
    const warnings = Array.isArray(diff.warnings) ? diff.warnings.map((item) => String(item)) : [];

    return {
      ...row,
      found: true,
      diffItems,
      warnings,
      errors,
    };
  } catch (error) {
    errors.push(`ECR detail: ${error instanceof Error ? error.message : 'network error'}`);
    return {
      ...emptyRow(),
      id,
      found: false,
      diffItems: [],
      warnings: [],
      errors,
    };
  }
}

function emptyList(errors: string[]): AdminEcrListData {
  return {
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    facets: { statuses: {}, types: {} },
    items: [],
    errors,
  };
}

function emptyRow(): AdminEcrRow {
  return {
    id: '',
    eventId: null,
    type: '—',
    status: '—',
    title: null,
    summary: null,
    adminComment: null,
    payloadKeys: [],
    submittedAt: null,
    createdAt: '',
    eventTitle: null,
    eventSlug: null,
    supplierName: null,
    actions: { canApprove: false, canReject: false, canApply: false },
  };
}

import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminPdpDocument = {
  id?: string;
  variant: string;
  status: 'DRAFT' | 'REVIEW' | 'READY';
  content: {
    summary: string;
    conversion: { mode: string; primaryAction: string; label: string; targetEventId: string; externalUrl: string };
    gallery: Array<{ url: string; alt: string; caption: string; credit: string }>;
    facts: Array<{ label: string; value: string; sourceUrl: string; verifiedAt: string }>;
    sections: Array<{
      id: string; kind: string; title: string; body: string;
      items: Array<{ title: string; description: string; imageUrl: string; linkUrl: string; meta: string; sourceUrl: string; details: Array<{ label: string; value: string }> }>;
    }>;
    sources: Array<{ title: string; url: string; checkedAt: string }>;
  };
  version?: number;
  updatedAt?: string;
};

export type AdminPdpEditorData = {
  variants: Record<string, string[]>;
  document: AdminPdpDocument | null;
  error: string | null;
};

export async function loadAdminPdpEditorData(entity: 'venues' | 'events', entityId: string): Promise<AdminPdpEditorData> {
  const [variantsResponse, documentResponse] = await Promise.all([
    adminApiFetch('/api/admin/pdp/variants'),
    adminApiFetch(`/api/admin/pdp/${entity}/${encodeURIComponent(entityId)}`),
  ]);
  if (!variantsResponse.ok || !documentResponse.ok) {
    return {
      variants: {},
      document: null,
      error: `Не удалось загрузить редакционный PDP (HTTP ${!variantsResponse.ok ? variantsResponse.status : documentResponse.status}).`,
    };
  }
  const [variants, document] = await Promise.all([
    variantsResponse.json() as Promise<Record<string, string[]>>,
    documentResponse.json() as Promise<AdminPdpDocument | null>,
  ]);
  return { variants, document, error: null };
}

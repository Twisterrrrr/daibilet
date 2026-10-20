'use server';

import { revalidatePath } from 'next/cache';

import { adminApiFetch } from '@/server/admin-api-fetch';

async function readError(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '');
  try {
    const parsed = JSON.parse(text) as { message?: string };
    if (parsed?.message) return parsed.message;
  } catch {
    // not JSON
  }
  return `${fallback} (HTTP ${response.status})`;
}

export type RewriteGenerateResult = { ok: boolean; generated?: number; error?: string };

/** Generate AI drafts for QUEUED revisions (never publishes). */
export async function generateRewriteDraftsAction(limit: number): Promise<RewriteGenerateResult> {
  const response = await adminApiFetch('/api/admin/rewrite-queue/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: Math.min(Math.max(Number(limit) || 10, 1), 50) }),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, 'Не удалось сгенерировать черновики') };
  }
  const body = (await response.json().catch(() => ({}))) as { generated?: number };
  revalidatePath('/admin/rewrite-queue');
  return { ok: true, generated: body.generated ?? 0 };
}

export type RewriteApproveResult = { ok: boolean; error?: string };

/** Editorial approval - publishes the (optionally edited) draft to the event page. */
export async function approveRewriteAction(revisionId: string, finalText?: string): Promise<RewriteApproveResult> {
  const response = await adminApiFetch(`/api/admin/rewrite-queue/${encodeURIComponent(revisionId)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(finalText ? { finalText } : {}),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, 'Не удалось опубликовать рерайт') };
  }
  revalidatePath('/admin/rewrite-queue');
  revalidatePath('/admin/events');
  return { ok: true };
}

/** Send the draft back to the queue (kept for a future regeneration). */
export async function rejectRewriteAction(revisionId: string): Promise<RewriteApproveResult> {
  const response = await adminApiFetch(`/api/admin/rewrite-queue/${encodeURIComponent(revisionId)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    return { ok: false, error: await readError(response, 'Не удалось отклонить черновик') };
  }
  revalidatePath('/admin/rewrite-queue');
  return { ok: true };
}

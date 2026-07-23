'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { adminApiFetch } from '@/server/admin-api-fetch';
import { ARTICLE_AUTHOR_OPTIONS } from '@/server/admin-articles-data';

function authorLabel(authorId: string): string {
  return ARTICLE_AUTHOR_OPTIONS.find((item) => item.value === authorId)?.label || 'Редакция';
}

function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function readDraft(formData: FormData) {
  const title = String(formData.get('title') || '').trim();
  const slug = String(formData.get('slug') || '').trim();
  const status = String(formData.get('status') || 'draft').trim();
  const excerpt = String(formData.get('excerpt') || '').trim();
  const content = String(formData.get('content') || '');
  const coverImageUrl = String(formData.get('coverImageUrl') || '').trim();
  const citySlug = String(formData.get('citySlug') || '').trim();
  const authorId = String(formData.get('authorId') || 'editorial').trim() || 'editorial';
  const seoTitle = String(formData.get('seoTitle') || '').trim();
  const seoDescription = String(formData.get('seoDescription') || '').trim();
  const canonicalPath = String(formData.get('canonicalPath') || '').trim();
  const isIndexable = formData.get('isIndexable') === 'on' || formData.get('isIndexable') === 'true';
  let publishedAt = fromDatetimeLocalValue(String(formData.get('publishedAt') || ''));
  if (status === 'published' && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  return {
    title,
    slug,
    status,
    excerpt,
    content,
    coverImageUrl: coverImageUrl || null,
    citySlug: citySlug || null,
    authorId,
    authorName: authorLabel(authorId),
    seoTitle: seoTitle || title,
    seoDescription: seoDescription || excerpt,
    canonicalPath: canonicalPath || `/blog/${slug || 'article'}`,
    isIndexable,
    publishedAt,
  };
}

export async function saveAdminArticleAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  const isNew = !id || id === 'new';
  const body = readDraft(formData);

  const response = await adminApiFetch(isNew ? '/api/admin/articles' : `/api/admin/articles/${encodeURIComponent(id)}`, {
    method: isNew ? 'POST' : 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`save failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  const saved = (await response.json()) as { id?: string };
  revalidatePath('/admin/articles');
  if (saved.id) {
    revalidatePath(`/admin/articles/${saved.id}`);
    redirect(`/admin/articles/${saved.id}?saved=1`);
  }
  redirect('/admin/articles');
}

export async function archiveAdminArticleAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  if (!id || id === 'new') throw new Error('missing article id');

  const body = { ...readDraft(formData), status: 'hidden' };
  const response = await adminApiFetch(`/api/admin/articles/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`archive failed HTTP ${response.status}`);
  }

  revalidatePath('/admin/articles');
  revalidatePath(`/admin/articles/${id}`);
  redirect(`/admin/articles/${id}?archived=1`);
}

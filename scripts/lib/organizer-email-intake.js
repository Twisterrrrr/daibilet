/**
 * Pure logic for the organizer email intake pipeline.
 *
 * Owner task 2026-10-18: organizers send extra event info + photos to
 * info@daibilet.ru (Timeweb mail). The worker fetches mail to a staging folder
 * on the server; nothing touches the catalogue until an operator reviews the
 * staged item and runs apply-organizer-email.js.
 *
 * This module holds the parsing/matching helpers so they can be unit-tested
 * without an IMAP connection.
 */
import crypto from 'node:crypto';

/** daibilet.ru event links inside the email body (".../events/<slug>"). */
const EVENT_LINK_RE = /daibilet\.ru\/events\/([A-Za-z0-9а-яА-ЯёЁ_-]+)/u;

export function extractEventSlug(text) {
  const m = String(text || '').match(EVENT_LINK_RE);
  return m ? m[1] : null;
}

/** Stable folder name for one message (email Message-ID may contain slashes). */
export function messageKey(messageId, date) {
  const raw = String(messageId || `no-id-${date || Date.now()}`);
  return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16);
}

/**
 * Normalize an organizer email into a staging record. Text is trimmed and
 * capped; attachments are referenced, not embedded.
 */
export function buildStagingRecord({ messageId, date, from, subject, text, attachments }) {
  const body = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return {
    messageKey: messageKey(messageId, date),
    messageId: String(messageId || ''),
    date: String(date || ''),
    from: String(from || ''),
    subject: String(subject || '').trim(),
    eventSlug: extractEventSlug(body),
    text: body.slice(0, 20000),
    attachments: (attachments || []).map((a) => ({
      name: String(a.name || 'attachment'),
      path: String(a.path || ''),
      size: Number(a.size || 0),
    })),
    reviewed: false,
  };
}

/**
 * Candidate catalogue rows for a staged email without a direct event link:
 * fuzzy title match on the subject. Returns scored pairs (higher = closer).
 */
export function scoreTitleCandidates(subject, candidates) {
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gu, ' ')
      .trim();
  const target = norm(subject);
  if (!target) return [];
  const targetWords = new Set(target.split(' ').filter((w) => w.length > 2));
  return (candidates || [])
    .map((row) => {
      const title = norm(row.title);
      const words = new Set(title.split(' ').filter((w) => w.length > 2));
      let common = 0;
      for (const w of targetWords) if (words.has(w)) common += 1;
      const score = targetWords.size ? common / targetWords.size : 0;
      return { id: row.id, slug: row.slug, title: row.title, score: Number(score.toFixed(2)) };
    })
    .filter((r) => r.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/** Image attachments worth keeping for the catalogue (photos from organizers). */
export function isCatalogPhoto(name, mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|avif)$/iu.test(String(name || ''));
}

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

/**
 * Only these senders are staged (owner task 2026-10-18): the Ticketscloud
 * agent forwards organizer mail - everything else is noise/spam.
 */
const ORGANIZER_SENDERS = ['agent@ticketscloud.com'];

export function senderEmail(fromText) {
  const m = String(fromText || '').match(/[\w.+-]+@[\w.-]+\.\w+/u);
  return m ? m[0].toLowerCase() : '';
}

export function isOrganizerSender(fromText) {
  const email = senderEmail(fromText);
  return ORGANIZER_SENDERS.includes(email);
}

/**
 * Review policy (owner task 2026-10-18): do not attach text/photos to an event
 * that already ended - its stored schedule would go stale. Open-date sessions
 * (null startsAt) keep the event alive.
 *
 * Returns 'past' | 'upcoming' | 'unknown' (no session rows at all).
 */
export function classifyEventTiming(sessionStarts, now = new Date()) {
  const list = sessionStarts || [];
  if (!list.length) return 'unknown';
  const times = list
    .map((s) => (s == null ? null : new Date(s)))
    .filter((d) => d && Number.isFinite(d.getTime()));
  // Any open-date session means the event is not finished.
  if (times.length < list.length) return 'upcoming';
  const last = Math.max(...times.map((d) => d.getTime()));
  return last < now.getTime() ? 'past' : 'upcoming';
}

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

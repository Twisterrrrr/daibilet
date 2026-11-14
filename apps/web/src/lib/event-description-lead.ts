import type { PublicEventDto } from '@daibilet/contracts/public';

import { ARTIST_BIOS, type ArtistBio } from '../data/artist-bios.ts';
import { normalizeUserFacingCopy, stripTitleDuplicateLead } from './event-description-format.ts';
import { stripSessionDateLines } from './event-description-session-lines.ts';
import {
  buildMusicEventLead,
  isMusicEvent,
  rewriteMusicEventDescription,
} from './event-music-description.ts';

type ConcertLeadInput = Pick<
  PublicEventDto,
  'title' | 'category' | 'subcategories' | 'tags' | 'venue' | 'city'
>;

/**
 * Artist key from an event title: drops venue parentheses, program suffixes and
 * generic prefixes ("концерт группы", "группа"), keeping hyphenated names such
 * as "Би-2" intact.
 */
export function normalizeArtistKey(value: string): string {
  return normalizeUserFacingCopy(String(value || ''))
    .toLocaleLowerCase('ru-RU')
    .replace(/\([^)]*\)/gu, ' ')
    .replace(/\[[^\]]*\]/gu, ' ')
    .replace(/\s*[|:]\s*.*$/u, ' ')
    .replace(/\s[-–—]\s.*$/u, ' ')
    .replace(/\.\s.*$/u, ' ')
    .replace(/^(?:концерт|выступление|шоу)\s+(?:группы|артиста|исполнителя)?\s*/u, '')
    .replace(/^(?:группа|артист|исполнитель)\s+/u, '')
    .replace(/[«»"']/gu, ' ')
    .replace(/[^a-zа-яё0-9]+/giu, ' ')
    .trim();
}

/** Verified bio for the event's artist, matched by a normalized title key. */
export function lookupArtistBio(title: string): ArtistBio | undefined {
  const key = normalizeArtistKey(title);
  if (!key) return undefined;
  return ARTIST_BIOS.find((entry) =>
    entry.aliases.some((alias) => {
      const aliasKey = normalizeArtistKey(alias);
      if (!aliasKey) return false;
      if (key === aliasKey) return true;
      if (entry.match !== 'prefix') return false;
      if (!key.startsWith(`${aliasKey} `)) return false;
      const rest = key.slice(aliasKey.length).trim();
      // "Сова и волки" is a different act; "Сова. Большой концерт" is not.
      return !/^(?:и|&|feat|vs|с)(?:\s|$)/u.test(rest);
    }),
  );
}

export function isConcertLikeEvent(event: ConcertLeadInput): boolean {
  return isMusicEvent(event);
}

/** `«Сова» - инди-концерт на площадке «ПЛАТФОРМА» в Москве.` */
export function buildConcertLead(event: ConcertLeadInput): string {
  const bio = lookupArtistBio(String(event.title || ''));
  return buildMusicEventLead(event, bio?.artist);
}

/**
 * Factual lead plus a verified artist bio when the title matches the registry.
 * The bio is general background, never a retelling of the provider description.
 */
export function buildConcertIntro(event: ConcertLeadInput): string {
  const lead = buildConcertLead(event);
  const bio = lookupArtistBio(String(event.title || ''));
  return bio ? `${lead}\n\n${bio.bio}` : lead;
}

/**
 * Replace only a generated/wrong lead with a factual concert intro. Provider
 * copy stays untouched; an empty description gets the intro (lead plus a
 * verified artist bio when one exists in the registry).
 */
export function withConcertLead(event: PublicEventDto): string {
  const raw = String(event.description || '').trim();
  if (!isConcertLikeEvent(event)) return raw;
  if (!raw) return buildConcertIntro(event);

  const rewritten = rewriteMusicEventDescription(event, raw);
  const fullLead = buildMusicEventLead(event);
  const lead = buildConcertLead(event);
  if (rewritten === raw || !fullLead || !rewritten.startsWith(fullLead)) return rewritten;

  const bio = lookupArtistBio(String(event.title || ''));
  const rest = rewritten.slice(fullLead.length).trim();
  const bioText = bio && !rewritten.includes(bio.bio) ? bio.bio : '';
  return [lead, bioText, rest].filter(Boolean).join('\n\n');
}

/**
 * Final description for body, meta and JSON-LD: stored date lines are gone and
 * a lead that only repeats the H1 ("В Рускеалу… в Санкт-Петербурге." under H1
 * "В Рускеалу…") is dropped.
 */
export function displayEventDescription(event: PublicEventDto): string {
  return stripTitleDuplicateLead(
    stripSessionDateLines(withConcertLead(event)),
    String(event.title || ''),
    String(event.city || ''),
  );
}

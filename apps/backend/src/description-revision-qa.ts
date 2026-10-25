/**
 * Deterministic fact-check for AI description rewrites (event-rewrite-seo-plan.md:
 * "автоматический факт-контроль" before editorial review). Pure functions only.
 *
 * Rules:
 * - no provider/technical field mentions;
 * - no long/medium dashes (project copy canon: plain hyphen);
 * - caps / exclamations / emoji limits (AI rewrite tone canon);
 * - every number in the draft must be traceable to the source text or catalogue
 *   facts (duration, dates) - never invented;
 * - stated duration must follow the duration canon (source wins, otherwise the
 *   rounded session schedule).
 */

export type QaFlag = { code: string; message: string };

export type QaContext = {
  sourceText: string;
  title?: string | null;
  city?: string | null;
  scheduledDurationMinutes?: readonly number[] | null;
};

const PROVIDER_MENTION_RE =
  /ticketscloud|tеплоход\.info|teplohod|tеплоход info|кассир\.|стартсат|startsat|endsat|eventoverride|виджет\s+(провайдера|tc)/iu;

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const DURATION_RE = /(\d+)\s*(?:минут|мин\b|час(?:а|ов)?|ч\b)/giu;

function extractNumbers(text: string): number[] {
  return [...String(text || '').matchAll(/\d+/g)].map((match) => Number(match[0])).filter((n) => Number.isFinite(n));
}

/** Clock times ("20:00") are not standalone facts - mask before the invented-number check. */
function maskTimes(text: string): string {
  return String(text || '').replace(/\d{1,2}:\d{2}/g, ' ');
}

function textToNumberPool(context: QaContext): Set<number> {
  const pool = new Set<number>();
  for (const n of extractNumbers(context.sourceText)) pool.add(n);
  for (const n of extractNumbers(context.title || '')) pool.add(n);
  for (const n of extractNumbers(context.city || '')) pool.add(n);
  for (const minutes of context.scheduledDurationMinutes || []) {
    const total = Math.round(Number(minutes));
    if (!Number.isFinite(total) || total <= 0) continue;
    pool.add(total);
    pool.add(Math.round(total / 5) * 5);
    if (total % 60 === 0) pool.add(total / 60);
  }
  return pool;
}

export function checkRewriteDraft(draft: string, context: QaContext): QaFlag[] {
  const text = String(draft || '');
  const flags: QaFlag[] = [];
  if (!text.trim()) {
    flags.push({ code: 'empty_draft', message: 'Черновик пуст' });
    return flags;
  }

  if (PROVIDER_MENTION_RE.test(text)) {
    flags.push({ code: 'provider_mention', message: 'Упоминание поставщика или технических полей' });
  }
  if (/[\u2013\u2014\u2212]/u.test(text)) {
    flags.push({ code: 'long_dash', message: 'Длинное/среднее тире вместо дефиса (копи-канон)' });
  }
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 1) {
    flags.push({ code: 'exclamations', message: `Слишком много восклицательных знаков: ${exclamations}` });
  }
  if (EMOJI_RE.test(text)) {
    flags.push({ code: 'emoji', message: 'Эмодзи в тексте карточки запрещены' });
  }
  const capsWords = text.match(/\b[А-ЯЁA-Z]{6,}\b/g) || [];
  if (capsWords.length > 1) {
    flags.push({ code: 'caps', message: `Капс-слова: ${capsWords.slice(0, 3).join(', ')}` });
  }

  // Fact safety: digits in the draft must be traceable (source, title, city, sessions).
  const pool = textToNumberPool(context);
  const invented = extractNumbers(maskTimes(text)).filter(
    (n) => !pool.has(n) && !pool.has(n * 60) && !(n % 60 === 0 && pool.has(n / 60)),
  );
  if (invented.length) {
    flags.push({
      code: 'invented_numbers',
      message: `Числа без подтверждения во входных данных: ${[...new Set(invented)].slice(0, 5).join(', ')}`,
    });
  }

  // Duration canon: named durations must match source-stated or session-derived values.
  const durations = [...String(text).matchAll(DURATION_RE)].map((match) => {
    const value = Number(match[1]);
    return /час/iu.test(match[0]) ? value * 60 : value;
  });
  const allowedDurations = new Set<number>();
  for (const minutes of context.scheduledDurationMinutes || []) {
    const total = Math.round(Number(minutes));
    if (Number.isFinite(total) && total > 0) allowedDurations.add(Math.round(total / 5) * 5);
  }
  for (const minutes of durations) {
    const rounded = Math.round(minutes / 5) * 5;
    if (allowedDurations.size && !allowedDurations.has(rounded) && !String(context.sourceText || '').includes(String(minutes))) {
      flags.push({
        code: 'duration_mismatch',
        message: `Длительность ${minutes} мин не подтверждена расписанием или исходником`,
      });
    }
  }

  return flags;
}

/** Status after QA: CHECKED when clean, GENERATED keeps the draft for review with flags. */
export function statusAfterQa(flags: QaFlag[]): 'CHECKED' | 'GENERATED' {
  return flags.length ? 'GENERATED' : 'CHECKED';
}

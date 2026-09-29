/**
 * Admin AI rewrite for event descriptions (UI-only MVP).
 * Returns text only — never writes EventOverride.
 */

export const AI_REWRITE_MAX_INPUT_CHARS = 12_000;
export const AI_REWRITE_COOLDOWN_MS = 5_000;
export const AI_REWRITE_DEFAULT_MODEL = 'gpt-4.1-mini';

export const SYSTEM_PROMPT = `Вы — профессиональный редактор платформы «Дайбилет» (daibilet.ru) — рекомендательного сервиса о событиях и поездках по России.

Ваша задача — не формально переставить слова, а подготовить полезную редакционную версию описания: быстро объяснить формат события, разложить подтвержденные сведения по смысловым блокам и помочь человеку понять, подходит ли ему событие. Уникальность текста важна, но полезность и точность важнее процента в сервисах проверки.

### КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА (ШЕСТИУГОЛЬНИК БЕЗОПАСНОСТИ):
1. НИКАКИХ ВЫДУМАННЫХ ФАКТОВ. Запрещено добавлять детали, которых нет в исходном тексте (новые локации, гидов, тайминги, обещания «включенного обеда», если это прямо не указано). Если в исходном тексте мало данных, сделайте текст лаконичным, но честным.
2. СОХРАНЕНИЕ СТРУКТУРНЫХ ДАННЫХ. Все списки (Что включено, Что не включено, Организационные детали, Ограничения по возрасту, Адреса, Точки сбора) должны быть сохранены. Форматируйте их строго через Markdown (списки \`-\`).
3. ЗАПРЕТ НА КЛИШЕ И ИИ-МУСОР. Строго запрещено использовать маркеры искусственного текста и дешевой рекламы: "уникальная возможность", "незабываемое путешествие", "погрузитесь в атмосферу", "официальный партнер", "спешите купить", "непередаваемые ощущения", "сердце города", "жемчужина".
4. ЗАПРЕТ НА САМОПРЕЗЕНТАЦИЮ И ССЫЛКИ. Не пишите "Мы рады предложить", "Наш сервис". Не упоминайте сторонние платформы (Ticketscloud, Кассир и т.д.). Пишите отстраненно, фокусируясь на самом событии.
5. ТОН ГОЛОСА (TONE OF VOICE): Деловой, вовлекающий, экспертный, без панибратства. Избегайте капслока, восклицательных знаков (максимум 1 на весь текст) и эмодзи (никаких смайликов, стрелочек и огоньков в тексте карточки).
6. ФОРМАТ ВЫВОДА: Верни ТОЛЬКО готовый очищенный текст в формате Markdown. Никаких преамбул ("Вот ваш текст:"), никаких постскриптумов ("Надеюсь, вам понравилось"). Только тело описания (body description).

### ОБЯЗАТЕЛЬНЫЙ РИТМ ТЕКСТА:
- Начни с одного или двух коротких абзацев без заголовка. Они отвечают на вопросы: что это, где проходит и в чем практический интерес.
- Затем сделай от двух до четырех смысловых секций с Markdown-заголовками второго уровня: \`## Что вас ждет\`, \`## Формат\`, \`## Маршрут\`, \`## Практическая информация\`, \`## Перед посещением\` или другими уместными названиями.
- Не пиши заголовок \`## О событии\`: он уже есть в интерфейсе страницы.
- Если подтверждены хотя бы две характеристики, обязательно добавь секцию \`## Особенности\` и перечисли их Markdown-списком. Не дополняй список выдуманными пунктами ради количества.
- Не превращай каждый факт в отдельный заголовок и не повторяй одну мысль во вступлении, секции и списке.
- Для короткого исходника допустим лаконичный текст. Не раздувай его общими рассуждениями.

### СТРУКТУРИРОВАННЫЕ ФАКТЫ ИЗ РАСПИСАНИЯ:
- Вместе с исходным текстом может быть передана расчётная длительность. Она получена из времени начала и окончания сеансов и уже округлена до ближайших 5 минут.
- Используй её только если длительность не заявлена в исходном описании. Явно указанная организатором длительность имеет приоритет.
- Если длительность различается между сеансами, не называй одно фиксированное значение. Напиши, что она зависит от сеанса, и используй переданные варианты или диапазон.
- Не объясняй читателю, откуда взялся расчёт, и не упоминай технические поля startsAt/endsAt.

### АЛГОРИТМ РАБОТЫ С ТЕКСТОМ:
- Шаг 1: Выдели ключевую суть события в первое предложение (Что это? Где? В чем главный интерес?).
- Шаг 2: Перепиши основное художественное описание своими словами, повышая динамику текста (используй активный залог: вместо "Вам будет показано" -> "Вы увидите").
- Шаг 3: Перенеси все технические и организационные блоки без изменения их фактического смысла, но причесав верстку под Markdown.`;

export type RewriteDescriptionMeta = {
  title?: string | null;
  city?: string | null;
  venue?: string | null;
  venueAddress?: string | null;
  ageLimit?: string | null;
  category?: string | null;
  scheduledDurationMinutes?: readonly number[] | null;
};

export type RewriteDescriptionResult = {
  text: string;
  model: string;
  truncatedInput: boolean;
};

export class AiRewriteError extends Error {
  statusCode: number;
  code: string;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'AiRewriteError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const lastRewriteAtByEvent = new Map<string, number>();

/** Round an inferred schedule duration to the nearest five minutes. */
export function roundDurationMinutesToFive(value: unknown): number | null {
  const minutes = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

export function normalizeScheduledDurationMinutes(
  values: readonly unknown[] | null | undefined,
): number[] {
  const rounded = (values || [])
    .map(roundDurationMinutesToFive)
    .filter((value): value is number => value != null);
  return [...new Set(rounded)].sort((left, right) => left - right);
}

export function formatDurationMinutesRu(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} ${pluralRu(hours, 'час', 'часа', 'часов')}`);
  if (minutes > 0) parts.push(`${minutes} ${pluralRu(minutes, 'минута', 'минуты', 'минут')}`);
  return parts.join(' ') || '0 минут';
}

export function formatScheduledDurationFact(
  values: readonly unknown[] | null | undefined,
): string | null {
  const durations = normalizeScheduledDurationMinutes(values);
  if (!durations.length) return null;
  if (durations.length === 1) {
    return `Расчётная длительность по расписанию: ${formatDurationMinutesRu(durations[0]!)}.`;
  }
  if (durations.length <= 4) {
    return `Расчётная длительность зависит от сеанса: ${durations
      .map(formatDurationMinutesRu)
      .join(', ')}.`;
  }
  return `Расчётная длительность зависит от сеанса: от ${formatDurationMinutesRu(
    durations[0]!,
  )} до ${formatDurationMinutesRu(durations[durations.length - 1]!)}. Не называй одно фиксированное значение.`;
}

function pluralRu(value: number, one: string, few: string, many: string): string {
  const absolute = Math.abs(value) % 100;
  const lastDigit = absolute % 10;
  if (absolute > 10 && absolute < 20) return many;
  if (lastDigit === 1) return one;
  if (lastDigit >= 2 && lastDigit <= 4) return few;
  return many;
}

export function truncateRewriteInput(text: string, maxChars = AI_REWRITE_MAX_INPUT_CHARS): {
  text: string;
  truncated: boolean;
} {
  const normalized = String(text || '').trim();
  if (normalized.length <= maxChars) {
    return { text: normalized, truncated: false };
  }
  return { text: normalized.slice(0, maxChars).trimEnd(), truncated: true };
}

export function buildRewriteUserPrompt(
  originalDescription: string,
  meta: RewriteDescriptionMeta = {},
): { prompt: string; truncated: boolean } {
  const { text, truncated } = truncateRewriteInput(originalDescription);
  if (!text) {
    throw new AiRewriteError('empty_description', 'Нет исходного описания для рерайта', 400);
  }

  const lines: string[] = [];
  const title = String(meta.title || '').trim();
  const city = String(meta.city || '').trim();
  const venue = String(meta.venue || '').trim();
  const venueAddress = String(meta.venueAddress || '').trim();
  const ageLimit = String(meta.ageLimit || '').trim();
  const category = String(meta.category || '').trim();
  const scheduledDurationFact = formatScheduledDurationFact(meta.scheduledDurationMinutes);
  if (title) lines.push(`Название события: ${title}`);
  const verifiedFacts: string[] = [];
  if (city) verifiedFacts.push(`Город: ${city}.`);
  if (venue) verifiedFacts.push(`Площадка: ${venue}.`);
  if (venueAddress) verifiedFacts.push(`Адрес площадки: ${venueAddress}.`);
  if (category) verifiedFacts.push(`Категория: ${category}.`);
  if (ageLimit) verifiedFacts.push(`Возрастная маркировка: ${ageLimit.replace(/\+$/u, '')}+. Не трактуй маркировку как рекомендацию конкретной аудитории.`);
  if (scheduledDurationFact) {
    verifiedFacts.push(scheduledDurationFact);
  }
  if (verifiedFacts.length) {
    lines.push('Подтвержденные структурированные факты:');
    lines.push(...verifiedFacts.map((fact) => `- ${fact}`));
    lines.push('Используй их как добавленную ценность, но не повторяй механически. Расчетную длительность добавляй только если ее нет в исходном описании.');
  }
  lines.push('Исходное описание:');
  lines.push(text);
  return { prompt: lines.join('\n'), truncated };
}

export function countRewriteVerifiedFacts(meta: RewriteDescriptionMeta = {}): number {
  const scalarFacts = [meta.city, meta.venue, meta.venueAddress, meta.ageLimit, meta.category]
    .filter((value) => String(value || '').trim()).length;
  return scalarFacts + (formatScheduledDurationFact(meta.scheduledDurationMinutes) ? 1 : 0);
}

export type RewriteStructureValidation = {
  valid: boolean;
  errors: string[];
  headings: string[];
  featureCount: number;
};

/** Guard against one-block AI copy and fake structure before it reaches the editor. */
export function validateRewriteStructure(
  value: string,
  options: { requireFeatures?: boolean } = {},
): RewriteStructureValidation {
  const text = String(value || '').replace(/\r\n?/g, '\n').trim();
  const lines = text.split('\n');
  const headings: string[] = [];
  let firstHeadingIndex = -1;
  let featuresHeadingIndex = -1;

  for (const [index, rawLine] of lines.entries()) {
    const match = rawLine.trim().match(/^##\s+(.+?)\s*$/u);
    if (!match) continue;
    const heading = String(match[1] || '').trim().replace(/:$/u, '');
    headings.push(heading);
    if (firstHeadingIndex < 0) firstHeadingIndex = index;
    if (/^особенности$/iu.test(heading)) featuresHeadingIndex = index;
  }

  let featureCount = 0;
  if (featuresHeadingIndex >= 0) {
    for (let index = featuresHeadingIndex + 1; index < lines.length; index += 1) {
      const line = lines[index]!.trim();
      if (/^##\s+/u.test(line)) break;
      if (/^[-*]\s+\S/u.test(line)) featureCount += 1;
    }
  }

  const intro = firstHeadingIndex > 0 ? lines.slice(0, firstHeadingIndex).join('\n').trim() : '';
  const errors: string[] = [];
  if (intro.length < 40) errors.push('Нужно короткое содержательное вступление перед секциями.');
  if (headings.length < 2) errors.push('Нужно не менее двух смысловых секций с заголовками ##.');
  if (headings.some((heading) => /^о событии$/iu.test(heading))) {
    errors.push('Не нужно дублировать интерфейсный заголовок «О событии».');
  }
  if (featuresHeadingIndex < 0 && options.requireFeatures) {
    errors.push('Нужна секция ## Особенности.');
  } else if (featuresHeadingIndex >= 0 && featureCount < 2) {
    errors.push('В секции «Особенности» нужно не менее двух подтвержденных пунктов.');
  }

  return { valid: errors.length === 0, errors, headings, featureCount };
}

export function sanitizeRewriteOutput(raw: string): string {
  let text = String(raw || '').trim();
  if (!text) return '';

  // Strip common model preambles / fences.
  text = text.replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/i, '').trim();
  text = text.replace(/^(вот(?:\s+ваш)?\s+текст|готовый\s+текст|rewritten\s+text)\s*[:\-–—]?\s*/i, '');
  text = text.replace(/^["«]\s*/, '').replace(/\s*["»]$/, '');
  return text.trim();
}

export function assertRewriteCooldown(eventId: string, now = Date.now(), cooldownMs = AI_REWRITE_COOLDOWN_MS): void {
  const key = String(eventId || '').trim();
  if (!key) return;
  const last = lastRewriteAtByEvent.get(key);
  if (last != null && now - last < cooldownMs) {
    throw new AiRewriteError(
      'rate_limited',
      `Подождите ${Math.ceil((cooldownMs - (now - last)) / 1000)} с перед повторным рерайтом`,
      429,
    );
  }
  lastRewriteAtByEvent.set(key, now);
}

/** Test helper — clears in-process cooldown map. */
export function resetRewriteCooldownForTests(): void {
  lastRewriteAtByEvent.clear();
}

export function resolveOpenAiApiKey(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.OPENAI_API_KEY || '').trim();
}

export function resolveRewriteModel(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.OPENAI_REWRITE_MODEL || '').trim() || AI_REWRITE_DEFAULT_MODEL;
}

type OpenAiChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } | null } | null> | null;
  error?: { message?: string } | null;
};

export async function callOpenAiRewrite(params: {
  systemPrompt?: string | undefined;
  userPrompt: string;
  apiKey?: string | undefined;
  model?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
}): Promise<{ text: string; model: string }> {
  const apiKey = String(params.apiKey || resolveOpenAiApiKey()).trim();
  if (!apiKey) {
    throw new AiRewriteError(
      'missing_openai_key',
      'OPENAI_API_KEY не задан на сервере. Добавьте ключ в env backend.',
      503,
    );
  }

  const model = String(params.model || resolveRewriteModel()).trim() || AI_REWRITE_DEFAULT_MODEL;
  const fetchImpl = params.fetchImpl || fetch;
  const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: params.systemPrompt || SYSTEM_PROMPT },
        { role: 'user', content: params.userPrompt },
      ],
    }),
  });

  const rawBody = await response.text().catch(() => '');
  let parsed: OpenAiChatCompletionResponse | null = null;
  try {
    parsed = rawBody ? (JSON.parse(rawBody) as OpenAiChatCompletionResponse) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const apiMessage = parsed?.error?.message || rawBody.slice(0, 200) || response.statusText;
    throw new AiRewriteError(
      'openai_http_error',
      `OpenAI ошибка HTTP ${response.status}: ${apiMessage}`,
      response.status === 429 ? 429 : 502,
    );
  }

  const content = parsed?.choices?.[0]?.message?.content;
  const text = sanitizeRewriteOutput(content || '');
  if (!text) {
    throw new AiRewriteError('empty_model_output', 'Модель вернула пустой текст', 502);
  }

  return { text, model };
}

export async function rewriteEventDescription(params: {
  eventId?: string | null;
  originalDescription: string;
  meta?: RewriteDescriptionMeta;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  skipCooldown?: boolean;
}): Promise<RewriteDescriptionResult> {
  const eventId = String(params.eventId || '').trim();
  if (eventId && !params.skipCooldown) {
    assertRewriteCooldown(eventId);
  }

  const { prompt, truncated } = buildRewriteUserPrompt(params.originalDescription, params.meta);
  const { text, model } = await callOpenAiRewrite({
    userPrompt: prompt,
    apiKey: params.apiKey,
    model: params.model,
    fetchImpl: params.fetchImpl,
  });

  const structure = validateRewriteStructure(text, {
    requireFeatures: countRewriteVerifiedFacts(params.meta) >= 2,
  });
  if (!structure.valid) {
    throw new AiRewriteError(
      'invalid_rewrite_structure',
      `Модель нарушила канон структуры: ${structure.errors.join(' ')}`,
      502,
    );
  }

  return { text, model, truncatedInput: truncated };
}

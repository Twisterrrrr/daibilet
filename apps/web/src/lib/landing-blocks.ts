import type { LandingContentBlockDto } from '@daibilet/contracts/landing';

export type LandingBlockItem = {
  title: string;
  text: string;
  question: string;
  answer: string;
  count: number;
};

export function landingBlockItems(block: LandingContentBlockDto): LandingBlockItem[] {
  const items = block.payload?.items;
  if (!Array.isArray(items)) return [];

  return items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      title: String(item.title ?? ''),
      text: String(item.text ?? ''),
      question: String(item.question ?? ''),
      answer: String(item.answer ?? ''),
      count: typeof item.count === 'number' ? item.count : Number(item.count || 0),
    }))
    .filter((item) => item.title || item.question);
}

export function sortLandingBlocks(blocks: LandingContentBlockDto[]): LandingContentBlockDto[] {
  return [...blocks]
    .filter((block) => block.isEnabled !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export function defaultLandingFaqItems(landingTitle: string): Array<{ question: string; answer: string }> {
  const title = landingTitle.toLowerCase();
  return [
    {
      question: 'Как выбрать подходящий вариант?',
      answer: 'Используйте фильтры по дате, городу и сортировку по цене или времени.',
    },
    {
      question: 'Где происходит оплата?',
      answer: 'Оплата проходит в официальном виджете билетной системы организатора.',
    },
    {
      question: 'Можно ли вернуть билет?',
      answer: 'Условия возврата зависят от организатора — они указаны при оформлении заказа.',
    },
    {
      question: `Что входит в подборку «${title}»?`,
      answer: 'События подбираются по тематике подборки и обновляются при импорте из билетных систем.',
    },
  ];
}

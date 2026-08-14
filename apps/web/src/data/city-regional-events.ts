/**
 * Editorial regional festivals per city hub.
 * Auto-ingest is NOT wired: no live KudaGo/Yandex/TimePad client here.
 * Fill dates only from named official/press sources. Empty cities hide the block.
 */

export type CityRegionalEvent = {
  id: string;
  title: string;
  /** Inclusive calendar dates, ISO YYYY-MM-DD. */
  startDate: string;
  endDate: string;
  datesLabel: string;
  place: string;
  blurb: string;
  sourceUrl: string;
  sourceLabel: string;
  /** Optional Daibilet event/venue path when catalog actually has it. */
  href?: string;
};

export const CITY_REGIONAL_EVENTS: Record<string, CityRegionalEvent[]> = {
  perm: [
    {
      id: 'perm-flahertiana-2026',
      title: 'Флаэртиана',
      startDate: '2026-09-25',
      endDate: '2026-10-01',
      datesLabel: '25 сентября - 1 октября 2026',
      place: 'Пермская синематека, кинотеатр «Кристалл»',
      blurb: 'XXVI международный фестиваль документального кино - главное осеннее кинособытие Перми.',
      sourceUrl: 'https://www.permcinema.ru/festival-projects/flaertiana/',
      sourceLabel: 'permcinema.ru',
    },
    {
      id: 'perm-diaghilev-2026',
      title: 'Дягилевский фестиваль',
      startDate: '2026-06-11',
      endDate: '2026-06-20',
      datesLabel: '11-20 июня 2026',
      place: 'Пермь, площадки фестиваля и Хохловка',
      blurb: 'Современный танец, хоры, симфония и перформансы. Главный летний культурный якорь города.',
      sourceUrl: 'https://diaghilevfest.ru/media/mediatec/8650/',
      sourceLabel: 'diaghilevfest.ru',
    },
    {
      id: 'perm-kamwa-2026',
      title: 'KAMWA',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      datesLabel: '1-2 августа 2026',
      place: 'Полазна, центр активного отдыха',
      blurb: 'Юбилейный open-air современных этнических культур: музыка, ярмарка мастеров, этномода.',
      sourceUrl: 'https://www.kamwa.ru/',
      sourceLabel: 'kamwa.ru',
    },
    {
      id: 'perm-nebesnaya-yarmarka-2026',
      title: 'Небесная ярмарка',
      startDate: '2026-07-04',
      endDate: '2026-07-11',
      datesLabel: '4-11 июля 2026',
      place: 'Кунгур',
      blurb: 'Фестиваль воздухоплавания в Кунгуре: старты аэростатов и вечернее шоу на стадионе «Труд».',
      sourceUrl: 'https://59.ru/text/culture/2026/06/04/76459457/',
      sourceLabel: '59.ru',
    },
    {
      id: 'perm-night-of-museums-2026',
      title: 'Ночь музеев',
      startDate: '2026-05-16',
      endDate: '2026-05-16',
      datesLabel: '16 мая 2026',
      place: 'Музеи Перми и края',
      blurb: 'Всероссийская акция: галерея, PERMM, краеведческий музей и площадки края, тема «Родное».',
      sourceUrl: 'https://www.sobaka.ru/prm/entertainment/art/214708',
      sourceLabel: 'sobaka.ru',
    },
  ],
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMin: number;
  tag: string;
  city?: string;
  imageUrl: string;
  imageAlt: string;
};

/** Обложки — локальная статика (/images/blog), источники: Yandex Cloud + Teplohod. */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'kak-vybrat-koncert',
    title: 'Как выбрать концерт: 7 признаков живого звука',
    excerpt: 'Разбираем акустику залов, лайв-миксы и почему билет на первый ряд — не всегда лучший вариант.',
    date: '3 июля 2026',
    readMin: 6,
    tag: 'Гид',
    imageUrl: '/images/blog/concert.jpg',
    imageAlt: 'Зал с живым концертом и зрителями',
  },
  {
    slug: 'kuda-poyti-s-detmi',
    title: 'Куда пойти с детьми: спектакли, мастер-классы и музеи',
    excerpt: 'Подборка событий 0+/6+ с честными оценками родителей и коротким чек-листом «взять с собой».',
    date: '28 июня 2026',
    readMin: 5,
    tag: 'Семья',
    imageUrl: '/images/blog/family.jpg',
    imageAlt: 'Семья на детском мероприятии',
  },
  {
    slug: 'spb-rooftop-guide',
    title: 'Крыши Петербурга: 12 легальных площадок с гидом',
    excerpt: 'Панорамные виды, безопасные маршруты и цены. Плюс список экскурсий, которые пускают на закате.',
    date: '20 июня 2026',
    readMin: 8,
    tag: 'Города',
    city: 'Санкт-Петербург',
    imageUrl: '/images/blog/spb-rooftops.jpg',
    imageAlt: 'Панорама Санкт-Петербурга с крыш и каналов',
  },
  {
    slug: 'chto-poslushat-jazz',
    title: 'Джаз для новичка: с чего начать и куда пойти',
    excerpt: 'Пять клубов, шесть альбомов и один плейлист, чтобы полюбить жанр за неделю.',
    date: '12 июня 2026',
    readMin: 7,
    tag: 'Музыка',
    city: 'Москва',
    imageUrl: '/images/blog/jazz.jpg',
    imageAlt: 'Джазовый клуб, саксофон крупным планом',
  },
];

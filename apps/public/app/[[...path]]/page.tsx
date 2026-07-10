import type { Metadata } from 'next';

import { NextPublicRoute } from '@/NextPublicRoute';

type RouteParams = {
  path?: string[];
};
type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = {
  params?: Promise<RouteParams>;
  searchParams?: Promise<SearchParams>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const path = await resolvePath(params);
  const profile = resolveRouteProfile(path);

  return {
    title: profile.title,
    description: profile.description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: profile.title,
      description: profile.description,
      url: path,
    },
  };
}

export default async function PublicPage({ params, searchParams }: PageProps) {
  const [path, search] = await Promise.all([resolvePath(params), resolveSearch(searchParams)]);
  return <NextPublicRoute path={path} search={search} />;
}

async function resolvePath(params?: PageProps['params']): Promise<string> {
  const resolved = await params;
  const segments = resolved?.path || [];
  if (!segments.length) return '/';
  return `/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

async function resolveSearch(searchParams?: PageProps['searchParams']): Promise<string> {
  const resolved = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolved || {})) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (typeof value === 'string') {
      params.set(key, value);
    }
  }

  return params.toString();
}

function resolveRouteProfile(path: string): { title: string; description: string } {
  const [section] = path.split('/').filter(Boolean);

  if (!section) {
    return {
      title: 'Афиша, экскурсии и билеты',
      description: 'Дайбилет собирает экскурсии, музеи, мероприятия, активный отдых и развлечения в городах России.',
    };
  }

  if (section === 'events') {
    return {
      title: 'Каталог событий, экскурсий и билетов',
      description: 'Фильтры по городу, дате, категории, цене, площадке и тематическим подборкам.',
    };
  }

  if (section === 'cities') {
    return {
      title: 'Города России',
      description: 'Выбор города для поездки, афиша событий, экскурсии, музеи, площадки и тематические подборки.',
    };
  }

  if (section === 'venues') {
    return {
      title: 'Площадки России',
      description: 'Страницы площадок с афишей, событиями, адресами и полезной информацией для посетителей.',
    };
  }

  if (section === 'landings' || section === 'podborki') {
    return {
      title: 'Подборки событий',
      description: 'Тематические страницы с быстрыми фильтрами, расписанием и удобным переходом к покупке билетов.',
    };
  }

  if (section === 'my-orders') {
    return {
      title: 'Проверить заказ',
      description: 'Проверка статуса покупки и билетов по номеру заказа или email.',
    };
  }

  if (section === 'account') {
    return {
      title: 'Мои покупки',
      description: 'Личный кабинет покупателя с историей покупок и статусами билетов.',
    };
  }

  if (section === 'help') {
    return {
      title: 'Помощь',
      description: 'Ответы на частые вопросы о покупке билетов, статусах заказов и работе сервиса Дайбилет.',
    };
  }

  if (section === 'about') {
    return {
      title: 'О сервисе',
      description: 'Дайбилет помогает находить события, экскурсии, музеи и развлечения в городах России.',
    };
  }

  return {
    title: 'Дайбилет',
    description: 'Каталог экскурсий, музеев, мероприятий, активного отдыха и развлечений.',
  };
}

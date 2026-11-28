import Link from 'next/link';

export function EventPageScheduleNotice({
  availability,
  city,
  citySlug,
}: {
  availability?: 'AVAILABLE' | 'ENDED' | 'NO_UPCOMING' | null;
  city: string;
  citySlug: string;
}) {
  if (availability !== 'ENDED' && availability !== 'NO_UPCOMING') return null;
  const cityHref = citySlug ? `/events?city=${encodeURIComponent(citySlug)}` : '/events';
  const ended = availability === 'ENDED';

  return (
    <div className="container-page pt-4">
      <section
        aria-label={ended ? 'Событие завершилось' : 'Расписание события'}
        role="status"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 sm:px-5"
      >
        <p className="font-semibold">
          {ended ? 'Все опубликованные сеансы завершились.' : 'Актуальные сеансы пока не опубликованы.'}
        </p>
        <p className="mt-1 text-sm leading-relaxed">
          Страница события сохранена. Если расписание вернётся, оно появится здесь. Пока билеты недоступны; посмотрите другие мероприятия{city ? ` в городе ${city}` : ''}.
        </p>
        <Link className="mt-3 inline-flex text-sm font-semibold underline decoration-amber-500 underline-offset-4" href={cityHref}>
          Другие мероприятия{city ? ` в городе ${city}` : ''}
        </Link>
      </section>
    </div>
  );
}

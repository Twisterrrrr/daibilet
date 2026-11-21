'use client';

import * as React from 'react';
import Link from 'next/link';
import type { PublicEventPageDto } from '@daibilet/contracts/public';

type RequestedSessionContext = NonNullable<PublicEventPageDto['requestedSessionContext']>;

export function ExpiredEventSessionNotice({
  context,
}: {
  context?: RequestedSessionContext | null;
}) {
  const [isExpired, setIsExpired] = React.useState(false);

  React.useEffect(() => {
    if (!context) return;
    const expiresAt = new Date(context.endsAt || context.startsAt).getTime();
    const update = () => setIsExpired(Number.isFinite(expiresAt) && Date.now() > expiresAt);
    const initialCheck = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 30_000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(timer);
    };
  }, [context]);

  if (!context || !isExpired) return null;

  const cityHref = context.citySlug
    ? `/events?city=${encodeURIComponent(context.citySlug)}`
    : '/events';

  return (
    <div className="container-page pt-4">
      <section
        aria-label="Информация о прошедшем сеансе"
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 sm:px-5"
      >
        <p className="font-semibold">
          Событие на {context.dateLabel}{context.timeLabel ? `, ${context.timeLabel}` : ''} уже завершилось.
        </p>
        <p className="mt-1 text-sm leading-relaxed">
          Посмотрите актуальное расписание этого события ниже или выберите другие мероприятия в городе {context.cityName}.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <a className="underline decoration-amber-500 underline-offset-4" href="#buy-card">
            Актуальные сеансы
          </a>
          <Link className="underline decoration-amber-500 underline-offset-4" href={cityHref}>
            Другие мероприятия в городе
          </Link>
        </div>
      </section>
    </div>
  );
}

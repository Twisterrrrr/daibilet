import * as React from 'react';

import { msUntilNextMidnight, SITE_TIME_ZONE } from '@/lib/datetime';

/** Текущая дата для H1; пересчитывается после полуночи (Europe/Moscow). */
export function useLandingTodayReference(timeZone: string = SITE_TIME_ZONE): Date {
  const [reference, setReference] = React.useState(() => new Date());

  React.useEffect(() => {
    let timeoutId = 0;
    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        setReference(new Date());
        schedule();
      }, msUntilNextMidnight(timeZone));
    };
    schedule();
    return () => window.clearTimeout(timeoutId);
  }, [timeZone]);

  return reference;
}

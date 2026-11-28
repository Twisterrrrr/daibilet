'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** Prod counter; override via NEXT_PUBLIC_YANDEX_METRIKA_ID. */
export const YANDEX_METRIKA_DEFAULT_ID = 106786540;

function resolveMetrikaId(): number {
  const fromEnv = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return YANDEX_METRIKA_DEFAULT_ID;
}

function isAdminPath(pathname: string | null): boolean {
  return Boolean(pathname && (pathname === '/admin' || pathname.startsWith('/admin/')));
}

/**
 * Яндекс.Метрика for public pages only (not /admin).
 * Init via next/script afterInteractive; SPA hits on App Router navigations.
 */
export function YandexMetrika() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const counterId = resolveMetrikaId();
  const skipAdmin = isAdminPath(pathname);
  const isFirstHit = useRef(true);

  useEffect(() => {
    if (skipAdmin) return;
    if (typeof window === 'undefined' || typeof window.ym !== 'function') return;

    // First paint is covered by ym(..., 'init', { url }).
    if (isFirstHit.current) {
      isFirstHit.current = false;
      return;
    }

    try {
      window.ym(counterId, 'hit', window.location.href);
    } catch {
      // ignore
    }
  }, [pathname, searchParams, counterId, skipAdmin]);

  if (skipAdmin) return null;

  const initOptions = {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    accurateTrackBounce: true,
    trackLinks: true,
  };

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">{`
(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${counterId}', 'ym');
ym(${counterId}, 'init', Object.assign(${JSON.stringify(initOptions)}, {
  referrer: document.referrer,
  url: location.href
}));
`}</Script>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${counterId}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}

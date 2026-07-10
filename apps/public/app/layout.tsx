import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '../src/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://daibilet.ru'),
  title: {
    default: 'Дайбилет — афиша, экскурсии и билеты',
    template: '%s | Дайбилет',
  },
  description: 'Каталог экскурсий, музеев, мероприятий, активного отдыха и развлечений в городах России.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    siteName: 'Дайбилет',
    type: 'website',
    locale: 'ru_RU',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

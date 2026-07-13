import type { Metadata } from 'next';

import './globals.css';

const SITE_URL = process.env.DAIBILET_SITE_URL || 'https://daibilet.ru';
const SITE_NAME = 'Дайбилет';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: 'Дайбилет — экскурсии, музеи и билеты',
    template: '%s | Дайбилет',
  },
  description: 'Афиша событий, экскурсий и мероприятий в городах России. Билеты онлайн.',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Дайбилет — экскурсии, музеи и билеты',
    description: 'Афиша событий, экскурсий и мероприятий в городах России. Билеты онлайн.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Дайбилет — экскурсии, музеи и билеты',
    description: 'Афиша событий, экскурсий и мероприятий в городах России. Билеты онлайн.',
  },
  other: {
    'apple-mobile-web-app-title': SITE_NAME,
  },
};

const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: ['Daibilet', 'daibilet.ru'],
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.ico`,
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: ['Daibilet', 'daibilet.ru'],
      url: SITE_URL,
      inLanguage: 'ru-RU',
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/events?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

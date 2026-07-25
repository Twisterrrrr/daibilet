import type { Metadata } from 'next';

import { ChunkLoadRecovery } from '@/components/ChunkLoadRecovery';
import { fontVariableClassName } from '@/lib/fonts';
import { HOME_SEO_DESCRIPTION_FALLBACK, HOME_SEO_TITLE } from '@/lib/seo-meta';

import './globals.css';

const SITE_URL = process.env.DAIBILET_SITE_URL || 'https://daibilet.ru';
const SITE_NAME = 'Дайбилет';

/** Favicon / PWA: силуэт билета ~90% кадра (мало padding во вкладке). */
const ICON_32 = '/favicon-32x32.png';
const ICON_48 = '/favicon-48x48.png';
const ICON_96 = '/favicon-96x96.png';
const ICON_192 = '/icon-192x192.png';
const ICON_512 = '/icon-512x512.png';
const LOGO_192 = '/logo-192x192.png';
const APPLE_TOUCH = '/apple-touch-icon.png';
const FAVICON_ICO = '/favicon.ico';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: HOME_SEO_TITLE,
    template: '%s | Дайбилет',
  },
  description: HOME_SEO_DESCRIPTION_FALLBACK,
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: ICON_48, sizes: '48x48', type: 'image/png' },
      { url: ICON_32, sizes: '32x32', type: 'image/png' },
      { url: ICON_96, sizes: '96x96', type: 'image/png' },
      { url: ICON_192, sizes: '192x192', type: 'image/png' },
      { url: ICON_512, sizes: '512x512', type: 'image/png' },
      { url: FAVICON_ICO, sizes: '48x48', type: 'image/x-icon' },
    ],
    shortcut: ICON_48,
    apple: [{ url: APPLE_TOUCH, sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION_FALLBACK,
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION_FALLBACK,
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
        url: `${SITE_URL}${LOGO_192}`,
        width: 192,
        height: 192,
      },
      image: `${SITE_URL}${LOGO_192}`,
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
    <html lang="ru" className={fontVariableClassName}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body className="font-sans">
        <ChunkLoadRecovery />
        {children}
      </body>
    </html>
  );
}

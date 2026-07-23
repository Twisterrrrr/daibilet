import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    absolute: 'Превью статьи | Админка',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

/** Isolated from AdminNextShell so preview matches public blog chrome. Auth via middleware. */
export default function ArticlePreviewLayout({ children }: { children: ReactNode }) {
  return children;
}

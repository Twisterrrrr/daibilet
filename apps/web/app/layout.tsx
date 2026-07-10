import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Дайбилет',
  description: 'Афиша событий, экскурсий и билетов',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

import * as React from 'react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

function goSection(section: string) {
  if (section === 'top') window.location.href = '/';
  else if (section === 'events') window.location.href = '/events';
  else if (section === 'orders') window.location.href = '/my-orders';
  else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
  else if (section === 'blog') window.location.href = '/blog';
  else window.location.href = `/#${section}`;
}

export function TrustPageShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  React.useEffect(() => {
    document.title = `${title} | Дайбилет`;
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', description);
    }
  }, [title, description]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel="Все города" onSection={goSection} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

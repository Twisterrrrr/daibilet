import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <Link href="/" className="text-lg font-bold text-slate-900">
          Дайбилет
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-600">
          <Link href="/events" className="hover:text-primary">
            События
          </Link>
          <Link href="/cities" className="hover:text-primary">
            Города
          </Link>
          <Link href="/venues" className="hover:text-primary">
            Площадки
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-8 text-sm text-slate-500">
      <div className="container-page">© {new Date().getFullYear()} Дайбилет</div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

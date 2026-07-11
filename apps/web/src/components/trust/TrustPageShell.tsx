import { SiteLayout } from '@/components/SiteLayout';

export function TrustPageShell({
  children,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <SiteLayout>
      <main className="bg-white text-slate-900">{children}</main>
    </SiteLayout>
  );
}

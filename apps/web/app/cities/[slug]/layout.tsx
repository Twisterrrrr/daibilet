import { fontSourceSerif } from '@/lib/fonts';

export default function CityLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={fontSourceSerif.className}>{children}</div>;
}

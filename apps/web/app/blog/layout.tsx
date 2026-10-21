import { fontSourceSerif } from '@/lib/fonts';

export default function BlogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={fontSourceSerif.className}>{children}</div>;
}

import * as React from 'react';
import { ChevronRight } from 'lucide-react';

export type BreadcrumbItem = { label: string; href?: string };

/** Белая полоска над hero — как в Lovable и на страницах площадок/локаций. */
export function PageBreadcrumbBar({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;
  const lastIndex = items.length - 1;
  return (
    <div className="border-b border-slate-200 bg-white">
      <nav
        aria-label="Хлебные крошки"
        className="container-page flex min-h-11 items-center gap-1.5 overflow-hidden py-3 text-sm text-slate-500"
      >
        {items.map((item, index) => {
          const isLast = index === lastIndex;
          return (
            <React.Fragment key={`${item.label}:${index}`}>
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden /> : null}
              {item.href ? (
                <a
                  href={item.href}
                  title={item.label}
                  className={
                    isLast
                      ? 'min-w-0 truncate text-slate-900 transition-colors hover:text-primary-600'
                      : 'shrink-0 transition-colors hover:text-primary-600'
                  }
                >
                  {item.label}
                </a>
              ) : (
                <span title={item.label} className={isLast ? 'min-w-0 truncate text-slate-900' : 'shrink-0 text-slate-900'}>
                  {item.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}

/** Hero раздела: крошки снаружи, заголовок на градиенте. */
export function SectionPageHero({
  breadcrumbs,
  gradientClass,
  eyebrow,
  title,
  description,
  children,
}: {
  breadcrumbs: BreadcrumbItem[];
  gradientClass: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <>
      <PageBreadcrumbBar items={breadcrumbs} />
      <section className={`border-b border-slate-200 bg-gradient-to-br ${gradientClass} text-white`}>
        <div className="container-page py-10 sm:py-14">
          {eyebrow}
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">{title}</h1>
          {description ? <p className="mt-3 max-w-2xl text-base text-white/85 sm:text-lg">{description}</p> : null}
          {children}
        </div>
      </section>
    </>
  );
}

/** Встроенные крошки внутри контента (legacy). */
export function PageBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Хлебные крошки" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
      {items.map((item, index) => (
        <span key={`${item.label}:${index}`} className="inline-flex items-center gap-2">
          {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden /> : null}
          {item.href ? (
            <a href={item.href} className="transition-colors hover:text-primary-600">
              {item.label}
            </a>
          ) : (
            <span className="text-slate-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

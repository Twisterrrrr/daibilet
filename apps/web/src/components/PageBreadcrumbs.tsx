import * as React from 'react';
import { ChevronRight } from 'lucide-react';

export type BreadcrumbItem = { label: string; href?: string };

/** Белая полоска над hero - как в Lovable и на страницах площадок/локаций. */
export function PageBreadcrumbBar({
  items,
  className,
  hideOnMobile = false,
}: {
  items: BreadcrumbItem[];
  /** Extra classes on the root strip (opt-in; does not change default visibility). */
  className?: string;
  /** Keep breadcrumbs in DOM for SEO/a11y, visually hide below md. */
  hideOnMobile?: boolean;
}) {
  if (!items.length) return null;
  const lastIndex = items.length - 1;
  return (
    <div
      className={['border-b border-slate-200 bg-white', hideOnMobile ? 'hidden md:block' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
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

/**
 * Единый hero раздела: крошки + нейтральный strip (bg-slate-50), H1 + support.
 * Без full-bleed фото и цветных градиентов - один язык для /events, /blog, city, /podborki.
 */
export function SectionPageHero({
  breadcrumbs,
  eyebrow,
  title,
  description,
  children,
  /** @deprecated Игнорируется: градиенты убраны в пользу нейтрального strip. */
  gradientClass: _gradientClass,
}: {
  breadcrumbs: BreadcrumbItem[];
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  gradientClass?: string;
}) {
  return (
    <>
      <PageBreadcrumbBar items={breadcrumbs} />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container-page py-8 sm:py-10">
          {eyebrow}
          <h1
            className={[
              'font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl',
              eyebrow ? 'mt-2' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{description}</p>
          ) : null}
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

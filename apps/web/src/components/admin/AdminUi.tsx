import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shared admin UI primitives. Every admin screen builds its chrome from these
 * blocks so sections read as one product instead of unrelated floating cards.
 */

export const adminInputClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200';

export const adminMonoInputClass = `${adminInputClass} font-mono`;
export const adminTextareaClass = `${adminInputClass} leading-relaxed`;
export const adminSelectClass = adminInputClass;

const BUTTON_VARIANTS = {
  primary: 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  warning: 'border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100',
  danger: 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100',
  ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
} as const;

export type AdminButtonVariant = keyof typeof BUTTON_VARIANTS;

const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
} as const;

export type AdminButtonSize = keyof typeof BUTTON_SIZES;

type AdminButtonProps = {
  children: ReactNode;
  href?: string;
  type?: 'submit' | 'button';
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  className?: string;
  disabled?: boolean;
  title?: string;
  target?: string;
  rel?: string;
};

export function AdminButton({
  children,
  href,
  type = 'button',
  variant = 'secondary',
  size = 'sm',
  className = '',
  disabled,
  title,
  target,
  rel,
}: AdminButtonProps) {
  const classes = `inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${
    disabled ? 'cursor-not-allowed opacity-50' : ''
  } ${className}`;

  if (href) {
    if (/^https?:/i.test(href)) {
      return (
        <a href={href} className={classes} title={title} target={target} rel={rel}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} title={title} target={target} rel={rel}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

const BADGE_TONES = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
} as const;

export type AdminBadgeTone = keyof typeof BADGE_TONES;

export function AdminBadge({
  children,
  tone = 'neutral',
  title,
}: {
  children: ReactNode;
  tone?: AdminBadgeTone;
  title?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${BADGE_TONES[tone]}`}
      title={title}
    >
      {children}
    </span>
  );
}

const NOTICE_TONES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
} as const;

export function AdminNotice({
  children,
  tone = 'success',
}: {
  children: ReactNode;
  tone?: keyof typeof NOTICE_TONES;
}) {
  return (
    <div role="status" className={`rounded-lg border px-4 py-2 text-sm ${NOTICE_TONES[tone]}`}>
      {children}
    </div>
  );
}

export function AdminBreadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Навигационная цепочка" className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      {items.map((item, index) => (
        <span key={`${item.label}:${index}`} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden>/</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-800 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="max-w-[40ch] truncate text-slate-700">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AdminPageHeader({
  breadcrumbs,
  title,
  description,
  actions,
  badge,
}: {
  breadcrumbs?: Array<{ label: string; href?: string }>;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <header className="border-b border-slate-200 pb-5">
      {breadcrumbs?.length ? (
        <div className="mb-2">
          <AdminBreadcrumbs items={breadcrumbs} />
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {badge}
          </div>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function AdminSection({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-relaxed text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function AdminCheckbox({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-slate-300"
      />
      <span>
        {label}
        {hint ? <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{hint}</span> : null}
      </span>
    </label>
  );
}

export function AdminStat({
  label,
  value,
  suffix,
}: {
  label: ReactNode;
  value: number | string | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <div className="text-lg font-semibold tabular-nums text-slate-900">
        {value == null ? '—' : value}
        {value != null && suffix ? ` ${suffix}` : ''}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export function AdminDangerZone({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50/40">
      <div className="border-b border-rose-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-rose-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-rose-800/80">{description}</p>
        ) : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export function AdminFormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-b-xl border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
      {children}
    </div>
  );
}
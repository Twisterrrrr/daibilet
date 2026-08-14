import type { MouseEvent } from 'react';

/** Надёжная навигация из блога (SPA без react-router). */
export function navigateBlogHref(href?: string | null) {
  const target = String(href || '').trim();
  if (!target) return;
  window.location.assign(target);
}

export function handleBlogLinkClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
  event.preventDefault();
  event.stopPropagation();
  navigateBlogHref(href);
}

/** Убираем залипший оверлей Ticketscloud — он может перекрывать клики в статье. */
export function cleanupBlogPageOverlays() {
  document.getElementById('tc-widget-overlay')?.remove();
  document.getElementById('ticketscloud-loader')?.remove();
  document.querySelectorAll('.tc-widget-container').forEach((node) => node.remove());
  const body = document.body;
  if (body.hasAttribute('data-overflow')) {
    body.style.overflow = body.getAttribute('data-overflow') || '';
    body.removeAttribute('data-overflow');
  }
}

import type { MouseEvent } from 'react';

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

export function cleanupBlogPageOverlays() {
  document.getElementById('tc-widget-overlay')?.remove();
  document.getElementById('tc-widget-overlay')?.remove();
  // Do not remove #ticketscloud-loader — in tcwidget.js it is a <style> in <head>, not the spinner DOM.
  document.querySelectorAll('.tc-widget-container').forEach((node) => node.remove());
  const body = document.body;
  if (body.hasAttribute('data-overflow')) {
    body.style.overflow = body.getAttribute('data-overflow') || '';
    body.removeAttribute('data-overflow');
  }
}

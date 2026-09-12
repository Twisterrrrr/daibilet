import type { MouseEvent } from 'react';

export function navigateBlogHref(href?: string | null) {
  const target = String(href || '').trim();
  if (!target) return;
  window.location.assign(target);
}

export function handleBlogLinkClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
  // Modifier / middle-click: leave native behaviour (new tab) - href must stay real.
  if (event.defaultPrevented) return;
  if (event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = String(href || '').trim();
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  navigateBlogHref(target);
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

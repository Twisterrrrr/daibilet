import localFont from 'next/font/local';

/**
 * Self-hosted from apps/web/public/fonts (downloaded from google/fonts).
 *
 * Was `next/font/google`, which fetched from fonts.googleapis.com at build
 * time. That made every CI build depend on Google being reachable: on 04.10 a
 * transient failure there aborted the deploy with
 * "An error occurred in `next/font`" while nothing in the repo had changed.
 * Local files remove the network dependency from the build.
 *
 * WOFF2 instead of raw TTF: 2.25 MB TTF → ~0.83 MB WOFF2. Source Serif 4 is the
 * heaviest family (city editorial hub only), so it ships preload: false and is
 * not a first-screen font. Inter is the UI fallback — preload: false. Manrope is
 * the only first-screen font and keeps preload: true.
 *
 * Variable fonts, so one file per family covers every weight below.
 */
export const fontInter = localFont({
  src: [{ path: '../../public/fonts/Inter-Variable.woff2', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
});

export const fontManrope = localFont({
  src: [{ path: '../../public/fonts/Manrope-Variable.woff2', style: 'normal' }],
  variable: '--font-manrope',
  display: 'swap',
  weight: '200 800',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});

export const fontSourceSerif = localFont({
  src: [{ path: '../../public/fonts/SourceSerif4-Variable.woff2', style: 'normal' }],
  variable: '--font-source-serif',
  display: 'swap',
  weight: '200 900',
  preload: false,
  fallback: ['Georgia', 'serif'],
});

/** Class list for `<html>`: CSS variables for sans-serif families consumed by globals.css + Tailwind. */
export const fontSansVariableClassName = [
  fontInter.variable,
  fontManrope.variable,
].join(' ');

/** Class injected by next/font to set `--font-source-serif` on a segment wrapper (blog / city hubs only). */
export const fontSerifClassName = fontSourceSerif.className;

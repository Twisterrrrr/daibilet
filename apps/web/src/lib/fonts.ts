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
 * Variable fonts, so one file per family covers every weight below.
 * Lovable MHTML: UI + titles = Manrope wght@400;500;600;700;800.
 * Inter kept as fallback variable; Source Serif 4 = city editorial hub only.
 */
export const fontInter = localFont({
  src: [{ path: '../../public/fonts/Inter-Variable.ttf', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  weight: '400 700',
  fallback: ['system-ui', 'sans-serif'],
});

export const fontManrope = localFont({
  src: [{ path: '../../public/fonts/Manrope-Variable.ttf', style: 'normal' }],
  variable: '--font-manrope',
  display: 'swap',
  weight: '400 800',
  fallback: ['system-ui', 'sans-serif'],
});

export const fontSourceSerif = localFont({
  src: [{ path: '../../public/fonts/SourceSerif4-Variable.ttf', style: 'normal' }],
  variable: '--font-source-serif',
  display: 'swap',
  weight: '500 700',
  fallback: ['Georgia', 'serif'],
});

/** Class list for `<html>`: CSS variables consumed by globals.css + Tailwind. */
export const fontVariableClassName = [
  fontInter.variable,
  fontManrope.variable,
  fontSourceSerif.variable,
].join(' ');

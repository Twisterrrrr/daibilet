import { Inter, Manrope, Source_Serif_4 } from 'next/font/google';

/**
 * Self-hosted via next/font (emitted to `/_next/static/media/*` at build).
 * Manrope = headings / display; Inter = UI body; Source Serif 4 = city editorial hub.
 */
export const fontInter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const fontManrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

export const fontSourceSerif = Source_Serif_4({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-source-serif',
  display: 'swap',
});

/** Class list for `<html>`: CSS variables consumed by globals.css + Tailwind. */
export const fontVariableClassName = [
  fontInter.variable,
  fontManrope.variable,
  fontSourceSerif.variable,
].join(' ');

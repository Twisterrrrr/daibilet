declare const process: { env?: Record<string, string | undefined> } | undefined;

const env = typeof process !== 'undefined' ? process.env || {} : {};

export const API_BASE_URL =
  env.NEXT_PUBLIC_DAIBILET_API_URL ||
  env.VITE_DAIBILET_API_URL ||
  '';

export const TC_WIDGET_TOKEN = env.NEXT_PUBLIC_TC_WIDGET_TOKEN || env.VITE_TC_WIDGET_TOKEN || '';

export const TEP_WIDGET_ID = env.NEXT_PUBLIC_TEP_WIDGET_ID || env.VITE_TEP_WIDGET_ID || '14208';

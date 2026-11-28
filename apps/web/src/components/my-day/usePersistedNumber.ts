'use client';

import { useCallback, useEffect, useState } from 'react';

function readNumber(key: string, fallback: number): number {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function writeNumber(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(Math.round(value)));
  } catch {
    /* ignore quota / private mode */
  }
}

export function usePersistedNumber(key: string, fallback: number) {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    setValue(readNumber(key, fallback));
  }, [key, fallback]);

  const commit = useCallback(
    (next: number) => {
      setValue(next);
      writeNumber(key, next);
    },
    [key],
  );

  return [value, commit] as const;
}

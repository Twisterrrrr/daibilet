'use client';

import { useEffect, useRef, useState } from 'react';

type CatalogPriceRangeProps = {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  gap?: number;
  disabled?: boolean;
  onChange: (min: number, max: number) => void;
};

/** Dual-thumb price range for catalog sidebar (desktop + mobile drawer). */
export function CatalogPriceRange({
  min,
  max,
  valueMin,
  valueMax,
  gap = 500,
  disabled = false,
  onChange,
}: CatalogPriceRangeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [localMin, setLocalMin] = useState(valueMin);
  const [localMax, setLocalMax] = useState(valueMax);

  useEffect(() => {
    setLocalMin(valueMin);
    setLocalMax(valueMax);
  }, [valueMin, valueMax]);

  const paintTrack = (lo: number, hi: number) => {
    const el = trackRef.current;
    if (!el || max <= min) return;
    const percentMin = ((lo - min) / (max - min)) * 100;
    const percentMax = ((hi - min) / (max - min)) * 100;
    el.style.background = `linear-gradient(to right, #e2e8f0 ${percentMin}%, #0f172a ${percentMin}%, #0f172a ${percentMax}%, #e2e8f0 ${percentMax}%)`;
  };

  useEffect(() => {
    paintTrack(localMin, localMax);
  }, [localMin, localMax, min, max]);

  const commit = (lo: number, hi: number) => {
    onChange(lo, hi);
  };

  const onRangeInput = (which: 'min' | 'max', raw: number) => {
    let lo = which === 'min' ? raw : localMin;
    let hi = which === 'max' ? raw : localMax;
    if (hi - lo < gap) {
      if (which === 'min') lo = hi - gap;
      else hi = lo + gap;
    }
    lo = Math.max(min, Math.min(lo, max - gap));
    hi = Math.min(max, Math.max(hi, min + gap));
    setLocalMin(lo);
    setLocalMax(hi);
    commit(lo, hi);
  };

  const onInputMin = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    onRangeInput('min', n);
  };

  const onInputMax = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    onRangeInput('max', n);
  };

  return (
    <div className="catalog-price-range">
      <div className="catalog-price-range__inputs">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={localMin}
          disabled={disabled}
          aria-label="Минимальная цена"
          onChange={(event) => onInputMin(event.target.value)}
          className="catalog-price-range__input"
        />
        <span aria-hidden className="text-slate-400">
          —
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={localMax}
          disabled={disabled}
          aria-label="Максимальная цена"
          onChange={(event) => onInputMax(event.target.value)}
          className="catalog-price-range__input"
        />
      </div>
      <div ref={trackRef} className="catalog-price-range__track">
        <input
          type="range"
          min={min}
          max={max}
          value={localMin}
          disabled={disabled}
          aria-label="Минимальная цена ползунок"
          onChange={(event) => onRangeInput('min', Number(event.target.value))}
          className="catalog-price-range__range"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={localMax}
          disabled={disabled}
          aria-label="Максимальная цена ползунок"
          onChange={(event) => onRangeInput('max', Number(event.target.value))}
          className="catalog-price-range__range"
        />
      </div>
    </div>
  );
}

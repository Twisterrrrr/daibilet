'use client';

type MyDayResizeHandleProps = {
  label: string;
  onDrag: (clientX: number) => void;
  className?: string;
  /** Default lg - picker can show from sm. */
  showFrom?: 'sm' | 'lg';
};

/** Desktop-only column resize: pointer drag, keyboard left/right. */
export function MyDayResizeHandle({
  label,
  onDrag,
  className = '',
  showFrom = 'lg',
}: MyDayResizeHandleProps) {
  const vis = showFrom === 'sm' ? 'sm:flex' : 'lg:flex';
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      data-my-day-resize-handle
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const target = event.currentTarget;
        target.setPointerCapture(event.pointerId);
        target.dataset.dragging = '1';
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.dataset.dragging !== '1') return;
        onDrag(event.clientX);
      }}
      onPointerUp={(event) => {
        event.currentTarget.dataset.dragging = '0';
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* already released */
        }
      }}
      onPointerCancel={(event) => {
        event.currentTarget.dataset.dragging = '0';
      }}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        onDrag(rect.left + (event.key === 'ArrowRight' ? 32 : -32));
      }}
      className={`group absolute inset-y-0 z-20 hidden w-3 cursor-col-resize touch-none items-stretch justify-center ${vis} ${className}`.trim()}
    >
      <span
        className="my-auto h-12 w-1 rounded-full bg-slate-300 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[dragging=1]:opacity-100 group-data-[dragging=1]:bg-primary-500"
        aria-hidden
      />
    </div>
  );
}

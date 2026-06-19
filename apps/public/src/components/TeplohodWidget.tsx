import * as React from 'react';

const DEFAULT_TEP_WIDGET_ID =
  ((import.meta as ImportMeta & { env?: { VITE_TEP_WIDGET_ID?: string } }).env?.VITE_TEP_WIDGET_ID as string | undefined) ||
  '14208';

const TEP_WIDGET_SCRIPT_URL = 'https://api.teplohod.info/v1/widget/widget.js';

const TEP_WIDGET_CSS = `
.teplohod-info-wrapper .ti-tickets-event-tickets-buy {
  display: flex !important;
  width: 100% !important;
  min-height: 2.75rem !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.5rem !important;
  border: 0 !important;
  border-radius: 0.75rem !important;
  background: #2563eb !important;
  padding: 0.75rem 1rem !important;
  color: #fff !important;
  cursor: pointer !important;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  line-height: 1.25rem !important;
  text-decoration: none !important;
  box-shadow: 0 12px 24px rgb(37 99 235 / 0.24) !important;
}
.teplohod-info-wrapper .ti-tickets-event-tickets-buy:hover {
  background: #1d4ed8 !important;
}
.teplohod-info-wrapper .ti-tickets-widget {
  max-width: 100% !important;
}
.teplohod-info-wrapper #deleted-block,
.teplohod-info-wrapper .ti-tickets-event-tickets-buy-closed {
  display: none !important;
}
`;

function normalizeTeplohodEventId(value?: string | number | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = raw.match(/(?:^tep-)?(\d+)$/i);
  return match ? match[1] : raw;
}

function reloadTeplohodWidgetScript() {
  document.querySelectorAll('script[data-daibilet-teplohod-widget="true"]').forEach((script) => script.remove());

  const script = document.createElement('script');
  script.src = TEP_WIDGET_SCRIPT_URL;
  script.defer = true;
  script.dataset.daibiletTeplohodWidget = 'true';
  document.body.appendChild(script);
}

export function TeplohodWidgetEmbed({
  tepEventId,
  externalEventId,
  tepWidgetId,
}: {
  tepEventId?: string | number | null;
  externalEventId?: string | number | null;
  tepWidgetId?: string | number | null;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = React.useState(false);
  const eventId = normalizeTeplohodEventId(tepEventId ?? externalEventId);

  React.useEffect(() => {
    if (!eventId || !containerRef.current) return;

    const container = containerRef.current;
    setHidden(false);
    const timer = window.setTimeout(reloadTeplohodWidgetScript, 100);
    const observer = new MutationObserver(() => {
      const deleted = container.querySelector('#deleted-block');
      const closed = container.querySelector('.ti-tickets-event-tickets-buy-closed');
      if (deleted || closed) {
        setHidden(true);
        observer.disconnect();
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [eventId]);

  if (!eventId || hidden) return null;

  return (
    <div className="mt-4" id="teplohod-widget">
      <style dangerouslySetInnerHTML={{ __html: TEP_WIDGET_CSS }} />
      <div
        ref={containerRef}
        className="teplohod-info-wrapper"
        data-lang="ru-RU"
        data-id={String(tepWidgetId || DEFAULT_TEP_WIDGET_ID)}
        data-event-id={eventId}
      />
      <p className="mt-2 text-xs leading-5 text-white/55">Покупка откроется в виджете Teplohod.info.</p>
    </div>
  );
}

export function getTeplohodWidgetIds(event: {
  externalId?: string | number | null;
  widgetProvider?: string | null;
  widgetPayload?: {
    provider?: string | null;
    tepEventId?: string | number | null;
    tepWidgetId?: string | number | null;
  } | null;
}) {
  const provider = String(event.widgetProvider || event.widgetPayload?.provider || '').toUpperCase();
  if (!provider.includes('TEPLOHOD')) return null;

  const tepEventId = normalizeTeplohodEventId(event.widgetPayload?.tepEventId ?? event.externalId);
  if (!tepEventId) return null;

  return {
    tepEventId,
    tepWidgetId: event.widgetPayload?.tepWidgetId || DEFAULT_TEP_WIDGET_ID,
  };
}

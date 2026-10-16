'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CHAT_TEXT_MAX_LEN, isChatVisitorKey, sanitizeChatText } from '@/lib/chat';
import { sendUserChatMessage } from '@/server/chat-actions';

type ChatMessageDto = {
  id: string;
  text: string;
  sender: string;
  createdAt: string;
};

const VISITOR_KEY_STORAGE = 'daibilet_chat_visitor_key';
const POLL_MS = 8000;

function getOrCreateVisitorKey(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY_STORAGE);
    if (isChatVisitorKey(existing)) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY_STORAGE, created);
    return created;
  } catch {
    // Private mode / storage disabled - ephemeral session, still works per-open.
    return crypto.randomUUID();
  }
}

/**
 * Floating support chat widget. Anonymous: identifies the visitor by a random
 * localStorage key. Polls /api/chat for the thread; sending goes through a
 * server action which also forwards the message to the admin Telegram chat.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visitorKeyRef = useRef<string>('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    if (!visitorKeyRef.current) return;
    try {
      const response = await fetch('/support/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorKey: visitorKeyRef.current }),
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { messages?: ChatMessageDto[] };
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
    } catch {
      // network hiccup - keep the last known thread
    }
  }, []);

  useEffect(() => {
    visitorKeyRef.current = getOrCreateVisitorKey();
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [open, refresh]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const clean = sanitizeChatText(text);
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sendUserChatMessage({ visitorKey: visitorKeyRef.current, text: clean });
      if (result.ok) {
        setText('');
        await refresh();
      } else {
        setError(result.error || 'Не удалось отправить.');
      }
    } catch {
      setError('Не удалось отправить.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      {open ? (
        <div className="flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Чат поддержки</p>
              <p className="text-xs text-slate-500">Отвечаем в течение рабочего дня</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть чат"
              className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-3">
            {messages.length === 0 ? (
              <p className="mt-4 text-center text-xs text-slate-500">
                Напишите вопрос - мы ответим здесь.
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'ADMIN' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.sender === 'ADMIN'
                        ? 'border border-slate-200 bg-white text-slate-800'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        message.sender === 'ADMIN' ? 'text-slate-400' : 'text-slate-300'
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-slate-100 px-3 py-3">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={2}
              maxLength={CHAT_TEXT_MAX_LEN}
              placeholder="Ваш вопрос..."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-rose-600">{error || ''}</span>
              <button
                type="submit"
                disabled={busy || !text.trim()}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800"
          aria-label="Открыть чат поддержки"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h8M8 14h5M21 12c0 4.418-4.03 8-9 8-1.02 0-2-.15-2.9-.44L4 21l1.3-3.1A7.4 7.4 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

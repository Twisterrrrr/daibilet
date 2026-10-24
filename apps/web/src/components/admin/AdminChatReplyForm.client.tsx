'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { sendAdminChatMessage } from '@/server/chat-actions';

/** Reply box for the admin chat thread - posts via server action, no page reload. */
export function AdminChatReplyForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const result = await sendAdminChatMessage({ sessionId, text });
      if (result.ok) {
        setText('');
        setNotice('Ответ отправлен.');
        router.refresh();
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
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        placeholder="Ответ посетителю..."
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Отправка...' : 'Ответить'}
        </button>
        {notice ? <span className="text-xs text-emerald-700">{notice}</span> : null}
        {error ? <span className="text-xs text-rose-700">{error}</span> : null}
      </div>
    </form>
  );
}

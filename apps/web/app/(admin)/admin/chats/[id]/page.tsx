import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminChatReplyForm } from '@/components/admin/AdminChatReplyForm.client';
import { formatAdminDateTime } from '@/lib/admin-ui';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminChatDetailPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const errors: string[] = [];

  let session: {
    id: string;
    createdAt: Date;
    messages: Array<{ id: string; text: string; sender: string; createdAt: Date }>;
  } | null = null;

  try {
    session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, text: true, sender: true, createdAt: true },
        },
      },
    });
  } catch (error) {
    errors.push(`chats: ${error instanceof Error ? error.message : 'db error'}`);
  }

  if (!session && errors.length === 0) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/chats" className="hover:underline">
          ← Чат поддержки
        </Link>
        <span>/</span>
        <span className="text-slate-700">
          {session ? formatAdminDateTime(session.createdAt.toISOString()) : id}
        </span>
      </div>

      <header>
        <h2 className="text-xl font-semibold text-slate-900">Переписка с посетителем</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ответить можно здесь или через Reply в Telegram.
        </p>
      </header>

      <AdminApiErrorBanner errors={errors} />

      {session ? (
        <>
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
              Сообщения ({session.messages.length})
            </div>
            <ul className="divide-y divide-slate-100 text-sm">
              {session.messages.length === 0 ? (
                <li className="px-4 py-6 text-center text-slate-500">Сообщений пока нет.</li>
              ) : (
                session.messages.map((message) => (
                  <li key={message.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 ${
                          message.sender === 'ADMIN'
                            ? 'border-sky-200 bg-sky-50 text-sky-800'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        {message.sender === 'ADMIN' ? 'Поддержка' : 'Посетитель'}
                      </span>
                      <span>{formatAdminDateTime(message.createdAt.toISOString())}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-slate-800">{message.text}</p>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Ответ</h3>
            <AdminChatReplyForm sessionId={session.id} />
          </section>
        </>
      ) : null}
    </div>
  );
}

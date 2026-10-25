import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { formatAdminDateTime } from '@/lib/admin-ui';
import { prisma } from '@/lib/db';
import { adminHasPermissions } from '@/server/admin-authorization';

export const dynamic = 'force-dynamic';

export default async function AdminChatsPage() {
  if (!(await adminHasPermissions(['support.read']))) return <AdminAccessDenied section="Чат поддержки" />;

  let sessions: Array<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    messages: Array<{ text: string; sender: string; createdAt: Date }>;
  }> = [];
  const errors: string[] = [];

  try {
    sessions = await prisma.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { text: true, sender: true, createdAt: true },
        },
      },
    });
  } catch (error) {
    errors.push(`chats: ${error instanceof Error ? error.message : 'db error'}`);
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Чат поддержки</h2>
        <p className="mt-1 text-sm text-slate-600">
          Обращения из виджета на сайте. Ответы из Telegram (Reply) попадают в ту же переписку.
        </p>
      </header>

      <AdminApiErrorBanner errors={errors} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Сессия</th>
                <th className="px-3 py-2 font-medium">Последнее сообщение</th>
                <th className="px-3 py-2 font-medium">Обновлена</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                    Обращений пока нет.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const last = session.messages[0];
                  return (
                    <tr key={session.id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/chats/${encodeURIComponent(session.id)}`}
                          className="font-medium text-sky-700 hover:underline"
                        >
                          {formatAdminDateTime(session.createdAt.toISOString())}
                        </Link>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {last?.sender === 'ADMIN' ? 'Ответ поддержки' : 'Посетитель'}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {last ? last.text.slice(0, 120) : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {formatAdminDateTime(session.updatedAt.toISOString())}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

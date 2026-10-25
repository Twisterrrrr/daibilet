'use server';

import { revalidatePath } from 'next/cache';
import { isChatVisitorKey, sanitizeChatText } from '@/lib/chat';
import { prisma } from '@/lib/db';
import { sendChatTelegramNotification } from '@/server/chat-telegram';
import { requireAdminPermissions } from '@/server/admin-authorization';

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.daibilet.ru';

export type ChatSendResult = {
  ok: boolean;
  error?: string;
  /** Present for user sends: the session id the widget keeps using. */
  sessionId?: string;
};

/**
 * User side (floating widget): upsert the anonymous session by visitorKey,
 * persist the message and forward it to the admin Telegram chat. The stored
 * Telegram message_id makes later Reply matching possible.
 */
export async function sendUserChatMessage(input: {
  visitorKey: string;
  text: string;
}): Promise<ChatSendResult> {
  const visitorKey = String(input.visitorKey || '').trim();
  const text = sanitizeChatText(input.text);
  if (!isChatVisitorKey(visitorKey)) return { ok: false, error: 'нет идентификатора чата' };
  if (!text) return { ok: false, error: 'сообщение пустое' };

  // Serializable count + insert prevents concurrent requests from bypassing
  // the limits. Retry serialization conflicts; no Telegram call happens until
  // the transaction has committed.
  let saved: { sessionId: string; messageId: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      saved = await prisma.$transaction(async (tx) => {
        const since = new Date(Date.now() - 60_000);
        const [visitorCount, globalCount] = await Promise.all([
          tx.chatMessage.count({
            where: { sender: 'USER', createdAt: { gte: since }, session: { visitorKey } },
          }),
          tx.chatMessage.count({ where: { sender: 'USER', createdAt: { gte: since } } }),
        ]);
        if (visitorCount >= 5 || globalCount >= 60) return null;
        const session = await tx.chatSession.upsert({
          where: { visitorKey },
          create: { visitorKey },
          update: { updatedAt: new Date() },
        });
        const message = await tx.chatMessage.create({
          data: { sessionId: session.id, text, sender: 'USER' },
        });
        return { sessionId: session.id, messageId: message.id };
      }, { isolationLevel: 'Serializable' });
      break;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
  if (!saved) return { ok: false, error: 'Слишком много сообщений. Повторите через минуту.' };

  // Telegram is best-effort: a missing bot config must not block the chat.
  const sent = await sendChatTelegramNotification({
    text,
    sessionUrl: `${ADMIN_BASE.replace(/\/$/, '')}/admin/chats/${saved.sessionId}`,
  });
  if (sent.ok && sent.messageId != null) {
    try {
      await prisma.chatMessage.update({
        where: { id: saved.messageId },
        data: { telegramMessageId: sent.messageId },
      });
    } catch {
      // The message is already stored and visible in the admin inbox. A failed
      // Telegram mapping must not invite the visitor to send it again.
      console.error('[chat] failed to store Telegram reply mapping');
    }
  }

  return { ok: true, sessionId: saved.sessionId };
}

/**
 * Admin side (/admin/chats/[id]): persist the reply from the workbench.
 * Telegram forward is not needed here - the admin is already where the
 * conversation happens; the widget picks the reply up on its next poll.
 */
export async function sendAdminChatMessage(input: {
  sessionId: string;
  text: string;
}): Promise<ChatSendResult> {
  try {
    await requireAdminPermissions(['support.write']);
  } catch {
    return { ok: false, error: 'Нет доступа к чату поддержки.' };
  }
  const sessionId = String(input.sessionId || '').trim();
  const text = sanitizeChatText(input.text);
  if (!sessionId) return { ok: false, error: 'нет идентификатора сессии' };
  if (!text) return { ok: false, error: 'сообщение пустое' };

  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) return { ok: false, error: 'сессия не найдена' };

  await prisma.chatMessage.create({
    data: { sessionId, text, sender: 'ADMIN' },
  });
  await prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
  revalidatePath('/admin/chats');
  revalidatePath(`/admin/chats/${sessionId}`);
  return { ok: true, sessionId };
}

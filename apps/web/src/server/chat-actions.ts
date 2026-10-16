'use server';

import { revalidatePath } from 'next/cache';

import { sanitizeChatText } from '@/lib/chat';
import { prisma } from '@/lib/db';
import { sendChatTelegramNotification } from '@/server/chat-telegram';

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
  if (!visitorKey) return { ok: false, error: 'нет идентификатора чата' };
  if (!text) return { ok: false, error: 'сообщение пустое' };

  const session = await prisma.chatSession.upsert({
    where: { visitorKey },
    create: { visitorKey },
    update: {},
  });

  const message = await prisma.chatMessage.create({
    data: { sessionId: session.id, text, sender: 'USER' },
  });

  // Telegram is best-effort: a missing bot config must not block the chat.
  const sent = await sendChatTelegramNotification({
    text,
    sessionUrl: `${ADMIN_BASE.replace(/\/$/, '')}/admin/chats/${session.id}`,
  });
  if (sent.ok && sent.messageId != null) {
    await prisma.chatMessage.update({
      where: { id: message.id },
      data: { telegramMessageId: sent.messageId },
    });
  }

  await prisma.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } });
  return { ok: true, sessionId: session.id };
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

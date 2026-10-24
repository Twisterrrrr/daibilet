import { NextResponse } from 'next/server';

import { sanitizeChatText } from '@/lib/chat';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    chat?: { id?: number };
    text?: string;
    reply_to_message?: { message_id?: number; text?: string };
  };
};

/**
 * Telegram → chat bridge. The admin replies in Telegram via Reply to the
 * forwarded notification; the stored `telegramMessageId` resolves the session.
 * Protected by the secret token Telegram sends in `setWebhook` (fail closed).
 */
export async function POST(request: Request) {
  const secret = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    console.warn('[telegram-webhook] TELEGRAM_WEBHOOK_SECRET not set - rejecting');
    return NextResponse.json({ ok: false, error: 'webhook_disabled' }, { status: 503 });
  }
  const provided = String(request.headers.get('x-telegram-bot-api-secret-token') || '');
  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  const message = update.message;
  const expectedChatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!expectedChatId || String(message?.chat?.id ?? '') !== expectedChatId) {
    return NextResponse.json({ ok: true, skipped: 'wrong_chat' });
  }
  if (!Number.isSafeInteger(update.update_id)) {
    return NextResponse.json({ ok: false, error: 'missing_update_id' }, { status: 400 });
  }
  const replyToId = message?.reply_to_message?.message_id;
  const text = sanitizeChatText(message?.text);

  if (!message || !text) {
    // Stickers/attachments/etc - acknowledge so Telegram stops retrying.
    return NextResponse.json({ ok: true, skipped: 'no_text' });
  }

  if (replyToId == null) {
    return NextResponse.json({ ok: true, skipped: 'not_a_reply' });
  }

  const parent = await prisma.chatMessage.findUnique({
    where: { telegramMessageId: replyToId },
    select: { sessionId: true },
  });
  if (!parent) {
    return NextResponse.json({ ok: true, skipped: 'unknown_parent' });
  }

  const updateId = String(update.update_id);
  try {
    await prisma.chatMessage.create({
      data: { sessionId: parent.sessionId, text, sender: 'ADMIN', telegramUpdateId: updateId },
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ ok: true, skipped: 'duplicate_update' });
    }
    throw error;
  }
  await prisma.chatSession.update({
    where: { id: parent.sessionId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, sessionId: parent.sessionId });
}

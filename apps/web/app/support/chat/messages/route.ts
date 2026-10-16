import { NextResponse } from 'next/server';

import { isChatVisitorKey } from '@/lib/chat';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** The visitor key is a capability token; keep it out of URLs and access logs. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { visitorKey?: unknown };
  const visitorKey = body.visitorKey;
  if (!isChatVisitorKey(visitorKey)) {
    return NextResponse.json({ messages: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const session = await prisma.chatSession.findUnique({
    where: { visitorKey },
    include: {
      messages: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 200,
        select: { id: true, text: true, sender: true, createdAt: true },
      },
    },
  });

  return NextResponse.json(
    { messages: session?.messages.slice().reverse() ?? [] },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

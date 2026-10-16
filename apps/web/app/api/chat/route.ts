import { NextResponse } from 'next/server';

import { isChatVisitorKey } from '@/lib/chat';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Widget poll endpoint: returns the visitor's own thread by visitorKey.
 * The key is the only handle - treat it as a capability token, never enumerate.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const visitorKey = searchParams.get('visitorKey') || '';
  if (!isChatVisitorKey(visitorKey)) {
    return NextResponse.json({ messages: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const session = await prisma.chatSession.findUnique({
    where: { visitorKey },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 200,
        select: { id: true, text: true, sender: true, createdAt: true },
      },
    },
  });

  return NextResponse.json(
    { messages: session?.messages ?? [] },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

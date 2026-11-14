import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type NewsletterBody = {
  email?: string;
  source?: string;
};

/**
 * Soft lead-magnet endpoint for /blog.
 * Stores nothing yet - accepts valid emails and returns 202 so UI can confirm.
 * Wire to ESP / CRM later; until then client also has mailto fallback.
 */
export async function POST(request: Request) {
  let body: NewsletterBody = {};
  try {
    body = (await request.json()) as NewsletterBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  return NextResponse.json(
    {
      ok: true,
      accepted: true,
      source: body.source || 'blog',
    },
    { status: 202 },
  );
}

/**
 * Lightweight mail helpers. Without SMTP_* env vars — graceful skip (log URL).
 * When SMTP_HOST + SMTP_FROM are set, uses nodemailer if installed; otherwise skip.
 */

export type MailSendResult = {
  sent: boolean;
  reason?: string;
};

export type ReviewRequestMailPayload = {
  to: string;
  customerName: string;
  eventTitle: string;
  eventDate: string;
  reviewUrl: string;
  appUrl: string;
};

function smtpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_FROM);
}

export function buildReviewRequestHtml(data: ReviewRequestMailPayload): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Как вам мероприятие?</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;">
    <tr><td style="background:#1d4ed8;padding:24px 32px;"><h1 style="color:#fff;margin:0;font-size:22px;">Дайбилет</h1></td></tr>
    <tr><td style="padding:32px;">
      <h2 style="color:#1a1a1a;margin:0 0 16px;">Как вам ${escapeHtml(data.eventTitle)}?</h2>
      <p style="color:#555;line-height:1.6;margin:0 0 12px;">Здравствуйте, ${escapeHtml(data.customerName)}!</p>
      <p style="color:#555;line-height:1.6;margin:0 0 24px;">
        Вы посещали <strong>${escapeHtml(data.eventTitle)}</strong> ${escapeHtml(data.eventDate)}.
        Расскажите, как всё прошло — отзыв поможет другим выбрать событие.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr>
        <td style="background:#1d4ed8;border-radius:8px;">
          <a href="${escapeAttr(data.reviewUrl)}" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:16px;font-weight:600;">Оставить отзыв</a>
        </td>
      </tr></table>
      <p style="color:#999;font-size:13px;line-height:1.5;margin:0;">Подтверждённая покупка будет отмечена бейджем на сайте.</p>
    </td></tr>
    <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #eee;">
      <p style="color:#999;font-size:12px;margin:0;text-align:center;">
        <a href="${escapeAttr(data.appUrl)}" style="color:#999;">daibilet.ru</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

async function tryNodemailerSend(options: {
  from: string;
  to: string;
  subject: string;
  html: string;
  env: NodeJS.ProcessEnv;
}): Promise<MailSendResult> {
  try {
    const nodemailer = (await import('nodemailer')) as {
      createTransport: (opts: Record<string, unknown>) => {
        sendMail: (mail: Record<string, unknown>) => Promise<unknown>;
      };
    };
    const transport = nodemailer.createTransport({
      host: options.env.SMTP_HOST,
      port: Number(options.env.SMTP_PORT || 587),
      secure: options.env.SMTP_SECURE === '1' || options.env.SMTP_SECURE === 'true',
      auth:
        options.env.SMTP_USER && options.env.SMTP_PASS
          ? { user: options.env.SMTP_USER, pass: options.env.SMTP_PASS }
          : undefined,
    });
    await transport.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Cannot find module|ERR_MODULE_NOT_FOUND/i.test(message)) {
      console.warn('[mail] nodemailer not installed — skip send. pnpm add nodemailer in apps/backend');
      return { sent: false, reason: 'nodemailer_missing' };
    }
    console.error(`[mail] send failed → ${options.to}:`, message);
    return { sent: false, reason: 'smtp_error' };
  }
}

export async function sendReviewRequestEmail(
  data: ReviewRequestMailPayload,
  env: NodeJS.ProcessEnv = process.env,
): Promise<MailSendResult> {
  if (!smtpConfigured(env)) {
    console.warn(`[mail] SMTP not configured — skip review-request → ${data.to}: ${data.reviewUrl}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }
  return tryNodemailerSend({
    from: String(env.SMTP_FROM),
    to: data.to,
    subject: `Как вам ${data.eventTitle}? Оставьте отзыв!`,
    html: buildReviewRequestHtml(data),
    env,
  });
}

export async function sendReviewVerifyEmail(
  data: { to: string; authorName: string; eventTitle: string; verifyUrl: string },
  env: NodeJS.ProcessEnv = process.env,
): Promise<MailSendResult> {
  if (!smtpConfigured(env)) {
    console.warn(`[mail] SMTP not configured — skip review-verify → ${data.to}: ${data.verifyUrl}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }
  return tryNodemailerSend({
    from: String(env.SMTP_FROM),
    to: data.to,
    subject: `Подтвердите отзыв — ${data.eventTitle}`,
    html: `<p>Здравствуйте, ${escapeHtml(data.authorName)}!</p>
      <p>Подтвердите отзыв на «${escapeHtml(data.eventTitle)}»:</p>
      <p><a href="${escapeAttr(data.verifyUrl)}">Подтвердить email</a></p>`,
    env,
  });
}

/**
 * Best-effort buyer ticket email from catalog web process.
 * Uses same SMTP_* contract as apps/backend mail (graceful skip if unset).
 * Does not touch finance .159 secrets.
 */

export type BuyerTicketMailResult = {
  sent: boolean;
  reason?: string;
};

export type BuyerTicketMailPayload = {
  to: string;
  publicCode: string;
  title: string;
  ticketUrl: string;
  amountRub?: number | null;
  mode?: string | null;
};

function smtpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_FROM);
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

function buildTicketHtml(data: BuyerTicketMailPayload): string {
  const amount =
    typeof data.amountRub === 'number' && Number.isFinite(data.amountRub)
      ? `${Math.round(data.amountRub)} ₽`
      : null;
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Ваш билет Дайбилет</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;">
    <tr><td style="background:#047857;padding:24px 32px;"><h1 style="color:#fff;margin:0;font-size:22px;">Дайбилет</h1></td></tr>
    <tr><td style="padding:32px;">
      <h2 style="color:#1a1a1a;margin:0 0 16px;">Ваш билет готов</h2>
      <p style="color:#555;line-height:1.6;margin:0 0 12px;">Здравствуйте!</p>
      <p style="color:#555;line-height:1.6;margin:0 0 16px;">
        Заказ <strong>${escapeHtml(data.publicCode)}</strong> - ${escapeHtml(data.title)}.
        ${amount ? `Сумма: <strong>${escapeHtml(amount)}</strong>.` : ''}
      </p>
      <p style="color:#555;line-height:1.6;margin:0 0 24px;">
        Откройте билет по ссылке или сохраните код заказа. На входе покажите код или QR с страницы билета.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr>
        <td style="background:#047857;border-radius:8px;">
          <a href="${escapeAttr(data.ticketUrl)}" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:16px;font-weight:600;">Открыть билет</a>
        </td>
      </tr></table>
      <p style="color:#999;font-size:13px;line-height:1.5;margin:0;">
        Если кнопка не работает, скопируйте ссылку:<br>
        <a href="${escapeAttr(data.ticketUrl)}" style="color:#047857;word-break:break-all;">${escapeHtml(data.ticketUrl)}</a>
      </p>
    </td></tr>
    <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #eee;">
      <p style="color:#999;font-size:12px;margin:0;text-align:center;">daibilet.ru</p>
    </td></tr>
  </table>
</body>
</html>`;
}

async function tryNodemailerSend(options: {
  from: string;
  to: string;
  subject: string;
  html: string;
  env: NodeJS.ProcessEnv;
}): Promise<BuyerTicketMailResult> {
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
      console.warn('[buyer-ticket-mail] nodemailer missing - skip. Install in apps/web or hoist from backend.');
      return { sent: false, reason: 'nodemailer_missing' };
    }
    console.error(`[buyer-ticket-mail] send failed → ${options.to}:`, message);
    return { sent: false, reason: 'smtp_error' };
  }
}

/**
 * Send ticket link email when SMTP_* present on web process.
 * Without SMTP: log URL and return sent:false (UI tells buyer to save code/link).
 */
export async function sendBuyerTicketEmail(
  data: BuyerTicketMailPayload,
  env: NodeJS.ProcessEnv = process.env,
): Promise<BuyerTicketMailResult> {
  const to = String(data.to || '')
    .trim()
    .toLowerCase();
  if (!to.includes('@') || !data.publicCode || !data.ticketUrl) {
    return { sent: false, reason: 'invalid_payload' };
  }

  if (!smtpConfigured(env)) {
    console.warn(
      `[buyer-ticket-mail] SMTP not configured - skip ticket mail → ${to}: ${data.ticketUrl}`,
    );
    return { sent: false, reason: 'smtp_not_configured' };
  }

  return tryNodemailerSend({
    from: String(env.SMTP_FROM),
    to,
    subject: `Билет Дайбилет №${data.publicCode}`,
    html: buildTicketHtml(data),
    env,
  });
}

export function isBuyerTicketSmtpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return smtpConfigured(env);
}

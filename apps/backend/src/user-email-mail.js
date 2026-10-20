export async function sendSiteUserVerifyEmail({ to, verifyUrl }, env = process.env) {
  if (!env.SMTP_HOST || !env.SMTP_FROM) return { sent: false, reason: 'smtp_not_configured' };
  try {
    const { default: nodemailer } = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: env.SMTP_SECURE === '1' || env.SMTP_SECURE === 'true',
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({
      from: env.SMTP_FROM,
      to,
      subject: 'Подтвердите email для Дайбилет',
      text: `Подтвердите адрес: ${verifyUrl}\nСсылка действует 24 часа.`,
      html: `<p>Подтвердите адрес, чтобы видеть ваши покупки в Дайбилет.</p>
        <p><a href="${verifyUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">Подтвердить email</a></p>
        <p>Ссылка действует 24 часа. Если вы не запрашивали подтверждение, игнорируйте письмо.</p>`,
    });
    return { sent: true };
  } catch {
    return { sent: false, reason: 'smtp_error' };
  }
}

export async function sendSiteUserPasswordResetEmail({ to, resetUrl }, env = process.env) {
  if (!env.SMTP_HOST || !env.SMTP_FROM) return { sent: false };
  try {
    const { default: nodemailer } = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: env.SMTP_SECURE === '1' || env.SMTP_SECURE === 'true',
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({
      from: env.SMTP_FROM,
      to,
      subject: 'Восстановление пароля Дайбилет',
      text: `Чтобы задать новый пароль, откройте ссылку: ${resetUrl}\nСсылка действует 1 час. Если вы не запрашивали восстановление, игнорируйте письмо.`,
    });
    return { sent: true };
  } catch {
    return { sent: false };
  }
}

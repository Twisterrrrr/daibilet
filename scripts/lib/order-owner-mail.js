/**
 * Owner notification about paid external orders (widget purchases via
 * Ticketscloud / Teplohod import). Same SMTP_* contract as buyer-ticket-mail
 * (graceful skip when unset). Recipient: ORDER_NOTIFY_TO (default info@daibilet.ru).
 */
const { createRequire } = require("module");
const path = require("path");

// nodemailer is declared in apps/backend and apps/web (pnpm links it under their
// node_modules), so resolve from those package roots - plain upward resolution
// from scripts/lib never reaches it.
function loadNodemailer() {
  const rootDir = path.resolve(__dirname, "..", "..");
  for (const pkg of ["apps/backend/package.json", "apps/web/package.json"]) {
    try {
      return createRequire(path.join(rootDir, pkg))("nodemailer");
    } catch {
      // try the next candidate
    }
  }
  return require("nodemailer");
}

const {
  isSmtpConfigured,
  resolveOwnerNotifyTo,
  resolveSmtpTransportOptions,
} = require("./smtp-config");

/** ExternalOrder.status values that mean "buyer paid". */
const PAID_ORDER_STATUSES = new Set(["done", "paid", "success", "succeeded", "confirmed"]);

function notifyDisabled(env) {
  return env.ORDER_NOTIFY_DISABLE === "1" || env.ORDER_NOTIFY_DISABLE === "true";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function formatRub(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return null;
  return `${Math.round(amount).toLocaleString("ru-RU")} ₽`;
}

/** Best-effort money extraction from TC/TEP order payloads (payments[] or totals). */
function extractAmountRub(snapshot) {
  const payments = Array.isArray(snapshot?.payments) ? snapshot.payments : [];
  for (const payment of payments) {
    const status = String(payment?.status || "").toLowerCase();
    if (status && !["succeeded", "paid", "done", "complete", "completed"].includes(status)) continue;
    const value = Number(payment?.sum ?? payment?.amount ?? payment?.total ?? payment?.value);
    if (Number.isFinite(value) && value > 0) return value;
  }
  const source = snapshot?.sourcePayload || {};
  for (const key of ["sum", "amount", "total", "total_sum", "price"]) {
    const value = Number(source[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  const values = source.values || {};
  for (const key of ["full", "price", "nominal"]) {
    const value = Number(values[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function buildOwnerOrderMail(order) {
  const snapshot = order.buyerSnapshot || {};
  const buyer = snapshot.buyer || {};
  const orderCode = snapshot.code || snapshot.number || order.publicCode || order.externalOrderId;
  const eventTitle = order.eventTitle || snapshot.sourceEventTitle || "Импортированное событие";
  const isPreview = order.preview === true;
  const ticketCount = Number(order.ticketCount || 0);
  const amountRub = extractAmountRub(snapshot);
  // Catalog page for the purchased event: /events/{slug} (latin CHPU).
  const eventSlug = String(order.eventSlug || "").trim();
  const eventLink = eventSlug
    ? `https://daibilet.ru/events/${encodeURIComponent(eventSlug)}`
    : null;
  const subject = isPreview ? `Пример оформления уведомления · ${eventTitle}` : `Новая покупка · ${eventTitle}`;
  const eventImage = safeHttpsUrl(order.eventImageUrl);
  const eventDate = formatDate(order.eventStartsAt);
  const purchaseDate = formatDate(order.purchasedAt);
  const location = [order.venueTitle, order.cityTitle].filter(Boolean).join(" · ");
  const safeEventLink = eventLink ? escapeAttr(eventLink) : null;
  const eventImageHtml = eventImage
    ? `<img src="${escapeAttr(eventImage)}" width="520" alt="${escapeAttr(eventTitle)}" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:10px;margin:0 0 18px;">`
    : "";
  const eventLinkHtml = safeEventLink
    ? `<a href="${safeEventLink}" style="color:#2563eb;text-decoration:none;font-weight:600;">Страница события · Открыть на Дайбилете&nbsp;→</a>`
    : "";
  const detailRows = [
    ["Покупатель", buyer.name || "—"],
    ["Электронная почта", buyer.email || "—"],
    ["Телефон", buyer.phone || "—"],
    ["Заказ", `№${orderCode}`],
    ["Билеты", ticketCount > 0 ? `${ticketCount} шт.` : "—"],
    ["Источник продажи", order.sourceName || "Ticketscloud"],
  ];
  const detailRowsHtml = detailRows.map(([label, value]) => `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #e8e9ee;color:#7b8190;font-size:14px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:12px 0;border-bottom:1px solid #e8e9ee;color:#171923;font-size:14px;font-weight:600;text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`).join("");
  const money = amountRub == null ? "Сумма не передана" : formatRub(amountRub);
  const text = [
    isPreview ? "Пример оформления уведомления · Дайбилет" : "Новая покупка · Дайбилет",
    `Событие: ${eventTitle}`,
    eventDate ? `Дата события: ${eventDate}` : null,
    location ? `Место: ${location}` : null,
    `Сумма: ${money}`,
    `Покупатель: ${buyer.name || "—"}`,
    `E-mail: ${buyer.email || "—"}`,
    `Телефон: ${buyer.phone || "—"}`,
    `Заказ №${orderCode}`,
    `Билетов: ${ticketCount > 0 ? ticketCount : "—"}`,
    eventLink || null,
  ].filter(Boolean).join("\n");

  const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f7fb;color:#0f1117;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Оплата подтверждена: ${escapeHtml(eventTitle)} · ${escapeHtml(money)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7fb;width:100%;">
    <tr><td align="center" style="padding:28px 12px 40px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e8e9ee;border-radius:16px;overflow:hidden;">
        <tr><td align="center" style="padding:26px 24px;border-bottom:1px solid #e8e9ee;">
          <a href="https://daibilet.ru" style="font-family:Arial,Helvetica,sans-serif;font-size:25px;font-weight:800;letter-spacing:-1px;text-decoration:none;white-space:nowrap;"><span style="color:#0f1117;">дай</span><span style="color:#ff4757;">билет</span></a>
        </td></tr>
        <tr><td style="padding:30px 32px 12px;">
          <div style="display:inline-block;padding:6px 11px;border-radius:20px;background:${isPreview ? "#fff3d6" : "#e9f9ef"};color:${isPreview ? "#986500" : "#16834a"};font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;">${isPreview ? "Пример письма" : "Оплата получена"}</div>
          <h1 style="margin:16px 0 8px;font-size:25px;line-height:1.25;font-weight:700;color:#0f1117;">${isPreview ? "Так выглядит уведомление" : "Новая покупка!"}</h1>
          <p style="margin:0;color:#6b7080;font-size:15px;line-height:1.55;">${isPreview ? "Предпросмотр письма на примере заказа Ticketscloud." : `Заказ №${escapeHtml(orderCode)} оплачен через ${escapeHtml(order.sourceName || "Ticketscloud")}.`}</p>
        </td></tr>
        <tr><td style="padding:18px 32px 8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7fb;border-radius:13px;">
            <tr><td style="padding:22px;">
              ${eventImageHtml}
              <div style="margin:0 0 7px;color:#858a98;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;">Событие</div>
              <h2 style="margin:0 0 12px;color:#0f1117;font-size:20px;line-height:1.35;font-weight:700;">${escapeHtml(eventTitle)}</h2>
              ${eventDate ? `<p style="margin:0 0 6px;color:#454957;font-size:14px;line-height:1.5;">📅&nbsp; ${escapeHtml(eventDate)}</p>` : ""}
              ${location ? `<p style="margin:0 0 14px;color:#454957;font-size:14px;line-height:1.5;">📍&nbsp; ${escapeHtml(location)}</p>` : ""}
              ${eventLinkHtml}
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px 8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#10131b;border-radius:13px;">
            <tr><td style="padding:18px 22px;color:#bfc4cf;font-size:12px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;">Сумма заказа</td>
                <td align="right" style="padding:18px 22px;color:#fff;font-size:23px;font-weight:700;white-space:nowrap;">${escapeHtml(money)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:22px 32px 30px;">
          <h2 style="margin:0 0 6px;color:#0f1117;font-size:17px;font-weight:700;">Покупатель и заказ</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${detailRowsHtml}
            <tr><td style="padding:12px 0;color:#7b8190;font-size:14px;">Время покупки</td><td align="right" style="padding:12px 0;color:#171923;font-size:14px;font-weight:600;">${escapeHtml(purchaseDate || "—")}</td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:20px 24px;background:#f6f7fb;border-top:1px solid #e8e9ee;color:#9297a4;font-size:12px;line-height:1.6;">
          Это автоматическое уведомление о продаже.<br><a href="https://daibilet.ru" style="color:#2563eb;text-decoration:none;">daibilet.ru</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text, orderCode };
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow",
  }).format(date);
}

function safeHttpsUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function sendOwnerOrderMail(order, env = process.env) {
  if (notifyDisabled(env)) return Promise.resolve({ sent: false, reason: "disabled" });
  const to = resolveOwnerNotifyTo(env);
  if (!to.includes("@")) return Promise.resolve({ sent: false, reason: "no_recipient" });
  if (!isSmtpConfigured(env)) return Promise.resolve({ sent: false, reason: "smtp_not_configured" });

  const { subject, html, text, orderCode } = buildOwnerOrderMail(order);
  return (async () => {
    try {
      const nodemailer = loadNodemailer();
      const transport = nodemailer.createTransport(resolveSmtpTransportOptions(env));
      await transport.sendMail({ from: env.SMTP_FROM, to, subject, html, text });
      console.log(`[order-owner-mail] sent order=${orderCode} to=${to}`);
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/Cannot find module|ERR_MODULE_NOT_FOUND/i.test(message)) {
        console.warn("[order-owner-mail] nodemailer missing - skip notification");
        return { sent: false, reason: "nodemailer_missing" };
      }
      console.error(`[order-owner-mail] send failed order=${orderCode}:`, message);
      return { sent: false, reason: "smtp_error" };
    }
  })();
}

module.exports = {
  PAID_ORDER_STATUSES,
  buildOwnerOrderMail,
  sendOwnerOrderMail,
  notifyDisabled,
};

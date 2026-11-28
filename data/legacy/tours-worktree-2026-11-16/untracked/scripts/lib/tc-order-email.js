const { createRequire } = require("module");
const path = require("path");

const rootDir = path.resolve(__dirname, "../..");
const requireFromBackend = createRequire(path.join(rootDir, "apps", "backend", "package.json"));

async function sendPurchaseNotification({ order, snapshot, refs, externalOrderId }) {
  const recipient = process.env.TC_ORDER_NOTIFICATION_TO || "info@daibilet.ru";
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !from) {
    return { skipped: true, error: "SMTP is not configured" };
  }

  try {
    const nodemailer = requireFromBackend("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: { user, pass },
    });
    const event = refs?.events?.[order.event] || {};
    const eventTitle = String(event.name || event.title || snapshot.sourceEventTitle || "Событие Ticketscloud");
    const venue = refs?.venues?.[event.venue] || {};
    const buyer = snapshot.buyer || {};
    const total = formatAmount(order);
    const purchaseDate = formatDate(order.done_at || order.created_at);
    const eventDate = formatDate(event.lifetime?.start || event.start_at || event.date);
    const venueName = venue.name || venue.title || "Не указана в ответе API";
    const orderCode = order.code || order.number || externalOrderId;
    const tickets = Array.isArray(order.tickets) ? order.tickets : [];
    const ticketDetails = tickets.map((ticket) => {
      const title = ticket.name || ticket.title || ticket.type || "Билет";
      const ticketNumber = ticket.number || ticket.id;
      return `<li>${escapeHtml(title)}${ticketNumber ? ` — № ${escapeHtml(ticketNumber)}` : ""}</li>`;
    }).join("") || "<li>Подробности билетов не переданы API</li>";

    const html = renderEmail({
      eventTitle, venueName, eventDate, purchaseDate, total,
      buyerName: buyer.name || "Не указано",
      buyerEmail: buyer.email || "Не указана",
      buyerPhone: buyer.phone || "Не указан",
      orderCode, ticketDetails,
    });
    await transporter.sendMail({
      from,
      to: recipient,
      subject: `Новая покупка в Ticketscloud: ${eventTitle}`,
      text: [
        `Новая покупка в Ticketscloud`, `Событие: ${eventTitle}`, `Заказ: ${orderCode}`,
        `Покупатель: ${buyer.name || "не указан"}`, `Email: ${buyer.email || "не указан"}`,
        `Телефон: ${buyer.phone || "не указан"}`, `Сумма: ${total}`,
        `Дата события: ${eventDate}`, `Площадка: ${venueName}`,
      ].join("\n"),
      html,
    });
    return { sent: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function renderEmail(data) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#0f1117;padding:24px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:auto;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="padding:28px;text-align:center;border-bottom:1px solid #e8e9ee"><a href="https://daibilet.ru" style="font-weight:900;font-size:24px;text-decoration:none"><span style="color:#0f1117">дай</span><span style="color:#ff4757">билет</span></a></td></tr>
<tr><td style="padding:32px"><div style="font-size:12px;color:#15803d;font-weight:bold;text-transform:uppercase;letter-spacing:.06em">Новая покупка · Ticketscloud</div>
<h1 style="font-size:24px;line-height:1.3;margin:12px 0 20px">${escapeHtml(data.eventTitle)}</h1>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;border-radius:12px;padding:18px;font-size:14px;line-height:1.8">
<tr><td><b>Заказ:</b> ${escapeHtml(data.orderCode)}</td></tr><tr><td><b>Покупка:</b> ${escapeHtml(data.purchaseDate)}</td></tr>
<tr><td><b>Событие:</b> ${escapeHtml(data.eventDate)}</td></tr><tr><td><b>Площадка:</b> ${escapeHtml(data.venueName)}</td></tr>
<tr><td><b>Сумма:</b> ${escapeHtml(data.total)}</td></tr></table>
<h2 style="font-size:16px;margin:24px 0 8px">Покупатель</h2><p style="font-size:14px;line-height:1.7;margin:0">${escapeHtml(data.buyerName)}<br>${escapeHtml(data.buyerEmail)}<br>${escapeHtml(data.buyerPhone)}</p>
<h2 style="font-size:16px;margin:24px 0 8px">Билеты</h2><ul style="font-size:14px;line-height:1.7;padding-left:20px">${data.ticketDetails}</ul></td></tr>
<tr><td style="padding:20px;text-align:center;background:#f6f7fb;color:#8b90a0;font-size:12px">Автоматическое уведомление о заказе Ticketscloud</td></tr></table></body></html>`;
}

function formatAmount(order) {
  const raw = order.total ?? order.amount ?? order.price ?? order.values?.total ?? order.values?.amount;
  if (raw == null) return "Не указана в ответе API";
  const number = Number(raw);
  if (!Number.isFinite(number)) return String(raw);
  const rubles = number > 100000 ? number / 100 : number;
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: order.currency || "RUB", maximumFractionDigits: 2 }).format(rubles);
}

function formatDate(value) {
  if (!value) return "Не указана в ответе API";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Moscow" }).format(date);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

module.exports = { sendPurchaseNotification, renderEmail, formatAmount, isPaidOrder: (order) => {
  const values = [order.status, order.payment_status, order.payments?.[0]?.status]
    .filter(Boolean).map((value) => String(value).trim().toLowerCase());
  return values.some((value) => ["paid", "payed", "done", "completed", "success", "succeeded"].includes(value));
} };

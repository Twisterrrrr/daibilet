/**
 * Owner notification about paid external orders (widget purchases via
 * Ticketscloud / Teplohod import). Same SMTP_* contract as buyer-ticket-mail
 * (graceful skip when unset). Recipient: ORDER_NOTIFY_TO (default info@daibilet.ru).
 */
const { createRequire } = require("module");
const path = require("path");

const rootRequire = createRequire(path.resolve(__dirname, "..", "..", "..", "package.json"));

const DEFAULT_NOTIFY_TO = "info@daibilet.ru";
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
  return null;
}

function buildOwnerOrderMail(order) {
  const snapshot = order.buyerSnapshot || {};
  const buyer = snapshot.buyer || {};
  const orderCode = snapshot.code || snapshot.number || order.publicCode || order.externalOrderId;
  const eventTitle = snapshot.sourceEventTitle || "Импортированное событие";
  const ticketCount = Number(order.ticketCount || 0);
  const amountRub = extractAmountRub(snapshot);

  const subject = `Дайбилет. Поступила оплата по заказу №${orderCode}`;
  const rows = [
    ["Заказ", `№${orderCode}`],
    ["Покупатель", buyer.name || "—"],
    ["E-mail", buyer.email || "—"],
    ["Телефон", buyer.phone || "—"],
    ["Мероприятие", eventTitle],
    ["Источник", order.sourceName || "Ticketscloud"],
  ];
  if (order.purchasedAt) rows.push(["Дата покупки", new Date(order.purchasedAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })]);
  rows.push(["Билетов", ticketCount > 0 ? `${ticketCount} шт.` : "—"]);
  if (amountRub != null) rows.push(["Сумма заказа", formatRub(amountRub)]);

  const rowsHtml = rows
    .map(
      ([label, value]) => `<tr>
        <th style="text-align:left;width:200px;padding:8px;border-bottom:1px solid #e5e5e5;color:#888;font-weight:600;">${escapeHtml(label)}</th>
        <td style="padding:8px;border-bottom:1px solid #e5e5e5;">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif;">
  <div style="width:700px;max-width:100%;font-size:14px;margin:0 auto;padding:30px 0;">
    <div style="font-size:28px;padding:0 20px;color:#1B2A4A;font-weight:bold;">ДАЙБИЛЕТ</div>
    <div style="background:#fff;padding:20px 30px 30px;margin-top:20px;border:1px solid #ccc;box-shadow:0 2px 10px rgba(0,0,0,.2);">
      <h3 style="margin-top:0;font-size:18px;color:#888;">Поступила оплата по заказу №${escapeHtml(orderCode)}</h3>
      <table style="border-collapse:collapse;border:1px solid #e5e5e5;margin-top:10px;width:100%;">
        ${rowsHtml}
      </table>
    </div>
    <div style="margin-top:30px;text-align:center;color:#666;font-size:12px;padding:0 20px;">
      Дайбилет — daibilet.ru · Уведомление о покупке через импортированные события
    </div>
  </div>
</body>
</html>`;

  return { subject, html, orderCode };
}

function sendOwnerOrderMail(order, env = process.env) {
  if (notifyDisabled(env)) return Promise.resolve({ sent: false, reason: "disabled" });
  const to = String(env.ORDER_NOTIFY_TO || DEFAULT_NOTIFY_TO).trim();
  if (!to.includes("@")) return Promise.resolve({ sent: false, reason: "no_recipient" });
  if (!env.SMTP_HOST || !env.SMTP_FROM) return Promise.resolve({ sent: false, reason: "smtp_not_configured" });

  const { subject, html, orderCode } = buildOwnerOrderMail(order);
  return (async () => {
    try {
      const nodemailer = rootRequire("nodemailer");
      const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT || 587),
        secure: env.SMTP_SECURE === "1" || env.SMTP_SECURE === "true",
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
      });
      await transport.sendMail({ from: env.SMTP_FROM, to, subject, html });
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

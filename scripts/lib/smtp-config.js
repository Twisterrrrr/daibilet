/**
 * Canonical SMTP transport settings for every Daibilet sender (owner order
 * notifications, buyer ticket mail, review requests) and for the smtp smoke
 * check. Keeping the resolution in one place stops the three senders from
 * drifting apart.
 *
 * Provider: Timeweb mail (smtp.timeweb.ru).
 *   - 465 = implicit SSL/TLS  -> secure: true
 *   - 587 = STARTTLS          -> secure: false (nodemailer upgrades in-place)
 * Login is the full mailbox address, password is that mailbox password.
 *
 * SMTP_SECURE stays authoritative when set. When it is unset, port 465 implies
 * SSL: a 465 config without SMTP_SECURE=1 used to fall back to a plaintext
 * handshake and fail with a confusing protocol error instead of sending.
 *
 * Never log SMTP_PASS. describeSmtpConfig() returns a masked summary only.
 */

const DEFAULT_SMTP_PORT = 587;
/** Ports where TLS is implicit from the first byte (no STARTTLS negotiation). */
const IMPLICIT_SSL_PORTS = new Set([465]);
const TRUTHY_FLAGS = new Set(["1", "true", "yes", "on"]);
const FALSY_FLAGS = new Set(["0", "false", "no", "off"]);
const DEFAULT_OWNER_NOTIFY_TO = "info@daibilet.ru";

function resolveSmtpPort(env = process.env) {
  const parsed = Number(String(env.SMTP_PORT ?? "").trim());
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : DEFAULT_SMTP_PORT;
}

function resolveSmtpSecure(env = process.env, port = resolveSmtpPort(env)) {
  const flag = String(env.SMTP_SECURE ?? "").trim().toLowerCase();
  if (TRUTHY_FLAGS.has(flag)) return true;
  if (FALSY_FLAGS.has(flag)) return false;
  return IMPLICIT_SSL_PORTS.has(port);
}

function resolveSmtpAuth(env = process.env) {
  const user = String(env.SMTP_USER ?? "").trim();
  const pass = String(env.SMTP_PASS ?? "");
  if (!user || !pass) return undefined;
  return { user, pass };
}

/** Options for nodemailer.createTransport(); auth omitted without credentials. */
function resolveSmtpTransportOptions(env = process.env) {
  const port = resolveSmtpPort(env);
  return {
    host: String(env.SMTP_HOST ?? "").trim(),
    port,
    secure: resolveSmtpSecure(env, port),
    auth: resolveSmtpAuth(env),
  };
}

/** Senders skip gracefully unless both host and from-address are present. */
function isSmtpConfigured(env = process.env) {
  return Boolean(String(env.SMTP_HOST ?? "").trim() && String(env.SMTP_FROM ?? "").trim());
}

/** Owner inbox for paid external order notifications. */
function resolveOwnerNotifyTo(env = process.env) {
  return String(env.ORDER_NOTIFY_TO || DEFAULT_OWNER_NOTIFY_TO).trim();
}

/**
 * Masked config summary for logs and smoke output. Booleans only for secrets,
 * so a pasted log never leaks SMTP_PASS or the mailbox password.
 */
function describeSmtpConfig(env = process.env) {
  const options = resolveSmtpTransportOptions(env);
  return {
    host: options.host || null,
    port: options.port,
    secure: options.secure,
    auth: Boolean(options.auth),
    user: options.auth ? options.auth.user : null,
    passwordSet: Boolean(String(env.SMTP_PASS ?? "")),
    from: String(env.SMTP_FROM ?? "").trim() || null,
    ownerNotifyTo: resolveOwnerNotifyTo(env),
    configured: isSmtpConfigured(env),
    notifyDisabled: env.ORDER_NOTIFY_DISABLE === "1" || env.ORDER_NOTIFY_DISABLE === "true",
  };
}

module.exports = {
  DEFAULT_OWNER_NOTIFY_TO,
  DEFAULT_SMTP_PORT,
  IMPLICIT_SSL_PORTS,
  describeSmtpConfig,
  isSmtpConfigured,
  resolveOwnerNotifyTo,
  resolveSmtpAuth,
  resolveSmtpPort,
  resolveSmtpSecure,
  resolveSmtpTransportOptions,
};

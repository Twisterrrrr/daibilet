# Buyer ticket email delivery (catalog MSK)

The catalog stores one `BuyerTicketEmailDelivery` row per internal order code.
Checkout enqueues the buyer email even while YooKassa is pending. The worker
checks the finance order on every attempt and sends only after `CONFIRMED` /
`PAID` / `SUCCEEDED`. Pending payments are checked again in five minutes;
SMTP or finance lookup failures use exponential backoff, capped at six hours.
`SENT`, `RETRY`, `PENDING`, and `CANCELLED` are visible in the table and worker
logs (`[buyer-ticket-delivery] code=… status=… attempts=…`). The queue does not
contain SMTP credentials.
If catalog DB enqueue fails after finance creates a payment, checkout still
returns the payment link and logs `enqueue failed for order CODE`; the operator
must request a manual resend after the database is restored.

After the catalog DB migration is applied, install the supplied
`deploy/systemd/daibilet-buyer-ticket-mail.service` and `.timer` on MSK `.184`
through the normal deployment process, then `systemctl daemon-reload` and
`systemctl enable --now daibilet-buyer-ticket-mail.timer`. No `.159` deployment
or SMTP configuration change is needed for this worker.

Manual resend for one paid order, from the catalog checkout with its existing
environment loaded:

```bash
corepack pnpm --filter @daibilet/web ticket-mail:process -- --resend=4157776
```

The command refuses an order that finance cannot confirm as paid. It resets
the delivery state and processes that exact code. Repeating the ordinary timer
after `SENT` does not send again. A manual resend is intentionally explicit.

Acceptance on a sandbox order: enqueue during checkout while SMTP is
unavailable; observe `RETRY`, restore SMTP, run the worker, then observe `SENT`
without another payment or webhook. This production smoke has not been run.

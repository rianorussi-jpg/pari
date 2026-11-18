// Scheduled transactional email worker. Keep all credentials server-side.
import postgres from "npm:postgres@3.4.7";
import nodemailer from "npm:nodemailer@7.0.11";
import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
const smtpUrl = Deno.env.get("PARI_SMTP_URL");
const sender = Deno.env.get("PARI_EMAIL_FROM");
const jobSecret = Deno.env.get("PARI_MAIL_JOB_SECRET");
const sql = databaseUrl
  ? postgres(databaseUrl, { max: 1, prepare: false })
  : null;
const mail = smtpUrl
  ? nodemailer.createTransport(smtpUrl, {
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 6000,
    })
  : null;

Deno.serve(async (request) => {
  const actual = Buffer.from(request.headers.get("x-pari-mail-secret") || "");
  const expected = Buffer.from(jobSecret || "");
  if (
    request.method !== "POST" ||
    !expected.length ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  ) {
    return new Response(null, { status: 401 });
  }
  if (!sql || !mail || !sender) return new Response(null, { status: 503 });
  try {
    // Hold a lock while sending so simultaneous job calls never claim the same order.
    const sent = await sql.begin(async (tx) => {
      const [item] = await tx`
        select q.order_id, q.recipient, e.title
        from pari_private.email_outbox q
        join public.pari_ticket_orders o on o.id = q.order_id
        join public.pari_events e on e.id = o.event_id
        where q.sent_at is null and o.status = 'paid'
        order by q.created_at
        limit 1
        for update of q skip locked
      `;
      if (!item) return false;
      await mail.sendMail({
        from: sender,
        to: item.recipient,
        subject: "Pago confirmado · Ticket Pari",
        messageId: `<pari-${item.order_id}@pari.enla.mx>`,
        text: `Tu transferencia para ${item.title} fue aprobada. Entra a https://pari.enla.mx/mis-boletos para abrir el QR de tu compra.\n\nFolio ${item.order_id.slice(0, 8).toUpperCase()}`,
      });
      await tx`update pari_private.email_outbox set sent_at = now() where order_id = ${item.order_id}`;
      return true;
    });
    return Response.json({ sent });
  } catch {
    return new Response(null, { status: 502 });
  }
});

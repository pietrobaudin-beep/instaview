/**
 * Delivery of sign-in codes.
 *
 * - Email: Resend (https://resend.com), from an address on the farejoapp.com
 *   domain once it is verified there.
 * - WhatsApp: the official Meta Cloud API, with a pre-approved message template
 *   of the "authentication" category (body "{{1}} é seu código…" and a
 *   copy-code button). Only the official API — unofficial "WhatsApp Web"
 *   gateways break WhatsApp's terms and get numbers banned.
 *
 * Off the live site, a channel without keys still "works": the code is written
 * to the server log and handed back to the page, so the whole flow can be tried
 * on localhost without any account.
 */
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { Channel } from "./targets";

const log = logger.scope("login-code");

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export function isChannelConfigured(channel: Channel): boolean {
  return channel === "email"
    ? Boolean(env.RESEND_API_KEY)
    : Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Channels the sign-in page offers. Localhost offers both, to test the flow. */
export function availableChannels(): Channel[] {
  if (!IS_PRODUCTION) return ["email", "whatsapp"];
  return (["email", "whatsapp"] as Channel[]).filter(isChannelConfigured);
}

export class DeliveryError extends Error {}

/**
 * Sends the code. Returns the code itself only when it was NOT really sent
 * (localhost without keys), so the page can show it for testing.
 */
export async function deliverCode(channel: Channel, target: string, code: string): Promise<string | null> {
  if (!isChannelConfigured(channel)) {
    if (IS_PRODUCTION) throw new DeliveryError(`${channel} is not configured`);
    log.info(`código de teste (${channel} ${target}): ${code}`);
    return code;
  }
  if (channel === "email") await sendEmail(target, code);
  else await sendWhatsApp(target, code);
  return null;
}

async function sendEmail(to: string, code: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject: `${code} é seu código do Farejo`,
      text: `Seu código do Farejo é ${code}.\n\nEle vale por 10 minutos. Se não foi você que pediu, pode ignorar este e-mail.\n\nCuriosidade conecta. 🐾`,
      html: emailHtml(code),
    }),
  });
  if (!res.ok) {
    log.error("resend failed", { status: res.status, body: (await res.text()).slice(0, 300) });
    throw new DeliveryError("email delivery failed");
  }
}

async function sendWhatsApp(phone: string, code: string) {
  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.replace(/^\+/, ""),
      type: "template",
      template: {
        name: env.WHATSAPP_TEMPLATE,
        language: { code: env.WHATSAPP_TEMPLATE_LANG },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          // Authentication templates carry the code in their copy-code button too.
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });
  if (!res.ok) {
    log.error("whatsapp failed", { status: res.status, body: (await res.text()).slice(0, 300) });
    throw new DeliveryError("whatsapp delivery failed");
  }
}

// Email apps don't show SVG, so the logo and the mascot go as PNGs hosted on
// the site (public/email/), rendered from the same artwork the site uses.
const ASSETS = "https://farejoapp.com/email";

function emailHtml(code: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seu código do Farejo</title></head><body style="margin:0;background:#F7F4EE;font-family:Helvetica,Arial,sans-serif;color:#1A0F14">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:24px">
<tr><td align="center" style="padding:32px 28px 0"><img src="${ASSETS}/farejo-logo.png" width="132" height="35" alt="Farejo" style="display:block;border:0;outline:none;text-decoration:none"></td></tr>
<tr><td align="center" style="padding:24px 28px 0"><img src="${ASSETS}/faro-carta.png" width="180" height="156" alt="O Faro AI trazendo sua carta" style="display:block;border:0;outline:none;text-decoration:none"></td></tr>
<tr><td align="center" style="padding:20px 28px 0;font-size:17px;font-weight:700">O Faro AI trouxe seu código 🐾</td></tr>
<tr><td align="center" style="padding:16px 28px 0"><div style="display:inline-block;background:#F6A8D2;border-radius:16px;padding:14px 22px;font-size:32px;font-weight:800;letter-spacing:0.25em">${code}</div></td></tr>
<tr><td align="center" style="padding:16px 28px 0;font-size:14px;line-height:1.5;color:#6b5b63">Ele vale por 10 minutos. Se não foi você que pediu, pode ignorar este e-mail.</td></tr>
<tr><td align="center" style="padding:24px 28px 32px;font-size:13px;color:#6b5b63">Curiosidade conecta.</td></tr>
</table></td></tr></table></body></html>`;
}

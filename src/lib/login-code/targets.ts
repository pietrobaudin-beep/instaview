/**
 * Where a sign-in code goes: an email address or a WhatsApp number, normalized
 * so the same person always maps to the same account.
 */

export type Channel = "email" | "whatsapp";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Lowercased email, or null if it doesn't look like one. */
export function normalizeEmail(input: string): string | null {
  const e = input.trim().toLowerCase();
  return EMAIL.test(e) && e.length <= 254 ? e : null;
}

/**
 * E.164 phone ("+5511999999999"), or null. Brazilian numbers can be typed any
 * way people usually do — "(11) 99999-9999", "11999999999", "+55 11 9…" — and a
 * number without a country code is taken as Brazilian.
 */
export function normalizePhone(input: string): string | null {
  const hasPlus = input.trim().startsWith("+");
  let digits = input.replace(/\D/g, "");
  if (!hasPlus) {
    if (digits.startsWith("0")) digits = digits.replace(/^0+/, ""); // "011…" trunk prefix
    if (digits.length === 10 || digits.length === 11) digits = "55" + digits; // DDD + number
  }
  if (digits.length < 12 || digits.length > 15) return null;
  // Brazilian mobiles have 9 digits after the DDD and start with 9.
  if (digits.startsWith("55") && digits.length === 13 && digits[4] !== "9") return null;
  return "+" + digits;
}

export function normalizeTarget(channel: Channel, input: string): string | null {
  return channel === "email" ? normalizeEmail(input) : normalizePhone(input);
}

/** "ju••••@gmail.com" / "+55 11 •••••-4321" — enough to recognize, not to read. */
export function maskTarget(channel: Channel, target: string): string {
  if (channel === "email") {
    const [user, domain] = target.split("@");
    return `${user.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(6, user.length - 2)))}@${domain}`;
  }
  const d = target.replace(/\D/g, "");
  return d.startsWith("55") ? `+55 ${d.slice(2, 4)} •••••-${d.slice(-4)}` : `+${d.slice(0, 2)} ••••${d.slice(-4)}`;
}

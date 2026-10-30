import { buildWhatsAppUrl } from "~/modules/site-content";

/** The wa.me link for a stored phone, or undefined when it cannot be dialed. */
export function whatsappHref(phoneDigits: string): string | undefined {
  const url = buildWhatsAppUrl(phoneDigits, "");
  return url.ok ? url.value : undefined;
}

import { err, ok, type Result } from "~/modules/_shared";
import type { Address } from "./business-profile";

export interface WhatsAppError {
  readonly kind: "invalid-number";
}

const AR_MOBILE_PREFIX = "549";
const LOCAL_DIGITS = 10;
const INTERNATIONAL_DIGITS = 13;

/**
 * Normalizes a displayed Argentine number to the international digits `wa.me`
 * expects: 10 digits (area code and local number) get the mobile prefix, 13
 * digits that already start with it stay as they are, anything else is rejected.
 */
export function toWhatsAppDigits(
  display: string,
): Result<string, WhatsAppError> {
  const digits = display.replace(/\D/g, "");
  if (digits.length === LOCAL_DIGITS) {
    return ok(`${AR_MOBILE_PREFIX}${digits}`);
  }
  if (
    digits.length === INTERNATIONAL_DIGITS &&
    digits.startsWith(AR_MOBILE_PREFIX)
  ) {
    return ok(digits);
  }
  return err({ kind: "invalid-number" });
}

export function buildWhatsAppUrl(
  display: string,
  message: string,
): Result<string, WhatsAppError> {
  const digits = toWhatsAppDigits(display);
  if (!digits.ok) {
    return digits;
  }
  return ok(
    `https://wa.me/${digits.value}?text=${encodeURIComponent(message)}`,
  );
}

export function buildDirectionsUrl(address: Address): string {
  const destination = `${address.street}, ${address.locality}, ${address.city}, Argentina`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function instagramUrl(handle: string): string {
  return `https://www.instagram.com/${handle}/`;
}

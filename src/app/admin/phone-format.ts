const MOBILE = /^549(\d{10})$/;
const LANDLINE = /^54(\d{10})$/;
const MIN_DIALABLE = 8;

/**
 * An Argentine number the way people say it, "351 678-5675", from its stored
 * digits ("5493516785675"). The area code is two digits for Buenos Aires (11)
 * and three for every other city; a number that is not an Argentine mobile or
 * landline of ten national digits stays as the raw digits.
 */
export function formatPhone(digits: string): string {
  const national = MOBILE.exec(digits)?.[1] ?? LANDLINE.exec(digits)?.[1];
  if (national === undefined) return digits;
  const areaLength = national.startsWith("11") ? 2 : 3;
  const area = national.slice(0, areaLength);
  const rest = national.slice(areaLength);
  const split = rest.length - 4;
  return `${area} ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** The `tel:` link for stored digits, or undefined when there is nothing to dial. */
export function telHref(digits: string): string | undefined {
  return /^\d+$/.test(digits) && digits.length >= MIN_DIALABLE
    ? `tel:+${digits}`
    : undefined;
}

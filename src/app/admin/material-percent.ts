const MAX_PERCENT = 200;

/**
 * A written percentage such as `10` or `7,5` (one comma or point, up to two
 * decimals). Null when it is missing, malformed, not above zero or over 200.
 */
export function parsePercent(text: string): number | null {
  const trimmed = text.trim().replace(/\s*%$/, "");
  if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(",", "."));
  return value > 0 && value <= MAX_PERCENT ? value : null;
}

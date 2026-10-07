/**
 * Compute the relative luminance of a hex color.
 *
 * @param hex - a CSS hex color string, 3 or 6 digits, with or without leading '#'
 * @returns a number between 0 and 1 representing the relative luminance
 */
export function relativeLuminance(hex: string): number {
  // Remove leading '#' if present
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  // Validate length: must be 3 or 6 hex digits
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(cleanHex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  // Expand 3-digit to 6-digit
  let expandedHex = cleanHex;
  if (cleanHex.length === 3) {
    expandedHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // Parse hex to numbers 0-255
  const r = parseInt(expandedHex.slice(0, 2), 16);
  const g = parseInt(expandedHex.slice(2, 4), 16);
  const b = parseInt(expandedHex.slice(4, 6), 16);

  // Normalize to [0, 1]
  const normalize = (c: number) => c / 255;
  const rNorm = normalize(r);
  const gNorm = normalize(g);
  const bNorm = normalize(b);

  // Linearize
  const linearize = (c: number) => {
    if (c <= 0.04045) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const rLinear = linearize(rNorm);
  const gLinear = linearize(gNorm);
  const bLinear = linearize(bNorm);

  // Compute relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Compute the contrast ratio between two colors.
 *
 * @param foreground - hex color string
 * @param background - hex color string
 * @returns contrast ratio (range 1 to 21)
 */
export function contrastRatio(foreground: string, background: string): number {
  const lum1 = relativeLuminance(foreground);
  const lum2 = relativeLuminance(background);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse color token definitions from a CSS string.
 *
 * @param css - CSS text containing `--color-<name>: #rrggbb;` declarations
 * @returns Map where keys are token names (without the `--color-` prefix) and
 *          values are the hex colors (including the leading '#')
 */
export function parseColorTokens(css: string): Map<string, string> {
  // Strip block comments /* ... */
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Match --color-<name>: #rrggbb;
  const pattern = /--color-([a-z0-9-]+)\s*:\s*(#[\da-fA-F]{6})\s*;/g;
  const map = new Map<string, string>();
  let match;
  while ((match = pattern.exec(noComments)) !== null) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined) {
      map.set(name, value);
    }
  }
  return map;
}

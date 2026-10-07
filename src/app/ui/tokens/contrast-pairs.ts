/**
 * A pair of color tokens used in the contrast gate.
 *
 * @property fg - foreground token name (without `--color-` prefix)
 * @property bg - background token name (without `--color-` prefix)
 * @property kind - selects the WCAG 2.2 gate:
 *   - "text": normal text, minimum contrast 4.5
 *   - "large-text": large text, minimum contrast 3
 *   - "ui": UI components, minimum contrast 3
 *   - "decorative": decorative, no minimum contrast
 * @property usage - human-readable description of where the pair is used
 */
export interface ColorTokenPair {
  readonly fg: string;
  readonly bg: string;
  readonly kind: "text" | "large-text" | "ui" | "decorative";
  readonly usage: string;
}

/**
 * Declared color token pairs from design §3.2, in the design table order.
 */
export const COLOR_TOKEN_PAIRS: readonly ColorTokenPair[] = [
  { fg: "ink-900", bg: "canvas", kind: "text", usage: "Headings and nav" },
  { fg: "ink-900", bg: "surface", kind: "text", usage: "Headings and nav" },
  { fg: "ink-900", bg: "sand-200", kind: "text", usage: "Headings and nav" },
  { fg: "ink-700", bg: "canvas", kind: "text", usage: "Body text" },
  { fg: "ink-700", bg: "surface", kind: "text", usage: "Body text" },
  { fg: "ink-700", bg: "sand-100", kind: "text", usage: "Body text" },
  { fg: "ink-700", bg: "sand-200", kind: "text", usage: "Body text" },
  {
    fg: "ink-600",
    bg: "canvas",
    kind: "text",
    usage: "Muted text and eyebrows",
  },
  {
    fg: "ink-600",
    bg: "surface",
    kind: "text",
    usage: "Muted text and eyebrows",
  },
  {
    fg: "ink-600",
    bg: "sand-100",
    kind: "text",
    usage: "Muted text and eyebrows",
  },
  {
    fg: "white",
    bg: "clay-600",
    kind: "text",
    usage: "Primary button label and hover",
  },
  {
    fg: "white",
    bg: "clay-700",
    kind: "text",
    usage: "Primary button label and hover",
  },
  {
    fg: "clay-800",
    bg: "canvas",
    kind: "text",
    usage: "Links and text-with-arrow",
  },
  {
    fg: "clay-800",
    bg: "surface",
    kind: "text",
    usage: "Links and text-with-arrow",
  },
  {
    fg: "clay-800",
    bg: "sand-100",
    kind: "text",
    usage: "Links and text-with-arrow",
  },
  {
    fg: "clay-800",
    bg: "sand-200",
    kind: "text",
    usage: "Links and text-with-arrow",
  },
  { fg: "terracotta-700", bg: "canvas", kind: "text", usage: "Accent text" },
  { fg: "terracotta-700", bg: "surface", kind: "text", usage: "Accent text" },
  { fg: "terracotta-700", bg: "sand-200", kind: "text", usage: "Accent text" },
  { fg: "olive-800", bg: "sage-200", kind: "text", usage: "Pills" },
  {
    fg: "clay-600",
    bg: "canvas",
    kind: "ui",
    usage: "Button fill and outline border against the page",
  },
  {
    fg: "clay-600",
    bg: "surface",
    kind: "ui",
    usage: "Button fill and outline border against the page",
  },
  {
    fg: "clay-600",
    bg: "sand-200",
    kind: "ui",
    usage: "Button fill and outline border against the page",
  },
  { fg: "clay-800", bg: "canvas", kind: "ui", usage: "Focus ring" },
  { fg: "clay-800", bg: "surface", kind: "ui", usage: "Focus ring" },
  { fg: "clay-800", bg: "sand-200", kind: "ui", usage: "Focus ring" },
  {
    fg: "tan-400",
    bg: "canvas",
    kind: "decorative",
    usage: "Ornamental rules",
  },
];

/**
 * Restricted token names (design §3.1). The gate fails if any of these
 * appear in a text pair (kind === "text").
 */
export const RESTRICTED_TOKENS: readonly string[] = ["tan-400"];

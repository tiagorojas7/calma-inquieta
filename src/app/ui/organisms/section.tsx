import type { HTMLAttributes, PropsWithChildren } from "react";

/**
 * Tone band (S7). `bleed` bands span the full viewport width (a direct child
 * of <main>, see layout.css) while their content stays on the page grid
 * (`max-w-page` plus gutters). Boxed bands stay inside the page grid with
 * rounded corners.
 *
 * Tones: canvas (page colour), sand (sand-100), cocoa (chocolate, the closing band), clay (deep clay-800 with
 * light text; headings, paragraphs and eyebrows inherit the light colour and
 * `<em>` turns sand-200), white (surface). All text pairs are AA.
 */
const toneClasses = {
  canvas: "bg-canvas text-ink-700",
  sand: "bg-sand-100 text-ink-700",
  clay: "bg-clay-800 text-canvas tone-clay",
  cocoa: "bg-cocoa-900 text-canvas tone-cocoa",
  white: "bg-surface text-ink-700",
} as const;

const spacingClasses = {
  none: "py-0",
  sm: "py-10 lg:py-14",
  md: "py-section",
  lg: "py-16 lg:py-28",
  /** The first band of a page: close to the navbar, the usual space below. */
  page: "pt-page-top pb-16 lg:pb-28",
} as const;

export type SectionTone = keyof typeof toneClasses;
export type SectionSpacing = keyof typeof spacingClasses;

export function Section({
  as: Tag = "section",
  tone = "canvas",
  bleed = false,
  spacing = "md",
  grain = false,
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  as?: "section" | "div" | "aside";
  tone?: SectionTone;
  /** Escape the page wrapper and span the viewport; false keeps a boxed band. */
  bleed?: boolean;
  spacing?: SectionSpacing;
  /** Subtle paper grain (inline SVG, under 2 KB) behind the content. */
  grain?: boolean;
}) {
  const classes = [
    "relative",
    bleed ? "section-bleed" : "rounded-md",
    toneClasses[tone],
    spacingClasses[spacing],
    grain ? "paper-grain" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag
      {...props}
      data-tone={tone}
      data-bleed={String(bleed)}
      className={classes}
    >
      <div
        className={bleed ? "mx-auto w-full max-w-page px-gutter" : "px-gutter"}
      >
        {children}
      </div>
    </Tag>
  );
}

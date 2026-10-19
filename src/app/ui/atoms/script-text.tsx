import type { HTMLAttributes, PropsWithChildren } from "react";

/**
 * Handwritten accent (S3): Caveat 600 for notes and highlighted phrases. The
 * `text-script` token never goes below 1.5rem (24 px), so it is always
 * legible. Decorative emphasis only: keep the surrounding sentence readable
 * without it.
 */
const toneClasses = {
  accent: "text-terracotta-700",
  ink: "text-ink-900",
  light: "text-canvas",
} as const;

export type ScriptTextTone = keyof typeof toneClasses;

export function ScriptText({
  as: Tag = "span",
  tone = "accent",
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  as?: "span" | "p" | "div";
  /** accent: terracotta on canvas/sand; ink: ink-900; light: canvas on a clay band. */
  tone?: ScriptTextTone;
}) {
  return (
    <Tag
      {...props}
      data-script="true"
      className={`font-script text-script font-semibold ${toneClasses[tone]} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

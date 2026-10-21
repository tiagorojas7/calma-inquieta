/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import type { ElementType, HTMLAttributes, PropsWithChildren } from "react";

const headingClasses: Record<string, string> = {
  // Line heights come from the --text-* tokens. Weights: 500 for the large
  // sizes, 600 for h3 where the smaller size needs the extra hierarchy.
  display: "font-display text-display font-medium text-ink-900",
  h1: "font-display text-display font-medium text-ink-900",
  h2: "font-display text-h2 font-medium text-ink-900",
  h3: "font-display text-h3 font-semibold text-ink-900",
  h4: "font-sans text-base font-semibold leading-tight text-ink-900",
};
const textClasses: Record<string, string> = {
  default: "text-base text-ink-700",
  muted: "text-base text-ink-600",
  accent: "text-base text-clay-800",
};

export function Heading({
  level = 2,
  size = `h${String(level)}`,
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLHeadingElement>> & {
  level?: 1 | 2 | 3 | 4;
  size?: string;
}) {
  const Tag = `h${String(level)}` as ElementType;
  const headingClass = headingClasses[size as string] ?? headingClasses.h2;
  return (
    <Tag
      {...props}
      className={`${headingClass as string} ${className as string}`}
      data-size={size}
    >
      {children}
    </Tag>
  );
}
export function Text({
  as: Tag = "p",
  tone = "default",
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  as?: "p" | "span";
  tone?: string;
}) {
  const textClass = textClasses[tone as string] ?? textClasses.default;
  return (
    <Tag
      {...props}
      className={`${textClass as string} ${className as string}`}
      data-tone={tone}
    >
      {children}
    </Tag>
  );
}
export function Eyebrow({
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement>>) {
  return (
    <span
      {...props}
      className={`font-sans text-eyebrow font-semibold uppercase tracking-eyebrow text-ink-600 ${className as string}`}
      data-eyebrow="true"
    >
      {children}
    </span>
  );
}

/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import type { ElementType, HTMLAttributes, PropsWithChildren } from "react";

const headingClasses: Record<string, string> = {
  display: "font-display text-5xl leading-tight text-ink-600",
  h1: "font-display text-4xl leading-tight text-ink-600",
  h2: "font-display text-3xl leading-tight text-ink-600",
  h3: "font-display text-2xl leading-tight text-ink-600",
  h4: "font-sans text-xl font-semibold leading-tight text-ink-600",
};
const textClasses: Record<string, string> = {
  default: "text-ink-600",
  muted: "text-ink-400",
  accent: "text-clay-600",
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
      className={`font-sans text-sm font-semibold uppercase tracking-wide text-clay-600 ${className as string}`}
      data-eyebrow="true"
    >
      {children}
    </span>
  );
}

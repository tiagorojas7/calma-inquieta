import type { HTMLAttributes, PropsWithChildren, ElementType } from "react";
export function Heading({
  level = 2,
  size = `h${level}`,
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLHeadingElement>> & {
  level?: 1 | 2 | 3 | 4;
  size?: string;
}) {
  const Tag = `h${level}` as ElementType;
  return (
    <Tag {...props} data-size={size}>
      {children}
    </Tag>
  );
}
export function Text({
  as: Tag = "p",
  tone = "default",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  as?: "p" | "span";
  tone?: string;
}) {
  return (
    <Tag {...props} data-tone={tone}>
      {children}
    </Tag>
  );
}
export function Eyebrow({
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement>>) {
  return (
    <span {...props} data-eyebrow="true">
      {children}
    </span>
  );
}

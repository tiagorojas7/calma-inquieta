import { Link } from "react-router";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { microcopy } from "../microcopy";

type Variant = "primary" | "outline" | "text-arrow";
const variantClasses: Record<Variant, string> = {
  primary:
    "min-h-11 rounded-md bg-clay-600 px-6 py-3 font-sans text-canvas hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-600",
  outline:
    "min-h-11 rounded-md border border-ink-600 px-6 py-3 text-ink-600 hover:bg-sand-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-600",
  "text-arrow":
    "inline-flex min-h-11 items-center gap-2 text-ink-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-600",
};
export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: Variant;
}) {
  return (
    <button
      {...props}
      data-variant={variant}
      className={`${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
export function ButtonLink({
  href,
  variant = "primary",
  children,
  className = "",
  ...props
}: PropsWithChildren<
  { href: string; variant?: Variant; className?: string } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  >
>) {
  const external = /^https?:/.test(href);
  const content = (
    <>
      {children}
      {external && <span className="sr-only">{microcopy.opensInNewTab}</span>}
    </>
  );
  const classes = `${variantClasses[variant]} ${className}`;
  return external ? (
    <a
      {...props}
      href={href}
      className={classes}
      target="_blank"
      rel="noopener noreferrer"
    >
      {content}
    </a>
  ) : (
    <Link {...props} to={href} className={classes}>
      {content}
    </Link>
  );
}

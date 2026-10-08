import { Link } from "react-router";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { microcopy } from "../microcopy";

type Variant = "primary" | "outline" | "text-arrow";
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
      className={`${variant === "primary" ? "min-h-11" : ""} ${className}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          props.onClick?.(event as never);
        }
      }}
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
  const classes = `${variant === "primary" ? "min-h-11" : ""} ${className}`;
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

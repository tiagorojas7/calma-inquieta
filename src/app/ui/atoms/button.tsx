import { Link } from "react-router";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { microcopy } from "../microcopy";

type Variant = "primary" | "secondary" | "tertiary" | "outline" | "text-arrow";

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";
const lift =
  "relative inline-flex min-h-11 items-center justify-center rounded-md px-6 py-3 font-sans transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-calm motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-reduce:transition-none";
const disabled =
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:translate-y-0 aria-disabled:hover:shadow-none";

const secondary = `${lift} border border-clay-600 text-clay-800 hover:bg-sand-200 active:border-clay-800 active:bg-sand-300 ${focus} ${disabled}`;
const tertiary =
  "link-underline link-underline-rest relative inline-flex min-h-11 items-center gap-2 text-clay-800 transition-[color,background-size,transform,opacity] duration-200 ease-calm hover:text-clay-800 active:text-clay-800 motion-safe:hover:translate-x-0.5 motion-safe:active:translate-x-0 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-x-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:translate-x-0";
const variantClasses: Record<Variant, string> = {
  primary: `${lift} bg-clay-600 text-white hover:bg-clay-700 hover:shadow-card active:bg-clay-800 ${focus} ${disabled}`,
  secondary,
  tertiary,
  // Compatibility aliases for existing public call sites.
  outline: secondary,
  "text-arrow": tertiary,
};

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement>
> & {
  variant?: Variant;
  loading?: boolean;
};

function LoadingLabel({
  loading,
  children,
}: PropsWithChildren<{ loading: boolean }>) {
  return <span className={loading ? "opacity-0" : undefined}>{children}</span>;
}

function LoadingIndicator() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 m-auto size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
      data-testid="loading-indicator"
    />
  );
}

export function Button({
  variant = "primary",
  className = "",
  children,
  loading = false,
  disabled: disabledProp = false,
  ...props
}: ButtonProps) {
  const unavailable = disabledProp || loading;
  return (
    <button
      {...props}
      disabled={unavailable}
      aria-busy={loading || undefined}
      data-variant={variant}
      className={`${variantClasses[variant]} ${className}`}
    >
      <LoadingLabel loading={loading}>{children}</LoadingLabel>
      {loading && <LoadingIndicator />}
    </button>
  );
}

type ButtonLinkProps = PropsWithChildren<
  {
    href: string;
    variant?: Variant;
    className?: string;
    disabled?: boolean;
    loading?: boolean;
  } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "disabled">
>;

export function ButtonLink({
  href,
  variant = "primary",
  children,
  className = "",
  disabled = false,
  loading = false,
  onClick,
  ...props
}: ButtonLinkProps) {
  const external = /^https?:/.test(href);
  const unavailable = disabled || loading;
  const preventUnavailableActivation: React.MouseEventHandler<
    HTMLAnchorElement
  > = (event) => {
    if (unavailable) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };
  const content = (
    <>
      <LoadingLabel loading={loading}>{children}</LoadingLabel>
      {external && <span className="sr-only">{microcopy.opensInNewTab}</span>}
      {loading && <LoadingIndicator />}
    </>
  );
  const linkProps = {
    ...props,
    "aria-busy": loading || undefined,
    "aria-disabled": unavailable || undefined,
    className: `${variantClasses[variant]} ${className}`,
    onClick: preventUnavailableActivation,
  };
  return external ? (
    <a {...linkProps} href={href} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <Link {...linkProps} to={href} viewTransition>
      {content}
    </Link>
  );
}

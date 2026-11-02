import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export type AdminButtonVariant = "primary" | "secondary" | "outline" | "danger";

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";
const base =
  "relative inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 py-3 font-sans text-base font-bold";
const disabled =
  "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

/**
 * One strong primary per screen (filled), secondary buttons outlined, red only
 * for delete and cancel. `outline` is kept as an alias of `secondary`.
 */
export const adminButtonClasses = {
  primary: `${base} bg-clay-800 text-white shadow-card hover:bg-ink-900 ${focus} ${disabled}`,
  secondary: `${base} border-2 border-clay-800 bg-surface text-clay-800 hover:bg-sand-100 ${focus} ${disabled}`,
  danger: `${base} border-2 border-admin-danger bg-surface text-admin-danger hover:bg-admin-danger-soft ${focus} ${disabled}`,
} as const;

export function normalizeAdminVariant(
  variant: AdminButtonVariant,
): keyof typeof adminButtonClasses {
  return variant === "outline" ? "secondary" : variant;
}

export function AdminButton({
  variant = "primary",
  loading = false,
  disabled: disabledProp = false,
  className = "",
  children,
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: AdminButtonVariant;
    loading?: boolean;
  }
>) {
  const resolved = normalizeAdminVariant(variant);
  return (
    <button
      {...props}
      disabled={disabledProp || loading}
      aria-busy={loading || undefined}
      data-variant={resolved}
      className={`${adminButtonClasses[resolved]} ${className}`}
    >
      <span className={loading ? "opacity-0" : undefined}>{children}</span>
      {loading && (
        <span
          aria-hidden="true"
          className="absolute inset-0 m-auto size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
          data-testid="loading-indicator"
        />
      )}
    </button>
  );
}

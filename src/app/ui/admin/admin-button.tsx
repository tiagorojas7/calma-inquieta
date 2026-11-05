import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export type AdminButtonVariant =
  "primary" | "secondary" | "outline" | "danger" | "success";

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";
const base =
  "relative inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 py-3 font-sans text-base font-bold shadow-button transition-[transform,box-shadow,background-color] duration-200 ease-calm hover:shadow-lift motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0";
const disabled =
  "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

/**
 * Colors by action kind, the same on every screen: brand primary for the main
 * next step ("Guardar"), green for create, add and positive commits ("Agregar",
 * "Publicar"), red for delete, cancel and archive, outlined for secondary and
 * navigation. `outline` is kept as an alias of `secondary`.
 */
export const adminButtonClasses = {
  primary: `${base} bg-clay-800 text-white hover:bg-ink-900 ${focus} ${disabled}`,
  secondary: `${base} border-2 border-clay-800 bg-surface text-clay-800 hover:bg-sand-100 ${focus} ${disabled}`,
  danger: `${base} bg-admin-danger text-white hover:bg-admin-danger-hover ${focus} ${disabled}`,
  success: `${base} bg-admin-success text-white hover:bg-admin-success-hover ${focus} ${disabled}`,
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

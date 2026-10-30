import type { PropsWithChildren } from "react";

const classes = {
  primary:
    "inline-flex min-h-11 items-center rounded-md bg-clay-600 px-6 py-3 font-sans text-white hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800",
  outline:
    "inline-flex min-h-11 items-center rounded-md border border-clay-600 px-6 py-3 text-clay-800 hover:bg-sand-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800",
} as const;

/**
 * Button-looking link for admin screens. It is a plain `<a>`, never a router
 * `Link`: the Worker gate denies every `/admin/**.data` request, so a client
 * navigation would be refused. Each click is a document navigation.
 */
export function AdminButtonLink({
  href,
  variant = "primary",
  children,
  ariaLabel,
}: PropsWithChildren<{
  href: string;
  variant?: keyof typeof classes;
  ariaLabel?: string;
}>) {
  return (
    <a href={href} className={classes[variant]} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

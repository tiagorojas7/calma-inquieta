import type { PropsWithChildren } from "react";
import {
  adminButtonClasses,
  normalizeAdminVariant,
  type AdminButtonVariant,
} from "./admin-button";

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
  variant?: AdminButtonVariant;
  ariaLabel?: string;
}>) {
  const resolved = normalizeAdminVariant(variant);
  return (
    <a
      href={href}
      data-variant={resolved}
      className={adminButtonClasses[resolved]}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

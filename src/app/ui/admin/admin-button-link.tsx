import type { PropsWithChildren } from "react";
import { Icon, type IconName } from "../atoms/icon";
import {
  adminButtonClasses,
  normalizeAdminVariant,
  type AdminButtonVariant,
} from "./admin-button";

/**
 * Button-looking link for admin screens. It is a plain `<a>`, never a router
 * `Link`: the Worker gate denies every `/admin/**.data` request, so a client
 * navigation would be refused. Each click is a document navigation. `icon` adds
 * a decorative leading glyph; `next` marks a next step with a trailing arrow.
 */
export function AdminButtonLink({
  href,
  variant = "primary",
  children,
  ariaLabel,
  icon,
  next = false,
}: PropsWithChildren<{
  href: string;
  variant?: AdminButtonVariant;
  ariaLabel?: string;
  icon?: IconName;
  next?: boolean;
}>) {
  const resolved = normalizeAdminVariant(variant);
  return (
    <a
      href={href}
      data-variant={resolved}
      className={adminButtonClasses[resolved]}
      aria-label={ariaLabel}
    >
      {icon ? <Icon name={icon} size={20} aria-hidden="true" /> : null}
      {children}
      {next ? <Icon name="arrow-right" size={20} aria-hidden="true" /> : null}
    </a>
  );
}

import { NavLink as RouterNavLink } from "react-router";
import type { PropsWithChildren } from "react";

/**
 * Internal navigation link: animated underline (drawn for the current page)
 * and a view-transition route change. `className` adds layout or type styles
 * for the context (header, mobile menu, footer).
 */
export function NavLink({
  href,
  onNavigate,
  className = "",
  children,
}: PropsWithChildren<{
  href: string;
  onNavigate?: () => void;
  className?: string;
}>) {
  return (
    <RouterNavLink
      to={href}
      end={href === "/"}
      onClick={onNavigate}
      viewTransition
      className={`link-underline ${className}`.trim()}
    >
      {children}
    </RouterNavLink>
  );
}

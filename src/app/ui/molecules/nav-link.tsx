import { NavLink as RouterNavLink } from "react-router";
import type { PropsWithChildren } from "react";
export function NavLink({
  href,
  onNavigate,
  children,
}: PropsWithChildren<{ href: string; onNavigate?: () => void }>) {
  return (
    <RouterNavLink to={href} end={href === "/"} onClick={onNavigate}>
      {children}
    </RouterNavLink>
  );
}

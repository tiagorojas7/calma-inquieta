import { useState, type PropsWithChildren } from "react";
import { Icon } from "../atoms/icon";
import { SkipLink } from "../atoms/skip-link";
import { ADMIN_NAV, isActiveAdminEntry } from "./admin-nav";
import { adminMicrocopy } from "./microcopy";

export const ADMIN_SIGN_OUT_HREF = "/cdn-cgi/access/logout";

/** Search engines must skip every admin page; headers say it too. */
export function AdminNoIndex() {
  return <meta name="robots" content="noindex, nofollow" />;
}

function NavList({ pathname }: { pathname: string }) {
  return (
    <ul className="flex flex-col gap-1">
      {ADMIN_NAV.map((entry) => {
        const active = isActiveAdminEntry(entry, pathname);
        return (
          <li key={entry.href}>
            <a
              href={entry.href}
              {...(active ? { "aria-current": "page" as const } : {})}
              className={`flex min-h-11 items-center rounded-md px-3 text-ink-900 hover:bg-sand-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 ${active ? "bg-sand-200 font-semibold" : ""}`}
            >
              {entry.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Admin chrome: top bar with the signed-in email and "Salir", a desktop
 * sidebar and a phone menu fed by the same `ADMIN_NAV`. Presentational: the
 * email and the current path arrive as props.
 */
export function AdminShell({
  email,
  pathname,
  children,
}: PropsWithChildren<{ email: string | null; pathname: string }>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const copy = adminMicrocopy.shell;
  return (
    <div className="min-h-screen bg-canvas">
      <AdminNoIndex />
      <SkipLink />
      <header className="border-b border-sand-200 bg-surface">
        <div className="flex items-center justify-between gap-4 px-gutter py-3">
          <a href="/admin" className="font-display text-xl text-ink-900">
            {copy.brand}
          </a>
          <div
            data-testid="admin-actions"
            className="flex shrink-0 items-center gap-4"
          >
            <a
              href={ADMIN_SIGN_OUT_HREF}
              className="inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4"
            >
              {copy.signOut}
            </a>
            <button
              data-testid="admin-menu-button"
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-clay-600 text-clay-800 lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="menu-admin"
              aria-label={menuOpen ? copy.closeMenu : copy.openMenu}
              onClick={() => {
                setMenuOpen(!menuOpen);
              }}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
          </div>
        </div>
        {email ? (
          <p
            data-testid="admin-desktop-identity"
            className="hidden min-w-0 break-all px-gutter pb-2 text-sm text-ink-700 lg:block"
          >
            <span className="sr-only">{copy.signedInAs} </span>
            {email}
          </p>
        ) : null}
        {menuOpen ? (
          <nav
            id="menu-admin"
            aria-label={copy.mobileSections}
            className="border-t border-sand-200 px-gutter py-3 lg:hidden"
          >
            {email ? (
              <p className="mb-3 min-w-0 break-all text-sm text-ink-700">
                <span className="sr-only">{copy.signedInAs} </span>
                {email}
              </p>
            ) : null}
            <NavList pathname={pathname} />
          </nav>
        ) : null}
      </header>
      <div className="lg:flex">
        <nav
          aria-label={copy.sections}
          className="hidden w-60 shrink-0 border-r border-sand-200 bg-surface p-4 lg:block"
        >
          <NavList pathname={pathname} />
        </nav>
        <main id="contenido" className="min-w-0 flex-1 p-gutter">
          {children}
        </main>
      </div>
    </div>
  );
}

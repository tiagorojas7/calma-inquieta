import { useState, type PropsWithChildren } from "react";
import { Icon } from "../atoms/icon";
import { SkipLink } from "../atoms/skip-link";
import {
  ADMIN_NAV_MAIN,
  ADMIN_NAV_MORE,
  activeAdminEntry,
  type AdminNavEntry,
} from "./admin-nav";
import { adminMicrocopy } from "./microcopy";

export const ADMIN_SIGN_OUT_HREF = "/cdn-cgi/access/logout";

/** Search engines must skip every admin page; headers say it too. */
export function AdminNoIndex() {
  return <meta name="robots" content="noindex, nofollow" />;
}

const linkBase =
  "flex min-h-11 items-center rounded-md px-3 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

function NavLinks({
  entries,
  activeHref,
}: {
  entries: readonly AdminNavEntry[];
  activeHref: string | undefined;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {entries.map((entry) => {
        const active = entry.href === activeHref;
        return (
          <li key={entry.href}>
            <a
              href={entry.href}
              {...(active ? { "aria-current": "page" as const } : {})}
              className={`${linkBase} ${active ? "bg-clay-800 font-semibold text-white hover:bg-clay-800" : "text-ink-900"}`}
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
 * Six main entries plus a native `<details>` "Más" group: no JavaScript is
 * needed to open it, and it starts open on one of its own pages.
 */
function NavList({ pathname }: { pathname: string }) {
  const activeHref = activeAdminEntry(pathname)?.href;
  const moreActive = ADMIN_NAV_MORE.some((entry) => entry.href === activeHref);
  return (
    <div className="flex flex-col gap-1">
      <NavLinks entries={ADMIN_NAV_MAIN} activeHref={activeHref} />
      <details data-more open={moreActive || undefined} className="mt-1">
        <summary className="flex min-h-11 cursor-pointer items-center rounded-md px-3 font-semibold text-ink-900 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800">
          {adminMicrocopy.shell.more}
        </summary>
        <div className="mt-1 border-l-2 border-admin-line pl-2">
          <NavLinks entries={ADMIN_NAV_MORE} activeHref={activeHref} />
        </div>
      </details>
    </div>
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
    <div className="admin-root min-h-screen bg-admin-page">
      <AdminNoIndex />
      <SkipLink />
      <header className="border-b border-admin-line bg-surface">
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
          className="hidden w-60 shrink-0 border-r border-admin-line bg-surface p-4 lg:block"
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

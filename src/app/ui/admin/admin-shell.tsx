import { useState, type PropsWithChildren } from "react";
import { Icon } from "../atoms/icon";
import { SkipLink } from "../atoms/skip-link";
import { AdminAreaProvider, AreaChip } from "./admin-area";
import { ADMIN_AREAS } from "./admin-areas";
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
  "flex min-h-12 items-center gap-3 rounded-md px-2 text-base hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

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
              data-area={entry.area}
              {...(active ? { "aria-current": "page" as const } : {})}
              className={`${linkBase} ${active ? `${ADMIN_AREAS[entry.area].band} font-bold hover:brightness-95` : "font-medium text-ink-900"}`}
            >
              {active ? (
                <Icon name={entry.icon} size={24} aria-hidden="true" />
              ) : (
                <AreaChip area={entry.area} size={20} className="p-1.5" />
              )}
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
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md px-3 font-bold text-ink-900 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800">
          {adminMicrocopy.shell.more}
          <Icon name="chevron-right" size={20} aria-hidden="true" />
        </summary>
        <div className="mt-1 border-l-2 border-admin-line pl-2">
          <NavLinks entries={ADMIN_NAV_MORE} activeHref={activeHref} />
        </div>
      </details>
    </div>
  );
}

/** The most the badge writes; the accessible name always carries the real count. */
const BADGE_MAX = 99;

/**
 * The panel bell: a plain anchor to the novelties page (the Worker gate
 * refuses the `.data` requests a client navigation makes). The number counts
 * the requests nobody opened yet; with none, or with no reading, only the bell.
 */
function NotificationsBell({ unseen }: { unseen: number | null | undefined }) {
  const copy = adminMicrocopy.notifications.bell;
  const count =
    unseen !== null && unseen !== undefined && unseen > 0 ? unseen : 0;
  return (
    <a
      href="/admin/novedades"
      aria-label={count > 0 ? copy.unread(count) : copy.label}
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-clay-800 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
    >
      <Icon name="reminders" size={24} aria-hidden="true" />
      {count > 0 ? (
        <span
          data-testid="admin-bell-badge"
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-pill bg-clay-800 px-1 text-xs font-bold leading-none text-white"
        >
          {count > BADGE_MAX ? copy.overflow : count}
        </span>
      ) : null}
    </a>
  );
}

/**
 * Admin chrome: top bar with the signed-in email and "Salir", a desktop
 * sidebar and a phone menu fed by the same `ADMIN_NAV`. Presentational: the
 * email, the current path and the unopened-request count arrive as props.
 */
export function AdminShell({
  email,
  pathname,
  unseen,
  children,
}: PropsWithChildren<{
  email: string | null;
  pathname: string;
  /** Requests nobody opened yet; null or absent when it could not be read. */
  unseen?: number | null | undefined;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const copy = adminMicrocopy.shell;
  return (
    <div className="admin-root flex min-h-screen flex-col bg-admin-page">
      <AdminNoIndex />
      <SkipLink />
      <header className="border-b border-admin-line bg-surface">
        <div className="flex items-center justify-between gap-4 px-gutter py-3">
          <a href="/admin" className="font-display text-xl text-ink-900">
            {copy.brand}
          </a>
          {email ? (
            <p
              data-testid="admin-desktop-identity"
              className="ml-auto hidden min-w-0 break-all text-sm text-ink-700 lg:block"
            >
              <span className="sr-only">{copy.signedInAs} </span>
              {email}
            </p>
          ) : null}
          <div
            data-testid="admin-actions"
            className="flex shrink-0 items-center gap-4"
          >
            <NotificationsBell unseen={unseen} />
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
      <div className="flex-1 lg:flex">
        <nav
          aria-label={copy.sections}
          className="hidden w-64 shrink-0 border-r border-admin-line bg-surface p-4 lg:block"
        >
          <NavList pathname={pathname} />
        </nav>
        <main id="contenido" className="min-w-0 flex-1 p-gutter">
          <AdminAreaProvider area={activeAdminEntry(pathname)?.area}>
            {children}
          </AdminAreaProvider>
        </main>
      </div>
    </div>
  );
}

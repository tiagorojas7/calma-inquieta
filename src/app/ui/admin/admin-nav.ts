import type { IconName } from "../atoms/icon";
import { adminCopy } from "./copy";
import type { AdminAreaKey } from "./admin-areas";

export interface AdminNavEntry {
  readonly area: AdminAreaKey;
  readonly icon: IconName;
  readonly label: string;
  readonly href: string;
}

const HOME: AdminNavEntry = {
  label: adminCopy.hoy.nav.label,
  href: "/admin",
  area: "home",
  icon: "home",
};

const STUDENTS: AdminNavEntry = {
  label: adminCopy.alumnas.nav.label,
  href: "/admin/alumnas",
  area: "students",
  icon: "students",
};

const CLASSES: AdminNavEntry = {
  label: adminCopy.clases.nav.label,
  href: "/admin/clases",
  area: "workshops",
  icon: "workshops",
};

const MATERIALS: AdminNavEntry = {
  label: adminCopy.materiales.nav.label,
  href: "/admin/materiales",
  area: "materials",
  icon: "materials",
};

const SETTINGS: AdminNavEntry = {
  label: adminCopy.ajustes.nav.label,
  href: "/admin/ajustes",
  area: "settings",
  icon: "settings",
};

/** The whole menu: five sections, nothing else. */
export const ADMIN_NAV: readonly AdminNavEntry[] = [
  HOME,
  STUDENTS,
  CLASSES,
  MATERIALS,
  SETTINGS,
];

/** Kept for the screens that list the sections; the same five entries. */
export const ADMIN_NAV_MAIN: readonly AdminNavEntry[] = ADMIN_NAV;

/**
 * Which section each page lives in. The longest matching prefix wins, so
 * `/admin/materiales/proveedores` is Ajustes while `/admin/materiales/m1` is
 * Materiales. Prefixes match on a segment boundary.
 */
const SECTION_PREFIXES: readonly (readonly [string, AdminNavEntry])[] = [
  ["/admin/novedades", HOME],
  ["/admin/alumnas", STUDENTS],
  ["/admin/inscripciones", STUDENTS],
  ["/admin/clases", CLASSES],
  ["/admin/talleres", CLASSES],
  ["/admin/intensivos", CLASSES],
  ["/admin/asistencia", CLASSES],
  ["/admin/materiales", MATERIALS],
  ["/admin/inscripciones/materiales", MATERIALS],
  ["/admin/ajustes", SETTINGS],
  ["/admin/profesores", SETTINGS],
  ["/admin/materiales/proveedores", SETTINGS],
  ["/admin/politicas", SETTINGS],
  ["/admin/estadisticas", SETTINGS],
  ["/admin/eventos", SETTINGS],
  ["/admin/recordatorios", SETTINGS],
];

const onBoundary = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * The single entry to highlight for a path: Hoy on the exact panel path, else
 * the section whose most specific prefix matches. Unknown paths have none.
 */
export function activeAdminEntry(pathname: string): AdminNavEntry | undefined {
  if (pathname === HOME.href) return HOME;
  let best: readonly [string, AdminNavEntry] | undefined;
  for (const candidate of SECTION_PREFIXES) {
    if (!onBoundary(pathname, candidate[0])) continue;
    if (!best || candidate[0].length > best[0].length) best = candidate;
  }
  return best?.[1];
}

export function isActiveAdminEntry(entry: AdminNavEntry, pathname: string) {
  return activeAdminEntry(pathname)?.href === entry.href;
}

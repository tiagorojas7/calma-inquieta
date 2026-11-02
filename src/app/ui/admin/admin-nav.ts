import type { IconName } from "../atoms/icon";
import type { AdminAreaKey } from "./admin-areas";

export interface AdminNavEntry {
  readonly area: AdminAreaKey;
  readonly icon: IconName;
  readonly label: string;
  readonly href: string;
}

const HOME: AdminNavEntry = {
  label: "Inicio",
  href: "/admin",
  area: "home",
  icon: "home",
};

/** Always visible in the menu. "Materiales" is the pedir/entregar screen. */
export const ADMIN_NAV_MAIN: readonly AdminNavEntry[] = [
  HOME,
  {
    label: "Inscripciones",
    href: "/admin/inscripciones",
    area: "enrollments",
    icon: "enrollments",
  },
  {
    label: "Talleres",
    href: "/admin/talleres",
    area: "workshops",
    icon: "workshops",
  },
  {
    label: "Intensivos",
    href: "/admin/intensivos",
    area: "intensives",
    icon: "intensives",
  },
  {
    label: "Materiales",
    href: "/admin/inscripciones/materiales",
    area: "materials",
    icon: "materials",
  },
  {
    label: "Asistencia",
    href: "/admin/asistencia",
    area: "attendance",
    icon: "attendance",
  },
];

/** The "Más" group: everything else stays one click away. */
export const ADMIN_NAV_MORE: readonly AdminNavEntry[] = [
  {
    label: "Profesoras",
    href: "/admin/profesores",
    area: "teachers",
    icon: "teachers",
  },
  {
    label: "Proveedores",
    href: "/admin/materiales/proveedores",
    area: "suppliers",
    icon: "suppliers",
  },
  {
    label: "Alumnas",
    href: "/admin/alumnas",
    area: "students",
    icon: "students",
  },
  {
    label: "Eventos privados",
    href: "/admin/eventos",
    area: "events",
    icon: "events",
  },
  {
    label: "Recordatorios",
    href: "/admin/recordatorios",
    area: "reminders",
    icon: "reminders",
  },
  {
    label: "Estadísticas",
    href: "/admin/estadisticas",
    area: "statistics",
    icon: "statistics",
  },
  {
    label: "Catálogo de materiales",
    href: "/admin/materiales",
    area: "catalog",
    icon: "catalog",
  },
];

/** Every area except Inicio: feeds the landing's area cards. */
export const ADMIN_NAV: readonly AdminNavEntry[] = [
  ...ADMIN_NAV_MAIN.filter((entry) => entry !== HOME),
  ...ADMIN_NAV_MORE,
];

/** Active by path prefix on a segment boundary, so `/admin/talleres-x` is not Talleres. */
export function isActiveAdminEntry(entry: AdminNavEntry, pathname: string) {
  return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
}

/**
 * The single entry to highlight: the most specific match wins, so
 * `/admin/inscripciones/materiales` is Materiales, not Inscripciones. Inicio
 * matches the exact panel path only.
 */
export function activeAdminEntry(pathname: string): AdminNavEntry | undefined {
  if (pathname === HOME.href) return HOME;
  return [...ADMIN_NAV]
    .filter((entry) => isActiveAdminEntry(entry, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

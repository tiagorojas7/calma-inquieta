export interface AdminNavEntry {
  readonly label: string;
  readonly href: string;
}

const HOME: AdminNavEntry = { label: "Inicio", href: "/admin" };

/** Always visible in the menu. "Materiales" is the pedir/entregar screen. */
export const ADMIN_NAV_MAIN: readonly AdminNavEntry[] = [
  HOME,
  { label: "Inscripciones", href: "/admin/inscripciones" },
  { label: "Talleres", href: "/admin/talleres" },
  { label: "Intensivos", href: "/admin/intensivos" },
  { label: "Materiales", href: "/admin/inscripciones/materiales" },
  { label: "Asistencia", href: "/admin/asistencia" },
];

/** The "Más" group: everything else stays one click away. */
export const ADMIN_NAV_MORE: readonly AdminNavEntry[] = [
  { label: "Profesoras", href: "/admin/profesores" },
  { label: "Proveedores", href: "/admin/materiales/proveedores" },
  { label: "Alumnas", href: "/admin/alumnas" },
  { label: "Eventos privados", href: "/admin/eventos" },
  { label: "Recordatorios", href: "/admin/recordatorios" },
  { label: "Estadísticas", href: "/admin/estadisticas" },
  { label: "Catálogo de materiales", href: "/admin/materiales" },
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

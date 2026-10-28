export interface AdminNavEntry {
  readonly label: string;
  readonly href: string;
}

/** The single menu definition: feeds the sidebar, the mobile menu and the landing. */
export const ADMIN_NAV: readonly AdminNavEntry[] = [
  { label: "Talleres", href: "/admin/talleres" },
  { label: "Intensivos", href: "/admin/intensivos" },
  { label: "Profesores", href: "/admin/profesores" },
  { label: "Inscripciones", href: "/admin/inscripciones" },
  { label: "Alumnas", href: "/admin/alumnas" },
  { label: "Materiales", href: "/admin/materiales" },
];

/** Active by path prefix on a segment boundary, so `/admin/talleres-x` is not Talleres. */
export function isActiveAdminEntry(entry: AdminNavEntry, pathname: string) {
  return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
}

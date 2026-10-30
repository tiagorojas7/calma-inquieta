import type { OrderStatus } from "~/modules/enrollments";

export const ENROLLMENT_LIST_PATH = "/admin/inscripciones";

export const ENROLLMENT_TABS = ["por-cobrar", "pagadas", "canceladas"] as const;
export type EnrollmentTab = (typeof ENROLLMENT_TABS)[number];

/** The order statuses each tab of the list covers. */
export const TAB_STATUSES: Record<EnrollmentTab, readonly OrderStatus[]> = {
  "por-cobrar": ["pending_confirmation"],
  pagadas: ["paid", "materials_requested", "materials_received"],
  canceladas: ["cancelled"],
};

export function tabForStatus(status: string): EnrollmentTab {
  return (
    ENROLLMENT_TABS.find((tab) =>
      TAB_STATUSES[tab].some((candidate) => candidate === status),
    ) ?? "por-cobrar"
  );
}

const ONE_TIME_PARAMS = ["ok", "pedido"];

/**
 * Where an inline action sends the admin back to: only the list itself, with
 * its own filters. Anything else (another origin, another path, a malformed
 * value) becomes the plain list, so the redirect can never leave the panel.
 */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith(ENROLLMENT_LIST_PATH))
    return ENROLLMENT_LIST_PATH;
  if (value.includes("\\")) return ENROLLMENT_LIST_PATH;
  let url: URL;
  try {
    url = new URL(value, "https://panel.invalid");
  } catch {
    return ENROLLMENT_LIST_PATH;
  }
  if (url.origin !== "https://panel.invalid") return ENROLLMENT_LIST_PATH;
  if (url.pathname !== ENROLLMENT_LIST_PATH) return ENROLLMENT_LIST_PATH;
  for (const name of ONE_TIME_PARAMS) url.searchParams.delete(name);
  const query = url.searchParams.toString();
  return query === ""
    ? ENROLLMENT_LIST_PATH
    : `${ENROLLMENT_LIST_PATH}?${query}`;
}

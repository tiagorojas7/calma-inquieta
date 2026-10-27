import { isUuid } from "./enrollment-ids";

export type MaterialFilterKey = "activos" | "inactivos" | "todos";

const MAX_CATEGORY_LENGTH = 80;

/** The `?estado=` query value; `activos` when missing or unknown. */
export function parseMaterialFilterKey(
  value: string | null,
): MaterialFilterKey {
  return value === "inactivos" || value === "todos" ? value : "activos";
}

const STATE = {
  activos: "active",
  inactivos: "inactive",
  todos: "all",
} as const;

/** The material list query: state key, category text and supplier uuid (`""` when absent). */
export function parseMaterialListQuery(params: URLSearchParams) {
  const filter = parseMaterialFilterKey(params.get("estado"));
  const category = (params.get("categoria") ?? "")
    .trim()
    .slice(0, MAX_CATEGORY_LENGTH);
  const supplier = params.get("proveedor") ?? "";
  const supplierId = isUuid(supplier) ? supplier : "";
  return {
    filter,
    category,
    supplierId,
    service: {
      state: STATE[filter],
      ...(category ? { category } : {}),
      ...(supplierId ? { supplierId } : {}),
    },
  };
}

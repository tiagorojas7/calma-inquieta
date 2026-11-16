import type { StudentActivityFilter } from "~/modules/students";

/** The `mostrar` query values of the students list, in the panel's language. */
export type ActivityParam = "activas" | "inactivas" | "todas";

const BY_PARAM: Record<ActivityParam, StudentActivityFilter> = {
  activas: "active",
  inactivas: "inactive",
  todas: "all",
};

/**
 * Which students the list shows. The active ones are the default; an unknown
 * value falls back to it instead of failing the page.
 */
export function parseActivityFilter(params: URLSearchParams): {
  activity: StudentActivityFilter;
  param: ActivityParam;
} {
  const value = params.get("mostrar");
  const param = (Object.keys(BY_PARAM) as ActivityParam[]).find(
    (candidate) => candidate === value,
  );
  const chosen = param ?? "activas";
  return { activity: BY_PARAM[chosen], param: chosen };
}

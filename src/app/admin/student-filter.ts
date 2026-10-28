import { ORDER_STATUSES } from "~/modules/enrollments";
import type { StudentQuery } from "~/modules/students";
import { isUuid } from "./enrollment-ids";

const TEXT_MAX = 100;

export interface StudentFilterValues {
  readonly q: string;
  readonly taller: string;
  readonly estado: string;
  readonly page: number;
}

/**
 * The students list filters as the page reads them (`q`, `taller`, `estado`,
 * `page`) and as the list use case takes them. Unknown values are dropped, so
 * they widen the list instead of failing it.
 */
export function parseStudentFilter(params: URLSearchParams): {
  query: StudentQuery;
  values: StudentFilterValues;
} {
  const q = (params.get("q") ?? "").trim().slice(0, TEXT_MAX);
  const tallerParam = (params.get("taller") ?? "").trim();
  const taller = isUuid(tallerParam) ? tallerParam : "";
  const estadoParam = params.get("estado") ?? "";
  const status = ORDER_STATUSES.find((candidate) => candidate === estadoParam);
  const pageParam = Number(params.get("page"));
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;

  return {
    query: {
      ...(q === "" ? {} : { text: q }),
      ...(taller === "" ? {} : { workshopId: taller }),
      ...(status === undefined ? {} : { status }),
      page,
    },
    values: { q, taller, estado: status ?? "", page },
  };
}

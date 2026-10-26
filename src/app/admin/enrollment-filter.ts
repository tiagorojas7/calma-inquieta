import { ORDER_STATUSES, type AdminListQuery } from "~/modules/enrollments";
import { isUuid } from "./enrollment-ids";

const DEFAULT_STATUS = "pending_confirmation";
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const TEXT_MAX = 100;

export interface EnrollmentFilterValues {
  readonly estado: string;
  readonly mes: string;
  readonly taller: string;
  readonly q: string;
  readonly page: number;
}

/**
 * The admin list filters as the page reads them (`estado`, `mes`, `taller`,
 * `q`, `page`) and as the list use case takes them. Unknown values fall back
 * to the pending inbox, never to an error.
 */
export function parseEnrollmentFilter(params: URLSearchParams): {
  query: AdminListQuery;
  values: EnrollmentFilterValues;
} {
  const estadoParam = params.get("estado") ?? "";
  const status =
    ORDER_STATUSES.find((candidate) => candidate === estadoParam) ??
    DEFAULT_STATUS;
  const monthParam = params.get("mes") ?? "";
  const mes = MONTH_KEY.test(monthParam) ? monthParam : "";
  const tallerParam = (params.get("taller") ?? "").trim();
  const taller = isUuid(tallerParam) ? tallerParam : "";
  const q = (params.get("q") ?? "").trim().slice(0, TEXT_MAX);
  const pageParam = Number(params.get("page"));
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;

  return {
    query: {
      status,
      ...(mes === "" ? {} : { period: mes }),
      ...(taller === "" ? {} : { workshopId: taller }),
      ...(q === "" ? {} : { text: q }),
      page,
    },
    values: { estado: status, mes, taller, q, page },
  };
}

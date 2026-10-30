import { cordobaMonthOf } from "~/modules/workshops";

/** The instant every flow fixture runs at: the real now, so route loaders that read the clock agree. */
export const FLOW_NOW = new Date();
export const FLOW_MONTH = cordobaMonthOf(FLOW_NOW);

/** The month after `month`, as `YYYY-MM`. */
export function monthAfter(month: string): string {
  const [year = 0, mon = 1] = month.split("-").map(Number);
  return mon === 12
    ? `${String(year + 1)}-01`
    : `${String(year)}-${String(mon + 1).padStart(2, "0")}`;
}

export const FLOW_NEXT_MONTH = monthAfter(FLOW_MONTH);

import { describe, expect, it } from "vitest";
import { parseEnrollmentFilter } from "./enrollment-filter";

const parse = (query: string) =>
  parseEnrollmentFilter(new URLSearchParams(query));

describe("enrollment list filter", () => {
  it("defaults to the pending inbox on the first page", () => {
    expect(parse("")).toEqual({
      query: { status: "pending_confirmation", page: 1 },
      values: {
        estado: "pending_confirmation",
        mes: "",
        taller: "",
        q: "",
        page: 1,
      },
    });
  });

  it("maps every filter to the list query", () => {
    expect(
      parse("estado=paid&mes=2026-11&taller=w1&q=%20ana%40%20&page=3"),
    ).toEqual({
      query: {
        status: "paid",
        period: "2026-11",
        workshopId: "w1",
        text: "ana@",
        page: 3,
      },
      values: {
        estado: "paid",
        mes: "2026-11",
        taller: "w1",
        q: "ana@",
        page: 3,
      },
    });
  });

  it("ignores unknown statuses, malformed months and bad pages", () => {
    expect(parse("estado=hacked&mes=noviembre&page=-2").query).toEqual({
      status: "pending_confirmation",
      page: 1,
    });
    expect(parse("page=abc").query.page).toBe(1);
  });
});

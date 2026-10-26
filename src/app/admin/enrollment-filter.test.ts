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
      parse(
        "estado=paid&mes=2026-11&taller=7a1d2e3f-5b4c-4d6e-8f9a-0b1c2d3e4f50&q=%20ana%40%20&page=3",
      ),
    ).toEqual({
      query: {
        status: "paid",
        period: "2026-11",
        workshopId: "7a1d2e3f-5b4c-4d6e-8f9a-0b1c2d3e4f50",
        text: "ana@",
        page: 3,
      },
      values: {
        estado: "paid",
        mes: "2026-11",
        taller: "7a1d2e3f-5b4c-4d6e-8f9a-0b1c2d3e4f50",
        q: "ana@",
        page: 3,
      },
    });
  });

  it("ignores a workshop filter that is not a uuid", () => {
    expect(parse("taller=w1").query).toEqual({
      status: "pending_confirmation",
      page: 1,
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

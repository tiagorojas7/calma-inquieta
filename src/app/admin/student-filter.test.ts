import { describe, expect, it } from "vitest";
import { parseStudentFilter } from "./student-filter";

const WORKSHOP = "7a1d2e3f-5b4c-4d6e-8f9a-0b1c2d3e4f50";

describe("parseStudentFilter", () => {
  it("defaults to the first page with no filter", () => {
    expect(parseStudentFilter(new URLSearchParams())).toEqual({
      query: { page: 1 },
      values: { q: "", taller: "", estado: "", page: 1 },
    });
  });

  it("reads search, workshop, status and page", () => {
    const { query, values } = parseStudentFilter(
      new URLSearchParams(`q=%20ana%20&taller=${WORKSHOP}&estado=paid&page=3`),
    );
    expect(query).toEqual({
      text: "ana",
      workshopId: WORKSHOP,
      status: "paid",
      page: 3,
    });
    expect(values).toEqual({
      q: "ana",
      taller: WORKSHOP,
      estado: "paid",
      page: 3,
    });
  });

  it("drops unknown values", () => {
    expect(
      parseStudentFilter(new URLSearchParams("taller=x&estado=nope&page=0"))
        .query,
    ).toEqual({ page: 1 });
  });
});

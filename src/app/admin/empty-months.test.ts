import { describe, expect, it } from "vitest";
import { emptyOpenMonths } from "./empty-months";

const summary = (
  id: string,
  period: string,
  status: "draft" | "open" | "closed",
  activeTurnos: number,
) => ({ id, period, status, activeTurnos });

describe("emptyOpenMonths", () => {
  it("keeps only open months from the current one on that have no active turno", () => {
    expect(
      emptyOpenMonths(
        [
          summary("a", "2026-12", "open", 1),
          summary("b", "2026-11", "open", 0),
          summary("c", "2026-10", "open", 0),
          summary("d", "2026-12", "draft", 0),
          summary("e", "2027-01", "closed", 0),
        ],
        "2026-11",
      ),
    ).toEqual([{ id: "b", period: "2026-11", label: "Noviembre" }]);
  });

  it("orders the months chronologically", () => {
    expect(
      emptyOpenMonths(
        [
          summary("x", "2026-12", "open", 0),
          summary("y", "2026-11", "open", 0),
        ],
        "2026-11",
      ).map((month) => month.id),
    ).toEqual(["y", "x"]);
  });
});

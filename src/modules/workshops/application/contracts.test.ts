import { describe, expect, it, expectTypeOf } from "vitest";
import { err, ok } from "~/modules/_shared";
import type { NotFound } from "~/modules/_shared";
import type { AdminActor } from "~/modules/admin-access";
import {
  acceptsNewRequests,
  cordobaMonthOf,
  isVisibleStatus,
  parsePercentage,
  parsePeriodKey,
  slugify,
  type MonthlyWorkshopsService,
  type WorkshopPeriodsService,
  type PeriodSummary,
} from "~/modules/workshops";

describe("workshop contract helpers", () => {
  it("covers percentage and period-key error tables", () => {
    const percentageErrors = [
      ["", "required"],
      ["abc", "invalid-format"],
      ["-1", "invalid-format"],
      ["12.345", "too-many-decimals"],
      ["100.01", "out-of-range"],
    ] as const;
    for (const [input, error] of percentageErrors)
      expect(parsePercentage(input)).toEqual(err(error));
    expect(parsePercentage("0")).toEqual(ok({ basisPoints: 0 }));
    expect(parsePercentage("100")).toEqual(ok({ basisPoints: 10000 }));
    for (const input of ["", "2026-2", "2026-13", "26-02", "2026/02"]) {
      expect(parsePeriodKey(input)).toEqual(err("invalid-format"));
    }
    expect(parsePeriodKey("2026-02")).toEqual(ok("2026-02"));
  });
  it("uses Córdoba month boundaries and stable slugs/status rules", () => {
    expect(cordobaMonthOf(new Date("2026-11-01T02:59:00Z"))).toBe("2026-10");
    expect(cordobaMonthOf(new Date("2026-11-01T03:00:00Z"))).toBe("2026-11");
    expect(slugify(" ¡Taller de Cerámica! ")).toBe("taller-de-ceramica");
    const statusCases = [
      ["draft", false, false],
      ["published", true, true],
      ["paused", true, false],
      ["archived", false, false],
    ] as const;
    for (const [status, visible, accepts] of statusCases) {
      expect(isVisibleStatus(status)).toBe(visible);
      expect(acceptsNewRequests(status)).toBe(accepts);
    }
  });
  it("exposes complete service shapes", () => {
    expectTypeOf<MonthlyWorkshopsService>().toHaveProperty("delete");
    expectTypeOf<MonthlyWorkshopsService>().toHaveProperty("updateTurno");
    expectTypeOf<MonthlyWorkshopsService>().toHaveProperty(
      "techniqueSuggestions",
    );
    const monthlyKeys = [
      "list",
      "listVisible",
      "get",
      "create",
      "update",
      "delete",
      "publish",
      "pause",
      "archive",
      "restore",
      "addTurno",
      "updateTurno",
      "retireTurno",
      "reactivateTurno",
      "deleteTurno",
      "listAssignmentsOfTeacher",
      "techniqueSuggestions",
    ] as const satisfies readonly (keyof MonthlyWorkshopsService)[];
    const periodKeys = [
      "list",
      "get",
      "openMonth",
      "update",
      "publish",
      "close",
      "delete",
    ] as const satisfies readonly (keyof WorkshopPeriodsService)[];
    expect(monthlyKeys).toHaveLength(17);
    expect(periodKeys).toHaveLength(7);
    expectTypeOf<MonthlyWorkshopsService["delete"]>()
      .parameter(0)
      .toEqualTypeOf<AdminActor>();
    expectTypeOf<
      Awaited<ReturnType<MonthlyWorkshopsService["publish"]>>
    >().toHaveProperty("ok");
    expectTypeOf<WorkshopPeriodsService["openMonth"]>()
      .parameter(0)
      .toEqualTypeOf<AdminActor>();
    expectTypeOf<
      Awaited<ReturnType<WorkshopPeriodsService["openMonth"]>>
    >().toHaveProperty("ok");
    expectTypeOf<PeriodSummary>().toHaveProperty("totalCapacity");
    type CreateErrors = Extract<
      Awaited<ReturnType<MonthlyWorkshopsService["create"]>>,
      { readonly ok: false }
    >["error"];
    type IsNever<T> = [T] extends [never] ? true : false;
    const createErrorsExcludeNotFound: IsNever<
      Extract<CreateErrors, NotFound>
    > = true;
    expect(createErrorsExcludeNotFound).toBe(true);
  });
});

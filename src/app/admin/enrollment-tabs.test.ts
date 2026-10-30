import { describe, expect, it } from "vitest";
import {
  ENROLLMENT_LIST_PATH,
  safeReturnTo,
  tabForStatus,
  TAB_STATUSES,
} from "./enrollment-tabs";

describe("enrollment tabs", () => {
  it("groups the statuses into the three tabs", () => {
    expect(TAB_STATUSES["por-cobrar"]).toEqual(["pending_confirmation"]);
    expect(TAB_STATUSES.pagadas).toEqual([
      "paid",
      "materials_requested",
      "materials_received",
    ]);
    expect(TAB_STATUSES.canceladas).toEqual(["cancelled"]);
  });

  it("puts every status in its tab", () => {
    expect(tabForStatus("pending_confirmation")).toBe("por-cobrar");
    expect(tabForStatus("paid")).toBe("pagadas");
    expect(tabForStatus("materials_requested")).toBe("pagadas");
    expect(tabForStatus("materials_received")).toBe("pagadas");
    expect(tabForStatus("cancelled")).toBe("canceladas");
  });
});

describe("safeReturnTo", () => {
  it("keeps the list URL with its filters and page", () => {
    expect(safeReturnTo("/admin/inscripciones?estado=paid&q=ana&page=2")).toBe(
      "/admin/inscripciones?estado=paid&q=ana&page=2",
    );
    expect(safeReturnTo("/admin/inscripciones")).toBe(ENROLLMENT_LIST_PATH);
  });

  it("drops the one-time feedback parameters", () => {
    expect(
      safeReturnTo("/admin/inscripciones?estado=paid&ok=paid&pedido=abc"),
    ).toBe("/admin/inscripciones?estado=paid");
  });

  it.each([
    "https://evil.example/admin/inscripciones",
    "//evil.example/admin/inscripciones",
    "/\evil.example",
    "/admin/inscripciones/abc",
    "/admin/inscripcionesx",
    "/admin",
    "javascript:alert(1)",
    "",
    null,
    undefined,
    42,
  ])("falls back to the list for %j", (value) => {
    expect(safeReturnTo(value)).toBe(ENROLLMENT_LIST_PATH);
  });
});

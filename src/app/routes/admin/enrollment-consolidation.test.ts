import { describe, expect, it, vi } from "vitest";
import { ok } from "~/modules/_shared";
import {
  createUnavailableAdminEnrollmentService,
  createUnavailableSupplierConsolidationService,
  type AdminEnrollmentUseCases,
} from "~/modules/enrollments";
import {
  adminContext,
  getRequest,
  ORIGIN,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { action, loader } from "./enrollment-consolidation";

function visit(path: string, admin = true) {
  return loader({
    request: getRequest(path),
    params: {},
    context: adminContext({}, { admin }),
  } as never);
}

describe("old Materiales page: visits", () => {
  it("goes to the new screen at Para pedir, keeping the month", () => {
    const result = visit("/admin/inscripciones/materiales?mes=2026-10");
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe(
      "/admin/materiales?mes=2026-10#para-pedir",
    );
  });

  it("goes to Para entregar when that section was asked for", () => {
    const result = visit(
      "/admin/inscripciones/materiales?mes=2026-10&seccion=entregar",
    );
    expect(result.headers.get("Location")).toBe(
      "/admin/materiales?mes=2026-10#para-entregar",
    );
  });

  it("keeps the notice and its count, and drops anything else", () => {
    const result = visit(
      "/admin/inscripciones/materiales?mes=2026-10&ok=requested&n=2&x=1",
    );
    expect(result.headers.get("Location")).toBe(
      "/admin/materiales?mes=2026-10&ok=requested&n=2#para-pedir",
    );
  });

  it("does not carry a malformed month", () => {
    const result = visit("/admin/inscripciones/materiales?mes=<script>");
    expect(result.headers.get("Location")).toMatch(
      /^\/admin\/materiales\?mes=\d{4}-\d{2}#para-pedir$/,
    );
  });

  it("goes with no query when there is none", () => {
    expect(
      visit("/admin/inscripciones/materiales").headers.get("Location"),
    ).toBe("/admin/materiales#para-pedir");
  });

  it("is denied for a non-admin", async () => {
    expect(
      await thrownStatus(() => visit("/admin/inscripciones/materiales", false)),
    ).toBe(403);
  });
});

describe("old Materiales page: posts still work", () => {
  const order = "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b";

  it("marks the orders and goes back to the new screen, as the old forms expect", async () => {
    const bulk = vi.fn<AdminEnrollmentUseCases["markMaterialsRequestedBulk"]>(
      () => Promise.resolve([{ orderId: order, result: ok(undefined) }]),
    );
    const result = await action({
      request: postRequest(
        "/admin/inscripciones/materiales",
        {
          intent: "mark-requested",
          mes: "2026-11",
          seccion: "pedir",
          orderId: order,
        },
        { Origin: ORIGIN },
      ),
      params: {},
      context: adminContext({
        consolidation: createUnavailableSupplierConsolidationService(),
        enrollments: withOverrides(createUnavailableAdminEnrollmentService(), {
          markMaterialsRequestedBulk: bulk,
        }),
      }),
    } as never);
    expect(bulk).toHaveBeenCalledWith(expect.anything(), [order]);
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/materiales?mes=2026-11&ok=requested&n=1#para-pedir",
    );
  });
});

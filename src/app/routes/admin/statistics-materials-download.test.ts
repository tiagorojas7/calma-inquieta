import { describe, expect, it, vi } from "vitest";
import { Money, ok } from "~/modules/_shared";
import {
  createUnavailableSupplierConsolidationService,
  type DeliveryOrder,
} from "~/modules/enrollments";
import {
  adminContext,
  getRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { loader } from "./statistics-materials-download";

const price = Money.fromCentavos(4_000_00);
if (!price.ok) throw new Error("invalid test money");
const ordered: DeliveryOrder = {
  id: "o1",
  number: "CI-2026-0001",
  status: "paid",
  studentName: "Ana Pérez",
  phoneDigits: "5493515550001",
  workshopName: "Cerámica",
  turnoLabel: "Martes",
  lines: [
    {
      materialName: "Esmalte",
      variantLabel: "Azul",
      quantity: 3,
      supplierName: "Casa de Arte",
      unitPrice: price.value,
    },
  ],
};

function run(path: string, admin = true) {
  const deliveries = vi.fn(() => Promise.resolve(ok([ordered])));
  const result = loader({
    request: getRequest(path),
    params: {},
    context: adminContext(
      {
        consolidation: withOverrides(
          createUnavailableSupplierConsolidationService(),
          { deliveries },
        ),
      },
      { admin },
    ),
  } as never);
  return { result, deliveries };
}

describe("admin materials record download", () => {
  it("downloads the month's materials record as a CSV file", async () => {
    const { result, deliveries } = run(
      "/admin/estadisticas/materiales?mes=2026-09",
    );
    const response = await result;

    expect(deliveries).toHaveBeenCalledWith(expect.anything(), "2026-09");
    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="calma-inquieta-materiales-2026-09.csv"',
    );
    const text = await response.text();
    expect(text).toContain(
      "Ana Pérez;Cerámica · Martes;Esmalte Azul;3;Casa de Arte;12000;Por pedir",
    );
  });

  it("uses the current month for a malformed one", async () => {
    const { result, deliveries } = run("/admin/estadisticas/materiales?mes=x");
    await result;

    expect(deliveries).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/^\d{4}-\d{2}$/),
    );
  });

  it("refuses a request without an admin", async () => {
    expect(
      await thrownStatus(
        () => run("/admin/estadisticas/materiales?mes=2026-09", false).result,
      ),
    ).toBe(403);
  });
});

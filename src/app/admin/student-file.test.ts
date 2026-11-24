import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { AdminEnrollmentDetail } from "~/modules/enrollments";
import {
  recordAnchor,
  recordCard,
  saleAnchor,
  saleCard,
  type SaleSource,
} from "./student-file";

const pesos = (value: number) => {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("fixture money");
  return money.value;
};

const line = (name: string, quantity: number) => ({
  materialName: name,
  variantLabel: "1 kg",
  unitPrice: pesos(4000),
  quantity,
  supplierName: "Proveedor",
});

function order(overrides: Record<string, unknown> = {}): AdminEnrollmentDetail {
  return {
    id: "o1",
    number: "CI-2026-0007",
    status: "pending_confirmation",
    workshopName: "Cerámica",
    period: "2026-11",
    turnoLabel: "Lunes 18:00",
    total: pesos(58000),
    paidAmount: undefined,
    lines: [],
    sales: [],
    ...overrides,
  } as unknown as AdminEnrollmentDetail;
}

describe("student file anchors", () => {
  it("builds a plain element id from the order number, apart for a record and a sale", () => {
    expect(recordAnchor("CI-2026-0007")).toBe("r-ci-2026-0007");
    expect(saleAnchor("CI-2026-0009")).toBe("v-ci-2026-0009");
  });
});

describe("student file record card", () => {
  it("says in words that a pending record owes its total, and offers to collect, sell and cancel", () => {
    const card = recordCard(order(), []);
    expect(card).toMatchObject({
      anchor: "r-ci-2026-0007",
      workshop: "Cerámica",
      month: "noviembre 2026",
      turno: "Lunes 18:00",
      state: "owes",
      total: "$ 58.000",
      totalPesos: "58000",
      canPay: true,
      canSell: true,
      canCancel: true,
      cancelRefund: null,
    });
  });

  it("says Pagado for a paid record and asks for the refund when cancelling it", () => {
    const card = recordCard(
      order({ status: "paid", paidAmount: pesos(58000) }),
      [],
    );
    expect(card).toMatchObject({
      state: "paid",
      canPay: false,
      canSell: true,
      canCancel: true,
      cancelRefund: { paid: "$ 58.000", paidPesos: "58000" },
    });
  });

  it("takes nothing from a cancelled record: no payment, no sale, no cancellation", () => {
    const card = recordCard(order({ status: "cancelled" }), []);
    expect(card).toMatchObject({
      state: "cancelled",
      canPay: false,
      canSell: false,
      canCancel: false,
    });
  });

  it("names its own materials and whether they were handed over", () => {
    const owed = recordCard(order({ lines: [line("Arcilla", 2)] }), []);
    const paid = recordCard(
      order({
        status: "paid",
        paidAmount: pesos(58000),
        lines: [line("Arcilla", 2)],
      }),
      [],
    );
    const given = recordCard(
      order({
        status: "materials_received",
        paidAmount: pesos(58000),
        lines: [line("Arcilla", 2)],
      }),
      [],
    );
    expect(owed.lines).toEqual([{ label: "Arcilla 1 kg", quantity: 2 }]);
    expect(owed.delivery).toBeNull();
    expect(paid.delivery).toBe("toDeliver");
    expect(given.delivery).toBe("delivered");
    expect(recordCard(order(), []).delivery).toBeNull();
  });

  it("nests the sales it is given, in the order given", () => {
    const sale: SaleSource = order({
      id: "s1",
      number: "CI-2026-0009",
      kind: "material_sale",
      total: pesos(8000),
      lines: [line("Arcilla", 2)],
    });
    const card = recordCard(order(), [saleCard(sale)]);
    expect(card.sales.map((s) => s.number)).toEqual(["CI-2026-0009"]);
  });
});

describe("student file sale card", () => {
  it("shows a pending sale as owing its own total, with its materials", () => {
    const card = saleCard(
      order({
        id: "s1",
        number: "CI-2026-0009",
        kind: "material_sale",
        total: pesos(8000),
        lines: [line("Arcilla", 2)],
      }),
    );
    expect(card).toMatchObject({
      id: "s1",
      anchor: "v-ci-2026-0009",
      state: "owes",
      total: "$ 8.000",
      totalPesos: "8000",
      canPay: true,
      canCancel: true,
      lines: [{ label: "Arcilla 1 kg", quantity: 2 }],
    });
  });

  it("says Pagado once collected and asks for the refund when cancelling", () => {
    const card = saleCard(
      order({
        kind: "material_sale",
        status: "paid",
        total: pesos(8000),
        paidAmount: pesos(8000),
        lines: [line("Arcilla", 2)],
      }),
    );
    expect(card).toMatchObject({
      state: "paid",
      canPay: false,
      delivery: "toDeliver",
      cancelRefund: { paid: "$ 8.000", paidPesos: "8000" },
    });
  });
});

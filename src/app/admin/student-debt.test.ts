import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { SeatDebt } from "~/modules/intensive-requests";
import { amountOwed, seatDebtsByEmail } from "./student-debt";

const pesos = (value: number) => {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("fixture money");
  return money.value;
};

const order = (status: string, total: number, kind?: "material_sale") => ({
  status,
  total: pesos(total),
  ...(kind === undefined ? {} : { kind }),
});

const seat = (
  email: string,
  kind: SeatDebt["kind"],
  amount: number,
): SeatDebt => ({
  requestId: `${email}-${kind}`,
  intensiveId: "i1",
  email,
  kind,
  amount: pesos(amount),
  workshopName: "Intensivo",
});

describe("amountOwed", () => {
  it("adds the pending fee, the pending sales and the workshop payments", () => {
    const owed = amountOwed(
      [
        order("pending_confirmation", 45000),
        order("pending_confirmation", 30900, "material_sale"),
        order("paid", 99000),
        order("cancelled", 12000),
      ],
      [seat("ana@example.com", "deposit", 15000)],
    );

    expect(owed.toCentavos()).toBe(9_090_000);
  });

  it("owes nothing when everything is paid or cancelled", () => {
    expect(
      amountOwed([order("paid", 45000), order("cancelled", 5000)], []).isZero(),
    ).toBe(true);
  });

  it("counts a pending sale even when the monthly fee is paid", () => {
    const owed = amountOwed(
      [
        order("paid", 45000),
        order("pending_confirmation", 30900, "material_sale"),
      ],
      [],
    );

    expect(owed.toCentavos()).toBe(3_090_000);
  });
});

describe("seatDebtsByEmail", () => {
  it("groups the workshop payments by the email of who owes them", () => {
    const grouped = seatDebtsByEmail([
      seat("ana@example.com", "deposit", 1),
      seat("bea@example.com", "balance", 2),
      seat("ana@example.com", "balance", 3),
    ]);

    expect(grouped.get("ana@example.com")).toHaveLength(2);
    expect(grouped.get("bea@example.com")).toHaveLength(1);
    expect(grouped.get("zoe@example.com")).toBeUndefined();
  });
});

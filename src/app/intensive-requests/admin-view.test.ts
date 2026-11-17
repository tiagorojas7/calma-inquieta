import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { AdminIntensiveOverview } from "~/modules/intensive-requests";
import { buildStoredRequest } from "~/testing/contracts/intensive-request-repository.contract";
import {
  buildIntensiveOffer,
  buildOfferProject,
  FAKE_PROJECT_ID,
  FAKE_SECOND_PROJECT_ID,
} from "~/testing/fakes/intensive-request-builders";
import { intensiveRequestsView } from "./admin-view";

const paid = Money.fromCentavos(1_500_000);
if (!paid.ok) throw new Error("bad money");

function overview(
  requests: AdminIntensiveOverview["requests"],
  confirmedSeats = 0,
): AdminIntensiveOverview {
  return { intensivo: buildIntensiveOffer(), confirmedSeats, requests };
}

describe("intensiveRequestsView", () => {
  it("summarizes the intensivo with the seats and the whole-peso deposit", () => {
    const view = intensiveRequestsView(overview([], 1), "2026-10-28");

    expect(view.intensivo).toMatchObject({
      id: "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01",
      name: "Intensivo de cerámica",
      today: "2026-10-28",
      seats: "1 de 2",
      minSeats: "4",
    });
    expect(view.intensivo.deposit.replace(/\s/g, " ")).toBe("$ 15.000");
    expect(view.intensivo.dateLine).toBe("Sábado 14 de noviembre");
  });

  it("names the project each request chose, and none for one made before projects", () => {
    const view = intensiveRequestsView(
      {
        intensivo: buildIntensiveOffer({
          projects: [
            buildOfferProject(),
            buildOfferProject({
              id: FAKE_SECOND_PROJECT_ID,
              name: "Plato hondo",
            }),
          ],
        }),
        confirmedSeats: 0,
        requests: [
          buildStoredRequest({ id: "a", projectId: FAKE_PROJECT_ID }),
          buildStoredRequest({ id: "b", projectId: FAKE_SECOND_PROJECT_ID }),
          buildStoredRequest({ id: "c", projectId: null }),
        ],
      },
      "2026-10-28",
    );

    expect(
      view.groups[0]?.rows.map((row) => [row.id, row.projectName]),
    ).toEqual([
      ["a", "Taza de torno"],
      ["b", "Plato hondo"],
      ["c", null],
    ]);
  });

  it("groups requests by status in a fixed order", () => {
    const view = intensiveRequestsView(
      overview([
        buildStoredRequest({ id: "a", status: "cancelled" }),
        buildStoredRequest({ id: "b", status: "pending_confirmation" }),
        buildStoredRequest({
          id: "c",
          status: "confirmed",
          paidAmount: paid.value,
          paidOn: "2026-10-21",
        }),
      ]),
      "2026-10-28",
    );

    expect(view.groups.map((group) => group.status)).toEqual([
      "pending_confirmation",
      "confirmed",
      "cancelled",
    ]);
    expect(view.groups.map((group) => group.rows.map((row) => row.id))).toEqual(
      [["b"], ["c"], ["a"]],
    );
  });

  it("shows contact data with a WhatsApp link and the payment details of a confirmed request", () => {
    const view = intensiveRequestsView(
      overview([
        buildStoredRequest({
          status: "confirmed",
          paidAmount: paid.value,
          paidOn: "2026-10-21",
          paymentNote: "transferencia",
          confirmedBy: "duena@example.com",
          confirmedAt: new Date("2026-10-22T15:00:00.000Z"),
        }),
      ]),
      "2026-10-28",
    );

    const [row] = view.groups[1]?.rows ?? [];
    expect(row).toMatchObject({
      name: "Ana Pérez",
      email: "ana@example.com",
      phone: "5493515550101",
      reference: "abcdefgh",
      receivedAt: "20/10/2026 09:00",
      paidOn: "21/10/2026",
      paymentNote: "transferencia",
      confirmedBy: "duena@example.com, 22/10/2026 12:00",
    });
    expect(row?.paidAmount?.replace(/\s/g, " ")).toBe("$ 15.000");
    expect(row?.whatsappHref).toMatch(/^https:\/\/wa\.me\/5493515550101/);
  });

  it("shows who cancelled a request and why", () => {
    const view = intensiveRequestsView(
      overview([
        buildStoredRequest({
          status: "cancelled",
          cancelReason: "no puede asistir",
          cancelledBy: "duena@example.com",
          cancelledAt: new Date("2026-10-23T15:00:00.000Z"),
        }),
      ]),
      "2026-10-28",
    );

    const [row] = view.groups[2]?.rows ?? [];
    expect(row).toMatchObject({
      cancelReason: "no puede asistir",
      cancelledBy: "duena@example.com, 23/10/2026 12:00",
    });
  });

  const money = (pesos: number): Money => {
    const value = Money.fromCentavos(pesos * 100);
    if (!value.ok) throw new Error("bad money");
    return value.value;
  };
  const text = (value: string | null | undefined) => value?.replace(/\s/g, " ");

  it("shows the terms the person was quoted and what the deposit left to pay", () => {
    const view = intensiveRequestsView(
      overview([
        buildStoredRequest({
          id: "quoted",
          projectId: FAKE_PROJECT_ID,
          price: money(30000),
          deposit: money(10000),
        }),
      ]),
      "2026-10-28",
    );

    const [row] = view.groups[0]?.rows ?? [];
    expect(text(row?.price)).toBe("$ 30.000");
    expect(text(row?.deposit)).toBe("$ 10.000");
    expect(row?.depositInput).toBe("10000");
    expect(text(row?.balanceDue)).toBe("$ 20.000");
    expect(row?.balanceInput).toBe("20000");
    expect(row?.balance).toBeNull();
  });

  it("falls back to the workshop terms for a request without a snapshot", () => {
    const view = intensiveRequestsView(
      overview([buildStoredRequest()]),
      "2026-10-28",
    );

    const [row] = view.groups[0]?.rows ?? [];
    expect(text(row?.price)).toBe("$ 40.000");
    expect(row?.depositInput).toBe("15000");
    expect(text(row?.balanceDue)).toBe("$ 25.000");
  });

  it("has no balance due when the deposit covered the price", () => {
    const view = intensiveRequestsView(
      overview([
        buildStoredRequest({ price: money(15000), deposit: money(15000) }),
      ]),
      "2026-10-28",
    );

    const [row] = view.groups[0]?.rows ?? [];
    expect(row?.balanceDue).toBeNull();
  });

  it("shows the balance payment and the total paid", () => {
    const view = intensiveRequestsView(
      overview([
        buildStoredRequest({
          status: "confirmed",
          paidAmount: paid.value,
          paidOn: "2026-10-21",
          balance: {
            amount: money(25000),
            paidOn: "2026-10-25",
            note: "efectivo",
            by: "duena@example.com",
            at: new Date("2026-10-25T15:00:00.000Z"),
          },
        }),
      ]),
      "2026-10-28",
    );

    const [row] = view.groups[1]?.rows ?? [];
    expect(text(row?.balance?.amount)).toBe("$ 25.000");
    expect(row?.balance).toMatchObject({
      paidOn: "25/10/2026",
      note: "efectivo",
      by: "duena@example.com, 25/10/2026 12:00",
    });
    expect(text(row?.paidTotal)).toBe("$ 40.000");
    expect(row?.paidTotalInput).toBe("40000");
  });

  it("shows the refund of a cancelled request, zero included", () => {
    const view = intensiveRequestsView(
      overview([
        buildStoredRequest({
          id: "refunded",
          status: "cancelled",
          paidAmount: paid.value,
          paidOn: "2026-10-21",
          refund: {
            amount: money(5000),
            refundedOn: "2026-10-23",
            note: "parcial",
          },
        }),
        buildStoredRequest({
          id: "zero",
          email: "zero@example.com",
          status: "cancelled",
          paidAmount: paid.value,
          paidOn: "2026-10-21",
          refund: { amount: money(0), refundedOn: "2026-10-23", note: null },
        }),
      ]),
      "2026-10-28",
    );

    const [first, second] = view.groups[2]?.rows ?? [];
    expect(text(first?.refund?.amount)).toBe("$ 5.000");
    expect(first?.refund).toMatchObject({
      refundedOn: "23/10/2026",
      note: "parcial",
    });
    expect(text(second?.refund?.amount)).toBe("$ 0");
  });
});

import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { AdminIntensiveOverview } from "~/modules/intensive-requests";
import { buildStoredRequest } from "~/testing/contracts/intensive-request-repository.contract";
import { buildIntensiveOffer } from "~/testing/fakes/intensive-request-builders";
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
      depositInput: "15000",
      today: "2026-10-28",
      seats: "1 de 2",
      minSeats: "4",
    });
    expect(view.intensivo.deposit.replace(/\s/g, " ")).toBe("$ 15.000");
    expect(view.intensivo.dateLine).toBe("Sábado 14 de noviembre");
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
});

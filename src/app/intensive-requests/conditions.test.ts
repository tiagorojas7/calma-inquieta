import { describe, expect, it } from "vitest";
import { requestConditions } from "./conditions";

describe("requestConditions", () => {
  it("names the minimum-seat cancellation, the refund and the no-show policy", () => {
    const conditions = requestConditions({
      policyText: "Seña no reembolsable ante inasistencia.",
      minSeats: 4,
    });

    expect(conditions).toEqual({
      label: "Condiciones",
      policyText: "Seña no reembolsable ante inasistencia.",
      minSeats:
        "Si no se alcanza el mínimo de 4 personas, el intensivo se cancela y se devuelve lo que corresponde. Ante una inasistencia rige la política indicada en estas condiciones.",
    });
  });

  it("falls back to a pointer when the owner left the policy blank", () => {
    const conditions = requestConditions({ policyText: "  ", minSeats: 1 });

    expect(conditions.policyText).toBe(
      "El detalle de la seña, la devolución y la inasistencia te lo confirmamos por WhatsApp.",
    );
  });
});

import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { buildRequestWhatsAppLink } from "./request-whatsapp-link";
import type { PublicRequestView } from "./intensive-request-service";

const deposit = Money.fromCentavos(1_500_000);
if (!deposit.ok) throw new Error("bad money");

const price = Money.fromCentavos(4_000_000);
if (!price.ok) throw new Error("bad money");

const view: PublicRequestView = {
  publicId: "abcdefghijklmnopqrstuv",
  reference: "abcdefgh",
  status: "pending_confirmation",
  studentName: "Ana Pérez",
  intensivoName: "Intensivo de cerámica",
  eventDate: "2026-11-14",
  startsAt: "10:00",
  endsAt: "14:00",
  projectName: "Taza de torno",
  price: price.value,
  deposit: deposit.value,
};

function messageOf(link: string | null): string {
  return decodeURIComponent(new URL(link ?? "").searchParams.get("text") ?? "");
}

describe("buildRequestWhatsAppLink", () => {
  it("opens wa.me on the business number with the request details", () => {
    const link = buildRequestWhatsAppLink(view, "+54 9 351 555 0100");

    expect(link).toMatch(/^https:\/\/wa\.me\/5493515550100\?text=/);
    expect(messageOf(link)).toBe(
      [
        "Hola! Ya envié mi solicitud para un workshop desde la web",
        "Solicitud: abcdefgh",
        "Nombre: Ana Pérez",
        "Workshop: Intensivo de cerámica",
        "Proyecto: Taza de torno",
        "Fecha: 14/11/2026",
        "Total: $ 40.000",
        "Seña: $ 15.000",
      ].join("\n"),
    );
  });

  it("leaves the project line out for a request made before projects", () => {
    const link = buildRequestWhatsAppLink(
      { ...view, projectName: null },
      "+54 9 351 555 0100",
    );

    expect(messageOf(link)).not.toContain("Proyecto");
    expect(messageOf(link)).toContain("Total: $ 40.000");
  });

  it("returns null when the business number does not normalize", () => {
    expect(buildRequestWhatsAppLink(view, "no es un numero")).toBeNull();
  });
});

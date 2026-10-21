import { describe, expect, it } from "vitest";
import { pesos } from "~/testing/fakes/enrollments-builders";
import { buildOrderWhatsAppLink } from "./order-whatsapp-link";
import type { PublicOrderView } from "./public-enrollment-service";

const view = (overrides: Partial<PublicOrderView> = {}): PublicOrderView => ({
  publicId: "A".repeat(22),
  number: "CI-2026-0007",
  status: "pending_confirmation",
  studentName: "Ana Pérez",
  workshopName: "Cerámica",
  period: "2026-10",
  turnoLabel: "Lunes 10:00 a 12:00",
  weekday: 1,
  startsAt: "10:00",
  endsAt: "12:00",
  lines: [],
  fee: pesos(58000),
  materialsTotal: pesos(0),
  total: pesos(58000),
  ...overrides,
});

const textOf = (url: string | null): string => {
  if (url === null) throw new Error("expected a link");
  return decodeURIComponent(url.split("?text=")[1] ?? "");
};

describe("buildOrderWhatsAppLink", () => {
  it("links to wa.me with the profile digits and the order message", () => {
    const url = buildOrderWhatsAppLink(view(), "351 555-1234");
    expect(url).toMatch(/^https:\/\/wa\.me\/5493515551234\?text=/);
    const text = textOf(url);
    for (const part of [
      "CI-2026-0007",
      "Ana Pérez",
      "Cerámica",
      "octubre 2026",
      "Lunes 10:00 a 12:00",
      "$ 58.000",
    ]) {
      expect(text).toContain(part);
    }
  });

  it("caps the text at 1.200 characters keeping number and total", () => {
    const lines = Array.from({ length: 30 }, (_, i) => ({
      materialName: `Material con nombre largo ${String(i)}`,
      variantLabel: "Variante grande de prueba",
      quantity: 3,
      unitPrice: pesos(1000),
      lineTotal: pesos(3000),
    }));
    const text = textOf(
      buildOrderWhatsAppLink(view({ lines }), "351 555-1234"),
    );
    expect(text.length).toBeLessThanOrEqual(1200);
    expect(text).toContain("CI-2026-0007");
    expect(text).toContain("$ 58.000");
  });

  it("returns null when the profile number does not normalize", () => {
    expect(buildOrderWhatsAppLink(view(), "12345")).toBeNull();
  });
});

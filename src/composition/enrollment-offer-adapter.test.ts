import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { createEnrollmentOfferAdapter } from "./enrollment-offer-adapter";

const fee = (() => {
  const value = Money.fromCentavos(4200000);
  if (!value.ok) throw new Error("fixture money");
  return value.value;
})();

describe("enrollment offer adapter", () => {
  it("adapts the workshop-owned actorless enrollment offer to the enrollment port", async () => {
    const findEnrollmentOffer = () =>
      Promise.resolve({
        workshop: { id: "workshop-1", name: "Cerámica inicial" },
        period: {
          id: "period-1",
          period: "2026-10",
          fee,
          materialsRequired: true,
        },
        turnos: [
          {
            id: "turno-1",
            label: "Mañana",
            weekday: 2 as const,
            startsAt: "09:00",
            endsAt: "11:00",
            capacity: 12,
          },
        ],
      });
    const subject = createEnrollmentOfferAdapter({ findEnrollmentOffer });

    await expect(
      subject.findOffer({ slug: "ceramica-inicial", period: "2026-10" }),
    ).resolves.toEqual({
      workshop: {
        id: "workshop-1",
        name: "Cerámica inicial",
        published: true,
        paused: false,
      },
      period: {
        id: "period-1",
        period: "2026-10",
        status: "open",
        fee,
        materialsRequired: true,
      },
      turnos: [
        {
          id: "turno-1",
          label: "Mañana",
          weekday: 2,
          startsAt: "09:00",
          endsAt: "11:00",
          capacity: 12,
        },
      ],
    });
  });

  it("preserves ordinary absence", async () => {
    const subject = createEnrollmentOfferAdapter({
      findEnrollmentOffer: () => Promise.resolve(null),
    });

    await expect(
      subject.findOffer({ slug: "missing", period: "2026-10" }),
    ).resolves.toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { createWorkshopEnrollmentOfferLookup } from "./enrollment-offer";
import type { StoredMonthlyWorkshop } from "./monthly-workshop-repository";
import type { WorkshopPeriod } from "./contracts";

const fee = (() => {
  const value = Money.fromCentavos(4200000);
  if (!value.ok) throw new Error("fixture money");
  return value.value;
})();

function subject(
  overrides: {
    readonly workshop?: object | null;
    readonly period?: object | null;
  } = {},
) {
  const workshop =
    overrides.workshop === undefined
      ? {
          id: "workshop-1",
          slug: "ceramica-inicial",
          name: "Cerámica inicial",
          status: "published",
        }
      : overrides.workshop;
  const period =
    overrides.period === undefined
      ? {
          id: "period-1",
          workshopId: "workshop-1",
          period: "2026-10",
          fee,
          materialsRequired: true,
          status: "open",
          turnos: [
            {
              turnoId: "turno-1",
              label: "Mañana",
              weekday: 2,
              startsAt: "09:00",
              endsAt: "11:00",
              turnoActive: true,
              capacity: 12,
            },
            {
              turnoId: "turno-inactive",
              label: "Noche",
              weekday: 4,
              startsAt: "18:00",
              endsAt: "20:00",
              turnoActive: false,
              capacity: 8,
            },
          ],
        }
      : overrides.period;
  return createWorkshopEnrollmentOfferLookup({
    workshops: {
      findBySlug: () =>
        Promise.resolve(workshop as StoredMonthlyWorkshop | null),
    },
    periods: {
      findByWorkshopPeriod: () =>
        Promise.resolve(period as WorkshopPeriod | null),
    },
    clock: { now: () => new Date("2026-10-15T12:00:00Z") },
  });
}

describe("workshop enrollment offer lookup", () => {
  it("returns the authoritative open offer for a published workshop and requested Córdoba period", async () => {
    await expect(
      subject().findEnrollmentOffer({
        slug: "ceramica-inicial",
        period: "2026-10",
      }),
    ).resolves.toEqual({
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
          weekday: 2,
          startsAt: "09:00",
          endsAt: "11:00",
          capacity: 12,
        },
      ],
    });
  });

  it.each([
    ["a missing workshop", { workshop: null }],
    [
      "a paused workshop",
      {
        workshop: {
          id: "workshop-1",
          slug: "ceramica-inicial",
          name: "Cerámica inicial",
          status: "paused",
        },
      },
    ],
    [
      "a non-open period",
      {
        period: {
          id: "period-1",
          workshopId: "workshop-1",
          period: "2026-10",
          fee,
          materialsRequired: false,
          status: "draft",
          turnos: [],
        },
      },
    ],
    [
      "a past period",
      {
        period: {
          id: "period-1",
          workshopId: "workshop-1",
          period: "2026-09",
          fee,
          materialsRequired: false,
          status: "open",
          turnos: [],
        },
      },
    ],
    [
      "no active offered turno",
      {
        period: {
          id: "period-1",
          workshopId: "workshop-1",
          period: "2026-10",
          fee,
          materialsRequired: false,
          status: "open",
          turnos: [
            {
              turnoId: "turno-1",
              label: "Mañana",
              weekday: 2,
              startsAt: "09:00",
              endsAt: "11:00",
              turnoActive: false,
              capacity: 12,
            },
          ],
        },
      },
    ],
  ])("returns ordinary absence for %s", async (_reason, overrides) => {
    await expect(
      subject(overrides).findEnrollmentOffer({
        slug: "ceramica-inicial",
        period: "2026-10",
      }),
    ).resolves.toBeNull();
  });

  it.each([
    [
      "belongs to a different workshop",
      {
        id: "period-1",
        workshopId: "other-workshop",
        period: "2026-10",
        fee,
        materialsRequired: false,
        status: "open",
      },
    ],
    [
      "belongs to a different future period",
      {
        id: "period-1",
        workshopId: "workshop-1",
        period: "2026-11",
        fee,
        materialsRequired: false,
        status: "open",
      },
    ],
  ])(
    "returns ordinary absence when the returned period %s",
    async (_reason, period) => {
      await expect(
        subject({
          period: {
            ...period,
            turnos: [
              {
                turnoId: "turno-1",
                label: "Mañana",
                weekday: 2,
                startsAt: "09:00",
                endsAt: "11:00",
                turnoActive: true,
                capacity: 12,
              },
            ],
          },
        }).findEnrollmentOffer({
          slug: "ceramica-inicial",
          period: "2026-10",
        }),
      ).resolves.toBeNull();
    },
  );
});

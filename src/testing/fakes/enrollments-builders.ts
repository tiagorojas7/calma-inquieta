import { Money } from "~/modules/_shared";
import type { OrderDraft } from "~/modules/enrollments/application/enrollment-repository";
import type { EnrollmentOffer } from "~/modules/enrollments/application/offer-lookup";
import type { OfferedMaterial } from "~/modules/enrollments/application/offered-materials";
import type { StudentDraft } from "~/modules/enrollments/domain/student-input";

/** Whole or fractional pesos as `Money`; throws on an unrepresentable amount. */
export const pesos = (amount: number): Money => {
  const result = Money.fromCentavos(Math.round(amount * 100));
  if (!result.ok) throw new Error("pesos fixture");
  return result.value;
};

export const studentDraft = (
  overrides: Partial<StudentDraft> = {},
): StudentDraft => ({
  fullName: "Ana Pérez",
  email: "ana@example.com",
  phone: "351 555-1234",
  policyAccepted: true,
  honeypot: "",
  ...overrides,
});

export const offerFixture = (
  overrides: Partial<EnrollmentOffer> & { periodKey?: string } = {},
): EnrollmentOffer => {
  const { periodKey = "2026-10", ...rest } = overrides;
  return {
    workshop: {
      id: "w-1",
      name: "Cerámica inicial",
      published: true,
      paused: false,
    },
    period: {
      id: "p-1",
      period: periodKey,
      status: "open",
      fee: pesos(58000),
      materialsRequired: false,
    },
    turnos: [
      {
        id: "t-1",
        label: "Martes 18:00 a 20:00",
        weekday: 2,
        startsAt: "18:00",
        endsAt: "20:00",
        capacity: 8,
      },
      {
        id: "t-2",
        label: "Jueves 10:00 a 12:00",
        weekday: 4,
        startsAt: "10:00",
        endsAt: "12:00",
        capacity: 8,
      },
    ],
    ...rest,
  };
};

export const materialFixture = (
  overrides: Partial<OfferedMaterial> = {},
): OfferedMaterial => ({
  materialId: "m-1",
  name: "Arcilla",
  active: true,
  supplierId: "s-1",
  supplierName: "Proveedor Uno",
  variants: [
    {
      variantId: "v-1",
      label: "Grande",
      unitPrice: pesos(12500),
      available: true,
    },
    {
      variantId: "v-2",
      label: "Chico",
      unitPrice: pesos(4000),
      available: true,
    },
  ],
  ...overrides,
});

export const orderDraft = (
  overrides: Partial<OrderDraft> = {},
): OrderDraft => ({
  publicId: "A".repeat(22),
  year: 2026,
  requestedAt: new Date("2026-10-20T15:00:00Z"),
  workshopId: "w-1",
  workshopName: "Cerámica inicial",
  periodId: "p-1",
  period: "2026-10",
  turnoId: "t-1",
  turnoLabel: "Martes 18:00 a 20:00",
  weekday: 2,
  startsAt: "18:00",
  endsAt: "20:00",
  student: {
    fullName: "Ana Pérez",
    email: "ana@example.com",
    phoneDigits: "5493515551234",
  },
  fee: pesos(58000),
  materialsTotal: pesos(0),
  total: pesos(58000),
  policyVersion: "2026-10",
  lines: [],
  ...overrides,
});

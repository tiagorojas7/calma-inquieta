import {
  err,
  ok,
  type Clock,
  type Invalid,
  Money,
  type NotFound,
  type Result,
} from "~/modules/_shared";
import { toWhatsAppDigits } from "~/modules/site-content";
import {
  buildCart,
  priceCart,
  type CartError,
  type CartLine,
  type PricingError,
} from "../domain/cart-core";
import {
  cordobaYearOf,
  generatePublicId,
  isPublicId,
  availableSeats,
  type OrderStatus,
  type TurnoFull,
} from "../domain/order-core";
import {
  periodAcceptsOrders,
  type PeriodClosed,
} from "../domain/period-window";
import {
  validateStudentInput,
  type StudentDraft,
  type StudentField,
} from "../domain/student-input";
import type {
  DuplicateOrder,
  OrderLineDraft,
  OrderRepository,
  StoredOrder,
} from "./enrollment-repository";
import type {
  EnrollmentOffer,
  EnrollmentOfferLookup,
  EnrollmentOfferQuery,
  OfferedTurno,
} from "./offer-lookup";
import type {
  OfferedMaterial,
  OfferedMaterialImage,
  OfferedMaterialsLookup,
} from "./offered-materials";
import type { RandomBytes } from "./random-bytes";
import type { SeatLedger } from "./seat-ledger";

const PUBLIC_ID_BYTES = 16;

export interface RequestEnrollmentInput {
  readonly slug: string;
  /** `YYYY-MM`. */
  readonly period: string;
  readonly turnoId: string;
  readonly student: StudentDraft;
  readonly lines: readonly CartLine[];
}

/** Allowlisted projection of an order: no email, phone or internal id. */
export interface PublicOrderView {
  readonly publicId: string;
  readonly number: string;
  readonly status: OrderStatus;
  readonly studentName: string;
  readonly workshopName: string;
  readonly period: string;
  readonly turnoLabel: string;
  readonly weekday: number;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly lines: readonly {
    readonly materialName: string;
    readonly variantLabel: string;
    readonly quantity: number;
    readonly unitPrice: Money;
    readonly lineTotal: Money;
  }[];
  readonly fee: Money;
  readonly materialsTotal: Money;
  readonly total: Money;
}

export interface PublicOffer {
  readonly workshopName: string;
  readonly period: string;
  readonly fee: Money;
  readonly materialsRequired: boolean;
  readonly turnos: readonly Omit<OfferedTurno, "capacity">[];
  /** Active materials with available variants only; no supplier data. */
  readonly materials: readonly {
    readonly materialId: string;
    readonly name: string;
    readonly image: OfferedMaterialImage | null;
    readonly variants: readonly {
      readonly variantId: string;
      readonly label: string;
      readonly unitPrice: Money;
      readonly swatch: string | null;
    }[];
  }[];
}

export type DependencyUnavailable = { readonly kind: "unavailable" };

export type OfferGateError =
  | NotFound
  | { readonly kind: "enrollments-paused" }
  | PeriodClosed
  | DependencyUnavailable;

export type RequestEnrollmentError =
  | Invalid<StudentField>
  | OfferGateError
  | { readonly kind: "turno-not-offered" }
  | CartError
  | PricingError
  | { readonly kind: "material-not-offered"; readonly materialId: string }
  | { readonly kind: "material-unavailable"; readonly materialId: string }
  | TurnoFull
  | DuplicateOrder;

export type PublicOrderLookupError = NotFound | DependencyUnavailable;

export interface PublicEnrollmentServiceDeps {
  readonly offers: EnrollmentOfferLookup;
  readonly materials: OfferedMaterialsLookup;
  readonly seats: SeatLedger;
  readonly orders: OrderRepository;
  readonly clock: Clock;
  readonly random: RandomBytes;
  /** Version of the policy text the visitor accepts. */
  readonly policyVersion: string;
}

export interface PublicEnrollmentUseCases {
  getOffer(
    query: EnrollmentOfferQuery,
  ): Promise<Result<PublicOffer, OfferGateError>>;
  /**
   * A filled honeypot answers like a success with a decoy id that was never
   * stored, so the rule is not revealed.
   */
  requestEnrollment(
    input: RequestEnrollmentInput,
  ): Promise<Result<PublicOrderView, RequestEnrollmentError>>;
  getOrderByPublicId(
    publicId: string,
  ): Promise<Result<PublicOrderView, PublicOrderLookupError>>;
}

const phoneDigits = (display: string): string | null => {
  const digits = toWhatsAppDigits(display);
  return digits.ok ? digits.value : null;
};
const unavailable: DependencyUnavailable = { kind: "unavailable" };

/** Maps only a rejected dependency promise; synchronous programming errors escape. */
async function unavailableOnReject<T>(
  dependency: Promise<T>,
): Promise<Result<T, DependencyUnavailable>> {
  try {
    return ok(await dependency);
  } catch {
    return err(unavailable);
  }
}

type OpenOffer = {
  readonly workshop: EnrollmentOffer["workshop"];
  readonly period: NonNullable<EnrollmentOffer["period"]>;
  readonly turnos: readonly OfferedTurno[];
};

function gateOffer(
  offer: EnrollmentOffer | null,
  now: Date,
): Result<OpenOffer, OfferGateError> {
  if (offer === null || !offer.workshop.published) {
    return err({ kind: "not-found" });
  }
  if (offer.workshop.paused) return err({ kind: "enrollments-paused" });
  if (offer.period === null) return err({ kind: "period-closed" });
  const open = periodAcceptsOrders(offer.period, now);
  if (!open.ok) return open;
  return ok({
    workshop: offer.workshop,
    period: offer.period,
    turnos: offer.turnos,
  });
}

function toView(order: StoredOrder): PublicOrderView {
  return {
    publicId: order.publicId,
    number: order.number,
    status: order.status,
    studentName: order.student.fullName,
    workshopName: order.workshopName,
    period: order.period,
    turnoLabel: order.turnoLabel,
    weekday: order.weekday,
    startsAt: order.startsAt,
    endsAt: order.endsAt,
    lines: order.lines.map((l) => ({
      materialName: l.materialName,
      variantLabel: l.variantLabel,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.unitPrice.multiply(l.quantity),
    })),
    fee: order.fee,
    materialsTotal: order.materialsTotal,
    total: order.total,
  };
}

type LineRefusal = Extract<
  RequestEnrollmentError,
  { kind: "material-not-offered" | "material-unavailable" }
>;

function resolveLines(
  cart: readonly CartLine[],
  offered: readonly OfferedMaterial[],
): Result<readonly OrderLineDraft[], LineRefusal> {
  const lines: OrderLineDraft[] = [];
  for (const line of cart) {
    const material = offered.find((m) => m.materialId === line.materialId);
    if (material === undefined)
      return err({ kind: "material-not-offered", materialId: line.materialId });
    if (!material.active)
      return err({ kind: "material-unavailable", materialId: line.materialId });
    const variant = material.variants.find(
      (v) => v.variantId === line.variantId,
    );
    if (variant === undefined)
      return err({ kind: "material-not-offered", materialId: line.materialId });
    if (!variant.available || variant.unitPrice === null)
      return err({ kind: "material-unavailable", materialId: line.materialId });
    lines.push({
      materialId: material.materialId,
      variantId: variant.variantId,
      materialName: material.name,
      variantLabel: variant.label,
      unitPrice: variant.unitPrice,
      quantity: line.quantity,
      supplierId: material.supplierId,
      supplierName: material.supplierName,
    });
  }
  return ok(lines);
}

export function createPublicEnrollmentService(
  deps: PublicEnrollmentServiceDeps,
): PublicEnrollmentUseCases {
  const newPublicId = (): string =>
    generatePublicId(deps.random.bytes(PUBLIC_ID_BYTES));

  return {
    async getOffer(query) {
      const foundOffer = await unavailableOnReject(
        deps.offers.findOffer(query),
      );
      if (!foundOffer.ok) return foundOffer;
      const gate = gateOffer(foundOffer.value, deps.clock.now());
      if (!gate.ok) return gate;
      const { workshop, period, turnos } = gate.value;
      const foundMaterials = await unavailableOnReject(
        deps.materials.listForPeriod(period.id),
      );
      if (!foundMaterials.ok) return foundMaterials;
      const materials = foundMaterials.value;
      return ok({
        workshopName: workshop.name,
        period: period.period,
        fee: period.fee,
        materialsRequired: period.materialsRequired,
        turnos: turnos.map((t) => ({
          id: t.id,
          label: t.label,
          weekday: t.weekday,
          startsAt: t.startsAt,
          endsAt: t.endsAt,
        })),
        materials: materials
          .filter((m) => m.active)
          .map((m) => ({
            materialId: m.materialId,
            name: m.name,
            image:
              m.image === undefined || m.image === null
                ? null
                : {
                    src: m.image.src,
                    alt: m.image.alt,
                    width: m.image.width,
                    height: m.image.height,
                  },
            variants: m.variants
              .flatMap((v) =>
                v.available && v.unitPrice !== null
                  ? [{ ...v, unitPrice: v.unitPrice }]
                  : [],
              )
              .map((v) => ({
                variantId: v.variantId,
                label: v.label,
                unitPrice: v.unitPrice,
                swatch: v.swatch ?? null,
              })),
          })),
      });
    },

    async requestEnrollment(input) {
      const student = validateStudentInput(input.student, phoneDigits);
      if (!student.ok) {
        if (student.error.kind === "honeypot") {
          return ok(decoyView(newPublicId()));
        }
        return err(student.error);
      }

      const now = deps.clock.now();
      const foundOffer = await unavailableOnReject(
        deps.offers.findOffer({ slug: input.slug, period: input.period }),
      );
      if (!foundOffer.ok) return foundOffer;
      const gate = gateOffer(foundOffer.value, now);
      if (!gate.ok) return gate;
      const { workshop, period, turnos } = gate.value;

      const turno = turnos.find((t) => t.id === input.turnoId);
      if (turno === undefined) return err({ kind: "turno-not-offered" });

      const cart = buildCart(input.lines);
      if (!cart.ok) return cart;
      const foundMaterials = await unavailableOnReject(
        deps.materials.listForPeriod(period.id),
      );
      if (!foundMaterials.ok) return foundMaterials;
      const lines = resolveLines(cart.value, foundMaterials.value);
      if (!lines.ok) return lines;

      const priced = priceCart({
        fee: period.fee,
        materialsRequired: period.materialsRequired,
        lines: lines.value,
      });
      if (!priced.ok) return priced;

      const foundConfirmed = await unavailableOnReject(
        deps.seats.confirmedSeats(period.id, turno.id),
      );
      if (!foundConfirmed.ok) return foundConfirmed;
      if (availableSeats(turno.capacity, foundConfirmed.value) === 0) {
        return err({ kind: "turno-full" });
      }

      const created = await unavailableOnReject(
        deps.orders.create({
          publicId: newPublicId(),
          year: cordobaYearOf(now),
          requestedAt: now,
          workshopId: workshop.id,
          workshopName: workshop.name,
          periodId: period.id,
          period: period.period,
          turnoId: turno.id,
          turnoLabel: turno.label,
          weekday: turno.weekday,
          startsAt: turno.startsAt,
          endsAt: turno.endsAt,
          student: student.value,
          fee: period.fee,
          materialsTotal: priced.value.materialsTotal,
          total: priced.value.total,
          policyVersion: deps.policyVersion,
          lines: lines.value,
        }),
      );
      if (!created.ok) return created;
      return created.value.ok ? ok(toView(created.value.value)) : created.value;
    },

    async getOrderByPublicId(publicId) {
      if (!isPublicId(publicId)) return err({ kind: "not-found" });
      const foundOrder = await unavailableOnReject(
        deps.orders.findByPublicId(publicId),
      );
      if (!foundOrder.ok) return foundOrder;
      return foundOrder.value === null
        ? err({ kind: "not-found" })
        : ok(toView(foundOrder.value));
    },
  };
}

/** Shaped like a success, never stored; only the public id is meaningful. */
function decoyView(publicId: string): PublicOrderView {
  const zero = Money.zero();
  return {
    publicId,
    number: "",
    status: "pending_confirmation",
    studentName: "",
    workshopName: "",
    period: "",
    turnoLabel: "",
    weekday: 0,
    startsAt: "",
    endsAt: "",
    lines: [],
    fee: zero,
    materialsTotal: zero,
    total: zero,
  };
}

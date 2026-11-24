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
  lineSourceFor,
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
  OfferedMaterialsLookup,
} from "./offered-materials";
import type { PolicyAcceptance, PolicyVersionCheck } from "./policy-acceptance";
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
  /**
   * The versions of the conditions and privacy documents the form showed. A
   * public request needs them (without them it is unavailable, so nothing is
   * stored without a record of what was accepted); an owner enrolling a
   * student by hand (`createdBy`) passes none and stores none.
   */
  readonly acceptance?: PolicyAcceptance;
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
  readonly turnos: readonly Omit<OfferedTurno, "capacity">[];
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
  /** Materials a public request may order; monthly periods offer none. */
  readonly materials: OfferedMaterialsLookup;
  /**
   * The catalog an owner picks from when enrolling a student by hand. Only a
   * request carrying `createdBy` resolves its lines here; a public request
   * never does. Without it, an admin request uses `materials` like a public one.
   */
  readonly adminMaterials?: OfferedMaterialsLookup;
  readonly seats: SeatLedger;
  readonly orders: OrderRepository;
  readonly clock: Clock;
  readonly random: RandomBytes;
  /** Version of the policy text the visitor accepts. */
  readonly policyVersion: string;
  /** Tells whether a posted conditions or privacy version was ever published. */
  readonly policies: PolicyVersionCheck;
}

export interface RequestEnrollmentOptions {
  /** Admin email when an owner enrolls the student by hand. */
  readonly createdBy?: string;
  /**
   * Fee an owner sets for one student (a scholarship may be $0) instead of the
   * period fee. Only the admin path passes it; the public form has no such input.
   */
  readonly fee?: Money;
  /**
   * With `createdBy`: a manual order whose total is $0 is stored already paid
   * on this date, with its seat claimed in the same transaction. A priced
   * order ignores it and stays pending. The public form never passes it.
   */
  readonly paidAtIfFree?: Date;
  /**
   * With `createdBy`: the owner took the payment, so the order is stored
   * already paid in full on this date whatever its total, with its seat claimed
   * and its stock lines taken in the same creation. The public form never
   * passes it.
   */
  readonly paidAt?: Date;
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
    options?: RequestEnrollmentOptions,
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

export type LineRefusal = Extract<
  RequestEnrollmentError,
  { kind: "material-not-offered" | "material-unavailable" }
>;

/** The catalog lines of a cart as order lines: priced, costed and sourced from stock or the supplier. */
export function resolveLines(
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
      source: lineSourceFor(variant.onHand ?? 0, line.quantity),
      unitCost: variant.unitCost ?? null,
    });
  }
  return ok(lines);
}

export function createPublicEnrollmentService(
  deps: PublicEnrollmentServiceDeps,
): PublicEnrollmentUseCases {
  const newPublicId = (): string =>
    generatePublicId(deps.random.bytes(PUBLIC_ID_BYTES));

  /** A public request must carry two published versions; anything else stores nothing. */
  async function acceptedVersions(
    posted: PolicyAcceptance | undefined,
  ): Promise<
    Result<PolicyAcceptance, DependencyUnavailable | Invalid<StudentField>>
  > {
    if (posted === undefined) return err(unavailable);
    const known = await unavailableOnReject(
      Promise.all([
        deps.policies.isPublished("conditions", posted.conditionsVersion),
        deps.policies.isPublished("privacy", posted.privacyVersion),
      ]),
    );
    if (!known.ok) return known;
    return known.value.every(Boolean)
      ? ok(posted)
      : err({
          kind: "invalid",
          issues: [{ field: "policy", code: "unknown-reference" }],
        });
  }

  return {
    async getOffer(query) {
      const foundOffer = await unavailableOnReject(
        deps.offers.findOffer(query),
      );
      if (!foundOffer.ok) return foundOffer;
      const gate = gateOffer(foundOffer.value, deps.clock.now());
      if (!gate.ok) return gate;
      const { workshop, period, turnos } = gate.value;
      return ok({
        workshopName: workshop.name,
        period: period.period,
        fee: period.fee,
        turnos: turnos.map((t) => ({
          id: t.id,
          label: t.label,
          weekday: t.weekday,
          startsAt: t.startsAt,
          endsAt: t.endsAt,
        })),
      });
    },

    async requestEnrollment(input, options = {}) {
      const student = validateStudentInput(input.student, phoneDigits);
      if (!student.ok) {
        if (student.error.kind === "honeypot") {
          return ok(decoyView(newPublicId()));
        }
        return err(student.error);
      }

      let acceptance: PolicyAcceptance | undefined;
      if (options.createdBy === undefined) {
        const accepted = await acceptedVersions(input.acceptance);
        if (!accepted.ok) return accepted;
        acceptance = accepted.value;
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
      const catalog =
        options.createdBy === undefined
          ? deps.materials
          : (deps.adminMaterials ?? deps.materials);
      const foundMaterials = await unavailableOnReject(
        catalog.listForPeriod(period.id),
      );
      if (!foundMaterials.ok) return foundMaterials;
      const lines = resolveLines(cart.value, foundMaterials.value);
      if (!lines.ok) return lines;

      const fee = options.fee ?? period.fee;
      const priced = priceCart({
        fee,
        lines: lines.value,
        allowZeroFee: options.fee !== undefined,
      });
      if (!priced.ok) return priced;

      // Only an owner's order is ever stored paid: in full when she took the
      // payment, or at $0 when there is nothing to collect.
      const paidOn =
        options.createdBy === undefined
          ? undefined
          : (options.paidAt ??
            (priced.value.total.isZero() ? options.paidAtIfFree : undefined));

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
          fee,
          materialsTotal: priced.value.materialsTotal,
          total: priced.value.total,
          policyVersion: deps.policyVersion,
          ...(acceptance === undefined ? {} : { acceptance }),
          lines: lines.value,
          ...(options.createdBy === undefined
            ? {}
            : { createdBy: options.createdBy }),
          ...(paidOn === undefined || options.createdBy === undefined
            ? {}
            : {
                paidOnCreation: {
                  paidAt: paidOn,
                  confirmedBy: options.createdBy,
                  capacity: turno.capacity,
                },
              }),
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

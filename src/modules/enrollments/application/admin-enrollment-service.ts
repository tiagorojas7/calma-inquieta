import {
  err,
  Money,
  ok,
  parseWholePesos,
  type Clock,
  type Result,
} from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
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
  type InvalidRefund,
  type RefundField,
  type RefundIssueCode,
} from "../domain/order-core";
import type {
  AdminEnrollmentDetail,
  AdminEnrollmentStore,
  AdminEnrollmentStoreError,
  AdminListQuery,
  Cancelled,
  Confirmed,
  Corrected,
  CorrectionTarget,
  MaterialSaleStore,
  SeenMark,
} from "./admin-enrollment-store";
import type { EnrollmentOfferLookup } from "./offer-lookup";
import type { OfferedMaterialsLookup } from "./offered-materials";
import type { RandomBytes } from "./random-bytes";
import {
  resolveLines,
  type LineRefusal,
  type PublicOrderView,
  type RequestEnrollmentError,
  type RequestEnrollmentInput,
} from "./public-enrollment-service";

type Actor = AdminActor | Record<string, unknown> | null | undefined;
type Invalid = {
  readonly kind: "invalid";
  readonly issues: readonly {
    readonly field: "amount" | "paidOn" | "reason";
    readonly code: string;
  }[];
};
export type AdminEnrollmentError =
  | AdminEnrollmentStoreError
  | Invalid
  | { readonly kind: "denied" }
  | { readonly kind: "enrollments-paused" }
  | { readonly kind: "turno-not-offered" };
/** What only an admin may decide when enrolling a student by hand. */
export interface CreatePendingOptions {
  /** The student's fee in whole pesos, replacing the period fee; $0 is a scholarship. */
  readonly fee?: Money;
  /**
   * The owner took the payment: the order is stored already paid in full, with
   * its seat and stock taken in the same creation, or nothing is stored.
   */
  readonly paid?: boolean;
}
/** What the service hands to the creation: the admin's choices plus the date a free order is paid. */
export interface CreatePendingRequest {
  readonly fee?: Money;
  /** Córdoba creation date; a $0 order is stored already paid on it. */
  readonly paidAtIfFree?: Date;
  /** Córdoba creation date; the order is stored already paid in full on it, whatever its total. */
  readonly paidAt?: Date;
}
/** Creates an enrollment on behalf of a student, attributed to the admin; a free one is created paid. */
export type CreatePendingEnrollment = (
  input: RequestEnrollmentInput,
  actorEmail: string,
  options?: CreatePendingRequest,
) => Promise<Result<PublicOrderView, RequestEnrollmentError>>;
/** What a material sale needs besides the order store: the catalog to sell from and ids. */
export interface MaterialSaleDeps {
  readonly store: MaterialSaleStore;
  /** The catalog an owner picks from; it is not tied to a period, so the record's period is only passed through. */
  readonly catalog: OfferedMaterialsLookup;
  readonly random: RandomBytes;
}
export interface AdminEnrollmentServiceDeps {
  readonly store: AdminEnrollmentStore;
  readonly clock: Clock;
  readonly createPending: CreatePendingEnrollment;
  /** Where a correction finds the workshop, month and turno an owner picks. */
  readonly offers: EnrollmentOfferLookup;
  /** Without it, creating a material sale answers `unavailable`. */
  readonly sales?: MaterialSaleDeps;
}
export interface ConfirmPaymentInput {
  readonly orderId: string;
  readonly amount: string;
  readonly paidOn: string;
  readonly note?: string;
}
/** What a paid order's cancellation records, as the form typed it. */
export interface CancelRefundInput {
  /** Whole pesos returned, from 0 up to what was paid. */
  readonly amount: string;
  /** Córdoba `YYYY-MM-DD`. */
  readonly refundedOn: string;
  readonly note?: string;
}
export interface CancelEnrollmentInput {
  readonly orderId: string;
  readonly reason: string;
  /** Required for an order in a paid state, absent for a pending one. */
  readonly refund?: CancelRefundInput;
}

/** What a correction changes, as the form typed it. */
export interface CorrectEnrollmentInput {
  readonly orderId: string;
  /** Absent keeps the current workshop, month and turno. */
  readonly target?: {
    readonly slug: string;
    /** `YYYY-MM`. */
    readonly period: string;
    readonly turnoId: string;
  };
  /** The new fee in whole pesos; 0 is allowed. */
  readonly fee: string;
  /** Required exactly when a paid order's total drops: what was given back. */
  readonly refund?: CancelRefundInput;
  /** Optional reason for the audit trail (up to 300 characters). */
  readonly note?: string;
}

/** The catalog lines of a sale, as the owner picked them. */
export interface CreateMaterialSaleInput {
  /** The monthly record the sale belongs to. */
  readonly orderId: string;
  readonly lines: readonly CartLine[];
  /** The owner took the payment: the sale is stored paid in full, or nothing is stored. */
  readonly paid?: boolean;
}
export type MaterialSaleError =
  | AdminEnrollmentError
  | CartError
  | PricingError
  | LineRefusal
  | { readonly kind: "empty-sale" };

const REFUND_NOTE_MAX = 300;
const PUBLIC_ID_BYTES = 16;
export type BulkOutcomes = readonly {
  readonly orderId: string;
  readonly result: Result<void, AdminEnrollmentError>;
}[];

export interface AdminEnrollmentUseCases {
  /** Same rules as the public form; the audit trail names the admin. */
  createPending(
    actor: Actor,
    input: RequestEnrollmentInput,
    options?: CreatePendingOptions,
  ): Promise<
    Result<PublicOrderView, AdminEnrollmentError | RequestEnrollmentError>
  >;
  confirmPayment(
    actor: Actor,
    input: ConfirmPaymentInput,
  ): Promise<Result<Confirmed, AdminEnrollmentError>>;
  cancel(
    actor: Actor,
    input: CancelEnrollmentInput,
  ): Promise<Result<Cancelled, AdminEnrollmentError>>;
  /**
   * Corrects an active order: workshop, month, turno and fee (the materials
   * stay). A higher total sends a paid order back to pending, a lower one
   * keeps it paid and records the refunded difference; every correction
   * keeps an audit record.
   */
  correct(
    actor: Actor,
    input: CorrectEnrollmentInput,
  ): Promise<Result<Corrected, AdminEnrollmentError>>;
  /**
   * Creates a pending material sale under a monthly record, from catalog
   * variants and quantities. The sale has its own total (the sum of its lines,
   * no fee) and its own full payment, and never changes the monthly record.
   */
  createMaterialSale(
    actor: Actor,
    input: CreateMaterialSaleInput,
  ): Promise<
    Result<{ readonly id: string; readonly number: string }, MaterialSaleError>
  >;
  markMaterialsRequested(
    actor: Actor,
    orderId: string,
  ): Promise<Result<void, AdminEnrollmentError>>;
  markMaterialsReceived(
    actor: Actor,
    orderId: string,
  ): Promise<Result<void, AdminEnrollmentError>>;
  markMaterialsRequestedBulk(
    actor: Actor,
    orderIds: readonly string[],
  ): Promise<BulkOutcomes>;
  markMaterialsReceivedBulk(
    actor: Actor,
    orderIds: readonly string[],
  ): Promise<BulkOutcomes>;
  list(
    actor: Actor,
    query?: AdminListQuery,
  ): Promise<
    Result<
      {
        readonly items: readonly import("./admin-enrollment-store").AdminListItem[];
        readonly page: number;
        readonly pageSize: 50;
      },
      AdminEnrollmentError
    >
  >;
  detail(
    actor: Actor,
    orderId: string,
  ): Promise<Result<AdminEnrollmentDetail, AdminEnrollmentError>>;
  /**
   * Marks the order read for both owners when one opens it. Idempotent: the
   * first opener's mark stays, and nothing else about the order changes.
   */
  markSeen(
    actor: Actor,
    orderId: string,
  ): Promise<Result<SeenMark, AdminEnrollmentError>>;
}

const cordobaDate = (instant: Date) =>
  new Date(instant.getTime() - 10_800_000).toISOString().slice(0, 10);
const paidAt = (date: string) => new Date(`${date}T03:00:00.000Z`);
const invalid = (field: "amount" | "paidOn" | "reason", code: string) =>
  err({ kind: "invalid" as const, issues: [{ field, code }] });
const calendarDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && cordobaDate(paidAt(value)) === value;
const invalidRefund = (field: RefundField, code: RefundIssueCode) =>
  err<InvalidRefund>({ kind: "invalid-refund", field, code });

/** The syntax of a typed refund; the bounds against the payment are the store's. */
function parseRefund(
  refund: CancelRefundInput,
): Result<{ amount: Money; refundedOn: string; note?: string }, InvalidRefund> {
  const amount = parseWholePesos(refund.amount);
  if (!amount.ok)
    return invalidRefund(
      "amount",
      refund.amount.includes(",") || refund.amount.includes(".")
        ? "not-whole-pesos"
        : amount.error,
    );
  if (!calendarDate(refund.refundedOn))
    return invalidRefund("refundedOn", "invalid-calendar-date");
  const note = refund.note?.trim() ?? "";
  if (note.length > REFUND_NOTE_MAX) return invalidRefund("note", "too-long");
  return {
    ok: true,
    value: {
      amount: amount.value,
      refundedOn: refund.refundedOn,
      ...(note === "" ? {} : { note }),
    },
  };
}

/** The workshop, month and turno an owner picked, as the order will store them. */
async function resolveTarget(
  offers: EnrollmentOfferLookup,
  picked: NonNullable<CorrectEnrollmentInput["target"]>,
): Promise<Result<CorrectionTarget, AdminEnrollmentError>> {
  let offer;
  try {
    offer = await offers.findOffer({
      slug: picked.slug,
      period: picked.period,
    });
  } catch {
    return err({ kind: "unavailable" });
  }
  // Not "not-found": that kind means the order itself is missing.
  if (offer === null || !offer.workshop.published)
    return err({ kind: "turno-not-offered" });
  if (offer.workshop.paused) return err({ kind: "enrollments-paused" });
  if (offer.period === null) return err({ kind: "period-closed" });
  const turno = offer.turnos.find((item) => item.id === picked.turnoId);
  if (turno === undefined) return err({ kind: "turno-not-offered" });
  return {
    ok: true,
    value: {
      workshopId: offer.workshop.id,
      workshopName: offer.workshop.name,
      periodId: offer.period.id,
      period: offer.period.period,
      turnoId: turno.id,
      turnoLabel: turno.label,
      weekday: turno.weekday,
      startsAt: turno.startsAt,
      endsAt: turno.endsAt,
    },
  };
}

export function createUnavailableAdminEnrollmentService(): AdminEnrollmentUseCases {
  const unavailableFor = (
    actor: Actor,
  ): Result<never, AdminEnrollmentError> => {
    const admin = requireAdminActor(actor);
    return admin.ok ? err({ kind: "unavailable" }) : admin;
  };
  const fail = (actor: Actor) => Promise.resolve(unavailableFor(actor));
  const unavailableBulk = (actor: Actor, orderIds: readonly string[]) => {
    const result = unavailableFor(actor);
    return Promise.resolve(orderIds.map((orderId) => ({ orderId, result })));
  };
  return {
    createPending: fail,
    confirmPayment: fail,
    cancel: fail,
    correct: fail,
    createMaterialSale: fail,
    markMaterialsRequested: fail,
    markMaterialsReceived: fail,
    markMaterialsRequestedBulk: unavailableBulk,
    markMaterialsReceivedBulk: unavailableBulk,
    list: fail,
    detail: fail,
    markSeen: fail,
  };
}

export function createAdminEnrollmentService(
  deps: AdminEnrollmentServiceDeps,
): AdminEnrollmentUseCases {
  const material = (
    actor: Actor,
    orderId: string,
    to: "materials_requested" | "materials_received",
  ) => {
    const admin = requireAdminActor(actor);
    if (!admin.ok) return Promise.resolve(admin);
    const now = deps.clock.now();
    return deps.store.markMaterials({ orderId, to, actor: admin.value, now });
  };
  const materialBulk = async (
    actor: Actor,
    orderIds: readonly string[],
    to: "materials_requested" | "materials_received",
  ): Promise<BulkOutcomes> => {
    const admin = requireAdminActor(actor);
    if (!admin.ok)
      return orderIds.map((orderId) => ({ orderId, result: admin }));
    const now = deps.clock.now();
    return Promise.all(
      orderIds.map(async (orderId) => ({
        orderId,
        result: await deps.store.markMaterials({
          orderId,
          to,
          actor: admin.value,
          now,
        }),
      })),
    );
  };
  return {
    async createPending(actor, input, options) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      // A $0 order has nothing to collect, and an order the owner already
      // collected is paid in full: either way the creation itself stores it
      // paid (dated the Córdoba creation day), claiming the seat and taking
      // the stock atomically, so a failure leaves nothing behind.
      const today = paidAt(cordobaDate(deps.clock.now()));
      const fee = options?.fee;
      const request: CreatePendingRequest | undefined =
        options?.paid === true
          ? { ...(fee === undefined ? {} : { fee }), paidAt: today }
          : fee?.isZero() === true
            ? { fee, paidAtIfFree: today }
            : fee === undefined
              ? undefined
              : { fee };
      return request === undefined
        ? deps.createPending(input, admin.value.email)
        : deps.createPending(input, admin.value.email, request);
    },
    async confirmPayment(actor, input) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const now = deps.clock.now();
      const amount = parseWholePesos(input.amount);
      if (!amount.ok)
        return invalid(
          "amount",
          input.amount.includes(",") || input.amount.includes(".")
            ? "not-whole-pesos"
            : amount.error,
        );
      if (!calendarDate(input.paidOn))
        return invalid("paidOn", "invalid-calendar-date");
      if (input.paidOn > cordobaDate(now))
        return invalid("paidOn", "future-date");
      return deps.store.confirm({
        orderId: input.orderId,
        amount: amount.value,
        paidAt: paidAt(input.paidOn),
        ...(input.note === undefined ? {} : { note: input.note }),
        actor: admin.value,
        now,
      });
    },
    async cancel(actor, input) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const reason = input.reason.trim();
      if (reason.length < 3 || reason.length > 300)
        return invalid("reason", reason.length < 3 ? "required" : "too-long");
      const refund =
        input.refund === undefined ? undefined : parseRefund(input.refund);
      if (refund !== undefined && !refund.ok) return refund;
      return deps.store.cancel({
        orderId: input.orderId,
        reason,
        ...(refund === undefined ? {} : { refund: refund.value }),
        actor: admin.value,
        now: deps.clock.now(),
      });
    },
    async createMaterialSale(actor, input) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const sales = deps.sales;
      if (sales === undefined) return err({ kind: "unavailable" });
      const cart = buildCart(input.lines);
      if (!cart.ok) return cart;
      if (cart.value.length === 0) return err({ kind: "empty-sale" });
      // The record gives the period the catalog is asked for and answers
      // "not found" before anything else is read.
      const parent = await deps.store.detail(input.orderId).catch(() => null);
      if (parent === null) return err({ kind: "unavailable" });
      if (!parent.ok) return parent;
      let offered;
      try {
        offered = await sales.catalog.listForPeriod(parent.value.periodId);
      } catch {
        return err({ kind: "unavailable" });
      }
      const lines = resolveLines(cart.value, offered);
      if (!lines.ok) return lines;
      const priced = priceCart({
        fee: Money.zero(),
        lines: lines.value,
        allowZeroFee: true,
      });
      if (!priced.ok) return priced;
      const now = deps.clock.now();
      const created = await sales.store.createSale({
        parentOrderId: input.orderId,
        publicId: generatePublicId(sales.random.bytes(PUBLIC_ID_BYTES)),
        year: cordobaYearOf(now),
        materialsTotal: priced.value.materialsTotal,
        lines: lines.value,
        ...(input.paid === true ? { paidAt: paidAt(cordobaDate(now)) } : {}),
        actor: admin.value,
        now,
      });
      return created.ok ? ok(created.value) : created;
    },
    async correct(actor, input) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const fee = parseWholePesos(input.fee);
      if (!fee.ok) return err({ kind: "invalid-fee" });
      const note = input.note?.trim() ?? "";
      if (note.length > 300) return invalid("reason", "too-long");
      const refund =
        input.refund === undefined ? undefined : parseRefund(input.refund);
      if (refund !== undefined && !refund.ok) return refund;
      let target: CorrectionTarget | undefined;
      if (input.target !== undefined) {
        const resolved = await resolveTarget(deps.offers, input.target);
        if (!resolved.ok) return resolved;
        target = resolved.value;
      }
      return deps.store.correct({
        orderId: input.orderId,
        ...(target === undefined ? {} : { target }),
        fee: fee.value,
        ...(refund === undefined ? {} : { refund: refund.value }),
        ...(note === "" ? {} : { note }),
        actor: admin.value,
        now: deps.clock.now(),
      });
    },
    markMaterialsRequested: (actor, orderId) =>
      material(actor, orderId, "materials_requested"),
    markMaterialsReceived: (actor, orderId) =>
      material(actor, orderId, "materials_received"),
    markMaterialsRequestedBulk: (actor, orderIds) =>
      materialBulk(actor, orderIds, "materials_requested"),
    markMaterialsReceivedBulk: (actor, orderIds) =>
      materialBulk(actor, orderIds, "materials_received"),
    async list(actor, query = {}) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      try {
        return { ok: true, value: await deps.store.list(query) };
      } catch {
        return err({ kind: "unavailable" });
      }
    },
    async detail(actor, orderId) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      try {
        return await deps.store.detail(orderId);
      } catch {
        return err({ kind: "unavailable" });
      }
    },
    async markSeen(actor, orderId) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      try {
        return await deps.store.markSeen({
          orderId,
          actor: { email: admin.value.email },
          now: deps.clock.now(),
        });
      } catch {
        return err({ kind: "unavailable" });
      }
    },
  };
}

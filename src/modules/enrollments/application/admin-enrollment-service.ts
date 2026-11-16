import {
  err,
  parseWholePesos,
  type Clock,
  type Money,
  type Result,
} from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import {
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
} from "./admin-enrollment-store";
import type {
  PublicOrderView,
  RequestEnrollmentError,
  RequestEnrollmentInput,
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
  AdminEnrollmentStoreError | Invalid | { readonly kind: "denied" };
/** What only an admin may decide when enrolling a student by hand. */
export interface CreatePendingOptions {
  /** The student's fee in whole pesos, replacing the period fee; $0 is a scholarship. */
  readonly fee?: Money;
}
/** What the service hands to the creation: the admin's choices plus the date a free order is paid. */
export interface CreatePendingRequest extends CreatePendingOptions {
  /** Córdoba creation date; a $0 order is stored already paid on it. */
  readonly paidAtIfFree?: Date;
}
/** Creates an enrollment on behalf of a student, attributed to the admin; a free one is created paid. */
export type CreatePendingEnrollment = (
  input: RequestEnrollmentInput,
  actorEmail: string,
  options?: CreatePendingRequest,
) => Promise<Result<PublicOrderView, RequestEnrollmentError>>;
export interface AdminEnrollmentServiceDeps {
  readonly store: AdminEnrollmentStore;
  readonly clock: Clock;
  readonly createPending: CreatePendingEnrollment;
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

const REFUND_NOTE_MAX = 300;
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
    markMaterialsRequested: fail,
    markMaterialsReceived: fail,
    markMaterialsRequestedBulk: unavailableBulk,
    markMaterialsReceivedBulk: unavailableBulk,
    list: fail,
    detail: fail,
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
      // A $0 order has nothing to collect, so the creation itself stores it
      // paid (dated the Córdoba creation day) and claims the seat atomically.
      const request =
        options?.fee?.isZero() === true
          ? {
              ...options,
              paidAtIfFree: paidAt(cordobaDate(deps.clock.now())),
            }
          : options;
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
  };
}

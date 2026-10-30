import {
  err,
  parseWholePesos,
  type Clock,
  type Result,
} from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import type {
  AdminEnrollmentDetail,
  AdminEnrollmentStore,
  AdminEnrollmentStoreError,
  AdminListQuery,
  Cancelled,
  Confirmed,
} from "./admin-enrollment-store";

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
export interface AdminEnrollmentServiceDeps {
  readonly store: AdminEnrollmentStore;
  readonly clock: Clock;
}
export interface ConfirmPaymentInput {
  readonly orderId: string;
  readonly amount: string;
  readonly paidOn: string;
  readonly note?: string;
}
export interface CancelEnrollmentInput {
  readonly orderId: string;
  readonly reason: string;
}
export type BulkOutcomes = readonly {
  readonly orderId: string;
  readonly result: Result<void, AdminEnrollmentError>;
}[];

export interface AdminEnrollmentUseCases {
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
      return deps.store.cancel({
        orderId: input.orderId,
        reason,
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

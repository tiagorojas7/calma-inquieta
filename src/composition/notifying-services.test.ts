import { describe, expect, it, vi } from "vitest";
import { err, ok, Money } from "~/modules/_shared";
import type {
  AdminEnrollmentUseCases,
  PublicEnrollmentUseCases,
} from "~/modules/enrollments";
import type { NotificationService } from "~/modules/notifications";
import type { PrivateEventUseCases } from "~/modules/private-events";
import {
  withEnrollmentEmails,
  withPaymentEmails,
  withPrivateEventEmails,
} from "./notifying-services";

const total = Money.fromCentavos(5_800_000);
if (!total.ok) throw new Error("bad money");

function notifier() {
  return {
    enrollmentReceived: vi.fn((_order: unknown) => Promise.resolve()),
    paymentConfirmed: vi.fn((_order: unknown) => Promise.resolve()),
    privateEventReceived: vi.fn((_inquiry: unknown) => Promise.resolve()),
    runDailyReminders: vi.fn(() =>
      Promise.resolve({ classes: 0, fees: 0, failed: 0 }),
    ),
  } satisfies NotificationService;
}

function deferred() {
  const pending: Promise<unknown>[] = [];
  return {
    defer: (p: Promise<unknown>) => {
      pending.push(p);
    },
    settle: () => Promise.all(pending),
    pending,
  };
}

const view = {
  publicId: "abc123",
  number: "CI-2026-0007",
  status: "pending_confirmation" as const,
  studentName: "Ana Pérez",
  workshopName: "Bordado",
  period: "2026-11",
  turnoLabel: "Martes",
  weekday: 2,
  startsAt: "17:30",
  endsAt: "19:30",
  lines: [],
  fee: total.value,
  materialsTotal: Money.zero(),
  total: total.value,
};

const request = {
  slug: "bordado",
  period: "2026-11",
  turnoId: "t",
  lines: [],
  student: {
    fullName: "Ana Pérez",
    email: "ana@example.com",
    phone: "351",
    policyAccepted: true,
    honeypot: "",
  },
};

const expectedNotice = {
  studentEmail: "ana@example.com",
  studentName: "Ana Pérez",
  number: "CI-2026-0007",
  publicId: "abc123",
  workshopName: "Bordado",
  period: "2026-11",
  turnoLabel: "Martes",
  total: total.value,
};

describe("withEnrollmentEmails", () => {
  function setup(
    result: Awaited<ReturnType<PublicEnrollmentUseCases["requestEnrollment"]>>,
  ) {
    const inner: PublicEnrollmentUseCases = {
      getOffer: vi.fn(),
      getOrderByPublicId: vi.fn(),
      requestEnrollment: vi.fn(() => Promise.resolve(result)),
    };
    const n = notifier();
    const d = deferred();
    return { service: withEnrollmentEmails(inner, n, d.defer), n, d, inner };
  }

  it("defers the received email after the order is created and returns the result untouched", async () => {
    const { service, n, d } = setup(ok(view));
    await expect(service.requestEnrollment(request)).resolves.toEqual(ok(view));
    await d.settle();
    expect(n.enrollmentReceived).toHaveBeenCalledWith(expectedNotice);
  });

  it("sends nothing for a refused request", async () => {
    const { service, n, d } = setup(err({ kind: "turno-full" }));
    await service.requestEnrollment(request);
    expect(d.pending).toHaveLength(0);
    expect(n.enrollmentReceived).not.toHaveBeenCalled();
  });

  it("sends nothing for the honeypot decoy, which has no order number", async () => {
    const { service, n } = setup(ok({ ...view, number: "" }));
    await service.requestEnrollment(request);
    expect(n.enrollmentReceived).not.toHaveBeenCalled();
  });

  it("never fails the flow when the notifier rejects", async () => {
    const { service, n, d } = setup(ok(view));
    n.enrollmentReceived.mockRejectedValueOnce(new Error("boom"));
    await expect(service.requestEnrollment(request)).resolves.toEqual(ok(view));
    await expect(d.settle()).resolves.toBeDefined();
  });

  it("passes the other use cases through", () => {
    const { service, inner } = setup(ok(view));
    expect(service.getOffer).toBe(inner.getOffer);
  });
});

describe("withPaymentEmails", () => {
  const actor = { email: "owner@example.test" };
  const detail = {
    publicId: "abc123",
    number: "CI-2026-0007",
    workshopName: "Bordado",
    period: "2026-11",
    turnoLabel: "Martes",
    total: total.value,
    student: {
      fullName: "Ana Pérez",
      email: "ana@example.com",
      phoneDigits: "1",
    },
    email: "ana@example.com",
  };

  function setup(
    confirm: Awaited<ReturnType<AdminEnrollmentUseCases["confirmPayment"]>>,
  ) {
    const confirmPayment = vi.fn(() => Promise.resolve(confirm));
    const readDetail = vi.fn((_actor: unknown, _id: string) =>
      Promise.resolve(ok(detail)),
    );
    // Only the two use cases the decorator touches are exercised.
    const inner = {
      confirmPayment,
      detail: readDetail,
    } as unknown as AdminEnrollmentUseCases;
    const n = notifier();
    const d = deferred();
    return {
      service: withPaymentEmails(inner, n, d.defer),
      n,
      d,
      readDetail,
    };
  }

  const input = { orderId: "o1", amount: "58000", paidOn: "2026-11-01" };

  it("defers the payment email once the order is confirmed", async () => {
    const { service, n, d, readDetail } = setup(ok({ kind: "confirmed" }));
    await expect(service.confirmPayment(actor, input)).resolves.toEqual(
      ok({ kind: "confirmed" }),
    );
    await d.settle();
    expect(readDetail).toHaveBeenCalledWith(actor, "o1");
    expect(n.paymentConfirmed).toHaveBeenCalledWith(expectedNotice);
  });

  it("sends nothing when the order was already confirmed or the call failed", async () => {
    for (const result of [
      ok({ kind: "already-confirmed" as const }),
      err({ kind: "not-found" as const }),
    ]) {
      const { service, n, d } = setup(result);
      await service.confirmPayment(actor, input);
      expect(d.pending).toHaveLength(0);
      expect(n.paymentConfirmed).not.toHaveBeenCalled();
    }
  });

  it("never fails the flow when the detail read rejects", async () => {
    const { service, readDetail, d, n } = setup(ok({ kind: "confirmed" }));
    readDetail.mockRejectedValueOnce(new Error("db down"));
    await expect(service.confirmPayment(actor, input)).resolves.toEqual(
      ok({ kind: "confirmed" }),
    );
    await expect(d.settle()).resolves.toBeDefined();
    expect(n.paymentConfirmed).not.toHaveBeenCalled();
  });
});

describe("withPrivateEventEmails", () => {
  const draft = {
    fullName: "Lu Gómez",
    phone: "351 123 4567",
    email: "",
    desiredDate: "2026-12-05",
    place: "Casa",
    participants: "8",
    notes: "",
    honeypot: "",
  };

  function setup(
    result: Awaited<ReturnType<PrivateEventUseCases["requestEvent"]>>,
  ) {
    const inner = {
      requestEvent: vi.fn(() => Promise.resolve(result)),
    } as unknown as PrivateEventUseCases;
    const n = notifier();
    const d = deferred();
    return { service: withPrivateEventEmails(inner, n, d.defer), n, d };
  }

  it("defers the studio email for a stored request", async () => {
    const { service, n, d } = setup(ok({ received: true }));
    await service.requestEvent(draft);
    await d.settle();
    expect(n.privateEventReceived).toHaveBeenCalledWith({
      fullName: "Lu Gómez",
      phone: "351 123 4567",
      email: null,
      desiredDate: "2026-12-05",
      place: "Casa",
      participants: 8,
      notes: null,
    });
  });

  it("sends nothing for the honeypot or an invalid draft", async () => {
    const bot = setup(ok({ received: true }));
    await bot.service.requestEvent({ ...draft, honeypot: "x" });
    expect(bot.n.privateEventReceived).not.toHaveBeenCalled();

    const bad = setup(err({ kind: "invalid", issues: [] }));
    await bad.service.requestEvent(draft);
    expect(bad.n.privateEventReceived).not.toHaveBeenCalled();
  });
});

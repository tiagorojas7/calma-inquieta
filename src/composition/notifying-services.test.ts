import { describe, expect, it, vi } from "vitest";
import { err, ok, Money } from "~/modules/_shared";
import type {
  AdminEnrollmentUseCases,
  PublicEnrollmentUseCases,
} from "~/modules/enrollments";
import type {
  IntensiveRequestUseCases,
  PublicRequestView,
} from "~/modules/intensive-requests";
import type { NotificationService } from "~/modules/notifications";
import type { PrivateEventUseCases } from "~/modules/private-events";
import {
  withEnrollmentEmails,
  withIntensiveRequestEmails,
  withPaymentEmails,
  withPrivateEventEmails,
} from "./notifying-services";

const total = Money.fromCentavos(5_800_000);
if (!total.ok) throw new Error("bad money");

function notifier() {
  return {
    enrollmentReceived: vi.fn<(order: unknown) => Promise<void>>(() =>
      Promise.resolve(),
    ),
    paymentConfirmed: vi.fn<(order: unknown) => Promise<void>>(() =>
      Promise.resolve(),
    ),
    privateEventReceived: vi.fn<(inquiry: unknown) => Promise<void>>(() =>
      Promise.resolve(),
    ),
    intensiveRequestReceived: vi.fn<(notice: unknown) => Promise<void>>(() =>
      Promise.resolve(),
    ),
    intensiveReservationConfirmed: vi.fn<(notice: unknown) => Promise<void>>(
      () => Promise.resolve(),
    ),
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
    const getOffer = vi.fn();
    const inner: PublicEnrollmentUseCases = {
      getOffer,
      getOrderByPublicId: vi.fn(),
      requestEnrollment: vi.fn(() => Promise.resolve(result)),
    };
    const n = notifier();
    const d = deferred();
    return { service: withEnrollmentEmails(inner, n, d.defer), n, d, getOffer };
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
    const { service, getOffer } = setup(ok(view));
    // eslint-disable-next-line @typescript-eslint/unbound-method -- identity check only
    expect(service.getOffer).toBe(getOffer);
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
    const readDetail = vi.fn<
      (
        actor: unknown,
        id: string,
      ) => Promise<{ ok: true; value: typeof detail }>
    >(() => Promise.resolve({ ok: true as const, value: detail }));
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

describe("withIntensiveRequestEmails", () => {
  const actor = { kind: "admin-actor" as const, email: "owner@example.test" };
  const deposit = Money.fromCentavos(2_000_000);
  if (!deposit.ok) throw new Error("bad money");
  const summary: PublicRequestView = {
    publicId: "res123",
    reference: "res123ab",
    status: "pending_confirmation",
    studentName: "Ana Pérez",
    intensivoName: "Bordado libre",
    eventDate: "2026-12-05",
    startsAt: "10:00",
    endsAt: "14:00",
    deposit: deposit.value,
  };
  const expectedReservation = {
    studentEmail: "ana@example.com",
    studentName: "Ana Pérez",
    publicId: "res123",
    intensivoName: "Bordado libre",
    eventDate: "2026-12-05",
    deposit: deposit.value,
  };
  const seat = {
    slug: "bordado-libre",
    student: {
      fullName: "Ana Pérez",
      email: " ana@example.com ",
      phone: "351",
      policyAccepted: true,
      honeypot: "",
    },
  };
  const confirmInput = {
    intensiveId: "i1",
    requestId: "r1",
    amount: "20000",
    paidOn: "2026-11-01",
    note: "",
  };
  const stored = { publicId: "res123" };

  function setup(over: {
    requestSeat?: unknown;
    confirm?: unknown;
    summary?: unknown;
  }) {
    const requestSeat = vi.fn(() =>
      Promise.resolve(over.requestSeat ?? ok({ publicId: "res123" })),
    );
    const confirm = vi.fn(() => Promise.resolve(over.confirm ?? ok(stored)));
    const getRequestByPublicId = vi.fn(() =>
      Promise.resolve(over.summary ?? ok(summary)),
    );
    const inner = {
      requestSeat,
      confirm,
      getRequestByPublicId,
    } as unknown as IntensiveRequestUseCases;
    const n = notifier();
    const d = deferred();
    return {
      service: withIntensiveRequestEmails(inner, n, d.defer),
      n,
      d,
      getRequestByPublicId,
      requestSeat,
    };
  }

  it("defers the received email after the request is stored and returns the result untouched", async () => {
    const { service, n, d, getRequestByPublicId } = setup({});
    await expect(service.requestSeat(seat)).resolves.toEqual(
      ok({ publicId: "res123" }),
    );
    await d.settle();
    expect(getRequestByPublicId).toHaveBeenCalledWith("res123");
    expect(n.intensiveRequestReceived).toHaveBeenCalledWith(
      expectedReservation,
    );
  });

  it("sends nothing for a refused request or the honeypot decoy", async () => {
    const refused = setup({ requestSeat: err({ kind: "seats-full" }) });
    await refused.service.requestSeat(seat);
    expect(refused.d.pending).toHaveLength(0);

    const decoy = setup({});
    await decoy.service.requestSeat({
      ...seat,
      student: { ...seat.student, honeypot: "bot" },
    });
    expect(decoy.d.pending).toHaveLength(0);
    expect(decoy.n.intensiveRequestReceived).not.toHaveBeenCalled();
  });

  it("never fails the flow when the summary read or the notifier rejects", async () => {
    const { service, n, d, getRequestByPublicId } = setup({});
    getRequestByPublicId.mockRejectedValueOnce(new Error("db down"));
    await expect(service.requestSeat(seat)).resolves.toEqual(
      ok({ publicId: "res123" }),
    );
    await expect(d.settle()).resolves.toBeDefined();
    expect(n.intensiveRequestReceived).not.toHaveBeenCalled();

    const second = setup({});
    second.n.intensiveRequestReceived.mockRejectedValueOnce(new Error("boom"));
    await second.service.requestSeat(seat);
    await expect(second.d.settle()).resolves.toBeDefined();
  });

  it("defers the confirmed email to the student's address once the deposit is confirmed", async () => {
    const { service, n, d } = setup({
      confirm: ok({ publicId: "res123", email: "ana@example.com" }),
    });
    await service.confirm(actor, confirmInput);
    await d.settle();
    expect(n.intensiveReservationConfirmed).toHaveBeenCalledWith(
      expectedReservation,
    );
  });

  it("sends nothing when the confirmation fails", async () => {
    const { service, n, d } = setup({ confirm: err({ kind: "not-found" }) });
    await service.confirm(actor, confirmInput);
    expect(d.pending).toHaveLength(0);
    expect(n.intensiveReservationConfirmed).not.toHaveBeenCalled();
  });

  it("passes the other use cases through", () => {
    const { service } = setup({});
    expect(typeof service.requestSeat).toBe("function");
  });
});

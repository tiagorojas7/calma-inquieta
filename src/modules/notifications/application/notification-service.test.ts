import { describe, expect, it, vi } from "vitest";
import { err, ok, Money } from "~/modules/_shared";
import {
  createNotificationService,
  type NotificationServiceDeps,
} from "./notification-service";
import type {
  AudienceOrder,
  EmailMessage,
  EmailSender,
  NotificationAudience,
} from "./notification-ports";

const SITE = "https://calma.example.test";

function money(pesos: number): Money {
  const result = Money.fromCentavos(pesos * 100);
  if (!result.ok) throw new Error("bad money");
  return result.value;
}

const audienceOrder = (over: Partial<AudienceOrder> = {}): AudienceOrder => ({
  number: "CI-2026-0001",
  publicId: "pub1",
  studentName: "Ana Pérez",
  studentEmail: "ana@example.com",
  workshopName: "Bordado",
  period: "2026-11",
  turnoLabel: "Martes a la tarde",
  startsAt: "17:30:00",
  total: money(58000),
  ...over,
});

function setup(over: Partial<NotificationServiceDeps> = {}) {
  const sent: EmailMessage[] = [];
  const sender: EmailSender = {
    send: (message) => {
      sent.push(message);
      return Promise.resolve(ok(undefined));
    },
  };
  const audience: NotificationAudience = {
    classesOn: vi.fn(() => Promise.resolve([])),
    pendingRequestedBetween: vi.fn(() => Promise.resolve([])),
  };
  const failures: string[] = [];
  const service = createNotificationService({
    enabled: true,
    sender,
    audience,
    clock: { now: () => new Date("2026-11-02T12:00:00.000Z") }, // Monday
    siteUrl: SITE,
    studioEmail: () => Promise.resolve("hola@studio.example.test"),
    onFailure: (name) => failures.push(name),
    ...over,
  });
  return { service, sent, audience, failures };
}

const notice = {
  studentEmail: "ana@example.com",
  studentName: "Ana Pérez",
  number: "CI-2026-0007",
  publicId: "abc123",
  workshopName: "Bordado",
  period: "2026-11",
  turnoLabel: "Martes a la tarde",
  total: money(58000),
};

describe("notification service", () => {
  it("emails the student when an enrollment is received, with the public order link", async () => {
    const { service, sent } = setup();
    await service.enrollmentReceived(notice);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: "ana@example.com",
      subject: "Recibimos tu inscripción CI-2026-0007",
    });
    expect(sent[0]?.text).toContain(`${SITE}/pedido/abc123`);
    expect(sent[0]?.text).toContain("$ 58.000");
    expect(sent[0]?.text).toContain("noviembre 2026");
  });

  it("emails the student when the payment is confirmed", async () => {
    const { service, sent } = setup();
    await service.paymentConfirmed(notice);
    expect(sent[0]).toMatchObject({
      to: "ana@example.com",
      subject: "Confirmamos tu pago",
    });
  });

  it("emails the studio about a private event inquiry", async () => {
    const { service, sent } = setup();
    await service.privateEventReceived({
      fullName: "Lu Gómez",
      phone: "5493511234567",
      email: null,
      desiredDate: "2026-12-05",
      place: "Casa",
      participants: 8,
      notes: null,
    });
    expect(sent[0]?.to).toBe("hola@studio.example.test");
  });

  it("skips the studio email when there is no studio address", async () => {
    const { service, sent } = setup({
      studioEmail: () => Promise.resolve(null),
    });
    await service.privateEventReceived({
      fullName: "Lu",
      phone: "1",
      email: null,
      desiredDate: "2026-12-05",
      place: "Casa",
      participants: 8,
      notes: null,
    });
    expect(sent).toEqual([]);
  });

  it("does nothing, and reads nothing, when disabled", async () => {
    const { service, sent, audience } = setup({ enabled: false });
    await service.enrollmentReceived(notice);
    await service.paymentConfirmed(notice);
    await expect(service.runDailyReminders()).resolves.toEqual({
      classes: 0,
      fees: 0,
      failed: 0,
    });
    expect(sent).toEqual([]);
    expect(audience.classesOn).not.toHaveBeenCalled();
    expect(audience.pendingRequestedBetween).not.toHaveBeenCalled();
  });

  it("swallows a rejected send and logs only its name", async () => {
    const { service, failures } = setup({
      sender: { send: () => Promise.resolve(err({ kind: "rejected" })) },
    });
    await expect(service.paymentConfirmed(notice)).resolves.toBeUndefined();
    expect(failures).toEqual(["rejected"]);
  });

  it("swallows a thrown sender and an audience failure", async () => {
    const { service, failures } = setup({
      sender: { send: () => Promise.reject(new Error("secret body")) },
      audience: {
        classesOn: () => Promise.reject(new Error("db down")),
        pendingRequestedBetween: () => Promise.reject(new Error("db down")),
      },
    });
    await expect(service.enrollmentReceived(notice)).resolves.toBeUndefined();
    await expect(service.runDailyReminders()).resolves.toMatchObject({
      classes: 0,
      fees: 0,
    });
    expect(failures).toContain("send-threw");
    expect(failures).toContain("audience-failed");
    expect(failures.join(" ")).not.toContain("secret");
  });

  it("asks for tomorrow's class by Córdoba weekday and month", async () => {
    const { service, audience } = setup();
    await service.runDailyReminders(); // Monday 2026-11-02 -> Tuesday 11-03
    expect(audience.classesOn).toHaveBeenCalledWith(2, "2026-11");
  });

  it("uses the Córdoba calendar when the UTC date differs", async () => {
    const { service, audience } = setup({
      // 01:00 UTC on Sunday 2026-11-01 is still Saturday 2026-10-31 in Córdoba.
      clock: { now: () => new Date("2026-11-01T01:00:00.000Z") },
    });
    await service.runDailyReminders(); // tomorrow = Sunday 2026-11-01
    expect(audience.classesOn).toHaveBeenCalledWith(7, "2026-11");
  });

  it("sends a class reminder per order and a fee reminder in the 48-72 h window", async () => {
    const { service, sent, audience } = setup({
      audience: {
        classesOn: () => Promise.resolve([audienceOrder()]),
        pendingRequestedBetween: vi.fn(() =>
          Promise.resolve([
            audienceOrder({
              number: "CI-2026-0002",
              studentEmail: "bea@example.com",
            }),
          ]),
        ),
      },
    });
    await expect(service.runDailyReminders()).resolves.toEqual({
      classes: 1,
      fees: 1,
      failed: 0,
    });
    expect(sent.map((m) => m.subject)).toEqual([
      "Mañana tenés clase",
      "Tu cuota está pendiente",
    ]);
    expect(sent[0]?.text).toContain("17:30");
    expect(sent[0]?.text).not.toContain("17:30:00");
    expect(audience).toBeDefined();
  });

  it("queries pending orders requested between 72 and 48 hours ago", async () => {
    const pending = vi.fn(() => Promise.resolve([]));
    const { service } = setup({
      audience: {
        classesOn: () => Promise.resolve([]),
        pendingRequestedBetween: pending,
      },
    });
    await service.runDailyReminders();
    expect(pending).toHaveBeenCalledWith(
      new Date("2026-10-30T12:00:00.000Z"),
      new Date("2026-10-31T12:00:00.000Z"),
    );
  });

  it("counts failed sends in the summary", async () => {
    const { service } = setup({
      sender: { send: () => Promise.resolve(err({ kind: "rejected" })) },
      audience: {
        classesOn: () => Promise.resolve([audienceOrder()]),
        pendingRequestedBetween: () => Promise.resolve([]),
      },
    });
    await expect(service.runDailyReminders()).resolves.toEqual({
      classes: 0,
      fees: 0,
      failed: 1,
    });
  });
});

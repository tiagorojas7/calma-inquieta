import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { studentOrder } from "~/testing/fakes/student-builders";
import { createRemindersService } from "./reminder-service";
import { createUnavailableRemindersService } from "./reminder-service";
import type { ReminderOrderSource } from "./reminder-ports";

const actor = testAdminActor();

function service(...orders: ReturnType<typeof studentOrder>[]) {
  const source: ReminderOrderSource = { all: () => Promise.resolve(orders) };
  return createRemindersService({ orders: source });
}

const fee = { kind: "fee" as const, inputs: {}, filter: {} };

describe("reminders service", () => {
  it("denies a request without an admin actor", async () => {
    await expect(service().prepare(null, fee)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(service().options(undefined)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });

  it("prepares a wa.me link with the message for each student", async () => {
    const result = await service(
      studentOrder(1, {
        studentName: "Ana Pérez",
        studentEmail: "ana@example.com",
        studentPhoneDigits: "5493511234567",
      }),
    ).prepare(actor, fee);

    const message =
      "Hola, Ana. Tu cuota correspondiente a octubre figura pendiente. Si ya realizaste el pago, podés enviarnos el comprobante.";
    expect(result).toEqual({
      ok: true,
      value: {
        preview: message,
        recipients: [
          {
            name: "Ana Pérez",
            email: "ana@example.com",
            message,
            link: `https://wa.me/5493511234567?text=${encodeURIComponent(message)}`,
          },
        ],
      },
    });
  });

  it("lists a student without a valid phone and gives her no link", async () => {
    const result = await service(
      studentOrder(1, { studentPhoneDigits: "12345" }),
    ).prepare(actor, fee);

    expect(result.ok && result.value.recipients).toMatchObject([
      { link: null },
    ]);
  });

  it("sends one fee message per student even with several pending orders", async () => {
    const result = await service(
      studentOrder(1, { studentEmail: "ana@example.com" }),
      studentOrder(2, {
        studentEmail: "ANA@example.com ",
        workshopId: "00000000-0000-4000-8000-000000000009",
        workshopName: "Acuarela",
      }),
    ).prepare(actor, fee);

    expect(result.ok && result.value.recipients).toHaveLength(1);
  });

  it("writes a class message for each workshop of a student", async () => {
    const result = await service(
      studentOrder(1, {
        studentEmail: "ana@example.com",
        workshopName: "Bordado",
      }),
      studentOrder(2, {
        studentEmail: "ana@example.com",
        workshopId: "00000000-0000-4000-8000-000000000009",
        studentName: "Ana",
        workshopName: "Acuarela",
      }),
    ).prepare(actor, { kind: "class", inputs: {}, filter: {} });

    expect(result.ok && result.value.recipients.map((r) => r.message)).toEqual([
      expect.stringContaining("Acuarela"),
      expect.stringContaining("Bordado"),
    ]);
  });

  it("filters the audience", async () => {
    const result = await service(
      studentOrder(1, { studentName: "Ana", status: "paid" }),
      studentOrder(2, {
        studentName: "Bea",
        status: "paid",
        period: "2026-11",
      }),
    ).prepare(actor, {
      kind: "materials",
      inputs: {},
      filter: { period: "2026-11" },
    });

    expect(result.ok && result.value.recipients.map((r) => r.name)).toEqual([
      "Bea",
    ]);
  });

  it("previews with a sample first name when nobody matches", async () => {
    const result = await service().prepare(actor, {
      kind: "notice",
      inputs: { text: "Hay lugar." },
      filter: {},
    });
    expect(result).toEqual({
      ok: true,
      value: { preview: "Hola, Ana. Hay lugar.", recipients: [] },
    });
  });

  it("reports invalid template inputs", async () => {
    await expect(
      service().prepare(actor, { kind: "intensive", inputs: {}, filter: {} }),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "invalid" },
    });
  });

  it("lists the periods and turnos present in the orders", async () => {
    const result = await service(
      studentOrder(1, { period: "2026-10", turnoLabel: "Martes" }),
      studentOrder(2, { period: "2026-11", turnoLabel: "Jueves" }),
      studentOrder(3, { period: "2026-11", turnoLabel: "Martes" }),
    ).options(actor);
    expect(result).toEqual({
      ok: true,
      value: { periods: ["2026-11", "2026-10"], turnos: ["Jueves", "Martes"] },
    });
  });

  it("fails closed as unavailable for an authorized actor", async () => {
    const unavailable = createUnavailableRemindersService();
    await expect(unavailable.options(actor)).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    await expect(unavailable.prepare(null, fee)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });
});

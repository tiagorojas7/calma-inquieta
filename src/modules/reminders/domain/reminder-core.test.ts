import { describe, expect, it } from "vitest";
import {
  NOTICE_MAX,
  buildReminderMessage,
  firstNameOf,
  monthNameOf,
  selectAudienceOrders,
  validateReminderTemplate,
  type ReminderOrder,
} from "./reminder-core";

const order = (overrides: Partial<ReminderOrder> = {}): ReminderOrder => ({
  status: "pending_confirmation",
  workshopId: "w1",
  workshopName: "Bordado",
  period: "2026-10",
  turnoLabel: "Martes 16:00 a 18:00",
  studentName: "Ana Pérez",
  studentEmail: "ana@example.com",
  studentPhoneDigits: "5493511234567",
  ...overrides,
});

describe("firstNameOf", () => {
  it("takes the first word of the full name", () => {
    expect(firstNameOf("  Ana María Pérez ")).toBe("Ana");
  });
  it("is empty when the name is blank", () => {
    expect(firstNameOf("   ")).toBe("");
  });
});

describe("monthNameOf", () => {
  it("names the month of a period key", () => {
    expect(monthNameOf("2026-10")).toBe("octubre");
  });
  it("keeps an unknown key as it is", () => {
    expect(monthNameOf("soon")).toBe("soon");
  });
});

describe("validateReminderTemplate", () => {
  it("defaults the class reminder to tomorrow", () => {
    expect(validateReminderTemplate("class", {})).toEqual({
      ok: true,
      value: { kind: "class", when: "mañana" },
    });
  });
  it("trims the class day", () => {
    expect(
      validateReminderTemplate("class", { when: "  el martes 4 " }),
    ).toEqual({ ok: true, value: { kind: "class", when: "el martes 4" } });
  });
  it("needs no input for fee and materials", () => {
    expect(validateReminderTemplate("fee", {})).toEqual({
      ok: true,
      value: { kind: "fee" },
    });
    expect(validateReminderTemplate("materials", {})).toEqual({
      ok: true,
      value: { kind: "materials" },
    });
  });
  it("requires the intensivo name and day", () => {
    expect(validateReminderTemplate("intensive", {})).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "activity", code: "required" },
          { field: "when", code: "required" },
        ],
      },
    });
    expect(
      validateReminderTemplate("intensive", {
        activity: " Acuarela ",
        when: "este sábado",
      }),
    ).toEqual({
      ok: true,
      value: { kind: "intensive", activity: "Acuarela", when: "este sábado" },
    });
  });
  it("requires a notice text within the limit", () => {
    expect(validateReminderTemplate("notice", { text: " " })).toMatchObject({
      ok: false,
      error: { issues: [{ field: "text", code: "required" }] },
    });
    expect(
      validateReminderTemplate("notice", { text: "x".repeat(NOTICE_MAX + 1) }),
    ).toMatchObject({
      ok: false,
      error: { issues: [{ field: "text", code: "too-long" }] },
    });
  });
});

describe("buildReminderMessage", () => {
  const ana = order();
  it("writes the class reminder with the turno", () => {
    expect(buildReminderMessage({ kind: "class", when: "mañana" }, ana)).toBe(
      "Hola, Ana. Te recordamos que mañana tenés tu clase de Bordado (turno Martes 16:00 a 18:00) en Calma Inquieta.",
    );
  });
  it("writes the pending fee message with the month", () => {
    expect(buildReminderMessage({ kind: "fee" }, ana)).toBe(
      "Hola, Ana. Tu cuota correspondiente a octubre figura pendiente. Si ya realizaste el pago, podés enviarnos el comprobante.",
    );
  });
  it("writes the materials-ready message", () => {
    expect(buildReminderMessage({ kind: "materials" }, ana)).toBe(
      "Hola, Ana. Tus materiales de Bordado ya están listos para retirar en Calma Inquieta.",
    );
  });
  it("writes the intensivo reservation message", () => {
    expect(
      buildReminderMessage(
        { kind: "intensive", activity: "Acuarela", when: "este sábado" },
        ana,
      ),
    ).toBe(
      "Hola, Ana. Te recordamos que este sábado tenés reservado tu lugar en el workshop de Acuarela.",
    );
  });
  it("prefixes a free notice with the greeting", () => {
    expect(
      buildReminderMessage({ kind: "notice", text: "Hay lugar nuevo." }, ana),
    ).toBe("Hola, Ana. Hay lugar nuevo.");
  });
  it("greets without a name when it is blank", () => {
    expect(
      buildReminderMessage({ kind: "fee" }, order({ studentName: " " })),
    ).toMatch(/^Hola\. Tu cuota/);
  });
});

describe("selectAudienceOrders", () => {
  const orders = [
    order({ studentEmail: "a@x.com" }),
    order({ studentEmail: "b@x.com", status: "paid" }),
    order({ studentEmail: "c@x.com", status: "cancelled" }),
    order({
      studentEmail: "d@x.com",
      status: "paid",
      workshopId: "w2",
      period: "2026-11",
      turnoLabel: "Jueves 10:00 a 12:00",
    }),
  ];
  const emails = (list: readonly ReminderOrder[]) =>
    list.map((o) => o.studentEmail);

  it("leaves cancelled orders out unless the status asks for them", () => {
    expect(emails(selectAudienceOrders(orders, {}, "notice"))).toEqual([
      "a@x.com",
      "b@x.com",
      "d@x.com",
    ]);
    expect(
      emails(selectAudienceOrders(orders, { status: "cancelled" }, "notice")),
    ).toEqual(["c@x.com"]);
  });
  it("narrows by workshop, period, turno and status", () => {
    expect(
      emails(selectAudienceOrders(orders, { workshopId: "w2" }, "class")),
    ).toEqual(["d@x.com"]);
    expect(
      emails(selectAudienceOrders(orders, { period: "2026-11" }, "class")),
    ).toEqual(["d@x.com"]);
    expect(
      emails(
        selectAudienceOrders(
          orders,
          { turnoLabel: "Jueves 10:00 a 12:00" },
          "class",
        ),
      ),
    ).toEqual(["d@x.com"]);
    expect(
      emails(selectAudienceOrders(orders, { status: "paid" }, "class")),
    ).toEqual(["b@x.com", "d@x.com"]);
  });
  it("defaults the pending fee reminder to pending orders", () => {
    expect(emails(selectAudienceOrders(orders, {}, "fee"))).toEqual([
      "a@x.com",
    ]);
    expect(
      emails(selectAudienceOrders(orders, { status: "paid" }, "fee")),
    ).toEqual(["b@x.com", "d@x.com"]);
  });
});

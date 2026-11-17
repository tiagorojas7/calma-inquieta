import { describe, expect, it } from "vitest";
import { studentOrder } from "~/testing/fakes/student-builders";
import {
  deriveStudents,
  filterStudents,
  normalizeStudentEmail,
  resolveStudentIdentity,
  NOTE_MAX,
  validateNote,
} from "./student-core";

describe("normalizeStudentEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeStudentEmail("  Ana@Example.COM ")).toBe("ana@example.com");
  });
});

describe("resolveStudentIdentity", () => {
  it("creates, reuses, or rejects a profile without merging two people", () => {
    expect(resolveStudentIdentity(null, null)).toEqual({ kind: "create" });
    expect(resolveStudentIdentity("student-a", null)).toEqual({
      kind: "reuse",
      studentId: "student-a",
    });
    expect(resolveStudentIdentity(null, "student-a")).toEqual({
      kind: "reuse",
      studentId: "student-a",
    });
    expect(resolveStudentIdentity("student-a", "student-a")).toEqual({
      kind: "reuse",
      studentId: "student-a",
    });
    expect(resolveStudentIdentity("student-a", "student-b")).toEqual({
      kind: "conflict",
    });
  });
});

describe("deriveStudents", () => {
  it("keeps one profile per person across several workshops", () => {
    const profiles = deriveStudents([
      studentOrder(1, { studentEmail: "ana@example.com" }),
      studentOrder(2, {
        studentEmail: " Ana@Example.com",
        workshopId: "00000000-0000-4000-8000-000000000099",
        workshopName: "Acuarela",
      }),
      studentOrder(3, { studentEmail: "bea@example.com" }),
    ]);

    expect(profiles.map((p) => p.email).sort()).toEqual([
      "ana@example.com",
      "bea@example.com",
    ]);
    const ana = profiles.find((p) => p.email === "ana@example.com");
    expect(ana?.workshops.map((w) => w.name)).toEqual([
      "Acuarela",
      "Cerámica inicial",
    ]);
    expect(ana?.orders.map((o) => o.number)).toEqual([
      "CI-2026-0002",
      "CI-2026-0001",
    ]);
  });

  it("takes the latest name and phone", () => {
    const [ana] = deriveStudents([
      studentOrder(1, {
        studentEmail: "ana@example.com",
        studentName: "Ana Perez",
        studentPhoneDigits: "5493511111111",
      }),
      studentOrder(2, {
        studentEmail: "ana@example.com",
        studentName: "Ana Pérez",
        studentPhoneDigits: "5493512222222",
      }),
    ]);
    expect(ana).toMatchObject({
      fullName: "Ana Pérez",
      phoneDigits: "5493512222222",
    });
  });

  it("lists cancelled orders in the history but not as activities", () => {
    const [ana] = deriveStudents([
      studentOrder(1, { studentEmail: "ana@example.com", status: "cancelled" }),
      studentOrder(2, { studentEmail: "ana@example.com", status: "paid" }),
    ]);
    expect(ana?.orders).toHaveLength(2);
    expect(ana?.activities).toHaveLength(1);
    expect(ana?.activities[0]).toMatchObject({
      status: "paid",
      turnoLabel: "Martes 18:00 a 20:00",
      period: "2026-10",
    });
  });
});

describe("deriveStudents and material sales", () => {
  it("lists a sale in the order history with its kind, but never as a workshop or an activity", () => {
    const [ana] = deriveStudents([
      studentOrder(1, { studentEmail: "ana@example.com", status: "paid" }),
      studentOrder(2, {
        studentEmail: "ana@example.com",
        status: "pending_confirmation",
        kind: "material_sale",
        workshopId: "00000000-0000-4000-8000-0000000000bb",
        workshopName: "Otro taller",
      }),
    ]);

    expect(ana?.orders.map((order) => [order.number, order.kind])).toEqual([
      ["CI-2026-0002", "material_sale"],
      ["CI-2026-0001", undefined],
    ]);
    expect(ana?.activities).toHaveLength(1);
    expect(ana?.workshops.map((workshop) => workshop.name)).toEqual([
      "Cerámica inicial",
    ]);
  });

  it("takes the name, phone and last request from the newest non-sale order, even when a sale is newer", () => {
    const [ana] = deriveStudents([
      studentOrder(1, {
        studentEmail: "ana@example.com",
        studentName: "Ana Perez",
        studentPhoneDigits: "5493515550001",
        requestedAt: new Date("2026-10-05T15:00:00Z"),
      }),
      studentOrder(2, {
        studentEmail: "ana@example.com",
        studentName: "Ana Pérez",
        studentPhoneDigits: "5493515559999",
        requestedAt: new Date("2026-10-28T15:00:00Z"),
      }),
      studentOrder(3, {
        studentEmail: "ana@example.com",
        studentName: "Ana Perez",
        studentPhoneDigits: "5493515550001",
        requestedAt: new Date("2026-11-03T15:00:00Z"),
        kind: "material_sale",
      }),
    ]);

    expect(ana).toMatchObject({
      fullName: "Ana Pérez",
      phoneDigits: "5493515559999",
      lastRequestedAt: new Date("2026-10-28T15:00:00Z"),
    });
    expect(ana?.orders[0]?.kind).toBe("material_sale");
  });

  it("falls back to the newest order when the student only has sales", () => {
    const [ana] = deriveStudents([
      studentOrder(1, {
        studentEmail: "ana@example.com",
        studentName: "Ana Sale",
        kind: "material_sale",
      }),
    ]);

    expect(ana?.fullName).toBe("Ana Sale");
  });
});

describe("filterStudents", () => {
  const acuarela = "00000000-0000-4000-8000-000000000099";
  const profiles = deriveStudents([
    studentOrder(1, {
      studentEmail: "ana@example.com",
      studentName: "Ana Pérez",
      studentPhoneDigits: "5493515551234",
    }),
    studentOrder(2, {
      studentEmail: "bea@example.com",
      studentName: "Beatriz Gómez",
      workshopId: acuarela,
      workshopName: "Acuarela",
      status: "paid",
    }),
  ]);
  const emails = (list: readonly { email: string }[]) =>
    list.map((p) => p.email);

  it("lists the most recent student first when no filter is given", () => {
    expect(emails(filterStudents(profiles, {}))).toEqual([
      "bea@example.com",
      "ana@example.com",
    ]);
  });

  it("searches name, email and phone digits, ignoring case", () => {
    expect(emails(filterStudents(profiles, { text: "PÉREZ" }))).toEqual([
      "ana@example.com",
    ]);
    expect(emails(filterStudents(profiles, { text: "bea@" }))).toEqual([
      "bea@example.com",
    ]);
    expect(emails(filterStudents(profiles, { text: "351 555-1234" }))).toEqual([
      "ana@example.com",
    ]);
  });

  it("filters by workshop and by order status", () => {
    expect(emails(filterStudents(profiles, { workshopId: acuarela }))).toEqual([
      "bea@example.com",
    ]);
    expect(emails(filterStudents(profiles, { status: "paid" }))).toEqual([
      "bea@example.com",
    ]);
    expect(
      filterStudents(profiles, { workshopId: acuarela, status: "cancelled" }),
    ).toEqual([]);
  });
});

describe("validateNote", () => {
  it("trims and accepts an empty note", () => {
    expect(validateNote("  hola  ")).toEqual({ ok: true, value: "hola" });
    expect(validateNote("   ")).toEqual({ ok: true, value: "" });
  });

  it("refuses a note over the limit", () => {
    expect(validateNote("x".repeat(NOTE_MAX + 1))).toEqual({
      ok: false,
      error: { kind: "invalid", issues: [{ field: "note", code: "too-long" }] },
    });
  });
});

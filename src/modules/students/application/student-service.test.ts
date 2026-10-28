import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryStudentNoteRepository } from "~/testing/fakes/in-memory-student-note-repository";
import { InMemoryStudentOrderSource } from "~/testing/fakes/in-memory-student-order-source";
import { studentOrder } from "~/testing/fakes/student-builders";
import {
  createStudentsService,
  createUnavailableStudentsService,
} from "./student-service";

const now = new Date("2026-10-30T15:00:00Z");

function setup() {
  const orders = new InMemoryStudentOrderSource();
  const notes = new InMemoryStudentNoteRepository();
  const service = createStudentsService({
    orders,
    notes,
    clock: fixedClock(now),
  });
  return { orders, notes, service };
}

describe("students service", () => {
  it("denies every call without an admin actor", async () => {
    const { service } = setup();
    const denied = { ok: false, error: { kind: "denied" } };
    await expect(service.list(null)).resolves.toEqual(denied);
    await expect(service.detail(undefined, "a@b.co")).resolves.toEqual(denied);
    await expect(service.saveNote(null, "a@b.co", "x")).resolves.toEqual(
      denied,
    );
  });

  it("lists derived students with search, filters and paging", async () => {
    const { service, orders } = setup();
    orders.orders.push(
      ...Array.from({ length: 51 }, (_, i) => studentOrder(i + 1)),
    );

    const first = await service.list(testAdminActor());
    expect(first).toMatchObject({
      ok: true,
      value: { page: 1, pageSize: 50, hasNext: true },
    });
    const second = await service.list(testAdminActor(), { page: 2 });
    expect(second).toMatchObject({ ok: true, value: { hasNext: false } });
    const found = await service.list(testAdminActor(), { text: "student-7@" });
    expect(found.ok && found.value.items.map((s) => s.email)).toEqual([
      "student-7@example.com",
    ]);
  });

  it("returns the detail by email, merged across workshops, with its note", async () => {
    const { service, orders, notes } = setup();
    orders.orders.push(
      studentOrder(1, { studentEmail: "ana@example.com" }),
      studentOrder(2, { studentEmail: "Ana@example.com", status: "paid" }),
    );
    notes.notes.set("ana@example.com", {
      email: "ana@example.com",
      text: "Zurda.",
      updatedBy: "o@example.com",
      updatedAt: now,
    });

    const detail = await service.detail(testAdminActor(), " ANA@example.com");

    expect(detail).toMatchObject({
      ok: true,
      value: { email: "ana@example.com", note: { text: "Zurda." } },
    });
    expect(detail.ok && detail.value.orders).toHaveLength(2);
  });

  it("reports an unknown student as not found", async () => {
    const { service } = setup();
    const missing = { ok: false, error: { kind: "not-found" } };
    await expect(
      service.detail(testAdminActor(), "no@example.com"),
    ).resolves.toEqual(missing);
    await expect(
      service.saveNote(testAdminActor(), "no@example.com", "x"),
    ).resolves.toEqual(missing);
  });

  it("saves the trimmed note stamped with the actor and the clock", async () => {
    const { service, orders, notes } = setup();
    orders.orders.push(studentOrder(1, { studentEmail: "ana@example.com" }));

    const saved = await service.saveNote(
      testAdminActor("owner@example.com"),
      "ANA@example.com",
      "  Viene con su hermana.  ",
    );

    const expected = {
      email: "ana@example.com",
      text: "Viene con su hermana.",
      updatedBy: "owner@example.com",
      updatedAt: now,
    };
    expect(saved).toEqual({ ok: true, value: expected });
    expect(notes.notes.get("ana@example.com")).toEqual(expected);
  });

  it("refuses a note that is too long and stores nothing", async () => {
    const { service, orders, notes } = setup();
    orders.orders.push(studentOrder(1, { studentEmail: "ana@example.com" }));

    const refused = await service.saveNote(
      testAdminActor(),
      "ana@example.com",
      "x".repeat(2001),
    );

    expect(refused).toMatchObject({
      ok: false,
      error: { kind: "invalid", issues: [{ field: "note" }] },
    });
    expect(notes.notes.size).toBe(0);
  });

  it("fails closed as unavailable for an admin, denied otherwise", async () => {
    const unavailable = createUnavailableStudentsService();
    await expect(unavailable.list(testAdminActor())).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    await expect(unavailable.list(null)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });
});

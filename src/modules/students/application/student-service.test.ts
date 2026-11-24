import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { InMemoryStudentActivityStore } from "~/testing/fakes/enrollments-student-activity-store";
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
  const activity = new InMemoryStudentActivityStore();
  const service = createStudentsService({
    orders,
    notes,
    activity,
    clock: fixedClock(now),
  });
  return { orders, notes, activity, service };
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
    await expect(service.setActive(null, "a@b.co", false)).resolves.toEqual(
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

  it("lists each student with her material sales in her orders, though the registry listing never reads them", async () => {
    const { service, orders } = setup();
    orders.orders.push(
      studentOrder(1, { studentEmail: "ana@example.com", status: "paid" }),
      studentOrder(2, {
        studentEmail: "ana@example.com",
        kind: "material_sale",
        workshopName: "Venta",
      }),
      studentOrder(3, { studentEmail: "bea@example.com", status: "paid" }),
    );

    const listed = await service.list(testAdminActor());

    expect(listed.ok).toBe(true);
    const items = listed.ok ? listed.value.items : [];
    const kinds = (email: string) =>
      items
        .find((student) => student.email === email)
        ?.orders.map((order) => order.kind ?? "enrollment")
        .sort();
    expect(kinds("ana@example.com")).toEqual(["enrollment", "material_sale"]);
    expect(kinds("bea@example.com")).toEqual(["enrollment"]);
    // A sale is still never a workshop or an activity.
    expect(
      items.find((student) => student.email === "ana@example.com")?.activities,
    ).toHaveLength(1);
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

  it("shows the corrected name and phone in the detail even when a newer material sale carries the old snapshot", async () => {
    const { service, orders } = setup();
    orders.orders.push(
      studentOrder(1, {
        studentEmail: "ana@example.com",
        studentName: "Ana Perez",
        studentPhoneDigits: "5493515550001",
        requestedAt: new Date("2026-10-05T15:00:00Z"),
        period: "2026-10",
      }),
      studentOrder(2, {
        studentEmail: "ana@example.com",
        studentName: "Ana Pérez",
        studentPhoneDigits: "5493515559999",
        requestedAt: new Date("2026-10-28T15:00:00Z"),
        period: "2026-11",
      }),
      studentOrder(3, {
        studentEmail: "ana@example.com",
        studentName: "Ana Perez",
        studentPhoneDigits: "5493515550001",
        requestedAt: new Date("2026-11-03T15:00:00Z"),
        period: "2026-10",
        kind: "material_sale",
      }),
    );

    const detail = await service.detail(testAdminActor(), "ana@example.com");
    const list = await service.list(testAdminActor());

    expect(detail).toMatchObject({
      ok: true,
      value: { fullName: "Ana Pérez", phoneDigits: "5493515559999" },
    });
    expect(list).toMatchObject({
      ok: true,
      value: { items: [{ fullName: "Ana Pérez" }] },
    });
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

  describe("student activity", () => {
    const emailsOf = (
      page: Awaited<ReturnType<ReturnType<typeof setup>["service"]["list"]>>,
    ) => (page.ok ? page.value.items.map((s) => s.email) : []);

    function twoStudents() {
      const fixture = setup();
      fixture.orders.orders.push(
        studentOrder(1, { studentEmail: "ana@example.com", status: "paid" }),
        studentOrder(2, { studentEmail: "bea@example.com" }),
      );
      fixture.activity.enrolled("ana@example.com", "bea@example.com");
      return fixture;
    }

    it("deactivates and reactivates a student without touching her history or note", async () => {
      const { service, notes } = twoStudents();
      await service.saveNote(testAdminActor(), "ana@example.com", "Zurda.");
      const before = await service.detail(testAdminActor(), "ana@example.com");

      const off = await service.setActive(
        testAdminActor(),
        " Ana@Example.com ",
        false,
      );
      const inactive = await service.detail(
        testAdminActor(),
        "ana@example.com",
      );
      const on = await service.setActive(
        testAdminActor(),
        "ana@example.com",
        true,
      );
      const after = await service.detail(testAdminActor(), "ana@example.com");

      expect(off).toEqual({
        ok: true,
        value: { email: "ana@example.com", active: false },
      });
      expect(on).toEqual({
        ok: true,
        value: { email: "ana@example.com", active: true },
      });
      expect(inactive.ok && inactive.value.active).toBe(false);
      expect(after.ok && after.value.active).toBe(true);
      expect(inactive.ok && inactive.value.orders).toEqual(
        before.ok && before.value.orders,
      );
      expect(after.ok && after.value).toEqual(before.ok && before.value);
      expect(notes.notes.get("ana@example.com")?.text).toBe("Zurda.");
    });

    it("lists the active students by default and filters inactive or all, with the state on each", async () => {
      const { service } = twoStudents();
      await service.setActive(testAdminActor(), "ana@example.com", false);

      const byDefault = await service.list(testAdminActor());
      const inactive = await service.list(testAdminActor(), {
        activity: "inactive",
      });
      const all = await service.list(testAdminActor(), { activity: "all" });

      expect(emailsOf(byDefault)).toEqual(["bea@example.com"]);
      expect(byDefault.ok && byDefault.value.items[0]?.active).toBe(true);
      expect(emailsOf(inactive)).toEqual(["ana@example.com"]);
      expect(inactive.ok && inactive.value.items[0]?.active).toBe(false);
      expect(all.ok && all.value.items.map((s) => [s.email, s.active])).toEqual(
        [
          ["bea@example.com", true],
          ["ana@example.com", false],
        ],
      );
    });

    it("keeps search and paging working inside the chosen view", async () => {
      const { service, orders, activity } = setup();
      orders.orders.push(
        ...Array.from({ length: 52 }, (_, i) => studentOrder(i + 1)),
      );
      activity.enrolled(...orders.orders.map((order) => order.studentEmail));
      await service.setActive(testAdminActor(), "student-7@example.com", false);

      const first = await service.list(testAdminActor());
      const found = await service.list(testAdminActor(), {
        text: "student-7@",
        activity: "inactive",
      });
      const hidden = await service.list(testAdminActor(), {
        text: "student-7@",
      });

      expect(first).toMatchObject({
        ok: true,
        value: { page: 1, hasNext: true },
      });
      expect(first.ok && first.value.items).toHaveLength(50);
      expect(emailsOf(found)).toEqual(["student-7@example.com"]);
      expect(emailsOf(hidden)).toEqual([]);
    });

    it("counts a student without a profile row as active and cannot deactivate her", async () => {
      const { service, orders } = setup();
      orders.orders.push(studentOrder(1, { studentEmail: "ana@example.com" }));

      const listedOnly = await service.list(testAdminActor());
      const off = await service.setActive(
        testAdminActor(),
        "ana@example.com",
        false,
      );
      const on = await service.setActive(
        testAdminActor(),
        "ana@example.com",
        true,
      );
      const unknown = await service.setActive(
        testAdminActor(),
        "no@example.com",
        true,
      );

      expect(listedOnly.ok && listedOnly.value.items[0]?.active).toBe(true);
      expect(off).toEqual({ ok: false, error: { kind: "not-found" } });
      expect(on).toEqual({
        ok: true,
        value: { email: "ana@example.com", active: true },
      });
      expect(unknown).toEqual({ ok: false, error: { kind: "not-found" } });
    });
  });

  it("fails closed as unavailable for an admin, denied otherwise", async () => {
    const unavailable = createUnavailableStudentsService();
    await expect(unavailable.list(testAdminActor())).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    await expect(
      unavailable.setActive(testAdminActor(), "a@b.co", false),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
    await expect(unavailable.list(null)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });
});

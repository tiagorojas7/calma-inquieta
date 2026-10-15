import { describe, expect, it } from "vitest";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import { InMemoryTeacherRepository } from "~/testing/fakes/in-memory-teacher-repository";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { err } from "~/modules/_shared";
import { createTeacherLookup, createTeachersService } from "./teacher-service";
import type { TeacherRepository } from "./teacher-repository";
import type { TeacherDraft } from "./teachers";

const START = new Date("2026-10-14T12:00:00.000Z");
const owner = testAdminActor("owner@example.com");
const other = testAdminActor("other@example.com");

const draft = (overrides: Partial<TeacherDraft> = {}): TeacherDraft => ({
  name: "Lucía Pérez",
  bioLine: "Ceramista",
  phone: "",
  email: "",
  modality: "own",
  ...overrides,
});

function setup() {
  const repository = new InMemoryTeacherRepository();
  const clock = advancingClock(START);
  let counter = 0;
  const service = createTeachersService({
    repository,
    clock,
    newId: () => `id-${String(++counter)}`,
  });
  return { repository, clock, service };
}

const duplicateNameResult = {
  ok: false,
  error: { kind: "invalid", issues: [{ field: "name", code: "duplicate" }] },
};

/**
 * Simulates a lost race: the duplicate pre-check passes, then another request
 * takes the name and the write hits the unique index.
 */
function setupLostRace() {
  const inner = new InMemoryTeacherRepository();
  const losing: TeacherRepository = {
    insert: () => Promise.resolve(err({ kind: "name-conflict" })),
    update: () => Promise.resolve(err({ kind: "name-conflict" })),
    findById: (id) => inner.findById(id),
    findByIds: (ids) => inner.findByIds(ids),
    findActiveByName: (name) => inner.findActiveByName(name),
    list: (filter) => inner.list(filter),
  };
  const honest = createTeachersService({
    repository: inner,
    clock: advancingClock(START),
    newId: () => "seed",
  });
  let counter = 0;
  const service = createTeachersService({
    repository: losing,
    clock: advancingClock(START),
    newId: () => `race-${String(++counter)}`,
  });
  return { inner, honest, service };
}

describe("lost race on the active-name unique index", () => {
  it("maps a conflicting create to the duplicate-name result", async () => {
    const { service } = setupLostRace();

    expect(await service.create(owner, draft())).toEqual(duplicateNameResult);
  });

  it("maps a conflicting update to the duplicate-name result", async () => {
    const { honest, service } = setupLostRace();
    const seeded = valueOf(await honest.create(owner, draft()));

    expect(
      await service.update(owner, seeded.id, draft({ name: "Otra" })),
    ).toEqual(duplicateNameResult);
  });

  it("maps a conflicting reactivate to the duplicate-name result", async () => {
    const { honest, service } = setupLostRace();
    const seeded = valueOf(await honest.create(owner, draft()));
    await honest.archive(owner, seeded.id);

    expect(await service.reactivate(owner, seeded.id)).toEqual(
      duplicateNameResult,
    );
  });
});

function valueOf<T>(result: { ok: boolean; value?: T }): T {
  if (!result.ok || result.value === undefined)
    throw new Error("expected an ok result");
  return result.value;
}

describe("create", () => {
  it("stores an active teacher audited with the actor email", async () => {
    const { repository, service } = setup();

    const result = await service.create(owner, draft({ name: "  Lucía  " }));

    expect(result).toEqual({
      ok: true,
      value: {
        id: "id-1",
        name: "Lucía",
        bioLine: "Ceramista",
        phone: null,
        email: null,
        modality: "own",
        active: true,
        audit: { updatedBy: "owner@example.com", updatedAt: START },
      },
    });
    expect(repository.teachers.get("id-1")).toEqual(valueOf(result));
  });

  it("names the field and stores nothing when the draft is invalid", async () => {
    const { repository, service } = setup();

    const result = await service.create(owner, draft({ name: "   " }));

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "name", code: "required" }],
      },
    });
    expect(repository.teachers.size).toBe(0);
  });

  it("refuses a duplicate active name ignoring case", async () => {
    const { repository, service } = setup();
    await service.create(owner, draft());

    const result = await service.create(owner, draft({ name: "lucía pérez" }));

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "name", code: "duplicate" }],
      },
    });
    expect(repository.teachers.size).toBe(1);
  });

  it("reports validation and duplicate issues together", async () => {
    const { service } = setup();
    await service.create(owner, draft());

    const result = await service.create(
      owner,
      draft({ name: "LUCÍA PÉREZ", email: "nope" }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        issues: [
          { field: "email", code: "invalid-format" },
          { field: "name", code: "duplicate" },
        ],
      },
    });
  });

  it("allows the name again once the first teacher is archived", async () => {
    const { service } = setup();
    const first = valueOf(await service.create(owner, draft()));
    await service.archive(owner, first.id);

    const again = await service.create(owner, draft());

    expect(again).toMatchObject({ ok: true, value: { active: true } });
  });
});

describe("update", () => {
  it("changes the fields and refreshes the audit", async () => {
    const { clock, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    clock.advance(60_000);

    const result = await service.update(
      other,
      created.id,
      draft({ bioLine: "Nueva bio", modality: "third_party" }),
    );

    expect(result).toEqual({
      ok: true,
      value: {
        ...created,
        bioLine: "Nueva bio",
        modality: "third_party",
        audit: {
          updatedBy: "other@example.com",
          updatedAt: new Date(START.getTime() + 60_000),
        },
      },
    });
  });

  it("accepts the teacher's own name unchanged apart from case", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));

    const result = await service.update(
      owner,
      created.id,
      draft({ name: "LUCÍA PÉREZ" }),
    );

    expect(result).toMatchObject({ ok: true, value: { name: "LUCÍA PÉREZ" } });
  });

  it("refuses a name another active teacher holds", async () => {
    const { service } = setup();
    await service.create(owner, draft());
    const second = valueOf(
      await service.create(owner, draft({ name: "Beto" })),
    );

    const result = await service.update(
      owner,
      second.id,
      draft({ name: "lucía pérez" }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "name", code: "duplicate" }],
      },
    });
  });

  it("lets an archived teacher take an active name and keeps her archived", async () => {
    const { service } = setup();
    await service.create(owner, draft());
    const second = valueOf(
      await service.create(owner, draft({ name: "Beto" })),
    );
    await service.archive(owner, second.id);

    const result = await service.update(
      owner,
      second.id,
      draft({ name: "Lucía Pérez" }),
    );

    expect(result).toMatchObject({ ok: true, value: { active: false } });
  });

  it("reports an unknown teacher and an invalid draft", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));

    expect(await service.update(owner, "missing", draft())).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
    expect(
      await service.update(owner, created.id, draft({ phone: "abc" })),
    ).toMatchObject({
      ok: false,
      error: { issues: [{ field: "phone", code: "invalid-format" }] },
    });
  });
});

describe("archive and reactivate", () => {
  it("archives with the actor audit and keeps the record readable", async () => {
    const { clock, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    clock.advance(1000);

    const archived = await service.archive(other, created.id);

    expect(archived).toMatchObject({
      ok: true,
      value: {
        active: false,
        name: "Lucía Pérez",
        audit: { updatedBy: "other@example.com" },
      },
    });
    expect(await service.get(owner, created.id)).toEqual(archived);
  });

  it("succeeds without any assignment gate: the warning is built from the assignments side", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));

    expect(await service.archive(owner, created.id)).toMatchObject({
      ok: true,
    });
  });

  it("does not write again when the teacher is already in the requested state", async () => {
    const { clock, repository, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    await service.archive(owner, created.id);
    const before = repository.teachers.get(created.id);
    clock.advance(1000);

    expect(await service.archive(other, created.id)).toMatchObject({
      ok: true,
    });
    expect(repository.teachers.get(created.id)).toBe(before);
    await service.reactivate(owner, created.id);
    const active = repository.teachers.get(created.id);
    expect(await service.reactivate(other, created.id)).toMatchObject({
      ok: true,
    });
    expect(repository.teachers.get(created.id)).toBe(active);
  });

  it("reactivates an archived teacher", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    await service.archive(owner, created.id);

    expect(await service.reactivate(other, created.id)).toMatchObject({
      ok: true,
      value: { active: true, audit: { updatedBy: "other@example.com" } },
    });
  });

  it("refuses to reactivate onto a name an active teacher now holds", async () => {
    const { service } = setup();
    const first = valueOf(await service.create(owner, draft()));
    await service.archive(owner, first.id);
    await service.create(owner, draft());

    expect(await service.reactivate(owner, first.id)).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "name", code: "duplicate" }],
      },
    });
  });

  it("reports an unknown teacher", async () => {
    const { service } = setup();

    expect(await service.archive(owner, "missing")).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
    expect(await service.reactivate(owner, "missing")).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });
});

describe("list and get", () => {
  it("filters active and archived teachers ordered by name", async () => {
    const { service } = setup();
    await service.create(owner, draft({ name: "Beto" }));
    await service.create(owner, draft({ name: "Ana" }));
    const carla = valueOf(
      await service.create(owner, draft({ name: "Carla" })),
    );
    await service.archive(owner, carla.id);

    const names = async (filter: "active" | "archived" | "all") =>
      valueOf(await service.list(owner, filter)).map((t) => t.name);

    expect(await names("active")).toEqual(["Ana", "Beto"]);
    expect(await names("archived")).toEqual(["Carla"]);
    expect(await names("all")).toEqual(["Ana", "Beto", "Carla"]);
  });

  it("reports an unknown id", async () => {
    const { service } = setup();

    expect(await service.get(owner, "missing")).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });
});

describe("absent actor", () => {
  it.each([null, undefined])(
    "denies every use case for %s without touching the repository",
    async (actor) => {
      const { repository, service } = setup();
      const calls: string[] = [];
      for (const method of [
        "insert",
        "update",
        "findById",
        "findByIds",
        "findActiveByName",
        "list",
      ] as const) {
        const original = repository[method].bind(repository) as (
          ...args: never[]
        ) => unknown;
        Object.assign(repository, {
          [method]: (...args: never[]) => {
            calls.push(method);
            return original(...args);
          },
        });
      }
      const denied = { ok: false, error: { kind: "denied" } };

      expect(await service.list(actor, "all")).toEqual(denied);
      expect(await service.get(actor, "id-1")).toEqual(denied);
      expect(await service.create(actor, draft())).toEqual(denied);
      expect(await service.update(actor, "id-1", draft())).toEqual(denied);
      expect(await service.archive(actor, "id-1")).toEqual(denied);
      expect(await service.reactivate(actor, "id-1")).toEqual(denied);
      expect(calls).toEqual([]);
    },
  );
});

describe("createTeacherLookup", () => {
  it("returns archived teachers too so past records keep their name", async () => {
    const { repository, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    await service.archive(owner, created.id);

    const found = await createTeacherLookup(repository).findByIds([
      created.id,
      "missing",
    ]);

    expect([...found.keys()]).toEqual([created.id]);
    expect(found.get(created.id)).toMatchObject({
      name: "Lucía Pérez",
      active: false,
    });
  });
});

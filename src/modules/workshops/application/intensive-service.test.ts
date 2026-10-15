import { describe, expect, it } from "vitest";
import type { MediaLookup } from "~/modules/media";
import { createTeacherLookup, type Teacher } from "~/modules/teachers";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { buildMediaAsset, buildTeacher } from "~/testing/fakes/admin-builders";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import { InMemoryIntensiveRepository } from "~/testing/fakes/in-memory-intensive-repository";
import { InMemoryTeacherRepository } from "~/testing/fakes/in-memory-teacher-repository";
import type { IntensiveWorkshop, IntensiveWorkshopDraft } from "./contracts";
import { createIntensivesService } from "./intensive-service";

const START = new Date("2026-10-14T12:00:00.000Z");
const owner = testAdminActor("owner@example.com");
const other = testAdminActor("other@example.com");

const OWN = buildTeacher({ id: "t-own", name: "Cami", modality: "own" });
const PAID = buildTeacher({
  id: "t-paid",
  name: "Lucía",
  modality: "third_party",
});
const OLD = buildTeacher({
  id: "t-old",
  name: "Beto",
  modality: "third_party",
  active: false,
});

const draft = (
  overrides: Partial<IntensiveWorkshopDraft> = {},
): IntensiveWorkshopDraft => ({
  name: "Cerámica de fin de semana",
  slug: "",
  summary: "Un día de torno",
  description: "Descripción larga",
  teacherId: "t-paid",
  percentage: "50",
  eventDate: "2026-11-07",
  startsAt: "10:00",
  endsAt: "18:00",
  price: "30000",
  deposit: "10000",
  capacity: "8",
  minSeats: "4",
  policyText: "Cancelación hasta 48 horas antes.",
  materialsIncluded: false,
  images: [],
  ...overrides,
});

function setup(teachers: readonly Teacher[] = [OWN, PAID, OLD]) {
  const repository = new InMemoryIntensiveRepository();
  const teacherRepository = new InMemoryTeacherRepository();
  for (const teacher of teachers)
    teacherRepository.teachers.set(teacher.id, teacher);
  const assets = new Map(
    ["a1", "a2", "a3", "a4", "a5", "a6", "a7"].map((id) => [
      id,
      buildMediaAsset({ id }),
    ]),
  );
  const media: MediaLookup = {
    findAssets: (ids) =>
      Promise.resolve(
        new Map(
          ids.flatMap((id) => {
            const asset = assets.get(id);
            return asset ? [[id, asset] as const] : [];
          }),
        ),
      ),
  };
  const clock = advancingClock(START);
  let counter = 0;
  const service = createIntensivesService({
    repository,
    teachers: createTeacherLookup(teacherRepository),
    media,
    clock,
    newId: () => `id-${String(++counter)}`,
  });
  return { repository, teacherRepository, clock, service };
}

function valueOf<T>(result: { ok: boolean; value?: T }): T {
  if (!result.ok || result.value === undefined)
    throw new Error("expected an ok result");
  return result.value;
}

/** Plain view of a read model: Money hides its field from toEqual. */
const plain = (i: IntensiveWorkshop) => ({
  ...i,
  price: i.price.toCentavos(),
  deposit: i.deposit.toCentavos(),
});

const invalid = (...issues: { field: string; code: string }[]) => ({
  ok: false,
  error: { kind: "invalid", issues },
});

describe("create", () => {
  it("stores a draft audited with the actor email and returns the read model", async () => {
    const { repository, service } = setup();
    const result = await service.create(
      owner,
      draft({
        images: [{ assetId: "a2", alt: "  Torno  " }],
      }),
    );
    const created = valueOf(result);
    expect(plain(created)).toEqual({
      id: "id-1",
      slug: "ceramica-de-fin-de-semana",
      name: "Cerámica de fin de semana",
      summary: "Un día de torno",
      description: "Descripción larga",
      assignment: {
        teacher: { id: "t-paid", name: "Lucía", active: true },
        percentage: { basisPoints: 5000 },
      },
      eventDate: "2026-11-07",
      startsAt: "10:00",
      endsAt: "18:00",
      price: 3_000_000,
      deposit: 1_000_000,
      capacity: 8,
      minSeats: 4,
      policyText: "Cancelación hasta 48 horas antes.",
      materialsIncluded: false,
      images: [
        { assetId: "a2", alt: "Torno", asset: buildMediaAsset({ id: "a2" }) },
      ],
      status: "draft",
      audit: { updatedBy: "owner@example.com", updatedAt: START },
    });
    expect(repository.items.get("id-1")).toMatchObject({
      teacherId: "t-paid",
      percentage: { basisPoints: 5000 },
      images: [{ assetId: "a2", alt: "Torno" }],
    });
  });

  it("keeps an explicit slug and an unassigned draft", async () => {
    const { service } = setup();
    const created = valueOf(
      await service.create(
        owner,
        draft({ slug: " torno-doble ", teacherId: "", percentage: "" }),
      ),
    );
    expect(created).toMatchObject({ slug: "torno-doble", assignment: null });
  });

  it("derives the slug from the name, dropping accents and symbols", async () => {
    const { service } = setup();
    const created = valueOf(
      await service.create(owner, draft({ name: "  ¡Ñandú & Arcilla!  " })),
    );
    expect(created.slug).toBe("nandu-arcilla");
    expect(created.name).toBe("¡Ñandú & Arcilla!");
  });

  it("asks for a slug when the name leaves nothing to derive one from", async () => {
    const { repository, service } = setup();
    expect(await service.create(owner, draft({ name: "¿¿??" }))).toEqual(
      invalid({ field: "slug", code: "required" }),
    );
    expect(repository.items.size).toBe(0);
  });

  it("names the field and stores nothing when the draft is invalid", async () => {
    const { repository, service } = setup();
    expect(await service.create(owner, draft({ deposit: "30001" }))).toEqual(
      invalid({ field: "deposit", code: "exceeds-price" }),
    );
    expect(repository.items.size).toBe(0);
  });

  it("allows a draft dated in the past", async () => {
    const { service } = setup();
    expect(
      await service.create(owner, draft({ eventDate: "2020-01-04" })),
    ).toMatchObject({ ok: true });
  });

  it("reports core, assignment, gallery and slug issues together", async () => {
    const { service } = setup();
    await service.create(owner, draft({ slug: "torno" }));
    const result = await service.create(
      owner,
      draft({
        slug: "torno",
        price: "",
        teacherId: "t-old",
        percentage: "1",
        images: [{ assetId: "nope", alt: "x" }],
      }),
    );
    expect(result).toEqual(
      invalid(
        { field: "price", code: "required" },
        { field: "teacherId", code: "not-selectable" },
        { field: "images", code: "unknown-reference" },
        { field: "slug", code: "duplicate" },
      ),
    );
  });

  it("refuses a duplicate slug across every status, archived included", async () => {
    const { service } = setup();
    const first = valueOf(
      await service.create(owner, draft({ slug: "torno" })),
    );
    await service.archive(owner, first.id);
    expect(await service.create(owner, draft({ slug: "torno" }))).toEqual(
      invalid({ field: "slug", code: "duplicate" }),
    );
  });

  it("maps a uniqueness conflict raised by the repository to the duplicate result", async () => {
    const { repository, service } = setup();
    await service.create(owner, draft({ slug: "torno" }));
    // The pre-check passes (a concurrent writer won the race): the port reports the conflict.
    repository.findBySlug = () => Promise.resolve(null);
    expect(await service.create(owner, draft({ slug: "torno" }))).toEqual(
      invalid({ field: "slug", code: "duplicate" }),
    );
    expect(repository.items.size).toBe(1);
  });
});

describe("assignment", () => {
  const create = async (overrides: Partial<IntensiveWorkshopDraft>) => {
    const { service } = setup();
    return service.create(owner, draft(overrides));
  };

  it("stores 33,33 typed with a comma as exactly 3333 basis points", async () => {
    const created = valueOf(await create({ percentage: " 33,33 " }));
    expect(created.assignment?.percentage).toEqual({ basisPoints: 3333 });
  });

  it("stores 0 and 100 exactly", async () => {
    expect(
      valueOf(await create({ percentage: "0" })).assignment?.percentage,
    ).toEqual({ basisPoints: 0 });
    expect(
      valueOf(await create({ percentage: "100" })).assignment?.percentage,
    ).toEqual({ basisPoints: 10000 });
  });

  it.each([
    ["101", "out-of-range"],
    ["33.333", "too-many-decimals"],
    ["abc", "invalid-format"],
    ["", "required"],
  ])(
    "refuses the percentage %j of a third-party teacher",
    async (percentage, code) => {
      expect(await create({ percentage })).toEqual(
        invalid({ field: "percentage", code }),
      );
    },
  );

  it("accepts an own teacher with no percentage and stores none", async () => {
    const created = valueOf(
      await create({ teacherId: "t-own", percentage: "  " }),
    );
    expect(created.assignment).toEqual({
      teacher: { id: "t-own", name: "Cami", active: true },
      percentage: null,
    });
  });

  it("refuses a percentage for an own teacher", async () => {
    expect(await create({ teacherId: "t-own", percentage: "10" })).toEqual(
      invalid({ field: "percentage", code: "percentage-not-applicable" }),
    );
  });

  it("refuses a percentage without a teacher", async () => {
    expect(await create({ teacherId: " ", percentage: "10" })).toEqual(
      invalid({ field: "teacherId", code: "required" }),
    );
  });

  it("refuses an unknown and an archived teacher", async () => {
    expect(await create({ teacherId: "ghost" })).toEqual(
      invalid({ field: "teacherId", code: "unknown-reference" }),
    );
    expect(await create({ teacherId: "t-old" })).toEqual(
      invalid({ field: "teacherId", code: "not-selectable" }),
    );
  });

  it("keeps an archived teacher already assigned but refuses a new archived one", async () => {
    const { teacherRepository, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    teacherRepository.teachers.set("t-paid", { ...PAID, active: false });
    const edited = await service.update(
      owner,
      created.id,
      draft({ price: "31000" }),
    );
    expect(edited).toMatchObject({
      ok: true,
      value: { assignment: { teacher: { id: "t-paid", active: false } } },
    });
    expect(
      await service.update(owner, created.id, draft({ teacherId: "t-old" })),
    ).toEqual(invalid({ field: "teacherId", code: "not-selectable" }));
  });

  it("clears the assignment when the teacher is removed", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    expect(
      await service.update(
        owner,
        created.id,
        draft({ teacherId: "", percentage: "" }),
      ),
    ).toMatchObject({ ok: true, value: { assignment: null } });
  });

  it("returns no assignment when the stored teacher can no longer be resolved", async () => {
    const { teacherRepository, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    teacherRepository.teachers.clear();
    expect(await service.get(owner, created.id)).toMatchObject({
      ok: true,
      value: { assignment: null },
    });
  });
});

describe("gallery", () => {
  it("replaces the whole list and keeps its order", async () => {
    const { service } = setup();
    const created = valueOf(
      await service.create(
        owner,
        draft({
          images: [
            { assetId: "a1", alt: "Uno" },
            { assetId: "a2", alt: "Dos" },
          ],
        }),
      ),
    );
    const updated = valueOf(
      await service.update(
        owner,
        created.id,
        draft({
          images: [
            { assetId: "a2", alt: "Dos" },
            { assetId: "a3", alt: "Tres" },
          ],
        }),
      ),
    );
    expect(updated.images.map((image) => image.assetId)).toEqual(["a2", "a3"]);
  });

  it("refuses more than 6 images, a blank alt, duplicates and an alt over 200", async () => {
    const { service } = setup();
    const images = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        assetId: `a${String(i + 1)}`,
        alt: "x",
      }));
    expect(await service.create(owner, draft({ images: images(7) }))).toEqual(
      invalid({ field: "images", code: "too-many" }),
    );
    expect(
      await service.create(
        owner,
        draft({ images: [{ assetId: "a1", alt: "   " }] }),
      ),
    ).toEqual(invalid({ field: "images", code: "required" }));
    expect(
      await service.create(
        owner,
        draft({
          images: [
            { assetId: "a1", alt: "x" },
            { assetId: "a1", alt: "y" },
          ],
        }),
      ),
    ).toEqual(invalid({ field: "images", code: "duplicate" }));
    expect(
      await service.create(
        owner,
        draft({ images: [{ assetId: "a1", alt: "x".repeat(201) }] }),
      ),
    ).toEqual(invalid({ field: "images", code: "too-long" }));
    expect(
      await service.create(
        owner,
        draft({ images: [{ assetId: "a1", alt: "x".repeat(200) }] }),
      ),
    ).toMatchObject({ ok: true });
  });

  it("shows an image whose asset is gone as 'sin imagen'", async () => {
    const { repository, service } = setup();
    const created = valueOf(
      await service.create(
        owner,
        draft({ images: [{ assetId: "a1", alt: "Uno" }] }),
      ),
    );
    const stored = repository.items.get(created.id);
    if (!stored) throw new Error("missing");
    repository.items.set(created.id, {
      ...stored,
      images: [{ assetId: "gone", alt: "Uno" }],
    });
    expect(valueOf(await service.get(owner, created.id)).images).toEqual([
      { assetId: "gone", alt: "Uno", asset: null },
    ]);
  });
});

describe("update", () => {
  it("changes the fields, keeps id and status and refreshes the audit", async () => {
    const { clock, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    clock.advance(60_000);
    const result = await service.update(
      other,
      created.id,
      draft({ name: "Nuevo nombre", slug: created.slug, capacity: "10" }),
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        id: created.id,
        name: "Nuevo nombre",
        capacity: 10,
        status: "draft",
        audit: {
          updatedBy: "other@example.com",
          updatedAt: new Date(START.getTime() + 60_000),
        },
      },
    });
  });

  it("refuses a price lowered below the deposit", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    expect(
      await service.update(owner, created.id, draft({ price: "8000" })),
    ).toEqual(invalid({ field: "deposit", code: "exceeds-price" }));
  });

  it("accepts the intensivo's own slug and refuses another one's", async () => {
    const { service } = setup();
    const first = valueOf(await service.create(owner, draft({ slug: "uno" })));
    valueOf(await service.create(owner, draft({ slug: "dos" })));
    expect(
      await service.update(owner, first.id, draft({ slug: "uno" })),
    ).toMatchObject({ ok: true });
    expect(
      await service.update(owner, first.id, draft({ slug: "dos" })),
    ).toEqual(invalid({ field: "slug", code: "duplicate" }));
  });

  it("maps a repository uniqueness conflict on update to the duplicate result", async () => {
    const { repository, service } = setup();
    const first = valueOf(await service.create(owner, draft({ slug: "uno" })));
    await service.create(owner, draft({ slug: "dos" }));
    repository.findBySlug = () => Promise.resolve(null);
    expect(
      await service.update(owner, first.id, draft({ slug: "dos" })),
    ).toEqual(invalid({ field: "slug", code: "duplicate" }));
    expect(repository.items.get(first.id)?.slug).toBe("uno");
  });

  it("reports an unknown intensivo before validating", async () => {
    const { service } = setup();
    expect(
      await service.update(owner, "missing", draft({ price: "" })),
    ).toEqual({ ok: false, error: { kind: "not-found" } });
  });

  it("applies the future rule when a published intensivo's schedule changes", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    valueOf(await service.publish(owner, created.id));
    expect(
      await service.update(
        owner,
        created.id,
        draft({ slug: created.slug, eventDate: "2026-10-01" }),
      ),
    ).toEqual(invalid({ field: "eventDate", code: "in-past" }));
  });

  it("lets a published intensivo keep an unchanged schedule that has since passed", async () => {
    const { clock, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    valueOf(await service.publish(owner, created.id));
    clock.advance(40 * 24 * 3600 * 1000);
    expect(
      await service.update(
        owner,
        created.id,
        draft({ slug: created.slug, capacity: "9" }),
      ),
    ).toMatchObject({ ok: true, value: { capacity: 9, status: "published" } });
  });

  it.each(["published", "paused"] as const)(
    "refuses an update that clears the teacher of a %s intensivo and persists nothing",
    async (status) => {
      const { repository, service } = setup();
      const created = valueOf(await service.create(owner, draft()));
      valueOf(await service.publish(owner, created.id));
      if (status === "paused") valueOf(await service.pause(owner, created.id));
      const before = repository.items.get(created.id);

      expect(
        await service.update(
          owner,
          created.id,
          draft({
            slug: created.slug,
            name: "Otro nombre",
            teacherId: "",
            percentage: "",
          }),
        ),
      ).toEqual({
        ok: false,
        error: { kind: "rules-unmet", rules: ["teacher"] },
      });
      expect(repository.items.get(created.id)).toBe(before);
    },
  );

  it("keeps refusing a missing percentage of a third-party teacher on a published intensivo", async () => {
    const { repository, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    valueOf(await service.publish(owner, created.id));
    const before = repository.items.get(created.id);

    expect(
      await service.update(
        owner,
        created.id,
        draft({ slug: created.slug, percentage: "" }),
      ),
    ).toEqual(invalid({ field: "percentage", code: "required" }));
    expect(repository.items.get(created.id)).toBe(before);
  });

  it.each(["published", "paused"] as const)(
    "keeps a %s intensivo editable after its assigned teacher was archived",
    async (status) => {
      const { teacherRepository, service } = setup();
      const created = valueOf(await service.create(owner, draft()));
      valueOf(await service.publish(owner, created.id));
      if (status === "paused") valueOf(await service.pause(owner, created.id));
      teacherRepository.teachers.set("t-paid", { ...PAID, active: false });

      expect(
        await service.update(
          owner,
          created.id,
          draft({ slug: created.slug, description: "Descripción corregida" }),
        ),
      ).toMatchObject({
        ok: true,
        value: { description: "Descripción corregida", status },
      });
    },
  );

  it("still refuses to clear or change the percentage of an archived teacher's published intensivo", async () => {
    const { teacherRepository, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    valueOf(await service.publish(owner, created.id));
    teacherRepository.teachers.set("t-paid", { ...PAID, active: false });

    expect(
      await service.update(
        owner,
        created.id,
        draft({ slug: created.slug, teacherId: "", percentage: "" }),
      ),
    ).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["teacher"] },
    });
    expect(
      await service.update(
        owner,
        created.id,
        draft({ slug: created.slug, percentage: "60" }),
      ),
    ).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["teacher"] },
    });
  });

  it("reports field issues before unmet publish rules", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    valueOf(await service.publish(owner, created.id));

    expect(
      await service.update(
        owner,
        created.id,
        draft({ slug: created.slug, teacherId: "", percentage: "", price: "" }),
      ),
    ).toMatchObject({ ok: false, error: { kind: "invalid" } });
  });

  it("does not re-check the future start on an edit that keeps the schedule", async () => {
    const { clock, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    valueOf(await service.publish(owner, created.id));
    clock.advance(40 * 24 * 3600 * 1000);

    expect(
      await service.update(
        owner,
        created.id,
        draft({ slug: created.slug, name: "Ya ocurrió" }),
      ),
    ).toMatchObject({ ok: true, value: { name: "Ya ocurrió" } });
  });

  it.each(["draft", "cancelled", "archived"] as const)(
    "lets a %s intensivo drop its teacher",
    async (status) => {
      const { service } = setup();
      const created = valueOf(await service.create(owner, draft()));
      if (status === "cancelled") {
        valueOf(await service.publish(owner, created.id));
        valueOf(await service.cancel(owner, created.id));
      } else if (status === "archived")
        valueOf(await service.archive(owner, created.id));

      expect(
        await service.update(
          owner,
          created.id,
          draft({ slug: created.slug, teacherId: "", percentage: "" }),
        ),
      ).toMatchObject({ ok: true, value: { assignment: null, status } });
    },
  );

  it("lets a draft change to a past date", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    expect(
      await service.update(
        owner,
        created.id,
        draft({ slug: created.slug, eventDate: "2020-01-04" }),
      ),
    ).toMatchObject({ ok: true });
  });
});

describe("reschedule", () => {
  const move = { eventDate: "2026-11-14", startsAt: "09:00", endsAt: "13:00" };

  it("moves a published intensivo keeping the record, slug and status", async () => {
    const { clock, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    valueOf(await service.publish(owner, created.id));
    clock.advance(1000);
    const result = await service.reschedule(other, created.id, move);
    expect(result).toMatchObject({
      ok: true,
      value: {
        id: created.id,
        slug: created.slug,
        status: "published",
        ...move,
        audit: { updatedBy: "other@example.com" },
      },
    });
  });

  it.each(["published", "paused"] as const)(
    "refuses a past start on a %s intensivo naming the date",
    async (status) => {
      const { service } = setup();
      const created = valueOf(await service.create(owner, draft()));
      valueOf(await service.publish(owner, created.id));
      if (status === "paused") valueOf(await service.pause(owner, created.id));
      expect(
        await service.reschedule(owner, created.id, {
          ...move,
          eventDate: "2026-10-14",
          startsAt: "08:00",
          endsAt: "09:00",
        }),
      ).toEqual(invalid({ field: "eventDate", code: "in-past" }));
    },
  );

  it("measures the future in Córdoba time, not UTC", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    valueOf(await service.publish(owner, created.id));
    // START is 09:00 in Córdoba on 2026-10-14.
    expect(
      await service.reschedule(owner, created.id, {
        eventDate: "2026-10-14",
        startsAt: "09:00",
        endsAt: "10:00",
      }),
    ).toMatchObject({ ok: false });
    expect(
      await service.reschedule(owner, created.id, {
        eventDate: "2026-10-14",
        startsAt: "09:01",
        endsAt: "10:00",
      }),
    ).toMatchObject({ ok: true });
  });

  it.each(["draft", "cancelled", "archived"] as const)(
    "allows a past date on a %s intensivo",
    async (status) => {
      const { service } = setup();
      const created = valueOf(await service.create(owner, draft()));
      if (status !== "draft") {
        valueOf(await service.publish(owner, created.id));
        if (status === "cancelled")
          valueOf(await service.cancel(owner, created.id));
        else valueOf(await service.archive(owner, created.id));
      }
      expect(
        await service.reschedule(owner, created.id, {
          ...move,
          eventDate: "2020-01-04",
        }),
      ).toMatchObject({ ok: true, value: { eventDate: "2020-01-04", status } });
    },
  );

  it("applies the range and single-date rules", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    expect(
      await service.reschedule(owner, created.id, {
        eventDate: "2026-02-30",
        startsAt: "12:00",
        endsAt: "11:00",
      }),
    ).toEqual(
      invalid(
        { field: "eventDate", code: "invalid-format" },
        { field: "timeRange", code: "end-before-start" },
      ),
    );
  });

  it("reports an unknown intensivo", async () => {
    const { service } = setup();
    expect(await service.reschedule(owner, "missing", move)).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });
});

describe("lifecycle", () => {
  async function drafted(overrides: Partial<IntensiveWorkshopDraft> = {}) {
    const ctx = setup();
    const created = valueOf(await ctx.service.create(owner, draft(overrides)));
    return { ...ctx, created };
  }

  it("publishes a complete draft", async () => {
    const { service, created } = await drafted();
    expect(await service.publish(other, created.id)).toMatchObject({
      ok: true,
      value: { status: "published", audit: { updatedBy: "other@example.com" } },
    });
  });

  it("names the teacher and stays a draft when none is assigned", async () => {
    const { repository, service, created } = await drafted({
      teacherId: "",
      percentage: "",
    });
    expect(await service.publish(owner, created.id)).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["teacher"] },
    });
    expect(repository.items.get(created.id)?.status).toBe("draft");
  });

  it("names the teacher when she has been archived since", async () => {
    const { teacherRepository, service, created } = await drafted();
    teacherRepository.teachers.set("t-paid", { ...PAID, active: false });
    expect(await service.publish(owner, created.id)).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["teacher"] },
    });
  });

  it("names the percentage when the teacher became third-party since", async () => {
    const { teacherRepository, service, created } = await drafted({
      teacherId: "t-own",
      percentage: "",
    });
    teacherRepository.teachers.set("t-own", {
      ...OWN,
      modality: "third_party",
    });
    expect(await service.publish(owner, created.id)).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["percentage"] },
    });
  });

  it("lists every stored rule that no longer holds", async () => {
    const { repository, service, created } = await drafted({
      teacherId: "",
      percentage: "",
    });
    const stored = repository.items.get(created.id);
    if (!stored) throw new Error("missing");
    repository.items.set(created.id, { ...stored, capacity: 0, minSeats: 1 });
    expect(await service.publish(owner, created.id)).toEqual({
      ok: false,
      error: {
        kind: "rules-unmet",
        rules: ["teacher", "capacity", "min-seats"],
      },
    });
  });

  it("pauses and resumes, re-checking the publish rules on resume", async () => {
    const { teacherRepository, service, created } = await drafted();
    valueOf(await service.publish(owner, created.id));
    expect(await service.pause(owner, created.id)).toMatchObject({
      value: { status: "paused" },
    });
    teacherRepository.teachers.set("t-paid", { ...PAID, active: false });
    expect(await service.publish(owner, created.id)).toMatchObject({
      ok: false,
      error: { kind: "rules-unmet" },
    });
    teacherRepository.teachers.set("t-paid", PAID);
    expect(await service.publish(owner, created.id)).toMatchObject({
      value: { status: "published" },
    });
  });

  describe("future start", () => {
    // 2026-11-07 10:00 Córdoba is 13:00 UTC.
    const startMs = Date.parse("2026-11-07T13:00:00Z");

    it("refuses to publish a start that already passed and stays a draft", async () => {
      const { repository, clock, service, created } = await drafted();
      clock.advance(startMs + 3_600_000 - START.getTime());

      expect(await service.publish(owner, created.id)).toEqual({
        ok: false,
        error: { kind: "rules-unmet", rules: ["future-start"] },
      });
      expect(repository.items.get(created.id)?.status).toBe("draft");
    });

    it("publishes one minute before the start and refuses the exact minute", async () => {
      const { clock, service, created } = await drafted();
      clock.advance(startMs - 60_000 - START.getTime());
      expect(await service.publish(owner, created.id)).toMatchObject({
        ok: true,
        value: { status: "published" },
      });

      const second = await drafted();
      second.clock.advance(startMs - START.getTime());
      expect(await second.service.publish(owner, second.created.id)).toEqual({
        ok: false,
        error: { kind: "rules-unmet", rules: ["future-start"] },
      });
    });

    it("still refuses within the start minute, seconds in", async () => {
      const { clock, service, created } = await drafted();
      clock.advance(startMs + 59_000 - START.getTime());

      expect(await service.publish(owner, created.id)).toEqual({
        ok: false,
        error: { kind: "rules-unmet", rules: ["future-start"] },
      });
    });

    it("refuses to restore a paused intensivo whose start passed", async () => {
      const { repository, clock, service, created } = await drafted();
      valueOf(await service.publish(owner, created.id));
      valueOf(await service.pause(owner, created.id));
      clock.advance(startMs + 60_000 - START.getTime());

      expect(await service.publish(owner, created.id)).toEqual({
        ok: false,
        error: { kind: "rules-unmet", rules: ["future-start"] },
      });
      expect(repository.items.get(created.id)?.status).toBe("paused");
    });

    it("lists future-start with the other unmet rules", async () => {
      const { clock, service, created } = await drafted({
        teacherId: "",
        percentage: "",
      });
      clock.advance(startMs + 60_000 - START.getTime());

      expect(await service.publish(owner, created.id)).toEqual({
        ok: false,
        error: { kind: "rules-unmet", rules: ["teacher", "future-start"] },
      });
    });
  });

  it("cancels a published or paused intensivo and keeps every field", async () => {
    const { service, created } = await drafted({
      images: [{ assetId: "a1", alt: "Uno" }],
    });
    valueOf(await service.publish(owner, created.id));
    const cancelled = valueOf(await service.cancel(owner, created.id));
    expect(cancelled.status).toBe("cancelled");
    expect(plain({ ...cancelled, status: "draft" })).toMatchObject({
      ...plain({ ...created, status: "draft" }),
      audit: cancelled.audit,
    });
    const second = valueOf(await service.create(owner, draft({ slug: "dos" })));
    valueOf(await service.publish(owner, second.id));
    valueOf(await service.pause(owner, second.id));
    expect(await service.cancel(owner, second.id)).toMatchObject({
      value: { status: "cancelled" },
    });
  });

  it("refuses transitions outside the table, naming both states", async () => {
    const { service, created } = await drafted();
    expect(await service.cancel(owner, created.id)).toEqual({
      ok: false,
      error: { kind: "transition-refused", from: "draft", to: "cancelled" },
    });
    expect(await service.pause(owner, created.id)).toMatchObject({
      error: { from: "draft", to: "paused" },
    });
    valueOf(await service.publish(owner, created.id));
    valueOf(await service.cancel(owner, created.id));
    expect(await service.publish(owner, created.id)).toEqual({
      ok: false,
      error: { kind: "transition-refused", from: "cancelled", to: "published" },
    });
  });

  it("archives from any state except archived and restores to draft untouched", async () => {
    const { service, created } = await drafted();
    const archived = valueOf(await service.archive(owner, created.id));
    expect(archived.status).toBe("archived");
    expect(await service.archive(owner, created.id)).toMatchObject({
      error: { kind: "transition-refused", from: "archived", to: "archived" },
    });
    const restored = valueOf(await service.restore(other, created.id));
    expect(restored).toMatchObject({
      status: "draft",
      name: created.name,
      slug: created.slug,
      audit: { updatedBy: "other@example.com" },
    });
    expect(await service.restore(owner, created.id)).toMatchObject({
      error: { from: "draft", to: "draft" },
    });
  });

  it("reports an unknown id on every transition", async () => {
    const { service } = setup();
    for (const method of [
      "publish",
      "pause",
      "cancel",
      "archive",
      "restore",
    ] as const)
      expect(await service[method](owner, "missing")).toEqual({
        ok: false,
        error: { kind: "not-found" },
      });
  });

  it("treats a slug conflict during a status change as a defect", async () => {
    const { repository, service, created } = await drafted();
    repository.update = () =>
      Promise.resolve({ ok: false, error: { kind: "slug-conflict" } });
    await expect(service.publish(owner, created.id)).rejects.toThrow(
      "unexpected slug conflict",
    );
  });

  it("reports an intensivo deleted between the read and the status write", async () => {
    const { repository, service, created } = await drafted();
    repository.update = () =>
      Promise.resolve({ ok: false, error: { kind: "not-found" } });
    expect(await service.archive(owner, created.id)).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });
});

describe("delete", () => {
  it("removes a draft", async () => {
    const { repository, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    expect(await service.delete(owner, created.id)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(repository.items.size).toBe(0);
  });

  it.each(["published", "paused", "cancelled", "archived"] as const)(
    "refuses a %s intensivo and keeps it",
    async (status) => {
      const { repository, service } = setup();
      const created = valueOf(await service.create(owner, draft()));
      valueOf(await service.publish(owner, created.id));
      if (status === "paused") valueOf(await service.pause(owner, created.id));
      if (status === "cancelled")
        valueOf(await service.cancel(owner, created.id));
      if (status === "archived")
        valueOf(await service.archive(owner, created.id));
      expect(await service.delete(owner, created.id)).toEqual({
        ok: false,
        error: { kind: "rules-unmet", rules: ["draft-only"] },
      });
      expect(repository.items.get(created.id)?.status).toBe(status);
    },
  );

  it("reports an unknown id", async () => {
    const { service } = setup();
    expect(await service.delete(owner, "missing")).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });
});

describe("list, listVisible and get", () => {
  async function seeded() {
    const ctx = setup();
    const make = async (slug: string, eventDate: string) =>
      valueOf(await ctx.service.create(owner, draft({ slug, eventDate })));
    await make("a-draft", "2026-11-01");
    const b = await make("b-published", "2026-11-02");
    const c = await make("c-paused", "2026-11-03");
    const d = await make("d-cancelled", "2026-11-04");
    const e = await make("e-archived", "2026-11-05");
    for (const x of [b, c, d]) valueOf(await ctx.service.publish(owner, x.id));
    valueOf(await ctx.service.pause(owner, c.id));
    valueOf(await ctx.service.cancel(owner, d.id));
    valueOf(await ctx.service.archive(owner, e.id));
    return ctx;
  }

  const slugs = (r: { ok: boolean; value?: readonly IntensiveWorkshop[] }) =>
    valueOf(r).map((i) => i.slug);

  it("lists live ones (everything except archived), newest event first", async () => {
    const { service } = await seeded();
    expect(slugs(await service.list(owner, { status: "live" }))).toEqual([
      "d-cancelled",
      "c-paused",
      "b-published",
      "a-draft",
    ]);
  });

  it("filters by one status", async () => {
    const { service } = await seeded();
    expect(slugs(await service.list(owner, { status: "archived" }))).toEqual([
      "e-archived",
    ]);
    expect(slugs(await service.list(owner, { status: "draft" }))).toEqual([
      "a-draft",
    ]);
  });

  it("lists only the visible ones: published and paused", async () => {
    const { service } = await seeded();
    expect(slugs(await service.listVisible(owner))).toEqual([
      "c-paused",
      "b-published",
    ]);
  });

  it("hydrates teachers and images for a whole list", async () => {
    const { service } = await seeded();
    const live = valueOf(await service.list(owner, { status: "live" }));
    expect(live.every((i) => i.assignment?.teacher.name === "Lucía")).toBe(
      true,
    );
  });

  it("gets one by id and reports an unknown id", async () => {
    const { service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    expect(await service.get(owner, created.id)).toEqual({
      ok: true,
      value: created,
    });
    expect(await service.get(owner, "missing")).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });
});

describe("absent actor", () => {
  it.each([null, undefined])(
    "denies every use case for %s without touching any port",
    async (actor) => {
      const { repository, service } = setup();
      const calls: string[] = [];
      for (const method of [
        "insert",
        "update",
        "findById",
        "findBySlug",
        "list",
        "deleteDraft",
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
      const schedule = {
        eventDate: "2026-11-07",
        startsAt: "10:00",
        endsAt: "12:00",
      };
      expect(await service.list(actor, { status: "live" })).toEqual(denied);
      expect(await service.listVisible(actor)).toEqual(denied);
      expect(await service.get(actor, "id-1")).toEqual(denied);
      expect(await service.create(actor, draft())).toEqual(denied);
      expect(await service.update(actor, "id-1", draft())).toEqual(denied);
      expect(await service.delete(actor, "id-1")).toEqual(denied);
      expect(await service.publish(actor, "id-1")).toEqual(denied);
      expect(await service.pause(actor, "id-1")).toEqual(denied);
      expect(await service.cancel(actor, "id-1")).toEqual(denied);
      expect(await service.archive(actor, "id-1")).toEqual(denied);
      expect(await service.restore(actor, "id-1")).toEqual(denied);
      expect(await service.reschedule(actor, "id-1", schedule)).toEqual(denied);
      expect(calls).toEqual([]);
    },
  );
});

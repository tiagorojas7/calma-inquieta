import { describe, expect, it, vi } from "vitest";
import type { MediaAsset } from "~/modules/media";
import type { Teacher } from "~/modules/teachers";
import { InMemoryMonthlyWorkshopRepository } from "~/testing/fakes/in-memory-monthly-workshop-repository";
import { InMemoryTurnoRepository } from "~/testing/fakes/in-memory-turno-repository";
import { createMonthlyWorkshopsService } from "./monthly-workshop-service";

const actor = { kind: "admin-actor" as const, email: "admin@example.com" };
const clock = { now: () => new Date("2026-01-02T03:04:05.678Z") };
const draft = (overrides = {}) => ({
  name: " Cerámica Creativa ",
  slug: "",
  summary: " resumen ",
  description: " descripción ",
  technique: " torno ",
  defaultFee: "1200",
  teacherId: "",
  percentage: "",
  images: [],
  confirmSlugChange: false,
  ...overrides,
});

function teacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: "teacher-1",
    name: " Ana ",
    bioLine: "",
    phone: null,
    email: null,
    modality: "third_party",
    active: true,
    audit: { updatedBy: "seed", updatedAt: new Date() },
    ...overrides,
  };
}

const assetOf = (id: string): MediaAsset => ({
  id,
  fileName: `${id}.jpg`,
  src: `/media/${id}.jpg`,
  contentType: "image/jpeg",
  byteSize: 1,
  width: 800,
  height: 600,
  createdBy: "seed",
  createdAt: new Date("2026-01-01T00:00:00Z"),
});
const findKnownAssets = (ids: readonly string[]) =>
  Promise.resolve(
    new Map(
      ids
        .filter((id) => id.startsWith("asset-"))
        .map((id) => [id, assetOf(id)]),
    ),
  );

function service(
  teachers: readonly Teacher[] = [],
  repository = new InMemoryMonthlyWorkshopRepository(),
  hasPeriods = false,
) {
  let nextId = 1;
  const turnos = new InMemoryTurnoRepository(repository);
  return {
    repository,
    turnos,
    service: createMonthlyWorkshopsService({
      repository,
      teachers: {
        findByIds: (ids) =>
          Promise.resolve(
            new Map(
              teachers
                .filter((item) => ids.includes(item.id))
                .map((item) => [item.id, item]),
            ),
          ),
      },
      media: { findAssets: findKnownAssets },
      turnos,
      turnoUsage: { isUsed: () => Promise.resolve(false) },
      periods: {
        hasPeriods: () => Promise.resolve(hasPeriods),
        openPeriodIds: () => Promise.resolve([]),
      },
      clock,
      newId: () =>
        `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
    }),
  };
}

describe("monthly workshops service", () => {
  it("creates a normalized draft, derives its slug and stamps the actor", async () => {
    const { service: subject } = service();
    const result = await subject.create(actor, draft());
    expect(result).toMatchObject({
      ok: true,
      value: {
        slug: "ceramica-creativa",
        name: "Cerámica Creativa",
        summary: "resumen",
        description: "descripción",
        technique: "torno",
        status: "draft",
        audit: { updatedBy: actor.email, updatedAt: clock.now() },
      },
    });
  });

  it("validates every percentage normalization without floating point drift", async () => {
    const { service: subject } = service([teacher()]);
    for (const [input, basisPoints] of [
      [" 35,5 ", 3550],
      ["1.15", 115],
      ["0.29", 29],
      ["4.35", 435],
      ["0.07", 7],
      ["0", 0],
      ["100", 10000],
    ] as const) {
      const result = await subject.create(
        actor,
        draft({
          slug: `percentage-${String(basisPoints)}`,
          teacherId: "teacher-1",
          percentage: input,
        }),
      );
      expect(result).toMatchObject({
        ok: true,
        value: { assignment: { percentage: { basisPoints } } },
      });
    }
    for (const input of ["12.345", "100.01", "-1", "1,2,3"])
      expect(
        await subject.create(
          actor,
          draft({
            slug: `invalid-${input.replace(/[^a-z0-9]/g, "")}`,
            teacherId: "teacher-1",
            percentage: input,
          }),
        ),
      ).toMatchObject({
        ok: false,
        error: { kind: "invalid", issues: [{ field: "percentage" }] },
      });
  });

  it("enforces own and third-party teacher assignment rules", async () => {
    const { service: subject } = service([
      teacher(),
      teacher({ id: "own", modality: "own" }),
      teacher({ id: "archived", active: false }),
    ]);
    expect(
      await subject.create(
        actor,
        draft({ slug: "third-party", teacherId: "teacher-1" }),
      ),
    ).toMatchObject({
      ok: false,
      error: { issues: [{ field: "percentage", code: "required" }] },
    });
    expect(
      await subject.create(
        actor,
        draft({ slug: "own-invalid", teacherId: "own", percentage: "20" }),
      ),
    ).toMatchObject({
      ok: false,
      error: {
        issues: [{ field: "percentage", code: "percentage-not-applicable" }],
      },
    });
    expect(
      await subject.create(
        actor,
        draft({ slug: "own-valid", teacherId: "own" }),
      ),
    ).toMatchObject({ ok: true, value: { assignment: { percentage: null } } });
    expect(
      await subject.create(
        actor,
        draft({
          slug: "missing-teacher",
          teacherId: "missing",
          percentage: "20",
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { issues: [{ field: "teacherId", code: "unknown-reference" }] },
    });
    expect(
      await subject.create(
        actor,
        draft({
          slug: "archived-teacher",
          teacherId: "archived",
          percentage: "20",
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { issues: [{ field: "teacherId", code: "not-selectable" }] },
    });
  });

  it("maps a create save race to the typed duplicate result", async () => {
    const { service: subject, repository } = service();
    const first = await subject.create(actor, draft({ slug: "taken" }));
    if (!first.ok) throw new Error("fixture");
    repository.findBySlug = () => Promise.resolve(null);

    expect(await subject.create(actor, draft({ slug: "taken" }))).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "slug", code: "duplicate" }],
      },
    });
  });

  it("requires confirmation for a published slug change and maps a save race to duplicate", async () => {
    const { service: subject, repository } = service();
    const created = await subject.create(actor, draft({ slug: "first" }));
    if (!created.ok) throw new Error("fixture");
    const stored = await repository.findById(created.value.id);
    if (!stored) throw new Error("fixture");
    await repository.update({ ...stored, status: "published" });
    expect(
      await subject.update(actor, created.value.id, draft({ slug: "second" })),
    ).toMatchObject({
      ok: false,
      error: { issues: [{ field: "slug", code: "confirmation-required" }] },
    });
    const published = await repository.findById(created.value.id);
    if (!published) throw new Error("fixture");
    await repository.insert({
      ...published,
      id: "00000000-0000-4000-8000-000000000002",
      slug: "taken",
    });
    expect(
      await subject.update(
        actor,
        created.value.id,
        draft({ slug: "taken", confirmSlugChange: true }),
      ),
    ).toMatchObject({
      ok: false,
      error: { issues: [{ field: "slug", code: "duplicate" }] },
    });
  });

  it("aggregates publish failures and exposes paused records without requests", async () => {
    const { service: subject, repository } = service();
    const created = await subject.create(actor, draft());
    if (!created.ok) throw new Error("fixture");
    expect(await subject.publish(actor, created.value.id)).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["teacher", "active-turno"] },
    });
    const stored = await repository.findById(created.value.id);
    if (!stored) throw new Error("fixture");
    await repository.update({ ...stored, status: "published" });
    expect(await subject.pause(actor, created.value.id)).toMatchObject({
      ok: true,
      value: { status: "paused" },
    });
    expect(await subject.listVisible(actor)).toMatchObject({
      ok: true,
      value: [
        { id: created.value.id, status: "paused", acceptsNewRequests: false },
      ],
    });
  });

  it("stores the gallery in order and reads it back with its assets", async () => {
    const { service: subject, repository } = service();
    const images = [
      { assetId: "asset-2", alt: " Segunda " },
      { assetId: "asset-1", alt: "Primera" },
    ];
    const created = await subject.create(actor, draft({ images }));
    if (!created.ok) throw new Error("create failed");

    expect(repository.items.get(created.value.id)?.images).toEqual([
      { assetId: "asset-2", alt: "Segunda" },
      { assetId: "asset-1", alt: "Primera" },
    ]);
    expect(created.value.images).toEqual([
      { assetId: "asset-2", alt: "Segunda", asset: assetOf("asset-2") },
      { assetId: "asset-1", alt: "Primera", asset: assetOf("asset-1") },
    ]);
    const fetched = await subject.get(actor, created.value.id);
    expect(fetched.ok && fetched.value.images.map((i) => i.assetId)).toEqual([
      "asset-2",
      "asset-1",
    ]);
  });

  it("rejects an unknown asset, a blank alt and more than six images", async () => {
    const { service: subject } = service();
    const invalid = async (images: { assetId: string; alt: string }[]) => {
      const result = await subject.create(actor, draft({ images }));
      return !result.ok && result.error.kind === "invalid"
        ? result.error.issues.map((issue) => issue.field + ":" + issue.code)
        : result;
    };

    expect(await invalid([{ assetId: "missing", alt: "x" }])).toEqual([
      "images:unknown-reference",
    ]);
    expect(await invalid([{ assetId: "asset-1", alt: "  " }])).toEqual([
      "images:required",
    ]);
    expect(
      await invalid([{ assetId: "asset-1", alt: "x".repeat(201) }]),
    ).toEqual(["images:too-long"]);
    expect(
      await invalid(
        Array.from({ length: 7 }, (_, i) => ({
          assetId: `asset-${String(i)}`,
          alt: "x",
        })),
      ),
    ).toContain("images:too-many");
  });

  it("replaces the gallery on update and clears it when none is sent", async () => {
    const { service: subject, repository } = service();
    const created = await subject.create(
      actor,
      draft({ images: [{ assetId: "asset-1", alt: "Primera" }] }),
    );
    if (!created.ok) throw new Error("create failed");

    await subject.update(
      actor,
      created.value.id,
      draft({ images: [{ assetId: "asset-2", alt: "Otra" }] }),
    );
    expect(repository.items.get(created.value.id)?.images).toEqual([
      { assetId: "asset-2", alt: "Otra" },
    ]);

    await subject.update(actor, created.value.id, draft());
    expect(repository.items.get(created.value.id)?.images).toEqual([]);
  });

  it("keeps the gallery through a status change", async () => {
    const { service: subject, repository } = service();
    const created = await subject.create(
      actor,
      draft({ images: [{ assetId: "asset-1", alt: "Primera" }] }),
    );
    if (!created.ok) throw new Error("create failed");

    await subject.archive(actor, created.value.id);
    await subject.restore(actor, created.value.id);

    expect(repository.items.get(created.value.id)?.images).toHaveLength(1);
  });

  it("publishes when the turno repository has an active turno", async () => {
    const { service: subject } = service([teacher()]);
    const created = await subject.create(
      actor,
      draft({ teacherId: "teacher-1", percentage: "35,5" }),
    );
    if (!created.ok) throw new Error("fixture");
    await subject.addTurno(actor, created.value.id, turnoDraft());
    expect(await subject.publish(actor, created.value.id)).toMatchObject({
      ok: true,
      value: { status: "published" },
    });
  });

  it("updates audit only on successful writes and preserves it on refused operations", async () => {
    const secondActor = {
      kind: "admin-actor" as const,
      email: "other@example.com",
    };
    const { service: subject, repository } = service([teacher()]);
    const created = await subject.create(
      actor,
      draft({ teacherId: "teacher-1", percentage: "10" }),
    );
    if (!created.ok) throw new Error("fixture");
    await subject.addTurno(actor, created.value.id, turnoDraft());
    const before = await repository.findById(created.value.id);
    if (!before) throw new Error("fixture");

    expect(
      await subject.update(
        secondActor,
        created.value.id,
        draft({ defaultFee: "0" }),
      ),
    ).toMatchObject({ ok: false });
    expect(await repository.findById(created.value.id)).toMatchObject({
      audit: before.audit,
    });

    expect(await subject.publish(secondActor, created.value.id)).toMatchObject({
      ok: true,
      value: { audit: { updatedBy: secondActor.email } },
    });
    const published = await repository.findById(created.value.id);
    if (!published) throw new Error("fixture");
    expect(await subject.restore(secondActor, created.value.id)).toMatchObject({
      ok: false,
      error: { kind: "transition-refused" },
    });
    expect(await repository.findById(created.value.id)).toEqual(published);
  });

  it("deletes a draft without periods through deleteDraft", async () => {
    const { service: subject, repository } = service();
    const deleteDraft = vi.spyOn(repository, "deleteDraft");
    const created = await subject.create(actor, draft());
    if (!created.ok) throw new Error("fixture");

    expect(await subject.delete(actor, created.value.id)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(deleteDraft).toHaveBeenCalledOnce();
    expect(deleteDraft).toHaveBeenCalledWith(created.value.id);
    expect(await repository.findById(created.value.id)).toBeNull();
  });

  it("refuses to delete drafts that have periods through the read-only period seam", async () => {
    const { service: subject, repository } = service([], undefined, true);
    const created = await subject.create(actor, draft());
    if (!created.ok) throw new Error("fixture");

    expect(await subject.delete(actor, created.value.id)).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["draft-without-periods"] },
    });
    expect(await repository.findById(created.value.id)).not.toBeNull();
  });

  it("lists live statuses by default semantics and hides draft and archived", async () => {
    const { service: subject, repository } = service();
    const draftWorkshop = await subject.create(actor, draft({ slug: "draft" }));
    const publishedWorkshop = await subject.create(
      actor,
      draft({ slug: "published" }),
    );
    const archivedWorkshop = await subject.create(
      actor,
      draft({ slug: "archived" }),
    );
    if (!draftWorkshop.ok || !publishedWorkshop.ok || !archivedWorkshop.ok)
      throw new Error("fixture");
    for (const [id, status] of [
      [publishedWorkshop.value.id, "published"],
      [archivedWorkshop.value.id, "archived"],
    ] as const) {
      const item = await repository.findById(id);
      if (!item) throw new Error("fixture");
      await repository.update({ ...item, status });
    }

    const listed = await subject.list(actor, { status: "live" });
    if (!listed.ok) throw new Error("fixture");
    expect(listed.value).toHaveLength(2);
    expect(await subject.listVisible(actor)).toMatchObject({
      ok: true,
      value: [{ id: publishedWorkshop.value.id, acceptsNewRequests: true }],
    });
  });

  it("preserves workshop data when archive then restore changes status and audit", async () => {
    const secondActor = {
      kind: "admin-actor" as const,
      email: "other@example.com",
    };
    const { service: subject, repository } = service();
    const created = await subject.create(actor, draft({ slug: "preserved" }));
    if (!created.ok) throw new Error("fixture");
    const before = await repository.findById(created.value.id);
    if (!before) throw new Error("fixture");

    expect(await subject.archive(secondActor, created.value.id)).toMatchObject({
      ok: true,
      value: { status: "archived" },
    });
    expect(await subject.restore(secondActor, created.value.id)).toMatchObject({
      ok: true,
      value: { status: "draft" },
    });

    const restored = await repository.findById(created.value.id);
    if (!restored) throw new Error("fixture");
    const { status: beforeStatus, audit: beforeAudit, ...beforeData } = before;
    const {
      status: restoredStatus,
      audit: restoredAudit,
      ...restoredData
    } = restored;
    expect(restoredData).toEqual(beforeData);
    expect(beforeStatus).toBe("draft");
    expect(restoredStatus).toBe("draft");
    expect(restoredAudit).toEqual({
      updatedBy: secondActor.email,
      updatedAt: clock.now(),
    });
    expect(restoredAudit).not.toEqual(beforeAudit);
  });

  it("shows published and paused workshops while hiding draft and archived workshops", async () => {
    const { service: subject, repository } = service([teacher()]);
    const draftWorkshop = await subject.create(actor, draft({ slug: "draft" }));
    const publishedWorkshop = await subject.create(
      actor,
      draft({ slug: "published", teacherId: "teacher-1", percentage: "10" }),
    );
    const pausedWorkshop = await subject.create(
      actor,
      draft({ slug: "paused", teacherId: "teacher-1", percentage: "10" }),
    );
    const archivedWorkshop = await subject.create(
      actor,
      draft({ slug: "archived" }),
    );
    if (
      !draftWorkshop.ok ||
      !publishedWorkshop.ok ||
      !pausedWorkshop.ok ||
      !archivedWorkshop.ok
    )
      throw new Error("fixture");
    await subject.addTurno(actor, publishedWorkshop.value.id, turnoDraft());
    await subject.addTurno(actor, pausedWorkshop.value.id, turnoDraft());
    await subject.publish(actor, publishedWorkshop.value.id);
    await subject.publish(actor, pausedWorkshop.value.id);
    await subject.pause(actor, pausedWorkshop.value.id);
    await subject.archive(actor, archivedWorkshop.value.id);

    expect(await subject.listVisible(actor)).toEqual({
      ok: true,
      value: [
        expect.objectContaining({
          id: publishedWorkshop.value.id,
          status: "published",
          acceptsNewRequests: true,
        }),
        expect.objectContaining({
          id: pausedWorkshop.value.id,
          status: "paused",
          acceptsNewRequests: false,
        }),
      ],
    });
    expect(await repository.findById(draftWorkshop.value.id)).toMatchObject({
      status: "draft",
    });
    expect(await repository.findById(archivedWorkshop.value.id)).toMatchObject({
      status: "archived",
    });
  });

  it("uses the complete lifecycle table and denies absent actors", async () => {
    const { service: subject, repository } = service();
    const created = await subject.create(actor, draft());
    if (!created.ok) throw new Error("fixture");
    expect(await subject.pause(actor, created.value.id)).toMatchObject({
      ok: false,
      error: { kind: "transition-refused", from: "draft", to: "paused" },
    });
    expect(await subject.archive(actor, created.value.id)).toMatchObject({
      ok: true,
      value: { status: "archived" },
    });
    expect(await subject.restore(actor, created.value.id)).toMatchObject({
      ok: true,
      value: { status: "draft" },
    });
    expect(await subject.list(null, { status: "live" })).toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    expect((await repository.findById(created.value.id))?.audit.updatedBy).toBe(
      actor.email,
    );
  });
});

const noPeriods = {
  hasPeriods: () => Promise.resolve(false),
  openPeriodIds: () => Promise.resolve([] as readonly string[]),
};
const turnoDraft = (overrides = {}) => ({
  label: " Mañana ",
  weekday: "2",
  startsAt: "09:00",
  endsAt: "10:00",
  defaultCapacity: "8",
  ...overrides,
});
function turnoService() {
  const repository = new InMemoryMonthlyWorkshopRepository();
  const turnos = new InMemoryTurnoRepository(repository);
  let nextId = 1;
  return {
    repository,
    turnos,
    subject: createMonthlyWorkshopsService({
      repository,
      teachers: { findByIds: () => Promise.resolve(new Map()) },
      media: { findAssets: () => Promise.resolve(new Map()) },
      turnos,
      turnoUsage: { isUsed: () => Promise.resolve(false) },
      periods: noPeriods,
      clock,
      newId: () => `turno-${String(nextId++)}`,
    }),
  };
}
describe("monthly workshop turno mutations", () => {
  it("denies first and hydrates sorted turnos with real active counts", async () => {
    const { subject } = turnoService();
    expect(await subject.addTurno(null, "unknown", turnoDraft())).toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    const created = await subject.create(actor, draft());
    if (!created.ok) throw new Error("fixture");
    await subject.addTurno(
      actor,
      created.value.id,
      turnoDraft({
        label: "Late",
        weekday: "2",
        startsAt: "11:00",
        endsAt: "12:00",
      }),
    );
    await subject.addTurno(
      actor,
      created.value.id,
      turnoDraft({
        label: "Early",
        weekday: "1",
        startsAt: "10:00",
        endsAt: "11:00",
      }),
    );
    expect(await subject.get(actor, created.value.id)).toMatchObject({
      ok: true,
      value: { turnos: [{ label: "Early" }, { label: "Late" }] },
    });
    expect(await subject.list(actor, { status: "live" })).toMatchObject({
      ok: true,
      value: [{ activeTurnos: 2 }],
    });
  });
  it("validates, maps label races, and stamps only successful mutations", async () => {
    const { subject, repository, turnos } = turnoService();
    const created = await subject.create(actor, draft());
    if (!created.ok) throw new Error("fixture");
    const before = await repository.findById(created.value.id);
    expect(
      await subject.addTurno(
        actor,
        created.value.id,
        turnoDraft({ label: "" }),
      ),
    ).toMatchObject({ ok: false, error: { kind: "invalid" } });
    expect(await repository.findById(created.value.id)).toEqual(before);
    const added = await subject.addTurno(
      actor,
      created.value.id,
      turnoDraft({ label: "Ñandú" }),
    );
    if (!added.ok) throw new Error("fixture");
    turnos.listForWorkshop = () => Promise.resolve([]);
    expect(
      await subject.addTurno(
        actor,
        created.value.id,
        turnoDraft({ label: "ñANDÚ" }),
      ),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "label", code: "duplicate" }],
      },
    });
  });
  it("rolls back a turno mutation when its owning workshop audit cannot be saved", async () => {
    const { subject, repository, turnos } = turnoService();
    const created = await subject.create(actor, draft());
    if (!created.ok) throw new Error("fixture");
    const before = await repository.findById(created.value.id);
    const update = repository.update.bind(repository);
    repository.update = () =>
      Promise.resolve({ ok: false, error: { kind: "not-found" as const } });

    await expect(
      subject.addTurno(actor, created.value.id, turnoDraft()),
    ).resolves.toEqual({ ok: false, error: { kind: "not-found" } });
    expect(await turnos.listForWorkshop(created.value.id)).toEqual([]);
    expect(await repository.findById(created.value.id)).toEqual(before);
    repository.update = update;
  });

  it("refuses deleting the last active turno of a published workshop without changing its audit", async () => {
    const { subject, repository } = turnoService();
    const created = await subject.create(actor, draft());
    if (!created.ok) throw new Error("fixture");
    const added = await subject.addTurno(actor, created.value.id, turnoDraft());
    if (!added.ok) throw new Error("fixture");
    const turno = added.value.turnos[0];
    if (!turno) throw new Error("fixture");
    const stored = await repository.findById(created.value.id);
    if (!stored) throw new Error("fixture");
    await repository.update({ ...stored, status: "published" });
    const before = await repository.findById(created.value.id);

    await expect(
      subject.deleteTurno(actor, created.value.id, turno.id),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "rules-unmet",
        rules: ["last-active-turno-of-published"],
      },
    });
    expect(await subject.get(actor, created.value.id)).toMatchObject({
      ok: true,
      value: { turnos: [{ id: turno.id, active: true }] },
    });
    expect(await repository.findById(created.value.id)).toEqual(before);
  });

  it("guards published last active, rechecks reactivation, and keeps used turnos", async () => {
    const { subject, repository, turnos } = turnoService();
    const created = await subject.create(actor, draft());
    if (!created.ok) throw new Error("fixture");
    const added = await subject.addTurno(actor, created.value.id, turnoDraft());
    if (!added.ok) throw new Error("fixture");
    const turno = added.value.turnos[0];
    if (!turno) throw new Error("fixture");
    const stored = await repository.findById(created.value.id);
    if (!stored) throw new Error("fixture");
    await repository.update({ ...stored, status: "published" });
    expect(
      await subject.retireTurno(actor, created.value.id, turno.id),
    ).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["last-active-turno-of-published"] },
    });
    await repository.update({ ...stored, status: "paused" });
    expect(
      await subject.retireTurno(actor, created.value.id, turno.id),
    ).toMatchObject({ ok: true, value: { turnos: [{ active: false }] } });
    const update = turnos.update.bind(turnos);
    turnos.update = (value) =>
      value.id === turno.id && value.active
        ? Promise.resolve({
            ok: false,
            error: { kind: "label-conflict" as const },
          })
        : update(value);
    expect(
      await subject.reactivateTurno(actor, created.value.id, turno.id),
    ).toEqual({ ok: false, error: { kind: "label-conflict" } });
    const used = createMonthlyWorkshopsService({
      repository,
      teachers: { findByIds: () => Promise.resolve(new Map()) },
      media: { findAssets: () => Promise.resolve(new Map()) },
      turnos,
      turnoUsage: { isUsed: (id) => Promise.resolve(id === turno.id) },
      periods: noPeriods,
      clock,
    });
    expect(await used.deleteTurno(actor, created.value.id, turno.id)).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["turno-used"] },
    });
  });
});

describe("a new turno joins the open months", () => {
  function withOpenMonths(ids: readonly string[]) {
    const asked: [string, string][] = [];
    const repository = new InMemoryMonthlyWorkshopRepository();
    const turnos = new InMemoryTurnoRepository(repository);
    const subject = createMonthlyWorkshopsService({
      repository,
      teachers: { findByIds: () => Promise.resolve(new Map()) },
      media: { findAssets: () => Promise.resolve(new Map()) },
      turnos,
      turnoUsage: { isUsed: () => Promise.resolve(false) },
      periods: {
        hasPeriods: () => Promise.resolve(true),
        openPeriodIds: (workshopId, fromPeriod) => {
          asked.push([workshopId, fromPeriod]);
          return Promise.resolve(ids);
        },
      },
      clock,
      newId: (() => {
        let next = 1;
        return () => `id-${String(next++)}`;
      })(),
    });
    return { subject, turnos, asked };
  }

  it("adds the turno with its default capacity to each open month from the current Córdoba month on", async () => {
    const { subject, turnos, asked } = withOpenMonths(["p-jan", "p-feb"]);
    const created = await subject.create(actor, draft());
    if (!created.ok) throw new Error("fixture");

    const added = await subject.addTurno(actor, created.value.id, turnoDraft());

    expect(added.ok).toBe(true);
    expect(asked).toEqual([[created.value.id, "2026-01"]]);
    const turnoId = [...turnos.items.keys()][0];
    expect(turnos.joined).toEqual([
      { turnoId, periodId: "p-jan", capacity: 8 },
      { turnoId, periodId: "p-feb", capacity: 8 },
    ]);
  });

  it("joins nothing when the taller has no open month", async () => {
    const { subject, turnos } = withOpenMonths([]);
    const created = await subject.create(actor, draft());
    if (!created.ok) throw new Error("fixture");

    await subject.addTurno(actor, created.value.id, turnoDraft());

    expect(turnos.items.size).toBe(1);
    expect(turnos.joined).toEqual([]);
  });
});

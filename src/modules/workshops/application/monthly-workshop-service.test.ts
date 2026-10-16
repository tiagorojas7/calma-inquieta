import { describe, expect, it, vi } from "vitest";
import type { Teacher } from "~/modules/teachers";
import { InMemoryMonthlyWorkshopRepository } from "~/testing/fakes/in-memory-monthly-workshop-repository";
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

function service(
  teachers: readonly Teacher[] = [],
  repository = new InMemoryMonthlyWorkshopRepository(),
  activeTurnos = 0,
  hasPeriods = false,
) {
  let nextId = 1;
  return {
    repository,
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
      media: { findAssets: () => Promise.resolve(new Map()) },
      activeTurnos: {
        countActiveForWorkshop: () => Promise.resolve(activeTurnos),
      },
      periods: { hasPeriods: () => Promise.resolve(hasPeriods) },
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

  it("returns unavailable for deferred non-empty gallery input", async () => {
    const { service: subject } = service();
    expect(
      await subject.create(
        actor,
        draft({ images: [{ assetId: "asset-1", alt: "Cerámica" }] }),
      ),
    ).toEqual({ ok: false, error: { kind: "unavailable" } });
  });

  it("publishes when the B4 turno seam reports an active turno", async () => {
    const { service: subject } = service([teacher()], undefined, 1);
    const created = await subject.create(
      actor,
      draft({ teacherId: "teacher-1", percentage: "35,5" }),
    );
    if (!created.ok) throw new Error("fixture");
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
    const { service: subject, repository } = service([teacher()], undefined, 1);
    const created = await subject.create(
      actor,
      draft({ teacherId: "teacher-1", percentage: "10" }),
    );
    if (!created.ok) throw new Error("fixture");
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
    const { service: subject, repository } = service([], undefined, 0, true);
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
    const { service: subject, repository } = service([teacher()], undefined, 1);
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

import { describe, expect, it, vi } from "vitest";
import { err, ok } from "~/modules/_shared";
import type { TeachersService } from "~/modules/teachers";
import type { MonthlyWorkshopsService } from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  postRequest,
  teachersFixture,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { insightsFixture } from "~/testing/admin/insights-kit";
import { createUnavailableService } from "~/composition/unavailable-service";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { action, loader } from "./teacher-detail";

const DRAFT = {
  name: "Ana Gómez",
  bioLine: "Cerámica",
  phone: "",
  email: "",
  modality: "own",
};

async function withTeacher() {
  const { service, repository } = teachersFixture();
  const created = await service.create(testAdminActor(), DRAFT);
  if (!created.ok) throw new Error("seed failed");
  return { service, repository, id: created.value.id };
}

function assignments(
  result: ReturnType<MonthlyWorkshopsService["listAssignmentsOfTeacher"]>,
) {
  const list = vi.fn<MonthlyWorkshopsService["listAssignmentsOfTeacher"]>(
    () => result,
  );
  const service = withOverrides(
    createUnavailableService<MonthlyWorkshopsService>(),
    { listAssignmentsOfTeacher: list },
  );
  return { list, service };
}

function load(
  teachers: TeachersService,
  id: string,
  monthlyWorkshops?: MonthlyWorkshopsService,
) {
  return loader({
    request: getRequest(`/admin/profesores/${id}`),
    params: { id },
    context: adminContext({
      teachers,
      ...(monthlyWorkshops ? { monthlyWorkshops } : {}),
    }),
  } as never);
}

function submit(
  teachers: TeachersService,
  id: string,
  fields: Record<string, string>,
  options: { admin?: boolean } = {},
) {
  return action({
    request: postRequest(`/admin/profesores/${id}`, fields),
    params: { id },
    context: adminContext({ teachers }, options),
  } as never);
}

describe("admin teacher detail loader", () => {
  it("loads the teacher as form values without asking for assignments while active", async () => {
    const { service, id } = await withTeacher();
    const { list, service: workshops } = assignments(
      Promise.resolve(ok({ monthly: [], intensives: [] })),
    );
    const result = await load(service, id, workshops);
    expect(result).toEqual({
      id,
      active: true,
      feedback: null,
      values: DRAFT,
      assignedTo: [],
      settlement: null,
    });
    expect(list).not.toHaveBeenCalled();
  });

  it("names the monthly and intensive activities an archived teacher keeps", async () => {
    const { service, id } = await withTeacher();
    await service.archive(testAdminActor(), id);
    const { service: workshops } = assignments(
      Promise.resolve(
        ok({
          monthly: [{ id: "w1", name: "Cerámica inicial" }],
          intensives: [{ id: "i1", name: "Intensivo de torno" }],
        }),
      ),
    );
    const result = await load(service, id, workshops);
    expect(result.active).toBe(false);
    expect(result.assignedTo).toEqual([
      "Cerámica inicial",
      "Intensivo de torno",
    ]);
  });

  it("shows no warning when the assignments cannot be read", async () => {
    const { service, id } = await withTeacher();
    await service.archive(testAdminActor(), id);
    const { service: workshops } = assignments(
      Promise.resolve(err({ kind: "unavailable" })),
    );
    expect((await load(service, id, workshops)).assignedTo).toEqual([]);
  });

  it("answers 404 for an unknown teacher", async () => {
    const { service } = await withTeacher();
    expect(await thrownStatus(() => load(service, "nope"))).toBe(404);
  });
});

describe("admin teacher detail settlement block", () => {
  async function loadWithInsights(path: string) {
    const { service, id } = await withTeacher();
    const { orders, workshops, service: insights } = insightsFixture();
    workshops.teacherRows = [
      {
        period: "2026-09",
        periodId: "p1",
        workshopId: "w1",
        workshopName: "Ceramica",
        teacherId: id,
        teacherName: "Ana Gómez",
        modality: "third_party",
        percentageBp: 3_000,
      },
    ];
    orders.registrationRows = [
      {
        period: "2026-09",
        periodId: "p1",
        orders: 2,
        feeCentavos: 20_000_00,
        studentEmails: ["a@x.test", "b@x.test"],
      },
    ];
    return loader({
      request: getRequest(`/admin/profesores/${id}${path}`),
      params: { id },
      context: adminContext({ teachers: service, insights }),
    } as never);
  }

  it("estimates the share to settle for the month in the query string", async () => {
    const result = await loadWithInsights("?mes=2026-09");
    expect(result.settlement).toMatchObject({
      period: "2026-09",
      responsible: true,
      percentage: "30 %",
      students: "2",
      income: "$ 20.000",
      estimate: "$ 6.000",
    });
  });

  it("falls back to the current month, where she has nothing yet", async () => {
    const result = await loadWithInsights("?mes=nope");
    expect(result.settlement).toEqual({
      period: "2026-10",
      periodLabel: "octubre 2026",
      responsible: false,
    });
  });
});

describe("admin teacher detail action", () => {
  it("saves the edit as the admin and redirects to the list", async () => {
    const { service, repository, id } = await withTeacher();
    const response = await submit(service, id, {
      intent: "save",
      ...DRAFT,
      bioLine: "Cerámica y esmaltes",
      modality: "third_party",
    });
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/profesores?ok=saved",
    );
    expect(repository.teachers.get(id)).toMatchObject({
      bioLine: "Cerámica y esmaltes",
      modality: "third_party",
      audit: { updatedBy: "a@x.test" },
    });
  });

  it("returns 422 with values and errors for an invalid edit, keeping the record", async () => {
    const { service, repository, id } = await withTeacher();
    const result = await submit(service, id, {
      intent: "save",
      ...DRAFT,
      bioLine: "",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: { errors: { bioLine: "Completá este campo." } },
    });
    expect(repository.teachers.get(id)?.bioLine).toBe("Cerámica");
  });

  it("archives and returns to the teacher page, which shows the warning", async () => {
    const { service, repository, id } = await withTeacher();
    const response = await submit(service, id, { intent: "archive" });
    expect((response as Response).headers.get("Location")).toBe(
      `/admin/profesores/${id}?ok=archived`,
    );
    expect(repository.teachers.get(id)?.active).toBe(false);
  });

  it("reactivates an archived teacher", async () => {
    const { service, repository, id } = await withTeacher();
    await service.archive(testAdminActor(), id);
    const response = await submit(service, id, { intent: "reactivate" });
    expect((response as Response).headers.get("Location")).toBe(
      `/admin/profesores/${id}?ok=restored`,
    );
    expect(repository.teachers.get(id)?.active).toBe(true);
  });

  it("refuses to reactivate over an active teacher with the same name", async () => {
    const { service, repository, id } = await withTeacher();
    await service.archive(testAdminActor(), id);
    await service.create(testAdminActor(), DRAFT);
    const result = await submit(service, id, { intent: "reactivate" });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: { stateError: "Ya existe uno activo con el mismo nombre." },
    });
    expect(repository.teachers.get(id)?.active).toBe(false);
  });

  it("answers 400 for a missing or unknown intent", async () => {
    const { service, id } = await withTeacher();
    expect(await thrownStatus(() => submit(service, id, {}))).toBe(400);
    expect(
      await thrownStatus(() => submit(service, id, { intent: "delete" })),
    ).toBe(400);
  });

  it("answers 404 for an unknown teacher and 403 for a non-admin", async () => {
    const { service, id } = await withTeacher();
    expect(
      await thrownStatus(() =>
        submit(service, "nope", { intent: "save", ...DRAFT }),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        submit(service, id, { intent: "archive" }, { admin: false }),
      ),
    ).toBe(403);
  });
});

import { describe, expect, it, vi } from "vitest";
import { err, ok } from "~/modules/_shared";
import {
  createUnavailableAdminEnrollmentService,
  type AdminEnrollmentUseCases,
  type PublicEnrollmentUseCases,
} from "~/modules/enrollments";
import type {
  MonthlyWorkshopsService,
  WorkshopPeriodsService,
} from "~/modules/workshops";
import { createUnavailableService } from "~/composition/unavailable-service";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { action, loader } from "./enrollment-new";

type CreatePending = AdminEnrollmentUseCases["createPending"];

const OFFER = "ceramica|2026-11|t1";
const VALID = {
  offer: OFFER,
  fullName: " Ana Pérez ",
  email: "ana@x.test",
  phone: "351 555 0001",
};

function services(createPending: CreatePending = vi.fn()) {
  return {
    enrollments: withOverrides(createUnavailableAdminEnrollmentService(), {
      createPending,
    }),
    monthlyWorkshops: withOverrides(
      createUnavailableService<MonthlyWorkshopsService>(),
      {
        list: () =>
          Promise.resolve(
            ok([
              { id: "w1", name: "Cerámica", acceptsNewRequests: true },
              { id: "w2", name: "Pausado", acceptsNewRequests: false },
            ] as never),
          ),
        get: (_actor: unknown, id: string) =>
          Promise.resolve(ok({ id, slug: "ceramica" } as never)),
      },
    ),
    workshopPeriods: withOverrides(
      createUnavailableService<WorkshopPeriodsService>(),
      {
        list: () =>
          Promise.resolve(
            ok({
              periods: [
                { period: "2026-11", status: "open", activeTurnos: 2 },
                { period: "2026-12", status: "draft", activeTurnos: 2 },
                { period: "2026-10", status: "closed", activeTurnos: 2 },
                { period: "2027-01", status: "open", activeTurnos: 0 },
              ],
              suggestedNext: null,
            } as never),
          ),
      },
    ),
    publicEnrollments: withOverrides(
      createUnavailableService<PublicEnrollmentUseCases>(),
      {
        getOffer: ({ period }: { period: string }) =>
          Promise.resolve(
            ok({
              workshopName: "Cerámica",
              period,
              turnos: [
                { id: "t1", label: "Lunes 18:00" },
                { id: "t2", label: "Martes 10:00" },
              ],
            } as never),
          ),
      },
    ),
  };
}

function submit(
  fields: Record<string, string>,
  createPending?: CreatePending,
  options: { admin?: boolean; headers?: Record<string, string> } = {},
) {
  return action({
    request: postRequest("/admin/inscripciones/nueva", fields, options.headers),
    params: {},
    context: adminContext(services(createPending), options),
  } as never);
}

const order = { number: "CI-2026-0007" } as never;

describe("admin enrollment-new loader", () => {
  it("lists one option per live workshop, open month and turno", async () => {
    const result = await loader({
      request: getRequest("/admin/inscripciones/nueva"),
      params: {},
      context: adminContext(services()),
    } as never);
    expect(result).toEqual({
      options: [
        {
          value: "ceramica|2026-11|t1",
          label: "Cerámica · noviembre 2026 · Lunes 18:00",
        },
        {
          value: "ceramica|2026-11|t2",
          label: "Cerámica · noviembre 2026 · Martes 10:00",
        },
      ],
    });
  });

  it("is denied for a non-admin", async () => {
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest("/admin/inscripciones/nueva"),
          params: {},
          context: adminContext(services(), { admin: false }),
        } as never),
      ),
    ).toBe(403);
  });
});

describe("admin enrollment-new action", () => {
  it("creates the pending enrollment with fixed policy fields and redirects to the list", async () => {
    const createPending = vi.fn<CreatePending>().mockResolvedValue(ok(order));
    const response = (await submit(VALID, createPending)) as Response;
    expect(createPending).toHaveBeenCalledWith(expect.anything(), {
      slug: "ceramica",
      period: "2026-11",
      turnoId: "t1",
      student: {
        fullName: "Ana Pérez",
        email: "ana@x.test",
        phone: "351 555 0001",
        policyAccepted: true,
        honeypot: "",
      },
      lines: [],
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/admin/inscripciones?estado=pending_confirmation&ok=created",
    );
  });

  it("returns 422 with Spanish required errors and calls nothing", async () => {
    const createPending = vi.fn<CreatePending>();
    const result = await submit(
      { ...VALID, fullName: "", phone: "" },
      createPending,
    );
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: { email: "ana@x.test" },
        errors: {
          fullName: "Completá este campo.",
          phone: "Completá este campo.",
        },
        formError: "Revisá los campos marcados e intentá de nuevo.",
      },
    });
    expect(createPending).not.toHaveBeenCalled();
  });

  it("maps service validation issues to the fields", async () => {
    const createPending = vi.fn<CreatePending>().mockResolvedValue(
      err({
        kind: "invalid",
        issues: [{ field: "email", code: "invalid" }],
      }) as never,
    );
    expect(await submit(VALID, createPending)).toMatchObject({
      init: { status: 422 },
      data: { errors: { email: "Ingresá un email válido." } },
    });
  });

  it.each([
    ["duplicate-order", "Esa alumna ya tiene una inscripción este mes."],
    ["turno-full", "El turno está completo."],
    ["period-closed", "El mes ya está cerrado."],
  ])("answers 409 with a clear message for %s", async (kind, message) => {
    const createPending = vi
      .fn<CreatePending>()
      .mockResolvedValue(err({ kind }) as never);
    const result = await submit(VALID, createPending);
    expect(result).toMatchObject({
      init: { status: 409 },
      data: { values: { fullName: "Ana Pérez", offer: OFFER } },
    });
    expect(
      (result as { data: { formError: string } }).data.formError,
    ).toContain(message);
  });

  it("is denied for a non-admin and for a cross-site post", async () => {
    const createPending = vi.fn<CreatePending>();
    expect(
      await thrownStatus(() => submit(VALID, createPending, { admin: false })),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        submit(VALID, createPending, {
          headers: { Origin: "https://evil.example.test" },
        }),
      ),
    ).toBe(403);
    expect(createPending).not.toHaveBeenCalled();
  });

  it("answers 503 when the service is unavailable", async () => {
    const createPending = vi
      .fn<CreatePending>()
      .mockResolvedValue(err({ kind: "unavailable" }) as never);
    expect(await thrownStatus(() => submit(VALID, createPending))).toBe(503);
  });
});

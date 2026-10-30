import { describe, expect, it, vi } from "vitest";
import { Money } from "~/modules/_shared";
import type { IntensiveStatus } from "~/modules/workshops";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { IntensivesService } from "~/modules/workshops";
import type { TeachersService } from "~/modules/teachers";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { action, loader } from "./intensive-detail";

const money = (pesos: number) => {
  const parsed = Money.fromCentavos(pesos * 100);
  if (!parsed.ok) throw new Error("invalid fixture money");
  return parsed.value;
};
const image = {
  assetId: "img-1",
  alt: "Una taza",
  asset: { src: "/imagenes/taza.webp" },
};
const missingImage = { assetId: "img-missing", alt: "Una fuente", asset: null };
const intensive = {
  id: "i1",
  name: "Cerámica de sábado",
  slug: "ceramica-sabado",
  summary: "Un resumen",
  description: "Un detalle",
  eventDate: "2026-10-10",
  startsAt: "10:00",
  endsAt: "13:00",
  price: money(30000),
  deposit: money(10000),
  capacity: 12,
  minSeats: 4,
  policyText: "Traé delantal.",
  materialsIncluded: true,
  images: [image, missingImage],
  status: "draft" as const,
  assignment: {
    teacher: { id: "t-archived", name: "Ana", active: false },
    percentage: { basisPoints: 3550 },
  },
  audit: {
    updatedBy: "a@x.test",
    updatedAt: new Date("2026-10-10T03:30:00.000Z"),
  },
};
const fields = {
  name: "Cerámica editada",
  slug: "ceramica-editada",
  summary: "Otro resumen",
  description: "Otro detalle",
  teacherId: "t-archived",
  percentage: "35,5",
  eventDate: "2026-10-11",
  startsAt: "11:00",
  endsAt: "14:00",
  price: "35000",
  deposit: "12000",
  capacity: "15",
  minSeats: "5",
  policyText: "Otra política.",
  materialsIncluded: "on",
  galleryAssetId: "img-1",
  gallerySrc: "/imagenes/taza.webp",
  galleryAlt: "Una taza editada",
};

function context(
  options: {
    admin?: boolean;
    get?: IntensivesService["get"];
    update?: IntensivesService["update"];
    list?: TeachersService["list"];
  } = {},
) {
  return adminContext(
    {
      intensives: withOverrides(createUnavailableService<IntensivesService>(), {
        ...(options.get ? { get: options.get } : {}),
        ...(options.update ? { update: options.update } : {}),
      }),
      teachers: withOverrides(
        createUnavailableService<TeachersService>(),
        options.list ? { list: options.list } : {},
      ),
    },
    options.admin === undefined ? {} : { admin: options.admin },
  );
}

function load(options = {}) {
  return loader({
    request: getRequest("/admin/intensivos/i1"),
    params: { id: "i1" },
    context: context(options),
  } as never);
}
function submit(options = {}) {
  return action({
    request: postRequest("/admin/intensivos/i1", { intent: "save", ...fields }),
    params: { id: "i1" },
    context: context(options),
  } as never);
}

function lifecycleContext(methods: Partial<IntensivesService>, admin = true) {
  return adminContext(
    {
      intensives: withOverrides(
        createUnavailableService<IntensivesService>(),
        methods,
      ),
      teachers: createUnavailableService<TeachersService>(),
    },
    { admin },
  );
}

function submitIntent(
  fields: Record<string, string>,
  methods: Partial<IntensivesService>,
  admin = true,
) {
  return action({
    request: postRequest("/admin/intensivos/i1", fields),
    params: { id: "i1" },
    context: lifecycleContext(methods, admin),
  } as never);
}

describe("admin intensive detail", () => {
  it("loads every form value, the real gallery source, audit in Córdoba time, and only active or assigned archived teachers", async () => {
    const get = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: intensive }),
    );
    const list = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: [
          {
            id: "t-active",
            name: "Beto",
            active: true,
            modality: "own" as const,
          },
          {
            id: "t-archived",
            name: "Ana",
            active: false,
            modality: "third_party" as const,
          },
          {
            id: "t-other",
            name: "Cora",
            active: false,
            modality: "own" as const,
          },
        ],
      }),
    );
    await expect(load({ get, list })).resolves.toMatchObject({
      id: "i1",
      values: {
        name: "Cerámica de sábado",
        slug: "ceramica-sabado",
        summary: "Un resumen",
        description: "Un detalle",
        teacherId: "t-archived",
        percentage: "35,5",
        eventDate: "2026-10-10",
        startsAt: "10:00",
        endsAt: "13:00",
        price: "30000",
        deposit: "10000",
        capacity: "12",
        minSeats: "4",
        policyText: "Traé delantal.",
        materialsIncluded: true,
        images: [
          { assetId: "img-1", src: "/imagenes/taza.webp", alt: "Una taza" },
          { assetId: "img-missing", alt: "Una fuente" },
        ],
      },
      teachers: [
        { id: "t-active", name: "Beto", modality: "own" },
        { id: "t-archived", name: "Ana (archivado)", modality: "third_party" },
      ],
      audit: { updatedBy: "a@x.test" },
    });
    const result = await load({ get, list });
    expect(result.audit.updatedAt).toContain("12:30");
    expect(result.audit.updatedAt).not.toContain("T03:30");
    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
    );
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "all",
    );
  });

  it("denies loader and action before any service call, and maps absent or unavailable records", async () => {
    const get = vi.fn();
    const update = vi.fn();
    const list = vi.fn();
    await expect(
      thrownStatus(() => load({ admin: false, get, list })),
    ).resolves.toBe(403);
    await expect(
      thrownStatus(() => submit({ admin: false, update })),
    ).resolves.toBe(403);
    expect(get).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    await expect(
      thrownStatus(() =>
        load({
          get: vi.fn(() =>
            Promise.resolve({
              ok: false as const,
              error: { kind: "not-found" as const },
            }),
          ),
        }),
      ),
    ).resolves.toBe(404);
    await expect(thrownStatus(() => load())).resolves.toBe(503);
  });

  it("updates with the actor and id then redirects, while invalid responses preserve every value and gallery", async () => {
    const update = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: intensive }),
    );
    const response = await submit({ update });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
      {
        name: "Cerámica editada",
        slug: "ceramica-editada",
        summary: "Otro resumen",
        description: "Otro detalle",
        teacherId: "t-archived",
        percentage: "35,5",
        eventDate: "2026-10-11",
        startsAt: "11:00",
        endsAt: "14:00",
        price: "35000",
        deposit: "12000",
        capacity: "15",
        minSeats: "5",
        policyText: "Otra política.",
        materialsIncluded: true,
        images: [
          {
            assetId: "img-1",
            src: "/imagenes/taza.webp",
            alt: "Una taza editada",
          },
        ],
      },
    );
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=saved",
    );
    const invalid = await submit({
      update: vi.fn(() =>
        Promise.resolve({
          ok: false as const,
          error: {
            kind: "invalid" as const,
            issues: [{ field: "name" as const, code: "required" as const }],
          },
        }),
      ),
    });
    expect(invalid).toMatchObject({
      init: { status: 422 },
      data: {
        values: {
          name: "Cerámica editada",
          slug: "ceramica-editada",
          summary: "Otro resumen",
          description: "Otro detalle",
          teacherId: "t-archived",
          percentage: "35,5",
          eventDate: "2026-10-11",
          startsAt: "11:00",
          endsAt: "14:00",
          price: "35000",
          deposit: "12000",
          capacity: "15",
          minSeats: "5",
          policyText: "Otra política.",
          materialsIncluded: true,
          images: [
            {
              assetId: "img-1",
              src: "/imagenes/taza.webp",
              alt: "Una taza editada",
            },
          ],
        },
        errors: { name: "Completá este campo." },
      },
    });
  });

  it("rejects unknown intents and denial before FormData or a service call", async () => {
    const publish = vi.fn();
    await expect(
      thrownStatus(() => submitIntent({ intent: "unknown" }, { publish })),
    ).resolves.toBe(400);
    expect(publish).not.toHaveBeenCalled();
    await expect(
      thrownStatus(() =>
        submitIntent({ intent: "publish" }, { publish }, false),
      ),
    ).resolves.toBe(403);
    expect(publish).not.toHaveBeenCalled();
  });

  it("calls every lifecycle service with actor and id, then redirects correctly", async () => {
    const changed = { ok: true as const, value: intensive };
    const codes = {
      publish: "published",
      pause: "paused",
      cancel: "cancelled",
      archive: "archived",
      restore: "restored",
    } as const;
    for (const intent of [
      "publish",
      "pause",
      "cancel",
      "archive",
      "restore",
    ] as const) {
      const method = vi.fn(() => Promise.resolve(changed));
      const response = await submitIntent({ intent }, { [intent]: method });
      expect(method).toHaveBeenCalledWith(
        expect.objectContaining({ email: "a@x.test" }),
        "i1",
      );
      expect((response as Response).headers.get("Location")).toBe(
        `/admin/intensivos/i1?ok=${codes[intent]}`,
      );
    }
    const remove = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: undefined }),
    );
    const response = await submitIntent(
      { intent: "delete" },
      { delete: remove },
    );
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
    );
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/intensivos?ok=deleted",
    );
  });

  it("names every publish rule, transition status, and draft-only delete refusal", async () => {
    const refused = (from: IntensiveStatus, to: IntensiveStatus) =>
      Promise.resolve({
        ok: false as const,
        error: { kind: "transition-refused" as const, from, to },
      });
    await expect(
      submitIntent(
        { intent: "pause" },
        { pause: () => refused("draft", "paused") },
      ),
    ).resolves.toMatchObject({
      init: { status: 422 },
      data: { stateError: "No se puede pasar de Borrador a Pausado." },
    });
    await expect(
      submitIntent(
        { intent: "delete" },
        {
          delete: () =>
            Promise.resolve({
              ok: false as const,
              error: {
                kind: "rules-unmet" as const,
                rules: ["draft-only" as const],
              },
            }),
        },
      ),
    ).resolves.toMatchObject({
      data: { stateError: "Solo se puede eliminar un borrador." },
    });
  });

  it("reschedules only its three fields, preserves invalid posted values, and maps failures", async () => {
    const reschedule = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: intensive as never }),
    );
    const response = await submitIntent(
      {
        intent: "reschedule",
        eventDate: "2026-12-12",
        startsAt: "09:00",
        endsAt: "12:00",
        name: "ignored",
      },
      { reschedule },
    );
    expect(reschedule).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
      { eventDate: "2026-12-12", startsAt: "09:00", endsAt: "12:00" },
    );
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=rescheduled",
    );
    await expect(
      submitIntent(
        {
          intent: "reschedule",
          eventDate: "",
          startsAt: "14:00",
          endsAt: "10:00",
        },
        {
          reschedule: () =>
            Promise.resolve({
              ok: false as const,
              error: {
                kind: "invalid" as const,
                issues: [
                  { field: "eventDate" as const, code: "required" as const },
                  {
                    field: "timeRange" as const,
                    code: "end-before-start" as const,
                  },
                ],
              },
            }),
        },
      ),
    ).resolves.toMatchObject({
      init: { status: 422 },
      data: {
        reschedule: {
          values: { eventDate: "", startsAt: "14:00", endsAt: "10:00" },
          errors: {
            eventDate: "Completá este campo.",
            timeRange:
              "El horario de fin tiene que ser posterior al de inicio.",
          },
        },
      },
    });
    for (const [kind, status] of [
      ["denied", 403],
      ["not-found", 404],
      ["unavailable", 503],
    ] as const)
      await expect(
        thrownStatus(() =>
          submitIntent(
            { intent: "archive" },
            {
              archive: () =>
                Promise.resolve({ ok: false as const, error: { kind } }),
            },
          ),
        ),
      ).resolves.toBe(status);
  });

  it("names every unmet intensive publish rule in a form-level 422", async () => {
    const update: IntensivesService["update"] = () =>
      Promise.resolve({
        ok: false,
        error: {
          kind: "rules-unmet",
          rules: [
            "teacher",
            "percentage",
            "time-range",
            "future-start",
            "price",
            "deposit",
            "capacity",
            "min-seats",
          ],
        },
      });
    await expect(submit({ update })).resolves.toMatchObject({
      init: { status: 422 },
      data: {
        formError:
          "No se puede guardar este intensivo porque falta: un profesor asignado, el porcentaje acordado, un horario válido, una fecha futura, un precio, una seña válida, una capacidad válida, cupos mínimos válidos.",
      },
    });
  });
});

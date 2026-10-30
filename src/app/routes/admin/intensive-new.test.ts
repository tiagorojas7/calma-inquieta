import { describe, expect, it, vi } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { TeachersService } from "~/modules/teachers";
import type { IntensivesService } from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { action, loader } from "./intensive-new";

const FIELDS = {
  name: "Cerámica de sábado",
  slug: "",
  summary: "Un resumen",
  description: "Un detalle",
  teacherId: "t1",
  percentage: "35,5",
  eventDate: "2026-10-10",
  startsAt: "10:00",
  endsAt: "13:00",
  price: "30000",
  deposit: "10000",
  capacity: "12",
  minSeats: "4",
  policyText: "Traé delantal.",
  materialsIncluded: "on",
  galleryAssetId: ["img-1", "img-2"],
  galleryAlt: ["Una taza", "Una mesa"],
};

function formFields(fields = FIELDS) {
  const data = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value])
      data.append(key, item);
  }
  return data;
}

function context(
  intensives: IntensivesService,
  teachers: TeachersService,
  admin = true,
) {
  return adminContext({ intensives, teachers }, { admin });
}

describe("admin intensive create", () => {
  it("offers only active teachers", async () => {
    const list = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: [
          { id: "t1", name: "Ana", active: true, modality: "own" },
          { id: "t2", name: "Beto", active: false, modality: "third_party" },
        ],
      }),
    );
    const teachers = withOverrides(
      createUnavailableService<TeachersService>(),
      {
        list: list as unknown as TeachersService["list"],
      },
    );
    const result = await loader({
      request: getRequest("/admin/intensivos/nuevo"),
      params: {},
      context: context(createUnavailableService<IntensivesService>(), teachers),
    } as never);
    expect(result.teachers).toEqual([
      { id: "t1", name: "Ana", modality: "own" },
    ]);
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "active",
    );
  });

  it("creates with every parsed field and redirects to the list", async () => {
    const create = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: {} }),
    ) as unknown as IntensivesService["create"];
    const result = await action({
      request: new Request(
        "https://panel.example.test/admin/intensivos/nuevo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: "https://panel.example.test",
          },
          body: formFields(),
        },
      ),
      params: {},
      context: context(
        withOverrides(createUnavailableService<IntensivesService>(), {
          create,
        }),
        createUnavailableService<TeachersService>(),
      ),
    } as never);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      {
        ...FIELDS,
        galleryAssetId: undefined,
        galleryAlt: undefined,
        materialsIncluded: true,
        images: [
          { assetId: "img-1", alt: "Una taza" },
          { assetId: "img-2", alt: "Una mesa" },
        ],
      },
    );
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/intensivos?ok=created",
    );
  });

  it("keeps every posted field and gallery image on a 422", async () => {
    const create = vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        error: {
          kind: "invalid" as const,
          issues: [{ field: "name", code: "required" as const }],
        },
      }),
    ) as unknown as IntensivesService["create"];
    const result = await action({
      request: new Request(
        "https://panel.example.test/admin/intensivos/nuevo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: "https://panel.example.test",
          },
          body: formFields({ ...FIELDS, name: "  " }),
        },
      ),
      params: {},
      context: context(
        withOverrides(createUnavailableService<IntensivesService>(), {
          create,
        }),
        createUnavailableService<TeachersService>(),
      ),
    } as never);
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: {
          name: "  ",
          images: [
            { assetId: "img-1", alt: "Una taza" },
            { assetId: "img-2", alt: "Una mesa" },
          ],
        },
      },
    });
  });

  it("denies both loader and action before any service call", async () => {
    const list = vi.fn();
    const create = vi.fn();
    const teachers = withOverrides(
      createUnavailableService<TeachersService>(),
      {
        list: list as TeachersService["list"],
      },
    );
    const intensives = withOverrides(
      createUnavailableService<IntensivesService>(),
      {
        create: create as IntensivesService["create"],
      },
    );
    await expect(
      thrownStatus(() =>
        loader({
          request: getRequest("/admin/intensivos/nuevo"),
          params: {},
          context: context(intensives, teachers, false),
        } as never),
      ),
    ).resolves.toBe(403);
    await expect(
      thrownStatus(() =>
        action({
          request: postRequest("/admin/intensivos/nuevo", { name: "" }),
          params: {},
          context: context(intensives, teachers, false),
        } as never),
      ),
    ).resolves.toBe(403);
    expect(list).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("reports an unavailable intensive service", async () => {
    await expect(
      thrownStatus(() =>
        action({
          request: postRequest("/admin/intensivos/nuevo", { name: "" }),
          params: {},
          context: context(
            createUnavailableService<IntensivesService>(),
            createUnavailableService<TeachersService>(),
          ),
        } as never),
      ),
    ).resolves.toBe(503);
  });
});

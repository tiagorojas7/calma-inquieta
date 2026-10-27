import { describe, expect, it, vi } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { MaterialsService, SuppliersService } from "~/modules/materials";
import { Money } from "~/modules/_shared";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { action, loader } from "./material-detail";

const ID = "11111111-1111-4111-8111-111111111111";
const SUPPLIER_ID = "22222222-2222-4222-8222-222222222222";
const ACTIVE_SUPPLIER_ID = "33333333-3333-4333-8333-333333333333";
const money = Money.fromCentavos(250000);
if (!money.ok) throw new Error("invalid fixture money");

const material = {
  id: ID,
  name: "Pincel plano",
  description: "Para acrílico.",
  category: "Pinceles",
  supplier: {
    id: SUPPLIER_ID,
    name: "Casa archivada",
    phone: null,
    email: null,
    notes: null,
    active: false,
    audit: {
      updatedBy: "a@x.test",
      updatedAt: new Date("2026-10-20T12:00:00Z"),
    },
  },
  available: false,
  active: true,
  image: {
    assetId: "image-1",
    alt: "Un pincel",
    asset: { src: "/imagenes/pincel.webp" },
  },
  variants: [
    {
      id: "v1",
      label: "Chico",
      price: money.value,
      available: true,
      used: false,
      position: 0,
      swatch: "#111111",
    },
    {
      id: "v2",
      label: "Grande",
      price: money.value,
      available: false,
      used: true,
      position: 1,
      swatch: null,
    },
  ],
  audit: {
    updatedBy: "admin@example.com",
    updatedAt: new Date("2026-10-20T03:30:00Z"),
  },
};

function context(
  options: {
    admin?: boolean;
    get?: MaterialsService["get"];
    deactivate?: MaterialsService["deactivate"];
    reactivate?: MaterialsService["reactivate"];
    list?: SuppliersService["list"];
  } = {},
) {
  return adminContext(
    {
      materials: withOverrides(createUnavailableService<MaterialsService>(), {
        ...(options.get ? { get: options.get } : {}),
        ...(options.deactivate ? { deactivate: options.deactivate } : {}),
        ...(options.reactivate ? { reactivate: options.reactivate } : {}),
      }),
      suppliers: withOverrides(createUnavailableService<SuppliersService>(), {
        ...(options.list ? { list: options.list } : {}),
      }),
    },
    options.admin === undefined ? {} : { admin: options.admin },
  );
}

function load(options = {}, id = ID) {
  return loader({
    request: getRequest(`/admin/materiales/${id}`),
    params: { id },
    context: context(options),
  } as never);
}
function submit(intent: string, options = {}, id = ID) {
  return action({
    request: postRequest(`/admin/materiales/${id}`, { intent }),
    params: { id },
    context: context(options),
  } as never);
}

describe("admin material detail loader", () => {
  it("hydrates the detail, active supplier choices with its archived supplier, variants, image and Córdoba audit", async () => {
    const get = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: material }),
    );
    const list = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: [
          {
            ...material.supplier,
            id: ACTIVE_SUPPLIER_ID,
            name: "Casa activa",
            active: true,
          },
        ],
      }),
    );
    const result = await load({ get, list });
    expect(result).toMatchObject({
      id: ID,
      name: "Pincel plano",
      available: false,
      active: true,
      image: { src: "/imagenes/pincel.webp", alt: "Un pincel" },
      suppliers: [
        { id: ACTIVE_SUPPLIER_ID, name: "Casa activa" },
        { id: SUPPLIER_ID, name: "Casa archivada (archivado)" },
      ],
      variants: [
        { id: "v1", label: "Chico", available: true, used: false },
        { id: "v2", label: "Grande", available: false, used: true },
      ],
      audit: { updatedBy: "admin@example.com" },
    });
    expect(result.audit.updatedAt).toBe("20 oct 2026, 12:30 a. m.");
    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      ID,
    );
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      { active: true },
    );
  });

  it("requires an actor first and rejects malformed ids without service access", async () => {
    const get = vi.fn();
    const list = vi.fn();
    await expect(
      thrownStatus(() => load({ admin: false, get, list })),
    ).resolves.toBe(403);
    await expect(
      thrownStatus(() => load({ get, list }, "not-a-uuid")),
    ).resolves.toBe(404);
    expect(get).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it("maps missing and unavailable detail services", async () => {
    await expect(
      thrownStatus(() =>
        load({
          get: () =>
            Promise.resolve({
              ok: false as const,
              error: { kind: "not-found" as const },
            }),
        }),
      ),
    ).resolves.toBe(404);
    await expect(thrownStatus(() => load())).resolves.toBe(503);
  });
});

describe("admin material detail action", () => {
  it("requires the actor before id validation or body parsing", async () => {
    const deactivate = vi.fn();
    await expect(
      thrownStatus(() =>
        submit("deactivate", { admin: false, deactivate }, "not-a-uuid"),
      ),
    ).resolves.toBe(403);
    await expect(
      thrownStatus(() => submit("deactivate", { deactivate }, "not-a-uuid")),
    ).resolves.toBe(404);
    expect(deactivate).not.toHaveBeenCalled();
  });

  it("deactivates and reactivates with the actor, then redirects back", async () => {
    for (const intent of ["deactivate", "reactivate"] as const) {
      const method = vi.fn(() =>
        Promise.resolve({ ok: true as const, value: material }),
      );
      const response = await submit(intent, { [intent]: method });
      expect(method).toHaveBeenCalledWith(
        expect.objectContaining({ email: "a@x.test" }),
        ID,
      );
      expect((response as Response).headers.get("Location")).toBe(
        `/admin/materiales/${ID}`,
      );
    }
  });

  it("rejects unknown intents and maps lifecycle failures", async () => {
    await expect(thrownStatus(() => submit("save"))).resolves.toBe(400);
    for (const [kind, status] of [
      ["denied", 403],
      ["not-found", 404],
      ["unavailable", 503],
    ] as const) {
      await expect(
        thrownStatus(() =>
          submit("deactivate", {
            deactivate: () =>
              Promise.resolve({ ok: false as const, error: { kind } }),
          }),
        ),
      ).resolves.toBe(status);
    }
  });

  it("returns an actionable 422 when reactivation duplicates an active name", async () => {
    const response = await submit("reactivate", {
      reactivate: () =>
        Promise.resolve({
          ok: false as const,
          error: {
            kind: "invalid" as const,
            issues: [{ field: "name" as const, code: "duplicate" as const }],
          },
        }),
    });

    expect(response).toMatchObject({
      data: { stateError: "Ya existe uno activo con el mismo nombre." },
      init: { status: 422 },
    });
  });
});

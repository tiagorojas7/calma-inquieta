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
    update?: MaterialsService["update"];
    list?: SuppliersService["list"];
  } = {},
) {
  return adminContext(
    {
      materials: withOverrides(createUnavailableService<MaterialsService>(), {
        ...(options.get ? { get: options.get } : {}),
        ...(options.deactivate ? { deactivate: options.deactivate } : {}),
        ...(options.reactivate ? { reactivate: options.reactivate } : {}),
        ...(options.update ? { update: options.update } : {}),
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

function save(fields: [string, string][], options = {}, id = ID) {
  const body = new URLSearchParams(fields);
  return action({
    request: new Request(`https://panel.example.test/admin/materiales/${id}`, {
      method: "POST",
      headers: {
        Origin: "https://panel.example.test",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }),
    params: { id },
    context: context(options),
  } as never);
}

type SaveValidationResponse = {
  data: {
    formError?: string;
    values: {
      image: { assetId: string; alt: string } | null;
      variants: readonly { id?: string; label: string }[];
    };
    errors: {
      name?: string;
      variants?: { rows?: readonly { price?: string }[] };
    };
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSaveValidationResponse(
  value: unknown,
): value is SaveValidationResponse {
  if (!isRecord(value)) return false;

  const data: unknown = value.data;
  if (!isRecord(data)) return false;
  const errors: unknown = data["errors"];
  const values: unknown = data["values"];
  if (
    !isRecord(errors) ||
    !isRecord(values) ||
    !Array.isArray(values.variants)
  ) {
    return false;
  }
  if (data.formError !== undefined && typeof data.formError !== "string") {
    return false;
  }
  if (
    values.image !== null &&
    (!isRecord(values.image) ||
      typeof values.image.assetId !== "string" ||
      typeof values.image.alt !== "string")
  ) {
    return false;
  }
  if (
    !values.variants.every(
      (variant) =>
        isRecord(variant) &&
        (variant.id === undefined || typeof variant.id === "string") &&
        typeof variant.label === "string",
    )
  ) {
    return false;
  }
  if (errors.name !== undefined && typeof errors.name !== "string")
    return false;
  if (errors.variants === undefined) return true;
  if (!isRecord(errors.variants)) return false;
  if (errors.variants.rows === undefined) return true;
  return (
    Array.isArray(errors.variants.rows) &&
    errors.variants.rows.every(
      (row) =>
        isRecord(row) &&
        (row.price === undefined || typeof row.price === "string"),
    )
  );
}

const saveFields: [string, string][] = [
  ["intent", "save"],
  ["name", "Pincel editado"],
  ["description", "Para óleo."],
  ["category", "Pinceles"],
  ["supplierId", SUPPLIER_ID],
  ["available", "on"],
  ["imageAssetId", "image-1"],
  ["imageAlt", "Un pincel editado"],
  ["variantId", "v2"],
  ["variantLabel", "Grande"],
  ["variantPrice", "3000"],
  ["variantSwatch", "#222222"],
  ["variantAvailable", "0"],
  ["variantId", "v1"],
  ["variantLabel", "Chico"],
  ["variantPrice", "2500"],
  ["variantSwatch", "#111111"],
  ["variantAvailable", "1"],
  ["variantLabel", "Nuevo"],
  ["variantPrice", "1200"],
  ["variantSwatch", ""],
  ["variantAvailable", "2"],
];

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
        `/admin/materiales/${ID}?ok=${intent === "deactivate" ? "deactivated" : "reactivated"}`,
      );
    }
  });

  it("rejects unknown intents and maps lifecycle failures", async () => {
    await expect(thrownStatus(() => submit("unknown"))).resolves.toBe(400);
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

  it("saves reordered identified variants and new variants, then redirects back", async () => {
    const update = vi.fn<MaterialsService["update"]>();
    update.mockResolvedValue({ ok: true as const, value: material } as never);

    const response = await save(saveFields, { update });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      ID,
      expect.objectContaining({
        name: "Pincel editado",
        image: { assetId: "image-1", alt: "Un pincel editado" },
        variants: [
          expect.objectContaining({ id: "v2", label: "Grande", price: "3000" }),
          expect.objectContaining({ id: "v1", label: "Chico", price: "2500" }),
          expect.objectContaining({ label: "Nuevo", price: "1200" }),
        ],
      }),
    );
    expect((response as Response).headers.get("Location")).toBe(
      `/admin/materiales/${ID}?ok=saved`,
    );
  });

  it("keeps a new first variant unidentifed while retaining the reordered existing variant id", async () => {
    const update = vi.fn<MaterialsService["update"]>();
    update.mockResolvedValue({ ok: true as const, value: material } as never);

    await save(
      [
        ["intent", "save"],
        ["name", "Pincel editado"],
        ["description", "Para óleo."],
        ["category", "Pinceles"],
        ["supplierId", SUPPLIER_ID],
        ["available", "on"],
        ["imageAssetId", "image-1"],
        ["imageAlt", "Un pincel editado"],
        ["variantId", ""],
        ["variantLabel", "Nuevo primero"],
        ["variantPrice", "1200"],
        ["variantSwatch", ""],
        ["variantAvailable", "0"],
        ["variantId", "v2"],
        ["variantLabel", "Grande"],
        ["variantPrice", "3000"],
        ["variantSwatch", "#222222"],
        ["variantAvailable", "1"],
      ],
      { update },
    );

    const submitted = update.mock.calls[0]?.[2];
    expect(submitted).toMatchObject({
      variants: [
        {
          label: "Nuevo primero",
          price: "1200",
          available: true,
        },
        {
          id: "v2",
          label: "Grande",
          price: "3000",
          available: true,
        },
      ],
    });
    expect(submitted?.variants[0]?.id).toBeUndefined();
  });

  it("rejects zero variants before update and preserves submitted fields on validation", async () => {
    const update = vi.fn();
    const noVariants = saveFields.filter(([key]) => !key.startsWith("variant"));
    const emptyResponse = await save(noVariants, { update });
    expect(emptyResponse).toMatchObject({ init: { status: 422 } });
    expect(update).not.toHaveBeenCalled();

    const invalidResponse = await save(saveFields, {
      update: () =>
        Promise.resolve({
          ok: false as const,
          error: {
            kind: "invalid" as const,
            issues: [
              { field: "name" as const, code: "required" as const },
              {
                field: "variants.1.price" as const,
                code: "not-whole-pesos" as const,
              },
            ],
          },
        }),
    });
    expect(invalidResponse).toMatchObject({ init: { status: 422 } });
    if (!isSaveValidationResponse(invalidResponse)) {
      throw new Error("expected validation route data");
    }
    expect(invalidResponse.data.values.image).toMatchObject({
      assetId: "image-1",
      alt: "Un pincel editado",
    });
    expect(
      invalidResponse.data.values.variants.map((variant) => variant.id),
    ).toEqual(["v2", "v1", undefined]);
    expect(invalidResponse.data.errors.name).toEqual(expect.any(String));
    expect(invalidResponse.data.errors.variants?.rows?.[1]?.price).toEqual(
      expect.any(String),
    );
  });

  it("maps save failures and reports variant usage without losing the edit", async () => {
    const variantInUse = await save(saveFields, {
      update: () =>
        Promise.resolve({
          ok: false as const,
          error: { kind: "variant-in-use" as const },
        }),
    });
    expect(variantInUse).toMatchObject({ init: { status: 422 } });
    if (!isSaveValidationResponse(variantInUse)) {
      throw new Error("expected variant-in-use validation route data");
    }
    expect(variantInUse.data.formError).toContain("usada");
    expect(variantInUse.data.values.variants).toHaveLength(3);

    for (const [kind, status] of [
      ["denied", 403],
      ["not-found", 404],
      ["unavailable", 503],
    ] as const) {
      await expect(
        thrownStatus(() =>
          save(saveFields, {
            update: () =>
              Promise.resolve({ ok: false as const, error: { kind } }),
          }),
        ),
      ).resolves.toBe(status);
    }
  });
});

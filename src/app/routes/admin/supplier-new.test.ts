import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { SuppliersService } from "~/modules/materials";
import {
  adminContext,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { suppliersFixture } from "~/testing/admin/supplier-kit";
import { action } from "./supplier-new";

const VALID = {
  intent: "save",
  name: "  Casa Pincel ",
  phone: "351 555",
  email: "",
  notes: "",
};

function submit(
  service: SuppliersService,
  fields: Record<string, string>,
  options: { admin?: boolean; headers?: Record<string, string> } = {},
) {
  return action({
    request: postRequest(
      "/admin/materiales/proveedores/nuevo",
      fields,
      options.headers,
    ),
    params: {},
    context: adminContext({ suppliers: service }, options),
  } as never);
}

describe("admin supplier create action", () => {
  it("creates the supplier as the admin and redirects to the list", async () => {
    const { service, repository } = suppliersFixture();
    const response = await submit(service, VALID);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/materiales/proveedores",
    );
    expect([...repository.suppliers.values()]).toMatchObject([
      {
        name: "Casa Pincel",
        phone: "351 555",
        active: true,
        audit: { updatedBy: "a@x.test" },
      },
    ]);
  });

  it("returns 422 with the typed values and Spanish field errors, storing nothing", async () => {
    const { service, repository } = suppliersFixture();
    const result = await submit(service, {
      ...VALID,
      name: "   ",
      email: "x",
      phone: "abc",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: { name: "   ", email: "x", phone: "abc" },
        errors: {
          name: "Completá este campo.",
          email: "El formato no es válido. Revisalo.",
          phone: "El formato no es válido. Revisalo.",
        },
        formError: "Revisá los campos marcados e intentá de nuevo.",
      },
    });
    expect(repository.suppliers.size).toBe(0);
  });

  it("reports a duplicate active name on the name field", async () => {
    const { service } = suppliersFixture();
    await submit(service, VALID);
    const result = await submit(service, { ...VALID, name: "casa pincel" });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: { errors: { name: "Ya existe uno activo con el mismo nombre." } },
    });
  });

  it("reports an over-long note", async () => {
    const { service } = suppliersFixture();
    const result = await submit(service, {
      ...VALID,
      notes: "x".repeat(1001),
    });
    expect(result).toMatchObject({
      data: { errors: { notes: "Es demasiado largo. Acortalo." } },
    });
  });

  it("is denied for a non-admin and for a cross-site post", async () => {
    const { service, repository } = suppliersFixture();
    expect(
      await thrownStatus(() => submit(service, VALID, { admin: false })),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        submit(service, VALID, {
          headers: { Origin: "https://evil.example.test" },
        }),
      ),
    ).toBe(403);
    expect(repository.suppliers.size).toBe(0);
  });

  it("answers 503 when the service is unavailable", async () => {
    expect(
      await thrownStatus(() =>
        submit(createUnavailableService<SuppliersService>(), VALID),
      ),
    ).toBe(503);
  });
});

import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { SuppliersService } from "~/modules/materials";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { suppliersFixture } from "~/testing/admin/supplier-kit";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { action, loader } from "./supplier-detail";

const DRAFT = {
  name: "Casa Pincel",
  phone: "351 555",
  email: "c@x.test",
  notes: "Entrega los jueves",
};
const LIST = "/admin/materiales/proveedores";

async function withSupplier() {
  const { service, repository } = suppliersFixture();
  const created = await service.create(testAdminActor(), DRAFT);
  if (!created.ok) throw new Error("seed failed");
  return { service, repository, id: created.value.id };
}

function load(service: SuppliersService, id: string) {
  return loader({
    request: getRequest(`${LIST}/${id}`),
    params: { id },
    context: adminContext({ suppliers: service }),
  } as never);
}

function submit(
  service: SuppliersService,
  id: string,
  fields: Record<string, string>,
  options: { admin?: boolean } = {},
) {
  return action({
    request: postRequest(`${LIST}/${id}`, fields),
    params: { id },
    context: adminContext({ suppliers: service }, options),
  } as never);
}

describe("admin supplier detail loader", () => {
  it("loads the supplier as form values, empty strings for absent parts", async () => {
    const { service, id } = await withSupplier();
    expect(await load(service, id)).toEqual({
      id,
      active: true,
      feedback: null,
      values: DRAFT,
    });
    const bare = await service.create(testAdminActor(), {
      name: "Solo nombre",
      phone: "",
      email: "",
      notes: "",
    });
    if (!bare.ok) throw new Error("seed failed");
    expect(await load(service, bare.value.id)).toMatchObject({
      values: { name: "Solo nombre", phone: "", email: "", notes: "" },
    });
  });

  it("answers 404 for an unknown supplier and 503 when unavailable", async () => {
    const { service } = await withSupplier();
    expect(await thrownStatus(() => load(service, "nope"))).toBe(404);
    expect(
      await thrownStatus(() =>
        load(createUnavailableService<SuppliersService>(), "s1"),
      ),
    ).toBe(503);
  });
});

describe("admin supplier detail action", () => {
  it("saves the edit as the admin and redirects to the list", async () => {
    const { service, repository, id } = await withSupplier();
    const response = await submit(service, id, {
      intent: "save",
      ...DRAFT,
      notes: "Cambió el horario",
    });
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get("Location")).toBe(
      `${LIST}?ok=saved`,
    );
    expect(repository.suppliers.get(id)).toMatchObject({
      notes: "Cambió el horario",
      audit: { updatedBy: "a@x.test" },
    });
  });

  it("returns 422 with values and errors for an invalid edit, keeping the record", async () => {
    const { service, repository, id } = await withSupplier();
    const result = await submit(service, id, {
      intent: "save",
      ...DRAFT,
      email: "x",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: { email: "x" },
        errors: { email: "El formato no es válido. Revisalo." },
      },
    });
    expect(repository.suppliers.get(id)?.email).toBe("c@x.test");
  });

  it("archives and returns to the supplier page", async () => {
    const { service, repository, id } = await withSupplier();
    const response = await submit(service, id, { intent: "archive" });
    expect((response as Response).headers.get("Location")).toBe(
      `${LIST}/${id}?ok=archived`,
    );
    expect(repository.suppliers.get(id)?.active).toBe(false);
  });

  it("reactivates an archived supplier", async () => {
    const { service, repository, id } = await withSupplier();
    await service.archive(testAdminActor(), id);
    const response = await submit(service, id, { intent: "reactivate" });
    expect((response as Response).headers.get("Location")).toBe(
      `${LIST}/${id}?ok=restored`,
    );
    expect(repository.suppliers.get(id)?.active).toBe(true);
  });

  it("refuses to reactivate over an active supplier with the same name", async () => {
    const { service, repository, id } = await withSupplier();
    await service.archive(testAdminActor(), id);
    await service.create(testAdminActor(), DRAFT);
    const result = await submit(service, id, { intent: "reactivate" });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: { stateError: "Ya existe uno activo con el mismo nombre." },
    });
    expect(repository.suppliers.get(id)?.active).toBe(false);
  });

  it("answers 400 for a missing or unknown intent", async () => {
    const { service, id } = await withSupplier();
    expect(await thrownStatus(() => submit(service, id, {}))).toBe(400);
    expect(
      await thrownStatus(() => submit(service, id, { intent: "delete" })),
    ).toBe(400);
  });

  it("answers 404 for an unknown supplier and 403 for a non-admin", async () => {
    const { service, id } = await withSupplier();
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

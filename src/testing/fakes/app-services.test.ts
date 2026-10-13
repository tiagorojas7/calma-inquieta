import { describe, expect, it } from "vitest";
import { ok } from "~/modules/_shared";
import type { SystemStatusView } from "~/modules/system-status";
import { createAdminTestServices, createTestServices } from "./app-services";
import { testAdminActor } from "./admin-actor";
import {
  buildRawSiteContent,
  createInMemorySiteContentSource,
} from "./in-memory-site-content-source";
import { createSiteContent } from "~/modules/site-content";
import {
  buildIntensiveWorkshop,
  buildMaterial,
  buildMaterialVariant,
  buildMonthlyWorkshop,
  buildSupplier,
  buildTurno,
  buildWorkshopPeriod,
} from "./admin-builders";

const VIEW: SystemStatusView = {
  status: "ok",
  checks: [
    { name: "database", status: "pass" },
    { name: "migrations", status: "pass" },
  ],
  latestMigration: "0000_baseline",
  buildCommit: "test",
  checkedAt: "2026-10-05T12:00:00.000Z",
};

describe("createAdminTestServices", () => {
  it("defaults to an admin actor and accepts overrides", async () => {
    const services = createAdminTestServices();
    expect(services.adminAccess.kind).toBe("admin");
    expect(
      services.adminAccess.kind === "admin" && services.adminAccess.actor.email,
    ).toBe("owner@example.com");
    const workshopResult = await services.monthlyWorkshops.get(
      services.adminAccess as never,
      "id",
    );
    const periodResult = await services.workshopPeriods.get(
      services.adminAccess as never,
      "id",
      "2026-01",
    );
    expect(!workshopResult.ok && workshopResult.error).toEqual({
      kind: "unavailable",
    });
    expect(!periodResult.ok && periodResult.error).toEqual({
      kind: "unavailable",
    });
    const workshop = buildMonthlyWorkshop({ name: "Otro" });
    const turno = buildTurno({ defaultCapacity: 20 });
    const period = buildWorkshopPeriod({ status: "open" });
    expect(workshop.name).toBe("Otro");
    expect(turno.defaultCapacity).toBe(20);
    expect(period.status).toBe("open");
  });

  it("fails closed on the intensives, suppliers and materials placeholders", async () => {
    const services = createAdminTestServices();
    const actor = testAdminActor();
    const results = await Promise.all([
      services.intensives.get(actor, "id"),
      services.suppliers.list(actor),
      services.materials.listSelectable(actor),
    ]);
    for (const result of results)
      expect(!result.ok && result.error).toEqual({ kind: "unavailable" });
  });

  it("applies defaults and overrides in the intensive, supplier and material builders", () => {
    const intensive = buildIntensiveWorkshop({ capacity: 4 });
    expect(intensive.id).toBe("intensive-1");
    expect(intensive.capacity).toBe(4);
    expect(intensive.status).toBe("draft");
    expect(buildIntensiveWorkshop().capacity).toBe(10);

    const supplier = buildSupplier({ name: "Otro", active: false });
    expect(supplier.name).toBe("Otro");
    expect(supplier.active).toBe(false);
    expect(buildSupplier().active).toBe(true);
    expect(buildSupplier().phone).toBeNull();

    const variant = buildMaterialVariant({ label: "Roja", position: 2 });
    expect(variant.label).toBe("Roja");
    expect(variant.position).toBe(2);
    expect(buildMaterialVariant().label).toBe("Única");

    const material = buildMaterial({ category: "Esmalte" });
    expect(material.category).toBe("Esmalte");
    expect(material.supplier.id).toBe("supplier-1");
    expect(material.variants).toHaveLength(1);
    expect(buildMaterial().category).toBe("Arcilla");
  });
});

describe("createTestServices", () => {
  it("resolves an ok status, serves in-memory content and a fixed site config", async () => {
    const services = createTestServices();

    const status = await services.getSystemStatus();
    const profile = await services.siteContent.getBusinessProfile();

    expect(status.ok).toBe(true);
    expect(status.ok && status.value.status).toBe("ok");
    expect(profile.whatsapp.display).toBe("351 000 0000");
    expect(services.site).toEqual({
      baseUrl: "https://example.test",
      indexingEnabled: false,
    });
    expect(
      (
        await services.monthlyWorkshops.listVisible(
          services.adminAccess as never,
        )
      ).ok,
    ).toBe(false);
    expect(
      (await services.workshopPeriods.list(services.adminAccess as never, "w"))
        .ok,
    ).toBe(false);
    const actor = testAdminActor();
    for (const result of await Promise.all([
      services.intensives.listVisible(actor),
      services.suppliers.list(actor),
      services.materials.categorySuggestions(actor),
    ]))
      expect(!result.ok && result.error).toEqual({ kind: "unavailable" });
  });

  it("replaces one field and keeps the other defaults", async () => {
    const services = createTestServices({
      getSystemStatus: () => Promise.resolve(ok(VIEW)),
    });
    const other = createTestServices({
      site: { baseUrl: "https://otro.test", indexingEnabled: true },
    });

    const status = await services.getSystemStatus();

    expect(status.ok && status.value.buildCommit).toBe("test");
    expect(services.site.baseUrl).toBe("https://example.test");
    expect(other.site).toEqual({
      baseUrl: "https://otro.test",
      indexingEnabled: true,
    });
    expect((await other.getSystemStatus()).ok).toBe(true);
  });

  it("accepts a site content reader of its own", async () => {
    const base = buildRawSiteContent();
    const siteContent = createSiteContent(
      createInMemorySiteContentSource({
        ...base,
        contact: { ...base.contact, heading: "Otro" },
      }),
    );

    const services = createTestServices({ siteContent });

    expect((await services.siteContent.getContactPage()).heading).toBe("Otro");
  });
});

import { describe, expect, it, vi } from "vitest";
import type { IntensivesService } from "~/modules/workshops";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import {
  DEFAULT_INTENSIVE_POLICY,
  parseQuickIntensive,
  publishQuickIntensive,
} from "./intensive-quick";

const actor = testAdminActor();

function formOf(fields: Record<string, string>) {
  const data = new FormData();
  const base: Record<string, string> = {
    name: "Cerámica de sábado",
    description: "Un workshop para empezar de cero.",
    teacherId: "t1",
    eventDate: "2026-12-10",
    startsAt: "10:00",
    endsAt: "13:00",
    project0Name: "Taza de torno",
    project0Price: "30000",
    project0Deposit: "10000",
    project0Description: "",
    capacity: "12",
    intent: "publish",
    ...fields,
  };
  for (const [key, value] of Object.entries(base)) data.append(key, value);
  return data;
}

describe("parseQuickIntensive", () => {
  it("derives the slug and summary and defaults seats and policy", () => {
    const input = parseQuickIntensive(formOf({}));
    expect(input.intent).toBe("publish");
    expect(input.draft).toMatchObject({
      slug: "",
      summary: "Un workshop para empezar de cero.",
      minSeats: "1",
      policyText: DEFAULT_INTENSIVE_POLICY,
      materialsIncluded: false,
    });
  });

  it("keeps what the owner typed in the advanced options", () => {
    const input = parseQuickIntensive(
      formOf({
        minSeats: "4",
        policyText: "Traé delantal.",
        summary: "Mi resumen",
        materialsIncluded: "on",
        percentage: "35",
      }),
    );
    expect(input.draft).toMatchObject({
      minSeats: "4",
      policyText: "Traé delantal.",
      summary: "Mi resumen",
      materialsIncluded: true,
      percentage: "35",
    });
  });

  it("builds every project from its own fields, never from the workshop name", () => {
    const input = parseQuickIntensive(
      formOf({
        project0Name: "  Plato hondo ",
        project0Price: "45000",
        project0Deposit: "15000",
        project0Description: "Un plato.",
        project1Name: "Taza",
        project1Price: "30000",
        project1Deposit: "10000",
        project1ImageAssetId: "img-1",
        project1ImageSrc: "/imagenes/img-1.webp",
        project1ImageAlt: "Una taza",
        project1MaterialVariant0: "v-1",
        project1MaterialQuantity0: "2",
      }),
    );

    expect(input.draft.projects).toEqual([
      {
        name: "  Plato hondo ",
        price: "45000",
        deposit: "15000",
        description: "Un plato.",
        image: null,
        materials: [],
      },
      {
        name: "Taza",
        price: "30000",
        deposit: "10000",
        description: "",
        image: { assetId: "img-1", alt: "Una taza" },
        materials: [{ variantId: "v-1", quantity: "2" }],
      },
    ]);
    expect(input.projects.map((block) => block.name)).toEqual([
      "  Plato hondo ",
      "Taza",
    ]);
    expect(input.projects[1]?.image?.src).toBe("/imagenes/img-1.webp");
    expect(input.draft).not.toHaveProperty("price");
    expect(input.values).not.toHaveProperty("projects");
  });

  it("leaves the project name empty when the owner typed none", () => {
    const input = parseQuickIntensive(formOf({ project0Name: "" }));

    expect(input.draft.projects[0]?.name).toBe("");
  });

  it("sends no project when the form has no block, so the service asks for the first", () => {
    const data = new FormData();
    data.append("name", "Taller");

    expect(parseQuickIntensive(data).draft.projects).toEqual([]);
  });

  it("redisplays only what was typed, not the derived values", () => {
    const input = parseQuickIntensive(formOf({}));
    expect(input.values).toMatchObject({
      minSeats: "",
      policyText: "",
      summary: "",
    });
  });

  it("reads the publish intent and treats anything else as a draft", () => {
    expect(parseQuickIntensive(formOf({ intent: "draft" })).intent).toBe(
      "draft",
    );
    expect(parseQuickIntensive(formOf({ intent: "other" })).intent).toBe(
      "draft",
    );
  });
});

function service(methods: object) {
  return methods as IntensivesService;
}
const created = (id: string) =>
  Promise.resolve({ ok: true as const, value: { id } });
const duplicate = () =>
  Promise.resolve({
    ok: false as const,
    error: {
      kind: "invalid" as const,
      issues: [{ field: "slug", code: "duplicate" }],
    },
  });

const NO_CATALOG: ReadonlySet<string> = new Set();

describe("publishQuickIntensive", () => {
  it("creates then publishes", async () => {
    const create = vi.fn(() => created("i1"));
    const publish = vi.fn(() => created("i1"));
    const outcome = await publishQuickIntensive(
      service({ create, publish }),
      actor,
      parseQuickIntensive(formOf({})),
      NO_CATALOG,
    );
    expect(outcome).toEqual({ kind: "published", id: "i1" });
    expect(create).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ slug: "ceramica-de-sabado" }),
    );
    expect(publish).toHaveBeenCalledWith(actor, "i1");
  });

  it("only creates for a draft", async () => {
    const create = vi.fn(() => created("i1"));
    const publish = vi.fn();
    const outcome = await publishQuickIntensive(
      service({ create, publish }),
      actor,
      parseQuickIntensive(formOf({ intent: "draft" })),
      NO_CATALOG,
    );
    expect(outcome).toEqual({ kind: "saved", id: "i1" });
    expect(publish).not.toHaveBeenCalled();
  });

  it("suffixes the slug while another intensivo holds it", async () => {
    const create = vi
      .fn()
      .mockReturnValueOnce(duplicate())
      .mockReturnValueOnce(duplicate())
      .mockReturnValueOnce(created("i2"));
    const outcome = await publishQuickIntensive(
      service({ create, publish: () => created("i2") }),
      actor,
      parseQuickIntensive(formOf({})),
      NO_CATALOG,
    );
    expect(outcome).toEqual({ kind: "published", id: "i2" });
    expect(
      create.mock.calls.map((call) => (call[1] as { slug: string }).slug),
    ).toEqual([
      "ceramica-de-sabado",
      "ceramica-de-sabado-2",
      "ceramica-de-sabado-3",
    ]);
  });

  it("reports a slug problem on the name", async () => {
    const create = vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        error: {
          kind: "invalid" as const,
          issues: [
            { field: "slug", code: "required" },
            { field: "name", code: "required" },
            { field: "project0Price", code: "required" },
          ],
        },
      }),
    );
    const outcome = await publishQuickIntensive(
      service({ create }),
      actor,
      parseQuickIntensive(formOf({ name: "" })),
      NO_CATALOG,
    );
    expect(outcome).toEqual({
      kind: "invalid",
      issues: [
        { field: "name", code: "required" },
        { field: "project0Price", code: "required" },
      ],
    });
  });

  it("keeps the draft and names the missing rules when publishing is refused", async () => {
    const publish = vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        error: {
          kind: "rules-unmet" as const,
          rules: ["teacher", "future-start"],
        },
      }),
    );
    const outcome = await publishQuickIntensive(
      service({ create: () => created("i1"), publish }),
      actor,
      parseQuickIntensive(formOf({})),
      NO_CATALOG,
    );
    expect(outcome).toEqual({
      kind: "partial",
      id: "i1",
      rules: ["teacher", "future-start"],
    });
  });

  it("keeps the draft with no rules when publishing fails for another reason", async () => {
    const outcome = await publishQuickIntensive(
      service({
        create: () => created("i1"),
        publish: () =>
          Promise.resolve({
            ok: false as const,
            error: { kind: "unavailable" as const },
          }),
      }),
      actor,
      parseQuickIntensive(formOf({})),
      NO_CATALOG,
    );
    expect(outcome).toEqual({ kind: "partial", id: "i1", rules: [] });
  });

  it("returns a create failure that is not a validation issue", async () => {
    const outcome = await publishQuickIntensive(
      service({
        create: () =>
          Promise.resolve({
            ok: false as const,
            error: { kind: "denied" as const },
          }),
      }),
      actor,
      parseQuickIntensive(formOf({})),
      NO_CATALOG,
    );
    expect(outcome).toEqual({ kind: "failed", failure: { kind: "denied" } });
  });

  describe("the materials of the projects", () => {
    const withBill = (...lines: string[][]) =>
      parseQuickIntensive(
        formOf(
          Object.fromEntries(
            lines.flatMap(([block, line, variant, quantity], at) => [
              [
                `project${block ?? "0"}MaterialVariant${line ?? String(at)}`,
                variant ?? "",
              ],
              [
                `project${block ?? "0"}MaterialQuantity${line ?? String(at)}`,
                quantity ?? "1",
              ],
            ]),
          ),
        ),
      );

    it("refuses a variant that is not in the catalog before creating anything, naming its block and line", async () => {
      const create = vi.fn(() => created("i1"));
      const outcome = await publishQuickIntensive(
        service({ create }),
        actor,
        withBill(["0", "0", "v-ok", "1"], ["0", "1", "v-gone", "2"]),
        new Set(["v-ok"]),
      );

      expect(outcome).toEqual({
        kind: "invalid",
        issues: [
          { field: "project0MaterialVariant1", code: "unknown-reference" },
        ],
      });
      expect(create).not.toHaveBeenCalled();
    });

    it("names every unknown variant of every block", async () => {
      const outcome = await publishQuickIntensive(
        service({ create: () => created("i1") }),
        actor,
        parseQuickIntensive(
          formOf({
            project1Name: "Plato",
            project1MaterialVariant0: "v-a",
            project1MaterialQuantity0: "1",
            project0MaterialVariant0: "v-b",
            project0MaterialQuantity0: "1",
          }),
        ),
        NO_CATALOG,
      );

      expect(outcome).toEqual({
        kind: "invalid",
        issues: [
          { field: "project0MaterialVariant0", code: "unknown-reference" },
          { field: "project1MaterialVariant0", code: "unknown-reference" },
        ],
      });
    });

    it("creates when every variant is in the catalog", async () => {
      const create = vi.fn(() => created("i1"));
      const outcome = await publishQuickIntensive(
        service({ create, publish: () => created("i1") }),
        actor,
        withBill(["0", "0", "v-ok", "3"]),
        new Set(["v-ok"]),
      );

      expect(outcome).toEqual({ kind: "published", id: "i1" });
      expect(create).toHaveBeenCalledWith(
        actor,
        expect.objectContaining({
          projects: [
            expect.objectContaining({
              materials: [{ variantId: "v-ok", quantity: "3" }],
            }),
          ],
        }),
      );
    });
  });
});

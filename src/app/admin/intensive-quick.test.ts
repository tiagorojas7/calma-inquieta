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
    description: "Un intensivo para empezar de cero.",
    teacherId: "t1",
    eventDate: "2026-12-10",
    startsAt: "10:00",
    endsAt: "13:00",
    price: "30000",
    deposit: "10000",
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
      summary: "Un intensivo para empezar de cero.",
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

describe("publishQuickIntensive", () => {
  it("creates then publishes", async () => {
    const create = vi.fn(() => created("i1"));
    const publish = vi.fn(() => created("i1"));
    const outcome = await publishQuickIntensive(
      service({ create, publish }),
      actor,
      parseQuickIntensive(formOf({})),
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
            { field: "price", code: "required" },
          ],
        },
      }),
    );
    const outcome = await publishQuickIntensive(
      service({ create }),
      actor,
      parseQuickIntensive(formOf({ name: "" })),
    );
    expect(outcome).toEqual({
      kind: "invalid",
      issues: [
        { field: "name", code: "required" },
        { field: "price", code: "required" },
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
    );
    expect(outcome).toEqual({ kind: "failed", failure: { kind: "denied" } });
  });
});

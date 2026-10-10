import { describe, expect, it } from "vitest";
import { requireAdminActor } from "./admin-actor";

describe("requireAdminActor", () => {
  it("accepts a well-formed actor", () => {
    const actor = { kind: "admin-actor" as const, email: "owner@example.com" };
    expect(requireAdminActor(actor)).toEqual({ ok: true, value: actor });
  });

  it.each([
    null,
    undefined,
    {},
    { kind: "admin-actor" },
    { kind: "other", email: "x" },
  ])("denies malformed actor %j", (actor) => {
    expect(requireAdminActor(actor)).toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });
});

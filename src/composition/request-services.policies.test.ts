import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { studentDraft } from "~/testing/fakes/enrollments-builders";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

function services() {
  return createRequestServices(
    {
      databaseUrl: UNREACHABLE_URL,
      buildCommit: "abc",
      siteUrl: "https://calma.example.test",
      indexingEnabled: false,
      mediaBucket: null,
    },
    {},
    createIsolateState(),
  );
}

describe("createRequestServices policies", () => {
  it("wires the real policies service: the public read degrades to unavailable, the admin read reaches the database", async () => {
    const wired = services();

    await expect(wired.policies.current()).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    await expect(
      wired.policies.history(testAdminActor(), "conditions"),
    ).rejects.toThrow();
  });

  it("checks the accepted versions of both public forms against that service", async () => {
    const wired = services();

    // An unreachable store cannot confirm the versions, so nothing is accepted.
    await expect(
      wired.publicEnrollments.requestEnrollment({
        slug: "ceramica",
        period: "2026-10",
        turnoId: "t-1",
        student: studentDraft(),
        lines: [],
        acceptance: { conditionsVersion: 1, privacyVersion: 1 },
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
    await expect(
      wired.intensiveRequests.requestSeat({
        slug: "intensivo",
        projectId: "p-1",
        student: studentDraft(),
        acceptance: { conditionsVersion: 1, privacyVersion: 1 },
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
  });
});

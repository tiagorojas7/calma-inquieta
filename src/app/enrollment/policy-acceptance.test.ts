import { describe, expect, it } from "vitest";
import { err } from "~/modules/_shared";
import { createUnavailablePoliciesService } from "~/modules/policies";
import {
  buildPolicyVersion,
  createInMemoryPolicies,
} from "~/testing/fakes/policy-builders";
import {
  POLICY_CHANGED_MESSAGE,
  acceptanceFrom,
  shownVersions,
} from "./policy-acceptance";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

describe("acceptanceFrom", () => {
  it("reads both posted versions", () => {
    expect(
      acceptanceFrom(form({ conditionsVersion: "2", privacyVersion: "10" })),
    ).toEqual({ conditionsVersion: 2, privacyVersion: 10 });
  });

  it.each([
    ["nothing", {}],
    ["one version", { conditionsVersion: "1" }],
    ["a word", { conditionsVersion: "uno", privacyVersion: "1" }],
    ["zero", { conditionsVersion: "0", privacyVersion: "1" }],
    ["a decimal", { conditionsVersion: "1.5", privacyVersion: "1" }],
    ["a negative", { conditionsVersion: "-1", privacyVersion: "1" }],
    [
      "a huge number",
      { conditionsVersion: "99999999999", privacyVersion: "1" },
    ],
  ])("is undefined for %s", (_name, values) => {
    expect(acceptanceFrom(form(values))).toBeUndefined();
  });
});

describe("shownVersions", () => {
  it("reports the current version of each document", async () => {
    const { service } = createInMemoryPolicies([
      buildPolicyVersion({ kind: "privacy", version: 2, body: "Nueva." }),
    ]);
    expect(await shownVersions(service)).toEqual({
      conditionsVersion: 1,
      privacyVersion: 2,
    });
  });

  it("is null when the documents cannot be read", async () => {
    expect(await shownVersions(createUnavailablePoliciesService())).toBeNull();
    expect(
      await shownVersions({
        ...createUnavailablePoliciesService(),
        current: () => Promise.resolve(err({ kind: "unavailable" })),
      }),
    ).toBeNull();
    expect(
      await shownVersions({
        ...createUnavailablePoliciesService(),
        current: () => Promise.reject(new Error("boom")),
      }),
    ).toBeNull();
  });
});

describe("POLICY_CHANGED_MESSAGE", () => {
  it("asks the visitor to read the documents again", () => {
    expect(POLICY_CHANGED_MESSAGE).toBe(
      "Las condiciones cambiaron. Volvé a leerlas y aceptalas.",
    );
  });
});

import { describe, expect, it } from "vitest";
import { acceptanceLabel } from "./acceptance-label";

describe("acceptanceLabel", () => {
  it("names the version of each document that was accepted", () => {
    expect(acceptanceLabel({ conditionsVersion: 2, privacyVersion: 3 })).toBe(
      "Condiciones v2 · Privacidad v3",
    );
  });

  it("says there is no record for an order or request without versions", () => {
    expect(acceptanceLabel(undefined)).toBe("Sin registro de aceptación");
    expect(acceptanceLabel(null)).toBe("Sin registro de aceptación");
  });
});

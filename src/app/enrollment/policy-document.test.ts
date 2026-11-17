import { describe, expect, it } from "vitest";
import { paragraphsOf, versionLine } from "./policy-document";

describe("paragraphsOf", () => {
  it("splits on blank lines and trims each paragraph", () => {
    expect(paragraphsOf("Uno.\n\n  Dos.  \n\n\n\nTres.\n")).toEqual([
      "Uno.",
      "Dos.",
      "Tres.",
    ]);
  });

  it("keeps a single line break inside its paragraph", () => {
    expect(paragraphsOf("Línea uno\nlínea dos.\n\nOtra.")).toEqual([
      "Línea uno\nlínea dos.",
      "Otra.",
    ]);
  });

  it("understands Windows line breaks", () => {
    expect(paragraphsOf("Uno.\r\n\r\nDos.")).toEqual(["Uno.", "Dos."]);
  });

  it("returns the text as it is, never as markup", () => {
    expect(paragraphsOf("<b>negrita</b> & más")).toEqual([
      "<b>negrita</b> & más",
    ]);
  });

  it("returns nothing for a blank text", () => {
    expect(paragraphsOf(" \n\n ")).toEqual([]);
  });
});

describe("versionLine", () => {
  it("shows the version and the Córdoba day it was published", () => {
    expect(versionLine(3, new Date("2026-11-17T15:00:00Z"))).toBe(
      "Versión 3 · publicada el 17/11/2026",
    );
  });

  it("uses the Córdoba calendar day near midnight", () => {
    // 01:30 UTC on the 18th is still the evening of the 17th in Córdoba.
    expect(versionLine(1, new Date("2026-11-18T01:30:00Z"))).toBe(
      "Versión 1 · publicada el 17/11/2026",
    );
  });
});

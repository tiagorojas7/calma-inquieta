import { describe, expect, it } from "vitest";
import { findCopyViolations } from "./copy-rules";

describe("findCopyViolations", () => {
  // "Workshops" is the name of the one-day events (owner decision 2026-11-04),
  // so the word is no longer forbidden.
  it.each(["workshop", "Workshop de acuarela", "Próximos WORKSHOPS"])(
    "accepts the word workshop in %j",
    (text) => {
      expect(findCopyViolations([text])).toEqual([]);
    },
  );

  it.each([
    ["Escríbenos por WhatsApp", "escríbenos"],
    ["Elige tu taller", "elige"],
    ["Selecciona una fecha", "selecciona"],
    ["Haz clic acá", "haz clic"],
    ["Debes traer ropa cómoda", "debes"],
    ["Reserva tu lugar", "reserva tu"],
  ])("flags the tuteo in %j", (text, term) => {
    const violations = findCopyViolations([text]);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ text, rule: "tuteo" });
    expect(violations[0]?.match.toLowerCase()).toBe(term);
  });

  it("returns nothing for clean voseo copy", () => {
    expect(
      findCopyViolations([
        "Escribinos",
        "taller intensivo",
        "Reservá tu lugar",
        "Elegí tu taller",
        "Podés venir sola",
      ]),
    ).toEqual([]);
  });

  it("does not match a longer word that merely contains a term", () => {
    expect(findCopyViolations(["Eligen su propio ritmo"])).toEqual([]);
  });

  it("reports a string once for the tuteo rule, even when it holds several terms and a workshop", () => {
    const text = "Haz clic y elige tu workshop";

    const violations = findCopyViolations([text, text]);

    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.match.toLowerCase())).toEqual([
      "haz clic",
      "haz clic",
    ]);
    expect(findCopyViolations([text])).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { findCopyViolations } from "./copy-rules";

describe("findCopyViolations", () => {
  it.each(["workshop", "Workshop de acuarela", "TALLER WORKSHOP"])(
    "flags the forbidden word in %j regardless of case",
    (text) => {
      const violations = findCopyViolations([text]);

      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatchObject({ text, rule: "workshop" });
      expect(violations[0]?.match.toLowerCase()).toBe("workshop");
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

  it("reports a string once per rule, and reports both rules for one string", () => {
    const text = "Haz clic y elige tu workshop";

    const violations = findCopyViolations([text, text]);

    expect(violations.filter((v) => v.rule === "workshop")).toHaveLength(2);
    expect(violations.filter((v) => v.rule === "tuteo")).toHaveLength(2);
    expect(findCopyViolations([text])).toHaveLength(2);
  });
});

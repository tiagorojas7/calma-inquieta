import { describe, expect, it } from "vitest";
import { fillCopyTemplate } from "./copy-template";

describe("fillCopyTemplate", () => {
  it("fills a named placeholder", () => {
    expect(fillCopyTemplate("Hola {nombre}", { nombre: "Cerámica" })).toBe(
      "Hola Cerámica",
    );
  });

  it("fills several different placeholders", () => {
    expect(
      fillCopyTemplate("{nombre}: {dia} de {horario}", {
        nombre: "Taller Demo",
        dia: "lunes",
        horario: "10:00 a 12:00 h",
      }),
    ).toBe("Taller Demo: lunes de 10:00 a 12:00 h");
  });

  it("fills every occurrence of a repeated key", () => {
    expect(fillCopyTemplate("{a} y {a}, no {b}", { a: "uno", b: "dos" })).toBe(
      "uno y uno, no dos",
    );
  });

  it("throws on a missing value, naming the key", () => {
    expect(() => fillCopyTemplate("Hola {nombre}", {})).toThrow(/nombre/);
  });

  it("ignores values the template does not use", () => {
    expect(
      fillCopyTemplate("Hola {nombre}", { nombre: "Ana", otro: "x" }),
    ).toBe("Hola Ana");
  });

  it("returns a template without placeholders unchanged", () => {
    expect(fillCopyTemplate("Sin marcas", { nombre: "Ana" })).toBe(
      "Sin marcas",
    );
  });

  it("does not re-expand placeholders found inside a value", () => {
    expect(fillCopyTemplate("{a}", { a: "{b}", b: "x" })).toBe("{b}");
  });

  it("treats a key inherited from Object as missing", () => {
    expect(() => fillCopyTemplate("{constructor}", {})).toThrow(/constructor/);
  });
});

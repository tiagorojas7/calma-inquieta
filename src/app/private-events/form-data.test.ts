import { describe, expect, it } from "vitest";
import { parsePrivateEventForm, privateEventFieldErrors } from "./form-data";

describe("parsePrivateEventForm", () => {
  it("reads every field as text and the honeypot apart from the values", () => {
    const form = new FormData();
    form.set("fullName", "Ana");
    form.set("participants", "12");
    form.set("honeypot", "bot");

    const { values, draft } = parsePrivateEventForm(form);

    expect(values).toEqual({
      fullName: "Ana",
      phone: "",
      email: "",
      desiredDate: "",
      place: "",
      participants: "12",
      notes: "",
    });
    expect(draft).toEqual({ ...values, honeypot: "bot" });
  });

  it("ignores file entries", () => {
    const form = new FormData();
    form.set("fullName", new File(["x"], "x.txt"));

    expect(parsePrivateEventForm(form).values.fullName).toBe("");
  });
});

describe("privateEventFieldErrors", () => {
  it("keeps the first message per field and refines too-long", () => {
    expect(
      privateEventFieldErrors([
        { field: "place", code: "too-long" },
        { field: "place", code: "required" },
        { field: "participants", code: "out-of-range" },
      ]),
    ).toEqual({
      place: "Resumilo en hasta 200 caracteres.",
      participants: "Ingresá una cantidad de personas entre 1 y 200.",
    });
  });
});

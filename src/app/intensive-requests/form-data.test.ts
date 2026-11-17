import { describe, expect, it } from "vitest";
import {
  EMPTY_REQUEST_VALUES,
  parseRequestForm,
  requestFieldErrors,
} from "./form-data";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("parseRequestForm", () => {
  it("keeps the typed values and builds the student draft", () => {
    const { values, student } = parseRequestForm(
      form({
        fullName: "Ana Pérez",
        email: "ana@example.com",
        phone: "351 555 0101",
        policy: "on",
        honeypot: "",
        project: "proyecto-1",
      }),
    );

    expect(values).toEqual({
      fullName: "Ana Pérez",
      email: "ana@example.com",
      phone: "351 555 0101",
      projectId: "proyecto-1",
    });
    expect(student).toEqual({
      fullName: "Ana Pérez",
      email: "ana@example.com",
      phone: "351 555 0101",
      policyAccepted: true,
      honeypot: "",
    });
  });

  it("treats a missing checkbox as not accepted and missing fields as empty", () => {
    const { values, student } = parseRequestForm(form({}));

    expect(values).toEqual(EMPTY_REQUEST_VALUES);
    expect(student.policyAccepted).toBe(false);
    expect(values.projectId).toBe("");
  });

  it("passes the honeypot through", () => {
    expect(parseRequestForm(form({ honeypot: "x" })).student.honeypot).toBe(
      "x",
    );
  });
});

describe("parseRequestForm acceptance", () => {
  it("reads the versions the form showed", () => {
    expect(
      parseRequestForm(form({ conditionsVersion: "3", privacyVersion: "2" }))
        .acceptance,
    ).toEqual({ conditionsVersion: 3, privacyVersion: 2 });
  });

  it("reads no acceptance when a version is missing or malformed", () => {
    expect(parseRequestForm(form({})).acceptance).toBeUndefined();
    expect(
      parseRequestForm(form({ conditionsVersion: "3", privacyVersion: "x" }))
        .acceptance,
    ).toBeUndefined();
  });
});

describe("requestFieldErrors", () => {
  it("words an unknown policy version as a change of the documents", () => {
    expect(
      requestFieldErrors([{ field: "policy", code: "unknown-reference" }]),
    ).toEqual({
      policy: "Las condiciones cambiaron. Volvé a leerlas y aceptalas.",
    });
  });

  it("maps each issue to a voseo message and keeps the first per field", () => {
    expect(
      requestFieldErrors([
        { field: "email", code: "invalid-format" },
        { field: "email", code: "too-long" },
        { field: "policy", code: "required" },
        { field: "project", code: "required" },
      ]),
    ).toEqual({
      email: "Ingresá un correo electrónico válido.",
      policy: "Tenés que aceptar las condiciones y la política de privacidad.",
      project: "Elegí un proyecto de la lista.",
    });
  });
});

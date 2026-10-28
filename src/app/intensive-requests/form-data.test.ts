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
      }),
    );

    expect(values).toEqual({
      fullName: "Ana Pérez",
      email: "ana@example.com",
      phone: "351 555 0101",
    });
    expect(student).toEqual({
      ...values,
      policyAccepted: true,
      honeypot: "",
    });
  });

  it("treats a missing checkbox as not accepted and missing fields as empty", () => {
    const { values, student } = parseRequestForm(form({}));

    expect(values).toEqual(EMPTY_REQUEST_VALUES);
    expect(student.policyAccepted).toBe(false);
  });

  it("passes the honeypot through", () => {
    expect(parseRequestForm(form({ honeypot: "x" })).student.honeypot).toBe(
      "x",
    );
  });
});

describe("requestFieldErrors", () => {
  it("maps each issue to a voseo message and keeps the first per field", () => {
    expect(
      requestFieldErrors([
        { field: "email", code: "invalid-format" },
        { field: "email", code: "too-long" },
        { field: "policy", code: "required" },
      ]),
    ).toEqual({
      email: "Ingresá un correo electrónico válido.",
      policy: "Tenés que aceptar las condiciones y la política de privacidad.",
    });
  });
});

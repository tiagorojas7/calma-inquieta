import { describe, expect, it } from "vitest";
import { supplierNameKey, validateSupplierDraft } from "./supplier-core";

const draft = {
  name: "Casa Pincel",
  phone: "",
  email: "",
  notes: "",
};

describe("supplierNameKey", () => {
  it("folds case, normalizes NFC, and trims whitespace", () => {
    expect(supplierNameKey("Casa Pincel")).toBe(supplierNameKey("casa pincel"));
    expect(supplierNameKey("Casa Pincel")).toBe(supplierNameKey("CASA PINCEL"));
    expect(supplierNameKey("ÑANDÚ")).toBe(supplierNameKey("Ñandú"));
    expect(supplierNameKey("Ñandu")).toBe(supplierNameKey("Ñandu"));
    expect(supplierNameKey("  Casa Pincel  ")).toBe("casa pincel");
  });

  it("keeps accents significant", () => {
    expect(supplierNameKey("Lucia")).not.toBe(supplierNameKey("Lucía"));
  });
});

describe("validateSupplierDraft", () => {
  it.each([
    ["name", { name: "   " }, "required"],
    ["name", { name: "x".repeat(121) }, "too-long"],
    ["phone", { phone: "abc" }, "invalid-format"],
    ["phone", { phone: "1".repeat(31) }, "too-long"],
    ["email", { email: "x" }, "invalid-format"],
    ["notes", { notes: "x".repeat(1001) }, "too-long"],
  ])("rejects an invalid %s", (field, patch, code) => {
    expect(validateSupplierDraft({ ...draft, ...patch })).toEqual({
      ok: false,
      error: { kind: "invalid", issues: [{ field, code }] },
    });
  });

  it("accepts a valid email and turns blank optional fields into null", () => {
    expect(
      validateSupplierDraft({ ...draft, email: "casa@pincel.com" }),
    ).toEqual({
      ok: true,
      value: {
        name: "Casa Pincel",
        phone: null,
        email: "casa@pincel.com",
        notes: null,
      },
    });
  });

  it("trims a valid full draft without lowercasing email", () => {
    expect(
      validateSupplierDraft({
        name: " Casa Pincel ",
        phone: " +54 9 351 555-0101 ",
        email: " CASA@pincel.com ",
        notes: " Notas ",
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "Casa Pincel",
        phone: "+54 9 351 555-0101",
        email: "CASA@pincel.com",
        notes: "Notas",
      },
    });
  });
});

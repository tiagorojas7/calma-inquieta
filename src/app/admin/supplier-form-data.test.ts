import { describe, expect, it } from "vitest";
import {
  parseSupplierDraft,
  parseSupplierFilter,
  parseSupplierFilterKey,
  parseSupplierIntent,
} from "./supplier-form-data";

function formOf(entries: Record<string, string | File>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  return form;
}

describe("parseSupplierDraft", () => {
  it("reads the four fields as strings without altering them", () => {
    expect(
      parseSupplierDraft(
        formOf({
          name: "  Casa Pincel ",
          phone: "351 555",
          email: "c@x.test",
          notes: "Entrega los jueves",
        }),
      ),
    ).toEqual({
      name: "  Casa Pincel ",
      phone: "351 555",
      email: "c@x.test",
      notes: "Entrega los jueves",
    });
  });

  it("turns absent and non-text parts into empty strings", () => {
    expect(
      parseSupplierDraft(formOf({ name: new File(["x"], "x.txt") })),
    ).toEqual({ name: "", phone: "", email: "", notes: "" });
  });

  it("ignores unknown parts", () => {
    const draft = parseSupplierDraft(formOf({ active: "false" }));
    expect(Object.keys(draft).sort()).toEqual([
      "email",
      "name",
      "notes",
      "phone",
    ]);
  });
});

describe("parseSupplierIntent", () => {
  it("accepts save, archive and reactivate", () => {
    expect(parseSupplierIntent(formOf({ intent: "save" }))).toBe("save");
    expect(parseSupplierIntent(formOf({ intent: "archive" }))).toBe("archive");
    expect(parseSupplierIntent(formOf({ intent: "reactivate" }))).toBe(
      "reactivate",
    );
  });

  it("returns null for a missing or unknown intent", () => {
    expect(parseSupplierIntent(formOf({}))).toBeNull();
    expect(parseSupplierIntent(formOf({ intent: "delete" }))).toBeNull();
  });
});

describe("parseSupplierFilter", () => {
  it("maps the Spanish query values to the service filter", () => {
    expect(parseSupplierFilter("activos")).toEqual({ active: true });
    expect(parseSupplierFilter("archivados")).toEqual({ active: false });
    expect(parseSupplierFilter("todos")).toEqual({});
  });

  it("defaults to active for a missing or unknown value", () => {
    expect(parseSupplierFilter(null)).toEqual({ active: true });
    expect(parseSupplierFilter("otro")).toEqual({ active: true });
  });

  it("keeps the query key, defaulting to activos", () => {
    expect(parseSupplierFilterKey("archivados")).toBe("archivados");
    expect(parseSupplierFilterKey("todos")).toBe("todos");
    expect(parseSupplierFilterKey("x")).toBe("activos");
    expect(parseSupplierFilterKey(null)).toBe("activos");
  });
});

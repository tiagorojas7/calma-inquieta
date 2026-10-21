import { describe, expect, it } from "vitest";
import {
  parseTeacherDraft,
  parseTeacherFilter,
  parseTeacherFilterKey,
  parseTeacherIntent,
} from "./teacher-form-data";

function formOf(entries: Record<string, string | File>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  return form;
}

describe("parseTeacherDraft", () => {
  it("reads the five fields as strings without altering them", () => {
    expect(
      parseTeacherDraft(
        formOf({
          name: "  Lucía ",
          bioLine: "Ceramista",
          phone: "351 555",
          email: "l@x.test",
          modality: "own",
        }),
      ),
    ).toEqual({
      name: "  Lucía ",
      bioLine: "Ceramista",
      phone: "351 555",
      email: "l@x.test",
      modality: "own",
    });
  });

  it("turns absent and non-text parts into empty strings", () => {
    expect(
      parseTeacherDraft(formOf({ name: new File(["x"], "x.txt") })),
    ).toEqual({ name: "", bioLine: "", phone: "", email: "", modality: "" });
  });

  it("ignores unknown parts such as a percentage", () => {
    const draft = parseTeacherDraft(formOf({ percentage: "30" }));
    expect(Object.keys(draft).sort()).toEqual([
      "bioLine",
      "email",
      "modality",
      "name",
      "phone",
    ]);
  });
});

describe("parseTeacherIntent", () => {
  it("accepts save, archive and reactivate", () => {
    expect(parseTeacherIntent(formOf({ intent: "save" }))).toBe("save");
    expect(parseTeacherIntent(formOf({ intent: "archive" }))).toBe("archive");
    expect(parseTeacherIntent(formOf({ intent: "reactivate" }))).toBe(
      "reactivate",
    );
  });

  it("returns null for a missing or unknown intent", () => {
    expect(parseTeacherIntent(formOf({}))).toBeNull();
    expect(parseTeacherIntent(formOf({ intent: "delete" }))).toBeNull();
  });
});

describe("parseTeacherFilter", () => {
  it("maps the Spanish query values to the service filter", () => {
    expect(parseTeacherFilter("activos")).toBe("active");
    expect(parseTeacherFilter("archivados")).toBe("archived");
    expect(parseTeacherFilter("todos")).toBe("all");
  });

  it("defaults to active for a missing or unknown value", () => {
    expect(parseTeacherFilter(null)).toBe("active");
    expect(parseTeacherFilter("otro")).toBe("active");
  });

  it("keeps the query key, defaulting to activos", () => {
    expect(parseTeacherFilterKey("archivados")).toBe("archivados");
    expect(parseTeacherFilterKey("todos")).toBe("todos");
    expect(parseTeacherFilterKey("x")).toBe("activos");
    expect(parseTeacherFilterKey(null)).toBe("activos");
  });
});

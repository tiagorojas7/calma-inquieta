import { describe, expect, it } from "vitest";
import { teacherNameKey, validateTeacherDraft } from "./teacher-core";

const draft = {
  name: "  Lucía Pérez ",
  bioLine: " Ceramista ",
  phone: "",
  email: "",
  modality: "own",
};

describe("validateTeacherDraft", () => {
  it("trims fields and turns blank optional fields into null", () => {
    expect(validateTeacherDraft(draft)).toEqual({
      ok: true,
      value: {
        name: "Lucía Pérez",
        bioLine: "Ceramista",
        phone: null,
        email: null,
        modality: "own",
      },
    });
  });

  it("keeps a valid phone and email, trimmed", () => {
    const result = validateTeacherDraft({
      ...draft,
      phone: " +54 351 555-0101 ",
      email: " lucia@example.com ",
      modality: "third_party",
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        phone: "+54 351 555-0101",
        email: "lucia@example.com",
        modality: "third_party",
      },
    });
  });

  it.each([
    ["name", { name: "   " }, "required"],
    ["bioLine", { bioLine: "" }, "required"],
    ["modality", { modality: "" }, "required"],
    ["modality", { modality: "propia" }, "invalid-format"],
    ["email", { email: "not-an-email" }, "invalid-format"],
    ["phone", { phone: "abc" }, "invalid-format"],
  ])("names the %s field when %j is invalid", (field, patch, code) => {
    expect(validateTeacherDraft({ ...draft, ...patch })).toEqual({
      ok: false,
      error: { kind: "invalid", issues: [{ field, code }] },
    });
  });

  it("reports every invalid field in a stable order", () => {
    const result = validateTeacherDraft({
      name: "",
      bioLine: "",
      phone: "x",
      email: "y",
      modality: "z",
    });

    expect(result).toMatchObject({ ok: false });
    if (!result.ok)
      expect(result.error.issues.map((issue) => issue.field)).toEqual([
        "name",
        "bioLine",
        "phone",
        "email",
        "modality",
      ]);
  });

  it("returns no percentage field", () => {
    const result = validateTeacherDraft(draft);
    expect(result.ok && Object.keys(result.value).sort()).toEqual([
      "bioLine",
      "email",
      "modality",
      "name",
      "phone",
    ]);
  });
});

describe("teacherNameKey", () => {
  it.each([
    [" Lucía Pérez ", "lucía pérez"],
    ["ÑANDÚ", "ñandú"],
    ["Lucía", "Lucía"],
  ])("treats %j and %j as the same name", (a, b) => {
    expect(teacherNameKey(a)).toBe(teacherNameKey(b));
  });

  it("keeps accents significant", () => {
    expect(teacherNameKey("Lucia")).not.toBe(teacherNameKey("Lucía"));
  });
});

import { describe, expect, it } from "vitest";
import { validateStudentInput, type StudentDraft } from "./student-input";

// Same rule as the site-content WhatsApp digits; the real function is wired in E2.
const normalizePhone = (display: string): string | null => {
  const digits = display.replace(/\D/g, "");
  if (digits.length === 10) return `549${digits}`;
  if (digits.length === 13 && digits.startsWith("549")) return digits;
  return null;
};

const valid: StudentDraft = {
  fullName: "Ana Pérez",
  email: "ana@example.com",
  phone: "351 555-1234",
  policyAccepted: true,
  honeypot: "",
};

describe("validateStudentInput", () => {
  it("normalizes email, name and phone", () => {
    const result = validateStudentInput(
      { ...valid, email: " Ana@Example.COM ", fullName: "  Ana Pérez " },
      normalizePhone,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        fullName: "Ana Pérez",
        email: "ana@example.com",
        phoneDigits: "5493515551234",
      },
    });
  });

  it("returns every issue together", () => {
    const result = validateStudentInput(
      { ...valid, fullName: "", email: "no-at", policyAccepted: false },
      normalizePhone,
    );
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "fullName", code: "required" },
          { field: "email", code: "invalid-format" },
          { field: "policy", code: "required" },
        ],
      },
    });
  });

  it("rejects names shorter than 2 or longer than 100 characters", () => {
    expect(
      validateStudentInput({ ...valid, fullName: "A" }, normalizePhone),
    ).toMatchObject({
      error: { issues: [{ field: "fullName", code: "invalid-format" }] },
    });
    expect(
      validateStudentInput(
        { ...valid, fullName: "a".repeat(101) },
        normalizePhone,
      ),
    ).toMatchObject({
      error: { issues: [{ field: "fullName", code: "too-long" }] },
    });
  });

  it("accepts a name of exactly 2 and exactly 100 characters", () => {
    expect(
      validateStudentInput({ ...valid, fullName: "Al" }, normalizePhone).ok,
    ).toBe(true);
    expect(
      validateStudentInput(
        { ...valid, fullName: "a".repeat(100) },
        normalizePhone,
      ).ok,
    ).toBe(true);
  });

  it("requires a phone and rejects one that does not normalize", () => {
    expect(
      validateStudentInput({ ...valid, phone: "" }, normalizePhone),
    ).toMatchObject({
      error: { issues: [{ field: "phone", code: "required" }] },
    });
    expect(
      validateStudentInput({ ...valid, phone: "12345" }, normalizePhone),
    ).toMatchObject({
      error: { issues: [{ field: "phone", code: "invalid-format" }] },
    });
  });

  it("requires an email and caps its length", () => {
    expect(
      validateStudentInput({ ...valid, email: " " }, normalizePhone),
    ).toMatchObject({
      error: { issues: [{ field: "email", code: "required" }] },
    });
    expect(
      validateStudentInput(
        { ...valid, email: `${"a".repeat(250)}@example.com` },
        normalizePhone,
      ),
    ).toMatchObject({
      error: { issues: [{ field: "email", code: "too-long" }] },
    });
  });

  it("reports a filled honeypot without naming a field", () => {
    expect(
      validateStudentInput({ ...valid, honeypot: "x" }, normalizePhone),
    ).toEqual({ ok: false, error: { kind: "honeypot" } });
  });

  it("checks the honeypot before field errors", () => {
    expect(
      validateStudentInput(
        { ...valid, fullName: "", honeypot: "bot" },
        normalizePhone,
      ),
    ).toEqual({ ok: false, error: { kind: "honeypot" } });
  });
});

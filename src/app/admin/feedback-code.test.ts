import { describe, expect, it } from "vitest";
import { feedbackCode, withFeedback } from "./feedback-code";

const at = (query: string) =>
  new Request(`https://x.test/admin/talleres${query}`);

describe("feedback codes", () => {
  it("returns a declared code", () => {
    expect(feedbackCode(at("?ok=created"), ["created", "saved"])).toBe(
      "created",
    );
  });

  it("ignores unknown or missing codes", () => {
    expect(feedbackCode(at("?ok=<script>"), ["created"])).toBeNull();
    expect(feedbackCode(at(""), ["created"])).toBeNull();
  });

  it("appends the code before a hash and keeps the query", () => {
    expect(withFeedback("/admin/talleres/w1", "saved")).toBe(
      "/admin/talleres/w1?ok=saved",
    );
    expect(withFeedback("/admin/talleres?estado=x", "saved")).toBe(
      "/admin/talleres?estado=x&ok=saved",
    );
    expect(withFeedback("/admin/talleres/w1#estado", "saved")).toBe(
      "/admin/talleres/w1?ok=saved#estado",
    );
  });
});

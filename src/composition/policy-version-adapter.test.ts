import { describe, expect, it, vi } from "vitest";
import { createPolicyVersionAdapter } from "./policy-version-adapter";

describe("createPolicyVersionAdapter", () => {
  it("answers each form's check from the policies service", async () => {
    const isPublished = vi.fn((kind: string, version: number) =>
      Promise.resolve(kind === "conditions" && version === 2),
    );
    const adapter = createPolicyVersionAdapter({ isPublished });

    await expect(adapter.isPublished("conditions", 2)).resolves.toBe(true);
    await expect(adapter.isPublished("privacy", 2)).resolves.toBe(false);
    expect(isPublished).toHaveBeenCalledWith("privacy", 2);
  });

  it("lets a failure of the service reach the caller, which maps it to unavailable", async () => {
    const adapter = createPolicyVersionAdapter({
      isPublished: () => Promise.reject(new Error("db down")),
    });

    await expect(adapter.isPublished("privacy", 1)).rejects.toThrow("db down");
  });
});

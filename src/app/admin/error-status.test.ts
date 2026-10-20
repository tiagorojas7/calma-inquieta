import { data, UNSAFE_ErrorResponseImpl } from "react-router";
import { describe, expect, it } from "vitest";
import { adminErrorStatus } from "./error-status";

describe("adminErrorStatus", () => {
  it("reads the status of a route error response", () => {
    expect(adminErrorStatus(new UNSAFE_ErrorResponseImpl(503, "", null))).toBe(
      503,
    );
    expect(adminErrorStatus(new UNSAFE_ErrorResponseImpl(403, "", null))).toBe(
      403,
    );
  });

  it("treats a thrown Error, a data() value and non-errors as 500", () => {
    expect(adminErrorStatus(new Error("boom"))).toBe(500);
    expect(adminErrorStatus(data(null, { status: 403 }))).toBe(500);
    expect(adminErrorStatus(undefined)).toBe(500);
  });
});

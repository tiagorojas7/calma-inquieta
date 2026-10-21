import { describe, expect, it } from "vitest";
import { failureResponse } from "./failure-response";

describe("failureResponse", () => {
  it("maps denied, unavailable and not-found to 403, 503 and 404", () => {
    expect(failureResponse({ kind: "denied" }).init?.status).toBe(403);
    expect(failureResponse({ kind: "unavailable" }).init?.status).toBe(503);
    expect(failureResponse({ kind: "not-found" }).init?.status).toBe(404);
  });

  it("carries no body, so no internals reach the page", () => {
    expect(failureResponse({ kind: "denied" }).data).toBeNull();
  });
});

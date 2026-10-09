import { describe, expect, it } from "vitest";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import { loader } from "./robots";

describe("robots resource route", () => {
  it("returns the gated text response", async () => {
    const response = loader(
      createLoaderArgs(createTestServices(), "/robots.txt") as never,
    );
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(await response.text()).toBe("User-agent: *\nDisallow: /");
  });
});

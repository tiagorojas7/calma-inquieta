import { describe, expect, it } from "vitest";
import { loader } from "./not-found";

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (thrown) {
    return thrown;
  }
  return expect.unreachable("expected the loader to throw");
}

describe("not-found loader", () => {
  it("throws a 404 response so the root error boundary renders", () => {
    expect(
      thrownBy(() => {
        loader();
      }),
    ).toMatchObject({ init: { status: 404 } });
  });
});

import { describe, expect, it } from "vitest";
import { withIndexingHeader } from "./indexing-header";

describe("withIndexingHeader while indexing is off", () => {
  it("adds the noindex header and keeps status, status text and other headers", async () => {
    const original = new Response("hello", {
      status: 201,
      statusText: "Created",
      headers: { "Content-Type": "text/plain", "X-Custom": "kept" },
    });

    const result = withIndexingHeader(original, false);

    expect(result.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(result.status).toBe(201);
    expect(result.statusText).toBe("Created");
    expect(result.headers.get("Content-Type")).toBe("text/plain");
    expect(result.headers.get("X-Custom")).toBe("kept");
    expect(await result.text()).toBe("hello");
  });

  it("streams the body of the returned response", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("one "));
        controller.enqueue(encoder.encode("two"));
        controller.close();
      },
    });

    const result = withIndexingHeader(new Response(stream), false);

    expect(result.body).not.toBeNull();
    expect(await result.text()).toBe("one two");
  });

  it("ends with exactly one X-Robots-Tag value, the gate's", () => {
    const original = new Response("{}", {
      headers: { "X-Robots-Tag": "noindex, nofollow, noarchive" },
    });

    const result = withIndexingHeader(original, false);

    expect(result.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("keeps a response without a body as a response without a body", () => {
    const result = withIndexingHeader(
      new Response(null, { status: 204 }),
      false,
    );

    expect(result.status).toBe(204);
    expect(result.body).toBeNull();
    expect(result.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});

describe("withIndexingHeader while indexing is on", () => {
  it("returns the same response object untouched", () => {
    const original = new Response("hello", {
      headers: { "X-Robots-Tag": "all" },
    });

    const result = withIndexingHeader(original, true);

    expect(result).toBe(original);
    expect(result.headers.get("X-Robots-Tag")).toBe("all");
  });

  it("adds no header to a response that had none", () => {
    const result = withIndexingHeader(new Response("hello"), true);

    expect(result.headers.has("X-Robots-Tag")).toBe(false);
  });
});

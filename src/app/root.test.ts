import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ErrorBoundary } from "./root";

const render = (error: unknown) =>
  renderToStaticMarkup(createElement(ErrorBoundary, { error } as never));

describe("root error boundary", () => {
  it("renders a not-found page for a 404 response", () => {
    const html = render({
      status: 404,
      statusText: "Not Found",
      internal: false,
      data: null,
    });

    expect(html).toContain("Page not found");
    expect(html).not.toContain("Something went wrong");
  });

  it("renders a generic page for any other error without its message", () => {
    const html = render(new Error("connect ECONNREFUSED secret-host:5432"));

    expect(html).toContain("Something went wrong");
    expect(html).not.toContain("secret-host");
    expect(html).not.toContain("ECONNREFUSED");
  });

  it("renders a generic page for a non-404 route error response", () => {
    const html = render({
      status: 500,
      statusText: "Internal Server Error",
      internal: false,
      data: "secret detail",
    });

    expect(html).toContain("Something went wrong");
    expect(html).not.toContain("secret detail");
  });
});

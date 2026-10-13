import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "~/app/seo/json-ld";
import { JsonLdScript } from "./json-ld-script";

describe("JsonLdScript", () => {
  it("renders one ld+json script whose text is the serialized output", () => {
    const json = serializeJsonLd({ "@type": "LocalBusiness", name: "Calma" });
    const { container } = render(<JsonLdScript json={json} />);
    const scripts = container.querySelectorAll("script");
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute("type", "application/ld+json");
    expect(scripts[0]?.textContent).toBe(json);
  });

  it("cannot be closed by a hostile serialized value", () => {
    const json = serializeJsonLd({
      name: "</script><script>alert(1)</script>",
    });
    const { container } = render(<JsonLdScript json={json} />);
    expect(container.querySelectorAll("script")).toHaveLength(1);
    expect(container.innerHTML.match(/<\/script>/g)).toHaveLength(1);
    expect(
      JSON.parse(container.querySelector("script")?.textContent ?? "{}"),
    ).toEqual({ name: "</script><script>alert(1)</script>" });
  });

  it("stays inert even when given JSON that was not escaped", () => {
    const json = JSON.stringify({ name: "</script><script>alert(1)</script>" });
    const { container } = render(<JsonLdScript json={json} />);
    expect(container.querySelectorAll("script")).toHaveLength(1);
    expect(container.querySelector("script")?.textContent).not.toContain("<");
    expect(
      JSON.parse(container.querySelector("script")?.textContent ?? "{}"),
    ).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});

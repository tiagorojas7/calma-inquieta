import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Image } from "./image";

describe("Image", () => {
  it("uses required dimensions, aspect ratio and lazy defaults", () => {
    const { container } = render(
      <Image src="/x" alt="Una imagen" width={800} height={600} />,
    );
    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
    expect(image).toHaveStyle({ aspectRatio: "800 / 600" });
    expectNoAxeViolations(container);
  });
  it("eagerly loads above-the-fold images and forwards responsive sources", () => {
    render(
      <Image
        src="/x"
        alt="Imagen"
        width={1}
        height={2}
        aboveTheFold
        fetchPriority="high"
        srcSet="/x 1x"
        sizes="100vw"
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager");
    expect(screen.getByRole("img")).toHaveAttribute("fetchpriority", "high");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Image } from "./image";

describe("Image", () => {
  it("uses required dimensions, aspect ratio and lazy defaults", async () => {
    const { container } = render(
      <Image src="/x" alt="Una imagen" width={800} height={600} />,
    );
    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
    expect(image).toHaveStyle({ aspectRatio: "800 / 600" });
    await expectNoAxeViolations(container);
  });
  it("supports decorative images with an empty alt", () => {
    render(<Image src="/ornament" alt="" width={10} height={10} />);
    expect(screen.getByRole("presentation")).toHaveAttribute("alt", "");
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
    expect(screen.getByRole("img")).toHaveAttribute("srcset", "/x 1x");
    expect(screen.getByRole("img")).toHaveAttribute("sizes", "100vw");
  });
});

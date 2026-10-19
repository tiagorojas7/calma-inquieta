import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Image } from "./image";

describe("Image", () => {
  it("keeps required image props enforced at compile time", () => {
    // @ts-expect-error alt is required for accessible images.
    <Image src="/x" width={1} height={1} />;
    // @ts-expect-error width reserves layout space and is required.
    <Image src="/x" alt="Imagen" height={1} />;
    // @ts-expect-error height reserves layout space and is required.
    <Image src="/x" alt="Imagen" width={1} />;
    // @ts-expect-error high priority is only valid for above-the-fold images.
    <Image src="/x" alt="Imagen" width={1} height={1} fetchPriority="high" />;
  });
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
  it("omits the inline aspect-ratio when intrinsicRatio is false and keeps it by default", () => {
    const { rerender } = render(
      <Image
        src="/x"
        alt="Imagen"
        width={4}
        height={5}
        intrinsicRatio={false}
      />,
    );
    expect(screen.getByRole("img").getAttribute("style") ?? "").not.toMatch(
      /aspect-ratio/,
    );
    rerender(<Image src="/x" alt="Imagen" width={4} height={5} />);
    expect(screen.getByRole("img")).toHaveStyle({ aspectRatio: "4 / 5" });
  });
});

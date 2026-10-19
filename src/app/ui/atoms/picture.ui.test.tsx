import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Picture } from "./picture";

const sources = [
  {
    media: "(min-width: 64rem)",
    srcSet: "/d-1.webp 1x, /d-2.webp 2x",
    width: 900,
    height: 1200,
  },
  {
    media: "(max-width: 63.999rem)",
    srcSet: "/m-1.webp 1x",
    width: 800,
    height: 1000,
  },
] as const;

const renderPicture = (extra: object = {}) =>
  render(
    <Picture
      src="/m-1.webp"
      alt="Una foto"
      width={800}
      height={1000}
      sizes="100vw"
      sources={sources}
      {...extra}
    />,
  );

describe("Picture", () => {
  it("renders one source per entry with media, srcset, sizes, width and height", () => {
    const { container } = renderPicture();
    const found = container.querySelectorAll("picture > source");
    expect(found).toHaveLength(2);
    sources.forEach((source, index) => {
      const element = found[index];
      expect(element).toHaveAttribute("media", source.media);
      expect(element).toHaveAttribute("srcset", source.srcSet);
      expect(element).toHaveAttribute("sizes", "100vw");
      expect(element).toHaveAttribute("width", String(source.width));
      expect(element).toHaveAttribute("height", String(source.height));
    });
  });

  it("the fallback img is eager and fetchpriority high when aboveTheFold", () => {
    const { container } = renderPicture({
      aboveTheFold: true,
      fetchPriority: "high",
    });
    const image = container.querySelector("picture > img");
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image).toHaveAttribute("sizes", "100vw");
    expect(image).toHaveAttribute("width", "800");
    expect(image).toHaveAttribute("height", "1000");
  });

  it("the fallback img is lazy by default", () => {
    const { container } = renderPicture();
    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");
  });

  it("the fallback img carries no inline aspect-ratio", () => {
    const { container } = renderPicture();
    expect(
      container.querySelector("img")?.getAttribute("style") ?? "",
    ).not.toMatch(/aspect-ratio/);
  });

  it("forwards className to the img and pictureClassName to the picture", () => {
    const { container } = renderPicture({
      className: "aspect-4/5",
      pictureClassName: "block",
    });
    expect(container.querySelector("img")).toHaveClass("aspect-4/5");
    expect(container.querySelector("picture")).toHaveClass("block");
  });

  it("keeps alt required at compile time", () => {
    // @ts-expect-error alt is required for accessible images.
    <Picture src="/x" width={1} height={1} sizes="100vw" sources={sources} />;
  });

  it("has no axe violations", async () => {
    const { container } = renderPicture();
    await expectNoAxeViolations(container);
  });
});

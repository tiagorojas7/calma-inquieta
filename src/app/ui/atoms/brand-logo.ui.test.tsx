import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { BrandLogo } from "./brand-logo";

const dark = {
  src: "/media/brand/brand-logo-56.7b093bc3.webp",
  srcSet:
    "/media/brand/brand-logo-56.7b093bc3.webp 56w, /media/brand/brand-logo-112.56092e2a.webp 112w",
  width: 56,
  height: 59,
};
const light = {
  src: "/media/brand/brand-logo-light-56.298df7e7.webp",
  srcSet: "/media/brand/brand-logo-light-56.298df7e7.webp 56w",
  width: 56,
  height: 59,
};

describe("BrandLogo", () => {
  it("renders the dark logo as a decorative, eagerly loaded image", async () => {
    const { container } = render(<BrandLogo logo={dark} />);

    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(1);
    const [image] = images;
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("src", dark.src);
    expect(image).toHaveAttribute("srcset", dark.srcSet);
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("data-ink", "dark");
    expect(image).toHaveAttribute("width", "56");
    expect(image).toHaveAttribute("height", "59");
    await expectNoAxeViolations(container);
  });

  it("renders both inks lazily when a light logo is given, so only the visible one downloads", () => {
    const { container } = render(<BrandLogo logo={dark} logoLight={light} />);

    const darkImage = container.querySelector('img[data-ink="dark"]');
    const lightImage = container.querySelector('img[data-ink="light"]');
    expect(darkImage).toHaveAttribute("loading", "lazy");
    expect(lightImage).toHaveAttribute("loading", "lazy");
    expect(lightImage).toHaveAttribute("src", light.src);
    expect(lightImage).toHaveAttribute("alt", "");
  });

  it("renders nothing without a logo", () => {
    const { container } = render(<BrandLogo logoLight={light} />);

    expect(container).toBeEmptyDOMElement();
  });
});

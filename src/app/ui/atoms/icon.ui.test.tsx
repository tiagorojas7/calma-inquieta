import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Icon } from "./icon";

describe("Icon", () => {
  it("renders named SVGs hidden by default", async () => {
    const { container } = render(<Icon name="arrow" />);
    expect(screen.getByRole("img", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await expectNoAxeViolations(container);
  });
  it("sizes and strokes every icon so it never renders at the SVG default", () => {
    render(<Icon name="arrow" className="text-clay-800" />);
    expect(screen.getByRole("img", { hidden: true })).toHaveClass(
      "size-6",
      "fill-none",
      "stroke-current",
      "text-clay-800",
    );
  });
  it("exposes a title accessibly", () => {
    render(<Icon name="whatsapp" title="WhatsApp" />);
    expect(screen.getByTitle("WhatsApp")).not.toHaveAttribute("aria-hidden");
  });
  it("rejects unknown names at compile time", () => {
    // @ts-expect-error unknown icon names are not part of the public API
    return <Icon name="missing" />;
  });

  it("renders menu and close icons as decorative SVGs", () => {
    const { container } = render(
      <>
        <Icon name="menu" />
        <Icon name="close" />
      </>,
    );
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(
      2,
    );
  });

  it("supports the initial icon set", () => {
    render(
      <>
        <Icon name="arrow" />
        <Icon name="whatsapp" />
        <Icon name="instagram" />
      </>,
    );
    expect(screen.getAllByRole("img", { hidden: true })).toHaveLength(3);
  });

  it.each([
    "chevron-left",
    "chevron-right",
    "play",
    "pin",
    "map",
    "clock",
    "mail",
  ] as const)("draws the %s icon as a decorative shape", (name) => {
    const { container } = render(<Icon name={name} />);
    expect(container.querySelector("svg path")).not.toBeNull();
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("hands, leaf, heart and group render an aria-hidden 24x24 svg in the existing stroke style", () => {
    for (const name of ["hands", "leaf", "heart", "group"] as const) {
      const { container, unmount } = render(<Icon name={name} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
      expect(svg).toHaveAttribute("stroke-width", "1.75");
      expect(svg).toHaveAttribute("stroke-linecap", "round");
      expect(svg).toHaveAttribute("stroke-linejoin", "round");
      expect(svg).toHaveClass("size-6", "fill-none", "stroke-current");
      expect(svg?.querySelector("path, circle")).not.toBeNull();
      unmount();
    }
  });

  it("draws the footer social glyphs with more than the bare outline", () => {
    const whatsapp = render(<Icon name="whatsapp" />);
    expect(whatsapp.container.querySelectorAll("svg path")).toHaveLength(2);
    whatsapp.unmount();

    const instagram = render(<Icon name="instagram" />);
    expect(instagram.container.querySelectorAll("svg circle")).toHaveLength(2);
    instagram.unmount();

    const map = render(<Icon name="map" />);
    expect(map.container.querySelector("svg path")).not.toBeNull();
  });
});

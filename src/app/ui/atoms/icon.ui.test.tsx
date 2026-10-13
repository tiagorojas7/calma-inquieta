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
});

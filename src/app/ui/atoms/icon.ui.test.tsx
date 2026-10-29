import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Icon } from "./icon";
import { Icon as SharedIcon } from "./icons";

describe("Icon", () => {
  it("renders named SVGs hidden by default", async () => {
    const { container } = render(<Icon name="arrow" />);
    expect(screen.getByRole("img", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await expectNoAxeViolations(container);
  });
  it("uses size attributes and preserves caller sizing classes", () => {
    render(<Icon name="arrow" className="size-4 text-clay-800" />);
    const icon = screen.getByRole("img", { hidden: true });
    expect(icon).toHaveAttribute("width", "24");
    expect(icon).toHaveAttribute("height", "24");
    expect(icon).toHaveClass(
      "size-4",
      "shrink-0",
      "fill-current",
      "text-clay-800",
    );
    expect(icon).not.toHaveClass("size-6");
  });
  it("exposes a title as the accessible image name", () => {
    render(<Icon name="whatsapp" title="WhatsApp" />);
    const icon = screen.getByRole("img", { name: "WhatsApp" });
    expect(icon).toHaveAttribute("aria-labelledby");
    expect(screen.getByTitle("WhatsApp")).not.toHaveAttribute("aria-hidden");
  });
  it("preserves caller aria-labelledby as an accessible image name", () => {
    render(
      <>
        <span id="icon-label">External label</span>
        <Icon name="arrow" aria-labelledby="icon-label" />
      </>,
    );
    expect(screen.getByRole("img", { name: "External label" })).toHaveAttribute(
      "aria-labelledby",
      "icon-label",
    );
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

  it("hands, leaf, heart and group render decorative Phosphor SVGs", () => {
    for (const name of ["hands", "leaf", "heart", "group"] as const) {
      const { container, unmount } = render(<Icon name={name} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("viewBox", "0 0 256 256");
      expect(svg).toHaveClass("shrink-0", "fill-current");
      expect(svg).not.toHaveClass("size-6");
      expect(svg?.querySelector("path, circle")).not.toBeNull();
      unmount();
    }
  });

  it("draws the footer social glyphs with more than the bare outline", () => {
    const whatsapp = render(<Icon name="whatsapp" />);
    expect(whatsapp.container.querySelectorAll("svg path")).toHaveLength(1);
    whatsapp.unmount();

    const instagram = render(<Icon name="instagram" />);
    expect(instagram.container.querySelectorAll("svg path")).toHaveLength(1);
    instagram.unmount();

    const map = render(<Icon name="map" />);
    expect(map.container.querySelector("svg path")).not.toBeNull();
  });

  it("exposes the licensed shared registry through the compatibility export", () => {
    const names = [
      "arrow",
      "arrow-right",
      "whatsapp",
      "instagram",
      "menu",
      "close",
      "chevron-left",
      "chevron-right",
      "play",
      "pause",
      "pin",
      "map",
      "clock",
      "mail",
      "hands",
      "leaf",
      "heart",
      "group",
      "calendar",
      "external-link",
    ] as const;
    const { container } = render(
      <>
        {names.map((name) => (
          <SharedIcon key={name} name={name} aria-label={name} size={20} />
        ))}
        <Icon name="play" title="Play animation" />
      </>,
    );
    expect(container.querySelectorAll("svg")).toHaveLength(names.length + 1);
    expect(screen.getByRole("img", { name: "play" })).toHaveAttribute(
      "width",
      "20",
    );
    expect(screen.getByRole("img", { name: "Play animation" })).toBeVisible();
  });
});

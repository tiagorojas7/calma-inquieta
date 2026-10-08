import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./icon";

describe("Icon", () => {
  it("renders named SVGs hidden by default", () => {
    render(<Icon name="arrow" />);
    expect(screen.getByRole("img", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
  it("exposes a title accessibly", () => {
    render(<Icon name="whatsapp" title="WhatsApp" />);
    expect(screen.getByTitle("WhatsApp")).not.toHaveAttribute("aria-hidden");
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
});

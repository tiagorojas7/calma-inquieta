import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { TimePill } from "./time-pill";

describe("TimePill", () => {
  it("sets the hours apart in a sage pill with a clock and tabular numerals", async () => {
    const { container } = render(<TimePill>09:00 a 12:00 h</TimePill>);
    const pill = screen.getByText("09:00 a 12:00 h").parentElement;

    expect(pill).toHaveClass(
      "bg-sage-200",
      "text-olive-800",
      "font-semibold",
      "tabular-nums",
      "w-fit",
    );
    const clock = pill?.querySelector("svg");
    expect(clock).not.toBeNull();
    expect(clock).toHaveAttribute("aria-hidden", "true");
    await expectNoAxeViolations(container);
  });

  it("keeps the text readable on its own", () => {
    render(<TimePill>2 h 30 min</TimePill>);

    expect(screen.getByText("2 h 30 min")).toBeVisible();
  });
});

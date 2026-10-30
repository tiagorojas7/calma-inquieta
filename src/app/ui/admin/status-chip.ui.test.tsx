import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { OrderStatusBadge } from "./order-status-badge";
import { PrivateEventStatusBadge } from "./private-event-status-badge";
import { StatusChip, statusTone, type StatusTone } from "./status-chip";

const FIXED: readonly (readonly [string, StatusTone])[] = [
  ["pending_confirmation", "orange"],
  ["pending", "orange"],
  ["paid", "green"],
  ["published", "green"],
  ["active", "green"],
  ["materials_requested", "blue"],
  ["requested", "blue"],
  ["materials_received", "teal"],
  ["received", "teal"],
  ["complete", "teal"],
  ["cancelled", "grey"],
  ["draft", "neutral"],
];

describe("statusTone", () => {
  it.each(FIXED)("maps %s to the fixed tone %s", (status, tone) => {
    expect(statusTone(status)).toBe(tone);
  });

  it("falls back to neutral for an unknown status", () => {
    expect(statusTone("something-else")).toBe("neutral");
  });
});

describe("StatusChip", () => {
  it.each(FIXED)(
    "renders %s with its label and tone %s",
    async (status, tone) => {
      const { container } = render(
        <StatusChip status={status} label="Etiqueta" />,
      );
      const chip = screen.getByText("Etiqueta");
      expect(chip).toHaveAttribute("data-tone", tone);
      expect(chip).toHaveAttribute("data-status", status);
      await expectNoAxeViolations(container);
    },
  );

  it("lets the other badges share the one chip", () => {
    render(
      <>
        <OrderStatusBadge status="paid" label="Pagado" />
        <PrivateEventStatusBadge status="nueva" label="Nueva" />
      </>,
    );
    expect(screen.getByText("Pagado")).toHaveAttribute("data-tone", "green");
    expect(screen.getByText("Nueva")).toHaveAttribute("data-tone", "blue");
  });
});

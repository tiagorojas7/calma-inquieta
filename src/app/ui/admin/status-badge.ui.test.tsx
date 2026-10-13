import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { StatusBadge, type AdminStatus } from "./status-badge";

const labels: readonly (readonly [AdminStatus, string, string])[] = [
  ["draft", "Borrador", "neutral"],
  ["published", "Publicado", "positive"],
  ["paused", "Pausado", "attention"],
  ["cancelled", "Cancelado", "attention"],
  ["archived", "Archivado", "neutral"],
  ["active", "Activo", "positive"],
];

describe("StatusBadge", () => {
  it.each(labels)(
    "shows %s as the text %s with tone %s",
    async (status, label, tone) => {
      const { container } = render(<StatusBadge status={status} />);
      const badge = screen.getByText(label);
      expect(badge).toHaveAttribute("data-tone", tone);
      expect(badge).toHaveAttribute("data-status", status);
      await expectNoAxeViolations(container);
    },
  );
});

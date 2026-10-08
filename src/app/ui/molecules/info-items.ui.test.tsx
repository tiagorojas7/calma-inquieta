import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ContactItem, TrustItem, DateBadge } from "./contact-item";
describe("info molecules", () => {
  it("renders contact, trust and date information", async () => {
    const { container } = render(
      <>
        <ContactItem
          icon="arrow"
          label="Email"
          value="hola@example.com"
          href="https://example.com/contact"
        />
        <TrustItem icon="arrow" label="Calma" />
        <DateBadge date="2026-01-02" />
      </>,
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Calma")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("time")).toHaveAttribute("aria-label");
    await expectNoAxeViolations(container);
  });
});

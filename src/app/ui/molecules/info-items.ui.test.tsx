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
    expect(screen.getByText("hola@example.com")).toHaveAttribute(
      "href",
      "https://example.com/contact",
    );
    expect(screen.getByText("Calma")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByRole("time")).toHaveAccessibleName(
      "viernes, 2 de enero de 2026",
    );
    const plain = render(
      <ContactItem icon="arrow" label="Dirección" value="Córdoba" />,
    );
    expect(plain.container.querySelector("a")).toBeNull();
    expect(
      plain.container.querySelector('[aria-hidden="true"]'),
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("time")).toHaveAttribute("aria-label");
    await expectNoAxeViolations(container);
  });
});

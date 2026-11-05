import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ContactItem, TrustItem, DateBadge } from "./contact-item";

const dateParts = {
  dateTime: "2026-01-02",
  weekday: "vie",
  day: "2",
  month: "ene",
  label: "viernes 2 de enero de 2026",
};
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
        <DateBadge {...dateParts} />
      </>,
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("hola@example.com")).toHaveAttribute(
      "href",
      "https://example.com/contact",
    );
    expect(screen.getByText("Calma")).toBeInTheDocument();
    expect(screen.getByRole("time")).toHaveAccessibleName(
      "viernes 2 de enero de 2026",
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

  it("draws the icon in a calm sage chip and makes the whole card the tap target", () => {
    const { container } = render(
      <ContactItem
        icon="mail"
        label="Email"
        value="hola@ci.test"
        href="mailto:hola@ci.test"
      />,
    );
    const chip = container.querySelector("svg")?.parentElement;
    const link = screen.getByRole("link");

    expect(chip).toHaveClass("bg-sage-200", "text-olive-800");
    expect(container.firstElementChild).toHaveClass("relative");
    // A stretched link: its pseudo-element covers the card.
    expect(link.className).toContain("after:absolute");
    expect(link.className).toContain("after:inset-0");
  });

  it("sets a contact item on a lifting white card", () => {
    const { container } = render(
      <ContactItem icon="pin" label="Dirección" value="Córdoba" />,
    );
    expect(container.firstElementChild).toHaveClass(
      "card-hover",
      "bg-white",
      "shadow-card",
    );
  });

  it("renders the preformatted parts verbatim without formatting the date", () => {
    const localeSpy = vi.spyOn(Date.prototype, "toLocaleDateString");
    const { container } = render(
      <DateBadge
        dateTime="2030-05-09"
        weekday="xyz"
        day="9"
        month="qwe"
        label="etiqueta propia"
      />,
    );
    const time = screen.getByRole("time");
    expect(time).toHaveAttribute("dateTime", "2030-05-09");
    expect(time).toHaveAccessibleName("etiqueta propia");
    expect(time).toHaveTextContent("xyz");
    expect(time).toHaveTextContent("9");
    expect(time).toHaveTextContent("qwe");
    expect(time).not.toHaveTextContent("09");
    expect(container.textContent).not.toMatch(/2030|mayo|may/u);
    expect(localeSpy).not.toHaveBeenCalled();
    localeSpy.mockRestore();
  });

  it("omits the weekday when it is not given", () => {
    render(<DateBadge dateTime="2026-11-14" day="14" month="nov" label="x" />);
    const time = screen.getByRole("time");
    expect(time).toHaveTextContent("14");
    expect(time).toHaveTextContent("nov");
    expect(time.querySelectorAll("span")).toHaveLength(2);
  });
});

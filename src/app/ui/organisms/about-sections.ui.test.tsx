import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { faqEntryFixtures, valueItemFixtures } from "~/testing/fixtures/ui";
import { FaqItem } from "../molecules/faq-item";
import { FaqList } from "./faq-list";
import { ValuesRow } from "./values-row";

describe("about organisms", () => {
  it("marks each value with a calm sage chip in a full-bleed sand band", () => {
    const { container } = render(
      <ValuesRow
        heading="Valores"
        items={[
          ...valueItemFixtures,
          { id: "value-3", title: "Sin experiencia", text: "Paso a paso." },
        ]}
      />,
    );
    const band = container.querySelector("section");
    expect(band).toHaveAttribute("data-tone", "sand");
    expect(band).toHaveAttribute("data-bleed", "true");
    const marks = [...container.querySelectorAll("[data-value-mark]")];
    expect(marks).toHaveLength(3);
    for (const mark of marks) {
      expect(mark).toHaveClass("bg-sage-200", "text-olive-800");
      expect(mark.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
    expect(container.querySelector("[data-disc]")).toBeNull();
  });

  it("separates the values with a hairline instead of a card", () => {
    render(<ValuesRow heading="Valores" items={valueItemFixtures} />);
    for (const item of screen.getAllByRole("listitem")) {
      const row = item.firstElementChild as HTMLElement;
      expect(row).toHaveClass("border-t", "border-sand-300");
      expect(row).not.toHaveClass("card-hover");
      expect(row).not.toHaveClass("bg-white");
      expect(row).not.toHaveClass("shadow-card");
    }
  });

  it("sets each FAQ question on a hairline row with a sage toggle", () => {
    const { container } = render(
      <FaqItem question="¿Cómo?" answer="Así se hace." />,
    );
    const details = container.querySelector("details");
    expect(details).toHaveClass("disclosure", "border-b", "border-sand-300");
    expect(details).not.toHaveClass("shadow-card");
    expect(details?.querySelector("summary")?.className).toContain(
      "after:bg-sage-200",
    );
    expect(details?.querySelector("summary")?.className).not.toContain(
      "after:bg-clay-600",
    );
  });

  it("renders the FAQ in a full-bleed white band", () => {
    const { container } = render(
      <FaqList heading="Preguntas" items={faqEntryFixtures} />,
    );
    const band = container.querySelector("section");
    expect(band).toHaveAttribute("data-tone", "white");
    expect(band).toHaveAttribute("data-bleed", "true");
  });
  it("renders ValuesRow null for an empty list", async () => {
    const { container } = render(<ValuesRow heading="Valores" items={[]} />);
    expect(container).toBeEmptyDOMElement();
    await expectNoAxeViolations(container);
  });

  it("renders one titled item per value", async () => {
    const { container } = render(
      <ValuesRow heading="Valores" items={valueItemFixtures} />,
    );
    expect(
      screen.getByRole("heading", { name: "Valores", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "Hacer con calma", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText("La comunidad es parte.")).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("renders FaqItem as a closed, focusable, toggling disclosure", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FaqItem question="¿Cómo?" answer="Así se hace." />,
    );
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    const summary = screen.getByText("¿Cómo?");
    expect(summary.tagName).toBe("SUMMARY");
    expect(screen.getByText("Así se hace.")).toBeInTheDocument();
    await expectNoAxeViolations(container);
    // jsdom does not synthesize the click that browsers dispatch for Enter and
    // Space on a native <summary>; assert it is focusable, then activate it.
    await user.tab();
    expect(summary).toHaveFocus();
    await user.click(summary);
    expect(details).toHaveAttribute("open");
    await expectNoAxeViolations(container);
    await user.click(summary);
    expect(details).not.toHaveAttribute("open");
  });

  it("renders FaqList null for an empty list", async () => {
    const { container } = render(<FaqList heading="Preguntas" items={[]} />);
    expect(container).toBeEmptyDOMElement();
    await expectNoAxeViolations(container);
  });

  it("renders FaqList in order without FAQPage JSON-LD", async () => {
    const { container } = render(
      <FaqList heading="Preguntas" items={faqEntryFixtures} />,
    );
    expect(
      screen.getByRole("heading", { name: "Preguntas", level: 2 }),
    ).toBeInTheDocument();
    expect(
      [...container.querySelectorAll("summary")].map((s) => s.textContent),
    ).toEqual(faqEntryFixtures.map((entry) => entry.question));
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).toBeNull();
    await expectNoAxeViolations(container);
  });
});

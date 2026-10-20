import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { faqEntryFixtures, valueItemFixtures } from "~/testing/fixtures/ui";
import { FaqItem } from "../molecules/faq-item";
import { FaqList } from "./faq-list";
import { ValuesRow } from "./values-row";

describe("about organisms", () => {
  it("renders the values as coloured icon discs in a full-bleed sand band", () => {
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
    const discs = [...container.querySelectorAll("[data-disc]")];
    expect(discs.map((disc) => disc.getAttribute("data-disc"))).toEqual([
      "sand",
      "clay",
      "olive",
    ]);
    for (const disc of discs) {
      expect(disc).toHaveClass("rounded-full");
      expect(disc.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("lifts each value on a white card with a soft shadow", () => {
    render(<ValuesRow heading="Valores" items={valueItemFixtures} />);
    for (const item of screen.getAllByRole("listitem")) {
      const card = item.firstElementChild as HTMLElement;
      expect(card).toHaveClass("card-hover", "bg-white", "shadow-card");
      expect(card.querySelector("[data-disc]")).not.toBeNull();
    }
  });

  it("sets each FAQ question on a rounded card that deepens when open", () => {
    const { container } = render(
      <FaqItem question="¿Cómo?" answer="Así se hace." />,
    );
    const details = container.querySelector("details");
    expect(details).toHaveClass(
      "rounded-md",
      "shadow-card",
      "open:shadow-lift",
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

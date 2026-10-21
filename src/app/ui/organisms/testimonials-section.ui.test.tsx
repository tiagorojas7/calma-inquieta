import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { testimonialFixture } from "~/testing/fixtures/ui";
import { TestimonialsSection } from "./testimonials-section";
describe("TestimonialsSection", () => {
  it("hides empty testimonials and remains accessible", async () => {
    const { container } = render(
      <TestimonialsSection heading="Testimonios" items={[]} />,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByText("Testimonios")).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
  it("renders cards", async () => {
    const { container } = render(
      <TestimonialsSection
        heading="Testimonios"
        items={[testimonialFixture]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Testimonios" }),
    ).toBeInTheDocument();
    expect(screen.getByText(testimonialFixture.quote)).toBeInTheDocument();
    expect(screen.getByText(testimonialFixture.author)).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("is a full-bleed canvas tone band with a decorative quote mark and staggered cards", () => {
    const { container } = render(
      <TestimonialsSection
        heading="Testimonios"
        items={[testimonialFixture, { ...testimonialFixture, id: "t2" }]}
      />,
    );
    const band = container.querySelector("section");
    const delays = [...container.querySelectorAll("[data-reveal]")].map(
      (element) =>
        (element as HTMLElement).style.getPropertyValue("--reveal-delay"),
    );

    expect(band).toHaveAttribute("data-bleed", "true");
    expect(band).toHaveAttribute("data-tone", "canvas");
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(delays).toContain("80ms");
  });
});

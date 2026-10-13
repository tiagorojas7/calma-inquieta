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
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { heroImageFixtures } from "~/testing/fixtures/ui";
import { HeroSection } from "./hero-section";

describe("HeroSection", () => {
  it("renders the hero contract and accessible collage", async () => {
    const { container } = render(
      <MemoryRouter>
        <HeroSection
          eyebrow="Calma Inquieta"
          title={
            <>
              Crear con <em>calma</em>
            </>
          }
          subtitle="Un espacio para encontrarnos."
          images={heroImageFixtures}
          bajada="Equilibrio entre serenidad y movimiento"
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Calma Inquieta")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1 }).querySelector("em"),
    ).toBeTruthy();
    expect(
      screen.getByText("Un espacio para encontrarnos."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver talleres" })).toHaveAttribute(
      "href",
      "/talleres",
    );
    expect(
      screen.getByRole("link", { name: "Ver intensivos" }),
    ).toHaveAttribute("href", "/intensivos");
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(3);
    images.forEach((image, index) => {
      expect(image).toHaveAttribute("loading", "eager");
      expect(image).toHaveAttribute("alt");
      if (index === 0) expect(image).toHaveAttribute("fetchpriority", "high");
      if (index > 0) expect(image).toHaveClass("max-md:hidden");
    });
    expect(
      screen.getByText("Equilibrio entre serenidad y movimiento"),
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { HomeCatalogLead } from "./home-catalog-lead";

const primary = {
  src: "/media/home/home-catalog-weaving-900.webp",
  srcSet:
    "/media/home/home-catalog-weaving-480.webp 480w, /media/home/home-catalog-weaving-900.webp 900w",
  alt: "Manos tejiendo un cesto",
  width: 900,
  height: 1125,
};
const secondary = {
  src: "/media/home/home-catalog-looms-960.webp",
  srcSet:
    "/media/home/home-catalog-looms-480.webp 480w, /media/home/home-catalog-looms-960.webp 960w",
  alt: "Telares sobre lino",
  width: 960,
  height: 640,
};

function renderLead(props: object = {}) {
  return render(
    <MemoryRouter>
      <HomeCatalogLead
        heading="Tu lugar para crear"
        body="Sumate a un taller mensual."
        primary={primary}
        secondary={secondary}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("HomeCatalogLead", () => {
  it("leads with a heading, the copy and both booking calls to action", () => {
    renderLead();

    expect(
      screen.getByRole("heading", { level: 2, name: "Tu lugar para crear" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sumate a un taller mensual.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Reservá tu lugar" }),
    ).toHaveAttribute("href", "/talleres");
    expect(screen.getByRole("link", { name: "Ver workshops" })).toHaveAttribute(
      "href",
      "/intensivos",
    );
  });

  it("books on the site: no call to action sends the visitor to WhatsApp", () => {
    const { container } = renderLead();

    expect(container.querySelector('a[href*="wa.me"]')).toBeNull();
    expect(container.textContent).not.toMatch(/whatsapp/iu);
  });

  it("layers two lazy photos of different ratios, the second in a white frame", () => {
    const { container } = renderLead();
    const first = screen.getByAltText(primary.alt);
    const second = screen.getByAltText(secondary.alt);

    expect(first).toHaveClass("aspect-4/5");
    expect(second).toHaveClass("aspect-3/2");
    for (const img of [first, second]) {
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).not.toHaveAttribute("fetchpriority");
      expect(img).toHaveAttribute("sizes");
      expect(img).toHaveAttribute("width");
      expect(img).toHaveAttribute("height");
    }
    expect(second.closest(".bg-surface")).not.toBeNull();
    expect(first.closest(".photo-pair")).toBe(second.closest(".photo-pair"));
    expect(container.querySelector("[data-variant]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("reveals the copy and the photos with a stagger", () => {
    const { container } = renderLead();
    const delays = [...container.querySelectorAll("[data-reveal]")].map(
      (element) =>
        (element as HTMLElement).style.getPropertyValue("--reveal-delay"),
    );

    expect(delays).toContain("80ms");
  });

  it("has no axe violations", async () => {
    const { container } = renderLead();
    await expectNoAxeViolations(container);
  });
});

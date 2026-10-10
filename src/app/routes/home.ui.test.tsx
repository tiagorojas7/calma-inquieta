import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import HomeRoute from "./home";

const fixture = {
  hero: {
    eyebrow: "Calma Inquieta",
    title: { lead: "Un espacio para ", accent: "crear", trail: "" },
    subtitle: "Una propuesta cálida.",
    images: [{ src: "/hero.svg", alt: "Textura", width: 400, height: 300 }],
    bajada: "Equilibrio entre serenidad y movimiento",
  },
  trustClaims: [],
  monthly: [],
  intensivos: [],
  teaser: {
    heading: "Quiénes somos",
    body: "Conocenos",
    image: { src: "/about.svg", alt: "", width: 400, height: 300 },
    linkLabel: "Conocenos",
  },
  testimonials: [],
  contactBand: { heading: "Hablemos", body: "Escribinos" },
  whatsappHref: "https://wa.me/5493510000000",
  instagramHref: "https://www.instagram.com/calma.inquieta/",
};

describe("Inicio route", () => {
  it(
    "renders the empty, consent-safe page contract",
    { timeout: 10000 },
    async () => {
      const Stub = createRoutesStub([
        {
          path: "/",
          Component: () => (
            <main>
              <HomeRoute />
            </main>
          ),
          loader: () => fixture,
        },
      ]);
      const { container } = render(<Stub initialEntries={["/"]} />);
      expect(await screen.findAllByRole("heading", { level: 1 })).toHaveLength(
        1,
      );
      expect(
        screen.getByRole("heading", { level: 1 }).querySelector("em"),
      ).toBeTruthy();
      const monthly = screen
        .getByRole("heading", { name: "Talleres mensuales" })
        .closest("section");
      const intensivos = screen
        .getByRole("heading", { name: "Próximos intensivos" })
        .closest("section");
      expect(monthly).not.toBeNull();
      expect(intensivos).not.toBeNull();
      expect(monthly).toHaveTextContent("Escribinos por WhatsApp");
      expect(intensivos).toHaveTextContent("Seguinos en Instagram");
      expect(
        monthly?.querySelector('a[href="https://wa.me/5493510000000"]'),
      ).toBeTruthy();
      expect(
        intensivos?.querySelector(
          'a[href="https://www.instagram.com/calma.inquieta/"]',
        ),
      ).toBeTruthy();
      expect(monthly?.querySelector('a[href="/contacto"]')).toBeNull();
      expect(intensivos?.querySelector('a[href="/contacto"]')).toBeNull();
      expect(screen.queryByText("Testimonios")).not.toBeInTheDocument();
      expect(container.textContent).not.toMatch(/\$\s?\d/);
      expect(container.textContent).not.toMatch(/\d{1,2}:\d{2}/);
      expect(
        screen.getAllByRole("heading").map((h) => Number(h.tagName.slice(1))),
      ).toEqual([1, 2, 2, 2, 2]);
      await expectNoAxeViolations(container, { page: true });
    },
  );
});

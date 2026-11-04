import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { HeroSection } from "./hero-section";

const next = {
  title: "Acuarela sobre tela",
  detail: "09:00 a 12:00 h",
  href: "/intensivos/acuarela-sobre-tela",
  date: {
    dateTime: "2026-11-07",
    weekday: "sáb",
    day: "7",
    month: "nov",
    label: "sábado 7 de noviembre",
  },
};

function renderHero(props: { next?: typeof next } = {}) {
  return render(
    <MemoryRouter>
      <HeroSection
        eyebrow="Multiespacio de arte en Argüello"
        title={
          <>
            Crear con <em>calma</em>
          </>
        }
        subtitle="Un espacio para encontrarnos."
        collage={[]}
        note="Crear también es una forma de volver a vos"
        keywords={["Arte"]}
        bajada="Equilibrio entre serenidad y movimiento"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("HeroSection next intensivo", () => {
  it("shows the next intensivo as one link, after the two calls to action", () => {
    renderHero({ next });
    const link = screen.getByRole("link", { name: /Acuarela sobre tela/ });

    expect(link).toHaveAttribute("href", next.href);
    expect(link).toHaveTextContent("09:00 a 12:00 h");
    expect(link.querySelector("time")).toHaveAttribute(
      "dateTime",
      "2026-11-07",
    );
    expect(link).toHaveTextContent("Próximo intensivo");
    const after = screen.getByRole("link", { name: "Ver intensivos" });
    expect(
      after.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("sits on a white strip with a sage date block, and sets the hours apart from the title", () => {
    renderHero({ next });
    const link = screen.getByRole("link", { name: /Acuarela sobre tela/ });

    expect(link).toHaveClass("bg-surface");
    expect(link).not.toHaveClass("bg-cocoa-900");
    expect(link.querySelector("time")?.parentElement).toHaveClass(
      "bg-sage-200",
    );
    expect(screen.getByText("Acuarela sobre tela")).toHaveClass("font-display");
    expect(screen.getByText("09:00 a 12:00 h")).toHaveClass(
      "font-semibold",
      "tabular-nums",
    );
  });

  it("leaves the strip out when no intensivo is open", () => {
    renderHero();

    expect(screen.queryByText("Próximo intensivo")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});

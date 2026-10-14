import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import {
  tallerCardFixture,
  tallerCardNoOfferingFixture,
  tallerCardPausedFixture,
} from "~/testing/fixtures/catalog";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { TallerCard } from "./taller-card";

const renderCard = (props: Parameters<typeof TallerCard>[0]) =>
  render(
    <MemoryRouter>
      <TallerCard {...props} />
    </MemoryRouter>,
  );

describe("TallerCard", () => {
  it("shows name, teacher, summary, both turnos, the fee and the seats indicator", async () => {
    const { container } = renderCard(tallerCardFixture);
    expect(
      screen.getByRole("heading", { level: 2, name: tallerCardFixture.name }),
    ).toBeVisible();
    expect(screen.getByText(tallerCardFixture.teacher)).toBeVisible();
    expect(screen.getByText(tallerCardFixture.summary)).toBeVisible();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(tallerCardFixture.turnos.length);
    expect(within(rows[0] as HTMLElement).getByText("Lunes")).toBeVisible();
    expect(
      within(rows[1] as HTMLElement).getByText("18:00 a 19:30 h"),
    ).toBeVisible();
    expect(container.textContent).toContain("$ 58.000 / mes");
    expect(screen.getByText("Cupo limitado")).toBeVisible();
    expect(
      screen.getByRole("link", { name: tallerCardFixture.ctaLabel }),
    ).toHaveAttribute("href", tallerCardFixture.href);
    expect(
      screen.getByRole("img", { name: tallerCardFixture.image.alt }),
    ).toHaveAttribute("loading", "lazy");
    await expectNoAxeViolations(container);
  });

  it("shows the paused notice, keeps the link and hides the seats indicator", async () => {
    const { container } = renderCard({
      ...tallerCardPausedFixture,
      seats: "Cupo limitado",
    });
    expect(screen.getByText("Inscripciones pausadas")).toBeVisible();
    expect(screen.queryByText("Cupo limitado")).toBeNull();
    expect(
      screen.getByRole("link", { name: tallerCardPausedFixture.ctaLabel }),
    ).toHaveAttribute("href", tallerCardPausedFixture.href);
    await expectNoAxeViolations(container);
  });

  it("shows the no-offering text, no fee and no seats indicator", async () => {
    const { container } = renderCard({
      ...tallerCardNoOfferingFixture,
      seats: "Cupo limitado",
    });
    expect(
      screen.getByText("Próximamente abrimos inscripciones"),
    ).toBeVisible();
    expect(container.textContent).not.toContain("$");
    expect(screen.queryByText("Cupo limitado")).toBeNull();
    expect(
      screen.getByRole("link", { name: tallerCardNoOfferingFixture.ctaLabel }),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("gives the paused notice precedence over the no-offering text", () => {
    renderCard({
      ...tallerCardNoOfferingFixture,
      paused: "Inscripciones pausadas",
    });
    expect(screen.getByText("Inscripciones pausadas")).toBeVisible();
    expect(screen.queryByText("Próximamente abrimos inscripciones")).toBeNull();
  });
});

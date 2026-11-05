import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import {
  intensivoCardFixture,
  tallerCardFixture,
} from "~/testing/fixtures/catalog";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { IntensivoCard } from "../molecules/intensivo-card";
import { TallerCard } from "../molecules/taller-card";
import { CatalogGrid } from "../organisms/catalog-grid";
import { CatalogListingPage } from "./catalog-listing-page";

const empty = {
  message: "Pronto vamos a sumar nuevas propuestas.",
  action: { href: "https://wa.me/5493510000000", label: "Escribinos" },
};

const headingLevels = () =>
  screen
    .getAllByRole("heading")
    .map((heading) => Number(heading.tagName.slice(1)));

describe("CatalogListingPage", () => {
  it("renders exactly one h1 with the intro and the grid, without skipping levels", async () => {
    const { container } = render(
      <MemoryRouter>
        <main>
          <CatalogListingPage
            heading="Talleres intensivos"
            intro="Encuentros de un día para crear con calma."
          >
            <CatalogGrid
              empty={empty}
              items={[
                { key: "t", node: <TallerCard {...tallerCardFixture} /> },
                { key: "i", node: <IntensivoCard {...intensivoCardFixture} /> },
              ]}
            />
          </CatalogListingPage>
        </main>
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Talleres intensivos",
    );
    expect(
      screen.getByText("Encuentros de un día para crear con calma."),
    ).toBeVisible();
    const levels = headingLevels();
    expect(levels[0]).toBe(1);
    expect(levels.length).toBeGreaterThan(2);
    levels.slice(1).forEach((level, at) => {
      expect(level - (levels[at] ?? 0)).toBeLessThanOrEqual(1);
    });
    await expectNoAxeViolations(container, { page: true });
  });

  it("gives the title room before the content and little space under the navbar", () => {
    const { container } = render(
      <CatalogListingPage heading="Talleres mensuales" intro="Intro.">
        <p>Grilla</p>
      </CatalogListingPage>,
    );
    const page = container.firstElementChild;

    expect(page).toHaveClass("pt-page-top", "pb-section", "gap-10");
    expect(page).not.toHaveClass("py-section", "gap-8");
  });

  it("sets the last word of a multi-word title in the accent italic, and leaves a one-word title plain", () => {
    const { rerender } = render(
      <CatalogListingPage heading="Talleres mensuales" intro="Intro.">
        <p>Grilla</p>
      </CatalogListingPage>,
    );

    expect(
      screen.getByRole("heading", { level: 1 }).querySelector("em"),
    ).toHaveTextContent("mensuales");

    rerender(
      <CatalogListingPage heading="Intensivos" intro="Intro.">
        <p>Grilla</p>
      </CatalogListingPage>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Intensivos",
    );
    expect(
      screen.getByRole("heading", { level: 1 }).querySelector("em"),
    ).toBeNull();
  });

  it("keeps the h1, the intro and the empty state when there is no data", async () => {
    const { container } = render(
      <main>
        <CatalogListingPage heading="Talleres" intro="Propuestas para vos.">
          <CatalogGrid empty={empty} items={[]} />
        </CatalogListingPage>
      </main>,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Talleres",
    );
    expect(screen.getByText("Propuestas para vos.")).toBeVisible();
    expect(screen.getByText(empty.message)).toBeVisible();
    expect(screen.queryByRole("article")).toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });
});

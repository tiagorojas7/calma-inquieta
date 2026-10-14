import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import {
  intensivoCardFixture,
  tallerCardFixture,
  tallerCardPausedFixture,
} from "~/testing/fixtures/catalog";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { IntensivoCard } from "../molecules/intensivo-card";
import { TallerCard } from "../molecules/taller-card";
import { CatalogGrid } from "./catalog-grid";

const empty = {
  message: "Pronto vamos a sumar nuevas propuestas.",
  action: { href: "https://wa.me/5493510000000", label: "Escribinos" },
};

describe("CatalogGrid", () => {
  it("renders every item in the given order", async () => {
    const { container } = render(
      <MemoryRouter>
        <CatalogGrid
          empty={empty}
          items={[
            { key: "a", node: <TallerCard {...tallerCardFixture} /> },
            { key: "b", node: <TallerCard {...tallerCardPausedFixture} /> },
            { key: "c", node: <IntensivoCard {...intensivoCardFixture} /> },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      tallerCardFixture.name,
      tallerCardPausedFixture.name,
      intensivoCardFixture.name,
    ]);
    expect(screen.queryByText(empty.message)).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("renders the empty state with its action and no card when there are no items", async () => {
    const { container } = render(<CatalogGrid empty={empty} items={[]} />);
    expect(screen.getByText(empty.message)).toBeVisible();
    expect(
      screen.getByRole("link", { name: empty.action.label }),
    ).toHaveAttribute("href", empty.action.href);
    expect(screen.queryByRole("article")).toBeNull();
    await expectNoAxeViolations(container);
  });
});

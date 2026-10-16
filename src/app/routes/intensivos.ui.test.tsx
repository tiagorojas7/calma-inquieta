import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import type { PublicIntensivo } from "~/modules/workshops";
import { createTestServices } from "~/testing/fakes/app-services";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import { buildPublicIntensivo } from "~/testing/fakes/public-catalog-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import IntensivosRoute, { loader } from "./intensivos";

async function renderListing(
  intensivos: readonly PublicIntensivo[],
  path = "/intensivos",
) {
  const services = createTestServices({
    publicCatalog: createFakePublicCatalog({ intensivos }),
  });
  const Stub = createRoutesStub([
    {
      path: "/intensivos",
      Component: () => (
        <main>
          <IntensivosRoute />
        </main>
      ),
      loader: () => loader(createLoaderArgs(services, path) as never),
    },
  ]);
  const view = render(<Stub initialEntries={[path]} />);
  // The first render in a file pays the cold import cost.
  await screen.findByRole("heading", { level: 1 }, { timeout: 10_000 });
  return view;
}

describe("Intensivos listing", { timeout: 60_000 }, () => {
  it("renders one h1, the cards in order and no controls", async () => {
    const { container } = await renderListing([
      buildPublicIntensivo({ slug: "a", name: "Primero", date: "2026-11-05" }),
      buildPublicIntensivo({ slug: "b", name: "Segundo", date: "2026-11-12" }),
      buildPublicIntensivo({ slug: "c", name: "Tercero", date: "2026-11-20" }),
    ]);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Talleres intensivos" }),
    ).toBeInTheDocument();
    const names = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(names).toEqual(["Primero", "Segundo", "Tercero"]);
    expect(container.querySelector("form")).toBeNull();
    expect(
      container.querySelector("select, input, [role='combobox']"),
    ).toBeNull();
    expect(
      container.querySelector('a[href="/intensivos/a"]'),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("Cupo limitado");
    await expectNoAxeViolations(container, { page: true });
  });

  it("shows the policy text on the card and not the minimum seats line", async () => {
    const { container } = await renderListing([
      buildPublicIntensivo({ policyText: "Texto de política de prueba" }),
    ]);
    expect(screen.getByText("Texto de política de prueba")).toBeVisible();
    expect(container.textContent).not.toContain("Se realiza con un mínimo de");
    expect(container.querySelector("details")).toBeNull();
  });

  it("marks a paused card without the seats indicator, keeping its link", async () => {
    const { container } = await renderListing([
      buildPublicIntensivo({ slug: "a", date: "2026-11-05" }),
      buildPublicIntensivo({
        slug: "p",
        name: "Pausado",
        date: "2026-11-12",
        status: "paused",
      }),
      buildPublicIntensivo({ slug: "c", date: "2026-11-20" }),
    ]);
    const cards = container.querySelectorAll("article");
    const paused = cards[1] as HTMLElement;
    expect(within(paused).getByText("Inscripciones pausadas")).toBeVisible();
    expect(paused.textContent).not.toContain("Cupo limitado");
    expect(paused.querySelector('a[href="/intensivos/p"]')).not.toBeNull();
    expect(cards[0]?.textContent).toContain("Cupo limitado");
  });

  it("renders the same cards with filter query parameters", async () => {
    const data = [
      buildPublicIntensivo({ slug: "a" }),
      buildPublicIntensivo({ slug: "b" }),
    ];
    const plain = await renderListing(data);
    const plainHtml = plain.container.innerHTML;
    plain.unmount();
    const filtered = await renderListing(
      data,
      "/intensivos?desde=2026-11-01&orden=precio",
    );
    expect(filtered.container.innerHTML).toBe(plainHtml);
  });

  it("shows only the empty state when there are no intensivos", async () => {
    const { container } = await renderListing([]);
    expect(
      screen.getByRole("heading", { level: 1, name: "Talleres intensivos" }),
    ).toBeInTheDocument();
    expect(container.querySelector("article")).toBeNull();
    expect(screen.getByText("Pronto.")).toBeVisible();
    expect(container.querySelector('a[href^="https://wa.me/"]')).not.toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("uses no forbidden word in the static copy", async () => {
    const { container } = await renderListing([]);
    expect(container.textContent.toLowerCase()).not.toContain("workshop");
  });
});

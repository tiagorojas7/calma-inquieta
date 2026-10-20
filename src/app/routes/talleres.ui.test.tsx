import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import type { PublicTaller } from "~/modules/workshops";
import { createTestServices } from "~/testing/fakes/app-services";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import {
  buildPublicTaller,
  buildPublicTurno,
} from "~/testing/fakes/public-catalog-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import TalleresRoute, { loader } from "./talleres";

async function renderListing(
  talleres: readonly PublicTaller[],
  path = "/talleres",
) {
  const services = createTestServices({
    publicCatalog: createFakePublicCatalog({ talleres }),
  });
  const Stub = createRoutesStub([
    {
      path: "/talleres",
      Component: () => (
        <main>
          <TalleresRoute />
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

const normalize = (text: string) => text.replaceAll(" ", " ");

describe("Talleres listing", { timeout: 60_000 }, () => {
  it("renders one h1, the cards in order with their content and no controls", async () => {
    const { container } = await renderListing([
      buildPublicTaller({
        slug: "a",
        name: "Primero",
        teacher: { name: "Docente Uno", bioLine: null },
        turnos: [
          buildPublicTurno({ weekday: 1, startsAt: "10:00", endsAt: "12:00" }),
          buildPublicTurno({ weekday: 3, startsAt: "18:00", endsAt: "20:00" }),
        ],
      }),
      buildPublicTaller({ slug: "b", name: "Segundo" }),
      buildPublicTaller({ slug: "c", name: "Tercero" }),
    ]);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Talleres" }),
    ).toBeInTheDocument();
    const names = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(names).toEqual(["Primero", "Segundo", "Tercero"]);
    const first = container.querySelectorAll("article")[0] as HTMLElement;
    const text = normalize(first.textContent);
    for (const expected of [
      "Docente Uno",
      "Resumen del taller de demostración.",
      "Lunes",
      "10:00 a 12:00 h",
      "Miércoles",
      "18:00 a 20:00 h",
      "$ 58.000 / mes",
      "Cupo limitado",
      "Ver taller",
    ]) {
      expect(text).toContain(expected);
    }
    expect(text).not.toContain("Descripción del taller");
    expect(container.querySelector("form")).toBeNull();
    expect(
      container.querySelector("select, input, [role='combobox']"),
    ).toBeNull();
    expect(container.querySelector('a[href="/talleres/a"]')).not.toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("marks a paused card without the seats indicator, keeping its link", async () => {
    const { container } = await renderListing([
      buildPublicTaller({ slug: "a" }),
      buildPublicTaller({ slug: "p", name: "Pausado", status: "paused" }),
    ]);
    const cards = container.querySelectorAll("article");
    const paused = cards[1] as HTMLElement;
    expect(within(paused).getByText("Inscripciones pausadas")).toBeVisible();
    expect(paused.textContent).not.toContain("Cupo limitado");
    expect(paused.querySelector('a[href="/talleres/p"]')).not.toBeNull();
    expect(cards[0]?.textContent).toContain("Cupo limitado");
  });

  it("shows the no-offering notice instead of a fee or seats", async () => {
    const { container } = await renderListing([
      buildPublicTaller({ slug: "n", offering: null }),
    ]);
    const card = container.querySelector("article") as HTMLElement;
    expect(card.textContent).toContain("Próximamente abrimos inscripciones");
    expect(card.textContent).not.toContain("$");
    expect(card.textContent).not.toContain("Cupo limitado");
    expect(card.querySelector('a[href="/talleres/n"]')).not.toBeNull();
  });

  it("renders the same cards with filter query parameters", async () => {
    const data = [
      buildPublicTaller({ slug: "a" }),
      buildPublicTaller({ slug: "b" }),
    ];
    const plain = await renderListing(data);
    const plainHtml = plain.container.innerHTML;
    plain.unmount();
    const filtered = await renderListing(
      data,
      "/talleres?franja=manana&tecnica=ceramica",
    );
    expect(filtered.container.innerHTML).toBe(plainHtml);
  });

  it("shows only the empty state when there are no talleres", async () => {
    const { container } = await renderListing([]);
    expect(
      screen.getByRole("heading", { level: 1, name: "Talleres" }),
    ).toBeInTheDocument();
    expect(container.querySelector("article")).toBeNull();
    expect(screen.getByText("Pronto.")).toBeVisible();
    expect(container.querySelector('a[href^="https://wa.me/"]')).not.toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("uses no forbidden word in the static copy", async () => {
    const { container } = await renderListing([buildPublicTaller()]);
    expect(container.textContent.toLowerCase()).not.toContain("workshop");
  });
});

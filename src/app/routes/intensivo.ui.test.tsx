import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { PublicIntensivo } from "~/modules/workshops";
import { createTestServices } from "~/testing/fakes/app-services";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import {
  buildPublicImage,
  buildPublicIntensivo,
  buildPublicTeacher,
} from "~/testing/fakes/public-catalog-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import IntensivoRoute, { loader } from "./intensivo";
import PublicLayout, {
  ErrorBoundary,
  loader as layoutLoader,
} from "./public-layout";

async function renderDetail(
  intensivos: readonly PublicIntensivo[],
  slug = "intensivo-demo",
  catalog = createFakePublicCatalog({ intensivos }),
) {
  const services = createTestServices({ publicCatalog: catalog });
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: PublicLayout,
      ErrorBoundary,
      loader: () =>
        layoutLoader({
          context: createLoaderArgs(services).context,
        } as never),
      children: [
        {
          path: "intensivos/:slug",
          Component: IntensivoRoute,
          loader: () =>
            loader({
              ...createLoaderArgs(services, `/intensivos/${slug}`),
              params: { slug },
            } as never),
        },
      ],
    },
  ]);
  const view = render(<Stub initialEntries={[`/intensivos/${slug}`]} />);
  // The first render in a file pays the cold import cost.
  await screen.findByRole("heading", { level: 1 }, { timeout: 10_000 });
  return view;
}

const full = buildPublicIntensivo({
  name: "Intensivo Demo",
  startsAt: "10:00",
  endsAt: "12:00",
  minSeats: 6,
  materialsIncluded: true,
  policyText: "Texto de política de prueba",
  teacher: buildPublicTeacher({ bioLine: "Bio de prueba" }),
  images: [
    buildPublicImage({ src: "/imagenes/a.jpg", alt: "Cubierta" }),
    buildPublicImage({ src: "/imagenes/b.jpg", alt: "Segunda" }),
  ],
});

function headingLevels(): number[] {
  return screen
    .getAllByRole("heading")
    .map((heading) => Number(heading.tagName.slice(1)));
}

function expectNoSkippedLevels(levels: number[]) {
  const body = levels.slice(levels.indexOf(1));
  for (let index = 1; index < body.length; index += 1) {
    expect((body[index] ?? 0) - (body[index - 1] ?? 0)).toBeLessThanOrEqual(1);
  }
}

describe("Intensivo detail", { timeout: 60_000 }, () => {
  it("renders the full detail with the policy and minimum seats visible", async () => {
    const { container } = await renderDetail([full]);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Intensivo Demo" }),
    ).toBeInTheDocument();
    const text = (container.textContent ?? "").replaceAll(" ", " ");
    for (const expected of [
      "Sábado 14 de noviembre",
      "10:00 a 12:00 h",
      "2 horas",
      "Docente Demo",
      "Bio de prueba",
      "Descripción del intensivo de demostración.",
      "Cupo limitado",
      "Materiales incluidos",
      "Texto de política de prueba",
      "Se realiza con un mínimo de 6 personas",
      "$ 58.000",
      "Seña",
    ]) {
      expect(text).toContain(expected);
    }
    expect(
      screen.getByText(/Se realiza con un mínimo/u).closest("details"),
    ).toBeNull();
    expect(screen.getByText("Texto de política de prueba")).toBeVisible();
    const breadcrumb = screen.getByRole("navigation", {
      name: "Ruta de navegación",
    });
    expect(breadcrumb.querySelector('a[href="/intensivos"]')).not.toBeNull();
    expect(container.querySelector("form")).toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("keeps the heading order h1 then h2 without skipped levels", async () => {
    await renderDetail([full]);
    await screen.findByRole("heading", { level: 1 });
    const levels = headingLevels();
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expectNoSkippedLevels(levels);
  });

  it("keeps the headings in order when there is no teacher", async () => {
    await renderDetail([buildPublicIntensivo({ teacher: null })]);
    await screen.findByRole("heading", { level: 1 });
    expectNoSkippedLevels(headingLevels());
  });

  it("shows the WhatsApp inquiry link only when open", async () => {
    await renderDetail([full]);
    const link = await screen.findByRole("link", {
      name: /Consultá por WhatsApp/u,
    });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\//u);
  });

  it("shows the paused notice and no inquiry action when paused", async () => {
    const { container } = await renderDetail([
      buildPublicIntensivo({ status: "paused" }),
    ]);
    expect(await screen.findByText("Inscripciones pausadas")).toBeVisible();
    const article = container.querySelector("article") as HTMLElement;
    const link = within(article).getByRole("link", {
      name: /Escribinos por WhatsApp/u,
    });
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain(
      "Intensivo Demo",
    );
    expect(screen.queryByText(/Consultá por WhatsApp/u)).toBeNull();
    expect(container.textContent).not.toContain("Cupo limitado");
    await expectNoAxeViolations(container, { page: true });
  });

  it("marks Intensivos as the current menu entry", async () => {
    await renderDetail([full]);
    const entries = await screen.findAllByRole("link", { name: "Intensivos" });
    expect(
      entries.some((entry) => entry.getAttribute("aria-current") === "page"),
    ).toBe(true);
  });

  it("uses a decorative stand-in when there are no images", async () => {
    const { container } = await renderDetail([buildPublicIntensivo()]);
    expect(container.querySelector("article img")?.getAttribute("alt")).toBe(
      "",
    );
  });

  it("keeps the alt text of real images", async () => {
    const { container } = await renderDetail([full]);
    expect(
      container.querySelector('article img[alt="Cubierta"]'),
    ).not.toBeNull();
    expect(screen.getByAltText("Segunda")).toBeInTheDocument();
  });

  it.each(["no-existe", "otro-slug"])(
    "renders the styled public 404 for the unavailable slug %s",
    async (slug) => {
      const { container } = await renderDetail([], slug);
      await screen.findByRole("heading", { name: "Página no encontrada" });
      expect(screen.getAllByRole("banner").length).toBeGreaterThan(0);
      expect(container.querySelector("main")?.textContent).toBe(
        "Página no encontradaLa página que buscás no existe.InicioContacto",
      );
    },
  );

  it("renders the 500 boundary with no internals when the reader throws", async () => {
    const catalog = createFakePublicCatalog();
    vi.spyOn(catalog.intensivos, "findBySlug").mockRejectedValue(
      new Error("secret-db-detail"),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = await renderDetail([], "intensivo-demo", catalog);
    expect(
      await screen.findByRole("heading", { name: "Algo salió mal" }),
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain("secret-db-detail");
    spy.mockRestore();
  });
});

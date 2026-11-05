import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { PublicTaller } from "~/modules/workshops";
import { createTestServices } from "~/testing/fakes/app-services";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import {
  buildPublicImage,
  buildPublicTaller,
  buildPublicTeacher,
  buildPublicTurno,
} from "~/testing/fakes/public-catalog-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import TallerRoute, { loader } from "./taller";
import PublicLayout, {
  ErrorBoundary,
  loader as layoutLoader,
} from "./public-layout";

async function renderDetail(
  talleres: readonly PublicTaller[],
  slug = "taller-demo",
  catalog = createFakePublicCatalog({ talleres }),
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
          path: "talleres/:slug",
          Component: TallerRoute,
          loader: () =>
            loader({
              ...createLoaderArgs(services, `/talleres/${slug}`),
              params: { slug },
            } as never),
        },
      ],
    },
  ]);
  const view = render(<Stub initialEntries={[`/talleres/${slug}`]} />);
  // The first render in a file pays the cold import cost.
  await screen.findByRole("heading", { level: 1 }, { timeout: 10_000 });
  return view;
}

const normalize = (text: string) => text.replaceAll(" ", " ");

const full = buildPublicTaller({
  name: "Taller Demo",
  teacher: buildPublicTeacher({ bioLine: "Bio de prueba" }),
  images: [
    buildPublicImage({ src: "/imagenes/a.jpg", alt: "Cubierta" }),
    buildPublicImage({ src: "/imagenes/b.jpg", alt: "Segunda" }),
  ],
  turnos: [
    buildPublicTurno({ weekday: 1, startsAt: "10:00", endsAt: "12:30" }),
    buildPublicTurno({ weekday: 3, startsAt: "18:00", endsAt: "20:00" }),
  ],
  project: {
    title: "Plato hondo",
    description: "Un plato para el día a día.",
    images: [
      buildPublicImage({ src: "/imagenes/p1.jpg", alt: "Plato terminado" }),
      buildPublicImage({ src: "/imagenes/p2.jpg", alt: "Plato en proceso" }),
    ],
  },
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

describe("Taller detail", { timeout: 60_000 }, () => {
  it("renders the full detail with turnos, fee, teacher and project", async () => {
    const { container } = await renderDetail([full]);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Taller Demo" }),
    ).toBeInTheDocument();
    const text = normalize(container.textContent);
    for (const expected of [
      "Descripción del taller de demostración.",
      "Docente Demo",
      "Bio de prueba",
      "Lunes",
      "10:00 a 12:30 h",
      "2 h 30 min",
      "Miércoles",
      "18:00 a 20:00 h",
      "2 horas",
      "Cuota mensual",
      "$ 58.000",
      "Cupo limitado",
      "Plato hondo",
      "Un plato para el día a día.",
    ]) {
      expect(text).toContain(expected);
    }
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Proyectos que vamos a realizar",
      }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Plato terminado")).toBeInTheDocument();
    expect(screen.getByAltText("Segunda")).toBeInTheDocument();
    const breadcrumb = screen.getByRole("navigation", {
      name: "Ruta de navegación",
    });
    expect(breadcrumb.querySelector('a[href="/talleres"]')).not.toBeNull();
    expect(breadcrumb.textContent).toContain("Técnica de demostración");
    expect(container.querySelector("form")).toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("keeps the heading order h1 then h2 then h3 without skipped levels", async () => {
    await renderDetail([full]);
    await screen.findByRole("heading", { level: 1 });
    const levels = headingLevels();
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expectNoSkippedLevels(levels);
  });

  it("omits the project section when the taller has no project", async () => {
    await renderDetail([buildPublicTaller({ project: null })]);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText("Proyectos que vamos a realizar")).toBeNull();
    expectNoSkippedLevels(headingLevels());
  });

  it("shows ONE enrollment action and a single discreet WhatsApp link in the body when open", async () => {
    const { container } = await renderDetail([full]);
    expect(
      (await screen.findByRole("link", { name: "Inscribirme" })).getAttribute(
        "href",
      ),
    ).toMatch(/^\/talleres\/[^/]+\/inscripcion\?period=2026-11$/u);
    expect(screen.queryByRole("link", { name: /Consultá/u })).toBeNull();
    const body = container
      .querySelector("article")
      ?.querySelectorAll('a[href^="https://wa.me/"]');
    expect(body).toHaveLength(1);
    expect(body?.[0]?.textContent).toBe("¿Dudas? Escribinos");
  });

  it("keeps the WhatsApp links per turno and the main inquiry when nobody can enroll", async () => {
    const { container } = await renderDetail([
      buildPublicTaller({ ...full, offering: null }),
    ]);
    await screen.findByRole("heading", { level: 1 });
    const body = container
      .querySelector("article")
      ?.querySelectorAll('a[href^="https://wa.me/"]');
    expect(body?.length).toBeGreaterThan(2);
    expect(screen.queryByRole("link", { name: "Inscribirme" })).toBeNull();
  });

  it("shows the paused notice, no inquiry action and no seats when paused", async () => {
    const { container } = await renderDetail([
      buildPublicTaller({ status: "paused", offering: null }),
    ]);
    expect(await screen.findByText("Inscripciones pausadas")).toBeVisible();
    const article = container.querySelector("article") as HTMLElement;
    const link = within(article).getByRole("link", {
      name: /Escribinos por WhatsApp/u,
    });
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain(
      "Taller Demo",
    );
    expect(screen.queryByText(/Consultá por WhatsApp/u)).toBeNull();
    expect(container.textContent).not.toContain("Cupo limitado");
    expect(container.textContent).not.toContain(
      "Próximamente abrimos inscripciones",
    );
    await expectNoAxeViolations(container, { page: true });
  });

  it("shows the notice and no fee or seats when there is no offering", async () => {
    const { container } = await renderDetail([
      buildPublicTaller({ offering: null }),
    ]);
    expect(
      await screen.findByText("Próximamente abrimos inscripciones"),
    ).toBeVisible();
    expect(container.textContent).not.toContain("Cuota mensual");
    expect(container.textContent).not.toContain("$");
    expect(container.textContent).not.toContain("Cupo limitado");
    expect(container.querySelector("article li")).not.toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("marks Talleres as the current menu entry", async () => {
    await renderDetail([full]);
    const entries = await screen.findAllByRole("link", { name: "Talleres" });
    expect(
      entries.some((entry) => entry.getAttribute("aria-current") === "page"),
    ).toBe(true);
  });

  it("uses a decorative stand-in when there are no images", async () => {
    const { container } = await renderDetail([buildPublicTaller()]);
    expect(container.querySelector("article img")?.getAttribute("alt")).toBe(
      "",
    );
  });

  it.each(["no-existe", "otro-slug"])(
    "renders the styled public 404 for the unavailable slug %s",
    async (slug) => {
      const { container } = await renderDetail([], slug);
      await screen.findByRole("heading", { name: "Página no encontrada" });
      expect(screen.getAllByRole("banner").length).toBeGreaterThan(0);
      expect(container.querySelector("main")?.textContent).toBe(
        "Página no encontradaLa página que buscás no existe.Volver al inicioVer talleresVer workshopsContacto",
      );
    },
  );

  it("renders the 500 boundary with no internals when the reader throws", async () => {
    const catalog = createFakePublicCatalog();
    vi.spyOn(catalog.talleres, "findBySlug").mockRejectedValue(
      new Error("secret-db-detail"),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = await renderDetail([], "taller-demo", catalog);
    expect(
      await screen.findByRole("heading", { name: "Algo salió mal" }),
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain("secret-db-detail");
    spy.mockRestore();
  });

  it("emits no structured data for a monthly taller", async () => {
    const { container } = await renderDetail([full]);
    expect(
      container.ownerDocument.querySelectorAll(
        'script[type="application/ld+json"]',
      ),
    ).toHaveLength(0);
  });
});

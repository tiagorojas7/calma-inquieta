import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { serializeJsonLd } from "~/app/seo/json-ld";
import { createTestServices } from "~/testing/fakes/app-services";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import { createLoaderArgs } from "~/testing/react-router";
import {
  buildPublicIntensivo,
  buildPublicTaller,
} from "~/testing/fakes/public-catalog-builders";
import HomeRoute, { loader, meta } from "./home";

const fixture = {
  hero: {
    eyebrow: "Calma Inquieta",
    title: { lead: "Un espacio para ", accent: "crear", trail: "" },
    subtitle: "Una propuesta cálida.",
    image: {
      mobile: {
        src: "/hero-m.webp",
        srcSet: "/hero-m-480.webp 480w, /hero-m.webp 720w",
        alt: "Textura",
        width: 720,
        height: 900,
      },
      desktop: {
        src: "/hero-d.webp",
        srcSet: "/hero-d-480.webp 480w, /hero-d.webp 960w",
        alt: "Textura",
        width: 960,
        height: 1280,
      },
    },
    bajada: "Equilibrio entre serenidad y movimiento",
  },
  trustClaims: [],
  monthly: [],
  intensivos: [],
  catalogFailed: false,
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
  jsonLd: serializeJsonLd({ "@type": "LocalBusiness", name: "Calma Inquieta" }),
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
      const scripts = container.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      expect(scripts).toHaveLength(1);
      expect(scripts[0]?.textContent).toBe(fixture.jsonLd);
      expect(container.textContent.replace(/\D/g, "")).not.toContain(
        "3517395239",
      );
      expect(
        screen.getAllByRole("heading").map((h) => Number(h.tagName.slice(1))),
      ).toEqual([1, 2, 2, 2, 2]);
      await expectNoAxeViolations(container, { page: true });
    },
  );

  it("keeps the spaces around the italic accent in the hero title", async () => {
    const real = {
      ...fixture,
      hero: {
        ...fixture.hero,
        title: {
          lead: "Un espacio para crear con",
          accent: "calma",
          trail: "y un poquito de inquietud",
        },
      },
    };
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <main>
            <HomeRoute />
          </main>
        ),
        loader: () => real,
      },
    ]);
    render(<Stub initialEntries={["/"]} />);
    const title = await screen.findByRole("heading", { level: 1 });
    expect(title.textContent).toBe(
      "Un espacio para crear con calma y un poquito de inquietud",
    );
  });

  it("does not double the spaces when the content already carries them", async () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <main>
            <HomeRoute />
          </main>
        ),
        loader: () => ({
          ...fixture,
          hero: {
            ...fixture.hero,
            title: { lead: "Un espacio para ", accent: "crear", trail: "" },
          },
        }),
      },
    ]);
    render(<Stub initialEntries={["/"]} />);
    const title = await screen.findByRole("heading", { level: 1 });
    expect(title.textContent).toBe("Un espacio para crear");
  });

  async function renderRealLoader(
    catalog: ReturnType<typeof createFakePublicCatalog>,
  ) {
    const services = createTestServices({ publicCatalog: catalog });
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <main>
            <HomeRoute />
          </main>
        ),
        loader: () => loader(createLoaderArgs(services, "/") as never),
      },
    ]);
    const view = render(<Stub initialEntries={["/"]} />);
    await screen.findByRole("heading", { level: 1 });
    return view;
  }

  it("shows the catalog cards and items with no price", async () => {
    const { container } = await renderRealLoader(
      createFakePublicCatalog({
        talleres: [
          buildPublicTaller({ slug: "a", name: "Cerámica" }),
          buildPublicTaller({ slug: "b", name: "Telar", status: "paused" }),
        ],
        intensivos: [buildPublicIntensivo({ name: "Intensivo de torno" })],
      }),
    );
    const monthly = screen
      .getByRole("heading", { name: "Talleres mensuales" })
      .closest("section");
    const intensivos = screen
      .getByRole("heading", { name: "Próximos intensivos" })
      .closest("section");
    expect(monthly).toHaveTextContent("Cerámica");
    expect(monthly).toHaveTextContent("Inscripciones pausadas");
    expect(monthly).toHaveTextContent("Lunes, 10:00 a 12:00 h");
    expect(monthly?.querySelector('a[href="/talleres/a"]')).toBeTruthy();
    expect(intensivos).toHaveTextContent("Intensivo de torno");
    expect(
      intensivos?.querySelector('a[href="/intensivos/intensivo-demo"]'),
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(/\$\s?\d|58\.000/u);
    for (const section of [monthly, intensivos]) {
      section?.remove();
    }
    expect(container.textContent).not.toMatch(/\d{1,2}:\d{2}/u);
  });

  it("renders without the two activity sections when the catalog read fails", async () => {
    const catalog = createFakePublicCatalog();
    vi.spyOn(catalog.talleres, "list").mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = await renderRealLoader(catalog);
    expect(
      screen.queryByRole("heading", { name: "Talleres mensuales" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Próximos intensivos" }),
    ).not.toBeInTheDocument();
    expect(container.textContent).not.toContain("Pronto vamos a");
    expect(container.textContent).not.toContain("Estamos preparando");
    expect(container.textContent).not.toContain("Todavía no hay fechas");
    expect(screen.getByText("Quiénes somos")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    vi.restoreAllMocks();
  });

  describe("images", () => {
    async function renderFixture() {
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
      const view = render(<Stub initialEntries={["/"]} />);
      await screen.findByRole("heading", { level: 1 });
      return view;
    }

    it("Inicio has exactly one img with fetchpriority high", async () => {
      const { container } = await renderFixture();
      const high = container.querySelectorAll('img[fetchpriority="high"]');
      expect(high).toHaveLength(1);
      expect(high[0]?.closest("picture")).not.toBeNull();
      expect(container.querySelectorAll('img[loading="eager"]')).toHaveLength(
        1,
      );
    });

    it("every other img is loading lazy", async () => {
      const { container } = await renderFixture();
      const others = [...container.querySelectorAll("img")].filter(
        (element) => element.getAttribute("fetchpriority") !== "high",
      );
      for (const element of others) {
        expect(element, element.getAttribute("src") ?? "").toHaveAttribute(
          "loading",
          "lazy",
        );
      }
    });

    it("no image is hidden at a breakpoint while loading", async () => {
      const { container } = await renderFixture();
      for (const element of container.querySelectorAll("img")) {
        let node: Element | null = element;
        while (node) {
          const hiding = [...node.classList].filter((name) =>
            /(^|:)hidden$/.test(name),
          );
          expect(hiding, element.getAttribute("src") ?? "").toEqual([]);
          node = node.parentElement;
        }
      }
    });

    it("the preload srcset and sizes equal the rendered picture", async () => {
      const { container } = await renderFixture();
      const preloads = (
        meta({
          loaderData: {
            ...fixture,
            metaInput: {
              title: "Inicio",
              description: "Descripción de Inicio",
              path: "/",
              siteName: "Calma Inquieta",
              baseUrl: "https://example.test",
              indexingEnabled: false,
            },
          },
        } as never) as readonly Record<string, unknown>[]
      ).filter((entry) => entry.rel === "preload");
      const source = container.querySelector("picture > source");
      const still = container.querySelector("picture > img");
      expect(preloads).toHaveLength(2);
      expect(preloads[0]?.imageSrcSet).toBe(still?.getAttribute("srcset"));
      expect(preloads[1]?.imageSrcSet).toBe(source?.getAttribute("srcset"));
      expect(preloads[1]?.media).toBe(source?.getAttribute("media"));
      for (const entry of preloads) {
        expect(entry.imageSizes).toBe(still?.getAttribute("sizes"));
        expect(entry.imageSizes).toBe(source?.getAttribute("sizes"));
      }
    });
  });
});

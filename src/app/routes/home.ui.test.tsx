import { configure, render, screen } from "@testing-library/react";
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

// Each test renders the whole route through a router stub; a cold first render
// can pass the 1 s default of the async queries on a loaded machine.
configure({ asyncUtilTimeout: 5000 });

const fixture = {
  hero: {
    eyebrow: "Calma Inquieta",
    title: { lead: "Un espacio para ", accent: "crear", trail: "" },
    subtitle: "Una propuesta cálida.",
    collage: [
      {
        src: "/hero-d.webp",
        srcSet: "/hero-d-480.webp 480w, /hero-d.webp 960w",
        alt: "Pieza circular",
        width: 960,
        height: 1280,
      },
      { src: "/hero-w.webp", alt: "Lámpara", width: 960, height: 720 },
      { src: "/hero-s.webp", alt: "Cuenco", width: 960, height: 960 },
    ],
    note: "Crear también es una forma de volver a vos",
    keywords: ["Arte", "Manos", "Encuentro", "Bienestar"],
    bajada: "Equilibrio entre serenidad y movimiento",
  },
  trustClaims: [],
  monthly: [],
  intensivos: [],
  catalogFailed: false,
  teaser: {
    heading: "Quiénes somos",
    body: "Conocenos",
    image: { src: "/about.svg", alt: "Cesta", width: 800, height: 1000 },
    accentImage: {
      src: "/about-2.svg",
      alt: "Jarrones",
      width: 960,
      height: 779,
    },
    pull: "Hecho a mano, compartido entre todas",
    linkLabel: "Conocenos",
  },
  testimonials: [],
  catalogBand: {
    heading: "Tu lugar para crear",
    body: "Sumate a un taller mensual.",
    primary: {
      src: "/band-weaving.webp",
      srcSet: "/band-weaving-480.webp 480w, /band-weaving.webp 900w",
      alt: "Manos tejiendo un cesto",
      width: 900,
      height: 1125,
    },
    secondary: {
      src: "/band-looms.webp",
      srcSet: "/band-looms-480.webp 480w, /band-looms.webp 960w",
      alt: "Telares sobre lino",
      width: 960,
      height: 640,
    },
  },
  contactBand: {
    heading: "Hablemos",
    body: "Escribinos",
    image: {
      src: "/band-hands.webp",
      srcSet: "/band-hands-480.webp 480w, /band-hands.webp 960w",
      alt: "Manos terminando un espejo de paja",
      width: 960,
      height: 1200,
    },
  },
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
      ).toEqual([1, 2, 2, 2, 2, 2]);
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

    const eagerImages = (container: HTMLElement) => [
      ...container.querySelectorAll('img[loading="eager"]'),
    ];

    it("Inicio has exactly one eager high-priority image, the collage lead", async () => {
      const { container } = await renderFixture();
      const high = [...container.querySelectorAll('img[fetchpriority="high"]')];

      expect(high.map((img) => img.getAttribute("alt"))).toEqual([
        "Pieza circular",
      ]);
      expect(eagerImages(container)).toEqual(high);
    });

    it("every other img is loading lazy", async () => {
      const { container } = await renderFixture();
      const eager = eagerImages(container);
      for (const element of container.querySelectorAll("img")) {
        if (!eager.includes(element)) {
          expect(element, element.getAttribute("src") ?? "").toHaveAttribute(
            "loading",
            "lazy",
          );
        }
      }
    });

    it("the three band photos are lazy, sized and carry their alt text", async () => {
      const { container } = await renderFixture();

      for (const alt of [
        "Manos tejiendo un cesto",
        "Telares sobre lino",
        "Manos terminando un espejo de paja",
      ]) {
        const img = container.querySelector(`img[alt="${alt}"]`);
        expect(img, alt).not.toBeNull();
        expect(img, alt).toHaveAttribute("loading", "lazy");
        expect(img, alt).not.toHaveAttribute("fetchpriority");
        expect(img?.getAttribute("sizes"), alt).toMatch(/\d/u);
        expect(img, alt).toHaveAttribute("width");
        expect(img, alt).toHaveAttribute("height");
      }
    });

    it("the contact band photo sits in the clay band next to the WhatsApp call to action", async () => {
      await renderFixture();
      const band = screen
        .getByRole("heading", { name: "Hablemos" })
        .closest("section");

      expect(
        band?.querySelector('img[alt="Manos terminando un espejo de paja"]'),
      ).not.toBeNull();
      expect(
        band?.querySelector('a[href="https://wa.me/5493510000000"]'),
      ).not.toBeNull();
    });

    it("the catalog photo pair sits in the catalog band, with a call to action to book", async () => {
      await renderFixture();
      const band = screen
        .getByRole("heading", { name: "Tu lugar para crear" })
        .closest("section");

      expect(band).toHaveAttribute("data-tone", "canvas");
      expect(
        band?.querySelector('img[alt="Manos tejiendo un cesto"]'),
      ).not.toBeNull();
      expect(
        band?.querySelector('img[alt="Telares sobre lino"]'),
      ).not.toBeNull();
      expect(band?.querySelector('a[href="/talleres"]')).not.toBeNull();
      expect(
        band?.querySelector('a[href="https://wa.me/5493510000000"]'),
      ).not.toBeNull();
    });

    it("the one preload matches the eager lead's srcset and sizes", async () => {
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
      const [lead] = eagerImages(container);

      expect(preloads).toHaveLength(1);
      expect(preloads[0]?.imageSrcSet).toBe(lead?.getAttribute("srcset"));
      expect(preloads[0]?.imageSizes).toBe(lead?.getAttribute("sizes"));
    });
  });

  describe("loop", () => {
    const loop = {
      poster: {
        src: "/media/video/home-loop-poster-720.0a1b2c3d.webp",
        srcSet:
          "/media/video/home-loop-poster-480.0a1b2c3d.webp 480w, /media/video/home-loop-poster-720.0a1b2c3d.webp 720w",
        alt: "",
        width: 720,
        height: 900,
      },
      sources: [
        {
          src: "/media/video/home-loop-720.0a1b2c3d.webm",
          type: "video/webm",
        },
        { src: "/media/video/home-loop-720.0a1b2c3d.mp4", type: "video/mp4" },
      ],
      width: 720,
      height: 900,
    };

    async function renderWithLoop() {
      const Stub = createRoutesStub([
        {
          path: "/",
          Component: () => (
            <main>
              <HomeRoute />
            </main>
          ),
          loader: () => ({ ...fixture, hero: { ...fixture.hero, loop } }),
        },
      ]);
      const view = render(<Stub initialEntries={["/"]} />);
      await screen.findByRole("heading", { level: 1 });
      return view;
    }

    it("Inicio contains exactly one loop element", async () => {
      const { container } = await renderWithLoop();
      expect(
        container.querySelectorAll(`img[src="${loop.poster.src}"]`),
      ).toHaveLength(1);
      expect(container.querySelectorAll("video")).toHaveLength(0);
    });

    it("only the collage lead is eager and high priority", async () => {
      const { container } = await renderWithLoop();
      const high = container.querySelectorAll('img[fetchpriority="high"]');
      expect([...high].map((img) => img.getAttribute("alt"))).toEqual([
        "Pieza circular",
      ]);
      for (const img of high) {
        expect(img.closest("picture")).not.toBeNull();
      }
      expect(container.querySelectorAll('img[loading="eager"]')).toHaveLength(
        1,
      );
      expect(
        container.querySelector(`img[src="${loop.poster.src}"]`),
      ).toHaveAttribute("loading", "lazy");
    });

    it("the loop is not preloaded", () => {
      const preloads = (
        meta({
          loaderData: {
            ...fixture,
            hero: { ...fixture.hero, loop },
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
      expect(preloads).toHaveLength(1);
      expect(JSON.stringify(preloads)).not.toContain("home-loop");
    });

    it("renders no loop element when the hero has none", async () => {
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
      await screen.findByRole("heading", { level: 1 });
      expect(container.querySelectorAll("img[src*=home-loop]")).toHaveLength(0);
    });
  });
});

describe("Inicio bands and motifs", () => {
  const claims = [{ id: "c1", label: "Materiales incluidos" }];
  const testimonials = [{ id: "t1", quote: "Muy lindo", author: "Ana" }];

  async function renderInicio(overrides: Record<string, unknown>) {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <main>
            <HomeRoute />
          </main>
        ),
        loader: () => ({ ...fixture, ...overrides }),
      },
    ]);
    const view = render(<Stub initialEntries={["/"]} />);
    await screen.findByRole("heading", { level: 1 });
    return view;
  }

  const bands = (container: HTMLElement) => [
    ...container.querySelectorAll("main > section[data-bleed='true']"),
  ];

  it("lays the page out as full-bleed tone bands that are direct children of main", async () => {
    const { container } = await renderInicio({});
    const tones = bands(container).map((band) =>
      band.getAttribute("data-tone"),
    );

    expect(tones).toEqual(["canvas", "canvas", "sand", "clay"]);
    expect(container.querySelectorAll("[data-bleed='true']")).toHaveLength(4);
  });

  it("keeps the booking lead but drops the activity sections when the catalog read fails", async () => {
    const { container } = await renderInicio({ catalogFailed: true });

    expect(
      bands(container).map((band) => band.getAttribute("data-tone")),
    ).toEqual(["canvas", "canvas", "sand", "clay"]);
    expect(
      screen.getByRole("heading", { name: "Tu lugar para crear" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Talleres mensuales" }),
    ).not.toBeInTheDocument();
  });

  it("no longer uses the 24 px woven cord as a divider", async () => {
    const { container } = await renderInicio({ trustClaims: claims });

    expect(container.querySelectorAll(".motif-cord-a")).toHaveLength(0);
    expect(container.querySelectorAll("svg.h-6")).toHaveLength(0);
  });

  it("the hero band is followed by the trust row when there are claims", async () => {
    await renderInicio({ trustClaims: claims });
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    const trust = screen.getByRole("region", { name: "Confianza" });

    expect(hero?.nextElementSibling).toBe(trust);
  });

  it("shows a big butterfly in the hero and a bigger one in the contact band", async () => {
    const { container } = await renderInicio({});
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    const contact = screen
      .getByRole("heading", { name: "Hablemos" })
      .closest("section");

    expect(container.querySelectorAll(".motif-flight")).toHaveLength(2);
    expect(hero?.querySelector('[data-size="lg"].motif-flight')).not.toBeNull();
    expect(
      contact?.querySelector('[data-size="xl"].motif-flight'),
    ).not.toBeNull();
  });

  it("scatters sprigs over the hero, the catalog edge, the teaser and the contact band", async () => {
    const { container } = await renderInicio({});

    expect(
      container.querySelectorAll("[data-variant]").length,
    ).toBeGreaterThanOrEqual(5);
    for (const sprig of container.querySelectorAll("[data-variant]")) {
      expect(sprig).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("reveals the below-the-fold blocks and never the hero", async () => {
    const { container } = await renderInicio({});
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");

    expect(hero?.querySelector("[data-reveal]")).toBeNull();
    expect(
      container.querySelectorAll("[data-reveal]").length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("the text and links of Inicio are equal with and without motifs", async () => {
    const { container } = await renderInicio({
      trustClaims: claims,
      testimonials,
    });
    const snapshot = (root: Element) => ({
      text: root.textContent,
      links: [...root.querySelectorAll("a")].map((a) => a.outerHTML),
    });
    const withMotifs = snapshot(container);
    const bare = container.cloneNode(true) as HTMLElement;
    for (const motif of bare.querySelectorAll("[aria-hidden='true']")) {
      motif.remove();
    }

    expect(snapshot(bare)).toEqual(withMotifs);
  });

  it("Inicio with the motifs has no axe violations", async () => {
    const { container } = await renderInicio({ trustClaims: claims });
    await expectNoAxeViolations(container, { page: true });
  });
});

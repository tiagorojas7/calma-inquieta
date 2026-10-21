import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  faqEntryFixtures,
  galleryImageFixtures,
  valueItemFixtures,
  videoFixtures,
} from "~/testing/fixtures/ui";
import AboutRoute from "./about";

const base = {
  heading: "Quiénes somos",
  history: [
    { id: "h1", text: "Primer párrafo de la historia." },
    { id: "h2", text: "Segundo párrafo de la historia." },
  ],
  valueProposition: "Te ofrecemos un lugar para crear sin apuro.",
  pullQuote: "Calma, creatividad y un poquito de inquietud.",
  introImages: [],
  introLoops: [],
  cta: {
    heading: "¿Querés sumarte?",
    body: "Escribinos por WhatsApp y te contamos qué hay para vos.",
    whatsappHref: "https://wa.me/5493510000000?text=Hola",
  },
  values: [],
  gallery: [],
  videos: [],
  faq: [],
  sectionHeadings: {
    values: "Lo que nos mueve",
    gallery: "Un vistazo",
    faq: "Preguntas frecuentes",
  },
};

function renderAbout(data: typeof base | Record<string, unknown>) {
  const Stub = createRoutesStub([
    {
      path: "/quienes-somos",
      Component: () => (
        <main>
          <AboutRoute />
        </main>
      ),
      loader: () => data,
    },
  ]);
  return render(<Stub initialEntries={["/quienes-somos"]} />);
}

const levels = () =>
  screen.getAllByRole("heading").map((h) => Number(h.tagName.slice(1)));

describe("Quiénes somos route", () => {
  it("renders only the history and the booking band when every optional section is empty", async () => {
    const { container } = renderAbout(base);
    expect(await screen.findAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Primer párrafo de la historia.")).toBeVisible();
    expect(screen.getByText("Segundo párrafo de la historia.")).toBeVisible();
    expect(
      screen.getByText("Te ofrecemos un lugar para crear sin apuro."),
    ).toBeVisible();
    // The closing booking band carries the only other heading.
    expect(levels()).toEqual([1, 2]);
    expect(screen.queryByText("Lo que nos mueve")).not.toBeInTheDocument();
    expect(screen.queryByText("Preguntas frecuentes")).not.toBeInTheDocument();
    await expectNoAxeViolations(container, { page: true });
  });

  it("renders values and FAQ sections in heading order when present", async () => {
    const { container } = renderAbout({
      ...base,
      values: valueItemFixtures,
      faq: faqEntryFixtures,
    });
    expect(await screen.findAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(levels()).toEqual([1, 2, 3, 3, 2, 2]);
    expect(container.querySelectorAll("details")).toHaveLength(2);
    await expectNoAxeViolations(container, { page: true });
  });

  it("renders the gallery heading and grid when there are images", async () => {
    const { container } = renderAbout({
      ...base,
      gallery: galleryImageFixtures,
    });
    expect(
      await screen.findByRole("heading", { level: 2, name: "Un vistazo" }),
    ).toBeVisible();
    for (const image of galleryImageFixtures) {
      expect(screen.getByRole("button", { name: image.alt })).toBeVisible();
    }
    expect(screen.getByRole("region", { name: "Un vistazo" })).toHaveAttribute(
      "aria-roledescription",
      "carrusel",
    );
    await expectNoAxeViolations(container, { page: true });
  });

  it("renders a facade per video without loading any iframe", async () => {
    const { container } = renderAbout({ ...base, videos: videoFixtures });
    expect(
      await screen.findByRole("button", {
        name: `Reproducir video: ${videoFixtures[0].title}`,
      }),
    ).toBeVisible();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders neither gallery nor videos when both are empty", async () => {
    renderAbout(base);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText("Un vistazo")).not.toBeInTheDocument();
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("closes with a booking band: Ver talleres first, WhatsApp second", async () => {
    renderAbout(base);
    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "¿Querés sumarte?",
    });
    const band = heading.closest("section") as HTMLElement;
    expect(band).toHaveAttribute("data-tone", "clay");
    const links = [...band.querySelectorAll("a")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/talleres",
      "https://wa.me/5493510000000?text=Hola",
    ]);
    expect(links[0]).toHaveTextContent("Ver talleres");
    expect(links[1]).toHaveTextContent("Escribinos por WhatsApp");
  });

  it("offers only Ver talleres when there is no WhatsApp link", async () => {
    const cta = { heading: base.cta.heading, body: base.cta.body };
    renderAbout({ ...base, cta });
    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "¿Querés sumarte?",
    });
    const band = heading.closest("section") as HTMLElement;
    expect(band.querySelectorAll("a")).toHaveLength(1);
  });

  it("plays the intro loops in place of the intro photos", async () => {
    const loop = {
      poster: {
        src: "/media/video/about-loop-weaving-poster-360.0a1b2c3d.webp",
        alt: "",
        width: 360,
        height: 640,
      },
      sources: [
        {
          src: "/media/video/about-loop-weaving-360.0a1b2c3d.webm",
          type: "video/webm",
        },
      ],
      width: 360,
      height: 640,
    };
    const { container } = renderAbout({
      ...base,
      introImages: galleryImageFixtures,
      introLoops: [loop, loop, loop],
    });
    await screen.findByRole("heading", { level: 1 });
    expect(container.querySelectorAll("figure")).toHaveLength(3);
    for (const image of galleryImageFixtures) {
      expect(screen.queryByRole("img", { name: image.alt })).toBeNull();
    }
  });

  it("sets the pull-quote in script and collages the intro photos", async () => {
    const { container } = renderAbout({
      ...base,
      introImages: galleryImageFixtures,
    });
    const quote = await screen.findByText(
      "Calma, creatividad y un poquito de inquietud.",
    );
    expect(quote).toHaveAttribute("data-script", "true");
    expect(container.querySelectorAll("figure")).toHaveLength(
      galleryImageFixtures.length,
    );
    await expectNoAxeViolations(container, { page: true });
  });

  it("alternates full-bleed tone bands down the page", async () => {
    const { container } = renderAbout({
      ...base,
      values: valueItemFixtures,
      gallery: galleryImageFixtures,
      faq: faqEntryFixtures,
    });
    await screen.findAllByRole("heading", { level: 1 });
    const bands = [...container.querySelectorAll("main > section")].map(
      (band) => band.getAttribute("data-tone"),
    );
    expect(bands).toEqual(["canvas", "sand", "canvas", "white", "clay"]);
    for (const band of container.querySelectorAll("main > section")) {
      expect(band).toHaveAttribute("data-bleed", "true");
    }
  });
});

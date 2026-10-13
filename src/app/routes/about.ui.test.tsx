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
  it("renders only the history when every optional section is empty", async () => {
    const { container } = renderAbout(base);
    expect(await screen.findAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Primer párrafo de la historia.")).toBeVisible();
    expect(screen.getByText("Segundo párrafo de la historia.")).toBeVisible();
    expect(
      screen.getByText("Te ofrecemos un lugar para crear sin apuro."),
    ).toBeVisible();
    expect(levels()).toEqual([1]);
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
    expect(levels()).toEqual([1, 2, 3, 3, 2]);
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
    expect(screen.getAllByRole("button")).toHaveLength(
      galleryImageFixtures.length,
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
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

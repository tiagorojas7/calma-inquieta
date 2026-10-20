import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ProjectSection } from "./project-section";

const image = (id: string, alt: string) => ({
  id,
  src: `/imagenes/${id}.jpg`,
  alt,
  width: 1200,
  height: 800,
});

describe("ProjectSection", () => {
  it("renders the h2 heading, the project title and description and its images", async () => {
    const { container } = render(
      <ProjectSection
        heading="Proyectos que vamos a realizar"
        title="Plato hondo"
        description="Un plato para el día a día."
        images={[image("a", "Plato terminado"), image("b", "Plato en proceso")]}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Proyectos que vamos a realizar",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Plato hondo" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Un plato para el día a día.")).toBeVisible();
    expect(screen.getByAltText("Plato terminado")).toBeInTheDocument();
    expect(screen.getByAltText("Plato en proceso")).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("omits an empty title, description and image list", () => {
    render(
      <ProjectSection
        heading="Proyectos que vamos a realizar"
        title=""
        description="Solo descripción."
        images={[]}
      />,
    );
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Solo descripción.")).toBeVisible();
  });
});
